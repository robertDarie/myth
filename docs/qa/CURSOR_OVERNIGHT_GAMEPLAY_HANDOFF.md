# Cursor overnight gameplay handoff

Isolated checkout: `C:\Users\rober\Documents\GitHub\myth-cursor-night`. Branch: local `main`. Nothing in this sequence was pushed. The original checkout `C:\Users\rober\Documents\GitHub\myth` was not edited. `origin/main` remained `3b050272a027e158b4c947182c6bac34ef8f3482`.

## 1. Original starting SHA

`3b050272a027e158b4c947182c6bac34ef8f3482` (`origin/main` at the start of the overnight work).

## 2. Local commit SHAs

1. Scouting and fog: `c74d40a` — Let automatic scouts continue through every reachable fog cell.
2. Forsaken search and march: `a603f2f5ec88022a61c3ad8c4a750d0a4bc04121` — Let a city search a lawful Forsaken and march to that private pin.
3. Primary and secondary battle skills: `f38ba912e850508c43fda76db2f36a180b085ab8` — Let a paired secondary commander spend the next rage bar.
4. Alliance invitations and disbandment: `5be1b78a001f3a8fdee0b81e28c79fc12788e604` — Record alliance invitations and return marches when an alliance is deleted.
5. Kingdom search and march preview: `0cb1016f0f6ceaac2de0a3f21f7bf3e86fa83394` — Let the world screen preview an authorized route before a march starts. This handoff line was added in the following local commit so the SHA could be recorded after that commit existed.

## 3. Features actually implemented

- Legal automatic scouting can continue through every reachable fog cell. Military marches still stop at an unowned or sealed pass. Scout travel keeps the physical route.
- A city can search an unlocked Forsaken level. A found pin is private to that city. The owner can march to it. Godbreakers stay rally-only. Ordinary Forsaken stats, 50 AP, 100 XP per level, the 90 second respawn and the 0.1 rare chance were not changed.
- A paired secondary active spends the next 1000 rage after the primary spends the first bar. Existing damage, shield, heal and expertise factors stay. The removed 1 percent per secondary level multiplier stays removed.
- Leaders and officers can invite an unaffiliated city. The invitation is private to that city and to officers, and it counts toward the existing 100-member ceiling. Open join remains. Deleting the last member returns marches still assigned to that alliance's rallies or garrisons. The roster shows weekly help, gather and stronghold counts that were already stored.
- The world screen lists resources, divine passes, sanctuaries and shrines, strongholds, and the viewer's own alliance markers, beacons and rallies from the snapshot the server already returned. The first right-click calls `GET /march-preview`. A second right-click on the same point sends the existing move, attack, gather or capture command only when that preview is authorized.

## 4. Files modified

Task 5 gameplay files:

- `server/marches.mjs`
- `server/world.mjs`
- `server/http.mjs`
- `server/realms.mjs`
- `server/kingdom-play.test.mjs`
- `client/Assets/ThronesOfMyth/Scripts/WorldModels.cs`
- `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs`
- `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs`
- `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Screens.cs`
- `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.KingdomSearch.cs`
- `research/parity/features/kingdom-search.md`
- `research/parity/fixtures/kingdom-search.json`
- `research/parity/approvals/cursor-night-5-kingdom-search.json`
- `research/parity/registry.json`
- `research/parity/publication_scope.json`
- `research/MYTH_feature_coverage_register.csv` (TM-020)
- `research/V1_FUNCTIONAL_BACKLOG.md`
- `docs/development-report.md`
- `scripts/publish-tests.json`

Earlier overnight commits also changed scouting, Forsaken, commander battle and alliance modules. `git show --stat <sha>` lists each one. City construction, training and economy modules were not edited in this sequence.

## 5. Functional tests passed

Recorded on this machine during the overnight:

- `node --test server/exploration-coverage.test.mjs` passed in task 1, including the 4096-cell legal auto-explore.
- `node --test server/forsaken-encounters.test.mjs` passed in task 2.
- `node --test server/commander-battle.test.mjs` passed in task 3, with the secondary-passive, progression, war, Forsaken and stronghold regressions named in the development report.
- `node --test server/alliance-warfare.test.mjs server/social.test.mjs server/campaign.test.mjs` passed in task 4.
- `node --test server/kingdom-play.test.mjs` passed in task 5: three tests, zero failures.
- `python -X utf8 scripts/check_parity.py` and `python -X utf8 scripts/check_rok_contract.py` passed again before the task 5 commit. `full_parity_certified` stayed false.

The full server suite result is in the final section. A passing research gate is not a claim that every Rise of Kingdoms number matches.

## 6. Reproduced bugs and fixes

- Task 1 kept military routes fail-closed while scouts use the physical route. A route-locked army stays in place with its units. That behavior was already tested and was not turned into an automatic return.
- Task 2 search no longer has to guess a hidden level 21 camp. High levels stay behind the existing unlock and kingdom gates.
- Task 3 removed the path where a secondary level multiplied damage. The secondary now spends the next rage bar. Shields still expire after four seconds.
- Task 4 invitations no longer leak on the public alliance snapshot. The last leader's departure now releases leftover rally and garrison marches before the alliance is deleted.
- Task 5 stops the first right-click from issuing a march before the server has returned the same route decision the march command uses.

## 7. Remaining missing functionality

