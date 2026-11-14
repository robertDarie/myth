# Research-first engineering policy

Effective **2026-11-14**, by explicit user decision. This is the authoritative policy; root `AGENTS.md` and Cursor rules link here. It supersedes the prototype-first numerical guidance in the historical adaptation plan. It does not retroactively certify or rebalance existing mechanics.

**NO NEW GAMEPLAY FEATURE OR NUMERICAL BALANCE CHANGE WITHOUT REFERENCE RESEARCH, EVIDENCE CLASSIFICATION, AND A DOCUMENTED IMPLEMENTATION PLAN.**

## Scope

Apply to troops/training/promotion; commanders/XP/skills/talents; damage/defense/health/wounds; cities/buildings/construction; research/costs/timers; march capacity/formations; gathering/production; AP/energy; PvE/PvP/rallies/forts/bosses; alliances/technology/membership/territory; kingdom progression/events/seasons; power/rankings/rewards; and other mechanics with a comparable RoK or Call of Dragons feature.

Do not manufacture research work for unrelated bug fixes, formatting, security patches, asset presentation or infrastructure maintenance. A fix that changes numerical behavior still needs its expected behavior and tests; if it only restores previously documented behavior, update that existing evidence instead of inventing a new feature. Exact code meaning cannot be classified automatically.

## Required sequence before implementation

1. Identify the Rise of Kingdoms equivalent and the relevant player/UI sequence. Call of Dragons is secondary; use a separate evidence document and explicitly compare adaptations.
2. Research prerequisites, unlocks, every relevant level, numbers, formulas, multipliers, costs, timers, limits, drops/rewards, player/combat interactions, exceptions and version-dependent behavior.
3. Prefer current official information/direct in-game observations, then reproducible measurements/screenshots, then independently corroborated tables, then community/reverse-engineering research. Corroborate consequential values independently where possible. Record actual access limitations and reference version/date; do not imply a current live-game check when only indexed tables were available.
4. Compare the reference with current ToM values and behavior. Record exact differences, chosen adaptation, coupled systems, save compatibility and downstream effects. Never transplant120000 recommended soldiers into a340-soldier progression, or alter displayed power without real troop/combat state.
5. Write the implementation plan and acceptance conditions **before new gameplay edits**: expected formulas/outputs, complete applicable tables, modifiers, negative cases, representative engine simulations and migration/rollback tests. Create deterministic reference-fixture/formula assertions first and record calculated expected outputs before implementing the gameplay path. Then implement and measure. A draft that predates this policy must complete this record before further numerical changes/finalization; do not falsify its chronology.

Use `features/<stable-feature-id-or-slug>.md`, starting from [FEATURE_TEMPLATE.md](FEATURE_TEMPLATE.md). Link existing source tables/fixtures and earlier research rather than copying hundreds of workbook entries. Source workbooks are inventories, not proof of correctness. The registry lists documents and explicit non-gameplay exemptions; each document owns its covered paths and check bindings.

## Evidence labels and parity status

Every researched quantity needs an exact source URL, date checked and one label:

- **VERIFIED:** directly supported by credible evidence. State evidence type/version; one fan table does not become official or independently corroborated.
- **CORROBORATED:** multiple independent credible sources support it; two copies of one table are not independent.
- **ESTIMATED:** derived from measured observations or an explicitly documented approximation; provide method and limits.
- **UNKNOWN:** not reliably established. Missing source data remains missing.
- **CONFLICTING:** credible sources disagree. Retain both/context and explain treatment; do not pick the convenient result silently.

A feature's separate status is **Verified parity**, **Partial parity**, **Different by design** or **Not yet verified**. Full numerical equivalence requires evidence for the entire claimed scope. Estimates/unknowns/conflicts or deviations cannot be labeled Verified parity by the gate. Record the project decision, authority, reason and impact for each deviation. Unknown/estimated formulas are never presented as parity merely because they are disclosed. If an exact unknown is essential, report the blocker before implementing a speculative substitute. Nonessential original rules require an explicit documented decision and remain different/partial, not exact.

Verified, relevant rules default to the reference progression and behavior, with coherent dependency changes and safe migration. Preserve original ToM lore, mythology/civilizations, units/commanders, institutions, assets, UI, currencies and deliberate product decisions. Mana remains ordinary and Aether premium; this policy authorizes no monetization change.

## Publication gate

`python -X utf8 scripts/check_parity.py` checks required documents/sections, labels/dates, fixtures, decisions, coverage IDs and registered acceptance commands. For active implemented evidence it runs the bound tests from `scripts/publish-tests.json`, including a fresh175-battle comparison against the recorded Forsaken numerical fixture. No external service is called.

The gate inspects staged/unstaged/untracked changes and commits ahead of `origin/main`. Gameplay candidates are server mechanic modules/data and client scripts. Clearly identified server storage/auth/HTTP/metrics infrastructure, tests, docs, tooling and presentation builders are exempt automatically. Other bug-fix/formatting/security/infrastructure changes in candidate files need an explicit reason in the registry's `exemptions`, updated in that publication. This is an accountable classification, not a hidden skip flag.

Each gameplay candidate must be covered by an **updated, IMPLEMENTED** evidence document in the publication, or an explained non-gameplay exemption. A PLANNED/IN_PROGRESS document cannot authorize a gameplay publication. Unknown essential requirements block implementation-ready status. Numeric fixtures must exist and bind to registered tests; absent checks or failing measurements fail publication. A metadata-only mode is used inside the test plan to avoid recursive checks; the publisher itself always runs the full gate, even with a custom test plan.

`publish_task.py` retains clean-tree/main-only/privacy/fast-forward/remote-confirmation protections. The gate cannot prove external sources are true, that a test covers every new rule, that an exemption is honest, or that a reused document actually describes the full diff. Human/independent evidence and code review remain required. No blanket retrospective audit is implied.

After validation: update the evidence status/results, backlog, coverage register (including parity status) and development report; commit verified scope; run the existing guarded publication command; verify `HEAD == origin/main`. No force pushes, private files, generated builds, real-save edits or paid services.

## Existing work and current Forsaken task

The published numeric foundation and ordinary Forsaken combat are **Partial parity**. Source troop/power/AP/XP facts, missing/conflicting data, original aggregate combat, five-age mapping, conversion and reward decisions are indexed in [Forsaken numerical evidence](features/forsaken-numerics.md). Building/research power, prototype casualty behavior and older unrelated mechanics are not retroactively verified.

The unpublished population/patrol/search draft is **Not yet verified**. Its [research/acceptance record](features/forsaken-population.md) identifies the remaining pre-finalization work. Exact hidden spawn probabilities/patrol radii are not essential reference constants in the earlier user brief; tunable ToM rules are allowed only as recorded deviations, with real visibility, movement, bounds, density, restart and performance tests. Special encounters require separate type-specific research; ordinary levels cannot stand in for fort/keep/guardian/event evidence.

Permanent sequence: RESEARCH → VERIFY → COMPARE → DESIGN → TEST EXPECTED FORMULAS → IMPLEMENT → VALIDATE → UPDATE REFERENCE DOCUMENT → COMMIT → PUSH origin/main → VERIFY REMOTE SHA.
