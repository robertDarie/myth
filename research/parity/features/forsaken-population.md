# Natural Forsaken population, patrol and map search draft

<!-- parity
{
  "id": "forsaken-population",
  "description": "Natural Forsaken population, patrol and map search draft",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "Public indexed Barbarian behavior; live build and hidden algorithms UNKNOWN",
  "checked": "2026-11-14",
  "status": "IN_PROGRESS",
  "parity": "Not yet verified",
  "sources": [
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Barbarians",
      "checked": "2026-11-14",
      "classification": "VERIFIED"
    }
  ],
  "numeric_references": [
    {
      "quantity": "Personal unlocks, initial kingdom levels1\u20136, low-level search threshold12",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Barbarians",
      "classification": "VERIFIED"
    },
    {
      "quantity": "Exact spawn density, quotas, cadence, radius, speed and probabilities",
      "reference": "No reliable exact public table established; earlier user addendum explicitly calls these tunable",
      "classification": "UNKNOWN",
      "treatment": "Document original ToM decisions and deterministic bounds/performance cases before further implementation/finalization; never claim exact parity."
    }
  ],
  "numeric_fixtures": [],
  "deviations": [
    {
      "decision": "Draft uses bounded regional quotas, anchored roaming and fog-authorized tracking",
      "reason": "Exact hidden reference spawning/patrol equations are not established",
      "impact": "Must measure bounds, distribution, visibility, path clearance, restart and load; original tunables are not numerical parity",
      "authority": "Earlier user critical addendum permits tunable radius/probability; permanent policy now requires completed research/plan/acceptance record before continuation"
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [],
  "covers": [
    "server/forsaken-population.mjs",
    "server/spawning.mjs",
    "server/world.mjs",
    "server/marches.mjs",
    "server/discovery.mjs",
    "server/exploration.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldView.cs"
  ],
  "coverage_ids": [
    "PVE-POPULATION"
  ]
}
-->

## Feature and RoK equivalent

Dynamic ordinary Barbarian placement/search, personal level access and bounded wandering. ToM requires actual moving Forsaken, authoritative targeting and fog-safe camera/search actions; no civilization mythics in the ordinary category.

## Reference version and sources

The indexed public article and checked date are in metadata; no current in-game capture or independently verified hidden algorithm exists. Reuse the earlier numerical reference review. This record explicitly postdates the start of the preserved draft.

## Verified mechanics and prerequisites

Public article describes prior-level victory unlocks, initial kingdom1–6 availability, low-level search through12 and later random high-level availability. Personal unlock, kingdom availability and province/gate permissions must all hold. Exact days/cadence/probabilities remain unknown.

## Numeric reference

Use the existing ordinary combat fixture for enemy statistics, not for spatial behavior. Source low-level threshold12 and initial range1–6 are documented community values. Radius, clearance, quotas, patrol speed, candidate budget and cooldown have no verified reference constants. Classify their eventual values as explicit original decisions.

## Formulas and modifiers

Before continuation, finalize explicit per-region/global limits, bounded candidate work, collision-segment checks, home-circle constraints, pause/return states, respawn generation changes and server search cooldown. No undocumented reference equation may be invented. The preserved code is a draft, not an accepted formula fixture.

## Known uncertainties

Hidden density, terrain algorithm, region weighting, spawn probability, radius, pursuit behavior and exact pacing are not established. Exact hidden parity is nonessential under the earlier user brief; if that changes, report the resulting blocker before substitution. No distribution/performance measurements have passed for this draft.

## Current Thrones of Myth behavior

Published ordinary combat still uses static placements/respawns. An unpublished population module and integration edits were preserved before the policy checkpoint; they are not shipped and must not be called tested. Some initial smoke loading ran, but migration, calibration fixtures, privacy, movement, UI and full regression acceptance remain incomplete.

## Planned Thrones of Myth behavior

Complete the source comparison/design and expected-test matrix before further gameplay edits. Replenish eligible underpopulated regions with hard bounds, avoid observed pop-in where feasible, preserve stable IDs/generations, persist movement state, return after disengagement and implement level search without disclosing unseen coordinates. Track live targets only under current authorization, otherwise use last sighting.

## Differences and project decisions

Any regional quotas, collision distances, speed, timer and search-spawn policy are original tunables requiring a dated decision/reason/impact record. Existing draft constants are not approved as RoK values. Preserve the distinction between documented behavior and ToM engineering limits.

## Systems affected

NPC state/pool; city spawn suitability; real-time combat/tracking; navigation and gate access; visibility and remembered/scout data; snapshot size; save/restart/rollback; client interpolation, level filters, search feedback and camera focus; server load.

## Save migration

Plan safe migration from existing schema27/PvE subversion1 while retaining all seven legacy IDs, paid admissions, partial encounters, old reports and city locations. Dormant slots must not leak through snapshots. Reject invalid future versions; resume a valid bounded patrol without duplicating generations or rewards. Exact conversion assertions still need to be implemented.

## Acceptance tests

Required before IMPLEMENTED: deterministic density/clearance/cap and no-grid distributions; candidate-budget/cadence bounds; city capacity with starter access; full segment obstacles and locked boundaries; patrol speed/radius, pause/combat/return; defeat/respawn at new anchors; restart generation and rewards; unseen target/order/search privacy; unlock/cooldown/search-spawn restrictions; actual client flow and updated load evidence. Register and run these checks before publication; the existing175 combat rows must still match or be deliberately reconciled.

## Implementation status

IN_PROGRESS, Not yet verified. Draft preserved in a named Git stash during policy publication, without discarding code or editing real saves. This document cannot authorize gameplay publication until its concrete plan, decisions, fixtures and acceptance checks are complete and its status is legitimately IMPLEMENTED.
