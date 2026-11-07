# Godbreaker Strongholds · 0.14

Godbreaker Strongholds are repeatable rally-only PvE encounters, separate from
solo Forsaken camps and capturable sacred sites. This release implements the
first coordinated-PvE milestone; daily/weekly tasks, alliance contribution goals
and scheduled kingdom milestones remain separate future work.

## Encounters and access

| Tier | Encounters | Guard HP / base retaliation | Wall HP | Geography |
| --- | --- | --- | --- | --- |
| 1 | Godbreaker Watch; Godbreaker Redoubt | 300 / 12 | 180 | Starting province: (27,20), (14,32) |
| 2 | Godbreaker War Forge; Godbreaker Runic Spire | 650 / 25 | 300 | East (53,24) and north (24,53) |
| 3 | Throne of the Godbreakers | 1,050 / 44 | 500 | Inner province (62,61) |

Tier 1 guards are infantry, tier 2 mixes infantry/archers, tier 3 mixes all three
mortal troop types. Troop counters, commander stats, PvE bonuses, healing and
shields affect combat. Gates control access and all contributors use the shared
corridor route graph. Strongholds do not require beacon supply and are never
captured or garrisoned by players.

Scout the frontier to reveal encounters. Current vision shows live guard/wall
health and reforming timers. Scout reports retain historical stronghold data, so
the Warfare target selector can offer previously surveyed encounters after the
scout returns. Server readiness and generation checks reject stale targets.

## Rally rules

Any alliance member can lead a stronghold rally with Citadel 2, an Oathbound Hall
and a fully recovered idle march at home. The officer/leader restriction remains
for attacks on player-owned structures. Assembly timers are 10/30/60 seconds,
with the existing five-march / 200-load cap; a mortal uses one load, a mythic five.

At least two marches must reach assembly to depart, and the rally must retain two
until combat starts. Two marches from one city are allowed for local playtesting
and developed solo cities; rewards are still aggregated per city. One rally can
reserve a target at a time. Marches travel at the slowest contributor's speed.

Guards take damage first; surviving attackers then breach the walls. The guard
force retaliates against a rotating attacker once per second. Attacks and
retaliation resolve simultaneously: killing the guards in a round does not erase
their already-prepared retaliation. Walls do not retaliate after guards fall.
Each attack keeps the contributing march's own stats and cooldown.

Surviving marches can continue after a commander retreats; another contributor
becomes acting leader. Withdrawing the acting leader voluntarily cancels the
rally. Other contributors may withdraw and retain their historical damage entry.
NPC combat ends after 90 rounds if the walls have not fallen. Defeat, withdrawal,
access loss, timeout or restart resets the encounter to full guard/wall HP, so
successive failed attempts cannot chip it down for free. No failure pays rewards.

Defeated marches use the existing typed nonlethal hospital transfer, preserving
unit ownership. Survivors automatically return home after victory. A withdrawn
march can be disbanded later without invalidating its historical contribution or
an interrupted report on restart.

## Reward accounting

Each victory divides one fixed pool, rather than creating a full payout for every
march. Actual guard damage plus actual wall damage determines contribution.
Overkill damage is credited proportionally so report totals reconcile. Owners
who dealt no damage receive a battle report but no rewards or victory credit.
Withdrawn or retreated owners who contributed damage remain eligible if the
remaining rally wins. Merely assembling or travelling is insufficient.

| Tier | Total shared resource pool | Total commander XP |
| --- | --- | --- |
| 1 | 120 wood, 160 food, 160 gold, 80 stone, 8 aether, 2 sigils | 100 |
| 2 | 240 wood, 300 food, 300 gold, 160 stone, 16 aether, 3 sigils | 200 |
| 3 | 400 wood, 500 food, 500 gold, 240 stone, 30 aether, 5 sigils | 350 |

Contributions first aggregate by city. Integer rewards use largest-remainder
allocation, with stable ID ordering for ties; every resource and XP total equals
the advertised pool exactly. Small shares can round to zero, including sigils.
Extra marches cannot multiply a city's reward. Each city's XP share is divided
among the commanders that actually fought, weighted by their recorded damage.
XP follows the recorded commander even if a withdrawn march changes commander or
is disbanded. Rewards do not create free healing.

Delivery is automatic once at victory, without a client-supplied payout or claim
amount. Each participating owner gets one private group report with guard/wall
HP before/after, damage, shields/healing, wounded units and their actual resource/
XP receipt. A city receives one stronghold-victory increment per qualifying win;
this does not advance the existing three-Forsaken-camp quest.

## Repeatability, saving and package

A defeated stronghold reforms after 300 simulated seconds. A new generation
restores full guard/wall HP; old rally generations cannot attach to it. Respawn
timers, completed reports, rewards and victory counters persist. Time pauses
while the server is closed. Restart interrupts active attempts once, preserves
player HP/wounds and recorded reports, resets NPC defenders and never replays
victory rewards.

Build 0.14.0 uses protocol 11 and schema 9. Schemas 1–8 migrate with untouched
versioned archives and five fresh strongholds. All prior cities, chapters and
resources remain. Pull main, stop older servers and rebuild **Thrones of Myth →
Build Windows Playtest** to bundle `strongholds.mjs` with the updated client.

Scout near (20,20), then open **Warfare** or select a visible stronghold. Prepare
at least two marches, lead/join a rally, and inspect **Your battles** afterward.
Use two different city profiles, or deploy two independently commanded marches
from one developed city. Tier 1 is the initial cooperation encounter; higher
tiers need stronger formations and captured gates.

Automated tests cover all tiers, solo/two-city/five-march contribution accounting,
underfilled rallies, failure/timeout, wounded conservation, withdrawal/disband,
restart/respawn, malformed saves, legacy migration and authenticated HTTP privacy.
The client adds a procedural fortress silhouette, actual health-change feedback,
map/minimap entries, scouting details and reward receipts. Unity compilation,
rendering, animation/audio quality, native input and Windows builds still require
local verification. Numeric tuning is a prototype baseline, not final balance.
