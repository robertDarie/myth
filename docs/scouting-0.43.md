# Scouting and permanent exploration · 0.43

Protocol stays **16**. World saves move to **schema 16**. Schema 15 and older still load. A missing Outlook becomes level 1, and a single `scout` mission becomes the `scouts` array. Explored sector lists are kept. Schema 15 files are archived beside the save as `.schema15.bak` on the next successful load.

## Terrain fog

The map has two exploration states:

| State | Presentation |
| --- | --- |
| Unexplored | Opaque fog. The minimap cell is dark. |
| Explored | Permanently clear. Terrain, roads, forests, mountains and discovered landmarks stay visible after the scout leaves. |

There is no grey or half-fogged “remembered” terrain. Current allied sight does not paint a third map state. Exploration is stored per city, so joining or leaving an alliance cannot erase it. Alliance vision can still add sectors while members can see them.

## Military reconnaissance

This is intentionally narrower than Rise of Kingdoms.

In RoK, explored land keeps showing the map, and other players’ marches are broadly visible on that land. Thrones of Myth keeps the permanent terrain, but it does not publish confidential army or economy data just because a sector was explored:

- Enemy marches, troop counts, cargo, orders and live garrison totals leave the snapshot when they leave current allied sight.
- A march that walks out of sight is removed. This milestone does not add last-seen march ghosts.
- Scout reports stay private, timestamped arrival observations. They are not live trackers.
- Camps, resources and cities already follow the existing last-known landmark memory. Live amounts and troop counts still require current sight or a new survey.
- One discovery reward is granted per newly assigned unexplored destination. Surveying that sector again records a report and does not repeat the journey or activity credit.

## Outlook of the Horizon

The player-facing building is the Outlook of the Horizon. Its save id remains `scoutcamp`. It trains scouts and stays separate from military marches. New cities and migrated saves start at level 1, which preserves the existing one-scout capability. The levels below are original v0.43 tuning.

| Level | Scouts | Speed | Reveal radius | Survey | Auto range |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | — | — | — | — |
| 1 | 1 | 7.0 | 9 | 0.80s | 2 sectors |
| 2 | 1 | 8.5 | 10 | 0.70s | 3 sectors |
| 3 | 2 | 10.0 | 12 | 0.55s | 4 sectors |
| 4 | 2 | 11.5 | 13 | 0.40s | 6 sectors |
| 5 | 3 | 13.0 | 15 | 0.25s | 8 sectors |

Speed is world units per second. Reveal radius is the survey and vision radius. Auto range is the Chebyshev sector distance searched from the scout or, for a new dispatch, from the city. Costs and build times use the existing building cost curve and construction crews. A building cannot be upgraded above the Citadel, and the camp caps at level 5.

Upgrades apply to scouts already in the field. Scouts do not spend action points, troops or march slots. They still need a controlled Divine Gate to enter another province. Return trips can use corridors without gate ownership.

## Orders

- **Send** dispatches a free scout. A second scout cannot be assigned to the same sector.
- **Redirect** turns an outbound, surveying or returning scout to a new reachable point without sending it home first.
- **Recall** sends that scout home and cancels the pending discovery reward for the aborted trip.
- **Auto explore** fills idle capacity with nearby unexplored sectors and, on survey completion, continues to the next sector in range. Stopping auto explore lets the current trip finish; it does not delete explored land.
- Map coordinates outside 1–79 are rejected. Completion is reported to the owning client when a new private survey arrives.

The exploration snapshot carries the sector list, current sight, scout poses, ETAs and the owner’s private reports. Other cities do not receive that report history, the explored list, or the scout roster on the player record. Allied snapshots can see allied scout positions because those scouts contribute shared sight.
