# Thrones of Myth

A shared-world mythology strategy prototype: found a city, lead mortal and
mythic armies, form an alliance, and reclaim the fallen gods' sanctuary.
See [the game concept](docs/game-design.md).

## Playable slice 0.37

- Multiplayer reliability: live alliance membership/help independent of remembered
  map intelligence, matching-build client-only Linux join, bounded opt-in server
  metrics and measured visibility reuse. [v0.37 verification](docs/multiplayer-0.37.md).
  [v0.35–v0.37 delivery](docs/gameplay-batch-0.35-0.37.md) ·
  [Current Linux build and native checklist](docs/playtest-linux-0.37.md).

- Progression: clickable building/research prerequisites, private same-march
  commander comparisons, item icons and period-aware reward feedback.
  [v0.36 verification](docs/progression-0.36.md).
- Army control: route/arrival estimates, engagement-radius paths, Stop/Recall,
  explicit interrupted states, real home-arrival feedback and bounded original volleys.
  [v0.35 verification](docs/army-control-0.35.md).
- UI and first session: AP gauge, readable march rail, inventory/report layouts,
  Skills/Development, campaign tabs, minimap exploration and optional city/Captain
  introduction. [Batch delivery](docs/visual-batch-0.32-0.34.md) ·
  [Build and record the Linux playtest](docs/playtest-linux-0.34.md).
  **No Linux Unity binary or native visual/FPS pass was produced in the cloud.**
- Combat spectacle: shared bounded commander effect styles, coordinated attack
  envelopes, shield/readable loss traces and original skill audio.
  [Implementation and verification](docs/combat-release-0.33.md).
- World/city craft pass: culture-shaped tiled roofs, bent grass, pottery, gatehouses,
  worksite details, ambient activity and opaque cloud fog.
  [Implementation and verification](docs/art-release-0.32.md).
- Starting-region / Captain showcase: original sculpted vegetation and architecture,
  painted surfaces, bounded Rallying Cry VFX/audio, mixed patrol preset, real
  remembered-camp attacks, opening guidance and shared UI readability fixes.
  [Implementation, checks and limits](docs/visual-showcase-0.31.md) ·
  [Windows rebuild and showcase](docs/playtest-showcase-0.31.md).
  **Native visual/input/audio/FPS acceptance remains pending.**
- Kingdom-to-city presentation: camera approach and reversible city blend, direct
  building picking in the main viewport, contextual construction/institution
  actions, bounded orbit/zoom and retained district-list access.
  [Implementation and limits](docs/city-experience-0.30.md) ·
  [Windows acceptance](docs/playtest-city-0.30.md).
- Economy redesign: ordinary Mana separated from earned premium Aether, shard/
  summon/progression commander acquisition, transactional alliance transfers,
  categorized consumables, real-time AP and authoritative timed combat oaths.
  [Rules and safe migration](docs/economy-release-0.29.md) ·
  [Windows rebuild and playtest](docs/playtest-economy-0.29.md).
- Core corrections: persistent last-known static map intelligence, home formations
  distinct from deployed marches, composition-based cargo with delivery-only
  resource credit, and unified private reports with filters/search.
  [Rules, migration and Windows acceptance](docs/core-corrections-0.28.md).
  [Approved economy design foundation](docs/economy-plan-0.29.md).
- Gameplay-feel milestone: replay-safe combat/arrival feedback, clearer routes and
  affiliations, optional first-session guidance and confirmed reward/outcome cues.
  [Exact Unity demonstration and verification](docs/gameplay-feel-0.27.md).
- Composed regions, distinct culture institutions and confirmed city completion
  feedback; grouped navigation, readable controls and clearer action states.
  [Phases 2–4 delivery, verification and rebuild guide](docs/visual-quality-delivery-0.26.md).
- Map readability phase: five recognizable resource worksites with server-driven
  stock, compact map markers and mixed-class overview formations with fitted
  selection/picking. [Audit, phases and native acceptance](docs/visual-quality-plan-0.23.md).
- Viewport-aware world camera limits and aspect-aware zoom; compact HUD, regional
  terrain/scenery and city framing/status feedback. Native visual acceptance is
  pending; see [changes and Windows validation](docs/visual-camera-0.22.md).
