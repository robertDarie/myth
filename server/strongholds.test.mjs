import { fixtureCommand } from './testing/roster-fixture.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { campaignFor } from './campaign.mjs';
import { wardTroops } from './war.mjs';
import { STRONGHOLD_RULES } from './strongholds.mjs';
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(0.1);};
const until=(w,test,seconds=150)=>{for(let i=0;i<seconds*10&&!test();i++)w.tick(0.1);assert.ok(test(),'Timed out');};
const cmd=(w,p,type,targetId='',extra={})=>fixtureCommand(w,p,{type,targetId,...extra});
const census=p=>p.troops+p.marches.reduce((n,a)=>n+a.troops,0)+p.reserveTroops+wardTroops(p);
function setup(){
 const w=testWorld(),sessions=['Leader','Ally','Outsider'].map(n=>w.join(n)),[a,b,c]=sessions.map(s=>w.authenticate(s.token));
 for(const p of[a,b,c]){p.cityLevel=2;p.buildings.oathhall=1;p.food=p.gold=10000;}
 cmd(w,a,'alliance-create','',{name:'Dawn'});cmd(w,b,'alliance-join',a.allianceId);
 return {w,a,b,c,sessions,t:w.strongholds[0]};
}
const rally=(w,a,b,t)=>{cmd(w,a,'rally-create',t.id,{count:10});cmd(w,b,'rally-join',w.rallies[0].id);};

test('strongholds are rally-only, require allied commitments and cancel underfilled departures without wounds or rewards',()=>{
 const {w,a,b,c,t}=setup(),before=census(a);assert.throws(()=>cmd(w,a,'attack',t.id),/Camp/);assert.throws(()=>cmd(w,a,'capture',t.id));assert.throws(()=>cmd(w,a,'garrison-join',t.id),/held/);
 cmd(w,a,'rally-create',t.id);assert.throws(()=>cmd(w,c,'rally-join',w.rallies[0].id),/accepting/);assert.throws(()=>cmd(w,b,'rally-create',t.id),/already/);
 advance(w,11);assert.equal(w.rallies.length,0);assert.equal(w.sieges.length,0);assert.equal(census(a),before);assert.equal(a.groupReports.length,0);assert.equal(t.guardHealth,t.maxGuardHealth);assert.equal(a.strongholdVictories,0);
});

test('two allied marches defeat guards then walls with reconciled reports, conserved units and one fixed pool',()=>{
 const {w,a,b,c,t}=setup(),counts=[a,b].map(census),xp=[a.heroRecords.captain.xp,b.heroRecords.captain.xp],pool={...t.reward};rally(w,a,b,t);
 until(w,()=>w.sieges.length>0);const active=w.sieges[0].report;assert.equal(active.kind,'stronghold');assert.equal(active.structureDamage,0);
 until(w,()=>t.respawn>0);assert.equal(w.rallies.length,0);assert.equal(w.sieges.length,0);assert.deepEqual([a,b].map(census),counts);assert.equal(a.strongholdVictories,1);assert.equal(b.strongholdVictories,1);assert.equal(c.strongholdVictories,0);assert.equal(w.kingdom.metrics.strongholds,1);assert.equal(w.kingdom.contributions[a.id].strongholds,1);assert.equal(w.kingdom.contributions[b.id].strongholds,1);
 const report=a.groupReports[0];assert.equal(report.outcome,'Stronghold defeated');assert.equal(report.guardHealthAfter,0);assert.equal(report.wallHealthAfter,0);assert.equal(report.npcDamageTaken,t.maxGuardHealth);assert.equal(report.structureDamage,t.maxHealth);assert.equal(report.settled,true);assert.equal(report.rewards.length,2);
 for(const [key,total]of Object.entries(pool))assert.equal(report.rewards.reduce((n,e)=>n+e.resources[key],0),total);
 assert.equal(report.participants.reduce((n,e)=>n+e.damageDealt,0),report.npcDamageTaken);assert.equal(report.participants.reduce((n,e)=>n+e.damageTaken,0),report.npcDamageDealt);
 assert.equal(report.rewards.reduce((n,e)=>n+e.xp,0),t.xp);assert.equal(a.heroRecords.captain.xp+b.heroRecords.captain.xp-xp.reduce((n,x)=>n+x,0),t.xp);
 assert.equal(a.groupReports.length,1);assert.equal(b.groupReports.length,1);assert.equal(c.groupReports.length,0);assert.equal(a.target.type,'return');assert.equal(b.target.type,'return');
 advance(w,20);assert.equal(a.strongholdVictories,1);assert.equal(a.groupReports.length,1);assert.throws(()=>cmd(w,a,'rally-create',t.id),/unavailable/);
 assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});

