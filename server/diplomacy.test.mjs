import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { fixtureCommand } from './testing/roster-fixture.mjs';
import { initializeFortification, refreshBeacons } from './campaign.mjs';
import { tempDirectory } from './testing/cleanup.mjs';
import { createGameServer } from './http.mjs';
import { KingdomDatabase } from './database.mjs';

const DAY = 86400000;
const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds * 10); i++) w.tick(0.1); };
const command = (w, p, type, extra = {}) => fixtureCommand(w, p, { type, ...extra });
const view = (w, p) => w.snapshot(p.id).diplomacy;
const found = (w, p, name) => { command(w, p, 'alliance-create', { name }); return p.allianceId; };

function realm(start = Date.UTC(2026, 0, 5, 12)) {
  let date = start;
  const w = testWorld({ now: () => date });
  const sessions = ['Dawn', 'Dusk', 'Storm', 'Officer'].map(name => w.join(name));
  const [a, b, c, officer] = sessions.map(session => w.authenticate(session.token));
  for (const p of [a, b, c, officer]) { p.cityLevel = 2; p.buildings.oathhall = 1; p.gold = p.wood = p.food = p.stone = 10000; }
  a.x = 20; a.z = 15; b.x = 21.5; b.z = 15; c.x = 24; c.z = 15;
  found(w, a, 'Dawn'); found(w, b, 'Dusk'); found(w, c, 'Storm');
  command(w, officer, 'alliance-join', { targetId: a.allianceId });
  command(w, a, 'alliance-promote', { targetId: officer.id });
  return { w, a, b, c, officer, setDate: value => { date = value; } };
}

test('leaders propose, decline, withdraw and accept one bilateral pact', () => {
  const { w, a, b, c, officer } = realm();
  const gold = a.gold;
  assert.throws(() => command(w, officer, 'diplomacy-propose', { targetId: b.allianceId }), /leader/);
  assert.throws(() => command(w, a, 'diplomacy-propose', { targetId: a.allianceId }), /another/);
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  assert.throws(() => command(w, a, 'diplomacy-propose', { targetId: b.allianceId }), /already waiting/);
  const offer = view(w, b).incoming[0];
  assert.equal(view(w, a).outgoing[0].allianceId, b.allianceId);
  assert.equal(view(w, c).incoming.length, 0);
  assert.equal(JSON.stringify(w.snapshot(c.id).diplomacy).includes(offer.id), false);
  assert.throws(() => command(w, c, 'diplomacy-accept', { targetId: offer.id }), /invited/);
  command(w, b, 'diplomacy-decline', { targetId: offer.id });
  assert.equal(w.diplomacy.pacts.length, 0);
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  command(w, a, 'diplomacy-withdraw', { targetId: view(w, a).outgoing[0].id });
  assert.equal(w.diplomacy.proposals.length, 0);
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  command(w, b, 'diplomacy-accept', { targetId: view(w, b).incoming[0].id });
  assert.equal(w.diplomacy.pacts.length, 1);
  assert.equal(view(w, a).alliances.find(item => item.id === b.allianceId).relationship, 'pact');
  assert.equal(view(w, b).alliances.find(item => item.id === a.allianceId).relationship, 'pact');
  assert.equal(view(w, c).alliances.find(item => item.id === a.allianceId).relationship, 'neutral');
  assert.equal(a.gold, gold);
  assert.throws(() => command(w, b, 'diplomacy-accept', { targetId: 'again' }), /no longer open/);
});

test('an active pact blocks field attacks, rallies and site sieges, and an open battle blocks the pact', () => {
  const { w, a, b, c } = realm();
  command(w, a, 'attack-player', { targetId: b.id });
  assert.equal(a.target.type, 'pvp');
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  assert.throws(() => command(w, b, 'diplomacy-accept', { targetId: view(w, b).incoming[0].id }), /ordered against/);
  assert.equal(a.troops, a.troops);
  command(w, a, 'stop');
  command(w, b, 'diplomacy-accept', { targetId: view(w, b).incoming[0].id });
  assert.throws(() => command(w, a, 'attack-player', { targetId: b.id }), /non-aggression/);
  assert.throws(() => command(w, b, 'attack-player', { targetId: a.id }), /non-aggression/);
  assert.equal(a.target, null);
  command(w, c, 'attack-player', { targetId: a.id });
  assert.equal(c.target.type, 'pvp');
  command(w, c, 'stop');
  a.x = a.homeX; a.z = a.homeZ; a.target = null; a.deployed = false;
  const gate = w.sites.find(site => site.id === 'gate-east');
  gate.allianceId = b.allianceId;
  const supply = { id: 'dawn-root', allianceId: a.allianceId, x: gate.x, z: gate.z };
  initializeFortification(supply); supply.isRoot = true; w.flags.push(supply); refreshBeacons(w);
  assert.throws(() => command(w, a, 'rally-create', { targetId: gate.id, count: 10 }), /non-aggression/);
  const fort = { id: 'dusk-fort', allianceId: b.allianceId, x: gate.x, z: gate.z + 2 };
  initializeFortification(fort); fort.isRoot = true; w.flags.push(fort); refreshBeacons(w);
  assert.throws(() => command(w, a, 'rally-create', { targetId: fort.id, count: 10 }), /non-aggression/);
  assert.equal(w.rallies.length, 0);
  command(w, a, 'diplomacy-terminate', { targetId: w.diplomacy.pacts[0].id });
  command(w, a, 'rally-create', { targetId: gate.id, count: 10 });
  assert.equal(w.rallies.length, 1);
  command(w, b, 'diplomacy-propose', { targetId: a.allianceId });
  assert.throws(() => command(w, a, 'diplomacy-accept', { targetId: view(w, a).incoming[0].id }), /rally/);
  assert.equal(a.troops + b.troops > 0, true);
  command(w, a, 'return');
  assert.equal(w.rallies.length, 0);
});

