# Overnight handoff — 2026-11-21 release candidate

This run is **PARTIAL**. The release candidate is built from the clean gameplay commit and the registered checks passed. The new Windows executable was not played, and the Linux player was not executed.

## SHAs

| Point | Commit |
| --- | --- |
| Before prompt 01 (parent of the march-card commit) | `d57690d` |
| Gameplay head after prompts 01–09 | `23f58ceb23fd3fa0da729e3face4445e2714305a` |
| Pushed `origin/main` at the start of this package pass | `23f58ceb23fd3fa0da729e3face4445e2714305a` |
| Handoff commit | the publication that adds this file; `origin/main` must equal `HEAD` |

Both new packages stamp that gameplay commit, version `0.45.0`, protocol `17`, Unity `6000.3.0f1`, and `dirty: false`.

## Checkpoint status

| # | Checkpoint | Published commit | Status |
| --- | --- | --- | --- |
| 01 | March card no longer covers a legal node | `d57c38b` | PASS at interface preference 1. 1280×720 client area 1264×681. 1920 window client area 1904×1041. Preferences 0.85 and 1.15 were not played. |
| 02 | Fresh Forsaken search, march, fight, report, return | `3b72969`, evidence `4a75e04` | PASS on the Overnight client, port 8099. One victory, 50 AP once, 100 XP once, 900 infantry kept. |
| 03 | Real defeat, hospital treatment, one refund, restart | `ff46e1b` | PASS. Seeker 900 = 675 recovering + 225 hospital + 0 dead. Ten treated once. One cancel refunded once. |
| 04 | Infantry, archers, cavalry, one promotion | `84b3148` | PASS for the orders that were watched. Archer and cavalry batches were cancelled before completion. Siege stayed closed. |
| 05 | Inventory actions and exactly-once receipts | `71d50d2` | PASS per item family on the isolated inventory city. Experimental 25-level jobs were not used. |
| 06 | Two native clients, privacy, PvP | `d9c7ee0` | PARTIAL. Herald and Banner reconnected on port 8103 with private snapshots. They did not fight. Seeded server duel PASS. |
| 07 | Scout, fog, search, denied march copy | `7c43926` | PASS. Olive Rest claimed once. Denied preview spent no action points. |
| 08 | City jobs, speedups, bounded catch-up | `3d5c260` | PASS on Mason, port 8105. One Oathguard job was left running. No reward was claimed. |
| 09 | Usability of daily, event, and campaign screens | `c669ab4` through `23f58ce` | PASS for the clipped screens that were played. Scale 0.85 and a displayed 115 percent were not native screenshots. No FPS. |
| 10 | This release candidate and handoff | this commit | PARTIAL. Packages and server smoke below. The new player was not clicked. |

## Tests run on `23f58ce` while the tree was clean

Environment: Windows 10.0.26200, Node `v24.18.0`, Unity `6000.3.0f1`, Python 3 for the gates. No frame-time recorder was started.

| Command | Result |
| --- | --- |
| `python -X utf8 scripts/publish_task.py` | PASS. Research gate `gameplay_paths: 0`, `numeric_checks: 0`. 95 publication-plan commands passed. Push was not requested by that command. |
| `node --test --test-concurrency=4 server/*.test.mjs` | PASS inside that plan. 516 tests, 511 passed, 0 failed, 5 skipped. |
| `python -X utf8 scripts/verify-windows-package.py dist/Thrones-of-Myth-ReleaseCandidate20261121.zip` | PASS. 194 files, protocol 17, dirty false, commit `23f58ce`. |
| `verifyPackage('dist/LinuxReleaseCandidate20261121')` | PASS. Protocol 17, dirty false, same commit. |
| Unity `WindowsPlaytestBuilder.BuildFromCommandLine -thronesFullPackage ReleaseCandidate20261121` | PASS. Log `work/rc-windows-build.log`: `Build Finished, Result: Success` and `Exiting batchmode successfully now!` |
| Unity `LinuxPlaytestBuilder.BuildFromCommandLine -buildTarget Linux64` | PASS as a cross-compile. Log `work/rc-linux-build.log`: `Build Finished, Result: Success`. |
| `CombinedIntegrationReview.Validate` | NOT RE-RUN. The publication check compared the stored fingerprint `b03557920bf9495158b17c33058f0358fd9cde4f59568e48d12feaa1687a4e87` (88 scripts). The two player builds are the fresh compiles. |
| Linux player execution | NOT TESTED. See below. |
| New Windows `ThronesOfMyth.exe` click-through | NOT TESTED. |

