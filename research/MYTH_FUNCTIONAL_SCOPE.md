# THRONES OF MYTH — FUNCTIONAL-FIRST DEVELOPMENT CONTRACT

**Status:** Working development directive, 12 November 2026.  
**Scope:** Two attached reference workbooks; current source code is the authority for what is implemented.  
**Goal:** All selected gameplay functions and player-facing flows from the workbooks work end-to-end and survive persistence, multiplayer and regression tests **before** 3D production.

## 1. Source documents and traceability

- `Thrones_of_Myth_RoK_Video_Research_v1(1).xlsx`: `Feature Matrix` IDs TM-001–TM-097, `Cursor Roadmap`, `Numeric Anchors`, and other contextual sheets.
- `Rise_of_Kingdoms_Call_of_Dragons_Complete_Reference.xlsx`: indexed requirements in sheets `02 UI Screen Atlas` through `17 Open Questions`, plus comparative research.
- `MYTH_feature_coverage_register.csv`: initial export of all indexed entries, with *unverified* source assessments and proposed lane classifications. It is a coverage tool, **not** a verified implementation audit.
- Source workbook statements such as "Reported implemented" and v0.45 formulas are **not proof of current functionality**. Inspect the current main branch and any explicitly relevant active branches.
- Source evidence may describe RoK/CoD observations, proposals, or questions: do not mistake those for mandatory exact mechanics. Create an original Thrones of Myth design; do not copy proprietary assets, data or balance values.

## 2. Scope and phase order

### Phase 0 — Audit and foundational reliability (first)
1. Read every indexed entry and produce a source-linked requirement ledger: ID, dependency, expected behavior, current implementation (exact paths/symbols), honest status, tests/evidence, priority and acceptance criteria.
2. Classify as `Already working and verified`, `Partial`, `Missing`, `Broken`, `Deferred 3D/visual`, `Research only`, or `Needs design approval`. **Do not** mark feature `Done` merely because a class, method, endpoint or screen exists.
3. Verify account/session persistence, realm ownership, resource ledger, inventory, server-authoritative timers, job settlement, idempotency, save migrations, and reconnect.
4. Protect fundamental invariants: balances never below zero; no duplicated rewards/units; troop conservation; stale orders rejected; protected fog information not sent; authorization checked; client clocks not authoritative.
5. Baseline automated tests; clearly separate *actually executed* Unity/native rendering QA from portable C#/server checks.

### Phase 1 — Self-contained playable kingdom
- Resources and economy: production, collection caps, gather/return, spending, packs, reward ledgers, offline accrual, market/trade where defined.
- City: all actual building types, tiered levels, prerequisite graph, unlocks, construction slots, helpers, durations, upgrades and state persistence.
- Research: economic and military trees, gating, buffs, queue logic, cancellations and speedups.
- Troops: owned vs available vs deployed vs wounded vs reserved vs killed; separate troop storage/city population, **per-march capacity**, **training batch**, **march slots**, **reinforcement cap**, and **hospital space**; training, tiers, promotion and healing.
- Commanders: rarity, XP/levels/stars/skills, talents/respec, pairings, equipment/armaments, stat effects and inventory flow. Use placeholder portraits/models.
- Map: visibility and fog authorization, exploration, scouting, settlement discovery, PvE, routes, gather nodes, march/return/retarget and combat reports.
- Combat: deterministic server-authoritative settlement, troop-class counters, skills, battle casualties/wounded/dead and reward distribution.
- Functional UI: all menus, buttons, states, disabled reasons, warnings, lists, progression and reports work with real data and sensible controls. Temporary visuals are acceptable.

### Phase 2 — Multiplayer, strategic competition and retention
- Alliances: creation, membership, role-based permissions, aid, donations, gifts, territory, reinforcements, garrisons, rallies and diplomacy.
- Server/realm operations: world synchronization, interest and fog isolation, deterministic timing, player reconnection and concurrent action safety.
- Quest/tutorial: first minutes, first day, weekly goals, completion persistence, no duplicate claims.
- Events/seasons: eligibility, reset scopes, ranked rewards, milestones, event hub, world ages and migration controls.
- Economy safeguards: fair free progression, optional premium entitlements, receipt verification only when commerce is actually activated, refunds and fraud-resistant ledgers.
- Operational readiness: simulations, soak tests, profiling, admin tools, audit logs, migrations and recovery.

