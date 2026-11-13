import test from 'node:test';
import assert from 'node:assert/strict';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { World } from './world.mjs';
import { FINDINGS, findingById, rolledExtra, materializeReward } from './findings.mjs';
import { cellIndex, fogSnapshot, explorationTick } from './exploration.mjs';

const setup = (names = ['Alpha', 'Beta']) => {
  const w = testWorld(), sessions = names.map(name => w.join(name));
  return { w, sessions, players: sessions.map(s => w.authenticate(s.token)) };
};
const advance = (w, seconds) => { for (let i = 0; i < seconds * 10; i++) w.tick(0.1); };
const reveal = (w, p, place) => { const cell = cellIndex(place); if (!p.explored.includes(cell)) p.explored.push(cell); explorationTick(w, 0); };
const gift = (p, id) => p.findings.rewards[id];

test('ancient places are deterministic, separated and reachable inside the map', () => {
  assert.equal(FINDINGS.length, 15);
  for (const category of ['settlement', 'cavern', 'ruin']) assert.equal(FINDINGS.filter(place => place.category === category).length, 5);
  for (const culture of ['greek', 'egyptian', 'norse', 'chinese', 'japanese']) assert.equal(FINDINGS.filter(place => place.culture === culture).length, 3);
  const { w, players: [p] } = setup(['Walker']);
  const occupied = [...w.nodes, ...w.camps, ...w.sites, ...w.strongholds];
  for (const place of FINDINGS) {
    assert.ok(place.x >= 1 && place.x <= 79 && place.z >= 1 && place.z <= 79);
    assert.ok(FINDINGS.filter(other => other.id !== place.id).every(other => Math.hypot(other.x - place.x, other.z - place.z) >= 5));
    assert.ok(occupied.every(other => Math.hypot(other.x - place.x, other.z - place.z) >= 5));
    assert.equal(new Set(FINDINGS.map(item => cellIndex(item))).size, FINDINGS.length);
  }
  const home = FINDINGS.filter(place => place.x <= 40 && place.z <= 40);
  assert.ok(home.length >= 3);
  for (const place of home) assert.equal(w.canEnter(p, place), true);
});

test('fog reveals a place without publishing places still under fog', () => {
  const { w, players: [a, b] } = setup();
  const place = findingById('olive-rest');
  assert.equal(fogSnapshot(w, a).findings.some(item => item.id === place.id), false);
  assert.equal(fogSnapshot(w, a).journal.remaining, 15);
  reveal(w, a, place);
  const own = fogSnapshot(w, a);
  assert.equal(own.findings.length, 1);
  assert.equal(own.findings[0].id, 'olive-rest');
  assert.equal(own.findings[0].state, 'known');
  assert.equal(own.journal.discovered, 1);
  assert.equal(own.journal.byType.settlement, 1);
  assert.equal(own.journal.remaining, 14);
  assert.equal(own.journal.nextUnclaimedId, 'olive-rest');
  const other = fogSnapshot(w, b);
  assert.equal(other.findings.length, 0);
  assert.equal(other.journal.discovered, 0);
  assert.equal(JSON.stringify(other).includes('olive-rest'), false);
});

test('a settlement claim is once per city and does not spend another city claim', () => {
  const { w, players: [a, b] } = setup();
  const place = findingById('olive-rest');
  reveal(w, a, place); reveal(w, b, place);
  const before = { food: b.food, gold: b.gold, aether: b.aether };
  w.command(a, { type: 'finding-claim', targetId: place.id });
  assert.equal(a.findings.claimed.includes(place.id), true);
  assert.throws(() => w.command(a, { type: 'finding-claim', targetId: place.id }), /already been claimed/);
  assert.equal(b.findings.claimed.includes(place.id), false);
  assert.equal(b.food, before.food); assert.equal(b.gold, before.gold); assert.equal(b.aether, before.aether);
  w.command(b, { type: 'finding-claim', targetId: place.id });
  assert.equal(b.findings.claimed.includes(place.id), true);
  assert.ok(a.food >= 80 && a.aether === 0 && b.aether === 0);
  assert.equal(fogSnapshot(w, a).journal.unclaimed, 0);
  assert.equal(fogSnapshot(w, a).journal.claimed, 1);
});

