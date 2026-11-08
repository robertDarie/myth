# Visual foundation and reference adaptation 0.19

This starts R0 of the [complete adaptation plan](reference-adaptation-plan.md),
using the user's 679-record workbook and the supplied Windows screenshots.
It is a client presentation pass, not the implementation of all workbook systems.
Protocol 13, game save schema 11 and SQLite schema 1 remain unchanged.

## Changes

- UI line/diamond geometry composes local transforms with the existing GUI scale,
  instead of rotating pivots through an already scaled matrix. This targets the
  gold strokes/diamonds appearing away from their icons in the screenshots.
- Compact primary buttons have appropriate padding/font size. Buttons do not
  automatically wrap a single action into multiple lines; explicit multiline
  actions such as Enter City retain their intended line breaks.
- Resource headings, march names and bottom navigation use single-line labels;
  overlong strings truncate with a tooltip instead of wrapping outside their box.
- Thin health/rage/job bars use a simple track/fill. They no longer draw a full
  rounded panel border/shadow around a three-pixel bar.
- World labels prioritize the selected object, cities and armies before resources.
  They measure their content, try alternate vertical positions, respect HUD
  exclusion and suppress unresolved collisions. Combat captions remain separate.
- The world Veil interpolates opacity on a continuous vertex grid. Source discovery
  and current sight remain the server's exact 20×20 sectors. It updates colors
  only when sector state changes; no additional hidden targets are requested or
  revealed by the client. One mesh has 25,921 vertices/51,200 triangles: check its
  actual device cost before increasing that presentation resolution.
- The city uses stable functional district positions, a central plaza, radial
  paths, planted civic spaces, a fountain and a decorative open-gate perimeter.
  These are cosmetic, not city-wall defenses, building placement or navigation.
- Unbuilt institutions are restrained pegged plots instead of raised grey slabs.
  The District list continues to expose all institutions and their prerequisites.
- Default city labels focus on selected/working districts. A District names
  toggle shows additional labels with collision suppression. Live timers and
  scaffold visibility still come from actual server jobs.
- The isolated city viewport uses a 1024×640 target and sets camera aspect to its
  displayed image rectangle, reducing geometry distortion on resized windows.
  Rendering remains capped at 20 Hz. Cities and units are still early assets.

No server gameplay, resource costs, rarity odds, combat balance, march counts,
construction entitlements or season rules change in this release.

## Native review still required

This environment has Blender but no Unity Editor or Windows graphics runtime.
Source parsing and server regressions do not prove native compilation/rendering.
No rendered “after” screenshot is claimed here.

Pull main and Git LFS assets, open `client`, allow package import/recompile, then:

1. Run **Thrones of Myth → Art Review → Validate Imported Assets**.
2. Enter the existing prototype scene/Play mode. Test 1280×720, 1920×1080 and
   2560×1440 at interface scale 0.85, 1.0 and 1.15. Include a shorter window.
3. Inspect top resource icons, frame trim, Daily Claim and bottom Commanders.
   Check long names, hover tooltips, disabled controls and all navigation targets.
4. Select a march beside a resource/city; labels should prioritize selection and
   avoid each other/HUD. Zoom out and back in; confirm hit selection still works.
5. Scout a frontier and reconnect: the visual fog edge should be gradual while
   hidden entities remain absent until authorized. Minimap sectors remain discrete.
6. Enter City, rotate, select every institution and use the district list. Toggle
   names, start a building/research/training job and inspect its actual progress.
   Resize the window and ensure the city projection/click location still agrees.
7. Enable reduced motion; patrol motion should stop, controls remain functional.
8. Capture **Current Game View** and **Measure 300 Game Frames** from Art Review.
   Compare draw calls, p95 frame time and memory with 0.18, then build/run Windows.

Do not mark R0 complete until native screenshots and performance results have
been reviewed. Further Greek building, terrain and army art production follows
that checkpoint, using the [art production order](reference-adaptation-plan.md).

Cloud verification: all **171 server regression tests passed**; 37 C# files parse
and contain no multiple-declarator `var` statements. The adaptation register has
679 unique IDs, 14 epics, Excel/CSV parity and the complete 50-entry source registry.
Native Unity compilation, visual acceptance and Windows frame measurements remain
pending; no source-only check substitutes for those results.
