import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { World } from './world.mjs';

export class WorldStore {
  constructor(path, warn = console.warn) { this.path = path; this.warn = warn; }
  read(path) { return World.fromSave(JSON.parse(readFileSync(path, 'utf8'))); }
  archiveLegacy(path) {
    const schema = JSON.parse(readFileSync(path, 'utf8')).schema;
    const archive = this.path + '.schema' + schema + '.bak';
    if ([1, 2, 3, 4, 5, 6, 7, 8].includes(schema) && !existsSync(archive)) copyFileSync(path, archive);
  }
  load() {
    if (!existsSync(this.path) && !existsSync(this.path + '.bak')) return new World();
    try { const world = this.read(this.path); this.archiveLegacy(this.path); return world; }
    catch (error) {
      try {
        const world = this.read(this.path + '.bak'); this.archiveLegacy(this.path + '.bak');
        this.warn('Primary save could not be read; recovered the previous backup.'); return world;
      } catch { throw new Error('The world save and backup could not be loaded. They have been preserved. Restore a valid backup before starting this world.'); }
    }
  }
  save(world) {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = this.path + '.' + process.pid + '.tmp';
    writeFileSync(temporary, JSON.stringify(world.toSave()), { mode: 0o600, flush: true });
    if (existsSync(this.path)) {
      // Preserve a valid backup even when recovering from a damaged primary file.
      let valid = false;
      try { this.read(this.path); valid = true; } catch { /* Keep the previous backup. */ }
      if (valid) copyFileSync(this.path, this.path + '.bak');
    }
    renameSync(temporary, this.path);
  }
}
