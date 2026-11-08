// Aggregate totals stay available to the economy; typed rosters own unit transfers.
export const TROOP_TYPES = [
  { id: 'infantry', name: 'Oathguard', role: 'Infantry', description: 'Steady frontline troops.', health: 5, damage: 0.75, speed: 1, duration: 8, cityLevel: 1, cost: { food: 50, gold: 20 } },
  { id: 'archers', name: 'Dawn Archers', role: 'Archers', description: 'Higher damage with lighter protection.', health: 4, damage: 0.95, speed: 1, duration: 10, cityLevel: 1, cost: { food: 55, gold: 25 } },
  { id: 'cavalry', name: 'Dawn Riders', role: 'Cavalry', description: 'Faster when the whole march is mounted.', health: 5, damage: 0.85, speed: 1.2, duration: 12, cityLevel: 2, cost: { food: 70, gold: 30 } },
];
for (const type of TROOP_TYPES) { type.tier=1;type.baseId=type.id; }
const baseTypes=[...TROOP_TYPES];
for (const base of baseTypes) TROOP_TYPES.push({ ...base,id:'veteran'+base.id[0].toUpperCase()+base.id.slice(1),baseId:base.id,tier:2,name:'Veteran '+base.name,cityLevel:2,
  description:'Tier II · '+base.description+' +40% base health and +35% base damage; higher training and healing costs.',
  health:base.health*1.4,damage:base.damage*1.35,duration:base.duration*1.6,
  cost:Object.fromEntries([...Object.entries(base.cost).map(([id,value])=>[id,Math.ceil(value*1.8)]),['stone',10]]) });
export const countOf=(units,id)=>units?.[id]??0;
export function changeUnits(units,id,delta) { const value=countOf(units,id)+delta;if(value||baseTypes.some(t=>t.id===id))units[id]=value;else delete units[id]; }
export const classCounts=units=>Object.fromEntries(baseTypes.map(base=>[base.id,TROOP_TYPES.filter(t=>t.baseId===base.id).reduce((sum,t)=>sum+countOf(units,t.id),0)]));
export const emptyUnits = () => ({ infantry: 0, archers: 0, cavalry: 0 });
export const normalizedUnits=units=>Object.fromEntries(TROOP_TYPES.filter(t=>t.tier===1||countOf(units,t.id)>0).map(t=>[t.id,countOf(units,t.id)]));
export function tierLock(p,type) {
  if(p.cityLevel<type.cityLevel)return 'Citadel level '+type.cityLevel+' required.';
  if(type.tier===2) {
    if(p.buildings.barracks<2)return 'Hall of Spears level 2 required.';
    if((p.technologies.veterans??0)<1)return 'Research Veteran Oaths in the Athenaeum.';
  }
  return '';
}
export const promotionCost=type=>Object.fromEntries(Object.entries(type.cost).map(([id,value])=>[id,Math.max(0,value-(baseTypes.find(t=>t.id===type.baseId)?.cost[id]??0))]).filter(([,v])=>v>0));
export function trainingOptions(p) { return TROOP_TYPES.map(t=>({...t,lockedReason:tierLock(p,t),promotionCost:t.tier===2?promotionCost(t):{},sourceAvailable:countOf(p.reserveUnits,t.baseId)})); }
export const unitPower=units=>TROOP_TYPES.reduce((sum,t)=>sum+countOf(units,t.id)*(t.tier===2?8:5),0);
export const unitTotal = units => TROOP_TYPES.reduce((sum, type) => sum + countOf(units,type.id), 0);
export const legacyUnits = count => ({ ...emptyUnits(), infantry: count });
export function validUnits(units) {
  return !!units && typeof units === 'object' && !Array.isArray(units) && Object.keys(units).every(id => TROOP_TYPES.some(t => t.id === id))
    && TROOP_TYPES.every(t => (t.tier>1&&units[t.id]===undefined)||(Number.isSafeInteger(units[t.id]) && units[t.id] >= 0 && units[t.id] <= 100000));
}
export function migrateUnits(p) {
  // Schemas 1–3 had only generic mortal troops, including pending training orders.
  p.reserveUnits = legacyUnits(p.reserveTroops);
  for (const army of [p, ...p.marches]) army.units = legacyUnits(army.troops);
  for (const job of p.trainingQueue) if (job.type === 'train') job.targetId = 'infantry';
}
export function validateUnits(p) {
  const ledgers=[p.reserveUnits,p.wounded,p.healing?.units,...[p,...p.marches].map(a=>a.units)].filter(Boolean);
  for(const type of TROOP_TYPES.filter(t=>t.tier===2))if((ledgers.some(units=>countOf(units,type.id)>0)||p.trainingQueue.some(job=>job.targetId===type.id))&&tierLock(p,type))throw new Error('Invalid saved veteran unlock.');
  if (!validUnits(p.reserveUnits) || unitTotal(p.reserveUnits) !== p.reserveTroops || !Number.isSafeInteger(p.reserveMythic) || p.reserveMythic < 0) throw new Error('Invalid saved troop reserves.');
  for (const army of [p, ...p.marches]) if (!validUnits(army.units) || unitTotal(army.units) !== army.troops || !Number.isSafeInteger(army.mythic) || army.mythic < 0 || army.troops + army.mythic < 1) throw new Error('Invalid saved march composition.');
  if (p.trainingQueue.some(job => ['train','promote'].includes(job.type) && (!TROOP_TYPES.some(t => t.id === job.targetId)||(job.type==='promote'&&(!TROOP_TYPES.some(t=>t.id===job.targetId&&t.tier===2&&t.baseId===job.sourceId)||job.amount!==5))))) throw new Error('Invalid saved troop training order.');
}
export function troopBase(a) {
  const units = a.units ?? legacyUnits(a.troops);
  return { health: TROOP_TYPES.reduce((sum, t) => sum + countOf(units,t.id) * t.health, 0),
    damage: TROOP_TYPES.reduce((sum, t) => sum + countOf(units,t.id) * t.damage, 0),
    speed: a.troops > 0 && !a.mythic && classCounts(units).cavalry === a.troops ? 1.2 : 1 };
}
export function selection(c, fail) {
  const units = c.units === undefined ? legacyUnits(c.troops ?? 5) : c.units;
  const mythic = c.mythic ?? 0;
  if (!validUnits(units) || !Number.isSafeInteger(mythic) || mythic < 0 || mythic > 100000 || unitTotal(units) + mythic < 1) fail('Choose at least one ready unit, using whole non-negative troop counts.');
  return { units: normalizedUnits(units), mythic, troops: unitTotal(units) };
}
export function readyFor(p, current, chosen) {
  return chosen.mythic <= p.reserveMythic + (current?.mythic ?? 0)
    && TROOP_TYPES.every(t => countOf(chosen.units,t.id) <= countOf(p.reserveUnits,t.id) + countOf(current?.units,t.id));
}
export function transfer(p, current, chosen) {
  for (const t of TROOP_TYPES) changeUnits(p.reserveUnits,t.id,countOf(current?.units,t.id)-countOf(chosen.units,t.id));
  p.reserveTroops = unitTotal(p.reserveUnits); p.reserveMythic += (current?.mythic ?? 0) - chosen.mythic;
  if (current) { current.units = chosen.units; current.troops = chosen.troops; current.mythic = chosen.mythic; }
}
