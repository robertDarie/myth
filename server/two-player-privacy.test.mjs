import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { provinceAt } from './world-map.mjs';
import { visible } from './exploration.mjs';
import { unitTotal } from './troops.mjs';

// Seed 5 is a real spawn draw: both cities land in Dawn Reach, 24.9 units apart.
// The test pays the published Citadel quote and marches through the public commands.
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
const advance = (world, seconds) => { for (let step = 0; step < Math.ceil(seconds * 10); step++) world.tick(0.1); };
const toward = (from, to, distance) => {
  const span = Math.hypot(to.x - from.x, to.z - from.z);
  return { x: from.x + (to.x - from.x) / span * distance, z: from.z + (to.z - from.z) / span * distance };
};
const hidden = (world, viewer, subject) => world.snapshot(viewer.id).players.find(row => row.id === subject.id);

test('two legal cities fight once and a bystander cannot read the report', () => {
  const world = new World({ random: mulberry32(5) });
  const herald = world.authenticate(world.join('Herald', 'greek').token);
  const banner = world.authenticate(world.join('Banner', 'japanese').token);
  assert.equal(provinceAt(herald).id, 'dawn-reach');
  assert.equal(provinceAt(banner).id, 'dawn-reach');
  assert.ok(Math.hypot(herald.homeX - banner.homeX, herald.homeZ - banner.homeZ) < 30);
  assert.equal(herald.troops, 900);
  assert.equal(banner.troops, 900);
  assert.equal(herald.food, 10000);
  assert.equal(herald.gold, 1000);
  assert.equal(herald.stone, 150);
  assert.equal(banner.wood, 10000);
  assert.deepEqual(herald.inventory, {});
  assert.equal(hidden(world, herald, banner).mapVisible, false);
  assert.equal(hidden(world, herald, banner).food, undefined);
  assert.equal(hidden(world, herald, banner).battleReports, undefined);
  assert.equal(hidden(world, herald, banner).inventory, undefined);
  assert.equal(hidden(world, banner, herald).troops, undefined);

  const troops = () => [herald.troops, banner.troops, unitTotal(herald.wounded), unitTotal(banner.wounded)];
  const beforeSight = troops();
  assert.throws(() => world.command(herald, { type: 'attack-player', targetId: banner.id }), /allied vision/);
  assert.deepEqual(troops(), beforeSight);
  assert.equal(world.battles.size, 0);

  world.command(herald, { type: 'upgrade' });
  world.command(banner, { type: 'upgrade' });
  assert.equal(herald.wood, 9900);
  assert.equal(herald.stone, 110);
  assert.equal(herald.gold, 925);
  assert.equal(banner.gold, 925);
  assert.equal(banner.stone, 110);
  advance(world, 21);
  assert.equal(herald.cityLevel, 2);
  assert.equal(banner.cityLevel, 2);
  assert.equal(herald.construction, null);
  assert.equal(banner.construction, null);

  const bannerField = toward(banner, { x: herald.homeX, z: herald.homeZ }, 4);
  world.command(banner, { type: 'move', x: bannerField.x, z: bannerField.z });
  advance(world, 2);
  assert.equal(world.atHome(banner), false);
  assert.equal(visible(world, herald, banner), false);
  assert.throws(() => world.command(herald, { type: 'attack-player', targetId: banner.id }), /allied vision/);
  assert.equal(world.battles.size, 0);

  const meeting = toward(banner, herald, 6);
  world.command(herald, { type: 'move', x: meeting.x, z: meeting.z });
  advance(world, 8);
  assert.equal(visible(world, herald, banner), true);
  assert.equal(herald.deployed, true);
  assert.equal(banner.deployed, true);
  const gold = [herald.gold, banner.gold];
  const stone = [herald.stone, banner.stone];
  world.command(herald, { type: 'attack-player', targetId: banner.id });
  let seconds = 0;
  do { advance(world, 1); seconds++; } while (world.battles.size && seconds < 240);
  assert.equal(world.battles.size, 0);
  assert.equal(herald.battleReports.length, 1);
  assert.equal(banner.battleReports.length, 1);
  assert.equal(herald.battleReports[0].id, banner.battleReports[0].id);
  assert.match(herald.battleReports[0].outcome, /victory|Draw/);
  assert.equal(herald.troops + unitTotal(herald.wounded), 900);
  assert.equal(banner.troops + unitTotal(banner.wounded), 900);
  const wounded = [unitTotal(herald.wounded), unitTotal(banner.wounded)].sort((left, right) => left - right);
  assert.deepEqual(wounded, [0, 225]);
  assert.deepEqual([herald.gold, banner.gold], gold);
  assert.deepEqual([herald.stone, banner.stone], stone);
  assert.equal(herald.inventory['food-pack-100'], undefined);
  assert.equal(banner.inventory['food-pack-100'], undefined);

  const watcher = world.authenticate(world.join('Watcher', 'norse').token);
  for (const subject of [herald, banner]) {
    const card = hidden(world, watcher, subject);
    assert.equal(card.battleReports, undefined);
    assert.equal(card.food, undefined);
    assert.equal(card.gold, undefined);
    assert.equal(card.troops, undefined);
    assert.equal(card.inventory, undefined);
    assert.equal(card.wounded, undefined);
  }
  assert.equal(world.snapshot(watcher.id).players.find(row => row.id === watcher.id).battleReports.length, 0);
  const kept = herald.troops;
  assert.throws(() => world.command(watcher, { type: 'attack-player', marchId: herald.id, targetId: banner.id }), /vision|belong/);
  assert.equal(herald.troops, kept);
  assert.throws(() => world.command(herald, { type: 'rally-create', targetId: 'gate-dawn' }), /alliance/);
  assert.throws(() => world.command(watcher, { type: 'garrison-join', targetId: 'gate-dawn' }), /alliance|held/);
  assert.equal(world.rallies.length, 0);
  assert.equal(world.garrisons.length, 0);

  const restored = World.fromSave(world.toSave());
  const savedHerald = [...restored.players.values()].find(player => player.name === 'Herald');
  const savedBanner = [...restored.players.values()].find(player => player.name === 'Banner');
  assert.equal(savedHerald.battleReports.length, 1);
  assert.equal(savedBanner.battleReports.length, 1);
  assert.equal(savedHerald.battleReports[0].id, herald.battleReports[0].id);
  assert.equal(savedHerald.troops, herald.troops);
  assert.equal(unitTotal(savedHerald.wounded), unitTotal(herald.wounded));
  assert.equal(savedBanner.troops, banner.troops);
  assert.equal(unitTotal(savedBanner.wounded), unitTotal(banner.wounded));
  assert.equal(savedHerald.cityLevel, 2);
  assert.equal(savedBanner.gold, banner.gold);
  const twice = World.fromSave(restored.toSave());
  assert.equal([...twice.players.values()].find(player => player.name === 'Herald').battleReports.length, 1);
});
