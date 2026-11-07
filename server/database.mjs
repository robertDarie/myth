import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { World } from './world.mjs';
import { WorldStore } from './storage.mjs';
import { advanceDowntime } from './downtime.mjs';

// One authoritative simulation per database. A renewable, fenced lease prevents
// two processes (including an expired former owner) writing competing kingdoms.
export class KingdomDatabase {
  constructor(path, { now = () => Date.now(), legacyPath = null } = {}) {
    this.path = resolve(path); this.now = now; this.owner = randomUUID(); this.closed = false;
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(this.path);
    try {
      chmodSync(this.path, 0o600);
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (version > 1) throw new Error('Unsupported kingdom database version. Upgrade the server before opening it.');
      if (this.db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Kingdom database integrity check failed. Restore a verified backup.');
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS kingdom (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, saved_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS writer (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, digest TEXT NOT NULL, response TEXT NOT NULL);
        PRAGMA user_version=1;`);
      this.transaction(() => {
        const lease = this.db.prepare('SELECT * FROM writer WHERE id=1').get();
        if (lease && lease.expires_at > this.now()) throw new Error('This kingdom already has an active writer. Stop it before starting another.');
        this.db.prepare('INSERT OR REPLACE INTO writer VALUES (1,?,?)').run(this.owner, this.now() + 30000);
      });
      this.legacyPath = legacyPath;
    } catch (error) { this.db.close(); throw error; }
  }
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = action(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  load() {
    const row = this.db.prepare('SELECT payload,saved_at FROM kingdom WHERE id=1').get();
    if (!row) {
      // An explicit first-run migration preserves the source JSON and backup.
      const migrated = !!this.legacyPath && (existsSync(this.legacyPath) || existsSync(this.legacyPath + '.bak'));
      const world = migrated ? new WorldStore(this.legacyPath).load() : new World({ now: this.now });
      this.recovery = { elapsedSeconds: 0, productionSeconds: 0, migrated };
      this.save(world); return world;
    }
    const data = JSON.parse(row.payload);
    const world = World.fromSave(data, { now: () => row.saved_at });
    this.recovery = advanceDowntime(world, row.saved_at, this.now());
    world.now = this.now;
    // Catch-up and its timestamp commit together, so another restart cannot pay twice.
    this.save(world); return world;
  }
  receipt(id) { return this.db.prepare('SELECT digest,response FROM receipts WHERE id=?').get(id); }
  save(world, { receipt = null } = {}) {
    const payload = JSON.stringify(world.toSave()), now = this.now();
    this.transaction(() => {
      const lease = this.db.prepare('SELECT * FROM writer WHERE id=1').get();
      if (!lease || lease.owner !== this.owner || lease.expires_at <= now) throw new Error('Kingdom writer lease lost; progress is paused.');
      const prior = this.db.prepare('SELECT saved_at FROM kingdom WHERE id=1').get();
      const savedAt = Math.max(now, prior?.saved_at ?? now);
      this.db.prepare('INSERT OR REPLACE INTO kingdom VALUES (1,?,?)').run(payload, savedAt);
      if (receipt) this.db.prepare('INSERT INTO receipts VALUES (?,?,?)').run(receipt.id, receipt.digest, JSON.stringify(receipt.response));
      this.db.prepare('UPDATE writer SET expires_at=? WHERE id=1 AND owner=?').run(now + 30000, this.owner);
    });
  }
  close() {
    if (this.closed) return;
    this.db.prepare('DELETE FROM writer WHERE id=1 AND owner=?').run(this.owner);
    this.db.close(); this.closed = true;
  }
}

export async function backupKingdom(source, destination) {
  if (resolve(source) === resolve(destination) || existsSync(destination)) throw new Error('Choose a new backup file, separate from the active database.');
  const db = new DatabaseSync(source, { readOnly: true });
  try {
    if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Database integrity check failed.');
    const row = db.prepare('SELECT payload FROM kingdom WHERE id=1').get();
    if (!row) throw new Error('No saved kingdom exists.');
    World.fromSave(JSON.parse(row.payload));
    mkdirSync(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
    await backup(db, destination);
  } finally { db.close(); }
}
