import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGameServer } from './http.mjs';
import { createRealmHost, openRealm } from './realms.mjs';
import { World } from './world.mjs';
import { WorldStore } from './storage.mjs';

const DAY = 86400000;
const dir = () => mkdtempSync(join(tmpdir(), 'myth-realms-'));
const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)); });
const close = server => new Promise(resolve => server.close(resolve));
async function call(base, path, { method = 'GET', body = null, token = '', key = '' } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (key) headers['Idempotency-Key'] = key;
  if (body !== null) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: body === null ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload = null;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  return { status: response.status, payload };
}
const nextBuilders = ms => {
  let day = Math.floor(ms / DAY);
  while (((day % 7) + 7) % 7 !== 4) day++;
  return day * DAY + 3_600_000;
};

test('three kingdoms isolate sessions, diplomacy, combat, vision, seasons and recovery', async t => {
  const root = dir();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const paths = ['dawn', 'birch', 'cinder'].map(id => join(root, id, 'world.json'));
  const host = createRealmHost({
    defaultId: 'dawn',
    realms: [
      { id: 'dawn', name: 'Dawn Kingdom', description: 'First shore', savePath: paths[0] },
      { id: 'birch', name: 'Birch Kingdom', description: 'Second shore', savePath: paths[1] },
      { id: 'cinder', name: 'Cinder Kingdom', savePath: paths[2] }
    ]
  });
  const base = await listen(host.server);
  t.after(() => close(host.server));
  const listed = await call(base, '/kingdoms');
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.payload.kingdoms.map(kingdom => kingdom.id), ['dawn', 'birch', 'cinder']);
  assert.equal(JSON.stringify(listed.payload).includes('token'), false);
  assert.equal(listed.payload.kingdoms[0].capacity, 32);
  assert.equal(listed.payload.kingdoms[0].join, 'open');
  const dawn = await call(base, '/k/dawn/join', { method: 'POST', body: { name: 'Hera', civilization: 'greek' } });
  const birch = await call(base, '/k/birch/join', { method: 'POST', body: { name: 'Hera', civilization: 'norse' } });
  const other = await call(base, '/k/dawn/join', { method: 'POST', body: { name: 'Ion', civilization: 'egyptian' } });
  const cinder = await call(base, '/k/cinder/join', { method: 'POST', body: { name: 'Sol', civilization: 'chinese' } });
  assert.equal(dawn.status, 201); assert.equal(birch.status, 201);
  assert.notEqual(dawn.payload.playerId, birch.payload.playerId);
  assert.equal((await call(base, '/k/dawn/world', { token: dawn.payload.token })).status, 200);
  assert.equal((await call(base, '/k/birch/world', { token: dawn.payload.token })).status, 401);
  assert.equal((await call(base, '/k/missing/world', { token: dawn.payload.token })).status, 404);
  assert.equal((await call(base, '/world', { token: dawn.payload.token })).payload.kingdomId, 'dawn');
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'move', x: 12, z: 12, kingdomId: 'birch' } })).status, 409);
  const malformed = await fetch(base + '/k/dawn/command', { method: 'POST', headers: { Authorization: 'Bearer ' + dawn.payload.token, 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(malformed.status, 400);
  const founded = await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'alliance-create', name: 'Oak Pact' } });
  const foundedBirch = await call(base, '/k/birch/command', { method: 'POST', token: birch.payload.token, body: { type: 'alliance-create', name: 'Oak Pact' } });
  assert.equal(founded.status, 200); assert.equal(foundedBirch.status, 200);
  const dawnAlliance = host.realms.get('dawn').world.players.get(dawn.payload.playerId).allianceId;
  const birchAlliance = host.realms.get('birch').world.players.get(birch.payload.playerId).allianceId;
  assert.notEqual(dawnAlliance, birchAlliance);
  const crossJoin = await call(base, '/k/dawn/command', { method: 'POST', token: other.payload.token, body: { type: 'alliance-join', targetId: birchAlliance } });
  assert.equal(crossJoin.status, 400);
  assert.equal(host.realms.get('dawn').world.players.get(other.payload.playerId).allianceId, '');
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'diplomacy-propose', targetId: birchAlliance } })).status, 400);
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'coalition-invite', targetId: birchAlliance } })).status, 400);
  assert.equal(host.realms.get('birch').world.diplomacy.pacts.length, 0);
  assert.equal(host.realms.get('birch').world.coalitions.length, 0);
  const birchHealth = host.realms.get('birch').world.players.get(birch.payload.playerId).health;
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'attack-player', targetId: birch.payload.playerId } })).status, 400);
  const rallyId = 'birch-rally-1';
  host.realms.get('birch').world.rallies.push({ id: rallyId, allianceId: birchAlliance, phase: 'Assembling', assemblyEnds: 999, armyIds: ['birch-only'], meetX: 5, meetZ: 5 });
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: other.payload.token, body: { type: 'rally-join', targetId: rallyId } })).status, 400);
  assert.deepEqual(host.realms.get('birch').world.rallies[0].armyIds, ['birch-only']);
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'garrison-join', targetId: 'foreign-gate' } })).status, 400);
  host.realms.get('dawn').world.players.get(dawn.payload.playerId).buildings.market = 1;
  const wood = host.realms.get('dawn').world.players.get(dawn.payload.playerId).wood;
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'resource-transfer', targetId: birch.payload.playerId, name: 'wood', count: 10, jobId: '1-cross-realm-transfer' } })).status, 400);
  assert.equal(host.realms.get('dawn').world.players.get(dawn.payload.playerId).wood, wood);
  assert.equal(host.realms.get('birch').world.players.get(birch.payload.playerId).health, birchHealth);
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'chat-send', targetId: 'alliance', name: 'Dawn cipher only' } })).status, 200);
  host.realms.get('dawn').world.flags.push({ id: 'dawn-beacon-secret', allianceId: dawnAlliance, x: 8, z: 8, builderId: dawn.payload.playerId, health: 100, maxHealth: 100, buildRemaining: 0, isRoot: true, connected: true });
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: dawn.payload.token, body: { type: 'scout-send', x: 30, z: 30 } })).status, 200);
  for (let step = 0; step < 80; step++) host.realms.get('dawn').world.tick(0.25);
  const seen = await call(base, '/k/dawn/world', { token: dawn.payload.token });
  const hidden = await call(base, '/k/birch/world', { token: birch.payload.token });
  assert.equal(seen.payload.chatMessages.some(message => message.text === 'Dawn cipher only'), true);
  assert.equal(JSON.stringify(hidden.payload).includes('Dawn cipher only'), false);
  assert.equal(JSON.stringify(hidden.payload).includes('dawn-beacon-secret'), false);
  assert.equal(JSON.stringify(hidden.payload).includes(dawn.payload.playerId), false);
  assert.ok(seen.payload.exploration.reports.length > 0);
  assert.equal(hidden.payload.exploration.reports.length, 0);
  assert.equal(hidden.payload.rankings.players.some(row => row.id === dawn.payload.playerId), false);
  const before = hidden.payload.season.index;
  const jumped = host.realms.get('dawn').world.activityClockMs + 29 * DAY;
  host.realms.get('dawn').world.now = () => jumped;
  host.realms.get('dawn').tick(performance.now());
  const advanced = await call(base, '/k/dawn/world', { token: dawn.payload.token });
  const steady = await call(base, '/k/birch/world', { token: birch.payload.token });
  assert.equal(advanced.payload.season.index, before + 1);
  assert.equal(steady.payload.season.index, before);
  const opened = nextBuilders(host.realms.get('dawn').world.activityClockMs);
  host.realms.get('dawn').world.now = () => opened;
  host.realms.get('dawn').tick(performance.now());
  await call(base, '/k/dawn/world', { token: other.payload.token });
  const claimer = host.realms.get('dawn').world.players.get(other.payload.playerId);
  claimer.events['oath-of-the-builders'].progress.development = 2;
  const card = (await call(base, '/k/dawn/world', { token: other.payload.token })).payload.activity.events.find(event => event.id === 'oath-of-the-builders');
  const birchGold = host.realms.get('birch').world.players.get(birch.payload.playerId).gold;
  assert.equal((await call(base, '/k/dawn/command', { method: 'POST', token: other.payload.token, body: { type: 'event-claim', targetId: 'oath-of-the-builders', period: card.period } })).status, 200);
  assert.equal((await call(base, '/k/birch/command', { method: 'POST', token: birch.payload.token, body: { type: 'event-claim', targetId: 'oath-of-the-builders', period: card.period } })).status, 400);
  assert.equal(host.realms.get('birch').world.players.get(birch.payload.playerId).gold, birchGold);
  assert.equal(claimer.events['oath-of-the-builders'].claimed, true);
  const health = await call(base, '/health');
  assert.equal(health.payload.version, 16);
  assert.equal(health.payload.realms.find(realm => realm.id === 'cinder').players, 1);
  assert.equal(typeof health.payload.realms[0].tickMs, 'number');
  assert.equal(health.payload.realms[0].persistence.healthy, true);
  const token = dawn.payload.token, playerId = dawn.payload.playerId;
  await close(host.server);
  const restored = createRealmHost({ defaultId: 'dawn', realms: [
    { id: 'dawn', name: 'Dawn Kingdom', savePath: paths[0] },
    { id: 'birch', name: 'Birch Kingdom', savePath: paths[1] },
    { id: 'cinder', name: 'Cinder Kingdom', savePath: paths[2] }
  ] });
  const again = await listen(restored.server);
  t.after(() => close(restored.server));
  const resumed = await call(again, '/k/dawn/join', { method: 'POST', body: { name: 'Hera', resumeToken: token } });
  assert.equal(resumed.status, 201); assert.equal(resumed.payload.playerId, playerId);
  assert.equal((await call(again, '/k/birch/join', { method: 'POST', body: { name: 'Hera', resumeToken: token } })).status, 400);
  assert.equal(restored.realms.get('birch').world.players.get(birch.payload.playerId).name, 'Hera');
  assert.equal(restored.realms.get('cinder').world.players.size, 1);
});

