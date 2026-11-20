# Daily activity receipts

<!-- parity
{
  "id": "CURSOR-PHASE2-DAILY",
  "description": "Count one server completion once for daily and alliance activity",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live daily-quest capture on 2026-11-20.",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "Activity chest thresholds and seven-day rewards", "reference": "Existing ACTIVITY_CHESTS and LOGIN_REWARDS in server/activity.mjs.", "classification": "UNKNOWN", "treatment": "Unchanged. A repeated completion token no longer adds a second daily or alliance credit."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/daily-activity.json", "checks": ["activity chest thresholds and the first login reward stay on the existing schedule"]}
  ],
  "deviations": [
    {"decision": "A completion id is stored on that UTC day's activity record, and a second delivery of the same id does not add points.", "reason": "Season scoring already ignored a repeated token. Daily counters and alliance gathering still increased.", "impact": "Canceled jobs, client-supplied counts and a second copy of the same training, camp, building or stronghold id do not create extra activity. Chest points and login rewards stay on the existing table.", "authority": "Phase 2 task 2 authorizes one credit per completion token and a login claim shortcut while existing chest thresholds and login rewards stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "a repeated completion token does not pay daily activity twice",
    "activity chest thresholds and the first login reward stay on the existing schedule"
  ],
  "covers": [
    "server/activity.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs"
  ],
  "coverage_ids": ["TM-070"]
}
-->

## Feature and RoK equivalent

Daily objectives, activity chests, alliance weekly goals and the seven-day login streak. Rise of Kingdoms resets these on a daily calendar. The live point table and chest contents were not captured.

## Reference version and sources

The App Store listing checked on 2026-11-17 names the game. It does not publish chest thresholds or login payouts. This checkpoint did not open a live client.

## Verified mechanics and prerequisites

Gathering, training completion, a finished scout survey, Forsaken victories, army movement, the free temple offering, successful alliance help, finished construction or research, and a credited stronghold victory already call the server recorder. A client cannot submit its own counter. Claiming a task, chest, weekly goal or login day is rejected when it is incomplete, already claimed, stale, or for another city.

## Numeric reference

Chest thresholds remain 20, 40, 60, 80 and 100. Day 1 of the login streak remains 100 food and 100 wood. No new payout was added.

## Formulas and modifiers

Points come from claimed tasks, not from unclaimed progress. A non-empty completion token is kept on the current daily record, up to 400 ids. The same id does not add daily, kingdom, season or alliance credit again that day. Untokenized gathering and march distance still add their delivered amounts. A reward that would pass the resource or item ceiling is refused and the claim stays open.

## Known uncertainties

The live Rise of Kingdoms objective list, point values, chest contents and missed-day rule are unknown. VIP daily gifts are not part of this table. Native clicks were not run.

## Current Thrones of Myth behavior

Before this correction, a second `recordActivity` call with the same token increased the daily counter and alliance gathering even though the season score ignored it. The world button opened the daily page and did not call out a ready login claim.

## Planned Thrones of Myth behavior

Implemented. The repeated token is ignored. When no daily task or chest is ready and the login claim is, the world button opens the seven-day tab and sends `login-claim` from that existing screen.

## Differences and project decisions

The prototype chest and login amounts stay in place because a replacement table was not verified. Open join and alliance invitations were not edited.

## Systems affected

Daily and alliance activity accounting, reward refusal at the resource ceiling, and the world activity button. City costs, construction timers and training batches were not edited.

## Save migration

No schema change. A saved day without a receipt list still loads. New credits store their ids on that day. Claimed tasks, chests and login streaks already on the save stay claimed.

## Acceptance tests

`node --test server/activity.test.mjs` and `node --test server/login.test.mjs` cover gathering, training, scouting, camps, patrol, help, development, strongholds, chest claims, weekly membership, UTC reset, clock rollback and one-time login payment. The new token test expects one credit. Native UI remains NOT TESTED.

## Implementation status

IMPLEMENTED. Partial parity. Live daily numbers remain unresolved.

## Versioned contract binding

`ROK-EVENT-DAILY` is bound through `research/parity/approvals/cursor-phase2-daily.json`. Full event certification is not claimed.
