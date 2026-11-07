import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { World, GameError } from './world.mjs';
import { WorldStore } from './storage.mjs';

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

export function createGameServer({ savePath = null, shutdownToken = null } = {}) {
  const store = savePath ? new WorldStore(savePath) : null;
  const world = store ? store.load() : new World();
  const persistence = { enabled: !!store, lastSaved: '', error: '' };
  const saveNow = () => {
    if (!store) return true;
    try { store.save(world); persistence.lastSaved = new Date().toISOString(); persistence.error = ''; return true; }
    catch (error) { persistence.error = 'Progress could not be saved. Check free disk space and save-folder access.'; console.error(persistence.error); return false; }
  };
  const server = createServer(async (request, response) => {
    const send = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && path === '/health') return send(200, { status: persistence.error ? 'degraded' : 'ok', game: 'thrones-of-myth', version: 8, persistence: { ...persistence } });
      if (request.method === 'POST' && path === '/launcher-shutdown') {
        if (!shutdownToken || request.headers['x-thrones-launcher'] !== shutdownToken) throw new GameError('Launcher authorization required.', 403);
        if (!saveNow()) throw new GameError(persistence.error, 503);
        send(200, { saved: true });
        server.close(); server.closeIdleConnections(); return;
      }
      if (request.method === 'POST' && path === '/join') {
        const body = await readJson(request);
        const session = world.join(body?.name, body?.civilization, body?.resumeToken);
        const player = world.authenticate(session.token);
        player.lastSeen = performance.now(); player.offline = false; saveNow();
        return send(201, session);
      }
      if ((request.method === 'GET' && path === '/world') || (request.method === 'POST' && path === '/command')) {
        const token = (request.headers.authorization ?? '').replace(/^Bearer /, '');
        const player = world.authenticate(token);
        player.lastSeen = performance.now(); player.offline = false;
        if (path === '/world') return send(200, { ...world.snapshot(player.id), persistence: { ...persistence } });
        world.command(player, await readJson(request));
        return send(200, { accepted: true, saved: saveNow() });
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
  const autosave = setInterval(saveNow, 2000); autosave.unref();
  server.on('listening', saveNow);
  server.on('close', () => { clearInterval(timer); clearInterval(autosave); saveNow(); });
  server.on('error', () => { clearInterval(timer); clearInterval(autosave); });
  return { server, world, saveNow };
}
