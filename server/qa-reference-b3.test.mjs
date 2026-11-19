import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {QaReferenceWorld} from './qa-reference-world.mjs';
import {createQaReferenceGameServer} from './qa-reference-host.mjs';
import {syntheticCityProfile} from './testing/reference-city-fixtures.mjs';

const config=profile=>({qaOnly:true,profile:profile??syntheticCityProfile(),random:()=>.2});
const setup=profile=>{const options=config(profile),w=new QaReferenceWorld(options),s=w.join('B3 reference','greek');return {w,s,options};};
const own=(w,s)=>w.snapshot(s.playerId).players.find(p=>p.id===s.playerId).referenceCity;
let serial=0;
const command=(w,s,type,id='',extra={})=>w.command(w.authenticate(s.token),{type,targetId:id,requestId:'b3-'+(++serial),...extra});
const elapse=(w,seconds)=>w.advanceQaDowntime(0,Math.round(seconds*1000));
function fund(w,s){elapse(w,30);command(w,s,'qa-city-collect');}
function build(w,s,id){const q=own(w,s).buildings.find(b=>b.id===id);command(w,s,'qa-city-upgrade',id);elapse(w,q.seconds);}

test('expired paid upgrade completes at time zero before new-level production accrues',()=>{
 const {w,s,options}=setup();fund(w,s);build(w,s,'citadel');command(w,s,'qa-city-collect');command(w,s,'qa-city-upgrade','farm');
 const image=w.toSave();image.reference.engine.players[0][1].jobs[0].remaining=0; // Explicit expiry boundary, not earned progression proof.
 const restored=QaReferenceWorld.fromSave(image,options),before=own(restored,s).resources;
 restored.tick(.25);const after=own(restored,s);
 assert.equal(after.levels.farm,2);assert.equal(after.buildings.find(b=>b.id==='farm').stored,.5);
 assert.deepEqual(after.resources,before);assert.equal(after.jobs.length,0);
 restored.tick(.25);assert.equal(own(restored,s).buildings.find(b=>b.id==='farm').stored,1);
});

test('explicit supplied zero-second construction settles on acceptance without an unpersistable pending job',()=>{
 const profile=syntheticCityProfile();profile.buildings.find(b=>b.id==='academy').rows[0].seconds=0;
 const {w,s,options}=setup(profile);fund(w,s);const before=own(w,s).resources.food;command(w,s,'qa-city-upgrade','academy');
 assert.equal(own(w,s).levels.academy,1);assert.equal(own(w,s).jobs.length,0);assert.equal(own(w,s).resources.food,before-2);
 assert.deepEqual(own(QaReferenceWorld.fromSave(w.toSave(),options),s),own(w,s));
});

test('corrupt unit identities and impossible completed prerequisites are rejected on QA restore',()=>{
 const {w,s,options}=setup();fund(w,s);const saved=w.toSave();
 const unknown=structuredClone(saved);unknown.reference.engine.players[0][1].units.UNLISTED_UNIT=10;
 assert.throws(()=>QaReferenceWorld.fromSave(unknown,options),/unit identity/);
 const impossible=structuredClone(saved);impossible.reference.engine.players[0][1].levels.farm=25;
 assert.throws(()=>QaReferenceWorld.fromSave(impossible,options),/prerequisite/);
 assert.equal(own(w,s).levels.farm,1);
});

test('malformed legacy command type is a 400 client error through production HTTP',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'myth-B3-'));
 const host=createQaReferenceGameServer({qaOnly:true,profile:syntheticCityProfile(),savePath:join(directory,'qa.json')});
 const legacy=host.world.seedLegacyPlayer('Legacy HTTP');await new Promise(ok=>host.server.listen(0,ok));
 try{
  const url='http://127.0.0.1:'+host.server.address().port;
  const response=await fetch(url+'/command',{method:'POST',headers:{authorization:'Bearer '+legacy.token,'content-type':'application/json'},body:JSON.stringify({type:42})});
  assert.equal(response.status,400);assert.match((await response.json()).error,/command type/i);
 }finally{host.server.closeIdleConnections();await new Promise(ok=>host.server.close(ok));assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep+'myth-B3-'));rmSync(directory,{recursive:true,force:true});}
});

