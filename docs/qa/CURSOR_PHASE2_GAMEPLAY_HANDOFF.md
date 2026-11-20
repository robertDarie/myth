# Cursor phase 2 gameplay handoff

Workspace: `C:\Users\rober\Documents\GitHub\myth-cursor-phase2`. Branch: local `main`. Nothing in this phase was pushed, merged, or rebased. `origin/main` was left at `ab033864a549ecb43b1eb92bd9d9fc7f2ac25c36`.

## 1. Starting commit

`ab033864a549ecb43b1eb92bd9d9fc7f2ac25c36` — Harden isolated city integration and verify concurrent production commands.

## 2. Local commits

- `1349f3f29c0ff676bb0ce5fb9e4b97c2282e4ffb` — daily activity receipts and the login claim shortcut.
- `0d429513f89dd5869d820c4a87261524f2fcafc3` — event history and one credit per completion id.
- The commit that adds this file — season receipt retention, visible existing season rewards, and this handoff.

`git log --oneline ab033864a549ecb43b1eb92bd9d9fc7f2ac25c36..HEAD` is the complete local set. Task 1 (inventory, items, speedups, and buffs) was not implemented. The existing inventory and power behavior was only regression-tested.

## 3. Gameplay features changed

Daily activity: a repeated completion id no longer adds a second daily, alliance, kingdom, or season credit. A chest or login reward that would pass the resource ceiling stays unclaimed. The world button opens the seven-day tab when that claim is ready and no daily task or chest is. Chest thresholds remain 20, 40, 60, 80, and 100. Day 1 remains 100 food and 100 wood.

Events: building and research pass the job id, and a survey passes its map cell. A repeated id does not count. After eight stored ids, a new id does not count and older ids stay. A period with progress or a claim remains as history and cannot be claimed. Eight event families are listed as not scheduled and do not score. Oath of the Builders and Frontier Vigil keep their existing schedule and payouts.

Season and rankings: a season completion id is kept, up to 4096, and is not dropped. A repeated id does not score. Untokenized cargo still adds. A milestone or settled reward that would pass the resource ceiling stays claimable. Point rates, caps, and placement rewards are unchanged. `server/power.mjs` was not edited. The public board is still total power only. The season screen shows the server payout and states that this is not a cross-kingdom war.

No KvK mode was added.

## 4. Production-command tests

These use world commands, not a client-supplied counter:

- Daily: gather delivery, train and cancel, scout versus patrol, alliance help, stronghold rally, chest claim, UTC rollover, weekly membership, HTTP replay. `server/activity.test.mjs`.
- Events: building and research completion, canceled jobs, scout recall, camp victory, concurrent `event-claim`, restart. `server/events.test.mjs`.
- Season: alliance create, join, leave, leadership transfer, disband, milestone claim, settled `season-reward`, restart before and after settlement. `server/season.test.mjs`.
- Rankings: derived power order, id tie-break, restart, inventory absent from another city's view.

`recordActivity` and `recordSeason` calls in the tests are labeled fixture setup for tokens, caps, and phase boundaries. They are not a substitute for the command tests above.

## 5. Full server test results

`node --test server\*.test.mjs` on 2026-11-20:

- 473 tests
- 468 passed
- 0 failed
- 5 skipped

The five skips are in `server/linux-package.test.mjs`. Windows cannot create that symlink fixture without Developer Mode. The research gate and the RoK contract gate both passed for the local diff against `origin/main`.

## 6. Unity compile status

Unity `6000.3.0f1` batchmode, project `client`, log `%TEMP%\myth-phase2-unity-compile.log`. `CompileScripts` finished and batchmode exited successfully. One pre-existing warning: `CommanderSkillVfx.audio` hides `Component.audio` (`CS0108`). No compile error was reported. A player package was not built.

## 7. Native tests actually performed

None. Native Windows play was not run for daily activity, the event hub, the season screen, or the rankings screen. Do not treat the server results or the script compile as a native gameplay pass.

