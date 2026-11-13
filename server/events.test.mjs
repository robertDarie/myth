import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { activitySnapshot } from './activity.mjs';
import { eventSnapshot, eventWindow } from './events.mjs';
import { cellIndex } from './exploration.mjs';
import { tempDirectory } from './testing/cleanup.mjs';
import { createGameServer } from './http.mjs';
import { KingdomDatabase } from './database.mjs';

const DAY = 86400000;
const monday = Date.UTC(2026, 0, 5);
const thursday = Date.UTC(2026, 0, 1);
const advance = (w, seconds) => { for (let i = 0; i < Math.round(seconds * 10); i++) w.tick(0.1); };
const setup = (start = monday) => {
  let date = start;
  const w = testWorld({ now: () => date });
  const s = w.join('A');
  const p = w.authenticate(s.token);
  p.wood = p.food = p.stone = p.gold = 100000;
  return { w, p, s, setDate: value => { date = value; } };
};
const resources = p => Object.fromEntries(['food', 'wood', 'stone', 'gold', 'mana', 'aether'].map(key => [key, p[key]]));
const card = (w, p, id) => eventSnapshot(w, p).find(event => event.id === id);
const progress = (w, p, id, objective) => card(w, p, id).objectives.find(item => item.id === objective).progress;
const prepareAcademy = p => { p.cityLevel = 3; p.buildings.oracle = 1; p.buildings.academy = 3; };
const finishResearch = (w, p, id) => {
  w.command(p, { type: 'research', targetId: id });
  advance(w, p.research.duration + 0.2);
};
const finishBuilding = (w, p, id) => {
  w.command(p, { type: 'building-upgrade', targetId: id });
  const job = p.construction?.targetId === id ? p.construction : p.secondConstruction;
  advance(w, job.duration + 0.2);
};
const unexplored = (w, p) => {
  let best = null, distance = Infinity;
  for (let x = 4; x <= 76; x += 4) for (let z = 4; z <= 76; z += 4) {
    const away = Math.hypot(x - p.homeX, z - p.homeZ);
    if (away < distance && !p.explored.includes(cellIndex({ x, z })) && w.canEnter(p, { x, z })) { best = { x, z }; distance = away; }
  }
  return best;
};

test('Monday and Thursday UTC boundaries switch the two events', () => {
  assert.equal(new Date(monday).getUTCDay(), 1);
  assert.equal(new Date(thursday).getUTCDay(), 4);
  const mondayIndex = Math.floor(monday / DAY);
  const thursdayIndex = Math.floor(thursday / DAY);
  assert.equal(eventWindow('oath-of-the-builders', mondayIndex).active, true);
  assert.equal(eventWindow('frontier-vigil', mondayIndex).active, false);
  assert.equal(eventWindow('frontier-vigil', thursdayIndex).active, true);
  assert.equal(eventWindow('oath-of-the-builders', thursdayIndex).active, false);
  assert.equal(eventWindow('oath-of-the-builders', thursdayIndex - 1).active, true);
  assert.equal(eventWindow('frontier-vigil', mondayIndex - 1).active, true);
  const { w, p, setDate } = setup(monday);
  assert.equal(card(w, p, 'oath-of-the-builders').status, 'active');
  assert.equal(card(w, p, 'frontier-vigil').status, 'upcoming');
  assert.match(card(w, p, 'frontier-vigil').lockedReason, /closed until/);
  setDate(thursday + 7 * DAY);
  const next = eventSnapshot(w, p);
  assert.equal(next.find(event => event.id === 'frontier-vigil').status, 'active');
  assert.equal(next.find(event => event.id === 'oath-of-the-builders').status, 'upcoming');
  assert.ok(next.every(event => event.reward.aether === undefined));
});

test('only finished building and research count, and the reward pays once', () => {
  const { w, p } = setup(monday);
  const before = resources(p);
  w.command(p, { type: 'building-upgrade', targetId: 'quarry' });
  assert.equal(progress(w, p, 'oath-of-the-builders', 'development'), 0);
  w.command(p, { type: 'cancel-job', targetId: p.construction.id });
  assert.equal(progress(w, p, 'oath-of-the-builders', 'development'), 0);
  prepareAcademy(p);
  w.command(p, { type: 'research', targetId: 'harvest' });
  w.command(p, { type: 'cancel-job', targetId: p.research.id });
  assert.equal(progress(w, p, 'oath-of-the-builders', 'development'), 0);
  finishResearch(w, p, 'harvest');
  finishBuilding(w, p, 'quarry');
  assert.equal(progress(w, p, 'oath-of-the-builders', 'development'), 2);
  assert.equal(card(w, p, 'oath-of-the-builders').canClaim, true);
  const daily = p.daily.claimed.length;
  const streak = p.loginStreak.claimedDay;
  const paidFrom = resources(p);
  w.command(p, { type: 'event-claim', targetId: 'oath-of-the-builders', period: card(w, p, 'oath-of-the-builders').period });
  assert.equal(p.wood - paidFrom.wood, 200);
  assert.equal(p.stone - paidFrom.stone, 150);
  assert.equal(p.gold - paidFrom.gold, 100);
  assert.equal(p.mana, paidFrom.mana);
  assert.equal(p.aether, paidFrom.aether);
  assert.equal(p.daily.claimed.length, daily);
  assert.equal(p.loginStreak.claimedDay, streak);
  assert.throws(() => w.command(p, { type: 'event-claim', targetId: 'oath-of-the-builders', period: card(w, p, 'oath-of-the-builders').period }), /already claimed/);
  assert.equal(p.wood - paidFrom.wood, 200);
  assert.equal(p.food, paidFrom.food);
});