test('voluntary withdrawal seals its contribution; only owners who fought share the eventual victory',()=>{
 const {w,a,b,t}=setup();
 // A stronger allied force continues after the contributor withdraws.
 cmd(w,a,'commander','heracles');advance(w,1);rally(w,a,b,t);until(w,()=>w.sieges.length>0);advance(w,1.2);
 const s=w.sieges[0],entry=s.report.participants.find(e=>e.playerId===b.id);assert.ok(entry.damageDealt>0);cmd(w,b,'rally-leave');const frozen=structuredClone(entry);
 until(w,()=>t.respawn>0);const report=b.groupReports[0];assert.equal(report.participants.find(e=>e.playerId===b.id).result,'Withdrawn');assert.equal(report.participants.find(e=>e.playerId===b.id).damageDealt,frozen.damageDealt);assert.ok(report.rewards.some(e=>e.playerId===b.id));assert.equal(b.strongholdVictories,1);
});

test('defeat and canceled fights reset NPC health, preserve wounds and pay no victory rewards',()=>{
 const {w,a,b,t}=setup();const tier3=w.strongholds.find(t=>t.tier===3);
 // Bring the hard encounter into the accessible province through legitimate gate ownership.
 for(const s of w.sites.filter(s=>s.kind==='gate'))s.allianceId=a.allianceId;
 const counts=[a,b].map(census);rally(w,a,b,tier3);until(w,()=>a.groupReports.length>0);
 assert.equal(a.groupReports[0].outcome,'Stronghold defenders held');assert.equal(a.strongholdVictories,0);assert.equal(tier3.guardHealth,tier3.maxGuardHealth);assert.equal(tier3.health,tier3.maxHealth);assert.equal(tier3.respawn,0);assert.deepEqual([a,b].map(census),counts);assert.ok(wardTroops(a)>0&&wardTroops(b)>0);
 advance(w,30);rally(w,a,b,t);until(w,()=>w.sieges.length>0);advance(w,1);cmd(w,a,'rally-leave');assert.equal(w.sieges.length,0);assert.equal(t.guardHealth,t.maxGuardHealth);assert.equal(t.health,t.maxHealth);assert.equal(a.groupReports[0].rewards.length,0);
});

test('restart interrupts an active stronghold exactly once, preserves actual wounds and resets enemy guards',()=>{
 const {w,a,b,t,sessions}=setup();rally(w,a,b,t);until(w,()=>w.sieges.length>0);advance(w,2);const counts=[a,b].map(census),hp=[a.health,b.health];
 const restored=World.fromSave(w.toSave()),qa=restored.authenticate(sessions[0].token),qb=restored.authenticate(sessions[1].token),target=restored.strongholds[0];
 assert.equal(restored.rallies.length,0);assert.equal(restored.sieges.length,0);assert.deepEqual([qa,qb].map(census),counts);assert.deepEqual([qa.health,qb.health],hp);assert.equal(target.guardHealth,target.maxGuardHealth);assert.equal(qa.groupReports[0].outcome,'Interrupted by restart');assert.equal(qa.strongholdVictories,0);
 const again=World.fromSave(restored.toSave());assert.equal(again.players.get(a.id).groupReports.length,1);assert.equal(again.players.get(a.id).groupReports[0].rewards.length,0);
});

test('defeated strongholds retain respawn timers across saves and offer a fresh generation only after respawn',()=>{
 const {w,a,b,t}=setup();rally(w,a,b,t);until(w,()=>t.respawn>0);const generation=t.cycle;
 const restored=World.fromSave(w.toSave()),q=restored.strongholds[0];assert.equal(q.respawn,t.respawn);assert.equal(q.cycle,generation);
 advance(restored,STRONGHOLD_RULES.respawnSeconds+1);assert.equal(q.respawn,0);assert.equal(q.cycle,generation+1);assert.equal(q.guardHealth,q.maxGuardHealth);assert.equal(q.health,q.maxHealth);
 assert.equal(restored.players.get(a.id).strongholdVictories,1);
});

test('multiple owned marches meet assembly requirements without multiplying the city reward or report',()=>{
 const {w,a,t}=setup();cmd(w,a,'unlock-commander','warden');for(let i=0;i<3;i++)cmd(w,a,'train');advance(w,25);cmd(w,a,'train');advance(w,9);
 cmd(w,a,'deploy-march','warden',{units:{infantry:20,archers:0,cavalry:0},mythic:0});const extra=a.marches[0],before=census(a);
 cmd(w,a,'rally-create',t.id);cmd(w,a,'rally-join',w.rallies[0].id,{marchId:extra.id});until(w,()=>t.respawn>0);
 assert.equal(census(a),before);assert.equal(a.groupReports.length,1);assert.equal(a.strongholdVictories,1);const report=a.groupReports[0];assert.equal(report.participants.length,2);assert.equal(report.rewards.length,1);assert.deepEqual(report.rewards[0].resources,t.reward);assert.equal(report.rewards[0].xp,t.xp);assert.equal(report.participants.reduce((n,e)=>n+e.experience,0),t.xp);assert.equal(a.kills,0);
});

