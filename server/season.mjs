const DAY = 86400000;
const LENGTH = 28;
const TITLE = 'Season of the First Throne';
const MAX_RAW = 1000000;
const TOKEN_LIMIT = 256;

export const SEASON_CATEGORIES = {
  gather: { per: 100, points: 1, cap: 40, label: 'Cargo delivered home' },
  trained: { per: 5, points: 1, cap: 30, label: 'Troops trained' },
  development: { per: 1, points: 8, cap: 40, label: 'Buildings and research finished' },
  scouts: { per: 1, points: 6, cap: 30, label: 'Surveys completed' },
  camps: { per: 1, points: 10, cap: 40, label: 'Forsaken camp victories' },
  helps: { per: 1, points: 4, cap: 20, label: 'Alliance assistance' },
  territory: { per: 1, points: 12, cap: 36, label: 'Beacons finished or sacred sites taken' },
  strongholds: { per: 1, points: 15, cap: 45, label: 'Stronghold victories' },
  works: { per: 1, points: 8, cap: 8, label: 'City work during Banners of War' }
};

export const SEASON_PHASES = [
  { id: 'foundations', name: 'Foundations', start: 0, keys: ['gather', 'trained', 'development'], objective: 'Earn 20 points from gathering, training, or city works.', goal: 20 },
  { id: 'frontier', name: 'The Frontier Awakens', start: 7, keys: ['scouts', 'camps'], objective: 'Earn 16 points from surveys or Forsaken camp victories.', goal: 16 },
  { id: 'banners', name: 'Banners of War', start: 14, keys: ['works', 'helps', 'territory', 'strongholds'], objective: 'Earn 8 points from one finished city project, alliance assistance, territory, or a stronghold.', goal: 8 },
  { id: 'throne', name: 'The First Throne', start: 21, keys: ['gather', 'trained', 'development', 'scouts', 'camps', 'helps', 'territory', 'strongholds'], objective: 'Earn 25 points from any season action during this phase.', goal: 25 }
];

const emptyRaw = () => Object.fromEntries(Object.keys(SEASON_CATEGORIES).map(key => [key, 0]));
const emptyPhases = () => Object.fromEntries(SEASON_PHASES.map(phase => [phase.id, 0]));
const pointsOf = raw => Object.entries(SEASON_CATEGORIES).reduce((sum, [key, rule]) => sum + Math.min(rule.cap, Math.floor((raw[key] || 0) / rule.per) * rule.points), 0);

function blankSeason(index, startDay) {
  return { id: 'season-' + index, index, title: TITLE, startDay, players: {}, alliances: {}, credited: [] };
}

export function ensureSeason(w) {
  const day = Math.floor((w.activityClockMs || 0) / DAY);
  if (!w.season) w.season = { originDay: day, current: blankSeason(1, day) };
  return w.season.current;
}

export function seasonView(season, day) {
  const offset = Math.max(0, Math.min(LENGTH, day - season.startDay));
  const phase = SEASON_PHASES[Math.min(SEASON_PHASES.length - 1, Math.floor(Math.max(0, day - season.startDay) / 7))] || SEASON_PHASES[3];
  const closed = day >= season.startDay + LENGTH;
  return { offset, dayNumber: Math.min(LENGTH, Math.max(1, day - season.startDay + 1)), phase: closed ? SEASON_PHASES[3] : phase, closed };
}

function categoryFor(phase, key) {
  if (phase.id === 'banners' && key === 'development') return phase.keys.includes('works') ? 'works' : '';
  return phase.keys.includes(key) ? key : '';
}

function touchAlliance(w, season, allianceId, delta, playerId, now) {
  if (!allianceId || delta <= 0 || !w.alliances.has(allianceId)) return;
  const row = season.alliances[allianceId] ??= { name: w.alliances.get(allianceId).name, points: 0, reachedAt: now, contributors: [] };
  row.name = w.alliances.get(allianceId).name;
  row.points += delta;
  row.reachedAt = now;
  if (!row.contributors.includes(playerId)) row.contributors.push(playerId);
}

export function recordSeason(w, p, key, amount, token = '') {
  if (!p || !SEASON_CATEGORIES[key] || !Number.isSafeInteger(amount) || amount <= 0) return;
  ensureSeason(w);
  const now = w.activityClockMs || 0;
  const day = Math.floor(now / DAY);
  const season = w.season.current;
  const view = seasonView(season, day);
  if (view.closed) return;
  const category = categoryFor(view.phase, key);
  if (!category) return;
  if (token) {
    if (season.credited.includes(token)) return;
    season.credited.push(token);
    if (season.credited.length > TOKEN_LIMIT) season.credited.shift();
  }
  const row = season.players[p.id] ??= { name: p.name, points: 0, reachedAt: now, raw: emptyRaw(), phases: emptyPhases() };
  row.name = p.name;
  const before = pointsOf(row.raw);
  row.raw[category] = Math.min(MAX_RAW, row.raw[category] + amount);
  const after = pointsOf(row.raw);
  const delta = after - before;
  if (delta <= 0) return;
  row.points = after;
  row.reachedAt = now;
  row.phases[view.phase.id] += delta;
  touchAlliance(w, season, p.allianceId, delta, p.id, now);
}

const byRank = (leftId, left, rightId, right) => right.points - left.points || left.reachedAt - right.reachedAt || (leftId < rightId ? -1 : leftId > rightId ? 1 : 0);

