import test from 'node:test';
import assert from 'node:assert/strict';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { World } from './world.mjs';
import { capacity, CITADEL_TROOP_CAPACITY } from './city.mjs';
import { trainingBatch, batchCost } from './troops.mjs';
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
  assert.equal(restored.toSave().schema, 18);
});
