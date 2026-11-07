import { existsSync } from 'node:fs';
import { KingdomDatabase } from './database.mjs';
const [source, destination] = process.argv.slice(2);
if (!source || !destination || existsSync(destination) || !existsSync(source)) { console.error('Usage: node migrate.mjs EXISTING-world.json NEW-world.sqlite (stop the old server first)'); process.exitCode = 1; }
else {
  let store;
  try { store = new KingdomDatabase(destination, { legacyPath: source }); store.load(); console.log('Kingdom migrated. Original JSON preserved; no downtime rewards inferred.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { store?.close(); }
}
