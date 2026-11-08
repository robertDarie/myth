# v0.28.0 verification — 2026-11-08

Baseline: main `4a2989e` (v0.27.0). Native Unity Editor is unavailable here.

- Complete Node 24 server regression suite: **226 passed, 0 failed**,
  including 19 focused core-correction and Windows-module packaging tests.
  Command: `cd server && npm test` (equivalent release invocation used
  `node --test --test-reporter=spec` at repository root).
- Portable .NET 8 production DTO/presentation contracts: **189 passed**,
  including cargo guidance, home/deployed DTOs and full-archive replay bounds.
  Command: `dotnet run --project tests/PresentationContracts -c Release`.
- Static import/syntax hygiene: **62 C# files, 3 PowerShell scripts, 0 issues**.
  Command: `python tools/check-visual-sources.py` with its documented tree-sitter
  dependencies installed. Node module syntax checks and `git diff --check` pass.
- Fault-injection tests intentionally log storage errors; these verify rollback,
  degraded readiness, recovery and exactly-once settlement. They are passing tests.

Coverage includes finite-node conservation and concurrent gathering, separate
cargo/treasury, partial/full/exhausted returns, formation slot lifecycle, saved
commander/relic/troop continuity, restart resumption, cargo loss in actual PvE,
settlement/report rollback, duplicate-trip rejection, schema-13 archive migration,
private bounded reports and hidden stock/ownership/destruction observations.
Existing hospital, PvP, rally, inventory, account, receipt and kingdom suites pass.

The packaging test walks the server import graph from `index.mjs`, verifies every
runtime module is bundled (including discovery and field logistics), and checks
protocol 15 / bundle version 0.28.0. It does **not** build a Windows executable.

Not verified: Unity assembly compilation, rendering, Windows input, report layout,
army despawning visuals, launcher/installer execution or FPS. No native or visual
success is inferred from static parsing or portable DTO compilation. Use the
[Windows acceptance journey](../core-corrections-0.28.md) before distribution.
No production-scale storage latency or server throughput result is claimed.
