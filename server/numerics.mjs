import reference from './balance-reference.json' with { type: 'json' };
export { reference };
export const referenceScale = p => p?.numericVersion === 1;
export const NUMERIC_VERSION = 1;
export const MIGRATION_SCALE = 50;
export const REFERENCE_BATCHES = {1:100,2:200,3:500,4:1000,5:2000};
// ToM aggregate simulation coefficient, NOT a published RoK damage equation.
export const DAMAGE_COEFFICIENT = 0.05;
export const defenseFactor = defense => 120 / Math.max(1, defense || 120);
export function referenceTroop(type) {
  const [attack,defense,health,marchSpeed,load,food,wood,stone,gold,duration] = reference.troops[type.baseId][type.tier-1];
  return {...type,attack,defense,health,marchSpeed,load,duration,damage:attack*DAMAGE_COEFFICIENT,
    cost:Object.fromEntries(Object.entries({food,wood,stone,gold}).filter(([,n])=>n)),
    description:type.description+' Reference troop attributes; original aggregate combat calibration.'};
}
export function commanderCapacity(level) {
  const values = reference.commanderCapacity;
  if(values[level]!==undefined)return values[level];
  const levels=Object.keys(values).map(Number).sort((a,b)=>a-b);
  const lower=levels.filter(n=>n<level).at(-1)??1,upper=levels.find(n=>n>level)??60;
  // Explicit inference only for missing reference rows.
  return Math.round(values[lower]+(values[upper]-values[lower])*(level-lower)/Math.max(1,upper-lower));
}
export function referenceCamp(level) {
  const row=reference.ordinary[level-1];
  if(!row)throw new Error('Invalid ordinary enemy level.');
  const troopCount=row.enemyTroops??Math.round(row.recommendedTroops*5/6);
  const type=referenceTroop({baseId:'infantry',tier:row.recommendedTier,description:''});
  return {...row,troopCount,composition:{infantry:troopCount},attack:type.attack,defense:type.defense,
    maxHealth:troopCount*type.health,retaliation:troopCount*type.damage,
    assumptions:'Mortal infantry at recommended tier; missing lineups inferred as 5/6 recommendation; aggregate damage provisional.'};
}
