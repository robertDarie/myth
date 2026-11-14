import { fixtureCommand } from './testing/roster-fixture.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './testing/legacy-world.mjs';
import { CIVILIZATIONS, COMMANDERS } from './content.mjs';
import { createGameServer } from './testing/legacy-services.mjs';
const advance = (w, seconds) => { for (let i = 0; i < Math.round(seconds * 10); i++) w.tick(0.1); };
const player = (w, name = 'A', civ = 'greek') => w.authenticate(w.join(name, civ).token);
const cmd = (w, p, type, args = {}) => fixtureCommand(w,p, { type, ...args });
const rich = p => { p.gold = 10000; p.wood = 10000; p.food = 10000; };
const alliance = (w, p, name = 'Dawn') => { cmd(w, p, 'alliance-create', { name }); return p.allianceId; };
const flag = (w, p, x, z) => { p.x = x; p.z = z; cmd(w, p, 'flag', { x, z }); advance(w, w.flags.at(-1).buildRemaining + 0.1); };

test('movement enforces speed, finite bounds and locked provinces', () => {
  const w = testWorld(), p = player(w), start = p.x;
  cmd(w, p, 'move', { x: 14, z: p.z }); w.tick(0.25); assert.equal(p.x, start + 1);
  for (const x of [-1, 80, null, '10', NaN]) assert.throws(() => cmd(w, p, 'move', { x, z: 4 }));
  assert.throws(() => cmd(w, p, 'move', { x: 50, z: 20 }), /Gate/);
  advance(w, 5); assert.equal(p.x, 14); assert.equal(p.target, null);
});
test('five civilizations provide distinct functional bonuses; four commander rarities exist', () => {
  const w = testWorld(), p = Object.fromEntries(CIVILIZATIONS.map(c => [c.id, player(w, c.name, c.id)]));
  assert.ok(w.stats(p.greek).damage > w.stats(p.egyptian).damage);
  assert.ok(w.stats(p.egyptian).heal > w.stats(p.greek).heal);
  assert.ok(w.stats(p.norse).maxHealth > w.stats(p.greek).maxHealth);
  assert.ok(w.stats(p.chinese).gather > w.stats(p.greek).gather);
  assert.ok(w.stats(p.japanese).speed > w.stats(p.greek).speed);
  assert.equal(new Set(COMMANDERS.map(c => c.rarity)).size, 4);
  assert.throws(() => w.join('X', 'unknown'));
});
test('a completed camp cycle does not pay a stale or overlapping order again', () => {
  const w = testWorld(), joined = w.join('A'), p = w.authenticate(joined.token), q = player(w, 'Neighbor'), c = w.camps[0];
  const troops = p.troops;
  p.x = c.x; p.z = c.z;
  cmd(w, p, 'attack', { targetId: c.id });
  advance(w, 15);
  assert.equal(c.health, 0); assert.equal(p.kills, 1); assert.equal(p.troops, troops);
  const gold = p.gold, sigils = p.sigils;
  assert.equal(p.coreReports.filter(r => r.type === 'pve' && r.outcome === 'Victory').length, 1);
  const outsider = w.snapshot(q.id);
  assert.equal(outsider.players.find(row => row.id === p.id).reports, undefined);
  assert.equal(q.kills, 0); assert.equal(q.gold, 150);
  c.respawn = 600;
  assert.throws(() => cmd(w, p, 'attack', { targetId: c.id }), /unavailable/);
  p.target = { type: 'attack', id: c.id }; w.tick(0.1);
  assert.equal(p.target, null); assert.equal(p.state, 'Target unavailable');
  assert.equal(p.gold, gold); assert.equal(p.kills, 1); assert.equal(p.sigils, sigils); assert.equal(p.ap, 95);
  cmd(w, p, 'return'); advance(w, 20); assert.equal(Math.hypot(p.x - p.homeX, p.z - p.homeZ) < 2, true);
  const ap = p.ap;
  cmd(w, p, 'attack', { targetId: c.id });
  for (let i = 0; i < 400 && p.target; i++) w.tick(0.1);
  assert.equal(p.target, null); assert.equal(p.state, 'Target unavailable');
  assert.equal(p.kills, 1); assert.equal(p.gold, gold); assert.equal(p.sigils, sigils); assert.ok(p.ap >= ap);
  const loaded = World.fromSave(w.toSave()), restored = loaded.authenticate(joined.token), camp = loaded.camps[0];
  assert.equal(restored.kills, 1); assert.equal(restored.gold, gold); assert.equal(camp.health, 0); assert.equal(loaded.toSave().schema, 27);
  camp.respawn = 0.05; loaded.tick(0.1);
  assert.equal(camp.cycle, 2); assert.equal(camp.health, camp.maxHealth); assert.deepEqual(camp.contributors, {});
  restored.x = camp.x; restored.z = camp.z;
  const next = restored.ap;
  loaded.command(restored, { type: 'attack', targetId: camp.id }); loaded.tick(0.1);
  assert.equal(restored.ap, next - 5); assert.equal(restored.kills, 1);
  for (let i = 0; i < 200 && camp.health > 0; i++) loaded.tick(0.1);
  assert.equal(camp.health, 0); assert.equal(restored.kills, 2); assert.equal(restored.gold, gold + 50);
  assert.equal(restored.coreReports.filter(r => r.type === 'pve' && r.outcome === 'Victory').length, 2);
  const paid = restored.gold;
  restored.target = { type: 'attack', id: camp.id }; loaded.tick(0.1);
  assert.equal(restored.gold, paid); assert.equal(restored.kills, 2); assert.equal(restored.ap, next - 5);
});

