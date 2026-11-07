# Thrones of Myth

A shared-world mythology strategy prototype: found a city, lead mortal and
mythic armies, form an alliance, and reclaim the fallen gods' sanctuary.
See [the game concept](docs/game-design.md).

## Playable slice 0.17

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
There is no city siege, field interception of rallies, online account system,
production database, hosted kingdom service, or KvK yet. The CLI saves locally;
world simulation pauses while the server is closed; UTC activity periods continue. See the playtest guide for save paths.
