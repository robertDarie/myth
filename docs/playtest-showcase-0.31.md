# v0.31 Windows showcase — rebuild and native acceptance

Every native item below is **PENDING**. No Unity Editor was available in the cloud.

## Rebuild

1. Close the old game/launcher and stop Unity Play mode. Back up the existing local
   kingdom save using your established package backup procedure; do not delete it.
2. In `C:\Users\rober\Documents\GitHub\myth`, run `git switch main`, then
   `git pull --ff-only`. Open **client** in Unity Hub with Unity 6.3 LTS
   (6000.3.0f1 or the project's compatible installed editor).
3. Let Unity resolve the added built-in Particle System module and import the new
   textures, audio and shader. Console must show no compiler/import/shader errors.
4. Choose **Thrones of Myth → Build Windows Playtest**. Node.js 24 LTS must be
   installed; Inno Setup is optional. Rebuild replaces generated `dist/Windows`.
5. Extract the **entire** new `dist/Thrones-of-Myth-Windows.zip` into a fresh build
   folder and run **Start Thrones of Myth.cmd**. Do not launch an old executable
   or copy only the EXE. Keep `http://127.0.0.1:8080` for local testing.

For Editor play, run `node index.mjs` from `server` in a separate terminal, then
open the existing Prototype scene and press Play. Use the same authenticated
server/account journey; native Editor rendering is still a separate check.

## Short real showcase recording

Use a **new player** for the baseline; retain an existing player for save checks.
No console grants, teleports, manual HP/rage edits or debug victories.

1. Enter the city [C]. Orbit Q/E, inspect the Citadel, Temple and training building;
   notice terraces, streets, gardens, walls and construction indicators. Return
   to kingdom with the existing control. Inspect the starting forest/worksites.
2. Open Training and select **archers**. Train one batch of five and wait for the
   real queue. Open Prepare march; edit the founding home formation. Select
   **Scout patrol · Captain · 15 infantry + 5 archers**, then confirm assembly.
   Do not press ALL READY afterward. Confirm zero mythics and the actual counts.
3. Open Scouting, send a scout toward **(20,20)** and let it return. Focus the survey;
   it should frame nearby land at useful bounded zoom. Select the remembered
   **Forsaken Scouts, level 1** and choose **March & attack**. A different/larger
   formation may kill too quickly to demonstrate the Captain's skill.
4. Record approach, infantry/archer movement, turning, targeting, health and attacks.
   On the confirmed fifth rage-building hit, inspect Captain anticipation/weapon
   raise, gold gathering, shockwave, soldier wards, shield and aura. Verify the
   aura ends with actual shield exhaustion. No full-screen flash or obscured fight.
5. Verify victory and real rewards in Reports, commander XP and actual AP cost.
   Recall [return action]; the march disappears on arrival, troops remain owned,
   the slot frees, and no duplicate reward/report appears after reconnect.
6. Enter city, upgrade the **Citadel** using real resources/prerequisites, observe
   scaffold/materials/hoist, then completed towers/banners and completion feedback.
   The starting Hall of Spears and Blessed Fields meet the level-2 Citadel
   prerequisites; if playing an older city, satisfy its displayed prerequisites. Existing campaign rewards are claimed normally.

## Display and interaction matrix

At **1920×1080, 1600×900, 1366×768 and 1200×720**, repeat with UI scale 85/100/115%.
Also test 2560×1440, 1024×768 and 2560×1080 for camera/city framing.

- Marches, Scouting, Rallies, “Last seen” and Chronicle remain readable. Check
  disabled actions, AP next/full timers, selection and hover hints. Hover a hint,
  navigate to another page, close it, move off controls, and switch city/world:
  stale descriptions must disappear. Verify every old screen/shortcut remains.
- Minimum/maximum zoom, all four edges/corners, H/home, survey focus, army/camp
  focus, middle-drag, keyboard pan and repeated city enter/exit: no blank world,
  gaps, jitter, misleading target picks or accidental world commands in the city.
- Select every building at several city rotations. Check active queues, locked
  institutions, level changes, district-list accessibility and existing inventory,
  training, commander and research interfaces.
- Fog: unknown vs remembered vs visible remain distinct. A discovered camp's
  stale health must not update remotely. Approach an empty remembered camp: stop
  once it becomes visible, without AP charge. Unknown camp IDs remain rejected.
- Reduced motion: no expanding shockwave/embers/lunges; confirmed shield still
  identifiable. Sound volume zero: silent, including cast release. Toggle both
  during a fight, zoom out and return, reconnect during shield/after victory:
  no replayed cast or reward. Test defeat/retreat separately using legitimate play.

## Measured performance pass

On a named CPU/GPU at each target resolution, record standalone build/frame time,
median and 95th-percentile CPU/GPU time, GC allocations, draw calls and visible
army count. Compare idle kingdom, city orbit/construction, one Scout battle and
multiple visible armies/skills. Check the eight-effect/32-particle cap in Profiler,
formation LOD, audio rate limits and returning/destroyed actor cleanup. Excess
spectacles must fall back to the cheap shield ring without losing status.

Run `powershell -ExecutionPolicy Bypass -File tools\validate-visual.ps1` with the
correct `-UnityEditor` path for headless compilation, new shader/texture/audio imports and camera contracts and a
pending acceptance CSV. Use `-SkipUnity` only when explicitly recording native
checks as pending. A headless pass does not mark rendering, input or FPS passed.
