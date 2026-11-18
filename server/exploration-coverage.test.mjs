import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { World } from './world.mjs';
import { route, scoutRoute } from './navigation.mjs';
import { cellIndex } from './world-map.mjs';
import { SCOUT_CAMP_LEVELS } from './scout-camp.mjs';
import { findingById } from './findings.mjs';

const expected = JSON.parse(readFileSync(new URL('../research/parity/fixtures/scouting-exploration.json', import.meta.url), 'utf8'));
const fresh = (name = 'Night scout') => {
  let world;
  world = new World({ random: () => 0.25, now: () => Date.UTC(2026, 10, 19) + Math.floor((world?.time ?? 0) * 1000) });
  const session = world.join(name, 'greek');
  return { world, session, player: world.authenticate(session.token) };
};
const probes = [];
for (let z = 16; z <= 240; z += 32) for (let x = 16; x <= 240; x += 32) probes.push({ x, z });

test('scout camp capacity and speed stay on the existing local table', () => {
  assert.deepEqual(SCOUT_CAMP_LEVELS, expected.levels);
  assert.equal(expected.fogCells, 4096);
});

test('a fresh city starts with local fog, one scout reveals new land, and a locked pass still blocks an army', () => {
  const { world, player } = fresh();
  const initial = player.explored.length;
  assert.ok(initial > 0 && initial < expected.fogCells);
  assert.equal(player.explored.includes(cellIndex({ x: 250, z: 250 })) && player.explored.includes(cellIndex({ x: 8, z: 8 })), false);
  const locked = probes.find(point => route(world, player, point) == null && scoutRoute(world, { ownerId: player.id, x: player.homeX, z: player.homeZ }, point));
  assert.ok(locked, 'expected a physically open scout corridor behind a closed military pass');
  world.command(player, { type: 'scout-send', ...locked });
  assert.equal(player.scouts.length, 1);
  assert.throws(() => world.command(player, { type: 'move', ...locked }), /gate|route/i);
  let revealed = false;
  for (let i = 0; i < 800 && player.scouts.length; i++) {
    const before = player.explored.length;
    world.tick(0.25);
    if (player.explored.length > before) revealed = true;
  }
  assert.equal(revealed, true);
  assert.ok(player.explored.length > initial);
});

test('unlocked scouts take different reachable fog and an impossible position is not permanent', () => {
  const { world, player } = fresh('Several scouts');
  player.buildings.scoutcamp = 5;
  world.command(player, { type: 'scout-auto', enabled: true });
  assert.equal(player.scouts.length, 3);
  const targets = player.scouts.map(s => cellIndex({ x: s.targetX, z: s.targetZ }));
  assert.equal(new Set(targets).size, 3);
  for (const s of player.scouts) {
    assert.equal(player.explored.includes(cellIndex({ x: s.targetX, z: s.targetZ })), false);
    assert.ok(scoutRoute(world, s, { x: s.targetX, z: s.targetZ }));
  }
  const stuck = player.scouts[0];
  world.command(player, { type: 'scout-redirect', targetId: stuck.id, x: 24, z: 24 });
  assert.equal(stuck.phase, 'Outbound');
  world.command(player, { type: 'scout-recall', targetId: stuck.id });
  assert.equal(stuck.phase, 'Returning');
  stuck.x = -8; stuck.z = -8;
  for (let i = 0; i < 12; i++) world.tick(0.25);
  assert.equal(player.scouts.some(s => s.id === stuck.id), false);
  assert.ok(player.scouts.length >= 1);
});

test('investigation rewards grant once, fog survives restart, and another city receives no private intelligence', () => {
  const { world, session, player } = fresh('Finder');
  const otherSession = world.join('Outsider', 'norse');
  const other = world.authenticate(otherSession.token);
  const place = findingById('olive-rest');
  world.command(player, { type: 'scout-send', x: place.x, z: place.z });
  for (let i = 0; i < 800 && (player.scouts.length || !player.findings.known.includes(place.id)); i++) world.tick(0.25);
  assert.ok(player.findings.known.includes(place.id));
  assert.equal(player.scouts.length, 0);
  const food = player.food;
  world.command(player, { type: 'finding-claim', targetId: place.id });
  assert.ok(player.food > food);
  assert.throws(() => world.command(player, { type: 'finding-claim', targetId: place.id }), /already/);
  const cave = findingById('whispering-cleft');
  world.command(player, { type: 'scout-send', x: cave.x, z: cave.z });
  for (let i = 0; i < 1200 && (player.scouts.length || !player.findings.known.includes(cave.id)); i++) world.tick(0.25);
  assert.ok(player.findings.known.includes(cave.id));
  world.command(player, { type: 'finding-investigate', targetId: cave.id });
  for (let i = 0; i < 800 && !player.findings.completed.includes(cave.id); i++) world.tick(0.25);
  assert.ok(player.findings.completed.includes(cave.id));
  world.command(player, { type: 'finding-claim', targetId: cave.id });
  assert.throws(() => world.command(player, { type: 'finding-claim', targetId: cave.id }), /already/);
  const explored = [...player.explored];
  const restored = World.fromSave(world.toSave());
  const saved = restored.authenticate(session.token);
  assert.deepEqual(saved.explored, explored);
  assert.throws(() => restored.command(saved, { type: 'finding-claim', targetId: place.id }), /already/);
  assert.throws(() => restored.command(saved, { type: 'finding-claim', targetId: cave.id }), /already/);
  const hidden = world.snapshot(other.id);
  assert.equal(hidden.exploration.reports.length, 0);
  assert.equal(hidden.players.find(city => city.id === player.id).explored, undefined);
  assert.equal(hidden.players.find(city => city.id === player.id).findings, undefined);
  assert.equal(hidden.armies.some(army => army.ownerId === player.id && army.cargo), false);
  const own = world.snapshot(player.id);
  assert.ok(own.exploration.explored.length >= explored.length);
  assert.ok(own.exploration.reports.every(report => report.armies.every(army => army.cargo === undefined && army.targetId === undefined)));
});

test('automatic exploration reaches every fog cell through legal scout movement', () => {
  const { world, session, player } = fresh('Full veil');
  assert.ok(player.explored.length < expected.fogCells);
  const started = performance.now();
  world.command(player, { type: 'scout-auto', enabled: true });
  assert.equal(player.scouts.length, 1);
  assert.equal(player.explored.includes(cellIndex({ x: player.scouts[0].targetX, z: player.scouts[0].targetZ })), false);
  let last = player.explored.length, idle = 0, ticks = 0;
  for (; ticks < 50000 && player.explored.length < expected.fogCells; ticks++) {
    world.tick(0.25);
    if (ticks % 20 === 0) {
      if (player.explored.length > last) { last = player.explored.length; idle = 0; }
      else if (++idle > 40) break;
    }
  }
  const restored = World.fromSave(world.toSave());
  const saved = restored.authenticate(session.token);
  const report = {
    cells: player.explored.length,
    restarted: saved.explored.length,
    ticks,
    seconds: world.time,
    wallSeconds: (performance.now() - started) / 1000,
    scouts: player.scouts.map(s => ({ phase: s.phase, x: s.x, z: s.z, targetX: s.targetX, targetZ: s.targetZ })),
    home: { x: player.homeX, z: player.homeZ }
  };
  mkdirSync('docs/qa/evidence/cursor-night-1', { recursive: true });
  writeFileSync('docs/qa/evidence/cursor-night-1/legal-exploration.json', JSON.stringify(report, null, 2) + '\n');
  assert.equal(report.cells, expected.fogCells);
  assert.equal(report.restarted, expected.fogCells);
});
