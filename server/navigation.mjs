import { siteIsOpen } from './kingdom.mjs';
import { MAP_CORRIDORS, provinceAt } from './world-map.mjs';
export const CORRIDORS = MAP_CORRIDORS;
const region=p=>provinceAt(p)?.id;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function route(w,actor,destination,returning=false){
 const p=w.owner(actor);if(!returning&&(!w.canEnter(p,destination)||!w.canEnter(p,actor)))return null;
 if(region(actor)&&region(actor)===region(destination))return [{x:destination.x,z:destination.z}];
 const points=[{x:actor.x,z:actor.z},{x:destination.x,z:destination.z}],links=[];
 for(const c of CORRIDORS){const i=points.length;points.push(c.a,c.b);if(returning||!c.gateId||(p.allianceId&&w.sites.some(s=>s.id===c.gateId&&s.allianceId===p.allianceId&&siteIsOpen(w,c.gateId))))links.push([i,i+1]);}
 const corridorEdge=(u,v)=>links.some(([a,b])=>{
  if((a===u&&b===v)||(a===v&&b===u))return true;
  const on=i=>Math.abs(dist(points[a],points[i])+dist(points[i],points[b])-dist(points[a],points[b]))<0.00001;
  return (u===0&&(v===a||v===b)&&on(u))||(v===1&&(u===a||u===b)&&on(v));
 });
 const n=points.length,cost=Array(n).fill(Infinity),prev=Array(n).fill(-1),done=new Set();cost[0]=0;
 for(let step=0;step<n;step++){
  let u=-1;for(let i=0;i<n;i++)if(!done.has(i)&&(u<0||cost[i]<cost[u]))u=i;
  if(u<0||!Number.isFinite(cost[u]))break;if(u===1)break;done.add(u);
  for(let v=0;v<n;v++)if((returning||v===0||w.canEnter(p,points[v]))&&v!==u&&(region(points[u])===region(points[v])||corridorEdge(u,v))){
   const next=cost[u]+dist(points[u],points[v]);if(next<cost[v]){cost[v]=next;prev[v]=u;}
  }
 }
 if(!Number.isFinite(cost[1]))return null;
 const path=[];for(let v=1;v!==0;v=prev[v]){if(v<0)return null;path.unshift({...points[v]});}
 while(path.length>1&&dist(actor,path[0])<0.001)path.shift();return path;
}
export function travel(w,a,destination,speed,dt,stop=0,returning=false){
 const path=route(w,a,destination,returning);if(!path)return false;
 let budget=speed*dt;
 for(let i=0;i<path.length;i++){
  const t=path[i],d=dist(a,t),end=i===path.length-1?stop:0;if(d<=end+0.00001)continue;
  const step=Math.min(budget,d-end);a.x+=(t.x-a.x)/d*step;a.z+=(t.z-a.z)/d*step;budget-=step;
  if(budget<=0.000001)break;
 }
 return dist(a,destination)<=stop+0.0001;
}
