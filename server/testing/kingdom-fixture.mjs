import { World } from '../world.mjs';
import { KINGDOM_STAGES } from '../kingdom.mjs';
// Isolate earlier movement/combat tests from the new kingdom opening schedule.
export function openKingdom(w){w.kingdom.completed=KINGDOM_STAGES.slice(0,3).map(s=>({id:s.id,atMs:w.activityClockMs,legacy:true,eligible:[]}));return w;}
// Earlier movement/combat fixtures author the legacy opening positions. Random
// spawn acceptance uses production World directly in spawning.test.mjs.
export function legacySpawns(w){
 w.spawnLocation=()=>{const occupied=new Set([...w.players.values()].map(p=>p.slot));let slot=0;while(occupied.has(slot))slot++;return {x:5+(slot%8)*3.5,z:5+Math.floor(slot/8)*2.5};};
 return w;
}
export const testWorld=options=>openKingdom(legacySpawns(new World(options)));
