import { recordActivity } from './activity.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { WORLD_SIZE, FOG_WIDTH, LIMITS, PROVINCES, FRONTIER_HUBS, cellIndex } from './world-map.mjs';
import { route, travel } from './navigation.mjs';
import { openKingdom } from './testing/kingdom-fixture.mjs';
import { legacyMap } from './testing/legacy-save.mjs';
import { WorldStore } from './storage.mjs';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const seeded=()=>{let n=179;return ()=>((n=(1664525*n+1013904223)>>>0)/2**32);};
test('256-square map has populated frontier hubs, sacred sites and strongholds in all new provinces',()=>{
  const w=new World();assert.equal(WORLD_SIZE,256);assert.equal(FOG_WIDTH,64);
  assert.equal(w.nodes.length,293);assert.equal(w.camps.length,62);assert.equal(w.sites.length,11);assert.equal(w.strongholds.length,8);
  for(const h of FRONTIER_HUBS){assert.equal(w.nodes.filter(n=>n.id.startsWith(h.id+'-')).length,5);assert.ok(w.camps.some(c=>c.id===h.id+'-camp'));}
  for(const p of PROVINCES.filter(p=>p.minX>=80||p.minZ>=80))assert.ok(w.sites.some(s=>s.x>p.minX&&s.x<p.maxX&&s.z>p.minZ&&s.z<p.maxZ));
});
test('schema 25 fog migrates coordinates rather than row numbers, retaining histories and entitlements',()=>{
  const w=new World(),s=w.join('Legacy');
  const data=legacyMap(w.toSave());data.schema=25;
  const p=data.world.players[0];p.x=p.homeX=5;p.z=p.homeZ=5;p.explored=[0,19,20,399];
  p.discovery=[];const original=structuredClone(data),r=World.fromSave(data),q=r.authenticate(s.token);
  assert.deepEqual(data,original);assert.deepEqual([q.homeX,q.homeZ],[5,5]);
  for(const index of [0,19,64,1235])assert.ok(q.explored.includes(index));
  assert.ok(!q.explored.includes(20)); // Would falsely discover land at x=82.
  for(const key of ['gold','food','wood','aether','troops','ownedCommanders','inventory','loginStreak','kingdomClaims'])assert.deepEqual(q[key],p[key]);
  assert.equal(r.toSave().schema,26);assert.equal(r.snapshot(q.id).version,17);
  const restarted=World.fromSave(r.toSave());assert.deepEqual(restarted.authenticate(s.token).explored,q.explored);
  const bad=structuredClone(original);bad.world.players[0].explored=[400];assert.throws(()=>World.fromSave(bad),/exploration/);
});
test('JSON migration archives the exact schema-25 input before rotating saves',()=>{
  const dir=mkdtempSync(join(tmpdir(),'myth-map-migration-'));
  try{const w=new World();w.join('Archive');const old=legacyMap(w.toSave());old.schema=25;const bytes=JSON.stringify(old),path=join(dir,'world.json');writeFileSync(path,bytes);const store=new WorldStore(path),r=store.load();store.save(r);assert.equal(readFileSync(path+'.schema25.bak','utf8'),bytes);assert.equal(store.load().toSave().schema,26);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('frontier travel cannot enter or detour through locked legacy provinces, and recall remains legal',()=>{
  const w=openKingdom(new World()),s=w.join('Routes'),p=w.authenticate(s.token);p.x=128;p.z=128;
  for(const target of [{x:50,z:20},{x:20,z:50},{x:60,z:60},{x:20,z:20}])assert.equal(route(w,p,target),null);
  const target={x:180,z:24};assert.ok(route(w,p,target));const before={x:p.x,z:p.z};travel(w,p,target,4,.1);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=.40001);
  p.gold=1000;w.command(p,{type:'alliance-create',name:'Road owners'});w.sites.find(s=>s.id==='gate-north').allianceId=p.allianceId;
  const path=route(w,p,{x:20,z:20});assert.ok(path);assert.ok(path.every(t=>w.canEnter(p,t)));
  assert.equal(route(w,p,{x:60,z:60}),null);w.sites.find(s=>s.id==='gate-east').allianceId=p.allianceId;assert.ok(route(w,p,{x:60,z:60}));
  p.x=55;p.z=20;w.sites.find(s=>s.id==='gate-east').allianceId='';assert.equal(route(w,p,{x:20,z:20}),null);assert.ok(route(w,p,{x:20,z:20},true));
});
test('256 registered cities persist distinct identities; default operational cap stays 32',()=>{
  const w=new World({cityCapacity:256,random:seeded()}),sessions=[];
  for(let i=0;i<256;i++)sessions.push(w.join('Registered '+i));
  assert.equal(new Set([...w.players.values()].map(p=>p.homeX+':'+p.homeZ)).size,256);
  assert.throws(()=>w.join('Overflow'),/capacity/);const r=World.fromSave(w.toSave());assert.equal(r.players.size,256);assert.equal(r.cityCapacity,256);
  for(const s of sessions)assert.equal(r.authenticate(s.token).id,s.playerId);
  assert.equal(new World().cityCapacity,LIMITS.defaultCities);assert.equal(LIMITS.defaultCities,32);
  assert.throws(()=>new World({cityCapacity:257}),/capacity/);
});
test('100-member alliance keeps roster roles and private chat; the next join is rejected atomically',()=>{
  const w=new World({cityCapacity:110,random:seeded()}),players=[];
  for(let i=0;i<101;i++)players.push(w.authenticate(w.join('Member '+i).token));
  const leader=players[0];w.command(leader,{type:'alliance-create',name:'Hundred Banners'});
  for(const p of players.slice(1,100))w.command(p,{type:'alliance-join',targetId:leader.allianceId});
  assert.throws(()=>w.command(players[100],{type:'alliance-join',targetId:leader.allianceId}),/100-member/);assert.equal(players[100].allianceId,'');
  for(const p of players.slice(0,100))recordActivity(w,p,'gather',1);
  w.command(leader,{type:'alliance-promote',targetId:players[99].id});w.command(players[99],{type:'chat-send',targetId:'alliance',name:'All hundred stand'});
  const own=w.snapshot(leader.id),hidden=w.snapshot(players[100].id);assert.equal(own.allianceRoster.length,100);assert.equal(own.allianceRoster.find(p=>p.id===players[99].id).role,'Officer');
  assert.ok(own.chatMessages.some(m=>m.text==='All hundred stand'));assert.ok(!hidden.chatMessages.some(m=>m.text==='All hundred stand'));
  assert.equal(World.fromSave(w.toSave()).alliances.size,1);
});
test('expanded gathering and scouting preserve cargo, fog privacy and movement beyond the legacy area',()=>{
  const w=new World({random:seeded()}),s=w.join('Far city'),p=w.authenticate(s.token),n=w.nodes.find(n=>n.x>100&&n.z>100);
  p.homeX=p.x=n.x-4;p.homeZ=p.z=n.z;p.cityLevel=2;
  w.command(p,{type:'gather',targetId:n.id});for(let i=0;i<60;i++)w.tick(.1);
  assert.ok(Object.values(p.cargo).some(v=>v>0));const cargo=structuredClone(p.cargo),r=World.fromSave(w.toSave()),q=r.authenticate(s.token);assert.deepEqual(q.cargo,cargo);
  r.command(q,{type:'return'});for(let i=0;i<100;i++)r.tick(.1);assert.equal(q.deployed,false);assert.ok(q.coreReports.some(v=>v.outcome==='Delivered'));
  r.command(q,{type:'scout-send',x:160,z:160});for(let i=0;i<20;i++)r.tick(.1);assert.ok(q.scouts[0].x>80);assert.ok(q.explored.some(i=>i%64>20));
  assert.equal(cellIndex({x:254,z:254}),4095);
});
