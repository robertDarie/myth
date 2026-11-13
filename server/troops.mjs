// Aggregate totals stay available to the economy; typed rosters own unit transfers.
export const TROOP_TYPES = [
  { id: 'infantry', name: 'Oathguard', role: 'Infantry', description: 'Steady frontline troops.', health: 5, damage: 0.75, speed: 1, duration: 8, cityLevel: 1, cost: { food: 50, gold: 20 } },
  { id: 'archers', name: 'Dawn Archers', role: 'Archers', description: 'Higher damage with lighter protection.', health: 4, damage: 0.95, speed: 1, duration: 10, cityLevel: 1, cost: { food: 55, gold: 25 } },
  { id: 'cavalry', name: 'Dawn Riders', role: 'Cavalry', description: 'Faster when the whole march is mounted.', health: 5, damage: 0.85, speed: 1.2, duration: 12, cityLevel: 2, cost: { food: 70, gold: 30 } },
];
for (const type of TROOP_TYPES) { type.tier=1;type.baseId=type.id;type.sourceId=''; }
const baseTypes=[...TROOP_TYPES];
for (const base of baseTypes) TROOP_TYPES.push({ ...base,id:'veteran'+base.id[0].toUpperCase()+base.id.slice(1),baseId:base.id,sourceId:base.id,tier:2,name:'Veteran '+base.name,cityLevel:2,
  description:'Tier II · '+base.description+' +40% base health and +35% base damage; higher training and healing costs.',
  health:base.health*1.4,damage:base.damage*1.35,duration:base.duration*1.6,
  cost:Object.fromEntries([...Object.entries(base.cost).map(([id,value])=>[id,Math.ceil(value*1.8)]),['stone',10]]) });
