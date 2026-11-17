# Recovery A native Windows QA — 2026-11-17

Starting main: `23bea5c7409de303dc0f8b81eb825d738a9e8a28`. Native package: clean0.45.0 / source `f6cb144db0fc0ff1472b7f0d122274e3203c5506` / protocol17. The full ZIP passed193 file hashes; the client ZIP passed145. Executable SHA256 `40adc76c08a72722c42921f51052c36de1b8e8c75eb8f76d9007d9e5714ee84f`.

## Final bounded outcome — supersedes checkpoint-pending notes below

**PARTIAL native acceptance; full parity NOT CERTIFIED.** Supported Windows capture worked. The initial clean f6cb144 binary was tested, then three clean source correction checkpoints were built and exercised:645e0df, d8e91a6 and74185be. Final executable is `dist/Windows-NativeQA-74185be/Game/ThronesOfMyth.exe`, version0.45.0 / protocol17. Its full ZIP passed193 manifest hashes,121945145bytes; matching live server health reported74185be and unchanged server digest. Exact full identities/executable hashes and16 case verdicts are in `evidence/recovery-a-native/native-results.json`.

1. **Greek city creation: PASS.** Actual fresh native Greek NativePassQA17A; random Dawn Reach home.
2. **Enter world map: PASS.** City/world navigation; initial unfamiliar/fog focus observation requires isolated retest; Home works.
3. **Mouse-wheel zoom: PASS bounded.** Actual wheel both directions on free terrain; no exhaustive UI-wheel isolation or resolution matrix.
4. **Pan and cursor-centered zoom: PARTIAL.** Keyboard pan and qualitative gold-node cursor anchor observed; middle-button drag NOT TESTED.
5. **All seven zones and ten pass models visually: PARTIAL.** Native discovered overview and ten named rally targets; every label/model not individually certified.
6. **Select and inspect pass: PASS.** Gate of Eos native selection; final74185be full deployed card readable, screenshot36.
7. **Opening requirements and ownership: PASS bounded.** Sealed opening milestone navigation; open/captured owner and outsider access cards observed.
8. **Create alliance: PASS.** Native Dawnkeepers creation;50gold debit.
9. **Army preparation and approach: PASS bounded.** Actual900infantry panel and local approach. Additional territory/unlock prerequisites separately scripted.
10. **Unauthorized army crossing: PASS.** Actual native neutral/open border ground order rejected; screenshot26.
11. **Capture neutral pass: PASS prepared scenario.** Actual native Plan pass rally / ASSEMBLE RALLY / Fighting / victory, screenshots28-31; scripted prerequisites disclosed.
12. **Cross controlled pass: PASS prepared scenario.** Same previously rejected ground destination accepted after actual native capture; screenshot32.
13. **Outsider same passage: PARTIAL.** Actual second native account sees same Eos BLOCKED CROSSING, rejected destination west of pass; screenshots37-38. Starts Outer Marches, so not a single-border isolation.
14. **Scout uncontrolled pass: PASS bounded.** Actual native scout20,20 completed across two uncontrolled sealed passes; further20,60 return. Scripted16 discovery missions excluded.
15. **Ownership and troop location restart: PASS bounded.** Actual packaged process/client restart, same identity, owner,900infantry/100reserves, exact field location; before/after JSON.
16. **Minimap and every boundary: PARTIAL.** Native minimap focuses Eos and northwest fog, bounded overview; exhaustive four edges/cells and zoom limits NOT TESTED.

Pass visibility/usability: Gate of Eos was physically visible, selectable, capturable and traversable by its owning alliance. On the final native binary all five intelligence lines, health, footer action and separate deployed-order ribbon are readable (screenshot36). The outsider sees the same pass red/BLOCKED CROSSING, owner Dawnkeepers, hidden defender intelligence and a native route-denial toast (37–38). Because the outsider's home is Outer Marches, its distant route can involve other blocked borders: the isolated adjacent-zone comparison remains NOT TESTED. Native overview39 shows discovered mountain/pass geography, but does not certify every zone label/model individually.

Camera/zoom: bounded wheel, plus/minus, keyboard response and minimap focus worked. Qualitative cursor anchor only; no instrumented pixel-error/ergonomic claim. Middle-button drag, all resolution variants and exhaustive boundaries remain NOT TESTED. Northwest minimap corner correctly focused an unexplored fog region (40); fog is not proof of absent geography. Initial fresh-city world focus required Home in an observation; this needs a controlled repeat before calling it a reproducible defect.

Failures and fixes: NA-001 obsolete exploration denominator fixed in645e0df; native caption1631/4096=39.8% confirmed. NA-002 clipped pass card fixed in d8e91a6; that native retest found deployed-ribbon overlap, fixed in74185be and actually retested PASS in36. Regression counts16776→16782→16784 production C# contracts; actual Unity compilation/topology reran, and each correction passed49 required publication checks. No server/balance/save-schema changes. The screenshot formerly named34-pass-information-corrected-native is renamed34-pass-information-ribbon-overlap because it shows the intermediate failure, not a pass. A failed earlier outsider input hit a camp; it is not route-denial evidence and screenshot35 is excluded from published proofs.

