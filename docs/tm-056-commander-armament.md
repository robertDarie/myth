# TM-056 commander armament — design awaiting approval

This design is not implemented. Schema stays 18. March relics stay as they are. No new currency, drop table, or inscription roll is added by this document.

## What already exists

The Forge of Dawn crafts two march relics:

| Id | Name | Effect | Cost | Time |
|---|---|---|---|---|
| `aegis` | Bronze Aegis | maximum health × 1.10 | 80 stone, 60 gold, 10 Mana | 15 s |
| `ember-spear` | Ember Spear | damage × 1.10 | 80 wood, 70 gold, 15 Mana | 18 s |

A march holds one `equippedRelic`. Equipping does not raise current health. Unequipping clamps health to the new maximum. A second march cannot take a relic that is already equipped. A save that copies one relic onto two marches is rejected. The commander does not own the relic. `stats()` in `server/world.mjs` multiplies the relic into health and damage beside civilization, commander, technology, rank, and skill modifiers.

The Forge of Dawn requires Citadel of Mortals 3 and Titan Stoneworks 2. It uses its own crafting lane.

Talent points are `floor(commander level / 5)`. A level-1 Frontier Captain has no point to spend.

## Proposed ownership

Armaments are commander-owned pieces, separate from march relics.

- The city owns each crafted piece once. There is no second copy of the same piece id.
- A piece is equipped on at most one commander.
- Three slots per commander: Weapon, Armor, and Banner.
- The piece moves with that commander. Reassigning the commander to another march moves the armament bonuses and leaves the march relic where it was.
- Equip and unequip are allowed only while every march led by that commander is home, matching the existing home rule for relics.
- Unequipping an armor piece clamps each of that commander's home marches to the new maximum health.

## Proposed pieces

One named set, Oath of the Frontier. Costs use ordinary resources and Mana. Aether is not spent.

| Slot | Name | Craft cost | Time | Equipped effect |
|---|---|---|---|---|
| Weapon | Frontier Spearhead | 60 wood, 40 gold, 10 Mana | 20 s | damage × 1.03 |
| Armor | Frontier Cuirass | 60 stone, 40 gold, 10 Mana | 20 s | maximum health × 1.03 |
| Banner | Frontier Standard | 40 wood, 40 stone, 15 Mana | 20 s | march speed × 1.03 |

Two equipped pieces of this set add camp and stronghold damage × 1.02 once. The third piece does not apply that bonus a second time. There is no random stat and no inscription.

## Combat

Armament multipliers apply in `stats()` after the existing relic multiplier, only for the march's current commander. A march can have Ember Spear and a commander weapon at the same time. They are different owners and different multipliers, so Ember Spear stays × 1.10 and the weapon adds its own × 1.03. They do not share a slot and one does not replace the other.

## Crafting and persistence

Crafting uses the existing Forge of Dawn lane. A relic order and an armament order cannot run together. Cancellation refunds the order once, as training and relic orders already do.

Persistence needs a new schema, proposed as 19, with a migration test. Schema 18 saves gain `ownedArmaments: []` and empty commander slots. A save that equips one piece on two commanders, names an unknown piece, or fills a slot with a piece of the wrong role is rejected. Schema 18 remains the live schema until that migration is approved and tested.

## Not in this proposal

Random inscriptions, loot chests, pity, Aether prices, extra marches, or a second forge building. Those stay unbuilt.
