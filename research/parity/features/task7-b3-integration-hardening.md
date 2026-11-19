# Task7 B3 integration hardening

<!-- parity
{
  "id": "TASK7-B3-INTEGRATION-HARDENING",
  "description": "Exact supplied-timer settlement, defensive QA restore and concurrent real HTTP integration acceptance; no new reference balance",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN current live account; synthetic fixtures TEST_ONLY",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Not yet verified",
  "sources": [
    {
      "url": "https://gacha-data.com/rise-of-kingdoms/buildings/",
      "checked": "2026-11-19",
      "classification": "VERIFIED"
    },
    {
      "url": "https://gamerempire.net/rise-of-kingdoms-city-hall-guide-upgrade-requirements-rewards/",
      "checked": "2026-11-19",
      "classification": "VERIFIED"
    },
    {
      "url": "https://rokbuilder.com/tools/calculators/city-hall/",
      "checked": "2026-11-19",
      "classification": "VERIFIED"
    }
  ],
  "numeric_references": [
    {
      "quantity": "CH1\u20135 birth/prerequisites/modifiers and Academy unlock",
      "reference": "research/parity/task7-b3/REFERENCE_COLLECTION_PACKET.md",
      "classification": "CONFLICTING",
      "treatment": "Source-observed claims only; current binding UNKNOWN; no authentic birth profile or ordinary activation"
    },
    {
      "quantity": "Supplied QA timers/costs/production/training rows",
      "reference": "server/testing/reference-city-fixtures.mjs",
      "classification": "UNKNOWN",
      "treatment": "Explicit owner-authorized TEST_ONLY capability, not reference parity; unchanged numerical fixture"
    }
  ],
  "numeric_fixtures": [
    {
      "path": "server/testing/reference-city-fixtures.mjs",
      "checks": [
        "Task7 B3 concurrent production HTTP queues payments and save boundaries"
      ]
    },
    {
      "path": "docs/qa/evidence/task7-b3/http-matrix.json",
      "checks": [
        "Task7 B3 evidence and source-bound integration matrix"
      ]
    }
  ],
  "deviations": [
    {
      "decision": "Keep isolated synthetic QA and reject unsupported cross-profile actions",
      "reason": "Exercise authority safely without missing current reference values",
      "impact": "Normal kingdoms unchanged; military/capacity conversion remains blocked",
      "authority": "Task7 B3: Use explicitly labeled synthetic fixtures for capabilities not yet supported by verified current RoK values."
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "Task7 B3 concurrent production HTTP queues payments and save boundaries",
    "Task7 B3 evidence and source-bound integration matrix",
    "Task7 B1 isolated engine actions, authentication and persistence",
    "Task7 B2 integrated synthetic progression and legacy conservation",
    "Task7 B2 actual disposable process restart and receipt conservation"
  ],
  "covers": [
    "server/reference-city.mjs",
    "server/qa-reference-world.mjs"
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
City building, production, training and Academy queues; scoped correctness hardening of already authorized QA adapters. Plan recorded before edits in research/parity/task7-b3/PLAN.md.

## Reference version and sources
Exact links/dates above; source-observed claims VERIFIED as page content only. Current account version UNKNOWN. RoKBuilder derives GachaData and is not independent corroboration. See collection packet for conflicts. Existing B1 650-row matrix remains the numeric index.

## Verified mechanics and prerequisites
No new live RoK rule established. Supplied fixture prerequisites, costs and times are exact test contracts. A pending expired job settles before subsequent production; an accepted supplied zero-second job settles immediately. Corrupt QA saves with unlisted units or impossible completed/pending prerequisites fail before restoration.

## Numeric reference
No numeric source table changed. Synthetic11 independent buildings/25 ranks, four training lanes, one research lane/two workers remain TEST_ONLY. Actual HTTP test records12 concurrent retries, four trainers and seven simultaneous jobs. Full integrated270 paid upgrades/540commands retains existing B2 ledger.

## Formulas and modifiers
Existing supplied production, training and transfer equations unchanged. Test transfer debit=amount+ceil(amount/10), explicitly TEST_ONLY, not RoK tax. Zero-time completion accrues zero elapsed production; Farm2 supplied2food/s produces0.5food in0.25s after boundary completion, replacing erroneous old-level0.25. No unpublished reference equation asserted.

## Known uncertainties
Current account birth/tutorial initialization, nested CH1–5 requirements, unmodified times/effects and Academy4versus6 remain missing/conflicting. These block authentic progression and normal activation, not the scoped timer/validation repairs. Highest fully supported fresh reference City Hall remains unestablished; zero authentic reference upgrades demonstrated.

## Current Thrones of Myth behavior
Before fixes, remaining0 paid upgrades accrued old-level production; zero-second accepted jobs stayed pending and could not reload; malformed legacy command type returned500; unknown saved unit IDs/impossible completed prerequisites were accepted. Four regression tests reproduced these before edits.

## Planned Thrones of Myth behavior
Small fixes enforce existing supplied contracts, immediate due-job settlement and400 malformed types. Concurrent requests debit once; all owned facility/research/construction lanes work independently. Unsupported military/capacity/cross-profile economic interactions remain safely rejected. No ordinary reference profile selection.

## Differences and project decisions
Owner-approved synthetic QA only, as exact B3 quotation in approval file. Representational capability is not authentic progression. No new live balance or intentional reference deviation.

## Systems affected
Only isolated reference-city engine and QA World adapter runtime; no C# or normal World/index change. Production HTTP server/auth/custom store exercised, Unity interface compiled separately.

## Save migration
No schema or conversion; Option1 legacy cities/jobs/resources/troops/research/commanders/equipment/alliances remain intact. Valid old QA paid jobs retain semantics; malformed QA ledgers now reject. Zero-expired jobs complete exactly once before production. Disposable saves only; no real player data touched.

## Acceptance tests
New five-test file includes actual loopback HTTP plus clearly labeled expiry/corrupt fixtures. Lasting original B1 engine, B2 integration/process restart and270-upgrade conservation remain required. Evidence check reconciles fresh sanitized HTTP output, runtime hashes, Unity source fingerprint and blocked activation. Full publication plan required; test categories and native limits in docs/qa/TASK7_B3_REPORT.md.

## Implementation status
Implemented bounded QA hardening; no25-level ordinary activation. Publication and remote SHA reported separately. B3 native player interaction NOT TESTED; prior B2 native evidence remains dated, not reclassified.
