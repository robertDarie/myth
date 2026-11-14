import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './testing/legacy-world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { technologyCard, passiveCap, citySnapshot } from './city.mjs';
import { trainingOptions, trainingSpeed } from './troops.mjs';
import { treatmentSpeed } from './war.mjs';
import { carryCapacity } from './field-logistics.mjs';
import { TECHNOLOGIES } from './city-content.mjs';

const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds * 10); i++) w.tick(0.1); };
const setup = () => {
  const w = testWorld(), s = w.join('Athenaeum'), p = w.authenticate(s.token);
  for (const id of ['food', 'wood', 'gold', 'stone', 'mana']) p[id] = 100000;
  p.cityLevel = 5; p.buildings.academy = 5; p.buildings.vault = 1; p.buildings.infirmary = 1;
  p.technologies.drill = 1; p.technologies.vitality = 1; p.technologies.harvest = 1; p.technologies.logistics = 1;
  return { w, p, s };
};
const card = (p, id) => technologyCard(p, TECHNOLOGIES.find(t => t.id === id));

test('the four new technologies have bounded ranks, costs and prerequisites', () => {
  const { w, p } = setup();
  for (const [id, percent, prerequisite] of [['drills', 4, 'drill'], ['mercy', 6, 'vitality'], ['stores', 8, 'harvest'], ['caravan', 6, 'logistics']]) {
    const tech = TECHNOLOGIES.find(t => t.id === id);
    assert.equal(tech.percent, percent);
    assert.equal(tech.maxLevel ?? 3, 3);
    assert.equal(card(p, id).canResearch, true);
    assert.equal(card(p, id).currentBonus, 0);
    assert.equal(card(p, id).nextBonus, percent);
    p.technologies[prerequisite] = 0;
    assert.match(card(p, id).lockedReason, /rank 1/);
    assert.throws(() => w.command(p, { type: 'research', targetId: id }), /rank 1/);
    p.technologies[prerequisite] = 1;
  }
  p.buildings.academy = 1;
  assert.match(card(p, 'drills').lockedReason, /Athenaeum level 2/);
  p.buildings.academy = 5;
  assert.throws(() => w.command(p, { type: 'research', targetId: 'unknown-lore' }), /Unknown technology/);
});

test('every rank applies once, refunds exactly, and does not rewrite a paid training order', () => {
  const { w, p, s } = setup();
  w.command(p, { type: 'train', targetId: 'infantry' });
  const paidTraining = p.trainingQueue[0].duration;
  assert.equal(paidTraining, 8);
  const quote = card(p, 'drills');
  const before = p.food;
  w.command(p, { type: 'research', targetId: 'drills' });
  assert.equal(p.food, before - quote.cost.food);
  assert.throws(() => w.command(p, { type: 'research', targetId: 'mercy' }), /busy/);
  w.command(p, { type: 'cancel-job', targetId: p.research.id });
  assert.equal(p.food, before);
  assert.equal(p.technologies.drills, 0);
  w.command(p, { type: 'research', targetId: 'drills' });
  const saved = World.fromSave(w.toSave()), q = saved.authenticate(s.token);
  assert.equal(q.research.targetId, 'drills');
  assert.equal(q.trainingQueue[0].duration, paidTraining);
  advance(saved, 1);
  assert.equal(q.trainingQueue[0].duration, paidTraining);
  advance(saved, q.research.remaining + 1);
  assert.equal(q.technologies.drills, 1);
  assert.equal(q.research, null);
  advance(saved, 30);
  assert.equal(q.technologies.drills, 1);
  for (let rank = 2; rank <= 3; rank++) {
    const next = card(q, 'drills');
    assert.equal(next.duration, 12 * rank);
    assert.equal(next.cost.food, 70 * rank * rank);
    saved.command(q, { type: 'research', targetId: 'drills' });
    advance(saved, next.duration + 1);
    assert.equal(q.technologies.drills, rank);
  }
  assert.throws(() => saved.command(q, { type: 'research', targetId: 'drills' }), /Maximum/);
  const fresh = trainingOptions(q).find(t => t.id === 'infantry').orderSeconds;
  assert.ok(fresh < paidTraining);
});

