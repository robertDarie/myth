# Visual quality phase: audit and execution plan

Baseline: main `686e917` (0.22); phase 1 implementation: 0.23. This is a visual
milestone, with no economy, progression, command, protocol or save-schema changes.
The audit uses the current Unity source and earlier gameplay screenshots in the
conversation. No new recording was attached to this request. At the 0.23 audit, Unity rendering and
a C# compiler were unavailable. The 0.26 delivery adds compiled pure-C# checks;
Unity rendering remains unavailable, so source findings and implementation are
not a claim of rendered acceptance.

## Audit: what matters most

| Area | Current implementation and evidence | Highest-impact next change |
| --- | --- | --- |
| World | `WorldView.Environment/Relief` already provide regional paint, roads, clustered original trees, ruins and shallow relief. Much of the perceived flatness also comes from repetitive props and long labels. `WorldArtFactory.Resource` used a round pedestal and small logs/spheres/cubes for every resource. | Make functional sites recognizable before adding more ground noise. Compose scenery around paths and silhouettes, then tune light and terrain using native captures. |
| Camera | `StrategyCamera` already computes the four ground-plane viewport corners, clamps current/desired views, handles resize and routes Focus/pan through one constraint path. `CameraFootprint.MaximumZoom` imposed a .01 minimum even when an extreme aspect needed less. Native geometry review was prepared but not run. | Remove that floor, add thin-window cases, run the native checker, then validate mouse/keyboard movement and ground picking in a real build. |
| UI | `PrototypeClient.Interface` remains IMGUI with many manual rectangles. All seven footer actions are always visible; numerous tabs use 12-point text before UI scaling. World labels were long dark strips, often including names, level, tier and status together. | Put short information at map scale and retain detail on intent. Reuse map plates, status badges and placement rules now; simplify global navigation in phase 3 without removing destinations. |
| City | `CityDiorama` already fits rendered bounds, lights a separate stage and renders live selection/status/scaffold feedback. Many institutions share the same small house silhouette; labels and badges still need native overlap review. | Improve institution silhouettes/culture accents and distribution of visual mass before adding more effects. Keep every existing level, queue and detail panel. |
| Troops | Original rigged units and eight clips exist. `SetWideView` previously kept the first soldier plus a mythic, losing mixed-class silhouettes; the caller used zoom >25, usually unreachable with the 0.22 fit limit. Fixed selection rings/colliders did not cover cavalry/mythics. | Use screen-size detail with hysteresis; preserve every represented class and commander. Fit rings/picking to actual displayed bounds and keep them aligned while turning. |
| Feel | Server-driven attacks, skill/hit effects, routes, dust, selection and reduced motion already exist. Gathering mostly relied on a pose/text state. | Add restrained work feedback from observed gathering state, not optimistic currency numbers. Later connect construction completion and accepted orders to distinct short cues. |

## Shared direction

Keep the existing stylized mythology palette: warm stone/bronze, deep blue-green
interface surfaces, gold for selection, teal for work/alliance-friendly feedback,
and red for threats. A resource's silhouette and icon must identify it without
relying only on color. Gold/ore veins, crops, cut stumps, trees and equipment are
original procedural forms or existing original assets. No reference-game artwork
is imported. Use a quiet map information layer, a strong selected object, and a
single contextual action layer. Respect the existing labels/effects/reduced-motion
preferences. Never infer enemies or create functional objects from static scenery.

## Phases and acceptance gates

### 1. Map readability and interaction — implemented; native acceptance pending

Changes:

- Five distinct worksite silhouettes: fenced crop rows, oak timber grove with stumps
  and logs, cut quarry, gold-veined ore and aether crystal outcrop.
- Four visible stock sections respond to authoritative remaining/capacity. Empty
  sites keep their foundation/equipment and picking root. Refilling restores stock.
  This is a coarse supply cue, not four independently harvestable resource objects.
  The current starter map spawns wood/gold/food; stone/aether presentation is ready
  and included in the native fixture, but adding those nodes is a balance/content
  change outside this milestone.
- Compact icon/value/name markers replace verbose default text. Hover/selection
  prioritizes full detail, with truncation tooltips and the existing contextual
  panel. Own marches receive placement priority. Stable ordering, bounded placement
  and HUD occlusion checks reduce competing plates; displaced detailed plates have
  a connector to their object. World labels still obey the existing toggle.
- Shared `MythInterfaceTheme.WorldMarker/WorldStatus` and `WorldLabelLayout`
  components define the map information hierarchy; no new UI framework is required.
- Screen-size troop detail with a 32/40 scaled-pixel hysteresis band replaces the
  unreachable fixed zoom threshold. Compact formations retain one infantry, archer,
  cavalry and mythic where present, plus the commander; inspect/select restores all
  existing proxies. Counts and combat composition remain server-owned.
- Rings and picking bounds fit initial visible art. Picking bounds follow visual
  rotation; they are not authoritative collision/pathfinding bounds. The footprint
  covers the whole formation even in compact view, avoiding selection-size popping.
- Gathering gets a static teal status bead and small resource-colored work particles
  only while the server reports gathering. No resource amounts/rewards are predicted;
  reduced motion/effects settings suppress particles while the status remains.
- Extreme-aspect camera zoom floor removed; native stress cases added.

Acceptance:

1. Identify food/wood/stone/gold/aether without reading site names at ordinary zoom.
   Deplete one, see an empty worksite, retain selection, and see stock after refill.
2. Hover/select each map category; obtain full information and every previous action.
   Selected/own army plates win collisions. No label draws over sampled HUD controls;
   plates stay on screen. Actual dense-scene captures must confirm the placement.
