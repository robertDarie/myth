import { fixtureCommand, ownCommander } from './testing/roster-fixture.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { emptyUnits, unitTotal } from './troops.mjs';
import { closeHttpServer } from './testing/cleanup.mjs';
const setup = () => {
  const w = testWorld({ now: () => Date.UTC(2026, 10, 2, 12) }), session = w.join('Formation'), p = w.authenticate(session.token);
  p.cityLevel = 3; for (const key of ['food','gold','wood','stone','mana']) p[key] = 10000;
  fixtureCommand(w,p, { type: 'unlock-commander', targetId: 'warden' }); return { w, p, session };
};
const advance = (w, n) => { for (let i = 0; i < n * 10; i++) w.tick(0.1); };
const grant = (p, units, mythic = 0) => { p.reserveUnits = { ...emptyUnits(), ...units }; p.reserveTroops = unitTotal(p.reserveUnits); p.reserveMythic = mythic; };
const config = (w, p, units, mythic = 0, extra = {}) => fixtureCommand(w,p, { type: 'configure-march', units: { ...emptyUnits(), ...units }, mythic, targetId: 'captain', ...extra });

test('typed training completes into the correct reserve and cancellation returns its exact price', () => {
  const { w, p } = setup();
  for (const id of ['infantry', 'archers', 'cavalry']) fixtureCommand(w,p, { type: 'train', targetId: id });
  advance(w, 31); assert.deepEqual(p.reserveUnits, { infantry: 5, archers: 5, cavalry: 5 }); assert.equal(p.reserveTroops, 15);
  const gold = p.gold, food = p.food;
  fixtureCommand(w,p, { type: 'train', targetId: 'cavalry' }); const job = p.trainingQueue[0];
  fixtureCommand(w,p, { type: 'cancel-job', targetId: job.id });
  assert.equal(p.gold, gold); assert.equal(p.food, food); assert.equal(p.reserveUnits.cavalry, 5);
  p.cityLevel = 1; assert.throws(() => fixtureCommand(w,p, { type: 'train', targetId: 'cavalry' }), /Citadel/);
  assert.throws(() => fixtureCommand(w,p, { type: 'train', targetId: 'unknown' }), /troop type/);
});

test('a new march deploys exact mixed counts and leaves every unselected troop in the city', () => {
  const { w, p } = setup(); grant(p, { infantry: 8, archers: 9, cavalry: 7 }, 2);
  fixtureCommand(w,p, { type: 'deploy-march', targetId: 'warden', units: { infantry: 1, archers: 3, cavalry: 2 }, mythic: 1 });
  const a = p.marches[0]; assert.equal(a.troops, 6); assert.equal(a.mythic, 1);
  assert.deepEqual(a.units, { infantry: 1, archers: 3, cavalry: 2 });
  assert.deepEqual(p.reserveUnits, { infantry: 7, archers: 6, cavalry: 5 }); assert.equal(p.reserveTroops, 18); assert.equal(p.reserveMythic, 1);
});

test('formation replacement exchanges exact types without duplicating units or permitting free field healing', () => {
  const { w, p } = setup(); grant(p, { archers: 8, cavalry: 5 }, 1);
  config(w, p, { infantry: 7, archers: 3 });
  assert.deepEqual(p.units, { infantry: 7, archers: 3, cavalry: 0 }); assert.equal(p.reserveUnits.infantry, 13);
  config(w, p, { archers: 8, cavalry: 5 }, 1);
  assert.equal(p.reserveTroops, 20); assert.equal(p.reserveUnits.infantry, 20); assert.equal(p.reserveMythic, 0);
  const before = structuredClone({ units: p.units, reserve: p.reserveUnits });
  p.health--; assert.throws(() => config(w, p, { infantry: 1 }), /Recover fully/);
  assert.deepEqual({ units: p.units, reserve: p.reserveUnits }, before);
  p.health = w.stats(p).maxHealth; p.x += 5; assert.throws(() => config(w, p, { infantry: 1 }), /home/);
});

test('bad and unavailable troop selections fail atomically, including unknown types and empty marches', () => {
  const { w, p } = setup(); grant(p, { infantry: 7 });
  const before = JSON.stringify(w.toSave());
  for (const units of [null, [], { infantry: 1 }, { infantry: -1, archers: 0, cavalry: 0 }, { infantry: 1.5, archers: 0, cavalry: 0 }, { infantry: '1', archers: 0, cavalry: 0 }, { infantry: 1, archers: 0, cavalry: 0, dragon: 1 }, emptyUnits(), { infantry: 0, archers: 1, cavalry: 0 }])
    assert.throws(() => fixtureCommand(w,p, { type: 'deploy-march', targetId: 'warden', units, mythic: 0 }));
  assert.equal(JSON.stringify(w.toSave()), before);
  assert.throws(() => config(w, p, {}, 0), /at least one/);
});

test('reinforcing and disbanding preserve typed troops and cannot consume another city reserves', () => {
  const { w, p } = setup(); grant(p, { archers: 5, cavalry: 3 });
  fixtureCommand(w,p, { type: 'deploy-march', targetId: 'warden', units: { infantry: 0, archers: 2, cavalry: 1 } });
  const a = p.marches[0], other = w.authenticate(w.join('Outsider').token);
  assert.throws(() => config(w, other, { infantry: 1 }, 0, { marchId: a.id }), /belong/);
  fixtureCommand(w,p, { type: 'reinforce', marchId: a.id }); assert.deepEqual(a.units, { infantry: 0, archers: 5, cavalry: 3 });
  fixtureCommand(w,p, { type: 'disband-march', marchId: a.id }); assert.deepEqual(p.reserveUnits, { infantry: 0, archers: 5, cavalry: 3 });
  assert.throws(() => fixtureCommand(w,p, { type: 'disband-march', marchId: a.id })); assert.equal(p.reserveTroops, 8);
});

