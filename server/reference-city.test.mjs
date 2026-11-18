import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ReferenceCityEngine} from './reference-city.mjs';
import {createExperimentalCityServer,saveExperimentalCity,loadExperimentalCity} from './reference-city-http.mjs';
import {syntheticCityProfile,preparedQuarryingProfile} from './testing/reference-city-fixtures.mjs';
import {World} from './world.mjs';
let serial=0;const command=(e,s,type,extra={})=>e.command(s.token,{requestId:'test-'+(++serial),type,...extra});
const setup=profile=>{const p=profile??syntheticCityProfile(),e=new ReferenceCityEngine(p,{experimental:true}),s=e.join('Synthetic governor');return {p,e,s};};
function fund(e,s){e.tick(30);command(e,s,'collect');}
function build(e,s,id){const q=e.snapshot(s.token).buildings.find(b=>b.id===id);command(e,s,'building-upgrade',{targetId:id});e.tick(q.seconds);}
test('experimental opt-in and complete explicit tables are mandatory; fixture numbers never labeled VERIFIED',()=>{
 const p=syntheticCityProfile();assert.throws(()=>new ReferenceCityEngine(p),/opt-in/);
 for(const alter of [p=>p.buildings[0].rows.pop(),p=>p.buildings[0].rows[2].prerequisites=null,p=>p.buildings[0].rows[3].classification='UNKNOWN',p=>delete p.buildings[0].rows[4].cost.gold,p=>delete p.buildings[1].rows[0].effects.production]){
  const q=structuredClone(p);alter(q);
  assert.throws(()=>new ReferenceCityEngine(q,{experimental:true}));
 }
 const cyclic=structuredClone(p);cyclic.buildings[0].rows[1].prerequisites=[{id:'academy',level:2}];assert.throws(()=>new ReferenceCityEngine(cyclic,{experimental:true}),/Cyclic/);
});
test('collection, production capacity, exact payments, prerequisites, worker occupancy and replay',()=>{
 const {e,s}=setup();const start=e.snapshot(s.token);assert.equal(start.resources.food,0);
 assert.throws(()=>command(e,s,'building-upgrade',{targetId:'academy'}),/resources/);
 e.tick(2000);let q=e.snapshot(s.token);assert.equal(q.resources.food,0);assert.equal(q.buildings.find(b=>b.id==='farm').stored,1000);
 command(e,s,'collect');q=e.snapshot(s.token);assert.equal(q.resources.food,1000);
 const c={requestId:'one-upgrade',type:'building-upgrade',targetId:'citadel'};e.command(s.token,c);const paid=e.snapshot(s.token);assert.equal(paid.resources.food,996);assert.equal(paid.jobs[0].duration,2);assert.deepEqual(e.command(s.token,c),{accepted:true,experimental:true});assert.equal(e.snapshot(s.token).resources.food,996);
 assert.throws(()=>e.command(s.token,{...c,targetId:'academy'}),/different command/);assert.throws(()=>command(e,s,'building-upgrade',{targetId:'academy'}),/Worker/);e.tick(2);
 assert.equal(e.snapshot(s.token).effects.workers,2);command(e,s,'building-upgrade',{targetId:'academy'});command(e,s,'building-upgrade',{targetId:'market'});
 assert.throws(()=>command(e,s,'building-upgrade',{targetId:'stable'}),/Worker/);e.tick(1);assert.equal(e.snapshot(s.token).levels.academy,1);
 assert.throws(()=>command(e,s,'building-upgrade',{targetId:'citadel'}),/prerequisite/);
});
test('paid training retains its original facility quote after an intervening upgrade and restart',()=>{
 const profile=syntheticCityProfile();
 const upgraded=profile.buildings.find(b=>b.id==='barracks').rows[1].effects.training;
 upgraded.seconds=9;upgraded.cost.food=8;
 const {p,e,s}=setup(profile);fund(e,s);build(e,s,'citadel');build(e,s,'barracks');
 command(e,s,'train',{targetId:'barracks',quantity:3});
 command(e,s,'building-upgrade',{targetId:'barracks'});e.tick(2);
 assert.equal(e.snapshot(s.token).levels.barracks,2);
 const restored=ReferenceCityEngine.fromSave(e.toSave(),p,{experimental:true});
 assert.equal(restored.snapshot(s.token).jobs[0].paid.food,6);
 restored.tick(4);assert.equal(restored.snapshot(s.token).units.TEST_ONLY_barracks,3);
});

