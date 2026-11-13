import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { TROOP_TYPES, trainingOptions, troopBase, tierLock, unitPower, promotionCost, countOf, legacyUnits } from './troops.mjs';
import { carryCapacity } from './field-logistics.mjs';
import { counterMultiplier, retreat } from './war.mjs';
import { technologyCard } from './city.mjs';
import { TECHNOLOGIES } from './city-content.mjs';
import { powerOf } from './power.mjs';

const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds / 0.1); i++) w.tick(0.1); };
const command = (w, p, type, extra = {}) => w.command(p, { type, ...extra });
const census = p => [p, ...p.marches].reduce((n, a) => n + a.troops, 0) + p.reserveTroops + (p.wounded ? Object.values(p.wounded).reduce((n, v) => n + v, 0) : 0) + (p.healing ? Object.values(p.healing.units).reduce((n, v) => n + v, 0) : 0) + p.trainingQueue.filter(j => ['train', 'promote'].includes(j.type)).reduce((n, j) => n + j.amount, 0);
function fixture() {
  const w = testWorld(), s = w.join('Tier City'), p = w.authenticate(s.token);
  p.gold = p.food = p.wood = p.stone = p.mana = 100000;
  return { w, s, p };
}
function develop(w, p, id) {
  command(w, p, id === 'citadel' ? 'upgrade' : 'building-upgrade', id === 'citadel' ? {} : { targetId: id });
  advance(w, 120);
}
function openTiers(w, p) {
  develop(w, p, 'quarry'); develop(w, p, 'oracle'); develop(w, p, 'citadel');
  develop(w, p, 'academy'); develop(w, p, 'citadel');
  develop(w, p, 'barracks'); develop(w, p, 'barracks'); develop(w, p, 'infirmary');
  develop(w, p, 'citadel');
  develop(w, p, 'academy'); develop(w, p, 'academy'); develop(w, p, 'quarry');
  develop(w, p, 'menagerie'); develop(w, p, 'menagerie'); develop(w, p, 'forge');
  develop(w, p, 'citadel');
  develop(w, p, 'barracks'); develop(w, p, 'barracks');
  develop(w, p, 'academy'); develop(w, p, 'academy');
  for (const id of ['drill', 'veterans', 'columns', 'bulwarks', 'titanhost']) { command(w, p, 'research', { targetId: id }); advance(w, 60); }
}

test('tiers III through V keep class roles and grow stronger than the previous tier', () => {
  assert.equal(TROOP_TYPES.length, 15);
  for (const base of ['infantry', 'archers', 'cavalry']) {
    const line = [1, 2, 3, 4, 5].map(tier => TROOP_TYPES.find(t => t.baseId === base && t.tier === tier));
    assert.deepEqual(line.map(t => t.tier), [1, 2, 3, 4, 5]);
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i].health > line[i - 1].health);
      assert.ok(line[i].damage > line[i - 1].damage);
      assert.ok(line[i].duration > line[i - 1].duration);
      assert.ok(line[i].cost.food > line[i - 1].cost.food);
      assert.equal(line[i].sourceId, line[i - 1].id);
    }
  }
  const column = { units: { ...legacyUnits(0), columnInfantry: 10 }, troops: 10, mythic: 0 };
  const riders = { units: { ...legacyUnits(0), titanCavalry: 10 }, troops: 10, mythic: 0 };
  const bows = { units: { ...legacyUnits(0), bulwarkArchers: 10 }, troops: 10, mythic: 0 };
  assert.equal(counterMultiplier(column, riders), 1.15);
  assert.equal(counterMultiplier(riders, column), 0.85);
  assert.equal(counterMultiplier(bows, column), 1.15);
  assert.equal(troopBase(riders).speed, 1.2);
  assert.equal(troopBase({ units: { ...legacyUnits(0), titanCavalry: 5, titanInfantry: 5 }, troops: 10, mythic: 0 }).speed, 1);
  assert.equal(unitPower({ titanInfantry: 5 }), 115);
  assert.equal(unitPower({ infantry: 5 }), 25);
});

