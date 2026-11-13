# V1 functional backlog

This is the working order for functional completeness. It is not a line-by-line audit of the coverage register. Most register rows still say `NOT AUDITED` even where server tests already exist. A passing test is not treated as proof that a whole system is finished. Future 3D, randomized inscriptions, and unapproved premium commerce stay out of this list.

## Done in this package

### A. Commanders, equipment and troops

- **TM-056 / 09-009 / 16-031 — commander armament.** Forge of Dawn crafts Frontier Spearhead, Frontier Cuirass, and Frontier Standard. The city owns each piece once. One commander wears it in Weapon, Armor, or Banner. Two pieces of Oath of the Frontier add camp and stronghold damage × 1.02 once. Equip and unequip wait until every march that commander serves is home. Bronze Aegis and Ember Spear stay march relics. Schema 19. Protocol 16.
- **TM-057 — secondary commander.** One companion per march. They add 1% damage and maximum health per companion level, do not cast a skill, and receive half of the primary's camp experience grant on top of it. A commander cannot serve twice. Old saves keep the primary and an empty companion.

Acceptance for both: valid and invalid commands, ownership, forge cost and cancel refund, deployed lock, duplicate-piece rejection, relic separation, set bonus, companion experience, and schema 18 migration are covered by `server/armament.test.mjs`. The forge and hall send `equip-armament`, `unequip-armament`, `pair-commander`, and `unpair-commander`.

## Next package

### A. Troop tiers III–V (TM-041, 02-022)

Do not add a tier selector until the tier exists on the server.

What exists: Tier I Oathguard, Dawn Archers, and Dawn Riders. Tier II veterans of those three classes. Veteran Oaths is one Athenaeum rank. Training, promotion of five Tier I soldiers, healing, and power already distinguish tier 2 in `server/troops.mjs`.

What a real Tier III–V package has to add together:

- New research beyond Veteran Oaths, with Athenaeum and Hall of Spears requirements.
- Training costs, durations, and Hall of Spears batch rules for each new tier.
- Promotion that spends the cost difference and does not create soldiers.
- Power, healing, and `troopBase` combat values for the new ids.
- Save validation so a locked tier cannot appear in reserves, marches, hospitals, or queues.
- The training screen reading those server options, including the lock reason.

Formation bonuses are not part of the current troop stats. They belong with this package only if the bonus is a documented rule on the existing infantry, archer, and cavalry counts.

## Later functional packages

### B. City, research and economy

Citadel ages, one shared training hall, the forge, and production cycles exist. The next economic work is more military and civic research with effects that already have a stat to change, not a new currency. Rates were server-tested and not rebalanced.

### C. World map, exploration and combat

Fog, camps, gathering, and one relic per march exist. Kingdom provinces, multiple kingdoms, kingdom age, and migration (TM-016 through TM-019) are not built. Large-world performance (TM-025) and mass-battle scale (TM-084) stay infrastructure work.

### D. Alliances, diplomacy and warfare

Beacons, supply radius, rallies, garrisons, and strongholds exist. Coalitions and diplomacy (TM-077) are not built. Territory is a beacon supply radius, not an ownership polygon or a resource bonus.

### E. Daily progression, events and seasons

Daily and weekly goals exist and are server-tested. The event hub (TM-071) and seasons (TM-072) are not built. Seven-day rewards are the first slice to add here, using ordinary resources only.

### F. Multiplayer infrastructure and operations

Protocol 16 and schema 19 persistence exist for one kingdom. Multiple kingdoms, migration, and the scale of many simultaneous battles are the remaining operations gap.

### G. Functional UI and accessibility

The forge, hall, training, and guide screens send server commands for the systems they already cover. Missing functional screens follow the systems above. Commander-specific stages and extra 3D motion (TM-058, TM-059) wait for the visual phase. The Frontier Captain presentation stays as it is.

## Kept out

- Randomized inscriptions, loot chests, and extra armament copies (09-010).
- Aether prices and new premium currencies.
- New 3D models and cinematic effects.
- Roads, claim polygons, and territory resource bonuses that this game has already declined.
