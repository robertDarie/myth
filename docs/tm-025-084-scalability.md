# TM-025 / TM-084 — first server scalability checkpoint

Measured 14 November 2026. **Partial implementation; mass-battle acceptance remains open.**

## Scope and source

Inspected `server/realms.mjs`, `http.mjs`, `world.mjs`, `campaign.mjs`, `war.mjs`, `exploration.mjs`, `discovery.mjs`, `navigation.mjs`, `database.mjs`, `storage.mjs`, and `telemetry.mjs`, plus their callers, fixtures and publication rules.

The checkout initially matched handoff commit `5d8316fb8312b91ae57b3d4780064e1901c7a245`. During work, a user commit `128022b61f3b9deae994e89364cb7d945e92e5b3` arrived on main and origin/main, incorporating the existing draft roster/stat/route optimizations and benchmark. That newer commit is the final comparison baseline. No branch, worktree, reset or history rewrite was used. Initial profiling against an exported 5d8316f source also identified discovery, fog and structuredClone as the largest costs.

Baseline raw data: [tm-025-084-baseline.json](benchmarks/tm-025-084-baseline.json). Optimized raw data: [tm-025-084-optimized.json](benchmarks/tm-025-084-optimized.json). No player state, credentials or tokens are in these reports.

Machine: 11th Gen Intel(R) Core(TM) i5-11400 @ 2.60GHz; 12 logical CPUs; 16146.5 MiB RAM; Windows; Node v24.18.0. Harness SHA-256: `be8281ec6af4583c4a234413a3c5a3b812e7c794e74e12358d51ad9cf4b9934d`.

## Reproduction and workload

Run from the repository root with Node 24 or later. Export the old tracked server source into an ignored directory (this creates no Git worktree):

```powershell
python -c "import pathlib,subprocess; root=pathlib.Path('work/scalability-previous'); files=subprocess.check_output(['git','ls-tree','-r','--name-only','128022b','server'],text=True).splitlines(); [((root/p).parent.mkdir(parents=True,exist_ok=True),(root/p).write_bytes(subprocess.check_output(['git','show','128022b:'+p]))) for p in files]"
node --expose-gc scripts/load-benchmark.mjs --server-dir=work/scalability-previous/server --out=work/baseline.json
node --expose-gc scripts/load-benchmark.mjs --out=work/optimized.json
```

Run sequentially with no competing tests. The final two runs used the same harness, 100 fixed 0.1-second ticks per host case and six HTTP rounds per configuration. Direct measurements warm up ten ticks, then measure 100 ticks, 30 checkpoints and 30 snapshots/JSON encodes. HTTP cases cover JSON and SQLite for 1×1, 1×16, 1×32 and 4×32 players. Each round polls every authenticated client and sends up to two concurrent scout-auto commands per kingdom. A 200 ms round target means five polls/client/second when the host keeps up; slow rounds wait for completion and report overrun. This is a bounded burst test, not an open-loop sustained arrival-rate test or soak.

The 16/32-player generated fixture contains four PvP pairs, four gatherers, two moving armies, a rally, a garrison, active scouts for all cities, and remaining idle cities. Campaign membership and scouts use actual commands; generated city levels, resources, positions and opened milestones are fixture setup. World.fromSave validates the fixture before measurement. Battles resolve naturally and scouts return; they are not made immortal or replaced to hide simulation work. The 1-player HTTP case has a scout; the 1-player direct case is idle. Each HTTP case restores its disposable initial image between the fixed-step and live-HTTP phases so polling does not start after all activity has already finished.

Temporary worlds use mkdtemp and an OS-assigned localhost port. Cleanup closes stores and removes only the generated temporary directory. Neither port 8091 nor any existing player/playtest save is accessed. The harness fails on non-200 responses, timeouts, or degraded persistence. Optional flags: `--ticks=N`, `--rounds=N`, `--http=no`, `--server-dir=PATH`, `--out=PATH`.

Percentiles use nearest sampled sorted ranks; p99 of 100 samples is the maximum. Times below are milliseconds, written p50/p95/p99. Percent improvements compare the same percentile. These are single runs on a shared development machine, not confidence intervals.

## Confirmed costs and implementation

