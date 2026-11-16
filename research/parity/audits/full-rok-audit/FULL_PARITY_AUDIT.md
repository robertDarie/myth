# Full RoK parity audit — expanded results for review

## Current report, 2026-11-16

Audited main: **`384d023030fa42922f62ed56175147e48b75fb4e`**. **Verdict: substantial mechanical/numerical gaps; full parity NOT CERTIFIED.** This run produced the expanded source inventory, reference observations, production-command simulations, workbook and validation. Reference verification remains partial; this is not an approval to rebalance gameplay. Read [SUBSYSTEM_AUDIT.md](SUBSYSTEM_AUDIT.md) for every requested area A–Q and [PROGRESSION_SIMULATIONS.md](PROGRESSION_SIMULATIONS.md) for actual clock/fixture boundaries.

### Inventory and numerical coverage

- **124 local behavior groups / 17 subsystems**, with paths, gaps and tests in `feature-inventory.csv`. These are not the complete RoK reference denominator.
- **44 non-test server modules**, exports and hashes in `source-module-inventory.csv`; **784 historical register rows** reconciled without automatically treating art, architecture or questions as implemented gameplay.
- **1,187 parameter/level comparison rows**: six narrow T1 raw-input matches, four rarity-specific talent endpoint mismatches,1,177 UNKNOWN reference cells. Four talent rows represent one endpoint quantity, now CORROBORATED by two independently published community guides.
- **1,859 exported numeric definition fields** and **258 exported functions** are separately indexed. Legacy/default values are labeled separately from effective profile1 overrides. Functions include validators and transitions, not258 recovered RoK equations. These datasets overlap; do not sum them into a unique-mechanic denominator.
- **650 building-level source rows**:26 categories ×25 levels, with four ordinary-resource costs and base seconds, or3,250 scalar cost/time observations. Every row has a source URL/date;26 actual page reads have hashes. One secondary extraction does not certify the current live game. Seasonal applicability, prerequisites, special materials and modifiers require separate verification.
- **150 City Hall comparison rows**:20 comparable local level2–5 cost/time mismatches,120 rows with no local levels6–25, ten without a meaningful local upgrade counterpart or resolved power interpretation. These overlap the building observations. Across the two comparison matrices,24 compared rows mismatch, including repeated rarity endpoint comparisons. No full-game percentage is inferred.

Unknown numeric fields remain blank, not zero. Published building power is not treated as a verified incremental power-gain formula. The source/transcription cross-check caught and corrected a two-hour level23 timer transcription error.

### Actual progression and coherence

Fresh Greek city; production join and commands; no assigned resources, XP, buildings, troop ledgers, positions or fog. First hour:14,400 quarter-second production ticks with matching injectable wall clock. Later:five-minute city reconnections using production offline catch-up, not offline field combat. Observed Citadel3 at30minutes,4 at one hour, current maximum5 by one day. By one month this policy reaches every local building maximum, all42 technology ranks and2,000 T5 infantry in reserves. All six milestones restart without changing city level or deployed typed units.

Five paid infantry orders demonstrate T1–T5: first100 T1 cost5,000 food+5,000 wood and take1,500seconds; its completion is observed before30minutes. The full purchase/job ledger is recorded. Commander XP remains200 from two early victories under this policy. Reference first-hour/day/week/month trajectories are UNKNOWN. One reachable local path does not demonstrate every class, optimal pacing, full native progression or RoK-equivalent economic coherence. The15 requested scenario categories are individually accounted for; forts, hospitals, alliances and multiple marches use disclosed existing fixtures/integration tests where not organically reached.

### Confirmed gaps and new source conflicts

The four reconstructed pass/scout/secondary requirements still **FAIL** on production commands/stats. The military frontier crossing again arrives in98 quarter-second ticks; Wukong's upgraded passive remains inert; skill-independent secondary level scaling remains. Native minimap source still uses20-cell assumptions against64-cell server fog. Windows zoom is locally UNTESTED.

Current progression is **not coherently RoK-equivalent**: five functional city levels,17 technologies, three mortal classes,12 talent points at60, original power and aggregate damage assumptions do not reproduce the reference system. Missing siege, complete alliance research/gifts/credits, separate special-PvE categories, VIP and true KvK remain visible gaps.

New AP conflict: local1500/36 matches one guide; other published sources describe1000 and approximately45seconds unmodified. Version/VIP/recovery-cap/item-overflow/refund semantics remain unresolved. The Forsaken evidence now labels this CONFLICTING without changing gameplay. A separate FAQ denies secondary active casts, while another guide and indexed skill descriptions support them. Exact sequencing requires controlled reference observation. See `ROK_SOURCES.md`; no convenient source is silently selected.

### Tests and evidence limits

The untouched baseline's full run found398 tests:392 pass,1 fail,5 existing skips. The failing HTTP kingdom test assumed random cities could not see a gate. The observed gate was legitimately visible. Test-only maintenance now uses the same deterministic legacy spawn fixture as neighboring tests before joining through HTTP; the privacy assertion remains intact. Focused kingdom suite:7/7. Complete post-correction run: **398 tests,393 pass,0 fail,5 existing platform skips**,24,172.8278ms. No production code, schema, protocol, live saves or hosting changed.

Dataset checks verify IDs/types/blank handling, exact differences,25 levels/category, parsed-source/transcription agreement, actual purchase costs, five trained tiers, six clock milestones/restarts and workbook/CSV agreement. They cannot establish external source truth. The workbook now has10 sheets; affected views are rendered and visually inspected, formulas recalculated and scanned. Final publication-plan results are in the development report and guarded publisher output. Portable C# contracts remain separate from actual Unity rendering.

No new Unity compile, native Windows/Linux interaction or remote human multiplayer was performed. Discarded sandbox/wrong-directory invocations are not reported as passing evidence. Raw local logs and previews remain under ignored `work/task3/`.

### Correction order and unresolved evidence

The ten dependency-ordered packages are detailed in `CORRECTION_ROADMAP.md`: conservation/restart invariants; military pass graph; separate scout authorization; real secondary skill rules; minimap/camera; commander progression; coupled25-level city/building/research/siege/economy; AP/gathering/rewards; special-PvE/alliance progression; full native/multiplayer/mode-specific event verification. Preserve city positions, typed ledgers, earned XP, inventories, paid jobs, ownership and historical reports; archive pre-migration bytes and prove idempotency/rollback before any migration.

The current live RoK build is genuinely unavailable here; no reference client/account or versioned gameplay captures were operated. Hidden combat/drop/spawn algorithms and complete prerequisite/star-material/technology/modifier/season tables remain unverified. The full numerical verification requested by Task3 therefore remains **incomplete**; the expanded audit exposes those requirements rather than substituting estimates. Further independent source evidence and review are needed before exact parity claims or a mass rebuild. Existing Task6–11 prompts are not application jobs and are not described as an application queue.

The historical initial checkpoint below is retained for chronology. Its INCOMPLETE status and smaller workbook describe that earlier checkpoint, not the scope executed above.

---

## Historical initial checkpoint

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
