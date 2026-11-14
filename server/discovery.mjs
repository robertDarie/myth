import { forsakenCard } from './forsaken.mjs';
import { WORLD_SIZE } from './world-map.mjs';
// Only static last-observed fields are retained. No enemy formations, cargo or garrisons.
const fields={nodes:['id','name','resource','x','z','remaining','capacity'],camps:['id','name','level','x','z','health','maxHealth','respawn','category','cycle','enemyPower','enemyTroops','enemyTier','attack','defense','damage','recommendedTroops','recommendedTier','commanderXP','apCost'],sites:['id','name','kind','description','x','z','allianceId','health','maxHealth'],flags:['id','x','z','allianceId','isRoot','connected','buildRemaining','health','maxHealth'],strongholds:['id','name','tier','x','z','health','maxHealth','guardHealth','maxGuardHealth','respawn'],cities:['id','name','civilization','homeX','homeZ','cityLevel','ageName','allianceId']};
const position=(kind,t)=>kind==='cities'?{x:t.homeX,z:t.homeZ}:t;
// Prepared observations belong to one world's completed movement pass. Members
// share immutable records; a later sight update replaces records, never mutates
// a former ally's historical value.
export function staticContext(w,seen){
 const live={nodes:w.nodes,camps:w.camps,sites:w.sites,flags:w.flags,strongholds:w.strongholds,cities:[...w.players.values()]};
 return Object.entries(live).map(([kind,items])=>{
  const ids=new Set(items.map(item=>item.id)),updates=[];
  for(const source of items){if(!seen(position(kind,source)))continue;const item=kind==='camps'&&w.numericVersion===1?forsakenCard(source):source;
   const value={};for(const key of fields[kind])if(item[key]!==undefined)value[key]=item[key];
   updates.push([kind+':'+item.id,Object.freeze({kind,observedAt:w.time,value:Object.freeze(value)})]);
  }
  return {kind,ids,updates};
 });
}
export function rememberStatics(w,p,seen,prepared=staticContext(w,seen)){
 p.discovery??=[];
 const cache=new Map(p.discovery.map(r=>[r.kind+':'+r.value.id,r]));
 for(const {kind,ids,updates} of prepared){
  for(const [key,record] of updates)cache.set(key,record);
  for(const [key,record] of cache)if(record.kind===kind&&!ids.has(record.value.id)&&seen(position(kind,record.value)))cache.delete(key);
 }
 p.discovery=[...cache.values()].slice(-1024);
}
export function recalled(p,kind){return p.discovery.filter(r=>r.kind===kind).map(r=>({...r.value,lastKnown:true,observedAt:r.observedAt}));}
export function validateDiscovery(p){
 if(!Array.isArray(p.discovery)||p.discovery.length>1024||new Set(p.discovery.map(r=>r.kind+':'+r.value?.id)).size!==p.discovery.length)throw new Error('Invalid saved discovery memory.');
 for(const r of p.discovery){
  const v=r?.value,at=v&&position(r.kind,v);
  if(!fields[r.kind]||!v||typeof v.id!=='string'||!Number.isFinite(r.observedAt)||r.observedAt<0||!at||![at.x,at.z].every(n=>Number.isFinite(n)&&n>=0&&n<=WORLD_SIZE)||Object.keys(v).some(k=>!fields[r.kind].includes(k))||Object.values(v).some(v=>typeof v==='object'||typeof v==='number'&&(!Number.isFinite(v)||v<0)))throw new Error('Invalid saved static intelligence.');
 }
}