### Phase 3 — Long-term functionality and release hardening
- Complete remaining approved functional requirements from all reference sheets, including advanced boss raids, cooperative combat, pets/artifacts, advanced social systems, telemetry, anti-abuse, seasonal world operation and large-map load constraints.
- Prove 1-hour, 24-hour, 7-day and 30-day simulation balance, and multiplayer race conditions.
- Native Windows/Linux functional playtest and final bug fixing.

### Separate future phase — 3D art with user
Defer custom meshes, 3D buildings, rigging, textures, polished ability VFX, commander stages, animation production, environment decoration and cinematic presentation. Keep simple placeholders and clean data/view separation so assets can be replaced later. **Do not defer actual input, accessibility, information hierarchy, map commands, or core UI usability.**

## 3. Critical examples from the workbooks

- **TM-037 / TM-027 / troop capacity:** distinguish total owned troops, available garrison units, deployed units, per-army capacity, dispatch slots, training batch and reinforcement cap. The video workbook itself cautions that RoK's displayed unit capacity must not be equated with ToM's reported city storage cap. Implement independent domain models, documented formulas and tests rather than blindly copying example numbers.
- **TM-095 / TM-101:** save migration and guide progress must be monotonic across restarts; validate initial onboarding guide never regresses after reconnect.
- **15-047–15-055:** nonnegative balances, troop conservation, at-most-once job settlement, legal march command sequencing, server time, preservation of permanent state, ownership ACLs and deterministic battles.
- **16-006–16-012:** atomic ledger, durable timers, offline production, training once, shared world state, gathering single payout, reproducible NPC battles.
- **16-014–16-024:** research graph, troop classes, simultaneous marches, hospital, leader progression, fog, alliance permission, usable interface, 7-day rewards, telemetry.
- **16-026–16-035:** territory, rallies/garrisons, seasons, competitive events, economy, equipment, content versioning and live operations.

## 4. Acceptance contract — every functional item

An item is `Done` only when all applicable gates pass:
1. Real game behavior works end-to-end (not a demo screen or mock data).
2. State and commands are authoritative on the correct server/service boundary.
3. State is persisted and recovers on quit/relaunch, disconnect and server restart.
4. Concurrency, retry, duplicate submission, failure and permission edge cases are covered.
5. Real visible UI controls can trigger action; success, error, progress and completion states reflect actual data.
6. Automated tests and/or reproducible manual evidence exist; no fabricated tests.
7. Existing saves, world protocol/content formats, and prior gameplay paths are preserved or migrated safely.
8. Traceability register contains source IDs, exact code references, and the test commands and results. A paid review is not required.
9. Native Unity checks or real player QA are explicitly marked `Not run` until performed.

Use statuses `Unverified`, `Audited working`, `Needs implementation`, `In progress`, `Code complete/untested native`, `Verified`, `Blocked`, `Deferred visual`, `Design decision`. Do not mark `Verified` without the tests that actually ran. The paid OpenAI reviewer is disabled and is not a gate.

## 5. Development loop

1. Cursor reads the register, latest source and existing tests; chooses a small dependency-safe vertical slice.
2. Cursor defines observable acceptance tests before changing gameplay, implements the slice, runs the tests and records the exact commands.
3. The paid OpenAI API reviewer stays disabled. Do not call it, and do not wait for it before the next functional task.
4. When the tests for that task pass, commit and push from the main worktree with `scripts/publish_task.py`. Do not push a failing test, and do not force-push.
5. Keep roadmap and coverage register updated in the same commit, never mark an entire area done from test names alone.
6. Ask the user only for material design choices that would change game identity or economy; do not block routine implementation on cosmetic choices.

## 6. Immediate next Cursor task

**Task FUN-001: Verified implementation inventory + first working gap.**

- Locate both workbooks and master register in the repo; if not present, request the files rather than fabricating contents.
- Audit latest code and tests against all tracked entries. Start with system architecture, `TM-027`, `TM-037`, `TM-064`, `TM-095`, `TM-101`, and `15-047` through `15-055`.
- Produce a dependency-ordered, source-ID-linked functional backlog and select the first critical incomplete vertical slice.
- Implement that slice end to end, with automated regression and multi-session/reconnect coverage where relevant.
- Provide exact code and test evidence. Do not send the diff to a paid API.
- **Do not spend development time on custom 3D models, animation, lighting or asset creation.**

## 7. Integration note

The paid OpenAI reviewer is off under the zero-extra-spending rule. Automated tests and the coverage register are the record of what was checked. Unity play is pending until a player build is actually run.
