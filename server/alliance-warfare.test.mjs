import test from 'node:test';
import assert from 'node:assert/strict';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { fixtureCommand } from './testing/roster-fixture.mjs';
import { route, reachableRegions } from './navigation.mjs';
import { initializeFortification, refreshBeacons } from './campaign.mjs';
import { wardTroops } from './war.mjs';
import { LIMITS } from './world-map.mjs';
import { World } from './testing/legacy-world.mjs';
import { readFileSync } from 'node:fs';

const advance = (w, s) => { for (let i = 0; i < Math.ceil(s * 10); i++) w.tick(0.1); };
const until = (w, predicate, seconds = 120) => { for (let i = 0; i < seconds * 10 && !predicate(); i++) w.tick(0.1); assert.ok(predicate(), 'Timed out waiting for alliance warfare.'); };
const cmd = (w, p, type, targetId = '', extra = {}) => fixtureCommand(w, p, { type, targetId, ...extra });
const census = p => p.troops + p.marches.reduce((n, a) => n + a.troops, 0) + p.reserveTroops + wardTroops(p);
const expected = JSON.parse(readFileSync(new URL('../research/parity/fixtures/alliance-invitations.json', import.meta.url), 'utf8'));

function halls() {
  const w = testWorld();
  const sessions = ['Dawn', 'Ally', 'Dusk', 'Guard', 'Outsider'].map(name => w.join(name));
  const [a, b, c, d, e] = sessions.map(s => w.authenticate(s.token));
  for (const p of [a, b, c, d, e]) { p.buildings.oathhall = 1; p.gold = p.wood = p.food = p.stone = 10000; }
  cmd(w, a, 'alliance-create', '', { name: 'Dawn' });
  cmd(w, c, 'alliance-create', '', { name: 'Dusk' });
  return { w, a, b, c, d, e, sessions };
}

test('creation, invitation, permissions, transfer, help and disbandment keep membership authoritative', () => {
  const { w, a, b, c, d, e } = halls();
  assert.throws(() => cmd(w, e, 'alliance-invite', b.id), /officers|alliance/);
  cmd(w, a, 'alliance-invite', b.id);
  const invite = w.snapshot(b.id).incoming.find(item => item.allianceId === a.allianceId);
  assert.equal(invite.allianceName, 'Dawn');
  assert.equal(w.snapshot(e.id).incoming.length, 0);
  assert.equal(w.snapshot(a.id).outgoing.length, 1);
  assert.throws(() => cmd(w, b, 'alliance-revoke-invite', invite.id), /officers|alliance/);
  cmd(w, a, 'alliance-revoke-invite', invite.id);
  assert.equal(w.snapshot(b.id).incoming.length, 0);
  cmd(w, a, 'alliance-invite', b.id);
  cmd(w, b, 'alliance-join', a.allianceId);
  assert.equal(b.allianceId, a.allianceId);
  assert.equal(w.alliances.get(a.allianceId).invites.length, 0);
  cmd(w, a, 'alliance-promote', b.id);
  assert.throws(() => cmd(w, b, 'alliance-transfer', a.id), /leader/);
  cmd(w, a, 'alliance-transfer', b.id);
  assert.equal(w.alliances.get(a.allianceId).leaderId, b.id);
  cmd(w, b, 'alliance-transfer', a.id);
  a.wood = a.stone = 1000;
  cmd(w, a, 'upgrade');
  const before = a.construction.remaining;
  cmd(w, b, 'alliance-help', a.construction.id);
  assert.ok(a.construction.remaining < before);
  assert.throws(() => cmd(w, b, 'alliance-help', a.construction.id), /already/);
  assert.ok(w.snapshot(a.id).allianceRoster.find(member => member.id === b.id).helps >= 1);
  cmd(w, e, 'alliance-join', a.allianceId);
  assert.throws(() => cmd(w, e, 'alliance-join', a.allianceId), /unaffiliated/);
  cmd(w, a, 'alliance-kick', e.id);
  assert.equal(e.allianceId, '');
  const id = a.allianceId;
  cmd(w, b, 'alliance-leave');
  cmd(w, a, 'marker-place', '', { name: 'Meet', x: a.homeX, z: a.homeZ });
  cmd(w, a, 'alliance-leave');
  assert.equal(w.alliances.has(id), false);
  assert.equal(w.markers.length, 0);
  assert.equal(LIMITS.allianceMembers, expected.memberCapacity);
});

test('alliance member capacity stays on the existing limit', () => {
  assert.equal(LIMITS.allianceMembers, expected.memberCapacity);
});

test('a captured pass opens only its own corridor, and the defending garrison keeps its own troops', () => {
  const { w, a, b, c, d } = halls();
  cmd(w, b, 'alliance-join', a.allianceId);
  cmd(w, d, 'alliance-join', c.allianceId);
  const gate = w.sites.find(s => s.id === 'gate-east');
  gate.allianceId = c.allianceId;
  const supply = { id: 'supply', allianceId: a.allianceId, x: 32, z: 20 };
  initializeFortification(supply); supply.isRoot = true; w.flags.push(supply); refreshBeacons(w);
  for (const p of [a, b, c, d]) p.cityLevel = 2;
  const east = { x: 50, z: 20 }, north = { x: 20, z: 50 };
  assert.equal(route(w, a, east), null);
  assert.ok(route(w, c, east));
  const before = [a, b, c, d].map(census);
  cmd(w, c, 'garrison-join', gate.id); cmd(w, d, 'garrison-join', gate.id);
  until(w, () => d.state === 'Garrisoned', 90);
  cmd(w, a, 'commander', 'heracles'); cmd(w, b, 'commander', 'heracles');
  advance(w, 1.2);
  cmd(w, a, 'rally-create', gate.id, { count: 10 });
  cmd(w, b, 'rally-join', w.rallies[0].id);
  until(w, () => gate.allianceId === a.allianceId);
  assert.deepEqual([a, b, c, d].map(census), before);
  assert.ok(route(w, a, east));
  assert.equal(route(w, c, east), null);
  assert.equal(route(w, a, north), null);
  assert.ok(!reachableRegions(w, a).has('legacy-north'));
  assert.equal(w.rallies.length, 0);
  const counts = [a, b, c, d].map(census);
  const restored = World.fromSave(w.toSave());
  const players = [...restored.players.values()];
  assert.equal(restored.sites.find(s => s.id === 'gate-east').allianceId, a.allianceId);
  assert.deepEqual(players.filter(p => [a.id, b.id, c.id, d.id].includes(p.id)).map(census), counts);
});