- Playable veteran progression: research-gated Tier II infantry/archers/cavalry,
  direct training or reserve promotion, tier-preserving formations/wounds/healing
  and visible rank markers; existing class counters remain active.
- SQLite accounts: protect a city, sign in across devices, revoke sessions and
  recover with a one-time code; retained command retries survive session changes.
- Inventory with earned resource packs, targeted hourglasses and once-only founding
  supplies; transparent power components and live player/alliance rankings.
- Reference adaptation plan: all 679 workbook records mapped to 14 epics, themed
  decisions and phased acceptance gates, with an adapted Excel/CSV register.
- First visual foundation pass: scale-safe UI decorations, compact labels/bars,
  collision-aware world labels, feathered fog and a composed living city layout.
- Hosted-kingdom foundation: transactional SQLite, rollback on failed saves, keyed
  command receipts, downtime progression, online backups and Docker/HTTPS deployment.
- Disconnected players keep their accepted field orders in a running kingdom.
- Private-alpha invitation codes and readiness checks; existing local saves still work.
- Original weighted armies for all five civilizations, 11 named hero models and eight
  animation takes per model; typed formations, pooled combat effects and original audio.
- An interactive living city with selectable institutions, visible construction,
  live job progress, cosmetic guards and a district-list alternative.
- Native Unity art review tools and an asset preflight before Windows packaging.
- Kingdom preparation milestones, scheduled gate/sanctuary openings, contribution
  eligibility and saved stage rewards; a short local playtest schedule.
- Original low-poly civilization cities, forest/rock meshes, painted regional
  terrain, clustered scenery, softer lighting and refined interface frames.
- Daily activity with ten optional tasks, five fixed reward chests and UTC resets;
  weekly alliance goals with saved personal contributions and once-only claims.
- Five repeatable Godbreaker Strongholds across three tiers: rally-only guard/wall
  battles, contribution-based shared rewards, commander XP and private PvE reports.
- Six-chapter opening campaign with 19 objectives, individual and chapter rewards,
  a persistent next-goal HUD, contextual Go actions and saved early achievements.
- Persistent discovery, allied fog of war, dedicated scouts and private scouting
  reports; marches, rallies and reinforcements route through captured gate corridors.
- Timed alliance rallies, defended structures, late reinforcements, attackable forts
  and beacons, connected supply, and private reports for every contributing march.
- Field PvP duels, typed wounded troops, paid hospital treatment and private battle
  reports; alliance ranks/succession, kingdom/alliance chat and shared map markers.
- Greek equipment meshes, smoother formation turning and gait transitions, hit/retreat/
  victory feedback, clearer route arrows, and initial battlefield sound effects.
- Painted loading screens with real preparation stages and connection recovery.
- Exact march assembly with commander selection, troop sliders and infantry, archer,
  cavalry and mythic reserves; typed training and automatic old-save migration.
- Articulated troop/horse/mythic movement, visible commanders and an interactive
  commander model preview with idle, march and skill poses.
- Original painted commander portraits, ornate rarity frames, sanctuary key art,
  civilization city silhouettes, recognizable resources and mythic escorts.
- March, attack, gathering, banner and skill animations, observed health-change
  captions, actual shield indicators, and a saved reduced-motion option.
- Original map-first interface: compact HUD, march rail, context actions,
  city grid, research graph, searchable commanders and a dedicated Temple screen.
- Five age-based march slots, independently controlled armies, a permanent
  earnable second construction crew, and individual commander XP/stars/skills.
- Sixteen themed institutions, a clickable city overview, eight technologies,
  passive production, resource exchanges, relic crafting and alliance job help.
- Temple of Echoes: earned-sigil summons with published odds, persistent rarity
  guarantees, duplicate shards and commander ascension; 11 commanders.
- Five civilization choices with working combat, recovery, health, gathering,
  or movement bonuses. Each has a named mythic recruit.
- An 80×80 shared map with cities, camera pan/zoom, object selection, health bars,
  movement smoothing, a minimap, and a kingdom event feed.
- Seven enemy camps across five levels, shared combat rewards, XP, retreat and
  recovery, and 45-second camp respawns.
- Eighteen gatherable resource sites; food, wood, stone, gold and aether support city upgrades,
  troop training, and mythic recruitment.
