# TM-070 Seven-day offerings

A city claims one ordinary reward per UTC day. The claim is a server command. Opening the activity screen does not pay it.

## Schedule

Day 1: 100 food and 100 wood.

Day 2: 100 stone and 100 gold.

Day 3: 200 food and 150 wood.

Day 4: 150 stone and 150 gold.

Day 5: 250 food, 250 wood, and 10 Mana.

Day 6: 200 stone, 200 gold, and 15 Mana.

Day 7: 300 food, 300 wood, 250 gold, and 25 Mana.

No Aether is paid. These rewards are separate from daily activity tasks, activity chests, and alliance weekly goals.

## Streak

The server clock is the existing monotonic activity clock. A claim on the next UTC day advances the streak. Missing one or more UTC days makes the next claim Day 1. The day after Day 7 is Day 1 again. Skipped days are not paid later. A request for a different day is rejected. Moving the host clock backward does not reopen a claim, because the saved clock never moves backward.

Schema 21 stores `{ lastClaimDay, claimedDay }` on the city. Schemas 19 and 20 load with a fresh unclaimed streak and keep resources, troops, and existing daily or weekly claims. Protocol stays 16.