function ranked(entries) {
  return Object.entries(entries).filter(([, row]) => row.points > 0).sort(([a, left], [b, right]) => byRank(a, left, b, right));
}

export function seasonSnapshot(w, p) {
  if (!p) return null;
  ensureSeason(w);
  const now = w.activityClockMs || 0;
  const day = Math.floor(now / DAY);
  const season = w.season.current;
  const view = seasonView(season, day);
  const row = season.players[p.id] || { name: p.name, points: 0, reachedAt: now, raw: emptyRaw(), phases: emptyPhases() };
  const personal = ranked(season.players);
  const alliances = ranked(season.alliances);
  const personalRank = personal.findIndex(([id]) => id === p.id) + 1;
  const allianceRank = p.allianceId ? alliances.findIndex(([id]) => id === p.allianceId) + 1 : 0;
  const phaseEnd = season.startDay + view.phase.start + 7;
  return {
    id: season.id, index: season.index, title: season.title, settled: view.closed,
    phaseId: view.phase.id, phaseName: view.phase.name, phaseIndex: SEASON_PHASES.findIndex(phase => phase.id === view.phase.id) + 1,
    dayNumber: view.dayNumber, length: LENGTH,
    startsUtc: new Date(season.startDay * DAY).toISOString(),
    endsUtc: new Date((season.startDay + LENGTH) * DAY).toISOString(),
    phaseEndsUtc: new Date(Math.min(season.startDay + LENGTH, phaseEnd) * DAY).toISOString(),
    remainingSeconds: Math.max(0, Math.ceil(((season.startDay + LENGTH) * DAY - now) / 1000)),
    phaseRemainingSeconds: Math.max(0, Math.ceil((Math.min(season.startDay + LENGTH, phaseEnd) * DAY - now) / 1000)),
    score: row.points, rank: personalRank,
    allianceId: p.allianceId || '', allianceName: w.alliances.get(p.allianceId)?.name || '',
    allianceScore: p.allianceId ? (season.alliances[p.allianceId]?.points || 0) : 0, allianceRank,
    contributions: Object.entries(SEASON_CATEGORIES).map(([id, rule]) => ({ id, label: rule.label, raw: row.raw[id] || 0, points: Math.min(rule.cap, Math.floor((row.raw[id] || 0) / rule.per) * rule.points), cap: rule.cap })),
    objectives: SEASON_PHASES.map(phase => {
      const progress = Math.min(phase.goal, row.phases[phase.id] || 0);
      const open = phase.id === view.phase.id && !view.closed;
      const lockedReason = progress >= phase.goal ? 'Completed during ' + phase.name + '.' : open ? '' : view.phase.start > phase.start || view.closed ? 'This phase has ended. Later actions do not complete it.' : 'This phase has not opened.';
      return { id: phase.id, phaseName: phase.name, label: phase.objective, progress, goal: phase.goal, complete: progress >= phase.goal, lockedReason };
    }),
    personal: personal.slice(0, 20).map(([id, entry], index) => ({ rank: index + 1, playerId: id, name: entry.name, points: entry.points, self: id === p.id })),
    allianceBoard: alliances.slice(0, 20).map(([id, entry], index) => ({ rank: index + 1, allianceId: id, name: entry.name, points: entry.points, contributors: entry.contributors.length, self: id === p.allianceId }))
  };
}

export function validateSeason(w) {
  const book = w.season;
  const day = Math.floor((w.activityClockMs || 0) / DAY);
  if (!book || !book.current || !Number.isSafeInteger(book.originDay) || book.originDay < 0 || book.originDay > day) throw new Error('Invalid saved season.');
  const season = book.current;
  if (season.id !== 'season-' + season.index || !Number.isSafeInteger(season.index) || season.index < 1 || season.title !== TITLE || !Number.isSafeInteger(season.startDay) || season.startDay < book.originDay || season.startDay > day || !season.players || !season.alliances || !Array.isArray(season.credited) || season.credited.length > TOKEN_LIMIT || new Set(season.credited).size !== season.credited.length) throw new Error('Invalid saved season.');
  const keys = Object.keys(SEASON_CATEGORIES);
  for (const [id, row] of Object.entries(season.players)) {
    if (!w.players.has(id) || !row || typeof row.name !== 'string' || row.points !== pointsOf(row.raw) || row.points < 0 || row.points > 400 || !Number.isSafeInteger(row.reachedAt) || row.reachedAt < 0) throw new Error('Invalid saved season.');
    if (!row.raw || keys.some(key => !Number.isSafeInteger(row.raw[key]) || row.raw[key] < 0 || row.raw[key] > MAX_RAW)) throw new Error('Invalid saved season.');
    if (!row.phases || SEASON_PHASES.some(phase => !Number.isSafeInteger(row.phases[phase.id]) || row.phases[phase.id] < 0) || SEASON_PHASES.reduce((sum, phase) => sum + row.phases[phase.id], 0) !== row.points) throw new Error('Invalid saved season.');
  }
  for (const [id, row] of Object.entries(season.alliances)) {
    if (!row || typeof row.name !== 'string' || !Number.isSafeInteger(row.points) || row.points < 0 || !Number.isSafeInteger(row.reachedAt) || !Array.isArray(row.contributors) || new Set(row.contributors).size !== row.contributors.length || row.contributors.some(playerId => !season.players[playerId])) throw new Error('Invalid saved season.');
    if (w.alliances.has(id) && row.points <= 0) throw new Error('Invalid saved season.');
  }
}
