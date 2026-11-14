# Thrones of Myth development instructions

**NO NEW GAMEPLAY FEATURE OR NUMERICAL BALANCE CHANGE WITHOUT REFERENCE RESEARCH, EVIDENCE CLASSIFICATION, AND A DOCUMENTED IMPLEMENTATION PLAN.**

- Follow the authoritative [research-first policy](research/parity/README.md), effective 2026-11-14. Rise of Kingdoms is the primary mechanical/numerical reference; keep Call of Dragons evidence separate.
- Before relevant implementation: identify the equivalent, verify sources, compare actual values/dependencies, document decisions/migrations and define expected formulas/tests in `research/parity/features/` using `FEATURE_TEMPLATE.md`.
- Classify every researched quantity as VERIFIED, CORROBORATED, ESTIMATED, UNKNOWN or CONFLICTING, with exact URLs/date. Never present an unpublished formula or unsupported drop rate as exact parity. Report essential unverified requirements before substituting speculation.
- Preserve original mythology, cultures, units, buildings, visuals, UI and product decisions. Mana is ordinary; Aether is premium. Record intentional deviations and their impact.
- Unrelated bug fixes, formatting, security and infrastructure do not require invented RoK research. Explain an exemption if a gameplay source file changes for one of these reasons.
- Apply this immediately to remaining Forsaken work; preserve existing drafts, validate reference fixtures, distinguish approximations and record migrations before finalizing.
- Work on `main` only; fetch/compare `origin/main`. No extra worktrees, force pushes, skipped checks or paid external services.
- Run the research gate, required publication plan and relevant regressions; update evidence, `research/V1_FUNCTIONAL_BACKLOG.md`, coverage register and development report. Commit verified scope, run `python -X utf8 scripts/publish_task.py --push`, then verify remote SHA. Do not call an unconfirmed push complete.
- Preserve real saves and other work. Never commit private research workbooks, credentials, secrets, saves, databases or generated builds. A source workbook is an input, not independent verification.

Workflow: RESEARCH → VERIFY → COMPARE → DESIGN → TEST EXPECTED FORMULAS → IMPLEMENT → VALIDATE → UPDATE REFERENCE DOCUMENT → COMMIT → PUSH origin/main → VERIFY REMOTE SHA.
