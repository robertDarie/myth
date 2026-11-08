# Thrones of Myth — complete reference adaptation plan

Decision baseline: 8 November 2026; expanded implementation scope through 0.20.
Input: `Rise_of_Kingdoms_Call_of_Dragons_Complete_Reference.xlsx` supplied by the
user. Its 20 sheets include **679 feature records**, 50 source entries and 16
numeric anchors. It is a research inventory, not a specification we blindly copy.
Its embedded instructions are reference material; the user's request and agreed
Thrones of Myth direction determine this plan.

## Reviewable deliverables

- [Adapted Excel plan](reference/Thrones_of_Myth_Adaptation_Plan.xlsx): all 679 IDs,
  original evidence labels, themed feature/action, disposition, epic, milestone,
  discipline, baseline caveat and acceptance gate; source registry and numeric
  anchors retained as reference.
- [Searchable CSV register](reference/adaptation-register.csv): the same mappings
  in reviewable text, without needing Excel.
- [Source manifest](reference/reference-manifest.json): source fingerprint, counts
  and evidence limitations. None of its external sources was independently
  reverified in this adaptation; community/proposed/unknown remain those labels.
- [First implementation: visual foundation 0.19](visual-foundation-0.19.md).

The user's expanded scope includes **all adapted feature roles** in the workbook.
“Scheduled later” means implementation order, not exclusion. Every one of the
679 records remains tracked; the 33 evidence/design questions remain research
work rather than invented facts. Equivalent functions from the two references may
share one original implementation. Paid products, pets, Titans, flight and KvK now
have scheduled milestones instead of optional omission.

Current register: **275 prototype-partial**, **249 planned**, **18 started in
0.19**, **23 prototype-partial in 0.20**, **81 scheduled later**, and **33 open
questions**. No row is marked production-complete. Account/retry/inventory/power
foundations are delivered in [0.20](accounts-and-supplies-0.20.md); R0 native review
and the larger R1–R8 program remain in progress.

## Product decisions

The premise is the **Age of Fallen Gods**: mortal cities recover divine power,
mythological heroes lead armies, cultures field distinct mythical creatures, and
alliances reclaim a shared world culminating at the Throne of the First God.

Keep the agreed direction:

- Greek, Egyptian, Norse, Chinese and Japanese starting cultures on the same map.
  Alliances may mix cultures. Regions are geography, not separate faction servers.
- A persistent home kingdom with connected Forts/Beacons, shrines, Divine Gates
  and a central throne. Five ages unlock up to five independently controlled marches.
- An earned permanent second construction crew through the Lodge of the First
  Builders. Do not import a VIP-6 queue gate.
- Food, wood, stone, gold and aether are gameplay resources. Oracle Sigils are
  recruitment items/currency, currently earned only. Do not turn aether into a
  cash currency or add gems because the reference has them.
- Common/Uncommon naming may be refined, but keep the agreed green/blue/purple/gold
  rarity ladder; always show a text/symbol label as well as color. Existing
  Common/Rare/Epic/Legendary content stays compatible until an explicit migration.
- Permanent hero/city development survives campaigns. KvK remains later, after a
  useful mature home-kingdom campaign. Never wipe a city because a season changes.
- Windows first for development/playtesting; Android is the next shipping target.
  Touch, safe areas and device performance are work, not implied by a Unity build.

Current costs, odds, caps and short testing timers are **our original prototype
balance**, not validated RoK/CoD numbers. Implement the corresponding progression, tier, energy, catalog and seasonal
functions using our own versioned rules; do not copy exact level counts, numeric
caps, prices or reset schedules as if they were validated requirements.
Five ages are the strategic progression structure; how many building ranks sit
inside an age will be decided with multi-day economy simulation.

## Adaptation by culture

