# Thrones of Myth

A mythology strategy game about building civilizations, commanding mortal and
mythic armies, and restoring the fallen gods. See [the game concept](docs/game-design.md).

## First playable slice

This repository contains a dependency-free Node.js authoritative prototype server
and a Unity C# client scaffold. Two clients can join one map, move their armies,
and fight a shared Forsaken enemy. All movement, health, combat, and rewards are
calculated by the server. Graphics are temporary primitives.

Requirements: Node.js 24 LTS; Unity 6.3 LTS installed through Unity Hub; Git and
Git LFS. Unity's first import creates editor settings and packages locally.

```sh
cd server
npm test
npm start
```

Open `client/` in Unity Hub using a Unity 6.3 LTS editor. Use **Thrones of Myth →
Create Prototype Scene**, save the generated scene, and press Play. Click ground
to move; click the red enemy to approach and attack. Use the on-screen buttons
to join and select an action. Run a second editor instance using a separate clone,
or build and run a standalone Windows client, to test two players. Both clients
use `http://127.0.0.1:8080` by default.

See [Windows setup](docs/windows-setup.md), [architecture](docs/architecture.md),
and [milestones](docs/milestones.md). Unity compilation and visual testing require
a local licensed editor and have not been run in the cloud environment.

## Layout

- `client/`: Unity assets, package manifest, and project settings.
- `server/`: in-memory HTTP simulation and automated tests.
- `docs/`: design, setup, architecture, and delivery milestones.
- `tools/`: Windows prerequisite checker.

This is a local development prototype. Sessions and world state reset on restart.
It has no production accounts, persistence, alliance gameplay, or deployment yet.
