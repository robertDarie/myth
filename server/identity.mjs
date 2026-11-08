import { scrypt, randomBytes, createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { GameError } from './world.mjs';
const derive = promisify(scrypt);
export const tokenHash = value => createHash('sha256').update(String(value)).digest('hex');
export const SESSION_MS = 7 * 86400000;
const fail = (message, status = 400) => { throw new GameError(message, status); };
function usernameOf(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{3,24}$/.test(value)) fail('Account name must be 3–24 letters, numbers or underscores.');
  return value.toLowerCase();
}
function passwordOf(value) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value) > 128) fail('Use a password of at least 12 characters and at most 128 UTF-8 bytes.');
  return value;
}
async function passwordHash(password, encoded = null) {
  const salt = encoded ? Buffer.from(encoded.split(':')[1], 'hex') : randomBytes(16);
  const key = await derive(password, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return 'scrypt-v1:' + salt.toString('hex') + ':' + key.toString('hex');
}
const secureEqual = (a, b) => timingSafeEqual(Buffer.from(tokenHash(a)), Buffer.from(tokenHash(b)));

export function createIdentity({ store, world, mutate }) {
  const available = !!store?.account;
  let hashing = 0;
  const withHash = async action => {
    if (hashing >= 2) fail('Account service is busy. Retry shortly.', 429);
    hashing++;
    try { return await action(); } finally { hashing--; }
  };
  function authenticate(token) {
    const player = world.authenticate(token);
    if (available) {
      const account = store.accountForPlayer(player.id);
      if (account) {
        const session = store.accountSession(tokenHash(token));
        if (!session || session.username !== account.username || session.expires_at <= Math.max(store.now(), world.activityClockMs)) fail('Account session expired or revoked. Sign in again.', 401);
      }
    }
    return player;
  }
  function clearSessions(account, change, except = null) {
    for (const [token, id] of world.sessions) if (id === account.player_id && token !== account.anchor && token !== except) world.sessions.delete(token);
    change.revokeAll = account.username;
  }
  function issue(account, change) {
    const token = randomUUID(); world.sessions.set(token, account.player_id);
    const now = Math.max(store.now(), world.activityClockMs);
    change.session = { hash: tokenHash(token), username: account.username, expiresAt: now + SESSION_MS };
    const player = world.players.get(account.player_id); player.lastSeen = performance.now(); player.offline = false;
    return { token, playerId: player.id, name: player.name, username: account.username, expiresAt: now + SESSION_MS };
  }
  async function handle(path, body, token) {
    if (!available) fail('Accounts require a hosted SQLite kingdom. Your local profile still works.', 409);
    if (path === '/auth/me') {
      const player = authenticate(token), account = store.accountForPlayer(player.id);
      return { registered: !!account, username: account?.username ?? '', playerId: player.id, activeSessions: account ? store.accountSessions(account.username).filter(s => s.expires_at > store.now()).length : 0 };
    }
    if (path === '/auth/logout') {
      const player = authenticate(token), account = store.accountForPlayer(player.id);
      if (!account) fail('This city still uses a local profile. Protect it with an account first.', 409);
      const change = {};
      return mutate(() => {
        if (body?.allDevices === true) clearSessions(account, change);
        else { world.sessions.delete(token); change.revoke = [tokenHash(token)]; }
        return { signedOut: true };
      }, null, { identity: change });
    }
    if (path === '/auth/rotate-recovery') {
      const player = authenticate(token), account = store.accountForPlayer(player.id);
      if (!account) fail('Protect this city with an account first.', 409);
      const password = passwordOf(body?.password);
      const encoded = await withHash(() => passwordHash(password, account.password_hash));
      if (!secureEqual(encoded,account.password_hash)) fail('Password is incorrect.',401);
      const recoveryCode=randomBytes(24).toString('base64url'),change={};
      return mutate(() => {
        authenticate(token);
        const current=store.account(account.username);
        if(current.revision!==account.revision)fail('Account changed. Retry with the current password.',409);
        change.update={username:account.username,revision:account.revision,passwordHash:account.password_hash,recoveryHash:tokenHash(recoveryCode)};
        return {recoveryCode};
      },null,{identity:change});
    }
    if (!['/auth/register','/auth/login','/auth/recover'].includes(path)) fail('Route not found.', 404);
    const username = usernameOf(body?.username), password = passwordOf(body?.password);
    if (path === '/auth/register') {
      const player = authenticate(token);
      if (store.accountForPlayer(player.id)) fail('This city is already protected by an account.', 409);
      if (store.account(username)) fail('That account name is unavailable.', 409);
      const encoded = await withHash(() => passwordHash(password));
      const recoveryCode = randomBytes(24).toString('base64url'), anchor = randomUUID(), change = {};
      return mutate(() => {
        const current = authenticate(token);
        if (current.id !== player.id || store.accountForPlayer(player.id) || store.account(username)) fail('Account or city changed. Refresh and retry.', 409);
        // Keep one unexposed anchor for legacy save invariants. It is deliberately
        // unusable as an HTTP session because it has no account_sessions record.
        for (const [key,id] of world.sessions) if (id === player.id) world.sessions.delete(key);
        world.sessions.set(anchor, player.id);
        change.create = { username, playerId: player.id, passwordHash: encoded, recoveryHash: tokenHash(recoveryCode), anchor };
        const session = issue({ username, player_id: player.id }, change);
        return { ...session, recoveryCode };
      }, null, { identity: change });
    }
    const account = store.account(username);
    if (path === '/auth/login') {
      // Unknown users still perform the same expensive password derivation.
      const dummy = 'scrypt-v1:00000000000000000000000000000000:' + '0'.repeat(64);
      const encoded = await withHash(() => passwordHash(password, account?.password_hash ?? dummy));
      if (!account || !secureEqual(encoded, account.password_hash)) fail('Account name or password is incorrect.', 401);
      const change = {};
      return mutate(() => {
        const current = store.account(username);
        if (!current || current.revision !== account.revision) fail('Account changed. Sign in again.', 409);
        const now = Math.max(store.now(), world.activityClockMs);
        const expired = store.accountSessions(username).filter(s => s.expires_at <= now);
        change.revoke = expired.map(s => s.token_hash);
        for (const [key,id] of world.sessions) if (id === account.player_id && expired.some(s => s.token_hash === tokenHash(key))) world.sessions.delete(key);
        if (body?.revokeOtherSessions === true) clearSessions(account, change);
        else if (store.accountSessions(username).length - expired.length >= 5) fail('Five devices are signed in. Choose sign out other devices to continue.', 409);
        return issue(account, change);
      }, null, { identity: change });
    }
    if (typeof body?.recoveryCode !== 'string' || body.recoveryCode.length > 128 || !account || !secureEqual(tokenHash(body.recoveryCode), account.recovery_hash)) fail('Account name or recovery code is incorrect.', 401);
    const encoded = await withHash(() => passwordHash(password)), recoveryCode = randomBytes(24).toString('base64url'), change = {};
    return mutate(() => {
      const current = store.account(username);
      if (!current || current.revision !== account.revision || !secureEqual(current.recovery_hash, account.recovery_hash)) fail('Recovery code was already used or the account changed.', 409);
      clearSessions(account, change);
      change.update = { username, revision: account.revision, passwordHash: encoded, recoveryHash: tokenHash(recoveryCode) };
      return { ...issue(account, change), recoveryCode };
    }, null, { identity: change });
  }
  return { available, authenticate, handle };
}