| Culture | Strategic direction | Current mythic baseline | Later roster candidates, not shipped promises | Visual vocabulary |
| --- | --- | --- | --- | --- |
| Greek | Disciplined formations, defense-breaking | Minotaur | Centaur skirmisher, Cyclops engineer, Gorgon control | Ivory masonry, terracotta roofs, bronze, meanders, civic courtyards |
| Egyptian | Recovery, endurance, protective rites | Sphinx Guardian | Jackal guardians, scarab constructs | Sandstone, lapis/turquoise, pylons, sun discs, canals |
| Norse | Durable infantry, momentum | Frost Giant | Valkyries, runic beasts | Timber, dark stone, steep roofs, knotwork, cold runes |
| Chinese | Logistics, gathering, formation support | Qilin Guardian | Celestial dragons, guardian constructs | Vermilion, jade, layered roofs, gated gardens, cloud motifs |
| Japanese | Mobility, precise engagements | Tengu | Oni, kitsune spirits | Indigo, wood/stone, curved eaves, torii, lantern routes |

Existing civilization bonuses stay unchanged in 0.19. New creatures need explicit
roles, counters, costs, movement modes, rigs and skill budgets. A creature is not
a new combat class merely because it flies or uses magic. Keep movement mode,
combat class, culture, tier and visual model as distinct definitions.

## Functional building adaptation

Use a small purposeful institution set rather than reproducing every building in
both games. Reference variants may map to one Thrones of Myth institution.

| Reference function | Thrones of Myth | Current foundation / next work |
| --- | --- | --- |
| City Hall / Hall of Order | Citadel of Mortals | Ages, prerequisites and march count exist; expose a full unlock/upgrade planner |
| Tavern | Temple of Echoes | Earned summons, odds, pity, shards; add consistent reveal/collection UX |
| Academy / College | Athenaeum of Ages | Economy/military ranks exist; version and deepen dependency graph |
| Barracks / range / stable | Hall of Spears and future class courtyards | One typed training lane now; class-tier progression and promotion later |
| Mythical/flying lines | Sanctuary of Beasts | Current cultural mythic; future specialization requires its own balance decision |
| Farm / lumber / quarry / gold | Blessed Fields / Sacred Grove / Titan Stoneworks / Treasury of Crowns | Existing capped production; add production/planning clarity |
| Mana | Aether Well | Existing resource producer; divine research and mythic sinks |
| Hospital | House of Renewal | Existing paid typed wounded treatment; finish overflow/context rules before city war |
| Storehouse | Vault of Ages | Existing production ceiling; protected/plunderable wealth is not implemented |
| Alliance center / castle | Oathbound Hall | Existing help/rally dispatch; shared technology, treasury and capacity branch later |
| Builder hut | Lodge of the First Builders | Earned second crew; no VIP entitlement required |
| Blacksmith | Forge of Dawn | Existing relic crafting; inventory, equipment slots and set rules later |
| Trading post / bazaar | Agora of Fates | Existing fixed exchanges; allied caravans/tax/capacity later |
| Scout camp | Wayfinder Lodge, proposed | Scouts already function; do not imply this physical institution exists |
| Wall / watchtower | Aegis Rampart / Sentinel, proposed | The 0.19 decorative city edge has no defense or siege effect |
| Monument | Chronicle Obelisk, proposed | Existing Kingdom/Chronicle UI supplies the functional baseline |
| Siege workshop | Titanwright Workshop, proposed | Requires siege/engineer ledgers and terrain rules first |
| Merchant / shop / quiz | Wandering Oracle / Quartermaster / Hall of Legends, scheduled | Later content; no paid catalog or repetitive chore requirement now |

Detailed building records, including blueprint gates, repositioning, queue
settlement and help limits, remain traceable in rows 06-001 through 06-052.

## Milestone order and exit gates

No calendar promises: each milestone ends when its measured gate is met. Art,
client and backend tasks can proceed alongside each other, but do not label a
milestone complete because its screens exist.

