import { fixtureCommand } from './testing/roster-fixture.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { emptyUnits, unitTotal } from './troops.mjs';
import { wardTroops, wardMythic, counterMultiplier } from './war.mjs';
const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds * 10); i++) w.tick(0.1); };
const setup = () => {
  const w = testWorld(), sessions = ['A','B','C'].map(name => w.join(name)), players = sessions.map(s => w.authenticate(s.token));
  for (const p of players) { p.cityLevel = 2; p.food = p.gold = 10000; }
  const [a,b,c] = players; a.x = 20; a.z = 15; b.x = 21.5; b.z = 15; c.x = 19; c.z = 15;
  return { w, a,b,c,sessions };
};
const command = (w,p,type,extra={}) => fixtureCommand(w,p, { type, ...extra });
const census = p => p.troops + p.marches.reduce((n,a)=>n+a.troops,0) + p.reserveTroops + wardTroops(p);

test('field PvP rejects protected, allied, own and foreign-controlled targets before changing orders', () => {
  const {w,a,b,c}=setup();
  b.cityLevel=1; assert.throws(()=>command(w,a,'attack-player',{targetId:b.id}),/First-age/); b.cityLevel=2;
  b.x=b.homeX;b.z=b.homeZ;assert.throws(()=>command(w,a,'attack-player',{targetId:b.id}),/protected/);b.x=21.5;b.z=15;
  command(w,a,'alliance-create',{name:'Oath'});command(w,b,'alliance-join',{targetId:a.allianceId});
  assert.throws(()=>command(w,a,'attack-player',{targetId:b.id}),/alliance/);
  assert.throws(()=>command(w,c,'attack-player',{marchId:a.id,targetId:b.id}),/belong/);
  assert.throws(()=>command(w,a,'attack-player',{targetId:a.id}),/another/);assert.equal(a.target,null);assert.equal(w.battles.size,0);
});

test('a PvP round is simultaneous, runs once per second and reconciles reports including shields and healing', () => {
  const {w,a,b}=setup();command(w,a,'attack-player',{targetId:b.id});
  w.tick(0.1);let report=[...w.battles.values()][0];assert.equal(report.rounds,1);assert.equal(a.attackSequence,1);assert.equal(b.attackSequence,1);
  const hp=[a.health,b.health];advance(w,0.8);assert.deepEqual([a.health,b.health],hp);assert.equal(report.rounds,1);
  advance(w,1.2);assert.equal(report.rounds,3);
  assert.equal(report.sides[0].damageDealt,report.sides[1].damageTaken);assert.equal(report.sides[1].damageDealt,report.sides[0].damageTaken);
  a.rage=b.rage=800;advance(w,1);assert.ok(report.sides[0].shieldCreated>0);assert.ok(report.sides[1].absorbed>0);
});

test('defeat conserves typed units through wounded, paid healing and ready reserves without duplicating rewards', () => {
  const {w,a,b}=setup();b.health=1;const before=census(b), gold=a.gold;
  command(w,a,'attack-player',{targetId:b.id});w.tick(0.1);
  assert.equal(w.battles.size,0);assert.equal(b.recovery,7.9);assert.equal(b.wounded.infantry,5);assert.equal(b.troops,15);assert.equal(census(b),before);
  assert.equal(a.gold,gold);assert.equal(b.battleReports.length,1);const report=b.battleReports[0];assert.equal(report.outcome,'Attacker victory');assert.equal(report.sides[1].wounded.infantry,5);
  command(w,b,'hospital-heal',{units:{...emptyUnits(),infantry:5},mythic:0});assert.equal(b.wounded.infantry,0);assert.equal(census(b),before);
  advance(w,7);assert.equal(b.healing,null);assert.equal(b.reserveUnits.infantry,5);assert.equal(census(b),before);
  advance(w,10);assert.equal(b.reserveUnits.infantry,5);assert.equal(b.battleReports.length,1);
});

test('hospital cancellation is exact, stale cancellation cannot refund twice and batch limits are atomic', () => {
  const {w,b}=setup();b.wounded.infantry=50;b.buildings.infirmary=0;assert.throws(()=>command(w,b,'hospital-heal',{units:{...emptyUnits(),infantry:1}}),/House/);b.buildings.infirmary=1;const money={food:b.food,gold:b.gold};
  assert.throws(()=>command(w,b,'hospital-heal',{units:{...emptyUnits(),infantry:41}}),/beds/);assert.deepEqual({food:b.food,gold:b.gold},money);
  command(w,b,'hospital-heal',{units:{...emptyUnits(),infantry:7}});const id=b.healing.id;assert.equal(b.wounded.infantry,43);
  assert.throws(()=>command(w,b,'hospital-heal',{units:{...emptyUnits(),infantry:1}}),/occupied/);
  command(w,b,'hospital-cancel',{targetId:id});assert.equal(b.wounded.infantry,50);assert.deepEqual({food:b.food,gold:b.gold},money);
  assert.throws(()=>command(w,b,'hospital-cancel',{targetId:id}));assert.deepEqual({food:b.food,gold:b.gold},money);
});

test('training capacity includes hospital and queued treatment; wounded cannot be deployed from reserves', () => {
  const {w,b}=setup();b.wounded.infantry=56;b.reserveTroops=0; b.reserveUnits=emptyUnits();
  assert.throws(()=>command(w,b,'train'),/capacity/);
  command(w,b,'hospital-heal',{units:{...emptyUnits(),infantry:20}});assert.throws(()=>command(w,b,'train'),/capacity/);
  command(w,b,'unlock-commander',{targetId:'warden'});
  assert.throws(()=>command(w,b,'deploy-march',{targetId:'warden',units:{...emptyUnits(),infantry:1}}),/reserves/);
});

