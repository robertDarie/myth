# Greek first-session quality slice

## v0.39 — Original civic kit and grass normals

Art direction: warm carved limestone, dark recessed openings, fired clay roofs,
muted teal cloth, sparse aged gold. Silhouette hierarchy: stepped civic hall,
open columned sanctuary, enclosed military courtyard. Keep streets and working
spaces clear; decoration must support scale/function rather than fill every gap.

Four original Blender FBX assets replace the Greek city Citadel, Temple and
Barracks primitives. Citadel 2 has taller central and flanking masses and a banner;
levels 3+ retain additional presentation banners. The world Greek city uses the
same level-1 civic language. Other cultures retain their existing architecture.
Generator: `blender -b --python tools/build_greek_districts.py`. No external artwork.
Bevelled joined geometry uses four to six shared material roles per asset; 624–1272
vertices per building before Unity import. This is an asset budget, not measured
Unity draw calls or FPS. Existing runtime palette and brush/tile textures are reused.

Grass had reversed faces sharing the same vertices: area-weighted normal sums
cancelled. Back faces now have independent vertices; a targeted regression checks
nonzero accumulated normals. Triangle count is unchanged, grass vertices double
from 45 to 90 per cached variant. This establishes a geometry defect, **not** the
root cause of the reported Mesa black marks. Repeat the same camera on llvmpipe
and real GPU; capture renderer/driver and toggle shadows through Unity Quality
Settings to distinguish geometry from shadow artifacts. No global renderer fallback
was enabled without evidence. Native artifacts remain unverified.

Validation: 275 server tests; 16,581 portable assertions (existing topology loops
cover the extra vertices); 83 C#/3 PowerShell source checks; 12 Blender FBX imports.
Unity asset review now includes the four new meshes. Native Unity compilation,
rendering, picking and performance are pending. No Unity Editor is installed here.

Remaining art work: surrounding housing, gates, vegetation and regional landmarks
still use the earlier assets. This civic slice does not complete all requested
commercial-art acceptance criteria. Dedicated art/animation review remains needed.

## v0.40 — Formation readability and protective choreography

Authored soldiers and commanders are larger, with wider front/rear ranks to retain
separation. Infantry lunges and archers' backward preparation are more pronounced.
Rallying Cry projects upright shield outlines onto represented soldiers in a short
release sequence; the translucent enclosing shell is softer, keeping bodies visible.
Shield outlines remain readable at distant zoom; particles retain the previous
close-zoom gate, eight leases and 32-particle caps. Actual shield state is required;
reduced motion shows static wards and no extra shield or damage is invented.
Existing projectile/audio timing and commander palettes are reused.

Validation: 275 server tests, 16,585 portable assertions (four new ward authority/
sequence/reduced-motion checks), source checks zero issues. Native silhouettes,
formation overlap, animation/audio sync and FPS remain unverified. This improves
the existing showcase; it is not a claim of premium animation quality, and new
bespoke commander clips/recorded audio have not been authored in this release.

## v0.41 — Owned inventory, small-display readability and useful archives

Inventory defaults to owned stacks; an explicit catalogue toggle retains access to
unowned item descriptions. Contextual AP/buff instructions appear for those item
kinds. Small desktop windows use a 1440-wide reference rather than 1600, retaining
minimum logical bounds and the existing scale preference. Existing layout tests
exercise 1024×768, 1080p, 1440p and ultrawide; actual fonts/clipping require Unity.

New PvE victory reports persist actual owned participant composition **at outcome**,
remaining HP and recorded camp contribution, plus the already-earned Sigil and
shared XP. These are text in the existing private durable report, not a new reward
or schema. Older reports remain valid; missing historical statistics are not
backfilled. Detailed field-battle views no longer prepend unrelated live treasury
and last-encounter data. PvP casualties/healing remain from their existing reports.

Validation: 276 server tests; 16,588 portable assertions; source checks zero issues.
New report test checks actual values, save round-trip and no reward on reading.
Inventory filtering and small-display scale get three targeted checks. No economy,
combat, save schema or protocol change. Native input/rendering/audio remain pending.

## Build, record and evaluate

Requires Unity 6000.3.0f1, Linux Build Support (Mono), editor license and Git;
Linux host needs Node 24+. No Unity Editor is available in this cloud environment,
so no native build, screenshot, animation timing, audio or GPU FPS result is claimed.

```sh
git switch main
git pull --ff-only
bash tools/build-linux-playtest.sh /path/to/6000.3.0f1/Editor/Unity
```

Extract `dist/Thrones-of-Myth-Linux-x86_64.zip` completely, then run
`bash Start-Thrones-of-Myth.sh`. The real client/server and manifest use the source
commit built. For capture use `node Launch.mjs --server-profile --thrones-profile`.
F8 captures 600 frames; Unity prints the VisualReview output path. Logs and restart/
two-client instructions remain in [the Linux guide](playtest-linux-0.37.md).

1. Fresh Greek guest: capture world at default and near zoom, fog, forest, resource
   grove and camp silhouettes. Check black marks on llvmpipe and hardware separately.
2. Enter city; record all four new assets, district picking at rotated angles,
   gates/roads, construction plots and exiting. Inspect other cultures for regressions.
3. Open commander panel, train five archers, choose Scout patrol (Captain,
   15 infantry / 5 archers, no mythics), confirm without ALL READY, deploy.
4. Scout (20,20), attack discovered Forsaken Scouts. Record the full battle at
   normal speed/default zoom and once close up: infantry, rear archers, projectile
   release/impact and the actual Rallying Cry cast/wards. Stronger formations may
   kill before casting. Do not force or fabricate an outcome for footage.
5. Inspect the private battle report, recall, confirm home formation/slot release.
   Upgrade Citadel to 2 and record the before/after silhouette at the same angle.
6. Gather wood: show actual cargo, delivery and quest claim. Open inventory, verify
   only owned stacks by default and opt-in catalogue; restart and resume the save.
7. Repeat key interfaces at 1024×768, 1920×1080 and 2560×1440 with 85/100/115% scale,
   keyboard shortcuts, sound off and reduced motion. Capture clipping/overlaps.
8. Record renderer, GPU/driver, resolution, visible armies, settings, capture length
   and frame times. Software llvmpipe measurements are not hardware GPU benchmarks.

These releases deliver scoped improvements, not all of the requested transformation.
Remaining acceptance work includes dedicated surrounding homes/gates/vegetation,
stronger world landmarks, bespoke commander animation/audio, comprehensive native
layout validation and artifact reproduction. Native visual acceptance is open for
all three releases. The current art still uses stylized modular geometry; matching
commercial reference-game production quality needs sustained artist-led iteration.
