# Linux native playtest — v0.37.0

**Native Unity execution is pending.** No Linux/Windows binary, rendering, input,
audio or FPS pass was produced in the cloud. Server gameplay proof uses real HTTP,
SQLite and accelerated simulation; launcher tests use an explicit non-Unity stub.

## Build a matching complete package

Back up existing saves. Use a clean delivered main checkout, Unity **6000.3.0f1**,
Linux Build Support **Mono**, an activated editor license and Git on PATH. Close
other editors for this project. Desktop Linux needs compatible graphics drivers
and Node **24 LTS+** (not bundled). Portable contracts require .NET 8 SDK.

```sh
git switch main
git pull --ff-only
bash tools/build-linux-playtest.sh /path/to/6000.3.0f1/Editor/Unity
```

Alternatively open `client` in the editor and choose **Thrones of Myth → Build
Linux x86_64 Playtest**. The shell helper runs server/available portable checks,
headless camera/import checks, build and package verification. Review
`work/linux-review/headless.log` and `build.log`; headless checks cannot validate
rendering/input. Output: `dist/Thrones-of-Myth-Linux-x86_64.zip`. Extract the entire
ZIP. Keep client, server, launcher and manifest together. Manifest/entry/Settings
show actual source version/commit; dirty checkouts are explicitly labeled.

```sh
cd /path/to/extracted/package
node Launch.mjs --server-profile --thrones-profile -screen-width 1600 -screen-height 900
```

The launcher starts its matching local host, saves and stops only that process.
`--port=8081` creates an independent local world, not a second player in the same
kingdom. Saves: `$XDG_DATA_HOME/ThronesOfMyth/Saves`, default
`~/.local/share/ThronesOfMyth/Saves`; logs in sibling `Logs`. Existing saves are
retained. Inspect stale lock PIDs before removing a stale lock; never delete saves
to start fresh. Windows: rebuild using the existing **Build Windows Playtest**
menu and use its full packaged launcher; native Windows checks remain pending too.

## Fresh player and real commander-skill encounter

1. Capture entry/Settings identity. Choose a new unique guest name. To leave an
   existing guest use Settings → Return to guest profile selection. Protected
   accounts use Account and recovery → Sign out this device → Back to local /
   guest profile. Keep the optional introduction enabled initially.
2. Enter the Greek city with City/C. Rotate/zoom; select institutions, then use the
   district-list alternative. Check real levels, locked institutions, prerequisite
   links, construction/training queues and return to kingdom.
3. Follow the optional Captain action to **train five archers**. Wait for actual
   completion; inspect reserves and select the founding formation.
4. Apply **Scout patrol**: Captain, 15 infantry, five archers, no mythics. Confirm;
   do not press ALL READY afterward. Deploy and send a scout toward **(20,20)**.
5. Select discovered/remembered **Forsaken Scouts**, choose **March & attack**.
   Observe approach/path/approximate ETA, server-confirmed attacks and fifth-hit
   **Rallying Cry**. Stronger/alternative formations may kill too quickly to cast;
   do not alter balance or manufacture a skill event to obtain footage.
6. Observe actual victory, losses, rewards and private battle report. Recall;
   verify docking removes the map formation and releases its deployment slot.
   Heal if needed. Defeat/recovery should be tested separately against a genuinely
   stronger available enemy; no forced outcome is provided.
7. Gather at a visible node. Verify gradual cargo while city balance stays separate;
   interrupt with Stop and Recall to deliver partial cargo. Check delivery report.
8. Upgrade the Citadel when eligible. Follow an unmet prerequisite into its real
   institution/research; verify queue completion and feedback. Compare an owned
   commander against the same formation; comparison must not recruit/assign/spend.
   Inspect Skills/Development, summons/shards, inventory categories, timed buffs,
   AP items and optional daily rewards. All costs/claims remain real.
9. Turn optional guidance off: all actions remain available. Disable motion and
   sound separately; visual/audio feedback must respect both settings.

Other skill styles require legitimately acquired commanders. Keep a recording of
actual cast events; a source test is not a visual skill-timing acceptance pass.

## Returning player and interruption

Use the existing identity/save. Record resources, commanders, inventory, queues,
formations and partial cargo. Stop/relaunch the host through its launcher,
reconnect and compare. Interrupted active orders may require explicit reissue;
verify clear paused state, no duplicated cargo/reward/commander and successful
manual delivery. Do not reset progress or expose resume/recovery tokens in video.
Run two owned marches independently; test Stop, retargeting, missing AP, locked
passes, depleted/remembered camps, home arrival and reconnect.

## Two actual native players

Use two **separate OS user profiles** on the same desktop for durable Unity
PlayerPrefs/profile isolation; same-user instances share preferences and are not
a persistence-isolation guarantee. Keep player A's host running. In player B's
session launch the exact same package/commit:

```sh
node Launch.mjs --join=http://127.0.0.1:8080 --thrones-profile
```

Join verifies version/commit/protocol/server digest, starts only the client and
never stops the host. Different builds are rejected. Loopback hosting remains the
default: this command does not configure public/LAN hosting or firewall exposure.

Use distinct guest identities. Build Citadel 2 and Oathbound Hall as required;
A creates an alliance, B joins, A promotes B. Verify current roster/roles, shared
marker and private alliance chat. Build the Market; transfer a permitted resource
and compare sender tax, receiver delivery and reports. Start A's legal upgrade;
B helps once, repeated help must be rejected. Build the real root fort and let B
garrison it, then recall. Assemble a two-player rally against Godbreaker Watch;
check both march memberships and leader recall (victory requires real combat).
Move both players simultaneously, leave/rejoin alliance and check roster updates
without leaking unseen city changes. Close B: host/A remain live. Restart host and
reconnect both with the same identities. Capture actual outcomes, not stub output.

Automated reproducible server equivalent (temporary SQLite, no user save touched):

```sh
node tools/two-player-proof.mjs work/two-player-proof.json
node --test server/multiplayer-readiness.test.mjs server/linux-package.test.mjs
```

The proof completes real production commands with accelerated simulation ticks.
It is not a native client or real-time latency test. It includes exactly-once
concurrent transfer/replay after restart and an independent privacy observer.

## Camera, UI and performance

Repeat at 1200×720, 1366×768, 1600×900 and 1920×1080; also check 2560×1440 and
ultrawide where supported. Test 85/100/115% UI scales, nearest/farthest zoom,
all map edges/corners and boundary focus/picking. Open city, district list,
inventory, reports, commanders and alliance interfaces. Check tooltips, text
clipping, pending/rejected orders and keyboard shortcuts. No city input may issue
an accidental world order. Repeat enter/exit/rotation during active queues.

`--thrones-profile` enables the existing native recorder. Press **F8** to capture
600 frames (again to finish early); Unity logs its persistent `VisualReview` path.
Warm the scene, repeat a fixed camera/army sequence and record resolution, scale,
CPU/GPU/driver, visible march count, motion/sound settings, version and commit.
Capture city/world/combat separately. Do not present Editor FPS as player FPS.

`--server-profile` writes `Logs/server-metrics-<port>.json` every ten seconds and
on shutdown: bounded recent CPU phase samples, process memory and JSON bytes.
These exclude network transit and client rendering. Compare equivalent runs;
keep raw logs and state whether JSON or SQLite storage was used.

```sh
node tools/benchmark-kingdom.mjs work/kingdom-benchmark.json
```

This separate synthetic load test uses authored 32-player/160-formation fixtures,
not native gameplay. Read [measurement scope](validation/measurements-0.37.md).
