import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { STARTING_REGIONS, SPAWN_RULES, suitableSpawn } from './spawning.mjs';
import { route } from './navigation.mjs';
import { openRealm } from './realms.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
const seeded = seed => () => ((seed=(1664525*seed+1013904223)>>>0)/2**32);
const make = seed => new World({random:seeded(seed),now:()=>Date.UTC(2026,10,14)});
test('seeded spawns fill 32 cities with independent continuous positions, spacing and reachable starter content',()=>{
  for(let seed=1;seed<=24;seed++) {
    const w=make(seed);
    for(let i=0;i<32;i++) {
      const p=w.authenticate(w.join('City'+i).token);
      assert.ok(STARTING_REGIONS.some(r=>p.x>=r.minX&&p.x<=r.maxX&&p.z>=r.minZ&&p.z<=r.maxZ));
      w.players.delete(p.id);assert.ok(suitableSpawn(w,p));w.players.set(p.id,p);
      for(const q of w.players.values())if(p!==q)assert.ok(Math.hypot(p.x-q.homeX,p.z-q.homeZ)>=SPAWN_RULES.cityDistance);
      for(const resource of ['wood','food','gold'])assert.ok(w.nodes.some(n=>n.resource===resource&&Math.hypot(p.x-n.x,p.z-n.z)<=SPAWN_RULES.starterReach&&route(w,p,n)));
      assert.ok(w.camps.some(c=>c.level===1&&Math.hypot(p.x-c.x,p.z-c.z)<=SPAWN_RULES.campReach&&route(w,p,c)));
    }
  }
});
test('first cities cover all quadrants without a slot-based row, and seeded runs reproduce',()=>{
  const counts=[0,0,0,0], positions=[];
  for(let seed=0;seed<240;seed++) {
    const w=make(seed),p=w.authenticate(w.join('First').token);
    counts[(p.x>=20?1:0)+(p.z>=20?2:0)]++;positions.push(p.homeX+':'+p.homeZ);
  }
  assert.ok(counts.every(n=>n>=25&&n<=100),JSON.stringify(counts));assert.equal(new Set(positions).size,240);
  const a=make(42),b=make(42);
  for(let i=0;i<32;i++) {
    const p=a.authenticate(a.join('P'+i).token),q=b.authenticate(b.join('P'+i).token);
    assert.deepEqual([p.homeX,p.homeZ],[q.homeX,q.homeZ]);
  }
});
test('reconnect, save restart and legacy cities never reroll or move permanent structures',()=>{
  const w=testWorld(),s=w.join('Legacy'),p=w.authenticate(s.token);p.homeX=5;p.homeZ=5;p.x=5;p.z=5;
  const restored=World.fromSave(w.toSave(),{random:seeded(55)}),q=restored.authenticate(s.token);
  assert.deepEqual([q.homeX,q.homeZ],[5,5]);assert.equal(restored.join('ignored','norse',s.token).playerId,p.id);
  const sites=structuredClone(restored.sites);const joined=restored.authenticate(restored.join('New').token);
  assert.ok(Math.hypot(joined.x-5,joined.z-5)>=SPAWN_RULES.cityDistance);assert.deepEqual(restored.sites,sites);
  const again=World.fromSave(restored.toSave());assert.deepEqual([again.authenticate(s.token).homeX,again.authenticate(s.token).homeZ],[5,5]);
});
test('full land fails gracefully, and save failure releases a generated position and identity',()=>{
  const w=make(4);
  for(let z=3;z<=37;z+=3)for(let x=3;x<=37;x+=3)w.flags.push({id:x+':'+z,x,z});
  assert.throws(()=>w.join('Blocked'),/No suitable starting land/);assert.equal(w.players.size,0);assert.equal(w.sessions.size,0);
  const fresh=new World({random:()=>.5});let fail=true;
  const realm=openRealm({id:'spawn',name:'Spawn',store:{load:()=>fresh,save:()=>{if(fail)throw new Error('disk full');}}});
  assert.throws(()=>realm.mutate(()=>fresh.join('Retry')),/saved/);assert.equal(fresh.players.size,0);assert.equal(fresh.sessions.size,0);
  fail=false;assert.ok(realm.saveNow());const session=realm.mutate(()=>fresh.join('Retry'));assert.ok(fresh.authenticate(session.token));realm.close();
});
test('kingdom occupancy is independent and production randomness is geographically variable',()=>{
  const a=make(18),b=make(18);a.join('Occupied');
  const first=b.authenticate(b.join('Independent').token),second=a.authenticate(a.join('Second').token);
  assert.notDeepEqual([first.x,first.z],[second.x,second.z]);
  const homes=Array.from({length:10},()=>{const w=new World(),p=w.authenticate(w.join('Random').token);return p.x+':'+p.z;});
  assert.equal(new Set(homes).size,10);
});
