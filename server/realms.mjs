import { checkpoint, restoreCheckpoint } from './checkpoint.mjs';
import { createServer } from 'node:http';
import { openSync, closeSync, readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { createHash, timingSafeEqual } from 'node:crypto';
import { World, GameError } from './world.mjs';
import { WorldStore } from './storage.mjs';
import { KingdomDatabase } from './database.mjs';
import { createIdentity } from './identity.mjs';

const ID = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/;
const CAPACITY = 32;
const hash = value => createHash('sha256').update(value).digest('hex');
const equalSecret = (a, b) => timingSafeEqual(Buffer.from(hash(String(a ?? ''))), Buffer.from(hash(String(b ?? ''))));


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

const heldLocks = new Set();
function claimLock(path) {
  const key = resolve(path);
  if (heldLocks.has(key)) throw new Error('Kingdom storage is already open in this process.');
  mkdirSync(dirname(key), { recursive: true });
  const lock = key + '.lock';
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, 'utf8'));
    let alive = false;
    if (Number.isInteger(pid) && pid > 0) { try { process.kill(pid, 0); alive = true; } catch (error) { alive = error.code === 'EPERM'; } }
    if (alive) throw new Error('Kingdom storage is already open by process ' + pid + '.');
    try { unlinkSync(lock); } catch { throw new Error('Kingdom storage is already open.'); }
  }
  const fd = openSync(lock, 'wx');
  writeFileSync(fd, String(process.pid));
  heldLocks.add(key);
  return () => { heldLocks.delete(key); try { closeSync(fd); } catch { /* already closed */ } try { unlinkSync(lock); } catch { /* already removed */ } };
}

export function openRealm(spec) {
  const id = spec?.id;
  const name = spec?.name;
  if (typeof id !== 'string' || !ID.test(id)) throw new Error('A kingdom id must be 1–24 lowercase letters, numbers or hyphens.');
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 32) throw new Error('A kingdom name must be 1–32 characters.');
  const description = spec.description ?? '';
  if (typeof description !== 'string' || description.length > 160) throw new Error('A kingdom description must be 160 characters or fewer.');
  if (spec.savePath && spec.databasePath) throw new Error('Choose JSON or SQLite storage for ' + id + '.');
  const release = spec.store ? () => {} : spec.savePath ? claimLock(spec.savePath) : spec.databasePath ? claimLock(spec.databasePath) : () => {};
  let store = spec.store ?? null;
  let world;
  try {
    store ??= spec.databasePath ? new KingdomDatabase(spec.databasePath) : spec.savePath ? new WorldStore(spec.savePath) : null;
    world = store ? store.load() : new World();
  } catch (error) { try { store?.close?.(); } catch { /* preserve the failed store */ } release(); throw error; }
  const persistence = { enabled: !!store, backend: spec.databasePath ? 'sqlite' : spec.savePath ? 'json' : spec.store ? 'custom' : 'memory', lastSaved: '', error: '' };
  const realm = { id, name: name.trim(), description, world, store, persistence, joinCode: spec.joinCode ?? '', simulationFailed: false, closed: false, lastTick: performance.now(), previous: performance.now(), lastTickMs: 0, lastSnapshotMs: 0, release };
  realm.saveNow = (options = {}) => {
    if (realm.closed || realm.simulationFailed) return false;
    if (!store) return true;
    try { store.save(world, options); persistence.lastSaved = new Date().toISOString(); if (!realm.simulationFailed) persistence.error = ''; return true; }
    catch (error) { persistence.error = 'Progress could not be saved. This kingdom is paused until storage recovers.'; console.error(id + ': ' + persistence.error); return false; }
  };
  realm.mutate = (action, receipt = null, options = {}) => {
    if (persistence.error) throw new GameError(persistence.error, 503);
    const before = store ? checkpoint(world) : null;
    try {
      const result = action();
      if (!realm.saveNow({ ...options, ...(receipt ? { receipt: { ...receipt, response: result } } : {}) })) throw new GameError(persistence.error, 503);
      return result;
    } catch (error) { if (before) restoreCheckpoint(world, before); throw error; }
  };
  realm.identity = createIdentity({ store, world, mutate: realm.mutate });
  realm.tick = now => {
    if (realm.closed || persistence.error || realm.simulationFailed) return;
    const started = performance.now();
    const before = store ? checkpoint(world) : null;
    const revision = world.logisticsRevision;
    try {
      world.tick((now - realm.previous) / 1000); world.expire(now);
      if (before && revision !== world.logisticsRevision && !realm.saveNow()) restoreCheckpoint(world, before);
      realm.lastTick = now; realm.lastTickMs = performance.now() - started;
    } catch (error) {
      if (before) restoreCheckpoint(world, before);
      realm.simulationFailed = true;
      persistence.error = 'Simulation failed. Restart this kingdom after checking server logs.';
      console.error(id + ': ' + persistence.error + ' ' + (error?.message ?? ''));
    }
    realm.previous = now;
  };
  realm.close = () => { if (realm.closed) return; realm.saveNow(); try { store?.close?.(); } catch (error) { console.error(id + ': storage close failed. ' + error.message); } release(); realm.closed = true; };
  realm.publicCard = () => ({ id, name: realm.name, description, players: world.players.size, capacity: CAPACITY, join: world.players.size >= CAPACITY || persistence.error ? 'closed' : 'open', status: persistence.error ? 'degraded' : 'ok' });
  realm.diagnostics = () => ({ ...realm.publicCard(), marches: world.armies().filter(army => army.deployed).length, tickMs: Math.round(realm.lastTickMs), snapshotMs: Math.round(realm.lastSnapshotMs), persistence: { backend: persistence.backend, healthy: !persistence.error } });
  return realm;
}

