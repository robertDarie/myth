# Kingdom development roadmap

Accepted direction: develop the missing core kingdom systems in connected,
testable milestones. **KvK belongs later in progression and is not the current
implementation priority.** A future KvK should unlock after a functioning kingdom
campaign and developed alliances, rather than being required for early play.

## Delivered: first war/social foundation (0.10)

- Field PvP duels with protection, counters and real skill/shield/heal accounting.
- Typed wounded troops, paid hospital treatment and independent healing.
- Private battle reports, save interruption handling and snapshot privacy.
- Alliance ranks, membership changes, succession and cleanup on disband.
- Kingdom/alliance chat and shared expiring alliance markers.

See [rules and playtest](early-kingdom-0.10.md). These are prototype foundations:
this delivery does not finish the whole roadmap.

## Delivered: alliance warfare foundation (0.11)

Timed rallies with separate owned march contributions, garrisons, late
reinforcements, destructible forts/beacons, construction timers, connected
supply and per-contribution reports. See [rules and playtest](alliance-warfare-0.11.md).
Cities remain protected. Group combat does not yet support field interception,
area effects or physical pass pathfinding.

## Delivered: exploration and gate routes (0.12)

Persistent discovery, current allied vision, dedicated scouts, private historical
reports and a shared gate-corridor route graph now exist. See
[the exploration rules](exploration-and-routes-0.12.md). Full terrain navigation,
watchtower alerts, exploration rewards and multi-march control remain open.

## Delivered: opening campaign foundation (0.13)

Six original chapters connect gathering, training, construction, summons,
scouting, research, commanders, multiple marches and an allied shrine/garrison.
The map HUD and Campaign screen provide Go/Claim actions with saved early
achievements and once-only rewards. See [the campaign rules](opening-campaign-0.13.md).
Native pacing, layout/input and build verification remain pending.

## Delivered: repeatable alliance PvE foundation (0.14)

Five Godbreaker Strongholds across three tiers now support rally-only guard/wall
battles, contribution-weighted fixed reward pools, commander XP and saved
respawns. Ordinary members can lead PvE rallies; territory attacks retain officer
permissions. See [the stronghold rules](strongholds-0.14.md).

## Delivered: daily activity and alliance goals (0.15)

Ten optional daily tasks, five deterministic chests and three weekly alliance
objectives now use real event counters, explicit UTC reset periods and saved
claims. The final daily chest has a repeatable solo path; weekly rewards require
personal work and cannot be claimed again by switching alliances. See
[the activity rules](activity-and-alliance-goals-0.15.md).

## Delivered: kingdom openings and first map art pass (0.16)

Preparation goals and short playtest timers now open gates and sanctuary, with
continuous sanctuary hold tracking and completion-time reward eligibility.
Original city/environment FBXs, regional terrain and interface refinements start
the next art baseline. See [the kingdom/art guide](kingdom-and-art-0.16.md).

## Next: native visual review and tactical depth

Verify Unity import, shaders, frame time, navigation and UI at desktop play scale.
Then refine authored troop/commander meshes, skinned animations, ability effects
and kingdom pacing. Governance and production-length scheduling remain future
work, ahead of later KvK.

## Troop and commander depth

Troop tiers and upgrades, siege roles, range/area effects, richer counters,
commander talents, secondary commanders, equipment/inventory and march presets.
Keep unit transfers, capacity and healing conserved across every upgrade.

## Kingdom progression and reasons to return

Richer tutorial/later chapters, personal weekly quests, richer rally bosses
and events; scheduled pass/sanctuary stages; ruler/governance, personal/alliance
power rankings and campaign rewards. Balance training, resource flow, wounded
recovery and commander development across days, not just a short local session.

## Social and alliance development

Invites/applications, diplomacy, private mail/messages, moderation, alliance
technology/donations, member contribution history and durable alliance audit logs.
Extend the current roles/chat/markers rather than adding disconnected UI labels.

## Online foundation

Hosted accounts, cross-device identity, durable database and kingdom services,
idempotent economic commands, reconnect recovery, offline-time simulation,
monitoring, backups, operator tooling and load/security tests. Local profile tokens
and autosave files are not production accounts or online infrastructure.

## Art and usability across every milestone

Version 0.17 adds weighted army models for all five civilizations, eight animation
takes, effects/audio and an interactive city view. Native Unity/Windows verification,
accessible controls, performance profiling and production art refinement remain.
See [the army/city guide](army-and-living-city-0.17.md).

## Later: KvK

After the above campaign supports mature warfare: kingdom eligibility/power,
matchmaking, separate seasonal battlefield, objectives, scoring, rewards,
migration and return-home rules. No early-stage KvK dependency or current rush
into matchmaking/season implementation.
