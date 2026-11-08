# Visual gameplay and camera pass 0.22

Implemented client presentation changes; native visual acceptance is **pending**.
No Unity Editor, Unity renderer or C# compiler is installed in the cloud workspace.
Source parsing is not a Unity compile or evidence of visual success.

## Playable changes

- World camera intersects all four viewport rays with the logical ground plane.
  Its focus range includes that footprint, rather than merely clamping the focus
  inside the kingdom. Bounds come from the authoritative snapshot's map size.
- Maximum zoom fits the kingdom at the current camera angle and viewport aspect.
  Extreme aspect ratios can reduce the usual minimum zoom too. Ordinary play never
  intentionally uses an empty-background overview. Resolution/aspect changes clamp
  immediately; movement and requested zoom otherwise use exponential smoothing.
- Keyboard movement, middle-mouse ground dragging, minimap clicks, home/army keys
  and programmatic Focus share the same constraint path. Desired focus is clamped
  at requested zoom, preserving boundary targets during a zoom-in transition.
- Four regional terrain palettes, shallow cosmetic ground relief, dry earth
  variation, existing forests plus scattered stone, ruined-column landmarks and an
  interior stone rim give the current 80×80 kingdom more composition. Scenery is
  batched; the relief mesh uses 16,641 vertices. Clearings and the map edge stay flat.
- Unexplored land retains the existing opaque veil, with restrained cloud tint;
  previously explored land keeps its dimmed veil. Visibility arrays, opacity and
  server filtering are unchanged. Static scenery does not instantiate hidden armies,
  resources or objectives. Outside-kingdom space is excluded by the camera, not
  presented as another kind of unexplored territory.
- Shorter resource/profile bar, compact quest and live-work rows, five-slot march
  rail, smaller contextual card/minimap and single-line bottom navigation free more
  world space. All previous pages/actions remain reachable. Truncated labels retain
  full tooltips; tooltip delay avoids immediate popups. HUD input blocking uses the
  revised rectangles. Notifications retain order-retry and persistence/error states.
- The city fits its visible buildings and circular grounds to available aspect and
  rotation; its render target follows UI pixel density within a bounded budget.
  Warm key/cool fill lighting, selected/hovered district rings, state badges and
  selected/working/hover labels distinguish construction, available upgrades and
  unbuildable foundations. Exact lock reasons remain in the detail panel/tooltips.
  Academy, healing courtyard and vault have additional original silhouette details.
- World objects get a thin hover ring, with a stronger selected ring. City cranes
  have restrained idle motion. Reduced-motion mode stops crane sway, preserves
  static state feedback and uses immediate camera transitions. Existing troop and
  battle-animation settings remain in effect.

Logical Ground collider, movement heights, picking plane, server rules, building
levels, costs, queues and object ownership are preserved. Relief is cosmetic and
shallow; this is not a new height-based navigation system. The current environment
and exploration grid remain authored for the existing 80×80 kingdom.

## Automated checks available here

- Full server regression suite: **206/206 passed**, including migration, exploration
  privacy, economy, construction, combat and authoritative command validation.
- All **43 C# files** parsed with the C# tree-sitter grammar, including a scan for
  multiple implicitly typed declarators; no syntax issues. Not a compiler check.
- `git diff --check`.

## Native geometry check (not executed in the cloud)

After pulling main, open `client` in Unity 6000.3.0f1, allow compilation and stop
Play mode. Run **Thrones of Myth → Visual Review → Validate Camera Boundaries**.
It creates and destroys an isolated camera, calls the production controller and
uses Unity's actual viewport rays. It checks:

- 1280×720, 1920×1080, 2560×1440, 1024×768, 2560×1080, 3840×1080 and portrait 720×1280.
- Minimum, intermediate and deliberately excessive requested zoom.
- Four corners, four edge midpoints, center and out-of-bounds focus requests.
- Large pans and public Focus calls, continuous zoom-in frames and a live wide resize.
- Non-origin/smaller map rectangles and helper footprints at multiple pitches/yaws.
- Ground-ray/viewport round trips and whether legal boundary targets stay in view.

Results: `work/native-visual-review/camera-boundaries.json`. Failure throws an error
and records details. A green report validates geometry, not scene appearance,
keyboard/mouse input, HUD layout, renderer performance or a Windows executable.

## Windows acceptance matrix

Rebuild through the existing Windows playtest menu; an old executable will not
pick up these changes. Use the same local server/save. Bundle **0.22.0**, protocol
**14**, game save schema **13**, SQLite revision **2**. No migration/reset required.

At **each** 1280×720, 1920×1080 and 2560×1440, test UI scales **85%, 100%, 115%**:

1. In the world, move to every edge/corner using WASD/arrows and middle drag at both
   zoom limits. Hold against an edge, reverse direction, scroll continuously and
   resize while moving. No blank background, jitter or sticking should occur.
2. Focus home, an army and a site near boundaries using H, Space, march list,
   minimap and contextual actions. Confirm visible targets, then select a resource
   or army and right-click a ground destination. The clicked location/order must
   match the ground under the pointer after movement and zoom.
3. Inspect unexplored, explored but out-of-sight and visible land; move a scout.
   Confirm veil state changes normally and hidden enemy objects are not rendered.
4. Expand/collapse activity; use quest Go/Claim, all five march slots, all resource
   shortcuts, all seven bottom buttons, context actions, tooltips and Settings.
   Read long names, disabled actions, max values, long notifications and retry
   warnings. Confirm UI clicks never issue ground orders underneath.
5. Enter city, rotate through a full turn, hover/select all institutions, toggle
   district names/list, start an upgrade and finish it (or use an earned speedup).
   Verify correct building details, state badge, scaffold, queue and new level.
   Check an unbuildable foundation, affordable upgrade and max-level building.
6. Open inventory, commanders, formation, research, temple, alliance, chat, reports,
   account and settings; scroll and close them. Existing controls must remain usable.
7. Repeat movement, hover, construction and city rotation with reduced motion on.
   No crane sway; selection/status information must remain clear.

Also repeat representative cases in 4:3 and 21:9 windowed layouts. Portrait/32:9
camera geometry is included in the utility; these are stress cases, not a claim
that every existing interface is designed for portrait or extreme ultrawide UI.

Capture comparable world/city/interface screenshots with **Art Review → Capture
Current Game View** and measure **Art Review → Measure 300 Game Frames**.
Record draw calls/frame time and native build results. Particular risks to review
are veil parallax near borders, terrain/scenery readability, city badge/label
occlusion, small text at 720p and the cost of added scenery/fill lighting.

Still incomplete: native compilation, running the geometry utility, rendered
screenshots, full Windows input/layout testing and standalone performance results.
This milestone does not replace every low-poly model or create final production art.
