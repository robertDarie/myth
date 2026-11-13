import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { ownCommander } from './testing/roster-fixture.mjs';
import { formationOf, FORMATION, unitTotal } from './troops.mjs';
import { applyDamage, counterMultiplier } from './war.mjs';

const setup = () => {
  const w = testWorld(), s = w.join('A'), p = w.authenticate(s.token);
  return { w, p, s };
};
const wear = (p, units, mythic = 0) => {
  p.units = { infantry: 0, archers: 0, cavalry: 0, ...units };
  p.troops = unitTotal(p.units);
  p.mythic = mythic;
};
const healthOf = (w, p, units, mythic = 0) => { wear(p, units, mythic); return w.stats(p).maxHealth; };
const army = (w, p) => w.snapshot(p.id).players.find(x => x.id === p.id).homeFormations.find(a => a.id === p.id);

test('Combined Arms is one 4% health bonus at a 15% share of mortal troops', () => {
  assert.equal(FORMATION.minimumPercent, 15);
  assert.equal(FORMATION.health, 1.04);
  assert.equal(formationOf({ infantry: 20 }).active, false);
  assert.equal(formationOf({ infantry: 10, archers: 10 }).active, false);
  assert.equal(formationOf({ infantry: 10, archers: 5, cavalry: 6 }).active, true);
  assert.equal(formationOf({ infantry: 3, archers: 3, cavalry: 14 }).active, true);
  assert.equal(formationOf({ infantry: 2, archers: 3, cavalry: 15 }).active, false);
  assert.equal(formationOf({ infantry: 1, archers: 1, cavalry: 1 }).active, true);
  assert.equal(formationOf({ infantry: 1, archers: 1, cavalry: 5 }).active, false);
  assert.equal(formationOf({}).active, false);
  assert.equal(formationOf({ veteranInfantry: 4, columnArchers: 4, bulwarkCavalry: 3, titanInfantry: 2, titanArchers: 2, titanCavalry: 3 }).active, true);
  const { w, p } = setup();
  const qualified = healthOf(w, p, { infantry: 100, archers: 50, cavalry: 60 });
  const plain = healthOf(w, p, { infantry: 200 });
  assert.ok(Math.abs(qualified / plain - 1.04) < 0.002);
  wear(p, { infantry: 100, archers: 50, cavalry: 60 });
  const formedSpeed = w.stats(p).speed;
  wear(p, { infantry: 200 });
  assert.equal(formedSpeed, w.stats(p).speed);
});

test('mythic escorts do not count toward Combined Arms', () => {
  const { w, p } = setup();
  assert.equal(formationOf({ infantry: 4, archers: 4, cavalry: 4 }).active, true);
  const mortal = healthOf(w, p, { infantry: 4, archers: 4, cavalry: 4 });
  const escorted = healthOf(w, p, { infantry: 4, archers: 4, cavalry: 4 }, 10);
  assert.ok(escorted > mortal);
  assert.equal(formationOf({ infantry: 10 }).active, false);
  const mythicHeavy = healthOf(w, p, { infantry: 10 }, 100);
  const infantryOnly = healthOf(w, p, { infantry: 10 });
  assert.ok(mythicHeavy > infantryOnly);
  assert.ok(Math.abs(mythicHeavy / infantryOnly) !== 1.04);
});

test('reconfiguration applies the server rule, refuses a forged flag, and does not heal', () => {
  const { w, p, s } = setup();
  p.reserveUnits.archers = 50;
  p.reserveUnits.cavalry = 60;
  p.reserveTroops = unitTotal(p.reserveUnits);
  const oldMax = w.stats(p).maxHealth;
  assert.equal(p.health, oldMax);
  w.command(p, { type: 'configure-march', units: { infantry: 10, archers: 5, cavalry: 6 }, formationActive: true });
  assert.equal(army(w, p).formationActive, true);
  assert.equal(army(w, p).formationName, 'Combined Arms');
  assert.equal(w.snapshot(p.id).formation.minimumPercent, 15);
  assert.ok(army(w, p).maxHealth > oldMax);
  assert.equal(p.health, w.stats(p).maxHealth);
  const high = p.health;
  const damaged = p.health - 1;
  p.health = damaged;
  assert.throws(() => w.command(p, { type: 'configure-march', units: { infantry: 20 } }), /Recover fully/);
  assert.equal(p.health, damaged);
  p.health = high;
  w.command(p, { type: 'configure-march', units: { infantry: 20, archers: 0, cavalry: 0 }, formation: 'combined-arms' });
  assert.equal(army(w, p).formationActive, false);
  assert.equal(p.health, w.stats(p).maxHealth);
  assert.ok(p.health < high);
  wear(p, { infantry: 100, archers: 50, cavalry: 60 });
  p.health = w.stats(p).maxHealth;
  const saved = w.toSave();
  assert.equal(saved.schema, 23);
  const loaded = World.fromSave(saved), q = loaded.authenticate(s.token);
  assert.equal(loaded.stats(q).maxHealth, w.stats(p).maxHealth);
  assert.equal(army(loaded, q).formationActive, true);
});

test('the health bonus stacks with armament, companion and relic multipliers once each', () => {
  const { w, p } = setup();
  ownCommander(p, 'warden');
  p.secondaryCommanderId = 'warden';
  p.ownedArmaments.push('frontier-cuirass');
  p.commanderArmaments.captain.armor = 'frontier-cuirass';
  p.ownedRelics.push('aegis');
  p.equippedRelic = 'aegis';
  const qualified = healthOf(w, p, { infantry: 100, archers: 50, cavalry: 60 });
  const plain = healthOf(w, p, { infantry: 200 });
  assert.ok(Math.abs(qualified / plain - 1.04) < 0.002);
  wear(p, { infantry: 100, archers: 50, cavalry: 60 });
  const foe = { troops: 20, units: { infantry: 0, archers: 0, cavalry: 20 } };
  assert.ok(counterMultiplier(p, foe) !== 1);
});

test('combat damage uses the raised maximum health and healing stops at it', () => {
  const { w, p } = setup();
  wear(p, { infantry: 100, archers: 50, cavalry: 60 });
  p.health = w.stats(p).maxHealth;
  const cap = p.health;
  const result = { absorbed: 0, damageTaken: 0 };
  applyDamage(p, 40, result);
  assert.equal(result.damageTaken, 40);
  assert.equal(p.health, cap - 40);
  for (let i = 0; i < 800; i++) w.tick(0.1);
  assert.equal(p.health, w.stats(p).maxHealth);
  assert.ok(p.health <= cap);
});
