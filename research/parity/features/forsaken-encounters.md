# Forsaken search and encounter participation

<!-- parity
{
  "id": "CURSOR-NIGHT-2-FORSAKEN",
  "description": "Player search and march to a lawful Forsaken without new drop rates or enemy stats",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. Ordinary rows already recorded in the Forsaken numeric evidence. No new live client capture on 2026-11-19.",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://riseofkingdoms.fandom.com/wiki/Barbarians", "checked": "2026-11-14", "classification": "VERIFIED"},
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "Ordinary levels 1-25, AP 50 and commander XP 100 per level", "reference": "Existing server/numerics.mjs referenceCamp rows and server/forsaken.mjs admission. Not re-measured on a live client tonight.", "classification": "VERIFIED", "treatment": "Kept. The search correction does not retune them."},
    {"quantity": "Hidden spawn density, patrol speed, rare drop chance and fort/guardian/boss tables", "reference": "No exact public table was established for this checkpoint.", "classification": "UNKNOWN", "treatment": "Left unchanged. Godbreaker strongholds remain the existing rally-only encounter. No new guardian or event-boss stat block was invented."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/forsaken-encounters.json", "checks": ["ordinary Forsaken level rows stay on the existing reference table"]}
  ],
  "deviations": [
    {"decision": "A searched Forsaken on explored land can be focused and marched before it is inside current vision. The next search prefers a different visible match. Enemy stats, AP, XP, respawn and the 10 percent rare-item chance stay as they are.", "reason": "The server already chose a target, but the attack command refused it until the camp was visible, and the client had no search control.", "impact": "One private pin is returned to the searching city. Other cities do not receive that search result. Unexplored fog is not filled. Special fort, guardian and event-boss numbers remain unresolved.", "authority": "Overnight task 2 authorizes legal Forsaken search and marching while ordinary enemy numbers and unknown drop rates stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "legal Forsaken search, fight, privacy and rally separation",
    "ordinary Forsaken level rows stay on the existing reference table"
  ],
  "covers": [
    "server/forsaken-population.mjs",
    "server/marches.mjs",
    "server/world.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs"
  ],
  "coverage_ids": ["PVE-FORSAKEN", "PVE-POPULATION"]
}
-->

## Feature and RoK equivalent

Ordinary barbarian search, march, fight, report and once-only rewards, plus rally-only special encounters. Thrones of Myth uses Forsaken mortals and Godbreaker strongholds.

## Reference version and sources

The indexed Barbarians article remains the 2026-11-14 source for personal unlocks and early kingdom levels. Tonight's checkpoint did not open a live client. App Store presence does not supply drop tables.

## Verified mechanics and prerequisites

Levels 1 through 25 already exist. A city starts at unlock 1. The kingdom cap starts at 6 and rises with kingdom age. Each admission spends 50 AP once per march per camp generation. Victory grants 100 commander XP per level. Godbreaker strongholds reject a solo attack.

## Numeric reference

`referenceCamp` still supplies every ordinary row. Respawn stays 90 seconds. The rare item chance stays 0.1 and is still a disclosed provisional weight, not a verified drop table. Population quotas and patrol speed were not edited.

## Formulas and modifiers

Search returns the nearest visible reachable Forsaken of the requested level, skipping the previous found id when another match exists. Otherwise, for levels 1 through 12, it may place one Forsaken on explored land that is not inside a city, a structure or current sight. That id is a private pin. The march uses the military route, so a closed pass still blocks the army. Arrival still fights only the live camp.

## Known uncertainties

Exact RoK spawn maps, fort waves, guardian stats, boss schedules and rare drop rates are unknown. They were not replaced with guesses. Native clicks were not run.

## Current Thrones of Myth behavior

Before this correction, search could describe a trail without an id, and an attack on that camp was rejected until something else saw it. The client never sent `forsaken-search`.

## Planned Thrones of Myth behavior

Implemented. The world HUD searches an unlocked level, focuses the pin, and the existing march, report and Godbreaker rally actions remain the way to fight and read the outcome.

## Differences and project decisions

Search now discloses one lawful target to its owner. That is not a fog dump. Numerical enemy tables and the rally-only Godbreaker path are unchanged. This is partial parity.

## Systems affected

Forsaken search, attack admission, the owner snapshot pin, and the world HUD. City construction, training and resource formulas were not edited.

## Save migration

No schema change. Existing search results still validate. A restarted city keeps the same camp ids, admissions and one victory report.

## Acceptance tests

`node --test server/forsaken-encounters.test.mjs` passed: level-1 search, inspection, one victory, one AP charge, restart, unlock and kingdom gates for levels 21 and 25, a second city's private search field, solo Godbreaker rejection, insufficient AP, population bounds and a 200-tick budget. `server/forsaken.test.mjs` also passed, including the existing 175-battle calibration. Native UI remains NOT TESTED.

## Implementation status

IMPLEMENTED. Partial parity. Ordinary combat numbers were not retuned. Fort, guardian and event-boss reference tables remain unresolved, and ordinary camps are not described as those encounters.

## Versioned contract binding

`ROK-PVE-POPULATION` is bound through `research/parity/approvals/cursor-night-2-forsaken.json`. Full PvE numerical certification is not claimed.