3. Select a mixed veteran formation with mythics. Its ring encloses the displayed
   units; picking works near outer units before and after a turn. At overview zoom,
   every present class remains represented, then full proxies return on inspection.
4. Gather, stop, recall and move. Work feedback follows observed state; no fabricated
   reward or repeated completion cue. Repeat with labels/effects/reduced motion off/on.
5. Existing camera tests pass, including thin aspect ratios, followed by native
   corner/edge input, resize and map picking checks. Server regressions stay green.

### 2. Composed world and living city — implemented 0.24; native acceptance pending

Refine regional scenery density and light/shadow contrast around the existing roads;
frame actual gates/shrines/strongholds with original decorative landmarks without
implying fake objectives. Review fog height/parallax and clear visual separation of
visible, remembered and unknown land. Keep server filtering and click plane intact.

Give academy, barracks, infirmary, forge, oracle and civic buildings distinct roof,
height and courtyard masses using existing culture palettes/assets. Make unbuilt
plots, prerequisites and active construction readable with shape as well as color.
Add a short completion highlight only after an observed level increase, with no
replay on reconnect. Keep detail and district-list alternatives.

Acceptance: comparable world/city captures at 720p/1080p/1440p; landmarks readable at
normal zoom; all institutions selectable through a full rotation; all level/queue
states correct; no overlap with controls or false hidden-object disclosure. City
remains sharp without unbounded render-target growth. Reduced motion stays static.

### 3. UI flow and consistent motion — implemented 0.25; native acceptance pending

Audit most common tasks (upgrade, train/promote, deploy/gather, research, inventory,
commander management and alliance actions). Consolidate repeated headings and move
secondary footer destinations into an accessible menu while retaining every route,
keyboard shortcut and pending-order recovery control. Standardize navigation rows,
primary/secondary buttons, empty/locked/loading states and tooltips in the existing
theme, migrating screens incrementally rather than rewriting functional systems.

Review readable physical text sizes and hit targets at 720p and all supported UI
scales. Use brief non-blocking fades/highlights for accepted orders, opening panels,
selection and construction. No forced camera shakes or reward spam. Reduced motion
uses immediate state changes. Preserve focus, scrolling, cancel/back and errors.

Acceptance: complete the common tasks with no clipped text, hidden action, accidental
world order beneath a panel or inaccessible disabled reason. Keyboard shortcuts,
retry/error flow and all existing interfaces work at 85/100/115% scale. New motion
never delays a command or obscures a battle; reduced motion retains static meaning.

### 4. Native acceptance and optimization — cloud work/tooling complete 0.26; native gate pending

Run Unity import/compile checks, camera/presentation contract menus, the full Windows
matrix below, matched captures and the existing 300-frame measurement. Profile dense
march/resource scenes and the city before setting the hardware-specific frame-time
budget. Reuse materials, bounded effects and stable screen-size transitions. Optimize
measured bottlenecks rather than rewriting server or client architecture.

Acceptance: no native exceptions/missing materials; all camera/input/UI/privacy
checks pass; no persistent allocation or render-target growth during repeated city
open/close, stock depletion/refill and march selection. Record hardware, resolution,
average/p95 frame time and draw calls; no unmeasured performance claim qualifies.

## Verification and playtest instructions

Phase 1 bundle **0.23.0**; protocol **14**, game save schema **13**, SQLite revision
**2**, unchanged. Pull main and rebuild the Windows playtest package. An old .exe
does not load the new scripts. Keep the existing server and save.

Cloud verification:

- Full server suite: **206 tests passed**, including saved games, privacy,
  construction, resource gathering and command validation.
- C# grammar parsing and multiple-`var` declarator scan; no syntax errors. This is
  not Unity compilation or behavioral validation.
- `git diff --check`.

Prepared native checks (not executed here):

1. Outside Play mode: **Thrones of Myth → Visual Review → Validate Camera Boundaries**.
   It now includes 16384×2 and 2×16384 geometry stress cases, in addition to the prior
   target-resolution, aspect, zoom, pan, Focus, resize and ground-picking checks.
2. In Play mode: **Thrones of Myth → Visual Review → Validate Map Readability (Play Mode)**.
   It instantiates isolated sites/formations away from gameplay, checks stock
   exhaustion/refill/clamping, depletion pickability, five cultures' imported mixed
   formations, role retention, rotated picking bounds, ring states and label layout
   at the target resolutions/scales, then disposes its objects. It does not issue
   commands or modify saves. Imported-model failures are failures, not silent passes.
3. Reports go to `work/native-visual-review/camera-boundaries.json` and
   `map-readability.json`. These are contract checks, not rendered acceptance.

Windows matrix: 1280×720, 1920×1080, 2560×1440, each at 85/100/115% UI scale; repeat
representative world/city/interface checks in 4:3 and 21:9. At min/max zoom, pan all
edges/corners with keyboard and dragging, resize, focus boundary armies/cities/sites,
then select and issue a ground order. Inspect a dense group of resource/camp labels,
all five resource stock states, mixed formations turning and gathering, fog discovery,
and the existing city, formation, inventory, commanders, research and alliance views.
Toggle labels, effects and reduced motion. Compare before/after with **Art Review →
Capture Current Game View**; record **Art Review → Measure 300 Game Frames** on the
same hardware. Use the broader [0.22 Windows checklist](visual-camera-0.22.md) too.

Remaining: native compilation, execution of both native checkers, visual captures,
real input/picking acceptance, dense-scene label/selection overlap review and
performance measurement. Phases 2–3 are implemented and phase 4 cloud verification/tooling is complete. Native acceptance remains pending; see [the combined delivery](visual-quality-delivery-0.26.md).
