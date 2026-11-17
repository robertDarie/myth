# Recovery E — progression correction design and unresolved requirements

<!-- parity
{
  "id": "RECOVERY-E-PROGRESSION-DESIGN",
  "description": "Dependency-ordered 25-level city, independent buildings, research, siege and commander progression specification",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "Candidate iOS US listing1.1.13.79 checked2026-11-16; reference table/version binding UNKNOWN",
  "checked": "2026-11-16",
  "status": "PLANNED",
  "parity": "Not yet verified",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-16", "classification": "VERIFIED"},
    {"url": "https://app.rokstats.online/buildings/city-hall", "checked": "2026-11-16", "classification": "VERIFIED"},
    {"url": "https://gacha-data.com/rise-of-kingdoms/technology/", "checked": "2026-11-16", "classification": "UNKNOWN"},
    {"url": "https://riseofkingdomsguides.com/talent-tree/", "checked": "2026-11-16", "classification": "CORROBORATED"}
  ],
  "numeric_references": [
    {"quantity": "Published building costs/base timers for26categories×25levels", "reference": "research/parity/audits/full-rok-audit/building-reference.csv;650source-linked observations", "classification": "VERIFIED", "treatment": "Published secondary table observations only; includes seasonal categories, not independent current-build proof"},
    {"quantity": "Level60 talent endpoint", "reference": "Task3 source registry corroborates74 vs local12", "classification": "CORROBORATED", "treatment": "Endpoint alone cannot define the complete per-level/star award curve"},
    {"quantity": "Complete prerequisites, power/output/capacity/research/modifier/star/siege tables", "reference": "Not established in the existing audit for the selected current reference version", "classification": "UNKNOWN", "treatment": "Essential implementation blocker; no extrapolation or prototype substitution"}
  ],
  "numeric_fixtures": [],
  "deviations": [{"decision": "Do not perform an isolated25-level or74-point constant change", "reason": "Would create incompatible prerequisites, capacities, economy and saves", "impact": "Existing progression remains a documented mismatch until coherent complete implementation", "authority": "Owner Critical Recovery E and Tasks7/8 explicitly prohibit isolated constants and arbitrary migration"}],
  "essential_unknowns": ["Version-bound full building/research prerequisite and output tables", "Commander per-level/star talent and material schedule", "Full20troop unlock/training/healing/capacity dependencies", "Reviewed old-five-age migration without lost entitlements or arbitrary free levels"],
  "acceptance_checks": [],
  "covers": ["server/city.mjs", "server/city-content.mjs", "server/progression.mjs", "server/troops.mjs", "server/numerics.mjs"],
  "coverage_ids": ["TM-041", "TM-057"]
}
-->

## Feature and RoK equivalent

City Hall/Citadel1–25; independently upgraded reference building roles; complete economic/military Academy trees; four troop classes×five tiers; level1–60/stars1–6/talent progression. Original mythology/visual eras remain presentation, not substitutes for functional levels or independent upgrade lanes.

## Reference version and sources

Checked2026-11-16. Apple US store directly displayed1.1.13.79; that is a candidate distribution baseline, not proof that unversioned community tables were extracted from it. Task3's650building observations and26page hashes remain canonical; do not duplicate private workbooks or imply a second independent source by copying that dataset. Seasonal crystal facilities must remain mode-scoped. The complete source/version limitations and AP conflicts are in the Task3 audit and recovery blockers.

## Verified mechanics and prerequisites

Published City Hall maximum25 and the level60talent endpoint74 are supported at the documented secondary/corroborated scope. Current local maximum5/12 is a confirmed mismatch. Complete prerequisite chains and modifiers are not established. Siege must have actual training, load, counters, promotion, wounds/healing and building warfare, not just names. T5 must require the entire verified research chain.

## Numeric reference

Canonical `../audits/full-rok-audit/building-reference.csv` contains food/wood/stone/gold/base_seconds with exactURLs/date per level; `reference-level-comparison.csv` records150CityHall comparisons; `parity-matrix.csv` and `exported-parameters.csv` record current prototype fields without falsely certifying them. Research/skill/star/capacity/power/output rows absent from reliable current evidence remain UNKNOWN. Every missing level must be an explicit contract gap, not an interpolated number labeled verified.

## Formulas and modifiers

Future typed job quotes must retain base cost/time, permanent/temporary modifiers, reference mode/version, rounding stages, charged resources, start/completion timestamps and refund policy. One quote is locked at admission; restart/offline catch-up and help/speedups cannot reprice or pay it twice. Modifier order/rounding must come from verified reference cases, not a convenient guessed universal expression. Help's published1%-remaining/minimum60seconds has separate technology/context limitations; current local10%-initial/minimum2seconds cannot be relabeled equivalent.

