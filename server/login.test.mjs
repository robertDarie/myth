import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { activitySnapshot, recordActivity, LOGIN_REWARDS } from './activity.mjs';
import { tempDirectory } from './testing/cleanup.mjs';
import { createGameServer } from './http.mjs';

const DAY = 86400000;
const setup = (start = Date.UTC(2026, 0, 1, 12)) => {
  let date = start;
  const w = testWorld({ now: () => date });
  const s = w.join('A');
  const p = w.authenticate(s.token);
  return { w, p, s, setDate: value => { date = value; }, getDate: () => date };
};
const claim = (w, p, day) => w.command(p, { type: 'login-claim', day });
const resources = p => Object.fromEntries(['food', 'wood', 'stone', 'gold', 'mana', 'aether'].map(key => [key, p[key]]));
const gained = (before, after) => Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]]));

test('a new city can claim day 1 once, and a snapshot does not pay it', () => {
  const { w, p } = setup();
  const before = resources(p);
  const view = activitySnapshot(w, p);
  assert.equal(view.login.eligibleDay, 1);
  assert.equal(view.login.canClaim, true);
  assert.equal(view.login.streak, 0);
  assert.deepEqual(resources(p), before);
  claim(w, p, 1);
  assert.deepEqual(gained(before, resources(p)), { food: 100, wood: 100, stone: 0, gold: 0, mana: 0, aether: 0 });
  const paid = resources(p);
  assert.throws(() => claim(w, p, 1), /not available/);
  assert.deepEqual(resources(p), paid);
  assert.equal(activitySnapshot(w, p).login.canClaim, false);
  assert.equal(activitySnapshot(w, p).login.streak, 1);
  assert.equal(activitySnapshot(w, p).login.days[0].claimed, true);
});

test('seven consecutive UTC days pay the schedule and then start again at day 1', () => {
  const env = setup();
  const { w, p } = env;
  const before = resources(p);
  for (let index = 0; index < 7; index++) {
    const view = activitySnapshot(w, p);
    assert.equal(view.login.eligibleDay, index + 1);
    claim(w, p, index + 1);
    env.setDate(env.getDate() + DAY);
  }
  const expected = { food: 0, wood: 0, stone: 0, gold: 0, mana: 0, aether: 0 };
  for (const entry of LOGIN_REWARDS) for (const [key, amount] of Object.entries(entry.reward)) expected[key] += amount;
  assert.deepEqual(gained(before, resources(p)), expected);
  const cycle = activitySnapshot(w, p).login;
  assert.equal(cycle.eligibleDay, 1);
  assert.equal(cycle.streak, 0);
  assert.equal(cycle.canClaim, true);
  const restart = resources(p);
  claim(w, p, 1);
  assert.equal(p.food - restart.food, 100);
  assert.equal(p.wood - restart.wood, 100);
});

test('a missed UTC day resets to day 1 and midnight opens the next reward', () => {
  const env = setup(Date.UTC(2026, 0, 1, 23, 59, 59));
  const { w, p } = env;
  claim(w, p, 1);
  assert.throws(() => claim(w, p, 1), /not available/);
  env.setDate(Date.UTC(2026, 0, 2, 0, 0, 0));
  assert.equal(activitySnapshot(w, p).login.eligibleDay, 2);
  const before = resources(p);
  claim(w, p, 2);
  assert.deepEqual(gained(before, resources(p)), { food: 0, wood: 0, stone: 100, gold: 100, mana: 0, aether: 0 });
  env.setDate(Date.UTC(2026, 0, 4, 0, 0, 1));
  const missed = activitySnapshot(w, p).login;
  assert.equal(missed.missed, true);
  assert.equal(missed.eligibleDay, 1);
  assert.equal(missed.streak, 0);
  assert.throws(() => claim(w, p, 3), /not available/);
  const reset = resources(p);
  claim(w, p, 1);
  assert.equal(p.food - reset.food, 100);
  assert.equal(p.stone, reset.stone);
});

test('clock rollback, restart and a client-supplied time cannot reopen or skip a claim', () => {
  const env = setup(Date.UTC(2026, 0, 10, 12));
  const { w, p, s } = env;
  claim(w, p, 1);
  const paid = resources(p);
  env.setDate(Date.UTC(2026, 0, 1, 12));
  assert.equal(activitySnapshot(w, p).login.canClaim, false);
  assert.throws(() => claim(w, p, 1), /not available/);
  assert.throws(() => w.command(p, { type: 'login-claim', day: 7, now: Date.UTC(2099, 0, 1) }), /not available/);
  assert.deepEqual(resources(p), paid);
  const loaded = World.fromSave(w.toSave(), { now: () => Date.UTC(2026, 0, 1, 12) });
  const q = loaded.authenticate(s.token);
  assert.equal(activitySnapshot(loaded, q).login.streak, 1);
  assert.throws(() => claim(loaded, q, 1), /not available/);
  assert.deepEqual(resources(q), paid);
});

