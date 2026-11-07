#!/bin/sh
# Run from any directory. Destination backups contain account session secrets.
set -eu
umask 077
cd "$(dirname "$0")"
backup_name="kingdom-$(date -u +%Y%m%dT%H%M%SZ)-$$.sqlite"
mkdir -p backups
# SQLite's online backup API includes committed WAL pages; never copy a live DB.
docker compose exec -T kingdom node backup.mjs /data/kingdom.sqlite "/data/backups/$backup_name"
docker compose cp "kingdom:/data/backups/$backup_name" "backups/$backup_name"
chmod 600 "backups/$backup_name"
# The host copy is now complete; remove only this temporary container copy.
docker compose exec -T kingdom node --input-type=module -e 'import {unlinkSync} from "node:fs"; unlinkSync(process.argv[1]);' "/data/backups/$backup_name"
printf 'Backup ready: %s/backups/%s\n' "$(pwd)" "$backup_name"
