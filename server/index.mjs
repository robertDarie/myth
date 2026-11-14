import { readFileSync } from 'node:fs';
import { createGameServer } from './http.mjs';
import { createRealmHost } from './realms.mjs';
import {ServerTelemetry} from './telemetry.mjs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const localPlaytest = process.argv.includes('--local-playtest');
const localPort = process.argv.find(a=>a.startsWith('--local-port='))?.slice(13) ?? '8080';
const port = localPlaytest ? Number(localPort) : Number(process.env.PORT ?? 8080);
if(!Number.isInteger(port)||port<(localPlaytest?1:0)||port>65535)throw new Error('Invalid listening port.');
const host = localPlaytest ? '127.0.0.1' : process.env.HOST ?? '127.0.0.1';
const savePath = process.env.THRONES_SAVE_PATH ?? join(process.env.LOCALAPPDATA ?? join(homedir(), '.local', 'share'), 'ThronesOfMyth', 'Saves', 'world.json');
const databasePath = !localPlaytest ? process.env.THRONES_DB_PATH : null;
const buildIdentity=process.env.THRONES_BUILD_VERSION&&process.env.THRONES_BUILD_COMMIT?{version:process.env.THRONES_BUILD_VERSION,commit:process.env.THRONES_BUILD_COMMIT,serverDigest:process.env.THRONES_SERVER_DIGEST}:null;
const telemetry=process.env.THRONES_METRICS_PATH?new ServerTelemetry(process.env.THRONES_METRICS_PATH):null;
const shutdownToken = localPlaytest ? process.env.THRONES_LAUNCH_TOKEN : null;
const trustProxy = !localPlaytest && process.env.THRONES_TRUST_PROXY === '1';
const realmsFile = !localPlaytest && process.env.THRONES_REALMS ? resolve(process.env.THRONES_REALMS) : '';
if (localPlaytest && process.env.THRONES_REALMS) console.log('Isolated playtest ignores THRONES_REALMS and keeps the default local kingdom.');
const started = realmsFile ? startRealms(realmsFile) : createGameServer({telemetry,buildIdentity,cityCapacity:!localPlaytest&&process.env.THRONES_CITY_CAPACITY?Number(process.env.THRONES_CITY_CAPACITY):null, savePath: databasePath ? null : savePath, databasePath,
  joinCode: localPlaytest ? '' : process.env.THRONES_JOIN_CODE ?? '',
  trustProxy, kingdomId: process.env.THRONES_KINGDOM_ID ?? 'local', shutdownToken });
const { server, saveNow } = started;
function startRealms(file) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const kingdoms = Array.isArray(config.kingdoms) ? config.kingdoms : null;
  if (!kingdoms) throw new Error('Realm configuration must contain a kingdoms array.');
  return createRealmHost({
    defaultId: config.defaultId ?? 'local', shutdownToken, trustProxy, buildIdentity,
    realms: kingdoms.map(realm => ({
      cityCapacity:realm.cityCapacity, id: realm.id, name: realm.name, description: realm.description ?? '',
      joinCode: realm.joinCode ?? process.env.THRONES_JOIN_CODE ?? '',
      savePath: realm.savePath ? resolve(realm.savePath) : null,
      databasePath: realm.databasePath ? resolve(realm.databasePath) : null
    }))
  });
}
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Thrones of Myth prototype listening at http://${host}:${port}`));
console.log(realmsFile ? 'Realm configuration: ' + realmsFile : 'World storage: ' + (databasePath ?? savePath));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { saveNow(); server.close(); server.closeIdleConnections(); });