test('proposals expire, disbanding clears treaties, and schema 22 loads an empty book', () => {
  const env = realm();
  const { w, a, b, setDate } = env;
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  const id = view(w, b).incoming[0].id;
  setDate(Date.UTC(2026, 0, 6, 12));
  advance(w, 0.1);
  assert.equal(w.diplomacy.proposals.length, 0);
  assert.throws(() => command(w, b, 'diplomacy-accept', { targetId: id }), /no longer open/);
  command(w, a, 'diplomacy-propose', { targetId: b.allianceId });
  command(w, b, 'diplomacy-accept', { targetId: view(w, b).incoming[0].id });
  const token = [...w.sessions.entries()].find(([, id]) => id === a.id)[0];
  const old = structuredClone(w.toSave());
  old.schema = 22;
  delete old.world.diplomacy;
  const migrated = World.fromSave(old, { now: () => Date.UTC(2026, 0, 6, 12) });
  const q = migrated.authenticate(token);
  assert.equal(migrated.toSave().schema, 23);
  assert.equal(migrated.diplomacy.pacts.length, 0);
  assert.equal(migrated.alliances.size, 3);
  assert.equal(q.gold, a.gold);
  command(w, a, 'alliance-kick', { targetId: env.officer.id });
  command(w, a, 'alliance-leave');
  assert.equal(w.diplomacy.pacts.length, 0);
  assert.equal(w.alliances.has(a.allianceId), false);
  const broken = w.toSave();
  broken.world.diplomacy.pacts.push({ id: 'bad', low: b.allianceId, high: b.allianceId, since: 1 });
  assert.throws(() => World.fromSave(broken), /diplomacy/);
});

test('two answers pay one pact, and a fifth outgoing proposal is refused', async t => {
  const bin = tempDirectory(t, 'tom-diplomacy-');
  const db = new KingdomDatabase(bin.path('world.sqlite'), { now: () => Date.UTC(2026, 0, 5, 12) });
  const app = createGameServer({ store: db });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  bin.server(app.server);
  const { w } = { w: app.world };
  const sessionA = w.join('Alpha');
  const sessionB = w.join('Beta');
  const a = w.authenticate(sessionA.token), b = w.authenticate(sessionB.token);
  command(w, a, 'alliance-create', { name: 'Alpha' });
  command(w, b, 'alliance-create', { name: 'Beta' });
  for (const name of ['One', 'Two', 'Three', 'Four']) {
    const extra = w.authenticate(w.join(name).token);
    command(w, extra, 'alliance-create', { name });
    command(w, a, 'diplomacy-propose', { targetId: extra.allianceId });
  }
  const fifth = w.authenticate(w.join('Five').token);
  command(w, fifth, 'alliance-create', { name: 'Five' });
  assert.throws(() => command(w, a, 'diplomacy-propose', { targetId: fifth.allianceId }), /four pending/);
  command(w, b, 'diplomacy-propose', { targetId: a.allianceId });
  const offer = view(w, a).incoming[0].id;
  const url = `http://127.0.0.1:${app.server.address().port}/command`;
  const body = JSON.stringify({ type: 'diplomacy-accept', targetId: offer });
  const headers = { Authorization: 'Bearer ' + sessionA.token, 'Content-Type': 'application/json' };
  const [first, second] = await Promise.all([
    fetch(url, { method: 'POST', headers, body }),
    fetch(url, { method: 'POST', headers, body })
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 400]);
  assert.equal(w.diplomacy.pacts.length, 1);
  const loaded = World.fromSave(w.toSave(), { now: () => Date.UTC(2026, 0, 5, 12) });
  assert.equal(loaded.diplomacy.pacts.length, 1);
  assert.equal(loaded.diplomacy.proposals.length, 4);
});
