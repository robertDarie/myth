# Gameplay parity audit

Branch `feature/gameplay-parity`, starting commit `75b3f01b58db80549fdb4914e2c246820ef20691` (`origin/main` at the time of the audit). Protocol stays 16. World schema stays 18. New fields are optional and defaulted on load.

Rise of Kingdoms and Call of Dragons are functional references. Exact current numbers from those games were not verified in this pass, so they are marked **unknown** rather than copied from memory or older community guides. Thrones of Myth values below are taken from the server modules named in each section.

This is not a claim of feature parity, and it is not a client release. The Unity client still has to display the new fields.

## What this slice changed

- Citadel troop capacity is now `40, 80, 140, 220, 340` at citadel 1–5, plus `+5` per Hall of Spears level above 1. Citadel 1, hall 1 remains 40. Citadel 5, hall 5 is 360.
- Training batch size follows the hall: `5, 5, 10, 20, 40`. Time and resource cost scale with `amount / 5`, so a larger order does not make each soldier cheaper or faster. Promotion stays a batch of five.
- Commanders have three original talent trees (Warhost, Provision, Sanctuary). One point per five levels, ranks 0–3, prerequisites, Mana respec at `15 × ranks spent`. Empty trees do not change existing combat numbers.
- Snapshots stamp `terrainExplored` on remembered landmarks. `lastKnown` remains. Explored terrain is still binary: unexplored or permanently explored.

## Feature matrix

RoK and Call of Dragons columns are the role of the system. Their current formulas are unknown unless a source is cited. None were cited with a version date in this pass.

### Troops and marches

| Field | Evidence |
| --- | --- |
| Reference role | A rising city trains larger stacks, runs several marches, heals a portion of losses, and promotes units into higher tiers. Exact caps: unknown. |
| Current rules | `CITADEL_TROOP_CAPACITY` in `server/city.mjs`. `TRAINING_BATCHES` in `server/troops.mjs`. Marches equal citadel level (`AGES` in `server/progression.mjs`). Classes: Oathguard, Dawn Archers, Dawn Riders, plus Veteran tier II. Mythic recruits are separate (`mythicCapacity`). |
| Formulas | Capacity = citadel table + `5 × (barracks − 1)`. Batch = hall table. Job seconds = `type.duration × (amount / 5) / (1 + 0.1 × (barracks − 1))`. Cost = `ceil(type.cost × amount / 5)`. Infantry base cost for five is food 50, gold 20, 8 seconds. Veteran tier requires citadel ≥ 2, hall ≥ 2, and Veteran Oaths. Promotion cost is the difference between tier costs, amount 5. |
| Gap before this slice | Citadel 5 with hall 5 held 140 troops and still trained five at a time. That is a complete early loop and a thin late army. |
| Why the change | Late cities need a reason to raise the hall, without making the first session a wall of identical soldiers or letting a big batch skip the resource cost. |
| Still missing | Per-class training buildings, march presets, a third tier, commander troop-capacity talents beyond the flat health/damage ranks, and reinforcement stacks that are more than the existing march list. |
| Priority | P1, implemented for capacity and batch scaling. |
| Tests | `server/gameplay-parity.test.mjs`, plus existing `world.test.mjs` (city-1 cap 40, batch 5), `city.test.mjs` (one hall level is +5 capacity and a faster five-soldier job), `veterans.test.mjs`. |

### Resources and gathering

| Field | Evidence |
| --- | --- |
| Reference role | Buildings produce a trickle; world nodes are the real income and are carried home. Exact node tables: unknown. |
| Current rules | Every 5 seconds, each producing building adds `(mana ? 1 : 2) × level × (1 + 0.15 × harvest)` into a fractional carry, then floors it into the stockpile. Cap is `500 + vault × 250 + citadel × 50`. Existing wealth above the cap is kept. Offline production stops after 8 hours (`OFFLINE_PRODUCTION_CAP`). |
| Gathering | Shared nodes deplete. Credit is cargo, paid on delivery (`field-logistics.mjs`). Carry is 16/12/24 per infantry/archer/cavalry (veterans use the same) plus 80 per mythic, then `× (1 + 0.08 × logistics)`. Gather tick takes `ceil(8 × gather multiplier)` per second. |
| Consequence | Passive income cannot fund a citadel-5 army. Gathering and combat rewards have to. That is intentional. The passive cap is still a short early cushion, not a month of stores. |
| Still missing | Node level curves beyond the authored deposits, alliance resource banks, a traveling trade march, and a researched training-cost reduction. |
| Priority | P1 audit. No new income source in this slice, because a second faucet would inflate training before the costs were re-measured. |
| Tests | Existing economy, logistics, and downtime tests. |

