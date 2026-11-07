import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { World } from './world.mjs';
import { WorldStore } from './storage.mjs';
import { createGameServer } from './http.mjs';
const fixture = t => { const dir = mkdtempSync(join(tmpdir(), 'tom-save-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return join(dir, 'world.json'); };

test('save/load retains cities, sessions, queues and alliances and pauses field orders', t => {
  const path = fixture(t), store = new WorldStore(path), w = new World();
  const session = w.join('Saved Queen'), p = w.authenticate(session.token);
  w.command(p, { type: 'upgrade' }); w.command(p, { type: 'train' });
  w.command(p, { type: 'alliance-create', name: 'Persistent Dawn' });
  w.command(p, { type: 'move', x: 20, z: 20 });
  for (let i = 0; i < 30; i++) w.tick(0.1);
  store.save(w);
  const loaded = store.load(), restored = loaded.authenticate(session.token);
  assert.equal(restored.name, 'Saved Queen'); assert.equal(restored.target, null);
  assert.equal(loaded.alliances.get(restored.allianceId).name, 'Persistent Dawn');
  assert.equal(restored.cityLevel, 1); assert.equal(restored.troops, 20); assert.equal(restored.reserveTroops, 0);
  assert.ok(Math.abs(restored.construction.remaining - 17) < 0.001);
  assert.ok(Math.abs(restored.trainingQueue[0].remaining - 5) < 0.001);
  for (let i = 0; i < 180; i++) loaded.tick(0.1);
  assert.equal(restored.cityLevel, 2); assert.equal(restored.reserveTroops, 5);
  assert.deepEqual(loaded.join('Saved Queen', 'greek', session.token), session);
});

test('backup recovers a damaged save and is not overwritten with corrupted content', t => {
  const path = fixture(t), messages = [], store = new WorldStore(path, message => messages.push(message)), w = new World();
  const s = w.join('A'); const p = w.authenticate(s.token);
  store.save(w); p.gold = 300; store.save(w);
  assert.ok(existsSync(path + '.bak'));
  writeFileSync(path, '{damaged');
  const recovered = store.load(); assert.equal(recovered.authenticate(s.token).gold, 150); assert.equal(messages.length, 1);
  store.save(recovered); assert.equal(new WorldStore(path).load().players.size, 1);
  assert.doesNotThrow(() => JSON.parse(readFileSync(path + '.bak', 'utf8')));
});

test('unrecoverable and unsupported saves are preserved instead of silently starting over', t => {
  const path = fixture(t), store = new WorldStore(path);
  writeFileSync(path, '{broken'); assert.throws(() => store.load(), /preserved/);
  assert.equal(readFileSync(path, 'utf8'), '{broken');
  assert.throws(() => World.fromSave({ schema: 99 }), /save format/);
  const w = new World(), session = w.join('A');
  const bad = w.toSave(); bad.world.players[0].gold = -1;
  assert.throws(() => World.fromSave(bad), /values/);
});

test('queue data is independent after deserialization and cannot duplicate refunds', () => {
  const w = new World(), session = w.join('A'), p = w.authenticate(session.token);
  w.command(p, { type: 'train' }); const job = p.trainingQueue[0];
  const restored = World.fromSave(w.toSave()), q = restored.authenticate(session.token);
  restored.command(q, { type: 'cancel-job', targetId: job.id });
  assert.equal(q.food, 200); assert.equal(p.food, 150); assert.equal(p.trainingQueue.length, 1);
  assert.throws(() => restored.command(q, { type: 'cancel-job', targetId: job.id }));
});

test('HTTP autosaves mutations; authenticated launcher shutdown flushes and restores the city', async t => {
  const path = fixture(t), first = createGameServer({ savePath: path, shutdownToken: 'test-launcher-secret' });
  await new Promise((resolve, reject) => { first.server.once('error', reject); first.server.listen(0, '127.0.0.1', resolve); });
  t.after(() => { if (first.server.listening) first.server.close(); });
  const base = `http://127.0.0.1:${first.server.address().port}`;
  const session = await (await fetch(base + '/join', { method: 'POST', body: JSON.stringify({ name: 'Persisted' }) })).json();
  const result = await fetch(base + '/command', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token }, body: JSON.stringify({ type: 'train' }) });
  assert.equal(result.status, 200); assert.equal(new WorldStore(path).load().authenticate(session.token).trainingQueue.length, 1);
  assert.equal((await fetch(base + '/launcher-shutdown', { method: 'POST' })).status, 403);
  assert.equal((await fetch(base + '/launcher-shutdown', { method: 'POST', headers: { 'X-Thrones-Launcher': session.token } })).status, 403);
  const closed = new Promise(resolve => first.server.once('close', resolve));
  const response = await fetch(base + '/launcher-shutdown', { method: 'POST', headers: { 'X-Thrones-Launcher': 'test-launcher-secret' } });
  assert.equal(response.status, 200); await closed;
  const second = createGameServer({ savePath: path });
  // Start and close the new server so its timers are released normally.
  await new Promise(resolve => second.server.listen(0, '127.0.0.1', resolve));
  assert.equal(second.world.authenticate(session.token).name, 'Persisted');
  assert.equal(second.world.players.size, 1);
  await new Promise(resolve => second.server.close(resolve));
});

test('failed save writes leave the last valid world readable', t => {
  const path = fixture(t), store = new WorldStore(path), w = new World();
  const session = w.join('A'); store.save(w);
  // A directory at the temporary-file path simulates a denied/failed write.
  const temporary = path + '.' + process.pid + '.tmp';
  const { gold } = w.authenticate(session.token); w.authenticate(session.token).gold = 999;
  const blocker = new WorldStore(join(temporary, 'nested.json'));
  blocker.save(new World());
  assert.throws(() => store.save(w));
  assert.equal(new WorldStore(path).load().authenticate(session.token).gold, gold);
});

test('migration archives the original schema-1 save before autosaves rotate its ordinary backup', t => {
  const path = fixture(t), w = new World(), session = w.join('Legacy');
  const legacy = structuredClone(w.toSave()); legacy.schema = 1;
  const p = legacy.world.players[0];
  for (const field of ['buildings', 'technologies', 'stone', 'aether', 'sigils', 'research', 'crafting', 'economyClock', 'productionCarry', 'commanderShards', 'commanderRanks', 'summonHistory', 'summonCount', 'epicPity', 'legendaryPity', 'lastOfferingDay', 'ownedRelics', 'equippedRelic']) delete p[field];
  legacy.world.nodes = legacy.world.nodes.filter(n => n.id.startsWith('resource-'));
  const original = JSON.stringify(legacy); writeFileSync(path, original);
  const store = new WorldStore(path), migrated = store.load();
  assert.equal(migrated.authenticate(session.token).stone, 150);
  store.save(migrated); store.save(migrated);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).schema, 5);
  assert.equal(readFileSync(path + '.schema1.bak', 'utf8'), original);
});

