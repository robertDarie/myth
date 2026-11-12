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
