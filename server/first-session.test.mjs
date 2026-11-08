import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';

// No rich-player fixtures, teleports, fabricated troops, forced wins or changed tuning.
test('fresh-city first session legally builds, trains, assembles, gathers, defeats a real camp and returns', () => {
  const w = new World();
  const joined = w.join('First session 027', 'greek');
  const p = w.authenticate(joined.token);
  const command = (type, extra = {}) => w.command(p, { type, ...extra });
  const until = (predicate, limit = 240) => {
    for (let i = 0; i < limit * 10 && !predicate(); i++) w.tick(.1);
    assert.ok(predicate(), 'legitimate session step must complete within time budget');
  };
  command('building-upgrade', { targetId: 'citadel' });
  command('train', { targetId: 'infantry' });
  command('train', { targetId: 'infantry' });
  until(() => p.cityLevel === 2 && p.trainingQueue.length === 0);
  assert.equal(p.reserveTroops, 10);
  command('configure-march', { targetId: 'captain', units: { infantry: 30, archers: 0, cavalry: 0 }, mythic: 0 });
  assert.equal(p.troops, 30);
  const progress = id => w.snapshot(p.id).players.find(x => x.id === p.id).journeyCampaign.chapters.flatMap(c => c.tasks).find(t => t.id === id).progress;
  for (const resource of ['wood', 'food']) {
    const node = w.nodes.find(n => n.resource === resource && n.x < 40 && n.z < 40);
    command('gather', { targetId: node.id });
    until(() => p.cargo[resource]>=40);
    command('return');until(()=>!p.deployed);
    assert.ok(progress('gather-'+resource)>=40);
  }
  const camp = w.camps.find(c => c.level === 1 && c.health > 0);
  const attackBefore = p.attackSequence ?? 0;
  command('move',{x:camp.x-5,z:camp.z});until(()=>!p.target);
  command('attack', { targetId: camp.id });
  let rewardBefore;
  for (let i=0;i<2400&&p.kills<1;i++) {
    const before={gold:p.gold,food:p.food,stone:p.stone,aether:p.aether,sigils:p.sigils};
    w.tick(.1);if(p.kills===1)rewardBefore=before;
  }
  assert.equal(p.kills,1);
  assert.ok(p.gold>=rewardBefore.gold+50 && p.food>=rewardBefore.food+30);
  assert.equal(p.aether,rewardBefore.aether+5);
  assert.equal(p.sigils,rewardBefore.sigils+1);
  assert.equal(camp.health, 0);
  assert.equal(p.state, 'Victorious');
  assert.ok(p.attackSequence > attackBefore);
  assert.ok(p.xp > 0);
  assert.ok(p.health > 0);
  const woodTask = w.snapshot(p.id).players.find(x => x.id === p.id).journeyCampaign.chapters[0].tasks.find(t => t.id === 'gather-wood');
  assert.equal(woodTask.canClaim, true);
  command('journey-claim', { targetId: woodTask.id });
  assert.throws(() => command('journey-claim', { targetId: woodTask.id }));
  command('return');
  until(() => !p.target && Math.hypot(p.x-p.homeX,p.z-p.homeZ) < .1);
  assert.equal(p.state, 'Home');
  const restored = World.fromSave(w.toSave());
  const resumed = restored.authenticate(joined.token);
  assert.equal(resumed.cityLevel, 2);
  assert.equal(resumed.kills, 1);
  assert.equal(resumed.troops, 30);
});