test('a failed or interrupted save in one kingdom does not corrupt another', async t => {
  const root = dir();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const kept = join(root, 'kept.json'), paused = join(root, 'paused.json');
  const seed = new World(); const session = seed.join('Kept'); new WorldStore(kept).save(seed);
  let fail = false;
  const disk = new WorldStore(paused);
  const host = createRealmHost({ defaultId: 'kept', realms: [
    { id: 'kept', name: 'Kept Kingdom', savePath: kept },
    { id: 'paused', name: 'Paused Kingdom', store: { load: () => disk.load(), save() { if (fail) throw new Error('disk full'); disk.save(...arguments); }, close() {} } }
  ] });
  const base = await listen(host.server);
  t.after(() => close(host.server));
  const city = await call(base, '/k/paused/join', { method: 'POST', body: { name: 'Paused' } });
  assert.equal(city.status, 201);
  fail = true;
  const denied = await call(base, '/k/paused/command', { method: 'POST', token: city.payload.token, body: { type: 'chat-send', name: 'Must not remain' } });
  assert.equal(denied.status, 503);
  assert.equal(host.realms.get('paused').world.messages.some(message => message.text === 'Must not remain'), false);
  const keptJoin = await call(base, '/join', { method: 'POST', body: { name: 'Second', resumeToken: session.token } });
  assert.equal(keptJoin.status, 201); assert.equal(keptJoin.payload.playerId, session.playerId);
  assert.equal((await call(base, '/k/kept/command', { method: 'POST', token: session.token, body: { type: 'chat-send', name: 'Kept speaking' } })).status, 200);
  host.realms.get('kept').world.tick = () => { throw new Error('simulation exploded'); };
  host.realms.get('kept').tick(performance.now());
  assert.match(host.realms.get('kept').persistence.error, /Simulation failed/);
  assert.equal(host.realms.get('paused').persistence.error.includes('Simulation'), false);
  await close(host.server);
  const reloaded = new WorldStore(kept).load();
  assert.equal(reloaded.authenticate(session.token).name, 'Kept');
  assert.equal(reloaded.messages.some(message => message.text === 'Kept speaking'), true);
  const primary = readFileSync(paused, 'utf8');
  writeFileSync(paused, '{'); writeFileSync(paused + '.bak', '{');
  assert.throws(() => openRealm({ id: 'paused', name: 'Paused Kingdom', savePath: paused }), /preserved/);
  assert.equal(readFileSync(paused, 'utf8'), '{');
  writeFileSync(paused, primary);
});