test('cave and ruin investigations use one scout, survive restart, and recall cancels the unfinished descent', () => {
  const { w, sessions, players: [p] } = setup(['Diver']);
  p.buildings.scoutcamp = 5;
  const cave = findingById('whispering-cleft'), ruin = findingById('warden-stoa');
  reveal(w, p, cave); reveal(w, p, ruin);
  assert.throws(() => w.command(p, { type: 'finding-claim', targetId: cave.id }), /Investigate/);
  w.command(p, { type: 'finding-investigate', targetId: cave.id });
  assert.equal(p.scouts[0].investigationId, cave.id);
  assert.throws(() => w.command(p, { type: 'finding-investigate', targetId: cave.id }), /already investigating/);
  w.command(p, { type: 'finding-investigate', targetId: ruin.id });
  assert.equal(p.scouts.length, 2);
  assert.equal(new Set(p.scouts.map(s => s.investigationId)).size, 2);
  const caveScout = p.scouts.find(s => s.investigationId === cave.id);
  w.command(p, { type: 'scout-recall', targetId: caveScout.id });
  advance(w, 1);
  assert.equal(p.findings.completed.includes(cave.id), false);
  assert.equal(p.findings.rewards[cave.id], undefined);
  w.command(p, { type: 'finding-investigate', targetId: cave.id });
  advance(w, 30);
  assert.equal(p.findings.completed.includes(cave.id), true);
  assert.equal(p.findings.completed.includes(ruin.id), true);
  const caveReward = gift(p, cave.id), ruinReward = gift(p, ruin.id);
  const reloaded = World.fromSave(w.toSave());
  const q = reloaded.authenticate(sessions[0].token);
  assert.equal(reloaded.toSave().schema, 20);
  assert.deepEqual(q.findings.completed, p.findings.completed);
  assert.deepEqual(q.findings.rewards[cave.id], caveReward);
  assert.deepEqual(q.findings.rewards[ruin.id], ruinReward);
  assert.equal(q.findings.rewards[ruin.id].items['warden-echoes-10'], 1);
  const food = q.food, aether = q.aether;
  reloaded.command(q, { type: 'finding-claim', targetId: cave.id });
  reloaded.command(q, { type: 'finding-claim', targetId: ruin.id });
  assert.throws(() => reloaded.command(q, { type: 'finding-claim', targetId: cave.id }), /already been claimed/);
  assert.ok(q.food >= food); assert.equal(q.aether, aether);
  assert.equal(q.inventory['warden-echoes-10'], 1);
  const journal = fogSnapshot(reloaded, q).journal;
  assert.equal(journal.investigated, 2);
  assert.equal(journal.claimed, 2);
  assert.equal(journal.milestones.find(item => item.id === 'first-descent').reached, true);
  assert.equal(journal.milestones.find(item => item.id === 'first-ruin').reached, true);
});

test('two cities roll and claim the same cave independently', () => {
  const { w, players: [a, b] } = setup();
  const cave = findingById('whispering-cleft');
  for (const p of [a, b]) p.buildings.scoutcamp = 3;
  reveal(w, a, cave); reveal(w, b, cave);
  w.command(a, { type: 'finding-investigate', targetId: cave.id });
  w.command(b, { type: 'finding-investigate', targetId: cave.id });
  advance(w, 30);
  assert.deepEqual(a.findings.rewards[cave.id], materializeReward(a.id, cave));
  assert.deepEqual(b.findings.rewards[cave.id], materializeReward(b.id, cave));
  assert.equal(rolledExtra(a.id, cave)['ap-tonic-20'] || rolledExtra(a.id, cave)['build-minute'] || rolledExtra(a.id, cave)['stone-pack-75'], 1);
  w.command(a, { type: 'finding-claim', targetId: cave.id });
  w.command(b, { type: 'finding-claim', targetId: cave.id });
  assert.equal(a.findings.claimed.includes(cave.id) && b.findings.claimed.includes(cave.id), true);
  assert.throws(() => w.command(a, { type: 'finding-claim', targetId: cave.id }), /already been claimed/);
});

test('schema 16 exploration migrates without erasing land or inventing claims', () => {
  const { w, sessions, players: [p] } = setup(['Keeper']);
  reveal(w, p, findingById('olive-rest'));
  assert.equal(p.findings.known.includes('olive-rest'), true);
  const save = w.toSave(); save.schema = 16;
  for (const player of save.world.players) delete player.findings;
  const restored = World.fromSave(save), q = restored.authenticate(sessions[0].token);
  assert.equal(restored.toSave().schema, 20);
  assert.deepEqual(q.explored, p.explored);
  assert.equal(q.findings.known.includes('olive-rest'), true);
  assert.deepEqual(q.findings.claimed, []);
  assert.deepEqual(q.findings.completed, []);
});
