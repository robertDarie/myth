import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './testing/legacy-world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { emptyUnits, countOf, TROOP_TYPES, unitTotal } from './troops.mjs';
import { wardTroops } from './war.mjs';

const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds * 10); i++) w.tick(0.1); };
const setup = () => {
  const w = testWorld(), session = w.join('Ward'), other = w.join('Field');
  const b = w.authenticate(session.token), a = w.authenticate(other.token);
  for (const p of [a, b]) { p.cityLevel = 2; p.food = p.gold = 10000; p.buildings.infirmary = 1; }
  a.x = 20; a.z = 15; b.x = 21.5; b.z = 15;
  return { w, a, b, session };
};
const census = p => p.troops + p.marches.reduce((n, army) => n + army.troops, 0) + p.reserveTroops + wardTroops(p);
const conserved = side => TROOP_TYPES.every(t => countOf(side.unitsBefore, t.id) === countOf(side.unitsAfter, t.id) + countOf(side.wounded, t.id) + countOf(side.dead, t.id) && countOf(side.light, t.id) === countOf(side.unitsAfter, t.id))
  && side.mythicBefore === side.mythicAfter + side.woundedMythic + side.deadMythic;

test('a defeat keeps the existing hospital share and records the remaining march as light wounds', () => {
  const { w, a, b } = setup();
  b.units = { ...emptyUnits(), infantry: 12, archers: 8 };
  b.troops = 20; b.health = 1;
  const before = census(b);
  w.command(a, { type: 'attack-player', targetId: b.id });
  w.tick(0.1);
  const side = b.battleReports[0].sides.find(row => row.playerId === b.id);
  assert.equal(side.wounded.infantry, 3);
  assert.equal(side.wounded.archers, 2);
  assert.equal(side.light.infantry, 9);
  assert.equal(side.light.archers, 6);
  assert.equal(unitTotal(side.dead), 0);
  assert.equal(side.deadMythic, 0);
  assert.equal(side.fatalityPolicy, 'BLOCKED');
  assert.equal(conserved(side), true);
  assert.equal(b.troops, 15);
  assert.equal(census(b), before);
  advance(w, 12);
  assert.equal(b.recovery, 0);
  assert.equal(b.troops, 15);
  assert.equal(b.reserveUnits.infantry, 0);
  assert.equal(census(b), before);
  const view = w.snapshot(b.id).players.find(row => row.id === b.id);
  assert.equal(view.casualtyPolicy.fatalities, 'BLOCKED');
  assert.equal(view.casualtyPolicy.overflowDeaths, 'BLOCKED');
});

test('a repeated treatment request heals once and an old hospital save still loads', () => {
  const { w, b, session } = setup();
  b.wounded = { ...emptyUnits(), infantry: 50, archers: 4 };
  const before = census(b);
  assert.throws(() => w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: 41 }, mythic: 0, requestId: 'too-many-beds-01' }), /beds/);
  assert.equal(b.healing, null);
  assert.equal(b.healingReceipts, undefined);
  assert.equal(b.wounded.infantry, 50);
  const food = b.food, gold = b.gold;
  w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: 3 }, mythic: 0, requestId: 'treat-oath-0001' });
  const paid = b.food, job = b.healing.remaining;
  w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: 3 }, mythic: 0, requestId: 'treat-oath-0001' });
  assert.equal(b.food, paid);
  assert.equal(b.healing.remaining, job);
  assert.equal(b.wounded.infantry, 47);
  assert.throws(() => w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), archers: 1 }, mythic: 0, requestId: 'treat-oath-0001' }), /different/);
  assert.equal(b.food, paid);
  const loaded = World.fromSave(w.toSave()), q = loaded.authenticate(session.token);
  loaded.command(q, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: 3 }, mythic: 0, requestId: 'treat-oath-0001' });
  assert.equal(q.food, paid);
  assert.equal(q.healing.units.infantry, 3);
  advance(loaded, job + 0.2);
  assert.equal(q.healing, null);
  assert.equal(q.reserveUnits.infantry, 3);
  assert.equal(q.wounded.archers, 4);
  assert.equal(census(q), before);
  const archived = loaded.toSave();
  for (const player of archived.world.players) {
    delete player.healingReceipts;
    for (const report of player.battleReports ?? []) for (const side of report.sides) { delete side.fatalityPolicy; delete side.light; delete side.dead; delete side.lightMythic; delete side.deadMythic; }
  }
  const legacy = World.fromSave(archived);
  const restored = legacy.authenticate(session.token);
  assert.equal(restored.reserveUnits.infantry, 3);
  assert.equal(restored.wounded.archers, 4);
  assert.equal(census(restored), before);
  assert.throws(() => legacy.command(restored, { type: 'hospital-heal', units: { ...emptyUnits(), archers: 1 }, mythic: 0, requestId: 'no' }), /Invalid treatment/);
  assert.equal(restored.food, q.food);
});

const mythicCensus = p => p.mythic + p.marches.reduce((n, army) => n + army.mythic, 0) + p.reserveMythic + p.woundedMythic + (p.healing?.mythic ?? 0);

