import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from './testing/legacy-world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { ITEMS } from './inventory.mjs';
import { QaReferenceWorld } from './qa-reference-world.mjs';
import { syntheticCityProfile } from './testing/reference-city-fixtures.mjs';

const fixture = () => { const w = testWorld({ now: () => Date.UTC(2026, 10, 8) }), s = w.join('Keeper'); return { w, s, p: w.authenticate(s.token) }; };
const use = (w, p, extra) => w.command(p, { type: 'inventory-use', ...extra });
const catalog = JSON.parse(readFileSync(new URL('../research/parity/fixtures/inventory-items.json', import.meta.url), 'utf8'));

test('existing item amounts and speedup durations stay unchanged', () => {
  assert.deepEqual(ITEMS.map(item => ({ id: item.id, amount: item.amount ?? null, seconds: item.seconds ?? null })), catalog.items);
});

test('a repeated inventory request does not consume the stack or the job twice', () => {
  const { w, s, p } = fixture();
  const food = p.food;
  w.command(p, { type: 'inventory-supplies', requestId: 'founding-order-01' });
  const granted = structuredClone(p.inventory);
  w.command(p, { type: 'inventory-supplies', requestId: 'founding-order-01' });
  assert.equal(p.suppliesClaimed, true);
  assert.deepEqual(p.inventory, granted);
  use(w, p, { targetId: 'food-pack-100', count: 1, requestId: 'open-harvest-0001' });
  assert.equal(p.food, food + 100);
  assert.equal(p.inventory['food-pack-100'], 1);
  use(w, p, { targetId: 'food-pack-100', count: 1, requestId: 'open-harvest-0001' });
  assert.equal(p.food, food + 100);
  assert.equal(p.inventory['food-pack-100'], 1);
  assert.throws(() => use(w, p, { targetId: 'food-pack-100', count: 2, requestId: 'open-harvest-0001' }), /different/);
  assert.equal(p.food, food + 100);
  p.buildings.infirmary = 1; p.woundedMythic = 8; p.food = 5000; p.gold = 5000;
  w.command(p, { type: 'hospital-heal', units: { infantry: 0, archers: 0, cavalry: 0 }, mythic: 8 });
  const paid = p.gold, job = p.healing.id, before = p.healing.remaining;
  assert.ok(before > 60);
  p.inventory['healing-minute'] = 3;
  use(w, p, { targetId: 'healing-minute', count: 1, jobId: job, requestId: 'renew-once-0001' });
  const left = p.healing.remaining;
  assert.ok(left < before - 59 && left > 1);
  use(w, p, { targetId: 'healing-minute', count: 1, jobId: job, requestId: 'renew-once-0001' });
  assert.equal(p.healing.remaining, left);
  assert.equal(p.inventory['healing-minute'], 2);
  assert.equal(p.gold, paid);
  const loaded = World.fromSave(w.toSave()), q = loaded.authenticate(s.token);
  use(loaded, q, { targetId: 'healing-minute', count: 1, jobId: job, requestId: 'renew-once-0001' });
  assert.equal(q.healing.remaining, left);
  assert.equal(q.inventory['healing-minute'], 2);
  assert.equal(q.gold, paid);
  use(loaded, q, { targetId: 'healing-minute', count: 1, jobId: job, requestId: 'renew-finish-002' });
  loaded.tick(0.1);
  assert.equal(q.healing, null);
  assert.equal(q.inventory['healing-minute'], 1);
  assert.throws(() => use(loaded, q, { targetId: 'healing-minute', count: 1, jobId: job, requestId: 'renew-again-0003' }), /active/);
  assert.equal(q.inventory['healing-minute'], 1);
});

test('specialized speedups advance only the named job', () => {
  const { w, p } = fixture();
  p.cityLevel = 2; p.food = p.wood = p.stone = p.gold = p.mana = 8000;
  p.buildings.academy = 1; p.buildings.builders = 1; p.buildings.infirmary = 1; p.buildings.forge = 1; p.buildings.quarry = 1;
  w.command(p, { type: 'upgrade' });
  w.command(p, { type: 'building-upgrade', targetId: 'lumber' });
  w.command(p, { type: 'research', targetId: 'logistics' });
  w.command(p, { type: 'train' });
  w.command(p, { type: 'train', targetId: 'archers' });
  w.command(p, { type: 'craft', targetId: 'aegis' });
  p.wounded.infantry = 2;
  w.command(p, { type: 'hospital-heal', units: { infantry: 2, archers: 0, cavalry: 0 }, mythic: 0 });
  const lanes = {
    first: p.construction, second: p.secondConstruction, research: p.research,
    training: p.trainingQueue[0], queued: p.trainingQueue[1], craft: p.crafting, healing: p.healing,
  };
  const snap = () => ({
    first: lanes.first.remaining, second: lanes.second.remaining, research: lanes.research.remaining,
    training: lanes.training.remaining, queued: lanes.queued.remaining, craft: lanes.craft.remaining, healing: lanes.healing?.remaining ?? null,
  });
  const before = snap();
  p.inventory['build-minute'] = 1; p.inventory['research-minute'] = 1; p.inventory['training-minute'] = 2; p.inventory['healing-minute'] = 1; p.inventory['universal-minute'] = 1;
  use(w, p, { targetId: 'build-minute', jobId: lanes.second.id });
  assert.ok(lanes.second.remaining < before.second);
  assert.equal(lanes.first.remaining, before.first);
  use(w, p, { targetId: 'research-minute', jobId: lanes.research.id });
  assert.equal(lanes.first.remaining, before.first);
  assert.equal(lanes.training.remaining, before.training);
  use(w, p, { targetId: 'training-minute', jobId: lanes.training.id });
  assert.equal(lanes.queued.remaining, before.queued);
  assert.throws(() => use(w, p, { targetId: 'training-minute', jobId: lanes.queued.id }), /owned|active/);
  assert.equal(lanes.queued.remaining, before.queued);
  use(w, p, { targetId: 'healing-minute', jobId: lanes.healing.id });
  assert.equal(lanes.craft.remaining, before.craft);
  use(w, p, { targetId: 'universal-minute', jobId: lanes.craft.id });
  assert.ok(lanes.craft.remaining < before.craft);
  assert.equal(lanes.research.remaining < before.research, true);
  const view = w.snapshot(p.id).players.find(row => row.id === p.id);
  assert.equal(view.inventory.jobs.find(job => job.id === lanes.craft.id).lane, 'crafting');
  assert.equal(view.inventory.items.find(item => item.id === 'universal-minute').count, 0);
});

