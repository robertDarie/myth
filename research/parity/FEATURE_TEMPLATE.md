# Feature research and implementation record

Copy to features/<stable-slug>.md, register it, and replace every placeholder before using it as evidence. Fill the plan before new gameplay edits. The metadata is machine-checked; the sections carry the reviewable explanation.

<!-- parity
{
  "id": "REPLACE_ME",
  "description": "REPLACE_ME",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN; state the actual reference version/access limit",
  "checked": "YYYY-MM-DD",
  "status": "PLANNED",
  "parity": "Not yet verified",
  "sources": [
    {
      "url": "https://example.invalid/REPLACE_ME",
      "checked": "YYYY-MM-DD",
      "classification": "UNKNOWN"
    }
  ],
  "numeric_references": [
    {
      "quantity": "REPLACE_ME",
      "reference": "Link the exact source table or established missing data",
      "classification": "UNKNOWN",
      "treatment": "State whether exactness is essential, the blocker or approved approximation"
    }
  ],
  "numeric_fixtures": [],
  "deviations": [
    {
      "decision": "REPLACE_ME",
      "reason": "REPLACE_ME",
      "impact": "REPLACE_ME",
      "authority": "REPLACE_ME"
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [],
  "covers": [
    "server/REPLACE_ME.mjs"
  ],
  "coverage_ids": [
    "REPLACE_ME"
  ]
}
-->

## Feature and RoK equivalent

Feature ID, description, equivalent mechanic and actual player/UI sequence.

## Reference version and sources

Exact URLs, date, reference build/version, evidence type/independence and access limitations.

## Verified mechanics and prerequisites

Unlocks, progression, interactions, exceptions and prerequisites with labels.

## Numeric reference

Link source-linked level tables/fixtures; identify each quantity and classification. Never replace a missing value with false precision.

## Formulas and modifiers

Expected equations, modifiers, units and concrete calculated examples; distinguish source formulas from estimates.

## Known uncertainties

List conflicts and missing data. Essential exact unknowns go in essential_unknowns and block implementation-ready status.

## Current Thrones of Myth behavior

Current code values/formulas and exact behavior, including dependent systems.

## Planned Thrones of Myth behavior

Concrete planned tables/formulas/limits/costs/timers and expected differences.

## Differences and project decisions

For every deviation record decision, reason, impact and actual user/project authority. No self-approved exactness claim.

## Systems affected

List mechanics, client/server/UI, economy, persistence and other downstream dependencies.

## Save migration

Schema/content versions, legacy units/jobs/reports, conversion, conservation, rollback and restart requirements.

## Acceptance tests

Deterministic formula assertions, representative real gameplay simulations, negative/privacy/retry cases, numeric tolerances and registered publication test names. Bind numeric_fixtures to registered checks before IMPLEMENTED.

## Implementation status

PLANNED / IN_PROGRESS / IMPLEMENTED, separate parity status, measured results, commands actually run, remaining work and honest native/player verification.
