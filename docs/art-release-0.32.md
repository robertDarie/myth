# v0.32.0 — World and city craft pass

Based on v0.31 `27f21f8`. Implemented original culture-specific curved roof meshes
(Greek ridge, Norse steep pitch, Chinese/Japanese raised eaves, Egyptian flat
terraces/parapets), replacing paired-box roofs in modular institutions, camps and
sacred temples. Existing culture FBX roofs now share an original painted tile
texture. City and resource architecture retain their functional IDs and picking.

Bent grass clusters replace cube tufts; density rises from 160 to 480 candidate
patches, still excluded from roads, worksite and city clearings. Terrain adds
intermediate brush/grass color variation. Worksites gain pottery, roofed lumber
storage and arched mine entrances, retaining actual server stock sections. City
adds gatehouses, pottery, benches and gardens. Four ambient actors replace two;
two follow the southern boulevard. Confirmed construction scaffolds include moving
hoist loads, static with reduced motion. Existing Citadel towers and level details
now use the crafted roofs; selection and completion feedback remain intact.

A new original cloud shader modulates fog RGB only: unknown opacity, remembered
sectors and live visibility remain controlled by the existing exploration mesh.
No hidden entities are instantiated or new intelligence sent. Cloud drift stops
with reduced motion. Existing camera footprint bounds, lighting and province
layout are preserved.

## Provenance and efficiency

`CraftGeometry.cs` contains original deterministic roof/grass/vessel topology,
executable outside Unity. `WorldArtFactory.Craft.cs` caches meshes/materials and
reuses existing scenery batching. `tools/build_craft_textures.py` generates the
256px original RoofTiles texture with Pillow, seed 32032; no source artwork or
third-party assets. `FogVeil.shader` is original. No new dependencies, currencies,
protocol fields or save schema changes (protocol 16/schema 15).

## Verification

- Server/save/migration suite: 257 tests passed.
- Portable production C# contracts: 13,048 assertions passed, including 12,431
  topology/index/finite-vertex/nondegenerate-face/determinism assertions.
- Source/import hygiene: 70 C# and 3 PowerShell files, zero issues.
- New texture generator runs; native headless checks now include its texture and
  fog shader imports, but **were not run here**.
- Unity compilation/rendering, asset appearance, fog/shadow quality, native
  picking/camera/input, audio and FPS: **PENDING**, no Unity Editor installed.

Record city roof silhouettes, Citadel upgrade, moving construction hoists,
gatehouses and boulevard actors; world grass/forests/worksites, camp and temple
silhouettes; known/unknown/visible boundaries. Repeat v0.31 camera and reduced-motion
checks. Do not interpret topology tests as visual acceptance.