test('troop statistics give archers higher damage and pure cavalry its advertised speed', () => {
  const { w, p } = setup(); grant(p, { archers: 20, cavalry: 20 }, 1);
  const infantry = w.stats(p); config(w, p, { archers: 20 }); const archers = w.stats(p);
  assert.ok(archers.damage > infantry.damage); assert.ok(archers.maxHealth < infantry.maxHealth);
  config(w, p, { cavalry: 20 }); assert.equal(w.stats(p).speed, infantry.speed * 1.2);
  config(w, p, { cavalry: 19, infantry: 1 }); assert.equal(w.stats(p).speed, infantry.speed);
  config(w, p, { cavalry: 20 }, 1); assert.equal(w.stats(p).speed, infantry.speed);
});

test('current schema preserves typed formations and pending orders, while schema-3 migrates all generic troops once', () => {
  const { w, p, session } = setup(); grant(p, { archers: 7, cavalry: 5 });
  fixtureCommand(w,p, { type: 'deploy-march', targetId: 'warden', units: { infantry: 0, archers: 3, cavalry: 2 } });
  fixtureCommand(w,p, { type: 'train', targetId: 'archers' });
  const restored = World.fromSave(w.toSave()), q = restored.authenticate(session.token);
  assert.deepEqual(q.reserveUnits, p.reserveUnits); assert.deepEqual(q.marches[0].units, p.marches[0].units);
  advance(restored, 11); assert.equal(q.reserveUnits.archers, 9);
  const old = structuredClone(w.toSave()); old.schema = 3;
  delete old.world.players[0].reserveUnits; delete old.world.players[0].units; delete old.world.players[0].marches[0].units;
  delete old.world.players[0].trainingQueue[0].targetId;
  const migrated = World.fromSave(old), m = migrated.authenticate(session.token);
  assert.deepEqual(m.units, { infantry: 20, archers: 0, cavalry: 0 }); assert.equal(m.reserveUnits.infantry, 7);
  assert.equal(m.marches[0].units.infantry, 5); assert.equal(m.trainingQueue[0].targetId, 'infantry');
  assert.equal(migrated.toSave().schema,17); assert.deepEqual(World.fromSave(migrated.toSave()).authenticate(session.token).reserveUnits, m.reserveUnits);
});

test('current schema rejects forged or mismatched composition data instead of silently repairing it', () => {
  const { w } = setup();
  for (const mutate of [p => p.units.infantry++, p => p.reserveUnits.archers = -1, p => delete p.units, p => p.units.cavalry = 0.5, p => p.reserveMythic = 0.5, p => p.mythic = 0.5]) {
    const bad = structuredClone(w.toSave()); mutate(bad.world.players[0]); assert.throws(() => World.fromSave(bad), /troop|composition/);
  }
});

test('HTTP accepts the Unity-style exact-count payload and exposes typed reserves and skill metadata', async t => {
  const { createGameServer } = await import('./http.mjs');
  const { server, world } = createGameServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => closeHttpServer(server));
  const base = 'http://127.0.0.1:' + server.address().port;
  const session = await (await fetch(base + '/join', { method: 'POST', body: JSON.stringify({ name: 'HTTP Legion', civilization: 'greek' }) })).json();
  const p = world.authenticate(session.token); p.cityLevel = 2; p.gold = p.food = 1000;
  const command = body => fetch(base + '/command', { method: 'POST', headers: { Authorization: 'Bearer ' + session.token }, body: JSON.stringify(body) });
  assert.equal((await command({ type: 'train', targetId: 'archers', troops: 0, mythic: 0, units: null })).status, 200);
  advance(world, 11);
  ownCommander(p,'warden');
  assert.equal((await command({ type: 'deploy-march', targetId: 'warden', troops: 0, mythic: 0, units: { infantry: 0, archers: 3, cavalry: 0 } })).status, 200);
  const snapshot = await (await fetch(base + '/world', { headers: { Authorization: 'Bearer ' + session.token } })).json();
  assert.equal(snapshot.version,16); assert.equal(snapshot.troopTypes.length, 6);
  assert.equal(snapshot.players[0].reserveUnits.archers, 2); assert.equal(snapshot.players.find(a=>a.id===session.playerId).homeFormations[1].units.archers, 3);
  assert.equal(snapshot.players.find(a=>a.id===session.playerId).homeFormations[1].skillKind, 'shield'); assert.equal(snapshot.commanders.find(c => c.id === 'rune-seer').skillKind, 'heal');
});


test('mythic-only selections are legal and still preserve mortal reserves', () => {
  const { w, p } = setup(); grant(p, { infantry: 7 }, 2);
  fixtureCommand(w,p, { type: 'deploy-march', targetId: 'warden', units: emptyUnits(), mythic: 1 });
  const a = p.marches[0]; assert.equal(a.troops, 0); assert.equal(a.mythic, 1); assert.ok(w.stats(a).maxHealth > 0);
  assert.equal(p.reserveUnits.infantry, 7); assert.equal(p.reserveMythic, 1);
  config(w, p, {}, 1); assert.equal(p.troops, 0); assert.equal(p.reserveUnits.infantry, 27);
  assert.equal(World.fromSave(w.toSave()).players.get(p.id).units.infantry, 0);
});
