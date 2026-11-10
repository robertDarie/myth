import { rememberStatics, recalled } from './discovery.mjs';
import { recordActivity } from './activity.mjs';
import { journeyMetric } from './chapters.mjs';
import { randomUUID } from 'node:crypto';
import { route, travel } from './navigation.mjs';
import { scoutCampCard, scoutProfile } from './scout-camp.mjs';
import { revealFindings, completeInvestigation, journalFor, prepareInvestigation, findingById } from './findings.mjs';
import { beginRecon, trackRecon, finishRecon, reconDepth, reconSeconds, initializeRecon, validateRecon, visibleMarch } from './recon.mjs';

// Terrain discovery is permanent. Military reconnaissance is separate and current-vision only.
// Explored land does not publish enemy troop counts, cargo, orders, live garrison totals or live resource amounts.
// Unlike Rise of Kingdoms, marches that leave allied sight are removed rather than kept as last-seen ghosts.
// Historical scout reports remain the private record of what was observed on arrival.
export const FOG = { cellSize: 4, width: 20, cityRadius: 10, armyRadius: 8, scoutRadius: 9, scoutSpeed: 7 };
const PHASES = ['Outbound', 'Exploring', 'Returning'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => p && [p.x, p.z].every(n => Number.isFinite(n) && n >= 1 && n <= 79);
const allied = (p, q) => p.id === q.id || !!p.allianceId && p.allianceId === q.allianceId;
export const cellIndex = t => Math.min(19, Math.max(0, Math.floor(t.z / 4))) * 20 + Math.min(19, Math.max(0, Math.floor(t.x / 4)));
const cellCenter = index => ({ x: (index % 20) * 4 + 2, z: Math.floor(index / 20) * 4 + 2 });
const rewardedCells = new WeakMap();
function claimSurvey(p, cell) {
  let claimed = rewardedCells.get(p);
  if (!claimed) { claimed = new Set(); rewardedCells.set(p, claimed); }
  if (claimed.has(cell)) return false;
  claimed.add(cell); return true;
}
export function initializeExploration(p) { p.explored = []; p.scouts = []; p.scoutReports = []; p.autoExplore = false; delete p.scout; }
export function migrateScouting(p) {
  if (!Array.isArray(p.scouts)) p.scouts = p.scout && typeof p.scout === 'object' ? [p.scout] : [];
  delete p.scout;
  p.autoExplore = p.autoExplore === true;
  for (const s of p.scouts) if (s && typeof s === 'object') {
    if (!Number.isFinite(s.surveyRemaining) || s.surveyRemaining < 0) s.surveyRemaining = 0;
    if (typeof s.rewardPending !== 'boolean') s.rewardPending = s.phase === 'Outbound';
    if (typeof s.reportedThisLeg !== 'boolean') s.reportedThisLeg = false;
    if (typeof s.investigationId !== 'string') s.investigationId = '';
    if (!Number.isFinite(s.homeX)) s.homeX = p.homeX;
    if (!Number.isFinite(s.homeZ)) s.homeZ = p.homeZ;
  }
}
export function sources(w, p) {
  const members = [...w.players.values()].filter(q => allied(p, q)), ids = new Set(members.map(q => q.id));
  const eyes = members.flatMap(q => {
    const profile = scoutProfile(q.buildings?.scoutcamp ?? 0);
    return [{ x: q.homeX, z: q.homeZ, radius: FOG.cityRadius }, ...(q.scouts ?? []).map(s => ({ x: s.x, z: s.z, radius: profile.radius }))];
  });
  for (const a of w.armies()) { const owner = w.owner(a); if (ids.has(owner.id) && (a.deployed || a.target || dist(a, { x: owner.homeX, z: owner.homeZ }) >= 2)) eyes.push({ x: a.x, z: a.z, radius: FOG.armyRadius }); }
  return eyes;
}
export function visionContext(w, p) { const eyes = sources(w, p); return { eyes, seen: target => eyes.some(s => dist(s, target) <= s.radius) }; }
export const visible = (w, p, target) => visionContext(w, p).seen(target);
function regionBusy(p, x, z, exceptId = '') {
  const cell = cellIndex({ x, z });
  return p.scouts.some(s => s.id !== exceptId && (s.phase === 'Outbound' || s.phase === 'Exploring') && cellIndex({ x: s.targetX, z: s.targetZ }) === cell);
}
function assignTarget(p, s, x, z) {
  s.targetX = x; s.targetZ = z; s.phase = 'Outbound'; s.surveyRemaining = 0; s.reportedThisLeg = false;
  s.rewardPending = !p.explored.includes(cellIndex({ x, z }));
  s.investigationId = '';
  s.recon = null;
  s.watchSeconds = 0;
}
function createScout(p, x, z) {
  const s = { id: randomUUID(), ownerId: p.id, x: p.homeX, z: p.homeZ, homeX: p.homeX, homeZ: p.homeZ, targetX: x, targetZ: z, phase: 'Outbound', surveyRemaining: 0, rewardPending: !p.explored.includes(cellIndex({ x, z })), reportedThisLeg: false, investigationId: '', recon: null, watchSeconds: 0 };
  return s;
}
function visibleCells(w, p) {
  const known = new Set(p.explored);
  for (const eye of sources(w, p)) for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) if (dist(eye, { x: x * 4 + 2, z: z * 4 + 2 }) <= eye.radius) known.add(z * 20 + x);
  return known;
}
export function nextAutoTarget(w, p, from, profile) {
  const origin = cellIndex(from), ox = origin % 20, oz = Math.floor(origin / 20);
  const known = visibleCells(w, p);
  const taken = new Set(p.scouts.filter(s => s.phase === 'Outbound' || s.phase === 'Exploring').map(s => cellIndex({ x: s.targetX, z: s.targetZ })));
  let best = null, bestRank = Infinity;
  for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) {
    const index = z * 20 + x;
    if (known.has(index) || taken.has(index)) continue;
    const reach = Math.max(Math.abs(x - ox), Math.abs(z - oz));
    if (reach > profile.autoSectors) continue;
    const center = cellCenter(index);
    if (!point(center) || !w.canEnter(p, center)) continue;
    const rank = reach * 1000 + dist(from, center);
    if (rank < bestRank) { bestRank = rank; best = center; }
  }
  return best;
}
function dispatchAuto(w, p, profile) {
  if (!p.autoExplore || profile.scouts <= 0) return;
  let guard = profile.scouts;
  while (p.scouts.length < profile.scouts && guard-- > 0) {
    const next = nextAutoTarget(w, p, { x: p.homeX, z: p.homeZ }, profile);
    if (!next) return;
    p.scouts.push(createScout(p, next.x, next.z));
  }
}
function surveyReport(w, p, s, radius) {
  return { id: randomUUID(), x: s.x, z: s.z, time: w.time,
    camps: w.camps.filter(c => dist(c, s) <= radius).map(({ contributors, ...c }) => ({ ...c })),
    flags: w.flags.filter(f => dist(f, s) <= radius).map(f => ({ ...f })),
    armies: w.armies().filter(a => a.deployed && !allied(p, w.owner(a)) && dist(a, s) <= radius).map(a => ({ id: a.id, ownerId: w.owner(a).id, name: w.owner(a).name, x: a.x, z: a.z, troops: a.troops, mythic: a.mythic, health: Math.ceil(a.health), commanderId: a.commanderId })),
    strongholds: w.strongholds.filter(t => dist(t, s) <= radius).map(t => ({ ...t })),
    sites: w.sites.filter(t => dist(t, s) <= radius).map(t => ({ ...t })),
    garrisons: w.garrisons.filter(g => { const t = [...w.sites, ...w.flags].find(t => t.id === g.targetId); return t && dist(t, s) <= radius; }).map(g => ({ targetId: g.targetId, marches: g.armyIds.length, troops: g.armyIds.reduce((n, id) => n + (w.army(id)?.troops || 0), 0), mythic: g.armyIds.reduce((n, id) => n + (w.army(id)?.mythic || 0), 0) })) };
}
function completeSurvey(w, p, s, profile) {
  if (s.reportedThisLeg) return;
  s.reportedThisLeg = true;
  p.scoutReports.unshift(surveyReport(w, p, s, profile.radius));
  p.scoutReports.length = Math.min(20, p.scoutReports.length);
  if (!s.rewardPending) return;
  s.rewardPending = false;
  if (!claimSurvey(p, cellIndex({ x: s.targetX, z: s.targetZ }))) return;
  journeyMetric(p, 'surveys', 1); recordActivity(w, p, 'scouts', 1);
}
function pathLength(w, s, destination, returning) {
  const path = route(w, s, destination, returning); if (!path) return Infinity;
  let at = { x: s.x, z: s.z }, length = 0;
  for (const step of path) { length += dist(at, step); at = step; }
  return length;
}
function scoutEta(w, p, s, profile) {
  if (s.phase === 'Exploring') return Math.max(0, s.surveyRemaining);
  if (s.phase === 'Idle' || profile.speed <= 0) return 0;
  const returning = s.phase === 'Returning';
  const destination = returning ? { x: p.homeX, z: p.homeZ } : { x: s.targetX, z: s.targetZ };
  const length = pathLength(w, s, destination, returning);
  return Number.isFinite(length) ? length / profile.speed : 0;
}
function presentScout(w, owner, s, profile, includeAuto) {
  const watch = s.watchSeconds > 0 ? s.watchSeconds : profile.surveySeconds;
  const progress = s.phase === 'Exploring' && watch > 0 ? Math.max(0, Math.min(1, 1 - s.surveyRemaining / watch)) : 0;
  const body = { id: s.id, ownerId: s.ownerId, phase: s.phase, x: s.x, z: s.z, targetX: s.targetX, targetZ: s.targetZ, eta: scoutEta(w, owner, s, profile), progress };
  if (includeAuto) { body.auto = !!owner.autoExplore; if (s.investigationId) body.investigationId = s.investigationId; if (s.recon) body.reconKind = s.recon.kind; }
  return body;
}
export function explorationTick(w, dt) {
  for (const p of w.players.values()) {
    const profile = scoutProfile(p.buildings?.scoutcamp ?? 0);
    p.scouts ??= [];
    dispatchAuto(w, p, profile);
    const keep = [];
    for (const s of p.scouts) {
      trackRecon(w, p, s);
      if (s.phase === 'Outbound' && !w.canEnter(p, { x: s.targetX, z: s.targetZ })) { s.phase = 'Returning'; s.rewardPending = false; s.investigationId = ''; s.recon = null; }
      if (s.phase === 'Exploring') {
        s.surveyRemaining = Math.max(0, s.surveyRemaining - dt);
        if (s.surveyRemaining > 0.00001) { keep.push(s); continue; }
        if (s.recon) finishRecon(w, p, s);
        else {
          completeSurvey(w, p, s, profile);
          if (s.investigationId) { completeInvestigation(p, s.investigationId); s.investigationId = ''; }
        }
        if (p.autoExplore) {
          const next = nextAutoTarget(w, p, s, profile);
          if (next) { assignTarget(p, s, next.x, next.z); keep.push(s); continue; }
        }
        s.phase = 'Returning';
      }
      const returning = s.phase === 'Returning';
      const target = returning ? { x: p.homeX, z: p.homeZ } : { x: s.targetX, z: s.targetZ };
      const arrived = profile.speed > 0 && travel(w, s, target, profile.speed, dt, 0, returning);
      if (arrived && returning) continue;
      if (arrived && s.phase === 'Outbound') {
        const place = findingById(s.investigationId);
        const seconds = s.recon ? reconSeconds(reconDepth(p)) : place && place.seconds > 0 ? place.seconds : profile.surveySeconds;
        s.phase = 'Exploring'; s.watchSeconds = seconds; s.surveyRemaining = seconds; s.reportedThisLeg = false;
      }
      keep.push(s);
    }
    p.scouts = keep;
  }
  const contexts = new Map();
  for (const p of w.players.values()) {
    const key = p.allianceId ? 'alliance:' + p.allianceId : 'player:' + p.id; if (!contexts.has(key)) contexts.set(key, visionContext(w, p)); const context = contexts.get(key);
    const known = new Set(p.explored), eyes = context.eyes;
    for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) if (eyes.some(s => dist(s, { x: x * 4 + 2, z: z * 4 + 2 }) <= s.radius)) known.add(z * 20 + x);
    p.explored = [...known].sort((a, b) => a - b); revealFindings(p); rememberStatics(w, p, context.seen);
  }
}
export function explorationCommand(w, p, c, fail) {
  const profile = scoutProfile(p.buildings?.scoutcamp ?? 0);
  if (c.type === 'recon-city' || c.type === 'recon-march' || c.type === 'recon-garrison') {
    const started = beginRecon(w, p, c, fail);
    if (c.type === 'recon-march' && !visibleMarch(w, p, c.targetId, target => visible(w, p, target))) fail('That march is outside current allied vision. Scout the area first.');
    if (profile.scouts <= 0) fail('Raise the Outlook of the Horizon before sending scouts.');
    if (p.scouts.length >= profile.scouts) fail('All scouts are already deployed. Recall one or raise the Outlook of the Horizon.');
    const s = createScout(p, started.x, started.z);
    s.recon = started.recon; s.rewardPending = false; s.investigationId = '';
    p.scouts.push(s); return true;
  }
  if (c.type === 'finding-investigate') {
    const place = prepareInvestigation(p, c.targetId, fail);
    if (profile.scouts <= 0) fail('Raise the Outlook of the Horizon before sending scouts.');
    if (p.scouts.length >= profile.scouts) fail('All scouts are already deployed. Recall one or raise the Outlook of the Horizon.');
    if (!w.canEnter(p, place)) fail('Scouts need alliance access through the corresponding Divine Gate.');
    if (regionBusy(p, place.x, place.z)) fail('A scout is already working on that region.');
    const s = createScout(p, place.x, place.z);
    s.investigationId = place.id;
    p.scouts.push(s); return true;
  }
  if (c.type === 'scout-send') {
    if (!point(c)) fail('Choose a scouting destination inside the map (1–79).');
    if (profile.scouts <= 0) fail('Raise the Outlook of the Horizon before sending scouts.');
    if (p.scouts.length >= profile.scouts) fail(profile.scouts === 1 ? 'Your scout is already deployed. Recall it or wait for its return.' : 'All scouts are already deployed. Recall one or raise the Outlook of the Horizon.');
    if (!w.canEnter(p, c)) fail('Scouts need alliance access through the corresponding Divine Gate.');
    if (regionBusy(p, c.x, c.z)) fail('A scout is already working on that region.');
    p.scouts.push(createScout(p, c.x, c.z)); return true;
  }
  if (c.type === 'scout-redirect') {
    const s = p.scouts.find(s => s.id === c.targetId);
    if (!s) fail('That scout mission is no longer active.');
    if (!point(c)) fail('Choose a scouting destination inside the map (1–79).');
    if (!w.canEnter(p, c)) fail('Scouts need alliance access through the corresponding Divine Gate.');
    if (regionBusy(p, c.x, c.z, s.id)) fail('A scout is already working on that region.');
    if ((s.phase === 'Outbound' || s.phase === 'Exploring') && cellIndex({ x: s.targetX, z: s.targetZ }) === cellIndex(c)) fail('That scout is already assigned to this region.');
    assignTarget(p, s, c.x, c.z); return true;
  }
  if (c.type === 'scout-recall') {
    const s = p.scouts.find(s => s.id === c.targetId);
    if (!s) fail('That scout mission is no longer active.');
    s.phase = 'Returning'; s.rewardPending = false; s.investigationId = ''; s.recon = null; return true;
  }
  if (c.type === 'scout-auto') {
    if (typeof c.enabled !== 'boolean') fail('Choose whether auto explore is on or off.');
    if (c.enabled && profile.scouts <= 0) fail('Raise the Outlook of the Horizon before using auto explore.');
    p.autoExplore = c.enabled; return true;
  }
  if (c.type === 'attack-player') {
    const a = w.army(c.targetId); if (a && (!a.deployed || !visible(w, p, a))) fail('That enemy march is outside current allied vision. Scout the area first.');
  }
  return false;
}
export function fogSnapshot(w, p, context = visionContext(w, p)) {
  const eyes = context.eyes, cells = []; for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) if (eyes.some(s => dist(s, { x: x * 4 + 2, z: z * 4 + 2 }) <= s.radius)) cells.push(z * 20 + x);
  const profile = scoutProfile(p.buildings?.scoutcamp ?? 0);
  const explored = [...new Set([...p.explored, ...cells])].sort((a, b) => a - b);
  const own = p.scouts.map(s => presentScout(w, p, s, profile, true));
  for (let i = own.length; i < profile.scouts; i++) own.push({ id: 'idle:' + p.id + ':' + i, ownerId: p.id, phase: 'Idle', x: p.homeX, z: p.homeZ, targetX: p.homeX, targetZ: p.homeZ, eta: 0, progress: 0, auto: !!p.autoExplore });
  const alliedScouts = [...w.players.values()].filter(q => q.id !== p.id && allied(p, q)).flatMap(q => q.scouts.map(s => presentScout(w, q, s, scoutProfile(q.buildings?.scoutcamp ?? 0), false)));
  const journal = journalFor(p, p.scouts.map(s => ({ ...s, eta: scoutEta(w, p, s, profile) })));
  const depth = reconDepth(p);
  return { cellSize: 4, width: 20, explored, visible: cells, exploredPercent: Math.round(explored.length * 2.5) / 10, autoExplore: !!p.autoExplore, scoutCamp: scoutCampCard(p.buildings?.scoutcamp ?? 0), scouts: [...own, ...alliedScouts], reports: p.scoutReports, findings: journal.places, journal: { discovered: journal.discovered, investigated: journal.investigated, claimed: journal.claimed, unclaimed: journal.unclaimed, byType: journal.byType, remaining: journal.remaining, milestones: journal.milestones, nextUnclaimedId: journal.nextUnclaimedId }, recon: { depth, seconds: reconSeconds(depth), research: p.technologies?.veilreading ?? 0 }, reconReports: p.reconReports ?? [], reconNotices: p.reconNotices ?? [] };
}
export function filterFog(w, snapshot, p, context = visionContext(w, p)) {
  const seen = context.seen, friendly = a => a.ownerId === p.id || !!p.allianceId && a.allianceId === p.allianceId;
  snapshot.exploration = fogSnapshot(w, p, context); rememberStatics(w, p, seen);
  snapshot.armies = snapshot.armies.filter(a => friendly(a) || seen(a)).map(a => a.ownerId === p.id ? a : { ...a, cargo: undefined, cargoSources: undefined, carryCapacity: undefined, homeX: undefined, homeZ: undefined, hasOrder: false, targetId: '', targetX: a.x, targetZ: a.z, route: [] });
  for (const q of snapshot.players) {
    delete q.explored; delete q.scout; delete q.scouts; delete q.scoutReports; delete q.autoExplore; delete q.findings; delete q.reconReports; delete q.reconNotices;
    if (q.id !== p.id) { q.x = q.homeX; q.z = q.homeZ; }
  }
  for (const kind of ['strongholds', 'camps', 'nodes', 'flags', 'sites']) {
    const actual = snapshot[kind], memory = recalled(p, kind), merged = new Map(memory.map(t => [t.id, t]));
    for (const t of actual) if (seen(t) || (kind === 'flags' || kind === 'sites') && !!p.allianceId && t.allianceId === p.allianceId) merged.set(t.id, { ...t, lastKnown: false, observedAt: w.time });
    snapshot[kind] = [...merged.values()];
  }
  const cities = new Map(recalled(p, 'cities').map(c => [c.id, c]));
  snapshot.players = snapshot.players.map(q => {
    if (q.id === p.id) return { ...q, mapVisible: true };
    if (seen({ x: q.homeX, z: q.homeZ })) return { ...q, mapVisible: true, lastKnown: false };
    const memory = cities.get(q.id);
    return memory ? { id: q.id, name: q.name, civilization: q.civilization, ...memory, mapVisible: true } : { id: q.id, name: q.name, civilization: q.civilization, allianceId: q.allianceId, construction: null, secondConstruction: null, research: null, mapVisible: false };
  });
  snapshot.garrisons = snapshot.garrisons.filter(g => g.allianceId === p.allianceId); snapshot.sieges = snapshot.sieges.filter(s => { const t = [...w.sites, ...w.flags, ...w.strongholds].find(t => t.id === s.targetId); return t && seen(t); });
  snapshot.events = []; return snapshot;
}
export function validateExploration(p) {
  if (!Array.isArray(p.explored) || p.explored.length > 400 || new Set(p.explored).size !== p.explored.length || p.explored.some(i => !Number.isInteger(i) || i < 0 || i >= 400) || !Array.isArray(p.scoutReports) || p.scoutReports.length > 20 || !Array.isArray(p.scouts) || typeof p.autoExplore !== 'boolean') throw new Error('Invalid saved exploration.');
  const profile = scoutProfile(p.buildings?.scoutcamp ?? 0);
  if (p.scouts.length > Math.max(profile.scouts, 3) || p.scouts.length > 3 || new Set(p.scouts.map(s => s?.id)).size !== p.scouts.length) throw new Error('Invalid saved scout.');
  if (p.buildings && Number.isInteger(p.buildings.scoutcamp) && p.scouts.length > profile.scouts) throw new Error('Invalid saved scout.');
  for (const s of p.scouts) {
    if (!s || !point(s) || !point({ x: s.targetX, z: s.targetZ }) || typeof s.id !== 'string' || s.ownerId !== p.id || !PHASES.includes(s.phase) || !Number.isFinite(s.surveyRemaining) || s.surveyRemaining < 0 || s.surveyRemaining > 30 || typeof s.rewardPending !== 'boolean' || typeof s.reportedThisLeg !== 'boolean' || typeof s.investigationId !== 'string' || !Number.isFinite(s.watchSeconds) || s.watchSeconds < 0 || s.watchSeconds > 30) throw new Error('Invalid saved scout.');
    if (s.recon && (!['city', 'march', 'garrison'].includes(s.recon.kind) || typeof s.recon.targetId !== 'string')) throw new Error('Invalid saved scout.');
    if (s.recon && s.investigationId) throw new Error('Invalid saved scout.');
    if (s.investigationId && !findingById(s.investigationId)) throw new Error('Invalid saved scout.');
  }
  for (const r of p.scoutReports) {
    if (!r || typeof r.id !== 'string' || !point(r) || !Number.isFinite(r.time) || r.time < 0 || !['camps', 'flags', 'armies', 'sites', 'garrisons'].every(k => Array.isArray(r[k]) && r[k].length <= 645)) throw new Error('Invalid saved scout report.');
    if (r.strongholds !== undefined && (!Array.isArray(r.strongholds) || r.strongholds.length > 5 || r.strongholds.some(t => !t || typeof t.id !== 'string' || !point(t) || !Number.isFinite(t.health) || t.health < 0 || !Number.isFinite(t.guardHealth) || t.guardHealth < 0))) throw new Error('Invalid saved stronghold scouting.');
    const count = n => Number.isSafeInteger(n) && n >= 0;
    if ([...r.camps, ...r.flags, ...r.armies, ...r.sites].some(t => !t || typeof t.id !== 'string' || !point(t) || !Number.isFinite(t.health) || t.health < 0) || r.armies.some(a => typeof a.name !== 'string' || typeof a.commanderId !== 'string' || !count(a.troops) || !count(a.mythic)) || r.garrisons.some(g => !g || typeof g.targetId !== 'string' || ![g.marches, g.troops, g.mythic].every(count))) throw new Error('Invalid saved scout intelligence.');
  }
}
