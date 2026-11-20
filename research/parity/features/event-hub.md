# Event hub history

<!-- parity
{
  "id": "CURSOR-PHASE2-EVENTS",
  "description": "Keep one credit per event completion and show closed periods without new payouts",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live event-score capture on 2026-11-20.",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "Oath of the Builders and Frontier Vigil rewards and objective counts", "reference": "Existing EVENTS table in server/events.mjs.", "classification": "UNKNOWN", "treatment": "Unchanged. Eight other event families are listed and do not score or pay."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/event-hub.json", "checks": ["event rewards stay on the existing Oath and Vigil schedule"]}
  ],
  "deviations": [
    {"decision": "A completion id is stored for the open period, a touched period is kept as history, and unverified event families have no score.", "reason": "The same completion could be counted again after its id was dropped, and a closed period disappeared from the city.", "impact": "Oath of the Builders still pays 200 wood, 150 stone and 100 gold for two finished building or research jobs. Frontier Vigil still pays 200 food, 150 gold and 10 Mana for two surveys and one camp victory. No new threshold, calendar or ranked reward was added.", "authority": "Phase 2 task 3 authorizes event history and one credit per completion token while the existing Oath and Vigil rewards stay unchanged and unverified event families stay unscored."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "a repeated event token does not raise progress and a full receipt list does not revive an old token",
    "closed periods stay in history and cannot be claimed again",
    "a reward that would overflow the balance stays unclaimed",
    "event rewards stay on the existing Oath and Vigil schedule"
  ],
  "covers": [
    "server/events.mjs",
    "server/city.mjs",
    "server/exploration.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Activity.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs"
  ],
  "coverage_ids": ["TM-071"]
}
-->

## Feature and RoK equivalent

The event hub shows scheduled objectives, live progress, and a claim. Rise of Kingdoms also runs construction, research, training, commander, gathering, PvE, alliance, and ranked events. Those live score tables were not captured.

## Reference version and sources

The App Store listing checked on 2026-11-17 names the game. It does not publish event calendars, score rates, or chest contents. This checkpoint did not open a live client.

## Verified mechanics and prerequisites

Oath of the Builders is open Monday 00:00 UTC through Thursday 00:00 UTC. It counts a finished building upgrade or research project, not a start or a cancel. Frontier Vigil is open Thursday 00:00 UTC through Monday 00:00 UTC. It counts a finished survey and a defeated Forsaken camp. A claim needs the open period, finished objectives, and that period's date. The client does not send the progress number that is paid.

## Numeric reference

The existing rewards and goals stay in place. Day-one login and daily chests are unchanged by this work. No new amount was introduced.

## Formulas and modifiers

Progress adds the server amount, then stops at the objective goal. A non-empty completion id is stored, at most eight per open event. The same id does not add progress. A ninth new id does not add progress, and the older ids stay stored. Work before the event is open is ignored. A reward that would pass the resource ceiling is refused and the claim stays open.

## Known uncertainties

Live Rise of Kingdoms power rates, gathering rates, training points, commander cycles, alliance event payouts, rank ties, and limited-time calendars are unknown. Those eight families are visible as not scheduled.

## Current Thrones of Myth behavior

Before this correction, the credited-id list dropped the oldest id after eight, so that id could count again. A finished building used no event id. A closed period was replaced without a record. The hub had no way to show an ended period or a family that is intentionally unscored.

## Planned Thrones of Myth behavior

Implemented. Building and research pass the job id. A survey passes its map cell. Closed periods with progress or a claim remain on the city as history. The hub shows Active, Upcoming, Ended, and Not scheduled. Not scheduled cards cannot be claimed.

## Differences and project decisions

The two prototype events remain the only paying events. Broader RoK event families are infrastructure only. Their absence of a score is the safe behavior while the reference numbers are unknown.

## Systems affected

Event progress, event claims, the event hub, and the completion id passed from a finished building, research job, or survey. City costs, training batches, and alliance invitations were not retuned.

## Save migration

No schema change. A city without `eventHistory` still loads. New closures append history, capped at sixteen entries. An already claimed reward stays claimed. A malformed history list is rejected.

## Acceptance tests

`node --test server/events.test.mjs` covers the Monday and Thursday boundary, canceled jobs, real surveys and camps, missed periods, clock rollback, restart, concurrent claims, a repeated token, history, overflow, and a rejected family claim. Native clicks were not run.

## Implementation status

IMPLEMENTED. Partial parity. Live event scoring remains unresolved.

## Versioned contract binding

`ROK-EVENT-LIMITED-TIME` is bound through `research/parity/approvals/cursor-phase2-events.json`. Full event certification is not claimed.
