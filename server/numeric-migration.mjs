import { armyList, heroLevel, ensureHero, xpAtLevel } from './progression.mjs';
import { referenceCamp, MIGRATION_SCALE } from './numerics.mjs';
import { createStrongholds } from './strongholds.mjs';
// Receives an already validated legacy world. Never operates on real files.
export function migrateNumericWorld(world) {
  const health=new Map(world.armies().map(a=>[a.id,a.health/Math.max(1,world.stats(a).maxHealth)]));
  const audit=[];
  const scaleUnits=units=>{for(const id of Object.keys(units??{}))units[id]*=MIGRATION_SCALE;};
  for(const p of world.players.values()) {
    const counts={playerId:p.id,reserves:p.reserveTroops,wounded:{...p.wounded},armies:armyList(p).map(a=>({id:a.id,units:{...a.units}}))};
    for(const [id,r] of Object.entries(p.heroRecords)) {
      const oldXP=r.xp,level=Math.min(60,1+Math.floor(oldXP/100)),fraction=Math.max(0,(oldXP-(level-1)*100)/100);
      p.numericVersion=1;ensureHero(p,id);
      r.xp=Math.floor(xpAtLevel(r,level)+fraction*(xpAtLevel(r,Math.min(60,level+1))-xpAtLevel(r,level===60?59:level)));
    }
    p.numericVersion=1;p.ap*=15;p.apRemainder=Math.floor(p.apRemainder*.6);
    scaleUnits(p.reserveUnits);p.reserveTroops*=MIGRATION_SCALE;scaleUnits(p.wounded);
    if(p.healing)scaleUnits(p.healing.units);
    for(const j of p.trainingQueue)if(['train','promote'].includes(j.type)){j.amount*=MIGRATION_SCALE;j.numericMigration=1;}
    for(const a of armyList(p)){scaleUnits(a.units);a.troops*=MIGRATION_SCALE;a.xp=ensureHero(p,a.commanderId).xp;a.level=heroLevel(ensureHero(p,a.commanderId));}
    audit.push(counts);
  }
  world.numericVersion=1;world.numericMigration={version:1,scale:MIGRATION_SCALE,legacyCounts:audit};
  for(const a of world.armies())a.health=Math.max(1,Math.min(1,health.get(a.id))*world.stats(a).maxHealth);
  for(const c of world.camps){const fraction=c.health/c.maxHealth;const stats=referenceCamp(c.level);c.maxHealth=stats.maxHealth;c.health=fraction*c.maxHealth;}
  for(const n of world.nodes)n.capacity*=100;
  const defs=createStrongholds(world);
  for(const t of world.strongholds){const base=defs.find(d=>d.id===t.id),hp=t.health/t.maxHealth,guard=t.guardHealth/t.maxGuardHealth;Object.assign(t,base,{health:base.maxHealth*hp,guardHealth:base.maxGuardHealth*guard,cycle:t.cycle,respawn:t.respawn});}
  for(const t of [...world.sites,...world.flags]){t.health*=1000;t.maxHealth*=1000;}
  // Historical reports keep their original units and reward values.
  world.logisticsRevision++;
  return world;
}
