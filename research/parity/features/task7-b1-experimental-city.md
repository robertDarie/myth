# Task7 B1 experimental building engine

<!-- parity
{
  "id": "TASK7-B1-EXPERIMENTAL-CITY",
  "description": "Owner-authorized isolated reusable engine with supplied explicit tables, synthetic25-level capability and prepared Quarrying1 research quote; no normal-game activation",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live binding; public observations checked2026-11-18; synthetic fixtures explicitly TEST_ONLY",
  "checked": "2026-11-18",
  "status": "IMPLEMENTED",
  "parity": "Not yet verified",
  "sources": [
    {
      "url": "https://www.gamesguideinfo.com/rise-of-kingdoms/building/120000287-City-Hall",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://app.rokstats.online/buildings/?lang=en",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://rokbuilder.com/tools/calculators/city-hall/",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://rokbuilder.com/tools/calculators/research/",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Buildings/City_Hall",
      "checked": "2026-11-18",
      "classification": "UNKNOWN"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Buildings/Academy",
      "checked": "2026-11-18",
      "classification": "UNKNOWN"
    },
    {
      "url": "https://gacha-data.com/rise-of-kingdoms/technology/",
      "checked": "2026-11-18",
      "classification": "VERIFIED"
    }
  ],
  "numeric_references": [
    {
      "quantity": "650building rows/26categories and known CH prerequisite listings",
      "reference": "research/parity/task7-b1/requirements-matrix.json",
      "classification": "UNKNOWN",
      "treatment": "Source observations only; all missing fields explicit null; no complete current progression or birth slice; not an activation table."
    },
    {
      "quantity": "Prepared Quarrying1:100food,100wood,60base seconds,5power; Academy1 prerequisite",
      "reference": "https://gacha-data.com/rise-of-kingdoms/technology/",
      "classification": "VERIFIED",
      "treatment": "Published observation; exact live version and all surrounding progression UNKNOWN. Prepared fixture only."
    },
    {
      "quantity": "Synthetic costs, effects, queues, modifiers, production and transfers",
      "reference": "server/testing/reference-city-fixtures.mjs",
      "classification": "UNKNOWN",
      "treatment": "TEST_ONLY operator-supplied test values, not reference estimates; explicit owner authority; no activation in normal game."
    }
  ],
  "numeric_fixtures": [
    {"path": "research/parity/task7-b1/requirements-matrix.json", "checks": ["Task7 B1 synthetic paid 25-level progression capability"]},
    {
      "path": "server/testing/reference-city-fixtures.mjs",
      "checks": [
        "Task7 B1 isolated engine actions, authentication and persistence",
        "Task7 B1 synthetic paid 25-level progression capability"
      ]
    }
  ],
  "deviations": [
    {
      "decision": "Use isolated synthetic engine capability and prepared-state research tests; do not activate incomplete reference profile",
      "reason": "Birth state, CH2 absence of prerequisites and CH3/Academy contradictions prevent genuine consecutive reference slice",
      "impact": "Normal and legacy cities remain five-level. New module and browser sandbox are experimental; no normal military integration or Unity claim.",
      "authority": "Create a synthetic 25-level reference fixture for testing the ENGINE'S CAPABILITY ONLY. Owner also explicitly requires isolated experimental profiles and continuing independent functionality when the first slice is blocked."
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "Task7 B1 isolated engine actions, authentication and persistence",
    "Task7 B1 synthetic paid 25-level progression capability",
    "Task7 production city policy legacy quote and package closure regressions",
    "Task7 immutable historical source and legal legacy progression conservation"
  ],
  "covers": [
    "server/city-policy.mjs",
    "server/reference-city.mjs",
    "server/reference-city-http.mjs"
  ],
  "coverage_ids": [
    "TM-027", "TM-029", "TM-031", "TM-064"
  ]
}
-->

## Feature and RoK equivalent

Independent city buildings, authoritative paid construction, research and economy. Scoped implementation is a reusable isolated engine, not completed RoK gameplay progression. Preimplementation plan: ../task7-b1/PLAN.md.

## Reference version and sources

Exact requested URLs and dated source observations are in ../task7-b1/requirements-matrix.json. Fandom direct access returned402; indexed extracts are not direct in-game evidence. RoKBuilder derives from GachaData, so they are not independent. Live client/version binding is UNKNOWN. No protected API/signup/payment was used.

## Verified mechanics and prerequisites

Published Quarrying1 requires prepared Academy1;100food+100wood,60base seconds,+5power. This is a prepared quote test only. Matrix shows650building-level observations with per-field confidence and null missing fields. First Academy conflicts CH4vs6 and2svs6s. CH3 Wall2 conflicts with blank extractions. Blank CH2 is not verified absence. No fully verified birth-to-CH level exists.

## Numeric reference

Use the matrix and its historical CSV provenance, not synthetic fixture numbers, as research input. Technology source lists410rank rows but complete DAG remains UNKNOWN. Published Irrigation/Handsaw1–5 base seconds600,900,2000,5000,10000; minute-rounded wiki values do not establish exact seconds. CH18 dependencies conflict. No interpolated reference numbers.

## Formulas and modifiers

Engine executes a supplied BASE_ONLY or DIVIDE_BY_ONE_PLUS_SUM policy; duration=base/(1+sum bonuses). TEST_ONLY fixture supplies all such bonuses. Production accrues per-building rate*elapsed/3600 up to its own cap, remains uncollected until collect. Timelines split at job completion. Transfers debit amount+ceil(amount*taxBps/10000), credit amount, with supplied capacity. These equations are experimental fixture semantics, not verified RoK formulas. Paid job quotes are persisted unchanged.

## Known uncertainties

Full reference-profile activation remains blocked by birth state/initial charging, CH2 prerequisite completeness, CH3 conflict, first Academy conflict, all dependent prerequisites/effects/power, technology DAG, modifier rounding/stacking, collection/offline/trade semantics and live version. essential_unknowns is empty ONLY for deterministic supplied-table engine scope; these external requirements remain essential blockers for normal reference gameplay.

## Current Thrones of Myth behavior

Normal World/Citadel remains max5 with existing combined buildings, balances, jobs and snapshots. No new engine import in normal World/index. No real save read or rewrite.

## Planned Thrones of Myth behavior

Experimental opt-in separate realm has11functional building identities: city hall; four producers; four trainers; Academy; market. Each has explicit25rows, own cap, prerequisites, effects and actions. HTTP snapshot/commands and interactive browser sandbox expose actual actions. Training creates experimental unit reserves only, not normal armies. Full unified25-level normal progression remains a later evidence-gated activation.

## Differences and project decisions

Owner authorizes synthetic ENGINE CAPABILITY fixtures, isolated experimental profiles and independent work when first slice blocked. This approval is recorded in ../approvals/task7-b1-experimental-city.json. No claim of approved normal-game balance deviations. Existing Option1 keeps old assets/jobs unchanged until separately tested entitlement-based migration.

## Systems affected

New standalone engine, opt-in loopback HTTP adapter, supplied reference compiler, synthetic fixtures, tests and research records. Separate lanes enforce construction workers, research occupancy and four facility training queues. No normal-game or Unity scene/protocol integration.

## Save migration

Separate EXPERIMENTAL_CITY_ENGINE_V1 format with profile fingerprint; normal save overwrite rejected. Atomic write flush uses writable descriptor (Windows read-only fsync EPERM reproduced then fixed). Restart preserves paid jobs, per-building storage, unit reserves, sessions and idempotent receipts. No legacy conversion. Cross-format loads rejected. Never commit exported saves/tokens.

## Acceptance tests

Eleven focused tests cover activation validation, missing/malformed supplied rows, cycles, payments, worker occupancy, effects, unauthorized commands, replay, four trainers, disk restart, prepared Quarrying, transfers, offline event boundaries and HTTP isolation. Full synthetic paid path270upgrades/540commands/11670simulated seconds from declared zero resources and five startingLv1 structures. Levels are never injected after birth; production/collection funds all upgrades. Legacy test preserves2720prior-source cards across8synthetic historical saves plus53actual commands to oldCitadel5. Browser create/collect/Citadel2/Barracks/train reserve observed. Native Unity NOT TESTED.

## Implementation status

IMPLEMENTED scoped engine capability, NOT completed Task7 or genuine reference CityHall vertical slice. All11experimental buildings have actions/effects. Longest consecutive fully verified birth slice:0levels. Prepared Academy research can be exercised with explicit fixture preconditions. Native unsupported by this new sandbox; frozen Creator Preview untouched. See docs/qa/evidence/task7-b1/ for sanitized measured evidence.

## Versioned contract binding

ROK-CITY-LEVELS-1-25 remains incomplete. publication_scope.json binds only owner-approved experimental paths and functional/unchanged-numeric checks. No gate weakened, no current parity certification. Full reference activation remains disabled.


B1 follow-up: reproduced and removed an implicit matching-Cityhall-level cap from the generic engine. Explicit supplied row prerequisites now exclusively govern eligibility; this allows reference tables whose building levels differ from CityHall. Regression red on f6d915f, green with11engine tests. Synthetic270-upgrade ledger unchanged. Initial checkpoint f6d915f passed all55publication checks and confirmed origin/main; follow-up reruns the same required plan. No normal-source values or frozen package changed.
