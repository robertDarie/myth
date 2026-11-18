# Task7 B2 real-game QA integration

<!-- parity
{
  "id": "TASK7-B2-REAL-GAME-QA",
  "description": "Opt-in loopback QA kingdom integrating supplied reference-city engine with actual World HTTP/auth/identities/civilizations/map/alliance membership and Unity; normal activation disabled",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN current account binding; synthetic fixtures TEST_ONLY; additional source inspection2026-11-18",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Not yet verified",
  "sources": [
    {
      "url": "https://gacha-data.com/rise-of-kingdoms/buildings/",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://www.gamesguideinfo.com/rise-of-kingdoms/building/120000287-City-Hall",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://gamerempire.net/rise-of-kingdoms-city-hall-guide-upgrade-requirements-rewards/",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    }
  ],
  "numeric_references": [
    {
      "quantity": "CH1–5 published costs/time/cumulative versus increment power and incomplete dependencies",
      "reference": "research/parity/task7-b2/REFERENCE_FINDINGS.md; research/parity/task7-b1/requirements-matrix.json",
      "classification": "UNKNOWN",
      "treatment": "Exact current-account initialization/effects/modifiers missing; explicit historical claims retained, no full birth profile or normal activation."
    },
    {
      "quantity": "Synthetic25-level supplied fixture, production/training/research/transfer formulas",
      "reference": "server/testing/reference-city-fixtures.mjs; research/parity/features/task7-b1-experimental-city.md",
      "classification": "UNKNOWN",
      "treatment": "TEST_ONLY semantics under explicit owner QA authority, never approximate RoK balance. Unsupported military/capacity/cross-profile conversions blocked."
    }
  ],
  "numeric_fixtures": [
    {
      "path": "server/testing/reference-city-fixtures.mjs",
      "checks": [
        "Task7 B2 real World mixed-profile authentication payments and rollback",
        "Task7 B2 integrated synthetic progression and legacy conservation"
      ]
    },
    {
      "path": "docs/qa/evidence/task7-b2/track-a.json",
      "checks": [
        "Task7 B2 actual Unity interface and source-bound QA evidence"
      ]
    },
    {
      "path": "research/parity/task7-b2/first-five-level-gaps.json",
      "checks": [
        "Task7 B2 actual Unity interface and source-bound QA evidence"
      ]
    }
  ],
  "deviations": [
    {
      "decision": "Integrate synthetic reference engine only in isolated operator-selected QA World; block unsupported cross-profile actions",
      "reason": "Real integration can be tested without claiming unknown reference mechanics or altering normal cities",
      "impact": "Actual World identities/civilizations/map/alliance join/leave and HTTP commands work. Military conversion/capacity/combat/reinforcement, cross-profile transfers and reference alliance-creation charge remain blocked. Existing birth troops quarantined; synthetic reserves not deployable.",
      "authority": "For now, keep experimental reference data behind an explicitly isolated QA-only mode. If a dependency cannot safely be supported, explicitly block the corresponding cross-profile action in QA rather than accepting inconsistent outcomes."
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "Task7 B2 real World mixed-profile authentication payments and rollback",
    "Task7 B2 integrated synthetic progression and legacy conservation",
    "Task7 B2 actual Unity interface and source-bound QA evidence",
    "Task7 production city policy legacy quote and package closure regressions",
    "Task7 immutable historical source and legal legacy progression conservation",
    "Task7 B1 isolated engine actions, authentication and persistence",
    "Task7 B2 actual disposable process restart and receipt conservation"
  ],
  "covers": [
    "server/qa-reference-world.mjs",
    "server/qa-reference-host.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.ReferenceCityQa.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.CityExperience.cs"
  ],
  "coverage_ids": [
    "TM-027",
    "TM-029",
    "TM-031",
    "TM-064"
  ]
}
-->

## Feature and RoK equivalent

Real-game independent city progression integration. Preimplementation design is ../task7-b2/PLAN.md; that plan preceded source edits. This record scopes only owner-authorized QA functionality, not a complete reference specification.

## Reference version and sources

../task7-b2/REFERENCE_FINDINGS.md records dated public observations, exact URLs, lineage and limitations. Current RoK build/tutorial variant/account state UNKNOWN. No protected API, paid service, credentials or actual player save used.

## Verified mechanics and prerequisites

Additional sources give explicit historical initialCH1/no charge, CH2/no building prerequisites and CH3Wall2 claims, while extracted current-looking tables leave dependency cells blank and place AcademyCH6. None is a direct current-client birth measurement. Follow the collection checklist rather than selecting a convenient chain.

## Numeric reference

Reuse B1 requirements-matrix.json and canonical observations; no interpolated reference rows. Synthetic fixture supplies every engine number exactly. QA-only default World birth units remain quarantined, not converted; they are not reference starting units. Mana/Aether identities unchanged.

## Formulas and modifiers

No new reference formula. Supplied B1 engine policies control reference four-resource bank, production, workers, paid timers, training/research and same-profile transfers. Actual World resource fields mirror that single authority; legacy production for these QA actors is disabled. Legacy players retain their existing policy. World time and engine time are server-controlled; outage completion is separately disclosed.

## Known uncertainties

Birth initialization/charging/rewards/tutorial skips, CH2 prerequisite completeness, CH3 conflict, Academy4vs6/2svs6s, producer/collection/offline rules, exact modifier stacking, complete technology DAG and military conversions remain blockers for normal reference activation. Empty essential_unknowns applies ONLY to explicit supplied-fixture QA boundaries, not full Task7. TrackA reports no established fresh level.

## Current Thrones of Myth behavior

Normal World/index/http/storage behavior and ordinary new/legacy profiles remain unchanged. QaReferenceWorld subclasses actual World; suppliedStore uses existing createGameServer with real session authorization and snapshots. No client profile selector or hosted fixture activation route.

## Planned Thrones of Myth behavior

Operator opt-in loopback host selects synthetic profile for new joins; trusted seedLegacyPlayer supplies disposable legacy comparison accounts. Real world IDs bind internally to engine IDs/tokens; private engine credentials never enter snapshots. Unity optional QA city panel has a prominent banner and paid commands via /command. Ordinary clients retain existing city flow.

## Differences and project decisions

Owner B2 explicitly authorizes QA-only integration and blocking incompatible dependencies. Same-profile synthetic trade is supported; cross-profile transfers and military use are rejected before mutation. Reference alliance membership can use a legacy-created QA alliance; reference creation remains blocked rather than inventing its charge. Temporary Option1 legacy preservation remains in force.

## Systems affected

New QA World/host/store and disposable CLI; optional Unity model/panel and native QA product namespace. Actual HTTP/auth, civilization selection, map identity and alliance membership are reused. No Tasks8–10 behavior implemented.

## Save migration

QA_REFERENCE_KINGDOM_V1 envelope stores both real World and engine authority; normal World rejects it. QA store refuses ordinary/unknown saves and cross-format loading; no automatic conversion. Same profile fingerprint, identity bijection and resource mirrors required. Plain checkpoint state supports actual HTTP persistence rollback and cache invalidation. Real saves never opened. Dedicated QA Unity product uses a separate PlayerPrefs namespace.

## Acceptance tests

Functional tests cover real identities/resources, mixed membership, denied cross-profile transfer/combat/reinforcement, same-profile debit/tax, legacy units/research/capacity conservation, foreign actor/profile/clock/negative requests, retry, disk restart, ordinary-save refusal and forced persistence rollback through real HTTP. Integrated TrackB270paid upgrades/540commands/11670server offline-simulation seconds matches ordinary-World legacy ledgers. Actual Unity parses production DTOs/queues and command receipts; native actions are recorded separately. Native-found source stamp and click interception defects require measured retest; never count backend tests as native PASS.

## Implementation status

IMPLEMENTED for bounded real-game QA integration. Seven integration tests and actual two-process crash/restart pass; native selection/collection/paid construction/training/research observed after fixing click interception. Native construction-countdown retest and full native server restart NOT TESTED after user-input interruption. Full Task7 and normal25 activation remain disabled. TrackA blocked before verified birth. See ../task7-b2/ and docs/qa/evidence/task7-b2/.

## Versioned contract binding

ROK-CITY-LEVELS-1-25 remains incomplete; publication_scope binds only explicit owner-approved synthetic QA integration. No gate weakened and no full parity status assigned. Production deployment remains unchanged.


## Overnight1/2 B2 follow-up —2026-11-19

Fetched clean d59c114a7e2c15610aa22c4b0723108c70ab7d27 (original requested baseline3b05027). Existing production-compatible adapters/Unity implementation already published atd59c114 were preserved. Completed the remaining city-QA checks on its clean protocol17/Unity6000.3.0f1 Windows client: observed real Farm2 paid construction countdown1.3seconds, then restarted the dedicated server process and the Unity client. Native session resumed with Citadel2/Farm2/Academy1/Barracks1/research1/reserve1 and exact36food/37wood/46stone/46gold. Seven accepted native command receipts reconcile against actual supplied test quotes; no grants or injected levels. Added that deterministic reconciliation to the existing B2 publication evidence check. Native all25levels/mixed warfare/alliance/map acceptance remains unverified; TrackA birth remains blocked and normal25activation disabled. Real saves, art/audio implementation, frozen Creator ZIP and Tasks8–10 untouched. docs/qa/TASK7_B2_OVERNIGHT_REPORT.md.
