import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from './testing/legacy-world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { TROOP_TYPES, troopCensus, militaryRoster } from './troops.mjs';

const catalog = JSON.parse(readFileSync(new URL('../research/parity/fixtures/prototype-troops.json', import.meta.url), 'utf8'));
const fixture = () => { const w = testWorld(), s = w.join('Muster'); const p = w.authenticate(s.token); p.food = p.wood = p.stone = p.gold = p.mana = 8000; return { w, s, p }; };
const order = (w, p, type, targetId, requestId) => w.command(p, { type, targetId, requestId });

test('existing troop costs and stats stay unchanged', () => {
  const live = TROOP_TYPES.map(t => ({ id: t.id, tier: t.tier, role: t.role, health: t.health, damage: t.damage, speed: t.speed, duration: t.duration, cityLevel: t.cityLevel, cost: t.cost }));
  assert.equal(TROOP_TYPES.length, 15);
  assert.deepEqual(JSON.parse(JSON.stringify(live)), catalog.items);
  assert.equal(militaryRoster().siegeAvailable, false);
  assert.equal(militaryRoster().productionClasses, 3);
});

test('a repeated training request does not open a second batch', () => {
  const { w, s, p } = fixture();
  const before = troopCensus(p).total;
  order(w, p, 'train', 'infantry', 'train-oath-0001');
  const food = p.food, queued = p.trainingQueue.length;
  order(w, p, 'train', 'infantry', 'train-oath-0001');
  assert.equal(p.food, food);
  assert.equal(p.trainingQueue.length, queued);
  assert.equal(troopCensus(p).total, before + p.trainingQueue[0].amount);
  assert.throws(() => order(w, p, 'train', 'archers', 'train-oath-0001'), /different/);
  assert.equal(p.food, food);
  const loaded = World.fromSave(w.toSave()), q = loaded.authenticate(s.token);
  const again = q.food;
  order(loaded, q, 'train', 'infantry', 'train-oath-0001');
  assert.equal(q.food, again);
  assert.equal(q.trainingQueue.length, 1);
});

test('siege stays closed and an invalid or unaffordable order changes nothing', () => {
  const { w, p } = fixture();
  const before = troopCensus(p).total;
  assert.throws(() => order(w, p, 'train', 'siege', 'siege-closed-01'), /valid/);
  assert.equal(troopCensus(p).total, before);
  assert.equal(p.trainingReceipts, undefined);
  p.food = 0;
  assert.throws(() => order(w, p, 'train', 'infantry', 'hungry-order-01'), /resources/);
  assert.equal(p.trainingQueue.length, 0);
  assert.equal(p.trainingReceipts, undefined);
  p.food = 8000;
  order(w, p, 'train', 'infantry', 'hungry-order-01');
  assert.equal(p.trainingQueue.length, 1);
  const view = w.snapshot(p.id).players.find(row => row.id === p.id);
  assert.equal(view.militaryRoster.siegeAvailable, false);
  assert.equal(view.militaryRoster.sharedFacility, 'Hall of Spears');
});

test('three queued classes stay independent, cancel refunds once, and promotion keeps the census', () => {
  const { w, p } = fixture();
  w.command(p, { type: 'upgrade' });
  for (let i = 0; i < 800 && p.cityLevel < 2; i++) w.tick(0.1);
  assert.equal(p.cityLevel, 2);
  const before = troopCensus(p).total;
  order(w, p, 'train', 'infantry', 'queue-infantry-01');
  order(w, p, 'train', 'archers', 'queue-archers-001');
  order(w, p, 'train', 'cavalry', 'queue-cavalry-01');
  assert.equal(p.trainingQueue.length, 3);
  assert.equal(troopCensus(p).total, before + p.trainingQueue.reduce((sum, job) => sum + job.amount, 0));
  assert.throws(() => order(w, p, 'train', 'infantry', 'queue-extra-0001'), /full/);
  const food = p.food, job = p.trainingQueue[2];
  w.command(p, { type: 'cancel-job', targetId: job.id });
  assert.equal(p.food, food + job.cost.food);
  assert.equal(p.trainingQueue.length, 2);
  for (let i = 0; i < 400 && p.trainingQueue.length; i++) w.tick(0.1);
  assert.equal(p.trainingQueue.length, 0);
  assert.ok(p.reserveUnits.infantry >= 5);
  assert.ok(p.reserveUnits.archers >= 5);
  const stock = p.food, census = troopCensus(p).total;
  assert.throws(() => order(w, p, 'promote', 'veteranInfantry', 'promote-locked-01'), /Hall of Spears|Research|Citadel/);
  assert.equal(p.food, stock);
  assert.equal(troopCensus(p).total, census);
  assert.equal(p.trainingReceipts.some(row => row.id === 'promote-locked-01'), false);
});
