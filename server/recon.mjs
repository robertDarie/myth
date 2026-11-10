import { TROOP_TYPES, countOf } from './troops.mjs';
import { COMMANDERS } from './content.mjs';
import { armyList } from './progression.mjs';
import { RELICS } from './city-content.mjs';
import { randomUUID } from 'node:crypto';

// Original v0.45 tuning. These depths are not a verified Rise of Kingdoms table.
// Duration locks when the watch begins. The depth is read again when the watch ends.
const DEPTH_SECONDS = { 1: 8, 2: 6, 3: 4 };
export const reconSeconds = depth => DEPTH_SECONDS[depth] ?? 8;
export function reconDepth(p) {
  const outlook = p.buildings?.scoutcamp ?? 0;
  const research = p.technologies?.veilreading ?? 0;
  if (outlook >= 5 && research >= 2) return 3;
  if (outlook >= 3 || research >= 1) return 2;
  return outlook >= 1 ? 1 : 0;
}
const band = total => total < 50 ? 'a handful' : total < 200 ? 'a company' : total < 500 ? 'a host' : 'a war host';
const typesOf = units => TROOP_TYPES.filter(t => countOf(units, t.id) > 0).map(t => ({ id: t.id, name: t.name, tier: t.tier, count: countOf(units, t.id) }));
const commanderName = id => COMMANDERS.find(c => c.id === id)?.name ?? '';
const homeForces = p => armyList(p).filter(a => !a.deployed);
const forceOf = (a, role) => ({ id: a.id, role, commanderId: a.commanderId, commanderName: commanderName(a.commanderId), troops: a.troops, mythic: a.mythic, types: typesOf(a.units) });
const staleNote = 'This reading was true at the observation. The host may have changed since.';

export function initializeRecon(p) { p.reconReports = []; p.reconNotices = []; }
export function validateRecon(p) {
  if (!Array.isArray(p.reconReports) || p.reconReports.length > 20 || !Array.isArray(p.reconNotices) || p.reconNotices.length > 20) throw new Error('Invalid saved reconnaissance.');
  const ids = new Set();
  for (const r of p.reconReports) {
    if (!r || typeof r.id !== 'string' || ids.has(r.id) || !['city', 'march', 'garrison'].includes(r.kind) || typeof r.targetId !== 'string' || !Number.isFinite(r.time) || r.time < 0 || ![1, 2, 3].includes(r.depth) || !['read', 'missed'].includes(r.outcome)) throw new Error('Invalid saved reconnaissance.');
    ids.add(r.id);
    if (r.aether !== undefined || r.resources?.aether !== undefined) throw new Error('Invalid saved reconnaissance.');
  }
  for (const n of p.reconNotices) if (!n || typeof n.id !== 'string' || typeof n.scoutName !== 'string' || !Number.isFinite(n.time)) throw new Error('Invalid saved reconnaissance.');
}

function resourcesOf(p) {
  return { food: p.food, wood: p.wood, stone: p.stone, gold: p.gold, mana: p.mana };
}
function bonusText(p, army) {
  const parts = [];
  const drill = p.technologies?.drill ?? 0, vitality = p.technologies?.vitality ?? 0;
  if (drill > 0) parts.push('Heroic Formations rank ' + drill + ' · +' + (drill * 5) + '% damage');
  if (vitality > 0) parts.push('Oaths of Endurance rank ' + vitality + ' · +' + (vitality * 5) + '% health');
  const relic = RELICS.find(item => item.id === army?.equippedRelic);
  if (relic) parts.push(relic.name + ' · ' + relic.description);
  return parts.length ? parts.join(' · ') : 'No researched defensive oath is active.';
}
function cityReport(w, reader, target, depth) {
  const forces = homeForces(target);
  const total = forces.reduce((n, a) => n + a.troops + a.mythic, 0);
  const primary = forces.find(a => a.id === target.id) ?? forces[0];
  const report = {
    id: randomUUID(), kind: 'city', targetId: target.id, time: w.time, depth, outcome: 'read',
    subjectName: target.name, civilization: target.civilization, cityLevel: target.cityLevel,
    x: target.homeX, z: target.homeZ, strength: band(total), staleNote, showsForces: depth >= 2, showsResources: depth >= 3, showsCommand: depth >= 3,
  };
  if (depth >= 2) report.forces = forces.map(a => forceOf(a, a.id === target.id ? 'city host' : 'home march'));
  if (depth >= 3) {
    report.commanderId = primary?.commanderId ?? '';
    report.commanderName = commanderName(report.commanderId);
    report.bonuses = bonusText(target, primary);
    report.resources = resourcesOf(target);
  }
  report.readerId = reader.id;
  return report;
}
function marchReport(w, army, depth) {
  const owner = w.owner(army);
  const report = {
    id: randomUUID(), kind: 'march', targetId: army.id, time: w.time, depth, outcome: 'read',
    subjectName: owner.name, civilization: owner.civilization, cityLevel: owner.cityLevel,
    x: army.x, z: army.z, strength: band(army.troops + army.mythic), staleNote,
    showsForces: depth >= 2, showsResources: false, showsCommand: depth >= 3,
  };
  if (depth >= 2) report.forces = [forceOf(army, 'march')];
  if (depth >= 3) {
    report.commanderId = army.commanderId;
    report.commanderName = commanderName(army.commanderId);
    report.bonuses = bonusText(owner, army);
    report.health = Math.ceil(army.health);
  }
  return report;
}
function garrisonReport(w, garrison, depth) {
  const place = [...w.sites, ...w.flags].find(t => t.id === garrison.targetId);
  const armies = garrison.armyIds.map(id => w.army(id)).filter(Boolean);
  const total = armies.reduce((n, a) => n + a.troops + a.mythic, 0);
  const owner = armies[0] ? w.owner(armies[0]) : null;
  const report = {
    id: randomUUID(), kind: 'garrison', targetId: garrison.targetId, time: w.time, depth, outcome: 'read',
    subjectName: place?.name ?? 'Garrison', civilization: owner?.civilization ?? '', cityLevel: owner?.cityLevel ?? 0,
    x: place?.x ?? 0, z: place?.z ?? 0, strength: band(total), staleNote,
    showsForces: depth >= 2, showsResources: false, showsCommand: depth >= 3,
  };
  if (depth >= 2) report.forces = armies.map(a => forceOf(a, 'garrison'));
  if (depth >= 3 && armies[0]) {
    report.commanderId = armies[0].commanderId;
    report.commanderName = commanderName(armies[0].commanderId);
    report.bonuses = bonusText(w.owner(armies[0]), armies[0]);
  }
  return report;
}

