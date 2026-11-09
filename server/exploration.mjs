import { rememberStatics, recalled } from './discovery.mjs';
import { recordActivity } from './activity.mjs';
import { journeyMetric } from './chapters.mjs';
import { randomUUID } from 'node:crypto';
import { travel } from './navigation.mjs';
export const FOG={cellSize:4,width:20,cityRadius:10,armyRadius:8,scoutRadius:9,scoutSpeed:7};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=p=>p&&[p.x,p.z].every(n=>Number.isFinite(n)&&n>=1&&n<=79);
const allied=(p,q)=>p.id===q.id||!!p.allianceId&&p.allianceId===q.allianceId;
export function initializeExploration(p){p.explored=[];p.scout=null;p.scoutReports=[];}
export function sources(w,p){
 const members=[...w.players.values()].filter(q=>allied(p,q)),ids=new Set(members.map(q=>q.id));
 const eyes=members.flatMap(q=>[{x:q.homeX,z:q.homeZ,radius:FOG.cityRadius},...(q.scout?[{x:q.scout.x,z:q.scout.z,radius:FOG.scoutRadius}]:[])]);
 for(const a of w.armies()){const owner=w.owner(a);if(ids.has(owner.id)&&(a.deployed||a.target||dist(a,{x:owner.homeX,z:owner.homeZ})>=2))eyes.push({x:a.x,z:a.z,radius:FOG.armyRadius});}return eyes;
}
export function visionContext(w,p){const eyes=sources(w,p);return {eyes,seen:target=>eyes.some(s=>dist(s,target)<=s.radius)};}
export const visible=(w,p,target)=>visionContext(w,p).seen(target);
export const cellIndex=t=>Math.min(19,Math.max(0,Math.floor(t.z/4)))*20+Math.min(19,Math.max(0,Math.floor(t.x/4)));
export function explorationTick(w,dt){
 for(const p of w.players.values()){
  const s=p.scout;if(!s)continue;
  const target=s.phase==='Returning'?{x:p.homeX,z:p.homeZ}:{x:s.targetX,z:s.targetZ};
  if(s.phase==='Outbound'&&!w.canEnter(p,target)){s.phase='Returning';s.interrupted=true;}
  else if(travel(w,s,target,FOG.scoutSpeed,dt,0,s.phase==='Returning')){
   if(s.phase==='Returning'){p.scout=null;continue;}
   const report={id:randomUUID(),x:s.x,z:s.z,time:w.time,camps:w.camps.filter(c=>dist(c,s)<=FOG.scoutRadius).map(({contributors,...c})=>({...c})),
    flags:w.flags.filter(f=>dist(f,s)<=FOG.scoutRadius).map(f=>({...f})),
    armies:w.armies().filter(a=>a.deployed&&!allied(p,w.owner(a))&&dist(a,s)<=FOG.scoutRadius).map(a=>({id:a.id,ownerId:w.owner(a).id,name:w.owner(a).name,x:a.x,z:a.z,troops:a.troops,mythic:a.mythic,health:Math.ceil(a.health),commanderId:a.commanderId})),
    strongholds:w.strongholds.filter(t=>dist(t,s)<=FOG.scoutRadius).map(t=>({...t})),
    sites:w.sites.filter(t=>dist(t,s)<=FOG.scoutRadius).map(t=>({...t})),
    garrisons:w.garrisons.filter(g=>{const t=[...w.sites,...w.flags].find(t=>t.id===g.targetId);return t&&dist(t,s)<=FOG.scoutRadius;}).map(g=>({targetId:g.targetId,marches:g.armyIds.length,troops:g.armyIds.reduce((n,id)=>n+(w.army(id)?.troops||0),0),mythic:g.armyIds.reduce((n,id)=>n+(w.army(id)?.mythic||0),0)}))};
   journeyMetric(p,'surveys',1);recordActivity(w,p,'scouts',1);p.scoutReports.unshift(report);p.scoutReports.length=Math.min(20,p.scoutReports.length);s.phase='Returning';
  }
 }
 const contexts=new Map();
 for(const p of w.players.values()){
  const key=p.allianceId?"alliance:"+p.allianceId:"player:"+p.id;if(!contexts.has(key))contexts.set(key,visionContext(w,p));const context=contexts.get(key);
  const known=new Set(p.explored),eyes=context.eyes;
  for(let z=0;z<20;z++)for(let x=0;x<20;x++)if(eyes.some(s=>dist(s,{x:x*4+2,z:z*4+2})<=s.radius))known.add(z*20+x);
  p.explored=[...known].sort((a,b)=>a-b);rememberStatics(w,p,context.seen);
 }
}
export function explorationCommand(w,p,c,fail){
 if(c.type==='scout-send'){
  if(!point(c))fail('Choose a scouting destination inside the map (1–79).');
  if(p.scout)fail('Your scout is already deployed. Recall it or wait for its return.');
  if(!w.canEnter(p,c))fail('Scouts need alliance access through the corresponding Divine Gate.');
  p.scout={id:randomUUID(),ownerId:p.id,x:p.homeX,z:p.homeZ,homeX:p.homeX,homeZ:p.homeZ,targetX:c.x,targetZ:c.z,phase:'Outbound'};return true;
 }
 if(c.type==='scout-recall'){
  if(!p.scout||p.scout.id!==c.targetId)fail('That scout mission is no longer active.');p.scout.phase='Returning';return true;
 }
 if(c.type==='attack-player'){
  const a=w.army(c.targetId);if(a&&(!a.deployed||!visible(w,p,a)))fail('That enemy march is outside current allied vision. Scout the area first.');
 }
 return false;
}
export function fogSnapshot(w,p,context=visionContext(w,p)){
 const eyes=context.eyes,cells=[];for(let z=0;z<20;z++)for(let x=0;x<20;x++)if(eyes.some(s=>dist(s,{x:x*4+2,z:z*4+2})<=s.radius))cells.push(z*20+x);
 return {cellSize:4,width:20,explored:[...new Set([...p.explored,...cells])],visible:cells,scouts:[...w.players.values()].filter(q=>allied(p,q)&&q.scout).map(q=>({...q.scout})),reports:p.scoutReports};
}
export function filterFog(w,snapshot,p,context=visionContext(w,p)){
 const seen=context.seen,friendly=a=>a.ownerId===p.id||!!p.allianceId&&a.allianceId===p.allianceId;
 snapshot.exploration=fogSnapshot(w,p,context);rememberStatics(w,p,seen);
 snapshot.armies=snapshot.armies.filter(a=>friendly(a)||seen(a)).map(a=>a.ownerId===p.id?a:{...a,cargo:undefined,cargoSources:undefined,carryCapacity:undefined,homeX:undefined,homeZ:undefined,hasOrder:false,targetId:'',targetX:a.x,targetZ:a.z,route:[]});
 for(const q of snapshot.players)if(q.id!==p.id){q.x=q.homeX;q.z=q.homeZ;delete q.explored;delete q.scout;delete q.scoutReports;}
 for(const kind of ['strongholds','camps','nodes','flags','sites']){
  const actual=snapshot[kind],memory=recalled(p,kind),merged=new Map(memory.map(t=>[t.id,t]));
  for(const t of actual)if(seen(t)||(kind==='flags'||kind==='sites')&&!!p.allianceId&&t.allianceId===p.allianceId)merged.set(t.id,{...t,lastKnown:false,observedAt:w.time});
  snapshot[kind]=[...merged.values()];
 }
 const cities=new Map(recalled(p,'cities').map(c=>[c.id,c]));
 snapshot.players=snapshot.players.map(q=>{
  if(q.id===p.id)return {...q,mapVisible:true};
  if(seen({x:q.homeX,z:q.homeZ}))return {...q,mapVisible:true,lastKnown:false};
  const memory=cities.get(q.id);
  return memory?{id:q.id,name:q.name,civilization:q.civilization,...memory,mapVisible:true}:{id:q.id,name:q.name,civilization:q.civilization,allianceId:q.allianceId,construction:null,secondConstruction:null,research:null,mapVisible:false};
 });
 snapshot.garrisons=snapshot.garrisons.filter(g=>g.allianceId===p.allianceId);snapshot.sieges=snapshot.sieges.filter(s=>{const t=[...w.sites,...w.flags,...w.strongholds].find(t=>t.id===s.targetId);return t&&seen(t);});
 snapshot.events=[];return snapshot;
}
export function validateExploration(p){
 if(!Array.isArray(p.explored)||p.explored.length>400||new Set(p.explored).size!==p.explored.length||p.explored.some(i=>!Number.isInteger(i)||i<0||i>=400)||!Array.isArray(p.scoutReports)||p.scoutReports.length>20)throw new Error('Invalid saved exploration.');
 if(p.scout&&(!point(p.scout)||!point({x:p.scout.targetX,z:p.scout.targetZ})||typeof p.scout.id!=='string'||p.scout.ownerId!==p.id||!['Outbound','Returning'].includes(p.scout.phase)))throw new Error('Invalid saved scout.');
 for(const r of p.scoutReports){
  if(!r||typeof r.id!=='string'||!point(r)||!Number.isFinite(r.time)||r.time<0||!['camps','flags','armies','sites','garrisons'].every(k=>Array.isArray(r[k])&&r[k].length<=645))throw new Error('Invalid saved scout report.');
  if(r.strongholds!==undefined&&(!Array.isArray(r.strongholds)||r.strongholds.length>5||r.strongholds.some(t=>!t||typeof t.id!=='string'||!point(t)||!Number.isFinite(t.health)||t.health<0||!Number.isFinite(t.guardHealth)||t.guardHealth<0)))throw new Error('Invalid saved stronghold scouting.');
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  if([...r.camps,...r.flags,...r.armies,...r.sites].some(t=>!t||typeof t.id!=='string'||!point(t)||!Number.isFinite(t.health)||t.health<0)||r.armies.some(a=>typeof a.name!=='string'||typeof a.commanderId!=='string'||!count(a.troops)||!count(a.mythic))||r.garrisons.some(g=>!g||typeof g.targetId!=='string'||![g.marches,g.troops,g.mythic].every(count)))throw new Error('Invalid saved scout intelligence.');
 }

}
