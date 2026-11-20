# Combined Codex + Cursor gameplay integration —2026-11-20

## Baselines and safety

Starting Codex main and fetched origin/main: ab033864a549ecb43b1eb92bd9d9fc7f2ac25c36. Original C:/Users/rober/Documents/GitHub/myth and Cursor C:/Users/rober/Documents/GitHub/myth-cursor-night were clean Git repositories. Read-only local fetch preserved Cursor tip805ccb575afd1d9cd33734ecd8f645c4169e574a and original history. No other writer or unexpected state observed. No reset/clean/stash/force push, extra worktree, real-save edit or Creator Preview overwrite.

## Imported inventory and resolutions

Exactly six linear Cursor commits, first parent3b050272a027e158b4c947182c6bac34ef8f3482, each subsequent parent the previous commit:

- c74d40a7f2a5c035833010d8cce7e471502c3dee →2e095e3 scouting.
- a603f2f5ec88022a61c3ad8c4a750d0a4bc04121 →9ceb998 Forsaken search.
- f38ba912e850508c43fda76db2f36a180b085ab8 →433dde6 commander skills.
- 5be1b78a001f3a8fdee0b81e28c79fc12788e604 →cc3d7e5 alliance invitations.
- 0cb1016f0f6ceaac2de0a3f21f7bf3e86fa83394 →7489d64 kingdom search/preview.
- 805ccb575afd1d9cd33734ecd8f645c4169e574a →d223d69 handoff documentation.

All imported with cherry-pick -x in order; none skipped. Three content conflicts: publication_scope.json retained B1/B2/B3 plus scouting binding; WorldModels.cs kept both ReferenceCity and Forsaken DTOs; publish-tests.json retained both complete plans. Shared Interface/UI merges retain B2 city selection and Cursor world panels. Remaining coverage/backlog/report/registry changes merged additively. No older whole-file replacement.

## Functional review and repairs

Scouts prefer nearby fog then continue reachable physical routes while armies remain gate-authorized. New independent test reaches4096automatic cells and retains4096after reload; this supersedes, without rewriting, prior dated759cell limitation. Manual multi-scout/corrupt-position fixtures are negative/capability tests, not legitimate upgrades.

Forsaken search selects unlocked/legal levels, private owned pins and real target commands; existing50AP admission,100XP per level,90second respawn and local0.1rare chance unchanged. Real beginner fight/reward/retry/restart tests pass; level8/21/25 gates include explicit boundary fixtures. Existing duplicate-cycle, population/respawn and175-battle numeric regressions remain required.

Primary/secondary active effects are integrated across field/Forsaken/campaign/strongholds; passive recovery and primary-only talents retained. **Cursor alternates full1000rage bars; this is not verified RoK behavior.** Community sources saying one versus two turns after primary do not establish a second rage bar. Preserve imported explicit local owner-decision provenance, mark a reference mismatch/uncertainty; no new timer or coefficient invented. Reports, damage/healing, wounded conservation and restart tests cover actual behavior, sometimes with explicitly primed rage/battle fixtures.

Alliances retain leadership/help/pass ownership and private invitations. Added recipient-only decline through actual HTTP/client, retry rejection and release of reserved slots. Corrected open joins consuming reserved places: member+invitation cap stays existing100. Capacity boundary is a declared fixture, not a100-player earned progression claim.

World list uses authorized snapshots; no hidden armies/camps/resources/private pins added. Authenticated GET/march-preview in local and hosted servers returns physical/authorized routes; commands revalidate after stale previews. Added experimental-city preview denial, deployment-slot preview guard, null army guard and client pending/busy guards. Confirming consumes cached preview before sending; a repeated click cannot reuse it. Native exactly-one gesture remains independently testable, not inferred from backend PASS.

Additional reproduced privacy defect: a searched camp slot recycled into a later cycle still appeared as a private live pin. Search results now bind level and cycle; stale pins cannot grant live visibility or attack-coordinate authorization for a replacement. Old pin records without cycle must be searched again; earned resources/XP/reports remain intact. Regression uses an explicitly changed-cycle/offscreen negative fixture. Corrected alliance-search rally selection to pass rally.id rather than targetId to the existing warfare interface.

Legacy cities and B3 experimental authority coexist. Initial combined test failed because historical expected state lacked nextActive/lastSkillRole defaults; updated assertion adds only declared primary/empty defaults, while all earned fields remain strict. Scout card comparison checks changed descriptive text separately, retaining every cost/timer/prerequisite/effect comparison. B3 seven-job/four-facility/concurrent HTTP checks remain mandatory. No normal25activation, profile switching or real-city conversion; unsupported cross-profile military/economic actions remain safely blocked.

## Evidence integrity and test categories

