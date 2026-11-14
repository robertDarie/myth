import { legacyMap } from './testing/legacy-save.mjs';
import { legacySpawns } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { siteIsOpen, recordKingdomContribution, recordKingdomVictory, tickKingdom, kingdomSnapshot } from './kingdom.mjs';
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(0.1);};
function setup(){let now=Date.UTC(2026,10,7,12);const w=legacySpawns(new World({now:()=>now})),s=w.join('Founder'),p=w.authenticate(s.token);return {w,p,s,setAge:seconds=>{now=Date.UTC(2026,10,7,12)+seconds*1000;w.snapshot(p.id);}};}
const cmd=(w,p,type,extra={})=>w.command(p,{type,...extra});
function prepare(e){const {w,p}=e;recordKingdomContribution(w,p,'gather',400);recordKingdomContribution(w,p,'trained',10);p.cityLevel=2;for(let i=0;i<4;i++)recordKingdomVictory(w,'camps');recordKingdomContribution(w,p,'camps',4);tickKingdom(w);}

test('new kingdoms seal gates and sanctuary at every entry point, while starting shrines remain available',()=>{
 const {w,p}=setup();cmd(w,p,'alliance-create',{name:'Dawn'});p.cityLevel=2;p.buildings.oathhall=1;
 assert.equal(siteIsOpen(w,'shrine-dawn'),true);assert.equal(siteIsOpen(w,'gate-east'),false);
 assert.throws(()=>cmd(w,p,'capture',{targetId:'gate-east'}),/sealed/);
 const gate=w.sites.find(s=>s.id==='gate-east');gate.allianceId='enemy';assert.throws(()=>cmd(w,p,'rally-create',{targetId:gate.id}),/sealed/);gate.allianceId=p.allianceId;
 assert.equal(w.canEnter(p,{x:50,z:20}),false);assert.throws(()=>cmd(w,p,'move',{x:50,z:20}),/Gate/);assert.throws(()=>cmd(w,p,'scout-send',{x:50,z:20}),/Gate/);assert.throws(()=>cmd(w,p,'garrison-join',{targetId:gate.id}),/held/);
 const snapshot=w.snapshot(p.id);assert.equal(snapshot.sites.find(s=>s.id==='gate-east').locked,true);
});

test('opening times alone or preparation alone cannot unlock gates; actual contributions unlock sequential stages',()=>{
 const e=setup(),{w,p}=e;e.setAge(700);assert.equal(siteIsOpen(w,'gate-east'),false);
 recordKingdomContribution(w,p,'gather',400);recordKingdomContribution(w,p,'trained',10);tickKingdom(w);assert.equal(w.kingdom.completed.length,1);assert.equal(siteIsOpen(w,'gate-east'),false);
 p.cityLevel=2;for(let i=0;i<4;i++)recordKingdomVictory(w,'camps');tickKingdom(w);assert.equal(siteIsOpen(w,'gate-east'),true);assert.equal(siteIsOpen(w,'gate-north'),true);assert.equal(siteIsOpen(w,'first-sanctuary'),false);
});

test('a fresh city prepares kingdom gates through legal gathering, training, upgrade and camp commands',()=>{
 const e=setup(),{w,p}=e;cmd(w,p,'train');cmd(w,p,'train');cmd(w,p,'gather',{targetId:w.nodes[0].id});advance(w,60);cmd(w,p,'return');advance(w,20);cmd(w,p,'gather',{targetId:w.nodes[0].id});advance(w,25);cmd(w,p,'return');advance(w,20);cmd(w,p,'upgrade');advance(w,21);cmd(w,p,'reinforce');
 for(let i=0;i<4;i++){cmd(w,p,'move',{x:14,z:10});advance(w,10);cmd(w,p,'attack',{targetId:w.camps[0].id});advance(w,30);cmd(w,p,'return');advance(w,50);}
 assert.equal(w.kingdom.metrics.camps,4);assert.equal(w.kingdom.metrics.trained,10);assert.ok(w.kingdom.metrics.gather>=400);assert.equal(siteIsOpen(w,'gate-east'),false);
 e.setAge(600);assert.equal(siteIsOpen(w,'gate-east'),true);assert.ok(kingdomSnapshot(w,p).stages[1].canClaim);
});

