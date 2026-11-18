# Task7 city development research

<!-- parity
{
  "id": "TASK7-CITY-PROGRESSION",
  "description": "CityHall25/independent buildings/research/economy target; source reconciliation and non-converting groundwork only",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN client binding; public source observations checked2026-11-18",
  "checked": "2026-11-18",
  "status": "IN_PROGRESS",
  "parity": "Not yet verified",
  "sources": [
    {
      "url": "https://gacha-data.com/rise-of-kingdoms/buildings/",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://www.gamesguideinfo.com/rise-of-kingdoms/building/120000289-Farm",
      "checked": "2026-11-18",
      "classification": "CORROBORATED"
    }
  ],
  "numeric_references": [
    {
      "quantity": "Source-specific CityHall/Farm/early technology observations",
      "reference": "research/parity/task7/observations.json and canonical ROK_NUMERICAL_REFERENCE.csv",
      "classification": "VERIFIED",
      "treatment": "Observations only; quantities retain individual labels/precision; current live binding UNKNOWN, conflicts block activation"
    }
  ],
  "numeric_fixtures": [],
  "deviations": [
    {
      "decision": "No new numerical behavior enabled; preserve existing progression pending exact evidence and migration decision",
      "reason": "Conflicting prerequisites and current-version/precision gaps",
      "impact": "Task7 remains incomplete; existing five-level behavior is not certified",
      "authority": "Owner Task7 requires zero undocumented approximations and explicit authorization before redefining old progress"
    }
  ],
  "essential_unknowns": [
    "Exact current reference build/mode prerequisites and timer modifiers",
    "Old combined-building/research migration decision"
  ],
  "acceptance_checks": [],
  "covers": [
    "server/city.mjs",
    "server/city-policy.mjs"
  ],
  "coverage_ids": [
    "TM-001"
  ]
}
-->

## Feature and RoK equivalent

CityHall1–25, independent buildings, Academy and economy. See ../task7/README.md for checkpoint scope; full Task7 is not implemented.

## Reference version and sources

All exact URLs, dates, access limits and independence caveats are in ../task7/observations.json. Neither the store build nor a changelog binds all rows.

## Verified mechanics and prerequisites

Published source observations only. CH3 and Academy unlock conflicts prevent ready status; T5 cannot be gated only by final CityHall.

## Numeric reference

Eighty-one classified scalar observations, including eleven official historical patch facts, appended to canonical dataset without replacing older conflicting rows; quantities explicitly retain UNKNOWN live binding.

## Formulas and modifiers

No guessed live formula. Current quote equations and unchanged-behavior acceptance are documented before the infrastructure extraction in ../task7/README.md.

## Known uncertainties

See explicit conflicts and precision in ../task7/observations.json; exact live construction stacking/rounding and collection/trade semantics remain open.

## Current Thrones of Myth behavior

Five-level Citadel;17combined institutions; prototype scaled costs/timers/research/auto-production. These remain mismatches, not new approved deviations.

## Planned Thrones of Myth behavior

First isolate current quote/maximum/prerequisite policy with exact output conservation; do not activate unknown25-level numerics. Then expand only complete verified reference slices and genuinely functional buildings.

## Differences and project decisions

No conversion or approximation authorized by this record. Explicit pending migration alternatives in ../task7/MIGRATION_PROPOSAL.md.

## Systems affected

City quotes/validation/payments/jobs, research, economy, training, power, military capacity, saves and native building UI.

## Save migration

No persisted migration at this checkpoint. Preserve old fields, levels, jobs and all assets. Future conversion requires owner decision and synthetic original-save conservation/idempotency/rollback.

## Acceptance tests

Canonical regeneration and research/contract gates first. For source groundwork: red-to-green tests of production policy plus baseline quote/prerequisite equivalence, actual legal command path, invalid/duplicate no-debit behavior and paid job restore. Native stays NOT TESTED until actually run.

## Implementation status

IN_PROGRESS overall; research/design available, no full parity. No source changes authorized by this incomplete numerical record; unchanged-behavior infrastructure must use an explicit narrow exemption.