The five skipped server tests are the Linux-only launcher cases in `server/linux-package.test.mjs`. A skip on Windows is not a Linux pass.

## Packages

Older ZIPs were left in place. `dist/Thrones-of-Myth-Windows.zip` still hashes to `B90669A979036AF8670A1398FE45A1807AEA3A8E78E8FDBDC3135D79BA844C28`. `dist/Thrones-of-Myth-Linux-x86_64.zip` was moved aside for the build and put back; it still hashes to `79827D65AB4FA0D65BF0963A3263A454CE064193BD3D85899DD0484D5D4737AC`. `dist/Linux` is the previous folder again.

| Artifact | Identity |
| --- | --- |
| `dist/Thrones-of-Myth-ReleaseCandidate20261121.zip` | 121,963,669 bytes. SHA256 `E69228460ACF8FF0D9A6377086D929D9FAF503782EB05166665C972089264E34`. Folder `dist/ReleaseCandidate20261121`. |
| Windows manifest | version 0.45.0, protocol 17, dirty false, commit `23f58ceb23fd3fa0da729e3face4445e2714305a`, server digest `62aa973705de0468d6fc087086ba0f2f03f24b0673321cb56aa2e72746477ce5`. |
| `dist/Thrones-of-Myth-Linux-ReleaseCandidate20261121.zip` | SHA256 `FD758DC6D74FE708DA9877AB9DC281F9950726C230BB006944B081FA475DFAA3`. Folder `dist/LinuxReleaseCandidate20261121`. |
| Linux manifest | same version, protocol, commit, and dirty flag. Platform `linux-x86_64`. Server digest `3c74ac6f78b670d40b0df3839dc3aa05f12c1d1f031aba0a5b984bcb7777400b`. Player ELF SHA256 `8027f7d1f9ae7dacfc826fb218adcc1ae7464af098a8a59397e7531c0f7ec0bc`. |

The 46 server files present in both packages have the same hashes. The Linux archive also contains `Server/qa-reference-host.mjs`, `Server/qa-reference-world.mjs`, `Server/reference-city.mjs`, and `Server/reference-city-http.mjs`. `server/index.mjs` does not import them. They are why the digests differ. Those files were not removed after the build, because rewriting the archive would no longer match the manifest.

### Windows smoke

The packaged `Runtime\node.exe` was started with `THRONES_SAVE_PATH=work/rc-kingdom/world.json` and `--local-port=8110`. `GET /health` returned status ok, protocol 17, and the Windows digest above. The save had 0 players. The process was then stopped. Port 8110 was closed afterward. The game executable was not launched.

Do not double-click `Start Thrones of Myth.cmd` in this package. That launcher binds port 8080 and does not set `THRONES_SAVE_PATH`, so the server falls through to `%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json`.

Tomorrow, from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-release-candidate.ps1
```

That script refuses the production save directory, refuses ports 8080 and 8095, and starts the packaged server on `work\rc-kingdom\world.json` at port 8110. It then opens `Game\ThronesOfMyth.exe --thrones-server http://127.0.0.1:8110`.

### Linux

Unity Linux Build Support (Mono) is installed: `Editor\Data\PlaybackEngines\LinuxStandaloneSupport`, with `linux64_player_nondevelopment_mono`. The batch build produced a StandaloneLinux64 ELF (`7F 45 4C 46`).

Native execution was not run. This machine's WSL root is a 127 MB disk that is 100 percent full (`/dev/sdd`, 0 available) and reports musl libc. Executing the ELF returned `execvpe(...) failed: No such file or directory`, which is the missing glibc loader, not a missing package file. Running the Windows executable under Wine was not used and is not a Linux result.

