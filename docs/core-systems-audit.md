# Thrones of Myth: core systems audit

Audited against the repository through the 0.14 stronghold pass. **Implemented**
means working prototype code, not production-ready quality. **Partial** means the
foundation works but significant gameplay is absent. **Missing** means no working
system yet. A design document, label or building name does not count as gameplay.

The game now has economic/PvE/territory foundations plus an initial PvP, hospital,
report and alliance-communications loop. Group warfare, deep progression and
production online infrastructure are still incomplete. KvK remains later in the
[active kingdom roadmap](kingdom-roadmap.md).

## What we have and what is missing

| Core system | Status | Working now | Missing or incomplete |
| --- | --- | --- | --- |
| City development | Partial | 16 institutions, paid timers, prerequisites, two earnable build queues, five ages | A real city scene, building placement, deeper age progression and long-term balance |
| Economy | Partial | Five resources, passive production, shared finite nodes, resource sinks and exchanges | Gathering load/return delivery, caravans, plunder rules and sustained economy balance |
| Troop training and dispatch | Partial | Infantry/archer/cavalry training, civilization mythics, exact counts, reserves, five marches | Troop tiers/upgrades, siege, richer role effects and formations with tactical consequences |
| March control | Partial | Select, move, stop, return, attack camps, gather, capture; server-owned orders | Obstacle-aware pathfinding, true pass corridors, multi-select and group orders |
| Open-field combat | Partial | Server-owned PvE and one-versus-one PvP, retaliation, rage/shields/heals, counters and protection | Rally field interception, ranged spacing, area effects and richer disengagement rules |
| Casualties and hospital | Partial | Typed PvP/stronghold wounded troops, paid timed treatment, exact reserve transfers and independent ward | Permanent-loss modes, solo-camp severe wounds, traditional overflow rules and alliance healing help |
| Commander collection | Partial | Eleven commanders, four rarities, earned-sigil summons, published odds, pity and duplicate shards | Larger roster, distinct tactical identities, recruitment pacing and content events |
| Commander development | Partial | Individual XP, levels, stars, four skills, expertise and separate ascension | Talent trees, secondary commanders, richer skill effects and reusable loadout presets |
| Equipment and inventory | Partial | Forge, a small relic list and march relic ownership | Full inventory, consumables, equipment sets, crafting depth and item rewards |
| Exploration and intelligence | Partial | Persistent discovery, current allied vision, scouts, private historical reports and server filtering | Exploration rewards, watchtower alerts, scout interception and explicit report sharing |
| PvE variety | Partial | Seven respawning camps, chapter objectives and five three-tier rally strongholds with fixed shared rewards | Richer boss mechanics, events, dungeons and varied objectives |
| Alliance membership | Partial | Create/join/leave, leader/officer/member permissions, kick, succession and disband cleanup | Invites/applications, full audit logs and recruitment/diplomacy tools |
| Social communication | Partial | Private alliance chat, kingdom chat, shared expiring map markers and event feed | Direct messages, mail, moderation and durable large-scale chat |
| Alliance development | Partial | Job help, beacons and site ownership | Donations, alliance technology, treasury, member contributions and alliance progression |
| Territory and sacred sites | Partial | Constructed connected forts/beacons, destructible territory, defended shrines/gates, sanctuary buffs and supply checks | Full terrain navigation, opening schedules and durable ownership history |
| Rallies and garrisons | Partial | Timed assembly, actual march contributions, leadership/recall, capacity, late reinforcements and defended structure battles | Field interception, richer boss mechanics, progression/balance and native playtest |
| City warfare and protection | Missing | Cities are visible and own reserves | Walls, garrison, siege, burning, looting caps, protection shields, beginner safety and teleport rules |
| Battle reports and rankings | Partial | Private active/completed duel, group and stronghold reports with damage/healing/shield, wounds and reward receipts | Power calculation, leaderboards and extended war history |
| Kingdom timeline | Missing | Five age-based march unlocks exist | Scheduled pass openings, objectives, ruler/kingdom governance and campaign milestones |
| KvK / seasons | Missing | No cross-kingdom play | Multiple hosted kingdoms, eligibility/power model, matchmaking, seasonal map, rules, scoring, rewards and migration |
| Onboarding and progression | Partial | Six chapters, 19 objectives, individual/chapter rewards, persistent next-goal HUD and contextual Go guidance | Native pacing review, richer interactive tutorial, daily/weekly goals and later chapters |
| Events and rewards | Partial | Daily free Temple offering and basic battle rewards | Event calendar, event scoring, milestone rewards, seasonal content and economy tuning |
| Visuals, animation and audio | Partial | Original portraits/loading art, procedural units/meshes, transform rigs, state-driven poses, initial synthesized cues | Final authored character/creature meshes, skinning, animation clips/blend trees, polished VFX, recorded audio and broad performance validation |
| Persistence and accounts | Partial | Local autosaves/backups, migration, profile tokens, hospital/reports/chat state and safe battle interruption | Online accounts, hosted storage, offline-time simulation, cross-device identity and operational recovery |
| Operations and integrity | Partial | Authoritative local rules and automated gameplay/HTTP tests | Hosted deployment, monitoring, load tests, observability, abuse controls, moderation and operational tooling |
| Monetization | Missing; later | Summons use earned resources only | Purchases, receipts and entitlements; design these only after the gameplay and economy work |

