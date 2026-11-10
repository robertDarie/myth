# v0.42 — Living settlement and woodland candidate

Based on v0.41 `0c9a067`. This batch delivers one scoped release. v0.43 combat and
v0.44 UI redesign are **not implemented**; their existing v0.40/v0.41 behavior is
retained. This is a candidate for native review, not completed visual acceptance.

## Material changes

- Four Greek residential courtyards occupy the city corners; an open gatehouse
  replaces the paired generic gate towers. Existing walls, streets, selection and
  institution positions remain. Homes are scenery, not new production buildings.
- Built Greek Markets use an original covered stall with counters and stocked
  trays. The earlier Citadel/Temple/Barracks and level-2 Citadel are retained.
- Two original oak variants use tapering branches and layered leaf mantles.
  They replace oak scenery and actual resource-grove trees; resource stock still
  controls the tree groups and depleted stumps. Northern pine assets remain.
- Forsaken Scouts uses a distinct lean-to, broken enclosure and lookout banner.
  It is instantiated through the existing visibility-controlled camp representation;
  the existing activity fire and health/selection controls remain.
- Oak tint variation now uses four shared steps per regional palette rather than
  a unique random color/material per tree, allowing existing scenery batching to
  group those materials. No new Update loops, particles or gameplay simulations.

## Original assets and reproducibility

`blender -b --python tools/build_living_realm.py` uses our own civic-kit geometry
helpers. No downloaded models, third-party art or new textures. Six FBX assets:

| Asset | Vertices before Unity import | Material roles |
| --- | ---: | ---: |
| RealmOak1 / RealmOak2 | 336 each | 4 each |
| GreekHome | 648 | 5 |
| GreekMarketStall | 336 | 5 |
| GreekGatehouse | 408 | 5 |
| ForsakenShelter | 504 | 5 |

These are budgets from Blender, not measured Unity draw calls/FPS. Instances reuse
runtime materials and original brushwork/roof textures. Binaries use Git LFS.
Unity Art Review and the Blender validator include the new assets. Blender lineup
was inspected; this does not establish in-game placement, scale or appearance.

## Artifacts and diagnostics

The previous grass normal cancellation fix remains. No new reproducible black-mark
root cause was established. To isolate shadows without changing a saved preference,
launch the same build/view with `node Launch.mjs --thrones-no-shadows`. This disables
Unity shadows for that process and logs graphics device/version. Compare default
and diagnostic screenshots on llvmpipe and a hardware GPU. The flag is a diagnostic,
not an enabled-by-default workaround or proof that shadows cause the artifacts.
Fog authority, camera bounds, picking and logical movement terrain are unchanged.

## Verification and limits

276 server tests passed; 16,588 existing portable C# assertions passed; source
checks: 83 C# / 3 PowerShell, zero issues; Bash packaging syntax/diff checks passed.
Blender verified 18 model imports, nonzero lighting normals and new asset budgets;
36 rigged models/288 animation takes passed existing deformation checks.

Unity Editor is unavailable. **Native compilation, Unity imports, rendering,
layout, input, audio, transitions, artifact resolution and performance are pending.**
No Linux client binary was built here. Launcher tests use a stub client; gameplay
integration tests use the real server. Neither substitutes for native acceptance.
Protocol 16/schema 15 and all gameplay/economy rules are retained.

The broader request remains incomplete: new cliff/rock systems, sacred landmarks,
advanced civilian/worksite activity, bespoke combat choreography and UI redesign
are not delivered. Existing modular geometry, texture detail and animation fidelity
still fall short of commercial presentation. Evaluate this kit in-game before
expanding it or calling the transformation successful.

## Linux build and review

Install Unity 6000.3.0f1 + Linux Build Support (Mono), license the editor and install
host Node 24+. From the repository:

```sh
git switch main
git pull --ff-only
git lfs pull
bash tools/build-linux-playtest.sh /path/to/6000.3.0f1/Editor/Unity
```

Extract the entire `dist/Thrones-of-Myth-Linux-x86_64.zip`, run
`bash Start-Thrones-of-Myth.sh`. For frame capture launch
`node Launch.mjs --server-profile --thrones-profile` and press F8. Record renderer,
GPU/driver, resolution and frame-time capture duration. llvmpipe is not GPU evidence.

1. New Greek guest: record starter world at normal and near zoom; forest silhouettes,
   grove stock, camp, fog edge and all four map boundaries. Check tree/camp picking.
2. Enter city, rotate, select every institution, inspect homes/gate and street joins.
   Compare Citadel 1/2 from the same camera; test construction, locked plots and exit.
3. Inspect Captain; train five archers; choose Scout patrol: 15 infantry/5 archers,
   no mythics. Confirm without ALL READY. Deploy and scout (20,20).
4. Attack Forsaken Scouts. Record real Rallying Cry, wards, projectiles, HP, victory
   and report. Recall; verify disappearance and free deployment slot.
5. Upgrade Citadel; gather wood, show cargo, return/delivery and quest claim. Inspect
   inventory, commander and report screens, HUD/minimap and optional guidance.
6. Save/restart/reconnect the same profile. Repeat 1024×768, 1920×1080, 2560×1440,
   supported UI scales, motion/sound off, and nearby/distant camera selection.
7. Capture black marks with shadows on/off at identical camera positions, then
   compare hardware and llvmpipe separately. Keep logs alongside video.

Stop development after this batch and review the real native result.