- Full-world structuredClone checkpoints allocated and decoded an entire graph every tick and command. `server/checkpoint.mjs` now captures a detached V8-encoded image, decoding only when rollback is needed. Both legacy and multi-realm servers still checkpoint before every persisted mutation/tick, save logistics atomically, and acknowledge a command only after its save completes. The image is never written to disk; save schema 25 and protocol 16 stay unchanged. Restore also removes top-level fields first created by a failed action, which Object.assign alone did not undo.
- `rememberStatics` repeatedly checked sight for still-existing remembered objects and searched static arrays. It now checks a per-kind id Set before sight tests for removed records and copies whitelisted scalar fields without filter/map/entry arrays. Visible records, hidden historical values, destruction discovery and observed timestamps keep the same rules.
- Fog repeatedly scanned all 400 cells against every vision source. `sightCells` visits each source bounding square and retains the original Math.hypot circle predicate and ascending output order. A context reuses that result for alliance members only within the same exploration pass. There is no retained fog cache across movement, alliance changes, requests or worlds.
- Repeated army flattening and id scans use a per-world roster and id Map only during one synchronous tick or snapshot, cleared in finally. Commands, failed mutations and restored worlds never inherit old army references. The draft persistent generation index, route cache and tick stat cache were removed: rollback could replace indexed armies, route access can change without a gate epoch, and combat/progression can change stats within a tick. Stats and routes are evaluated from live state.
- Multi-realm tick diagnostics now include checkpoint time. The benchmark separately times whole-host work including checkpoints and synchronous logistics saves; old diagnostics excluded checkpoint CPU.
- The Windows package module list now includes checkpoint plus previously omitted realms, events, diplomacy and season modules; import-graph regression verifies the bundle list. No models, shaders, animations or gameplay UI changed.

## Direct world measurements

- 1 player(s), idle: tick 0.102/0.353/0.992 → 0.111/0.347/0.595 (+1.7% p95 improvement); checkpoint 0.127/0.283/0.485 → 0.054/0.113/0.324 (+57.5% median improvement).
  Snapshot 0.821/1.784/8.258 → 0.765/2.352/12.807 (-31.8% p95 improvement); JSON encoding 0.560/0.985/1.068 → 0.484/1.034/1.168 (-5.0% p95 improvement). Mean body 100166 → 100166 bytes.
- 16 player(s), mixed: tick 2.761/4.938/15.113 → 1.838/3.368/16.486 (+31.8% p95 improvement); checkpoint 1.742/3.575/3.590 → 0.639/0.987/1.057 (+63.3% median improvement).
  Snapshot 1.084/2.299/4.493 → 1.128/3.321/3.355 (-44.5% p95 improvement); JSON encoding 0.543/0.931/1.067 → 0.647/1.037/1.325 (-11.4% p95 improvement). Mean body 113391 → 113390 bytes.
- 32 player(s), idle: tick 3.361/5.789/6.561 → 2.112/4.286/6.816 (+26.0% p95 improvement); checkpoint 2.501/3.822/4.544 → 0.759/1.232/1.389 (+69.7% median improvement).
  Snapshot 1.155/2.478/2.676 → 1.148/2.149/3.384 (+13.3% p95 improvement); JSON encoding 0.519/0.879/1.082 → 0.566/1.361/1.860 (-54.8% p95 improvement). Mean body 112024 → 112024 bytes.
- 32 player(s), mixed: tick 5.419/9.874/13.492 → 3.258/4.916/9.033 (+50.2% p95 improvement); checkpoint 4.423/6.460/7.081 → 1.249/2.463/2.956 (+71.8% median improvement).
  Snapshot 1.172/2.454/2.863 → 1.196/2.008/6.441 (+18.2% p95 improvement); JSON encoding 0.572/0.941/1.396 → 0.539/0.908/1.001 (+3.5% p95 improvement). Mean body 120003 → 120002 bytes.

Negative improvements are regressions. Single-player median tick regressed slightly; 16-player snapshot p95 and some encoding percentiles regressed despite lower tick/checkpoint cost. These changes do not establish a consistent snapshot/serialization improvement. Payloads are not reduced; they vary with sampled activity and observation timing.

## Persistent whole-host and HTTP measurements

- json, 1×1: host tick 0.317/0.670/0.826 → 0.118/0.265/0.482 (+60.4% p95 improvement). Poll 33.122/58.966/58.966 → 19.542/44.963/44.963; command 33.321/59.301/59.301 → 20.674/39.163/39.163.
  Save 8.243/24.680/24.680 → 7.418/7.939/7.939; mean snapshot 100356 → 100339 bytes. Simulation lag 27.2 → 73.7 ms over 1213.4 ms live wall time; retained heap 12.2 → 12.2 MiB.
