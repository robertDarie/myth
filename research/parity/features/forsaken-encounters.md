# Forsaken search and encounter participation

<!-- parity
{
  "id": "CURSOR-NIGHT-2-FORSAKEN",
  "description": "Player search and march to a lawful Forsaken without new drop rates or enemy stats",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. Ordinary rows already recorded in the Forsaken numeric evidence. No new live client capture on 2026-11-19.",
  "checked": "2026-11-21",
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
    {"decision": "A searched Forsaken on a legal military route can be focused and marched before it is inside current vision, including a camp that is still outside the explored disk. The next search prefers a different match. Enemy stats, AP, XP, respawn and the 10 percent rare-item chance stay as they are.", "reason": "A fresh city's explored disk sits inside city sight, and the level-1 camps are spawned outside that sight, so the old search reported that none were reachable.", "impact": "One private pin is returned to the searching city. Other cities do not receive that search result. Unexplored fog cells are not filled and a locked pass still has no route. Special fort, guardian and event-boss numbers remain unresolved.", "authority": "The fresh-player Forsaken loop requires a reachable level-1 target without revealing fog or changing combat numbers."}
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

Search returns the nearest Forsaken of the requested level that the army can legally march to, preferring one already in current sight and skipping the previous found id when another match exists. A camp outside the explored disk can be returned as that city's private pin. The pin does not add fog cells and is not copied onto another city's search. If no legal camp exists, levels 1 through 12 may place one Forsaken on explored land outside the city footprint, still on a legal route. A closed pass still blocks the army. Arrival still fights only the live camp. Enemy stats, AP, XP, respawn and the rare-item chance are unchanged.

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

`node --test server/forsaken-encounters.test.mjs` covers level-1 search, inspection, one victory, one AP charge, restart, unlock and kingdom gates for levels 21 and 25, a second city's private search field, solo Godbreaker rejection, insufficient AP, population bounds and a 200-tick budget. A fresh city whose level-1 camps sit outside city sight still receives one legal route, spends 50 AP once, gains 100 commander XP once, keeps one victory report after a duplicate order and a reload, and does not reveal extra fog. `server/forsaken.test.mjs` keeps the existing 175-battle calibration. Native play is recorded separately from these server results.

## Implementation status

IMPLEMENTED. Partial parity. Ordinary combat numbers were not retuned. Fort, guardian and event-boss reference tables remain unresolved, and ordinary camps are not described as those encounters.

## Versioned contract binding

`ROK-PVE-POPULATION` is bound through `research/parity/approvals/cursor-night-2-forsaken.json`. Full PvE numerical certification is not claimed.
