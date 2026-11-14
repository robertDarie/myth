import { PROVINCES, provinceAt, cellIndex } from './world-map.mjs';
import { FINDINGS } from './findings.mjs';
import { FOG, visible, visionContext } from './exploration.mjs';
import { scoutProfile } from './scout-camp.mjs';
import { referenceCamp } from './numerics.mjs';
import { configureForsaken, kingdomForsakenLevel } from './forsaken.mjs';
import { economyTime } from './economy.mjs';
export const POPULATION_RULES=Object.freeze({version:1,globalCap:192,interval:5,candidateBudget:32,initialBudget:128,roamRadius:3,speed:.7,separation:10,searchSeconds:30,searchAttempts:24});
export const REGIONAL_POPULATION=Object.freeze([
  {id:'first-frontier',target:8,minLevel:1,maxLevel:8},{id:'legacy-east',target:8,minLevel:5,maxLevel:15},
  {id:'legacy-north',target:8,minLevel:5,maxLevel:15},{id:'legacy-crown',target:12,minLevel:15,maxLevel:25},
  {id:'dawn-reach',target:36,minLevel:2,maxLevel:18},{id:'ashen-fields',target:36,minLevel:2,maxLevel:18},
  {id:'outer-marches',target:64,minLevel:6,maxLevel:25},
]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const states=['IDLE','PATROLLING','PAUSING','ENGAGED','RETURNING','RESPAWNING'];
const point=p=>p&&[p.x,p.z].every(n=>Number.isFinite(n)&&n>=1&&n<=255);
export const aliveForsaken=w=>w.camps.filter(c=>c.spawned!==false&&c.health>0);
export function poolSlots(baseCount=62){return Array.from({length:POPULATION_RULES.globalCap-baseCount},(_,i)=>({id:'forsaken-pool-'+i,name:'Forsaken Lv. 1',category:'forsaken',level:1,x:2,z:2,health:0,maxHealth:referenceCamp(1).maxHealth,respawn:0,contributors:{},cycle:1,spawned:false}));}
function extendPool(w){const ids=new Set(w.camps.map(c=>c.id));for(const c of poolSlots())if(!ids.has(c.id))w.camps.push(c);}
export function prepareSavedPopulation(saved,world){if(world.numericVersion===1&&!saved.population){const ids=new Set(saved.camps.map(c=>c.id));for(const c of poolSlots())if(!ids.has(c.id))saved.camps.push(c);}}
function attributes(w,c){
  c.spawned??=true;c.anchorX??=c.x;c.anchorZ??=c.z;c.provinceId??=provinceAt(c)?.id??'first-frontier';
  c.roamRadius??=POPULATION_RULES.roamRadius;c.walkSpeed??=POPULATION_RULES.speed;c.patrolX??=c.x;c.patrolZ??=c.z;
  c.patrolState??=c.health>0?'PAUSING':'RESPAWNING';c.pauseUntil??=w.time+2;
}
// Fresh synchronous collision context; no retained references across ticks/rollback.
export function collisionContext(w){
  const buckets=new Map(),add=(p,r)=>{const key=Math.floor(p.x/8)+':'+Math.floor(p.z/8);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({x:p.x,z:p.z,r});};
  for(const p of w.players.values())add({x:p.homeX,z:p.homeZ},4);
  for(const n of w.nodes)add(n,2.3);
  for(const s of [...w.sites,...w.flags,...w.strongholds,...FINDINGS])add(s,3.5);
  const blocked=(a,b)=>{
    const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
    for(let z=Math.floor((Math.min(a.z,b.z)-4)/8);z<=Math.floor((Math.max(a.z,b.z)+4)/8);z++)for(let x=Math.floor((Math.min(a.x,b.x)-4)/8);x<=Math.floor((Math.max(a.x,b.x)+4)/8);x++)for(const p of buckets.get(x+':'+z)??[]){
      const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
      if(Math.hypot(a.x+t*dx-p.x,a.z+t*dz-p.z)<p.r)return true;
    }return false;
  };
  return {blocked};
}
function observerEyes(w){
  const eyes=[];for(const p of w.players.values()){eyes.push({x:p.homeX,z:p.homeZ,r:FOG.cityRadius});for(const s of p.scouts)eyes.push({x:s.x,z:s.z,r:scoutProfile(p.buildings.scoutcamp).radius});}
  for(const a of w.armies())if(a.deployed||a.target||distance(a,{x:a.homeX,z:a.homeZ})>=2)eyes.push({x:a.x,z:a.z,r:FOG.armyRadius});
  return eyes;
}
const observed=(eyes,p)=>eyes.some(e=>distance(e,p)<=e.r);
function suitable(w,region,p,context,eyes,except=null){
  if(p.x<region.minX+4||p.x>region.maxX-4||p.z<region.minZ+4||p.z>region.maxZ-4||context.blocked(p,p)||observed(eyes,p))return false;
  const live=aliveForsaken(w).filter(c=>c!==except);
  if(live.some(c=>distance(p,c)<POPULATION_RULES.separation||distance(p,{x:c.anchorX,z:c.anchorZ})<POPULATION_RULES.separation))return false;
  return live.filter(c=>distance(p,{x:c.anchorX,z:c.anchorZ})<18).length<6;
}
function selectLevel(w,r){
  const existing=aliveForsaken(w).filter(c=>c.provinceId===r.id),province=PROVINCES.find(p=>p.id===r.id);
  if(!province.gates.length&&existing.filter(c=>c.level===1).length<Math.ceil(r.target/3))return 1;
  const high=Math.min(r.maxLevel,kingdomForsakenLevel(w)),low=Math.min(r.minLevel,high);
  return low+w.chooseIndex(high-low+1);
}
function spawn(w,c,r,p,level){
  const again=c.spawned===true;c.level=level;c.health=c.maxHealth=referenceCamp(level).maxHealth;configureForsaken(c);
  Object.assign(c,{x:p.x,z:p.z,anchorX:p.x,anchorZ:p.z,provinceId:r.id,spawned:true,respawn:0,contributors:{},patrolX:p.x,patrolZ:p.z,patrolState:'PAUSING',pauseUntil:w.time+1+w.random()*3,roamRadius:POPULATION_RULES.roamRadius,walkSpeed:POPULATION_RULES.speed});
  if(again)c.cycle++;delete c.encounter;w.population.serial=(w.population.serial+1)%1000000;w.logisticsRevision++;
}
function freeSlot(w){return w.camps.find(c=>c.spawned===false||c.health<=0&&c.respawn<=0);}
export function evaluateRegion(w,rule,budget=POPULATION_RULES.candidateBudget){
  const region=PROVINCES.find(p=>p.id===rule.id),context=collisionContext(w),eyes=observerEyes(w);let attempts=0;
  while(attempts<budget&&aliveForsaken(w).length<POPULATION_RULES.globalCap&&aliveForsaken(w).filter(c=>c.provinceId===rule.id).length<rule.target){
    const c=freeSlot(w);if(!c)break;const salt=attempts+w.population.serial*3;attempts++;
    const p={x:region.minX+4+((w.random()+salt*.618033988749895)%1)*(region.maxX-region.minX-8),z:region.minZ+4+((w.random()+salt*.414213562373095)%1)*(region.maxZ-region.minZ-8)};
    if(suitable(w,region,p,context,eyes,c))spawn(w,c,rule,p,selectLevel(w,rule));
  }
  w.population.lastAttempts=attempts;return attempts;
}
export function initializePopulation(w,fresh=false){
  if(w.numericVersion!==1)return;
  extendPool(w);w.population={version:1,cursor:0,nextAt:w.time+5,serial:0,lastAttempts:0};
  for(const c of w.camps){if(fresh){c.spawned=false;c.health=0;c.respawn=0;}attributes(w,c);}
  if(fresh)for(const r of REGIONAL_POPULATION)evaluateRegion(w,r,POPULATION_RULES.initialBudget);
}
export function restorePopulation(w,saved){
  if(w.numericVersion!==1)return;
  if(!saved)initializePopulation(w,false);else{
    if(saved.version!==1||!Number.isInteger(saved.cursor)||saved.cursor<0||saved.cursor>=REGIONAL_POPULATION.length||!Number.isFinite(saved.nextAt)||saved.nextAt<0||saved.nextAt>w.time+5.001||!Number.isInteger(saved.serial)||saved.serial<0||saved.serial>=1000000||!Number.isInteger(saved.lastAttempts)||saved.lastAttempts<0||saved.lastAttempts>128)throw new Error('Invalid saved Forsaken population.');
    w.population=saved;
    for(const c of w.camps){const anchor={x:c.anchorX,z:c.anchorZ},target={x:c.patrolX,z:c.patrolZ};if(typeof c.spawned!=='boolean'||!point(anchor)||!point(target)||c.roamRadius!==3||c.walkSpeed!==.7||!states.includes(c.patrolState)||!Number.isFinite(c.pauseUntil)||c.pauseUntil<0||c.pauseUntil>w.time+10||c.spawned&&(provinceAt(c)?.id!==c.provinceId||provinceAt(anchor)?.id!==c.provinceId||provinceAt(target)?.id!==c.provinceId||distance(c,anchor)>3.001||distance(target,anchor)>3.001)||!c.spawned&&c.health!==0)throw new Error('Invalid saved Forsaken patrol.');}
  }
  for(const p of w.players.values()){
    if(!saved){p.forsaken.searchReadyAtMs=0;p.forsaken.searchSequence=0;p.forsaken.searchResult=null;}
    if(!Number.isSafeInteger(p.forsaken.searchReadyAtMs)||p.forsaken.searchReadyAtMs<0||p.forsaken.searchReadyAtMs>economyTime(w)+30000||!Number.isSafeInteger(p.forsaken.searchSequence)||p.forsaken.searchSequence<0)throw new Error('Invalid saved Forsaken search.');
    const r=p.forsaken.searchResult;if(r&&(!['found','scout','none'].includes(r.status)||!Number.isSafeInteger(r.sequence)||r.sequence>p.forsaken.searchSequence||typeof r.message!=='string'||r.status==='found'&&(!point(r)||!w.camps.some(c=>c.id===r.id)||!Number.isInteger(r.level)||r.level<1||r.level>p.forsaken.unlocked)))throw new Error('Invalid saved Forsaken search result.');
  }
}
function canWalk(c,p,context){const anchor={x:c.anchorX,z:c.anchorZ};return point(p)&&provinceAt(p)?.id===c.provinceId&&distance(anchor,p)<=c.roamRadius+.0001&&!context.blocked(c,p);}
export function populationTick(w,dt){
  if(w.numericVersion!==1)return;
  if(w.time>=w.population.nextAt){const r=REGIONAL_POPULATION[w.population.cursor];evaluateRegion(w,r);w.population.cursor=(w.population.cursor+1)%REGIONAL_POPULATION.length;w.population.nextAt=w.time+POPULATION_RULES.interval;}
  const engaged=new Set(w.armies().filter(a=>a.target?.type==='attack'&&a.health>0&&a.recovery<=0).filter(a=>{const c=w.camps.find(c=>c.id===a.target.id);return c&&distance(a,c)<=2.01;}).map(a=>a.target.id));
  const context=collisionContext(w);
  for(const c of w.camps){
    if(!c.spawned||c.health<=0){c.patrolState='RESPAWNING';continue;}
    if(engaged.has(c.id)){c.patrolState='ENGAGED';c.patrolX=c.x;c.patrolZ=c.z;continue;}
    if(c.patrolState==='ENGAGED'){c.patrolState='RETURNING';c.patrolX=c.anchorX;c.patrolZ=c.anchorZ;}
    if(['IDLE','PAUSING','RESPAWNING'].includes(c.patrolState)){
      if(w.time<c.pauseUntil)continue;
      c.patrolState='PAUSING';c.pauseUntil=w.time+1+w.random()*3;
      for(let i=0;i<4;i++){const angle=(w.random()+i*.61803398875)*Math.PI*2,radius=Math.sqrt(w.random())*c.roamRadius,p={x:c.anchorX+Math.cos(angle)*radius,z:c.anchorZ+Math.sin(angle)*radius};if(canWalk(c,p,context)){c.patrolX=p.x;c.patrolZ=p.z;c.patrolState='PATROLLING';break;}}
    }
    if(!['PATROLLING','RETURNING'].includes(c.patrolState))continue;
    const target={x:c.patrolX,z:c.patrolZ},remaining=distance(c,target),step=Math.min(remaining,c.walkSpeed*dt),p={x:c.x+(target.x-c.x)*step/Math.max(.00001,remaining),z:c.z+(target.z-c.z)*step/Math.max(.00001,remaining)};
    if(!canWalk(c,p,context)){c.patrolState='PAUSING';c.pauseUntil=w.time+2;continue;}
    c.x=p.x;c.z=p.z;
    if(remaining<=step+.00001){c.patrolState='PAUSING';c.pauseUntil=w.time+1+w.random()*3;}
  }
}
export function campDestination(w,a,update=false){
  const c=w.camps.find(c=>c.id===a.target?.id);if(!c)return null;
  if(w.numericVersion!==1)return c;
  const p=w.owner(a);
  if(c.spawned&&visible(w,p,c)){
    if(c.health<=0||a.target.cycle&&a.target.cycle!==c.cycle)return {...c,unavailable:true};
    if(update){a.target.x=c.x;a.target.z=c.z;a.target.cycle=c.cycle;}
    return c;
  }
  return point(a.target)?{x:a.target.x,z:a.target.z,lastSighting:true}:null;
}
export function populationCommand(w,p,c,fail){
  if(c.type!=='forsaken-search')return false;
  if(w.numericVersion!==1)fail('Forsaken search requires the current kingdom balance.');
  const level=c.count,now=economyTime(w);
  if(!Number.isInteger(level)||level<1||level>Math.min(p.forsaken.unlocked,kingdomForsakenLevel(w)))fail('Choose an unlocked Forsaken level.');
  if(now<p.forsaken.searchReadyAtMs)fail('Wait '+Math.ceil((p.forsaken.searchReadyAtMs-now)/1000)+' seconds before searching again.');
  p.forsaken.searchReadyAtMs=now+30000;p.forsaken.searchSequence++;
  const seen=visionContext(w,p).seen,visibleEnemy=aliveForsaken(w).filter(c=>c.level===level&&w.canEnter(p,c)&&seen(c)).sort((a,b)=>distance(a,{x:p.homeX,z:p.homeZ})-distance(b,{x:p.homeX,z:p.homeZ}))[0];
  let result={status:'none',message:'No visible Forsaken of this level. Send a scout and search again.'};
  if(visibleEnemy)result={status:'found',id:visibleEnemy.id,x:visibleEnemy.x,z:visibleEnemy.z,level,message:'Found a visible Forsaken. Focus the sighting and select a march.'};
  else if(level<=12){
    const region=provinceAt({x:p.homeX,z:p.homeZ}),r=REGIONAL_POPULATION.find(r=>r.id===region?.id),live=aliveForsaken(w);
    if(r&&live.length<192&&live.filter(c=>c.provinceId===r.id).length<r.target+4){
      const context=collisionContext(w),eyes=observerEyes(w);
      for(let i=0;i<24;i++){const angle=(w.random()+i*.61803398875)*Math.PI*2,radius=8+w.random()*8,location={x:p.homeX+Math.cos(angle)*radius,z:p.homeZ+Math.sin(angle)*radius};
        if(!p.explored.includes(cellIndex(location))||!suitable(w,region,location,context,eyes))continue;
        const slot=freeSlot(w);if(!slot)break;spawn(w,slot,r,location,level);result={status:'scout',message:'A nearby trail is available in explored land. Scout around your city.'};break;
      }
    }
  }
  p.forsaken.searchResult={...result,sequence:p.forsaken.searchSequence};return true;
}
export function publicForsakenProgress(w,p){return {version:1,unlocked:p.forsaken.unlocked,kingdomLevel:kingdomForsakenLevel(w),firstClears:p.forsaken.firstClears,searchReadySeconds:Math.max(0,Math.ceil((p.forsaken.searchReadyAtMs-economyTime(w))/1000)),searchResult:p.forsaken.searchResult};}