test('camp attacks approach, retaliate, reward once, and respawn', () => {
  const w = testWorld(), p = player(w), c = w.camps[0];
  cmd(w,p,'move',{x:c.x-5,z:c.z});advance(w,3);
  cmd(w, p, 'attack', { targetId: c.id }); w.tick(0.1); assert.equal(c.health, c.maxHealth);
  advance(w, 20); assert.equal(c.health, 0); assert.equal(p.gold, 200); assert.equal(p.kills, 1);
  assert.ok(p.health < w.stats(p).maxHealth);
  assert.throws(() => cmd(w, p, 'attack', { targetId: c.id }));
  advance(w, 20); assert.equal(p.gold, 200);
  advance(w, 40); assert.equal(c.health, c.maxHealth); assert.deepEqual(c.contributors, {});
});
test('cooperating armies share rewards and experience', () => {
  const w = testWorld(), a = player(w), b = player(w, 'B'), c = w.camps[0];
  a.x = b.x = c.x - 1; a.z = b.z = c.z;
  cmd(w, a, 'attack', { targetId: c.id }); cmd(w, b, 'attack', { targetId: c.id }); advance(w, 10);
  assert.equal(c.health, 0); assert.equal(a.gold + b.gold, 350);
  assert.equal(a.kills, 1); assert.equal(b.kills, 1); assert.equal(a.xp, 25); assert.equal(b.xp, 25);
});
test('defeat returns home, blocks orders during recovery and heals afterward', () => {
  const w = testWorld(), p = player(w), c = w.camps[3]; p.x = c.x - 1; p.z = c.z; p.health = 1;
  cmd(w, p, 'attack', { targetId: c.id }); w.tick(0.1);
  assert.equal(p.x, p.homeX); assert.ok(p.recovery > 0); assert.throws(() => cmd(w, p, 'move', { x: 10, z: 10 }), /recover/);
  cmd(w, p, 'train');
  advance(w, 20); assert.equal(p.recovery, 0); assert.equal(p.health, w.stats(p).maxHealth);
});
test('gathering depletes finite shared resources and refills later', () => {
  const w = testWorld(), p = player(w), n = w.nodes[0]; p.x = n.x; p.z = n.z; n.remaining = 9;p.buildings.lumber=0;
  const before = p.wood; cmd(w, p, 'gather', { targetId: n.id }); advance(w, 3);
  assert.equal(n.remaining, 0); assert.equal(p.cargo.wood,9);assert.equal(p.wood,before);advance(w,5);assert.equal(p.wood-before,9);
  advance(w, 31); assert.equal(n.remaining, n.capacity);
});
test('city development continues while the army is gathering; recruits stay in reserves', () => {
  const w = testWorld(), p = player(w); rich(p);
  const node = w.nodes[0]; p.x = node.x; p.z = node.z;
  cmd(w, p, 'gather', { targetId: node.id });
  const order = structuredClone(p.target), armyHealth = p.health;
  cmd(w, p, 'upgrade'); cmd(w, p, 'train');
  assert.equal(p.cityLevel, 1); assert.equal(p.troops, 20);
  advance(w, 9); assert.equal(p.reserveTroops, 5); assert.equal(p.troops, 20);
  assert.equal(p.health, armyHealth); assert.deepEqual(p.target, order);
  assert.throws(() => cmd(w, p, 'reinforce'), /home/);
  advance(w, 12); assert.equal(p.cityLevel, 2);
  p.buildings.menagerie = 1;
  cmd(w, p, 'recruit'); advance(w, 21); assert.equal(p.reserveMythic, 1); assert.equal(p.mythic, 0);
  assert.throws(() => cmd(w, p, 'commander', { targetId: 'atalanta' }), /home/);
  cmd(w, p, 'return'); advance(w, 20); cmd(w, p, 'reinforce');
  assert.equal(p.troops, 25); assert.equal(p.mythic, 1); assert.equal(p.reserveTroops, 0); assert.equal(p.reserveMythic, 0);
});
test('training lane, troop capacity, mythic prerequisites and cancellation refunds are enforced', () => {
  const w = testWorld(), p = player(w); rich(p);
  assert.throws(() => cmd(w, p, 'recruit'), /level 2/);
  const resources = [p.gold, p.food];
  cmd(w, p, 'train'); const firstId = p.trainingQueue[0].id;
  advance(w, 3); cmd(w, p, 'cancel-job', { targetId: firstId });
  assert.deepEqual([p.gold, p.food], resources); assert.throws(() => cmd(w, p, 'cancel-job', { targetId: firstId }));
  for (let i = 0; i < 3; i++) cmd(w, p, 'train');
  assert.throws(() => cmd(w, p, 'train'), /queue/);
  advance(w, 9); assert.equal(p.reserveTroops, 5); assert.equal(p.trainingQueue.length, 2);
  advance(w, 16); assert.equal(p.reserveTroops, 15); assert.equal(p.trainingQueue.length, 0);
  cmd(w, p, 'train'); assert.throws(() => cmd(w, p, 'train'), /capacity/);
  advance(w, 9); assert.equal(p.reserveTroops, 20); assert.equal(p.troops, 20);
  cmd(w, p, 'reinforce'); assert.equal(p.troops, 40);
  const before = [p.wood, p.gold]; cmd(w, p, 'upgrade'); const upgradeId = p.construction.id;
  assert.throws(() => cmd(w, p, 'upgrade'), /construction/);
  cmd(w, p, 'cancel-job', { targetId: upgradeId }); assert.deepEqual([p.wood, p.gold], before);
  p.gold = 0; const food = p.food;
  assert.throws(() => cmd(w, p, 'upgrade'), /resources/); assert.equal(p.food, food);
});
test('city management remains available during recovery; an authored fixture hero does not auto-equip', () => {
  const w = testWorld(), p = player(w); rich(p); p.recovery = 5;
  cmd(w, p, 'upgrade'); cmd(w, p, 'train');
  cmd(w, p, 'unlock-commander', { targetId: 'atalanta' });
  assert.equal(p.commanderId, 'captain'); assert.ok(p.ownedCommanders.includes('atalanta'));
  assert.throws(() => cmd(w, p, 'commander', { targetId: 'atalanta' }), /recover/);
  advance(w, 21); assert.equal(p.cityLevel, 2); assert.equal(p.reserveTroops, 5);
});
test('gold cannot recruit commanders and a quest reward cannot be duplicated', () => {
  const w = testWorld(), p = player(w); rich(p); const before = p.gold;
  assert.throws(()=>w.command(p,{type:'commander',targetId:'heracles'}),/Acquire/);
  assert.throws(()=>w.command(p,{type:'unlock-commander',targetId:'heracles'}),/Recruit/);assert.equal(p.gold,before);
  assert.throws(() => cmd(w, p, 'quest')); p.kills = 3; cmd(w, p, 'quest');
  assert.ok(p.ownedCommanders.includes('atalanta')); assert.throws(() => cmd(w, p, 'quest'));
});
test('alliance flags require a leader root, connection and resources', () => {
  const w = testWorld(), a = player(w), b = player(w, 'B'); rich(a); rich(b);
  const id = alliance(w, a); cmd(w, b, 'alliance-join', { targetId: id });
  assert.throws(() => flag(w, b, b.homeX, b.homeZ), /leader/);
  flag(w, a, a.homeX, a.homeZ); assert.throws(() => flag(w, a, 30, 30), /connect/);
  flag(w, a, 15, 8); assert.equal(w.flags.length, 2); assert.equal(w.snapshot().alliances[0].members, 2);
  assert.throws(() => cmd(w, a, 'alliance-create', { name: 'Again' }));
  cmd(w, a, 'alliance-promote', { targetId: b.id });
  assert.throws(() => flag(w, b, 16, 8), /close/);
});
test('capturing a connected shrine grants alliance-wide buffs', () => {
  const w = testWorld(), a = player(w), b = player(w, 'B'); rich(a);
  const id = alliance(w, a); cmd(w, b, 'alliance-join', { targetId: id });
  flag(w, a, 5, 5); flag(w, a, 13, 12); flag(w, a, 20, 20);
  const damage = w.stats(b).damage; cmd(w, a, 'capture', { targetId: 'shrine-dawn' }); advance(w, 18);
  assert.equal(w.sites[0].allianceId, id); assert.ok(w.stats(b).damage > damage);
});
test('opposing occupiers contest captures and defenders reverse progress', () => {
  const w = testWorld(), a = player(w), b = player(w, 'B'); rich(a); rich(b);
  alliance(w, a, 'Dawn'); alliance(w, b, 'Dusk');
  assert.throws(() => cmd(w, a, 'capture', { targetId: 'shrine-dawn' }), /beacons/);
  w.flags.push({ health: 250, maxHealth: 250, buildRemaining: 0, isRoot: true, connected: true, id: 'a', allianceId: a.allianceId, x: 12, z: 23 }, { health: 250, maxHealth: 250, buildRemaining: 0, isRoot: true, connected: true, id: 'b', allianceId: b.allianceId, x: 28, z: 23 });
  a.x = b.x = 20; a.z = b.z = 23;
  cmd(w, a, 'capture', { targetId: 'shrine-dawn' }); advance(w, 5); const progress = w.sites[0].progress;
  cmd(w, b, 'capture', { targetId: 'shrine-dawn' }); advance(w, 5); assert.equal(w.sites[0].progress, progress);
  cmd(w, b, 'stop'); advance(w, 11); assert.equal(w.sites[0].allianceId, a.allianceId);
  assert.throws(() => cmd(w, b, 'capture', { targetId: 'shrine-dawn' }), /rally/);
  w.sites[0].progress = 5; w.sites[0].challengerId = b.allianceId;
  cmd(w, a, 'capture', { targetId: 'shrine-dawn' }); advance(w, 3); assert.equal(w.sites[0].allianceId, a.allianceId);
  cmd(w, b, 'stop'); advance(w, 6); assert.equal(w.sites[0].progress, 0);
});
test('gates grant access; losing access cancels orders but return home remains possible', () => {
  const w = testWorld(), p = player(w); rich(p); const id = alliance(w, p);
  w.flags.push({ health: 250, maxHealth: 250, buildRemaining: 0, isRoot: true, connected: true, id: 'near-gate', allianceId: id, x: 33, z: 20 }); p.x = 37; p.z = 20;
  cmd(w, p, 'capture', { targetId: 'gate-east' }); advance(w, 16);
  assert.equal(w.sites.find(s => s.id === 'gate-east').allianceId, id);
  cmd(w, p, 'move', { x: 55, z: 20 }); advance(w, 2); assert.ok(p.x > 40);
  assert.throws(() => cmd(w, p, 'move', { x: 65, z: 65 }));
  w.sites.find(s => s.id === 'gate-east').allianceId = ''; w.tick(0.1); assert.equal(p.target, null);
  cmd(w, p, 'return'); advance(w, 25); assert.equal(p.x, p.homeX);
});
test('inactive saved cities retain sessions, alliances and territory', () => {
  const w = testWorld(), session = w.join('A'), a = w.authenticate(session.token), b = player(w, 'B');
  const id = alliance(w, a); cmd(w, b, 'alliance-join', { targetId: id }); a.gold = 999;
  assert.deepEqual(w.join('A', 'greek', session.token), session);
  assert.ok(!JSON.stringify(w.snapshot()).includes(session.token));
  a.lastSeen = 0; b.lastSeen = 5000; w.expire(1900001);
  assert.equal(a.offline, true); assert.equal(w.players.size, 2); assert.equal(w.alliances.get(id).leaderId, a.id);
  assert.equal(w.authenticate(session.token).gold, 999);
  assert.throws(() => w.join('A'), /already exists/);
});
test('HTTP clients share state, cannot command each other, and invalid requests fail', async t => {
  const { server, world: httpWorld } = createGameServer();httpWorld.spawnLocation=()=>({x:5+httpWorld.players.size*5,z:5});
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, token = '') => fetch(base + path, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const a = await (await post('/join', { name: 'A', civilization: 'greek' })).json(), b = await (await post('/join', { name: 'B', civilization: 'egyptian' })).json();
  const get = async token => (await fetch(base + '/world', { headers: { Authorization: `Bearer ${token}` } })).json();
  const health = await (await fetch(base + '/health')).json();
  assert.equal(health.game, 'thrones-of-myth'); assert.equal(health.version,17);
  assert.equal((await fetch(base + '/world')).status, 401); const before = await get(b.token), ownBefore = await get(a.token);
  assert.equal((await post('/command', { type: 'move', x: 18, z: 5, playerId: b.playerId }, a.token)).status, 200);
  await new Promise(resolve => setTimeout(resolve, 250)); const after = await get(a.token);
  assert.equal(after.version,17); assert.equal(after.players.length, 2);
  assert.ok(Math.abs(after.armies.find(p => p.id === a.playerId).x - 18) < Math.abs(ownBefore.players.find(p=>p.id===a.playerId).homeX - 18));
  assert.equal((await get(b.token)).players.find(p => p.id === b.playerId).x, before.players.find(p => p.id === b.playerId).x);
  assert.equal((await post('/command', { type: 'move', x: 60, z: 60 }, a.token)).status, 400);
  await post('/join', { name: 'Ignored', civilization: 'japanese', resumeToken: a.token }); assert.equal((await get(a.token)).players.length, 2);
  assert.equal((await post('/join', { name: 'Bad', civilization: 'none' })).status, 400);
  const invalid = await fetch(base + '/command', { method: 'POST', headers: { Authorization: `Bearer ${b.token}` }, body: '{oops' }); assert.equal(invalid.status, 400);
  assert.equal((await post('/join', { name: 'x'.repeat(5000) })).status, 413);
});

