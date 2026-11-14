# V1 functional backlog

This is the working order for functional completeness. It is not a line-by-line audit of the coverage register. Most register rows still say `NOT AUDITED` even where server tests already exist. A passing test is not treated as proof that a whole system is finished. Future 3D, randomized inscriptions, and unapproved premium commerce stay out of this list.

## Done in this package

### A. Commanders, equipment and troops

- **TM-056 / 09-009 / 16-031 — commander armament.** Forge of Dawn crafts Frontier Spearhead, Frontier Cuirass, and Frontier Standard. The city owns each piece once. One commander wears it in Weapon, Armor, or Banner. Two pieces of Oath of the Frontier add camp and stronghold damage × 1.02 once. Equip and unequip wait until every march that commander serves is home. Bronze Aegis and Ember Spear stay march relics. Schema 19. Protocol 16.
- **TM-057 — secondary commander.** One companion per march. They add 1% damage and maximum health per companion level, do not cast a skill, and receive half of the primary's camp experience grant on top of it. A commander cannot serve twice. Old saves keep the primary and an empty companion.
- **TM-041 / 02-022 — troop tiers III–V.** Bronze Column, Ashen Bows, and Dawn Lancers; Oath Bulwark, Far Marks, and Storm Couriers; Titan Guard, Echo Marks, and Horizon Lancers. Bronze Columns, Oath Bulwarks, and Titan Host unlock them inside the five-level Citadel. Training, adjacent promotion, healing, power, and combat use the same ids. Schema 20. Protocol 16. The balance is in `docs/tm-041-troop-tiers.md`.

- **TM-055 — Combined Arms.** One formation. Infantry, archers, and cavalry must each be at least 15% of the march's mortal troops. Tiers of a class count together. Mythic escorts do not. The march then has ×1.04 maximum health, once, inside `stats()`. A damaged march cannot be reformed. A full march adopts the new maximum, and a lower maximum clamps current health. Schema stays 20. Protocol stays 16. The rule is in `docs/tm-055-combined-arms.md`.

Acceptance for the commander package is `server/armament.test.mjs`. Acceptance for the five tiers is `server/tiers.test.mjs`, with the existing veteran suite still passing. Acceptance for Combined Arms is `server/formation.test.mjs`.

- **TM-070 — seven-day offerings.** One explicit claim per UTC day, for seven ordinary rewards, then Day 1 again. A missed day resets the streak. Daily tasks, chests, and weekly alliance goals are unchanged. Schema 21. Protocol 16. The schedule is in `docs/tm-070-seven-day-rewards.md`.

Acceptance for the seven-day streak is `server/login.test.mjs`.

- **Expanded Athenaeum research.** Drills of the Dawn, Mercy of the Healers, Stores of the Ages, and Caravan Pledges. Three ranks each. Training and healing orders keep the duration they were paid with. Schema stays 21. The values are in `docs/tm-060-expanded-research.md`.

Acceptance is `server/research-expansion.test.mjs`.

- **TM-071 — event hub.** Oath of the Builders runs Monday to Thursday UTC and pays 200 wood, 150 stone, and 100 gold after two completed building or research jobs. Frontier Vigil runs Thursday to Monday UTC and pays 200 food, 150 gold, and 10 Mana after two completed surveys and one Forsaken camp victory. Schema 22. Protocol 16. The schedule is in `docs/tm-071-event-hub.md`.

Acceptance is `server/events.test.mjs`.

- **TM-077 — alliance diplomacy and coalitions.** Leaders sign bilateral non-aggression pacts. A coalition holds at most three alliances, with its own invitation, chat, and the same combat protection. Territory, vision, treasuries, and rallies stay inside one alliance. Schema 24. Protocol 16. The rules are in `docs/tm-077-diplomacy.md`.

Acceptance is `server/diplomacy.test.mjs` and `server/coalition.test.mjs`.

