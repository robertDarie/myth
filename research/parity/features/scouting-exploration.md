# Scouting, fog and discovery continuation

<!-- parity
{
  "id": "CURSOR-NIGHT-1-SCOUTING",
  "description": "Legal automatic exploration of every reachable fog cell without changing scout camp numbers",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. rokstats.online Scout Camp page fetched 2026-11-19 lists 25 upgrade levels and costs only. Fandom Scouting returned 403 on 2026-11-19.",
  "checked": "2026-11-19",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://app.rokstats.online/buildings/scout-camp", "checked": "2026-11-19", "classification": "VERIFIED"},
    {"url": "https://riseofkingdoms.fandom.com/wiki/Scouting", "checked": "2026-11-19", "classification": "UNKNOWN"},
    {"url": "https://rokhub.app/faq/kvk", "checked": "2026-11-16", "classification": "CORROBORATED"}
  ],
  "numeric_references": [
    {"quantity": "Scout Camp level count, food, wood, time and power", "reference": "https://app.rokstats.online/buildings/scout-camp fetched 2026-11-19: 25 levels, level 1 food/wood 300 and 2s, level 25 food/wood 750000 and 11d 12h. No scout count, speed, sight or queue size on that page.", "classification": "VERIFIED", "treatment": "Recorded for comparison only. City construction and these costs were not applied."},
    {"quantity": "Scout capacity, speed, sight, survey time and automatic queue size", "reference": "Absent from the fetched Scout Camp cost page. Existing local server/scout-camp.mjs table retained.", "classification": "UNKNOWN", "treatment": "Not essential to this correction because no local scout number changes. Full numerical parity stays unverified."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/scouting-exploration.json", "checks": ["scout camp capacity and speed stay on the existing local table"]}
  ],
  "deviations": [
    {"decision": "Keep the local six-row Outlook of the Horizon table and let automatic exploration continue from the nearest reachable unexplored fog cell after the preferred nearby ring is clear.", "reason": "Reference scout count, speed and queue size were not on the fetched cost page, so those numbers were not invented. The previous nearby-only cap stopped legal exploration before the map was covered.", "impact": "A level-1 scout can clear all 4096 fog cells by walking physical corridors. Upgrade costs, speed, sight, survey time and slot counts are unchanged. This is not 25-level Scout Camp parity.", "authority": "Overnight task 1 authorizes legal automatic exploration of every reachable fog cell while the existing scout camp numbers stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "legal automatic exploration of every reachable fog cell",
    "scout camp capacity and speed stay on the existing local table"
  ],
  "covers": [
    "server/exploration.mjs",
    "server/city-content.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Exploration.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs"
  ],
  "coverage_ids": ["TM-001", "TM-006", "TM-010"]
}
-->

## Feature and RoK equivalent

Permanent terrain discovery, automatic and manual scouting, pass passage for scouts only, cave and settlement investigation, and private reports. The player raises the Outlook of the Horizon, sends or auto-explores, redirects or recalls, and claims each ancient place once.

## Reference version and sources

Checked 2026-11-19. The rokstats Scout Camp page loaded and lists 25 building levels with food, wood, time, power and City Hall requirements. It says the building manages scouts. It does not give scout count, march speed, vision radius or automatic area size. Direct fetch of the Fandom Scouting page returned 403, so that page was not re-read tonight. The 2026-11-16 indexed RokHub KvK note remains the corroboration that scouts are exempt from pass ownership. No live Rise of Kingdoms client was opened. No proprietary UI was copied.

## Verified mechanics and prerequisites

The fetched page verifies a 25-level building with published base costs. Scout passage independent of military ownership remains the corroborated rule already used by the scout route. Everything else numerical about scouts is unknown. Local play still requires the Outlook of the Horizon before a scout can leave. Military marches still use owned or open passes. Fog memory is per city. Investigation rewards are per city.

## Numeric reference

Local levels 0 through 5 remain 0/1/1/2/2/3 scouts at speeds 0, 7, 8.5, 10, 11.5 and 13. Those values are fixtures, not Rise of Kingdoms measurements. Reference building costs were not copied into construction.

## Formulas and modifiers

Automatic selection still prefers an unexplored fog cell inside the existing chebyshev `autoSectors` ring. If that ring has no legal unknown cell, the scout takes the nearest unexplored cell in a province connected by physical corridors. Military ownership is not consulted. A cell already inside current sight is not kept as an automatic destination. Manual sends may still revisit explored land and write a new private report without a second survey reward. An outbound or returning scout with no physical route is recalled when a home route exists, or the mission ends after 2 seconds when no corridor can be followed. No coordinate is injected into `explored`.

## Known uncertainties

Exact reference scout capacity, speed, sight, survey duration and queued-area size are unknown. The 25-level cost table is a building-economy reference and was left to the city workstream. Fandom text could not be refreshed tonight. Native Windows clicks were not run.

## Current Thrones of Myth behavior

Before this correction, automatic selection refused every cell outside `autoSectors`. After the nearby ring was revealed, the scout returned home and stopped even though distant corridors remained open. Manual redirect could still cross the map. Survey rewards and ancient claims were already once per city.

## Planned Thrones of Myth behavior

Implemented as specified in Formulas and modifiers. Client copy now says automatic exploration continues through reachable fog. Escape and right-click cancel a map destination. Discovery toasts no longer call interface layout outside the interface pass.

## Differences and project decisions

The continuation past the local ring is an owner-authorized functional correction. Retaining the local scout table is required because the reference capacity and speed were not published on the fetched page. Rise of Kingdoms parity is partial. It is not full parity.

## Comparison

| Behavior | Reference evidence | ToM result | Status |
| --- | --- | --- | --- |
| Terrain stays discovered | Owner acceptance and existing fog model | 4096 cells saved and reloaded | Partial parity |
| Automatic exploration continues | Queue size UNKNOWN; owner required full reachable coverage | Nearest legal unknown cell after the local ring | Partial parity |
| Scouts use corridors, not pass ownership | RokHub note, CORROBORATED | Unchanged scout route; army move still rejected | Partial parity |
| Scout count and speed | UNKNOWN on the fetched cost page | Local table unchanged | Reference unverified |
| Scout Camp has 25 cost levels | VERIFIED rokstats costs | Local building depth unchanged | Mismatch, not applied |
| Cave and settlement gifts once | Owner acceptance; exact reference drops UNKNOWN | Claim and restart reject a second grant | Partial parity |
| Other cities cannot read reports or fog | Owner acceptance | Snapshot privacy assertions | Partial parity |

## Systems affected

Exploration commands, automatic target choice, scout mission recovery, Outlook description, and the scouting panel. Navigation authority, training, research and resource formulas were not edited.

## Save migration

No schema increase. Saves that omit `autoAssigned` gain `false` during validation. Explored cells, reports, findings and claims already persist and still persist. An impossible scout coordinate is not given a new corridor.

## Acceptance tests

`node --test server/exploration-coverage.test.mjs` recorded 4096 explored cells, 4096 after `World.fromSave`, 4316 ticks and 1079 simulated seconds on a fresh Greek city. The same file checks the unchanged level table, one revealing scout, three independent level-5 scouts, closed-pass army denial, redirect, recall, stuck-mission removal, one-time settlement and cave claims, and a second city's empty report list. Native play was not run.

## Implementation status

IMPLEMENTED. Parity remains Partial parity. Server coverage passed. Native interaction remains NOT TESTED. Do not describe this as complete Rise of Kingdoms scouting parity.

## Versioned contract binding

`ROK-EXPLORATION-FULL-MAP` is bound through `research/parity/approvals/cursor-night-1-scouting.json` and `publication_scope.json`. Reference numerics for scout capacity and speed stay unresolved. The 25-level cost rows are evidence, not an authorization to retune construction.