test('economic and territory campaign reaches the sanctuary with opened-stage fixtures and legal commands', () => {
  const w = testWorld(), p = player(w);
  // Advance actual marching and gathering; do not grant resources or teleport.
  for (const index of [0, 3, 1, 4, 2, 12]) {
    cmd(w,p,'move',{x:w.nodes[index].x,z:w.nodes[index].z});advance(w,20);
    for(let trip=0;trip<2;trip++){cmd(w, p, 'gather', { targetId: w.nodes[index].id }); advance(w, 100);}
  }
  cmd(w, p, 'return'); advance(w, 30);
  cmd(w, p, 'upgrade'); advance(w, 21);
  for (const id of ['oracle', 'academy', 'menagerie']) { cmd(w, p, 'building-upgrade', { targetId: id }); advance(w, 13); }
  cmd(w, p, 'recruit'); advance(w, 21);
  for (let i = 0; i < 4; i++) { cmd(w, p, 'train'); advance(w, 9); }
  cmd(w, p, 'reinforce');
  for(let i=0;i<3;i++){cmd(w,p,'move',{x:14,z:10});advance(w,10);cmd(w,p,'attack',{targetId:w.camps[0].id});advance(w,20);cmd(w,p,'return');advance(w,50);}
  cmd(w,p,'quest');cmd(w, p, 'commander', { targetId: 'atalanta' });
  const id = alliance(w, p);
  const build = (x, z) => { cmd(w, p, 'move', { x, z }); advance(w, 30); cmd(w, p, 'flag', { x, z }); advance(w, w.flags.at(-1).buildRemaining + 0.1); };
  const capture = targetId => { cmd(w, p, 'capture', { targetId }); advance(w, 30); assert.equal(w.sites.find(s => s.id === targetId).allianceId, id); };
  build(5, 5); build(13, 12); build(20, 20); capture('shrine-dawn');
  build(30, 20); capture('gate-east'); build(40, 20);
  build(20, 30); capture('gate-north');
  build(40, 30); build(50, 30); build(50, 40); build(50, 50); capture('shrine-life');
  build(60, 50); build(60, 60); capture('first-sanctuary');
  assert.equal(w.sites.filter(s => s.allianceId === id).length, 5);
  assert.equal(p.cityLevel, 2); assert.equal(p.mythic, 1); assert.equal(p.troops, 40);
  assert.ok(w.stats(p).gather > 1); assert.ok(p.gold >= 0 && p.wood >= 0 && p.food >= 0);
});