test('return and stop seal a report once; invalid orders and third parties cannot alter an engagement', () => {
  const {w,a,b,c}=setup();command(w,a,'attack-player',{targetId:b.id});w.tick(0.1);const id=[...w.battles.keys()][0];
  assert.throws(()=>command(w,c,'attack-player',{targetId:b.id}),/engaged/);
  assert.throws(()=>command(w,a,'move',{x:-1,z:0}),/disengage/);assert.equal([...w.battles.keys()][0],id);
  command(w,b,'return');assert.equal(w.battles.size,0);assert.equal(b.target.type,'return');assert.equal(a.target,null);
  command(w,b,'stop');assert.equal(a.battleReports.length,1);assert.equal(b.battleReports.length,1);assert.equal(b.battleReports[0].outcome,'Disengaged');
});

test('snapshot privacy excludes enemy reports and hospital data, while own completed and active reports are visible', () => {
  const {w,a,b,c}=setup();command(w,a,'attack-player',{targetId:b.id});w.tick(0.1);
  const own=w.snapshot(a.id), foreign=own.players.find(p=>p.id===b.id);
  assert.equal(own.players.find(p=>p.id===a.id).battleReports.length,1);assert.equal(foreign.battleReports,undefined);assert.equal(foreign.wounded,undefined);assert.equal(foreign.gold,undefined);
  assert.equal(w.snapshot(c.id).players.find(p=>p.id===c.id).battleReports.length,0);
});

test('active combats are sealed on restore, treatment persists and malformed hospitals are rejected', () => {
  const {w,a,b,sessions}=setup();b.wounded.archers=3;command(w,b,'hospital-heal',{units:{...emptyUnits(),archers:3}});
  command(w,a,'attack-player',{targetId:b.id});w.tick(0.1);
  const restored=World.fromSave(w.toSave()), q=restored.authenticate(sessions[1].token);
  assert.equal(restored.battles.size,0);assert.equal(q.battleReports[0].outcome,'Interrupted by restart');assert.equal(q.target,null);assert.equal(q.healing.units.archers,3);
  advance(restored,4);assert.equal(q.reserveUnits.archers,3);
  for(const mutate of [p=>p.wounded.infantry=-1,p=>p.healing.remaining=-1,p=>p.healing.id=null,p=>p.battleReports=[{id:'fake'}]]){
    const bad=structuredClone(w.toSave());mutate(bad.world.players[1]);assert.throws(()=>World.fromSave(bad),/hospital|healing|report/);
  }
});

test('schema-4 migrates an empty hospital and troop counters are a bounded mixed-composition modifier', () => {
  const {w,a}=setup(),old=structuredClone(w.toSave());old.schema=4;delete old.world.battles;
  for(const p of old.world.players)for(const k of['wounded','woundedMythic','healing','battleReports'])delete p[k];
  const restored=World.fromSave(old);assert.equal(restored.players.get(a.id).wounded.infantry,0);assert.equal(restored.toSave().schema,24);
  const infantry={troops:10,units:{infantry:10,archers:0,cavalry:0}},cavalry={troops:10,units:{infantry:0,archers:0,cavalry:10}};
  assert.equal(counterMultiplier(infantry,cavalry),1.15);assert.equal(counterMultiplier(cavalry,infantry),0.85);
});

test('PvP and hospital commands work over authenticated HTTP without exposing reports to bystanders', async t => {
  const {createGameServer}=await import('./http.mjs');const {server,world}=createGameServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
  const base='http://127.0.0.1:'+server.address().port;
  const join=async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json();
  const sessions=await Promise.all(['HTTP A','HTTP B','HTTP C'].map(join));const [a,b]=sessions.map(s=>world.authenticate(s.token));
  a.cityLevel=b.cityLevel=2;a.x=20;a.z=15;b.x=21.5;b.z=15;b.health=1;b.gold=b.food=1000;
  const post=(s,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+s.token},body:JSON.stringify(body)});
  assert.equal((await post(sessions[0],{type:'attack-player',targetId:b.id})).status,200);world.tick(0.1);
  const get=async s=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+s.token}})).json();
  const own=await get(sessions[1]),outside=await get(sessions[2]);
  assert.equal(own.players.find(p=>p.id===b.id).battleReports.length,1);assert.equal(outside.players.find(p=>p.id===b.id).battleReports,undefined);
  assert.equal((await post(sessions[1],{type:'hospital-heal',units:{infantry:5,archers:0,cavalry:0},mythic:0})).status,200);
  assert.equal((await post(sessions[2],{type:'hospital-cancel',targetId:b.healing.id})).status,400);
});


test('disengaging and reopening combat cannot bypass the attack cadence', () => {
  const {w,a,b}=setup();command(w,a,'attack-player',{targetId:b.id});w.tick(0.1);
  assert.equal(a.attackSequence,1);const hp=[a.health,b.health];
  command(w,a,'stop');command(w,a,'attack-player',{targetId:b.id});advance(w,0.5);
  assert.equal(a.attackSequence,1);assert.deepEqual([a.health,b.health],hp);
  advance(w,0.7);assert.equal(a.attackSequence,2);
});
