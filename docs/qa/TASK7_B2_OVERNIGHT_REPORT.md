# Task7 B2 overnight1/2 — production integration and clean native follow-up

Date2026-11-19. Requested original baseline3b050272a027e158b4c947182c6bac34ef8f3482; fetched/current starting main d59c114a7e2c15610aa22c4b0723108c70ab7d27. The B2 implementation was already published at this newer main, so its architecture and balances were preserved. This pass executes remaining native cases and strengthens acceptance evidence; it does not pretend a second integration implementation was necessary. Final record SHA is reported by the guarded publisher/remote confirmation.

## CheckpointA: working adapters

server/qa-reference-world.mjs adapts actual World identities, existing sessions/civilizations/map/alliance membership, independent building state, construction/research/training, one spendable resource authority, jobs, snapshots and saves. server/qa-reference-host.mjs uses production createGameServer and its transaction/rollback. Operator-only scripts/start-reference-game-qa.mjs creates a disposable loopback realm, guards profile selection, refuses ordinary save conversion, and locks one authority per QA directory. No synthetic values enter normal World/index. Seven existing functional integration tests were executed again, including genuinely earned legacyCitadel5/paid-job compatibility and resource rollback. The complete mandatory publication plan is rerun for this record.

## CheckpointB: actual clean Unity gameplay

Executable dist/WindowsB2QA-d59c114/Game/ThronesOfMyth.exe; sourceSHA d59c114a7e2c15610aa22c4b0723108c70ab7d27; dirty=false; version0.45.0/protocol17/Unity6000.3.0f1;145package file hashes verified. Dedicated QA product/preferences remain isolated. Mouse/keyboard inputs created a fresh Greek city through /join, selected buildings and used actual /command requests. The EXPERIMENTAL / TEST DATA banner was visible throughout.

Native commands: collect earned production53of each ordinary core resource; upgradeCitadel1→2; upgradeFarm1→2; constructAcademy1; constructBarracks1; trainoneTEST_ONLY reserve; researchtest-writing1. Farm construction visibly counted down with1.3seconds remaining and paid4food/4wood/2stone/2gold. Research visibly showed9.2seconds remaining and its paid cost. Seven receipts persisted. All costs derive from the disclosed synthetic fixture, not RoK parity tables. The evidence check computes the expected bank from supplied quotes and verifies screenshots/hashes/recorded states.

## CheckpointC: native restart and preserved state

Stopped only the newly created overnight QA server, restarted its own marked QA directory on the same loopback port, and observed the still-running native client recover. Then closed/reopened only the clean QA client and resumed its saved session. The restored UI showed Citadel2, Farm2, Academy1, Barracks1, completedtest-writing1, oneTEST_ONLY_barracks reserve, no remaining paid jobs and bank36food/37wood/46stone/46gold. No repeated debit, duplicated credit or new city was observed. QA envelope privately validates World→engine identity binding; sanitized verification contains no credentials/tokens/save export. Both overnight-owned processes were closed after verification. Earlier unrelated sessions and real saves were not touched.

This closes the earlier construction-countdown and native server-restart NOT TESTED city cases. Historical failed-to-execute observations remain historical. Native all25levels, mixed-account alliance/warfare and complete map rendering are not certified by this city test. The original B2 native verdict remains PARTIAL for that broader scope.

## CheckpointD: reference-supported progression and blockers

No fully reference-supported fresh-account CityHall initialization or upgrade was completed. Exact birth state/charging/tutorial grants, complete early prerequisites and dependencies, Academy4vs6/2svs6s contradictions, production/collection/offline semantics and modifier behavior remain unresolved. Reference-supported highest level is NOT ESTABLISHED, not syntheticCitadel2. See research/parity/task7-b2/REFERENCE_COLLECTION_CHECKLIST.md and first-five-level-gaps.json. No new source evidence was supplied that resolves these current-account requirements.

Separate engine track remains270paid upgrades/540commands/11670simulated seconds across11buildings25, using actual integrated World commands and production/collection from declared synthetic birth. It is not RoK gameplay parity. Same-profile fixture transfers are tested; cross-profile transfer/military/capacity/combat/reinforcement remain explicitly blocked rather than accepted with inconsistent rules. Ordinary cities remain legacy5; no automatic migration, loss of paid jobs/assets or normal25activation.

## Evidence and retained limits

New proof: docs/qa/evidence/task7-b2-overnight/verification.json and four native screenshots. Existing B2 reference findings, requirements matrix, approved migration and actual Unity compilation remain authoritative at their recorded source/date. No art/audio, normal balance, frozen Creator Preview, private workbook, real save or Tasks8–10 code changes. Full Task7 remains incomplete. This record adds executed verification to the already implemented production integration boundary.
