# Recovery B — scout passage

<!-- parity
{
  "id": "RECOVERY-B-SCOUT-ACCESS",
  "description": "Separate physical scout routes from military pass ownership",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build; observable scouting passage semantics only",
  "checked": "2026-11-16",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://riseofkingdoms.fandom.com/wiki/Scouting", "checked": "2026-11-16", "classification": "VERIFIED"},
    {"url": "https://rokhub.app/faq/kvk", "checked": "2026-11-16", "classification": "VERIFIED"},
    {"url": "https://www.reddit.com/r/RiseofKingdoms/comments/olchol/", "checked": "2026-11-16", "classification": "CORROBORATED"}
  ],
  "numeric_references": [{"quantity": "Scout speed, sight, capacity and survey time", "reference": "Existing local server/scout-camp.mjs; exact versioned RoK level table not established", "classification": "UNKNOWN", "treatment": "Retain all existing numbers; this correction changes authorization only, not numerical parity"}],
  "numeric_fixtures": [{"path": "research/parity/fixtures/scout-pass-access.json", "checks": ["scout-specific passage and military privilege separation"]}],
  "deviations": [{"decision": "Retain existing local scout travel/survey tables", "reason": "No numerical change is authorized by the passage bug fix", "impact": "Passage semantics can be verified separately; full numerical scouting parity remains unverified", "authority": "Owner Critical Recovery B requires existing speed, capacity and discovery rules preserved"}],
  "essential_unknowns": [],
  "acceptance_checks": ["scout-specific passage and military privilege separation"],
  "covers": ["server/navigation.mjs", "server/exploration.mjs", "server/recon.mjs"],
  "coverage_ids": ["TM-001"]
}
-->

## Feature and RoK equivalent

Scout passage through military-controlled passes. Owner explicitly requires scout-send, redirect, auto exploration, investigation, reconnaissance and recall across locked/enemy-controlled passes without granting ordinary army access.

## Reference version and sources

Checked2026-11-16. Indexed Fandom Scouting describes physical pass shortcuts, impassable terrain and military pass ownership; direct open failed402. Indexed RokHub KvK FAQ explicitly exempts scouts. Independent player observations in the linked Reddit discussion support passage regardless of ownership. CORROBORATED only for this narrow observable behavior; no exact live version, event-specific exceptions or numeric table certified. No copied proprietary assets.

## Verified mechanics and prerequisites

Physical map corridors remain required. Only internal scouting code uses scout-specific routing. HTTP payload fields cannot select a routing privilege. Keep valid coordinates, scout capacity, existing travel speeds, mission durations, private reports, discoveries and recon target eligibility checks.

## Numeric reference

No numeric change. Existing local scout levels0–5 remain0/1/1/2/2/3 slots with their original speeds, radii and survey durations; these are observed implementation values, not verified RoK values. See server/scout-camp.mjs and the Task3 audit, not a fabricated parity table.

## Formulas and modifiers

Scout route uses the same province/corridor shortest-path graph as military navigation, with corridor ownership/opening checks omitted. Military route retains fail-closed pass access. Distance/speed ETA and movement budget remain unchanged; scouts do not move in a straight line through intervening provinces or walls.

## Known uncertainties

Full4096-cell organic exploration and all current reference-game scouting modifiers remain unverified. Full military pass reconstruction is incomplete independently; scout exemption can safely operate over existing physical corridors without requiring guessed pass defenders.

## Current Thrones of Myth behavior

At de42f6c, exploration dispatch/redirect/auto/tick/investigation and reconnaissance call military `canEnter` or `route`, rejecting scouts at passes. Newly fail-closed unknown corridor edges also block scouts. Existing mission/report/fog data already separates scouts from armies.

## Planned Thrones of Myth behavior

Add red production tests before source edits. Introduce separate internal `scoutRoute` and `scoutTravel`, keeping public military APIs unchanged. Update all scout path decisions/ETA/travel and recon admission to use physical scout routes, remove military `canEnter` checks from scout code. Keep reconnaissance protection/vision and investigation prerequisites. Test cross-gate send/redirect, enemy ownership change, auto selection, investigate/recon, bounds/capacity, foreign mission denial, save/restart and recall; rerun military regressions unchanged.

## Differences and project decisions

Owner directly requires this behavior. No new numeric design or deviation approved. Existing local numerical rules remain parity gaps; metadata records retention without calling them exact. No speculative reference equation substituted.

## Systems affected

Navigation, exploration commands, scout ETA, automatic target choice, investigation, recon, private snapshots and persistence. No army command may import the scout route policy.

## Save migration

No schema/coordinate/ownership rewrite. Existing missions resume under scout-specific authorization; revoked military ownership no longer cancels scouts. Explicit recall still works and cancels pending survey reward. Existing malformed-save validation remains. Preserve already earned fog/reports/units/XP and session identity.

## Acceptance tests

`node --test server/scout-pass-access.test.mjs`; red before patch then same scenarios green. Existing scouting/exploration/findings/recon/military suites, full server tests and mandatory publication plan required. Native cross-pass scout UI remains NOT TESTED unless actually operated; server PASS is separate.

## Implementation status

IMPLEMENTED server authorization: original four production tests red0PASS/4FAIL, then same four green4/4. A fifth investigation/recon scenario was added afterward. Full recovery A remains incomplete independently; this is independently verifiable scout authorization work, not a claim to complete any later parity milestone. Native/scouting numerical parity not certified.
