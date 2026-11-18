import test from 'node:test';
import assert from 'node:assert/strict';
import {QaReferenceWorld} from './qa-reference-world.mjs';
import {syntheticCityProfile} from './testing/reference-city-fixtures.mjs';
import {World} from './world.mjs';
import {QaReferenceStore,createQaReferenceGameServer} from './qa-reference-host.mjs';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';

const options=()=>({qaOnly:true,profile:syntheticCityProfile(),random:()=>.2});
const setup=()=>{const w=new QaReferenceWorld(options()),s=w.join('Reference QA','greek');return {w,s};};
const own=(w,s)=>w.snapshot(s.playerId).players.find(p=>p.id===s.playerId);
let request=0;
const send=(w,s,type,targetId='',extra={})=>w.command(w.authenticate(s.token),{type,targetId,requestId:'b2-'+(++request),...extra});
const fund=(w,s)=>{for(let i=0;i<120;i++)w.tick(.25);send(w,s,'qa-city-collect');};
function build(w,s,id){const row=own(w,s).referenceCity.buildings.find(b=>b.id===id);send(w,s,'qa-city-upgrade',id);w.advanceQaDowntime(0,Math.round(row.seconds*1000));}
function temporary(action){const directory=mkdtempSync(join(tmpdir(),'myth-B2-'));return Promise.resolve().then(()=>action(directory)).finally(()=>{assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep+'myth-B2-'));rmSync(directory,{recursive:true,force:true});});}

test('real World identity, civilization and authoritative resources drive isolated QA city commands',()=>{
 assert.throws(()=>new QaReferenceWorld({profile:syntheticCityProfile()}),/QA/);
 const {w,s}=setup();let p=own(w,s);assert.equal(p.civilization,'greek');assert.equal(p.referenceCity.playerId,s.playerId);assert.equal(p.food,0);
 fund(w,s);p=own(w,s);assert.equal(p.food,30);assert.equal(p.referenceCity.resources.food,30);
 send(w,s,'qa-city-upgrade','citadel');assert.equal(own(w,s).food,26);
 for(let i=0;i<8;i++)w.tick(.25);assert.equal(own(w,s).referenceCity.buildings.find(b=>b.id==='citadel').level,2);
 assert.equal(w.players.get(s.playerId).cityLevel,1,'legacy policy fields never reinterpreted');
});

test('real alliance membership coexists with legacy progress while unsafe cross-profile interactions fail unchanged',()=>{
 const {w,s}=setup(),legacy=w.seedLegacyPlayer('Legacy founder','egyptian');
 const commands=(type,extra={})=>send(w,legacy,type,'',extra);
 commands('alliance-create',{name:'Mixed QA'});const alliance=w.authenticate(legacy.token).allianceId;
 const before=structuredClone(w.authenticate(legacy.token)),beforeCapacity=own(w,legacy).marchTroopCap;
 send(w,s,'alliance-join',alliance);assert.equal(w.authenticate(s.token).allianceId,alliance);
 assert.equal(w.authenticate(legacy.token).gold,before.gold);
 for(const type of ['resource-transfer','attack-player','reinforce','garrison-join']){
  const state=JSON.stringify(w.toSave());assert.throws(()=>send(w,legacy,type,s.playerId,{count:10,name:'food'}),/Cross-profile/);assert.equal(JSON.stringify(w.toSave()),state);
 }
 for(const type of ['move','train','reinforce','research','quest','alliance-create'])assert.throws(()=>send(w,s,type,'',{x:12,z:12,name:'Blocked'}),/BLOCKED/);
 assert.deepEqual(w.authenticate(legacy.token).units,before.units);assert.deepEqual(w.authenticate(legacy.token).technologies,before.technologies);
 assert.equal(own(w,legacy).marchTroopCap,beforeCapacity);
 send(w,s,'alliance-leave');assert.equal(w.authenticate(s.token).allianceId,'');
});

