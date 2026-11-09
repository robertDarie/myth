# v0.34.0 — Interface, first session and Linux delivery

Based on v0.33 `e6cda3f`. Implemented changes, **not native visual acceptance**.

## Player-facing changes

- Resource chips retain exact stockpiles, with clearer ordinary/premium resource
  hints. AP has a dedicated gauge, next/full timers and active-oath badges. A
  short bounded countdown interpolates display only; AP points stay server-owned.
- Wider march cards fit commander/status labels. Cards and minimap no longer
  intersect at the supported logical sizes; home cards open formation editing
  directly. Deployed cards focus the actual march at a useful constrained zoom.
- Shared buttons support wrapping where height permits, adaptive tabs replace
  dense inventory/report/campaign selectors, and screen-scoped fresh tooltips
  remain. Headers, layout and world-input hit bounds include the energy ribbon.
- Inventory uses stack list / selected-item detail, retains every category, job
  selector, quantity control and command, and explains disabled use conditions.
  Filtering is cached per bag snapshot/category; no parallel inventory system.
- Reports use selectable title/outcome/time cards. New real PvE reports and cargo
  deliveries produce exact recorded resource summaries, guarded against historic
  replay. Report viewing grants nothing.
- Commander detail separates Skills from Development; mentoring, stars and
  ascension remain accessible. Research puts its active lane before the next
  choice. Campaign chapters use adaptive tabs; daily explanations are shorter.
  Shared controls also improve existing training, building and alliance screens.
- Minimap is square, shows unknown/remembered/current-vision colors from the
  existing fog grid, and marks camera focus. Unknown-area navigation explains
  scouting and Home. Programmatic focus retains close zoom and caps distant
  overview zoom at 12; existing viewport-footprint constraints remain.
- Optional first-session flow includes the Captain panel before training. A new
  guest profile can open directly in its city once per local profile; resuming an
  existing session does not auto-open a new introduction. City context includes
  the optional next-step link. The existing campaign ledger/rewards are unchanged.
- Guest players can return to profile selection without deleting their city or
  stored resume token. Pending orders block switching. Protected accounts retain
  their existing sign-out flow.

## Linux and version identity

`ReleaseVersion` is the single client version/protocol source. Both native package
builders bake version, source commit, source-dirty flag and Unity version into the
player and write an external payload-hash manifest. The client entry screen and
Settings expose that identity. Windows still bundles its runtime; Linux requires
host Node.js 24+ and bundles its matching server source.

Linux's new Unity builder targets StandaloneLinux64/Mono, reuses the scene/art
validation, includes all production server modules and launcher sources, and
creates a complete ZIP. The Node launcher verifies hashes/path safety, prevents
parallel local launches, refuses an occupied port rather than reusing another
server, starts its owned server, forwards the exact address to Unity, and requests
an authenticated final save/shutdown. A port option supports a separate test world.
Locks are not silently removed after crashes. Saves live outside generated builds.

The only server configuration change is an optional local-playtest port override;
Windows's default remains 8080. Protocol 16/schema 15, combat, migration, economy,
commander acquisition, report rewards and movement are retained.

## Verification

- Full server suite: **263 passed** (257 prior + six Linux package/launcher tests).
  Covers package graph, tampering/traversal/symlinks, real server with a client
  stub, successful/failing client cleanup, occupied-server protection and SIGTERM.
- Portable C# contracts: **16,241 assertions passed**, including responsive layout
  across 1200×720, 1280×720, 1366×768, 1600×900, 1920×1080, 2560×1440,
  2560×1080, 1024×768 and UI scales 85/100/115%; exact reward summaries; the
  updated optional introduction; existing city, combat and migration DTO contracts.
- Source/import hygiene: **79 C# / 3 PowerShell files, zero issues**. Linux shell
  and Node source syntax checks passed. New procedural generators compile/run.
- **Not run:** Unity full-project compilation, native headless import/camera checks,
  Linux player build, rendered fonts/layout/art/shaders, native animation/audio/input
  and FPS. No Unity Editor is installed here. The client stub is not a game build.

No new downloaded assets/dependencies. New UI uses existing original frames,
portraits and palette; v0.32 geometry/texture and v0.33 audio provenance is documented
in their release notes. Some legacy panels and assets remain; this is not a claim
that every screen/animation now meets production quality.

See [Linux build and recording procedure](playtest-linux-0.34.md) and
[consolidated batch delivery](visual-batch-0.32-0.34.md).
