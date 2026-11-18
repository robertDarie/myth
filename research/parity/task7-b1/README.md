# Task7 B1 checkpoint result

Starting main: b811ef82d96a3b903525751340b63ccfa8544d93. This checkpoint implements working isolated experimental city actions; full Task7 and normal25-level activation remain incomplete.

## Working behavior

Eleven independent identities with explicit25-row supplied tables: Citadel, four producers, four trainers, Academy and market. Real authenticated commands pay resources, enforce prerequisites/workers/lanes, complete jobs, apply effects, collect individual production storage, train experimental reserves, research and transfer resources between isolated accounts. Supplied modifier policies are explicit TEST_ONLY semantics. Normal World/server/Unity is not wired to this engine. No incomplete reference profile is enabled for normal new cities.

Eleven tests exercise validation, payments, quotes, independent queues, research, transfer authorization, replay, offline event boundaries and disk restart.270paid upgrades using540commands reach all11buildingLv25 in11670simulated seconds. The declared synthetic initial state has zeroresources, Citadel1 and fourLv1producers; all subsequent progress is funded by simulated production/collection. It is not RoK birth progression. PreparedQuarrying1 test starts from explicit Academy1/resources, pays100food+100wood and completes in60base seconds/+5power; only its recorded unlock state is tested, not native map gathering.

## Evidence and limits

SOURCE_REVIEW.md records all six requested sources plus supplements and access/lineage limits. requirements-matrix.json reuses650historical source rows, explicitly shows UNKNOWN fields and captures conflicts. Fifteen new published technology scalar observations are merged into canonical references without replacing conflicts. Longest fully established fresh RoK CityHall slice:0levels. Current-city birth, CH2/3 requirements, first Academy CH4vs6/2svs6s, dependent effects/power, full technology DAG and modifier/economy rules remain essential blockers for complete Task7.

Legacy conservation:2720original-source card comparisons over8synthetic historical saves;53normal legacy commands reach Citadel5 in3965simulated seconds. Experimental saves have a separate fingerprinted format; normal-save overwrite and cross-format load are rejected. Real saves are never used. No old-to-new conversion; Option1 remains in force.

Actual experimental browser actions passed create/collect/Citadel upgrade/Barracks/train reserve. Screenshot and sanitized command ledger are under docs/qa/evidence/task7-b1/. Native Unity NOT TESTED for this checkpoint. Frozen Creator Preview unchanged. No Tasks8–10 implementation.

## Run the disposable interactive sandbox

From repository root run:

```powershell
node scripts/run_reference_city_sandbox.mjs --synthetic-engine --clock-rate 60
```

Open the printed loopback URL ending /experimental/. The banner explicitly identifies synthetic engine capability. Click Create experimental city, wait a few seconds, Collect production, then Upgrade on Citadel. After completion, upgrade Barracks and Train one experimental unit. Observe resource debit, paid job and completed reserve. Producers expose individual Collect buttons; Academy/test research has its own queue. Transfer is an authenticated experimental command tested at engine/API level; no native trade UI is claimed. Server controls time; no client clock command. Ctrl+C closes this in-memory sandbox and discards its world. It never loads or writes a normal kingdom save.

Run `node --test server/reference-city.test.mjs` for focused functional checks and `python -X utf8 scripts/check-task7-b1-evidence.py` for reproducible matrix/progression evidence. Required publication plan includes both plus legacy conservation and all existing checks. These cannot establish external source truth or full reference parity.

## Defects found during implementation

Writable-descriptor fsync fixes reproduced Windows EPERM from read-only save flushing. Paid training now records its original facility level: upgrading that facility while training must not reinterpret a paid cost/timer on reload. A reconstructed prior implementation fails the dedicated regression with Invalid saved training ledger; corrected implementation completes original paid units exactly once. These are isolated experimental persistence fixes, with no normal balance change.


B1 follow-up: reproduced and removed an implicit matching-Cityhall-level cap from the generic engine. Explicit supplied row prerequisites now exclusively govern eligibility; this allows reference tables whose building levels differ from CityHall. Regression red on f6d915f, green with11engine tests. Synthetic270-upgrade ledger unchanged. Initial checkpoint f6d915f passed all55publication checks and confirmed origin/main; follow-up reruns the same required plan. No normal-source values or frozen package changed.