test('schema-3 migration archives the untouched generic army before saving the current typed troop format', t => {
  const path = fixture(t), w = new World(), session = w.join('Legacy Formation');
  const legacy = structuredClone(w.toSave()); legacy.schema = 3;
  delete legacy.world.players[0].units; delete legacy.world.players[0].reserveUnits;
  const original = JSON.stringify(legacy); writeFileSync(path, original);
  const store = new WorldStore(path), migrated = store.load();
  assert.equal(migrated.authenticate(session.token).units.infantry, 20);
  store.save(migrated); store.save(migrated);
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).schema, 5);
  assert.equal(readFileSync(path + '.schema3.bak', 'utf8'), original);
});

test('schema-4 migration preserves the original typed roster archive before the war schema saves', t => {
  const path = fixture(t), w = new World(), session = w.join('Before War');
  const old = structuredClone(w.toSave()); old.schema = 4;
  delete old.world.battles; delete old.world.messages; delete old.world.markers;
  for (const p of old.world.players) for (const key of ['wounded','woundedMythic','healing','battleReports','lastChatAt']) delete p[key];
  const original = JSON.stringify(old); writeFileSync(path, original);
  const store = new WorldStore(path), restored = store.load();
  assert.equal(restored.authenticate(session.token).troops, 20); assert.equal(restored.authenticate(session.token).wounded.infantry, 0);
  store.save(restored); store.save(restored);
  assert.equal(JSON.parse(readFileSync(path,'utf8')).schema, 5);
  assert.equal(readFileSync(path + '.schema4.bak','utf8'), original);
});
