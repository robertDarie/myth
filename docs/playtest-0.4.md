# Playtest 0.4: institutions, knowledge and echoes (historical)

For current behavior see [Playtest 0.5](playtest-0.5.md).

The [city/economy design](city-and-economy-design.md) explains all reference roles,
our thematic adaptations, resource sinks, prototype tuning and future systems.

## Update from 0.3

Close the game and any terminal server, pull main, reopen Unity and choose
**Thrones of Myth → Build Windows Playtest**. Extract the new ZIP completely or
use the newly built installer. Client and launcher now require protocol 4.

Your 0.3 world save migrates automatically to save schema 2. Existing cities,
resources, commanders, allies, territory, troops, reserves and paid queues remain.
The migration adds 150 stone, 30 aether and three Oracle Sigils once, and preserves
already unlocked beast recruitment. It adds the new gathering sites without
resetting the original ones. The original schema-1 file is archived as
`world.json.schema1.bak` so future autosaves do not erase the migration backup.
Keep that archive if you want the option to roll back to 0.3.

## First steps

1. Open **City → Districts**. Select Temple of Echoes and construct it. You can
   open the clickable city overview to inspect all fifteen institutions.
2. Open **City → Temple**, claim the free offering, and invoke an echo. Read the
   odds, guarantees and duplicate rules before spending. Summons consume only
   the sigils shown; buying additional sigils is a separate explicit action.
3. Build Titan Stoneworks. Fields/Grove/Stoneworks produce resources while the
   server is running. The Vault raises their passive stockpile ceiling.
4. Raise the Citadel to 2, then build the Athenaeum of Ages. Open **Research**
   and choose an economic or military technology. Its lane runs alongside
   construction and training.
5. Build the Sanctuary of Beasts to recruit your civilization's mythic units.
   The training lane and home reinforcement remain under **City → Training**.
6. Build a Treasury and Aether Well, and try gathering new stone/aether nodes.
7. Recruit directly or use the Temple to expand your roster. Duplicates give
   commander-specific shards; **Heroes → Ascend** spends shards and gold to
   improve that commander. Rank never silently heals an injured field army.
8. At Citadel 2, build the Agora for visible fixed resource exchanges. Build
   Oathbound Hall and join an alliance to help allied construction/research jobs.
9. At Citadel 3 and Stoneworks 2, build Forge of Dawn, craft a relic, and equip it
   when your army is idle at home. Crafting runs in its own lane.

## Initial economy and limits

Five ordinary resources: food, wood, stone, gold and aether. Every district shows
its next cost, time, current level and unmet requirement. Research shows its
prerequisites and exact bonus. No payments or purchasable currency are present.

Temple base chances: Common 40%, Rare 35%, Epic 20%, Legendary 5%. Within each
rarity, commanders are equally likely. Epic-or-better by pull 10; Legendary by
pull 50. Qualifying results reset their respective counters. Counters and history
survive restart. See the design document for conditional guarantee odds.

The roster currently has 11 commanders, including original mortal roles and
legendary/mythological figures. Direct recruitment and the Epic quest remain
available. Commander-specific XP/skill trees, active abilities and pairings are
not part of this slice.

The House of Renewal currently improves home health recovery; it is not yet a
wounded-troop hospital. Vault limits passive income; it does not yet protect
resources against raids. Oathbound Hall helps jobs; it does not yet host allied
armies. These narrower functions are stated explicitly in the client and design.

## Saving and testing

World saves remain under `%LOCALAPPDATA%\ThronesOfMyth\Saves`. Reopen with the same
name and saved local profile. Time pauses when the server is stopped. New build
artifacts do not include your personal save or local session credentials.

Automated checks cover costs, prerequisites, buffs, production, summons, guarantees,
refunds, aid, relics and migration. C# and PowerShell syntax checks supplement them.
Unity compilation, city-overview usability, summon reveal rendering and Windows
packaging still require validation on the Windows editor/build.
