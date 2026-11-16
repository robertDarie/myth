# Task 3 audit workspace

**IN PROGRESS.** Start with [FULL_PARITY_AUDIT.md](FULL_PARITY_AUDIT.md). Do not treat file presence or extracted row counts as completed audit coverage.

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

`RoK_vs_Thrones_of_Myth_Master_Parity_Audit.xlsx` is an initial three-sheet workbook of this limited dataset, with filterable comparisons, recalculated counts and gameplay FAIL diagnostics. All sheets were rendered and visually inspected. The full source-linked inventory, remaining numerical comparisons, progression simulations and independent review are unfinished. Task 4 and recovery remain queued. The required 31-check publication plan passes for this baseline checkpoint; it does not certify full audit completion.
