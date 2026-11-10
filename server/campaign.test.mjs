import { fixtureCommand } from './testing/roster-fixture.mjs';
import { testWorld, openKingdom } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { initializeFortification, refreshBeacons, campaignFor, CAMPAIGN_LIMITS } from './campaign.mjs';
import { wardTroops, wardMythic } from './war.mjs';
const advance=(w,s)=>{for(let i=0;i<Math.ceil(s*10);i++)w.tick(0.1);};
const until=(w,predicate,seconds=120)=>{for(let i=0;i<seconds*10&&!predicate();i++)w.tick(0.1);assert.ok(predicate(),'Timed out waiting for campaign state');};
const cmd=(w,p,type,targetId='',extra={})=>fixtureCommand(w,p,{type,targetId,...extra});
function setup(){
 const w=testWorld(),sessions=['A','B','C','D','E'].map(n=>w.join(n)),p=sessions.map(s=>w.authenticate(s.token));
 for(const a of p){a.cityLevel=2;a.buildings.oathhall=1;for(const k of['gold','wood','food','stone','mana'])a[k]=10000;}
 const[a,b,c,d,e]=p;cmd(w,a,'alliance-create','',{name:'Dawn'});cmd(w,b,'alliance-join',a.allianceId);cmd(w,c,'alliance-create','',{name:'Dusk'});cmd(w,d,'alliance-join',c.allianceId);cmd(w,e,'alliance-join',c.allianceId);
 const gate=w.sites.find(s=>s.id==='gate-east');gate.allianceId=c.allianceId;
 const supply={id:'supply',allianceId:a.allianceId,x:32,z:20};initializeFortification(supply);supply.isRoot=true;w.flags.push(supply);refreshBeacons(w);
 return {w,a,b,c,d,e,gate,supply,sessions};
}
const census=p=>p.troops+p.marches.reduce((n,a)=>n+a.troops,0)+p.reserveTroops+wardTroops(p);
const equip=(w,p)=>{cmd(w,p,'commander','heracles');advance(w,1.1);};

test('rally timers, commander commitment and exact ownership prevent double deployment and unrelated commands',()=>{
 const {w,a,b,c,gate}=setup();cmd(w,a,'rally-create',gate.id,{count:10});const r=w.rallies[0];
 assert.equal(r.phase,'Assembling');assert.throws(()=>cmd(w,c,'rally-join',r.id),/accepting/);
 cmd(w,b,'rally-join',r.id);assert.equal(r.armyIds.length,2);assert.equal(census(a),20);assert.equal(census(b),20);
 for(const type of['move','reinforce','configure-march','disband-march','capture'])assert.throws(()=>cmd(w,a,type,gate.id,{x:10,z:10}),/assignment/);
 assert.throws(()=>cmd(w,b,'rally-join',r.id),/assignment/);advance(w,9);assert.equal(r.phase,'Assembling');advance(w,1.2);assert.equal(r.phase,'Marching');
 assert.equal(a.troops,20);assert.equal(b.troops,20);assert.ok(a.x>a.homeX);assert.ok(b.x>b.homeX-3);
});

test('creation, garrison and recall enforce rank, building, health, access and contribution capacity',()=>{
 const {w,a,b,c,d,gate}=setup();assert.throws(()=>cmd(w,b,'rally-create',gate.id),/officers/);
 a.buildings.oathhall=0;assert.throws(()=>cmd(w,a,'rally-create',gate.id),/Oathbound/);a.buildings.oathhall=1;
 a.health--;assert.throws(()=>cmd(w,a,'rally-create',gate.id),/recovered/);a.health=w.stats(a).maxHealth;
 assert.throws(()=>cmd(w,a,'garrison-join',gate.id),/held/);
 cmd(w,d,'garrison-join',gate.id);assert.throws(()=>cmd(w,a,'campaign-recall',d.id),/officer/);
 assert.throws(()=>cmd(w,d,'alliance-leave'),/Recall/);cmd(w,c,'campaign-recall',d.id);assert.equal(campaignFor(w,d.id),null);assert.equal(d.target.type,'return');
 assert.equal(w.snapshot(a.id).campaignLimits.garrisonLoad,CAMPAIGN_LIMITS.garrisonLoad);
});

