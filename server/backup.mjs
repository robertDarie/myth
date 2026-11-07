import { backupKingdom } from './database.mjs';
const [source, destination] = process.argv.slice(2);
if (!source || !destination) { console.error('Usage: node backup.mjs ACTIVE.sqlite NEW-BACKUP.sqlite'); process.exitCode = 1; }
else { try { await backupKingdom(source, destination); console.log('Verified kingdom backup created.'); } catch (error) { console.error(error.message); process.exitCode = 1; } }
