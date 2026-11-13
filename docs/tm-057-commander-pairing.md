# TM-057 secondary commander pairing

Implemented with the schema 19 armament migration. Health protocol stays 16. An old save keeps its primary commander and gains an empty companion.

## Assignment

A march has one primary and one optional companion. The companion must be a recruited commander. The companion cannot be that march's primary, and cannot be the primary or companion of any other march. Changing either commander requires the march to be home, stopped, and free of cargo. Unpairing clamps health to the new maximum. Pairing does not create troops, relics, or armaments.

## Contribution

The companion does not cast a skill and does not spend talent points for the march. The companion adds `1% × companion level` to damage and maximum health. Level 1 is × 1.01. The companion's own armament multipliers apply after the primary commander's. Camp victory experience stays with the primary at the existing grant. The companion receives `floor(half of that grant)` as extra experience.

## Client

The Hall of Commanders assigns the inspected commander as primary or companion of the selected march. Compare reads `/commander-comparison` for the same march. A commander who already serves is not offered as available. The Forge of Dawn equips Weapon, Armor, and Banner on the inspected commander and states the lock when one of that commander's marches is away.