- Alliance donation costs, alliance technology effects and gift probabilities.
- Healing help for hospital jobs. Help remains construction and research.
- A native click-through of the new search panel, march preview, scouting, Forsaken combat, commander pairing and alliance war screens.
- Production-scale pass capture with a fresh city's starter army. A fresh city is rejected at rally creation until the Oathbound Hall exists. The defended pass fight in task 4 used the existing opened-kingdom fixture, not a full production troop scale.
- Live Rise of Kingdoms search layout, confirmation gesture and result ranking.

## 8. RoK reference discrepancies

- Open join remains alongside invitations.
- The secondary active uses a local alternating rage bar because the checked sources conflicted. It is not claimed as the live cast order.
- Fog, scout speed and scout count stay on the existing local table.
- Pass ownership opens only that pass corridor. This is the Recovery A military rule, not a certified live map.
- Search results are the objects already in the player's snapshot, not a separate live-game search index.

## 9. Unverified numerical data

- Scout camp speed and capacity were left on the existing local table.
- Forsaken spawn density, patrol speed and rare-drop tables.
- Fort, guardian and event-boss reward tables.
- Exact primary/secondary cast order, hidden attack, counter, rage-gain and wound formulas.
- Donation prices, alliance-technology effects, gift odds and any member cap other than the local 100.
- Pass defender troop counts and territory bonus numbers.
- March speed and search radius. The preview did not introduce a new number.

## 10. Native-client verification results

Native play was NOT TESTED. No Windows player package was built.

Unity 6000.3.0f1 batchmode compiled the project scripts and exited with "Exiting batchmode successfully now!". The script graph reported Tundra build success. The only compiler message was the existing `CommanderSkillVfx.audio` hiding warning. That compile does not exercise clicks.

Manual Windows reproduction, from this checkout, without overwriting an installed package:

1. Start the kingdom server from `C:\Users\rober\Documents\GitHub\myth-cursor-night` with the existing local command (`node index.mjs` or the project's usual launcher). Do not point it at a real player save.
2. Open this checkout's Unity project in the Unity editor and press Play. Do not run a release build that replaces an existing Windows package.
3. Join a disposable kingdom with two different names.
4. On the world screen, cycle the list at the upper right through Resources, Passes, Sanctuaries, Strongholds and Alliance. Confirm a hidden enemy army is not listed.
5. Left-click a known resource or pass. Confirm the status line shows the server preview sentence and no march has left home yet.
6. Right-click open ground once. Confirm the army is still idle. Right-click the same point again and confirm a march starts only if the preview was authorized.
7. Right-click a point across an unowned divine pass. Confirm the second click does not start the march and the status line names the authorized-gate denial.
8. Search a Forsaken level from the existing Forsaken box, attack that pin, and open the report.
9. Open Commanders and confirm primary and secondary assignment still send `commander` and `pair-commander`.
10. Create an alliance, invite the second city, and confirm the second city sees the invitation. Stop the server and join again. Confirm the city, alliance and any returning march are still present.

## 11. Save compatibility

No world schema or protocol version was raised in task 5. Preview is not stored. Alliances saved without an invitation list still load as an empty list from task 4. Existing cities, pass ownership and numeric profiles were not migrated to new numbers. Restart in the task 5 test kept the city name, alliance id and troop census.

## 12. Potential conflicts with Codex's City Hall work

Codex is working in the original checkout on city hall, buildings, economy, training and research. This sequence did not edit `server/city.mjs`, `server/city-content.mjs`, or the economy and training modules. Conflicts are still likely in shared files both sides touch:

- `server/world.mjs`
- `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs`
- `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs`
- `client/Assets/ThronesOfMyth/Scripts/WorldModels.cs`
- `research/parity/registry.json`
- `research/parity/publication_scope.json`
- `scripts/publish-tests.json`
- `research/MYTH_feature_coverage_register.csv`
- `research/V1_FUNCTIONAL_BACKLOG.md`
- `docs/development-report.md`

Task 5 also changes `server/marches.mjs`, `server/http.mjs` and `server/realms.mjs`. Keep Codex's city costs and timers if both sides edited a shared client file.

## 13. Recommended integration sequence

Review, do not push this checkout. In the integration checkout, cherry-pick onto the morning `origin/main` in this order:

1. `c74d40a`
2. `a603f2f5ec88022a61c3ad8c4a750d0a4bc04121`
3. `f38ba912e850508c43fda76db2f36a180b085ab8`
4. `5be1b78a001f3a8fdee0b81e28c79fc12788e604`
5. `0cb1016f0f6ceaac2de0a3f21f7bf3e86fa83394`
6. The following local commit, which only records that SHA in this handoff.

Resolve shared files by keeping both the city-hall behavior and these world commands. Re-run the commands in section 14. Do not force-push, rebase this overnight branch onto Codex, or reset either checkout.

## 14. Commands

```text
node --test server/exploration-coverage.test.mjs
node --test server/forsaken-encounters.test.mjs
node --test server/commander-battle.test.mjs
node --test server/alliance-warfare.test.mjs
node --test server/social.test.mjs
node --test server/campaign.test.mjs
node --test server/kingdom-play.test.mjs
python -X utf8 scripts/check_parity.py
python -X utf8 scripts/check_rok_contract.py
```

Full server suite used for the final pass:

```text
cmd /c "node --test server\*.test.mjs"
```

## Final suite result

`cmd /c "node --test server\*.test.mjs"` finished with 469 tests, 464 passed, 0 failed, 5 skipped, in about 28 seconds. The five skips are the existing Linux package and launcher checks, which this Windows machine does not run. Unity 6000.3.0f1 batchmode script compilation succeeded and no player package was produced.
