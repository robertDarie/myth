import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { route, travel, CORRIDORS } from './navigation.mjs';
import { visible, explorationTick } from './exploration.mjs';
const setup=()=>{const w=testWorld(),sessions=['Explorer','Ally','Enemy'].map(n=>w.join(n));return {w,sessions,players:sessions.map(s=>w.authenticate(s.token))};};
const cmd=(w,p,type,extra={})=>w.command(p,{type,...extra});
const advance=(w,seconds)=>{for(let i=0;i<seconds*10;i++)w.tick(0.1);};
const gates=(w,p)=>{cmd(w,p,'alliance-create',{name:'Pathfinders'});for(const s of w.sites.filter(s=>s.kind==='gate'))s.allianceId=p.allianceId;};

test('gate routes cross province walls only at controlled corridors and do not stall inside a passage',()=>{
 const {w,players:[p]}=setup();assert.equal(route(w,p,{x:65,z:65}),null);gates(w,p);
 const path=route(w,p,{x:65,z:65});assert.ok(path.length>=5);
 cmd(w,p,'move',{x:65,z:65});let before={x:p.x,z:p.z},crossings=[];
 for(let i=0;i<1000&&p.target;i++){
  w.tick(0.1);if((before.x>40)!==(p.x>40))crossings.push({axis:'x',at:p.z});if((before.z>40)!==(p.z>40))crossings.push({axis:'z',at:p.x});before={x:p.x,z:p.z};
 }
 assert.equal(p.target,null);assert.ok(Math.hypot(p.x-65,p.z-65)<0.001);assert.equal(crossings.length,2);
 for(const c of crossings)assert.ok(Math.min(Math.abs(c.at-20),Math.abs(c.at-60))<0.001);
});

test('losing gates stops outward orders while a stranded army returns through corridors at legal speed',()=>{
 const {w,players:[p]}=setup();gates(w,p);p.x=65;p.z=65;
 for(const s of w.sites.filter(s=>s.kind==='gate'))s.allianceId='';
 assert.throws(()=>cmd(w,p,'move',{x:60,z:60}),/Gate/);cmd(w,p,'return');
 let last={x:p.x,z:p.z};for(let i=0;i<1000&&p.target;i++){w.tick(0.1);assert.ok(Math.hypot(p.x-last.x,p.z-last.z)<=w.stats(p).speed*0.1+0.0001);last={x:p.x,z:p.z};}
 assert.equal(p.target,null);assert.equal(p.x,p.homeX);assert.equal(p.z,p.homeZ);
});

test('all four corridors support movement in both directions including fractional portal positions',()=>{
 const {w,players:[p]}=setup();gates(w,p);
 for(const c of CORRIDORS)for(const [a,b]of[[c.a,c.b],[c.b,c.a]]){
  p.x=a.x;p.z=a.z;const d={x:b.x+(b.x-a.x)*2,z:b.z+(b.z-a.z)*2};
  for(let i=0;i<100;i++)if(travel(w,p,d,4,0.1))break;
  assert.ok(Math.hypot(p.x-d.x,p.z-d.z)<0.001);
 }
});

test('scout missions reveal land, record arrival-time intelligence once, return and preserve army slots and troops',()=>{
 const {w,players:[p,,enemy]}=setup();enemy.x=30;enemy.z=25;const count=p.troops,marches=w.armies().length;
 const initial=w.snapshot(p.id);assert.equal(initial.armies.some(a=>a.id===enemy.id),false);
 cmd(w,p,'scout-send',{x:30,z:25});const id=p.scouts[0].id;
 assert.throws(()=>cmd(w,p,'scout-send',{x:20,z:20}),/already/);
 advance(w,6);assert.equal(p.scoutReports.length,1);assert.equal(p.scoutReports[0].armies[0].id,enemy.id);assert.equal(p.scouts[0].phase,'Returning');
 const report=structuredClone(p.scoutReports[0]),explored=p.explored.length;enemy.x=35;advance(w,8);
 assert.equal(p.scouts.length,0);assert.deepEqual(p.scoutReports[0],report);assert.equal(p.troops,count);assert.equal(w.armies().length,marches);assert.ok(p.explored.length>=explored&&explored>initial.exploration.explored.length);
 assert.throws(()=>cmd(w,p,'scout-recall',{targetId:id}),/no longer/);
 const snapshot=w.snapshot(p.id);assert.equal(snapshot.armies.some(a=>a.id===enemy.id),false);assert.equal(snapshot.exploration.reports.length,1);
});