test('a stronger allied rally defeats a defended gate, conserves each owner units and produces reconciled group reports',()=>{
 const {w,a,b,c,d,gate}=setup();equip(w,a);equip(w,b);
 const counts=[a,b,c,d].map(census);cmd(w,c,'garrison-join',gate.id);cmd(w,d,'garrison-join',gate.id);
 cmd(w,a,'rally-create',gate.id,{count:10});cmd(w,b,'rally-join',w.rallies[0].id);
 until(w,()=>gate.allianceId===a.allianceId);assert.equal(w.rallies.length,0);assert.equal(w.sieges.length,0);
 assert.deepEqual([a,b,c,d].map(census),counts);assert.equal(c.wounded.infantry,5);assert.equal(d.wounded.infantry,5);
 const r=a.groupReports[0];assert.equal(r.participants.length,4);assert.equal(r.outcome,'Attackers captured objective');assert.equal(r.structureDamage,450);
 const atk=r.participants.filter(p=>p.team==='Attackers'),def=r.participants.filter(p=>p.team==='Defenders');
 const sum=(list,key)=>list.reduce((n,e)=>n+e[key],0);
 assert.ok(Math.abs(sum(atk,'damageDealt')-sum(def,'damageTaken'))<0.00001);assert.ok(Math.abs(sum(def,'damageDealt')-sum(atk,'damageTaken'))<0.00001);
 assert.ok(Math.abs(sum(atk,'structureDamage')-r.structureDamage)<0.00001);
 for(const p of[a,b,c,d]){assert.equal(p.groupReports.length,1);assert.equal(p.groupReports[0].id,r.id);}
 assert.equal(gate.health,Math.ceil(gate.maxHealth/2));assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});

test('late garrison reinforcements join only after arrival and are recorded once',()=>{
 const {w,a,b,c,d,gate}=setup();equip(w,a);equip(w,b);cmd(w,c,'garrison-join',gate.id);
 cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);
 until(w,()=>w.sieges.length>0);const s=w.sieges[0];cmd(w,d,'garrison-join',gate.id);
 assert.equal(s.report.participants.some(p=>p.armyId===d.id),false);
 until(w,()=>s.report.participants.some(p=>p.armyId===d.id)||w.sieges.length===0);
 assert.ok(s.report.participants.some(p=>p.armyId===d.id));assert.equal(s.report.participants.filter(p=>p.armyId===d.id).length,1);
 until(w,()=>w.sieges.length===0);assert.equal(d.groupReports.length,1);
});

test('withdrawing a garrison seals its contribution, returns the same march and prevents a second entry to that siege',()=>{
 const {w,a,b,c,d,gate}=setup();equip(w,a);equip(w,b);cmd(w,c,'garrison-join',gate.id);cmd(w,d,'garrison-join',gate.id);
 cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);until(w,()=>w.sieges.length>0);
 const s=w.sieges[0],before=census(d);cmd(w,d,'garrison-leave');assert.equal(census(d),before);assert.equal(campaignFor(w,d.id),null);
 const entry=s.report.participants.find(p=>p.armyId===d.id);assert.equal(entry.result,'Withdrawn');const after={...entry.unitsAfter};
 cmd(w,d,'stop');d.health=w.stats(d).maxHealth;assert.throws(()=>cmd(w,d,'garrison-join',gate.id),/once per siege/);
 until(w,()=>w.sieges.length===0);assert.deepEqual(d.groupReports[0].participants.find(p=>p.armyId===d.id).unitsAfter,after);
});

test('a root beacon destruction disconnects branches; unfinished or disconnected flags cannot extend captures',()=>{
 const {w,a,c,gate,supply}=setup();
 const branch={id:'branch',allianceId:a.allianceId,x:39,z:27};initializeFortification(branch);w.flags.push(branch);refreshBeacons(w);assert.equal(branch.connected,true);
 supply.allianceId=c.allianceId; // Enemy root in this fixture supplies a destructible target.
 const friendly={id:'root-a',allianceId:a.allianceId,x:25,z:20};initializeFortification(friendly);friendly.isRoot=true;w.flags.push(friendly);refreshBeacons(w);
 supply.health=1;cmd(w,a,'rally-create',supply.id);until(w,()=>!w.flags.some(f=>f.id===supply.id));
 assert.equal(branch.connected,false);assert.equal(census(a),20);assert.ok(a.groupReports[0].structureDamage>=1&&a.groupReports[0].structureDamage<=250);
 assert.throws(()=>cmd(w,a,'capture','gate-north'),/beacons/);
 assert.equal(w.sites.find(s=>s.id==='gate-east').allianceId,c.allianceId);
});

test('destroying forward supply or changing target ownership cancels a rally without duplicating troops',()=>{
 const {w,a,b,c,gate,supply}=setup();cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);
 cmd(w,a,'beacon-dismantle',supply.id);assert.equal(w.rallies.length,0);assert.equal(census(a),20);assert.equal(census(b),20);
 assert.equal(a.target.type,'return');assert.equal(b.target.type,'return');
});

