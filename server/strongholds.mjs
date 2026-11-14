import { recordKingdomVictory } from './kingdom.mjs';
import { recordStrongholdActivity } from './activity.mjs';
import { activeSkill, ensureHero, heroLevel } from './progression.mjs';
import { applyDamage, counterMultiplier } from './war.mjs';
export const STRONGHOLD_RULES={minMarches:2,roundLimit:90,respawnSeconds:300};
const TIERS={
 1:{guardHealth:300,guardDamage:12,maxHealth:180,units:{infantry:60,archers:0,cavalry:0},reward:{wood:120,food:160,gold:160,stone:80,mana:8,sigils:2},xp:100},
 2:{guardHealth:650,guardDamage:25,maxHealth:300,units:{infantry:70,archers:60,cavalry:0},reward:{wood:240,food:300,gold:300,stone:160,mana:16,sigils:3},xp:200},
 3:{guardHealth:1050,guardDamage:44,maxHealth:500,units:{infantry:70,archers:70,cavalry:70},reward:{wood:400,food:500,gold:500,stone:240,mana:30,sigils:5},xp:350}
};
const DEFINITIONS=[['godbreaker-watch','Godbreaker Watch',1,27,20],['godbreaker-redoubt','Godbreaker Redoubt',1,14,32],['godbreaker-forge','Godbreaker War Forge',2,53,24],['godbreaker-spire','Godbreaker Runic Spire',2,24,53],['godbreaker-throne','Throne of the Godbreakers',3,62,61],['frontier-dawn-keep','Dawnreach Keep',1,224,48],['frontier-ashen-keep','Ashen Keep',1,48,224],['frontier-outer-throne','Throne of the Far Marches',3,224,224]];
export const isStronghold=t=>t?.kind==='stronghold';
export function createStrongholds(){return DEFINITIONS.map(([id,name,tier,x,z])=>{const t=TIERS[tier];return {id,name,tier,x,z,kind:'stronghold',allianceId:'',health:t.maxHealth,maxHealth:t.maxHealth,guardHealth:t.guardHealth,maxGuardHealth:t.guardHealth,guardDamage:t.guardDamage,units:{...t.units},respawn:0,cycle:1,reward:{...t.reward},xp:t.xp};});}
export function resetStronghold(t){if(isStronghold(t)&&t.respawn<=0){t.health=t.maxHealth;t.guardHealth=t.maxGuardHealth;}}
export function tickStrongholds(w,dt){for(const t of w.strongholds)if(t.respawn>0){t.respawn=Math.max(0,t.respawn-dt);if(t.respawn===0){t.cycle++;resetStronghold(t);}}}
export function initStrongholdReport(report,t){Object.assign(report,{kind:'stronghold',tier:t.tier,targetCycle:t.cycle,guardHealthBefore:t.guardHealth,guardHealthAfter:t.guardHealth,wallHealthBefore:t.health,wallHealthAfter:t.health,npcDamageDealt:0,npcDamageTaken:0,rewards:[],settled:false});}
const distribute=(total,hits,field)=>{const sum=hits.reduce((n,h)=>n+h.amount,0);let left=total;hits.forEach((h,i)=>{const actual=i===hits.length-1?left:total*h.amount/sum;h.entry[field]+=actual;left-=actual;});};
export function strongholdRound(w,r,t,s){
 const report=s.report;if(w.time+0.0001<s.nextAt)return null;s.nextAt=w.time+1;report.rounds++;
 const armies=r.armyIds.map(id=>w.army(id)).filter(Boolean),guardAlive=t.guardHealth>0,hits=[],npc={units:t.units,troops:Object.values(t.units).reduce((n,v)=>n+v,0)};
 const victim=guardAlive?armies[(report.rounds-1)%armies.length]:null;
 const retaliation=victim?Math.max(1,t.guardDamage*counterMultiplier(npc,victim)*(1-w.stats(victim).mitigation)):0;
 for(const a of armies){
  if(a.cooldown>0.0001)continue;const entry=report.participants.find(e=>e.armyId===a.id),stats=w.stats(a),health=a.health,shield=a.shield;
  const damage=stats.damage*stats.pve*(guardAlive?counterMultiplier(a,npc):1);a.rage=Math.min(1000,a.rage+200);
  const extra=a.rage>=1000?activeSkill(w.owner(a),a,{...stats,damage}):0;
  entry.healed+=Math.max(0,a.health-health);entry.shieldCreated+=Math.max(0,a.shield-shield);
  hits.push({entry,amount:Math.max(1,Math.round(damage+extra))});a.cooldown=1;a.attackSequence=(a.attackSequence||0)+1;a.attackX=t.x;a.attackZ=t.z;
  a.target={type:'siege',id:t.id,x:t.x,z:t.z};a.state='Siege fighting';
 }
 if(hits.length){const actual=Math.min(guardAlive?t.guardHealth:t.health,hits.reduce((n,h)=>n+h.amount,0));
  if(guardAlive){t.guardHealth-=actual;report.npcDamageTaken+=actual;distribute(actual,hits,'damageDealt');}
  else{t.health-=actual;report.structureDamage+=actual;distribute(actual,hits,'structureDamage');}}
 // Retaliation was prepared before incoming damage, preserving simultaneous rounds.
 if(victim){const entry=report.participants.find(e=>e.armyId===victim.id);report.npcDamageDealt+=applyDamage(victim,retaliation,entry);}
 report.guardHealthAfter=t.guardHealth;report.wallHealthAfter=t.health;
 return t.health<=0?'victory':report.rounds>=STRONGHOLD_RULES.roundLimit?'timeout':null;
}
function apportion(total,entries){
 const sum=entries.reduce((n,e)=>n+e.weight,0),rows=entries.map(e=>{const exact=total*e.weight/sum;return {...e,amount:Math.floor(exact),fraction:exact-Math.floor(exact)};});
 const order=[...rows].sort((a,b)=>b.fraction-a.fraction||a.id.localeCompare(b.id));let remaining=total-rows.reduce((n,r)=>n+r.amount,0);
 for(let i=0;remaining>0;i++,remaining--)order[i%order.length].amount++;return new Map(rows.map(r=>[r.id,r.amount]));
}
export function rewardStronghold(w,t,report){
 if(report.settled)return;report.settled=true;
 const entries=report.participants.filter(e=>e.team==='Attackers'&&e.damageDealt+e.structureDamage>0&&w.players.has(e.playerId));
 const cityWeights=new Map();for(const e of entries)cityWeights.set(e.playerId,(cityWeights.get(e.playerId)||0)+e.damageDealt+e.structureDamage);
 const cities=[...cityWeights].map(([id,weight])=>({id,weight}));if(!cities.length)return;
 report.rewards=cities.map(c=>({playerId:c.id,contribution:c.weight,resources:{},xp:0}));
 for(const [resource,total]of Object.entries(t.reward))for(const [id,amount]of apportion(total,cities)){w.players.get(id)[resource]+=amount;report.rewards.find(r=>r.playerId===id).resources[resource]=amount;}
 for(const [id,amount]of apportion(t.xp,cities)){
  const p=w.players.get(id),own=entries.filter(e=>e.playerId===id),weights=own.map(e=>({id:e.armyId,weight:e.damageDealt+e.structureDamage}));
  report.rewards.find(r=>r.playerId===id).xp=amount;p.strongholdVictories++;
  for(const [armyId,xp]of apportion(amount,weights)){
   const entry=own.find(e=>e.armyId===armyId),hero=ensureHero(p,entry.commanderId);hero.xp+=xp;entry.experience=xp;
   const a=w.army(armyId);if(a&&a.commanderId===entry.commanderId){a.xp=hero.xp;a.level=heroLevel(hero);}
  }
 }
 recordStrongholdActivity(w,report);recordKingdomVictory(w,'strongholds');
}
export function validateStrongholds(saved){
 const defs=createStrongholds();if(!Array.isArray(saved)||saved.length!==defs.length||new Set(saved.map(t=>t?.id)).size!==defs.length)throw new Error('Invalid saved strongholds.');
 return defs.map(base=>{const s=saved.find(t=>t?.id===base.id);if(!s||s.x!==base.x||s.z!==base.z||s.tier!==base.tier||!Number.isSafeInteger(s.cycle)||s.cycle<1||!Number.isFinite(s.health)||s.health<0||s.health>base.maxHealth||!Number.isFinite(s.guardHealth)||s.guardHealth<0||s.guardHealth>base.maxGuardHealth||!Number.isFinite(s.respawn)||s.respawn<0||s.respawn>STRONGHOLD_RULES.respawnSeconds||(s.respawn>0&&(s.health!==0||s.guardHealth!==0))||(s.respawn===0&&s.health<=0))throw new Error('Invalid saved stronghold state.');
  return {...base,health:s.health,guardHealth:s.guardHealth,respawn:s.respawn,cycle:s.cycle};});
}
export function validateStrongholdReport(r){
 if(!r||r.kind!=='stronghold')return;
 if(r.activityCredited!==undefined&&typeof r.activityCredited!=='boolean')throw new Error('Invalid saved stronghold activity receipt.');
 const tier=TIERS[r.tier];if(!tier||!Number.isSafeInteger(r.targetCycle)||r.targetCycle<1||typeof r.settled!=='boolean'||!Array.isArray(r.rewards)||r.rewards.length>5||['guardHealthBefore','guardHealthAfter','wallHealthBefore','wallHealthAfter','npcDamageDealt','npcDamageTaken'].some(k=>!Number.isFinite(r[k])||r[k]<0)||r.guardHealthBefore>tier.guardHealth||r.guardHealthAfter>r.guardHealthBefore||r.wallHealthBefore>tier.maxHealth||r.wallHealthAfter>r.wallHealthBefore||new Set(r.rewards.map(e=>e?.playerId)).size!==r.rewards.length)throw new Error('Invalid saved stronghold report.');
 for(const e of r.rewards)if(!e||typeof e.playerId!=='string'||!r.participants.some(p=>p.playerId===e.playerId)||!Number.isFinite(e.contribution)||e.contribution<=0||!Number.isSafeInteger(e.xp)||e.xp<0||!e.resources||Object.keys(e.resources).length!==Object.keys(tier.reward).length||Object.entries(e.resources).some(([key,n])=>!(key in tier.reward)||!Number.isSafeInteger(n)||n<0||n>tier.reward[key]))throw new Error('Invalid saved stronghold rewards.');
 if(r.settled!==(r.outcome==='Stronghold defeated')||(r.settled&&!r.rewards.length)||r.rounds>STRONGHOLD_RULES.roundLimit||Math.abs((r.guardHealthBefore-r.guardHealthAfter)-r.npcDamageTaken)>0.00001||Math.abs((r.wallHealthBefore-r.wallHealthAfter)-r.structureDamage)>0.00001||Math.abs(r.participants.reduce((n,e)=>n+e.damageDealt,0)-r.npcDamageTaken)>0.00001||Math.abs(r.participants.reduce((n,e)=>n+e.damageTaken,0)-r.npcDamageDealt)>0.00001)throw new Error('Invalid saved stronghold battle totals.');
 if(r.rewards.length&&(!r.settled||r.outcome!=='Stronghold defeated'||Object.entries(tier.reward).some(([key,total])=>r.rewards.reduce((n,e)=>n+e.resources[key],0)!==total)||r.rewards.reduce((n,e)=>n+e.xp,0)!==tier.xp))throw new Error('Invalid saved stronghold reward totals.');
}
