import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { createGameServer } from './http.mjs';

test('movement respects speed, bounds, and command validation', () => {
  const world = new World();
  const player = world.authenticate(world.join('Athena').token);
  world.command(player, { type: 'move', x: 12, z: 4 });
  world.tick(0.25);
  assert.equal(player.x, 5);
  assert.equal(player.z, 4);
  for (const x of [-1, 41, null, '10', NaN])
    assert.throws(() => world.command(player, { type: 'move', x, z: 4 }));
  for (let i = 0; i < 50; i++) world.tick(0.1);
  assert.equal(player.x, 12);
  assert.equal(player.target, null);
});

test('remote attacks approach instead of dealing instant damage; kill rewards occur once', () => {
  const world = new World();
  const a = world.authenticate(world.join('A').token);
  const b = world.authenticate(world.join('B').token);
  world.command(a, { type: 'attack', targetId: 'forsaken-1' });
  world.tick(0.1);
  assert.equal(world.enemy.health, 120);
  world.command(b, { type: 'attack', targetId: 'forsaken-1' });
  for (let i = 0; i < 300; i++) world.tick(0.1);
  assert.equal(world.enemy.health, 0);
  assert.equal(a.gold + b.gold, 50);
  assert.ok(a.health < 100 || b.health < 100);
  for (let i = 0; i < 100; i++) world.tick(0.1);
  assert.equal(a.gold + b.gold, 50);
  assert.throws(() => world.command(a, { type: 'attack', targetId: 'forsaken-1' }));
});

test('sessions expire and private state is absent from snapshots', () => {
  const world = new World();
  const session = world.join('A');
  assert.ok(!JSON.stringify(world.snapshot()).includes(session.token));
  world.expire(60_001);
  assert.throws(() => world.authenticate(session.token));
  assert.equal(world.players.size, 0);
});

test('HTTP: two players share state; tokens isolate command ownership', async t => {
  const { server } = createGameServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const join = async name => (await fetch(`${base}/join`, {
    method: 'POST', body: JSON.stringify({ name }),
  })).json();
  const a = await join('A');
  const b = await join('B');
  const getWorld = async token => (await fetch(`${base}/world`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  assert.equal((await fetch(`${base}/world`)).status, 401);
  const before = await getWorld(b.token);
  const result = await fetch(`${base}/command`, {
    method: 'POST', headers: { Authorization: `Bearer ${a.token}` },
    body: JSON.stringify({ type: 'move', x: 14, z: 4, playerId: b.playerId }),
  });
  assert.equal(result.status, 200);
  await new Promise(resolve => setTimeout(resolve, 250));
  const after = await getWorld(b.token);
  assert.equal(after.players.length, 2);
  assert.ok(after.players.find(p => p.id === a.playerId).x > before.players.find(p => p.id === a.playerId).x);
  assert.equal(after.players.find(p => p.id === b.playerId).x, before.players.find(p => p.id === b.playerId).x);
  const invalid = await fetch(`${base}/command`, {
    method: 'POST', headers: { Authorization: `Bearer ${b.token}` }, body: '{oops',
  });
  assert.equal(invalid.status, 400);
});
