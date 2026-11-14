import { World } from './legacy-world.mjs';
import { KINGDOM_STAGES } from '../kingdom.mjs';
// Isolate earlier movement/combat tests from the new kingdom opening schedule.
export function openKingdom(w){w.kingdom.completed=KINGDOM_STAGES.slice(0,3).map(s=>({id:s.id,atMs:w.activityClockMs,legacy:true,eligible:[]}));return w;}
// Earlier movement/combat fixtures author the legacy opening positions. Random
// spawn acceptance uses production World directly in spawning.test.mjs.
export function legacySpawns(w){
 if(w.players.size===0&&w.numericVersion===1){w.numericVersion=0;for(const n of w.nodes){n.remaining/=100;n.capacity/=100;}for(const c of w.camps){c.health=c.maxHealth=100*c.level;}for(const t of w.strongholds){t.numericVersion=0;t.health/=1000;t.maxHealth/=1000;t.guardHealth/=1000;t.maxGuardHealth/=1000;t.guardDamage/=200;t.xp/=4;for(const id of Object.keys(t.units))t.units[id]/=50;for(const id of Object.keys(t.reward))if(id!=='sigils')t.reward[id]/=100;}for(const t of w.sites){t.health/=1000;t.maxHealth/=1000;}}
 w.spawnLocation=()=>{const occupied=new Set([...w.players.values()].map(p=>p.slot));let slot=0;while(occupied.has(slot))slot++;return {x:5+(slot%8)*3.5,z:5+Math.floor(slot/8)*2.5};};
 return w;
}
export const testWorld=options=>openKingdom(legacySpawns(new World(options)));
