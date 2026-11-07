# Opening campaign · 0.13

The opening uses a chapter/task/reward structure inspired by Rise of Kingdoms,
with original mythology writing and the systems already playable in Thrones of
Myth. The persistent left HUD shows the next objective, a progress bar and a
Go/Claim action. Clicking its title opens the Campaign screen.

## The six chapters

| Chapter | Objectives | Chapter reward |
| --- | --- | --- |
| I · From the Embers | Gather 40 wood; gather 40 food; complete training for 10 mortal troops | 100 wood, 100 food, 75 gold, 50 stone |
| II · The Age of Oaths | Citadel 2; Blessed Fields 2; permanent second construction crew | 150 wood, 100 food, 100 gold, 100 stone |
| III · A Hero Answers | Temple of Echoes; one summon of any rarity; three camp victories | 100 stone, one sigil, plus the existing Atalanta package if unclaimed |
| IV · Beyond the Veil | Complete a scouting survey; discover 50 sectors; Pilgrim Logistics 1 | 100 each wood/food/gold/stone, 10 aether |
| V · Raise the Banners | One commander at level 2; Heroic Formations 1; two deployed marches | 100 wood, 150 food, 100 gold, 80 stone |
| VI · An Oath at Dawn | Join/found an alliance; Oathbound Hall; allied shrine ownership; arrive as a garrison | 200 wood, 200 food, 150 gold, 150 stone, 20 aether, two sigils |

There are 19 objectives, each with its own visible resource reward, plus six
chapter rewards. The individual rewards help fund the next actions. The complete
opening can be finished through legal gameplay without purchased resources,
forced summon rarity, scripted victories or skipped building prerequisites.
The final objective is normal kingdom cooperation, not KvK or a compulsory attack
on another player's city.

## Progress and claiming

Tasks record a high-water mark even before their chapter unlocks. Finishing a
research task early or already belonging to an alliance does not require repeating
it later. Recorded achievements survive withdrawal of a march, membership
changes, lost territory and restart. Future chapters can be previewed and their
Go actions used, but their rewards stay locked until previous chapter rewards are
claimed.

Claim each completed objective, then the chapter reward. Claims are explicit,
server-validated and once per city. A repeated/stale claim fails without paying a
second time. Request fields cannot supply progress or choose another city's
campaign. The server derives all targets, thresholds and reward amounts from
`chapters.mjs`; private progress is omitted from other players' snapshots.

Field gathering counts only actual wood/food removed from resource nodes.
Passive income, gifts, exchanges and objective rewards do not count. Training
counts at completion, not when queued; canceled jobs cannot provide progress.
Scouting counts at arrival when its report is generated; an early recall does
not count. Garrisons count after an owned march arrives at an allied structure.
Allied shrine ownership is a shared objective and also counts if a new member
joins an alliance already holding a shrine.

## Guidance and interface

Campaign is available in the activity navigation and Chronicle. The next task
appears in the map HUD. Go selects the relevant building or research, opens
training/Temple/commanders/marches/alliance/Warfare, or selects and focuses a
currently visible resource, camp or shrine on the map. It does not spend resources,
issue combat orders or move the army without the player's instruction.

If a resource or camp is out of current vision, Go opens Exploration. This also
lets players learn scouting before its formal chapter; the achievement will be
remembered. Starter Sacred Grove and Harvest Fields now sit at (8,12) and (12,10),
within the founding city's initial vision. The research guide takes players to
the Athenaeum building first if necessary, then selects the relevant technology.
Ordinary building prerequisites and lane/resource limits remain in effect.

The existing three-camp quest endpoint and Chronicle claim remain compatible.
Both it and chapter III use one reward flag: guaranteed Epic Atalanta, 200 gold,
150 wood and 150 food are granted once. Claiming the legacy reward early does not
block chapter III or grant that package again. Its chapter reward preview removes
the already-claimed bonus. The Temple objective accepts any summon result and
provides an earned sigil via the temple-building task reward.

## Saves and verification

Build 0.13.0 uses protocol 10 and schema 8. Old schemas 1–7 migrate with untouched
versioned archives. Existing resources, commanders, queues, discovery, reports,
alliances and territory remain. The two starter nodes move without resetting
stocks or refill clocks. Existing cities gain retrospective credit from saved
building/research/summon/commander state, camp victories and retained scout
reports. Training is conservatively inferred from current mortal units beyond
the founding 20, including reserves and hospital/treatment populations. Historical
gathering is not invented; that count starts at zero on migration.

Tests cover a complete fresh-city campaign using only legal commands, distinct
metric sources, early achievements, completion/claim ordering, reward retries,
legacy reward compatibility, malformed saves, migration and authenticated HTTP
privacy. Unity source syntax and partial method references are checked in the
cloud; Unity compilation, native layout/input, timings and Windows builds require
local testing.

Pull main, stop old servers, then rebuild **Thrones of Myth → Build Windows
Playtest**. Open **Campaign** or use the persistent objective HUD. A new city is
the best way to review the opening pacing; existing cities retain their saves.

This milestone supplies the opening chapter spine and contextual navigation.
It does not add a voiced/cinematic tutorial, guided hand animations, daily/weekly
quests, rally bosses, scheduled kingdom events or later campaign chapters.