test('a field defeat conserves every class, and one treatment survives restart, conflict, and a single refund', () => {
  const { w, a, b, session } = setup();
  b.units = { ...emptyUnits(), infantry: 12, archers: 8, cavalry: 8 };
  b.troops = 28; b.mythic = 4; b.health = 1;
  const mortals = census(b), mythic = mythicCensus(b);
  w.command(a, { type: 'attack-player', targetId: b.id });
  w.tick(0.1);
  const side = b.battleReports[0].sides.find(row => row.playerId === b.id);
  assert.equal(side.wounded.infantry, 3);
  assert.equal(side.wounded.archers, 2);
  assert.equal(side.wounded.cavalry, 2);
  assert.equal(side.woundedMythic, 1);
  assert.equal(side.light.infantry, 9);
  assert.equal(side.light.cavalry, 6);
  assert.equal(side.lightMythic, 3);
  assert.equal(unitTotal(side.dead), 0);
  assert.equal(side.deadMythic, 0);
  assert.equal(side.fatalityPolicy, 'BLOCKED');
  assert.equal(conserved(side), true);
  assert.equal(census(b), mortals);
  assert.equal(mythicCensus(b), mythic);
  assert.ok(TROOP_TYPES.every(t => countOf(b.units, t.id) >= 0 && countOf(b.wounded, t.id) >= 0));
  assert.throws(() => w.command(b, { type: 'hospital-heal', units: emptyUnits(), mythic: 0, requestId: 'empty-treatment-01' }), /whole wounded/);
  assert.equal(b.healing, null);
  assert.throws(() => w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: -1 }, mythic: 0, requestId: 'negative-treat-01' }), /whole wounded|not in your hospital|Invalid/);
  assert.equal(b.wounded.infantry, 3);
  const food = b.food, gold = b.gold;
  w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), cavalry: 2 }, mythic: 0, requestId: 'treat-cavalry-01' });
  const paid = { food: b.food, gold: b.gold }, jobId = b.healing.id, remaining = b.healing.remaining;
  assert.ok(b.food < food && b.gold < gold);
  assert.equal(b.wounded.cavalry, 0);
  w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), cavalry: 2 }, mythic: 0, requestId: 'treat-cavalry-01' });
  assert.deepEqual({ food: b.food, gold: b.gold }, paid);
  assert.equal(b.healing.remaining, remaining);
  assert.throws(() => w.command(b, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: 1 }, mythic: 0, requestId: 'treat-cavalry-01' }), /different/);
  const fresh = structuredClone(w.toSave());
  assert.equal(fresh.schema, 28);
  const loaded = World.fromSave(structuredClone(fresh));
  const q = loaded.authenticate(session.token);
  loaded.command(q, { type: 'hospital-heal', units: { ...emptyUnits(), cavalry: 2 }, mythic: 0, requestId: 'treat-cavalry-01' });
  assert.equal(q.food, paid.food);
  assert.equal(q.healing.units.cavalry, 2);
  assert.throws(() => loaded.command(q, { type: 'hospital-heal', units: { ...emptyUnits(), infantry: 1 }, mythic: 0, requestId: 'treat-cavalry-01' }), /different/);
  advance(loaded, remaining + 0.2);
  assert.equal(q.healing, null);
  assert.equal(q.reserveUnits.cavalry, 2);
  assert.equal(q.wounded.infantry, 3);
  assert.equal(census(q), mortals);
  assert.equal(mythicCensus(q), mythic);
  const again = World.fromSave(structuredClone(fresh));
  const restored = again.authenticate(session.token);
  const refundFood = restored.food, refundGold = restored.gold;
  again.command(restored, { type: 'hospital-cancel', targetId: jobId });
  assert.equal(restored.healing, null);
  assert.equal(restored.wounded.cavalry, 2);
  assert.equal(restored.food, refundFood + (food - paid.food));
  assert.equal(restored.gold, refundGold + (gold - paid.gold));
  assert.throws(() => again.command(restored, { type: 'hospital-cancel', targetId: jobId }));
  assert.equal(restored.food, refundFood + (food - paid.food));
  assert.equal(restored.reserveUnits.cavalry, 0);
  const oldCopy = structuredClone(fresh);
  for (const player of oldCopy.world.players) {
    delete player.healingReceipts;
    for (const report of player.battleReports ?? []) for (const row of report.sides) {
      delete row.fatalityPolicy; delete row.light; delete row.dead; delete row.lightMythic; delete row.deadMythic;
    }
  }
  const oldText = JSON.stringify(oldCopy);
  const legacy = World.fromSave(JSON.parse(oldText));
  assert.equal(JSON.stringify(oldCopy), oldText);
  const legacyPlayer = legacy.authenticate(session.token);
  assert.equal(legacyPlayer.healing.units.cavalry, 2);
  assert.equal(legacyPlayer.wounded.infantry, 3);
  assert.equal(census(legacyPlayer), mortals);
});
