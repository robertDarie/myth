# Critical gameplay recovery — executed checkpoints

Initial recovery baseline: `bd1b157c2db54f81049b1b74a1b131cfe63d7288` (published Task4 QA), following clean gameplay audit `f5c0cdf75af286c33a9c116f46139ee40c8fbce1`. Date: 2026-11-16. **Recovery A safety subset and B server authorization implemented; full A–F NOT COMPLETE.** This is not certification of Tasks6–11.

## A — military routing safety subset

Root cause: `navigation.mjs` treated an empty corridor `gateId` as automatic permission. Dawn→Outer and Ashen→Outer therefore bypassed ownership. Move/gather/capture/PvP/rally admission also used destination province checks without necessarily validating the full route before accepting an order.

Changed actual production source:

- `navigation.mjs`: ordinary crossings require a nonempty gate ID, an existing open site and the owner's matching alliance. Missing metadata fails closed. Existing physical routes and home-return exemption remain.
- `marches.mjs`: move, camp attack, gather, beacon placement and site capture require a full authorized route before assigning/replacing the order.
- `war.mjs`: PvP targeting also checks the complete route; continuously reevaluated chase uses the same policy.
- `campaign.mjs`: rally target and assembly admission check complete routes. Existing garrison admission and continuous routing remain active.

No coordinate changes, numeric combat/economy changes, new pass defenders or migration. Frontier crossings lacking real pass objectives are **closed containment**, not functioning capturable passes. Seven provinces, ten corridor records and two physical Divine Gates remain. Full A requires a researched, compatible pass-objective/topology implementation. It must not be marked complete from this safety patch.

Red→green: original five new production-command tests ran against unmodified source: **2 PASS / 3 FAIL**. After fixes the same five passed. Added a sixth command-family test; final focused suite **24/24 PASS** across military-route-safety/exploration/world-map. Full server **404 total,399 PASS,0 FAIL,5 existing platform skips**,34,581.9225ms. Fresh production HTTP cooperation/authority/process restart **20/20 PASS** after changes. No test skipped to hide a defect.

Three old assertions contradicted the owner's corrected access requirement: one expected every empty-ID corridor traversable, one expected an impossible move accepted then canceled on tick, and one assumed gate-free frontier travel. Replaced those with explicit denial assertions, retaining positive movement on all explicitly controlled corridors, same-zone movement, gate-authorized routes and return-speed checks. Existing historical Task4 diagnostics remain red and dated; they are not rewritten to erase the old failure.

New permanent `server/military-route-safety.test.mjs` tests rejected frontier move preserving a prior local order; forged scout/return flags; all-map-edge alternatives; gather/capture/PvP/rally rejection; two consecutive existing legacy boundaries needing both open gates; revocation halting movement; saved stranded army conservation and safe fixed-home return. Coordinates, ownership and stage setup are explicit fixtures, **not** organic pass capture. The mandatory legitimate capture-of-two-new-frontier-passes scenario has not occurred.

Research/plan and source limitations: [military-route-safety](../../research/parity/features/military-route-safety.md). The subset is registered IMPLEMENTED; full Recovery A is not. Reference pass defenders/opening tables are UNKNOWN for a versioned baseline; no invented statistics substituted. Native post-fix pass play NOT TESTED. No full strategic-world parity claim.

## B — scout authorization correction

A safety subset published and independently remote-confirmed at `de42f6cf29cf524ba87d3313a4db15abac64e5f5`,35 publication checks. Continued B independently of missing new military pass objectives; no new defender or timer values needed.

Root cause: scout dispatch, automatic target choice, investigation, reconnaissance, ETA and ongoing travel reused military access checks. Added separate internal `scoutRoute`/`scoutTravel`, sharing physical corridor shortest-path/movement code but omitting alliance military ownership. All ordinary military APIs retain fail-closed policy, and client payloads cannot request the exemption. Scouts no longer cancel merely because an alliance loses a gate. Bounds, capacity, mission ownership, target protection, private recon, discovery duration and travel speed remain unchanged.

Original four new regressions: **0PASS/4FAIL red→4PASS/0FAIL green**. Added cross-pass cave discovery/investigation/one-time claim and private reconnaissance case afterward. Focused scout/findings/recon/exploration/military suites **41/41PASS**. Full server **409tests,404PASS,0FAIL,5platform skips**,31,776.7884ms. Extended fresh JSON/SQLite HTTP flow **22/22PASS**, including unaffiliated military denial, successful scout dispatch, foreign mission redirect denial and recall. No HTTP credentials/saves published.

Corrected old assertions that scouts must return on gate loss or be rejected by a closed kingdom gate; retained military denial and explicit manual recall/no-reward checks. The unchanged historical Task4 matrix/diagnostics remain dated under its evidence folder. Current matrix separates post-fix server proof from native NOTTESTED. Native cross-pass interaction and full4096-cell legal exploration remain unverified; local scout numerical parity is not certified. Research/expected unchanged inputs: [scout passage record](../../research/parity/features/scout-pass-access.md).

The first guarded B push was correctly blocked by a randomized multi-kingdom rally fixture: hard-coded target could be across a now-closed frontier, so the live scheduler canceled it before the isolation assertion. The fixture now chooses a target with a real authorized route and assembles at the leader's actual home. All original foreign-kingdom rejection/state assertions remain; corrected realms suite3/3PASS. This changes tests only, not military access. Publication must rerun the full plan; no failed push is claimed successful.

## C — learned secondary passive/level correction subset

