import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Close idle sockets first, then the server on a later turn. Calling
// closeAllConnections while close() has already started aborts libuv on Windows.
export function closeHttpServer(server) {
  return new Promise(resolve => {
    if (!server?.listening) { resolve(); return; }
    server.closeIdleConnections();
    setImmediate(() => {
      if (!server.listening) resolve();
      else server.close(() => resolve());
    });
  });
}

export async function removeDirectory(dir) {
  let last;
  for (let attempt = 0; attempt < 20; attempt++) {
    try { rmSync(dir, { recursive: true, force: true }); return; }
    catch (error) {
      last = error;
      if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) throw error;
      await delay(50);
    }
  }
  throw last;
}

// One after-hook closes every registered handle before deleting the directory.
// Separate hooks ran the delete first on this Node version and left SQLite locked.
export function tempDirectory(t, prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const closers = [];
  t.after(async () => {
    for (const close of closers) await close();
    await removeDirectory(dir);
  });
  return {
    dir,
    path: (...parts) => join(dir, ...parts),
    close(fn) { closers.push(fn); },
    server(server) { closers.push(() => closeHttpServer(server)); }
  };
}
