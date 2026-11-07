// Aggregate totals stay available to the economy; typed rosters own unit transfers.
export const TROOP_TYPES = [
  { id: 'infantry', name: 'Oathguard', role: 'Infantry', description: 'Steady frontline troops.', health: 5, damage: 0.75, speed: 1, duration: 8, cityLevel: 1, cost: { food: 50, gold: 20 } },
  { id: 'archers', name: 'Dawn Archers', role: 'Archers', description: 'Higher damage with lighter protection.', health: 4, damage: 0.95, speed: 1, duration: 10, cityLevel: 1, cost: { food: 55, gold: 25 } },
  { id: 'cavalry', name: 'Dawn Riders', role: 'Cavalry', description: 'Faster when the whole march is mounted.', health: 5, damage: 0.85, speed: 1.2, duration: 12, cityLevel: 2, cost: { food: 70, gold: 30 } },
];
export const emptyUnits = () => ({ infantry: 0, archers: 0, cavalry: 0 });
export const unitTotal = units => TROOP_TYPES.reduce((sum, type) => sum + units[type.id], 0);
export const legacyUnits = count => ({ ...emptyUnits(), infantry: count });
export function validUnits(units) {
  return !!units && typeof units === 'object' && !Array.isArray(units) && Object.keys(units).every(id => TROOP_TYPES.some(t => t.id === id))
    && TROOP_TYPES.every(t => Number.isSafeInteger(units[t.id]) && units[t.id] >= 0 && units[t.id] <= 100000);
}
export function migrateUnits(p) {
  // Schemas 1–3 had only generic mortal troops, including pending training orders.
  p.reserveUnits = legacyUnits(p.reserveTroops);
  for (const army of [p, ...p.marches]) army.units = legacyUnits(army.troops);
  for (const job of p.trainingQueue) if (job.type === 'train') job.targetId = 'infantry';
}
export function validateUnits(p) {
  if (!validUnits(p.reserveUnits) || unitTotal(p.reserveUnits) !== p.reserveTroops || !Number.isSafeInteger(p.reserveMythic) || p.reserveMythic < 0) throw new Error('Invalid saved troop reserves.');
  for (const army of [p, ...p.marches]) if (!validUnits(army.units) || unitTotal(army.units) !== army.troops || !Number.isSafeInteger(army.mythic) || army.mythic < 0 || army.troops + army.mythic < 1) throw new Error('Invalid saved march composition.');
  if (p.trainingQueue.some(job => job.type === 'train' && !TROOP_TYPES.some(t => t.id === job.targetId))) throw new Error('Invalid saved troop training order.');
}
export function troopBase(a) {
  const units = a.units ?? legacyUnits(a.troops);
  return { health: TROOP_TYPES.reduce((sum, t) => sum + units[t.id] * t.health, 0),
    damage: TROOP_TYPES.reduce((sum, t) => sum + units[t.id] * t.damage, 0),
    speed: a.troops > 0 && !a.mythic && units.cavalry === a.troops ? 1.2 : 1 };
}
export function selection(c, fail) {
  const units = c.units === undefined ? legacyUnits(c.troops ?? 5) : c.units;
  const mythic = c.mythic ?? 0;
  if (!validUnits(units) || !Number.isSafeInteger(mythic) || mythic < 0 || mythic > 100000 || unitTotal(units) + mythic < 1) fail('Choose at least one ready unit, using whole non-negative troop counts.');
  return { units: { ...units }, mythic, troops: unitTotal(units) };
}
export function readyFor(p, current, chosen) {
  return chosen.mythic <= p.reserveMythic + (current?.mythic ?? 0)
    && TROOP_TYPES.every(t => chosen.units[t.id] <= p.reserveUnits[t.id] + (current?.units[t.id] ?? 0));
}
export function transfer(p, current, chosen) {
  for (const t of TROOP_TYPES) p.reserveUnits[t.id] += (current?.units[t.id] ?? 0) - chosen.units[t.id];
  p.reserveTroops = unitTotal(p.reserveUnits); p.reserveMythic += (current?.mythic ?? 0) - chosen.mythic;
  if (current) { current.units = chosen.units; current.troops = chosen.troops; current.mythic = chosen.mythic; }
}