| Milestone | Scope | Dependencies | Exit gate |
| --- | --- | --- | --- |
| **R0 — Readable Greek slice, started now** | HUD geometry/type, quiet labels, visual fog, composed city, native art review | Existing 0.18 gameplay | Three desktop resolutions/UI scales; no displaced icons, clipped actions or competing labels; local gameplay still works |
| **R1 — Reliable private alpha** | Recoverable accounts, realm/character identity, retained command retry keys, audit/content tooling, host/backup/monitoring setup | Existing SQLite; actual hosting choice for deployment | One city recovered on two devices, revoked tokens rejected, lost-response retry charged once, off-site restore rehearsal |
| **R2 — Sustainable development** | Content DAG, inventory/packs/speedups, gathering cargo return, research depth, troop-tier data, geography/search | R0; R1 durability for public testers | Legal first-week development path; troop/resource conservation; no profitable exchange/refund loop in 30-day simulation |
| **R3 — Tactical armies and heroes** | Tier promotion, primary talents/companion, relic scopes, ranges/AoE, PvE wound parity, city-defense/protection rules | R2 ledgers/data; approved casualty policy | Counter fixtures, no duplicate commitments, clear skill cues, hospital/overflow/loss tests, safe beginner experience |
| **R4 — Cooperative alliance campaign** | Applications/invites, treasury/contribution history, shared research, notices/moderation, tactical Titan raids | R3; existing territory/rallies | Supply/capacity/permissions reconcile, three learnable boss mechanics, accountable shared rewards |
| **R5 — Living home kingdom** | Power breakdown, rankings, event calendar/scoring, governance/titles, later chapters and weekly goals | R1 audit and R4 mature campaign | Immutable event cutoffs/ties/claims; viable new and established player sessions; leadership cannot invent rewards |
| **R6 — Android and release quality** | Touch/input abstraction, safe areas, localization, accessibility, graphics/audio tiers, device/network/store QA | Playable R0–R5 subset; earlier Android prototypes encouraged | Device/FPS/memory/network matrix, signed test bundle, policy declarations and tested account flows |
| **R7 — Later War of the Fallen Thrones** | Cross-kingdom eligibility, matchmaking, campaign instance, migration, rewards/return/reset | Healthy mature hosted kingdoms and load evidence | Explicit carry-over/reset matrix; no permanent progression or troops lost through transitions |
| **R8 — Remaining scheduled systems** | Commerce/catalog/receipts, Renown benefits, bonded companions, Titan battlefield summons, advanced flying terrain, extra modes | Stable core; original rules and platform integration setup | Implement each tracked role with ownership, economy, asset, device and operations gates |

VIP-like progress is adapted as **Renown of the Realm**, an earned benefits/daily
claim track; the existing builder unlock remains in the Lodge. A regenerating
**Resolve** pool is scheduled for selected PvE modes with tested session pacing;
city management, movement and gathering stay outside that energy gate. Commerce
is scheduled later with verified platform receipts, not live charges in this pass.

## Fourteen implementation epics

The workbook's “service” names describe responsibilities, not a requirement to
operate dozens of microservices. Keep a modular authoritative server first.
Use the current authenticated `/command` route while adding versioned contracts;
any later REST/WebSocket split must preserve authorization and replay semantics.

