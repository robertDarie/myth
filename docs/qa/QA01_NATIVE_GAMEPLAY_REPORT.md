# QA-01 native gameplay report

Tested gameplay commit: `0b7e1029cbace897547c50f471edfa14400ed26c`

That commit is `origin/main`. Its ancestors include the published inventory commit `d5c9aed` and the published Task 8A commit `e2696822e38d17e53f5563cc5db411ae4ea789be`. This playtest did not change gameplay code. No empty gameplay commit was created.

Environment: Windows 11 (10.0.26200), Unity `6000.3.0f1` (`d1870ce95baf`), Node.js `v24.18.0`. The Windows package was built from this checkout and launched outside the editor.

## Build and launch

| Step | Result |
| --- | --- |
| Unity editor Play Mode | NOT TESTED. The editor was used only for the batch Windows build. |
| Windows package | PASS. Batch build log `work/qa01/unity-build.log` ends with `Portable playtest created: dist/Thrones-of-Myth-QA01Windows.zip`. Manifest: version `0.45.0`, commit `0b7e1029cbace897547c50f471edfa14400ed26c`, protocol `17`, dirty `false`, server digest `67533707637586487b7d78a028a22f1fc7c2f9d4ea6a902469f4c02d4452e39f`. |
| Extracted executable | PASS. `ThronesOfMyth.exe` launched with `--thrones-server http://127.0.0.1:8095`. The window title and footer showed `THRONES OF MYTH · 0.45.0 · 0b7e1029`. |
| Isolated server | PASS. Packaged Node on port `8095`, save `work/qa01-kingdom/world.json`. Health reported protocol `17`, the same commit, and schema persistence. The client stayed on `Connected` after that server was stopped and started again. |
| Production save | Untouched. `%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json` SHA256 `699A555BF038E28082626EDA55F9F5F53B725DF021FEF5FED2D9989700744101` matches the backup taken before play. `world.json.schema27.bak` SHA256 `C9C9F7A313EC1CAEB321A015FFB74CE00BD06105859C506A06A8E12C18E64D48` still matches. |

The default launcher was not used. It writes the production save unless `THRONES_SAVE_PATH` is set.

## Native scenarios

| Scenario | Result |
| --- | --- |
| Fresh city, enter and leave the city, read resources and buildings | PASS. City `Combined Native QA`, Age of Embers, Greek. Start food 10,000, wood 10,000, stone 150, gold 1,000, mana 30, Aether 0, sigils 3, AP 1,500/1,500. Citadel of Mortals 1/5, Hall of Spears 1/1, Blessed Fields 1/1. First steps 2/8, "Meet your Frontier Captain". |
| Founding supplies and one Harvest Satchel through the Inventory screen | PASS. Toast `ORDER ACCEPTED · Founding supplies added`, then `Your selected supplies have been used.` Food display moved from 10K to 10.1K and the satchel stack from x2 to x1. |
| Other inventory uses (commander XP, AP tonic, speedups, shards, sigil, combat oaths) | NOT TESTED. Those items were present after founding supplies and were not consumed. |
| Inventory request replay, including after the server had been restarted | PASS for the two real receipts. See conservation below. |
| Train one infantry batch through the training screen | PASS. Quote shown: `Train 100 · 1500s · 5000 food / 5000 wood`. Toast `ORDER ACCEPTED · Recruitment has begun.` City then showed Hall of Spears working and `Training 100 Oathguard`. |
| Archers, cavalry, promotion, a locked tier click, and an insufficient-resource click | NOT TESTED as clicks. The training screen did show `Cavalry needs Citadel 2` and `Siege training is closed.` |
| Siege order | PASS as a refusal. On-screen text says siege is closed. An authenticated `train` for siege returned HTTP 400 `Choose a valid troop type.` No siege receipt and no second resource spend. |
| Assign Frontier Captain and confirm a 900-infantry formation | PASS. `Assemble your march` showed Frontier Captain, Oathguard T1 ready 900, and `CONFIRM FORMATION` returned `ORDER ACCEPTED`. Marches screen then showed 900 mortal units, health 113,400, damage 3,124.8. |
| Deploy that march and fight a camp | NOT TESTED to completion. Right-click drew `Authorized route from the selected march` and did not issue a march. The selected-march card covered the 60,000 node at this window size, so the second right-click did not land on the node. Forsaken search said no reachable Forsaken of that level is in explored land. A level-1 camp exists about 17 world units from the city, outside the explored tiles. |
| PvP defeat with the second city | NOT TESTED. No march was issued at either city. |
| Battle report casualty lines | NOT TESTED. Reports opened and correctly said there are no reports yet. |
| House of Renewal through the menu | PASS for opening. Kingdom menu → Healing. Beds 2,000, patients 0 mortal / 0 mythic, every listed tier 0 wounded. Copy on screen: troops who stay with a recovering commander are light wounds, the hospital ledger is severe wounds, and no death or overflow-death rule is active. |
| Start, cancel, complete, or persist a treatment | NOT TESTED. There were no wounded troops to treat. An authenticated heal of 1 infantry was refused with HTTP 400 `Those wounded units are not in your hospital.` No healing receipt was stored. |
| Two clients on one kingdom | PASS for separate cities. A second `ThronesOfMyth.exe` joined as `QA01 Rival` while the first city stayed open. The save has two players, separate stockpiles, and only the first city has a training queue. Troop movement, a shared battle, and private report delivery between them were NOT TESTED. |
| Legacy save compatibility | PASS for server load of a copy only. A copy of `world.json.schema27.bak` was loaded by a second server on port 8096. Health stayed protocol 17 and the same commit. The copy now reads schema 28 with 5 players; the first name is Test1. The original bak file was not rewritten. Native play of that kingdom was NOT TESTED. |
| 1920×1080 and UI scales 0.85, 1.0, 1.15 | NOT TESTED. The played window was 1280×720, then the second window was placed at 1100×700 so both could sit on the primary display. |
| Measured frame time | NOT TESTED. No FPS counter was available. The window stayed responsive and the resource counters kept ticking. |

