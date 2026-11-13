import { activityClock } from './activity.mjs';
import { grantReward, rewardSnapshot } from './inventory.mjs';

const DAY = 86400000;
const iso = day => new Date(day * DAY).toISOString().slice(0, 10);
const weekday = day => ((day % 7) + 7) % 7;

export const EVENTS = [
  {
    id: 'oath-of-the-builders', name: 'Oath of the Builders',
    description: 'From Monday 00:00 UTC until Thursday 00:00 UTC, finish two building upgrades or research projects.',
    objectives: [{ id: 'development', label: 'Complete building upgrades or research projects.', goal: 2 }],
    reward: { wood: 200, stone: 150, gold: 100 }
  },
  {
    id: 'frontier-vigil', name: 'Frontier Vigil',
    description: 'From Thursday 00:00 UTC until Monday 00:00 UTC, finish two scouting surveys and win one Forsaken camp battle.',
    objectives: [
      { id: 'scouts', label: 'Complete scouting surveys.', goal: 2 },
      { id: 'camps', label: 'Win a Forsaken camp battle.', goal: 1 }
    ],
    reward: { food: 200, gold: 150, mana: 10 }
  }
];

export function eventWindow(id, day) {
  const mark = weekday(day);
  if (id === 'oath-of-the-builders') {
    const active = mark >= 4 && mark <= 6;
    const period = active ? day - (mark - 4) : day + ((4 - mark + 7) % 7);
    return { active, period, end: period + 3 };
  }
  if (id === 'frontier-vigil') {
    const active = mark <= 3;
    const period = active ? day - mark : day + (7 - mark);
    return { active, period, end: period + 4 };
  }
  throw new Error('Unknown event.');
}

const emptyProgress = event => Object.fromEntries(event.objectives.map(objective => [objective.id, 0]));

export function ensureEvents(w, p) {
  const { day } = activityClock(w);
  p.events ??= {};
  for (const event of EVENTS) {
    const window = eventWindow(event.id, day);
    const row = p.events[event.id];
    if (!row || row.period !== window.period) p.events[event.id] = { period: window.period, progress: emptyProgress(event), claimed: false, credited: [] };
  }
}

export function recordEvent(w, p, key, amount = 1, token = '') {
  if (!Number.isFinite(amount) || amount <= 0) return;
  ensureEvents(w, p);
  const { day } = activityClock(w);
  for (const event of EVENTS) {
    const objective = event.objectives.find(item => item.id === key);
    if (!objective || !eventWindow(event.id, day).active) continue;
    const row = p.events[event.id];
    if (token) {
      if (row.credited.includes(token)) continue;
      row.credited.push(token);
      if (row.credited.length > 8) row.credited.shift();
    }
    row.progress[key] = Math.min(objective.goal, (row.progress[key] ?? 0) + amount);
  }
}

export function eventSnapshot(w, p) {
  ensureEvents(w, p);
  const { day, now } = activityClock(w);
  return EVENTS.map(event => {
    const window = eventWindow(event.id, day);
    const row = p.events[event.id];
    const ready = event.objectives.every(objective => row.progress[objective.id] >= objective.goal);
    const canClaim = window.active && ready && !row.claimed;
    const lockedReason = !window.active ? 'This event is closed until ' + iso(window.period) + ' 00:00 UTC.'
      : row.claimed ? 'Already claimed for this period.'
      : ready ? '' : 'Finish this event\'s objectives first.';
    return {
      id: event.id, name: event.name, description: event.description, status: window.active ? 'active' : 'upcoming',
      period: iso(window.period), startsUtc: new Date(window.period * DAY).toISOString(), endsUtc: new Date(window.end * DAY).toISOString(),
      remainingSeconds: Math.max(0, Math.ceil(((window.active ? window.end : window.period) * DAY - now) / 1000)),
      objectives: event.objectives.map(objective => ({ id: objective.id, label: objective.label, goal: objective.goal, progress: row.progress[objective.id] })),
      reward: rewardSnapshot(event.reward), canClaim, claimed: row.claimed, lockedReason
    };
  });
}

export function eventCommand(w, p, c, fail) {
  if (c.type !== 'event-claim') return false;
  ensureEvents(w, p);
  const event = EVENTS.find(item => item.id === c.targetId);
  if (!event) fail('Unknown event.');
  const { day } = activityClock(w);
  const window = eventWindow(event.id, day);
  if (!window.active) fail('This event is not open.');
  if (c.period !== iso(window.period)) fail('This event request has expired. Refresh the event hub.');
  const row = p.events[event.id];
  if (row.claimed) fail('This event reward was already claimed.');
  if (event.objectives.some(objective => row.progress[objective.id] < objective.goal)) fail('Finish this event\'s objectives first.');
  grantReward(p, event.reward);
  row.claimed = true;
  return true;
}

export function validateEvents(w, clock = w.activityClockMs) {
  const day = Math.floor(clock / DAY);
  for (const p of w.players.values()) {
    if (!p.events || typeof p.events !== 'object' || Array.isArray(p.events)) throw new Error('Invalid saved event progress.');
    for (const event of EVENTS) {
      const row = p.events[event.id];
      const window = eventWindow(event.id, day);
      const progress = row?.progress;
      if (!row || !Number.isSafeInteger(row.period) || row.period < 0 || row.period > window.period || typeof row.claimed !== 'boolean' || !progress || !Array.isArray(row.credited) || row.credited.length > 8 || new Set(row.credited).size !== row.credited.length || row.credited.some(token => typeof token !== 'string' || token.length > 80)) throw new Error('Invalid saved event progress.');
      for (const objective of event.objectives) {
        const value = progress[objective.id];
        if (!Number.isInteger(value) || value < 0 || value > objective.goal) throw new Error('Invalid saved event progress.');
      }
      if (row.claimed && event.objectives.some(objective => progress[objective.id] < objective.goal)) throw new Error('Invalid saved event progress.');
    }
  }
}
