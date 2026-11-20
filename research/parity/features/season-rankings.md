# Season receipts and public power board

<!-- parity
{
  "id": "CURSOR-PHASE2-SEASON",
  "description": "Keep one season credit per completion id and show the existing reward table",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live KvK or power-table capture on 2026-11-20.",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "Season of the First Throne milestone, placement, and participation rewards", "reference": "Existing SEASON_MILESTONES, PERSONAL_REWARDS, ALLIANCE_REWARDS, and PARTICIPATION in server/season.mjs.", "classification": "UNKNOWN", "treatment": "Unchanged. Power coefficients in server/power.mjs were not edited. No KvK score was added."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/season-rewards.json", "checks": ["season rewards stay on the existing milestone and placement schedule"]}
  ],
  "deviations": [
    {"decision": "A season completion id stays stored, and a reward that would pass the resource ceiling stays unclaimed.", "reason": "The receipt list dropped the oldest id after 256 entries, so that id could score again. A failed payout could surface as an uncaught error.", "impact": "Point rates, caps, placement rewards, and the local power formula stay as they were. The public ranking still shows total power only. Cross-kingdom war is not activated.", "authority": "Phase 2 task 4 authorizes a non-dropping season receipt list and visible existing rewards while season point values, placement rewards, and power coefficients stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "a repeated season token cannot score again and a full ledger does not forget an older token",
    "an unclaimed milestone survives settlement once, and a full balance does not consume the claim",
    "power rankings follow derived power, break ties by id, and do not publish inventory",
    "season rewards stay on the existing milestone and placement schedule"
  ],
  "covers": [
    "server/season.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Season.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Inventory.cs"
  ],
  "coverage_ids": ["TM-072"]
}
-->

## Feature and RoK equivalent

Players see a power board and a 28-day season with personal score, alliance score, milestones, and a settled claim. Rise of Kingdoms also has home-kingdom progression, pre-KvK preparation, matchmaking, Lost Kingdom entry, occupation, and a return migration. Those live rules were not captured.

## Reference version and sources

The App Store listing checked on 2026-11-17 names the game. It does not publish season points, honor rewards, or power coefficients. This checkpoint did not open a live client.

## Verified mechanics and prerequisites

The local season opens on the UTC day it is first used and lasts 28 days. Only the open phase scores. Ties break by who reached the score first, then by id. Power ties break by id. Alliance points stay with the alliance that was current when the action completed. A player must still be in that alliance at settlement to receive its placement reward. Disbanding leaves the score and pays no alliance reward. The public board lists id, name, civilization, alliance, and total power. Inventory stays private.

## Numeric reference

Milestone, personal, alliance, and participation rewards are the existing table. Power still uses the local city, research, commander, reserve, and deployed components. No coefficient was changed.

## Formulas and modifiers

Category points stay `min(cap, floor(raw / per) * points)`. A non-empty completion id is kept, up to 4096. The same id adds nothing. When the list is full, a new id adds nothing and old ids stay. Untokenized cargo still adds. Settlement creates one claim per earned milestone or placement. A payout that is not a safe resource balance is refused and the claim remains open.

## Known uncertainties

Live Rise of Kingdoms power weights, kill rankings, honor rewards, pre-KvK scores, matchmaking, Lost Kingdom objectives, occupation points, and the return migration are unknown. This season does not stand in for them.

## Current Thrones of Myth behavior

Before this correction, the receipt list dropped its oldest id. The season screen did not show the server payout next to the claim button, and it did not say that the schedule is a home season.

## Planned Thrones of Myth behavior

Implemented for the local season and the existing power board. The season screen shows the server payout and states that the city stays in this kingdom. The rankings screen names the private breakdown as city, research, commanders, and military, and says it is not a Rise of Kingdoms table.

## Differences and project decisions

KvK preparation, matching, cross-kingdom entry, Lost Kingdom objectives, occupation rewards, and return travel are not implemented. They depend on unpublished reference numbers and on city and military migrations that are still in progress elsewhere.

## Systems affected

Season credit storage, season claims, the season screen, and the rankings explanation. City costs, troop stats, and power coefficients were not edited.

## Save migration

No schema change. A saved season with 256 or fewer receipt ids still loads. New seasons may store up to 4096 ids. Claimed rewards stay claimed. A clock moved backward is still rejected.

## Acceptance tests

`node --test server/season.test.mjs` covers phase scoring, alliance movement, settlement, restart, a repeated id, a full ledger, disbanding, an unclaimed milestone, overflow, and power ties. Native clicks were not run.

## Implementation status

IMPLEMENTED. Partial parity. Live power and KvK rules remain unresolved.

## Versioned contract binding

`ROK-RANKING-LEADERBOARDS` is bound through `research/parity/approvals/cursor-phase2-season.json`. A Kingdom versus Kingdom season is not claimed.
