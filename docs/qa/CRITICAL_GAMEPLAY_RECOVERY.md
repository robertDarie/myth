# Critical gameplay recovery — executed checkpoints

Initial recovery baseline: `bd1b157c2db54f81049b1b74a1b131cfe63d7288` (published Task4 QA), following clean gameplay audit `f5c0cdf75af286c33a9c116f46139ee40c8fbce1`. Date: 2026-11-16. **Recovery A safety subset implemented; full A–F NOT COMPLETE.** This is not certification of Tasks6–11.

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

## B–F status and remaining task dependencies

- **B scout access: unfinished.** Existing scout military gate restriction remains; route containment also closes unknown corridor edges for scouts until a separate explicit scout routing policy is implemented. This is recorded as unresolved, not silently hidden by the military fix.
- **C secondary skills: unfinished.** Both skill contribution and blanket level multiplier defects remain. Must verify active timing, passive families, primary-only talent/gear effects and save compatibility before changing them.
- **D native map/camera: unfinished.** Legacy minimap overlay assumptions and reported Windows wheel issue remain. UI tool detected user input; no exclusive native control result. No new client build was made for this server-only patch; protocol unchanged.
- **E progression design: unfinished.** Building table observations exist but complete prerequisites, output/power/capacity, all research, modifiers and deterministic old-age migration are not yet independently established. Copying650 costs/times alone would produce an incompatible system.
- **F matrix revalidation: partial.** Task4's41 rows are preserved as dated baseline; current movement row records containment separately. Overall native, full progression and reference parity remain unverified.

Tasks6–11 are authorized by the latest user continuation, but not completed by this report. Their original prerequisites require the preceding recovery and a complete versioned reference contract; those do not exist yet. [Reference blockers](ROK_PARITY_BLOCKERS.md) identifies the missing evidence. Do not label later milestones done or produce an invented100% result. No application queue has been created.

## Publication

Research gate binds the route fixture to a registered acceptance command. The first plan exposed the research-gate tests copying only two original feature records; their temporary repository setup now copies every registered document and fixture. All16 gate tests pass after this tooling fix. Mandatory plan now35 checks; guarded publication and independent remote verification are required. Reported source baseline plus this publication identifies tested code; actual resulting SHA is confirmed by the publisher/final report. No live save, account, port8091, public listener, firewall or private workbook altered. The previously launched disposable native client/host remain under user control.
