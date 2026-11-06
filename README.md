# Thrones of Myth

A shared-world mythology strategy prototype: found a city, lead mortal and
mythic armies, form an alliance, and reclaim the fallen gods' sanctuary.
See [the game concept](docs/game-design.md).

## Playable slice 0.2

- Five civilization choices with working combat, recovery, health, gathering,
  or movement bonuses. Each has a named mythic recruit.
- An 80×80 shared map with cities, camera pan/zoom, object selection, health bars,
  movement smoothing, a minimap, and a kingdom event feed.
- Seven enemy camps across five levels, shared combat rewards, XP, retreat and
  recovery, and 45-second camp respawns.
- Twelve gatherable resource sites; wood, gold, and food support city upgrades,
  troop training, and mythic recruitment.
- Green/Common, blue/Rare, purple/Epic, and gold/Legendary commanders with stat
  bonuses. A three-camp quest unlocks Epic Atalanta.
- Create or join an alliance, build connected beacons, occupy shrines for buffs,
  capture gates to unlock provinces, and claim the central sanctuary.
- Local session resume while the server remains running; state is in memory.

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
to focus your army; R to return; Esc to cancel beacon placement. The sidebar
provides equivalent action buttons. Keyboard camera input pauses over UI.

For a second player, run a Windows standalone build beside the editor and use a
**different player name**. Both clients connect to the local server. A matching
name and saved local token resume the same city; names alone are not credentials.

See [the playtest guide](docs/playtest-0.2.md), [architecture](docs/architecture.md),
and [milestones](docs/milestones.md).

Server gameplay and HTTP integration are covered by automated tests. Unity
compilation, rendering, and Windows builds have not been run in the cloud.
Graphics are procedural placeholders, including generic mythic escort models.
There is no PvP army combat, destructible territory, account system, durable
storage, production hosting, or KvK yet. Restarting the server resets all progress.
