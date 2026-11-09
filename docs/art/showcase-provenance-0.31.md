# v0.31 original asset provenance

No downloaded models, textures, recordings or reference-game artwork were added.

- `WorldArtFactory.Showcase.cs`: original parameterized loft meshes for curved
  trunks, lobed leaf crowns and irregular rocks; extruded arch geometry;
  chamfered civic terraces; modular shelter, portico and district details.
- `tools/build_showcase_textures.py`: deterministic seed 31031, original brush
  strokes and grain synthesized with Pillow. Outputs `Resources/Art/MythBrushwork.png`
  and `MeadowDetail.png` (256×256 RGB, mipmapped, repeat sampling).
- `Resources/Art/RallyGold.shader`: original additive Fresnel gold-light shader
  for shield, rings and particles. No copied third-party shader.
- `RallyingCryVfx.cs`: original bounded ring/ward/shield/particle composition over
  the project's existing Captain Skill animation. The built-in Unity sphere is
  used as an effect shell; it is not presented as a new character/building model.
- `tools/build_showcase_audio.py`: original additive synthesis with deterministic
  noise. Outputs mono 22,050 Hz PCM `RallyCharge.wav` and `RallyRelease.wav`.
- Retained skinned troops, Captain clips, culture cities, portraits and existing
  sounds keep their prior provenance. This pass neither reattributes nor replaces
  them with third-party game assets.

Regenerate from the repository root with Python 3 + Pillow:

```sh
python tools/build_showcase_textures.py
python tools/build_showcase_audio.py
```

Generators also produce stable Unity importer GUIDs. No Blender or external
source image/audio is required for these additions. Native Unity import/material
and sound acceptance remains pending.
