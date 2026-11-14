import { validUnits, unitTotal } from './troops.mjs';
import { randomUUID } from 'node:crypto';
import { referenceScale, referenceCamp, defenseFactor } from './numerics.mjs';
import { armyList, ensureHero, heroLevel, activeSkill } from './progression.mjs';
import { economyTime, refreshEconomy } from './economy.mjs';
import { coreReport } from './field-logistics.mjs';
import { grantReward } from './inventory.mjs';
import { retreat } from './war.mjs';
import { recordActivity } from './activity.mjs';
import { recordEvent } from './events.mjs';
import { recordKingdomVictory } from './kingdom.mjs';
export const FORSAKEN_RULES=Object.freeze({version:1,maxLevel:25,respawnSeconds:90,rareChance:.1,kingdomLevelDays:1});
export const kingdomForsakenLevel=w=>Math.min(25,6+Math.floor(Math.max(0,economyTime(w)-w.kingdom.startedAtMs)/86400000));
export function initializeForsakenPlayer(w,p,migrated=false) {
  if(!referenceScale(p))return;
  p.forsaken={version:1,unlocked:migrated?6:1,firstClears:[],admissions:{}};
  if(migrated)for(const c of w.camps)if(p.campPasses[c.id]===c.cycle)p.forsaken.admissions[c.id]={cycle:c.cycle,armyIds:armyList(p).map(a=>a.id)};
}
export function configureForsaken(c) {
  const r=referenceCamp(c.level),fraction=c.maxHealth?c.health/c.maxHealth:1;
  c.name='Forsaken Lv. '+c.level;c.category='forsaken';c.maxHealth=r.maxHealth;c.health=Math.max(0,Math.min(1,fraction))*r.maxHealth;
}
export function forsakenCard(c) {
  const r=referenceCamp(c.level);
  return {id:c.id,name:'Forsaken Lv. '+c.level,category:'forsaken',level:c.level,x:c.x,z:c.z,health:c.health,maxHealth:c.maxHealth,respawn:Math.ceil(c.respawn),cycle:c.cycle,
    enemyPower:r.enemyPower,enemyTroops:r.troopCount,enemyTier:r.recommendedTier,attack:r.attack,defense:r.defense,damage:r.retaliation,recommendedTroops:r.recommendedTroops,recommendedTier:r.recommendedTier,commanderXP:r.commanderXP,apCost:r.ap};
}
export function validateForsaken(w,p) {
  const f=p.forsaken;
  if(!f||f.version!==1||!Number.isInteger(f.unlocked)||f.unlocked<1||f.unlocked>25||!Array.isArray(f.firstClears)||new Set(f.firstClears).size!==f.firstClears.length||f.firstClears.some(n=>!Number.isInteger(n)||n<1||n>25||n>f.unlocked)||!f.admissions||Array.isArray(f.admissions)||Object.keys(f.admissions).length>w.camps.length)throw new Error('Invalid saved Forsaken progression.');
  for(const [id,r] of Object.entries(f.admissions)){const c=w.camps.find(c=>c.id===id);if(!c||!Number.isSafeInteger(r.cycle)||r.cycle<1||r.cycle>c.cycle||!Array.isArray(r.armyIds)||r.armyIds.length>32||new Set(r.armyIds).size!==r.armyIds.length||r.armyIds.some(id=>typeof id!=='string'||!id))throw new Error('Invalid saved Forsaken admission.');}
}
export function restoreForsaken(w,migrated) {
  if(!referenceScale(w))return;
  for(const c of w.camps){if(!Number.isInteger(c.level)||c.level<1||c.level>25||c.health>c.maxHealth||c.respawn>FORSAKEN_RULES.respawnSeconds)throw new Error('Invalid saved Forsaken state.');if(migrated)configureForsaken(c);else if(c.maxHealth!==referenceCamp(c.level).maxHealth)throw new Error('Invalid saved Forsaken health.');if(c.encounter&&(!c.encounter.participants||Object.keys(c.encounter.participants).length>64||c.encounter.cycle!==c.cycle))throw new Error('Invalid saved Forsaken encounter.');}
  for(const c of w.camps)if(c.encounter)for(const [id,e] of Object.entries(c.encounter.participants)){
    const p=w.players.get(e.playerId);
    if(!p||e.armyId!==id||typeof e.id!=='string'||!e.id||!p.ownedCommanders.includes(e.commanderId)||e.secondaryCommanderId&&!p.ownedCommanders.includes(e.secondaryCommanderId)||!validUnits(e.unitsBefore)||!validUnits(e.wounded)||unitTotal(e.unitsBefore)!==e.unitsBeforeCount||typeof e.defeated!=='boolean'||![0,50].includes(e.apCharged)||['damageDealt','damageTaken','woundedMythic'].some(k=>!Number.isFinite(e[k])||e[k]<0)||e.damageDealt>c.maxHealth)throw new Error('Invalid saved Forsaken participant.');
  }
  for(const p of w.players.values()){
    if(migrated)initializeForsakenPlayer(w,p,true);validateForsaken(w,p);
    p.discovery=p.discovery.map(r=>r.kind==='camps'?{...r,value:{...r.value,name:'Forsaken Lv. '+r.value.level}}:r);
  }
  w.pveVersion=1;
}
export function forsakenReason(w,p,c) {
  if(!p.forsaken||c.level>p.forsaken.unlocked)return 'Defeat Forsaken Lv. '+(p.forsaken?.unlocked??1)+' to unlock the next level.';
  if(c.level>kingdomForsakenLevel(w))return 'This Forsaken level is not yet available in this kingdom.';
  return '';
}
function admission(w,p,a,c) {
  const old=p.forsaken.admissions[c.id];
  if(old?.cycle===c.cycle&&old.armyIds.includes(a.id))return {ok:true,charged:0};
  if(forsakenReason(w,p,c))return {ok:false,reason:forsakenReason(w,p,c)};
  refreshEconomy(w,p);if(p.ap<50)return {ok:false,reason:'Not enough AP'};
  const r=old?.cycle===c.cycle?old:{cycle:c.cycle,armyIds:[]};
  if(r.armyIds.length>=32)return {ok:false,reason:'This encounter has reached its admission limit.'};
  p.ap-=50;r.armyIds.push(a.id);p.forsaken.admissions[c.id]=r;p.campPasses[c.id]=c.cycle;w.logisticsRevision++;
  return {ok:true,charged:50};
}
export function forsakenLoot(w,level) {
  // Resource alternatives and guaranteed book/time quantities follow the reference.
  // Equal branch weights and the optional 10% ToM item chance are provisional policy.
  const branch=w.chooseIndex(4),resource=['food','wood','stone','gold'][branch],amount=[2000,2000,1500,1000][branch]*level;
  const r=referenceCamp(level),items={'chronicle-page':level,'universal-minute':r.advertised.oneMinuteSpeedups};
  if(w.random()<FORSAKEN_RULES.rareChance)items[w.chooseIndex(2)===0?'echo-sigil':'stone-pack-75']=1;
  return {[resource]:amount,items};
}
function writeReport(w,p,c,e,outcome,reward={},firstClear={}) {
  const resources=Object.fromEntries(['food','wood','gold','stone','mana'].map(k=>[k,reward[k]??0]));
  const a=w.army(e.armyId),hp=a?.health??0;
  coreReport(w,p,{id:e.id,type:'pve',title:c.name+' · '+outcome,outcome,
    detail:c.name+' · '+e.unitsBeforeCount+' real troops · '+e.damageDealt+' damage dealt · '+Math.ceil(e.damageTaken)+' damage received · '+e.apCharged+' AP charged · '+(outcome==='Victory'?100*c.level:0)+' XP per commander · '+unitCount(e.wounded)+' severe wounded · '+Math.ceil(hp)+' HP remaining',
    encounterId:c.id,encounterCycle:c.cycle,armyId:e.armyId,commanderId:e.commanderId,unitsBefore:e.unitsBefore,unitsAfter:{...a?.units},wounded:e.wounded,healthRemaining:hp,damageDealt:e.damageDealt,damageTaken:e.damageTaken,apCharged:e.apCharged,commanderXP:outcome==='Victory'?100*c.level:0,resources,items:reward.items??{},firstClear});
}
const unitCount=u=>Object.values(u??{}).reduce((n,v)=>n+v,0);
export function fightForsaken(w,a,c,stats) {
  if(c.health<=0||c.respawn>0)return;
  if(c.encounter&&!c.encounter.participants[a.id]&&Object.keys(c.encounter.participants).length>=64){a.target=null;a.state='Encounter participant limit reached';return;}
  const p=w.owner(a),admitted=admission(w,p,a,c);
  if(!admitted.ok){a.target=null;a.state=admitted.reason;return;}
  c.encounter??={cycle:c.cycle,participants:{}};
  const e=c.encounter.participants[a.id]??={id:randomUUID(),armyId:a.id,playerId:p.id,commanderId:a.commanderId,secondaryCommanderId:a.secondaryCommanderId||'',unitsBefore:{...a.units},unitsBeforeCount:a.troops,damageDealt:0,damageTaken:0,apCharged:admitted.charged,wounded:{infantry:0,archers:0,cavalry:0},woundedMythic:0,defeated:false};
  if(e.defeated){a.target=null;a.state='This march has already retreated from this encounter.';return;}
  const npc=referenceCamp(c.level),effective=stats.damage*stats.pve*defenseFactor(npc.defense);
  a.cooldown=1;a.attackSequence=(a.attackSequence??0)+1;a.attackX=c.x;a.attackZ=c.z;a.rage=Math.min(1000,a.rage+200);
  let damage=Math.min(c.health,Math.max(1,Math.round(effective)));c.health-=damage;
  if(c.health>0&&a.rage>=1000){const extra=Math.min(c.health,activeSkill(p,a,{...stats,damage:effective}));c.health-=extra;damage+=extra;}
  e.damageDealt+=damage;c.contributors[a.id]=(c.contributors[a.id]??0)+damage;
  if(c.health===0){
    c.respawn=FORSAKEN_RULES.respawnSeconds;w.logisticsRevision++;recordKingdomVictory(w,'camps');
    const paidOwners=new Set();
    for(const entry of Object.values(c.encounter.participants)){
      if(entry.defeated||entry.damageDealt<=0)continue;
      const member=w.players.get(entry.playerId);if(!member)continue;
      const reward=forsakenLoot(w,c.level);grantReward(member,reward);
      for(const id of [entry.commanderId,entry.secondaryCommanderId].filter(Boolean))ensureHero(member,id).xp+=100*c.level;
      const actor=w.army(entry.armyId);if(actor){actor.xp=ensureHero(member,actor.commanderId).xp;actor.level=heroLevel(ensureHero(member,actor.commanderId));if(actor.target?.id===c.id){actor.target=null;actor.state='Victorious';}}
      let firstClear={};
      if(!paidOwners.has(member.id)){
        paidOwners.add(member.id);member.kills++;recordActivity(w,member,'camps',1,c.id+':'+c.cycle);recordEvent(w,member,'camps',1,c.id+':'+c.cycle);
        if(!member.forsaken.firstClears.includes(c.level)){
          member.forsaken.firstClears.push(c.level);member.forsaken.unlocked=Math.max(member.forsaken.unlocked,Math.min(25,c.level+1));
          const pages=c.level===8?5:c.level===24?75:0,tonics=[7,9,15].includes(c.level)?5:c.level===25?25:0;
          firstClear={items:{...(pages?{'chronicle-page':pages}:{}),...(tonics?{'ap-tonic-20':tonics}:{})}};grantReward(member,firstClear);
        }
      }
      writeReport(w,member,c,entry,'Victory',reward,firstClear);
    }
    w.event(p.name+' defeated '+c.name+'.');
  }else{
    const hit=npc.retaliation*defenseFactor(stats.defense)*(1-stats.mitigation),absorbed=Math.min(a.shield,hit);a.shield-=absorbed;
    const taken=Math.min(a.health,hit-absorbed);a.health-=taken;e.damageTaken+=taken;
    if(a.health<=0){e.defeated=true;retreat(w,a,e);w.logisticsRevision++;writeReport(w,p,c,e,'Defeat');}
  }
}
