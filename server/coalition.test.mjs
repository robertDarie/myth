import { legacyMap } from './testing/legacy-save.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './testing/legacy-world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { fixtureCommand } from './testing/roster-fixture.mjs';
import { tempDirectory } from './testing/cleanup.mjs';
import { createGameServer } from './testing/legacy-services.mjs';
import { KingdomDatabase } from './testing/legacy-services.mjs';
import { initializeFortification, refreshBeacons } from './campaign.mjs';

const command = (w, p, type, extra = {}) => fixtureCommand(w, p, { type, ...extra });
const found = (w, p, name) => { command(w, p, 'alliance-create', { name }); return p.allianceId; };

function four(start = Date.UTC(2026, 0, 5, 12)) {
  let date = start;
  const w = testWorld({ now: () => date });
  const sessions = ['Ash', 'Birch', 'Cedar', 'Dale'].map(name => w.join(name));
  const [a, b, c, d] = sessions.map(session => w.authenticate(session.token));
  [a, b, c, d].forEach((p, index) => { p.cityLevel = 2; p.x = 20 + index * 1.2; p.z = 15; p.gold = p.wood = p.food = 10000; });
  found(w, a, 'Ash'); found(w, b, 'Birch'); found(w, c, 'Cedar'); found(w, d, 'Dale');
  return { w, a, b, c, d, sessions, setDate: value => { date = value; } };
}

test('four alliances keep a NAP independent from a three-alliance coalition', () => {
  const { w, a, b, c, d, sessions } = four();
  const officer = w.authenticate(w.join('Officer').token);
  command(w, officer, 'alliance-join', { targetId: a.allianceId });
  assert.throws(() => command(w, officer, 'coalition-create', { name: 'Oath' }), /leader/);
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  command(w, b, 'diplomacy-accept', { targetId: w.snapshot(b.id).diplomacy.incoming[0].id });
  assert.throws(() => command(w, a, 'attack-player', { targetId: b.id }), /non-aggression/);
  command(w, a, 'coalition-create', { name: 'Northern Oath' });
  assert.throws(() => command(w, a, 'coalition-leave'), /disbands/);
  command(w, a, 'coalition-invite', { targetId: c.allianceId });
  const invite = w.snapshot(c.id).coalition.incoming[0].id;
  command(w, a, 'attack-player', { targetId: c.id });
  assert.throws(() => command(w, c, 'coalition-accept', { targetId: invite }), /End it/);
  command(w, a, 'stop');
  assert.throws(() => command(w, d, 'coalition-accept', { targetId: invite }), /no longer open/);
  command(w, c, 'coalition-accept', { targetId: invite });
  assert.equal(w.coalitions[0].members.includes(b.allianceId), false);
  assert.throws(() => command(w, a, 'attack-player', { targetId: c.id }), /coalition pact/);
  assert.throws(() => command(w, c, 'attack-player', { targetId: a.id }), /coalition pact/);
  a.buildings.oathhall = 1; a.x = a.homeX; a.z = a.homeZ; a.target = null; a.deployed = false;
  const gate = w.sites.find(site => site.id === 'gate-east');
  gate.allianceId = c.allianceId;
  const supply = { id: 'ash-root', allianceId: a.allianceId, x: gate.x, z: gate.z };
  initializeFortification(supply); supply.isRoot = true; w.flags.push(supply); refreshBeacons(w);
  assert.throws(() => command(w, a, 'rally-create', { targetId: gate.id, count: 10 }), /coalition pact/);
  assert.equal(w.rallies.length, 0);
  command(w, a, 'chat-send', { targetId: 'coalition', name: 'Hold the ridge.' });
  assert.equal(w.snapshot(c.id).chatMessages.some(message => message.text === 'Hold the ridge.'), true);
  assert.equal(w.snapshot(d.id).chatMessages.some(message => message.text === 'Hold the ridge.'), false);
  assert.equal(w.snapshot(b.id).chatMessages.some(message => message.text === 'Hold the ridge.'), false);
  const beforeFlags = w.flags.map(flag => flag.allianceId);
  command(w, c, 'coalition-leave');
  assert.equal(w.snapshot(c.id).chatMessages.some(message => message.text === 'Hold the ridge.'), false);
  assert.equal(w.snapshot(a.id).chatMessages.some(message => message.text === 'Hold the ridge.'), true);
  let blocked = '';
  try { command(w, a, 'attack-player', { targetId: c.id }); } catch (error) { blocked = error.message; }
  assert.equal(/coalition pact|non-aggression/.test(blocked), false);
  if (a.target?.type === 'pvp') command(w, a, 'stop');
  a.x = 20; a.z = 15; b.x = 21.5; b.z = 15; a.deployed = true; b.deployed = true;
  assert.throws(() => command(w, a, 'attack-player', { targetId: b.id }), /non-aggression/);
  assert.deepEqual(w.flags.map(flag => flag.allianceId), beforeFlags);
  command(w, c, 'alliance-leave');
  assert.equal(w.coalitions.length, 1);
  assert.equal(w.diplomacy.pacts.length, 1);
  const token = sessions[0].token;
  const loaded = World.fromSave(w.toSave(), { now: () => Date.UTC(2026, 0, 5, 12) });
  const restored = loaded.authenticate(token);
  assert.equal(loaded.coalitions.length, 1);
  assert.equal(loaded.diplomacy.pacts.length, 1);
  assert.throws(() => command(loaded, restored, 'attack-player', { targetId: loaded.authenticate(sessions[1].token).id }), /non-aggression/);
  command(w, a, 'alliance-kick', { targetId: officer.id });
  command(w, a, 'alliance-leave');
  assert.equal(w.coalitions.length, 0);
  assert.equal(w.diplomacy.pacts.length, 0);
  assert.equal(w.alliances.has(b.allianceId), true);
});

