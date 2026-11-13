import { randomUUID } from 'node:crypto';
import { armyList, age } from './progression.mjs';
import { classCounts } from './troops.mjs';
import { RESOURCES } from './city-content.mjs';
import { journeyMetric } from './chapters.mjs';
import { recordActivity } from './activity.mjs';
export const cargoTotal = a => Object.values(a.cargo).reduce((n,v)=>n+v,0);
export const activeMarches = p => armyList(p).filter(a=>a.deployed);
export const emptyCargo = () => Object.fromEntries(RESOURCES.map(k=>[k,0]));
export function initializeLogistics(p,legacy=false){
 p.coreReports??=[];p.discovery??=[];
 for(const a of armyList(p)){
  if(legacy||a.deployed===undefined)a.deployed=!!a.target||Math.hypot(a.x-p.homeX,a.z-p.homeZ)>=2;
  a.cargo??=emptyCargo();a.cargoTripId??='';a.cargoSources??=[];a.cargoStarted??=0;
  if(!a.deployed){a.x=p.homeX;a.z=p.homeZ;}
 }
}
export function carryCapacity(w,a){
 const u=a.units,p=w.owner(a);
 const classes=classCounts(u);const base=classes.infantry*16+classes.archers*12+classes.cavalry*24+a.mythic*80;
 return Math.floor(base*(1+.08*p.technologies.logistics));
}
export function coreReport(w,p,report){
 if(p.coreReports.some(r=>r.id===report.id))return;
 p.coreReports.unshift({time:w.time,...report});p.coreReports.length=Math.min(100,p.coreReports.length);
}
export function returnCargo(w,a,reason='Recall'){
 a.target={type:'return',x:a.homeX,z:a.homeZ};a.state='Returning';a.returnReason=reason;
}
export function gatherCargo(w,a,node,dt){
 a.gatherClock+=dt;
 while(a.gatherClock>=1&&node.remaining>0&&cargoTotal(a)<carryCapacity(w,a)){
  a.gatherClock-=1;
  const amount=Math.min(node.remaining,Math.ceil(8*w.stats(a).gather),Math.max(0,carryCapacity(w,a)-cargoTotal(a)));
  if(!amount)break;
  if(!a.cargoTripId){a.cargoTripId=randomUUID();a.cargoStarted=w.time;}
  w.logisticsRevision++;node.remaining-=amount;a.cargo[node.resource]+=amount;
  let source=a.cargoSources.find(s=>s.nodeId===node.id);
  if(!source){source={nodeId:node.id,name:node.name,resource:node.resource,x:node.x,z:node.z,amount:0};a.cargoSources.push(source);}source.amount+=amount;
 }
 if(node.remaining<=0||cargoTotal(a)>=carryCapacity(w,a))returnCargo(w,a,node.remaining<=0?'Deposit exhausted':'Capacity reached');
}
export function loseCargo(w,a){
 if(cargoTotal(a))w.logisticsRevision++;
 if(cargoTotal(a))coreReport(w,w.owner(a),{id:a.cargoTripId,type:'gathering',title:'Cargo lost in defeat',outcome:'Lost',armyId:a.id,commanderId:a.commanderId,started:a.cargoStarted,resources:emptyCargo(),lost:{...a.cargo},sources:structuredClone(a.cargoSources),reason:'Combat defeat'});
 a.cargo=emptyCargo();a.cargoTripId='';a.cargoSources=[];a.cargoStarted=0;a.returnReason='';
}
export function dock(w,a){
 if(a.target||Math.hypot(a.x-a.homeX,a.z-a.homeZ)>.05)return;
 const p=w.owner(a);
 if(cargoTotal(a)){
  if(p.coreReports.some(r=>r.id===a.cargoTripId))throw new Error('Cargo trip has already settled.');
  if(RESOURCES.some(k=>!Number.isSafeInteger(p[k]+a.cargo[k])))throw new Error('Resource balance overflow.');
  w.logisticsRevision++;
  // Economic mutation and its report enter the same existing world transaction.
  for(const resource of RESOURCES){const amount=a.cargo[resource];p[resource]+=amount;if(amount){recordActivity(w,p,'gather',amount);if(resource==='food')recordActivity(w,p,'food',amount);if(['wood','food'].includes(resource))journeyMetric(p,resource,amount);}}
  coreReport(w,p,{id:a.cargoTripId,type:'gathering',title:'Gathering delivered',outcome:'Delivered',armyId:a.id,commanderId:a.commanderId,started:a.cargoStarted,resources:{...a.cargo},lost:emptyCargo(),sources:structuredClone(a.cargoSources),reason:a.returnReason||'Home delivery'});
  a.cargo=emptyCargo();a.cargoTripId='';a.cargoSources=[];a.cargoStarted=0;a.returnReason='';
 }
 a.deployed=false;a.gatherClock=0;if(a.recovery<=0)a.state='Home';
}
export function validateLogistics(p){
 if(!Array.isArray(p.coreReports)||p.coreReports.length>100||new Set(p.coreReports.map(r=>r.id)).size!==p.coreReports.length)throw new Error('Invalid saved delivery reports.');
 const trips=armyList(p).map(a=>a.cargoTripId).filter(Boolean);if(new Set(trips).size!==trips.length)throw new Error('Duplicate saved cargo trip.');
 const amounts=c=>c&&Object.keys(c).length===RESOURCES.length&&RESOURCES.every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)&&Number.isSafeInteger(Object.values(c).reduce((n,v)=>n+v,0));
 const sources=s=>Array.isArray(s)&&s.length<=32&&new Set(s.map(x=>x?.nodeId)).size===s.length&&s.every(x=>x&&typeof x.nodeId==='string'&&typeof x.name==='string'&&RESOURCES.includes(x.resource)&&Number.isSafeInteger(x.amount)&&x.amount>0&&Number.isFinite(x.x)&&x.x>=1&&x.x<=79&&Number.isFinite(x.z)&&x.z>=1&&x.z<=79);
 for(const a of armyList(p)){
  if(typeof a.deployed!=='boolean'||!amounts(a.cargo)||!sources(a.cargoSources)||typeof a.cargoTripId!=='string'||!Number.isFinite(a.cargoStarted)||a.cargoStarted<0)throw new Error('Invalid saved march cargo.');
  const total=cargoTotal(a);
  if(p.coreReports.some(r=>r.id===a.cargoTripId)||(total>0)!==!!a.cargoTripId||(!a.deployed&&total)||a.cargoSources.reduce((n,s)=>n+s.amount,0)!==total||RESOURCES.some(k=>a.cargoSources.filter(s=>s.resource===k).reduce((n,s)=>n+s.amount,0)!==a.cargo[k]))throw new Error('Unreconciled saved cargo.');
 }
 if(activeMarches(p).length>age(p).marches)throw new Error('Invalid active march slots.');
 for(const r of p.coreReports){if(!r||typeof r.id!=='string'||!r.id||!['gathering','system','alliance','pve','trade'].includes(r.type)||typeof r.title!=='string'||r.title.length>256||r.detail!==undefined&&typeof r.detail!=='string'||!Number.isFinite(r.time)||r.time<0)throw new Error('Invalid saved core report.');
  if(r.resources!==undefined&&!amounts(r.resources))throw new Error('Invalid saved report resources.');
  if(r.type==='gathering'&&(!amounts(r.resources)||!amounts(r.lost)||!sources(r.sources)||!['Delivered','Lost'].includes(r.outcome)||RESOURCES.some(k=>r.sources.filter(s=>s.resource===k).reduce((n,s)=>n+s.amount,0)!==r.resources[k]+r.lost[k])||(r.outcome==='Delivered'?Object.values(r.lost):Object.values(r.resources)).some(v=>v!==0)))throw new Error('Invalid saved gathering report.');
 }
}
export function unifiedReports(w,p,battles=p.battleReports,groups=p.groupReports){
 const rows=p.coreReports.map(r=>({...r}));
 for(const r of battles)rows.push({id:'battle:'+r.id,type:'battle',time:r.ended||r.started,title:r.outcome,detail:r.sides.map(s=>s.playerName).join(' vs '),sourceId:r.id,currencyNote:r.currencyNote});
 for(const r of groups)rows.push({id:'rally:'+r.id,type:'rally',time:r.ended||r.started,title:r.outcome,detail:r.targetName,sourceId:r.id,currencyNote:r.currencyNote});
 for(const r of p.scoutReports)rows.push({id:'scout:'+r.id,type:'scouting',time:r.time,title:'Scouting survey',detail:`${r.x.toFixed(1)}, ${r.z.toFixed(1)}`,sourceId:r.id,currencyNote:r.currencyNote});
 for(const r of p.reconReports??[])rows.push({id:'reading:'+r.id,type:'reconnaissance',time:r.time,title:r.outcome==='read'?'Veil reading · '+r.subjectName:'Veil reading missed',detail:r.staleNote,sourceId:r.id});
 for(const n of p.reconNotices??[])rows.push({id:'notice:'+n.id,type:'recon-notice',time:n.time,title:n.scoutName+' read your city',detail:'Observed '+n.targetName+' . This notice is private.',sourceId:n.id});
 return rows.sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id)).slice(0,170);
}