test('surveys and a camp victory count only when finished, and only inside Frontier Vigil', () => {
  const { w, p } = setup(thursday);
  const first = unexplored(w, p);
  w.command(p, { type: 'scout-send', x: first.x, z: first.z });
  w.command(p, { type: 'scout-recall', targetId: p.scouts[0].id });
  advance(w, 30);
  assert.equal(progress(w, p, 'frontier-vigil', 'scouts'), 0);
  const second = unexplored(w, p);
  w.command(p, { type: 'scout-send', x: second.x, z: second.z });
  advance(w, 80);
  const third = unexplored(w, p);
  w.command(p, { type: 'scout-send', x: third.x, z: third.z });
  advance(w, 80);
  assert.equal(progress(w, p, 'frontier-vigil', 'scouts'), 2);
  const camp = w.camps[0];
  p.x = camp.x; p.z = camp.z;
  camp.health = 5000;
  w.command(p, { type: 'attack', targetId: camp.id });
  advance(w, 1);
  assert.ok(camp.health > 0);
  assert.equal(progress(w, p, 'frontier-vigil', 'camps'), 0);
  camp.health = 1;
  advance(w, 20);
  assert.equal(camp.health, 0);
  assert.equal(progress(w, p, 'frontier-vigil', 'camps'), 1);
  const gold = p.gold;
  advance(w, 20);
  assert.equal(progress(w, p, 'frontier-vigil', 'camps'), 1);
  assert.equal(p.gold, gold);
  const before = resources(p);
  assert.equal(card(w, p, 'frontier-vigil').canClaim, true);
  w.command(p, { type: 'event-claim', targetId: 'frontier-vigil', period: card(w, p, 'frontier-vigil').period, progress: 99 });
  assert.equal(p.food - before.food, 200);
  assert.equal(p.gold - before.gold, 150);
  assert.equal(p.mana - before.mana, 10);
  assert.equal(progress(w, p, 'oath-of-the-builders', 'development'), 0);
});

test('a missed period, a later period, and a rolled-back clock do not replay the reward', () => {
  const env = setup(monday);
  const { w, p, s, setDate } = env;
  prepareAcademy(p);
  finishResearch(w, p, 'harvest');
  finishResearch(w, p, 'logistics');
  const period = card(w, p, 'oath-of-the-builders').period;
  setDate(thursday + 7 * DAY);
  assert.equal(card(w, p, 'oath-of-the-builders').canClaim, false);
  assert.throws(() => w.command(p, { type: 'event-claim', targetId: 'oath-of-the-builders', period }), /not open/);
  const missed = resources(p);
  setDate(monday + 7 * DAY);
  assert.equal(progress(w, p, 'oath-of-the-builders', 'development'), 0);
  finishResearch(w, p, 'harvest');
  finishResearch(w, p, 'logistics');
  w.command(p, { type: 'event-claim', targetId: 'oath-of-the-builders', period: card(w, p, 'oath-of-the-builders').period });
  assert.throws(() => w.command(p, { type: 'event-claim', targetId: 'oath-of-the-builders', period }), /expired|already claimed/);
  const paid = resources(p);
  setDate(monday);
  assert.equal(card(w, p, 'oath-of-the-builders').claimed, true);
  assert.throws(() => w.command(p, { type: 'event-claim', targetId: 'oath-of-the-builders', period: card(w, p, 'oath-of-the-builders').period }), /already claimed/);
  assert.deepEqual(resources(p), paid);
  const later = World.fromSave(w.toSave(), { now: () => monday + 11 * DAY });
  const laterPlayer = later.authenticate(s.token);
  assert.equal(progress(later, laterPlayer, 'oath-of-the-builders', 'development'), 0);
  assert.equal(laterPlayer.food, paid.food);
  const loaded = World.fromSave(w.toSave(), { now: () => monday });
  const q = loaded.authenticate(s.token);
  assert.equal(card(loaded, q, 'oath-of-the-builders').claimed, true);
  assert.throws(() => loaded.command(q, { type: 'event-claim', targetId: 'oath-of-the-builders', period: card(loaded, q, 'oath-of-the-builders').period }), /already claimed/);
  assert.deepEqual(resources(q), paid);
  assert.ok(paid.wood > missed.wood);
});