## What to build next, in order

### P0 — A readable, testable battlefield slice

Finish and validate one Greek army: Captain, infantry, archers, cavalry and Minotaur.
The 0.9 pass improves equipment silhouettes, formation turning, movement blends,
wind-up/strike/recovery poses, hit reactions, route indicators and initial sound.
It does not finish production character art. Native Unity import, shader, motion,
audio and Windows performance checks are still required. Replace prototype models
with authored skinned meshes and reusable clips after this movement standard is
reviewed. Add an acceptance scene and profile several armies before expanding art.

**Exit criteria:** troop roles are readable at play zoom; movement and stopping
look coherent; a player can tell attacking, taking damage, casting, victory and
retreat apart; the selected route and counts are clear; reduced motion and sound
controls work; no fake hits, duplicate units or save regressions.

### P1 — The minimum real war loop (initial foundation delivered in 0.10)

The first **PvP + casualties/hospital + battle reports** loop is implemented.
Extend its tested accounting into group battles and richer casualty modes. Before any city
looting, define target eligibility, retreat, wounded/dead ratios, hospital overflow,
recovery costs and beginner protection. Reports must reconcile with server damage,
healing and unit transfers. Add distinct troop interactions and an actual ranged
rule. Do not bolt permanent losses onto the current HP-only retreat without this
specification and tests.

**Exit criteria:** two players fight, retreat, inspect an accurate report, heal
survivors, and send a new formation without unit/resource duplication.

### P2 — Cooperation that makes an alliance useful

Roles, membership management, chat/map markers, rally assembly, garrison
reinforcement and attackable territory now exist with permission and contribution
tracking. See [the 0.11 rules](alliance-warfare-0.11.md). Make the gate network actual map
corridors with route planning rather than destination permission checks alone.

**Exit criteria:** an alliance organizes a rally, holds a defended pass, destroys
an enemy beacon under explicit rules and sees the result in reports and logs.

### P3 — A kingdom campaign with reasons to return

Scouting/fog, gate-corridor routing and a six-chapter opening campaign are
delivered, along with repeatable rally strongholds. Add richer tutorial feedback,
daily/alliance objectives and
scheduled sanctuary/pass milestones. Define kingdom victory, governance, rewards
and protection of newer players. Balance resource income, losses, healing,
training and commander growth over days rather than a short local test session.

### P4 — Persistent online play

Replace local-only identity/storage with accounts and a hosted durable kingdom.
Add reconnect behavior, idempotent economic commands, offline-time rules, metrics,
backup restoration drills and multi-player load tests. Architecture work begins
alongside P1/P2; public hosting waits until recovery and security are proven.

### P5 — KvK and live operations

Only after a kingdom campaign works: define power/eligibility, group kingdoms,
match them, run a separate season map, track scoring, distribute rewards and
handle return/migration. Add tools for operators and a content cadence. KvK is
central to the eventual product, but it depends on warfare, alliances, persistence
and fair progression first.

## Decisions we must make before warfare

1. Does defeat produce light wounds, severe wounds and deaths, and in which modes?
2. What can attackers take from cities, and what is always protected?
3. Which troop classes counter others, and how do mixed marches behave?
4. What can a rally leader control, and how are losses/rewards distributed?
5. How do kingdoms protect new players and match similarly developed opponents?
6. What advances while a player is offline, and what advances while a server is down?

These decisions need a concrete rules proposal before implementation; they are not
requirements for adding the current visual battlefield pass. Monetization and a
larger commander roster should not displace the missing war/social foundations.
