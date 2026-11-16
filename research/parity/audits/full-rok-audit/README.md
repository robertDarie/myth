# Task 3 audit workspace

Start with the current section of [FULL_PARITY_AUDIT.md](FULL_PARITY_AUDIT.md), [SUBSYSTEM_AUDIT.md](SUBSYSTEM_AUDIT.md) and [PROGRESSION_SIMULATIONS.md](PROGRESSION_SIMULATIONS.md). The expanded audit is delivered for review; full reference/numerical verification remains incomplete. No full-parity certificate or implementation approval is implied.

- [parity-matrix.csv](parity-matrix.csv): initial parameter/level dataset, including blank UNKNOWN reference cells.
- [matrix.json](matrix.json): typed intermediate with identical rows for the future workbook and validator.
- [diagnostics.json](diagnostics.json): reconstructed production-engine defect observations. FAIL is a gameplay failure.
- [ROK_SOURCES.md](ROK_SOURCES.md): actual source accesses and limitations.
- [FORMULA_COMPARISON.md](FORMULA_COMPARISON.md): initial local formulas, examples and reference uncertainty.
- [CORRECTION_ROADMAP.md](CORRECTION_ROADMAP.md): dependency/migration work, not implementation approval.
- [UNVERIFIED_MECHANICS.md](UNVERIFIED_MECHANICS.md): evidence still required.

Reproduce from the repository root:

```powershell
node scripts/parity-audit-baseline.mjs work/task3/reproduced
python -X utf8 scripts/check-parity-audit.py
```

The extractor's default output is ignored `work/task3/baseline`. Passing the audit directory explicitly refreshes the tracked candidate dataset. Its metadata records the actual source HEAD. It never opens real saves or network ports. Prepared levels/coordinates/XP are expressly fixture inputs, not legal player progression.

## Expanded artifacts

`feature-inventory.csv` has124 behavior groups across17 subsystems; `subsystems.json` owns that grouping. `source-module-inventory.csv` lists44 server modules, and `coverage-reconciliation.csv` retains all784 mixed register rows. `exported-parameters.csv` has1,859 numeric definition fields; `formula-index.csv` indexes258 functions, not258 verified mathematical equations.

`building-reference.csv` contains650 base-cost/time rows with exact URLs/dates; `building-source-access.json` records26 actual page reads/hashes. `reference-observations.json` and `reference-level-comparison.csv`/JSON hold the25-level City Hall comparison and source conflicts. `progression-results.json` holds the fresh production-command purchase ledger and six restart-checked milestones. These datasets overlap; do not add their counts into a fabricated denominator.

The workbook now has10 sheets. Its views are filterable, recalculated and rendered for inspection; both comparison matrices and all seven expanded views are reconciled against their canonical data. Original gameplay diagnostics remain FAIL.

Additional reproduction commands, from repository root:

```powershell
python -X utf8 scripts/parity-audit-inventory.py
node scripts/parity-audit-parameters.mjs
node scripts/parity-audit-progression.mjs
node scripts/parity-audit-reference.mjs
python -X utf8 scripts/check-parity-audit-scope.py
```

The building collector reads public sources: `python -X utf8 scripts/parity-audit-buildings.py`. It retains numeric facts and hashes, not full creative pages. Its checked date identifies this audit; a later research run must update/review dates and source changes.

Workbook authoring uses the bundled artifact-tool packages linked at ignored `work/task3/node_modules`, per the spreadsheets skill. Run `python scripts/prepare-parity-workbook.py`, then `node scripts/build-parity-audit-workbook.mjs`; payloads/previews stay ignored. Recalculate, render and run both validators before publication. None of these tools opens real saves or changes gameplay. The post-hour simulation advances offline city rules, not offline combat.

Exact live-version evidence, hidden formulas, complete prerequisite/material/modifier tables and reference trajectories remain unresolved. Task4 and recovery implementation have not started. Follow Task3's independent-review requirement before implementing corrections; application scheduling has not been created.
