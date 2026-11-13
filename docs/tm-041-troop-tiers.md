# TM-041 troop tiers III–V

Implemented on schema 20. Health protocol stays 16. Tier I and Tier II ids, costs, and combat values are unchanged.

## Names

| Tier | Infantry | Archers | Cavalry |
|---|---|---|---|
| I | Oathguard | Dawn Archers | Dawn Riders |
| II | Veteran Oathguard | Veteran Dawn Archers | Veteran Dawn Riders |
| III | Bronze Column | Ashen Bows | Dawn Lancers |
| IV | Oath Bulwark | Far Marks | Storm Couriers |
| V | Titan Guard | Echo Marks | Horizon Lancers |

## Curve

Tier II stays at +40% health, +35% damage, ×1.6 training time, and ×1.8 food and gold plus 10 stone.

Each later tier, measured from the previous tier of the same class:

- Health × 1.22
- Damage × 1.18
- Training time × 1.28
- Food and gold × 1.55, rounded up
- Stone 25, then 45, then 70

Power per soldier is 5, 8, 12, 17, and 23. Carry weight stays with the class: 16 infantry, 12 archers, 24 cavalry. A mounted march is still faster only when every mortal soldier is cavalry. Infantry counters cavalry, cavalry counters archers, and archers counter infantry, at every tier.

## Unlocks

Veteran Oaths still opens Tier II.

| Tier | Citadel | Hall of Spears | Athenaeum | Research | Previous research |
|---|---|---|---|---|---|
| III | 3 | 3 | 3 | Bronze Columns | Veteran Oaths |
| IV | 4 | 4 | 4 | Oath Bulwarks | Bronze Columns |
| V | 5 | 5 | 5 | Titan Host | Oath Bulwarks |

Research times use the existing formula with a pace of 2, 3, and 4, so the base times are 24, 36, and 48 seconds before Runic Scriptoria.

## Training and promotion

Every unlocked tier can be trained. Hall batches stay 5, 5, 10, 20, and 40. One lane holds three orders.

Promotion takes exactly five ready soldiers of the previous tier and returns five of the next. It charges only the resource difference and uses the difference in training time. It does not raise the soldier count. Cancelling returns those five soldiers and the resources. A Tier I soldier cannot be promoted straight to Tier V.

Healing cost stays two food and one gold per tier-weight. A Tier V soldier weighs 5. Hospital beds still count soldiers, not tier.

## Saves

Schema 18 and 19 load as schema 20. Missing Bronze Columns, Oath Bulwarks, and Titan Host research starts at rank 0. Existing soldiers, relics, and armaments stay. A save that contains a locked higher tier, a fractional count, an unknown id, or a promotion from the wrong source is rejected.