test('an assembly-only passenger that never deals damage receives a report but no reward or victory credit',()=>{
 const {w,a,b,c,t}=setup();cmd(w,c,'alliance-join',a.allianceId);rally(w,a,b,t);cmd(w,c,'rally-join',w.rallies[0].id);c.cooldown=100;
 until(w,()=>t.respawn>0);assert.equal(c.groupReports.length,1);const report=c.groupReports[0];assert.equal(report.participants.find(e=>e.playerId===c.id).damageDealt,0);assert.equal(report.participants.find(e=>e.playerId===c.id).structureDamage,0);assert.equal(report.rewards.some(e=>e.playerId===c.id),false);assert.equal(c.strongholdVictories,0);
 for(const [key,total]of Object.entries(t.reward))assert.equal(report.rewards.reduce((n,e)=>n+e.resources[key],0),total);
});

test('malformed stronghold state, generations and reward ledgers are rejected rather than replayed',()=>{
 const {w,a,b,t}=setup();rally(w,a,b,t);until(w,()=>w.sieges.length>0);advance(w,1);
 for(const mutate of[s=>s.world.strongholds[0].guardHealth=-1,s=>s.world.strongholds[0].cycle=0,s=>s.world.strongholds.pop(),s=>s.world.rallies[0].targetCycle=99,s=>s.world.sieges[0].report.settled=true,s=>s.world.sieges[0].report.npcDamageTaken=999]){
  const bad=structuredClone(w.toSave());mutate(bad);assert.throws(()=>World.fromSave(bad),/stronghold/);
 }
 until(w,()=>t.respawn>0);for(const mutate of[r=>r.rewards[0].resources.gold++,r=>r.rewards[0].xp++,r=>r.guardHealthAfter=1]){const bad=structuredClone(w.toSave());mutate(bad.world.players[0].groupReports[0]);assert.throws(()=>World.fromSave(bad),/stronghold/);}
 const old=structuredClone(w.toSave());old.schema=8;delete old.world.strongholds;for(const p of old.world.players){delete p.strongholdVictories;p.groupReports=[];}const restored=World.fromSave(old);assert.equal(restored.strongholds.length,5);assert.equal(restored.players.get(a.id).strongholdVictories,0);assert.equal(restored.toSave().schema,20);
});

test('ordinary members can lead PvE rallies, while higher tiers enforce gate access and stronger armies',()=>{
 const {w,a,b,t}=setup();cmd(w,b,'rally-create',t.id);cmd(w,a,'rally-join',w.rallies[0].id);cmd(w,b,'rally-leave');advance(w,5);
 const tier2=w.strongholds.find(t=>t.tier===2);assert.throws(()=>cmd(w,a,'rally-create',tier2.id),/route locked/);
 for(const s of w.sites.filter(s=>s.kind==='gate'))s.allianceId=a.allianceId;
 // A larger formation demonstrates that tier 2 is winnable rather than just a larger UI number.
 for(const p of[a,b]){p.units.infantry=40;p.troops=40;p.health=w.stats(p).maxHealth;}
 rally(w,a,b,tier2);until(w,()=>tier2.respawn>0);assert.equal(a.groupReports[0].tier,2);assert.equal(a.groupReports[0].npcDamageTaken,tier2.maxGuardHealth);assert.equal(a.groupReports[0].structureDamage,tier2.maxHealth);
});

test('the combat-round limit resets stalemates with no rewards or duplicated casualties',()=>{
 const {w,a,b}=setup(),t=w.strongholds.find(t=>t.tier===3);for(const s of w.sites.filter(s=>s.kind==='gate'))s.allianceId=a.allianceId;
 const stats=w.stats.bind(w);w.stats=actor=>({...stats(actor),damage:1,maxHealth:1000,mitigation:1,pve:1,heal:0});a.health=b.health=1000;
 rally(w,a,b,t);until(w,()=>a.groupReports.length>0,160);assert.equal(a.groupReports[0].outcome,'Stronghold siege timed out');assert.equal(a.groupReports[0].rounds,90);assert.equal(t.guardHealth,t.maxGuardHealth);assert.equal(t.health,t.maxHealth);assert.equal(a.groupReports[0].rewards.length,0);assert.equal(a.strongholdVictories,0);
});

