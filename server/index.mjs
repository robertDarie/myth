import { createGameServer } from './http.mjs';
import {ServerTelemetry} from './telemetry.mjs';
import { join } from 'node:path';
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
const { server, saveNow } = createGameServer({telemetry,buildIdentity, savePath: databasePath ? null : savePath, databasePath,
  joinCode: localPlaytest ? '' : process.env.THRONES_JOIN_CODE ?? '',
  trustProxy: !localPlaytest && process.env.THRONES_TRUST_PROXY === '1',
  kingdomId: process.env.THRONES_KINGDOM_ID ?? 'local',
  shutdownToken: localPlaytest ? process.env.THRONES_LAUNCH_TOKEN : null });
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Thrones of Myth prototype listening at http://${host}:${port}`));
console.log('World storage: ' + (databasePath ?? savePath));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { saveNow(); server.close(); server.closeIdleConnections(); });