// Original steps from the previous tier. Health ×1.22, damage ×1.18, training time ×1.28, food and gold ×1.55.
// Stone is a flat tier cost. These are not a copied reference-game table. Tier I and II stay on the formulas above.
const HIGHER_TIERS = [
  { tier: 3, prefix: 'column', stone: 25, names: { infantry: 'Bronze Column', archers: 'Ashen Bows', cavalry: 'Dawn Lancers' } },
  { tier: 4, prefix: 'bulwark', stone: 45, names: { infantry: 'Oath Bulwark', archers: 'Far Marks', cavalry: 'Storm Couriers' } },
  { tier: 5, prefix: 'titan', stone: 70, names: { infantry: 'Titan Guard', archers: 'Echo Marks', cavalry: 'Horizon Lancers' } },
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
for (const step of HIGHER_TIERS) for (const base of baseTypes) {
  const previous = TROOP_TYPES.find(t => t.baseId === base.id && t.tier === step.tier - 1);
  TROOP_TYPES.push({ ...base, id: step.prefix + base.id[0].toUpperCase() + base.id.slice(1), baseId: base.id, sourceId: previous.id, tier: step.tier, name: step.names[base.id], cityLevel: step.tier,
    description: 'Tier ' + ROMAN[step.tier] + ' ' + base.role.toLowerCase() + '. Stronger than the previous tier of this class. Infantry still counters cavalry, cavalry counters archers, and archers counter infantry.',
    health: previous.health * 1.22, damage: previous.damage * 1.18, duration: previous.duration * 1.28,
    cost: { food: Math.ceil(previous.cost.food * 1.55), gold: Math.ceil(previous.cost.gold * 1.55), stone: step.stone } });
}
export const TIER_TECH = { 2: 'veterans', 3: 'columns', 4: 'bulwarks', 5: 'titanhost' };
const TIER_TECH_NAME = { 2: 'Veteran Oaths', 3: 'Bronze Columns', 4: 'Oath Bulwarks', 5: 'Titan Host' };
const TIER_POWER = [0, 5, 8, 12, 17, 23];
export const countOf=(units,id)=>units?.[id]??0;
export function changeUnits(units,id,delta) { const value=countOf(units,id)+delta;if(value||baseTypes.some(t=>t.id===id))units[id]=value;else delete units[id]; }
export const classCounts=units=>Object.fromEntries(baseTypes.map(base=>[base.id,TROOP_TYPES.filter(t=>t.baseId===base.id).reduce((sum,t)=>sum+countOf(units,t.id),0)]));
// One formation. Each mortal class must be at least 15% of mortal troops. Mythic escorts are ignored.
// The health multiplier applies once. It is not stored and cannot be requested by the client.
export const FORMATION = { id: 'combined-arms', name: 'Combined Arms', minimumPercent: 15, health: 1.04 };
export function formationOf(units) {
  const counts = classCounts(units);
  const mortal = counts.infantry + counts.archers + counts.cavalry;
  const active = mortal > 0 && ['infantry', 'archers', 'cavalry'].every(id => counts[id] * 100 >= mortal * FORMATION.minimumPercent);
  return { ...FORMATION, active, appliedHealth: active ? FORMATION.health : 1, counts, mortal,
    shares: Object.fromEntries(['infantry', 'archers', 'cavalry'].map(id => [id, mortal ? counts[id] / mortal : 0])) };
}
export const emptyUnits = () => ({ infantry: 0, archers: 0, cavalry: 0 });
export const normalizedUnits=units=>Object.fromEntries(TROOP_TYPES.filter(t=>t.tier===1||countOf(units,t.id)>0).map(t=>[t.id,countOf(units,t.id)]));
export function tierLock(p,type) {
  if(p.cityLevel<type.cityLevel)return 'Citadel level '+type.cityLevel+' required.';
  if(type.tier>=2) {
    if((p.buildings?.barracks??0)<type.tier)return 'Hall of Spears level '+type.tier+' required.';
    if((p.technologies?.[TIER_TECH[type.tier]]??0)<1)return 'Research '+TIER_TECH_NAME[type.tier]+' in the Athenaeum.';
  }
  return '';
}
export const sourceType=type=>type?.sourceId?TROOP_TYPES.find(t=>t.id===type.sourceId)??null:null;
export const promotionCost=type=>{
  const source=sourceType(type);if(!source)return {};
  const keys=new Set([...Object.keys(type.cost),...Object.keys(source.cost)]);
  return Object.fromEntries([...keys].map(id=>[id,Math.max(0,(type.cost[id]??0)-(source.cost[id]??0))]).filter(([,value])=>value>0));
};
// Original curve. Hall levels 1–2 keep a batch of five so the first session stays readable.
// Larger orders do not reduce the time or resources spent per soldier.
export const TRAINING_BATCHES = { 1: 5, 2: 5, 3: 10, 4: 20, 5: 40 };
export const trainingBatch = p => TRAINING_BATCHES[Math.max(1, Math.min(5, p.buildings?.barracks ?? 1))] ?? 5;
export const batchCost = (cost, amount) => Object.fromEntries(Object.entries(cost).map(([id, value]) => [id, Math.ceil(value * amount / 5)]));
const hallSpeed = p => 1 + 0.1 * Math.max(0, (p.buildings?.barracks ?? 1) - 1);
export function trainingOptions(p) {
  const amount = trainingBatch(p), speed = hallSpeed(p);
  return TROOP_TYPES.map(t => {
    const quote = { orderAmount: amount, orderSeconds: t.duration * (amount / 5) / speed, orderCost: batchCost(t.cost, amount) };
    const source = sourceType(t);
    if (source) quote.promotionSeconds = (t.duration - source.duration) / speed;
    return { ...t, ...quote, lockedReason: tierLock(p, t), promotionCost: source ? promotionCost(t) : {}, sourceAvailable: source ? countOf(p.reserveUnits, source.id) : 0 };
  });
}
export const unitPower=units=>TROOP_TYPES.reduce((sum,t)=>sum+countOf(units,t.id)*TIER_POWER[t.tier],0);
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
  for(const type of TROOP_TYPES.filter(t=>t.tier>=2))if((ledgers.some(units=>countOf(units,type.id)>0)||p.trainingQueue.some(job=>job.targetId===type.id))&&tierLock(p,type))throw new Error('Invalid saved troop unlock.');
  if (!validUnits(p.reserveUnits) || unitTotal(p.reserveUnits) !== p.reserveTroops || !Number.isSafeInteger(p.reserveMythic) || p.reserveMythic < 0) throw new Error('Invalid saved troop reserves.');
  for (const army of [p, ...p.marches]) if (!validUnits(army.units) || unitTotal(army.units) !== army.troops || !Number.isSafeInteger(army.mythic) || army.mythic < 0 || army.troops + army.mythic < 1) throw new Error('Invalid saved march composition.');
  if (p.trainingQueue.some(job => {
    if (!['train','promote'].includes(job.type)) return false;
    const type = TROOP_TYPES.find(t => t.id === job.targetId);
    if (!type || (job.type === 'train' && !Object.values(TRAINING_BATCHES).includes(job.amount))) return true;
    const source = sourceType(type);
    return job.type === 'promote' && (!source || job.sourceId !== source.id || job.amount !== 5);
  })) throw new Error('Invalid saved troop training order.');
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
