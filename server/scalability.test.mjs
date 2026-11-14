import test from 'node:test';
import assert from 'node:assert/strict';
import { checkpoint, restoreCheckpoint } from './checkpoint.mjs';
import { sightCells } from './exploration.mjs';
import { rememberStatics } from './discovery.mjs';
import { World } from './world.mjs';
import { openRealm, createRealmHost } from './realms.mjs';
import { fixtureCommand } from './testing/roster-fixture.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const state = w => structuredClone(Object.fromEntries(Object.entries(w).filter(([,v])=>typeof v!=='function')));
const census = p => p.troops + p.reserveTroops + p.marches.reduce((n,a)=>n+a.troops,0) + Object.values(p.wounded).reduce((a,b)=>a+b,0);
function field() {
  const w=testWorld({now:()=>Date.UTC(2026,10,14,12)});
  const sessions=['A','B'].map(name=>w.join(name));
  const [a,b]=sessions.map(s=>w.authenticate(s.token));
  a.cityLevel=b.cityLevel=2;a.x=10;a.z=24;b.x=11;b.z=24;a.deployed=b.deployed=true;
  w.command(a,{type:'attack-player',targetId:b.id});w.tick(.1);
  assert.equal(w.battles.size,1);
  return {w,a,b,sessions};
}
test('encoded checkpoints preserve full live engagements, reference sharing and injected functions',()=>{
  const {w,a}=field(), clock=w.now;
  w.testGraph={same:a, map:new Map([['army',a]]), set:new Set([a]), missing:undefined, bytes:new Uint8Array([1,2]), infinity:Infinity};
  const before=state(w), image=checkpoint(w);
  a.food=0;w.battles.clear();w.testGraph.bytes[0]=8;w.players.clear();
  restoreCheckpoint(w,image);
  assert.deepEqual(state(w),before);assert.equal(w.now,clock);
  assert.equal(w.testGraph.same,w.players.get(a.id));assert.equal(w.testGraph.map.get('army'),w.players.get(a.id));
  assert.ok(w.testGraph.set.has(w.players.get(a.id)));
});
test('failed durable mutation restores troops, resources, orders, battles and a fresh roster',()=>{
  const {w,a}=field();let fail=false;
  const realm=openRealm({id:'test',name:'Test',store:{load:()=>w,save:()=>{if(fail)throw new Error('disk full');}}});
  const before=state(w), count=census(a);w.snapshot(a.id);fail=true;
  assert.throws(()=>realm.mutate(()=>{w.command(a,{type:'train'});w.tick(.1);return {accepted:true};}),/saved/);
  assert.deepEqual(state(w),before);assert.notEqual(w.army(a.id),a);assert.equal(w.army(a.id),w.players.get(a.id));
  assert.equal(census(w.players.get(a.id)),count);assert.equal(w.battles.size,1);
  fail=false;assert.equal(realm.saveNow(),true);realm.close();
});
test('gather debit save failure rolls back cargo and resource node together, then resumes once',()=>{
  const w=testWorld(), s=w.join('Gatherer'), a=w.authenticate(s.token), n=w.nodes[0];
  a.x=n.x;a.z=n.z;a.deployed=true;w.command(a,{type:'gather',targetId:n.id});a.gatherClock=.95;
  let fail=true;const realm=openRealm({id:'test',name:'Test',store:{load:()=>w,save:()=>{if(fail)throw new Error('disk full');}}});
  const before=state(w);realm.tick(realm.previous+100);assert.deepEqual(state(w),before);
  fail=false;assert.ok(realm.saveNow());realm.tick(realm.previous+100);
  const actor=w.players.get(a.id), node=w.nodes.find(v=>v.id===n.id), cargo=Object.values(actor.cargo).reduce((a,b)=>a+b,0);
  assert.ok(cargo>0);assert.equal(node.remaining+cargo,before.nodes.find(v=>v.id===n.id).remaining);assert.equal(actor.wood,before.players.get(a.id).wood);
  realm.close();
});
test('simulation exceptions release derived rosters and restore active battles before pausing',()=>{
  const {w,a}=field(), before=state(w), tick=w.tick;
  const realm=openRealm({id:'test',name:'Test',store:{load:()=>w,save:()=>{}}});
  w.tick=function(dt){tick.call(this,dt);throw new Error('injected simulation fault');};
  realm.tick(realm.previous+100);assert.ok(realm.simulationFailed);assert.deepEqual(state(w),before);
  assert.equal(w.army(a.id),w.players.get(a.id));realm.close();
});
test('roster scopes observe deploy, disband, restore and live composition changes without stale stats',()=>{
  const w=testWorld(),s=w.join('Roster'),p=w.authenticate(s.token);
  p.reserveUnits.infantry=10;p.reserveTroops=10;
  fixtureCommand(w,p,{type:'unlock-commander',targetId:'heracles'});
  w.snapshot(p.id);
  fixtureCommand(w,p,{type:'deploy-march',targetId:'heracles',units:{infantry:5,archers:0,cavalry:0},mythic:0});
  const a=p.marches[0];assert.equal(w.army(a.id),a);const before=census(p);
  w.tick(.1);assert.ok(w.snapshot(p.id).players[0].homeFormations.some(v=>v.id===a.id));
  const hp=w.stats(a).maxHealth;a.units.infantry++;a.troops++;assert.ok(w.stats(a).maxHealth>hp);a.units.infantry--;a.troops--;
  w.command(p,{type:'disband-march',marchId:a.id});assert.equal(w.army(a.id),undefined);assert.equal(census(p),before);
  const restored=World.fromSave(w.toSave());assert.equal(restored.armies().length,1);assert.equal(restored.army(p.id),restored.players.get(p.id));
});
test('bounded sight cells match the exhaustive privacy predicate at boundaries and randomized positions',()=>{
  let seed=42;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
  const exhaustive=eyes=>Array.from({length:400},(_,i)=>i).filter(i=>eyes.some(s=>Math.hypot(s.x-(i%20*4+2),s.z-(Math.floor(i/20)*4+2))<=s.radius));
  for(let i=0;i<500;i++) {
    const eyes=Array.from({length:i%7},()=>({x:rand()*80,z:rand()*80,radius:rand()*20}));
    assert.deepEqual(sightCells(eyes),exhaustive(eyes));
  }
  for(const x of [0,2,40,79,80])for(const z of [0,2,40,79,80])for(const radius of [0,4,8,9,10,Math.sqrt(8)]) {
    const eyes=[{x,z,radius}];assert.deepEqual(sightCells(eyes),exhaustive(eyes));
  }
});
test('static memory refresh keeps hidden deleted structures stale until their location is visible',()=>{
  const w=testWorld(),p=w.authenticate(w.join('Memory').token);
  w.flags.push({id:'visible',x:5,z:5,health:50},{id:'hidden',x:70,z:70,health:75});
  rememberStatics(w,p,()=>true);w.flags=[];w.time=10;
  rememberStatics(w,p,t=>t.x<40);
  assert.ok(!p.discovery.some(r=>r.value.id==='visible'));
  assert.equal(p.discovery.find(r=>r.value.id==='hidden').value.health,75);
  assert.equal(p.discovery.find(r=>r.value.id==='hidden').observedAt,0);
  rememberStatics(w,p,()=>true);assert.ok(!p.discovery.some(r=>r.value.id==='hidden'));
});
test('concurrent durable HTTP commands survive restart and remain isolated between kingdoms',async t=>{
  const root=mkdtempSync(join(tmpdir(),'myth-scale-test-'));let host;
  t.after(async()=>{if(host)await new Promise(ok=>host.server.close(ok));rmSync(root,{recursive:true,force:true});});
  const specs=['one','two'].map(id=>({id,name:id,databasePath:join(root,id+'.sqlite')}));
  async function start(){host=createRealmHost({defaultId:'one',realms:specs});await new Promise(ok=>host.server.listen(0,'127.0.0.1',ok));return 'http://127.0.0.1:'+host.server.address().port;}
  let base=await start();
  const post=(id,path,body,token='')=>fetch(base+'/k/'+id+path,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
  const sessions=await Promise.all(specs.map(async s=>(await post(s.id,'/join',{name:'Owner'})).json()));
  const results=await Promise.all(sessions.flatMap((s,i)=>Array.from({length:8},()=>post(specs[i].id,'/command',{type:'scout-auto',enabled:false},s.token))));
  assert.ok(results.every(r=>r.status===200));await Promise.all(results.map(r=>r.text()));
  assert.equal((await post('two','/command',{type:'train'},sessions[0].token)).status,401);
  const s=sessions[0];assert.equal((await post('one','/command',{type:'train'},s.token)).status,200);
  await new Promise(ok=>host.server.close(ok));host=null;base=await start();
  assert.equal(host.world.authenticate(s.token).trainingQueue.length,1);
  assert.equal(host.realms.get('two').world.authenticate(sessions[1].token).trainingQueue.length,0);
  const snap=await (await fetch(base+'/k/one/world',{headers:{Authorization:'Bearer '+s.token}})).json();assert.equal(snap.kingdomId,'one');
});
