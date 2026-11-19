import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from './world.mjs';
import { route, scoutRoute } from './navigation.mjs';
import { createGameServer } from './http.mjs';

const expected = JSON.parse(readFileSync(new URL('../research/parity/fixtures/kingdom-search.json', import.meta.url), 'utf8'));
const census = p => p.troops + p.marches.reduce((n, a) => n + a.troops, 0) + p.reserveTroops;
const fresh = () => {
  const w = new World({ random: () => 0.25, now: () => Date.UTC(2026, 10, 19) });
  const a = w.authenticate(w.join('Dawn').token);
  const b = w.authenticate(w.join('Dusk').token);
  return { w, a, b };
};

test('march preview leaves the save unchanged', () => {
  const { w, a } = fresh();
  const before = structuredClone(w.toSave());
  const preview = w.previewMarch(a, { type: 'move', x: 50, z: 20 });
  assert.equal(expected.mutatesSave, false);
  assert.equal(preview.authorized, false);
  assert.match(preview.message, /authorized gate/);
  assert.deepEqual(preview.route, []);
  assert.deepEqual(w.toSave(), before);
});

test('known kingdom search hides private targets and previews the same military route', () => {
  const { w, a, b } = fresh();
  const view = w.snapshot(a.id);
  assert.equal(view.sites.some(site => site.id === 'first-sanctuary'), false);
  assert.equal(view.armies.some(army => army.ownerId === b.id && army.cargo), false);
  for (const camp of w.camps) if (!view.camps.some(seen => seen.id === camp.id)) {
    const hidden = w.previewMarch(a, { type: 'attack', targetId: camp.id });
    assert.equal(hidden.authorized, false);
    assert.match(hidden.message, /unavailable/);
    break;
  }
  const hiddenNode = w.nodes.find(node => !view.nodes.some(seen => seen.id === node.id));
  if (hiddenNode) assert.match(w.previewMarch(a, { type: 'gather', targetId: hiddenNode.id }).message, /unavailable/);
  assert.ok(view.passes.some(pass => pass.id === 'gate-east' && pass.defendersKnown === false));
  const far = { x: 50, z: 20 };
  const military = w.previewMarch(a, { type: 'move', x: far.x, z: far.z });
  assert.equal(military.authorized, route(w, a, far) != null);
  const scout = w.previewMarch(a, { type: 'scout', x: far.x, z: far.z });
  assert.equal(scout.authorized, scoutRoute(w, { ownerId: a.id, x: a.homeX, z: a.homeZ }, far) != null);
  const near = { x: Math.min(30, a.homeX + 2), z: Math.min(30, a.homeZ + 1) };
  const legal = w.previewMarch(a, { type: 'move', x: near.x, z: near.z });
  assert.equal(legal.authorized, route(w, a, near) != null);
  if (legal.authorized) {
    const before = census(a);
    w.command(a, { type: 'move', x: near.x, z: near.z });
    w.command(a, { type: 'move', x: near.x, z: near.z });
    w.command(a, { type: 'return' });
    w.command(a, { type: 'return' });
    assert.equal(census(a), before);
    assert.equal(a.state, 'Returning');
  }
  assert.throws(() => w.command(a, { type: 'move', x: far.x, z: far.z }), /authorized gate/);
  assert.equal(a.target?.type === 'move' && a.target.x === far.x, false);
  w.command(a, { type: 'scout-send', x: a.homeX + 1, z: a.homeZ + 1 });
  w.command(a, { type: 'scout-redirect', targetId: a.scouts[0].id, x: a.homeX + 2, z: a.homeZ + 1 });
  w.command(a, { type: 'scout-recall', targetId: a.scouts[0].id });
  w.command(a, { type: 'scout-auto', enabled: true });
  w.command(a, { type: 'scout-auto', enabled: false });
  assert.equal(a.autoExplore, false);
  w.command(a, { type: 'forsaken-search', count: 1 });
  if (a.forsaken.searchResult.status === 'found') {
    const attack = w.previewMarch(a, { type: 'attack', targetId: a.forsaken.searchResult.id });
    assert.equal(attack.authorized, route(w, a, a.forsaken.searchResult) != null);
    assert.ok(w.snapshot(a.id).camps.some(camp => camp.id === a.forsaken.searchResult.id));
    assert.equal(w.snapshot(b.id).camps.some(camp => camp.id === a.forsaken.searchResult.id && camp.searchPin), false);
  }
  assert.throws(() => w.command(a, { type: 'pair-commander', targetId: 'heracles' }), /Acquire/);
  w.command(a, { type: 'alliance-create', name: 'Dawn Pact' });
  assert.throws(() => w.command(b, { type: 'alliance-kick', targetId: a.id }));
  w.command(b, { type: 'alliance-join', targetId: a.allianceId });
  assert.throws(() => w.command(b, { type: 'alliance-transfer', targetId: b.id }));
  assert.throws(() => w.command(a, { type: 'rally-create', targetId: 'gate-east', count: 10 }), /Oathbound Hall/);
  w.command(a, { type: 'alliance-kick', targetId: b.id });
  const restored = World.fromSave(w.toSave(), { random: () => 0.25, now: () => Date.UTC(2026, 10, 19) });
  const kept = [...restored.players.values()].find(player => player.name === 'Dawn');
  assert.equal(kept.allianceId, a.allianceId);
  assert.equal(census(kept), census(a));
  assert.equal(restored.previewMarch(kept, { type: 'move', x: far.x, z: far.z }).authorized, false);
});

test('authenticated march preview cannot move an army', async t => {
  const app = createGameServer({ random: () => 0.25, now: () => Date.UTC(2026, 10, 19) });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.server.close(resolve); app.server.closeAllConnections(); }));
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const joined = await (await fetch(url + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Preview', civilization: 'greek' }) })).json();
  const denied = await fetch(url + '/march-preview?type=move&x=50&z=20');
  assert.equal(denied.status, 401);
  const response = await fetch(url + '/march-preview?type=move&x=50&z=20&marchId=' + joined.playerId, { headers: { Authorization: 'Bearer ' + joined.token } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authorized, false);
  const player = app.world.authenticate(joined.token);
  assert.equal(player.target, null);
  assert.equal(player.state === 'Marching', false);
});