### Commanders

| Field | Evidence |
| --- | --- |
| Reference role | Levels, star caps, skills, and a talent tree with respec. Exact point curves: unknown. |
| Current rules | Level = `min(stars × 10, 1 + floor(xp / 100))`, stars 1–6, so the cap is 60. Four skills, unlocked by star, max 5. Expertise is Epic/Legendary with all skills at 5. Summons spend sigils. Ordinary-resource sigil purchases stay closed. Gold cannot buy a commander. |
| Talents | Points = `floor(level / 5)` (0 through level 4, 12 at level 60). Trees: Warhost (`line-oath`, `forsaken-bane`, `iron-lung`), Provision (`pilgrim`, `trail`, `satchel`), Sanctuary (`hearth`, `bulwark`, `warden-eye`). Rank 3. A node with `requires` needs the parent at rank ≥ 1. Respec costs Mana and refunds the points only. |
| Modifiers | Folded into `skillModifiers`. With an empty tree every talent factor is 1 (mitigation +0). Each relevant rank is +2% damage, +2% PvE damage, +2% health, +3% gather, +2% march speed, +3% recovery, or +1% mitigation. |
| Still missing | Equipment, pairing bonuses, a second talent page, and any paid talent unlock. Do not add an ordinary-gold commander purchase. |
| Priority | P1, backend implemented. |
| Tests | `gameplay-parity.test.mjs` talent and migration cases. Existing progression tests. |

### Buildings and research

| Field | Evidence |
| --- | --- |
| Current rules | One of each building. Citadel requirements are in `CITADEL_REQUIREMENTS`. Worker crews are 1, or 2 after the Builders' Lodge. Academy level limits research rank. Heroic Formations (`drill`) is the prerequisite for Oaths of Endurance, Reading of the Veil, and the veteran path. No cycle was found: harvest, writing, masonry, logistics → march, drill → vitality / veilreading / veterans. |
| Still missing | Multiple copies of the same economic building, civilization-specific research, and a march-capacity technology separate from the citadel march count. |
| Priority | P1 audit. Dependencies already gate citadel 2–5. Not rewritten in this slice. |
| Tests | Existing `city.test.mjs` and progression-experience tests. |

### Scouting and visibility

| Field | Evidence |
| --- | --- |
| Current rules | Terrain is unexplored or permanently explored (`exploration.explored`). Outlook of the Horizon (`scoutcamp`) owns scout count, speed, reveal, and auto-explore. Recon reports are private (`server/recon.mjs`). Depth 1–3 is unchanged. Aether is never in a recon store reading. |
| Last seen | `lastKnown` means the stockpile, owner, or count was copied while the object was in vision and is not live now. Explored terrain does not delete that memory. The Linux client labeled that memory "Last seen", which reads like a terrain fog state. It is not. |
| Contract added | Every fog object and city now has `terrainExplored`. Static geography in an explored sector stays `lastKnown: true` and `terrainExplored: true`. Hidden enemy marches are omitted by `filterFog`; they are not given a last-seen ghost. Private reports stay on the owner's snapshot only. |
| Unity must | Draw explored terrain clear. If `terrainExplored && lastKnown`, the label may say the count is historical. It must not say the terrain was last seen. If `!terrainExplored`, keep the sector concealed. Ignore unknown JSON fields on older clients; Unity's JsonUtility already does. |
| Priority | P1 contract. Rendering belongs to the visual client. |
| Tests | `gameplay-parity.test.mjs` plus existing core-corrections lastKnown assertions. |

### Market

| Field | Evidence |
| --- | --- |
| Current rules | `TRADES` is empty. The Agora sends ordinary resources to alliance members, 10% tax, 3000 sent per day (`ECONOMY` in `server/economy.mjs`). Travel time is zero. Aether and sigils cannot move. Outsiders do not see receipts. |
| Why it stays narrow | An instant personal exchange would be a resource generator. A traveling merchant is a real system and needs its own abuse tests. It is not in this slice. |
| Priority | P2. |
| Tests | Existing economy transfer tests. |

### Combat, alliances, world

