# Prototype architecture

## Authority

The Node.js 24 server owns movement, health, battle cadence, gathering stock,
resources, troop capacity, commander unlocks, alliance membership, territorial
connections, capture progress and gate access. Clients submit intent over HTTP
and render snapshots at 5 Hz; the server simulates at 10 Hz. Unity smooths army
positions locally and never chooses damage or rewards.

`content.mjs` defines five civilizations, eleven commanders, seven camps, and five
strategic sites. `world.mjs` implements game rules independently of transport; `city-content.mjs`
and `city.mjs` define institutions, resource sinks, research, summons and relics;
`http.mjs` provides a small versioned development protocol. Snapshot version 6
prevents the new client silently connecting to the earlier server.

## HTTP

- `GET /health`: readiness.
- `POST /join`: `{ name, civilization, resumeToken? }`; returns `{ playerId, token }`.
- `GET /world`: shared state; requires `Authorization: Bearer <token>`.
- `POST /command`: an intent; requires the same header.

Commands use `type` plus `targetId`, `x`/`z`, or `name` as appropriate:
`move`, `attack`, `gather`, `return`, `stop`, `train`, `recruit`, `upgrade`,
`commander`, `unlock-commander`, `reinforce`, `cancel-job`, `quest`,
`alliance-create`, `alliance-join`, `flag`, `capture`, `building-upgrade`,
`research`, `summon`, `temple-offering`, `buy-sigil`, `upgrade-commander`, `trade`,
`craft`, `equip-relic`, `alliance-help`, `deploy-march`, `configure-march`, `disband-march`.
`troops.mjs` defines typed rosters, exact selection and validated unit transfers;
`marches.mjs` applies home, recovery and unique commander requirements.
Invalid commands return HTTP 400 with `{ error }`; unknown sessions return 401.
Bodies are limited to 4 KiB and sessions to 32. Tokens never appear in snapshots.

Unity serializable DTOs in `WorldModels.cs` match this protocol. `PrototypeClient`
handles transport and UI, `WorldView` constructs placeholder visuals, and
`StrategyCamera` implements map navigation. Outgoing commands are queued rather
than silently dropped while another request is pending.

## Gameplay rules

- Cities start with 20 mortal troops and resources. Upgrade costs are 100 wood and
  75 gold times current city level; level cap is 5.
- City upgrades run in a dedicated construction lane, taking 20 seconds times
  current level. They do not require the army at home.
- Train five troops in eight seconds for 50 food and 20 gold. A shared training
  lane holds three orders. Capacity is 20 + 20 × city level, counting deployed,
  reserved and queued troops. Canceling an unfinished job refunds its full cost.
- Mythic recruitment requires city level 2, costs 80 food and 100 gold, and is
  capped at city level across army, reserves and queues. Recruitment takes 20s. Base stats are currently shared across mythic types;
  unique mythic abilities and creature art are future work.
- City management and commander recruitment work independently of army orders.
  Completed units enter city reserves. Reinforcing or equipping a commander
  requires an idle army at home. Healing is automatic there. Defeat returns an
  army home with an 8-second recovery delay. City queues continue during recovery.
- Camps retaliate against attacking armies. Contributors split gold/food and
  each earn kill credit and XP. Camps respawn after 45 seconds.
- Gathering transfers finite resources each second. Empty nodes refill in 30s.
- Alliance creation costs 50 gold. The leader places the first beacon near home;
  new beacons connect within 12 units and cost 60 wood / 20 gold. Enemy beacons
  block nearby placement. Prototype cap: 20 beacons per alliance.
- A site requires alliance territory within 12 units and an army within 2 units
  for 15 uncontested seconds. Opposing occupiers pause capture; sole defenders
  reverse progress. Beacons cannot yet be attacked or removed.
- The eastern gate controls destinations x > 40; the northern gate controls
  z > 40. Both are required for the sanctuary. This is a province permission
  model, not physical pass pathfinding. Armies can always return home.
- Dawn shrine grants +10% damage, Renewal +25% healing, sanctuary +20% gathering.

## Sessions and operations

Tokens are stored locally in Unity PlayerPrefs, keyed by server URL and player
name. Resume requires possession of the token. Inactive saved cities retain their
sessions and territory; after 30 minutes they stop field orders. A city name alone
cannot recover a lost token. This is not a production account system.

The CLI enables `WorldStore`: atomic temporary-file writes, a previous-valid-save
backup, autosaves every two seconds and after accepted mutations, and a final
save on graceful shutdown. Windows uses LocalAppData/ThronesOfMyth/Saves/world.json;
`THRONES_SAVE_PATH` overrides it. Tests use an in-memory world unless given a path.
Save schema 4 stores typed troops (and migrates schemas 1/2/3 without resetting progression) queues, reserves, map state and sessions. A loader validates
the save and falls back to backup, retaining versioned migration archives; if both fail it preserves files and refuses to
silently reset. Time does not advance while the server is closed. Restore stops
field orders while retaining positions and all progression. The package launcher
uses a per-launch secret for its save-and-shutdown endpoint; that capability is
not exposed in snapshots or available to ordinary player tokens.

The server binds to 127.0.0.1:8080; HOST and PORT can override this for controlled
local testing. Do not expose this prototype publicly as-is: real accounts, TLS,
rate limiting, a production database and deployment hardening are not implemented.

Unity 6.3 LTS is the intended line. Commit the exact patch and package lock after
successful local import. Built-in render pipeline, legacy input and IMGUI keep
this prototype dependency-light. No production backend choice is implied.

Detailed 0.4 institution behavior, production caps, recipes, research modifiers,
guarantee rules and deferred systems are specified in
[the city/economy design](city-and-economy-design.md). Summon results use server-side
cryptographic randomness by default; deterministic RNG/clock injection is for tests.

Version 0.5 separates a city's shared resources/queues from its independently
controlled marches. The founding army retains legacy player fields for save/API
compatibility; extra armies live under `marches`. `World.armies()` flattens these
for simulation, and `owner()` resolves shared treasury, territory and technology.
Only the owning session can direct a march; global training capacity includes
all armies. Rewards are grouped by city to prevent multi-march duplication.

`progression.mjs` defines ages, crew counts and per-hero skill/XP/star records.
`marches.mjs` handles deployment, selection-scoped orders and loadout ownership.
A second construction field runs concurrently only after the Builders' Lodge is
completed. Both jobs are validated, saved, cancellable and eligible for alliance
help. Hero records are the XP source of truth; rage and shields belong to each
march and are cleared on restore. See [the progression design](skills-ages-and-marches.md).