test('beacon construction takes time, officer permissions apply and disconnected branches have no supply effect',()=>{
 const {w,a,b,gate}=setup();w.flags=[];a.x=a.homeX;a.z=a.homeZ;
 assert.throws(()=>cmd(w,b,'flag','',{x:b.x,z:b.z}),/officer/);
 cmd(w,a,'flag','',{x:a.x,z:a.z});const f=w.flags[0];assert.equal(f.buildRemaining,30);assert.equal(f.connected,false);
 assert.throws(()=>cmd(w,a,'flag','',{x:13,z:12}),/within 4/);advance(w,30.1);assert.equal(f.connected,true);
 cmd(w,a,'beacon-dismantle',f.id);assert.equal(w.flags.length,0);assert.throws(()=>cmd(w,a,'beacon-dismantle',f.id));
});

test('restart interrupts an active siege once while preserving defender garrisons, army counts, wounds and structure health',()=>{
 const {w,a,b,c,gate,sessions}=setup();equip(w,a);equip(w,b);cmd(w,c,'garrison-join',gate.id);
 cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);until(w,()=>w.sieges.length>0);
 advance(w,0.5);const hp=gate.health,counts=[a,b,c].map(census);
 const restored=World.fromSave(w.toSave()),q=sessions.map(s=>restored.authenticate(s.token));
 assert.equal(restored.rallies.length,0);assert.equal(restored.sieges.length,0);assert.equal(restored.garrisons.length,1);
 assert.equal(q[0].groupReports[0].outcome,'Interrupted by restart');assert.equal(q[0].groupReports.length,1);assert.equal(q[0].target,null);
 assert.equal(restored.sites.find(s=>s.id===gate.id).health,hp);assert.deepEqual(q.slice(0,3).map(census),counts);
 assert.equal(World.fromSave(restored.toSave()).players.get(a.id).groupReports.length,1);
});

test('assembly can be canceled and saved/migrated without creating contributions or phantom reports',()=>{
 const {w,a,b,c,gate}=setup();cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);
 const restored=World.fromSave(w.toSave());assert.equal(restored.rallies.length,0);assert.equal(restored.players.get(a.id).groupReports.length,0);
 cmd(w,a,'rally-leave');assert.equal(w.rallies.length,0);assert.equal(census(a),20);assert.equal(census(b),20);
 const old=w.toSave();old.schema=5;delete old.world.rallies;delete old.world.garrisons;delete old.world.sieges;
 for(const p of old.world.players)delete p.groupReports;
 const migrated=World.fromSave(old);assert.equal(migrated.toSave().schema,17);assert.equal(migrated.players.get(a.id).groupReports.length,0);assert.ok(migrated.sites[0].health>0);
});

test('surviving attackers can garrison their captured gate without being healed or duplicating units',()=>{
 const {w,a,b,c,gate}=setup();equip(w,a);equip(w,b);cmd(w,c,'garrison-join',gate.id);
 cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);until(w,()=>gate.allianceId===a.allianceId);
 const hp=a.health,total=census(a);assert.ok(hp<w.stats(a).maxHealth);
 cmd(w,a,'garrison-join',gate.id);advance(w,1);assert.equal(a.health,hp);assert.equal(census(a),total);assert.equal(a.state,'Garrisoned');
});

test('when the original leader retreats, surviving contributions continue with an acting commander',()=>{
 const {w,a,b,c,gate}=setup();equip(w,b);
 cmd(w,a,'configure-march','captain',{units:{infantry:1,archers:0,cavalry:0},mythic:0});
 cmd(w,c,'garrison-join',gate.id);cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);
 until(w,()=>w.rallies[0]?.leaderArmyId===b.id);assert.ok(a.recovery>0);assert.equal(w.rallies[0].leaderId,b.id);
 until(w,()=>gate.allianceId===a.allianceId);assert.equal(a.groupReports.length,1);assert.equal(b.groupReports.length,1);
 assert.equal(a.groupReports[0].participants.find(p=>p.armyId===a.id).result,'Retreated');
});

test('multiple marches belonging to one player receive one report and retain separate contributions',()=>{
 const {w,a,c,gate}=setup();a.cityLevel=3;a.reserveUnits.infantry=5;a.reserveTroops=5;
 cmd(w,a,'unlock-commander','warden');cmd(w,a,'deploy-march','warden',{units:{infantry:5,archers:0,cavalry:0},mythic:0});const second=a.marches[0];
 equip(w,a);cmd(w,a,'rally-create',gate.id);const id=w.rallies[0].id;cmd(w,a,'rally-join',id,{marchId:second.id});
 const count=census(a);until(w,()=>gate.allianceId===a.allianceId);
 assert.equal(census(a),count);assert.equal(a.groupReports.length,1);assert.equal(a.groupReports[0].participants.filter(e=>e.playerId===a.id).length,2);
});