Cursor scouting test previously rewrote its dated committed evidence each run; it now writes work/combined-integration. Historical RecoveryA/B2/B3 screenshots, JSON and source fingerprints remain byte-for-byte unchanged. Their checkers validate the immutable ab033864 source; added current-source checks bind actual fresh Unity compilation/all88client scripts, current runtime hashes and newly generated World snapshot. This supplements historical evidence rather than rebinding old native proof to changed code.

Focused checkpoint A10/B4/Ccommander+passive+progression+war/Dalliance+social+campaign tests executed in order. Combined real multiplayer HTTP uses three independent fresh identities for private invitation creation/foreign decline/rejection/accept/reload and commander state. Separate negative fixtures cover reserved capacity and stale recovery; B3 HTTP covers concurrent payment/training/research plus real saved envelope. First complete server run484tests:479passed/0failed/5existing Linux-only skips. Final full suite after additional capacity test is recorded below when completed. Unity6000.3.0f1 actual batchmode compilation/DTO/command/topology review exits0; this is not native input. Full merged research/contract/publication plan, packaging tests and Windows native/package results follow in the final publication record.

## Reference research and remaining gaps

Official https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888 reopened2026-11-20: VERIFIED broad exploration/alliance capability, UNKNOWN exact timers/UI. https://riseofkingdoms.fandom.com/wiki/Scouting and Commander_Guide direct fetch restricted402; indexed claims are not new controlled measurements. https://www.reddit.com/r/RiseofKingdoms/comments/w7k7wj/ and https://www.reddit.com/r/RiseofKingdoms/comments/ga7nax/ checked2026-11-20: CONFLICTING one/two turn delay, both secondary after primary; full-bar alternation not established. Existing five feature records retain original source/date/classification. No100% numerical/functional parity claim.

Remaining: current secondary cast/rage mechanism, original combat coefficient parity, exact search gestures/ranking/radii, scout progression and hidden spawn/drop/fort/guardian data; complete current city birth/economy/prerequisite profile and separately approved entitlement-preserving migration. Normal25progression remains disabled. No unrelated large milestone started.

## Windows package and native record

Build and native results are pending at the source-integration commit. A separately committed final record must state immutable package source SHA, clean manifest/protocol, ZIP path/hash/all-payload verification, actual native cases and explicit NOT TESTED cases. Do not infer native success from compilation or HTTP tests.

Native b7540d9 first package: manifest194payloads/protocol17/clean source and all hashes/privacy verified, but **rejected for release** after actual Greek entry showed experimental QA UI on an ordinary server. Screenshot native-normal-city-wrong-qa.jpg preserves reproduction. Actual Unity JsonUtility creates an empty nested DTO when absent: null-only checks misclassified normal cities. Added a regression that failed in actual Unity (exit1), then changed every QA presentation/selection guard to explicit experimental=true, normalActivation=false and matching nonempty playerId; fixed three-way normal/QA/foreign-owner regression exits0. No server profile or save was changed. Also ignore empty default search-result DTOs. Rebuild from corrected clean source required; first ZIP is not the recommended playtest.

Native8e013f241ac56024b37293a290086eb3d5fb502c: normal Greek city confirmed with rendered district UI, normal5-level quote and no QA banner. World entry, visible/known resource search, Forsaken1 search/card/authorized preview, real attack/primary shield effect/Victory50AP100XP, commander screen showing earned100XP, native invitation decline/reinvite/accept against an independent HTTP-created Norse player, auto explore42→294→320cells, wheel zoom and ground first-preview/second-march executed. First actual ground preview left target=null and position unchanged; second click produced one observed accepted movement and consumed preview. Wire-level duplicate-count/rapid retry stress remains automated authority coverage, not native network certification.

The same client and server were closed/restarted with the existing disposable-run tool, then the saved Greek session resumed natively. Comparison retained900troops, exact units/wounded/commander records, alliance,1victory,320fog cells and exact army position. Food/wood12164/10164→12202/10202 accrued during downtime; stone150/gold1000/mana30/aether0 retained. One50AP/100XP victory report survived; no extra reward. Native restart JSON/screenshots are sanitized; full saves/session tokens remain ignored.

This run also reproduced first-city intro returning the world camera to its pre-spawn focus in fog; explicit target focus restored rendering. Root cause: initial SetView interpolation had not finished when BeginCity saved FocusPoint. Initial positioning now uses existing immediate=true; subsequent camera transitions retain their existing behavior. Actual Unity tests project a far-from-origin home before/after the same city-camera save/restore sequence; exit0. Final package must rebuild and retest fresh city-to-world entry. No map topology/art changes.

