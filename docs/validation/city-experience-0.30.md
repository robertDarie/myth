# v0.30.0 verification — 2026-11-08

Baseline: main `9b6098d` (v0.29.0).

| Verification | Observed result |
|---|---|
| Complete Node 24 server suite | **255 passed, 0 failed** |
| Portable .NET 8 model/presentation suite | **286 passed**, including **91 city-experience contracts** |
| Existing gameplay/DTO subset | **49 passed**, included in the 286 total |
| Static Unity/import hygiene | **64 C# files, 3 PowerShell scripts, 0 issues** |
| `git diff --check` | Passed |
| Runtime server/economy/protocol/schema source | Unchanged; only the existing bundle-version test expectation changes under `server/` |

Commands:

```sh
cd server
npm test
# Repository root:
dotnet run --project tests/PresentationContracts -c Release
python tools/check-visual-sources.py
```

The server run used `node --test --test-reporter=spec` at repository root,
covering all server tests. The existing static tool uses tree-sitter. Test-runner
IPC/local sockets were enabled. Expected storage-failure messages belong to
passing fault-injection tests.

Production pure C# contracts exercise:

- Enter/exit monotonicity, smooth reversal without resetting the blend, interruption,
  repeated cycles, exact settled endpoints and account-reset input release.
- Immediate reduced-motion transitions and camera changes; invalid time/input safety.
- World-input rejection from initial entry through final exit, including non-world
  pages, HUD occlusion and text focus; city picking only after settled entry.
- Institution screens returning to the city parent; district-list versus city exit.
- Bounded zoom, bounded long-session angles, fit/reset behavior and render-target
  sizes at 720p, 1080p, 1440p, 3440-wide, 5120-wide and 4:3, at scales 0.85/1/1.15.
- Marker-ID selection for all sixteen buildings, stale-selection fallback, keyboard
  wrapping, institution destinations, unchanged city/economy/job/formation data
  across 100 presentation cycles, and construction-versus-research distinction.

The tests use the production state/policy/helper sources and DTOs. They do not
instantiate Unity cameras or colliders. The existing complete server suite confirms
v0.29 economy, migration, AP, cargo, reports, identity, combat and queue regressions
remain passing. Bundle version is 0.30.0; protocol 16 and world schema 15 are retained.

**Not executed:** Unity assembly compilation, rendered blending, physical raycast
accuracy, native mouse/keyboard behavior, culture-specific framing, all-building
selection through rotation, Windows launcher/installer execution, FPS, CPU/GPU
frame times, GC or VRAM profiling. No Unity executable is available in this executor.
Static parsing and portable tests do not establish visual success or performance.
Use [the native checklist](../playtest-city-0.30.md) for these remaining checks.
