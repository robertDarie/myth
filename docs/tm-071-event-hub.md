# TM-071 Event hub

Two recurring events share one server calendar. The Activity screen keeps Daily activity, Alliance weekly goals, and Seven-day rewards on their own tabs. Event hub is the fourth tab, and the alliance screen also opens it.

## Schedule

The clock is the existing monotonic activity clock, in UTC.

- Oath of the Builders (`oath-of-the-builders`) is active from Monday 00:00 UTC until Thursday 00:00 UTC.
- Frontier Vigil (`frontier-vigil`) is active from Thursday 00:00 UTC until Monday 00:00 UTC.

The boundary belongs to the event that is starting. One event is active and the other is upcoming. A claim is accepted only while its event is active, the objectives are complete, and the request names that period's UTC date. The next period starts at zero progress and can be claimed again. A missed period cannot be claimed later. Turning the host clock backward does not reopen a claim, because the activity clock does not move backward.

## Objectives and rewards

Oath of the Builders counts two completed building upgrades or research projects. Starting an upgrade does not count. Cancelling a job does not count. The reward is 200 wood, 150 stone, and 100 gold.

Frontier Vigil counts two completed scouting surveys and one successful Forsaken camp victory. Recalling a scout before the survey is recorded does not count. A camp that is still standing does not count. Settling the same camp cycle again does not count. The reward is 200 food, 150 gold, and 10 Mana.

There is no Aether. Daily tasks, weekly alliance goals, and the seven-day streak keep their own counters and claims. The same finished action may advance a daily counter and an event objective; the reward ledgers stay separate.

Progress for each event is stored only for the current period. Camp-cycle tokens are capped at eight. Progress cannot rise above the objective.

## Persistence

World schema 22 stores `events` on the player. Schemas 21 and older load with a fresh unclaimed period and keep resources, troops, technology, login streaks, daily claims, and alliances. A saved event record that skips an objective, claims an unfinished event, or names a period other than the one stored with its activity clock is rejected. Loading that save after the host clock has moved forward starts the new period instead of rejecting the city. Health protocol stays 16. The event list is added to the viewer's activity snapshot and is omitted from other players.