test('sanctuary opening requires both occupied gates and stronghold victories; hold resets on ownership loss',()=>{
 const e=setup(),{w,p}=e;prepare(e);e.setAge(600);cmd(w,p,'alliance-create',{name:'Dawn'});for(const gate of w.sites.filter(s=>s.kind==='gate'))gate.allianceId=p.allianceId;
 recordKingdomVictory(w,'strongholds');e.setAge(1900);assert.equal(siteIsOpen(w,'first-sanctuary'),false);recordKingdomVictory(w,'strongholds');tickKingdom(w);assert.equal(siteIsOpen(w,'first-sanctuary'),true);
 const sanctuary=w.sites.find(s=>s.kind==='sanctuary');sanctuary.allianceId=p.allianceId;tickKingdom(w);e.setAge(2100);assert.equal(w.kingdom.completed.length,3);sanctuary.allianceId='';tickKingdom(w);assert.equal(w.kingdom.holdSinceMs,0);
 sanctuary.allianceId=p.allianceId;tickKingdom(w);e.setAge(2399);assert.equal(w.kingdom.completed.length,3);e.setAge(2400);assert.equal(w.kingdom.completed.length,4);
});

test('rewards bind to contributors at completion, reject later arrivals and remain once-only across restart',()=>{
 const e=setup(),{w,p,s}=e;prepare(e);const before=p.gold;cmd(w,p,'kingdom-claim',{targetId:'foundations'});assert.equal(p.gold,before+50);assert.throws(()=>cmd(w,p,'kingdom-claim',{targetId:'foundations'}),/already/);
 const late=w.authenticate(w.join('Late arrival').token);recordKingdomContribution(w,late,'gather',1000);assert.throws(()=>cmd(w,late,'kingdom-claim',{targetId:'foundations'}),/qualify/);
 const loaded=World.fromSave(w.toSave(),{now:w.now});assert.throws(()=>cmd(loaded,loaded.authenticate(s.token),'kingdom-claim',{targetId:'foundations'}),/already/);
});

test('migration preserves owned-gate access without retroactive rewards and malformed stage claims are rejected',()=>{
 const e=setup(),{w,p}=e;cmd(w,p,'alliance-create',{name:'Legacy'});w.sites.find(s=>s.id==='gate-east').allianceId=p.allianceId;const old=structuredClone(w.toSave());legacyMap(old);old.schema=10;delete old.world.kingdom;for(const p of old.world.players)delete p.kingdomClaims;
 const migrated=World.fromSave(old,{now:w.now});assert.equal(siteIsOpen(migrated,'gate-east'),true);assert.equal(siteIsOpen(migrated,'first-sanctuary'),false);assert.equal(kingdomSnapshot(migrated,migrated.players.get(p.id)).stages[0].canClaim,false);assert.doesNotThrow(()=>World.fromSave(migrated.toSave(),{now:w.now}));
 for(const mutate of[k=>k.completed=[{id:'secured'}],k=>k.startedAtMs=-1,k=>k.metrics.gather=-1,k=>k.contributions.fake={}]){const bad=structuredClone(w.toSave());mutate(bad.world.kingdom);assert.throws(()=>World.fromSave(bad,{now:w.now}),/kingdom/);}
});

test('authenticated milestone claims enforce ownership and snapshot eligibility without exposing private claim lists',async testContext=>{
 const {createGameServer}=await import('./http.mjs');const {server,world:w}=createGameServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});testContext.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
 const base='http://127.0.0.1:'+server.address().port,sessions=await Promise.all(['HTTP Contributor','HTTP Observer'].map(async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json())),[p,q]=sessions.map(s=>w.authenticate(s.token));
 const post=(i,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+sessions[i].token},body:JSON.stringify(body)}),get=async i=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+sessions[i].token}})).json();
 assert.equal((await get(0)).sites.find(s=>s.id==='gate-east'),undefined);assert.equal((await post(0,{type:'kingdom-claim',targetId:'gates',count:999})).status,400);
 recordKingdomContribution(w,p,'gather',400);recordKingdomContribution(w,p,'trained',10);p.cityLevel=2;for(let i=0;i<4;i++)recordKingdomVictory(w,'camps');recordKingdomContribution(w,p,'camps',4);const future=w.kingdom.startedAtMs+600000;w.now=()=>future;
 let snapshot=await get(0);assert.equal(snapshot.version,17);assert.equal(snapshot.kingdom.stages[1].completed,true);assert.equal(snapshot.kingdom.stages[1].canClaim,true);
 const gold=p.gold;assert.equal((await post(0,{type:'kingdom-claim',targetId:'gates'})).status,200);assert.equal(p.gold,gold+100);assert.equal((await post(0,{type:'kingdom-claim',targetId:'gates'})).status,400);
 assert.equal((await post(1,{type:'kingdom-claim',targetId:'gates',playerId:p.id})).status,400);snapshot=await get(1);assert.equal(snapshot.players.find(p=>p.id===sessions[0].playerId).kingdomClaims,undefined);assert.equal(snapshot.kingdom.stages[1].eligible,false);assert.deepEqual(q.kingdomClaims,[]);
});
