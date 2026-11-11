# Visual overhaul: audit, implemented slices and native gate

Date: 2026-11-11. This is an integration branch, **not a new numbered release**.

- Branch: `feature/visual-overhaul`, separate worktree `/workspace/myth-visual`.
- Exact starting `origin/main`: `75b3f01b58db80549fdb4914e2c246820ef20691`.
- Main was not edited or merged. Server files, server tests, DTOs, economy, persistence, protocol and release identity are unchanged.
- Evidence: the supplied v0.45 Linux findings, source inspection, portable C# execution, existing server tests and Blender round trips. Unity 6000.3.0f1 is **not installed in this environment**. There are no new Unity screenshots, native compile results or FPS measurements.
- Scope delivered: two critical rendering candidates, targeted UI corrections, and a bounded world/city composition slice. The entire requested visual transformation is **not complete**. In particular, black vegetation is not yet proven fixed. Native P0 verification gates further cosmetic work.

## Severity-ranked audit

“Reported” means observed in the supplied Linux playtest; “source” is not rendered evidence.

| Severity | Finding and evidence | Implementation / remaining acceptance |
|---|---|---|
| P0 | Black vegetation, reported at 1280×800. Standard foliage materials depend on runtime lighting/SH, shadows and a shared brush texture. | Isolated canopy shader with explicit hemisphere pigment illumination and shadowed directional light. Original shader available for comparison. Root cause remains unconfirmed on native Linux. |
| P0 | Silhouettes through unknown terrain, reported. Old veil used interpolated vertex opacity, normal depth testing, and an elevated plane. These permit translucent cell edges, geometry depth holes and parallax. | Ground-registered, point-sampled explored mask; fully opaque unknown sectors drawn after world geometry with depth testing disabled. Explored fragments are discarded. Native boundary/height tests pending. |
| P0 | “Last seen” labels conflict with desired static-object experience. Source still contains stale snapshots with `lastKnown` and `observedAt`. | Retained qualifiers rather than misrepresent stale stock/HP as live. Proposed gameplay-agent contract below. Reconnaissance remains separate. |
| P1 | Plain province dividers and repetitive rock silhouettes; source. | Replaced separated divider rocks with layered, tapered escarpments using existing shared sculpt meshes. Existing four corridor openings retained. No added gameplay barriers. |
| P1 | Terrain is still a shallow procedural surface with few authored focal areas. | Existing regional paint, clearings, roads, relief, imported oak canopies and worksite props retained. Large-scale terrain/forest composition still needs native art review. No invented traversable river or blocked route. |
| P1 | Non-Greek city hinterlands lack Greek residential detail; source. Generic house shapes reused for several institutions. | Four residential courts for each non-Greek city; longhouses, flat-roof courtyards, tiled pavilion wings and timber screens. Four distinct institution forms across all cultures. Native selection/overlap review pending. |
| P1 | Formation labels clipped and columns waste width; reported/source. | Responsive roster width; troop titles on their own line; separate quantities; larger row height; ellipsis with complete tooltip; commander roster text and selected totals adapted. |
| P1 | Discovery journal after up to 20 survey reports; reported/source. | Fixed Scouts / Discovery journal / Survey reports tabs above the scroll area. All controls and report detail retained. Scroll resets on section change. |
| P1 | Research fallback grid cells overlap authored cells: `veilreading` falls onto an existing technology. Source-confirmed. | Stable distinct cell for veil reading, unique overflow cells for future technologies, computed scroll height, and an empty/loading state. Tests cover collision prevention. |
| P2 | Troop count, scale and spectacle still feel basic; reported. | Existing 36 weighted unit models, 8 poses each, type/tier equipment, formation transitions, confirmation cues and bounded VFX retained. No new animation or combat behavior in this batch. Needs measured multi-army review. |
| P2 | Commander art/detail and ability readability need cohesive review. | Existing portraits, model previews, skill profiles and Rallying Cry pool retained. Inspect all 11 commanders in native light and at distant zoom before modifying casts or audio. |
| P2 | Fixed-panel density varies between major screens; source. | Specific fixes above only. Broad panel redesign remains incomplete; screen coverage audit follows. |
| P3 | Environmental atmosphere is basic. | Existing ambience and reduced-motion settings retained. Additional animation, water, drifting vegetation and effects deferred until P0 acceptance. |

## Rendering investigation

`tools/inspect_vegetation.py` imports each existing tree FBX into Blender and checks finite normals, normal length, positive transform determinant, manifold connected shells and positive signed volume **per shell**. This prevents a correctly wound trunk from hiding an inverted canopy in an aggregate volume check.