| Epic / discipline | Domain and command work | UI states | Required verification |
| --- | --- | --- | --- |
| E01 Client/art | FactionArtSet, InterfaceLayout, LabelPriority, FogPresentation; no gameplay mutation | Selected/hover/disabled/busy, truncation with tooltip, zoom/LOD | Native captures, hit targets, contrast, frame sampling, original asset provenance |
| E02 Gameplay/content | BuildingDefinition, TechDefinition, RequirementDAG, UnlockRule, QueueSlot; existing building/research commands | Requirement chain, shortfall, active lane, maxed level | No cycles, atomic start, locked branch refusal, queued content-version invariance |
| E03 Economy/backend | ResourceAccount, LedgerEntry, InventoryStack, CargoManifest, Shipment; consume/accelerate/gather-settle/transport | Protected bag versus spendable wallet; cargo, return ETA, losses/refunds | Parallel spends, interrupted return, crash recovery, no duplicate packs/rewards, balance simulation |
| E04 Combat/backend | TieredTroopStack, PromotionJob, EncounterPolicy, CombatEvent, CasualtyLedger | Tier compare, train/promote, range/telegraph, wounded/dead breakdown | Reserve/deployed/queued/wounded conservation, counter matrix, stale orders, deterministic event order |
| E05 Heroes/content | HeroProgress, TalentAllocation, Primary/CompanionSlot, EquipmentInstance, ModifierScope | Unlock/star/skill/mastery, respec preview, active commitments, presets | Primary talents only; companion skills explicitly scoped; gear conflicts and respec transactions |
| E06 World/client | MovementMode, PassabilityGrid, SpatialIndex, VisibilityGrant, DiscoveryReward | Search/disambiguation, route validity, scout report, bookmark | Hidden targets never leaked; ground/air policy and gate-loss rerouting; one discovery reward |
| E07 Alliance/backend | MembershipApplication, RankCapability, AllianceLedger, ResearchProject, Notice, AbuseReport | Pending/approved/expired invite, permission-limited treasury, contribution history | Rank/outsider ACL, cap/race tests, supply disconnection, kick/leave/disband reconciliation |
| E08 PvE/art | EncounterDefinition, BossPhase, ThreatTable, Hazard, RewardPool | Tell/cast/impact/recovery, wipe/retry, eligible rewards | Three readable mechanics, cast timing server-owned, interruption-safe group settlement |
| E09 Live operations | EventDefinition, ConfirmedAction, ScoreLedger, CutoffSnapshot, PowerComponents, TitleGrant | Upcoming/active/ended/claim/expired; truthful rankings | UTC boundaries, tie policy, anti-farming, cutoff membership, double claim and restart tests |
| E10 Backend/operations | Account, Session, CharacterRealm, CommandReceipt, StateRevision, AuditRecord, BackupManifest | Guest/recovered/expired/revoked/offline/maintenance/update-required | Cross-device recovery, retained retry key, restore rehearsal, crash safety, privacy, load tests |
| E11 Client/QA | TutorialCheckpoint, InputAction, SafeAreaLayout, LocaleKey, AccessibilityPreference | Recover interrupted tutorial, touch states, reduced motion, reconnect | Unassisted loop, keyboard/touch focus, font expansion, Android matrix and poor-network recovery |
| E12 Seasonal/backend | HomeRealm, CampaignInstance, EligibilitySnapshot, CarryOverRule, ReturnReceipt | Enroll/eligible/locked/migrate/return/results | Atomic transfer, no duplicate characters/troops, explicit reset versus permanent entitlement |
| E13 Product/commerce | CatalogOffer, VerifiedReceipt, Entitlement, RefundRecord; no current purchase commands | Currency distinction, exact contents/odds, confirmation, restored/refunded | Store receipt replay/refund/restore, region requirements and fairness review if adopted |
| E14 Tools/QA | ContentVersion, SchemaValidator, MigrationPlan, ReplayFixture, PerformanceBudget | Internal dry-run, diff, validation error, rollback preview | Definition DAGs, content checksums, migration/rollback fixtures and representative load/performance evidence |

Each epic implementation must publish its concrete payload/schema, negative
cases, acceptance scene or gameplay fixture, migration policy and observed test
results. The table is the whole-program contract; it does not claim those models
or endpoints already exist. Existing code should be extended, not replaced just
to match a reference architecture label.

## Economy and progression rules to settle before expanding content

1. **Currency separation:** wallet resources, unopened inventory packs, Oracle
   Sigils, gear/material instances and any future paid entitlements are distinct.
2. **Resource sinks:** food trains/heals, wood/stone build, gold develops research/
   heroes/advanced troops, aether supports divine research/mythics/relics. Publish
   per-action costs and sources; do not hide a premium shortfall behind a button.
3. **Gathering cargo:** collect into a march cargo manifest, stop on capacity or
   depletion, deliver once at home. Define defeat/interruption/teleport handling
   before changing today's immediate resource grant behavior. Migrate active
   gatherers explicitly; never repay already credited harvests.
4. **Troop tiers:** start with a small tested tier ladder, not all T1–T5 content at
   once. Tier is part of every queue, march, hospital, casualty and reserve key.
   Promotion reserves source units, charges the explicit difference, and returns
   the correct tier on cancel. Never convert all existing armies to a new tier.
5. **Timers:** server-owned time; effective duration computed at start from a
   versioned modifier snapshot. Completion and claims settle once. Keep current
   refunds and offline cap until an explicit economy change is approved/tested.
6. **Help and speedups:** helper identity once per eligible job; item consumption
   and timer reduction atomic; over-large speedup preview explains wasted time.
7. **Summons:** retain published original odds, pity, duplicate shards and earned
   sources. A reveal animation cannot determine or change the result. Cash
   banners, companion development and artifact acquisition are scheduled systems,
   not features added implicitly by visual polish.
