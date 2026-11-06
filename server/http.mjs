import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { World, GameError } from './world.mjs';

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new GameError('Request too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new GameError('Expected JSON.'); }
}

export function createGameServer() {
  const world = new World();
  const server = createServer(async (request, response) => {
    const send = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && path === '/health') return send(200, { status: 'ok' });
      if (request.method === 'POST' && path === '/join') {
        const body = await readJson(request);
        const session = world.join(body?.name, body?.civilization, body?.resumeToken);
        world.authenticate(session.token).lastSeen = performance.now();
        return send(201, session);
      }
      if ((request.method === 'GET' && path === '/world') || (request.method === 'POST' && path === '/command')) {
        const token = (request.headers.authorization ?? '').replace(/^Bearer /, '');
        const player = world.authenticate(token);
        player.lastSeen = performance.now();
        if (path === '/world') return send(200, world.snapshot());
        world.command(player, await readJson(request));
        return send(200, { accepted: true });
      }
      send(404, { error: 'Route not found.' });
    } catch (error) {
      if (!(error instanceof GameError)) console.error(error);
      if (!response.destroyed) send(error.status ?? 500, { error: error instanceof GameError ? error.message : 'Internal error.' });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    world.tick((now - previous) / 1000);
    world.expire(now);
    previous = now;
  }, 100);
  timer.unref();
  server.on('close', () => clearInterval(timer));
  return { server, world };
}
