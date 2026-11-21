# Overnight handoff — 2026-11-21

Published main at the start and end of this integration pass: `d57c38baa44f0a6e5b99da75d07fa8ca8ba926ef`.

No new gameplay rule was added in this pass. The march-card layout fix was already on that commit. This pass built a clean Windows package from it, checked the packaged server, and recorded the Linux blocker.

## Windows package

- Unity `6000.3.0f1` batch build exited with `Exiting batchmode successfully now!`
- Log: `work/overnight/unity-build.log`
- Folder: `dist/OvernightWindows/`
- Zip: `dist/Thrones-of-Myth-OvernightWindows.zip` (121,961,219 bytes)
- Manifest: version `0.45.0`, protocol `17`, platform `windows-x86_64`, dirty `false`
- Commit: `d57c38baa44f0a6e5b99da75d07fa8ca8ba926ef`
- Server digest: `67533707637586487b7d78a028a22f1fc7c2f9d4ea6a902469f4c02d4452e39f`
- Older packages were left in place, including `dist/MarchCardWindows/` and any QA-01 archive.

The packaged server was started with `THRONES_SAVE_PATH` set to `work/overnight-kingdom/world.json` and `--local-port=8098`. `GET http://127.0.0.1:8098/health` returned status ok, protocol 17, and the commit above. That save has zero players. It is not the production kingdom.

The new `ThronesOfMyth.exe` was not launched. Native clicks of the march card were made earlier against the same sources before this clean stamp. Those screenshots remain `docs/qa/evidence/march-card/native-1280-gather-ordered.png` and `docs/qa/evidence/march-card/native-1920-card-docked.png`.

## Saves and ports

| What | State |
| --- | --- |
| Production `%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json` | Unchanged. SHA256 `699A555BF038E28082626EDA55F9F5F53B725DF021FEF5FED2D9989700744101` before and after this pass. |
| Port 8095 | Not listening. Do not start a server on 8095. The QA-01 isolated kingdom is `work/qa01-kingdom/world.json`. |
| Port 8097 | Still the earlier March Card package, save `work/march-card-kingdom/world.json`. A game window may still be attached to it. |
| Port 8098 | This clean package. Save `work/overnight-kingdom/world.json`. |

Do not point any of these servers at the production save.

## Linux

Not run. This machine's WSL root is a 127 MB disk that is 100 percent full (`/dev/sdd` 126.6M, 0 available). It has no Node, no Python, no package manager, and no glibc loader. Copying a Node binary into `/tmp` failed with `No space left on device`. The official `node-v24.18.0-linux-x64` binary was downloaded on Windows and is visible to WSL, but executing it failed because the dynamic linker is missing. The five Linux cases in `server/linux-package.test.mjs` still skip on Windows. Those skips are not passes.

On a Linux machine with Node 24, from this repository:

```
node --test server/linux-package.test.mjs
```

That runs the launcher, symlink rejection, client stub, and client-only join checks. It does not play the Unity client. A Linux player build was not produced.

## What tomorrow can play

Use `dist/OvernightWindows/Start Thrones of Myth.cmd` only after stopping anything else on port 8080, or start the packaged `Runtime\node.exe` with `THRONES_SAVE_PATH` pointed at a disposable file and `--local-port` set to a free port other than 8095.

Already played on these sources, at interface preference 1:

- 1280×720 window, client 1264×681, scale 0.80: Frontier Captain, 900 infantry, Starwell Spring preview, second right-click accepted a gather. The card stayed on the left.
- 1920×1080 window, client 1904×1041, scale about 1.16: the same dock, with the march still on the map.

Not played:

- Interface preference 0.85 and 1.15. The presentation contract covers the geometry. The slider was not moved.
- A fight, a battle report with casualties, hospital treatment, troop promotion, and the unused inventory items from QA-01.
- The clean `OvernightWindows` executable itself. The earlier clicks used the pre-stamp build of the same commit.
- Linux launcher tests and any Linux native client.

Action points, route speed, combat, and map geography were not changed to hide the march-card bug. Siege remains closed. Deaths and hospital overflow remain blocked until a version-bound reference table exists.
