# v0.30.0 — Seamless kingdom-to-city experience

This is a client presentation milestone. **Protocol 16, world schema 15 and the
v0.29 economy are unchanged.** No building definitions, prerequisites, queue
rules, balances, AP rules, server authority or saved gameplay state change.

## What can be played

- Click your own kingdom city or press **C** to enter. The constrained kingdom
  camera approaches your city while a smooth 0.75-second presentation blend brings
  in the detailed city. City ambience follows the same blend and existing sound
  preferences. Reduced motion enters/exits immediately.
- The existing culture-specific city now occupies the main gameplay viewport,
  rather than an inset inside the management modal. A compact right-hand building
  context keeps most of the viewport available for the city. Landscaped
  hinterland, an approach road and existing original scenery replace the empty
  diorama surround. All five architectural identities remain in use.
- Click buildings to select their existing marker/collider, highlight them and
  inspect their real level, prerequisites, cost and upgrade state. Construct or
  upgrade directly from the context panel. Existing scaffolds, queue states,
  available-upgrade rings and server-confirmed completion feedback remain active.
- Rotate with **Q/E** or the rotation controls; scroll or use **+/−** to zoom.
  **Home / Fit** restores the overview. Zoom is bounded to 1–1.45 times the fitted
  view; there is no unbounded city pan. Zoomed framing gently favors the selected
  district, with its center displacement bounded to 3.2 city units.
- **Tab / Shift+Tab** selects all sixteen districts in order, including locked
  foundations. Mouse selection and keyboard selection share the same building IDs.
- Contextual institution actions open existing Temple, research, training,
  hospital, forge, market, inventory and alliance screens. Closing those screens
  returns to the city. Their **Kingdom** control leaves it directly.
- Construction crew usage, both construction jobs and the active training queue
  remain visible in the context. Queue links select the corresponding district
  or open training. Research is distinguished from construction, so a research
  job does not incorrectly hide an otherwise permitted institution upgrade.
- **District list** retains the existing accessible management alternative,
  including every building and its controls. Closing it returns to the 3D city;
  **C** or the return control exits to the kingdom. Existing navigation and world
  shortcuts remain available in their appropriate contexts.
- **Return to kingdom / C / Esc** reverses the blend and restores the previously
  viewed kingdom focus and zoom, constrained against current viewport/map bounds.
  Enter/exit can be interrupted and reversed. Explicit map-target flows instead
  keep their requested destination when leaving a city institution screen.

## Input, rendering and state

`CityExperienceState` is transient session presentation, not a saved city state or
another gameplay system. World camera input, map raycasts, field shortcuts and
world labels are gated from the moment entry begins until exit finishes. A
pointer over the city cannot leak a right-click movement/attack/scout/beacon order
onto the underlying kingdom. Already accepted orders and server simulation keep
running. Text fields in institution screens retain their input behavior.

The city geometry is prepared during initial kingdom loading and retained for
entry. The original city renderer, model factories, culture geometry, building bounds,
status rings and construction feedback are reused. City camera projection only
changes on repaint, matching the rendered image used for mouse picking. Building
colliders stay in the isolated city layer; scene picking synchronizes physics at
most once per frame. Camera rotation or zoom invalidates the render when needed.

Render targets follow current viewport/UI density, quantized to 16 pixels and
bounded to 2560×1440. They are retained across entry/exit and reallocated only
when their required size changes, not every frame. Idle city rendering is capped
at 30 renders/second, with immediate refresh during camera/framing changes.
Kingdom camera scene layers are culled while the fully opaque city is displayed;
the original culling mask returns at the start of exit or account/loading reset.
The main camera object stays enabled for existing world systems.

The renderer's zoom and camera-center movement are bounded, and the kingdom camera
continues using its existing viewport-footprint constraints throughout approach
and return. Resizing refits the city and constrains the restored kingdom view.
Terrain, building and queue data remain authoritative snapshots. No level,
completion, reward, health or balance is optimistically changed for animation.

## Verification

See [automated results](validation/city-experience-0.30.md) and the
[Windows acceptance checklist](playtest-city-0.30.md). Portable contracts verify
transition reversals, reduced motion, input policy, bounded zoom/rotation/render
sizes, ID selection, institution routing and gameplay data preservation. They do
not execute Unity raycasts, render frames, synthesize native input or measure FPS.

The first Windows pass must check actual city framing, all buildings through
rotation, the fade/camera pairing, selection at close zoom and narrow UI layouts.
No native rendering, performance or visual-quality pass is claimed from source
inspection or portable tests.
