import { siteIsOpen } from './kingdom.mjs';
import { MAP_CORRIDORS, provinceAt } from './world-map.mjs';
export const CORRIDORS = MAP_CORRIDORS;
const region=p=>provinceAt(p)?.id;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function reachableRegions(w,actor){
 const p=w.owner(actor),home=region({x:p.homeX??p.x,z:p.homeZ??p.z}),seen=new Set(home?[home]:[]);
 for(let changed=true;changed;){changed=false;for(const c of CORRIDORS){if(!c.gateId||!p.allianceId||!siteIsOpen(w,c.gateId)||!w.sites.some(s=>s.id===c.gateId&&s.allianceId===p.allianceId))continue;const a=region(c.a),b=region(c.b);if(seen.has(a)!==seen.has(b)){seen.add(a);seen.add(b);changed=true;}}}
 return seen;
}
function buildRoute(w,actor,destination,returning,scouting){
 const p=w.owner(actor);if(!region(actor)||!region(destination))return null;
 if(returning&&dist(destination,{x:p.homeX??p.x,z:p.homeZ??p.z})>0.00001)return null;
 const allowed=returning||scouting?null:reachableRegions(w,actor);
 if(allowed&&(!allowed.has(region(destination))||!allowed.has(region(actor))))return null;
 if(region(actor)&&region(actor)===region(destination))return [{x:destination.x,z:destination.z}];
 const points=[{x:actor.x,z:actor.z},{x:destination.x,z:destination.z}],links=[];
 // An incomplete frontier connection must fail closed, never grant military access.
 for(const c of CORRIDORS){const i=points.length;points.push(c.a,c.b);if(returning||scouting||(c.gateId&&p.allianceId&&w.sites.some(s=>s.id===c.gateId&&s.allianceId===p.allianceId&&siteIsOpen(w,c.gateId))))links.push([i,i+1]);}
 const corridorEdge=(u,v)=>links.some(([a,b])=>{
  if((a===u&&b===v)||(a===v&&b===u))return true;
  const on=i=>Math.abs(dist(points[a],points[i])+dist(points[i],points[b])-dist(points[a],points[b]))<0.00001;
  return (u===0&&(v===a||v===b)&&on(u))||(v===1&&(u===a||u===b)&&on(v));
 });
 const n=points.length,cost=Array(n).fill(Infinity),prev=Array(n).fill(-1),done=new Set();cost[0]=0;
 for(let step=0;step<n;step++){
  let u=-1;for(let i=0;i<n;i++)if(!done.has(i)&&(u<0||cost[i]<cost[u]))u=i;
  if(u<0||!Number.isFinite(cost[u]))break;if(u===1)break;done.add(u);
  for(let v=0;v<n;v++)if((!allowed||v===0||allowed.has(region(points[v])))&&v!==u&&(region(points[u])===region(points[v])||corridorEdge(u,v))){
   const next=cost[u]+dist(points[u],points[v]);if(next<cost[v]){cost[v]=next;prev[v]=u;}
  }
 }
 if(!Number.isFinite(cost[1]))return null;
 const path=[];for(let v=1;v!==0;v=prev[v]){if(v<0)return null;path.unshift({...points[v]});}
 while(path.length>1&&dist(actor,path[0])<0.001)path.shift();return path;
}
export const route=(w,actor,destination,returning=false)=>buildRoute(w,actor,destination,returning,false);
// Only scouting subsystem callers use this policy; no command payload chooses it.
export const scoutRoute=(w,actor,destination)=>buildRoute(w,actor,destination,false,true);
// Server-resolved objectives only. Never expose this exception to move payloads.
export function objectiveApproach(w,actor,target){
 const c=target?.kind==='gate'&&w.sites.includes(target)&&CORRIDORS.find(c=>c.gateId===target.id);
 if(!c)return route(w,actor,target)?target:null;
 const candidates=[c.a,c.b].map(point=>({point,path:route(w,actor,point)})).filter(v=>v.path);
 const length=v=>{let last=actor,total=0;for(const point of v.path){total+=dist(last,point);last=point;}return total;};
 candidates.sort((a,b)=>length(a)-length(b));return candidates[0]?.point??null;
}
export const objectiveRoute=(w,actor,target)=>{const approach=objectiveApproach(w,actor,target);return approach?route(w,actor,approach):null;};
export function objectiveTravel(w,actor,target,speed,dt,stop){const approach=objectiveApproach(w,actor,target);return approach?travel(w,actor,approach,speed,dt,target.kind==='gate'?0:stop):false;}
export function travel(w,a,destination,speed,dt,stop=0,returning=false){
 return followPath(a,destination,speed,dt,stop,route(w,a,destination,returning));
}
export function scoutTravel(w,a,destination,speed,dt,stop=0){
 return followPath(a,destination,speed,dt,stop,scoutRoute(w,a,destination));
}
function followPath(a,destination,speed,dt,stop,path){
 if(!path)return false;
 let budget=speed*dt;
 for(let i=0;i<path.length;i++){
  const t=path[i],d=dist(a,t),end=i===path.length-1?stop:0;if(d<=end+0.00001)continue;
  const step=Math.min(budget,d-end);a.x+=(t.x-a.x)/d*step;a.z+=(t.z-a.z)/d*step;budget-=step;
  if(budget<=0.000001)break;
 }
 return dist(a,destination)<=stop+0.0001;
}
