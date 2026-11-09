# v0.37 measurements — server CPU, not native FPS

Measured in this managed Linux environment with Node v24.22.1 on AMD EPYC 9V74 80-Core Processor.
Before: production modules from v0.36 `75e905b`. After: this v0.37 source.
Both use the identical corrected benchmark fixture/harness: 32 players, 160
prepared formations, 159 deployed after one legitimately docks, three warmup
iterations and 25 measured tick/snapshot/encode samples; ten SQLite saves.
The fixture includes Captain in each owned roster so save round-trip validation
is meaningful. Authoring stress fixtures is not legitimate player progression.
Runs were sequential on one shared machine; this is a short comparison, not a
statistical capacity certification or a production soak.

| Scenario | Phase | Before p50 / p95 ms | After p50 / p95 ms |
| --- | --- | --- | --- |
| 32 independent players | tick | 35.87 / 43.86 | 6.93 / 11.33 |
| 32 independent players | snapshot | 4.67 / 7.25 | 1.16 / 1.81 |
| 32 independent players | encode | 0.46 / 0.66 | 0.46 / 0.79 |
| 32 independent players | sqliteSave | 2.43 / 4.35 | 2.29 / 2.90 |
| 32 allied players | tick | 1291.39 / 1848.40 | 43.67 / 61.55 |
| 32 allied players | snapshot | 61.45 / 101.54 | 2.97 / 3.59 |
| 32 allied players | encode | 0.98 / 1.80 | 0.84 / 1.10 |
| 32 allied players | sqliteSave | 3.78 / 7.13 | 3.75 / 7.82 |

The measured dominant cost was rebuilding alliance vision for each static object.
Sources are now reused only within stable simulation/snapshot passes. No global
cache can outlive a movement or alliance command. Source geometry, privacy,
foreign cargo/route stripping and save-roundtrip troop counts are asserted.
Encoding and persistence were measured, not redesigned: small timing differences
there should not be interpreted as established optimizations.

The new live roster adds snapshot bytes. There is **no network bandwidth reduction
claim**, no measured transit latency and no native rendering measurement.
Raw data: [before](benchmark-0.37-before.json), [after](benchmark-0.37-after.json).

Portable CLR advice-status microbenchmark (10,000 calls) measured 2,000,000
allocated bytes uncached versus 0 cached after warmup. That supports bounded
per-snapshot reuse, not a Unity GC/frame-rate claim. Full portable tests include
cache invalidation and five-entry bounds.

[Real two-player proof result](two-player-proof-0.37.json) is separate from the
synthetic load test: authenticated HTTP, real SQLite and production commands with
accelerated simulation. No native client was used. It does not claim stronghold
victory, visual quality, public deployment or massive-player readiness.

Reproduce with `node tools/benchmark-kingdom.mjs work/kingdom-benchmark.json` and
`node tools/two-player-proof.mjs work/two-player-proof.json`. Native F8/server
capture procedures are in [the playtest checklist](../playtest-linux-0.37.md).