test('two claims at once pay once, and a wrong day pays nothing', async t => {
  const bin = tempDirectory(t, 'tom-login-');
  const app = createGameServer({ databasePath: bin.path('world.sqlite') });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  bin.server(app.server);
  const session = app.world.join('Login');
  const p = app.world.authenticate(session.token);
  const before = p.food;
  const url = `http://127.0.0.1:${app.server.address().port}/command`;
  const body = JSON.stringify({ type: 'login-claim', day: 1 });
  const headers = { Authorization: 'Bearer ' + session.token, 'Content-Type': 'application/json' };
  const [first, second] = await Promise.all([
    fetch(url, { method: 'POST', headers, body }),
    fetch(url, { method: 'POST', headers, body })
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 400]);
  assert.equal(p.food, before + 100);
  const replay = app.world.join('Replay');
  const replayPlayer = app.world.authenticate(replay.token);
  const replayFood = replayPlayer.food;
  const replayHeaders = { Authorization: 'Bearer ' + replay.token, 'Content-Type': 'application/json', 'Idempotency-Key': 'login-day-one' };
  assert.equal((await fetch(url, { method: 'POST', headers: replayHeaders, body })).status, 200);
  assert.equal((await fetch(url, { method: 'POST', headers: replayHeaders, body })).status, 200);
  assert.equal(replayPlayer.food, replayFood + 100);
  assert.equal((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ type: 'login-claim', day: 4 }) })).status, 400);
  assert.equal(p.food, before + 100);
});

test('schemas 19 and 20 gain a fresh streak without changing progress, and bad streaks are rejected', () => {
  const { w, p, s } = setup();
  p.food = 40; p.wood = 41; p.gold = 42; p.troops = 20;
  recordActivity(w, p, 'gather', 200);
  w.command(p, { type: 'daily-claim', targetId: 'gather', period: activitySnapshot(w, p).daily.period });
  const claimed = [...p.daily.claimed];
  const food = p.food, wood = p.wood, gold = p.gold;
  for (const schema of [19, 20]) {
    const old = structuredClone(w.toSave());
    old.schema = schema;
    delete old.world.players[0].loginStreak;
    const loaded = World.fromSave(old, { now: () => Date.UTC(2026, 0, 1, 12) });
    const q = loaded.authenticate(s.token);
    assert.equal(loaded.toSave().schema, 21);
    assert.equal(q.food, food);
    assert.equal(q.wood, wood);
    assert.equal(q.gold, gold);
    assert.equal(q.troops, 20);
    assert.deepEqual(q.daily.claimed, claimed);
    assert.equal(activitySnapshot(loaded, q).login.eligibleDay, 1);
    assert.equal(activitySnapshot(loaded, q).login.canClaim, true);
    assert.equal(activitySnapshot(loaded, q).daily.points, 20);
  }
  for (const streak of [null, { lastClaimDay: -1, claimedDay: 3 }, { lastClaimDay: 500000, claimedDay: 1 }, { lastClaimDay: 0, claimedDay: 8 }]) {
    const bad = structuredClone(w.toSave());
    bad.world.players[0].loginStreak = streak;
    assert.throws(() => World.fromSave(bad, { now: () => Date.UTC(2026, 0, 1, 12) }), /claims/);
  }
});

test('login rewards do not change daily or weekly claims, and another city cannot collect them', async () => {
  const { w, p } = setup();
  recordActivity(w, p, 'gather', 200);
  w.command(p, { type: 'daily-claim', targetId: 'gather', period: activitySnapshot(w, p).daily.period });
  const points = activitySnapshot(w, p).daily.points;
  const weekly = [...p.weeklyClaims.claimed];
  claim(w, p, 1);
  assert.equal(activitySnapshot(w, p).daily.points, points);
  assert.deepEqual(p.daily.claimed, ['gather']);
  assert.deepEqual(p.weeklyClaims.claimed, weekly);
  const app = createGameServer();
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const founder = await (await fetch(base + '/join', { method: 'POST', body: JSON.stringify({ name: 'Founder' }) })).json();
  const outsider = await (await fetch(base + '/join', { method: 'POST', body: JSON.stringify({ name: 'Outsider' }) })).json();
  const founderPlayer = app.world.authenticate(founder.token);
  const food = founderPlayer.food;
  await fetch(base + '/command', { method: 'POST', headers: { Authorization: 'Bearer ' + outsider.token }, body: JSON.stringify({ type: 'login-claim', day: 1, playerId: founderPlayer.id }) });
  assert.equal(founderPlayer.food, food);
  const seen = await (await fetch(base + '/world', { headers: { Authorization: 'Bearer ' + outsider.token } })).json();
  assert.equal(seen.players.find(city => city.id === founderPlayer.id).loginStreak, undefined);
  assert.equal(seen.players.find(city => city.id === founderPlayer.id).daily, undefined);
  assert.equal(seen.activity.login.eligibleDay, 1);
  app.server.close();
});