Logs: actual native Player logs and build/publication logs are retained privately under `work/recovery-a/`. Sanitized relevant excerpts are in `evidence/recovery-a-native/runtime-log-summary.txt`. Unity emitted serialization-depth warnings around recursive ArmyData.homeFormations in both final clients; no crash or associated troop/ownership loss was observed. This warning is recorded for investigation, not silently labeled a clean log or repaired by changing DTO/save behavior in this presentation checkpoint.

Capture diagnosis: the earlier CUA wrapper could not target Unity; the supported Windows Sky alternative captured actual Unity successfully. With two same-executable windows, a snapshot could initially show the other foreground client; explicit activation and fresh observation resolved it. Input guards requested refresh; later unsolicited window changes prompted a handoff question, and the user explicitly authorized resuming QA control. No guarded action was bypassed. Some extra outsider scout/camp activity is not attributed to the agent's acceptance sequence. Final native route denial was independently observed after refresh.

Safety: only dynamically allocated loopback QA kingdoms were used. Original fresh native checkpoint preserved separately; the focused capture scenario used a copy plus the explicitly labeled51-command production preparation below. Actual native capture, crossing and process restart followed. Both final QA clients and owned server closed; synthetic display-name preference restored byte-for-byte. All three original distribution archives remain byte-identical. No real saves, existing sessions, credentials or private tokens were committed.

Manual continuation: [complete16-case Windows checklist](RECOVERY_A_MANUAL_WINDOWS_CHECKLIST.md) includes the exact isolated launcher/resume commands, buttons, expected results, evidence and seven-zone/ten-pass inventory. Passing local server tests does not upgrade any native NOT TESTED result. **STOP at this checkpoint; Tasks7–10 untouched.**

## Historical execution notes

## Execution method and scope

The supported Windows `@oai/sky` API successfully activated and captured the actual Unity window. This resolves the earlier wrapper capture blocker for this run. An initial input call reported detected user input and requested a new observation; fresh observation followed before input resumed. No user-stop event occurred. Only QA game windows were controlled. Screenshots in `evidence/recovery-a-native/` show actual native rendering and mouse/keyboard actions; Unity object counts and backend tests are not used as native PASS.

An untouched packaged Server/index.mjs runs on a dynamically allocated127.0.0.1 port, with a new UUID save under ignored `work/task4/native-resume-*`. Health confirms matching source/protocol/server digest. New Greek city `NativePassQA17A`; no real save/default launcher/active game session touched. Actual native orders only: no API gameplay commands, grants, forged fog, ownership edits or maximum-state fixtures. A read-only authenticated observer corroborates the synthetic city's position,64x64 exploration and troop counts; tokens remain private. Normal wall-clock training continues; two existing founding universal hourglasses removed120 seconds through native inventory controls.

## Verified native observations at correction checkpoint

PASS: Greek city creation; paid Citadel2 completion; city/world navigation; wheel zoom in/out; bounded cursor anchor check around a gold node; keyboard pan response; minimap focus into a scouted Sunward Province; selecting Gate of Eos; sealed-state card and opening-milestone navigation; alliance creation with50gold debit;900-troop army panel; local marching; native cross-zone ground order rejected with “No authorized gate route from this march to that destination”; scout send20,20 through two unowned sealed passes and return; native gathering and delivery6300stone; first actual camp victory; native Oathbound Hall construction; paid100-infantry training queue/debit; ordinary inventory speedup consumption.

PARTIAL: camera ergonomics and full minimap/boundary coverage. Pass models and Sunward zone text were observed after legal scout discovery; all seven zone labels and all ten pass models have not yet been individually inspected in this native run. Fog hides unscouted3D geography; public pass labels remain selectable.

At this code-correction checkpoint, native pass capture, subsequent authorized crossing, outsider comparison and post-capture restart are still IN PROGRESS, not PASS. Final observations will be added separately. Tasks7–10 remain untouched. No new RoK numerical parity claim.

## Confirmed bug NA-001 — obsolete exploration denominator

Reproduce on clean f6cb144: create Greek city → Marches → Scouting. Initially21 explored cells are displayed as21/400 and5.3%; after the native scout returns,168 cells show168/400 and42.0% (screenshot18). The actual authenticated server snapshot reports width64,168 explored and4.1%. The correct total is64×64=4096; the progress bar is also inflated by the same old denominator.

Correction: `PrototypeClient.Exploration` uses snapshot width via `ScoutInterfaceCopy` for both caption and progress fraction. Seven new production C# assertions cover21/4096→0.5%,156/4096→3.8%, explicit20-column legacy maps, completed64-column maps, half completion, absent dimensions and bounded invalid counts. Added assertions first produced compile-red missing helper methods; implementation then passed all16,776 presentation contracts. This is a display-only bug fix, explicitly exempted in the research registry: no numerical gameplay, exploration rules, fog permissions, save field or balance changes. Native corrected-binary retest remains pending at this checkpoint.

## Disposable manual launcher

From a PowerShell terminal opened in the repository:

```powershell
& .\dist\Windows-Passes-f6cb144\Runtime\node.exe .\scripts\start-native-windows-qa.mjs --clients 2
```

