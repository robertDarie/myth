import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { World } from './world.mjs';
import { route } from './navigation.mjs';
import { provinceAt } from './world-map.mjs';
import { kingdomForsakenLevel, FORSAKEN_RULES } from './forsaken.mjs';
import { aliveForsaken } from './forsaken-population.mjs';
import { referenceCamp } from './numerics.mjs';
import { unitTotal } from './troops.mjs';

const expected = JSON.parse(readFileSync(new URL('../research/parity/fixtures/forsaken-encounters.json', import.meta.url), 'utf8'));
const open = () => {
  let world;
  world = new World({ random: () => 0.25, now: () => Date.UTC(2026, 10, 19) + Math.floor((world?.time ?? 0) * 1000) });
  const session = world.join('Warden', 'greek');
  return { world, session, player: world.authenticate(session.token) };
};
const search = (world, player, level) => {
  world.command(player, { type: 'forsaken-search', count: level });
  return player.forsaken.searchResult;
};
const settle = (world, player, camp) => {
  for (let i = 0; i < 2400 && !player.coreReports.some(report => report.encounterId === camp.id && report.encounterCycle === camp.cycle); i++) world.tick(0.25);
  return player.coreReports.find(report => report.encounterId === camp.id && report.encounterCycle === camp.cycle);
};

test('a fresh city can search, inspect, fight and record one beginner Forsaken reward', () => {
  const { world, session, player } = open();
  const before = aliveForsaken(world).length;
  assert.ok(before > 0 && before <= 192);
  assert.equal(kingdomForsakenLevel(world), 6);
  assert.equal(player.forsaken.unlocked, 1);
  const higher = aliveForsaken(world).find(camp => camp.level > 1);
  if (higher) assert.throws(() => world.command(player, { type: 'attack', targetId: higher.id }), /unlock|gate|unavailable/i);
  const result = search(world, player, 1);
  assert.equal(result.status, 'found');
  const card = world.snapshot(player.id).camps.find(camp => camp.id === result.id);
  assert.equal(card.level, 1);
  assert.equal(card.apCost, 50);
  assert.equal(card.commanderXP, referenceCamp(1).commanderXP);
  assert.equal(card.recommendedTroops, referenceCamp(1).recommendedTroops);
  assert.equal(card.encounter, undefined);
  const camp = world.camps.find(item => item.id === result.id);
  const ap = player.ap;
  world.command(player, { type: 'attack', targetId: camp.id });
  world.command(player, { type: 'attack', targetId: camp.id });
  const moved = { x: camp.x, z: camp.z };
  for (let i = 0; i < 40; i++) {
    world.tick(0.25);
    if (Math.hypot(camp.x - moved.x, camp.z - moved.z) > 0.2 && player.target?.type === 'attack') break;
  }
  if (player.target?.type === 'attack') assert.ok(Math.hypot(player.target.x - camp.x, player.target.z - camp.z) < 4);
  const report = settle(world, player, camp);
  assert.equal(report.outcome, 'Victory');
  assert.equal(report.apCharged, 50);
  assert.equal(player.ap, ap - 50);
  assert.equal(player.heroRecords.captain.xp, 100);
  assert.equal(player.forsaken.unlocked, 2);
  assert.equal(player.coreReports.filter(item => item.encounterId === camp.id && item.outcome === 'Victory').length, 1);
  const pages = player.inventory['chronicle-page'];
  const restored = World.fromSave(world.toSave(), { now: world.now, random: world.random });
  const saved = restored.authenticate(session.token);
  assert.equal(saved.inventory['chronicle-page'], pages);
  assert.equal(saved.forsaken.unlocked, 2);
  assert.equal(saved.coreReports.filter(item => item.encounterId === camp.id).length, 1);
  restored.tick(0.25);
  assert.equal(saved.inventory['chronicle-page'], pages);
});

