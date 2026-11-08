import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, existsSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
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
      if (version > 2) throw new Error('Unsupported kingdom database version. Upgrade the server before opening it.');
      if (this.db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Kingdom database integrity check failed. Restore a verified backup.');
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS kingdom (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, saved_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS writer (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, digest TEXT NOT NULL, response TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS accounts (
          username TEXT PRIMARY KEY, player_id TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL,
          anchor TEXT NOT NULL, created_at INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS account_sessions (
          token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES accounts(username),
          expires_at INTEGER NOT NULL);
        PRAGMA user_version=2;`);
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
    validateAccounts(this.db, world);
    this.recovery = advanceDowntime(world, row.saved_at, this.now());
    world.now = this.now;
    // Catch-up and its timestamp commit together, so another restart cannot pay twice.
    this.save(world); return world;
  }
  receipt(id) { return this.db.prepare('SELECT digest,response FROM receipts WHERE id=?').get(id); }
  account(username) { return this.db.prepare('SELECT * FROM accounts WHERE username=?').get(username); }
  accountForPlayer(id) { return this.db.prepare('SELECT * FROM accounts WHERE player_id=?').get(id); }
  accountSession(hash) { return this.db.prepare('SELECT * FROM account_sessions WHERE token_hash=?').get(hash); }
  accountSessions(username) { return this.db.prepare('SELECT * FROM account_sessions WHERE username=?').all(username); }
  save(world, { receipt = null, identity = null } = {}) {
    const payload = JSON.stringify(world.toSave()), now = this.now();
    this.transaction(() => {
      const lease = this.db.prepare('SELECT * FROM writer WHERE id=1').get();
      if (!lease || lease.owner !== this.owner || lease.expires_at <= now) throw new Error('Kingdom writer lease lost; progress is paused.');
      const prior = this.db.prepare('SELECT saved_at FROM kingdom WHERE id=1').get();
      const savedAt = Math.max(now, prior?.saved_at ?? now);
      this.db.prepare('INSERT OR REPLACE INTO kingdom VALUES (1,?,?)').run(payload, savedAt);
      if (receipt) this.db.prepare('INSERT INTO receipts VALUES (?,?,?)').run(receipt.id, receipt.digest, JSON.stringify(receipt.response));
      if (identity) {
        if (identity.create) {
          const a = identity.create;
          this.db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?,?,1)').run(a.username, a.playerId, a.passwordHash, a.recoveryHash, a.anchor, now);
        }
        if (identity.update) {
          const a = identity.update;
          const result = this.db.prepare('UPDATE accounts SET password_hash=?,recovery_hash=?,revision=revision+1 WHERE username=? AND revision=?').run(a.passwordHash,a.recoveryHash,a.username,a.revision);
          if (result.changes !== 1) throw new Error('Account changed during update.');
        }
        if (identity.revokeAll) this.db.prepare('DELETE FROM account_sessions WHERE username=?').run(identity.revokeAll);
        for (const hash of identity.revoke ?? []) this.db.prepare('DELETE FROM account_sessions WHERE token_hash=?').run(hash);
        if (identity.session) {
          const s = identity.session;
          this.db.prepare('INSERT INTO account_sessions VALUES (?,?,?)').run(s.hash,s.username,s.expiresAt);
        }
      }
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
    const world = World.fromSave(JSON.parse(row.payload));
    if (db.prepare('PRAGMA user_version').get().user_version >= 2) validateAccounts(db, world);
    mkdirSync(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
    await backup(db, destination);
  } finally { db.close(); }
}

function validateAccounts(db, world) {
  const accounts=db.prepare('SELECT * FROM accounts').all();
  const tokenOwners=new Map([...world.sessions].map(([token,id])=>[createHash('sha256').update(token).digest('hex'),id]));
  for(const a of accounts) {
    if(!/^[a-z0-9_]{3,24}$/.test(a.username)||!/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{64}$/.test(a.password_hash)||! /^(?:[a-f0-9]{64})$/.test(a.recovery_hash)||!Number.isSafeInteger(a.revision)||a.revision<1||!Number.isSafeInteger(a.created_at)||a.created_at<0||!world.players.has(a.player_id)||world.sessions.get(a.anchor)!==a.player_id)
      throw new Error('Account ownership or credentials do not match a valid saved kingdom. Restore a complete database backup.');
  }
  for(const s of db.prepare('SELECT * FROM account_sessions').all()) {
    const a=accounts.find(a=>a.username===s.username);
    if(!a||! /^[a-f0-9]{64}$/.test(s.token_hash)||!Number.isSafeInteger(s.expires_at)||s.expires_at<0||tokenOwners.get(s.token_hash)!==a.player_id)
      throw new Error('Saved account session does not match the kingdom. Restore a complete database backup.');
  }
}
