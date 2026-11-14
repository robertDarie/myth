import { route } from './navigation.mjs';
import { FINDINGS } from './findings.mjs';

// City footprints fit inside these gate-free starting lands. Existing cities
// are never moved, including legacy rows closer together than today's spacing.
export const STARTING_REGIONS = Object.freeze([{ id: 'first-frontier', minX: 3, maxX: 37, minZ: 3, maxZ: 37 }]);
export const SPAWN_RULES = Object.freeze({ cityDistance: 4, depositDistance: 2.3, structureDistance: 3.5, starterReach: 17, campReach: 23, attempts: 4096 });
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export function suitableSpawn(w, point) {
  if (!STARTING_REGIONS.some(r=>point.x>=r.minX&&point.x<=r.maxX&&point.z>=r.minZ&&point.z<=r.maxZ)) return false;
  const actor={id:'spawn-candidate',allianceId:'',...point};
  if (!w.canEnter(actor,point)) return false;
  if ([...w.players.values()].some(p=>distance(point,{x:p.homeX,z:p.homeZ})<SPAWN_RULES.cityDistance)) return false;
  if (w.nodes.some(n=>distance(point,n)<SPAWN_RULES.depositDistance)) return false;
  if ([...w.camps,...w.sites,...w.flags,...w.strongholds,...FINDINGS].some(s=>distance(point,s)<SPAWN_RULES.structureDistance)) return false;
  const reachable = target => !!route(w,actor,target);
  if (!['wood','food','gold'].every(resource=>w.nodes.some(n=>n.resource===resource&&distance(point,n)<=SPAWN_RULES.starterReach&&reachable(n)))) return false;
  return w.camps.some(c=>c.level===1&&distance(point,c)<=SPAWN_RULES.campReach&&reachable(c));
}
export function chooseCitySpawn(w) {
  const regions=STARTING_REGIONS;
  for(let attempt=0;attempt<SPAWN_RULES.attempts;attempt++) {
    // Each production draw is uniform; irrational offsets also keep fixed-value
    // deterministic test RNGs from retrying the same blocked point forever.
    const r=regions[w.chooseIndex(regions.length)];
    const x=r.minX+((w.random()+attempt*.618033988749895)%1)*(r.maxX-r.minX);
    const z=r.minZ+((w.random()+attempt*.414213562373095)%1)*(r.maxZ-r.minZ);
    const point={x,z};if(suitableSpawn(w,point))return point;
  }
  return null; // No reservation or mutable occupancy cache to leak on failure.
}