test('four independent training facilities create conserved experimental reserves and survive disk restart',()=>{
 const {p,e,s}=setup();fund(e,s);for(const id of ['barracks','archery','stable','siege'])build(e,s,id);fund(e,s);
 const before=e.snapshot(s.token).resources;
 for(const id of ['barracks','archery','stable','siege'])command(e,s,'train',{targetId:id,quantity:3,requestId:'train-'+id});
 assert.equal(e.snapshot(s.token).jobs.length,4);assert.equal(e.snapshot(s.token).resources.food,before.food-24);
 assert.throws(()=>command(e,s,'train',{targetId:'barracks',quantity:11}),/capacity/);
 assert.throws(()=>command(e,s,'train',{targetId:'barracks',quantity:1}),/occupied/);
 e.tick(2);const dir=mkdtempSync(join(tmpdir(),'myth B1 ')),file=join(dir,'experimental.json');
 try{
  saveExperimentalCity(file,e);const restored=loadExperimentalCity(file,p);assert.deepEqual(restored.snapshot(s.token),e.snapshot(s.token));
  restored.command(s.token,{requestId:'train-barracks',type:'train',targetId:'barracks',quantity:3});assert.deepEqual(restored.snapshot(s.token),e.snapshot(s.token));restored.advanceOffline(4);
  assert.deepEqual(restored.snapshot(s.token).units,{TEST_ONLY_barracks:3,TEST_ONLY_archery:3,TEST_ONLY_stable:3,TEST_ONLY_siege:3});restored.tick(10);assert.equal(restored.snapshot(s.token).units.TEST_ONLY_siege,3);
  const bad=e.toSave();bad.players[0][1].jobs[0].paid.food=0;assert.throws(()=>ReferenceCityEngine.fromSave(bad,p,{experimental:true}),/paid cost/);
  writeFileSync(file,JSON.stringify({schema:28,world:{}}));const original=readFileSync(file);assert.throws(()=>saveExperimentalCity(file,e),/normal or unknown/);assert.deepEqual(readFileSync(file),original);
 }finally{assert.ok(dir.startsWith(join(tmpdir(),'myth B1 ')));rmSync(dir,{recursive:true,force:true});}
});
test('prepared published Quarrying quote has actual60second job/power/unlock effect; NOT birth progression',()=>{
 const {p,e,s}=setup(preparedQuarryingProfile());const q=e.snapshot(s.token),research=q.research[0];assert.deepEqual(research.cost,{food:100,wood:100,stone:0,gold:0});assert.equal(research.seconds,60);
 command(e,s,'research',{targetId:'quarrying'});assert.equal(e.snapshot(s.token).resources.food,0);assert.throws(()=>command(e,s,'research',{targetId:'quarrying'}),/queued|occupied/);
 e.tick(59);assert.equal(e.snapshot(s.token).effects.stoneGatheringUnlocked,false);const restored=ReferenceCityEngine.fromSave(e.toSave(),p,{experimental:true});restored.tick(1);
 assert.equal(restored.snapshot(s.token).effects.stoneGatheringUnlocked,true);assert.equal(restored.snapshot(s.token).power,q.power+5);assert.throws(()=>command(restored,s,'research',{targetId:'quarrying'}),/Maximum/);
});
test('research effects use the explicit synthetic modifier policy; lanes and trade accounting reject foreign mutations',()=>{
 const {e,s}=setup();fund(e,s);build(e,s,'academy');const q=e.snapshot(s.token).research[0];command(e,s,'research',{targetId:'test-writing'});assert.equal(e.snapshot(s.token).jobs[0].duration,q.seconds);e.tick(q.seconds);
 const upgrade=e.snapshot(s.token).buildings.find(b=>b.id==='citadel');assert.equal(upgrade.seconds,2/1.1);build(e,s,'market');const other=e.join('Receiver');const before=e.snapshot(s.token).resources.food;
 const result=command(e,s,'transfer',{targetPlayerId:other.playerId,resource:'food',amount:10});assert.equal(result.tax,1);assert.equal(e.snapshot(other.token).resources.food,10);assert.equal(e.snapshot(s.token).resources.food,before-11);
 assert.throws(()=>command(e,s,'collect',{playerId:other.playerId}),/Foreign/);assert.equal(e.snapshot(other.token).resources.food,10);
});
test('full synthetic1–25 progression uses production/collection and authoritative upgrade commands only',()=>{
 const {p,e,s}=setup();let operations=0;
 for(let level=2;level<=25;level++){
  fund(e,s);
  for(const id of ['farm','academy'])while(e.snapshot(s.token).levels[id]<level-1){fund(e,s);build(e,s,id);operations++;}
  build(e,s,'citadel');operations++;
 }
 for(const id of p.buildings.map(b=>b.id).filter(id=>id!=='citadel'))while(e.snapshot(s.token).levels[id]<25){fund(e,s);build(e,s,id);operations++;}
 const final=e.snapshot(s.token);assert.ok(Object.values(final.levels).every(v=>v===25));assert.equal(final.buildings.length,11);assert.equal(final.normalActivation,false);assert.equal(final.evidenceKind,'SYNTHETIC');
 const restored=ReferenceCityEngine.fromSave(e.toSave(),p,{experimental:true});assert.deepEqual(restored.snapshot(s.token),final);assert.throws(()=>command(restored,s,'building-upgrade',{targetId:'citadel'}),/Maximum/);
 console.log(JSON.stringify({syntheticOnly:true,buildings:11,maximum:25,paidUpgradeCommands:operations,simulatedSeconds:final.time,normalReferenceParity:false}));
});
test('normal legacy World and schema remain unchanged and cannot be loaded into experimental authority',()=>{
 const w=new World({random:()=>.1}),s=w.join('Legacy unchanged'),before=w.toSave();const {e}=setup();e.tick(10000);assert.deepEqual(w.toSave(),before);assert.throws(()=>ReferenceCityEngine.fromSave(before,syntheticCityProfile(),{experimental:true}),/Incompatible/);
 assert.equal(w.authenticate(s.token).cityLevel,1);
});
test('offline production splits at completion and preserves per-building uncollected capacity',()=>{
 const {e,s}=setup();fund(e,s);build(e,s,'citadel');command(e,s,'collect');
 command(e,s,'building-upgrade',{targetId:'farm'});const bank=e.snapshot(s.token).resources.food;
 e.advanceOffline(10);let q=e.snapshot(s.token);assert.equal(q.levels.farm,2);assert.equal(q.buildings.find(b=>b.id==='farm').stored,18);assert.equal(q.resources.food,bank);
 e.advanceOffline(7200);q=e.snapshot(s.token);assert.equal(q.buildings.find(b=>b.id==='farm').stored,2000);assert.equal(q.resources.food,bank);
});
test('real loopback HTTP authenticates commands, exposes no client tick or normal-game route',async()=>{
 const host=createExperimentalCityServer({profile:syntheticCityProfile(),allowExperimental:true}),address=await host.listen(),base='http://127.0.0.1:'+address.port;
 try{
  assert.equal((await fetch(base+'/experimental/city')).status,401);assert.equal((await fetch(base+'/join',{method:'POST'})).status,404);
  const response=await fetch(base+'/experimental/join',{method:'POST',body:JSON.stringify({name:'HTTP fixture'})}),s=await response.json();
  const headers={authorization:'Bearer '+s.token};assert.equal((await fetch(base+'/experimental/city',{headers})).status,200);
  assert.equal((await fetch(base+'/experimental/tick',{method:'POST',headers})).status,404);
  host.engine.tick(10);const collect=await fetch(base+'/experimental/command',{method:'POST',headers,body:JSON.stringify({requestId:'collect-http',type:'collect'})});assert.equal(collect.status,200);
  const q=await(await fetch(base+'/experimental/city',{headers})).json();assert.equal(q.resources.food,10);assert.equal(q.experimental,true);assert.equal('sessions'in q,false);
 }finally{host.server.closeIdleConnections();await new Promise(ok=>host.server.close(ok));}
});
