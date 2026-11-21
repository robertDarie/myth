# Kingdom search and march preview

<!-- parity
{
  "id": "CURSOR-NIGHT-5-KINGDOM-SEARCH",
  "description": "Let a player search already visible kingdom targets and preview the existing military route",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live map-search capture on 2026-11-19.",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "March speed, pass cost and search radius", "reference": "Existing route, scout route and Forsaken search. No new table was measured.", "classification": "UNKNOWN", "treatment": "Unchanged. The preview calls the same route functions and writes nothing."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/kingdom-search.json", "checks": ["march preview leaves the save unchanged"]}
  ],
  "deviations": [
    {"decision": "The kingdom list shows only targets already present in that player's snapshot, and a route preview is a separate read from issuing the march.", "reason": "Forsaken search, passes, nodes, strongholds and alliance markers already exist. The world screen had no combined list, and a march was sent before the player could see the gate decision.", "impact": "Hidden camps, unseen resources and another city's private pin stay out of the list. Donation, gift and pass-defender numbers remain unresolved.", "authority": "Overnight task 5 authorizes a read-only march preview and a search of already visible kingdom targets while hidden armies and undiscovered sites stay private."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "known kingdom search hides private targets and previews the same military route",
    "march preview leaves the save unchanged",
    "a denied military preview names an open scout route without spending action points"
  ],
  "covers": [
    "server/marches.mjs",
    "server/world.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Screens.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.KingdomSearch.cs"
  ],
  "coverage_ids": ["TM-020"]
}
-->

## Feature and RoK equivalent

World search and the march-order preview. Rise of Kingdoms has a map search and a movement confirmation. The exact live screens were not captured for this checkpoint.

## Reference version and sources

The App Store listing checked on 2026-11-17 identifies the game. It does not publish search radii, march speeds or pass-defender tables. Tonight did not open a live client.

## Verified mechanics and prerequisites

A player can list resources, divine passes, sanctuaries and shrines, strongholds, and that player's alliance markers, beacons and rallies from the snapshot the server already sent. The first right-click asks `/march-preview`. A second right-click on the same target sends the existing move, attack, gather or capture command only when that preview is authorized. When that military preview is denied, the same response says whether a scout can still survey the point. Scouting still uses the physical route and spends no action points. A closed or unowned pass still blocks an army.

## Numeric reference

No speed, cost, capacity or reward changed. The fixture records that a denied preview leaves the save byte-for-byte unchanged.

## Formulas and modifiers

Military preview uses `route`. Scout preview uses `scoutRoute`. An attack preview uses the same visibility and Forsaken reason as the attack command. A gather preview requires a seen or remembered node. A capture preview uses the existing seal, ownership and territory sentences.

## Known uncertainties

The live Rise of Kingdoms search categories, result order and confirmation gestures are unknown. Pass defender counts and territory bonuses were not added. On 2026-11-21 a native client listed known resources, searched for a legal Forsaken camp, and a right-click across a sealed pass showed the scout sentence without spending action points.

## Current Thrones of Myth behavior

Before this correction, Forsaken search was the only world search, and a right-click on the ground sent `move` immediately. The server already hid unseen camps, the first sanctuary, foreign cargo and private Forsaken pins.

## Planned Thrones of Myth behavior

Implemented. The world screen cycles Resources, Passes, Sanctuaries, Strongholds and Alliance. Choosing a row focuses it and selects it. The route line draws only when the server returns an authorized path.

## Differences and project decisions

The list cannot invent a hidden target in order to look more complete. Open join, rally limits and pass topology stay as they were. A fresh city still cannot lead a pass rally until the Oathbound Hall exists.

## Systems affected

March preview, the world search panel, and the right-click order sequence. City construction, training and resource formulas were not edited.

## Save migration

No schema or protocol version change. Old saves load through the existing world reader. Preview has no persisted field.

## Acceptance tests

`node --test server/kingdom-play.test.mjs` passed. A denied cross-province preview did not change the save. The same preview over HTTP returned unauthorized and left the army idle. A private Forsaken pin was absent from the other city's camps. On 2026-11-21 the native client showed the same denied-preview sentence, kept action points at 1500, and did not issue the march.

## Implementation status

IMPLEMENTED. Partial parity. The reference search layout and military numbers remain unresolved.

## Versioned contract binding

`ROK-WORLD-MILITARY-ACCESS` is bound through `research/parity/approvals/cursor-night-5-kingdom-search.json`. Full world-map certification is not claimed.