test('idempotency, schema 25, older saves, SQLite accounts and legacy mode stay realm scoped', async t => {
  const root = dir();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const jsonPath = join(root, 'old.json');
  const world = new World(); const saved = world.join('Schema'); world.command(world.authenticate(saved.token), { type: 'chat-send', name: 'Schema note' });
  new WorldStore(jsonPath).save(world);
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8'));
  assert.equal(raw.schema, 25);
  const current = openRealm({ id: 'local', name: 'Local Kingdom', savePath: jsonPath });
  assert.equal(current.world.authenticate(saved.token).name, 'Schema');
  current.close();
  raw.schema = 24; delete raw.world.season;
  writeFileSync(jsonPath, JSON.stringify(raw));
  const migrated = openRealm({ id: 'local', name: 'Local Kingdom', savePath: jsonPath });
  assert.equal(migrated.world.authenticate(saved.token).name, 'Schema');
  migrated.close();
  const host = createRealmHost({ defaultId: 'north', realms: [
    { id: 'north', name: 'North Ledger', databasePath: join(root, 'north.sqlite') },
    { id: 'south', name: 'South Ledger', databasePath: join(root, 'south.sqlite') }
  ] });
  const base = await listen(host.server);
  t.after(() => close(host.server));
  const north = await call(base, '/k/north/join', { method: 'POST', body: { name: 'Same' } });
  const south = await call(base, '/k/south/join', { method: 'POST', body: { name: 'Same' } });
  const key = 'realm-idempotency-key';
  const body = { type: 'chat-send', name: 'Once each' };
  assert.equal((await call(base, '/k/north/command', { method: 'POST', token: north.payload.token, key, body })).status, 200);
  assert.equal((await call(base, '/k/south/command', { method: 'POST', token: south.payload.token, key, body })).status, 200);
  assert.equal((await call(base, '/k/north/command', { method: 'POST', token: north.payload.token, key, body })).status, 200);
  assert.equal(host.realms.get('north').world.messages.filter(message => message.text === 'Once each').length, 1);
  assert.equal(host.realms.get('south').world.messages.filter(message => message.text === 'Once each').length, 1);
  const password = 'realm-password-1';
  const registered = await call(base, '/k/north/auth/register', { method: 'POST', token: north.payload.token, body: { username: 'Hera_North', password } });
  assert.equal(registered.status, 201);
  const southAccount = await call(base, '/k/south/auth/register', { method: 'POST', token: south.payload.token, body: { username: 'Hera_North', password } });
  assert.equal(southAccount.status, 201);
  assert.equal((await call(base, '/k/south/auth/me', { token: registered.payload.token })).status, 401);
  assert.equal((await call(base, '/k/north/auth/me', { token: registered.payload.token })).payload.username, 'hera_north');
  const parallel = await Promise.all([
    call(base, '/k/north/join', { method: 'POST', body: { name: 'Parallel-A' } }),
    call(base, '/k/north/join', { method: 'POST', body: { name: 'Parallel-B' } })
  ]);
  assert.deepEqual(parallel.map(result => result.status).sort(), [201, 201]);
  await close(host.server);
  assert.throws(() => createRealmHost({ realms: [
    { id: 'one', name: 'One', savePath: join(root, 'shared.json') },
    { id: 'two', name: 'Two', savePath: join(root, 'shared.json') }
  ] }), /share a save path/);
  assert.throws(() => createRealmHost({ realms: Array.from({ length: 5 }, (_, index) => ({ id: 'k' + index, name: 'Kingdom ' + index })) }), /four/);
  const legacy = createGameServer();
  const legacyBase = await listen(legacy.server);
  t.after(() => close(legacy.server));
  const card = await call(legacyBase, '/kingdoms');
  assert.equal(card.payload.kingdoms[0].id, 'local');
  const joined = await call(legacyBase, '/join', { method: 'POST', body: { name: 'Legacy' } });
  assert.equal(joined.status, 201);
  assert.equal((await call(legacyBase, '/k/local/world', { token: joined.payload.token })).payload.players.length, 1);
  assert.equal((await call(legacyBase, '/k/other/world', { token: joined.payload.token })).status, 404);
  assert.equal((await call(legacyBase, '/command', { method: 'POST', token: joined.payload.token, body: { type: 'chat-send', name: 'Home only', kingdomId: 'other' } })).status, 409);
  assert.equal((await call(legacyBase, '/world', { token: joined.payload.token })).payload.players.length, 1);
  assert.equal(existsSync(join(root, 'north.sqlite')), true);
});