No game-file editing or Windows security-policy changes are needed. The helper validates every package file, starts only its own matching server on a new loopback port, creates a unique ignored QA save and opens one or two actual clients. Give each client a unique QA commander name before Enter your kingdom. Close both QA game windows to save and shut down only that owned server. The helper prints its run ID and stable port. Resume the same QA kingdom with `--resume-run <printed32hexID>` and the same `--package`; using the same commander name resumes its own endpoint-scoped session. Do not use the normal packaged launcher for disposable QA.

Actual helper smoke: new run c8a2eac351db450dadc66c6b872979f2, fresh empty kingdom visible, matching f6cb144, independent port50915, QA client12776. Closing only that window caused graceful helper/server completion, exit0. The main native expedition remained running on its original separate port. The attempted PowerShell-file helper was blocked by this machine's script execution policy and was replaced with this bundled-Node method; no policy was bypassed or changed.

## Capture scenario preparation and native execution

The f6cb144 fresh-city observations above remain intact in the original private QA checkpoint. For a focused pass UI scenario, a separate copy of that same city was prepared using51 production commands and accelerated `World.tick(.25)`, with a fixed wall clock. This is SCRIPTED SETUP, not native progression proof: a normally spawned ordinary Greek helper won the remaining three camp battles; the existing paid training finished; the normal gate milestone opened; the owner paid for eight connected beacons;16 ordinary scout-send missions revealed the zones/passes. No resources/troops/positions/fog/ownership fields were assigned. All ten passes were asserted neutral afterward, and the owner's900troops/home identity were preserved. The sanitized full action ledger is `evidence/recovery-a-native/command-preparation.json`. Do not count these51commands as mouse/keyboard actions.

The clean corrected0.45.0 package `645e0dfba6d04270a38c9b40a106b10e806f0738` passed193 file hashes, protocol17, same unchanged server digest. After native session resume, its scouting caption showed1631/4096 and39.8%, matching the live snapshot. NA-001 corrected-binary retest PASS.

Actual native inputs then marched the900-troop army to the accessible east side of Gate of Eos, rejected a ground order beyond the open neutral pass, returned home, selected Plan pass rally →10s assembly → ASSEMBLE RALLY. The native UI showed Fighting and fortification damage; it subsequently showed Victorious, a blue pass and ALLIANCE ACCESS. No backend capture command or ownership mutation was used. The same previously rejected ground click was then accepted and the formation crossed into Sunward Province. This is native capture/crossing with explicitly scripted prerequisites, not full organic native progression certification.

## Confirmed bug NA-002 — clipped pass intelligence

Reproduce on f6cb144 or645e0df: select an open Gate of Eos. The owner/opening/access/adjacent-zone/defender details form five logical lines but are sent to a23px `OneLine` label in a138px card. Native screenshot24 shows clipped fragments; opening/owner/access cannot all be read. Rally controls work, but pass information usability FAIL on those binaries.

Correction: only pass context cards expand to284logical pixels and render their existing subtitle as wrapped text in168pixels. Existing health and footer controls move below that text; ordinary cards retain their138px footprint. Six geometry assertions cover expansion, separation and room for eight wrapped18px lines; all16,782 presentation contracts pass. Actual Unity6000.3.0f1 compilation/object validation reran successfully:7labels/10models/10crossings/447mountain renderers, new source fingerprint501d784925e84cb0d9a080fc9529d7f6f5c9d0f20ba41fabea5b087186705d2b. This is an explicit non-balance presentation bug-fix exemption. Native corrected-card verification is still pending its clean binary at this checkpoint.

## Post-capture restart and NA-002 deployed-ribbon retest

After actual native capture/crossing, the real packaged server and client were closed and restarted on the same isolated endpoint using the persisted QA file. Native session resume succeeded; Space focused the saved army west of the still-blue Gate of Eos. Read-only before/after comparison preserves exact playerID, home, field position(74.3809585571289,16.892929077148438),900infantry,100reserves, commander, alliance and all ten pass owners. Idle→Paused is the documented safe restart behavior, not a troop/location reset.

The d8e91a6 native card retest revealed an additional overlap: owner/opening/access lines are now readable, but the existing deployed-march order ribbon remained at its old fixed vertical coordinate and covered the lower defender/instruction lines. Thus NA-002 was NOT yet a native readability PASS. Follow-up moves that same ribbon above the entire context card; its ordinary-card placement is unchanged. Two further geometry assertions pass; total16,784 production C# contracts. Corrected deployed-card native retest remains required. No balance or save change.

A tooling attempt set Math.random=.3, but the production World uses crypto-based secureRandom, so this did NOT select Dawn Reach. The actual native outsider spawned ordinarily in Outer Marches(161.38580617496433,234.82957120685228). No home/location fields were assigned. The attempted seed is not evidence of a controlled spawn or an isolated single-pass comparison. The real native-captured pass state is loaded intact. A private initial Windows `--import` absolute-path attempt failed before server startup; converted to a standard file URL, then the owned server started successfully. No gameplay failure is attributed to that tooling-path error.
