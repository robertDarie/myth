import { World } from '../world.mjs';
import { KINGDOM_STAGES } from '../kingdom.mjs';
// Isolate earlier movement/combat tests from the new kingdom opening schedule.
export function openKingdom(w){w.kingdom.completed=KINGDOM_STAGES.slice(0,3).map(s=>({id:s.id,atMs:w.activityClockMs,legacy:true,eligible:[]}));return w;}
export const testWorld=options=>openKingdom(new World(options));
