import { createGameServer } from './http.mjs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const localPlaytest = process.argv.includes('--local-playtest');
const port = localPlaytest ? 8080 : Number(process.env.PORT ?? 8080);
const host = localPlaytest ? '127.0.0.1' : process.env.HOST ?? '127.0.0.1';
const savePath = process.env.THRONES_SAVE_PATH ?? join(process.env.LOCALAPPDATA ?? join(homedir(), '.local', 'share'), 'ThronesOfMyth', 'Saves', 'world.json');
const { server, saveNow } = createGameServer({ savePath, shutdownToken: localPlaytest ? process.env.THRONES_LAUNCH_TOKEN : null });
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Thrones of Myth prototype listening at http://${host}:${port}`));
console.log('World save: ' + savePath);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { saveNow(); server.close(); server.closeIdleConnections(); });
