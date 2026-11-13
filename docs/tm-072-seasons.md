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

Current standings break ties by who reached the score first, then by id. Schema 25 stores the ledger. Schemas 22, 23, and 24 load a new season and keep the city, alliance, and territory.