test('allied vision is shared live; leaving removes that vision without deleting personal map memory or sharing reports',()=>{
 const {w,players:[p,ally,enemy]}=setup();gates(w,p);cmd(w,ally,'alliance-join',{targetId:p.allianceId});ally.x=30;ally.z=30;enemy.x=31;enemy.z=30;explorationTick(w,0);
 assert.equal(visible(w,p,enemy),true);assert.ok(w.snapshot(p.id).armies.some(a=>a.id===enemy.id));const explored=[...p.explored];
 assert.equal(w.snapshot(ally.id).players.find(a=>a.id===p.id).scoutReports,undefined);
 cmd(w,ally,'alliance-leave');assert.equal(visible(w,p,enemy),false);assert.equal(w.snapshot(p.id).armies.some(a=>a.id===enemy.id),false);assert.deepEqual(p.explored,explored);
});

test('fog excludes hidden armies, camp state, enemy orders, garrisons and global battle events',()=>{
 const {w,players:[p,,enemy]}=setup();enemy.x=30;enemy.z=30;enemy.target={type:'move',x:35,z:35};w.event('Secret battle at 30,30');
 let snap=w.snapshot(p.id);assert.equal(snap.armies.some(a=>a.id===enemy.id),false);assert.equal(snap.camps.length,0);assert.equal(snap.events.length,0);assert.equal(snap.sites.find(s=>s.id==='first-sanctuary'),undefined);
 assert.throws(()=>cmd(w,p,'attack-player',{targetId:enemy.id}),/vision/);
 p.x=30;p.z=30;snap=w.snapshot(p.id);const seen=snap.armies.find(a=>a.id===enemy.id);assert.equal(seen.hasOrder,false);assert.deepEqual(seen.route,[]);assert.equal(seen.targetX,enemy.x);
 assert.equal(snap.players.find(a=>a.id===enemy.id).x,enemy.homeX);
});

test('recall, gate loss and restart retain scouts safely without replaying rewards or completed reports',()=>{
 const {w,sessions,players:[p]}=setup();gates(w,p);cmd(w,p,'scout-send',{x:65,z:65});advance(w,1);
 let restored=World.fromSave(w.toSave()),q=restored.authenticate(sessions[0].token);assert.equal(q.scouts.length,1);assert.deepEqual(q.explored,p.explored);
 for(const s of restored.sites.filter(s=>s.kind==='gate'))s.allianceId='';advance(restored,0.1);assert.equal(q.scouts[0].phase,'Returning');advance(restored,10);assert.equal(q.scouts.length,0);assert.equal(q.scoutReports.length,0);
 cmd(restored,q,'scout-send',{x:30,z:30});cmd(restored,q,'scout-recall',{targetId:q.scouts[0].id});advance(restored,0.1);assert.equal(q.scouts.length,0);
 for(const mutate of [p=>p.explored=[-1],p=>p.explored=[1,1],p=>p.scouts=[{id:'bad'}],p=>p.scoutReports=[{}]]){const bad=w.toSave();mutate(bad.world.players[0]);assert.throws(()=>World.fromSave(bad),/scout|exploration/);}
 const old=w.toSave();old.schema=6;for(const p of old.world.players){delete p.explored;delete p.scout;delete p.scouts;delete p.scoutReports;delete p.autoExplore;}restored=World.fromSave(old);assert.equal(restored.toSave().schema,18);assert.ok(restored.authenticate(sessions[0].token).explored.length>0);assert.equal(restored.authenticate(sessions[0].token).buildings.scoutcamp,1);
});