## Conservation

First city, after founding supplies, one food pack, and one infantry order:

- Food and wood began at 10,000. The food pack adds 100. The training order costs 5,000 food and 5,000 wood.
- While the window was open, food stayed about 100 above wood and both rose together by production. At 17:15 local they read food 5,380 and wood 5,280. That is one 5,000 spend, one 100 food grant, and the same production on both resources.
- Troops stayed 900. Reserve stayed empty. One queue entry: infantry, amount 100, duration 1,500 seconds. One training receipt, id `b521f8c842b142c18da9889746829390`, digest `{"type":"train","targetId":"infantry"}`.
- Replaying that training request before and after the 8095 server restart returned HTTP 200 and left the queue length at 1.
- Inventory after the satchel use: `food-pack-100` 1, `wood-pack-100` 2, and the rest of the founding set unchanged. Receipts: founding supplies `a0147eab20224101838f0d55bf57fa81` and food use `8f89addea2aa42389c3566f056b3d875`.
- Replaying the food use returned HTTP 200. The pack stayed at 1. Food did not jump by another 100.
- Replaying founding supplies with the stored digest (`count` 0, because that is what the client sent) returned HTTP 200. Wood packs stayed at 2 and `suppliesClaimed` stayed true. A replay body that omitted those fields returned HTTP 400 `This inventory request already describes a different action.` and also changed nothing.
- Wounded infantry, archers, and cavalry stayed 0. No healing receipt was written.

Second city, `QA01 Rival`, same server: food and wood about 10,116 from production only, stone 150, gold 1,000, troops 900, empty inventory, empty training queue.

## Visual and input

At 1280×720 the city, inventory, training, marches, reports, kingdom menu, and House of Renewal were readable and clickable. Buttons are easy to miss: the click has to hit the bar, and several attempts landed on the neighboring control. The selected-march card overlapped the resource node, which blocked the march confirmation click. No missing-asset hole was obvious in the city or on the explored map patch. Player log `work/qa01/player-1280.log` has no `NullReferenceException`. The only connection errors are two curl failures while port 8095 was intentionally down; the client showed `Connected` again after the restart.

Screenshots of the primary display:

- `docs/qa/evidence/qa01/native-two-clients.webp` — second client on the entry screen, first client already in the world.
- `docs/qa/evidence/qa01/native-map-route-preview.webp` — route preview, Frontier Captain selected, Forsaken search empty.
- `docs/qa/evidence/qa01/native-hospital-1280.webp` — House of Renewal at 1280×720, 0 patients, policy text visible. The second client is behind it.

## Bugs

No gameplay defect was confirmed, so no code fix was made.

Observed, not patched:

1. Medium, client UI. At 1280×720 the selected-march card covers a resource node that is inside the explored patch. Right-click then updates the route preview instead of issuing the march. Reproduction: confirm the Frontier Captain formation, leave the march card open, and right-click the node under the card. Expected: the second right-click on that node issues the march. Observed: the card receives the click. Not retested at 1920×1080.
2. Low, input. Several IMGUI buttons need a click on the bar itself. A click on the label or just below the row hits a different control. This slowed the playtest. It did not lose resources or troops.

Siege, hospital capacity, healing costs, and fatality policy were left as published. Beds showed 2,000, which matches the existing reference-scale bed formula at this city. No death or overflow rule was added.

## Automated gates

The publication plan was not re-run for this playtest because no gameplay file changed. The last published plan on `0b7e102` remains the Task 8B plan. This native session is not a substitute for that plan, and that plan is not a substitute for the untested march and hospital clicks.

## Publication state

`HEAD` and `origin/main` were both `0b7e1029cbace897547c50f471edfa14400ed26c` when this playtest started. No gameplay commit was created. If this report is published, it is a documentation commit on top of that SHA.

## Checklist

- [x] Windows executable launches successfully
- [ ] Fresh player can progress and fight — city, inventory, training, and a commander formation work; a fight was not completed
- [x] Inventory functions and survives restart — for founding supplies and the one satchel that was used
- [ ] Troop training and promotion work without duplication — one infantry batch did not duplicate; other classes and promotion were not clicked
- [x] Siege remains correctly unavailable
- [ ] Hospital treatment works through real UI clicks — the screen opens; treatment was not possible with zero wounded
- [ ] Battle reports correctly reflect troop outcomes — no battle was fought
- [ ] Two clients interact with the same persistent kingdom — two cities persist independently; they did not fight
- [x] No blocking UI, runtime, or save-corruption defect was found in the paths that were played

## Remaining blockers and next task

The game launches, creates a city, spends one real training order once, and keeps that order across a server restart. It is not yet shown that a player can finish a march, win or lose a fight, and heal the resulting wounded through the same build.

Next engineering task: make the 1280×720 march card leave the clicked world target usable, then repeat the native path through one explored Forsaken fight and one House of Renewal treatment. Do not add a death percentage or a siege roster in that pass. Capture a version-bound casualty table before any later change that would let troops die.
