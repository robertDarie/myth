# Prioritized pilot roadmap

Source: `docs/roadmap/MASTER_AUDIT_V2.md` and the formulas re-read from `server/city.mjs`, `server/troops.mjs`, `server/war.mjs`, `server/progression.mjs`, `server/economy.mjs`, and `server/http.mjs`. Dates are not estimated. Do not start CT-004 unless a person removes the hold.

## FUN-001 march share

Status: server tests passed on 12 November 2026. Unity playtest not run. Live GPT review not called.

`marchTroopCap = ceil(city troop capacity / unlocked march slots)`. Schema 18 and protocol 16 are unchanged. An already saved march larger than the new share still loads.

## M0-01 Reproduce the journey restart report

Priority: P0. Status: not started.

Acceptance: either a test saves a legal 7/8 journey, reloads it, and still reads 7/8, or the report is closed in the handoff as unreproduced. No reward or schema change in the reproduction step.

Tests: `node --test server/chapters.test.mjs` after any new assertion. Record the exit code.

## M0-02 Film the player built from main

Priority: P0. Status: not started. This is evidence, not a gameplay change.

Acceptance: frames of Citadel 1 and 5, two map zooms, a scout reveal and reconnect, training, a march, one PvE fight, alliance, and a chapter claim. Each frame names the commit.

Tests: none required. A Unity playtest is required before calling the pictures validated.

## M0-03 Run the server suite

Priority: P0. Status: not started.

Acceptance: the handoff quotes the command, the commit, and the pass or fail count. Do not edit tests in the same change.

Tests: `node --test server/*.test.mjs`

## M1-02 Capacity labels

Priority: P0. Status: held.

Acceptance, after approval only: the city shows capacity, reserves, wounded, troops in the field, and march slots as separate lines. Hall level 2 still trains 5. Schema and protocol stay unchanged.

Tests: `node --test server/gameplay-parity.test.mjs server/war.test.mjs server/veterans.test.mjs`

## M3-01 Talent graph

Priority: P1. Status: not started. Do this after M0 evidence exists.

Acceptance: Warhost, Provision, and Sanctuary show their existing prerequisite links, ranks, and the 15 Mana respec. No new nodes.

Tests: `node --test server/progression.test.mjs` plus stills at 1024 and 1280. Stills require a playtest.

## M5-01 Captain thrust

Priority: P1. Branch: `feature/captain-3d` only.

Acceptance: the spear tip travels forward and recovers. The shield stays forward. Do not rerun the old 319-vertex finger curl. Do not merge.

Tests: the commander review harness, plus a new motion clip. A playtest is required.

The reviewer may choose the first not-started P0 task for NEXT. It must not choose a held task.
