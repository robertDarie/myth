# Visual overhaul: reproducible native review

Use **Unity 6000.3.0f1** and the feature branch. Do not merge or overwrite the gameplay agent's main checkout.

## Build an isolated review checkout

In a clean local checkout, or create a separate worktree from it:

```sh
git fetch origin
git worktree add --detach ../myth-visual-review origin/feature/visual-overhaul
cd ../myth-visual-review
git lfs pull
git rev-parse HEAD
```

Record the full commit with the video. The build retains the base release number; the commit identifies this visual branch. Use a backed-up/copied playtest save, not the only copy of valuable progress.

Linux, with the installed Editor path:

```sh
tools/build-linux-playtest.sh /path/to/6000.3.0f1/Editor/Unity
```

The helper runs server tests, portable contracts if `dotnet` is installed, native headless acceptance, builds the package and validates its payload. For compilation/import checks alone:

```sh
/path/to/Editor/Unity -batchmode -nographics -projectPath "$PWD/client" -executeMethod ThronesOfMyth.Editor.VisualAcceptanceReview.ValidateHeadless -quit -logFile /tmp/thrones-visual-headless.log
```

On Windows, add/open this worktree's **client** in Unity Hub. Wait for compilation. Run **Thrones of Myth → Visual Review → Run Headless Contracts**, then **Thrones of Myth → Build Windows Playtest**. Extract the entire generated ZIP and run **Start Thrones of Myth.cmd**. Rebuilding main or launching an older `dist` folder will not test this branch.

## P0 vegetation comparison

Linux launcher forwards diagnostic flags. Run the following **sequentially**, with the same saved player, camera, settings and time-of-day presentation. Close each player/launcher before the next. Port 8082 provides a separate playtest world from the normal 8080 profile.

```sh
cd dist/Linux
./Start-Thrones-of-Myth.sh --port=8082 --thrones-standard-vegetation
./Start-Thrones-of-Myth.sh --port=8082 --thrones-standard-vegetation --thrones-no-shadows
./Start-Thrones-of-Myth.sh --port=8082
./Start-Thrones-of-Myth.sh --port=8082 --thrones-no-shadows
```

The standard-material flag is the same-branch material A/B, not a screenshot of the untouched baseline. For a true before image, build starting commit `75b3f01` in another review worktree with an equivalent copied save and matched camera. Never force/reset the gameplay checkout to obtain it.

Capture each run at 1280×800, then 1920×1080:

1. World oak grove, pine grove and wood gathering node, near/far zoom.
2. City trees viewed from four rotations; enter/exit city three times.
3. Same tree on an explored/unknown boundary and against a light terrain patch.
4. Record OS, graphics device/driver/API, hardware versus software renderer, resolution, UI scale, flags and commit. Save full Player logs with screenshots.

Acceptance: canopy pigment is visible on lit and shaded surfaces; no black masses, magenta/error materials, missing faces, shadow acne or inverted lighting. Disabling shadows must not be the only playable workaround. Compare Linux OpenGL and another supported backend/hardware when available; **do not infer hardware results from a software renderer**.

Windows diagnostic flags require launching `Game/ThronesOfMyth.exe` directly against an already-running test server using `--thrones-server <URL>`; the existing `.cmd` does not forward arbitrary flags. Normal Windows launch remains unchanged.

## P0 exploration / privacy

1. Fresh player: unknown terrain conceals ground, canopy tops, cliffs and decorations completely. No translucent sector-edge silhouettes at any zoom or map edge.
2. Send and recall a scout. Explored sectors remain completely clear after sight leaves, reconnect and server restart. Minimap agrees with the world.
3. Missing/disconnected snapshot must not reveal unknown sectors. Existing disconnect UI remains functional.
4. Two-player test: hide an enemy march outside current sight, then move it. It must not appear in the world/minimap or leak orders through labels/effects.
5. Change/deplete a remembered resource remotely. The observer must not learn the new amount until legitimately observed. Retained last-known labels must still identify stale detail.
6. Private veil reading remains an explicitly historical report and does not become ordinary map intel.
7. Check hovering/clicking explored objects at mask boundaries. The veil has no collider; world selection and camera footprint rules should be unchanged.

## P1 composition and UI matrix

For **1024×768, 1280×800, 1920×1080, 2560×1440**, plus 1280×720 and ultrawide, test UI scale **85%, 100%, 115%**. At each combination:

- Exploration: switch directly between Scouts, Discovery journal, Survey reports with 20 stored reports. Tabs stay accessible while the body scrolls; every redirect/recall, claim and focus action remains available.
- Formation: all troop tiers/mythic rows, long commander names, empty/large reserves, numeric entry, MAX, sliders, presets, CLEAR and ALL READY. Verify title ellipsis exposes full tooltips and selected counts match server-confirmed assembly.
- Research: Drill and Reading of the Veil have separate selectable cards. Inspect every technology, costs/prerequisites and active queue; last row remains reachable.
- City: all five cultures, levels 0–5 where available, each district at four rotations and zoom extremes. Distinct new courts must not conceal roads, adjacent institutions or selection rings. Construction/locked plots, accessible district list and queues still work.
- World: all four province openings are visually clear; approach both directions. Cliff bands must not suggest a new traversable route or conceal an objective. Sweep every edge/corner and focus boundary objectives at minimum/maximum zoom.
- Remaining screens: login/civilization, HUD, training/promotion, commanders/skills/development, temple, inventory, reports, alliance, market, events/rewards, settings/account, first-session guide. Reach every control with mouse and existing shortcuts; verify scrollbars, pending/disabled/errors and tooltips.

## Regression journey and performance

Using a new profile, follow guidance through construction, training, assembling a mixed march, gathering/delivery, a real PvE battle/report, recall and city entry. Repeat with an existing save. Confirm quantities/rewards only change from acknowledged server events. Repeat with reduced motion and sound disabled.

Measure the same scenes on baseline and feature builds: idle world, dense woods, city rebuild/rotation, several visible marches and a real combat encounter. Keep camera, resolution, quality and populations identical. Use **Art Review → Measure 300 Game Frames** for Editor evidence and record standalone Player profiler/frame timings separately. Report median/p95 frame time, draw calls, managed allocations and graphics device. The existing Editor sampler does not establish standalone FPS.

Screenshots and profiler/log outputs belong under ignored `work/` or a review attachment, not as generated artifacts in this branch. Report each check as pass/fail/pending with evidence. Fix native compilation and P0 rendering defects before approving further cosmetic work or integration.