- **TM-072 — Season of the First Throne.** A 28-day UTC season with four phases, capped scores, personal and alliance boards, milestones, one-time placement rewards, a 28-day claim window, and a frozen archive. The next season starts without resetting the city, army, alliance, coalition, or territory. Schema 25. Protocol 16. The rules are in `docs/tm-072-seasons.md`.

Acceptance is `server/season.test.mjs`.

- **TM-017 — multiple kingdoms.** One process hosts up to four configured kingdoms. Each has its own world, save, sessions, alliances, diplomacy, combat, chat, fog, rankings, events, and season. The game asks the server for the kingdom list before creating a city. Schema 25. Protocol 16. The host is described in `docs/tm-017-multiple-kingdoms.md`.

Acceptance is `server/realms.test.mjs`.

## Next package

### A. Large-world battle scale

TM-025 / TM-084 has a first measured server optimization checkpoint. Encoded rollback images, scoped army indexes, bounded fog checks and faster static memory updates are implemented; schema 25 and protocol 16 remain. All 21 publication checks and 364 server tests passed (5 skipped). Four-realm SQLite host p95 improved from 88.761 to 54.854 ms; JSON from 207.149 to 135.985 ms. Heavy polling still causes lag, so mass-battle acceptance remains OPEN. See `docs/tm-025-084-scalability.md` and its raw evidence. Next is sustained mass-battle reliability/load, snapshot and persistence work. Cross-kingdom migration, shared accounts, and war between kingdoms stay out until they are designed.

## Later functional packages

### B. City, research and economy

Citadel ages, one shared training hall, the forge, and production cycles exist. The next economic work is more military and civic research with effects that already have a stat to change, not a new currency. Rates were server-tested and not rebalanced.

### C. World map, exploration and combat

Fog, camps, gathering, and one relic per march exist. Separate kingdoms on one host exist. Kingdom age and migration are not built. The first TM-025/TM-084 CPU optimization checkpoint is implemented; full large-world and mass-battle scale acceptance remains open.

### D. Alliances, diplomacy and warfare

Beacons, supply radius, rallies, garrisons, and strongholds exist. Non-aggression pacts and coalitions block hostile action between the alliances they cover. Territory is a beacon supply radius, not an ownership polygon or a resource bonus. A coalition does not merge that territory.

### E. Daily progression, events and seasons

Daily, weekly, seven-day, the two recurring event claims, and Season of the First Throne exist and are server-tested.

### F. Multiplayer infrastructure and operations

Protocol 16 and schema 25 persistence exist for one kingdom. Multiple kingdoms, migration, and the scale of many simultaneous battles are the remaining operations gap.

### G. Functional UI and accessibility

The forge, hall, training, and guide screens send server commands for the systems they already cover. Missing functional screens follow the systems above. Commander-specific stages and extra 3D motion (TM-058, TM-059) wait for the visual phase. The Frontier Captain presentation stays as it is.

## Kept out

- Randomized inscriptions, loot chests, and extra armament copies (09-010).
- Aether prices and new premium currencies.
- New 3D models and cinematic effects.
- Roads, claim polygons, and territory resource bonuses that this game has already declined.


## Friends alpha milestone - checkpoint A

Random continuous city spawning in the gate-free First Frontier is implemented. Four-unit city spacing, static-object clearance, reachable starter deposits/camps, bounded full-land rejection and durable join rollback preserve old positions and sessions. Five spawn tests, 369 server tests and the 22-command plan passed (five Linux packaging checks skipped on Windows). Schema 25 / protocol 16. See `docs/random-city-spawns.md`. Map expansion and the friends distribution workflow remain next.


## Expanded kingdom - checkpoint B