test('a legal city path unlocks every tier, and promotion cannot skip', () => {
  const { w, p } = fixture();
  assert.throws(() => command(w, p, 'train', { targetId: 'columnInfantry' }), /Citadel|Hall|Bronze/);
  openTiers(w, p);
  assert.equal(p.cityLevel, 5);
  assert.equal(p.buildings.barracks, 5);
  assert.equal(p.buildings.academy, 5);
  assert.equal(p.technologies.titanhost, 1);
  assert.throws(() => command(w, p, 'research', { targetId: 'titanhost' }), /Maximum/);
  for (const id of ['columnInfantry', 'columnArchers', 'columnCavalry', 'bulwarkInfantry', 'bulwarkArchers', 'bulwarkCavalry', 'titanInfantry', 'titanArchers', 'titanCavalry']) assert.equal(tierLock(p, TROOP_TYPES.find(t => t.id === id)), '');
  const option = trainingOptions(p).find(t => t.id === 'columnArchers');
  const food = p.food, gold = p.gold, stone = p.stone;
  command(w, p, 'train', { targetId: 'columnArchers' });
  assert.equal(p.food, food - option.orderCost.food);
  assert.equal(p.gold, gold - option.orderCost.gold);
  assert.equal(p.stone, stone - option.orderCost.stone);
  assert.equal(p.trainingQueue[0].amount, option.orderAmount);
  assert.ok(Math.abs(p.trainingQueue[0].duration - option.orderSeconds) < 0.001);
  advance(w, option.orderSeconds + 1);
  assert.equal(p.reserveUnits.columnArchers, option.orderAmount);
  let held = census(p);
  for (const [source, target] of [['infantry', 'veteranInfantry'], ['veteranInfantry', 'columnInfantry'], ['columnInfantry', 'bulwarkInfantry'], ['bulwarkInfantry', 'titanInfantry']]) {
    const had = countOf(p.reserveUnits, source);
    p.reserveUnits[source] = had + 5; p.reserveTroops += 5; held += 5;
    const quote = trainingOptions(p).find(t => t.id === target);
    const spent = { food: p.food, gold: p.gold, stone: p.stone };
    const full = trainingOptions(p).find(t => t.id === target).orderCost;
    command(w, p, 'promote', { targetId: target });
    assert.equal(countOf(p.reserveUnits, source), had);
    assert.equal(p.food, spent.food - (quote.promotionCost.food ?? 0));
    assert.ok((quote.promotionCost.food ?? 0) < full.food);
    assert.equal(p.gold, spent.gold - (quote.promotionCost.gold ?? 0));
    assert.equal(p.stone, spent.stone - (quote.promotionCost.stone ?? 0));
    assert.equal(census(p), held);
    command(w, p, 'cancel-job', { targetId: p.trainingQueue[0].id });
    assert.equal(countOf(p.reserveUnits, source), had + 5);
    assert.equal(countOf(p.reserveUnits, target), 0);
    assert.equal(p.food, spent.food);
    assert.equal(census(p), held);
  }
  for (const id of ['bulwarkInfantry', 'bulwarkArchers', 'bulwarkCavalry']) { p.reserveTroops -= countOf(p.reserveUnits, id); p.reserveUnits[id] = 0; }
  p.reserveUnits.infantry = (p.reserveUnits.infantry ?? 0) + 5; p.reserveTroops += 5;
  assert.throws(() => command(w, p, 'promote', { targetId: 'titanInfantry' }), /previous tier|ready/);
  const chain = census(p);
  p.reserveUnits.bulwarkCavalry = 5; p.reserveTroops += 5;
  command(w, p, 'promote', { targetId: 'titanCavalry' });
  advance(w, p.trainingQueue[0].duration + 1);
  assert.equal(countOf(p.reserveUnits, 'bulwarkCavalry'), 0);
  assert.equal(p.reserveUnits.titanCavalry, 5);
  assert.equal(census(p), chain + 5);
});