B published as `a1bd3d4100e1de9ae6b8e40926eb8e8611a70135` plus fixture correction `192a3caec510e3567b8ec96d0bc6699bfeaa2840`; remote-confirmed36checks. C source baseline is192a3ca plus this publication.

Root causes: `World.stats` invoked only primary skill modifiers, multiplied companion damage/health by1+.01×level, and applied companion equipment. Corrected to evaluate secondary learned passives once with talents disabled, apply the existing original-character factors, and omit secondary level/gear/leadership bonuses. Primary-only unpaired results and all175 recorded Forsaken battle rows remain identical. Updated misleading native comparison/companion text; only primary active casts currently occur.

Six new tests red**0PASS/6FAIL**, then same six green**6/6**. Added primary-role coverage: seven tests now exercise every passive slot for all11implemented commanders in both primary and secondary positions using explicit recruited/star/material fixtures and actual paid skill-upgrade/assignment commands. Focused commander/armament/progression27/27PASS; full416tests411PASS/0FAIL/5platform skips,31,984.9216ms. Actual first-round PvP damage rises after offensive secondary upgrade, not just an ID-pair check. Primary-only gear/talent effects, fixed-skill level invariance and march capacity, unpair/removal, malformed/duplicate assignment regressions, save/load and inventory/XP/units conservation tested.

Rerunning all four original reconstructed defect probes now yields4/4PASS at the narrow historical requirement scope: unauthorized frontier move rejected; scout pass accepted; Wukong rank1→2 damage3249.792→3374.784; fixed-skill secondary level1/60 damage3124.8→3124.8. [Dated evidence](evidence/recovery/secondary-correction.json) records the tested parent+working-source fingerprint. This does **not** certify missing new pass objectives, organic commander acquisition or full combat parity.

No skill coefficient changed; existing local factor composition remains a disclosed numerical reference gap. On loading an old paired march, cap only absolute HP above its corrected derived maximum; no troop/ward/reserve/XP/inventory deletion, no HP increase. Schema27/protocol17 unchanged; repeated load is idempotent. See migration report and [research/acceptance record](../../research/parity/features/secondary-passive-correction.md).

Unity6000.3.0f1 batch compilation exited0; portable16,757 C#contracts and37publication checks passed. No rebuilt/new native executable was operated for this correction; native visual/stat-panel validation remains NOTTESTED. **Full Recovery C remains incomplete:** secondary active casts/timing, expertise and exact reference stacking are not certified. Indexed player accounts disagree on one-vs-two-turn timing; no guessed interval substituted.

## D — client map/camera source and geometry correction

C passive subset published/remote-confirmed at `0f9bbcd94c889dfec92273e3f4f05801485f195f`,37checks. Fixed minimap20-column mask/indexing, added truthful public province outlines/distinct known gate markers, cursor-anchored zoom and visible buttons with panel input protection. Real Unity tests reproduced a further fixed-height overview defect (rays below ground and failed constraint recovery), now corrected by scaling view altitude/far plane. Pure geometry12 new checks red→green; full portable16,769PASS; actual Unity13,774boundary checks now0errors, cursor drift2.420525→0.00001707194, blocked-scroll guard preserved. See [map/camera report](MAP_CAMERA_CORRECTION.md) for test commands and limitations.

Native post-fix input/HUD/appearance **NOTTESTED**; current desktop tool cannot obtain a foreground process ID. Original disposable client had exited, old scoped host shut down, only exact QA-changed display/server preferences restored; sessions/real saves preserved. Server-only observation confirms100trained reserves after normal elapsed time, not native completion. D remains partial until native acceptance. A clean package is built after source commit before guarded publication; no full alpha/parity readiness claim.

## E–F status and remaining task dependencies

- **B scout access: server functional scope verified**, native interaction and full reference numerical equivalence NOTTESTED/UNKNOWN. Scout send/redirect/auto/investigate/recon/recall no longer need military ownership.
- **C secondary passive/level/primary-only gear and talents: server subset verified.** Secondary active casts/timing and complete numerical/native parity remain unfinished; do not call the whole commander system complete.
- **D map/camera: source/Unity geometry corrected**, native feel/input/HUD acceptance NOTTESTED. See dedicated report; no false Windows interaction PASS.
- **E progression design: detailed dependency/migration record delivered, PLANNED**, complete numerical specification/implementation blocked by essential missing tables. Copying650 costs/times alone would produce an incompatible system.
- **F matrix revalidation: bounded current evidence delivered.** Legal fresh scouting now proves4096/4096fog cells and round-trip without injection; automatic local range stops at759cells and remains a disclosed reference gap. Fresh paid progression rerun827commands; native and full reference endgame still unverified. See [E/F verification](RECOVERY_E_F_VERIFICATION.md).

Tasks6–11 are authorized by the latest user continuation, but not completed by this report. Their original prerequisites require the preceding recovery and a complete versioned reference contract; those do not exist yet. [Reference blockers](ROK_PARITY_BLOCKERS.md) identifies the missing evidence. Do not label later milestones done or produce an invented100% result. No application queue has been created.

## Publication

Research gate binds the route fixture to a registered acceptance command. The first plan exposed the research-gate tests copying only two original feature records; their temporary repository setup now copies every registered document and fixture. All16 gate tests pass after this tooling fix. Mandatory plan now35 checks; guarded publication and independent remote verification are required. Reported source baseline plus this publication identifies tested code; actual resulting SHA is confirmed by the publisher/final report. No live save, account, port8091, public listener, firewall or private workbook altered. The previously launched disposable native client/host remain under user control.