test('multiplayer production HTTP serializes concurrent payments, four trainers, queue lanes and persisted retries',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'myth-B3-matrix-')),file=join(directory,'qa.json'),profile=syntheticCityProfile();
 const host=createQaReferenceGameServer({qaOnly:true,profile,savePath:file});
 // Deterministic server clock for network races; no player clock/grant route.
 host.world.tick=()=>{};
 const legacy=host.world.seedLegacyPlayer('B3 legacy','egyptian');await new Promise(ok=>host.server.listen(0,ok));
 const base='http://127.0.0.1:'+host.server.address().port,trace=[];let requests=0;
 const api=async(path,data,session)=>{
  const r=await fetch(base+path,{method:data?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+(session?.token??'')},body:data?JSON.stringify(data):undefined});
  requests++;const body=await r.json();return {status:r.status,body};
 };
 const post=async(s,type,id='',extra={})=>{const c={type,targetId:id,requestId:'matrix-'+(++serial),...extra},r=await api('/command',c,s);trace.push({type,status:r.status});return r;};
 const snapshot=async s=>{const r=await api('/world',null,s);assert.equal(r.status,200);return r.body.players.find(p=>p.id===s.playerId);};
 const run=seconds=>elapse(host.world,seconds);
 try{
  const a=(await api('/join',{name:'B3 HTTP A',civilization:'greek',profile:'ordinary'})).body;
  const b=(await api('/join',{name:'B3 HTTP B',civilization:'norse'})).body;
  assert.equal((await api('/world')).status,401);
  let sa=await snapshot(a),sb=await snapshot(b);assert.equal(sa.referenceCity.buildings.length,11);assert.equal(sa.food,0);assert.equal(sb.food,0);
  assert.equal(sa.civilization,'greek');assert.equal(sb.civilization,'norse');assert.notDeepEqual([sa.homeX,sa.homeZ],[sb.homeX,sb.homeZ]);
  assert.equal((await api('/world',null,b)).body.players.find(p=>p.id===a.playerId).referenceCity,undefined);
  for(const type of [42,null,{},[],true,''])assert.equal((await api('/command',{type},legacy)).status,400);
  run(30);assert.equal((await post(a,'qa-city-collect')).status,200);
  const bank=(await snapshot(a)).food;
  assert.equal((await post(a,'qa-city-upgrade','farm')).status,400);assert.equal((await snapshot(a)).food,bank);
  assert.equal((await post(a,'qa-city-research','test-writing')).status,400);
  const upgrade={type:'qa-city-upgrade',targetId:'citadel',requestId:'concurrent-same-order'};
  const duplicates=await Promise.all(Array.from({length:12},()=>api('/command',upgrade,a)));
  assert.ok(duplicates.every(r=>r.status===200));sa=await snapshot(a);assert.equal(sa.food,bank-4);assert.equal(sa.referenceCity.jobs.length,1);
  assert.equal((await api('/command',{...upgrade,targetId:'academy'},a)).status,400);run(2);
  for(const pair of [['barracks','archery'],['stable','siege'],['academy','market']]){
   const built=await Promise.all(pair.map(id=>post(a,'qa-city-upgrade',id)));assert.ok(built.every(r=>r.status===200));
   assert.equal((await post(a,'qa-city-upgrade','farm')).status,400,'two construction workers occupied');run(1);
  }
  run(30);await post(a,'qa-city-collect');sa=await snapshot(a);const paidBefore=sa.food;
  const facilities=['barracks','archery','stable','siege'];
  const orders=facilities.map(id=>({type:'qa-city-train',targetId:id,count:3,requestId:'training-'+id}));
  const trained=await Promise.all(orders.map(c=>api('/command',c,a)));assert.ok(trained.every(r=>r.status===200));
  sa=await snapshot(a);assert.equal(sa.food,paidBefore-24);assert.equal(sa.referenceCity.jobs.filter(j=>j.type==='training').length,4);
  for(const count of [-1,0,11,Number.MAX_SAFE_INTEGER])assert.equal((await post(a,'qa-city-train','barracks',{count})).status,400);
  assert.equal((await post(a,'qa-city-train','barracks',{count:1})).status,400);
  assert.equal((await post(a,'qa-city-train','barracks',{count:1,playerId:b.playerId})).status,400);
  const lanes=await Promise.all([post(a,'qa-city-research','test-writing'),post(a,'qa-city-upgrade','farm'),post(a,'qa-city-upgrade','lumber')]);
  assert.ok(lanes.every(r=>r.status===200));sa=await snapshot(a);assert.equal(sa.referenceCity.jobs.length,7);
  assert.equal((await post(a,'qa-city-research','test-writing')).status,400);
  const transferBefore=sa.food,receiverBefore=(await snapshot(b)).food,amount=Math.floor(transferBefore/1.1);assert.ok(amount>0);
  const tax=Math.ceil(amount/10),debit=amount+tax;assert.ok(debit<=transferBefore&&2*debit>transferBefore);
  const transfers=await Promise.all([post(a,'qa-city-transfer',b.playerId,{count:amount,name:'food'}),post(a,'qa-city-transfer',b.playerId,{count:amount,name:'food'})]);
  assert.deepEqual(transfers.map(r=>r.status).sort(),[200,400]);assert.equal((await snapshot(a)).food,transferBefore-debit);assert.equal((await snapshot(b)).food,receiverBefore+amount);
  assert.equal((await post(legacy,'alliance-create','',{name:'B3 shared alliance'})).status,200);
  const alliance=host.world.authenticate(legacy.token).allianceId;assert.equal((await post(a,'alliance-join',alliance)).status,200);
  const units=structuredClone(host.world.authenticate(legacy.token).units),position=[sa.homeX,sa.homeZ];
  for(const type of ['resource-transfer','attack-player','reinforce','garrison-join'])assert.equal((await post(legacy,type,a.playerId,{count:1,name:'food'})).status,400);
  assert.equal((await post(a,'qa-city-transfer',legacy.playerId,{count:1,name:'food'})).status,400);
  assert.equal((await post(a,'move','',{x:10,z:10})).status,400);
  assert.deepEqual(host.world.authenticate(legacy.token).units,units);
  const persisted=JSON.parse(readFileSync(file,'utf8')),restored=QaReferenceWorld.fromSave(persisted,config(profile));
  const current=own(restored,a);assert.equal(current.jobs.length,7);assert.deepEqual(current.jobs,sa.referenceCity.jobs);
  elapse(restored,20);const done=own(restored,a);
  assert.equal(done.levels.farm,2);assert.equal(done.levels.lumber,2);assert.equal(done.technologies['test-writing'],1);assert.equal(done.jobs.length,0);
  const sorted=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
  const expected=sorted(facilities.map(id=>({id:'TEST_ONLY_'+id,count:3})));
  assert.deepEqual(sorted(done.reserves),expected);
  const resources=structuredClone(done.resources);
  restored.command(restored.authenticate(a.token),orders[0]);
  assert.deepEqual(own(restored,a).resources,resources);
  elapse(restored,20);assert.deepEqual(sorted(own(restored,a).reserves),expected);
  assert.deepEqual(restored.authenticate(legacy.token).units,units);
  assert.equal(restored.authenticate(a.token).allianceId,alliance);
  const restoredPlayer=restored.snapshot(a.playerId).players.find(p=>p.id===a.playerId);
  assert.deepEqual([restoredPlayer.homeX,restoredPlayer.homeZ],position);
  assert.ok(Object.values(own(restored,a).resources).every(n=>n>=0));
  mkdirSync('work/task7-b3',{recursive:true});
  writeFileSync('work/task7-b3/http-matrix.json',JSON.stringify({classification:'TEST_ONLY synthetic supplied values; actual production HTTP routes',requests,duplicateRequests:12,simultaneousTrainingFacilities:4,parallelPaidJobs:7,completedReserveUnits:12,restart:'saved envelope reload',normalActivation:false,trace},null,2)+'\n');
 }finally{host.server.closeIdleConnections();await new Promise(ok=>host.server.close(ok));assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep+'myth-B3-matrix-'));rmSync(directory,{recursive:true,force:true});}
});
