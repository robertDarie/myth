import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { World } from './world.mjs';
import { advanceDowntime } from './downtime.mjs';

export class WorldStore {
  constructor(path, warn = console.warn) { this.path = path; this.warn = warn; }
  parse(path) { return JSON.parse(readFileSync(path, 'utf8')); }
  read(path) { return World.fromSave(this.parse(path)); }
  // Local JSON previously resumed the saved instant. Hosted SQLite already catches up paid city timers.
  // A missing timestamp is left alone so an older save is not paid for the whole time it sat on disk.
  catchUp(world, savedAt) {
    const now = Date.now();
    if (!Number.isSafeInteger(savedAt) || savedAt < 0 || now - savedAt < 1000) return { elapsedSeconds: 0, productionSeconds: 0 };
    const recovery = advanceDowntime(world, savedAt, now);
    if (recovery.elapsedSeconds > 0) this.save(world);
    return recovery;
  }
  archiveLegacy(path) {
    const schema = JSON.parse(readFileSync(path, 'utf8')).schema;
    const archive = this.path + '.schema' + schema + '.bak';
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].includes(schema) && !existsSync(archive)) copyFileSync(path, archive);
  }
  load() {
    if (!existsSync(this.path) && !existsSync(this.path + '.bak')) return new World();
    try { const data = this.parse(this.path); const world = World.fromSave(data); this.archiveLegacy(this.path); this.catchUp(world, data.savedAt); return world; }
    catch (error) {
      try {
        const data = this.parse(this.path + '.bak'); const world = World.fromSave(data); this.archiveLegacy(this.path + '.bak');
        this.warn('Primary save could not be read; recovered the previous backup.'); this.catchUp(world, data.savedAt); return world;
      } catch { throw new Error('The world save and backup could not be loaded. They have been preserved. Restore a valid backup before starting this world.'); }
    }
  }
  save(world) {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = this.path + '.' + process.pid + '.tmp';
    const data = world.toSave();
    let prior = 0;
    if (existsSync(this.path)) { try { prior = this.parse(this.path).savedAt || 0; } catch { prior = 0; } }
    const now = Date.now();
    data.savedAt = Math.max(now, Number.isSafeInteger(prior) ? prior : 0);
    writeFileSync(temporary, JSON.stringify(data), { mode: 0o600, flush: true });
    if (existsSync(this.path)) {
      // Preserve a valid backup even when recovering from a damaged primary file.
      let valid = false;
      try { this.read(this.path); valid = true; } catch { /* Keep the previous backup. */ }
      if (valid) copyFileSync(this.path, this.path + '.bak');
    }
    renameSync(temporary, this.path);
  }
}