## Known uncertainties

All metadata essential_unknowns are open. Sources do not yet independently bind every cost/prerequisite/output or hidden combat interaction to the candidate version. Complete25level mechanical parity cannot be implemented responsibly by transplanting only the known cost/time cells. Source gathering remains work, not a permission to fill UNKNOWN with plausible values.

## Current Thrones of Myth behavior

Five functional Citadel ages and16other local buildings (builders has one rank),17technologies/42ranks,15trainable mortal class/tier IDs with no siege. Existing legal production policy reaches Citadel3at30simulated minutes,4atone hour,5later; pays infantryI–Vtraining and round-trips saves. All eleven commander profiles have original passives; localtalents=floor(level/5). Numerical/feature scope differs materially from the reference. See exact source-linked audit rather than historical completion headlines.

## Planned Thrones of Myth behavior

Dependency order:

1. Establish complete version/mode-scoped reference rows and formula examples; separate home kingdom, pre-KvK, KvK1/2/3, SoC, event/civilization/VIP/account age. Resolve conflicts before engine edits.
2. Define level1–25 city schema and independent building-role IDs while preserving original visual eras. No consolidation may erase reference upgrade independence. Separate Barracks, Archery Range, Stable and Siege Workshop roles from equipment crafting.
3. Build validated prerequisite DAGs for every building level and technology rank. Each unlock references stable IDs/ranks, not era comparisons. Academy progression, castle/wall/hospital requirements, march slots/capacity and T5 gates must be complete together.
4. Replace construction/research/training/healing quote evaluators with source-bound typed tables and modifier cases; preserve charges/refunds/conservation/offline completion. Resource production/gathering/load/trade/storage must support those costs without unearned credits.
5. Integrate all20baseline class/tier combinations and applicable civilization variants through training buildings, prerequisites, reserves, capacity, promotion, hospitals, counters, siege/structure warfare and UI. No superficial siege label.
6. Implement complete commander XP/star/material/talent curves and primary/secondary applicable effects with owned progression preserved.74at60alone is insufficient. Active sequencing/stacking remains independently blocked.
7. Run same-account paid level1–5→6–15→16–25 trajectories using production-equivalent clock only; explicit negative/boundary cases for every gate, exact deductions/timers, offline/replay/migration and usable native interfaces.

## Differences and project decisions

No new gameplay deviation or numerical rebuild is approved by this design record. It makes required work reviewable without fabricating missing values. Current prototype rules remain parity gaps. Original names/assets/currencies are preserved; Mana/Aether cannot stand in for missing reference economy behavior. All future deliberate mechanical differences require explicit owner approval and remain gaps until then.

## Systems affected

City/building definitions and cards, research DAGs, troop roster/training, commander capacity/talents, economy/gathering/storage/trade, jobs/help/speedups, hospital/casualties, power/rankings/rewards, tutorial/native panels and persistence. Pass access, rally/garrison capacity and season eligibility also depend on progression and must be included in acceptance.

## Save migration

**Not implemented; no schema bump or real-save edit.** Preserve original serialized bytes/backups and test actual old-schema fixtures. A future content-version migration must conserve resources, units/deployed/reserves/wounded, queues/refunds, commanders/XP/skills/talents/gear, inventory, positions, alliances, reports and entitlements; validate conservation before committing once-only version markers. Do not map oldage5straight tolevel25 or silently strip old T5 unlocks. Unreviewed grandfathered unlocks would themselves be a parity deviation; keeping legacy realms separate is another possible compatibility strategy, not an approved decision. A final deterministic mapping/compatibility policy requires a complete reference model and explicit recorded owner decision. Build rollback tests before conversion; never overwrite the user's real kingdom to try it.

## Acceptance tests

Before IMPLEMENTED, fixtures must bind exact numeric/table comparisons for every relevant level/rank and modifier. Real-command trajectories must show actual intermediate balances, quotes and elapsed simulation time, with no direct resource/XP/position/unlock mutation. Separately label mature boundary fixtures, native interactions and3/10authenticated-client scenarios. Include repeated restart/migration/cancellation/help/replay and impossible-prerequisite rejection. No test may change reference expectations simply to preserve old prototype behavior.

## Implementation status

PLANNED/BLOCKED BY REFERENCE DEPENDENCIES. Detailed dependency/migration design delivered; complete referenced numeric specification and actual25-level/20-troop implementation are not complete. No unauthorized gameplay rewrite. Later task reports must retain these missing prerequisites instead of marking Tasks7–10done.
