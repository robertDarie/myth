# Visual quality phases 2–4 delivery

Continues [the 0.23 roadmap](visual-quality-plan-0.23.md). Gameplay, protocol 14,
save schema 13 and SQLite revision 2 remain unchanged. Rendering/input/FPS claims
require Unity/Windows results; no Unity Editor or renderer is installed here.

## Phase 2 — 0.24.0

- Road shoulders/rut shading, denser northern forests and more open dry southern
  scenery, low meadow tufts, warmer direct light/cooler ambient and stronger shadows.
- Paved approaches and short columns belong to received site objects, so they do
  not independently spawn or reveal server-hidden objectives.
- Unknown fog is opaque slate; remembered territory uses a lighter desaturated veil.
  Sector discovery, server filtering and the logical picking/movement plane stay intact.
- Academy colonnade, barracks training yard, healing courtyard and forge/anvil/chimney
  have different silhouettes. Culture roof details distinguish flat Egyptian,
  timber Norse, East Asian eaves and Greek ridge treatments. Existing original
  citadel/oracle assets remain. Higher building levels add trim, buttresses and finials.
- Foundations have availability seals, active jobs retain scaffolds, and building
  picking fits the expanded geometry. Exact prerequisites remain server-provided.
- A confirmed one-level increase after observed work gets a brief completion label
  and ring highlight. No celebration on initial load, profile switch, failed poll,
  downtime, canceled work or explicit reconnect. Reduced motion uses a static highlight.

Verification before phase 3: 206 server tests pass; 10 compiled production-C#
completion-state contracts pass using a local .NET 8 SDK. C# syntax parsing and
`git diff --check` pass. Native institution geometry checks were added to the
existing Play-mode presentation review; native execution/rendering remains pending.

## Phase 3 — 0.25.0

- Five primary footer actions replace seven competing cards. The grouped kingdom
  menu preserves all 23 pre-existing non-world destinations; related sidebars now
  show their group instead of an unrelated 17-item list. Formation navigation goes
  through existing commander/troop preparation, not an uninitialized form.
- Every prior keyboard shortcut remains. A Menu button on detail windows and the
  existing Escape/close action retain an obvious way out; world UI remains blocked
  beneath windows. Account, inventory, temple, chat, reports and recovery actions
  remain accessible through the menu.
- Shared navigation rows, physical font-size floors, restrained selected states,
  truncation tooltips and readable compact-button padding use the existing theme.
- Upgrade/research/training/promotion/ascension actions share a component that shows
  resource, prerequisite, capacity, busy or pending-confirmation reasons. Training
  starts with the reserve → prepare → field flow; gathering keeps its contextual
  command and adds a short route hint. No costs or eligibility rules were changed.
- Short non-blocking content fades and notice accents distinguish confirmed orders,
  rejected actions, persistence errors and unconfirmed-order retries. They do not
  wait before accepting input and do not claim success before the server response.
  Reduced motion skips the new fades/accent animation.

Verification before phase 4: 206 server tests and 126 production-C# contract checks
pass (completion sequences, unique/reachable menu destinations and text-size floors).
All 51 client/editor C# files parse; whitespace checks pass. Actual fonts, clipping,
control hit targets, every screen's layout and transitions still need native review.

## Phase 4 — 0.26.0

Completed cloud verification and native tooling; rendered acceptance remains open.

### Measured and structural optimizations

The portable contracts compile the production DTOs and presentation helpers with
.NET 8. A synthetic 180-character label with a 22-character width was fitted
10,000 times using a deterministic monospace measuring function. The retained
[measurement](validation/presentation-clr-0.26.json) records:

| Path | Legacy allocated bytes | Revised allocated bytes |
| --- | ---: | ---: |
| Text elision, 10,000 operations | 723,280,040 | 15,280,040 |
| City work lookup, 10,000 operations | 400,040 | 40 |

Binary-search text elision replaces shrinking strings one character at a time;
city work lookup no longer creates a two-element array per request. This is CLR
allocation/time evidence for these helpers, **not Unity GUI font measurement,
rendering, input, Mono allocation profiling or FPS evidence**. Timings are a single
local microbenchmark sample and are not a game performance guarantee.

Further source-backed work: immutable clearing positions are cached; a painted
terrain pixel reuses its road distance rather than querying it three times; fog
uses reusable sector/color/cloud buffers and skips unchanged visibility; city art
signatures are checked once per snapshot instead of every OnGUI event; label-order
storage and guard component references are reused. These remove repeated work by
construction; their native frame-time impact has not been measured.

Phase 1 worksites, mixed-role detail, selection/picking, labels and gathering remain
intact. No server or DTO source changed across phases 2–4. Protocol 14, save schema
13 and SQLite revision 2 are unchanged. No reset or migration is required.

### Final executed checks

- **206/206 server tests pass** after each phase, including save migration, privacy,
  queues, gathering, combat and authoritative commands.