test('intermediate and high Forsaken levels stay behind unlock and kingdom gates', () => {
  const { world, player } = open();
  assert.equal(FORSAKEN_RULES.maxLevel, expected.maxLevel);
  assert.equal(FORSAKEN_RULES.respawnSeconds, expected.respawnSeconds);
  assert.equal(FORSAKEN_RULES.rareChance, expected.rareChance);
  for (let level = 1; level <= expected.maxLevel; level++) {
    const row = referenceCamp(level);
    assert.equal(row.commanderXP, expected.commanderXpPerLevel * level);
    assert.ok(row.recommendedTroops > 0);
    assert.equal(row.ap ?? 50, 50);
  }
  assert.throws(() => search(world, player, 8), /unlocked/);
  assert.throws(() => search(world, player, 25), /unlocked/);
  player.forsaken.unlocked = 25;
  assert.throws(() => search(world, player, 21), /unlocked/);
  assert.throws(() => search(world, player, 25), /unlocked/);
  world.kingdom.startedAtMs = world.now() - 20 * 86400000;
  assert.equal(kingdomForsakenLevel(world), 25);
  const result = search(world, player, 8);
  assert.equal(result.status, 'found');
  assert.equal(world.camps.find(item => item.id === result.id).level, 8);
  const blocked = world.snapshot(player.id).camps.find(camp => camp.level > 6 && camp.level <= 25);
  if (blocked) assert.equal(blocked.lockedReason, '');
});

test('two cities, a closed pass, fog and a rally-only Godbreaker stay separated', () => {
  const { world, player } = open();
  const other = world.authenticate(world.join('Outsider', 'norse').token);
  const result = search(world, player, 1);
  const own = world.snapshot(player.id);
  const hidden = world.snapshot(other.id);
  assert.ok(own.camps.some(camp => camp.id === result.id));
  assert.equal(hidden.players.find(city => city.id === player.id).forsaken, undefined);
  if (!hidden.camps.some(camp => camp.id === result.id)) assert.equal(hidden.camps.some(camp => camp.id === result.id), false);
  const blocked = aliveForsaken(world).find(camp => route(world, player, camp) == null);
  if (blocked) assert.throws(() => world.command(player, { type: 'attack', targetId: blocked.id }), /gate|route|unavailable/i);
  const godbreaker = world.strongholds[0];
  assert.throws(() => world.command(player, { type: 'attack', targetId: godbreaker.id }), /Camp|unavailable/i);
  assert.equal(player.ap > 50, true);
});

test('insufficient AP does not start the fight, and population stays bounded across restart', () => {
  const { world, session, player } = open();
  const result = search(world, player, 1);
  const camp = world.camps.find(item => item.id === result.id);
  player.ap = 10;
  world.command(player, { type: 'attack', targetId: camp.id });
  const health = camp.health;
  for (let i = 0; i < 80 && player.target; i++) world.tick(0.25);
  assert.equal(camp.health, health);
  assert.equal(player.ap, 10);
  assert.equal(player.coreReports.some(report => report.encounterId === camp.id), false);
  const ids = aliveForsaken(world).map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length <= 192);
  for (const item of aliveForsaken(world)) {
    assert.ok([...world.players.values()].every(city => Math.hypot(item.anchorX - city.homeX, item.anchorZ - city.homeZ) >= 4));
    assert.ok(world.sites.filter(site => site.kind === 'gate').every(site => Math.hypot(item.anchorX - site.x, item.anchorZ - site.z) >= 3.5));
  }
  const started = performance.now();
  for (let i = 0; i < 200; i++) world.tick(0.25);
  assert.ok(performance.now() - started < 5000);
  const restored = World.fromSave(world.toSave(), { now: world.now, random: world.random });
  assert.deepEqual(aliveForsaken(restored).map(item => item.id).sort(), aliveForsaken(world).map(item => item.id).sort());
  assert.equal(restored.authenticate(session.token).forsaken.searchResult.id, result.id);
  assert.equal(FORSAKEN_RULES.respawnSeconds, 90);
  assert.equal(FORSAKEN_RULES.rareChance, 0.1);
});