| Model | Closed outward shells | Minimum signed volume |
|---|---:|---:|
| RealmOak1 | 12 | 0.0098124 |
| RealmOak2 | 12 | 0.0106684 |
| OakTree | 4 | 0.0621405 |
| PineTree | 4 | 0.0621405 |

These results narrow the search: no inverted imported shell or mirrored transform was found. They do not verify Unity's imported GPU buffers, runtime normals after batching, ambient probe, shader variants or driver. The existing shared brush texture was also inspected: its RGB range is 216–244, so it is not an all-black source image.

The new `ThronesOfMyth/Vegetation` shader applies only to canopy material roles and procedural pine/crown meshes. It uses no UV texture, vertex color, metallic response or runtime spherical-harmonic probe. It keeps directional shading, shadow reception and a shadow-caster pass. Trunks, stone, buildings, global exposure and scene lighting are unchanged. This is a targeted compatibility candidate, **not evidence that SH or shadows caused the reported defect**.

Use the four native comparison runs in the acceptance guide. If custom canopies are still black, inspect actual material binding, missing shaders, batching transforms and graphics backend before changing pigment/exposure. If only Standard canopies fail, compare ambient probe and shader variants. If disabling shadows alone cures the defect, isolate the relevant shadow pass and GPU backend.

The veil now has four vertices instead of a 161×161 grid, with one persistent 20×20 point-filtered mask. Only changes to the authoritative explored set upload mask/minimap pixels. Missing exploration data conceals all sectors. The minimap uses the same two-state mapping. It does not infer visibility, create entities or request private data. Hard sector edges are intentional for complete concealment; softer-looking edges must never restore transparency over unknown cells.

## Screen-by-screen source coverage

This is a source-level audit and native test inventory, not a claim that each screen passed at every resolution.

| Screens | Existing structure / risk to review |
|---|---|
| Login, account/recovery, civilization selection | Scrollable account entry; civilization selector uses a fixed three-column grid. Check five names, validation errors, keyboard focus and long server messages. No change in this batch. |
| Kingdom HUD, marches, map context | Existing compact resource strip, fixed march rail and contextual panel. Layout math passes; physical text size, tooltip position, overlapping labels and 5 active marches need native acceptance. |
| City HUD, construction, building upgrades | Immersive city plus scrollable contextual detail and accessible district list retained. New models are picked/framed by existing renderer bounds. Check every building through all rotations and all prerequisite states. |
| Training/promotion | Existing two-tier selector and server-driven costs, quantities, queues. Long unit names and pending/rejected orders need native review. No gameplay edits. |
| Army formation | Responsive split, title/count separation and elided roster labels implemented. Both lists still scroll independently. Verify MAX, text entry, sliders, presets and disabled commanders. |
| Commanders, skills, ascension, relics/comparison | Existing portrait roster and independently scrolling detail. Fixed top portrait/action block remains potentially dense at low resolutions. New layouts/portraits not claimed. |
| Research | Overlapping fallback cards corrected; scroll extent follows actual rows. Selected detail/costs/prerequisites unchanged. Native card-title wrapping pending. |
| Inventory | Existing categorized master/detail, quantity and job-target selection retained. Check long descriptions, empty categories, item use and speedup targets. |
| Scouting, journal, surveys | Fixed section tabs now provide direct access. Existing mission redirect/recall, discovery claims and report focus actions retained. |
| Reconnaissance and battle reports | Existing private archive filters and details retained. Long reports and nested older battle/rally sections remain a density concern; no duplicate report model introduced. |
| Alliance, market | Existing scrollable membership/actions and server-owned transfers retained. Large member lists, long names, amounts/tax/rejection copy need native checks. |
| Events/rewards, first-session guide | Existing objective progress and explicit confirmed rewards retained. No fabricated rewards or altered completion conditions. Check claim/pending states. |
| Settings, navigation, notifications | Existing screen routes, shortcuts, scaling, reduced motion, sound toggles and error/pending states retained. Verify tooltips under GUI scaling and notification overlays. |

## Original art direction

