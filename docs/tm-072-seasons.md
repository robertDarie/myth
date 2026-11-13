# TM-072 Season of the First Throne

Season of the First Throne lasts 28 UTC days from the calendar day when the season system first activates on a world. It does not replay actions from before that day. The activity clock only moves forward, so a restart cannot move the season backward. Protocol stays 16.

## Phases

Each phase lasts seven days.

- Foundations, days 1–7: cargo delivered home, completed troop training, and finished buildings or research.
- The Frontier Awakens, days 8–14: completed surveys and Forsaken camp victories.
- Banners of War, days 15–21: one finished city project, alliance assistance, a completed beacon or captured sacred site, and credited stronghold victories.
- The First Throne, days 22–28: any of those actions except the one-time Banners city-work bonus.

An action scores only in the phase that is open. After a phase ends, the same action cannot finish that phase's objective. Personal objectives do not require an alliance. After day 28, the score freezes. The next checkpoint settles it and opens the following season.

## Points

Points come from the server's existing completion hooks. Queued jobs, canceled orders, passive production, offerings, and march distance do not score. Aether is not a source of score.

- Cargo delivered home: 1 point per 100, cap 40.
- Troops trained: 1 point per 5, cap 30.
- Finished building or research: 8 points, cap 40. During Banners of War the first one is instead 8 readiness points, cap 8.
- Survey: 6 points, cap 30.
- Forsaken camp victory: 10 points, cap 40. The camp generation is credited once.
- Alliance help: 4 points, cap 20.
- Finished beacon or sacred site taken by the player's alliance: 12 points, cap 36. The builder or rally leader must still belong to that alliance.
- Credited stronghold victory: 15 points, cap 45. The stronghold report is credited once.

Alliance points are the same points, added to the alliance the player belonged to when the action completed. Joining another alliance does not move old points. A coalition is not an alliance on this board. Disbanding an alliance leaves its season score in place.

Current standings break ties by who reached the score first, then by id. At 00:00 UTC on the day after day 28, the server freezes that board, opens the next season at score zero, and leaves cities, troops, research, equipment, resources, marches, alliances, coalitions, pacts, territory, and kingdom milestones in place. A later season cannot change the frozen board. If many season boundaries pass while nobody scored, the server advances to the current season and does not invent rewards. A clock moved backward cannot reopen a settled season.

## Rewards

Ordinary resources and Mana only. No Aether.

Milestones, once per season, at 25, 75, and 150 points: 200 wood, 200 food, and 100 gold; then 200 stone, 200 gold, and 10 Mana; then 300 wood, 300 food, 250 gold, and 20 Mana. They can be claimed during the season. Any still unclaimed when the season ends become a settled reward.

Personal placement is one reward: rank 1 gets 500 gold and 25 Mana, rank 2 gets 300 gold and 15 Mana, and rank 3 gets 200 gold and 10 Mana. Anyone else with at least 25 points gets 150 wood, 150 food, and 50 gold, not a placement reward as well.

Alliance placement is separate. Ranks 1, 2, and 3 pay 400 gold and 20 Mana, 250 gold and 10 Mana, and 150 gold and 5 Mana. Only a player who contributed to that alliance and still belongs to it when the season closes is eligible. The recipient list is fixed at settlement. Joining afterward does not add a claim. A coalition is not one alliance.

Every reward is an explicit claim and pays once. Unclaimed rewards last 28 days after the season ends, then expire. The historical ranking stays. The archive keeps the eight newest season summaries. Claim records for an unexpired reward are kept even when an older summary scrolls off that list.

Schema 25 stores the ledger. Schemas 22, 23, and 24 load a new season and keep the city, alliance, and territory. Protocol stays 16. Players cannot set the clock, the score, or the final order.