Final source validation:486server tests,481passed/0failed/5existing Linux-only skips; five new combined tests pass. Actual Unity final review exits0. Publication rehearsal ran all74checks and found only the32seed historical assertion needing explicit new defaults; that corrected check subsequently passed all32seeds. Earned-state comparisons remain strict; empty invitations/default primary/empty last-role/manual scout fields are the only additions. Nothing was pushed by that failed rehearsal. Final approved publisher must rerun all checks before pushing.

Manual acceptance in a disposable kingdom: create Greek city; enter world; pan/zoom; open Exploration and toggle Auto Explore; inspect fog/scout routes; search level1Forsaken and preview/attack; inspect primary/secondary skill and combat report; use two city identities to create alliance/invite/decline/reinvite/accept; inspect authorized targets; right-click ground once (no march), wait for route, right-click same point once (one order); rapid extra click must not duplicate. Test denied pass route and changed ownership/recovery before sending. Close/reopen disposable client/server and compare resources/troops/commanders/alliance/fog. Full25normal city activation is unavailable by design.


## Final package and native verdict

Recommended ZIP: dist/Thrones-of-Myth-Windows-Combined-0_45_0-6ebf698.zip. Source6ebf698ffe3afc9ca8c81a5e1281071a4b486d7c, clean dirty=false, protocol17, Unity6000.3.0f1,194payload hashes/privacy/path inventory/serverDigest verified. ZIP SHA256 e82b6c5ffe77d54d10aa3285743792156f80d9143883d9c7b81a6f0999aa832d. Earlier b7540d9/8e013f2 ZIPs remain preserved but are superseded by this camera-corrected package. Final main may include subsequent tests/docs; immutable executable/server source stays6ebf698.

Actual final6ebf698 Windows entry created a fresh Greek city; after the city intro, Return to kingdom showed home, nearby buildings/resources and fog boundaries without target refocus. Screenshot native-final-initial-world.jpg. The wider gameplay/restart journey above was executed on8e013f2; the final rebuild changes only initial home positioning plus Editor validation. Do not claim that every scenario was replayed on the final binary.

Native verdict PARTIAL. NOT TESTED: full4096native exploration, secondary pairing/casts, native pass capture/stale crossing, rally/garrison/gather, rapid retry wire-count stress, all map boundaries/cursor-centered zoom accuracy, complete replay on final camera rebuild. Normal packaged8080launcher was not launched to avoid existing sessions; its Windows ownership/lock/failure/privacy tests ran, and actual disposable native launcher/server/matching player/restart worked. No active QA clients/servers remain.

To test safely without editing files: from repository root run `node scripts/start-native-windows-qa.mjs --package dist/Windows-Combined-0_45_0-6ebf698 --clients 1` (or2). It verifies every package payload, allocates a random local port and fresh ignored QA kingdom, launches the matching player, and prints a run ID. Use a new name/Greek, Enter, Return to kingdom. Close the QA player to save/stop. Resume with the same command plus `--resume-run PRINTED_ID`. Never point this tool at real saves. For two different identities on the same desktop, use distinct names and inspect the displayed player; same-device session preferences can otherwise resume the same city. Native independent counterparty in this run was created through actual HTTP, not a second GUI.

Manual remaining cases: Menu→Scouting→Auto explore; capture fog/scout/path before and after. Search Forsaken1→inspect50AP/100XP card→March & attack→Menu→Reports; capture one reward/report. Alliance→Create, invite the other unaffiliated city→decline/reinvite/accept; compare private incoming/outgoing and roster. On World, right-click clear ground once and record idle/no order, again once and record one order. Repeat with lost pass ownership/recovery before submission and capture rejection. Complete legitimate Oathbound Hall/army/territory progression before trying pass rallies; no maximum-state fixture proves that path. Compare resources/units/XP/alliance/fog after actual client/server restart.

Files modified: evidence/combined-integration/files-modified.txt. Detailed machine-readable package/native scopes and screenshot hashes: evidence/combined-integration/verification.json. Original Creator Preview hash remains9d22646f7a0f320609b0146c1c261fe1f6411e02b3a018ef8ad600475636a5a8. Both repository directories/history preserved. No full RoK parity, ordinary25activation, real migration, art/audio/tooling redesign or later milestone claimed.

Final server result after the sixth stale-pass regression: **487tests,482passed,0failed,5existing Linux-only skips**. Six combined tests pass/no skips. Stale pass fixture first permits a route, then revokes ownership and proves the real move command rejects without changing units/location; it does not claim earned pass capture. Native logs also contain ArmyData.homeFormations serialization-depth warnings; no crash was observed, and that DTO warning remains unresolved. Final publication uses the complete74check plan and all research/contract bindings; confirm success and remote SHA from the approved publisher and independent remote read, reported in the final response.
