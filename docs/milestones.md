# Delivery milestones

## Implemented through slice 0.16

Server-authoritative shared map; five civilizations with bonuses; cities,
resources, training and mythic recruitment; four commander rarities; PvE combat
and respawning camps; retreat/recovery; alliance creation/joining; connected
beacons; contested shrine and gate captures; province access; central sanctuary;
Unity camera, inspection, minimap and management panels; independent timed city
construction/training; reserves and reinforcement; local saves and backup recovery;
fifteen institutions, research, passive economy, Temple summons and ascension,
market exchange, relic forging and alliance job help; five age-unlocked marches,
a permanent second builder, individual commander XP/stars, targeted skill growth
and automatic rage abilities; a map-first themed interface with dedicated city,
research, commander and Temple views. See the 0.6 interface guide for visual checks. The full design distinguishes
these implemented foundations from planned advanced structures. Server tests include a
complete legal economy-to-sanctuary campaign. New Unity client validation remains
pending; implementation is not a claim of production readiness.

The 0.8/0.9 additions include typed troop selection, loading artwork, commander
previews, articulated field movement, Greek equipment meshes and initial sound.
See [the core systems audit](core-systems-audit.md) for the current status of each
core system and the ordered plan. Final character art and native visual review
remain incomplete.

The 0.10 war/social foundation adds PvP duels, hospital treatment, reports,
alliance ranks and communications. The active [kingdom roadmap](kingdom-roadmap.md)
puts normal kingdom progression ahead of KvK.

The 0.11 alliance warfare foundation adds timed rallies, actual march
contributions, garrisons/reinforcements, destructible connected territory and
reconciled group battle reports. See [the rules](alliance-warfare-0.11.md).

The 0.12 exploration foundation adds dedicated scouts, persistent discovery,
current allied vision, private scouting reports and shared gate-corridor routes.
See [the exploration rules](exploration-and-routes-0.12.md).

The 0.13 opening campaign adds six chapters and 19 objectives, saved achievements,
Go guidance and individual/chapter rewards. The complete sequence is covered by
a fresh-city legal-command playthrough. See [the campaign rules](opening-campaign-0.13.md).

The 0.14 coordinated PvE foundation adds five strongholds in three tiers,
rally-only guard/wall battles, fixed shared reward pools and saved respawns.
See [the stronghold rules](strongholds-0.14.md).

The 0.15 activity foundation adds ten daily tasks, five fixed chests and three
weekly alliance goals with personal contribution thresholds and saved claims.
See [the activity rules](activity-and-alliance-goals-0.15.md).

The 0.16 kingdom/art pass adds staged openings, contribution rewards and eight
original city/environment FBXs, plus terrain/lighting/interface improvements.
See [the kingdom/art guide](kingdom-and-art-0.16.md).

## Next stages

1. **Visual playtest and refinement:** validate Unity import and build, controls,
   feedback, pacing, civilization balance, and multiplayer usability.
2. **Tactical identity:** distinct mythic skills and counters, commander skills,
   multiple army types, ability feedback and real character assets.
3. **Alliance campaign depth:** field interception, full terrain navigation,
   opening schedules and richer siege rules beyond the delivered group battles.
4. **Persistent kingdom:** real accounts, durable state, reconnect security,
   operations, load testing, world scheduling and offline progression.
5. **Seasonal campaign:** kingdom eligibility, matchmaking, separate KvK map,
   rewards, migration and season reset rules.

## Army and living city 0.17

36 weighted army/hero FBXs with eight takes each; five civilization sets, typed
formations, pooled effects, original synthesized audio, interactive city and
native review/build preflight tools. Blender validates 288 deforming takes.
Native Unity compilation/rendering and Windows performance remain pending.
See [the implementation and review guide](army-and-living-city-0.17.md).

## Hosted foundation 0.18

Transactional SQLite, durable keyed receipts, failed-save rollback, downtime job
completion, capped passive production, online backups, invitations and Docker/HTTPS
operations files. Disconnects no longer cancel live orders. Hosting infrastructure
and real accounts are not provisioned. See [the deployment guide](hosting-and-persistence-0.18.md).

## Reference and visual foundation 0.19

A 679-record reference adaptation register, 14-epic plan and R0–R8 acceptance
roadmap; first implementation fixes scaled UI geometry, compact labels/bars,
world-label contention, visual fog edges and living city composition. Native
Unity review remains pending. See [the plan](reference-adaptation-plan.md).

## Accounts and supplies 0.20

Realm-local SQLite accounts, password/recovery-code sign-in, expiring/revocable
sessions, retained per-character command retries, earned inventory packs/hourglasses,
founding supplies and derived live power rankings. All adapted workbook roles
are now scheduled work. Save schema 12; database revision 2; protocol stays 13.
See [the implementation guide](accounts-and-supplies-0.20.md). Native UI review
remains pending; the full 679-record program is not complete.
