# Task7 B2 — real-game QA integration

Completed bounded engineering/QA scope2026-11-19, starting3b050272a027e158b4c947182c6bac34ef8f3482. Full Task7 and normal25-level activation remain incomplete. No Tasks8–10 gameplay changes.

## Checkpoints A–E

A: REFERENCE_FINDINGS.md and first-five-level-gaps.json extend the existing650-row matrix without closing unsupported cells. Current-account birth, tutorial charging/rewards, complete early prerequisites/modifiers/effects remain unverified. REFERENCE_COLLECTION_CHECKLIST.md specifies the actual-account screenshots/measurements needed. TrackA is BLOCKED before verified initialization; no reference-supported fresh level is claimed.

B: QaReferenceWorld subclasses the actual production World. Existing createGameServer supplies real /join, /world, /command, authentication, civilization selection, map identities, alliance roster and transactional persistence. New operator-selected QA joins bind privately to the supplied city engine. Actual World food/wood/stone/gold fields mirror one authoritative ledger; legacy city production is suppressed only for these QA actors. No player request selects a profile. Normal World/index and ordinary save schema remain untouched.

C: Actual Unity optional city panel supports independent selection, prerequisite/price inspection, upgrades, collection, training, research and paid queues. EXPERIMENTAL / TEST DATA labels remain visible. Controls require loopback. The dedicated QA build uses companyThronesOfMythQA/productThrones of Myth B2 QA to isolate PlayerPrefs/session keys. Actual Unity6000.3.0f1 DTO/command parsing and pass topology were run; source-bound JSON is retained. Native Greek entry/session resume, collection, Citadel2, Barracks1/trained reserve, Academy1/research1 completed after fixes. Short construction-countdown retest and full native server restart remain NOT TESTED after Windows detected user input. No backend case is promoted to nativePASS.

D: Seven functional integration tests pass, covering real identities, one resource authority, same-profile transfers, actual mixed alliance join/leave, denied incompatible actions, foreign actors/profile/clock overrides, negative/zero/overflow quantities, replay, saves and forced HTTP persistence failure rollback. One additional regression starts two actual disposable server processes: paidCitadel2/session/receipt survive crash+restart and replay cannot debit again. The ordinary save sentinel stays byte-identical. Native user's separate QA session is not stopped by these tests.

E: Integrated TrackB uses actual World commands, declared fixture birth and production/collection,270paid upgrades/540commands/11670simulated seconds across11buildings25. Clock is explicitly server-only outage/city simulation, not real-time native proof. Every upgrade's supplied effect, power delta and payment is asserted. A legacy player matches an ordinary World through identical elapsed time. Both profiles restore. TrackB is SYNTHETIC ENGINE CAPABILITY ONLY and cannot stand in for TrackA.

## Mixed-profile compatibility contract

- Identity/civilization/map presence: actual World IDs/sessions/coordinates retained. Private engine IDs/tokens never appear in snapshots. Own optional referenceCity data contains the supplied city state; ordinary cityLevel/age fields are not reinterpreted as25-level military progression.
- Alliance membership: real join/leave and legacy leadership management supported. A trusted operator can seed a disposable legacy founder and use its unchanged alliance-create command. Reference alliance creation is blocked because exact charge is unresolved.
- Transfers: same-reference-profile transfer executes the explicit synthetic tax/cap policy. Cross-profile transfer is BLOCKED in both directions; no invented exchange or duplicated ledgers.
- Troops: original World birth formations remain quarantined. Synthetic facilities create separate TEST_ONLY reserves, never deployable legacy troops. No tier/commander/army conversion is invented.
- Capacity/combat/reinforcement: reference military deployment, gather/PvE/PvP/rally/garrison and reinforcement are BLOCKED. Legacy commands targeting a reference identity/army are rejected before mutation. These denied cases prove isolation, not functional military parity.
- Research: supplied research affects only supplied city timer/production policies. It does not silently enter legacy combat/capacity. Legacy technology/units/capacity remain unchanged.
- Persistence: QA_REFERENCE_KINGDOM_V1 envelope stores actual World plus engine state. Normal loaders reject it; QA loader refuses ordinary saves. Identity bijection, immutable profile fingerprint and resource mirrors are validated. Existing five-level cities are not migrated. In-process checkpoints restore both authorities after failed persistence.
- Offline: explicit server catch-up finishes paid jobs and uses supplied production cap for reference actors; legacy offline policy remains separate. No client clock route exists. No claim these caps/formulas match RoK.