test('visual snapshots identify civilization and count real attacks without replaying idle time', () => {
  const w = testWorld(), p = player(w, 'Artist', 'egyptian'), c = w.camps[0];
  let visual = w.snapshot(p.id).players.find(a => a.id === p.id).homeFormations[0];
  assert.equal(visual.civilization, 'egyptian'); assert.equal(visual.attackSequence, 0);
  advance(w, 2); assert.equal(w.armySnapshot(p).attackSequence, 0);
  p.x = c.x - 1; p.z = c.z;
  cmd(w, p, 'attack', { targetId: c.id }); w.tick(0.1);
  assert.equal(w.armySnapshot(p).attackSequence, 1);
  assert.equal(w.armySnapshot(p).attackX, c.x); assert.equal(w.armySnapshot(p).attackZ, c.z);
  w.tick(0.1); assert.equal(w.armySnapshot(p).attackSequence, 1);
  advance(w, 1.1); assert.equal(w.armySnapshot(p).attackSequence, 2);
  const saved = w.toSave(), restored = World.fromSave(saved);
  assert.equal(restored.armySnapshot(restored.players.get(p.id)).attackSequence, 2);
  delete saved.world.players[0].attackSequence; // Saves without the optional visual event counter remain compatible.
  const legacy = World.fromSave(saved);
  assert.equal(legacy.armySnapshot(legacy.players.get(p.id)).attackSequence, 0);
});
