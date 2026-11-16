# Full RoK parity audit — work in progress

Date: 2026-11-16. Audited main and fetched origin/main: `1e345c6347f0d8673a541b68768eb5450742656c`.

**Task 3 is INCOMPLETE. This directory is an initial reproducible baseline, not a completed full audit, an implementation approval, or an alpha certification. Task 4 and recovery checkpoints A–F have not started.** The user explicitly chose to finish Tasks 3 and 4 before recovery. Gameplay source, real saves, live servers, hosting and authentication have not been changed.

## Evidence collected

The three supplied November 15 retest documents were read as external evidence. Their unavailable scripts and screenshots were not executed or inspected. The ZIP itself was not supplied in this request; its manifest/hash verification remains the independent tester's report, not a new local package verification. The dirty-source manifest prevents assuming the executable exactly matches its recorded source commit.

`node scripts/parity-audit-baseline.mjs research/parity/audits/full-rok-audit` reconstructs four focused probes against production World, commands, routing, ticks and stat calculation. It uses isolated in-memory worlds with explicitly prepared coordinates and commander state. **All four desired gameplay requirements FAIL** in `diagnostics.json`:

- Unaffiliated military crossing Dawn Reach (128,30) → Outer Marches (128,128) is accepted and arrives after 98 quarter-second ticks, through (128,79) and (128,81).
- Scout dispatch (20,20) → (50,20) rejects with the military Divine Gate error.
- A paired secondary offensive passive rank 1 → 2 leaves damage unchanged at 3156.048. The exact magnitude differs from the tester's prepared primary; the inert skill effect reproduces.
- With unchanged secondary skills, secondary level 1 → 60 changes damage 3156.048 → 4999.68. Relative to no secondary, the local multipliers are 1.01 and 1.60. Their quotient is 1.5841584158415842; it is incorrect to describe that quotient itself as a 60% increase.

These are diagnostic failures, not passing acceptance tests. Pairing uses the real command, but skill ranks and XP are prepared directly. No claim is made about an organically purchased skill upgrade or native animations.

Source inspection also confirms the minimap's 20-cell loops/indexing while the server fog width is 64. Windows wheel behavior remains user-reported and locally NOT TESTED. The published world still has two physical gate sites and two corridors with empty gate IDs.

## Numerical extraction scope

`parity-matrix.csv` contains 1,187 parameter/level records evaluated from the current production source, not copied from the old workbook. The corresponding `matrix.json` is the reproducible typed intermediate. It includes each locally available building upgrade cost/time, each local research rank cost/time, all 15 local troop types' reference-profile stats/costs, four rarities' cumulative XP and talent capacity through level 60, commander capacity at every level, representative age/commander march capacities, and all scout-camp profile rows.

Ten rows have newly inspected single-source numerical evidence: six generic T1 infantry raw inputs and the level-60 talent capacity comparison for each of four rarities. This is seven distinct reference quantities, not ten independently corroborated facts. Six input rows match; four talent rows mismatch (12 versus 74). **1,177 rows still have UNKNOWN reference values.** Blank reference fields mean missing evidence, never zero. Matching raw troop inputs does not verify movement speed, damage resolution, training progression or total-system parity.

This is not yet an inventory of every implemented numerical mechanic. Buildings above the current local cap, full reference technology, rewards, events, alliance technology, hospitals, item economics, hidden combat and spawn rules remain to be researched and added. The existing coverage register has 783 rows across mixed research, architecture, visual, open-question and gameplay sheets; 783 must not be reported as 783 implemented gameplay features. Its implementation labels require fresh source-to-feature review.

## Current regression baseline

Node 24.18.0. Command, run from `server/` with loopback permitted:

`node --test --test-concurrency=4`

Result: **397 tests, 388 passed, 4 failed, 5 existing platform skips, 0 cancelled**, duration 29,358.7714 ms. The first sandbox-restricted attempt was interrupted after environment-sensitive failures and is not a successful baseline. The completed loopback-capable run is the reported result. Raw log is local ignored `work/task3/server-tests.log`.

All four failures throw `Invalid saved Forsaken patrol` during `World.fromSave`:

- ordinary names and stable IDs survive old numeric saves; level locks and first clear are authoritative;
- two owned marches each pay once and earn their own legitimate loot; first-clear and kill credit pay once per owner;
- defeat, wounds, encounter membership and AP entitlement survive restart without a free retry;
- failed durable victory restores health, loot, XP, unlocks and receipts; recovery pays once.

The fixture relocates a camp to (22,22), while the current population validator requires current/anchor/target coordinates to stay inside its recorded province and three-unit patrol radius. This explains the failing validation path; it does **not** prove a legitimate production save is corrupt. A separate fresh-world save/reload probe preserves its player and position.

The test-only correction now relocates the entire authored patrol frame, including its province, with the camp. No existing assertion or production validator changed. An added test verifies both successful fixture round-trip and rejection of a camp moved four units from its anchor. Red: four baseline failures above. Green: focused Forsaken suite 8/8; full server suite **398 tests, 393 passed, 0 failed, 5 existing platform skips**, 29,083.3209 ms. These results restore regression validity; they do not fix or clear any of the four gameplay diagnostics.

`python -X utf8 scripts/publish_task.py` completed **31 required checks**, including the new dataset consistency check and 16,757 portable C# presentation contracts. These are not a new Unity compile or native rendering test.

## Remaining Task 3 work

Complete the authoritative feature inventory; independently inspect level tables and conflicts; fill all numerical subsystems with proper units and dependencies; add comprehensive formula examples and legal progression time series; finish the dependency/migration roadmap and independent review. The initial XLSX now contains three filterable/readable views of this limited baseline, with an explicit IN PROGRESS cover. All three sheets were rendered and visually inspected; summary counts recalculate and the formula-error scan found no matches. This is an initial workbook, not complete audit coverage. Publication of a verified baseline checkpoint does not complete Task 3.

Task 4 subsequently needs real disposable first-session, native Windows and multi-client evidence. The supplied Linux evidence may be attributed but cannot replace new Windows testing. No remote human multiplayer certification is available. Recovery implementation remains queued after those tasks and the audit review requirement.
