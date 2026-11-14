# Morning report — 12 November 2026

Automation stopped after one functional slice. Live GPT review was not used.

## Why it stopped

The OpenAI API can cost money outside a ChatGPT subscription. Live review calls stay disabled. A paid review is not required before the next functional task. Deterministic tests and the coverage register are the gate.

The march-share code was missing from `origin/main` at `4fbfd80` even though this report and TM-037 were already there. It was copied from `d0fa46b` onto main without the captain art commits, the AI-loop, or the branch roadmap. Schema stayed 18.

## Completed

FUN-001's first gameplay gap: a march can no longer carry every soldier in the city once more than one march slot is open.

`marchTroopCap` is `ceil(city troop capacity / unlocked march slots)`.

- Citadel 1, Hall 1: share is 40, the same as the city store, so the first army is unchanged.
- Citadel 2 with one Hall level: city store 80, two slots, share 40.
- Mythic escorts do not use this share.
- Deploy, reform, and reinforce all obey it. Reinforce leaves the overflow in the city.
- A save that already has a larger march still loads. Schema stays 18. Health protocol stays 16.
- The formation screen states the share and will not send an oversized order. All Ready trims to the share.

## Partial

- The formation screen was not opened in a Unity player. Server tests cover the rule. The buttons are wired to the same command the server enforces.
- TM-038 march slots were not rewritten. An existing test that separates home formations from active march limits passed in this run. A fresh 1-through-5 assertion was not added.
- TM-095 was re-checked only for schema 18 and for loading an oversized march. The reported 7/8 journey restart was investigated afterward in FUN-002.
- The rest of the coverage register is still `NOT AUDITED`.

## Tests

Passed, 0 failed:

`node --test server/gameplay-parity.test.mjs server/troops.test.mjs server/world.test.mjs server/kingdom.test.mjs server/veterans.test.mjs server/war.test.mjs server/core-corrections.test.mjs server/chapters.test.mjs`

96 passed.

`python .ai-loop/tests/test_hook_offline.py`

7 passed.

Unity playtest: not run.

## Coverage

`research/MYTH_feature_coverage_register.csv` now has evidence on TM-037, TM-038, and TM-095. GPT column says the API was not called. Player-verified says not run.

## Next task, after you review this slice

