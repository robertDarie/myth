import { WORLD_SIZE } from './world-map.mjs';
import { ECONOMY, refreshEconomy } from './economy.mjs';
import { siteIsOpen } from './kingdom.mjs';
import { isStronghold, STRONGHOLD_RULES, initStrongholdReport, strongholdRound, rewardStronghold, resetStronghold, validateStrongholdReport } from './strongholds.mjs';
import { route, travel } from './navigation.mjs';
import { randomUUID } from 'node:crypto';
import { allianceRole } from './social.mjs';
import { protectionReason } from './diplomacy.mjs';
import { recordSeason } from './season.mjs';
import { combatFor, side, retreat, applyDamage, counterMultiplier } from './war.mjs';
import { activeSkill, armyList } from './progression.mjs';
import { validUnits } from './troops.mjs';

export const CAMPAIGN_LIMITS = { rallyMarches: 5, rallyLoad: 200, garrisonMarches: 5, garrisonLoad: 150, reportEntries: 64 };
export const TERRITORY_RULES = Object.freeze({ supplyRadius: 12, linkRadius: 12, placeRadius: 4, rootRadius: 6, enemyGap: 10, beaconSpacing: 4, beaconLimit: 20 });
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const load = a => a.troops+a.mythic*5;
const managed = (w,p) => ['Leader','Officer'].includes(allianceRole(w,p));
export const fortification = (w,id) => w.sites.find(s=>s.id===id) || w.flags.find(f=>f.id===id) || w.strongholds.find(t=>t.id===id);
export function initializeFortification(t,kind='flag') {
  t.maxHealth = kind==='fort'?600:kind==='gate'?450:kind==='sanctuary'?650:kind==='shrine'?300:250;
  t.health=t.maxHealth;
  if(kind==='flag'||kind==='fort'){t.buildRemaining=0;t.isRoot=false;t.connected=false;}
}
export function refreshBeacons(w) {
  for(const f of w.flags) f.connected=false;
  for(const alliance of w.alliances.values()) {
    const built=w.flags.filter(f=>f.allianceId===alliance.id&&f.buildRemaining<=0&&f.health>0);
    const queue=built.filter(f=>f.isRoot);for(const root of queue)root.connected=true;
    for(let i=0;i<queue.length;i++)for(const f of built)if(!f.connected&&distance(queue[i],f)<=TERRITORY_RULES.linkRadius){f.connected=true;queue.push(f);}
  }
}
export const territoryNear = (w,allianceId,target) => w.flags.some(f=>f.allianceId===allianceId&&f.connected&&f.health>0&&f.buildRemaining<=0&&distance(f,target)<=TERRITORY_RULES.supplyRadius);
export function campaignFor(w,id) {
  const rally=w.rallies.find(r=>r.armyIds.includes(id));if(rally)return {kind:'rally',group:rally};
  const garrison=w.garrisons.find(g=>g.armyIds.includes(id));return garrison?{kind:'garrison',group:garrison}:null;
}
export function campaignDestination(w,a) {
  const binding=campaignFor(w,a.id);if(!binding)return null;
  if(a.target?.type==='siege')return {x:a.attackX,z:a.attackZ};
  if(binding.kind==='rally'&&binding.group.phase==='Assembling')return {x:binding.group.meetX,z:binding.group.meetZ};
  return fortification(w,binding.group.targetId);
}
const siegeFor = (w,id) => w.sieges.find(s=>s.targetId===id);
const rallySiege = (w,id) => w.sieges.find(s=>s.rallyId===id);
const actors = (w,ids) => ids.map(id=>w.army(id)).filter(Boolean);
const totalLoad = (w,ids) => actors(w,ids).reduce((n,a)=>n+load(a),0);
function setOrder(a,type,id,target,state) { a.target={type,id,x:target.x,z:target.z};a.state=state; }
function release(w,id,state='Returning') {
  const a=w.army(id);if(!a||a.recovery>0)return;
  if(state==='Paused'){a.target=null;a.state='Paused';return;}
  a.target={type:'return',x:a.homeX,z:a.homeZ};a.state='Returning';
}
function contribution(w,a,team) {return {...side(w,a),team,result:'Fighting',structureDamage:0};}
function recordExit(w,siege,id,result) {
  const entry=siege.report.participants.find(p=>p.armyId===id);if(!entry||entry.result!=='Fighting')return;
  const a=w.army(id);if(a){entry.unitsAfter={...a.units};entry.mythicAfter=a.mythic;}entry.result=result;
}
function sealSiege(w,siege,outcome) {
  if(!w.sieges.includes(siege))return;
  const report=siege.report;report.outcome=outcome;report.ended=w.time;
  for(const entry of report.participants)recordExit(w,siege,entry.armyId,'Survived');
  for(const id of new Set(report.participants.map(p=>p.playerId))) {
    const p=w.players.get(id);if(!p)continue;
    p.groupReports.unshift(structuredClone(report));p.groupReports.length=Math.min(20,p.groupReports.length);
  }
  w.sieges=w.sieges.filter(s=>s.id!==siege.id);
}
function removeRally(w,rally,outcome,paused=false) {
  const siege=rallySiege(w,rally.id);if(siege)sealSiege(w,siege,outcome);
  const target=fortification(w,rally.targetId);if(isStronghold(target))resetStronghold(target);
  for(const id of rally.armyIds)release(w,id,paused?'Paused':'Returning');
  w.rallies=w.rallies.filter(r=>r.id!==rally.id);
}
function removeMember(w,binding,id,result='Withdrawn') {
  const group=binding.group;
  const siege=binding.kind==='rally'?rallySiege(w,group.id):siegeFor(w,group.targetId);
  if(siege)recordExit(w,siege,id,result);
  group.armyIds=group.armyIds.filter(x=>x!==id);release(w,id);
  if(binding.kind==='rally'&&group.armyIds.length===0)removeRally(w,group,'Attackers withdrew');
  if(binding.kind==='garrison'&&group.armyIds.length===0)w.garrisons=w.garrisons.filter(g=>g!==group);
}
function ownMarch(w,p,c,fail) {
  const a=armyList(p).find(a=>a.id===(c.marchId||p.id));if(!a)fail('That march does not belong to your city.');return a;
}
function readyMarch(w,p,a,fail,full=true) {
  if(p.cityLevel<2)fail('Reach the Age of Oaths before joining alliance warfare.');
  if(a.target||a.recovery>0||a.health<=0||(full&&a.health+0.001<w.stats(a).maxHealth)||combatFor(w,a.id)||campaignFor(w,a.id))fail('Choose an idle, fully recovered march with no other assignment.');
}
function targetReason(w,rally) {
  const t=fortification(w,rally.targetId);
  if(t&&!siteIsOpen(w,t.id))return 'This sacred site is sealed by its kingdom milestone';
  if(!t||t.health<=0)return 'Target unavailable or ownership changed';
  const p=w.players.get(rally.leaderId);
  if(!p||p.allianceId!==rally.allianceId||!w.canEnter(p,t))return 'Leader unavailable or route locked';
  if(isStronghold(t))return t.respawn>0||rally.targetCycle!==t.cycle?'Stronghold is unavailable or has respawned':'';
  if(t.allianceId!==rally.defendingAllianceId||!t.allianceId||t.allianceId===rally.allianceId)return 'Target unavailable or ownership changed';
  const treaty=protectionReason(w,rally.allianceId,t.allianceId);if(treaty)return treaty;
  if(!territoryNear(w,rally.allianceId,t))return 'Alliance territory disconnected';
  return '';
}
export function campaignCommand(w,p,c,fail) {
  refreshBeacons(w);
  if(['alliance-leave','alliance-kick'].includes(c.type)) {
    const member=c.type==='alliance-leave'?p:w.players.get(c.targetId);
    if(member&&armyList(member).some(a=>campaignFor(w,a.id)))fail('Recall committed marches before changing this membership.');
  }
  if(c.type==='campaign-recall') {
    const a=w.army(c.targetId), binding=a&&campaignFor(w,a.id);
    if(!a||!binding||!p.allianceId||w.owner(a).allianceId!==p.allianceId||!managed(w,p))fail('Only an alliance leader or officer can recall this committed march.');
    if(binding.kind==='rally'&&binding.group.leaderArmyId===a.id)removeRally(w,binding.group,'Recalled by alliance command');
    else removeMember(w,binding,a.id,'Recalled');return true;
  }
  if(c.type==='beacon-dismantle') {
    const f=w.flags.find(f=>f.id===c.targetId&&f.allianceId===p.allianceId);
    if(!f||!managed(w,p))fail('Only an alliance leader or officer can dismantle this beacon.');
    if(siegeFor(w,f.id))fail('A beacon under siege cannot be dismantled.');
    const g=w.garrisons.find(g=>g.targetId===f.id);if(g)for(const id of [...g.armyIds])removeMember(w,{kind:'garrison',group:g},id,'Recalled');
    w.flags=w.flags.filter(x=>x.id!==f.id);refreshBeacons(w);w.event(`${p.name} dismantled an alliance beacon.`);return true;
  }
  if(c.type==='rally-create') {
    const t=fortification(w,c.targetId);
    if(!p.allianceId)fail('Join an alliance before leading a rally.');
    if(!isStronghold(t)&&!managed(w,p))fail('Only alliance leaders and officers can lead a rally.');
    if(!p.buildings.oathhall)fail('Build the Oathbound Hall to lead a rally.');
    const a=ownMarch(w,p,c,fail);readyMarch(w,p,a,fail);w.requireHome(a);
    const seconds=c.count||10;if(![10,30,60].includes(seconds))fail('Choose a 10, 30 or 60 second assembly timer.');
    const r={id:randomUUID(),allianceId:p.allianceId,defendingAllianceId:t?.allianceId||'',leaderId:p.id,leaderArmyId:a.id,targetId:c.targetId,armyIds:[a.id],targetCycle:isStronghold(t)?t.cycle:0,phase:'Assembling',assemblyEnds:w.time+seconds,meetX:p.homeX,meetZ:p.homeZ,x:p.homeX,z:p.homeZ};
    const reason=targetReason(w,r);if(reason)fail(reason);
    if(w.rallies.some(r=>r.targetId===t.id))fail('That structure already has a rally approaching or fighting.');
    if(load(a)>CAMPAIGN_LIMITS.rallyLoad)fail('This march exceeds rally troop capacity.');
    w.rallies.push(r);setOrder(a,'rally',r.id,{x:r.meetX,z:r.meetZ},'Rally assembling');return true;
  }
  if(c.type==='rally-join') {
    const r=w.rallies.find(r=>r.id===c.targetId&&r.allianceId===p.allianceId);
    if(!r||r.phase!=='Assembling'||w.time>=r.assemblyEnds)fail('This rally is not accepting contributors.');
    const a=ownMarch(w,p,c,fail);readyMarch(w,p,a,fail);w.requireHome(a);
    if(r.armyIds.length>=CAMPAIGN_LIMITS.rallyMarches||totalLoad(w,r.armyIds)+load(a)>CAMPAIGN_LIMITS.rallyLoad)fail('Rally march or troop capacity reached.');
    if(!w.canEnter(p,{x:r.meetX,z:r.meetZ}))fail('The assembly point is behind a locked gate.');
    r.armyIds.push(a.id);setOrder(a,'rally',r.id,{x:r.meetX,z:r.meetZ},'Rally assembling');return true;
  }
  if(c.type==='garrison-join') {
    const t=fortification(w,c.targetId);
    if(!t||!siteIsOpen(w,t.id)||!p.allianceId||t.allianceId!==p.allianceId||t.health<=0||(t.buildRemaining||0)>0)fail('Choose a completed structure held by your alliance.');
    if(!w.canEnter(p,t))fail('The garrison is behind a locked gate.');
    const a=ownMarch(w,p,c,fail);readyMarch(w,p,a,fail,false);
    if(!route(w,a,t))fail('No open gate route from this march to the garrison. Return home first.');
    let g=w.garrisons.find(g=>g.targetId===t.id);
    const ids=g?.armyIds||[], siege=siegeFor(w,t.id);
    if(ids.length>=CAMPAIGN_LIMITS.garrisonMarches||totalLoad(w,ids)+load(a)>CAMPAIGN_LIMITS.garrisonLoad)fail('Garrison march or troop capacity reached.');
    if(siege&&(siege.report.participants.some(e=>e.armyId===a.id)||siege.report.participants.length+ids.filter(id=>!siege.report.participants.some(e=>e.armyId===id)).length>=CAMPAIGN_LIMITS.reportEntries))fail('This siege cannot accept that contribution. A march may participate once per siege.');
    if(!g){g={targetId:t.id,allianceId:p.allianceId,armyIds:[]};w.garrisons.push(g);}g.armyIds.push(a.id);
    setOrder(a,'garrison',t.id,t,'Garrison approaching');return true;
  }
  if(c.type==='rally-leave'||c.type==='garrison-leave'||['return','stop'].includes(c.type)) {
    const a=armyList(p).find(a=>a.id===(c.marchId||p.id)),binding=a&&campaignFor(w,a.id);
    if(binding){if(binding.kind==='rally'&&binding.group.leaderArmyId===a.id)removeRally(w,binding.group,'Rally withdrawn');else removeMember(w,binding,a.id);return true;}
    if(c.type==='rally-leave'||c.type==='garrison-leave')fail('That march has no alliance assignment.');
  }
  const marchTypes=['move','attack','gather','commander','configure-march','reinforce','flag','capture','equip-relic','unequip-relic','disband-march','attack-player'];
  if(marchTypes.includes(c.type)) {
    const a=armyList(p).find(a=>a.id===(c.marchId||p.id));
    if(a&&campaignFor(w,a.id))fail('Withdraw this march from its alliance assignment before issuing another order.');
    if(c.type==='attack-player'&&campaignFor(w,c.targetId))fail('That army is committed to alliance warfare. Attack its structure with a rally.');
  }
  return false;
}
function newSiege(w,r,t) {
  const report={id:randomUUID(),targetId:t.id,targetName:t.name||(t.isRoot?'Alliance Fort':'Alliance Beacon'),attackingAllianceId:r.allianceId,defendingAllianceId:t.allianceId,started:w.time,ended:0,rounds:0,outcome:'Fighting',structureDamage:0,participants:[]};
  for(const a of actors(w,r.armyIds))report.participants.push(contribution(w,a,'Attackers'));
  if(isStronghold(t))initStrongholdReport(report,t);
  const s={id:report.id,rallyId:r.id,targetId:t.id,nextAt:w.time+(isStronghold(t)?0:Math.max(0,...actors(w,r.armyIds).map(a=>a.cooldown))),report};w.sieges.push(s);return s;
}
function distribute(total,hits,field) {
  const requested=hits.reduce((n,h)=>n+h.amount,0);let remaining=total;
  hits.forEach((h,i)=>{const amount=i===hits.length-1?remaining:total*h.amount/requested;h.entry[field]+=amount;remaining-=amount;});
}
function siegeRound(w,r,t,s) {
  if(isStronghold(t)){
    const result=strongholdRound(w,r,t,s);
    for(const a of actors(w,r.armyIds))if(a.health<=0){const entry=s.report.participants.find(e=>e.armyId===a.id);retreat(w,a,entry);recordExit(w,s,a.id,'Retreated');r.armyIds=r.armyIds.filter(id=>id!==a.id);}
    if(r.armyIds.length&&!r.armyIds.includes(r.leaderArmyId)){r.leaderArmyId=r.armyIds[0];r.leaderId=w.owner(w.army(r.leaderArmyId)).id;}
    if(!r.armyIds.length){removeRally(w,r,'Stronghold defenders held');return;}
    if(result==='victory'){rewardStronghold(w,t,s.report);t.respawn=STRONGHOLD_RULES.respawnSeconds;removeRally(w,r,'Stronghold defeated');w.event(`Alliance forces defeated ${t.name}.`);}
    else if(result==='timeout')removeRally(w,r,'Stronghold siege timed out');
    return;
  }
  const attackers=actors(w,r.armyIds),g=w.garrisons.find(g=>g.targetId===t.id);
  const defenders=actors(w,g?.armyIds||[]).filter(a=>distance(a,t)<=2.01&&a.state==='Garrisoned');
  for(const a of defenders)if(!s.report.participants.some(e=>e.armyId===a.id)) {
    if(s.report.participants.length>=CAMPAIGN_LIMITS.reportEntries)continue;
    s.report.participants.push(contribution(w,a,'Defenders'));
  }
  if(w.time+0.0001<s.nextAt)return;s.nextAt=w.time+1;s.report.rounds++;
  const incoming=new Map(), structureHits=[];
  const entryFor=a=>s.report.participants.find(e=>e.armyId===a.id);
  for(const [own,enemies] of [[attackers,defenders],[defenders,attackers]])own.forEach((a,i)=>{
    const entry=entryFor(a);if(!entry||a.cooldown>0.0001)return;
    const enemy=enemies[(s.report.rounds-1+i)%enemies.length],stats=w.stats(a),target=enemy||t;
    if(!enemy&&entry.team==='Defenders')return;
    const effective=stats.damage*(enemy?counterMultiplier(a,enemy):1),before=a.health,shield=a.shield;
    a.rage=Math.min(1000,a.rage+200);const extra=a.rage>=1000?activeSkill(w.owner(a),a,{...stats,damage:effective}):0;
    entry.healed+=Math.max(0,a.health-before);entry.shieldCreated+=Math.max(0,a.shield-shield);
    a.cooldown=1;a.attackSequence=(a.attackSequence||0)+1;a.attackX=target.x;a.attackZ=target.z;
    setOrder(a,'siege',t.id,target,'Siege fighting');
    const hit={entry,amount:Math.max(1,Math.round((effective+extra)*(1-(enemy?w.stats(enemy).mitigation:0))))};
    if(enemy){if(!incoming.has(enemy.id))incoming.set(enemy.id,[]);incoming.get(enemy.id).push(hit);}else structureHits.push(hit);
  });
  for(const [id,hits]of incoming){const a=w.army(id),actual=applyDamage(a,hits.reduce((n,h)=>n+h.amount,0),entryFor(a));distribute(actual,hits,'damageDealt');}
  if(structureHits.length){const actual=Math.min(t.health,structureHits.reduce((n,h)=>n+h.amount,0));t.health-=actual;s.report.structureDamage+=actual;distribute(actual,structureHits,'structureDamage');}
  for(const a of [...attackers,...defenders])if(a.health<=0) {
    const entry=entryFor(a);retreat(w,a,entry);recordExit(w,s,a.id,'Retreated');r.armyIds=r.armyIds.filter(id=>id!==a.id);if(g)g.armyIds=g.armyIds.filter(id=>id!==a.id);
  }
  if(g&&g.armyIds.length===0)w.garrisons=w.garrisons.filter(x=>x!==g);
  if(r.armyIds.length&&!r.armyIds.includes(r.leaderArmyId)){r.leaderArmyId=r.armyIds[0];r.leaderId=w.owner(w.army(r.leaderArmyId)).id;}
  if(r.armyIds.length===0){sealSiege(w,s,'Defenders held');w.rallies=w.rallies.filter(x=>x!==r);return;}
  if(t.health<=0) {
    sealSiege(w,s,'Attackers captured objective');
    const defendersAssigned=w.garrisons.find(g=>g.targetId===t.id);if(defendersAssigned)for(const id of [...defendersAssigned.armyIds])removeMember(w,{kind:'garrison',group:defendersAssigned},id,'Withdrawn');
    if(w.flags.includes(t)){w.flags=w.flags.filter(f=>f!==t);refreshBeacons(w);}else{t.allianceId=r.allianceId;t.health=Math.ceil(t.maxHealth/2);t.progress=0;t.challengerId='';const leader=w.players.get(r.leaderId);if(leader&&leader.allianceId===r.allianceId)recordSeason(w,leader,'territory',1,'site:'+t.id+':'+(s.report?.id||r.id));}
    for(const a of actors(w,r.armyIds)){a.target=null;a.state='Victorious';}w.rallies=w.rallies.filter(x=>x!==r);
    w.event(`Alliance forces won at ${s.report.targetName}.`);
  }
}
export function tickCampaign(w,dt) {
  for(const f of w.flags){const pending=f.buildRemaining>0;f.buildRemaining=Math.max(0,f.buildRemaining-dt);if(pending&&f.buildRemaining===0&&f.builderId){const builder=w.players.get(f.builderId);if(builder&&builder.allianceId===f.allianceId)recordSeason(w,builder,'territory',1,'beacon:'+f.id);}}refreshBeacons(w);
  for(const t of [...w.sites,...w.flags])if(!siegeFor(w,t.id)&&t.health>0)t.health=Math.min(t.maxHealth,t.health+2*dt);
  for(const g of [...w.garrisons]) {
    const t=fortification(w,g.targetId);
    for(const id of [...g.armyIds]) {
      const a=w.army(id);if(!a||!t||w.owner(a).allianceId!==g.allianceId||t.allianceId!==g.allianceId||!route(w,a,t)){removeMember(w,{kind:'garrison',group:g},id,'Withdrawn');continue;}
      if(travel(w,a,t,w.stats(a).speed,dt,1.6)){a.state='Garrisoned';if(!siegeFor(w,t.id))setOrder(a,'garrison',t.id,t,'Garrisoned');}else a.state='Garrison approaching';
    }
  }
  for(const r of [...w.rallies]) {
    const reason=targetReason(w,r);if(reason){removeRally(w,r,reason);continue;}
    for(const id of [...r.armyIds])if(!w.army(id)||w.owner(w.army(id)).allianceId!==r.allianceId)removeMember(w,{kind:'rally',group:r},id,'Withdrawn');
    if(!r.armyIds.includes(r.leaderArmyId)){removeRally(w,r,'Rally leader unavailable');continue;}
    const t=fortification(w,r.targetId),meeting={x:r.meetX,z:r.meetZ};
    if(r.phase==='Assembling') {
      for(const a of actors(w,r.armyIds))travel(w,a,meeting,w.stats(a).speed,dt,0.6);
      if(w.time<r.assemblyEnds)continue;
      for(const id of [...r.armyIds])if(distance(w.army(id),meeting)>1)removeMember(w,{kind:'rally',group:r},id,'Missed assembly');
      if(!r.armyIds.includes(r.leaderArmyId)){removeRally(w,r,'Leader missed assembly');continue;}
      if(isStronghold(t)&&r.armyIds.length<STRONGHOLD_RULES.minMarches){removeRally(w,r,'Strongholds require at least two assembled marches');continue;}
      r.phase='Marching';
    }
    if(r.phase==='Marching'&&isStronghold(t)&&r.armyIds.length<STRONGHOLD_RULES.minMarches){removeRally(w,r,'Stronghold rally fell below two marches');continue;}
    if(r.phase==='Marching') {
      const before={x:r.x,z:r.z},speed=Math.min(...actors(w,r.armyIds).map(a=>w.stats(a).speed));r.ownerId=r.leaderId;const arrived=travel(w,r,t,speed,dt,1.2);
      for(const a of actors(w,r.armyIds)){a.x=Math.max(1,Math.min(WORLD_SIZE-1,a.x+r.x-before.x));a.z=Math.max(1,Math.min(WORLD_SIZE-1,a.z+r.z-before.z));setOrder(a,'rally',r.id,t,'Rally marching');}
      if(!arrived)continue;
      if(isStronghold(t)){
       const members=[...new Set(actors(w,r.armyIds).map(a=>w.owner(a)))];for(const p of members)refreshEconomy(w,p);
       const eligible=actors(w,r.armyIds).filter(a=>w.owner(a).ap>=ECONOMY.strongholdAP);
       if(eligible.length<STRONGHOLD_RULES.minMarches){removeRally(w,r,'Not enough AP for two stronghold marches');continue;}
       for(const id of [...r.armyIds])if(!eligible.some(a=>a.id===id))removeMember(w,{kind:'rally',group:r},id,'Withdrawn');
       if(!r.armyIds.includes(r.leaderArmyId)){r.leaderArmyId=r.armyIds[0];r.leaderId=w.owner(w.army(r.leaderArmyId)).id;}
       for(const p of new Set(eligible.map(a=>w.owner(a))))p.ap-=ECONOMY.strongholdAP;w.logisticsRevision++;
      }
      r.phase='Fighting';newSiege(w,r,t);
    }
    const s=rallySiege(w,r.id);if(s)siegeRound(w,r,t,s);
  }
}
export function campaignSnapshot(w,viewerId) {
  const allianceId=w.players.get(viewerId)?.allianceId;
  return {territoryRules:TERRITORY_RULES,campaignLimits:CAMPAIGN_LIMITS,rallies:w.rallies.filter(r=>!viewerId||r.allianceId===allianceId).map(r=>({...r,troopLoad:totalLoad(w,r.armyIds)})),
    garrisons:w.garrisons.map(g=>({...g,troopLoad:totalLoad(w,g.armyIds)})),sieges:w.sieges.map(s=>({id:s.id,targetId:s.targetId,rounds:s.report.rounds,started:s.report.started}))};
}
export function groupReports(w,p) {return [...w.sieges.filter(s=>s.report.participants.some(e=>e.playerId===p.id)).map(s=>structuredClone(s.report)),...p.groupReports];}
export function initializeCampaign(w) {
  for(const p of w.players.values())p.groupReports=[];
  for(const s of w.sites)initializeFortification(s,s.kind);
  for(const alliance of w.alliances.values()) {
    const flags=w.flags.filter(f=>f.allianceId===alliance.id);flags.forEach((f,i)=>{initializeFortification(f,i===0?'fort':'flag');f.isRoot=i===0;});
  }
  refreshBeacons(w);
}
export function validateGroupReport(r) {
  if(!r||typeof r.id!=='string'||typeof r.targetId!=='string'||typeof r.targetName!=='string'||typeof r.outcome!=='string'||![r.started,r.ended,r.structureDamage].every(n=>Number.isFinite(n)&&n>=0)||!Number.isSafeInteger(r.rounds)||r.rounds<0||!Array.isArray(r.participants)||r.participants.length<1||r.participants.length>CAMPAIGN_LIMITS.reportEntries||new Set(r.participants.map(e=>e.armyId)).size!==r.participants.length)throw new Error('Invalid saved group report.');
  for(const e of r.participants)if(!e||!['Attackers','Defenders'].includes(e.team)||!['Fighting','Survived','Withdrawn','Retreated','Recalled'].includes(e.result)||['armyId','playerId','playerName','commanderId'].some(k=>typeof e[k]!=='string')||![e.unitsBefore,e.unitsAfter,e.wounded].every(validUnits)||['mythicBefore','mythicAfter','woundedMythic','damageDealt','damageTaken','healed','absorbed','shieldCreated','structureDamage'].some(k=>!Number.isFinite(e[k])||e[k]<0))throw new Error('Invalid saved group contribution.');
  validateStrongholdReport(r);
}
export function restoreCampaign(w,saved) {
  if(!['rallies','garrisons','sieges'].every(k=>Array.isArray(saved[k]))||saved.rallies.length>160||saved.garrisons.length>645||saved.sieges.length>160)throw new Error('Invalid saved campaign.');
  for(const p of w.players.values()){if(!Array.isArray(p.groupReports)||p.groupReports.length>20)throw new Error('Invalid saved group history.');p.groupReports.forEach(validateGroupReport);}
  for(const t of [...w.sites,...w.flags])if(!Number.isFinite(t.health)||!Number.isFinite(t.maxHealth)||t.health<=0||t.maxHealth<=0||t.health>t.maxHealth)throw new Error('Invalid saved fortification.');
  for(const f of w.flags)if(!Number.isFinite(f.buildRemaining)||f.buildRemaining<0||f.buildRemaining>(f.isRoot?30:10)||typeof f.isRoot!=='boolean')throw new Error('Invalid saved beacon construction.');
  if(new Set(w.flags.map(f=>f.id)).size!==w.flags.length||w.flags.some(f=>typeof f.id!=='string'||!f.id||w.sites.some(s=>s.id===f.id)))throw new Error('Invalid saved beacon IDs.');
  const bound=new Set();
  for(const group of [...saved.rallies,...saved.garrisons]) {
    if(!Array.isArray(group.armyIds)||group.armyIds.length<1||group.armyIds.length>5||!fortification(w,group.targetId)||!w.alliances.has(group.allianceId))throw new Error('Invalid saved campaign assignment.');
    for(const id of group.armyIds){const a=w.army(id);if(!a||bound.has(id)||w.owner(a).allianceId!==group.allianceId)throw new Error('Invalid saved campaign ownership.');bound.add(id);}
  }
  if(new Set(saved.garrisons.map(g=>g.targetId)).size!==saved.garrisons.length||new Set(saved.rallies.map(r=>r.id)).size!==saved.rallies.length)throw new Error('Invalid saved campaign IDs.');
  for(const group of [...saved.rallies,...saved.garrisons])if(totalLoad(w,group.armyIds)>(group.id?CAMPAIGN_LIMITS.rallyLoad:CAMPAIGN_LIMITS.garrisonLoad))throw new Error('Invalid saved campaign capacity.');
  for(const r of saved.rallies)if(typeof r.id!=='string'||!r.armyIds.includes(r.leaderArmyId)||w.owner(w.army(r.leaderArmyId)).id!==r.leaderId||!['Assembling','Marching','Fighting'].includes(r.phase)||![r.x,r.z,r.meetX,r.meetZ].every(n=>Number.isFinite(n)&&n>=1&&n<=WORLD_SIZE-1)||!Number.isFinite(r.assemblyEnds))throw new Error('Invalid saved rally.');
  for(const r of saved.rallies)if(isStronghold(fortification(w,r.targetId))&&r.targetCycle!==fortification(w,r.targetId).cycle)throw new Error('Invalid saved stronghold generation.');
  w.garrisons=saved.garrisons;
  for(const g of w.garrisons){const t=fortification(w,g.targetId);if(t.allianceId!==g.allianceId)throw new Error('Invalid saved garrison ownership.');for(const a of actors(w,g.armyIds))setOrder(a,'garrison',t.id,t,distance(a,t)<=2?'Garrisoned':'Garrison approaching');}
  w.rallies=saved.rallies;w.sieges=[];
  if(new Set(saved.sieges.map(s=>s.id)).size!==saved.sieges.length||new Set(saved.sieges.map(s=>s.targetId)).size!==saved.sieges.length)throw new Error('Invalid saved siege IDs.');
  for(const s of saved.sieges){
    validateGroupReport(s.report);
    const rally=w.rallies.find(r=>r.id===s.rallyId&&r.targetId===s.targetId&&r.phase==='Fighting');
    if(s.id!==s.report.id||s.targetId!==s.report.targetId||!rally||!Number.isFinite(s.nextAt))throw new Error('Invalid saved siege.');
    if(isStronghold(fortification(w,s.targetId))&&(s.report.kind!=='stronghold'||s.report.settled||s.report.rewards.length||s.report.targetCycle!==fortification(w,s.targetId).cycle))throw new Error('Invalid saved active stronghold battle.');
    for(const entry of s.report.participants){const a=w.army(entry.armyId);if(!w.players.has(entry.playerId)||(a&&w.owner(a).id!==entry.playerId)||(entry.result==='Fighting'&&(!a||(entry.team==='Attackers'?!rally.armyIds.includes(a.id):!w.garrisons.some(g=>g.targetId===s.targetId&&g.armyIds.includes(a.id))))))throw new Error('Invalid saved siege contributor.');}
    w.sieges.push(s);
  }
  if(w.rallies.some(r=>r.phase==='Fighting'&&!w.sieges.some(s=>s.rallyId===r.id)))throw new Error('Missing saved siege.');
  for(const r of [...w.rallies])removeRally(w,r,'Interrupted by restart',true);refreshBeacons(w);
}
export function reconcileCampaign(w) {
  refreshBeacons(w);
  for(const r of [...w.rallies]){const reason=targetReason(w,r);if(reason)removeRally(w,r,reason);}
  for(const g of [...w.garrisons]) {
    const t=fortification(w,g.targetId);
    if(!t||t.allianceId!==g.allianceId)for(const id of [...g.armyIds])removeMember(w,{kind:'garrison',group:g},id,'Withdrawn');
  }
}