The Linux package's `Server/index.mjs` was started with the host Node `v24.18.0`, `THRONES_SAVE_PATH=work/rc-linux-kingdom/world.json`, and `--local-port=8111`. Health returned protocol 17 and the Linux digest. That process was stopped. This checks the packaged server on Windows. It does not play the Linux player.

Ubuntu server path already in the repository, not observed from this machine tonight:

```yaml
# .github/workflows/server.yml
runs-on: ubuntu-latest
node-version: '24'
working-directory: server
run: npm test
```

`npm test` is `node --test` in `server/`, which includes `linux-package.test.mjs`. On Ubuntu the Linux launcher cases are not skipped. A green Windows run does not count as that job.

Graphical Linux player test, on a glibc machine with a GPU, Node 24, and a writable disk:

1. Extract `dist/Thrones-of-Myth-Linux-ReleaseCandidate20261121.zip` somewhere other than the old `dist/Linux` tree.
2. Set `XDG_DATA_HOME` to a new empty directory. The launcher otherwise uses `~/.local/share/ThronesOfMyth/Saves`.
3. `node Launch.mjs --port=8112`. Confirm the printed commit is `23f58ceb23fd3fa0da729e3face4445e2714305a` and that it does not say `MODIFIED SOURCE CHECKOUT`.
4. Play the checklist below in that window. Close the launcher and confirm its owned server exits.

## Saves and ports

Production `%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json` hashed to `699A555BF038E28082626EDA55F9F5F53B725DF021FEF5FED2D9989700744101` before and after both smokes. It was not opened.

| Port | Save | This pass |
| --- | --- | --- |
| 8095 | QA-01 kingdom | Closed. Do not start it. |
| 8097–8106 | Existing isolated kingdoms (march card, overnight, Forsaken, defeat, training, inventory, PvP, scout, city, UI) | Still listening. Do not stop them and do not point them at the production save. |
| 8110 | `work/rc-kingdom/world.json` | Used for the Windows package health check, then closed. The QA script uses it again. |
| 8111 | `work/rc-linux-kingdom/world.json` | Used for the Linux package server health check, then closed. |

Cleanup is limited to those two RC servers, which are already stopped. Do not delete `work/*-kingdom` saves.

## Defects and fixes already on this SHA

- A fresh city's Forsaken search now returns a legal route outside city sight without revealing fog. Camp stats, AP, and rewards were not changed.
- The selected-march card sits in the left column. A second right-click sends the march.
- A denied military preview says a scout can still survey the point.
- Inventory, training, hospital, event, and season commands keep their existing exactly-once ids.
- Daily chests, the event hub tab, and chronicle titles stay readable. An unscheduled event family says it is not scheduled and has no reward button.

No new gameplay defect was fixed in this package pass.

## Tomorrow's manual sequence

Use `scripts\start-release-candidate.ps1` on Windows, or the Linux steps above. One new city name. Do not use Mason on port 8105, and do not claim that city's season milestone.

1. Create the city and confirm the footer commit begins with `23f58ce`.
2. Let the scout move past the starting ring. Search level-1 Forsaken and read the result.
3. Select the Frontier Captain, preview a legal node or camp, then send with the second deliberate click. Confirm a panel button does not send a march.
4. Fight that camp. Record AP, XP, and troop counts once.
5. Open the battle report.
6. If there are wounded, treat one selection once in the House of Renewal. Cancel a second order only if a refund is the thing being checked.
7. Train one infantry, archer, and cavalry quote. Promote only after the lower tier is actually ready.
8. Use one owned inventory stack on the job it names. Restart only the RC server and confirm the receipt did not repeat.
9. Join a second client to the same port with a second name. Confirm the foreign card hides stockpiles and reports. Fight only if a legal route exists.
10. Open daily activity, seven-day login, the event hub, and season rankings. Claim only a control that is enabled. If a family says "Not scheduled", it has no reward button; do not invent one.

Record the resolution, the interface slider percentage, and whether the window was maximized. Do not write an FPS number unless the in-game recorder was actually started.
