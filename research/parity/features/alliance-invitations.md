# Alliance invitations and warfare cleanup

<!-- parity
{
  "id": "CURSOR-NIGHT-4-ALLIANCES",
  "description": "Record alliance invitations and return marches when an alliance is deleted",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live alliance-client capture on 2026-11-19.",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://riseofkingdoms.fandom.com/wiki/Alliance", "checked": "2026-11-16", "classification": "CORROBORATED"}
  ],
  "numeric_references": [
    {"quantity": "Alliance member ceiling", "reference": "Existing LIMITS.allianceMembers of 100 in server/world-map.mjs.", "classification": "UNKNOWN", "treatment": "Kept. Invitations cannot push members plus open invitations past that ceiling."},
    {"quantity": "Donation costs, alliance technology effects and gift probabilities", "reference": "No exact public table was established for this checkpoint.", "classification": "UNKNOWN", "treatment": "Not implemented. Existing help, weekly contribution counters and territory costs stay as they are."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/alliance-invitations.json", "checks": ["alliance member capacity stays on the existing limit"]}
  ],
  "deviations": [
    {"decision": "Officers can invite a city, and deleting the last member of an alliance returns any marches still assigned to it. Open join remains available.", "reason": "Membership, rallies, garrisons and passes already exist. Invitations were not stored, and disbandment did not itself release a leftover march.", "impact": "An invitation is private to the invited city and the inviting officers. Donation prices, technology effects and gift odds remain unresolved.", "authority": "Overnight task 4 authorizes alliance invitations and disbandment return of marches while donation costs and gift probabilities stay unpublished."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "alliance invitations, pass ownership and troop conservation",
    "alliance member capacity stays on the existing limit"
  ],
  "covers": [
    "server/social.mjs",
    "server/campaign.mjs",
    "server/world.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Kingdom.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs"
  ],
  "coverage_ids": ["TM-075", "11-013"]
}
-->

## Feature and RoK equivalent

Alliance membership, invitations, territory and war. Thrones of Myth already creates alliances, assigns roles, helps construction, places beacons and fights passes with rallies and garrisons.

## Reference version and sources

The alliance article checked on 2026-11-16 describes membership and cooperation. It does not supply donation prices or chest odds. Tonight did not open a live client.

## Verified mechanics and prerequisites

A leader or officer can invite an unaffiliated city. The invitation is visible to that city and to the officers. Joining clears it. Revoking removes it. Members, officers and the leader keep their existing permissions. The member ceiling stays 100, counting open invitations toward that ceiling. Deleting an alliance returns marches that were still in its rallies or garrisons.

## Numeric reference

The member ceiling remains 100. Beacon costs, rally timers and help reductions were not changed. No donation price or gift probability was added.

## Formulas and modifiers

Help still shortens one allied job by the existing rule, once per helper. A captured pass opens only the corridor that pass guards. An unrelated province stays closed. Each march keeps its own unit count through the fight, the hospital and a restart.

## Known uncertainties

Alliance technology trees, donation prices, credit formulas and gift drop tables are unknown. They were not filled with guesses. Native alliance clicks were not run.

## Current Thrones of Myth behavior

Before this correction, any unaffiliated city could join by alliance id, and no invitation was stored. Disbandment cleared flags, markers and sites. A march still listed on that alliance was not returned by the deletion itself.

## Planned Thrones of Myth behavior

Implemented. The alliance hall can send and withdraw invitations, and an invited city can accept with the existing join command. The member list shows the weekly help, gather and stronghold counts already recorded for that city.

## Differences and project decisions

Open join remains, so an invitation is an additional record rather than the only way in. That is partial parity. Pass ownership, rally authority and garrison ownership were already enforced and are covered again by the new battle test.

## Systems affected

Alliance invitations, the member snapshot, disbandment of leftover marches, and the alliance hall. City construction, training and resource formulas were not edited.

## Save migration

No schema change. Alliances saved without an invitation list load with an empty list. Existing alliances, cities and pass ownership stay in place.

## Acceptance tests

`node --test server/alliance-warfare.test.mjs` passed: invite, revoke, join, rank transfer, help, kick, disbandment, a defended pass fight, corridor access, unrelated-province denial, unit conservation and restart. `server/social.test.mjs` and `server/campaign.test.mjs` also passed. Native UI remains NOT TESTED.

## Implementation status

IMPLEMENTED. Partial parity. Donation, alliance-technology and gift numbers remain unresolved. Existing rally, garrison and pass behavior was not replaced.

## Versioned contract binding

`ROK-ALLIANCE-MEMBERSHIP` is bound through `research/parity/approvals/cursor-night-4-alliances.json`. Full alliance numerical certification is not claimed.
