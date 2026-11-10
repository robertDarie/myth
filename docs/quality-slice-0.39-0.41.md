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
