# Casualty accounting

<!-- parity
{
  "id": "CURSOR-TASK8B-HOSPITAL",
  "description": "Name the existing hospital share as severe wounds and keep a repeated treatment from healing twice",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live casualty capture on 2026-11-20.",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "The existing one-quarter class share moved into the House of Renewal, the bed formula, and the treatment food and gold quote", "reference": "Existing retreat, hospitalCapacity and hospital-heal in server/war.mjs.", "classification": "UNKNOWN", "treatment": "Unchanged. The remaining march is labeled a light wound. Dead counts stay zero."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/prototype-troops.json", "checks": ["a defeat keeps the existing hospital share and records the remaining march as light wounds"]}
  ],
  "deviations": [
    {"decision": "A saved wounded ledger remains the severe-wound ledger. Troops who stay on a recovering march are reported as light wounds. A treatment request id is stored only after the order is accepted.", "reason": "The live split among light wounds, severe wounds and deaths was not captured. A second delivery of the same treatment could spend again.", "impact": "Normal defeats still move the same soldiers once. Recovery still returns the same tier to reserves once. No soldier is deleted for overflow or killed by a new rule.", "authority": "Task 8B records the existing hospital transfer as severe wounds and the troops who remain with a recovering commander as light wounds, while fatalities stay blocked and healing costs, capacity and the retreat share stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "a repeated treatment request heals once and an old hospital save still loads",
    "a defeat keeps the existing hospital share and records the remaining march as light wounds"
  ],
  "covers": [
    "server/war.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Kingdom.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Warfare.cs"
  ],
  "coverage_ids": ["TM-043"]
}
-->

## Feature and RoK equivalent

Rise of Kingdoms separates troops who remain, troops who need a hospital, and troops who die. The live percentages, by battle type and by hospital overflow, were not captured.

## Reference version and sources

The App Store listing checked on 2026-11-17 names the game. This checkpoint did not open a live client.

## Verified mechanics and prerequisites

A field defeat already moves one quarter of each class into the wounded ledger and leaves the rest with the commander. The House of Renewal already treats one paid batch at a time, refuses a batch over its beds, refunds a cancellation once, and returns the same tier to reserves. Those rules still run.

## Numeric reference

The quarter share, the bed count of 25 plus 15 for each infirmary level, and the food and gold treatment quote stay on the existing prototype. No death percentage was added.

## Formulas and modifiers

Before equals the troops still with the commander, plus the hospital transfer, plus dead. Dead is zero and the fatality policy is BLOCKED. Light wounds are the same soldiers as the remaining march, so they are not added again. A treatment request id is kept after a successful order, up to 4096 ids, and the same id does not spend or open another job.

## Known uncertainties

Live light, severe, and dead ratios, hospital overflow deaths, and mode-specific casualty rules are unknown. Overflow patients continue to wait.

## Current Thrones of Myth behavior

Before this correction, the report said only that a portion was sent to the hospital. A second treatment command could start another batch when the ward was free. The wounded ledger was already the hospital.

## Planned Thrones of Myth behavior

Implemented. Reports name the remaining march, the hospital transfer, and a zero permanent loss, and they say fatalities are blocked. The hospital screen repeats the server policy. Treatment buttons send a request id.

## Differences and project decisions

Schema stays 28 and the protocol stays 17. Old reports without the new fields still load. Siege and a 25-level military track were not added.

## Systems affected

Field retreat reports, the hospital command, and the hospital and report screens. Combat damage, skill coefficients, and healing prices were not edited.

## Save migration

No schema change. A city without treatment receipts still loads. New successful treatments append ids on that city. Existing wounded soldiers and open treatment jobs stay.

## Acceptance tests

`node --test server/casualties.test.mjs` covers the unchanged quarter share, light and dead classification, one treatment per request id, reload, and an older report that omits the new fields. The registered checks are "a repeated treatment request heals once and an old hospital save still loads" and "a defeat keeps the existing hospital share and records the remaining march as light wounds".

## Implementation status

IMPLEMENTED. Partial parity. Native hospital clicks were not run. The Windows player was not rebuilt.
