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