Reproduce or retire the journey restart report (TM-095 / the scope's TM-101 note). Do not start it until you accept the march share.

## Blockers

- No paid review. Local handoff is `.ai-loop/handoff.md` and this file.
- Do not treat this as approval to push `main`.

## Verification added later the same morning

This section is the Unity submit. It is separate from the morning note above, which correctly said the formation had not yet been submitted.

The Windows player was the one already compiled to `work/fun001-verify/ThronesOfMyth.exe`. It talked to `127.0.0.1:8080` and `work/fun001-verify/world.json`. The real save at `%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json` stayed at its 12:05 AM write.

Citadel 2, Menagerie 1, 50 reserve infantry, and 1 reserve Minotaur were edited into that isolated save. They were not earned by upgrading or training in the client.

Starting ready pool: 20 infantry already in the home formation plus 50 in reserve, so 70 mortals, plus 1 mythic in reserve. All Ready drafted 40 mortals and 1 mythic. Confirm Formation was accepted. The save became 40 infantry and 1 mythic in the home formation, 30 infantry and 0 mythic in reserve. Mortals stayed 70. Mythics stayed 1.

After the isolated server was restarted, `GET /world` still returned those totals, `marchTroopCap` 40, and `troopCapacity` 80. The client reconnected and the Marches screen showed 40 mortal troops, 1 mythic, and 30 unassigned reserves. One home formation, no duplicate.

Schema stayed 18. The world snapshot stayed version 16. No gameplay code changed and no API was called.

## FUN-002 — journey guide after restart

Two different records were involved.

The server campaign in `server/chapters.mjs` stores a high-water mark per objective and a separate claimed list. A claim pays once. Locked or incomplete objectives cannot be claimed. That record is in the save.

The “FIRST STEPS · N / 8” panel is client advice in `FirstSessionGuide`. It is not a reward ledger. Step 6 is “Review your victory” and step 7 is “Return to your civilization.” Step 7 was shown only after the victory report had been opened in that client process. Those flags were not saved, so a new process returned to step 6.

Isolated save `work/fun002-verify/world.json`, server `127.0.0.1:8080`. The city reached the state through server commands: move to Forsaken Scouts, attack, and win. The army stayed in the field, paused after load, with 1 kill. No objective was claimable, so the guide stayed visible. The real kingdom save remained last written at 12:05 AM.

On the previous player, opening the report changed the panel from 6/8 to 7/8. Quitting and relaunching the same client against the same server put it back on 6/8. The server still had one kill, forsaken progress 1/3, and no claims.

The fix remembers the four advice flags on this device for that profile. The rebuilt player, after the report was opened, stayed on 7/8 after a client relaunch and again after the isolated server was restarted. Server totals were unchanged: kills 1, position about (17.37, 13.84), forsaken 1/3 unclaimed, no claimed objectives, one player, snapshot version 16.

`node --test server/chapters.test.mjs` — 10 passed, 0 failed. That includes a legal wood delivery that was claimed once, then a field victory. After `fromSave`, the wood claim was still present, a second claim did not pay, and forsaken stayed 1/3 and unclaimed. Camp gold from the victory was kept and was not treated as a second objective reward.

Presentation contracts — 16695 passed, including a new guide instance restoring step 7 from the remembered review, a blank guide starting at step 6, and a different profile not inheriting the review.

Not verified in Unity: steps 1 through 5, the recovery cue, a victory opened only after the army is home, or a second device. Those paths are now in the presentation contracts. Opening the report still does not grant a reward. Schema stayed 18. No API was called. Nothing was pushed.

## First Steps follow-up

The recovery cue used the same number as “Return to your civilization.” A wounded army on an earlier stage would show 7/8 and then fall back when it healed. Recovery now keeps the real stage number and only changes the title and the city action. A fresh guide with the same device flags returns that same stage.

`Presentation contracts: 16746 passed.` Gameplay-feel contracts: 101 passed. The new checks restart stages 1 through 7, keep a wounded stage 7 on “Recover at home,” return to the recall action after healing, open a home victory into stage 8 once, ignore a repeated review, and show stage 6 from an empty second-device store while the first device stays on stage 7. `node --test server/chapters.test.mjs`: 10 passed, 0 failed.

The Show action is shared with the guide. Prepare opens the formation screen. The victory step opens Reports and remembers the review. Return sends the real `return` command unless the army is already returning. The other steps open the matching city, captain, training or camp screen. No Unity click-through of stages 1–5 was done after this change. The earlier isolated player check remains the field-victory 7/8 relaunch only.

## Coverage ranking after the workbook pass

Both reference workbooks were read against the current register, not treated as proof that a screen works. The video workbook’s Feature Matrix still lists TM-095 as reported implemented and TM-097 as a suspected 7/8 restart bug. The reference workbook’s 16-008 acceptance is that a farm accrues up to its cap while the app is offline. 16-023 asks for a 7-day reward calendar and is a new economy, so it was not invented here. TM-027 records visible RoK levels 2/8/10 and says not to copy those numbers; the Citadel still stops at the existing five ages.

Of 776 register rows, 772 remain `NOT AUDITED`. Fifty-seven are marked deferred 3D/visual work. A passing presentation contract is not gameplay proof. The highest remaining functional gaps, in dependency order, are:

1. First Steps stages 1–5 and recovery still need a Unity play. The contracts cover the state machine.
2. TM-027 longer city ages need a design decision. The current five-age costs stay as they are.
3. TM-064 production rates and TM-053’s talent diagram are balance and presentation. Talent commands already exist.
4. TM-001 and TM-002 fog are functional rules plus visual concealment. The visual pass stays deferred.
5. TM-025 and TM-084 are scale tests, not the next player feature.
6. 16-023’s 7-day calendar would add rewards. It waits for an economy decision.

## JSON downtime catch-up

Hosted SQLite already advanced paid city timers and up to eight hours of passive production across a restart. The local JSON save used by playtests did not. `WorldStore` now stores `savedAt` beside schema 18, without putting it in the world object or changing protocol 16. On load, a gap of at least one second uses the existing `advanceDowntime`. A file with no timestamp is not paid for the time it sat on disk. The next save starts the clock.

`node --test server/storage.test.mjs`: 17 passed, 0 failed. Thirty seconds produced food and wood, left a full stone stock and the army in place, and a second load did not pay again. Sixty seconds finished one Citadel timer once. An old file without `savedAt` kept its food and wood. Filtered downtime tests: 5 passed, 0 failed. This was not clicked through in Unity. No API was called.

## Recovered onto main

`origin/main` at `4fbfd80` had this report and the TM-037 row, but not `marchTroopCap`. The five gameplay files were taken from `d0fa46b` and applied on the main worktree. Captain art, the AI-loop, and the branch roadmap were not included.

`node --test server/gameplay-parity.test.mjs server/troops.test.mjs`: 18 passed, 0 failed. The new test checks Citadel 1 share 40, Citadel 2 store 80 and share 40, a rejected 41-troop deploy, a reinforce that stops at 40, and an old oversized march that still loads at schema 18. The formation screen was not opened in Unity on this main build. The earlier isolated Unity check remains the only playtest.

## PvE camp cycle

TM-079 was checked against the current server. A legal attack spends 5 AP once per camp cycle, deals damage on a one-second cooldown, and can spend rage on the active skill. The killing blow pays each participating city once, writes one private victory report, and starts the 45-second respawn. A second order while the camp is dead, including a remembered camp outside current vision, cancels without another reward and without another AP charge. The next cycle pays once. Defeat sends the army home to recover and keeps its troops. Unity was not opened.

## Production cycle

TM-064, TM-039, TM-053, and TM-027 were checked against the current server, not the old register text. Production rates, the vault cap, harvest, and the eight-hour catch-up were already present. Hall batches, talent points, and the five Citadel ages were already present. No age was added and no production rate was rebalanced.

The live city loop adds about 100 ms per tick. One hundred seconds of those ticks paid 19 cycles, 38 food, from a level-one Blessed Fields instead of 20 cycles and 40 food, because the sum lands an ulp under five seconds. The cycle now completes with the same small tolerance construction already uses. Once the Citadel allows the farm upgrade, an empty store still cannot start it. After the upgrade the next cycle pays 4. A neighbor's farm pays its own 2. The building card quotes that same five-second yield, and eight hours of downtime fills the stockpile without paying a ninth hour. A reload keeps the food and the new level at schema 18.

`research/MYTH_FUNCTIONAL_SCOPE.md` was restored from `d0fa46b`. The private workbooks were not added. Unity was not opened for the resource numbers, the training button, the talent list, or the Citadel. The talent diagram and any further city ages stay open.

## Fog and discovery

TM-001 and TM-002 already separated permanent land from live military vision. Sectors seen by a city, army or scout stay discovered. Unexplored camps, sites and strongholds are absent from another player's snapshot. A remembered camp keeps its old health, and a distant city keeps its old level, after those values change outside vision. An enemy march is included only while it is in allied vision, without its order or route, and it disappears when vision is lost. Scout reports stay private and do not update after the scout leaves. Invalid map coordinates are rejected. Schema stayed 18.

`node --test server/exploration.test.mjs server/scouting.test.mjs`: 17 passed, 0 failed. The two static-intelligence tests in `server/core-corrections.test.mjs` passed. Fifty snapshots of a small kingdom took about 73 ms on this machine; that does not say anything about thousands of players. Unity was not opened. No fog art was added.

## Territory ownership

TM-020 and TM-076 already had a working beacon graph. A completed connected beacon supplies capture and rallies within 12 units. The first fort must be placed by the leader near their city. Later beacons must link to that supply. A disconnected or unfinished beacon does not supply anything. Sacred sites stay point objectives. Destroying the root drops the branch. Closing an empty alliance clears its territory.

Filled alliance provinces, roads, territory gather bonuses and seasonal safety rules are not this model. They were recorded as open design choices and were not added.

The snapshot now includes those radii at protocol 16. The map can show or hide a ring of that radius around each live connected beacon. A remembered beacon draws no ring. Allied and visible enemy rings use different colors. A site says whether it is inside the viewer's supply. Hidden enemy beacons stay out of the snapshot.

`node --test server/campaign.test.mjs`: 18 passed, 0 failed. `node --test --test-name-pattern "flag|territory|shrine|beacon" server/world.test.mjs server/social.test.mjs`: 5 passed, 0 failed. Schema stayed 18. Unity was not opened, so the ring toggle is not player-verified.

## Military halls

TM-036 already uses one Hall of Spears for infantry, archers and cavalry. Separate class buildings were not added. Hall levels 1 through 5 keep batches of 5, 5, 10, 20 and 40, add five troop capacity per level after the first, and add 10 percent training speed per level after the first. The training screen quotes that server order. A hall upgrade and a training order use different lanes, and the paid training time stays the time quoted when the order was placed.

Tier II needs Citadel 2, Hall of Spears 2 and Veteran Oaths. Promotion takes five ready Tier I reserves, spends only the cost difference, and does not create extra soldiers. The Sanctuary of Beasts gates mythic recruitment. The House of Renewal has 25 beds plus 15 per level; overflow patients wait. The Athenaeum research effects and the Forge of Dawn relic lane were already covered by the city tests. Cancellation refunds the order once. A repeated promotion HTTP key does not train twice. Schema stayed 18.

`node --test server/city.test.mjs server/gameplay-parity.test.mjs server/veterans.test.mjs server/war.test.mjs server/troops.test.mjs`: 61 passed, 0 failed. Unity 6000.3.0f1 is installed, but this repository has no Windows player build, and the editor was not opened. The playtest rows stay pending. No costs or speeds were changed.

## Relics and equipment

The Forge of Dawn already crafts two march relics. Bronze Aegis multiplies maximum health by 1.10. Ember Spear multiplies damage by 1.10. A march carries one relic. Equipping does not raise current health. Unequipping clamps health to the new maximum. Another march cannot take a relic that is already equipped. A save that copies one relic onto two marches, or names an unknown relic, is rejected. The forge screen shows the server multipliers and says when the march is away or the relic is already carried.

Commander equipment was added later as a separate inventory. See the commander armament section below. This relic section still describes Bronze Aegis and Ember Spear only.

Proposed slots, if approved later: Weapon, Armor, and Banner, owned by the commander and shared by every march that commander leads. Relics stay on the march and do not stack with a piece in the same role. Crafting would use the Forge of Dawn, with costs in stone, gold, and Mana, and no duplicate instance of the same piece. A two-piece set could add one named bonus. Three pieces would not add a second copy of that bonus. No randomized inscriptions.

## Manual playtest

`docs/playtest-functional-checklist.md` lists the isolated Windows steps. Playing that list is still pending.

## Repository consolidation

13 November 2026. `main` is the only development line. The Frontier Captain presentation was copied from `feature/captain-3d` at `6195bdb` onto this main without merging that branch's older city, march, storage, or publish-script trees. The paid review loop on that branch was not copied. Local archive tags `archive/2026-11-13/*` record every branch tip. The two Excel workbooks were copied to `C:\Users\rober\Documents\GitHub\myth-private-backup` and stay untracked.

The hall uses `CaptainPresentation.cs`, `CommanderHallLayout.cs`, the 4,076,588-byte `FrontierCaptainPresentation.fbx` (Kaydara binary, not an LFS pointer), the captain albedo/normal/metallic maps, the Suncrest Aegis, and the Sunforged Spear. `PROVENANCE.txt` credits the derivative "Model created with Meshy – CC BY 4.0 License". The generation plan is not recorded, so the raw Meshy zips stay out of git.

`python scripts/run_presentation_contracts.py` passed: Presentation contracts 16746 passed, including hall separation at 1024x768, 1280x800, and 1920x1080.

Unity 6000.3.0f1 imported `FrontierCaptainPresentation.fbx` and exited batch mode with `Build Finished, Result: Success`. The rebuilt player launched against the isolated server on port 8091. The Hall of Commanders showed the rigged Frontier Captain, spear, and sun shield. Dragging the figure turned it to profile. The Victory preview raised the spear. The isolated city still showed Age of Oaths, Citadel 2, after the earlier session. The real kingdom save was not opened.

## Isolated playtest after consolidation

13 November 2026, after `f1ee2ba`. The preserved isolated save was copied to `work\playtest-save\world.json` and served on port 8091. Health reported protocol 16 and JSON persistence. A second start was refused while that port was listening. The real kingdom save stayed at SHA-256 `9A80937D2C65AAEFA88A3C36E597C4D52E1A29BD4BABEF0C279306E0FE0C0F3E`.

Unity 6000.3.0f1 rebuilt the Windows player (`Build Finished, Result: Success`, no `error CS`). The player resumed Review225051, Greek, Age of Oaths, Citadel 2, and showed Connected. Closing it and launching again resumed the same city. The Hall of Commanders showed the full-body Frontier Captain with spear, shield, and armor. Dragging rotated the figure. Victory raised the spear. Talents showed 0 open points at level 1. Blessed Fields quoted 2 food every five seconds up to a stockpile of 850, which the city had already reached. The Forge of Dawn listed Bronze Aegis and Ember Spear and required Citadel 3 before crafting. No gameplay defect was confirmed. First Steps completion, a new training order, a camp attack, a scout, and a placed supply beacon were not played in this pass. `docs/tm-056-commander-armament.md` records the unbuilt slot design.

## Commander armament and pairing

Troop tiers III–V were added after the commander package. See `docs/tm-041-troop-tiers.md`. Schema 20 keeps older soldiers. The training screen lists all five tiers from the server. No manual playthrough was run for that package.

The slot design was implemented after that playtest. The Forge of Dawn crafts Frontier Spearhead, Frontier Cuirass, and Frontier Standard with ordinary resources and Mana. The city owns each piece once. A commander wears one piece per Weapon, Armor, and Banner slot. Two pieces add camp and stronghold damage × 1.02 once. Bronze Aegis and Ember Spear remain march relics. A march may also assign one companion. The companion adds 1% damage and maximum health per companion level, does not cast a skill, and receives half of the primary camp-experience grant in addition to it. Schema 19 migrates older saves without clearing relics or the primary commander. Protocol stays 16. `server/armament.test.mjs` covers the commands, costs, locks, and migration. The Windows player was not played again for this package.

## Combined Arms

A march whose mortal troops are at least 15% infantry, 15% archers, and 15% cavalry has ×1.04 maximum health. The share uses every tier of a class and ignores mythic escorts. `stats()` applies it once, after relic, armament, and companion health. A damaged march cannot be reformed. A full march adopts the new maximum, and a lower maximum clamps current health. The formation screen reads the 15% and ×1.04 values from the world snapshot. Schema stayed 20 for that commit. Protocol stays 16. No manual playthrough was run.

## Seven-day offerings

The Activity screen has a Seven-day rewards tab. The server pays one ordinary claim per UTC day: food, wood, stone, gold, and Mana, with no Aether. The next UTC day advances the streak. A missed day returns it to Day 1. The day after Day 7 starts Day 1 again. Opening the screen does not pay the reward. Daily tasks and weekly goals keep their own claims. Schema 21 stores the streak. Schemas 19 and 20 load with a fresh unclaimed streak. Protocol stays 16. No manual playthrough was run.

## Expanded Athenaeum research

Drills of the Dawn adds 4% training and promotion speed per rank, multiplied by Hall of Spears speed. Mercy of the Healers adds 6% hospital treatment speed per rank, multiplied by House of Renewal speed. Stores of the Ages adds 8% to the passive stockpile per rank. Caravan Pledges adds 6% gathering cargo per rank for mortal and mythic marches, multiplied by Pilgrim Logistics. Each has three ranks. A paid training or healing order keeps its duration. Schema stays 21. Protocol stays 16. No manual playthrough was run.

## Event hub

Oath of the Builders is open Monday 00:00 UTC through Thursday 00:00 UTC. Two completed building upgrades or research projects pay 200 wood, 150 stone, and 100 gold. Frontier Vigil is open Thursday 00:00 UTC through Monday 00:00 UTC. Two completed surveys and one Forsaken camp victory pay 200 food, 150 gold, and 10 Mana. A queued or cancelled job, a recalled scout, and a camp that is still standing do not count. Each period pays once. Schema 22 adds the event record. Older schemas load a fresh period without changing the city. Protocol stays 16. The Activity screen adds an Event hub tab and leaves the daily, weekly, and seven-day tabs in place. No manual playthrough was run.

## Alliance non-aggression pacts

Alliance leaders propose, accept, decline, withdraw, and terminate a bilateral pact. A proposal expires after 24 hours on the activity clock. Acceptance waits until battles, attack orders, rallies, and sieges between the alliances have ended. An active pact blocks field PvP and hostile rallies against beacons, forts, and occupied sacred sites in both directions. It does not pay resources or change neutral combat. Schema 23 stored the book. Schema 22 loads with no treaties. Protocol stays 16. No manual playthrough was run.

## Coalitions

A leader founds a coalition of at most three alliances. Invited leaders accept or decline. Invitations expire after 24 hours. A member may leave, and the founder disbands the coalition. Members cannot attack one another, and they share a coalition chat that other alliances cannot read. A pact with an alliance outside the coalition stays in force and does not add that alliance to the coalition. Leaving or disbanding ends coalition protection immediately and does not delete the pact. The coalition does not merge beacons, share fog, open a treasury, or allow a cross-alliance rally or garrison. Coalition markers are not included. Schema 24 stores coalitions. Schema 23 keeps its pacts and starts with no coalition. Protocol stays 16. No manual playthrough was run.

## Season of the First Throne — calendar and score

The season lasts 28 UTC days from the day the ledger activates. Foundations, The Frontier Awakens, Banners of War, and The First Throne each last seven days and accept only their own finished actions. Caps stop one repeatable action from filling the season. Alliance points stay on the alliance that earned them, and a coalition is not an alliance score. When the 28 days end, the board freezes and the next season starts at zero. Milestone rewards are 25, 75, and 150 points. Personal top three and a 25-point participation reward are mutually exclusive. Alliance top three pay only contributors who still belong to that alliance at the close. Claims last 28 days, pay once, and then expire. The archive keeps eight seasons. A long empty gap creates no rewards. Cities, troops, research, alliances, coalitions, and territory stay. Schema 25. Schemas 22 through 24 start a fresh ledger. Protocol stays 16. No manual playthrough was run.

## Multiple kingdoms — server host

One process can host one to four configured kingdoms. Each kingdom has its own world, tick, save, sessions, and season. Unprefixed routes stay on the configured default kingdom, which remains `local` when no realm file is set. A modern request uses `/k/{kingdomId}`. A token or command from another kingdom is rejected, and an unknown id does not fall through. `GET /kingdoms` returns id, name, description, population, capacity, join availability, and status. JSON and SQLite paths are server configuration, and two kingdoms cannot share a path. The isolated playtest still uses the default local JSON save. Schema 25. Protocol 16. No manual playthrough was run.

## Multiple kingdoms — player selection

The city entry screen requests the server kingdom list and shows the name, population, capacity, and whether a new city can join. The session key includes the kingdom id. An older local key is copied into the local kingdom and is not replaced by a token from another kingdom. Settings can leave the live session and return to the list; the saved city for each kingdom stays on the device. The world view and Settings show the current kingdom. A snapshot for a different kingdom is not displayed. The single-kingdom server accepts only its own `/k/{id}` prefix and still serves the unprefixed routes. Schema 25. Protocol 16. No manual playthrough was run.


## TM-025 / TM-084 - first scalability checkpoint (14 November 2026)

Measured the same generated workload against user commit 128022b and the optimized tree, with JSON and SQLite worlds at 1x1, 1x16, 1x32 and 4x32. No player saves were used. Detached V8 rollback images replace unconditional clone decoding; failed restores also remove newly initialized top-level state. Army indexes exist only within a synchronous tick/snapshot. Fog checks visit sight-radius bounds with the same authorization predicate, and static discovery avoids redundant sight/object scans. Unsafe draft persistent roster/stat/route caches were replaced. Windows packaging now includes the complete server module graph.

Four-kingdom host p95: JSON 207.149 to 135.985 ms (34.4% improvement); SQLite 88.761 to 54.854 ms (38.2%). The 32-player mixed checkpoint median fell from 4.423 to 1.249 ms (71.8%). All 2,124 polls and 156 commands per implementation succeeded, but the loaded live host still drifts: this does not certify 128 active clients. JSON remains over the tick budget. Snapshot/encoding/save improvements are not universal. Retained four-realm heap is effectively unchanged. Exact distributions, memory, regressions, commands, machine and limitations are in `docs/tm-025-084-scalability.md` and `docs/benchmarks/tm-025-084-*.json`.

`node --test server/*.test.mjs`: 364 passed, 5 skipped, 0 failed (369 total). Eight new scalability tests verify exact rollback, active combat, cargo/resource and troop conservation, roster lifecycle, 650 fog equivalence cases, hidden memory, concurrent durable commands, restart and realm isolation. The full 21-command `scripts/publish-tests.json` plan passed, including six offline publication checks and 16,750 portable presentation contracts. Unity compilation/native play/FPS and sustained soak are NOT TESTED. Schema 25, protocol 16 and 32-player caps remain. TM-025/TM-084 stay partial; next is mass-battle reliability/load and persistence/snapshot headroom.

A concurrent user commit had added the two private workbooks to origin/main. This package untracks them and ignores their paths while keeping their local files; earlier Git history is preserved. The publication guard permits private-file deletions and continues to block additions/modifications. No paid APIs, real saves, port 8091, or isolated-playtest script changes.


## Random city spawning - checkpoint A

Server-authoritative random points replace sequential city rows for new joins only. The bounded sampler checks four-unit city spacing, resource and permanent-structure footprints, gate-free access and reachable starter content. Saves/reconnect preserve original positions; rejected or rolled-back joins reserve nothing. Five deterministic/statistical tests cover 768 full-world placements and 240 first cities, plus persistence, full-land and kingdom isolation. Full Node suite: 369 passed, five platform skips, zero failures. All 22 publish-plan commands passed. Existing scenario fixtures explicitly retain authored legacy locations. Unity NOT TESTED for this server-only checkpoint. Details: `docs/random-city-spawns.md`.
