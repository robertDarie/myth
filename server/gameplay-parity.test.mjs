import test from 'node:test';
import assert from 'node:assert/strict';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { World } from './testing/legacy-world.mjs';
import { capacity, CITADEL_TROOP_CAPACITY, marchTroopCap } from './city.mjs';
import { trainingBatch, batchCost, trainingOptions } from './troops.mjs';
import { skillInfo } from './progression.mjs';
import { cellIndex } from './exploration.mjs';
const setup = () => { const w = testWorld(), s = w.join('Warden'); return { w, p: w.authenticate(s.token), s }; };

test('citadel troop capacity grows after the first city while the first hall still holds 40', () => {
  const { p } = setup();
  assert.equal(CITADEL_TROOP_CAPACITY[1], 40);
  assert.equal(capacity(p), 40);
  assert.equal(trainingBatch(p), 5);
  p.cityLevel = 5; p.buildings.barracks = 5;
  assert.equal(capacity(p), 340 + 20);
  assert.equal(trainingBatch(p), 40);
});

test('training quotes come from the hall and match the order the server will run', () => {
  const { p } = setup();
  const early = trainingOptions(p).find(t => t.id === 'infantry');
  assert.equal(early.orderAmount, 5);
  assert.equal(early.orderCost.food, 50);
  assert.equal(early.orderSeconds, 8);
  p.buildings.barracks = 5;
  const late = trainingOptions(p).find(t => t.id === 'archers');
  assert.equal(late.orderAmount, 40);
  assert.equal(late.orderCost.food, Math.ceil(55 * 40 / 5));
  assert.ok(Math.abs(late.orderSeconds - 10 * 8 / 1.4) < 0.001);
  const veteran = trainingOptions(p).find(t => t.id === 'veteranInfantry');
  assert.equal(veteran.orderAmount, 40);
  assert.ok(veteran.promotionSeconds > 0 && veteran.promotionSeconds < veteran.orderSeconds);
});

test('a new commander reports locked talents and a zero Mana respec until a point is spent', () => {
  const { p } = setup();
  const info = skillInfo(p, 'captain');
  assert.equal(info.talents.length, 3);
  assert.equal(info.respecMana, 0);
  assert.match(info.respecLockedReason, /no talents/);
  assert.match(info.talents[0].nodes[0].lockedReason, /No talent points/);
  assert.equal(info.talents[0].nodes[1].available, false);
});

test('a larger training order spends the same resources and time per soldier', () => {
  const { w, p } = setup();
  p.cityLevel = 5; p.buildings.barracks = 5; p.food = 100000; p.gold = 100000;
  const before = p.food;
  w.command(p, { type: 'train', targetId: 'infantry' });
  const job = p.trainingQueue[0];
  assert.equal(job.amount, 40);
  assert.equal(p.food, before - batchCost({ food: 50, gold: 20 }, 40).food);
  assert.ok(Math.abs(job.duration - 8 * 8 / 1.4) < 0.001);
  const forged = w.toSave();
  forged.world.players[0].trainingQueue[0].amount = 1000;
  assert.throws(() => World.fromSave(forged), /training order/);
});

test('talent points come from commander level, obey prerequisites and respec for Mana', () => {
  const { w, p } = setup();
  p.gold = 1000; p.food = 1000; p.mana = 100;
  assert.throws(() => w.command(p, { type: 'talent-raise', targetId: 'captain', name: 'line-oath' }), /No talent points/);
  for (let i = 0; i < 4; i++) w.command(p, { type: 'mentor-commander', targetId: 'captain' });
  assert.equal(p.heroRecords.captain.xp, 400);
  w.command(p, { type: 'talent-raise', targetId: 'captain', name: 'line-oath' });
  assert.throws(() => w.command(p, { type: 'talent-raise', targetId: 'captain', name: 'bulwark' }), /No talent points/);
  p.heroRecords.captain.xp = 900;
  assert.throws(() => w.command(p, { type: 'talent-raise', targetId: 'captain', name: 'bulwark' }), /preceding/);
  const plain = w.stats(p).damage;
  w.command(p, { type: 'talent-raise', targetId: 'captain', name: 'line-oath' });
  assert.ok(w.stats(p).damage > plain);
  const mana = p.mana;
  w.command(p, { type: 'talent-respec', targetId: 'captain' });
  assert.deepEqual(p.heroRecords.captain.talents, {});
  assert.equal(p.mana, mana - 30);
  const other = w.authenticate(w.join('Stranger').token);
  assert.equal(w.snapshot(other.id).players.find(q => q.id === p.id).heroProgress, undefined);
});

