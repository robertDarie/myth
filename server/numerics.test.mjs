import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { World as LegacyWorld } from './testing/legacy-world.mjs';
import { reference, referenceCamp, commanderCapacity, defenseFactor } from './numerics.mjs';
import { trainingOptions, troopTypes, unitPower, unitTotal } from './troops.mjs';
import { marchTroopCap, capacity } from './city.mjs';
import { refreshEconomy, campAdmission } from './economy.mjs';
import { heroLevel, ensureHero, xpAtLevel } from './progression.mjs';
import { hospitalCapacity, retreat, tickHospital, tickBattle } from './war.mjs';
import { campaignLimits } from './campaign.mjs';
const count=p=>[p,...p.marches].reduce((n,a)=>n+a.troops,0)+p.reserveTroops+unitTotal(p.wounded)+(p.healing?unitTotal(p.healing.units):0)+p.trainingQueue.filter(j=>['train','promote'].includes(j.type)).reduce((n,j)=>n+j.amount,0);
test('reference columns retain all 25 independently supplied levels and their different meanings',()=>{
  assert.deepEqual(reference.ordinary.map(r=>r.enemyPower),[550,650,750,800,1100,1800,3600,6500,14000,38000,88000,130000,190000,300000,380000,800000,1750000,2153000,2538000,2854000,4433000,4538000,7241000,9866000,16301000]);
  assert.deepEqual(reference.ordinary.map(r=>r.recommendedTroops),[900,1100,1200,1400,1800,2400,3900,5800,8200,12000,17000,19000,29000,32000,40000,58000,68000,78000,82000,87000,92000,96000,102000,108000,120000]);
  for(let level=1;level<=25;level++){const r=referenceCamp(level);assert.equal(r.ap,50);assert.equal(r.commanderXP,100*level);assert.equal(r.recommendedTier,level<=5?1:level<=15?2:level<=20?3:4);assert.equal(r.maxHealth,r.troopCount*troopTypes({numericVersion:1}).find(t=>t.baseId==='infantry'&&t.tier===r.recommendedTier).health);}
  assert.equal(reference.ordinary[10].enemyTroops,null);assert.equal(reference.ordinary[24].advertised.oneMinuteSpeedups,4);
});
test('production armies, march capacity, training debit/completion and power use real reference units',()=>{
  const w=new World(),p=w.authenticate(w.join('Reference').token);
  assert.equal(p.numericVersion,1);assert.equal(p.troops,900);assert.equal(p.units.infantry,900);assert.equal(unitPower(p.units,p),900);assert.equal(marchTroopCap(p),2500);assert.equal(capacity(p),10000000);
  assert.equal(w.stats(p).defense,120);assert.equal(w.stats(p).maxHealth,Math.round(900*120*1.05));
  const q=trainingOptions(p).find(t=>t.id==='infantry');assert.equal(q.orderAmount,100);assert.equal(q.orderSeconds,1500);assert.deepEqual(q.orderCost,{food:5000,wood:5000});
  p.food=p.wood=10000;const before=count(p);w.command(p,{type:'train',targetId:'infantry'});assert.equal(count(p),before+100);assert.equal(p.food,5000);assert.equal(p.wood,5000);w.cityTick(p,1499);assert.equal(p.reserveTroops,0);w.cityTick(p,1);assert.equal(p.reserveUnits.infantry,100);assert.equal(count(p),before+100);
  for(let age=1;age<=5;age++){p.cityLevel=age;assert.equal(marchTroopCap(p),[0,2000,9000,28000,57000,150000][age]+500);}
  assert.equal(commanderCapacity(60),50000);assert.equal(commanderCapacity(16),7000);assert.ok(defenseFactor(192)<defenseFactor(120));
  assert.equal(campaignLimits(w).rallyLoad,1500000);
  for(const t of troopTypes(p))assert.equal(unitPower({[t.id]:1},p),[0,1,2,3,4,10][t.tier]);
});
test('production AP regenerates once per 36 seconds, respects cap and charges once per generation across restart',()=>{
  let now=Date.UTC(2026,10,14);const w=new World({now:()=>now}),s=w.join('AP'),p=w.authenticate(s.token),c=w.camps[0];
  assert.equal(p.ap,1500);assert.equal(campAdmission(w,p,c),true);assert.equal(p.ap,1450);campAdmission(w,p,c);assert.equal(p.ap,1450);
  now+=35999;refreshEconomy(w,p);assert.equal(p.ap,1450);now++;refreshEconomy(w,p);assert.equal(p.ap,1451);
  const r=World.fromSave(w.toSave(),{now:()=>now}),q=r.authenticate(s.token);campAdmission(r,q,r.camps[0]);assert.equal(q.ap,1451);r.camps[0].cycle++;campAdmission(r,q,r.camps[0]);assert.equal(q.ap,1401);
  now+=360000000;refreshEconomy(r,q);assert.equal(q.ap,1500);assert.equal(q.apRemainder,0);
  // Entitlement count is bounded by the NPC pool, rather than the obsolete cap30.
  for(const c of r.camps)q.campPasses[c.id]=c.cycle;assert.doesNotThrow(()=>World.fromSave(r.toSave(),{now:()=>now}));
});
test('legacy schema26 migrates typed armies, paid jobs, hospital and AP exactly once without changing reports or input',()=>{
  const old=new LegacyWorld(),s=old.join('Legacy'),p=old.authenticate(s.token);p.food=p.wood=1000;
  old.command(p,{type:'train',targetId:'infantry'});p.wounded.infantry=2;p.healing={id:'paid-treatment',units:{infantry:1,archers:0,cavalry:0},mythic:0,cost:{food:2,gold:1},duration:3,remaining:2};
  p.health=old.stats(p).maxHealth*.4;p.ap=33;p.apRemainder=30000;p.heroRecords.captain.xp=250;
  const legacyCount=count(p),data=structuredClone(old.toSave());data.schema=26;delete data.world.numericVersion;for(const q of data.world.players)delete q.numericVersion;
  const original=structuredClone(data),r=World.fromSave(data),q=r.authenticate(s.token);
  assert.deepEqual(data,original);assert.equal(count(q),legacyCount*50);assert.equal(q.units.infantry,1000);assert.equal(q.wounded.infantry,100);assert.equal(q.healing.units.infantry,50);assert.equal(q.trainingQueue[0].amount,250);assert.equal(q.trainingQueue[0].duration,p.trainingQueue[0].duration);assert.deepEqual(q.trainingQueue[0].cost,p.trainingQueue[0].cost);
  assert.equal(q.ap,495);assert.equal(q.apRemainder,18000);assert.equal(q.health/r.stats(q).maxHealth,.4);assert.equal(heroLevel(q.heroRecords.captain),3);assert.deepEqual(q.battleReports,p.battleReports);
  const again=World.fromSave(r.toSave()),a=again.authenticate(s.token);assert.equal(count(a),count(q));assert.equal(a.ap,q.ap);assert.deepEqual(again.numericMigration,r.numericMigration);
  tickHospital(again,a,2);assert.equal(count(a),count(q));again.cityTick(a,8);assert.equal(count(a),count(q));
  const bank=structuredClone(original);bank.world.players[0].heroRecords.captain.xp=2500;const banked=World.fromSave(bank).authenticate(s.token).heroRecords.captain;assert.equal(heroLevel(banked),10);assert.ok(banked.xp>xpAtLevel(banked,10));
  const corrupt=structuredClone(original);corrupt.world.players[0].units.infantry=-1;assert.throws(()=>World.fromSave(corrupt));
});
test('production wounds and paid treatment conserve real soldiers, and XP rarity changes level thresholds',()=>{
  const w=new World(),p=w.authenticate(w.join('Hospital').token),before=count(p),report={wounded:{infantry:0,archers:0,cavalry:0},woundedMythic:0};
  retreat(w,p,report);assert.equal(p.troops,675);assert.equal(p.wounded.infantry,225);assert.equal(count(p),before);assert.equal(hospitalCapacity(p),2000);
  p.buildings.infirmary=1;p.food=p.gold=10000;w.command(p,{type:'hospital-heal',units:{infantry:225,archers:0,cavalry:0}});assert.equal(count(p),before);tickHospital(w,p,1000);assert.equal(p.reserveTroops,225);assert.equal(count(p),before);assert.doesNotThrow(()=>World.fromSave(w.toSave()));
  const captain=ensureHero(p,'captain');assert.equal(xpAtLevel(captain,2),60);assert.equal(xpAtLevel(captain,3),240);captain.xp=239;assert.equal(heroLevel(captain),2);captain.xp++;assert.equal(heroLevel(captain),3);
});
test('production engine settles ordinary combat and PvP with actual large armies and conserved wounded',()=>{
  const w=new World(),p=w.authenticate(w.join('First').token),c=w.camps[0];
  p.x=c.x;p.z=c.z;p.target={type:'attack',id:c.id};p.deployed=true;
  for(let i=0;i<300&&c.health>0&&p.recovery===0;i++){p.cooldown=0;w.battle(p,c,w.stats(p));}
  assert.equal(c.health,0);assert.equal(p.ap,1450);assert.equal(p.heroRecords.captain.xp,100);assert.ok(p.health>0);assert.equal(p.troops,900);
  const resources=p.food,revision=w.logisticsRevision;w.tick(.1);assert.equal(p.food,resources);assert.ok(w.logisticsRevision>=revision);
  const q=w.authenticate(w.join('Second').token);p.target=null;p.cityLevel=q.cityLevel=2;p.x=q.x=20;p.z=20;q.z=21;p.deployed=q.deployed=true;
  q.units.infantry=q.troops=450;p.health=w.stats(p).maxHealth;q.health=w.stats(q).maxHealth;p.target={type:'pvp',id:q.id};
  const total=count(p)+count(q);
  for(let i=0;i<500&&(p.target?.type==='pvp'||w.battles.size);i++){w.time++;p.cooldown=q.cooldown=0;tickBattle(w,p,q);}
  assert.equal(w.battles.size,0);assert.equal(count(p)+count(q),total);assert.equal(q.wounded.infantry,112);assert.equal(q.troops,338);assert.ok(p.battleReports.length);assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});

test('production promotion quotes match the charged full batch and preserve troop count',()=>{
  const w=new World(),p=w.authenticate(w.join('Promotion').token);p.cityLevel=2;p.buildings.barracks=p.buildings.academy=2;p.technologies.drill=p.technologies.veterans=1;p.reserveTroops=p.reserveUnits.infantry=100;
  const q=trainingOptions(p).find(t=>t.id==='veteranInfantry'),before=count(p);assert.equal(q.promotionAmount,100);assert.deepEqual(q.promotionCost,{food:5000,wood:5000});
  w.command(p,{type:'promote',targetId:q.id});const job=p.trainingQueue[0];assert.deepEqual(job.cost,q.promotionCost);assert.equal(job.duration,q.promotionSeconds);assert.equal(count(p),before);w.cityTick(p,job.duration);assert.equal(p.reserveUnits.veteranInfantry,100);assert.equal(p.reserveUnits.infantry,0);assert.equal(count(p),before);assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});
