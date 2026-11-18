# B1 execution design — before implementation,2026-11-18

Starting b811ef82d96a3b903525751340b63ccfa8544d93. Owner B1 explicitly authorizes isolated experimental profiles and synthetic25-level ENGINE CAPABILITY testing; incomplete profiles must never activate for normal new cities or legacy saves. Existing Option1 remains unchanged. No Creator Preview file is overwritten.

## Implementation boundary

Implement a reusable authoritative experimental city engine under server/, using city-policy.mjs table compilation. This separate experimental realm has its own authentication, command receipts, snapshots and save format; it is not imported by normal Server/index.mjs and cannot grant normal multiplayer resources/units/visibility/access. It requires explicit experimental opt-in. Profile values drive independent cityhall, four production facilities, four training facilities, Academy and trade facility; every supported role has real commands/effects. Unsupported roles/effects must be rejected, not added as decorative buildings. Training produces owned experimental reserve ledgers, not deployable normal-game armies or certified siege combat. Normal World and its legacy fields remain untouched.

Supplied synthetic tables are labeled TEST_ONLY with fixture://provenance, never VERIFIED RoK quantities. Every level/prerequisite/cost/timer/effect is explicit. Starting structures/resources are declared fixture preparation, not real birth progression. A full synthetic path earns resources by ticking/collecting and pays every upgrade via commands; no maximum-state level assignment. Test multiple workers, independent facility queues, research lane, exact payments, receipt replay, negative cases, production cap/collection, per-event completion/offline catch-up, effect application, safe save/reload and authenticated HTTP boundaries. Candidate reference data with unknown mandatory fields must fail compilation.

Timer bonus composition and trade settlement are explicit supplied experimental policies, not inferred RoK formulas. A prepared-source Quarrying1 test may use known100food/100wood/60base seconds/power5 after a declared Academy1 fixture; it must not be described as legitimate fresh-city progression. Construction of that Academy and early CityHall remain blocked. No normal profile is enabled.

## Reference result before coding

requirements-matrix.json enumerates all650previously observed building rows, including CH1–25 and dependent categories. It retains null power/unlocks/capacities/modifiers/prerequisites where absent, and flags source precision/version gaps. Blank source prerequisite cells never become a verified empty list. Requested sources were re-inspected by two read-only researchers; Fandom direct402 is recorded. RoKBuilder research explicitly lacks reliable prerequisite links and shares GachaData lineage. New exact displayed research seconds resolve precision observations, not the complete DAG/current version.

Longest complete RoK birth-to-CityHall slice: **NOT ESTABLISHED**. Earliest missing conditions include starting-city initialization/earlyCH prerequisite completeness. CH3 Wall2 and Academy1 CH4vs6/2svs6s remain unresolved. Complete new-city activation stays disabled. Structural25-level capability and prepared research are separate proofs, never parity certification.
