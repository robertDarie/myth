# Daily activity and alliance goals · 0.15

The Activity screen adds a choice of daily tasks, five deterministic reward
chests and weekly shared alliance goals. There is no purchase task, required
summon rarity or streak mechanic. The existing chapter campaign remains separate.
The map activity header links directly to Daily activity; the alliance screen
links to Alliance weekly goals. Activity navigation now scrolls to fit smaller
windows without hiding the later pages.

## Daily tasks

| Task | Requirement | Points |
| --- | --- | --- |
| Supply the city | Gather 200 resources in the field | 20 |
| Fill the granaries | Gather 120 food | 15 |
| Prepare the ranks | Finish training 10 mortal troops | 20 |
| Read the frontier | Receive one scout survey | 20 |
| Clear the roads | Participate in two Forsaken camp victories | 20 |
| March through the realm | Move armies a total of 40 map units | 20 |
| Hear an echo | Collect the free Temple offering | 10 |
| Lend your strength | Successfully help two allied jobs | 15 |
| Build for tomorrow | Finish one building, Citadel upgrade or research | 15 |
| Break the Godbreakers | Earn one stronghold-victory contribution credit | 25 |

Completing a task makes it claimable. Claiming gives 10 gold and its listed
activity points. Points are derived from claimed task IDs, not a mutable client
score. Tasks overlap naturally: food contributes to general gathering, and armies
travelling between normal activities build patrol progress.

The final chest requires 100 of the available 180 points. Repeatable solo tasks
(gathering, food, scouting, camps, patrol and the free offering) provide 105.
A legal-command playthrough verifies this without alliance participation,
training, research or summons. Players at maximum building/research/troop capacity
therefore retain a path through repeatable tasks. Building the Temple once is
required to collect its free offering; constructing it also satisfies development.

Go actions reuse the campaign's contextual navigation. They select the relevant
building/research or open training, exploration, commanders, alliance or Warfare.
Gathering/combat guidance focuses currently visible targets or opens scouting.
Patrol guidance focuses the selected army and explains how to issue a march; it
does not move the army automatically.

## Activity chests

| Required claimed points | Fixed reward |
| --- | --- |
| 20 | 60 wood, 60 food, 30 gold |
| 40 | 50 stone, 80 food, 40 gold |
| 60 | 100 wood, 100 food, 60 gold, 5 aether |
| 80 | 100 stone, 80 gold, one sigil |
| 100 | 150 wood, 150 food, 100 gold, 10 aether, two sigils |

Each chest opens once per UTC day. Opening it does not spend points. All eligible
chests can be opened, in any order, and their contents are shown before claiming.
Task and chest rewards do not create additional gathering progress.

## Weekly alliance goals

| Shared goal | Alliance target | Personal requirement | Reward per eligible city |
| --- | --- | --- | --- |
| Provision the alliance | Gather 1,600 resources | Gather 100 with this alliance | 200 wood, 200 food, 150 gold, 100 stone |
| Many hands, one city | Eight successful job assists | One assist with this alliance | 120 gold, 120 wood, 80 stone, 10 aether |
| Bring down their banners | Three distinct stronghold victories | Contribution credit in one | 200 gold, 200 food, 20 aether, two sigils |

These are fixed rewards for each eligible member, rather than a pool divided
between members. Stronghold encounter loot continues using its separate shared
pool. A single stronghold victory advances alliance progress once even when
several members earn personal credit. Multiple owned marches do not multiply
that credit. Only owners who qualified for the stronghold's contribution reward
receive credit. A withdrawn contributor who leaves the battle's alliance can
retain daily victory credit but cannot transfer that victory to a new alliance's
weekly ledger.

Gathering and assistance belong to the alliance where the event occurs. Work
before joining does not transfer into a new alliance. Members must currently
belong to the alliance and meet their own contribution threshold to claim.
Former members' contributions remain in its shared weekly totals, labelled as
former-member entries. Leaving/rejoining does not erase a player's weekly claims:
each goal type pays once per city per week across all alliances. Disbanding and
recreating an alliance cannot reset that personal claim ledger.

## Reset and persistence rules

Daily activity resets at **00:00 UTC**. Weekly alliance goals reset at **Monday
00:00 UTC**. Periods and countdowns come from the server; local Windows timezone
settings do not choose the reset. Unclaimed rewards expire with their period;
there is no automatic claim or rollover currency.

This calendar advances in real time while the server is closed. The world
simulation, queues, scout movement and stronghold respawns still pause while
closed. On reconnect, elapsed daily/weekly periods reset without inventing
completed work. Work queued before midnight counts on its actual completion day.
Daily rollover leaves that week's alliance work intact.

The latest observed server calendar time is saved as a high-water mark. A clock
rollback cannot reopen an earlier period or re-enable its claims. The free Temple
offering uses the same calendar clock. Claims carry an explicit period token;
weekly claims also carry the alliance ID. Requests from an expired day/week or a
previous alliance fail rather than silently claiming a newly available reward.
Repeated claims do not pay twice.

All counters come from successful server events. Training/construction/research
count after completion. Surveys count at arrival, not on send/recall. Failed or
duplicate assists do not count. Patrol sums server-observed army displacement,
excluding scout movement and forced-retreat teleports. Passive production, gifts,
market exchanges, chapter rewards and canceled jobs do not fabricate these
counters. Actual successful assistance counts when given, even if the recipient
later cancels that job.

Daily progress/claims are private to the owning session. Weekly totals and named
contribution rows are visible only to current alliance members through their
Activity view; public alliance records exclude that ledger.

## Build and test

Build 0.15.0 uses protocol 12 and schema 10. Schemas 1–9 migrate with untouched
versioned archives. Existing resources, troops, commanders, chapters, territory
and reports remain. Daily/weekly activity starts fresh on migration; historical
activity is not invented. Saved counters, claims and period time survive restart.

Pull main, stop old servers and rebuild **Thrones of Myth → Build Windows
Playtest**. The package includes `activity.mjs`. Open **Activity**, use the map's
Daily button, or open weekly goals from the alliance panel.

Tests cover solo final-chest completion, legitimate event sources, assistance,
shared victory deduplication, daily/week boundaries, offline catch-up, rollback,
alliance hopping, personal eligibility, reward totals, malformed saves, archival
migration and authenticated HTTP privacy. C#/PowerShell syntax, partial methods,
metadata and module bundling are checked in the cloud. Unity compilation, native
layout/input, countdown presentation and Windows build validation remain local
playtest work.

This release does not add personal weekly quests, a battle pass, alliance
technology, contribution donations or scheduled kingdom stages. Kingdom gate/
sanctuary opening schedules are the next separate progression milestone.