## Native defects and evidence

B2-QA-STAMP: client correctly rejected placeholder host SHA. HTTP regression failed before the host accepted an explicit full source stamp. CLI now stamps actual gitHEAD, and native connection succeeded without weakening client checks.

B2-QA-INPUT: hidden living-city picking consumed MouseDown before panel controls, so native clicks produced no engine receipts. Disable that legacy picker whenever referenceCity is present. Rebuilt corrected native client then selected buildings, collected446ordinary resources each, paid4/4/2/2forCitadel2, constructedBarracks/Academy, trained one reserve and completedresearch1. Screenshots and exact native limits: docs/qa/evidence/task7-b2/verification.json. A final attemptedAcademy2 click was interrupted and is NOT counted. Existing recursive ArmyData JsonUtility depth warnings remain logged; no unrelated DTO redesign or nativeFPS claim.

## Safe launch and retest

From repository root:

```powershell
node scripts/start-reference-game-qa.mjs --qa-reference-city
```

This ignores normal save-path/realm environment variables, creates a new disposable directory under work/task7-b2/kingdoms and binds only127.0.0.1. Open the separately built QA client against the printed address. Resume only a printed QA directory with `--resume <that-directory> --port <same-port>`; no manual file edits. Normal/unknown saves are refused. There is no HTTP profile switch or legacy-seeding command. A per-directory authority lock rejects a second live server; crash restart removes only a verified stale QA lock.

Build a fresh matching QA client with Unity6000.3.0f1 using executeMethodThronesOfMyth.Editor.WindowsPlaytestBuilder.BuildClientOnlyFromCommandLine, a fresh `-thronesClientPackage WindowsB2QA-<unique-suffix>` and `-thronesQaReferenceClient`. Launch its Game/ThronesOfMyth.exe with `--thrones-client-only --thrones-server http://127.0.0.1:<printed-port>`. Use a fresh dist folder; never the frozen Creator Preview.

The tested ignored binary is dist/WindowsB2QA-InputFixed/Game/ThronesOfMyth.exe, version0.45.0/protocol17/Unity6000.3.0f1, parentSHA3b05027 with modified-sources stamp. It is a QA artifact, not a clean release of the final commit. After publishing source, rebuild a fresh client at that commit to satisfy the unchanged source-version check against a newly started server. Source fingerprints and package hashes identify what was actually tested. Frozen Creator ZIP remains byte-identical.

## Manual remaining native checks

Use Greek cityB2 Native QA in the disposable host. Confirm EXPERIMENTAL banner. SelectFarm and inspect prerequisite; Collect stored production; selectCitadel and pay next eligible upgrade. Capture resource bank before/after and the paid countdown. Select a built trainer, trainone and capture payment/countdown/reserve. ConstructAcademy, start eligible research and capture lane occupancy/completion. Close only this QA client, stop only its dedicated server, restart with printed directory and same port, reopen matching client and resume the saved session. Confirm CityHall/building/research/reserve/resource state and no duplicate credit/debit. Capture screenshots/logs; do not use real saves, hosted kingdoms or force levels/resources. Military/transfer denial is expected under the compatibility contract. Native mixed-account membership/all25levels/map-rendering acceptance remains separate from this bounded city QA.


Additional mixed-restore regression reuses the existing production-command conservation script's legitimately earnedCitadel5 (53commands/3965seconds), accepts another real paid construction command, and copies that disposable legacy save into an explicitly prepared QA test envelope. New reference joins then coexist with it; original legacy fields/jobs/assets match ordinary World through the same time and restore. No direct maximum-state assignment or real-save migration is used. The production QA loader still refuses ordinary saves; this is test-container preparation only. World/city save clocks must also agree within1e-5seconds of floating-point accumulation tolerance; this is integrity validation, not a new gameplay timer.