test('garrisons and rally centers obey the same gate corridors as ordinary marches',()=>{
 const {w,players:[p,ally,enemy]}=setup();p.cityLevel=ally.cityLevel=enemy.cityLevel=2;p.buildings.oathhall=1;gates(w,p);
 const target=w.sites.find(s=>s.id==='shrine-life');target.allianceId=p.allianceId;
 cmd(w,p,'garrison-join',{targetId:target.id});let last={x:p.x,z:p.z},crossings=[];
 for(let i=0;i<1000&&p.state!=='Garrisoned';i++){w.tick(0.1);if((last.x>40)!==(p.x>40))crossings.push(p.z);if((last.z>40)!==(p.z>40))crossings.push(p.x);last={x:p.x,z:p.z};}
 assert.equal(p.state,'Garrisoned');assert.equal(crossings.length,2);for(const at of crossings)assert.ok(Math.min(Math.abs(at-20),Math.abs(at-60))<0.001);
 cmd(w,p,'garrison-leave');advance(w,60);assert.ok(w.atHome(p));
 cmd(w,enemy,'alliance-create',{name:'Rival'});target.allianceId=enemy.allianceId;
 w.flags.push({id:'forward-supply',allianceId:p.allianceId,x:49,z:48,health:250,maxHealth:250,isRoot:true,buildRemaining:0,connected:true});
 cmd(w,p,'rally-create',{targetId:target.id});crossings=[];last={x:p.x,z:p.z};
 for(let i=0;i<1200&&!w.sieges.length;i++){w.tick(0.1);if((last.x>40)!==(p.x>40))crossings.push(p.z);if((last.z>40)!==(p.z>40))crossings.push(p.x);last={x:p.x,z:p.z};}
 assert.equal(w.sieges.length,1);assert.equal(crossings.length,2);for(const at of crossings)assert.ok(Math.min(Math.abs(at-20),Math.abs(at-60))<0.001);
});

test('authenticated HTTP does not expose hidden troops or another city scouting history',async t=>{
 const {createGameServer}=await import('./http.mjs');const {server,world:w}=createGameServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const sessions=await Promise.all(['HTTP Scout','HTTP Hidden'].map(async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json()));
 const [p,enemy]=sessions.map(s=>w.authenticate(s.token));enemy.x=30;enemy.z=25;
 const post=(i,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+sessions[i].token},body:JSON.stringify(body)});
 const get=async i=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+sessions[i].token}})).json();
 assert.equal((await get(0)).armies.some(a=>a.id===enemy.id),false);
 assert.equal((await post(0,{type:'attack-player',targetId:enemy.id})).status,400);
 assert.equal((await post(0,{type:'scout-send',x:30,z:25})).status,200);advance(w,6);
 let snap=await get(0);assert.equal(snap.exploration.reports.length,1);assert.ok(snap.armies.some(a=>a.id===enemy.id));
 snap=await get(1);assert.equal(snap.exploration.reports.length,0);const foreign=snap.players.find(a=>a.id===p.id);assert.equal(foreign.scoutReports,undefined);assert.equal(foreign.scout,undefined);assert.equal(foreign.explored,undefined);
 advance(w,8);assert.equal((await get(0)).armies.some(a=>a.id===enemy.id),false);
});

test('a stranded march cannot silently wait on an unreachable friendly garrison route',()=>{
 const {w,players:[p]}=setup();p.cityLevel=2;gates(w,p);const shrine=w.sites.find(s=>s.id==='shrine-dawn');shrine.allianceId=p.allianceId;
 p.x=55;p.z=20;w.sites.find(s=>s.id==='gate-east').allianceId='';
 assert.throws(()=>cmd(w,p,'garrison-join',{targetId:shrine.id}),/route/);
 cmd(w,p,'move',{x:20,z:20});w.tick(0.1);assert.equal(p.target,null);assert.equal(p.state,'Route locked');
 cmd(w,p,'return');advance(w,40);assert.ok(w.atHome(p));
});
