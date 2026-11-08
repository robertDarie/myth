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
