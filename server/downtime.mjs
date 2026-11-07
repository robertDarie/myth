import { activityClock, ensureActivity } from './activity.mjs';

export const OFFLINE_PRODUCTION_CAP = 8 * 60 * 60;
// Maintenance/crash recovery, not combat simulation. Existing deserialization
// interrupts battles and pauses field orders; no offline victories are invented.
export function advanceDowntime(world, savedAt, now) {
  if (![savedAt, now].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Invalid kingdom timestamp.');
  const seconds = Math.max(0, (now - savedAt) / 1000);
  const originalNow = world.now;
  let elapsed = 0;
  try {
    while (elapsed < seconds) {
      let step = seconds - elapsed;
      if (elapsed < OFFLINE_PRODUCTION_CAP) step = Math.min(step, 5, OFFLINE_PRODUCTION_CAP - elapsed);
      for (const p of world.players.values()) {
        for (const job of [p.construction, p.secondConstruction, p.research, p.crafting, p.healing, p.trainingQueue[0]])
          if (job) step = Math.min(step, Math.max(.00001, job.remaining));
      }
      // Attribute completed jobs to their completion day, rather than login day.
      elapsed += step; world.now = () => Math.floor(savedAt + elapsed * 1000); activityClock(world);
      for (const p of world.players.values()) world.cityTick(p, step, { production: elapsed <= OFFLINE_PRODUCTION_CAP });
    }
    world.now = () => Math.max(now, savedAt); activityClock(world);
    for (const p of world.players.values()) ensureActivity(world, p);
    world.time += seconds;
    world.markers = world.markers.filter(m => m.expires > world.time);
    // Timers may finish, but a server outage cannot count as a defended hold.
    if (seconds > 0 && world.kingdom.holdAllianceId) world.kingdom.holdSinceMs = world.activityClockMs;
    for (const a of world.armies()) {
      const recovery = a.recovery; a.recovery = Math.max(0, recovery - seconds);
      if (world.atHome(a)) { const stats = world.stats(a); a.health = Math.min(stats.maxHealth, a.health + stats.heal * Math.max(0, seconds - recovery)); }
    }
  } finally { world.now = originalNow; }
  return { elapsedSeconds: seconds, productionSeconds: Math.min(seconds, OFFLINE_PRODUCTION_CAP), migrated: false };
}
