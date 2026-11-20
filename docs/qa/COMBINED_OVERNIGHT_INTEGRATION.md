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

Final source validation:486server tests,481passed/0failed/5existing Linux-only skips; five new combined tests pass. Actual Unity final review exits0. Publication rehearsal ran all74checks and found only the32seed historical assertion needing explicit new defaults; that corrected check subsequently passed all32seeds. Earned-state comparisons remain strict; empty invitations/default primary/empty last-role/manual scout fields are the only additions. Nothing was pushed by that failed rehearsal. Final approved publisher must rerun all checks before pushing.

Manual acceptance in a disposable kingdom: create Greek city; enter world; pan/zoom; open Exploration and toggle Auto Explore; inspect fog/scout routes; search level1Forsaken and preview/attack; inspect primary/secondary skill and combat report; use two city identities to create alliance/invite/decline/reinvite/accept; inspect authorized targets; right-click ground once (no march), wait for route, right-click same point once (one order); rapid extra click must not duplicate. Test denied pass route and changed ownership/recovery before sending. Close/reopen disposable client/server and compare resources/troops/commanders/alliance/fog. Full25normal city activation is unavailable by design.