export function createRealmHost({ realms, defaultId = 'local', shutdownToken = null, trustProxy = false, buildIdentity = null } = {}) {
  if (!Array.isArray(realms) || realms.length < 1 || realms.length > 4) throw new Error('Configure one to four kingdoms.');
  const paths = realms.flatMap(realm => [realm.savePath, realm.databasePath].filter(Boolean).map(path => resolve(path)));
  if (new Set(paths).size !== paths.length) throw new Error('Two kingdoms cannot share a save path.');
  const opened = [];
  try { for (const spec of realms) opened.push(openRealm(spec)); }
  catch (error) { for (const realm of opened) realm.close(); throw error; }
  const byId = new Map(opened.map(realm => [realm.id, realm]));
  if (byId.size !== opened.length) { for (const realm of opened) realm.close(); throw new Error('Kingdom ids must be unique.'); }
  const fallback = byId.get(defaultId);
  if (!fallback) { for (const realm of opened) realm.close(); throw new Error('The default kingdom is not configured.'); }
  const limits = new Map();
  const allow = key => {
    const cap = key.startsWith('identity:') || key.startsWith('join:') ? 20 : 6000;
    const now = Date.now(), entry = limits.get(key);
    if (!entry || now - entry.start >= 60000) {
      if (limits.size >= 10000) for (const [id, value] of limits) if (now - value.start >= 60000) limits.delete(id);
      if (!limits.has(key) && limits.size >= 10000) throw new GameError('Server busy. Retry shortly.', 429);
      limits.set(key, { start: now, count: 1 }); return;
    }
    if (++entry.count > cap) throw new GameError('Too many requests. Retry shortly.', 429);
  };
  const server = createServer(async (request, response) => {
    const send = (status, data) => { if (response.destroyed) return; response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data)); };
    try {
      const url = new URL(request.url, 'http://localhost');
      const path = url.pathname;
      if (request.method === 'GET' && path === '/kingdoms') return send(200, { kingdoms: [...byId.values()].map(realm => realm.publicCard()) });
      if (request.method === 'GET' && path === '/health') return send(200, { status: [...byId.values()].some(realm => realm.persistence.error) ? 'degraded' : 'ok', game: 'thrones-of-myth', version: 16, build: buildIdentity, kingdomId: fallback.id, realms: [...byId.values()].map(realm => realm.diagnostics()) });
      if (request.method === 'POST' && path === '/launcher-shutdown') {
        if (!shutdownToken || !equalSecret(request.headers['x-thrones-launcher'], shutdownToken)) throw new GameError('Launcher authorization required.', 403);
        for (const realm of byId.values()) if (!realm.saveNow()) throw new GameError(realm.id + ' could not be saved.', 503);
        send(200, { saved: true, kingdoms: [...byId.keys()] }); server.close(); server.closeIdleConnections(); return;
      }
      const address = trustProxy ? String(request.headers['x-forwarded-for'] ?? request.socket.remoteAddress).split(',').at(-1).trim() : request.socket.remoteAddress;
      allow('requests:' + address);
      const prefixed = path.match(/^\/k\/([a-z0-9][a-z0-9-]{0,23})(\/.*)?$/);
      let realm = fallback, route = path;
      if (prefixed) {
        realm = byId.get(prefixed[1]);
        if (!realm) throw new GameError('Unknown kingdom.', 404);
        route = prefixed[2] || '/';
      } else if (path.startsWith('/k/')) throw new GameError('Unknown kingdom.', 404);
      await routeRealm(realm, request, response, route, { send, allow, address, trustProxy });
    } catch (error) {
      if (!(error instanceof GameError)) console.error(error);
      if (!response.destroyed && !response.headersSent) send(error.status ?? 500, { error: error instanceof GameError ? error.message : 'Internal error.' });
    }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  const timer = setInterval(() => { const now = performance.now(); for (const realm of byId.values()) realm.tick(now); }, 100); timer.unref();
  const autosave = setInterval(() => { for (const realm of byId.values()) realm.saveNow(); }, 2000); autosave.unref();
  let closed = false;
  const cleanup = () => { if (closed) return; closed = true; clearInterval(timer); clearInterval(autosave); for (const realm of byId.values()) realm.close(); };
  server.on('close', cleanup); server.on('error', cleanup);
  return { server, realms: byId, world: fallback.world, saveNow: () => { for (const realm of byId.values()) realm.saveNow(); }, persistence: fallback.persistence };
}