test('a fresh city with no Forsaken in sight still gets one on a legal route, fights once, and keeps that result private', () => {
  let world;
  world = new World({ random: () => 0.2, now: () => Date.UTC(2026, 10, 21) + Math.floor((world?.time ?? 0) * 1000) });
  const session = world.join('Seeker', 'greek');
  const player = world.authenticate(session.token);
  for (const camp of aliveForsaken(world)) if (camp.level === 1) {
    camp.x = Math.min(36, Math.max(8, player.homeX));
    camp.z = Math.min(36, player.homeZ + 18);
    camp.anchorX = camp.patrolX = camp.x;
    camp.anchorZ = camp.patrolZ = camp.z;
    camp.provinceId = provinceAt(camp).id;
    camp.patrolState = 'PAUSING';
  }
  assert.ok(aliveForsaken(world).some(camp => camp.level === 1 && Math.hypot(camp.x - player.homeX, camp.z - player.homeZ) > 10));
  const explored = [...player.explored];
  const army = world.armies().find(item => item.ownerId === player.id || item.id === player.id);
  const troops = unitTotal(army.units);
  const ap = player.ap;
  const result = search(world, player, 1);
  assert.equal(result.status, 'found');
  const camp = world.camps.find(item => item.id === result.id);
  assert.equal(camp.level, 1);
  assert.equal(camp.maxHealth, referenceCamp(1).maxHealth);
  assert.deepEqual(player.explored, explored);
  assert.ok(route(world, player, camp));
  assert.equal(world.canEnter(player, camp), true);
  const preview = world.previewMarch(player, { type: 'attack', targetId: camp.id });
  assert.equal(preview.authorized, true);
  assert.equal(player.ap, ap);
  const other = world.authenticate(world.join('Outsider', 'norse').token);
  const hidden = world.snapshot(other.id);
  assert.equal(hidden.players.find(city => city.id === player.id).forsaken, undefined);
  assert.equal(hidden.camps.some(item => item.id === camp.id && item.searchPin), false);
  world.command(player, { type: 'attack', targetId: camp.id });
  world.command(player, { type: 'attack', targetId: camp.id });
  const report = settle(world, player, camp);
  assert.equal(report.outcome, 'Victory');
  assert.equal(report.apCharged, 50);
  assert.equal(player.ap, ap - 50);
  assert.equal(player.heroRecords.captain.xp, 100);
  assert.equal(player.coreReports.filter(item => item.encounterId === camp.id && item.outcome === 'Victory').length, 1);
  assert.equal(unitTotal(report.unitsBefore), unitTotal(report.unitsAfter) + unitTotal(report.wounded));
  assert.equal(unitTotal(world.armies().find(item => item.id === army.id).units) + unitTotal(player.wounded), troops);
  world.command(player, { type: 'return' });
  for (let i = 0; i < 400 && world.armies().find(item => item.id === army.id).target; i++) world.tick(0.25);
  assert.equal(world.armies().find(item => item.id === army.id).target, null);
  const pages = player.inventory['chronicle-page'];
  const restored = World.fromSave(world.toSave(), { now: world.now, random: world.random });
  const saved = restored.authenticate(session.token);
  assert.equal(saved.ap, player.ap);
  assert.equal(saved.heroRecords.captain.xp, 100);
  assert.equal(saved.inventory['chronicle-page'], pages);
  assert.equal(saved.coreReports.filter(item => item.encounterId === camp.id && item.outcome === 'Victory').length, 1);
  restored.tick(0.25);
  assert.equal(saved.coreReports.filter(item => item.encounterId === camp.id && item.outcome === 'Victory').length, 1);
  assert.equal(other.forsaken.searchResult, null);
});