Real world expanded to 256x256 with the legacy area preserved, three populated frontier provinces, explicit gated routes, 293 deposits, 62 camps, 11 sites and eight strongholds. Schema 26 converts 20-column fog to 64 columns; protocol 17 requires matching clients. Registered identity ceiling 256; default operational cap stays 32; alliance membership ceiling 100 with role/chat/contribution persistence. Unity batch compilation passed; 376 Node tests and 23 publication checks passed (five platform skips); portable presentation contracts: 16,754. The ten-client benchmark succeeded at 32/128/256 registrations but loaded 256-city command p95 was 1025.749 ms, so no 256-active-client claim. See `docs/expanded-kingdom.md` and `docs/benchmarks/expanded-kingdom.json`. Private-alpha packaging/connection workflow is checkpoint C; native and real remote play remain unverified.


## Friends multiplayer alpha workflow - checkpoint C

Dedicated loopback server script uses a separate persistent FriendsAlpha directory, requires invitations, protects real/isolated saves, supports multi-realm configuration and restores its environment. A separate Windows client-only builder/launcher never starts Node or a local kingdom. Remote entry requires HTTPS and checks protocol/source identity. The host/friend guide covers private encrypted mesh HTTPS, existing hosted Docker/Caddy preparation, readiness, backups, safe restart and a real 3-10-player checklist. No public deployment, firewall changes or purchases were performed. Native Windows client-only build succeeded; 145 ZIP payloads passed integrity/privacy verification. Three generated production-spawn cities passed real local HTTP/SQLite scouting, cargo, alliance chat, movement and restart/reconnect. Full Node suite: 378 passed, five platform skips; all 25 publication checks passed; Unity compilation passed. Schema remains 26, protocol 17. Actual remote Windows friends, rendering/FPS and manual checklist remain NOT YET PLAYER-VERIFIED. See `docs/friends-multiplayer-playtest.md`. The additional numeric balance and Forsaken ecosystem milestones follow this published workflow.


## RoK numerical foundation - balance checkpoint (14 November 2026)

Published A/B/C remain intact. Checked the requested public references and recorded per-column provenance, conflicts, assumptions and missing values in `research/rok-pve-numerical-reference.md` and `server/balance-reference.json`. The compatibility plan in `docs/tm-forsaken-balance-and-spawning.md` was written before production balance edits. No hidden combat equation or unknown loot rate is claimed exact.

Production numeric profile1 / schema27 uses real starting900 T1 soldiers, reference troop attributes and power1/2/3/4/10, per-soldier costs/time/load, five-age mapped march capacity plus the primary commander, full-batch promotion quotes,1500 AP cap/36-second recovery/50 ordinary admission, rarity-dependent commander XP progression, actual severe wounded transfers and larger rally/garrison storage. Explicit original adaptations cover missing XP rows, inferred cavalry costs, aggregate damage/defense, economy throughput, hospital rules, mythic escorts, existing Godbreakers and alliance fortifications. Building/research/commander power coefficients remain original; exact parity is not claimed.

Unversioned schemas1–26 migrate once after old-state validation and normal combat restart recovery. Mortal typed ledgers and paid jobs scale50×, health fractions/AP fractions/XP progress and banked experience survive, queues retain paid cost/time, stocks/cargo remain, historical reports stay original. JSON archives include schema26. Explicit legacy fixtures preserve old regression baselines; seven new production tests cover reference rows, real training/promotion accounting, AP generation/restart, migration conservation, hospital transfer and actual engine PvE/PvP. Production friends HTTP testing continues with the new default.

Validation: `node --test server/*.test.mjs`:385 passed, five platform skips, zero failures (390 total). All26 commands in `scripts/publish-tests.json` passed, including16754 portable C# contracts. Unity6000.3.0f1 batch compilation exited0. Native gameplay, remote friends, all25-level combat calibration, randomized NPC population/patrol/search and special-category encounters remain unverified or pending their separate checkpoints. The previous clean client ZIP belongs to checkpoint C; regenerate the distributable from final published source before sharing it with the final server.


## Calibrated Forsaken - combat/reward checkpoint (14 November 2026)

