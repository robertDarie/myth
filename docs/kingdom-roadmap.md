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

## Next: exploration and meaningful routes

Fog of war, scouts, exploration rewards, information permissions, scouting
reports and watchtower warnings. Replace province destination checks with a real
gate/terrain navigation graph and route preview; add multi-march control.

## Troop and commander depth

Troop tiers and upgrades, siege roles, range/area effects, richer counters,
commander talents, secondary commanders, equipment/inventory and march presets.
Keep unit transfers, capacity and healing conserved across every upgrade.

## Kingdom progression and reasons to return

Interactive tutorial and chapter chain; daily/weekly objectives; rally bosses
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

Native Unity/Windows verification, authored skinned models and animation clips,
VFX/audio, a dedicated city scene, accessible controls and performance profiling.
The Greek battlefield slice is the current art baseline, not final production art.

## Later: KvK

After the above campaign supports mature warfare: kingdom eligibility/power,
matchmaking, separate seasonal battlefield, objectives, scoring, rewards,
migration and return-home rules. No early-stage KvK dependency or current rush
into matchmaking/season implementation.
