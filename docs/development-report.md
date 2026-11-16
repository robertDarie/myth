# Development report — 2026-11-16

## Task 4 — executed playable-alpha QA

Tested clean gameplay/client `f5c0cdf75af286c33a9c116f46139ee40c8fbce1`. **NOT READY — BLOCKERS REMAIN.** Delivered the four required reports, a 41-row evidence-axis matrix and sanitized reproducible evidence under `docs/qa/`. All three supplied independent retest reports reviewed; prior Linux results remain attributed, not silently re-certified.

Built Windows client-only Unity6000.3.0f1, exit0; package verified145 files/protocol17/clean identity. Actual Windows guest/civilization/city entry, own-city camera, paid Citadel2 completion, 100-infantry queue/debit and world switch observed. Further native input blocked by tool detecting user input; controlled zoom, other resolutions, training completion, combat, native recovery/FPS/audio remain NOT TESTED. One native client, zero remote friends. Isolated native QA process/world left under user control; real saves and port8091 untouched.

New fresh HTTP runner passed20/20 checks for JSON3 players and SQLite10: roles/chat/help/trade, foreign army/realm authority, replay/concurrent training, legal root garrison, actual process shutdown/restart/resume. Setup109 accelerated production seconds explicitly labeled. SQLite120.80-second movement/poll soak:10 clients,0 battles, snapshot p95 74.27ms, command p95 144.23ms, peak sampled RSS205234176bytes. Separate prepared large-world benchmark measures4 concurrent battles with10 HTTP clients and32/128/256 registered cities; no256-active-player or legitimate-progression claim.

Production progression tool ran independently through827 accepted commands and six save-round-tripped milestones: Citadel3 at30 simulated minutes,4 atone hour,5 later; later offline reconnect policy is explicitly distinguished from combat. Four critical recovery probes still FAIL. Full server regression:398 tests,393pass,0fail,5platform skips,53712.57ms. No production gameplay source, schema, protocol or balance changed. Only test/documentation tools added, plus optional progression output argument. No game bug is claimed fixed. Updated existing TM-001/TM-057 evidence without rewriting historical audit data.

Publication plan extended from32 to34 required checks: dated QA evidence integrity plus a short fresh HTTP restart smoke. Research gate and guarded publisher must pass and remote SHA must be confirmed. QA completion does not certify numerical or functional RoK parity. Stop at Task4; Recovery A has not started.

## Resumed Task3 execution

Audited HEAD/origin main `384d023030fa42922f62ed56175147e48b75fb4e`. Expanded the actual audit files:124 behavior groups/17 subsystems,44 source modules,784 register dispositions,1,859 exported numeric fields,258 function records,650 published building-level observations,150 City Hall comparison rows, a10-sheet workbook and production-command progression/purchase evidence through local maxima and infantryT5. References are partial and source confidence/unknowns are explicit. No exact live-game version, hidden formula, native client or remote-player claim is made.

Executed `scripts/parity-audit-inventory.py`, `parity-audit-parameters.mjs`, `parity-audit-buildings.py`, `parity-audit-reference.mjs`, refreshed `parity-audit-baseline.mjs`, and `parity-audit-progression.mjs`. The progression run uses production quarter-second ticks for the first hour and production offline city catch-up thereafter; six milestones restart safely. Captured actual costs/timers, observed100T1 completion and paid training throughT5. It is not offline field combat or a native playthrough.

Found a genuinely flaky existing kingdom HTTP privacy test: random cities could validly see the gate that the test assumed was hidden. Fixed only its spawn fixture; retained its assertions and all production validation. Red full run:392 pass/1 fail/5 skips. Focused green:7/7. Full green:393 pass/0 fail/5 existing platform skips,398 tests,24,172.8278ms. No production source, schema, protocol or real-save migration changed.

`check-parity-audit.py` and new `check-parity-audit-scope.py` validate all canonical data and all expanded workbook views. Formula error scan found no matches; all new sheets and the changed cover were rendered/visually inspected, with clipped feature-gap columns corrected. Source/table consistency caught a level23 timer transcription error before publication. AP evidence was corrected to CONFLICTING after investigating competing published baselines; AP code was not changed.

The mandatory plan now includes32 checks. The pre-publication run passed all32, including16,757 portable C# contracts and the research gate's three bound numerical checks. Both dataset validators pass again after the final all-resource comparison update. Guarded publication reruns the plan and must independently confirm the remote SHA before publication is reported complete. Full reference verification remains incomplete, with the exact current-client and independent evidence requirements enumerated in the audit. No later implementation task was started, and no application job was created for the previously supplied prompts.

---

## Earlier initial checkpoint

Status: **Task 3 IN PROGRESS; Task 4 and recovery A–F queued. Verified initial audit/fixture-maintenance checkpoint.**

User clarified that the full RoK audit and playable-alpha QA must precede the new recovery implementation. Fetched origin/main and confirmed local main at `1e345c6347f0d8673a541b68768eb5450742656c`. No gameplay source or real save has been edited.

Created the initial `research/parity/audits/full-rok-audit/` baseline and two read-only audit tools. `FULL_PARITY_AUDIT.md` records the exact scope, red diagnostics, source access limitations and unfinished deliverables. Existing historical register/test claims are not upgraded to current functional or parity certification.

Executed:

- `node scripts/parity-audit-baseline.mjs research/parity/audits/full-rok-audit`: extracted 1,187 local parameter/level records; four reconstructed gameplay requirements FAIL. Includes a fresh in-memory save/reload smoke. All prepared fixture state is disclosed.
- `python -X utf8 scripts/check-parity-audit.py`: PASS dataset consistency, 10 source-supported rows / 1,177 UNKNOWN rows. This does not certify external source truth or full audit coverage.
- `node --test --test-concurrency=4`, from `server/`, Node 24.18.0, loopback-capable run: 397 tests, 388 PASS, 4 FAIL, 5 existing platform skips, 0 cancelled, 29,358.7714 ms. All failures are Forsaken patrol validation on restore; exact tests/root-path evidence are in the audit report. Earlier sandbox-restricted run was interrupted and is not a passing test run.
- `python -X utf8 scripts/check_parity.py`: PASS for current non-gameplay scope; 2 registered feature documents, 0 changed gameplay paths, 0 bound numeric checks. This result does not certify the new incomplete audit or validate all gameplay.

The four baseline failures were traced to the authored combat fixture moving its camp without the patrol anchor/target/province. Test-only maintenance now relocates that frame together; all existing assertions and production validators remain. Added a round-trip plus malformed-patrol rejection check. Focused Forsaken suite: 8 passed. Full post-correction server suite: **398 tests, 393 passed, 0 failed, 5 existing platform skips, 29,083.3209 ms**. This does not fix the four gameplay defects.

`python -X utf8 scripts/publish_task.py`: **31 required checks passed**, including 16,757 portable C# presentation contracts. Initial three-sheet XLSX exported, summary counts recalculated, no formula errors found, and all three sheet previews visually inspected. Its cover explicitly says IN PROGRESS. Comprehensive audit coverage is still unfinished.

Not executed: new Unity compilation, native Windows interaction, remote human multiplayer, legal long-term progression. Publication must use the guarded push and verify the remote SHA before being called complete. No real saves or gameplay source changed.
