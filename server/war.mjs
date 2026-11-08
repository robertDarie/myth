import { loseCargo } from './field-logistics.mjs';
import { randomUUID } from 'node:crypto';
import { TROOP_TYPES, emptyUnits, unitTotal, validUnits, countOf, changeUnits, normalizedUnits, classCounts } from './troops.mjs';
import { activeSkill, armyList } from './progression.mjs';
export const hospitalCapacity = p => 25 + 15 * p.buildings.infirmary;
export const wardTroops = p => unitTotal(p.wounded) + (p.healing ? unitTotal(p.healing.units) : 0);
export const wardMythic = p => p.woundedMythic + (p.healing?.mythic ?? 0);
export function initializeWar(p) { p.wounded = emptyUnits(); p.woundedMythic = 0; p.healing = null; p.battleReports = []; }
export const combatFor = (w, id) => [...w.battles.values()].find(b => b.sides.some(s => s.armyId === id));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function attackReason(w, a, b) {
  if (!a || !b || a.id === b.id || w.owner(a).id === w.owner(b).id) return 'Choose another player army.';
  const p = w.owner(a), q = w.owner(b);
  if (p.cityLevel < 2 || q.cityLevel < 2) return 'First-age cities are protected. Both cities must reach the Age of Oaths.';
  if (p.allianceId && p.allianceId === q.allianceId) return 'You cannot attack an alliance member.';
  if (a.recovery > 0 || b.recovery > 0 || a.health <= 0 || b.health <= 0) return 'That army is recovering.';
  if (w.atHome(a) || w.atHome(b)) return 'Armies at their own city are protected. Move both armies into the field.';
  if (!w.canEnter(p, b)) return 'Target is behind a locked Divine Gate.';
  return '';
}
export function counterMultiplier(a, b) {
  if (!a.troops || !b.troops) return 1;
  const x = classCounts(a.units), y = classCounts(b.units);
  return 1 + 0.15 * (x.infantry * y.cavalry + x.cavalry * y.archers + x.archers * y.infantry - x.infantry * y.archers - x.cavalry * y.infantry - x.archers * y.cavalry) / (a.troops * b.troops);
}
export function side(w, a) {
  const p = w.owner(a);
  return { playerId: p.id, playerName: p.name, armyId: a.id, commanderId: a.commanderId, unitsBefore: { ...a.units }, mythicBefore: a.mythic,
    unitsAfter: { ...a.units }, mythicAfter: a.mythic, wounded: emptyUnits(), woundedMythic: 0, damageDealt: 0, damageTaken: 0, healed: 0, absorbed: 0, shieldCreated: 0 };
}
export function finishBattle(w, battle, outcome) {
  if (!w.battles.has(battle.id)) return;
  battle.outcome = outcome; battle.ended = w.time;
  for (const s of battle.sides) {
    const a = w.army(s.armyId); if (a) { s.unitsAfter = { ...a.units }; s.mythicAfter = a.mythic; if (a.target?.type === 'pvp') { a.target = null; a.state = 'Idle'; } }
  }
  for (const s of battle.sides) {
    const p = w.players.get(s.playerId); if (!p) continue;
    p.battleReports.unshift(structuredClone(battle)); p.battleReports.length = Math.min(30, p.battleReports.length);
  }
  w.battles.delete(battle.id);
}
export function retreat(w, a, result) {
  const p = w.owner(a); let remaining = a.troops + a.mythic;
  // Severe wounds are removed from the march exactly once. At least one unit stays with its commander.
  // Determine losses per class, then apportion across tiers. Splitting one
  // stack into Tier I/II must not reduce casualties through separate rounding.
  for (const family of TROOP_TYPES.filter(t=>t.tier===1)) {
    const members=TROOP_TYPES.filter(t=>t.baseId===family.id);
    const total=members.reduce((sum,t)=>sum+countOf(a.units,t.id),0);
    const amount=Math.min(Math.floor(total*.25),Math.max(0,remaining-1));
    if(!amount)continue;
    const shares=members.map(t=>{const exact=countOf(a.units,t.id)*amount/total;return {id:t.id,amount:Math.floor(exact),fraction:exact-Math.floor(exact)};});
    let extra=amount-shares.reduce((sum,s)=>sum+s.amount,0);
    shares.sort((a,b)=>b.fraction-a.fraction||a.id.localeCompare(b.id,'en'));
    for(const share of shares){if(extra>0){share.amount++;extra--;}changeUnits(a.units,share.id,-share.amount);changeUnits(p.wounded,share.id,share.amount);changeUnits(result.wounded,share.id,share.amount);}
    remaining-=amount;
  }
  if (a.mythic > 0 && remaining > 1) { a.mythic--; p.woundedMythic++; result.woundedMythic++; }
  loseCargo(w,a);a.deployed=false;
  a.troops = unitTotal(a.units); a.health = 1; a.recovery = 8; a.x = p.homeX; a.z = p.homeZ; a.target = null; a.state = 'Recovering'; a.rage = 0; a.shield = 0; a.shieldTime = 0;
}
export function applyDamage(a, incoming, result) {
  const absorbed = Math.min(a.shield, incoming); a.shield -= absorbed; result.absorbed += absorbed;
  const actual = Math.min(a.health, Math.max(0, incoming - absorbed)); a.health -= actual; result.damageTaken += actual; return actual;
}
export function tickBattle(w, a, b) {
  const reason = attackReason(w, a, b);
  let battle = combatFor(w, a.id);
  if (reason || distance(a, b) > 2.01) { if (reason && battle) finishBattle(w, battle, 'Protected / unavailable'); return; }
  const other = combatFor(w, b.id);
  if ((battle && !battle.sides.some(s => s.armyId === b.id)) || (other && other.id !== battle?.id)) { a.target = null; a.state = 'Target engaged'; return; }
  if (!battle) {
    battle = { id: randomUUID(), started: w.time, ended: 0, nextAt: w.time + Math.max(a.cooldown, b.cooldown), rounds: 0, outcome: 'Fighting', sides: [side(w, a), side(w, b)] };
    w.battles.set(battle.id, battle); b.target = { type: 'pvp', id: a.id }; b.state = 'Fighting';
  }
  if (w.time + 0.0001 < battle.nextAt) return;
  battle.nextAt = w.time + 1; battle.rounds++;
  const actors = battle.sides.map(s => w.army(s.armyId));
  const stats = actors.map(x => w.stats(x));
  const hits = actors.map((x, i) => {
    const enemy = actors[1 - i], record = battle.sides[i], effective = stats[i].damage * counterMultiplier(x, enemy);
    x.cooldown = 1; x.attackSequence = (x.attackSequence ?? 0) + 1; x.attackX = enemy.x; x.attackZ = enemy.z;
    x.rage = Math.min(1000, x.rage + 200);
    const hp = x.health, shield = x.shield;
    const extra = x.rage >= 1000 ? activeSkill(w.owner(x), x, { ...stats[i], damage: effective }) : 0;
    record.healed += Math.max(0, x.health - hp); record.shieldCreated += Math.max(0, x.shield - shield);
    return Math.max(1, Math.round((effective + extra) * (1 - stats[1 - i].mitigation)));
  });
  // Both attacks use the same pre-round stats; neither gains an iteration-order advantage.
  battle.sides[0].damageDealt += applyDamage(actors[1], hits[0], battle.sides[1]);
  battle.sides[1].damageDealt += applyDamage(actors[0], hits[1], battle.sides[0]);
  const lost = actors.map(x => x.health <= 0);
  if (lost.some(Boolean)) {
    actors.forEach((x, i) => { if (lost[i]) retreat(w, x, battle.sides[i]); else { x.target = null; x.state = 'Victorious'; } });
    finishBattle(w, battle, lost.every(Boolean) ? 'Draw' : lost[1] ? 'Attacker victory' : 'Defender victory');
    w.event(`${battle.sides[0].playerName} and ${battle.sides[1].playerName} fought in the field: ${battle.outcome}.`);
  }
}
export function warCommand(w, p, c, fail) {
  if (c.type === 'hospital-heal') {
    if (!p.buildings.infirmary) fail('Build the House of Renewal before starting treatment.');
    if (p.healing) fail('The healing ward is already occupied.');
    const units = validUnits(c.units)?normalizedUnits(c.units):c.units, mythic = c.mythic ?? 0;
    if (!validUnits(units) || !Number.isSafeInteger(mythic) || mythic < 0 || unitTotal(units) + mythic < 1) fail('Choose whole wounded unit counts.');
    if (TROOP_TYPES.some(t => countOf(units,t.id) > countOf(p.wounded,t.id)) || mythic > p.woundedMythic) fail('Those wounded units are not in your hospital.');
    const beds = unitTotal(units) + mythic * 5;
    if (beds > hospitalCapacity(p)) fail('Healing batch exceeds available beds. Upgrade the House of Renewal or heal a smaller batch.');
    const healingWeight=TROOP_TYPES.reduce((sum,t)=>sum+countOf(units,t.id)*t.tier,0);
    const cost = { food: healingWeight * 2 + mythic * 20, gold: healingWeight + mythic * 15 };
    w.spend(p, cost);
    for (const t of TROOP_TYPES) changeUnits(p.wounded,t.id,-countOf(units,t.id)); p.woundedMythic -= mythic;
    const duration = Math.max(2, (healingWeight * 1.2 + mythic * 8) / (1 + 0.15 * Math.max(0, p.buildings.infirmary - 1)));
    p.healing = { id: randomUUID(), units: { ...units }, mythic, cost, duration, remaining: duration }; return true;
  }
  if (c.type === 'hospital-cancel') {
    const job = p.healing; if (!job || job.id !== c.targetId) fail('That healing batch no longer exists.');
    for (const t of TROOP_TYPES) changeUnits(p.wounded,t.id,countOf(job.units,t.id)); p.woundedMythic += job.mythic;
    for (const [id, amount] of Object.entries(job.cost)) p[id] += amount; p.healing = null; return true;
  }
  if (c.type === 'attack-player') {
    const a = armyList(p).find(a => a.id === (c.marchId || p.id)), b = w.army(c.targetId);
    if (!a) fail('That march does not belong to your city.');
    const reason = attackReason(w, a, b); if (reason) fail(reason);
    if (combatFor(w, a.id) || combatFor(w, b.id)) fail('An army is already engaged. Finish or disengage before issuing another attack.');
    a.target = { type: 'pvp', id: b.id }; a.state = 'Attacking'; return true;
  }
  if (['move', 'return', 'stop', 'attack', 'gather', 'capture'].includes(c.type)) {
    const a = armyList(p).find(a => a.id === (c.marchId || p.id)), battle = a && combatFor(w, a.id);
    // Only validated escape commands may close an active battle; rejected requests must be atomic.
    if (battle && ['return', 'stop'].includes(c.type)) finishBattle(w, battle, 'Disengaged');
    else if (battle) fail('Stop or return to disengage before taking another field order.');
  }
  return false;
}
export function tickHospital(w, p, dt) {
  const job = p.healing; if (!job) return; job.remaining = Math.max(0, job.remaining - dt);
  if (job.remaining > 0.00001) return;
  for (const t of TROOP_TYPES) changeUnits(p.reserveUnits,t.id,countOf(job.units,t.id));
  p.reserveTroops = unitTotal(p.reserveUnits); p.reserveMythic += job.mythic; p.healing = null;
  w.event(`${p.name}: healed units returned to city reserves.`);
}
export function warSnapshot(w, p) {
  return { wounded: { ...p.wounded }, woundedMythic: p.woundedMythic, healing: p.healing, hospitalCapacity: hospitalCapacity(p), hospitalTroops: wardTroops(p), hospitalMythic: wardMythic(p),
    battleReports: [...w.battles.values()].filter(b => b.sides.some(s => s.playerId === p.id)).map(b => structuredClone(b)).concat(p.battleReports) };
}
export function validateWar(p) {
  if (!validUnits(p.wounded) || !Number.isSafeInteger(p.woundedMythic) || p.woundedMythic < 0 || !Array.isArray(p.battleReports) || p.battleReports.length > 30) throw new Error('Invalid saved hospital or reports.');
  const job = p.healing;
  if (job && (typeof job.id !== 'string' || !job.id || !validUnits(job.units) || !Number.isSafeInteger(job.mythic) || job.mythic < 0 || unitTotal(job.units) + job.mythic < 1 || !Number.isFinite(job.remaining) || !Number.isFinite(job.duration) || job.remaining < 0 || job.duration <= 0 || job.remaining > job.duration || !job.cost || Object.entries(job.cost).some(([key, n]) => !['food','gold'].includes(key) || !Number.isSafeInteger(n) || n < 0))) throw new Error('Invalid saved healing batch.');
  for (const report of p.battleReports) validateReport(report);
}
export function validateReport(b) {
  if (!b || typeof b.id !== 'string' || !Number.isFinite(b.started) || !Number.isFinite(b.ended) || b.started < 0 || b.ended < 0 || !Number.isSafeInteger(b.rounds) || b.rounds < 0 || typeof b.outcome !== 'string' || !Array.isArray(b.sides) || b.sides.length !== 2) throw new Error('Invalid saved battle report.');
  if (b.sides[0]?.armyId === b.sides[1]?.armyId || b.sides[0]?.playerId === b.sides[1]?.playerId) throw new Error('Invalid saved battle participants.');
  for (const s of b.sides) if (!s || ['playerId','playerName','armyId','commanderId'].some(k => typeof s[k] !== 'string') || !validUnits(s.unitsBefore) || !validUnits(s.unitsAfter) || !validUnits(s.wounded) || ['mythicBefore','mythicAfter','woundedMythic','damageDealt','damageTaken','healed','absorbed','shieldCreated'].some(k => !Number.isFinite(s[k]) || s[k] < 0)) throw new Error('Invalid saved battle totals.');
}