const protectedMarch = (w, army) => !army?.deployed || army.recovery > 0 || w.atHome(army) || w.owner(army).cityLevel < 2;
export function reconTarget(w, p, recon) {
  if (!recon) return null;
  if (recon.kind === 'city') {
    const target = w.players.get(recon.targetId);
    if (!target || target.id === p.id || target.cityLevel < 2) return null;
    if (p.allianceId && p.allianceId === target.allianceId) return null;
    return { x: target.homeX, z: target.homeZ, target };
  }
  if (recon.kind === 'march') {
    const army = w.army(recon.targetId);
    if (protectedMarch(w, army) || w.owner(army).id === p.id) return null;
    if (p.allianceId && p.allianceId === w.owner(army).allianceId) return null;
    return { x: army.x, z: army.z, army };
  }
  const garrison = w.garrisons.find(g => g.targetId === recon.targetId && g.armyIds.length > 0);
  const place = [...w.sites, ...w.flags].find(t => t.id === recon.targetId);
  if (!garrison || !place || (p.allianceId && garrison.allianceId === p.allianceId)) return null;
  return { x: place.x, z: place.z, garrison };
}

export function beginRecon(w, p, c, fail) {
  const kind = c.type === 'recon-city' ? 'city' : c.type === 'recon-march' ? 'march' : c.type === 'recon-garrison' ? 'garrison' : '';
  if (!kind) return null;
  if (reconDepth(p) < 1) fail('Raise the Outlook of the Horizon before reading an enemy host.');
  const recon = { kind, targetId: c.targetId };
  const live = reconTarget(w, p, recon);
  if (!live) {
    if (kind === 'city') fail('That city cannot be read. It may be your own, an ally, still under its first oath, or no longer there.');
    if (kind === 'march') fail('That march cannot be read. It may be home, protected, allied, or no longer in the field.');
    fail('No enemy garrison holds that place.');
  }
  if (!w.canEnter(p, live)) fail('Scouts need alliance access through the corresponding Divine Gate.');
  return { recon, x: live.x, z: live.z, army: live.army };
}

export function trackRecon(w, p, s) {
  if (!s.recon || s.phase === 'Returning') return;
  const live = reconTarget(w, p, s.recon);
  if (!live) {
    if (s.phase === 'Exploring') return;
    s.phase = 'Returning'; s.recon = null; s.rewardPending = false; s.investigationId = ''; return;
  }
  if (s.phase === 'Outbound' && s.recon.kind === 'march') { s.targetX = live.x; s.targetZ = live.z; }
}

export function finishRecon(w, p, s) {
  const live = reconTarget(w, p, s.recon);
  const depth = reconDepth(p);
  let report;
  if (!live || depth < 1) {
    report = { id: randomUUID(), kind: s.recon.kind, targetId: s.recon.targetId, time: w.time, depth: Math.max(depth, 1), outcome: 'missed', subjectName: 'Withdrawn host', civilization: '', cityLevel: 0, x: s.x, z: s.z, strength: '', staleNote, showsForces: false, showsResources: false, showsCommand: false, readerId: p.id };
  } else if (s.recon.kind === 'city') report = cityReport(w, p, live.target, depth);
  else if (s.recon.kind === 'march') report = marchReport(w, live.army, depth);
  else report = garrisonReport(w, live.garrison, depth);
  report.scoutId = s.id;
  p.reconReports.unshift(report);
  p.reconReports.length = Math.min(20, p.reconReports.length);
  if (report.outcome === 'read' && report.kind === 'city') {
    const defender = live.target;
    if (!defender.reconNotices.some(n => n.id === s.id)) defender.reconNotices.unshift({ id: s.id, time: w.time, scoutPlayerId: p.id, scoutName: p.name, targetName: defender.name });
    defender.reconNotices.length = Math.min(20, defender.reconNotices.length);
  }
  s.recon = null;
}

export function visibleMarch(w, p, armyId, seen) {
  const army = w.army(armyId);
  return !!army && army.deployed && seen(army);
}
