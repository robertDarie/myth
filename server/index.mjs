import { createGameServer } from './http.mjs';

const localPlaytest = process.argv.includes('--local-playtest');
const port = localPlaytest ? 8080 : Number(process.env.PORT ?? 8080);
const host = localPlaytest ? '127.0.0.1' : process.env.HOST ?? '127.0.0.1';
const { server } = createGameServer();
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Thrones of Myth prototype listening at http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
