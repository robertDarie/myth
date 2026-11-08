# v0.29.0 automated verification — 2026-11-08

Baseline: main `4742df4` (v0.28.0). No Unity Editor is installed in this executor.

| Check | Result |
|---|---|
| Complete Node 24 server suite | **255 passed, 0 failed**, including 29 new economy tests |
| Portable .NET 8 production model/presentation contracts | **195 passed**, including 49 gameplay/DTO contracts |
| Static source/import hygiene | **62 C# files, 3 PowerShell scripts, 0 issues** |
| Node module syntax / `git diff --check` | Passed |
| Windows runtime module graph | Packaging includes `economy.mjs`; protocol 16 / bundle 0.29.0 verified by existing graph test |

Commands:

```sh
cd server
npm test
# From repository root:
dotnet run --project tests/PresentationContracts -c Release
python tools/check-visual-sources.py
```

The release server invocation used `node --test --test-reporter=spec` at repository
root, covering the same server test files. The static script uses its existing
tree-sitter dependencies. Local sockets/IPC were enabled for the test runners.
Expected fault-injection storage warnings verify failure behavior, not failed tests.

New coverage includes:

- Actual v0.28-generated schema-14 fixture; ordinary currency conversion across
  balances, sealed packs, cargo, source records, paid jobs/refunds and history.
- Immutable historical source records; repeat migration/load safety; original JSON
  archive; real SQLite migration; no retroactive premium/item/AP reset.
- AP regeneration, remainder, caps, downtime, monotonic clock rollback and saved
  continuity; contact-time camp charging, shared multi-march entitlement, respawn
  generations, restart and grandfathered legacy contributors.
- Stronghold admission, insufficient-party exclusion without charging others,
  actual PvP/movement/gather/scout AP freedom, and AP/damage rollback on save failure.
- Commander gold-recruitment rejection, matching shard consumption, earned Warden
  item acquisition, summons, progression and retained owned commanders.
- Stored Sigils, capped energy recovery, specialized speedups, same-job finishing
  protection, attack/defense stat effects and actual damage, coexistence,
  non-refresh/non-stacking, exact expiry and reconnect preservation.
- Authored premium and item grants under existing claim ledgers; concurrent claims
  and consumption; exact named/quantity item previews.
- Alliance membership, taxes, resource conservation, limits, invalid/overflow
  amounts, private reports, sequence conflicts, receipt eviction, concurrent HTTP
  requests, rollback, durable SQLite receipts and reconnect retries.
- Legal fresh-city and migrated-player journeys; existing exploration/cargo,
  account, hospital, PvP, rally, city, inventory, campaign and kingdom regressions.

The scripted legal new-player journey completed in **60.7 simulated server seconds**:
city upgrade, training, wood/food delivery, Chapter I claim, Warden shard item use,
recruitment, second formation deployment, actual camp combat and home return. It
spent 5 AP and earned 5 premium Aether. Accelerated prototype timers and immediate
scripted choices make this a rules/dependency check, not a human pacing benchmark.

Not run: Unity assembly compilation, rendering, Windows input, native layout at
multiple resolutions/UI scales, actual ZIP/installer execution or FPS profiling.
Portable DTO compilation and source parsing do not establish those results. Follow
[the Windows acceptance checklist](../playtest-economy-0.29.md) before distribution.
Production-scale server/storage throughput and cross-account anti-farming were not
benchmarked in this milestone. No billing or real-money purchase flow exists.