test('explored landmarks stay distinguishable from concealed military memory', () => {
  const { w, p } = setup();
  const node = w.nodes.find(n => n.x > 40);
  p.x = node.x; p.z = node.z; w.tick(0.1); w.snapshot(p.id);
  assert.ok(p.explored.includes(cellIndex(node)));
  p.x = p.homeX; p.z = p.homeZ; w.tick(0.1);
  const remembered = w.snapshot(p.id).nodes.find(n => n.id === node.id);
  assert.equal(remembered.lastKnown, true);
  assert.equal(remembered.terrainExplored, true);
  assert.equal(remembered.troops, undefined);
});

test('a schema 18 save without talents loads the same commander and starts with an empty tree', () => {
  const { w, s, p } = setup();
  p.heroRecords.captain.xp = 250;
  const old = w.toSave();
  delete old.world.players[0].heroRecords.captain.talents;
  const restored = World.fromSave(old);
  const loaded = restored.authenticate(s.token);
  assert.equal(loaded.heroRecords.captain.xp, 250);
  assert.deepEqual(loaded.heroRecords.captain.talents, {});
  assert.equal(restored.toSave().schema, 27);
});

test('one march can hold only its share of the city store, and an older oversized march still loads', () => {
  const { w, p } = setup();
  assert.equal(marchTroopCap(p), 40);
  assert.equal(w.snapshot(p.id).players.find(player => player.id === p.id).marchTroopCap, 40);
  p.cityLevel = 2;
  assert.equal(capacity(p), 80);
  assert.equal(marchTroopCap(p), 40);
  p.reserveUnits = { infantry: 50, archers: 0, cavalry: 0 };
  p.reserveTroops = 50;
  p.ownedCommanders.push('warden');
  assert.throws(() => w.command(p, { type: 'deploy-march', targetId: 'warden', units: { infantry: 41, archers: 0, cavalry: 0 }, mythic: 0 }), /march can hold 40/);
  assert.equal(p.reserveTroops, 50);
  assert.equal(p.marches.length, 0);
  w.command(p, { type: 'deploy-march', targetId: 'warden', units: { infantry: 40, archers: 0, cavalry: 0 }, mythic: 0 });
  assert.equal(p.marches[0].troops, 40);
  assert.equal(p.reserveTroops, 10);
  assert.throws(() => w.command(p, { type: 'deploy-march', targetId: 'warden', units: { infantry: 10, archers: 0, cavalry: 0 }, mythic: 0 }));
  assert.equal(p.reserveTroops, 10);
  assert.throws(() => w.command(p, { type: 'reinforce', marchId: p.marches[0].id }), /holds 40/);
  assert.equal(p.reserveTroops, 10);
  const saved = w.toSave();
  const blob = saved.world.players.find(player => player.id === p.id);
  blob.marches[0].troops = 50;
  blob.marches[0].units.infantry = 50;
  blob.marches[0].health = 100000;
  blob.reserveTroops = 0;
  blob.reserveUnits.infantry = 0;
  const restored = World.fromSave(saved);
  const q = [...restored.players.values()].find(player => player.id === p.id);
  assert.equal(q.marches[0].troops, 50);
  assert.equal(restored.toSave().schema, 27);
  assert.throws(() => restored.command(q, { type: 'configure-march', marchId: q.marches[0].id, targetId: 'warden', units: { infantry: 50, archers: 0, cavalry: 0 }, mythic: 0 }), /march can hold 40/);
  assert.equal(q.marches[0].troops, 50);
  restored.command(q, { type: 'configure-march', marchId: q.marches[0].id, targetId: 'warden', units: { infantry: 40, archers: 0, cavalry: 0 }, mythic: 0 });
  assert.equal(q.marches[0].troops, 40);
  assert.equal(q.reserveTroops, 10);
});
