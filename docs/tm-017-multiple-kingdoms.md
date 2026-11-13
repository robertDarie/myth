# TM-017 Multiple kingdoms

One server process hosts one to four kingdoms. Each kingdom has its own world, tick, storage, sessions, alliances, diplomacy, combat, chat, fog, rankings, events, and season. Gameplay code is still the existing world engine. The host only chooses which world receives a request. Schema stays 25. Protocol stays 16.

There is no cross-kingdom migration, shared account, global alliance, or war between kingdoms.

## Configuration

Set `THRONES_REALMS` to a JSON file. The isolated playtest ignores that variable and keeps the default local kingdom. An example is `server/realms.example.json`.

```json
{
  "defaultId": "local",
  "kingdoms": [
    { "id": "local", "name": "Local Kingdom", "description": "The existing kingdom.", "savePath": "data/kingdoms/local/world.json" },
    { "id": "ash-coast", "name": "Ash Coast", "description": "A separate kingdom.", "databasePath": "data/kingdoms/ash-coast/kingdom.sqlite" }
  ]
}
```

Ids are 1–24 lowercase letters, numbers, or hyphens. Names are 1–32 characters. A description is optional and at most 160 characters. Each kingdom chooses either `savePath` or `databasePath`. Paths are resolved by the server. A client cannot send a path or create a kingdom.

When `THRONES_REALMS` is unset, the process is the previous single kingdom. Its id is `THRONES_KINGDOM_ID`, or `local`. Its save is `THRONES_SAVE_PATH`, or the existing local JSON save. `THRONES_DB_PATH` still selects the single hosted database. That path is not copied or moved.

## Routing

`GET /kingdoms` needs no session. It returns id, name, description, player count, capacity 32, `join` of `open` or `closed`, and `status` of `ok` or `degraded`. It does not return tokens, accounts, map objects, reports, or chat.

These routes select one kingdom: `/k/{id}/join`, `/world`, `/command`, `/commander-comparison`, and `/auth/register`, `/login`, `/recover`, `/rotate-recovery`, `/logout`, and `/me`. The same paths without `/k/{id}` use `defaultId`. An unknown id returns 404. A body or comparison query that names a different kingdom returns 409.

A resume token reconnects only in the kingdom that issued it. The same city name may exist in two kingdoms and those cities are different.

## Sessions and accounts

Authentication uses the selected kingdom's session map. A token from another kingdom is a 401. Hosted usernames, passwords, recovery codes, and account sessions live in that kingdom's SQLite file. The same username may be registered separately in another kingdom. Idempotency receipts include the kingdom id and stay in that database.

## Storage and recovery

Two kingdoms cannot use the same resolved save or database path. Opening a JSON or SQLite kingdom takes a lock file beside that path. A live process that already holds it is refused. SQLite also keeps its writer lease. A kingdom whose save and backup cannot be read does not start as an empty world; the files stay in place.

A failed save pauses that kingdom and rolls the command back. The other kingdoms keep their timers and accept commands. A simulation exception restores that kingdom's checkpoint, marks it degraded, and leaves the others running. Shutdown with the launcher token saves every configured kingdom and then closes the process. Backups and WAL behavior are the existing JSON and SQLite stores.

Schema 25 loads as saved. Schemas 1 through 24 still migrate through the existing loader. A schema 24 world starts its season ledger when the season system next runs.

## Diagnostics

`GET /health` reports protocol 16, the default kingdom id, and one row per kingdom: id, name, players, capacity, join, status, active marches, last tick milliseconds, last snapshot milliseconds, storage backend, and whether the save is healthy. It does not include file paths, tokens, or account secrets. `GET /k/{id}/readyz` reports that kingdom.

## Limits

The client kingdom list and per-kingdom session key are the next player-flow checkpoint. Until then, the current game client uses the unprefixed routes and the default kingdom. Kingdom age, migration, global auctions, and inter-realm war are not part of this host.