Manual check when a machine is free: join a disposable kingdom, finish one real daily action and claim it, open Event hub and confirm a Not scheduled family has no claim, open Season and read the server payout, open Rankings and confirm another city shows total power only.

## 8. Remaining RoK discrepancies

The local daily chests, seven-day rewards, two weekly events, 28-day season, and power breakdown are prototype tables. They are not certified against a live Rise of Kingdoms client.

Not implemented, and not represented as done:

- Home-kingdom power equal to the live building, research, troop, and commander tables.
- Pre-KvK preparation scoring.
- Kingdom matchmaking.
- Cross-kingdom entry.
- Lost Kingdom objectives.
- Occupation and KvK reward rules.
- Season settlement that returns an army from another kingdom.
- Kill and death rankings.
- Event families for training, commanders, gathering, alliance events, and competitive rank rewards.
- Task 1 inventory acquisition, speedup conversion, and premium prices. Those systems were left as they were.

## 9. Missing numeric evidence

No live capture on 2026-11-20 for chest contents, login payouts, event score rates, season honor, power coefficients, KvK preparation points, matchmaking rules, occupation points, or return-migration costs. The App Store listing checked on 2026-11-17 names the game and does not publish those tables. Unknown values were left inactive instead of being filled in.

## 10. Files likely to conflict with Codex

Highest: `server/city.mjs`. The only edit is passing the existing job id into `recordEvent` when a building or research job finishes. City costs, timers, and prerequisites were not changed. Codex city-hall work should reapply that one argument if the line is rewritten.

Also likely: `server/exploration.mjs` (survey cell id), `server/events.mjs`, `server/activity.mjs`, `server/season.mjs`, `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs`, `PrototypeClient.Activity.cs`, `PrototypeClient.Season.cs`, `PrototypeClient.Inventory.cs`, `WorldModels.cs`, `research/parity/publication_scope.json`, `research/parity/registry.json`, `research/MYTH_feature_coverage_register.csv`, `scripts/publish-tests.json`.

Alliance invitation code was not edited.

## 11. Save and persistence effects

No world schema bump.

- `daily.receipts` is optional. Old days without it still load. A new day starts with an empty list.
- `eventHistory` is optional and is written only when a period that had progress or a claim closes. An empty history is not stamped onto a city that did not roll a period.
- Season `credited` may grow from the old cap of 256 to 4096. Saves with 256 or fewer ids still load. Ids are no longer dropped.
- Already claimed daily, event, login, and season rewards stay claimed.
- A clock moved backward still cannot reopen a claim.

## 12. Recommended integration order

1. Take `1349f3f` first: `server/activity.mjs` and the activity button. It does not depend on city migration.
2. Take `0d42951` second. Review the one-line `server/city.mjs` token with the city-hall branch before merging that file. `server/exploration.mjs` and `server/events.mjs` can land with it.
3. Take the season commit third: `server/season.mjs` and the season and rankings screens. It assumes the activity receipt change, because training and development ids flow through `recordActivity` into `recordSeason`.
4. Keep the research registry, publication scope, fixtures, and approvals with the commit that introduces them.
5. Do not enable KvK, do not replace reward numbers, and do not treat this tree as pushed.

## Dependency map for a later KvK season

| Stage | What this tree has | What it still needs before gameplay |
| --- | --- | --- |
| Home kingdom | Citadel, research, training, gathering, the local power total, and the 28-day season | Verified building, research, troop, and commander power tables |
| Pre-KvK preparation | Nothing | A verified objective list, score rates, and eligibility window |
| Matchmaking | Separate kingdoms exist as realms | A verified registration and pairing rule |
| Cross-kingdom entry | Nothing | A migration for commanders, troops, hospital, and inventory that Codex city and military work has not finished |
| Lost Kingdom objectives | Local shrines, beacons, and strongholds inside one kingdom | A verified lost-kingdom map and objective set |
| Occupation and rewards | Alliance territory inside one kingdom | Verified occupation points and reward rows |
| Settlement and return | One kingdom freezes its own board and the city stays | A verified return migration |

Each later stage depends on the row above it. A fake cross-kingdom flag would not satisfy any of them.