test('coalition invites expire, reject a fourth member, and schema 23 keeps the pact', () => {
  const env = four();
  const { w, a, b, c, d, setDate } = env;
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  command(w, b, 'diplomacy-accept', { targetId: w.snapshot(b.id).diplomacy.incoming[0].id });
  command(w, a, 'coalition-create', { name: 'Northern Oath' });
  command(w, a, 'coalition-invite', { targetId: c.allianceId });
  const invite = w.snapshot(c.id).coalition.incoming[0].id;
  setDate(Date.UTC(2026, 0, 6, 12));
  w.tick(0.1);
  assert.throws(() => command(w, c, 'coalition-accept', { targetId: invite }), /no longer open/);
  command(w, a, 'coalition-invite', { targetId: c.allianceId });
  command(w, c, 'coalition-decline', { targetId: w.snapshot(c.id).coalition.incoming[0].id });
  command(w, a, 'coalition-invite', { targetId: c.allianceId });
  command(w, c, 'coalition-accept', { targetId: w.snapshot(c.id).coalition.incoming[0].id });
  command(w, a, 'coalition-invite', { targetId: d.allianceId });
  command(w, d, 'coalition-accept', { targetId: w.snapshot(d.id).coalition.incoming[0].id });
  const extra = w.authenticate(w.join('Elm').token);
  extra.gold = 1000;
  command(w, extra, 'alliance-create', { name: 'Elm' });
  assert.throws(() => command(w, a, 'coalition-invite', { targetId: extra.allianceId }), /three alliances/);
  const saved = structuredClone(w.toSave());
  legacyMap(saved);saved.schema = 23;
  delete saved.world.coalitions;
  delete saved.world.coalitionInvites;
  const migrated = World.fromSave(saved, { now: () => Date.UTC(2026, 0, 6, 12) });
  assert.equal(migrated.toSave().schema, 27);
  assert.equal(migrated.coalitions.length, 0);
  assert.equal(migrated.diplomacy.pacts.length, 1);
  assert.equal(migrated.alliances.size, w.alliances.size);
  const broken = w.toSave();
  broken.world.coalitions[0].members.push(broken.world.coalitions[0].members[0]);
  assert.throws(() => World.fromSave(broken), /coalition/);
});

test('two coalition answers admit the alliance once', async t => {
  const bin = tempDirectory(t, 'tom-coalition-');
  const db = new KingdomDatabase(bin.path('world.sqlite'), { now: () => Date.UTC(2026, 0, 5, 12) });
  const app = createGameServer({ store: db });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  bin.server(app.server);
  const w = app.world;
  const ash = w.join('Ash'), cedar = w.join('Cedar');
  const a = w.authenticate(ash.token), c = w.authenticate(cedar.token);
  command(w, a, 'alliance-create', { name: 'Ash' });
  command(w, c, 'alliance-create', { name: 'Cedar' });
  command(w, a, 'coalition-create', { name: 'Northern Oath' });
  command(w, a, 'coalition-invite', { targetId: c.allianceId });
  const invite = w.snapshot(c.id).coalition.incoming[0].id;
  const url = `http://127.0.0.1:${app.server.address().port}/command`;
  const body = JSON.stringify({ type: 'coalition-accept', targetId: invite });
  const headers = { Authorization: 'Bearer ' + cedar.token, 'Content-Type': 'application/json' };
  const [first, second] = await Promise.all([
    fetch(url, { method: 'POST', headers, body }),
    fetch(url, { method: 'POST', headers, body })
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 400]);
  assert.deepEqual(w.coalitions[0].members, [a.allianceId, c.allianceId]);
});
