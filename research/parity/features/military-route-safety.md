# Recovery A — fail-closed military routing safety checkpoint

<!-- parity
{
  "id": "RECOVERY-A-ROUTE-SAFETY",
  "description": "Reject military orders whose complete corridor route lacks explicit pass authority; safety subset, not complete pass reconstruction",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build; home-kingdom / alliance pass-access semantics only",
  "checked": "2026-11-16",
  "status": "IMPLEMENTED",
  "parity": "Not yet verified",
  "sources": [
    {"url": "https://riseofkingdoms.fandom.com/wiki/Scouting", "checked": "2026-11-16", "classification": "VERIFIED"},
    {"url": "https://riseofkingdoms.fandom.com/wiki/Holy_Sites", "checked": "2026-11-16", "classification": "VERIFIED"},
    {"url": "https://rokhub.app/faq/kvk", "checked": "2026-11-16", "classification": "VERIFIED"}
  ],
  "numeric_references": [
    {"quantity": "Pass defender strength, tiers and opening tables", "reference": "Not independently established for a versioned home-kingdom baseline", "classification": "UNKNOWN", "treatment": "Essential to complete pass reconstruction; no new defender values, timers or tiers in this safety subset"}
  ],
  "numeric_fixtures": [{"path": "research/parity/fixtures/military-route-safety.json", "checks": ["military route authority and safe recall regression"]}],
  "deviations": [{"decision": "Contain incomplete frontier routes rather than invent new pass defenders", "reason": "Missing pass research and progression dependencies; fail-open movement violates explicit owner requirements", "impact": "Ordinary frontier crossings remain blocked until the complete pass implementation; no full Recovery A or RoK parity claim", "authority": "User Critical Recovery A explicitly requires all unauthorized military crossings denied and no fabricated reference statistics"}],
  "essential_unknowns": [],
  "acceptance_checks": ["military route authority and safe recall regression"],
  "covers": ["server/navigation.mjs", "server/marches.mjs", "server/war.mjs", "server/campaign.mjs"],
  "coverage_ids": ["10-031"]
}
-->

## Feature and RoK equivalent

Ordinary military marches require alliance authority along the entire physical pass route. The user explicitly requires denial at unauthorized strategic boundaries. This checkpoint repairs fail-open empty gate IDs and early order admission. It does not create a complete new strategic map or claim full Recovery A acceptance.

## Reference version and sources

URLs in metadata checked 2026-11-16. Fandom Scouting indexed text supports alliance-owned passes restricting troops; Holy Sites describes protection/opening progression. Direct opens of Fandom Scouting/Passes failed (402/unavailable); only indexed excerpts were accessible. RokHub KvK FAQ indexed text separately says scouts are exempt and KvK1–3 access is alliance-scoped; do not apply a specific KvK timetable to the home kingdom. Evidence is VERIFIED at secondary-source-text scope, not current live-client measurement; no exact game version established. Military ownership behavior is additionally an explicit owner requirement, not inferred from an unpublished formula.

## Verified mechanics and prerequisites

User requirement: no ungated military connection. Preserve local movement, physical corridor navigation, existing owned/open gates and safe home-only recall. Access must be checked at command admission and continuously during travel. Scout policy is a separate following checkpoint; no scout privilege is introduced here.

## Numeric reference

No numerical gameplay change. Existing map seven provinces, ten corridor records, two physical gates are observed local constants, not RoK numeric targets. Current opening timers, gate defenders and capture model are not independently verified; complete physical pass reconstruction remains blocked by those research/dependency requirements. No invented replacement numbers.

## Formulas and modifiers

An ordinary corridor is usable iff it has a nonempty explicit gate ID, that site exists, the owning alliance equals the march owner's nonempty alliance, and the site is open. Empty or missing gate identifiers deny movement. Physical edges remain unchanged. Return routing is allowed only for internally generated fixed-home returns, never arbitrary requested destinations.

## Known uncertainties

This is containment while the missing frontier pass structures/specification remain unresolved. Two frontier edges become inaccessible to normal armies until functional researched objectives replace them. This is explicitly incomplete strategic progression, not a newly asserted full-parity design. No saved city is moved; cities already in those provinces retain local movement and recall. Exact pass opening/defender reconstruction is a blocker to full A, not to rejecting unauthorized travel now.

## Current Thrones of Myth behavior

At bd1b157, `!c.gateId` explicitly opens frontier edges; several commands accept a target without a route and only fail on a later tick. Legacy province gate checks do not validate every frontier edge. Existing continuous tick routing does provide a place to enforce revocation.

## Planned Thrones of Myth behavior

First add red command-level tests against current source. Then fail closed on incomplete corridor metadata and reject unreachable move/PvE/gather/capture/PvP/rally assembly/target orders before replacing existing assignments. Preserve all progression and save data. Exercise local travel, positive legacy ownership, two-boundary routing, revocation, forged client flags, bounds and home recall. No maximum fixture is called organic progression.

## Differences and project decisions

User directly authorized correcting unauthorized military travel in Critical Recovery A. No numerical deviation is introduced or approved. Missing capturable frontier objectives remain a blocker; containment must not be presented as their implementation. No other reference differences waived.

## Systems affected

Navigation, military command admission, pursuit/retargeting, rally/garrison routing, save-restored movement and local-map tests. Commander/combat/economy/scout balance untouched.

## Save migration

No schema/data rewrite or coordinate migration. Existing illegal ordinary orders are paused by production route checks on tick; armies are preserved and can recall to their stored home. Round-trip save tests compare original troops, reserves, coordinates, inventory and identity. No live saves used. Rollback to earlier code would reintroduce the authorization bug, so retain backups rather than silently rewriting saves.

## Acceptance tests

`node --test server/military-route-safety.test.mjs` is registered in publication. Red must be recorded before code changes; same tests pass afterward. Full server suite and fresh HTTP QA must pass. The historical Task4 red diagnostics remain immutable dated evidence; they must not be rewritten green.

## Implementation status

IMPLEMENTED safety subset: original five-test red run 2 PASS / 3 FAIL; same five tests green after the fix. Additional command-family checks added afterward. Full Recovery A is not complete. Native pass interaction NOT TESTED; no claims about later Tasks6–11 completion. Full regression/publication results are recorded in the recovery report before commit.