test('commander XP stays inside the star cap and AP cannot pass the cap', () => {
  const { w, p } = fixture();
  const id = p.commanderId, hero = p.heroRecords[id];
  hero.xp = 800; hero.stars = 1; p.inventory['chronicle-page'] = 2;
  use(w, p, { targetId: 'chronicle-page', name: id });
  assert.equal(hero.xp, 900); assert.equal(p.inventory['chronicle-page'], 1);
  assert.throws(() => use(w, p, { targetId: 'chronicle-page', name: id }), /Promote/);
  assert.equal(hero.xp, 900); assert.equal(p.inventory['chronicle-page'], 1);
  p.inventory['ap-tonic-20'] = 1; p.ap = 81;
  assert.throws(() => use(w, p, { targetId: 'ap-tonic-20' }), /cap/);
  assert.equal(p.ap, 81); assert.equal(p.inventory['ap-tonic-20'], 1);
  p.ap = 80; use(w, p, { targetId: 'ap-tonic-20' });
  assert.equal(p.ap, 100); assert.equal(p.inventory['ap-tonic-20'], 0);
});

test('oaths change the blows in a real fight and the same oath does not stack', () => {
  const plain = fixture(), sworn = fixture();
  sworn.p.inventory['attack-oath-10m'] = 1; sworn.p.inventory['defense-oath-10m'] = 2;
  use(sworn.w, sworn.p, { targetId: 'attack-oath-10m' });
  use(sworn.w, sworn.p, { targetId: 'defense-oath-10m' });
  assert.throws(() => use(sworn.w, sworn.p, { targetId: 'defense-oath-10m' }), /stack/);
  assert.equal(sworn.p.inventory['defense-oath-10m'], 1);
  for (const side of [plain, sworn]) {
    const camp = side.w.camps[0]; side.p.x = camp.x; side.p.z = camp.z;
    side.w.command(side.p, { type: 'attack', targetId: camp.id }); side.w.tick(0.1);
  }
  assert.ok(sworn.w.camps[0].health < plain.w.camps[0].health);
  assert.ok(sworn.p.health > plain.p.health);
  const saved = World.fromSave(sworn.w.toSave()), q = saved.authenticate(sworn.s.token);
  assert.ok(q.buffs.attack > 0); assert.ok(q.buffs.defense > 0);
  assert.equal(q.inventory['defense-oath-10m'], 1);
});

test('an invalid inventory request changes nothing', () => {
  const { w, p } = fixture();
  w.command(p, { type: 'inventory-supplies' });
  const before = structuredClone(w.toSave());
  for (const count of [-1, 0, 0.5, 101]) assert.throws(() => use(w, p, { targetId: 'wood-pack-100', count, requestId: 'bad-order-0001' }));
  assert.throws(() => use(w, p, { targetId: 'forged-pack', count: 1, requestId: 'bad-order-0002' }));
  assert.throws(() => use(w, p, { targetId: 'wood-pack-100', count: 1, requestId: 'short' }));
  assert.deepEqual(w.toSave(), before);
});

test('an experimental city timer is not an inventory speedup target', () => {
  const w = new QaReferenceWorld({ qaOnly: true, profile: syntheticCityProfile(), random: () => 0.2 });
  const s = w.join('Reference QA', 'greek');
  for (let i = 0; i < 120; i++) w.tick(0.25);
  w.command(w.authenticate(s.token), { type: 'qa-city-collect', requestId: 'collect-experimental-01' });
  w.command(w.authenticate(s.token), { type: 'qa-city-upgrade', targetId: 'citadel', requestId: 'upgrade-experimental-1' });
  const p = w.authenticate(s.token);
  const job = w.snapshot(s.playerId).players.find(row => row.id === s.playerId).referenceCity.jobs[0];
  const remaining = job.remaining;
  p.inventory['universal-minute'] = 1;
  const before = structuredClone(w.toSave());
  assert.throws(() => use(w, p, { targetId: 'universal-minute', jobId: job.id, requestId: 'speed-experimental-1' }));
  assert.equal(w.snapshot(s.playerId).players.find(row => row.id === s.playerId).referenceCity.jobs[0].remaining, remaining);
  assert.equal(p.inventory['universal-minute'], 1);
  assert.equal(p.inventoryReceipts, undefined);
  assert.equal(JSON.stringify(before).includes('"universal-minute":1'), true);
});