test('restoration rejects duplicate assignments, fabricated contributors and malformed fortification state',()=>{
 const {w,a,c,gate}=setup();cmd(w,c,'garrison-join',gate.id);cmd(w,a,'rally-create',gate.id);until(w,()=>w.sieges.length>0);
 for(const mutate of [
  s=>s.world.rallies[0].armyIds.push(s.world.rallies[0].armyIds[0]),
  s=>s.world.sieges[0].report.participants[0].playerId=c.id,
  s=>s.world.sieges[0].report.structureDamage=-1,
  s=>s.world.flags[0].health=-1,
  s=>s.world.rallies[0].meetX=NaN,
  s=>s.world.sieges.push(structuredClone(s.world.sieges[0]))
 ]){const saved=structuredClone(w.toSave());mutate(saved);assert.throws(()=>World.fromSave(saved));}
});

test('destroying supply during active combat seals reports and returns surviving march ownership exactly once',()=>{
 const {w,a,b,c,gate,supply}=setup();cmd(w,c,'garrison-join',gate.id);cmd(w,a,'rally-create',gate.id);cmd(w,b,'rally-join',w.rallies[0].id);until(w,()=>w.sieges.length>0);
 const counts=[a,b,c].map(census);cmd(w,a,'beacon-dismantle',supply.id);
 assert.equal(w.rallies.length,0);assert.equal(w.sieges.length,0);assert.equal(a.groupReports[0].outcome,'Alliance territory disconnected');
 assert.deepEqual([a,b,c].map(census),counts);assert.equal(a.groupReports.length,1);assert.equal(c.groupReports.length,1);
});

test('rally and garrison load limits reject overflow atomically, counting mythics as five',()=>{
 const {w,a,b,c,d,gate}=setup();
 const set=(p,t,m)=>{p.units={infantry:t,archers:0,cavalry:0};p.troops=t;p.mythic=m;p.health=w.stats(p).maxHealth;};
 set(a,100,10);set(b,46,1);cmd(w,a,'rally-create',gate.id);const r=w.rallies[0];
 assert.throws(()=>cmd(w,b,'rally-join',r.id),/capacity/);assert.deepEqual(r.armyIds,[a.id]);assert.equal(b.target,null);
 set(c,100,9);set(d,1,1);cmd(w,c,'garrison-join',gate.id);
 assert.throws(()=>cmd(w,d,'garrison-join',gate.id),/capacity/);assert.deepEqual(w.garrisons[0].armyIds,[c.id]);assert.equal(d.target,null);
});

test('authenticated rally and reinforcement HTTP commands preserve permissions, stale-order safety and report privacy',async t=>{
 const {createGameServer}=await import('./http.mjs');const {server,world:w}=createGameServer();openKingdom(w);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const sessions=await Promise.all(['HTTP Dawn','HTTP Ally','HTTP Dusk','HTTP Observer'].map(async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json()));
 const [a,b,c,observer]=sessions.map(s=>w.authenticate(s.token));
 for(const p of[a,b,c]){p.cityLevel=2;p.buildings.oathhall=1;p.gold=p.food=10000;}
 cmd(w,a,'alliance-create','',{name:'HTTP Dawn'});cmd(w,b,'alliance-join',a.allianceId);cmd(w,c,'alliance-create','',{name:'HTTP Dusk'});
 const gate=w.sites.find(s=>s.id==='gate-east');gate.allianceId=c.allianceId;
 const flag={id:'http-supply',allianceId:a.allianceId,x:32,z:20};initializeFortification(flag);flag.isRoot=true;w.flags.push(flag);refreshBeacons(w);equip(w,a);equip(w,b);
 const post=(index,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+sessions[index].token},body:JSON.stringify(body)});
 const get=async index=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+sessions[index].token}})).json();
 assert.equal((await post(0,{type:'garrison-join',targetId:gate.id})).status,400);
 assert.equal((await post(2,{type:'garrison-join',targetId:gate.id})).status,200);
 assert.equal((await post(0,{type:'rally-create',targetId:gate.id,count:10})).status,200);const rallyId=w.rallies[0].id;
 assert.equal((await post(1,{type:'rally-join',targetId:rallyId})).status,200);
 assert.equal((await post(3,{type:'campaign-recall',targetId:a.id})).status,400);
 assert.equal((await post(1,{type:'rally-leave',marchId:a.id})).status,400);
 assert.equal((await get(1)).rallies.length,1);assert.equal((await get(3)).rallies.length,0);
 until(w,()=>w.sieges.length>0);assert.equal((await get(0)).players.find(p=>p.id===a.id).groupReports.length,1);
 until(w,()=>gate.allianceId===a.allianceId);
 const own=await get(0),outside=await get(3);assert.equal(own.version,16);
 assert.equal(own.players.find(p=>p.id===a.id).groupReports.length,1);
 assert.equal(outside.players.find(p=>p.id===a.id).groupReports,undefined);
 assert.equal(outside.players.find(p=>p.id===observer.id).groupReports.length,0);
 assert.equal((await post(1,{type:'rally-join',targetId:rallyId})).status,400);
 assert.equal(census(a),20);assert.equal(census(b),20);assert.equal(census(c),20);
});