| Field | Evidence |
| --- | --- |
| Combat | One-second rounds. Class counter is ±15% by weighted counts (infantry beats cavalry, cavalry beats archers, archers beat infantry). Rage 1000 casts the active skill. Wounded fill `25 + 15 × infirmary` beds. Home armies are protected. |
| Alliances | Roles, help, reinforcements through marches, shared vision for allied cities and sites, private reports. No alliance technology tree and no territory upkeep. |
| World | Divine Gates, provinces, kingdom stages, strongholds, and camps exist and are server-owned. |
| Still missing | Rallies as a first-class timed join, alliance research, territory, and a longer PvE ladder than the authored camps and strongholds. |
| Priority | P2–P3. Not started here. |

## Progression tables (this game)

### Army

| Citadel | Hall | Capacity | Batch | Infantry order | Seconds at that hall |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 40 | 5 | 50 food, 20 gold | 8 |
| 2 | 2 | 85 | 5 | 50 food, 20 gold | 8 / 1.1 |
| 3 | 3 | 150 | 10 | 100 food, 40 gold | 16 / 1.2 |
| 4 | 4 | 235 | 20 | 200 food, 80 gold | 32 / 1.3 |
| 5 | 5 | 360 | 40 | 400 food, 160 gold | 64 / 1.4 |

Hospital beds are extra: 40 at infirmary 1, 100 at infirmary 5. They count toward the training cap while occupied. Marches: 1 per citadel level, up to 5.

### Passive production, one building, harvest 0

Every 5 seconds: 2 × level for food, wood, stone, gold; 1 × level for mana. Citadel 1, vault 0, cap 550. Citadel 5, vault 5, cap 2000. A level-5 farm with no harvest research is 2 × 5 = 10 food per 5 seconds, 120 food per minute, until the cap. One infantry batch of 40 costs 400 food, so passive food alone is a few minutes of one building at the top of the curve and is not the late-game source.

### Commander talents

| Level | Points | Notes |
| --- | --- | --- |
| 1–4 | 0 | Skills still work. |
| 5 | 1 | First node in any tree. |
| 10 | 2 | A child node becomes reachable. |
| 30 | 6 | Two nodes at rank 3, or a wider spread. |
| 60 | 12 | Nine nodes exist, 27 ranks total, so the tree stays a choice. |

Respec: 15 Mana per rank currently spent. Minimum 15.

### First sessions

- First 30 minutes: citadel 1, 40 troops, batches of five, one march, scouting and the first node delivery. Talents are closed until level 5.
- First day: citadel 2 opens cavalry, a second march, and the Agora. Hall 2 is still a batch of five, slightly faster.
- First week: citadel 3–4, batches of 10 then 20, Veteran Oaths, hospital beds matter, talent points start to branch.
- First month and after: citadel 5, batch 40, five marches, 360 troop ceiling, talent respecs as the real long-term choice. There is no tier III and no alliance technology, so the month-later ceiling is still short of a live RoK/CoD kingdom.

## Ranked backlog

1. P1 done: troop ceiling, proportional training batches, talent backend, explored-terrain snapshot flag.
2. P1 remaining: training-cost research, commander march-size bonus, multiple economic buildings. Do these only with a cost pass against gathering income.
3. P2: traveling alliance trade with a real march and the same tax, rally join timers, alliance research.
4. P3: tier III units, equipment, territory upkeep.

## Client contract

`city` snapshot gains `trainingBatch` and `trainingDuration` (seconds for one order at the current hall).

Own `heroProgress` gains `talentPoints`, `talentPointsSpent`, and `talents[]` with `nodes[].rank`, `max`, `requires`, `effect`, `available`. Commands: `{ type: 'talent-raise', targetId: commanderId, name: nodeId }` and `{ type: 'talent-respec', targetId: commanderId }`. Other players must not receive `heroProgress` or talent maps. They already do not.

Map objects and foreign cities gain `terrainExplored`. Keep rendering `lastKnown` counts as historical. Do not treat `lastKnown` as fog.

Schema 18 saves without `heroRecords.*.talents` load as `{}`. Forged training amounts outside `{5, 10, 20, 40}` fail validation.

## Honest depth

The server now has a coherent early army, a citadel-5 ceiling of 360 instead of the previous 140, a real talent choice, private recon, permanent exploration, delivery-based gathering, and a taxed alliance gift. It does not yet have the long-horizon loops that make a kingdom strategy game last: tier ladders past II, equipment, rallies, alliance technology, or territory. Calling that parity would be false.