test('higher tiers keep their identity through healing, combat stats, carry and a restart', () => {
  const { w, p, s } = fixture();
  openTiers(w, p);
  p.units = { ...legacyUnits(0), titanInfantry: 10, columnCavalry: 5 };
  p.troops = 15;
  const weaker = troopBase({ units: legacyUnits(15), troops: 15, mythic: 0 }).damage;
  assert.ok(w.stats(p).damage > weaker);
  assert.ok(carryCapacity(w, p) > carryCapacity(w, { ...p, units: legacyUnits(0), troops: 0, mythic: 0 }));
  assert.equal(powerOf(p).deployed >= unitPower(p.units), true);
  const result = { wounded: legacyUnits(0), woundedMythic: 0 };
  retreat(w, p, result);
  assert.equal(p.wounded.titanInfantry, 2);
  const food = p.food;
  command(w, p, 'hospital-heal', { units: { ...legacyUnits(0), titanInfantry: 2 } });
  assert.equal(p.food, food - 20);
  const saved = World.fromSave(w.toSave());
  const q = saved.authenticate(s.token);
  advance(saved, q.healing.duration + 1);
  assert.equal(q.reserveUnits.titanInfantry, 2);
  assert.equal(countOf(q.wounded, 'titanInfantry'), 0);
  command(saved, q, 'train', { targetId: 'bulwarkInfantry' });
  const reloaded = World.fromSave(saved.toSave());
  const r = reloaded.authenticate(s.token);
  assert.equal(r.trainingQueue.length, 1);
  advance(reloaded, r.trainingQueue[0].duration + 1);
  assert.equal(r.reserveUnits.bulwarkInfantry, r.trainingBatch ?? trainingOptions(r).find(t => t.id === 'bulwarkInfantry').orderAmount);
  advance(reloaded, 5);
  assert.equal(r.reserveUnits.bulwarkInfantry, trainingOptions(r).find(t => t.id === 'bulwarkInfantry').orderAmount);
});

test('schema 18 and 19 cities keep their soldiers and do not gain higher tiers', () => {
  const { w, p, s } = fixture();
  p.ownedRelics = ['aegis']; p.equippedRelic = '';
  p.cityLevel = 2; p.buildings.barracks = 2; p.technologies.veterans = 1;
  p.units = { ...legacyUnits(0), infantry: 12, veteranInfantry: 8 };
  p.troops = 20;
  for (const schema of [18, 19]) {
    const old = structuredClone(w.toSave());
    old.schema = schema;
    delete old.world.players[0].technologies.columns;
    delete old.world.players[0].technologies.bulwarks;
    delete old.world.players[0].technologies.titanhost;
    const loaded = World.fromSave(old), q = loaded.authenticate(s.token);
    assert.equal(loaded.toSave().schema, 25);
    assert.equal(q.technologies.columns, 0);
    assert.equal(q.units.infantry, 12);
    assert.equal(q.units.veteranInfantry, 8);
    assert.equal(q.troops, 20);
    assert.equal(countOf(q.units, 'titanInfantry'), 0);
  }
  const forged = structuredClone(w.toSave());
  forged.schema = 19;
  forged.world.players[0].units.columnInfantry = 4;
  forged.world.players[0].troops = 24;
  assert.throws(() => World.fromSave(forged), /unlock/);
  const next = fixture();
  openTiers(next.w, next.p);
  next.p.reserveUnits.infantry = (next.p.reserveUnits.infantry ?? 0) + 5; next.p.reserveTroops += 5;
  command(next.w, next.p, 'promote', { targetId: 'veteranInfantry' });
  const bad = structuredClone(next.w.toSave());
  bad.world.players[0].trainingQueue[0].sourceId = 'archers';
  assert.throws(() => World.fromSave(bad), /training/);
  const fraction = structuredClone(next.w.toSave());
  fraction.world.players[0].reserveUnits.titanInfantry = 1.5;
  assert.throws(() => World.fromSave(fraction), /reserves|troop/);
  const unknown = structuredClone(next.w.toSave());
  unknown.world.players[0].reserveUnits.dragon = 1;
  assert.throws(() => World.fromSave(unknown), /reserves|troop/);
});

test('Bronze Columns stays locked until Veteran Oaths, Citadel 3, Hall 3 and Athenaeum 3', () => {
  const { w, p } = fixture();
  p.technologies.drill = 1; p.technologies.veterans = 1;
  p.cityLevel = 2; p.buildings.academy = 2; p.buildings.barracks = 2;
  const card = technologyCard(p, TECHNOLOGIES.find(t => t.id === 'columns'));
  assert.equal(card.canResearch, false);
  p.cityLevel = 3; p.buildings.academy = 3; p.buildings.barracks = 3;
  assert.equal(technologyCard(p, TECHNOLOGIES.find(t => t.id === 'columns')).canResearch, true);
  assert.equal(technologyCard(p, TECHNOLOGIES.find(t => t.id === 'bulwarks')).canResearch, false);
});
