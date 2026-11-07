# Alliance warfare · 0.11

This milestone connects alliance territory to real group battles. The Warfare
screen, map context actions and Chronicle expose the same server-owned rules.
Cities cannot be attacked. KvK remains a later milestone.

## Territory and objectives

Leaders build a root Alliance Fort within six units of their city. Leaders and
officers extend it with beacons within 12 units of a completed connected
structure. Placement must be within four units of the selected march and at
least ten units from enemy beacons. The existing limit is 20 structures per
alliance. Each costs 60 wood / 20 gold, with no demolition refund.

A fort takes 30 seconds to build and has 600 HP; a beacon takes 10 seconds and
has 250 HP. Construction does not provide supply until complete. Breaking a
connection removes supply from dependent branches immediately. A destroyed fort
can be rebuilt; disconnected branches can be dismantled to free placement slots.

Shrines have 300 HP, gates 450, and the sanctuary 650. Neutral sites use normal
territorial occupation. Enemy-owned structures require a rally and connected
supply within 12 units of the target. Existing province access rules still apply.
Unfinished enemy structures can also be attacked.

Captured sacred sites transfer to the winning alliance at half maximum HP.
Enemy forts/beacons are destroyed rather than transferred. Structures regenerate
two HP per second outside active siege combat. Officers can dismantle their own
structures only when they are not under siege; assigned garrisons return home.

## Rally contributions

Choose troops and commander using the existing formation controls first. Leading
requires leader/officer rank, Citadel level 2 and an Oathbound Hall. Starting or
joining requires an idle, fully healed march at its own city. Choose a 10, 30 or
60 second assembly period. Contributions travel to the leader's city; marches
that miss assembly return home. The rally travels together at its slowest march's
speed. One rally may target a structure at a time.

A rally accepts at most five marches and 200 load. Garrisons accept five marches
and 150 load, including reservations travelling toward the structure. A mortal
unit uses one load; a mythic unit uses five.

Each contribution remains the original owner's march, occupying its original
slot. No troops are copied into a pooled army. Each commander supplies its own
stats and abilities. Committed marches cannot receive conflicting movement,
formation or equipment orders. City construction, training and research continue.

Return/Stop or Withdraw releases that march and sends it home. A voluntary leader
withdrawal cancels the entire rally; officers can recall contributions or the
whole rally. If the commander is defeated during combat, a surviving contributor
becomes acting commander and the rally continues. Losing supply or target access
cancels the rally. Membership changes require affected commitments to be recalled.

## Garrisons and combat

An idle, non-recovering march with positive HP can garrison an allied completed
structure. It retains its current health, allowing survivors to hold a captured
gate without free healing. Contributions fight only after arriving. Late
reinforcements can join an active siege, once per march per siege; withdrawn or
defeated marches cannot reenter that same siege. Reports allow up to 64 distinct
contributions, so reinforcement reservations also enforce that bound.

Combat rounds resolve once per second with simultaneous attacks, commander
abilities, shields, healing and troop counters. Attackers must defeat the arrived
garrison before damaging the structure. Arriving defenders can interrupt that
structure damage. Defeated marches retreat under the existing nonlethal prototype
rules: 25% of mortal troops (rounded down, retaining at least one) and up to one
mythic move to their owner's hospital. There is no siege loot or duplicate reward.

Reports separate actual troop damage from structure damage and track each march's
typed units before/after, hospital transfers, healing and shields. When several
attacks overkill a target, actual HP damage is credited proportionally. Each
contributing owner receives one report even when contributing several marches.
Active reports and the latest 20 completed reports are private to participants;
alliance members can see their own alliance's rally coordination information.

## Save and package behavior

Build 0.11.0 uses protocol 8 and save schema 6. Old schemas 1–5 migrate with
versioned archival backups. Structure health, troop ownership and garrison
assignments persist. Restart cancels rallies and seals active siege reports once
as interrupted; garrisons resume their assignments. Damage and wounded transfers
are not replayed. Server time pauses while closed.

Pull main, restart any old server, and rebuild using **Thrones of Myth → Build
Windows Playtest**. The package includes the new campaign server module. The
Warfare screen lists enemy targets, rally rosters, garrisons and recall controls.
Chronicle → Your battles shows group reports alongside field duels.

## Playtest and limits

Use multiple clients with different player names. Found opposing alliances;
upgrade to Citadel 2 and build an Oathbound Hall. Construct connected supply toward
a gate. Have one alliance occupy it and send defenders, then start an enemy
rally and join before assembly expires. Reinforce during combat; inspect each
owner's report and hospital. Check that losing a connecting beacon disables
future attacks and that a victorious injured march can garrison without healing.

Automated scenarios cover these mechanics, permission failures, exact unit
conservation, capacity overflow, authenticated HTTP privacy, malformed saves and
restart recovery. Unity compilation, visuals, input and Windows packaging still
require native verification. The battlefield uses the existing procedural rigs
and their march/attack/idle animation states; this milestone does not add authored
character animation clips.

This foundation does not include rally interception on the open field, city
sieges, physical gate pathfinding, ranged/area attacks, permanent troop deaths,
rally bosses or scheduled kingdom/KvK campaigns. Current numeric limits and costs
are prototype values that need multiplayer pacing and balance review.