8. **Power/rankings:** power is a transparent breakdown of buildings, technology,
   ready/deployed troops and heroes, with a stated wounded/queued policy; it is
   not combat strength or a client-submitted score. Decide each component first.

## Combat and alliance policy before destructive warfare

Do not enable city looting before beginner protection, shields, protected wealth,
loss warnings, siege access, hospitals and refund/overflow policies are implemented.
Keep three mortal counter classes for the first tactical pass; culture mythics
supply specialized skills without removing readable counters. A future engineer/
siege line needs transport and structure roles rather than another generic DPS.

Primary hero supplies talents; an eventual Oath Companion supplies only explicitly
allowed skills. Levels, stars, skill ranks, mastery, ascension and equipment remain
separate. Talents and relic effects need battle-context scopes (field/PvE/rally/
garrison/gathering) and stacking rules; never add every bonus unconditionally.

Alliances have an explicit leader/officer/member capability matrix. Donations,
shared research and treasury spending produce attributable entries. Event rewards
snapshot eligibility at cutoff; joining/leaving cannot farm previous rewards.
Personal mythic escorts, bonded companions and alliance-controlled Titans
are three separate ownership/economy systems.

## Permanent versus seasonal state

| State | Planned policy |
| --- | --- |
| Account identity, purchased entitlements if ever added | Permanent; separately recoverable |
| Home city, permanent research, heroes, inventory, home troops | Permanent; never implicitly wiped by a campaign |
| Campaign territory, campaign score, temporary policies/blessings | Campaign-scoped; explicit archived cutoff/reset |
| Active marches, rallies, garrisons, cargo and hospital jobs | Reconcile/return exactly once at transfer; no blanket deletion |
| Daily/weekly tasks | UTC-cycle keys with settled reward receipts |
| Seasonal rewards and governance | Immutable result snapshot; claim policy and expiry stated up front |

This is a design commitment for R7, not implemented season support.

## Original art production order

1. Fix layout/transforms/label/fog defects before producing expensive assets.
2. Establish one **Greek starting district + world clearing**: consistent camera,
   readable roads, civic focal point, selected states and terrain values.
3. Refine a matched Greek unit/hero/mythic kit: neutral scale/facing, idle/march/
   attack/skill/retreat/hit/victory/gather, approved silhouettes at game zoom.
4. Produce 16 institution silhouettes plus restrained unbuilt/construction states;
   define art milestones separately from gameplay rank. Streets remain visible.
5. Use the approved scale/material/animation contract for the other four cultures.
6. Add restrained gameplay-meaningful VFX, layered audio and device quality tiers.

The 0.17 weighted assets and original portraits are a baseline, not final
production quality. No art taken from the reference games is imported. Do not
mistake a Blender lineup or concept illustration for a Unity gameplay capture.

## Initial work delivered with this plan

Version 0.19 starts R0: scale-safe icon/trim geometry, compact non-wrapping action
labels, honest thin progress bars, selected-first collision-aware world labels,
feathered visual fog, and a composed city with roads, a civic plaza, district plots,
landscaping and quieter selected/working-building labels. Decorative walls are
cosmetic. Server permission, fog filtering, economy and combat are unchanged.

Next after native R0 review: R1 recoverable identity and command retry UX, with R2
versioned progression/economy tables prepared alongside it. Choose a host/domain
before provisioning the private kingdom; the current chat is not an uptime service.
Android, full production art, alliance Titans, pets, city siege, commerce and KvK
are required later work, not marked complete by this reference import. The next
implementation batch adds troop-tier/promotion ledgers and gathering cargo, then
hero talents/companions and alliance progression. All require migrations and
negative-case fixtures before their screens are called playable.

## Current execution batch: 0.20

- Realm-local account protection, device login, expiring/revocable sessions,
  one-time recovery codes and password-safe account metadata.
- Retained command IDs in the client; per-character receipt ownership permits
  replay after account/session recovery without repeating a resource charge.
- A private inventory with five resource packs and two hourglass types, exact
  consumption, active-job targeting and once-only founding supplies.
- Derived power components and live player/alliance rankings with an explicit
  wounded/queued exclusion policy; no competitive reward cutoff is implied.
- Schema migration and updated Windows bundling; native client review pending.

This batch starts E10/E03/E09. It does not finish those epics or the full program.