- Green/Common, blue/Rare, purple/Epic, and gold/Legendary commanders with stat
  bonuses. A three-camp quest unlocks Epic Atalanta.
- Create or join an alliance, build connected beacons, occupy shrines for buffs,
  capture gates to unlock provinces, and claim the central sanctuary.
- Independent city upgrades and a three-order training queue while your army
  is away; completed troops wait in city reserves until reinforced at home.
- Automatic local world saves, backup recovery, and saved city/session resume.

## Standalone Windows package

Choose **Thrones of Myth → Build Windows Playtest** in Unity to generate a
portable ZIP with the Windows game, bundled server and double-click launcher.
Optional Inno Setup produces an installer too. Players need neither Unity nor
Node installed. See [Windows packaging](docs/windows-package.md).

## Run locally

Requirements: Node.js 24 LTS, Unity 6.3 LTS, Git. Use Git LFS before adding large
binary assets. See [Windows setup](docs/windows-setup.md).

```sh
cd server
npm test
npm start
```

Open `client/` in Unity. Choose **Thrones of Myth → Create Prototype Scene** once
if you do not already have a prototype scene. Press Play and choose **Establish /
Resume City**. Existing prototype scenes also work: the new client constructs
its map at runtime. Restart an older server before connecting the updated client.

**Controls:** WASD/arrows or middle-drag to pan; wheel to zoom; left-click to
inspect; right-click to march, attack, gather or capture; H to focus home; Space
to focus your army; R to return; Esc to cancel beacon placement. On-screen controls
provide equivalent action buttons. Keyboard camera input pauses over UI.

For a second player, run a Windows standalone build beside the editor and use a
**different player name**. Both clients connect to the local server. A matching
name and saved local token resume the same city; names alone are not credentials.

See [the kingdom roadmap—KvK later](docs/kingdom-roadmap.md),
[veteran troop progression 0.21](docs/veteran-troops-0.21.md),
[accounts, retries and supplies 0.20](docs/accounts-and-supplies-0.20.md),
[the complete reference adaptation plan](docs/reference-adaptation-plan.md),
[the visual foundation guide](docs/visual-foundation-0.19.md),
[the hosting and persistence guide](docs/hosting-and-persistence-0.18.md),
[the 0.17 army and living city guide](docs/army-and-living-city-0.17.md),
[the 0.16 kingdom and art guide](docs/kingdom-and-art-0.16.md),
[the 0.15 daily activity and alliance goals](docs/activity-and-alliance-goals-0.15.md),
[the 0.14 stronghold rules](docs/strongholds-0.14.md),
[the 0.13 opening campaign](docs/opening-campaign-0.13.md),
[the 0.12 exploration and route rules](docs/exploration-and-routes-0.12.md),
[the 0.11 alliance warfare rules](docs/alliance-warfare-0.11.md),
[the 0.10 war and social rules](docs/early-kingdom-0.10.md),
[the core systems audit](docs/core-systems-audit.md),
[the Greek battlefield slice](docs/battlefield-slice-0.9.md),
[march assembly and presentation](docs/marches-and-presentation-0.8.md),
[the art and animation guide](docs/art-direction-0.7.md), [the interface guide](docs/interface-0.6.md),
[the gameplay playtest guide](docs/playtest-0.5.md), [architecture](docs/architecture.md),
[the full city/economy design](docs/city-and-economy-design.md),
[skills, ages and marches](docs/skills-ages-and-marches.md),
and [milestones](docs/milestones.md).

Server gameplay and HTTP integration are covered by automated tests. Unity
compilation, rendering, and Windows builds have not been run in the cloud.
Commander portraits and sanctuary backgrounds use original generated artwork.
Cities, scenery, troops and commanders use original authored low-poly meshes.
Weighted army animations now have Blender round-trip checks; procedural actors
remain a fallback. This is an early art baseline, not final production quality.
Army FBXs use Git LFS: install Git LFS and run `git lfs pull` after updating.
There is no city siege, field interception of rallies, production identity service,
large-scale hosted kingdom deployment, or KvK yet. SQLite accounts now support
realm-local password/recovery-code login; email/platform recovery is still missing.
The default CLI saves locally; hosted SQLite mode adds bounded downtime progress.
Field simulation pauses while the server is closed; UTC activity periods continue. See the playtest guide for save paths.
