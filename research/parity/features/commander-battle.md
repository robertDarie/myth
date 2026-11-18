# Commander battle skills

<!-- parity
{
  "id": "CURSOR-NIGHT-3-COMMANDERS",
  "description": "Make primary and secondary active skills change the march they are paired on",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. Community accounts disagree on secondary active timing. No live capture on 2026-11-19.",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://riseofkingdoms.fandom.com/wiki/Commander_Guide", "checked": "2026-11-16", "classification": "CORROBORATED"},
    {"url": "https://www.reddit.com/r/RiseofKingdoms/comments/w7k7wj/", "checked": "2026-11-16", "classification": "CONFLICTING"},
    {"url": "https://www.reddit.com/r/RiseofKingdoms/comments/ga7nax/", "checked": "2026-11-16", "classification": "CONFLICTING"}
  ],
  "numeric_references": [
    {"quantity": "Active damage, shield, heal and expertise factors", "reference": "Existing skill text in server/progression.mjs. Not re-measured on a live client.", "classification": "UNKNOWN", "treatment": "Kept. Expertise remains +20 percent of the active effect when all four skills are level 5 on an Epic or Legendary commander."},
    {"quantity": "Secondary active cast order", "reference": "Player accounts differ between one turn and two. No current client measurement.", "classification": "CONFLICTING", "treatment": "One shared rage bar. The primary spends the first 1,000 rage. A paired secondary spends the next 1,000. This is a local order, not a verified RoK timer."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/commander-battle.json", "checks": ["advertised active timing text stays on the existing local rule"]}
  ],
  "deviations": [
    {"decision": "Alternate the existing active effects on one rage bar. Do not add a new coefficient or restore secondary level, talent or equipment stats.", "reason": "Secondary passives already apply. Secondary actives never fired, so a pairing could store two commanders without a second battle effect.", "impact": "The second full rage bar records the companion skill. Hidden RoK damage formulas and the exact reference cast order stay unresolved.", "authority": "Overnight task 3 authorizes paired secondary actives to spend the next rage bar while existing skill coefficients and the secondary-passive recovery stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "primary and secondary battle skills change recorded combat",
    "advertised active timing text stays on the existing local rule"
  ],
  "covers": [
    "server/progression.mjs",
    "server/war.mjs",
    "server/forsaken.mjs",
    "server/campaign.mjs",
    "server/strongholds.mjs",
    "server/world.mjs",
    "server/marches.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs"
  ],
  "coverage_ids": ["TM-057"]
}
-->

## Feature and RoK equivalent

Primary and secondary commander skills in field combat. Thrones of Myth keeps its original commanders. The recovered rule remains: learned secondary passives apply once, and secondary level, talents and equipment do not add leadership stats.

## Reference version and sources

The Commander Guide and two player threads were already checked on 2026-11-16. Those threads do not agree on secondary timing. Tonight did not open a live client.

## Verified mechanics and prerequisites

A march has one rage bar. At 1,000 rage the scheduled commander spends it. The primary is first. A paired secondary with an unlocked active is second. The same damage, shield and heal factors already printed on the skill card are used. Expertise still multiplies that active by the existing 1.2 when the card says expertise is active. Pairing, unpairing and changing the primary return the next cast to the primary. A commander cannot lead two marches.

## Numeric reference

Damage is still `(1.2 + 0.2 × skill level)` times the normal attack, shields and heals are still `(8% + 2% × skill level)` of maximum health, and a shield still lasts four seconds. Those are the local card values. They were not replaced with a guessed RoK formula. The 1 percent-per-level companion multiplier stays removed.

## Formulas and modifiers

`castBattleSkill` chooses the commander, then the existing `activeSkill` applies the effect to the march. PvE damage still includes the PvE factor. PvP damage still uses the counter and mitigation path and does not use that PvE factor. Primary talents still modify primary stats. Secondary talents still do not.

## Known uncertainties

Exact RoK rage gain, skill order, troop-counter coefficients, wound ratios and hidden attack equations were not measured. The four-second shield and the alternating bar are the local rules under test.

## Current Thrones of Myth behavior

Before this correction, only the primary active could spend rage. A secondary commander changed passive stats and then never cast.

## Planned Thrones of Myth behavior

Implemented. Reports and the army snapshot record the skill name, whether it was the primary or the secondary, and the shield, heal or damage that resulted.

## Differences and project decisions

The alternating bar is disclosed as partial parity. It is not a claim that Rise of Kingdoms uses the same order. The Recovery C passive correction is preserved.

## Systems affected

Battle casts in Forsaken fights, player battles, strongholds and campaign rounds. Pairing resets the cast order. The skill card and the commander hall use the same timing sentence. City construction, training and resource formulas were not edited.

## Save migration

No schema change. Missing cast-order fields become primary on load. Commander XP, skill ranks, talents and wounded or healed units stay on the army that earned them.

## Acceptance tests

`node --test server/commander-battle.test.mjs` passed. It covers a primary shield, a secondary heal, a higher secondary rank, expertise, primary-only talents, level invariance, PvE versus PvP factors, casualty conservation, restart and duplicate assignment. `server/secondary-passive-correction.test.mjs`, `server/progression.test.mjs`, `server/war.test.mjs`, `server/forsaken.test.mjs` and `server/strongholds.test.mjs` also passed. Native clicks were not run.

## Implementation status

IMPLEMENTED. Partial parity. The secondary passive recovery remains in force. Hidden combat formulas and the reference active timer remain unresolved.

## Versioned contract binding

`ROK-COMMANDER-SECONDARY-ACTIVES` is bound through `research/parity/approvals/cursor-night-3-commanders.json`. Full commander numerical certification is not claimed.