Ordinary production enemies are Forsaken Lv.1–25 with mortal soldier visuals, stable legacy IDs, separate displayed power/recommendations and source-based troop attributes. AP admission is once per actual march and NPC generation, including across restart. Real damage, rage, shield expiry, severe wounds, direct commander XP, usable Chronicle pages, resource alternatives, speedups, first-clear unlocks and detailed reports settle through the production engine. Unknown rare/resource branch probabilities are explicit ToM policy; advertised gems are not guaranteed currency. Existing paid legacy owner admissions are grandfathered. Private encounter ledgers stay out of snapshots, scouting and map memory.

`node scripts/forsaken-calibration.mjs` ran175 actual command/tick battles and wrote JSON/CSV evidence in `docs/benchmarks/forsaken-calibration.*`. All25 recommended cases won, all25 half-count cases lost;120% count, stronger commander, higher/lower tier and technology cases each won25/25. Lower tiers retained less health. Legal capacities and real troop conservation are checked. Fixed loot randomness is a reproducibility tool, not a drop-rate measurement. Wounds on victories remain zero under the disclosed prototype casualty model; combat is an explicitly approximate ToM equation, not exact RoK parity.

Source-derived first-clear quantities are separate from repeat loot. The new Chronicle item has a real commander selection/use flow; commander XP bars use cumulative rarity thresholds. The reference opening guide prepares the existing900 soldiers without a mandatory25-minute archer batch or a20-soldier attack. Nearby guidance covers the enlarged map. The earlier two-player progression script now explicitly selects its legacy balance; production friends-alpha testing continues with production defaults.

Validation:392 server tests passed, five platform skips, zero failures (397 total). All27 publication checks passed; portable C# contracts16757; Unity6000.3.0f1 compilation exited0. Rendering, remote players and natural population/patrol/search remain pending their own verification/checkpoint. The current static placement does not yet represent the requested natural roaming population. Details and numerical limits: `docs/tm-forsaken-balance-and-spawning.md`.


## Permanent research-first policy —14 November2026

User-directed project policy now lives in `research/parity/README.md`, with concise root `AGENTS.md` and Cursor links. No new gameplay or numerical balance implementation without identifying the reference, verifying/classifying evidence, comparing current/reference values and dependencies, documenting decisions/migration and defining expected formulas/tests first. RoK is primary; Call of Dragons evidence remains separate. Unrelated fixes, security, formatting and infrastructure do not require invented reference research. Essential exact unknowns must be reported before speculation; estimates/conflicts cannot be labeled full verified parity.

Added reusable feature template/registry and two current Forsaken records. Published troop/AP/ordinary combat is Partial parity; the unpublished population draft is Not yet verified and cannot pass the gameplay publication gate as IN_PROGRESS. No game values were rebalanced in this policy commit. Existing source-linked tables and measured combat evidence are reused, with explicit uncertainty and migration decisions. Private workbooks remain inputs, not independent proof. The draft was preserved in a named Git stash to keep the policy-only publication clean, and is to be restored after confirmed publication.

The small gate checks fields, dates/labels, changed gameplay scope, updated evidence, explained exemptions, coverage IDs, numeric fixtures and registered acceptance commands. The publisher always runs it before tests, including with a custom plan, and checks metadata again after fetching before a push. Numeric bindings validate the existing tables and compare all175 recorded combat rows to a fresh production-engine run. It cannot establish external source truth, honest exemption classification or complete test coverage; human/independent review remains required. Existing main/clean-tree/privacy/fast-forward safeguards remain. Offline push tests now clear only their own repository's pending marker.

`docs/reference-adaptation-plan.md` retains the8 November baseline as history while making the new effective policy authoritative, including current Mana/Aether terminology. The coverage register gains a separate parity-status column; old entries default to Not yet verified, without changing their historical implementation notes. One pre-existing unquoted comma in TM-095 was repaired without losing text. No retrospective rebalance/audit claim.

Validation:16 research-gate tests passed; six existing offline publication checks passed; the full30-command publication plan passed, including reference assertions,175-row fresh-engine equality and16757 portable C# contracts. No new Unity rendering or remote-player claim is made for this policy-only change.
