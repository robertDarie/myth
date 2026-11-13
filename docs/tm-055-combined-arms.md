# TM-055 Combined Arms

One formation. It is derived from the march's current mortal troop counts. The client cannot request it, and it is not stored in the save.

## Rule

A march qualifies when infantry, archers, and cavalry are each at least 15% of its mortal troops. Tiers I–V of the same class count together. Mythic escorts are excluded from the count and from the share. The comparison is integer: `classCount * 100 >= mortalTroops * 15`. A displayed percentage is only a preview of that rule.

The effect is ×1.04 maximum health, applied once inside `stats()`. It multiplies after civilization, commander, vitality, rank, relic, talent, armament, and companion health factors. It does not change damage, speed, class counters, or camp damage.

Three soldiers, one of each class, qualify. One soldier of each class in a march of seven does not, because 1/7 is below 15%. Three of twenty is the exact boundary and qualifies. Two of twenty does not.

## Health

A new march starts at its current maximum. A march that is already at full health adopts the new maximum when it is reformed, including the Combined Arms bonus, and a lower maximum clamps current health. A damaged march cannot change composition, so the change cannot heal it. Home recovery stops at the current maximum.

Schema stays 20. Health protocol stays 16.