test('training, healing, stockpile and cargo use the new ranks with the existing bonuses', () => {
  const { w, p } = setup();
  assert.equal(trainingSpeed(p), 1);
  assert.equal(trainingOptions(p).find(t => t.id === 'infantry').orderSeconds, 8);
  p.buildings.barracks = 3;
  p.technologies.drills = 3;
  const speed = (1 + 0.1 * 2) * (1 + 0.04 * 3);
  assert.equal(trainingSpeed(p), speed);
  const quoted = trainingOptions(p).find(t => t.id === 'archers');
  w.command(p, { type: 'train', targetId: 'archers' });
  assert.ok(Math.abs(p.trainingQueue[0].duration - quoted.orderSeconds) < 0.001);
  assert.ok(Math.abs(quoted.orderSeconds - 10 * (quoted.orderAmount / 5) / speed) < 0.001);
  p.wounded.infantry = 5;
  const plain = treatmentSpeed({ buildings: { infirmary: 1 }, technologies: { mercy: 0 } });
  w.command(p, { type: 'hospital-heal', units: { infantry: 5, archers: 0, cavalry: 0 }, mythic: 0 });
  const baseHeal = p.healing.duration;
  w.command(p, { type: 'hospital-cancel', targetId: p.healing.id });
  p.buildings.infirmary = 3; p.technologies.mercy = 3;
  w.command(p, { type: 'hospital-heal', units: { infantry: 5, archers: 0, cavalry: 0 }, mythic: 0 });
  const combined = (1 + 0.15 * 2) * (1 + 0.06 * 3);
  assert.ok(Math.abs(p.healing.duration - Math.max(2, 6 / combined)) < 0.001);
  assert.ok(p.healing.duration < baseHeal / plain);
  p.technologies.stores = 0;
  const uncapped = passiveCap(p);
  p.technologies.stores = 3;
  assert.equal(passiveCap(p), Math.floor(uncapped * 1.24));
  assert.equal(citySnapshot(w, p).passiveLimit, passiveCap(p));
  const above = passiveCap(p) + 50;
  p.wood = above; advance(w, 12); assert.equal(p.wood, above);
  p.units = { infantry: 10, archers: 0, cavalry: 0 }; p.troops = 10; p.mythic = 2; p.technologies.logistics = 2; p.technologies.caravan = 3;
  assert.equal(carryCapacity(w, p), Math.floor((10 * 16 + 2 * 80) * (1 + 0.08 * 2) * (1 + 0.06 * 3)));
});

test('missing ranks load as zero and impossible research is rejected', () => {
  const { w, p, s } = setup();
  p.food = 321; p.technologies.drills = 2;
  const old = structuredClone(w.toSave());
  for (const id of ['drills', 'mercy', 'stores', 'caravan']) delete old.world.players[0].technologies[id];
  const loaded = World.fromSave(old), q = loaded.authenticate(s.token);
  assert.equal(loaded.toSave().schema, 27);
  assert.equal(q.food, 321);
  assert.equal(q.technologies.drills, 0);
  assert.equal(q.technologies.drill, 1);
  for (const [id, value] of [['drills', 4], ['mercy', -1], ['stores', 1.5]]) {
    const bad = structuredClone(w.toSave());
    bad.world.players[0].technologies[id] = value;
    assert.throws(() => World.fromSave(bad), /progression/);
  }
  const skipped = structuredClone(w.toSave());
  skipped.world.players[0].technologies.drills = 1;
  skipped.world.players[0].technologies.drill = 0;
  assert.throws(() => World.fromSave(skipped), /prerequisites/);
});
