import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from './world.mjs';
import {route} from './navigation.mjs';
import {nextAutoTarget,explorationTick} from './exploration.mjs';
import {scoutProfile} from './scout-camp.mjs';
import {readFileSync} from 'node:fs';
const expected=JSON.parse(readFileSync(new URL('../research/parity/fixtures/scout-pass-access.json',import.meta.url),'utf8'));
function setup(x=20,z=20){const w=new World({random:()=>.25}),s=w.join('Scout access'),p=w.authenticate(s.token);p.x=p.homeX=x;p.z=p.homeZ=z;return {w,p,s};}
const advance=(w,seconds)=>{for(let i=0;i<seconds*4;i++)w.tick(.25);};
test('scout crosses a closed military pass through its physical corridor at existing speed',()=>{
 const {w,p}=setup();assert.equal(route(w,p,{x:50,z:20}),null);
 assert.equal(scoutProfile(1).speed,expected.level1Speed);
 w.command(p,{type:'scout-send',x:50,z:20});assert.equal(p.scouts.length,1);
 const initial={x:p.scouts[0].x,z:p.scouts[0].z};w.tick(.25);
 assert.ok(Math.hypot(p.scouts[0].x-initial.x,p.scouts[0].z-initial.z)<=scoutProfile(1).speed*.25+.0001);
 advance(w,4);assert.ok(p.scouts[0].x>40);assert.equal(p.scouts[0].z,20);
 assert.throws(()=>w.command(p,{type:'move',x:50,z:20}),/Gate|gate|route/);
});
test('cross-zone redirect, enemy pass ownership, restart and recall preserve the same scout',()=>{
 const {w,p,s}=setup(128,30);w.command(p,{type:'scout-send',x:128,z:128});advance(w,1);
 const id=p.scouts[0].id;w.command(p,{type:'scout-redirect',targetId:id,x:30,z:128});
 const other=w.authenticate(w.join('Pass holder').token);w.command(other,{type:'alliance-create',name:'Other owners'});
 for(const site of w.sites.filter(s=>s.kind==='gate'))site.allianceId=other.allianceId;
 const r=World.fromSave(w.toSave()),q=r.authenticate(s.token);
 assert.equal(q.scouts[0].id,id);assert.equal(q.scouts[0].phase,'Outbound');
 assert.deepEqual([q.scouts[0].targetX,q.scouts[0].targetZ],[30,128]);
 assert.throws(()=>r.command(r.players.get(other.id),{type:'scout-recall',targetId:id}),/no longer/);
 r.command(q,{type:'scout-recall',targetId:id});advance(r,20);assert.equal(q.scouts.length,0);assert.equal(q.scoutReports.length,0);
 assert.equal(route(r,q,{x:128,z:128}),null);
});
test('auto target choice can enter military-locked terrain without changing army authority',()=>{
 const {w,p}=setup(20,39);p.buildings.scoutcamp=2;
 // Explicit known-land fixture isolates automatic target selection, not full exploration proof.
 p.explored=[];for(let z=0;z<10;z++)for(let x=0;x<10;x++)p.explored.push(z*64+x);
 explorationTick(w,0);const target=nextAutoTarget(w,p,p,scoutProfile(2));assert.ok(target);assert.ok(target.x>40||target.z>40);
 assert.equal(route(w,p,target),null);w.command(p,{type:'scout-auto',enabled:true});w.tick(.25);
 assert.ok(p.scouts.length>0);assert.ok(p.scouts.some(s=>s.targetX>40||s.targetZ>40));
});
test('scout bounds, capacity and private mission ownership remain enforced',()=>{
 const {w,p}=setup();for(const point of [{x:0,z:20},{x:256,z:20},{x:20,z:NaN}])assert.throws(()=>w.command(p,{type:'scout-send',...point}),/inside the map/);
 w.command(p,{type:'scout-send',x:50,z:20});assert.throws(()=>w.command(p,{type:'scout-send',x:60,z:20}),/already/);
 const enemy=w.authenticate(w.join('Private outsider').token),snapshot=w.snapshot(enemy.id);
 assert.equal(snapshot.players.find(v=>v.id===p.id)?.scouts,undefined);assert.equal(snapshot.exploration.reports.length,0);
 assert.throws(()=>w.command(enemy,{type:'scout-redirect',targetId:p.scouts[0].id,x:60,z:30}),/no longer/);
});
test('naturally discovered cross-pass cave investigation settles once and recon stays private',()=>{
 const {w,p}=setup();
 w.command(p,{type:'scout-send',x:62,z:18});advance(w,20);
 assert.ok(p.findings.known.includes('tomb-breath'));assert.equal(p.scouts.length,0);
 w.command(p,{type:'finding-investigate',targetId:'tomb-breath'});advance(w,30);
 assert.ok(p.findings.completed.includes('tomb-breath'));
 w.command(p,{type:'finding-claim',targetId:'tomb-breath'});
 assert.throws(()=>w.command(p,{type:'finding-claim',targetId:'tomb-breath'}),/already/);
 const q=w.authenticate(w.join('Recon subject').token);q.cityLevel=2;q.homeX=55;q.homeZ=20;
 w.command(p,{type:'recon-city',targetId:q.id});advance(w,20);
 assert.equal(p.reconReports.length,1);assert.equal(p.reconReports[0].targetId,q.id);
 assert.equal(p.reconReports[0].forces,undefined);assert.equal(p.reconReports[0].resources,undefined);
 assert.equal(q.reconReports.length,0);assert.equal(q.reconNotices.length,1);
});
