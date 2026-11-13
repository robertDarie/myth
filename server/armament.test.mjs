import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { ownCommander } from './testing/roster-fixture.mjs';
import { armyList, ensureHero } from './progression.mjs';

const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds * 10); i++) w.tick(0.1); };
const setup = () => {
  const w = testWorld(), s = w.join('A'), p = w.authenticate(s.token);
  for (const id of ['wood', 'food', 'gold', 'stone', 'mana']) p[id] = 10000;
  p.cityLevel = 3; p.buildings.quarry = 2; p.buildings.forge = 1;
  return { w, p, s };
};
const cmd = (w, p, type, targetId, extra = {}) => w.command(p, { type, targetId, ...extra });

test('a schema 18 city gains empty armaments and no companion', () => {
  const { w, p, s } = setup();
  const old = structuredClone(w.toSave());
  old.schema = 18;
  delete old.world.players[0].ownedArmaments;
  delete old.world.players[0].commanderArmaments;
  delete old.world.players[0].secondaryCommanderId;
  for (const march of old.world.players[0].marches) delete march.secondaryCommanderId;
  const loaded = World.fromSave(old), q = loaded.authenticate(s.token);
  assert.equal(loaded.toSave().schema, 21);
  assert.deepEqual(q.ownedArmaments, []);
  assert.equal(q.secondaryCommanderId, '');
  assert.deepEqual(q.commanderArmaments.captain, { weapon: '', armor: '', banner: '' });
  assert.equal(q.ownedRelics.length, p.ownedRelics.length);
});

test('the forge crafts one armament, refunds a cancellation, and keeps the march relic separate', () => {
  const { w, p } = setup();
  const before = { ...p };
  cmd(w, p, 'craft', 'frontier-spearhead');
  assert.throws(() => cmd(w, p, 'craft', 'aegis'), /busy/);
  const spent = p.wood;
  cmd(w, p, 'cancel-job', p.crafting.id);
  assert.equal(p.wood, before.wood);
  assert.equal(p.ownedArmaments.length, 0);
  assert.equal(spent < before.wood || p.wood === before.wood, true);
  cmd(w, p, 'craft', 'frontier-spearhead');
  advance(w, 20);
  assert.deepEqual(p.ownedArmaments, ['frontier-spearhead']);
  assert.throws(() => cmd(w, p, 'craft', 'frontier-spearhead'), /already/);
  cmd(w, p, 'craft', 'aegis');
  advance(w, 15);
  assert.ok(p.ownedRelics.includes('aegis'));
  cmd(w, p, 'equip-relic', 'aegis');
  const relicHealth = w.stats(p).maxHealth;
  const beforeDamage = w.stats(p).damage;
  cmd(w, p, 'equip-armament', 'frontier-spearhead', { name: 'captain' });
  assert.equal(p.commanderArmaments.captain.weapon, 'frontier-spearhead');
  assert.equal(w.stats(p).maxHealth, relicHealth);
  assert.ok(w.stats(p).damage > beforeDamage * 1.02);
  assert.equal(armyList(p)[0].equippedRelic, 'aegis');
});

test('armaments cannot change while the commander is deployed and cannot be worn twice', () => {
  const { w, p } = setup();
  p.ownedArmaments.push('frontier-spearhead', 'frontier-cuirass', 'frontier-standard');
  cmd(w, p, 'move', '', { x: 20, z: 20 });
  assert.throws(() => cmd(w, p, 'equip-armament', 'frontier-spearhead', { name: 'captain' }), /home/);
  cmd(w, p, 'return');
  advance(w, 30);
  cmd(w, p, 'equip-armament', 'frontier-spearhead', { name: 'captain' });
  cmd(w, p, 'equip-armament', 'frontier-cuirass', { name: 'captain' });
  const two = w.stats(p).pve;
  cmd(w, p, 'equip-armament', 'frontier-standard', { name: 'captain' });
  assert.equal(w.stats(p).pve, two);
  assert.ok(two > 1);
  ownCommander(p, 'warden');
  cmd(w, p, 'equip-armament', 'frontier-spearhead', { name: 'warden' });
  assert.equal(p.commanderArmaments.captain.weapon, '');
  assert.equal(p.commanderArmaments.warden.weapon, 'frontier-spearhead');
  const forged = structuredClone(w.toSave());
  forged.world.players[0].commanderArmaments.captain.weapon = 'frontier-spearhead';
  assert.throws(() => World.fromSave(forged), /armament/);
  const wrong = structuredClone(w.toSave());
  wrong.world.players[0].commanderArmaments.warden.armor = 'frontier-spearhead';
  wrong.world.players[0].commanderArmaments.warden.weapon = '';
  assert.throws(() => World.fromSave(wrong), /armament/);
});

test('a companion adds a small share and cannot serve twice or replace the primary', () => {
  const { w, p } = setup();
  ownCommander(p, 'warden');
  const alone = w.stats(p).maxHealth;
  cmd(w, p, 'pair-commander', 'warden');
  assert.equal(p.secondaryCommanderId, 'warden');
  assert.ok(w.stats(p).maxHealth > alone);
  assert.ok(w.stats(p).maxHealth < alone * 1.02);
  assert.throws(() => cmd(w, p, 'pair-commander', 'captain'), /primary/);
  assert.throws(() => cmd(w, p, 'commander', 'warden'), /companion/);
  p.cityLevel = 2; p.reserveTroops = 5; p.reserveUnits.infantry = 5;
  assert.throws(() => cmd(w, p, 'deploy-march', 'warden', { troops: 5, mythic: 0 }), /another march/);
  cmd(w, p, 'unpair-commander');
  ownCommander(p, 'scout');
  cmd(w, p, 'deploy-march', 'warden', { troops: 5, mythic: 0 });
  const march = p.marches.at(-1);
  assert.throws(() => cmd(w, p, 'pair-commander', 'captain', { marchId: march.id }), /another march/);
  cmd(w, p, 'pair-commander', 'scout', { marchId: march.id });
  assert.equal(march.secondaryCommanderId, 'scout');
  const saved = World.fromSave(w.toSave());
  const restored = [...saved.players.values()][0];
  assert.equal(restored.marches[0].secondaryCommanderId, 'scout');
  assert.equal(saved.toSave().schema, 21);
});

test('a camp victory keeps the primary experience and grants the companion half', () => {
  const { w, p } = setup();
  ownCommander(p, 'warden');
  cmd(w, p, 'pair-commander', 'warden');
  const camp = w.camps[0];
  camp.health = 1;
  p.x = camp.x - 1; p.z = camp.z;
  const primary = ensureHero(p, 'captain').xp;
  const companion = ensureHero(p, 'warden').xp;
  cmd(w, p, 'attack', '', { targetId: camp.id });
  w.tick(0.1);
  assert.equal(camp.health, 0);
  const gained = 25 * camp.level;
  assert.equal(ensureHero(p, 'captain').xp, primary + gained);
  assert.equal(ensureHero(p, 'warden').xp, companion + Math.floor(gained / 2));
  assert.equal(p.troops, p.units.infantry + p.units.archers + p.units.cavalry);
});