async function routeRealm(realm, request, response, path, { send, allow, address, trustProxy }) {
  const { world, identity, persistence } = realm;
  if (request.method === 'GET' && path === '/readyz') {
    const ready = !persistence.error && performance.now() - realm.lastTick < 5000;
    return send(ready ? 200 : 503, { status: ready ? 'ok' : 'degraded', game: 'thrones-of-myth', version: 16, kingdomId: realm.id, accounts: identity.available, persistence: { backend: persistence.backend, healthy: !persistence.error } });
  }
  if (path.startsWith('/auth/')) {
    allow('identity:' + address);
    const token = (request.headers.authorization ?? '').replace(/^Bearer /, '');
    if (request.method === 'GET' && path === '/auth/me') return send(200, await identity.handle(path, null, token));
    if (request.method !== 'POST') throw new GameError('Route not found.', 404);
    if (['/auth/register', '/auth/login', '/auth/recover', '/auth/rotate-recovery'].includes(path)) {
      const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress);
      const secure = request.socket.encrypted || (trustProxy && request.headers['x-forwarded-proto'] === 'https');
      if (!local && !secure) throw new GameError('Account credentials require HTTPS.', 403);
    }
    return send(path === '/auth/register' ? 201 : 200, await identity.handle(path, await readJson(request), token));
  }
  if (request.method === 'POST' && path === '/join') {
    allow('join:' + address);
    const body = await readJson(request);
    if (typeof body?.kingdomId === 'string' && body.kingdomId !== realm.id) throw new GameError('That request belongs to another kingdom.', 409);
    if (body?.resumeToken && world.sessions.has(body.resumeToken)) identity.authenticate(body.resumeToken);
    if (realm.joinCode && !world.sessions.has(body?.resumeToken) && !equalSecret(body?.joinCode, realm.joinCode)) throw new GameError('A kingdom invitation code is required.', 403);
    const session = realm.mutate(() => {
      const joined = world.join(body?.name, body?.civilization, body?.resumeToken);
      const player = world.authenticate(joined.token); player.lastSeen = performance.now(); player.offline = false; return joined;
    });
    return send(201, { ...session, kingdomId: realm.id });
  }
  if ((request.method === 'GET' && ['/world', '/commander-comparison'].includes(path)) || (request.method === 'POST' && path === '/command')) {
    const token = (request.headers.authorization ?? '').replace(/^Bearer /, '');
    if (path === '/commander-comparison') {
      const player = identity.authenticate(token);
      const query = new URL(request.url, 'http://localhost').searchParams;
      if (query.get('kingdomId') && query.get('kingdomId') !== realm.id) throw new GameError('That request belongs to another kingdom.', 409);
      return send(200, world.compareCommanders(player, query.get('marchId'), query.get('candidateId')));
    }
    if (path === '/world') {
      const started = performance.now();
      const player = identity.authenticate(token); player.lastSeen = performance.now(); player.offline = false;
      const snapshot = world.snapshot(player.id);
      realm.lastSnapshotMs = performance.now() - started;
      return send(200, { ...snapshot, kingdomId: realm.id, kingdomName: realm.name, persistence: { ...persistence } });
    }
    const body = await readJson(request);
    if (typeof body?.kingdomId === 'string' && body.kingdomId !== realm.id) throw new GameError('That command belongs to another kingdom.', 409);
    const player = identity.authenticate(token);
    const key = request.headers['idempotency-key']; let receipt = null;
    if (key !== undefined) {
      if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new GameError('Invalid Idempotency-Key.');
      if (!realm.store?.receipt) throw new GameError('Idempotent commands require SQLite storage.', 409);
      receipt = { id: hash(realm.id + ':player:' + player.id + ':' + key), digest: hash(JSON.stringify(body)) };
      const prior = realm.store.receipt(receipt.id);
      if (prior) {
        if (prior.digest !== receipt.digest) throw new GameError('Idempotency-Key already belongs to a different command.', 409);
        return send(200, JSON.parse(prior.response));
      }
    }
    const result = realm.mutate(() => { player.lastSeen = performance.now(); player.offline = false; world.command(player, body); return { accepted: true, saved: !!realm.store, kingdomId: realm.id }; }, receipt);
    return send(200, result);
  }
  throw new GameError('Route not found.', 404);
}