test('same-profile transfers, private snapshots, research and quarantined training conserve actual ledgers',()=>{
 const {w,s}=setup(),other=w.join('Reference other','greek'),legacy=w.seedLegacyPlayer('Legacy observer');
 fund(w,s);build(w,s,'market');const beforeA=own(w,s).food,beforeB=own(w,other).food;
 send(w,s,'qa-city-transfer',other.playerId,{count:10,name:'food'});
 assert.equal(own(w,s).food,beforeA-11);assert.equal(own(w,other).food,beforeB+10);
 assert.throws(()=>send(w,s,'qa-city-transfer',legacy.playerId,{count:1,name:'food'}),/Cross-profile/);
 build(w,s,'academy');build(w,s,'barracks');const legacyBefore=structuredClone(w.authenticate(legacy.token));
 const ownUnits=structuredClone(w.authenticate(s.token).units);
 send(w,s,'qa-city-research','test-writing');send(w,s,'qa-city-train','barracks',{count:1});w.advanceQaDowntime(0,10000);
 const p=own(w,s);assert.equal(p.referenceCity.reserves[0].count,1);assert.deepEqual(w.authenticate(s.token).units,ownUnits);
 assert.deepEqual(w.authenticate(legacy.token).technologies,legacyBefore.technologies);assert.deepEqual(w.authenticate(legacy.token).units,legacyBefore.units);
 const foreign=w.snapshot(other.playerId).players.find(p=>p.id===s.playerId);assert.equal(foreign.referenceCity,undefined);
 assert.ok(!JSON.stringify(w.snapshot(other.playerId)).includes(w.qaReferenceState.bindings[s.playerId].token));
});

test('profile/clock/foreign actor, negative amounts and receipt-replay exploits cannot spend twice',()=>{
 const {w,s}=setup();fund(w,s);
 for(const extra of [{profile:'legacy'},{time:1e9},{levels:{citadel:25}},{resources:{food:1e9}},{playerId:'foreign'},{marchId:'foreign'}]){
  const before=JSON.stringify(w.toSave());assert.throws(()=>send(w,s,'qa-city-upgrade','citadel',extra));assert.equal(JSON.stringify(w.toSave()),before);
 }
 build(w,s,'barracks');const beforeInvalid=own(w,s).food;
 for(const count of [-1,0,Number.MAX_SAFE_INTEGER])assert.throws(()=>send(w,s,'qa-city-train','barracks',{count}),/capacity/);
 assert.equal(own(w,s).food,beforeInvalid);
 const c={type:'qa-city-upgrade',targetId:'citadel',requestId:'one-paid-order'};
 w.command(w.authenticate(s.token),c);const bank=own(w,s).food;w.command(w.authenticate(s.token),c);assert.equal(own(w,s).food,bank);
 assert.throws(()=>w.command(w.authenticate(s.token),{...c,targetId:'academy'}),/different command/);
 assert.throws(()=>w.command({...w.authenticate(s.token)},c),/Authenticated/);
});

test('marked QA disk saves restore both profiles and paid jobs; ordinary saves are never converted or overwritten',()=>temporary(directory=>{
 const {w,s}=setup(),legacy=w.seedLegacyPlayer('Preserved legacy');fund(w,s);send(w,s,'qa-city-upgrade','citadel');
 const before=own(w,s).referenceCity,legacyBefore=structuredClone(w.authenticate(legacy.token));
 const saved=w.toSave(),restored=QaReferenceWorld.fromSave(saved,options());
 assert.deepEqual(own(restored,s).referenceCity,before);assert.deepEqual(restored.authenticate(legacy.token).units,legacyBefore.units);
 restored.advanceQaDowntime(0,2000);assert.equal(own(restored,s).referenceCity.buildings[0].level,2);
 const file=join(directory,'qa.json'),store=new QaReferenceStore(file,options());store.save(w);const loaded=store.load();assert.equal(loaded.authenticate(s.token).civilization,'greek');assert.equal(own(loaded,s).food,own(w,s).food);
 const normal=new World({random:()=>.4}),normalSession=normal.join('Ordinary');const ordinary=normal.toSave();assert.equal(World.fromSave(ordinary).authenticate(normalSession.token).troops,normal.authenticate(normalSession.token).troops);
 assert.throws(()=>World.fromSave(saved),/save format/);assert.throws(()=>QaReferenceWorld.fromSave(ordinary,options()),/ordinary saves/);
 writeFileSync(file,JSON.stringify(ordinary));const bytes=readFileSync(file);assert.throws(()=>store.load());assert.throws(()=>store.save(w),/overwrite/);assert.deepEqual(readFileSync(file),bytes);
 const bad=structuredClone(saved);bad.worldSave.world.players.find(p=>p.id===s.playerId).food++;assert.throws(()=>QaReferenceWorld.fromSave(bad,options()),/mismatch/);
 const badClock=structuredClone(saved);badClock.worldSave.world.time++;assert.throws(()=>QaReferenceWorld.fromSave(badClock,options()),/clock mismatch/);
}));

