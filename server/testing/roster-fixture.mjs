import { COMMANDERS } from '../content.mjs';
import { ensureHero } from '../progression.mjs';
// Combat/formation unit tests need authored rosters, not a removed gold recruitment API.
// Economy acquisition and end-to-end journey tests call World.command directly.
export function ownCommander(p,id){if(!COMMANDERS.some(c=>c.id===id))throw new Error('Unknown commander fixture.');if(!p.ownedCommanders.includes(id))p.ownedCommanders.push(id);ensureHero(p,id);}
export function fixtureCommand(w,p,c){
 if(c.type==='unlock-commander'){if(p.ownedCommanders.includes(c.targetId))throw new Error('Commander already recruited.');ownCommander(p,c.targetId);return;}
 if(c.type==='commander'&&!p.ownedCommanders.includes(c.targetId))ownCommander(p,c.targetId);
 return w.command(p,c);
}