- **146 production-C# presentation checks pass**: live completion/no replay,
  destination coverage, physical font floors, text fitting/surrogate boundaries,
  queue precedence and visible/remembered/unknown fog transitions/reset.
- **56 C# files and 3 PowerShell scripts** pass grammar/static hygiene checks:
  syntax, multiple-var declarators, runtime/Editor separation, script meta GUIDs,
  and absence of Git LFS pointers in FBX assets. `git diff --check` passes.
- SDK: user-local .NET 8.0.427, runtime 8.0.33. This compiles the pure presentation
  sources only; the complete Unity application has not been compiled here.

Reproduce the portable checks from repository root with a .NET 8 SDK:

```powershell
dotnet run --project tests/PresentationContracts -c Release
npm --prefix server test
```

Static parser dependencies are `tree-sitter==0.26.0`,
`tree-sitter-c-sharp==0.23.5`, `tree-sitter-powershell==0.26.4`; then run
`python tools/check-visual-sources.py`. They are developer-only dependencies, not
part of the game package.

## Windows rebuild and acceptance

1. Pull main. Open `client` with Unity 6000.3.0f1 and let scripts/assets compile.
   Keep the same server save. Use the existing **Thrones of Myth** Windows build
   menu to regenerate bundle **0.26.0**. Existing executables retain old visuals.
2. For scripted tests, close the Editor and run from repository root:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File tools/validate-visual.ps1
   ```

   Supply `-UnityEditor 'C:\path\to\Unity.exe'` for a different installation.
   `-SkipUnity` explicitly leaves native checks pending. The script runs server
   tests, runs portable contracts if a .NET SDK is available, then launches Unity
   batch-mode compilation/camera/import/menu-coverage checks. It verifies fresh
   successful JSON reports and creates a 120-row resolution/scale/scenario CSV at
   `work/native-visual-review/acceptance-matrix.csv` without overwriting filled rows.
   It does not mark rendering, input or performance passed.
3. Alternatively, outside Play mode run **Visual Review → Run Headless Contracts**
   in Unity. In Play mode, run **Visual Review → Validate Map Readability (Play Mode)**
   for worksite, mixed-unit, rotated picking, label and culture-institution contracts.
   Native reports live in `work/native-visual-review`; import/capture reports in
   `work/native-art-review`.
4. Rebuild and launch normally through **Start Thrones of Myth.cmd**. Test
   1280×720, 1920×1080, 2560×1440 at 85/100/115% UI scale, plus representative 4:3
   and 21:9 cases. The CSV and [roadmap gates](visual-quality-plan-0.23.md) cover
   world edges, minimum/maximum zoom, corner focus/selection/orders, fog privacy,
   all menu screens, reserve/training/research flows, city rotation/state/queues,
   confirmed upgrade completion, failed/retried orders and reduced motion.
5. **Art Review → Capture Current Game View** now writes unique timestamped PNGs.
   Capture matching world/city/menu/training/commander/inventory cases at each
   target resolution/scale. **Art Review → Measure 300 Game Frames** records
   Editor frame intervals, draw calls, hardware, vsync/cap and heap endpoints.
   Keep Game View resolution fixed. Editor measurements are not standalone results.
6. For actual packaged-player timings, launch from the extracted package folder:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Launcher.ps1 -ProfileVisuals
   ```

   This uses the ordinary launcher/server workflow and adds an opt-in recorder.
   Press **F8** in a stable scene to record 600 focused frames; F8 again ends early.
   Repeat for dense world marches, gathering and city views on the same hardware.
   Reports are written under
   `%USERPROFILE%\AppData\LocalLow\ThronesOfMyth\Thrones of Myth\VisualReview`.
   The exact path is logged in Player.log. Reports include average/p95/max frame
   interval, hardware, resolution/UI scale, vsync/cap, GC count and heap endpoints.
   `mixedPages`/`configurationChanged` identify non-comparable cases. These are
   frame intervals, not isolated CPU/GPU timings or proof of a leak. Normal launches
   do not create a recorder or assign F8.

## Known limitations / pending acceptance

Unity Editor/runtime are not installed in the cloud. **Native Unity compilation,
all native review commands, rendering/screenshots, real picking/input, Windows
PowerShell execution, and Editor/standalone frame measurements are pending.**
The absence of automated failures does not establish visual success.

Review fog-plane parallax at kingdom edges, new institution bounds through rotation,
completion label/badge overlap, long localized names, 720p text/control sizes,
notice wrapping, all secondary-menu routes, and retained retry/error controls.
Camera geometry stress cases include portrait/extreme thin windows; the full UI
is not claimed to support those extreme layouts. Static regions/scenery remain
for the current 80×80 kingdom. Larger maps and new economy content are out of scope.

There is no measured native performance budget yet. Heap endpoints alone cannot
establish a leak, and the CLR helper measurements do not predict Unity FPS. Final
art direction, color grading, asset detail and motion timing can be assessed only
from the combined Windows capture. These are acceptance tasks, not a requirement
to add more gameplay before reviewing this milestone.
