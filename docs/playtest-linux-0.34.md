# Linux x86_64 playtest — v0.34

**No Linux Unity client was built or run in the cloud.** The source/launcher is
prepared; the six launcher integration tests use an explicitly non-Unity client
stub. All native acceptance below remains pending.

## Build the actual client

Start from a clean checkout of the delivered main commit. Close any running Unity
instance for this project before a batch build. Back up existing Saves; never
remove progress to obtain a fresh player.

Required: Unity **6000.3.0f1** with **Linux Build Support (Mono)** installed through
Unity Hub, a valid local Unity license, and Git available on the editor's PATH.
The playtest machine needs desktop Linux x86_64, a working graphics driver and
**Node.js 24 LTS or later**. Node is not bundled in Linux output. The .NET 8 SDK
runs portable contracts; the shell helper clearly marks those pending if absent.

On Windows or Linux, open `client` and choose:

**Thrones of Myth → Build Linux x86_64 Playtest**

Or on a Linux build machine:

```sh
git switch main
git pull --ff-only
bash tools/build-linux-playtest.sh /path/to/6000.3.0f1/Editor/Unity
```

The helper runs server tests, available portable contracts, native headless
camera/import checks, the Linux build and payload verification. Read
`work/linux-review/headless.log` and `build.log` on failure. A headless pass does
not validate rendering or native input.

For a direct Unity batch invocation:

```sh
/path/to/Unity -batchmode -nographics -projectPath "$PWD/client" \
  -buildTarget Linux64 \
  -executeMethod ThronesOfMyth.Editor.LinuxPlaytestBuilder.BuildFromCommandLine \
  -quit -logFile "$PWD/work/linux-build.log"
```

Create `work` first for the direct command. Output is:

- `dist/Thrones-of-Myth-Linux-x86_64.zip`
- `dist/Linux/Game/ThronesOfMyth.x86_64` and its complete Unity data/runtime files
- Matching `Server/*.mjs`, `Launch.mjs`, shell entry point and README
- `manifest.json`: release, full source commit, Unity version, dirty flag and hashes

The manifest commit is the commit **actually built**. Modified checkouts are
explicitly labeled; they are not represented as clean release builds. Both native
builders use `ReleaseVersion.Current` (0.34.0); protocol remains 16. Keep the
whole ZIP together; replacing individual files invalidates its matching hashes.

## Start

Extract the entire ZIP into a fresh folder on Linux, then:

```sh
bash Start-Thrones-of-Myth.sh
# Or:
node Launch.mjs
# Independent local world if another server is using 8080:
node Launch.mjs --port=8081
# Record an opt-in native performance capture:
node Launch.mjs --thrones-profile -screen-width 1600 -screen-height 900
```

The launcher prints the version/commit and verifies package contents before
starting. It passes the matching loopback server address to the player, requests a
final save and stops only the process it started. Do not run the game EXE alone
unless you deliberately manage the matching server yourself.

Saves are in `$XDG_DATA_HOME/ThronesOfMyth/Saves` (default
`~/.local/share/ThronesOfMyth/Saves`); logs in the sibling `Logs` folder. Default
port 8080 uses `world.json`; another port uses `world-<port>.json`. Existing saves
are retained. A stale lock is not automatically deleted: inspect its PID and
confirm both launcher/server stopped before removing that specific lock.

For a fresh guest, use a new unique name on the entry screen. From an existing
guest: Settings → Return to guest profile selection. A protected account uses
Account and recovery → Sign out this device → Back to local / guest profile.
The prior city and guest resume tokens remain saved. Keep optional first-session
guidance enabled for the walkthrough; disable it to verify free navigation.

## Record this complete real journey

1. Capture entry/Settings version and source commit. Enter a fresh Greek city;
   observe crafted roofs, walls/gatehouses, terraces, pottery, vegetation and
   ambient actors. Rotate Q/E, zoom, select buildings and inspect foundations.
2. Follow the optional Captain step. Show Skills and Development, including the
   real Rallying Cry description. Pose preview is not proof of a combat activation.
3. Train **one batch of five archers**. Wait for the real queue. Edit the founding
   home formation; use **Scout patrol: Captain, 15 infantry + 5 archers, no mythics**.
   Confirm. Do not select ALL READY afterward; extra troops can end the fight
   before sufficient rage. Record exact reserves and deployment-slot distinctions.
4. Send a scout toward **(20,20)**. Focus the report. After the scout returns, select
   remembered **Forsaken Scouts, level 1**, and **March & attack**. Unknown IDs stay
   denied, and last-seen information remains stale until real vision.
5. Record approach, infantry/archer formation, turning, anticipation, attacks,
   damage/health trace, shield and the fifth-hit Captain cast: gold gathering,
   weapon raise, shockwave, wards and protective aura. Results are authoritative;
   another participant/upgraded roster can change timing or outcome.
6. Record actual victory credit, Reports filters/search and commander progress.
   Return home; deployed art disappears and the slot frees. Enter city, upgrade
   the Citadel using real resources and watch the hoist, completed towers/banners
   and existing completion cue. No grants/debug victories.
7. With legitimately owned alternatives, record Rune Seer/Horus healing,
   Scout/Atalanta projectiles or Tomoe/Sigurd melee styles. Use a small healthy
   formation and a suitable real camp that survives five rage-building hits.
   No new AoE, dash, critical-hit or debuff mechanics were introduced.

## Acceptance matrix — all pending native execution

Repeat at **1200×720, 1366×768, 1600×900, 1920×1080**, UI 85/100/115%; also check
1280×720, 2560×1440 and ultrawide 2560×1080.

- Read resource/AP/oath values, full-refill timers, all march labels and tooltips.
  Switch pages while hovering; no stale tooltip. Inspect inventory list/detail,
  disabled item reasons, Skills/Development, research queues, campaign, daily
  rewards and alliance actions. No lost screen, action or shortcut.
- Pan all four edges/corners at both zoom extremes; drag and keyboard pan; focus
  home, marches, surveys and edge objectives. No blank world or selection drift.
  Click dark minimap land: scouting/Home guidance must explain the view.
- Enter/exit city repeatedly, select every building across rotations, use district
  list, queue construction/training/research and verify no accidental world orders.
- Verify three fog states and frozen last-known stock/health; no hidden armies.
  Approach an empty remembered camp: cancel on legitimate visibility, no AP charge.
- Reduced motion/effects off/sound zero, including mid-cast; no moving embellishment
  when disabled, real shield remains readable, no duplicate cast/reward on reconnect.
- Record actual retreat/defeat/recovery, simultaneous visible armies and saturation
  fallback. Observe whether art/effects remain readable; passing source tests says
  nothing about those visual results.

For performance, record CPU/GPU, OS/driver, resolution, visible armies and capture
file from the opt-in recorder (path printed in player log). Compare idle world,
city orbit/construction, one real battle and multiple skills. Inspect CPU/GPU frame
percentiles, allocations and draw calls with Unity Profiler where available.
**60 FPS is a target, not a measured result from this delivery.**
