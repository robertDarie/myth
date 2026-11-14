import { serialize, deserialize } from 'node:v8';

// Ephemeral rollback image, never a disk save format. Encoding detaches all live
// state (including Maps and shared references); decode only on the failure path.
// Keep injected clocks/random functions on the World instance as before.
export const checkpoint = world => serialize(Object.fromEntries(
  Object.entries(world).filter(([, value]) => typeof value !== 'function')
));
export function restoreCheckpoint(world, image) {
  const before = deserialize(image);
  // A failed action can initialize a top-level subsystem (for example season).
  // Object.assign alone would leave that new state behind after rollback.
  for (const [key, value] of Object.entries(world)) {
    if (typeof value !== 'function' && !Object.hasOwn(before, key)) delete world[key];
  }
  return Object.assign(world, before);
}
