import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { createHash, timingSafeEqual } from 'node:crypto';
import { World, GameError } from './world.mjs';
import { WorldStore } from './storage.mjs';
import { KingdomDatabase } from './database.mjs';

async function readJson(request) {
  let size = 0; const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new GameError('Request too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new GameError('Expected JSON.'); }
}
const hash = value => createHash('sha256').update(value).digest('hex');
const equalSecret = (a, b) => timingSafeEqual(Buffer.from(hash(String(a ?? ''))), Buffer.from(hash(String(b ?? ''))));
// Preserve live targets and engagements on rollback. fromSave deliberately applies
// restart recovery and therefore must not be used as an in-process rollback.
const checkpoint = world => structuredClone(Object.fromEntries(Object.entries(world).filter(([, value]) => typeof value !== 'function')));

export function createGameServer({ savePath = null, databasePath = null, shutdownToken = null, joinCode = '', trustProxy = false, kingdomId = 'local', store: suppliedStore = null } = {}) {
  if (savePath && databasePath) throw new Error('Choose JSON or SQLite storage, not both. Use legacyPath for explicit migration.');
  const store = suppliedStore ?? (databasePath ? new KingdomDatabase(databasePath) : savePath ? new WorldStore(savePath) : null);
  let world;
  try { world = store ? store.load() : new World(); } catch (error) { store?.close?.(); throw error; }
  const persistence = { enabled: !!store, backend: databasePath ? 'sqlite' : savePath ? 'json' : suppliedStore ? 'custom' : 'memory', lastSaved: '', error: '' };
  let simulationFailed = false;
  let closed = false, lastTick = performance.now();
  const saveNow = options => {
    if (closed || simulationFailed) return false;
    if (!store) return true;
    try { store.save(world, options); persistence.lastSaved = new Date().toISOString(); if (!simulationFailed) persistence.error = ''; return true; }
    catch { persistence.error = 'Progress could not be saved. The kingdom is paused until storage recovers.'; console.error(persistence.error); return false; }
  };
  const mutate = (action, receipt = null) => {
    if (persistence.error) throw new GameError(persistence.error, 503);
    const before = store ? checkpoint(world) : null;
    try {
      const result = action();
      if (!saveNow(receipt ? { receipt: { ...receipt, response: result } } : undefined)) throw new GameError(persistence.error, 503);
      return result;
    } catch (error) { if (before) Object.assign(world, before); throw error; }
  };
  const limits = new Map();
  const allow = (key, cap) => {
    const now = Date.now(), entry = limits.get(key);
    if (!entry || now - entry.start >= 60000) {
      if (limits.size >= 10000) for (const [id, value] of limits) if (now - value.start >= 60000) limits.delete(id);
      if (!limits.has(key) && limits.size >= 10000) throw new GameError('Server busy. Retry shortly.', 429);
      limits.set(key, { start: now, count: 1 }); return;
    }
    if (++entry.count > cap) throw new GameError('Too many requests. Retry shortly.', 429);
  };
  const server = createServer(async (request, response) => {
    const send = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data));
    };
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      const ready = !persistence.error && performance.now() - lastTick < 5000;
      if (request.method === 'GET' && ['/health', '/readyz'].includes(path)) return send(ready ? 200 : 503, { status: ready ? 'ok' : 'degraded', game: 'thrones-of-myth', version: 13, kingdomId, persistence: { ...persistence } });
      const address = trustProxy ? String(request.headers['x-forwarded-for'] ?? request.socket.remoteAddress).split(',').at(-1).trim() : request.socket.remoteAddress;
      allow('requests:' + address, 6000);
      if (request.method === 'POST' && path === '/launcher-shutdown') {
        if (!shutdownToken || !equalSecret(request.headers['x-thrones-launcher'], shutdownToken)) throw new GameError('Launcher authorization required.', 403);
        if (!saveNow()) throw new GameError(persistence.error, 503);
        send(200, { saved: true }); server.close(); server.closeIdleConnections(); return;
      }
      if (request.method === 'POST' && path === '/join') {
        allow('join:' + address, 20);
        const body = await readJson(request);
        // A valid saved session may reconnect after the invitation code rotates.
        if (joinCode && !world.sessions.has(body?.resumeToken) && !equalSecret(body?.joinCode, joinCode)) throw new GameError('A kingdom invitation code is required.', 403);
        const session = mutate(() => {
          const joined = world.join(body?.name, body?.civilization, body?.resumeToken);
          const player = world.authenticate(joined.token); player.lastSeen = performance.now(); player.offline = false; return joined;
        });
        return send(201, session);
      }
      if ((request.method === 'GET' && path === '/world') || (request.method === 'POST' && path === '/command')) {
        const token = (request.headers.authorization ?? '').replace(/^Bearer /, '');
        if (path === '/world') {
          const player = world.authenticate(token); player.lastSeen = performance.now(); player.offline = false;
          return send(200, { ...world.snapshot(player.id), persistence: { ...persistence } });
        }
        const body = await readJson(request);
        // Authenticate after awaiting the body: another command may have rolled back.
        const player = world.authenticate(token);
        const key = request.headers['idempotency-key']; let receipt = null;
        if (key !== undefined) {
          if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new GameError('Invalid Idempotency-Key.');
          if (!store?.receipt) throw new GameError('Idempotent commands require SQLite storage.', 409);
          receipt = { id: hash(token + ':' + key), digest: hash(JSON.stringify(body)) };
          const prior = store.receipt(receipt.id);
          if (prior) {
            if (prior.digest !== receipt.digest) throw new GameError('Idempotency-Key already belongs to a different command.', 409);
            return send(200, JSON.parse(prior.response));
          }
        }
        const result = mutate(() => { player.lastSeen = performance.now(); player.offline = false; world.command(player, body); return { accepted: true, saved: !!store }; }, receipt);
        return send(200, result);
      }
      send(404, { error: 'Route not found.' });
    } catch (error) {
      if (!(error instanceof GameError)) console.error(error);
      if (!response.destroyed) send(error.status ?? 500, { error: error instanceof GameError ? error.message : 'Internal error.' });
    }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    try { if (!persistence.error) { world.tick((now - previous) / 1000); world.expire(now); } lastTick = now; }
    catch { simulationFailed = true; persistence.error = 'Simulation failed. Restart the kingdom after checking server logs.'; console.error(persistence.error); clearInterval(timer); }
    previous = now;
  }, 100); timer.unref();
  const autosave = setInterval(saveNow, 2000); autosave.unref();
  const cleanup = () => { if (closed) return; clearInterval(timer); clearInterval(autosave); saveNow(); store?.close?.(); closed = true; };
  server.on('listening', saveNow); server.on('close', cleanup); server.on('error', cleanup);
  return { server, world, saveNow, persistence };
}
