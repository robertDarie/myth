# v0.38 — First-impression visual pass

Based on v0.37 `4b87812`. One focused presentation release; protocol 16, schema 15,
server authority, economy and combat balance are retained.

## Three source-level deficiencies addressed

1. **World composition:** tree placement and ground shading previously used
   unrelated distributions. `WorldView.Environment` now uses one deterministic
   woodland field for canopy density and darker forest floor, with restrained
   canopy color variation. Roads/site clearings remain open. `WorldView.Relief`
   uses broader shallow basins; the logical y=0 picking/movement plane is retained.
   Hemispheric sky/equator/ground lighting replaces the uniform ambient color.
2. **City legibility:** radial spokes crossed the settlement and the Citadel had
   weak scale hierarchy. `CityDiorama` now lays edged cross streets between the
   established district positions, with shorter entrances and a main gate avenue.
   The hinterland tree ring is less regular; `WorldArtFactory.CityDistricts`
   enlarges the existing Citadel and Temple silhouettes. Bounds/picking/framing
   still derive from actual renderers. All five culture models, ambient actors,
   queues, selection, scaffolds and level progression remain in use.
3. **Combat timing:** arrows kept a fixed orientation along their arc and the
   skill particle burst preceded release. `SkillPresentation` supplies the arrow
   arc/tangent and shared cast pose. `WorldActorAnimation` aligns bow sound,
   trajectory and impact, and the commander's additive pose peaks at release.
   `CommanderSkillVfx` emits 12 rather than 22 embers at the release cue, eases
   the defensive wave and tilts the gathering ring for readability. Existing
   eight-effect pooling, real shield state, audio gates and reduced motion remain.

The optional campaign combat action also provides a concise select/attack/recall
instruction. Existing camera, HUD, inventory/report layouts, first-session flow,
formation walking/turning, authored animation clips, hit reactions and victory
feedback were reviewed and reused, not rebuilt. No new assets or gameplay events.

## Verification

- Existing full server/launcher suite: **275 passed**, no failures or skips.
- Existing portable production C# suite: **16,355 assertions passed**; only six
  targeted new checks for flight endpoints/tangent and cast/release timing.
- Source hygiene: **83 C# / 3 PowerShell, zero issues**; Bash syntax and diff checks.
- Blender: eight environment FBX round trips; 36 weighted unit models, 288 clips
  and deformation/march checks. The army verifier has a `--checks-only` option to
  avoid generating unrelated review renders. These are Blender checks, not Unity.
- Linux builder inspection confirms actual BuildPipeline Linux Mono output,
  complete runtime files, real server modules, manifest and launch scripts.
  Existing launcher integrity/join/error-path integration tests use a stub client;
  the separate server gameplay proof uses real HTTP/SQLite.

**Unity is unavailable: native compilation, import, rendering, input, audio timing
and FPS are NOT verified. No v0.38 native binary or Unity screenshot was produced.**
These changes need an A/B native review. Dedicated higher-quality character art,
rigging/animation and environment art direction will still be needed to approach
commercial reference-game quality; procedural composition alone cannot establish
that standard. Terrain picking offsets, enlarged city bounds and road intersections
especially need inspection at close zoom and each culture.

## Build and short Linux acceptance

Unity 6000.3.0f1 + Linux Build Support (Mono), valid editor license, Git and host
Node 24+ are required. From a clean checkout:

```sh
git switch main
git pull --ff-only
bash tools/build-linux-playtest.sh /path/to/6000.3.0f1/Editor/Unity
```

Extract the complete `dist/Thrones-of-Myth-Linux-x86_64.zip`, then run
`bash Start-Thrones-of-Myth.sh`. For recording, use
`node Launch.mjs --server-profile --thrones-profile`; F8 captures native frames.
Logs/saves and multiplayer steps: [existing Linux guide](playtest-linux-0.37.md).
The launcher verifies the current manifest/version; do not mix release files.

- Fresh guest: inspect forest floor, plains, roads, resource sites, fog and minimap.
  Pan to edges/corners at both zoom limits; check clicking stays accurate.
- Enter/exit city, rotate, select every building and use district list. Inspect
  Citadel/Temple scale, roads, construction and completion; repeat five cultures.
- Train five archers. Set Scout patrol: Captain + 15 infantry + 5 archers,
  no mythics; confirm without pressing ALL READY. Scout toward (20,20).
- Attack discovered Forsaken Scouts. Record attack anticipation, arrow direction,
  impact timing, the real fifth-hit Rallying Cry, shield, victory and report.
  Stronger formations can kill before casting; no skill outcome is fabricated.
- Gather partial cargo, recall, confirm delivery report and world-march removal.
  Open inventory/reports; check HUD, rewards and contextual actions.
- Repeat motion/sound off, 720p/1080p/1440p/ultrawide and supported UI scales.
  Check audio release timing and native frame capture with several visible armies.
- Restart through launcher and reconnect the same profile; verify resources,
  queues, commanders and cargo persist. Back up saves; never erase progress to test.

Stop after recording this release and review the actual native result before
choosing further visual work.