- **Materials:** weathered limestone, earth, plaster and timber; matte canopy pigments; restrained bronze and gold on civic/command accents. Avoid global brightness lifts and emissive foliage.
- **Hierarchy:** terrain forms frame travel lanes; resources read as working sites; public landmarks have clear gateways; the player's city is the dominant civic mass. Decorative courtyards have no interactable markers.
- **Greek:** pale stone, clay roofs, columned courts and bronze. Preserve the existing original imported Greek architecture.
- **Egyptian:** warm plaster, flat terraces, roof stairs, open pottery courts, limited turquoise accents.
- **Norse:** timber longhouses, deep gables, ridge finials, dark green roofs and bronze fittings.
- **Chinese:** green tiled pavilion wings, red structural posts, open ceremonial courts.
- **Japanese:** indigo-grey eaves, timber screens, restrained pale walls and open garden space.
- **Military:** distinguish roles with equipment silhouette first; team color and confirmed state second. Magic supports a readable cast and impact, not persistent screen coverage.
- **Interface:** dark blue-green panels, warm readable text, gold for selection, consistent teal actions. Use short labels with full tooltips where constrained; keep information and actions accessible.

New art in this branch is original procedural geometry and shader code. No external asset dependency or copied commercial artwork was added. Existing `.meta` GUIDs are preserved; only two new text assets receive new GUIDs.

## Bounded work and performance limits

- Province dressing still builds once and passes through the existing material batching. At most three shared rock-mesh instances replace each previous divider rock; duplicate central crossing is skipped. The gate gaps are not filled.
- Four static residential courts per non-Greek city and four institution replacements use shared factory materials and roofs. Existing city rebuild trigger remains civilization/level changes, not every frame.
- Foliage material instances are cached per tint and released with the factory. The diagnostic argument is read once per factory. No animated leaf update loop was added.
- Fog mask arrays/textures are reused. Four veil vertices reduce mesh storage, **not a measured FPS claim**; the opaque fullscreen overlay can still be fill-rate sensitive.
- Exploration tab labels are cached. Existing combat effect pools/caps and reduced-motion behavior are unchanged.
- Existing source costs worth profiling: city primitive renderer count, broad scenery batches with coarse culling, repeated `OwnMarches()` lists and screen-specific IMGUI allocations. No unsupported claim of a measured CPU/GPU bottleneck.

## Integration requests for the gameplay agent

1. **Static knowledge semantics:** terrain can be permanently explored while static snapshots remain stale. Confirm which discovered objects may retain a stable identity/location without a “Last seen” qualifier. For stale snapshots, define presentation-safe fields (identity/location/category) separately from volatile stock, HP, ownership and destruction. Do not silently reinterpret stale fields as current. Until agreed, this branch retains `Remembered()` labels and timestamps. No protocol edits here.
2. **Do not relax military privacy:** hidden enemy marches/orders/cargo and private reconnaissance details must remain absent from ordinary map snapshots. The client veil cannot replace server filtering.
3. **Integration hotspots:** `PrototypeClient.Exploration.cs`, `.Screens.cs`, `.Interface.cs`, `.Formation.cs` and `InterfaceLayout.cs` may overlap concurrent gameplay UI work. Preserve new server actions/fields when integrating; review the presentation hunks rather than taking an entire older file.
4. No new API is required for the delivered shader, fog, architecture, formation or research layout changes. No migration is required.

## Verification and remaining gate

- Visual source checker: **87 C# files / 3 PowerShell scripts, 0 issues**. Syntax/static checks do not prove Unity compilation.
- Portable presentation contracts: **16,685 assertions passed**, including 221 UI layout/identity assertions. Supported resolution samples include 1024×768, 1280×800, 1920×1080, 2560×1440, 720p and ultrawide at UI preferences 0.85 / 1.0 / 1.15. These are logical geometry checks, not font/raster/input tests.
- Existing `exploration`, `scouting`, `findings`, `recon` and `core-corrections` server files: **48 tests passed** with localhost networking enabled. The earlier sandbox attempt stalled at the HTTP bind and was stopped; it is not counted as a pass.
- Existing Blender model checks: **18 scenery/building FBXs**, 9,824 vertices total; **36 weighted unit FBXs / 288 takes** and deformation checks passed. Blender 4.3.2; not Unity import acceptance.
- Additional tree geometry check: four FBXs / 32 closed outward shells passed. No exported models rewritten.
- `git diff --check` passed. No server, package, project-setting, protocol or release-number edits.
- **Pending:** Unity batch compile/shader variants/imports, native Linux hardware/software rendering, Windows rendering/input, screenshots, city overlap, fog boundaries, UI at physical resolutions, combat readability, reduced-motion/audio interaction and measured FPS/draw calls/allocations.

Next: execute [the native acceptance guide](visual-overhaul-native-checks.md), resolve any P0 failures, then continue the incomplete terrain, commander/UI and combat art passes. Do not describe this branch as commercially polished or the comprehensive overhaul as finished.