test('schema 21 and 18 gain a fresh event record without changing the city', () => {
  const { w, p, s } = setup(monday);
  finishBuilding(w, p, 'quarry');
  p.technologies.drill = 1;
  const food = p.food, wood = p.wood, troops = p.troops, streak = p.loginStreak.claimedDay;
  for (const schema of [21, 18]) {
    const old = structuredClone(w.toSave());
    old.schema = schema;
    delete old.world.players[0].events;
    const loaded = World.fromSave(old, { now: () => monday });
    const q = loaded.authenticate(s.token);
    assert.equal(loaded.toSave().schema, 24);
    assert.equal(q.food, food);
    assert.equal(q.wood, wood);
    assert.equal(q.troops, troops);
    assert.equal(q.technologies.drill, 1);
    assert.equal(q.loginStreak.claimedDay, streak);
    assert.equal(progress(loaded, q, 'oath-of-the-builders', 'development'), 0);
    assert.equal(q.daily.claimed.length, 0);
  }
  const broken = w.toSave();
  broken.world.players[0].events['oath-of-the-builders'].progress.development = 9;
  assert.throws(() => World.fromSave(broken), /event progress/);
  const skipped = w.toSave();
  skipped.world.players[0].events['frontier-vigil'].claimed = true;
  assert.throws(() => World.fromSave(skipped), /event progress/);
});

test('two claims at once pay once, and another city cannot read or collect the reward', async t => {
  const bin = tempDirectory(t, 'tom-events-');
  let date = monday + 60 * 60 * 1000;
  const db = new KingdomDatabase(bin.path('world.sqlite'), { now: () => date });
  const app = createGameServer({ store: db });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  bin.server(app.server);
  const session = app.world.join('Builder');
  const p = app.world.authenticate(session.token);
  p.wood = p.food = p.stone = p.gold = 100000;
  prepareAcademy(p);
  finishResearch(app.world, p, 'harvest');
  finishResearch(app.world, p, 'logistics');
  const other = app.world.join('Neighbor');
  const neighbor = app.world.authenticate(other.token);
  const url = `http://127.0.0.1:${app.server.address().port}`;
  const period = card(app.world, p, 'oath-of-the-builders').period;
  const body = JSON.stringify({ type: 'event-claim', targetId: 'oath-of-the-builders', period });
  const headers = { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' };
  const before = p.wood;
  const neighborWood = neighbor.wood;
  const [first, second] = await Promise.all([
    fetch(url + '/command', { method: 'POST', headers, body }),
    fetch(url + '/command', { method: 'POST', headers, body })
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 400]);
  assert.equal(p.wood, before + 200);
  const replaySession = app.world.join('Replay');
  const replayPlayer = app.world.authenticate(replaySession.token);
  replayPlayer.wood = replayPlayer.food = replayPlayer.stone = replayPlayer.gold = 100000;
  prepareAcademy(replayPlayer);
  finishResearch(app.world, replayPlayer, 'harvest');
  finishResearch(app.world, replayPlayer, 'logistics');
  const replayWood = replayPlayer.wood;
  const replayHeaders = { Authorization: 'Bearer ' + replaySession.token, 'Content-Type': 'application/json', 'Idempotency-Key': 'builders-once' };
  assert.equal((await fetch(url + '/command', { method: 'POST', headers: replayHeaders, body })).status, 200);
  assert.equal((await fetch(url + '/command', { method: 'POST', headers: replayHeaders, body })).status, 200);
  assert.equal(replayPlayer.wood, replayWood + 200);
  assert.equal(p.wood, before + 200);
  const hidden = await (await fetch(url + '/world', { headers: { Authorization: 'Bearer ' + other.token } })).json();
  assert.equal(hidden.players.find(player => player.id === p.id).events, undefined);
  assert.equal(hidden.activity.events.find(event => event.id === 'oath-of-the-builders').objectives[0].progress, 0);
  assert.equal((await fetch(url + '/command', { method: 'POST', headers: { Authorization: 'Bearer ' + other.token, 'Content-Type': 'application/json' }, body })).status, 400);
  assert.equal(neighbor.wood, neighborWood);
  assert.equal(activitySnapshot(app.world, p).daily.points, 0);
});