- json, 1×16: host tick 5.317/24.097/30.670 → 2.963/21.221/24.760 (+11.9% p95 improvement). Poll 115.064/167.790/171.568 → 66.825/111.467/113.187; command 118.365/171.752/171.752 → 102.856/113.337/113.337.
  Save 15.644/20.107/20.107 → 17.607/19.507/19.507; mean snapshot 113501 → 113480 bytes. Simulation lag 41.1 → 54.5 ms over 1226.3 ms live wall time; retained heap 13.9 → 14.1 MiB.
- json, 1×32: host tick 12.796/47.094/60.473 → 6.812/38.849/44.189 (+17.5% p95 improvement). Poll 149.224/289.896/292.969 → 140.747/228.983/238.872; command 285.466/293.775/293.775 → 227.687/240.170/240.170.
  Save 33.433/38.925/38.925 → 27.485/38.856/38.856; mean snapshot 120727 → 120344 bytes. Simulation lag 40.2 → 2.1 ms over 1416.3 ms live wall time; retained heap 15.1 → 13.7 MiB.
- json, 4×32: host tick 49.741/207.149/243.463 → 24.879/135.985/150.008 (+34.4% p95 improvement). Poll 739.293/1075.638/1253.636 → 599.446/845.625/1003.155; command 1281.993/1720.647/1720.818 → 1006.627/1373.792/1374.953.
  Save 30.226/38.592/38.592 → 26.409/30.986/30.986; mean snapshot 122784 → 122751 bytes. Simulation lag 2846.7 → 1933.2 ms over 6906.2 ms live wall time; retained heap 17.4 → 17.3 MiB.
- sqlite, 1×1: host tick 0.444/0.802/3.828 → 0.136/0.201/0.418 (+74.9% p95 improvement). Poll 24.379/86.363/86.363 → 20.342/37.046/37.046; command 24.315/86.384/86.384 → 20.413/36.096/36.096.
  Save 4.318/5.266/5.266 → 2.732/3.224/3.224; mean snapshot 100347 → 100350 bytes. Simulation lag 84.1 → 81.9 ms over 1245.4 ms live wall time; retained heap 13.4 → 13.8 MiB.
- sqlite, 1×16: host tick 5.520/12.848/17.122 → 2.583/7.311/10.076 (+43.1% p95 improvement). Poll 69.318/93.259/111.073 → 58.185/85.748/86.489; command 96.713/111.748/111.748 → 80.851/86.631/86.631.
  Save 6.069/25.742/25.742 → 4.940/8.753/8.753; mean snapshot 113500 → 113444 bytes. Simulation lag 88.0 → 37.2 ms over 1208.5 ms live wall time; retained heap 13.6 → 13.6 MiB.
- sqlite, 1×32: host tick 12.536/22.505/31.963 → 5.765/13.518/18.186 (+39.9% p95 improvement). Poll 163.045/205.974/209.224 → 145.351/192.675/196.323; command 175.071/207.907/207.907 → 168.433/194.673/194.673.
  Save 6.944/12.523/12.523 → 6.178/12.503/12.503; mean snapshot 120085 → 119996 bytes. Simulation lag 33.3 → 91.6 ms over 1221.4 ms live wall time; retained heap 14.1 → 14.6 MiB.
- sqlite, 4×32: host tick 49.113/88.761/140.285 → 26.343/54.854/66.517 (+38.2% p95 improvement). Poll 605.626/889.029/942.363 → 580.610/704.405/752.522; command 946.203/1113.971/1114.016 → 750.737/936.261/936.399.
  Save 7.163/16.872/16.872 → 6.779/8.684/8.684; mean snapshot 122730 → 122596 bytes. Simulation lag 1580.0 → 1183.1 ms over 4654.4 ms live wall time; retained heap 17.0 → 17.1 MiB.

Each implementation completed 2124 authenticated polls and 156 commands across the eight cases: zero failed or timed-out requests, all kingdoms persistence-healthy. Full per-kingdom tick percentiles, round overruns, timing, heap/RSS/external memory and per-realm simulated time are in the raw reports. Save samples are five per kingdom. CPU ticks omit network transfer; HTTP latency includes local queuing, response body consumption and writes.

Memory fields are process measurements, not isolated world sizes or maximum RSS guarantees. Direct peak is sampled after work; HTTP peak is the greatest heapUsed sample after a round. Before/retained use explicit GC when --expose-gc is supplied. V8 images also consume external memory, included in the raw results. Four-kingdom retained heaps were effectively unchanged (JSON 17.4→17.3 MiB; SQLite 17.0→17.1 MiB); transient memory must still be watched in a soak.

## Headroom and next work