test('HTTP stronghold rallies reward only authenticated contributors and keep private reports out of bystander snapshots',async testContext=>{
 const {createGameServer}=await import('./http.mjs');const {server,world:w}=createGameServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});testContext.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const sessions=await Promise.all(['HTTP Leader','HTTP Member','HTTP Bystander'].map(async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json()));
 const [a,b,c]=sessions.map(s=>w.authenticate(s.token));for(const p of[a,b]){p.cityLevel=2;p.buildings.oathhall=1;}cmd(w,a,'alliance-create','',{name:'Raiders'});cmd(w,b,'alliance-join',a.allianceId);
 const t=w.strongholds[0],post=(i,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+sessions[i].token},body:JSON.stringify(body)}),get=async i=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+sessions[i].token}})).json();
 assert.equal((await get(2)).strongholds.length,0);assert.equal((await post(0,{type:'scout-send',x:t.x,z:t.z})).status,200);advance(w,6);const scouted=await get(0);assert.ok(scouted.strongholds.some(s=>s.id===t.id));assert.ok(scouted.exploration.reports[0].strongholds.some(s=>s.id===t.id));
 assert.equal((await post(1,{type:'rally-create',targetId:t.id,count:10})).status,200);const id=w.rallies[0].id;
 assert.equal((await post(0,{type:'rally-join',targetId:id})).status,200);assert.equal((await post(2,{type:'rally-join',targetId:id})).status,400);
 until(w,()=>t.respawn>0);let own=await get(0),outside=await get(2);assert.equal(own.version,16);assert.equal(own.players.find(p=>p.id===a.id).groupReports[0].rewards.length,2);assert.equal(outside.players.find(p=>p.id===a.id).groupReports,undefined);assert.equal(outside.players.find(p=>p.id===a.id).strongholdVictories,undefined);assert.equal(c.strongholdVictories,0);
 assert.equal((await post(0,{type:'rally-join',targetId:id})).status,400);assert.equal(a.strongholdVictories,1);assert.equal(b.strongholdVictories,1);
});

test('a withdrawn extra march can disband while its historical contribution remains safely restorable',()=>{
 const {w,a,b,t}=setup();cmd(w,a,'unlock-commander','warden');cmd(w,a,'train');advance(w,9);cmd(w,a,'deploy-march','warden',{units:{infantry:5,archers:0,cavalry:0},mythic:0});const extra=a.marches[0];
 const stats=w.stats.bind(w);w.stats=actor=>({...stats(actor),damage:1,maxHealth:1000,mitigation:1,pve:1,heal:0});for(const actor of w.armies())actor.health=1000;
 rally(w,a,b,t);cmd(w,a,'rally-join',w.rallies[0].id,{marchId:extra.id});until(w,()=>w.sieges.length>0);cmd(w,a,'rally-leave','',{marchId:extra.id});advance(w,15);
 assert.equal(extra.target,null);cmd(w,a,'disband-march','',{marchId:extra.id});assert.equal(w.army(extra.id),undefined);assert.equal(w.sieges.length,1);
 const restored=World.fromSave(w.toSave());assert.equal(restored.sieges.length,0);const report=restored.players.get(a.id).groupReports[0];assert.equal(report.outcome,'Interrupted by restart');assert.equal(report.participants.find(e=>e.armyId===extra.id).result,'Withdrawn');assert.equal(report.rewards.length,0);
});

test('a full 200-load five-march rally can defeat tier 3 and reconcile the entire reward pool',()=>{
 const {w,a,b,c}=setup(),more=['Fourth','Fifth'].map(name=>w.authenticate(w.join(name).token)),party=[a,b,c,...more],t=w.strongholds.find(t=>t.tier===3);
 for(const p of[c,...more])cmd(w,p,'alliance-join',a.allianceId);
 for(const p of party){p.cityLevel=2;p.units.infantry=40;p.troops=40;p.health=w.stats(p).maxHealth;}
 for(const s of w.sites.filter(s=>s.kind==='gate'))s.allianceId=a.allianceId;
 cmd(w,a,'rally-create',t.id);for(const p of party.slice(1))cmd(w,p,'rally-join',w.rallies[0].id);
 const counts=party.map(census);until(w,()=>t.respawn>0);assert.deepEqual(party.map(census),counts);const r=a.groupReports[0];assert.equal(r.tier,3);assert.equal(r.rewards.length,5);assert.equal(r.npcDamageTaken,1050);assert.equal(r.structureDamage,500);
 for(const [key,total]of Object.entries(t.reward))assert.equal(r.rewards.reduce((n,e)=>n+e.resources[key],0),total);assert.equal(r.rewards.reduce((n,e)=>n+e.xp,0),350);assert.ok(party.every(p=>p.strongholdVictories===1&&p.groupReports.length===1));assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});
