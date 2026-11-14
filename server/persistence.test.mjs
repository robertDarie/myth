import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { KingdomDatabase, backupKingdom } from './testing/legacy-services.mjs';
import { advanceDowntime, OFFLINE_PRODUCTION_CAP } from './downtime.mjs';
import { World } from './testing/legacy-world.mjs';
import { createGameServer } from './testing/legacy-services.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { closeHttpServer, tempDirectory } from './testing/cleanup.mjs';
const bins = new WeakMap();
const directory = t => { const bin = tempDirectory(t, 'tom-db-'); bins.set(t, bin); return bin.dir; };
const track = (t, fn) => bins.get(t).close(fn);
async function listen(t, options) {
  const app = createGameServer(options);
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const bin = bins.get(t); if (bin) bin.server(app.server); else t.after(() => closeHttpServer(app.server));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const post = (path, body, token = '', key = '') => fetch(base + path, { method: 'POST', headers: { Authorization: 'Bearer ' + token, ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) });
  return { ...app, base, post };
}
test('SQLite atomically saves actions and receipts, and retries survive restart without charging twice', async t => {
  const path = join(directory(t), 'kingdom.sqlite'), app = await listen(t, { databasePath: path });
  const s = await (await app.post('/join', { name: 'Database Queen' })).json();
  assert.equal((await app.post('/command', { type: 'train' }, s.token, 'train-once-001')).status, 200);
  assert.equal((await app.post('/command', { type: 'train' }, s.token, 'train-once-001')).status, 200);
  assert.equal(app.world.authenticate(s.token).trainingQueue.length, 1);
  assert.equal((await app.post('/command', { type: 'upgrade' }, s.token, 'train-once-001')).status, 409);
  await new Promise(resolve => app.server.close(resolve));
  const second = await listen(t, { databasePath: path });
  assert.equal((await second.post('/command', { type: 'train' }, s.token, 'train-once-001')).status, 200);
  assert.equal(second.world.authenticate(s.token).trainingQueue.length, 1);
  assert.equal(second.world.authenticate(s.token).food, 150);
});
test('failed commands roll back live state, return 503 and pause until storage recovers', async t => {
  const db = new KingdomDatabase(join(directory(t), 'world.sqlite')); let fail = false;
  const store = { load: () => db.load(), save: (...args) => { if (fail) throw new Error('Disk full'); db.save(...args); }, close: () => db.close() };
  const app = await listen(t, { store }), s = await (await app.post('/join', { name: 'Safe Economy' })).json();
  const food = app.world.authenticate(s.token).food; fail = true;
  assert.equal((await app.post('/command', { type: 'train' }, s.token)).status, 503);
  assert.equal(app.world.authenticate(s.token).food, food); assert.equal(app.world.authenticate(s.token).trainingQueue.length, 0);
  assert.equal((await fetch(app.base + '/readyz')).status, 503);
  assert.equal((await app.post('/command', { type: 'upgrade' }, s.token)).status, 503);
  fail = false; assert.equal(app.saveNow(), true);
  assert.equal((await app.post('/command', { type: 'train' }, s.token)).status, 200);
});
test('failed joins cannot hand out an unpersisted session', async t => {
  let fail = false; const w = testWorld();
  const app = await listen(t, { store: { load: () => w, save: () => { if (fail) throw new Error('Disk full'); } } }); fail = true;
  assert.equal((await app.post('/join', { name: 'Not Committed' })).status, 503);
  assert.equal(w.players.size, 0); assert.equal(w.sessions.size, 0);
});
test('concurrent writers are rejected and an expired former owner is fenced', t => {
  const path = join(directory(t), 'world.sqlite'); let now = 100000;
  const first = new KingdomDatabase(path, { now: () => now }); track(t, () => first.close()); const w = first.load();
  assert.throws(() => new KingdomDatabase(path, { now: () => now }), /active writer/); now += 31000;
  const second = new KingdomDatabase(path, { now: () => now }); track(t, () => second.close()); second.load();
  assert.throws(() => first.save(w), /lease lost/); first.close(); assert.doesNotThrow(() => second.save(w));
});
test('a SQL write failure cannot commit a receipt without its world', t => {
  const store = new KingdomDatabase(join(directory(t), 'world.sqlite')); track(t, () => store.close());
  const w = store.load(), s = w.join('Atomic'); store.save(w);
  store.db.exec("CREATE TRIGGER deny_world BEFORE INSERT ON kingdom BEGIN SELECT RAISE(ABORT, 'disk failure'); END;");
  w.authenticate(s.token).gold = 999;
  assert.throws(() => store.save(w, { receipt: { id: 'one', digest: 'two', response: { accepted: true } } }));
  assert.equal(store.receipt('one'), undefined);
  assert.equal(World.fromSave(JSON.parse(store.db.prepare('SELECT payload FROM kingdom').get().payload)).authenticate(s.token).gold, 150);
});
test('downtime completes paid jobs and healing, and restarting twice never pays twice', t => {
  const path = join(directory(t), 'world.sqlite'); let now = Date.UTC(2026, 10, 8, 12);
  const first = new KingdomDatabase(path, { now: () => now }), w = first.load(), s = w.join('Offline'), p = w.authenticate(s.token);
  w.command(p, { type: 'upgrade' }); w.command(p, { type: 'train' }); w.command(p, { type: 'train', targetId: 'archers' });
  p.healing = { id: 'paid-healing', units: { infantry: 2, archers: 0, cavalry: 0 }, mythic: 0, cost: { gold: 1 }, remaining: 10, duration: 10 };
  first.save(w); first.close(); now += 60000;
  const next = new KingdomDatabase(path, { now: () => now }), q = next.load().authenticate(s.token);
  assert.equal(q.cityLevel, 2); assert.equal(q.trainingQueue.length, 0); assert.equal(q.healing, null);
  assert.equal(q.reserveUnits.infantry, 7); assert.equal(q.reserveUnits.archers, 5); const food = q.food; next.close();
  const third = new KingdomDatabase(path, { now: () => now }); track(t, () => third.close()); const r = third.load().authenticate(s.token);
  assert.equal(r.food, food); assert.equal(r.reserveUnits.infantry, 7); assert.equal(third.recovery.elapsedSeconds, 0);
});
test('passive catch-up caps at eight hours, respects ceilings and never pays for a backward clock', () => {
  const at = Date.UTC(2026, 10, 8, 12), w = testWorld({ now: () => at }), s = w.join('Capped'), data = w.toSave();
  const short = World.fromSave(data, { now: () => at }), long = World.fromSave(data, { now: () => at });
  advanceDowntime(short, at, at + OFFLINE_PRODUCTION_CAP * 1000);
  assert.equal(advanceDowntime(long, at, at + 30 * 86400000).productionSeconds, OFFLINE_PRODUCTION_CAP);
  for (const key of ['wood','food','gold','stone','mana']) assert.equal(long.authenticate(s.token)[key], short.authenticate(s.token)[key]);
  const before = structuredClone(long.toSave()); advanceDowntime(long, at + 30 * 86400000, at); assert.deepEqual(long.toSave(), before);
});
test('jobs credit their completion day, not login day, and downtime invents no field victories', () => {
  const at = Date.UTC(2026, 10, 8, 23, 59), w = testWorld({ now: () => at }), s = w.join('Old Day'); w.command(w.authenticate(s.token), { type: 'train' });
  const restored = World.fromSave(w.toSave(), { now: () => at }); advanceDowntime(restored, at, at + 120000); const p = restored.authenticate(s.token);
  assert.equal(p.reserveTroops, 5); assert.equal(p.daily.counters.trained, 0); assert.equal(p.kills, 0); assert.equal(p.target, null);
});
test('a live online backup restores state and command receipts', async t => {
  const dir = directory(t), path = join(dir, 'world.sqlite'), destination = join(dir, 'backup.sqlite'); let now = Date.now();
  const store = new KingdomDatabase(path, { now: () => now }); track(t, () => store.close()); const w = store.load(), s = w.join('Backed Up');
  store.save(w, { receipt: { id: 'receipt', digest: 'digest', response: { accepted: true } } }); await backupKingdom(path, destination); now += 31000;
  const recovered = new KingdomDatabase(destination, { now: () => now }); track(t, () => recovered.close());
  assert.equal(recovered.load().authenticate(s.token).name, 'Backed Up'); assert.equal(recovered.receipt('receipt').digest, 'digest');
  await assert.rejects(backupKingdom(path, destination), /new backup/);
});
test('JSON migration preserves source bytes and unsupported or damaged databases are preserved', t => {
  const dir = directory(t), source = join(dir, 'world.json'), path = join(dir, 'world.sqlite'), w = testWorld(), s = w.join('Migrated');
  const json = JSON.stringify(w.toSave()); writeFileSync(source, json); const store = new KingdomDatabase(path, { legacyPath: source });
  assert.equal(store.load().authenticate(s.token).name, 'Migrated'); store.close(); assert.equal(readFileSync(source, 'utf8'), json);
  const db = new DatabaseSync(path); db.exec('PRAGMA user_version=99'); db.close(); assert.throws(() => new KingdomDatabase(path), /Unsupported/);
  const check = new DatabaseSync(path, { readOnly: true }); assert.equal(check.prepare('PRAGMA user_version').get().user_version, 99); check.close();
  const damaged = join(dir, 'damaged.sqlite'); writeFileSync(damaged, 'broken'); assert.throws(() => new KingdomDatabase(damaged)); assert.equal(readFileSync(damaged, 'utf8'), 'broken');
});
test('private invitations gate new cities but allow saved-session reconnection', async t => {
  const app = await listen(t, { joinCode: 'private-alpha' }); assert.equal((await app.post('/join', { name: 'Wrong' })).status, 403);
  const s = await (await app.post('/join', { name: 'Invited', joinCode: 'private-alpha' })).json(); assert.ok(s.token);
  assert.equal((await app.post('/join', { resumeToken: s.token })).status, 201);
  assert.equal((await app.post('/command', { type: 'train' }, s.token, 'not-sqlite-01')).status, 409);
  assert.ok(!(await (await fetch(app.base + '/health')).text()).includes('private-alpha'));
});
test('a disconnected client no longer cancels its accepted march', () => {
  const w = testWorld(), s = w.join('Keeps Marching'), p = w.authenticate(s.token); w.command(p, { type: 'move', x: 20, z: 20 }); const target = structuredClone(p.target);
  w.expire(1900001); assert.equal(p.offline, true); assert.deepEqual(p.target, target); const x = p.x; w.tick(.1); assert.ok(p.x > x);
});
test('a backward host clock cannot move the committed downtime watermark backward', t => {
  const path = join(directory(t), 'clock.sqlite'); let now = 100000;
  const first = new KingdomDatabase(path, { now: () => now }); const w = first.load(), s = w.join('Clock Safe'); first.save(w); first.close();
  now = 50000; const second = new KingdomDatabase(path, { now: () => now }); const q = second.load().authenticate(s.token); const food = q.food; second.close();
  now = 100000; const third = new KingdomDatabase(path, { now: () => now }); track(t, () => third.close());
  assert.equal(third.load().authenticate(s.token).food, food); assert.equal(third.recovery.elapsedSeconds, 0);
});
test('a hard-killed process retains the committed WAL state and receipt', async t => {
  const { spawn } = await import('node:child_process'), { once } = await import('node:events');
  const path = join(directory(t), 'crash.sqlite'), moduleUrl = new URL('./testing/legacy-services.mjs', import.meta.url).href;
  const source = `import {KingdomDatabase} from ${JSON.stringify(moduleUrl)}; const db=new KingdomDatabase(process.env.TEST_DB_PATH); const w=db.load(),s=w.join('Crash Survivor'); w.command(w.authenticate(s.token),{type:'train'}); db.save(w,{receipt:{id:'crash-key',digest:'train',response:{accepted:true}}}); process.send(s); setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, TEST_DB_PATH: path }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  track(t, () => child.kill('SIGKILL')); child.stderr.resume();
  const [session] = await once(child, 'message', { signal: AbortSignal.timeout(5000) });
  const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
  const recovered = new KingdomDatabase(path, { now: () => Date.now() + 31000 }); track(t, () => recovered.close());
  const committed = JSON.parse(recovered.db.prepare('SELECT payload FROM kingdom').get().payload);
  assert.equal(committed.world.players[0].food, 150);
  const p = recovered.load().authenticate(session.token);
  assert.ok(p.food >= 150); assert.equal(p.reserveTroops, 5); assert.equal(p.trainingQueue.length, 0); assert.equal(recovered.receipt('crash-key').digest, 'train');
});
