import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from './world.mjs';
import {route} from './navigation.mjs';
import {KINGDOM_STAGES} from './kingdom.mjs';
import {readFileSync} from 'node:fs';
const expected=JSON.parse(readFileSync(new URL('../research/parity/fixtures/military-route-safety.json',import.meta.url),'utf8'));

// Explicit location/ownership fixtures isolate route authorization; not organic progression.
function fixture(x=128,z=30){
 const w=new World({random:()=>.25}),s=w.join('Route safety'),p=w.authenticate(s.token);
 p.homeX=p.x=x;p.homeZ=p.z=z;
 return {w,p,s};
}
test('unauthorized frontier movement is rejected before replacing a legitimate local order',()=>{
 const {w,p}=fixture();w.command(p,{type:'move',x:129,z:30});const before=structuredClone(p.target);
 assert.throws(()=>w.command(p,{type:'move',x:128,z:128}),/route|gate/i);
 assert.deepEqual(p.target,before);
 for(let i=0;i<200;i++)w.tick(.25);
 assert.ok(p.z<80);
});
test('client-supplied scout or returning flags cannot exempt an ordinary military command',()=>{
 const {w,p}=fixture();
 for(const extra of [{scout:true},{returning:true},{mode:'scout'},{type:'return',x:128,z:128}]){
  if(extra.type==='return'){w.command(p,extra);assert.ok(!p.target||p.target.x===p.homeX&&p.target.z===p.homeZ);}
  else assert.throws(()=>w.command(p,{type:'move',x:128,z:128,...extra}),/route|gate/i);
 }
 assert.throws(()=>w.command(p,{type:'move',x:256,z:-1}));
});
test('missing frontier pass authority cannot be bypassed around map edges or via a second frontier',()=>{
 const {w,p}=fixture();
 for(const target of expected.deniedTargets)assert.equal(route(w,p,target),null);
});
test('gather, site capture, PvP and rally admission cannot replace routing with target-only checks',()=>{
 const {w,p}=fixture();
 const node=w.nodes.find(n=>n.x>80&&n.z>80);assert.ok(node);
 p.discovery.push({kind:'nodes',value:{...node}});
 assert.throws(()=>w.command(p,{type:'gather',targetId:node.id}),/authorized gate route/i);
 w.command(p,{type:'alliance-create',name:'Field route checks'});
 const site=w.sites.find(s=>s.x>80&&s.z>80);assert.ok(site);
 assert.throws(()=>w.command(p,{type:'capture',targetId:site.id}),/authorized gate route/i);
 const resources={wood:p.wood,gold:p.gold};p.homeZ=p.z=79;
 assert.throws(()=>w.command(p,{type:'flag',x:128,z:81}),/authorized gate route|accessible province/i);
 assert.deepEqual({wood:p.wood,gold:p.gold},resources);assert.equal(w.flags.length,0);p.homeZ=30;
 const session=w.join('Opponent'),q=w.authenticate(session.token);
 p.cityLevel=q.cityLevel=2;p.x=128;p.z=79;q.homeX=140;q.homeZ=30;q.x=128;q.z=81;
 p.deployed=q.deployed=true;
 // Reveal this real enemy with an explicit own-city sight fixture; no private command bypass.
 p.homeX=128;p.homeZ=70;
 assert.throws(()=>w.command(p,{type:'attack-player',targetId:q.id}),/authorized gate route|locked Divine Gate/i);
 p.x=p.homeX;p.z=p.homeZ;p.target=null;p.buildings.oathhall=1;
 const target=w.strongholds.find(t=>t.x>80&&t.z>80);assert.ok(target);
 assert.throws(()=>w.command(p,{type:'rally-create',targetId:target.id,count:10}),/authorized gate route/i);
});
test('two consecutive existing pass boundaries require both open allied gates and revoke safely',()=>{
 const {w,p}=fixture(20,20);w.command(p,{type:'alliance-create',name:'Route owners'});
 // Explicit stage/ownership fixtures; pass capture is not being certified by these tests.
 w.kingdom.completed=KINGDOM_STAGES.slice(0,2).map(s=>({id:s.id,atMs:w.activityClockMs,legacy:true,eligible:[]}));
 const east=w.sites.find(s=>s.id==='gate-east'),north=w.sites.find(s=>s.id==='gate-crown-south');
 east.allianceId=p.allianceId;
 assert.equal(route(w,p,{x:60,z:60}),null);
 north.allianceId=p.allianceId;
 assert.ok(route(w,p,{x:60,z:60}));w.command(p,{type:'move',x:60,z:60});
 w.tick(.25);north.allianceId='';const at={x:p.x,z:p.z};w.tick(.25);
 assert.equal(p.target,null);assert.deepEqual({x:p.x,z:p.z},at);
});
test('previously stranded army and its troops survive save/reload and fixed-home recall',()=>{
 const {w,p,s}=fixture();p.x=128;p.z=128;p.deployed=true;
 const before={troops:p.troops,units:{...p.units},reserves:p.reserveTroops,homeX:p.homeX,homeZ:p.homeZ};
 const restored=World.fromSave(w.toSave()),q=restored.authenticate(s.token);
 assert.deepEqual({troops:q.troops,units:q.units,reserves:q.reserveTroops,homeX:q.homeX,homeZ:q.homeZ},before);
 assert.deepEqual({x:q.x,z:q.z},{x:128,z:128});
 restored.command(q,{type:'return',x:250,z:250});
 for(let i=0;i<2000&&Math.hypot(q.x-q.homeX,q.z-q.homeZ)>1;i++)restored.tick(.25);
 assert.ok(Math.hypot(q.x-q.homeX,q.z-q.homeZ)<2);assert.equal(q.troops,before.troops);
 assert.doesNotThrow(()=>World.fromSave(restored.toSave()));
});