test('a copied legitimately earned legacy Citadel5 and paid construction coexist with a fresh reference QA city without migration',async()=>{
 const {earnedLegacyWorld:original,earnedLegacySession:oldSession}=await import('../scripts/check-task7-city-conservation.mjs');
 const {BUILDINGS}=await import('./city-content.mjs'),{buildingCard}=await import('./city.mjs');
 const source=World.fromSave(original.toSave()),actor=source.authenticate(oldSession.token);
 assert.equal(actor.cityLevel,5);
 const next=BUILDINGS.map(b=>buildingCard(actor,b)).find(b=>b.canUpgrade);
 assert.ok(next);source.command(actor,{type:'building-upgrade',targetId:next.id});
 const historical=source.toSave(),comparison=World.fromSave(historical),empty=new QaReferenceWorld(options()).toSave();
 // Explicit test-container setup only: no legacy levels/resources/jobs changed.
 empty.worldSave=structuredClone(historical);empty.reference.engine.time=historical.world.time;
 const mixed=QaReferenceWorld.fromSave(empty,options()),before=mixed.authenticate(oldSession.token);
 assert.deepEqual(before,comparison.authenticate(oldSession.token));
 const newSession=mixed.join('New mixed reference','greek');fund(mixed,newSession);
 for(let i=0;i<120;i++)comparison.tick(.25);
 const retained=mixed.authenticate(oldSession.token),ordinary=comparison.authenticate(oldSession.token);
 for(const field of ['cityLevel','buildings','technologies','units','reserveUnits','ownedCommanders','inventory','ownedRelics','ownedArmaments','construction','research','trainingQueue','food','wood','stone','gold'])assert.deepEqual(retained[field],ordinary[field],field);
 assert.equal(retained.cityLevel,5);assert.equal(own(mixed,newSession).referenceCity.buildings[0].level,1);
 const restored=QaReferenceWorld.fromSave(mixed.toSave(),options());assert.deepEqual(restored.authenticate(oldSession.token).units,retained.units);
});

test('actual game HTTP/auth and persistence rollback include reference state without a new protocol or profile selector',()=>temporary(async directory=>{
 const base=new QaReferenceStore(join(directory,'http-qa.json'),options());let fail=false;
 const store={load:()=>base.load(),save:w=>{if(fail)throw Error('QA forced storage failure');base.save(w);}};
 const host=createQaReferenceGameServer({qaOnly:true,profile:syntheticCityProfile(),store,buildIdentity:{version:'B2 QA test',commit:'a'.repeat(40)}});
 assert.throws(()=>host.server.listen(0,'0.0.0.0'),/loopback/);assert.throws(()=>host.server.listen({port:0,host:'0.0.0.0'}),/loopback/);await new Promise(ok=>host.server.listen(0,ok));
 const url='http://127.0.0.1:'+host.server.address().port;
 const api=(path,data,token)=>fetch(url+path,{method:data?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+(token??'')},body:data?JSON.stringify(data):undefined});
 try{
  assert.equal((await (await api('/health')).json()).build.commit,'a'.repeat(40));
  const response=await api('/join',{name:'HTTP reference',civilization:'greek',profile:'legacy'});assert.equal(response.status,201);const session=await response.json();
  assert.equal((await api('/world')).status,401);
  const snap=await (await api('/world',null,session.token)).json();assert.equal(snap.version,17);assert.equal(snap.players.find(p=>p.id===session.playerId).referenceCity.normalActivation,false);
  host.world.advanceQaDowntime(0,30000);assert.equal((await api('/command',{type:'qa-city-collect',requestId:'http-collect'},session.token)).status,200);
  const before=own(host.world,session).food;fail=true;
  assert.equal((await api('/command',{type:'qa-city-upgrade',targetId:'citadel',requestId:'http-paid'},session.token)).status,503);
  assert.equal(own(host.world,session).food,before);assert.equal(own(host.world,session).referenceCity.jobs.length,0);
  fail=false;
 }finally{host.server.closeIdleConnections();await new Promise(ok=>host.server.close(ok));}
}));
