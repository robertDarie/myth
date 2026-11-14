import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { runCalibration, variants } from '../scripts/forsaken-calibration.mjs';
import { configureForsaken, forsakenCard, forsakenLoot } from './forsaken.mjs';
import { ensureHero, xpAtLevel } from './progression.mjs';
import { ensureArmaments } from './city.mjs';
import { openRealm } from './realms.mjs';
import { unitTotal } from './troops.mjs';
const setup=()=>{const w=new World({random:()=>.25,now:()=>Date.UTC(2026,10,14)}),s=w.join('Hunter'),p=w.authenticate(s.token),c=w.camps[0];p.buildings.lumber=0;p.x=p.z=c.x=c.z=22;p.deployed=true;return {w,s,p,c};};
const attack=(w,p,c)=>w.command(p,{type:'attack',targetId:c.id});
const settle=(w,p,c)=>{for(let i=0;i<2400&&!p.coreReports.some(r=>r.encounterCycle===c.cycle&&r.encounterId===c.id);i++)w.tick(.25);return p.coreReports.find(r=>r.encounterCycle===c.cycle&&r.encounterId===c.id);};
test('175 real engine battles measure recommendations, lower counts, higher counts, commanders, tiers and research',()=>{
  const measured=runCalibration();assert.equal(measured.rows.length,175);
  for(let level=1;level<=25;level++){
    const rows=measured.rows.filter(r=>r.level===level),base=rows.find(r=>r.variant==='recommended');assert.equal(rows.length,variants.length);
    assert.equal(base.outcome,'Victory');assert.equal(base.xpAwarded,100*level);assert.equal(base.apCharged,50);assert.equal(base.items['chronicle-page'],level);assert.equal(base.wounded,0);
    const half=rows.find(r=>r.variant==='half');assert.equal(half.outcome,'Defeat');assert.equal(half.xpAwarded,0);assert.equal(half.apCharged,50);assert.equal(half.remainingTroops+half.wounded,half.attackerTroops);
    assert.ok(rows.find(r=>r.variant==='more').remainingHealth/base.initialHealth>base.remainingHealth/base.initialHealth);
    assert.ok(rows.find(r=>r.variant==='technology').seconds<=base.seconds);
    if(level>=6)assert.ok(rows.find(r=>r.variant==='lower-tier').remainingHealth/rows.find(r=>r.variant==='lower-tier').initialHealth<base.remainingHealth/base.initialHealth);
  }
});
test('ordinary names and stable IDs survive old numeric saves; level locks and first clear are authoritative',()=>{
  const {w,s,p,c}=setup();assert.equal(c.id,'forsaken-1');assert.equal(c.name,'Forsaken Lv. 1');
  const next=w.camps.find(c=>c.level===2);p.x=next.x;p.z=next.z;assert.throws(()=>attack(w,p,next),/unlock/);p.x=p.z=22;
  attack(w,p,c);const report=settle(w,p,c);assert.equal(report.outcome,'Victory');assert.equal(p.forsaken.unlocked,2);assert.deepEqual(p.forsaken.firstClears,[1]);assert.equal(p.kills,1);assert.equal(p.inventory['chronicle-page'],1);assert.equal(p.inventory['universal-minute'],1);assert.equal(p.wood,12000);
  const r=World.fromSave(w.toSave(),{now:w.now,random:w.random}),q=r.authenticate(s.token),dead=r.camps[0],before={xp:q.xp,pages:q.inventory['chronicle-page'],wood:q.wood,kills:q.kills};
  r.battle(q,dead,r.stats(q));r.tick(.25);assert.deepEqual({xp:q.xp,pages:q.inventory['chronicle-page'],wood:q.wood,kills:q.kills},before);
  const old=structuredClone(w.toSave());delete old.world.pveVersion;delete old.world.players[0].forsaken;old.world.camps[0].name='Old camp';
  const migrated=World.fromSave(old,{now:w.now,random:w.random});assert.equal(migrated.players.get(p.id).forsaken.unlocked,6);assert.ok(migrated.camps.every(c=>c.name==='Forsaken Lv. '+c.level));
});
test('two owned marches each pay once and earn their own legitimate loot; first-clear and kill credit pay once per owner',()=>{
  const {w,s,p,c}=setup();p.cityLevel=2;p.x=p.homeX;p.z=p.homeZ;p.deployed=false;p.ownedCommanders.push('warden');ensureHero(p,'warden');ensureArmaments(p);p.reserveTroops=p.reserveUnits.infantry=900;
  w.command(p,{type:'deploy-march',targetId:'warden',troops:900});const second=p.marches[0];p.x=p.z=second.x=second.z=22;
  attack(w,p,c);w.command(p,{type:'attack',targetId:c.id,marchId:second.id});w.tick(.25);assert.equal(p.ap,1400);
  const r=World.fromSave(w.toSave(),{now:w.now,random:w.random}),q=r.authenticate(s.token),camp=r.camps[0];q.x=q.z=q.marches[0].x=q.marches[0].z=22;attack(r,q,camp);r.command(q,{type:'attack',targetId:camp.id,marchId:q.marches[0].id});
  for(let i=0;i<500&&camp.health>0;i++)r.tick(.25);
  assert.equal(q.ap,1400);assert.equal(q.heroRecords.captain.xp,100);assert.equal(q.heroRecords.warden.xp,100);assert.equal(q.inventory['chronicle-page'],2);assert.equal(q.wood,14000);assert.equal(q.kills,1);assert.deepEqual(q.forsaken.firstClears,[1]);assert.equal(q.coreReports.filter(r=>r.encounterId===camp.id).length,2);
});
test('defeat, wounds, encounter membership and AP entitlement survive restart without a free retry',()=>{
  const {w,s,p,c}=setup();p.troops=p.units.infantry=450;p.health=w.stats(p).maxHealth;attack(w,p,c);const report=settle(w,p,c);assert.equal(report.outcome,'Defeat');assert.equal(p.wounded.infantry,112);assert.equal(p.troops,338);assert.equal(p.inventory['chronicle-page']??0,0);
  const r=World.fromSave(w.toSave(),{now:w.now,random:w.random}),q=r.authenticate(s.token),camp=r.camps[0],ap=q.ap,hp=camp.health;r.battle(q,camp,r.stats(q));assert.equal(q.ap,ap);assert.equal(camp.health,hp);assert.equal(q.coreReports.filter(r=>r.encounterId===camp.id).length,1);assert.equal(q.troops+unitTotal(q.wounded),450);
});
test('secondary XP, actual chronicle use, advertised alternatives and provisional rare loot stay separate',()=>{
  const {w,p,c}=setup();p.ownedCommanders.push('warden');ensureHero(p,'warden');ensureArmaments(p);p.secondaryCommanderId='warden';p.health=w.stats(p).maxHealth;attack(w,p,c);settle(w,p,c);assert.equal(p.heroRecords.captain.xp,100);assert.equal(p.heroRecords.warden.xp,100);
  const old=p.heroRecords.warden.xp;w.command(p,{type:'inventory-use',targetId:'chronicle-page',count:1,name:'warden'});assert.equal(p.heroRecords.warden.xp,old+100);assert.equal(p.inventory['chronicle-page'],0);
  assert.throws(()=>w.command(p,{type:'inventory-use',targetId:'chronicle-page',name:'foreign'}));
  const rare=forsakenLoot({chooseIndex:()=>0,random:()=>0},25);assert.equal(rare.food,50000);assert.equal(rare.wood,undefined);assert.equal(rare.aether,undefined);assert.equal(rare.items['echo-sigil'],1);assert.equal(rare.items['universal-minute'],4);
  const ordinary=forsakenLoot({chooseIndex:()=>3,random:()=>.99},25);assert.equal(ordinary.gold,25000);assert.equal(ordinary.items['echo-sigil'],undefined);
  assert.equal(p.heroRecords.captain.xpLevelStart,undefined);assert.equal(w.snapshot(p.id).players.find(q=>q.id===p.id).heroProgress.find(h=>h.id==='captain').xpNextLevel,xpAtLevel(p.heroRecords.captain,3));
});
test('snapshots and remembered intelligence contain public recommendations without private encounter ledgers',()=>{
  const {w,p,c}=setup();attack(w,p,c);w.tick(.25);const card=w.snapshot(p.id).camps.find(x=>x.id===c.id);assert.equal(card.recommendedTroops,900);assert.equal(card.enemyPower,550);assert.equal(card.apCost,50);assert.equal(card.encounter,undefined);assert.equal(card.contributors,undefined);assert.ok(Object.values(forsakenCard(c)).every(v=>typeof v!=='object'));
  const data=structuredClone(w.toSave());data.world.players[0].forsaken.unlocked=26;assert.throws(()=>World.fromSave(data),/Forsaken/);
  const bad=structuredClone(w.toSave());bad.world.camps[0].encounter.participants[p.id].damageTaken=-1;assert.throws(()=>World.fromSave(bad),/Forsaken/);
});
test('failed durable victory restores health, loot, XP, unlocks and receipts; recovery pays once',()=>{
  const {w,s,p,c}=setup();attack(w,p,c);let fail=true;
  const realm=openRealm({id:'test',name:'Atomic encounter',store:{load:()=>w,save:()=>{if(fail&&w.camps[0].health===0)throw new Error('Injected settlement failure');}}});
  try{
    for(let i=0;i<1000&&!realm.persistence.error;i++)realm.tick(realm.previous+100);
    assert.ok(realm.persistence.error);let q=w.authenticate(s.token);assert.equal(q.kills,0);assert.equal(q.heroRecords.captain.xp,0);assert.equal(q.inventory['chronicle-page']??0,0);assert.equal(q.wood,10000);assert.equal(q.forsaken.unlocked,1);assert.ok(w.camps[0].health>0);
    fail=false;assert.equal(realm.saveNow(),true);for(let i=0;i<50&&w.camps[0].health>0;i++)realm.tick(realm.previous+100);q=w.authenticate(s.token);assert.equal(q.kills,1);assert.equal(q.heroRecords.captain.xp,100);assert.equal(q.inventory['chronicle-page'],1);
    const r=World.fromSave(w.toSave(),{now:w.now,random:w.random});r.battle(r.authenticate(s.token),r.camps[0],r.stats(r.authenticate(s.token)));assert.equal(r.authenticate(s.token).kills,1);
  }finally{fail=false;realm.close();}
});
