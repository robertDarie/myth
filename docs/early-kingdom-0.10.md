# Early kingdom systems · 0.10

This is the first war-and-social milestone in the expanded kingdom roadmap.
KvK is deferred until the normal kingdom campaign and its mid/late-game warfare
work. See [the ongoing roadmap](kingdom-roadmap.md). This milestone does not claim
that every system on that roadmap is implemented.

## Field PvP rules

Choose an enemy march on the map and use **Attack player**, or right-click it.
Both cities must have reached Citadel 2 / Age of Oaths. Both armies must be outside
their own city protection radius (two map units) and not recovering. Move your
army into the field first. Your own armies and alliance members are invalid
targets; locked province access still applies. Cities cannot be attacked.

An army approaches within two map units and opens a one-versus-one engagement.
The defender automatically stops its previous order and fights back. Each army
can be in one engagement; additional armies cannot join this initial duel system.
Damage is resolved in one-second rounds, using both armies' pre-round statistics.
Both attacks apply even if one would defeat its target. Rage abilities apply
real healing, damage and shields; PvE-only bonuses do not become PvP bonuses.

There is a small mixed-composition counter modifier, bounded to ±15%:
infantry counters cavalry, cavalry counters archers, and archers counter infantry.
The modifier is weighted by each side's mortal troop composition. Mythics retain
their existing stat contribution; they do not introduce a new counter class.

**Stop** or **Return** disengages and seals the battle report. Other field orders
are rejected during the engagement until the player disengages. Becoming allied,
protected or unavailable ends the engagement safely. There are no PvP currency,
commander XP or kill rewards to farm in this first implementation.

## Wounded troops and hospital

On a PvP defeat, 25% of each mortal troop class, rounded down, becomes severely
wounded. One mythic unit is wounded if present and at least one unit would remain
assigned. At least one unit stays with the commander. Wounded units are removed
from the march and recorded by type in the city hospital, not duplicated into
reserves. The surviving march returns home at one HP and recovers under the
existing recovery timer. Ordinary HP loss represents lighter injuries.

**There are no permanent deaths or city plunder in this version.** PvE camps retain
their existing HP/recovery rules. This conservative starting rule can be tuned
before destructive war modes are introduced.

Open **City → Hospital** or **Training → House of Renewal**. Build the House of Renewal if needed, then select exact wounded
counts or fill the available beds. One independent paid healing batch runs at a
time, while construction, troop training and field marches continue.

- Beds: `25 + 15 × Infirmary level`; each mortal uses one, each mythic five.
- All waiting wounded are retained, even if the waiting list exceeds the number
  of beds. Beds limit the treatment batch, not survival of admitted patients.
- Cost: each mortal needs 2 food / 1 gold; each mythic 20 food / 15 gold.
- Duration: `(1.2 × mortals + 8 × mythics) / (1 + 0.15 × extra Infirmary levels)`,
  minimum two seconds.
- Completion returns the exact typed units to ready reserves. Cancellation
  returns the exact patients to the waiting list and refunds the original cost.
- Troop/mythic capacity includes wounded and units already in treatment, so a
  player cannot fill the hospital and train beyond the city population cap.

## Battle reports

Open **Chronicle → Open battle reports** or the **Reports** activity pane. Reports
show an active engagement plus the latest 30 completed reports for the player.
Each includes both commanders, starting/remaining troop compositions, severely
wounded units, rounds, outcome, actual HP damage dealt/received, healing, shields
created and shield absorption. HP damage and shield absorption are separate.

Reports are generated from the simulation; visual arrows, sound and animation
never add hits. Both participants receive the same sealed report. Bystanders
cannot retrieve another player's reports or hospital state through the world
endpoint. Public march positions/stats remain visible; fog/scouting is later.

## Alliance coordination

Leader, Officer and Member roles are now functional. Leaders promote/demote,
transfer leadership and remove members. Officers can remove ordinary members,
not leaders or other officers. Any member can leave, but a leader with members
must transfer leadership first. A final leader leaving disbands the empty alliance,
removes its beacons/markers and neutralizes its site ownership. No orphan flags or
buffs remain. Destructive membership changes use a second click in the game UI.

**Chat** is available in bottom navigation and Alliance. Kingdom messages are
shared; Alliance messages are filtered server-side to current members. Messages
contain at most 240 characters, with a one-second sender cooldown. The server
retains the latest 120 messages total. Private messages, moderation and a durable
large chat service are not part of this prototype.

Leaders/officers can place up to twelve named alliance map markers, at accessible
locations, for ten simulated minutes. The Alliance UI places one at the selected
march. Members can focus markers; leaders/officers can remove them. Outsiders do
not receive alliance markers. Markers are coordination pins, not territory or a
rally mechanic. Existing allied construction/research help remains visible without
exposing allies' treasury, hospital, roster records or report history.

## Persistence and Windows compatibility

Build 0.10.0 uses protocol 7 and save schema 5. The launcher and client require the
updated server, including `war.mjs` and `social.mjs`. Close older game/server
processes, pull main and rebuild the Windows playtest. No city reset is needed.

Schemas 1–4 migrate without changing existing units, resources, queues or hero
progress. Schema-4 source saves are archived as `.schema4.bak` before autosaves
rotate ordinary backups. Healing jobs, wounded units, reports, chat and markers
persist. Active field battles are sealed as **Interrupted by restart**, without
replaying damage or creating casualties/rewards; field orders pause as before.
Time still pauses when the local server is stopped. Hosted offline-time rules are
not implemented yet.

Authenticated snapshots now separate own data from public summaries. Opponents'
private reports/hospital/treasury are omitted. Allies receive limited job data
needed for assistance. Direct in-process `World.snapshot()` without a viewer ID
remains an internal testing API, not the HTTP endpoint.

## Checks and native playtest

All 83 server tests pass at this milestone. The automated suite covers PvP protection and ownership, round cadence, actual
shield/heal accounting, typed casualty conservation, paid treatment/cancellation,
capacity, disengagement, snapshot privacy, interrupted saves, migration archives,
alliance permissions, chat privacy/rate limits and marker lifetime. Existing
campaign, economy, progression and HTTP tests remain in the suite.

Unity source syntax and package contents are checked in Linux. Native Unity
compilation, GUI layout, two-client controls and Windows playback remain to be
verified in the Editor/player.

1. Run two clients with distinct local profile names. Reach Citadel 2 on both and
   move both marches into the field. First-age, home, allied and recovering armies
   should reject attacks.
2. Fight, inspect a report, retreat and inspect the sealed result. Let one army
   lose, then compare its march/ward counts and perform paid treatment.
3. Cancel a treatment, retry the same canceled action and restart during another
   treatment. Check the exact patient/resource balances.
4. Create an alliance, promote an officer, transfer leadership, leave and test
   permissions. Check chat and markers from a third, unaffiliated client.
5. Restart during a fight and verify interrupted reports, paused orders and
   preserved wounded/treatment data. Inspect Hospital/Reports/Chat at UI scales.