**The supported four-kingdom configuration is not certified for 128 simultaneously active clients.** SQLite fixed-step p95 54.854 ms and p99 66.517 ms are below the 100 ms timer budget on this machine, but live polling/commands still cause about 1.18 seconds of lag. JSON p95 135.985 ms and p99 150.008 ms exceed that budget even before live HTTP traffic. No player cap was increased and no simulation events were skipped. The existing 0.25-second dt clamp remains; overload-induced lag is exposed rather than hidden.

Remaining costs: synchronous full-world persistence per accepted command/logistics debit; JSON backup validation/restoration on each save; large roughly 100–123 KB authenticated snapshots and per-client calculation/serialization; event-loop queuing; and fixed-order realm scheduling under burst load. SQLite reduces writes but does not eliminate full-world encoding. Save latency also varies with disk flush/JIT/GC and was not universally reduced (for example the 16-player JSON save median regressed).

Next is TM-084 mass-battle reliability and load: longer repeatable/open-loop authenticated workloads, high march counts and mixed tiers, multiple simultaneous sieges/rallies/garrisons, commander effects, realm fairness, snapshot interest management, and measured persistence batching or worker ownership that retains durable acknowledgments and crash-safe logistics. Avoid weakening backup validation, eliminating rollback, or delaying required durable transactions merely to improve timings.

## Correctness verification

- `node --test server/*.test.mjs`: 369 tests, 364 passed, 5 skipped, 0 failed. Five existing Linux packaging/symlink checks are skipped on Windows. Covers resources, troops, combat damage/healing, training, diplomacy/coalitions, kingdom isolation, fog, save compatibility/reconnect, events and season rollover.
- `node --test server/scalability.test.mjs`: 8 passed. Includes encoded graph equivalence, active-battle rollback, gathering debit/cargo conservation and recovery, simulation exceptions, roster lifecycle/restore, 650 exhaustive-versus-bounded fog comparisons, stale hidden static memory, and concurrent durable SQLite commands/restart/isolation.
- `python -X utf8 scripts/publish_task.py`: all 21 required regression commands passed, including six offline publication checks and 16,750 portable presentation contracts. The plan includes the new scalability tests. Presentation contracts are not Unity compilation/rendering.
- The existing realm HTTP test used an invalid synthetic rally that the live timer could remove between assertions. It now uses a valid owned stronghold rally fixture; the cross-realm rejection assertion remains intact.
- First restricted runs could not connect to localhost (EACCES); final HTTP tests and benchmarks ran with the required environment access. Early draft chat workload hit cooldown rejections and was replaced before the final baseline/optimized evidence. Neither failed exploratory run is represented as a successful load test.
- **Unity compilation, native gameplay, rendering/FPS, extensive manual playthrough and soak: NOT TESTED.** No Unity build was launched.

## Publication and private data

Commit 128022b, created by the user during this task, had added both private research workbooks to origin/main. This change removes them from tracking and adds ignore rules while retaining the exact local files (130,253 and 54,997 bytes). Their earlier committed contents remain in Git history; no force-push or history rewrite was attempted. Publication checks now permit deletion of an already-tracked forbidden path while still rejecting additions/modifications and rename destinations. Offline tests cover removal and continued addition rejection. The hook reminder test now uses an isolated temporary fixture instead of touching a real pending-publication marker.

No real kingdom or isolated playtest save was opened or migrated. `scripts/start-isolated-playtest.ps1` is unchanged. JSON backup validation, SQLite FULL synchronous transactions, command receipts and migration validators remain enabled. Disk saves still use existing schema 25 and health protocol 16.

## Exact changed files

- `.gitignore`
- `client/Assets/ThronesOfMyth/Editor/WindowsPlaytestBuilder.cs`
- `scripts/load-benchmark.mjs`
- `scripts/publish-tests.json`
- `scripts/publish_task.py`
- `scripts/test_publish_offline.py`
- `server/checkpoint.mjs`
- `server/discovery.mjs`
- `server/exploration.mjs`
- `server/http.mjs`
- `server/realms.mjs`
- `server/realms.test.mjs`
- `server/scalability.test.mjs`
- `server/world.mjs`
- `docs/tm-025-084-scalability.md`
- `docs/benchmarks/tm-025-084-baseline.json`
- `docs/benchmarks/tm-025-084-optimized.json`
- `research/V1_FUNCTIONAL_BACKLOG.md`
- `research/MYTH_feature_coverage_register.csv`
- `research/FUN-001-report.md`
- Untracked from Git, preserved locally: `research/Rise_of_Kingdoms_Call_of_Dragons_Complete_Reference.xlsx` and `research/Thrones_of_Myth_RoK_Video_Research_v1.xlsx`.
