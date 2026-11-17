# Private creator preview — release preparation

## Delivered archive and bounded execution —2026-11-17

**PRIVATE PREVIEW; native release acceptance PARTIAL.** Final game/runtime source `89a4b967eda719200fc163e00215d6728a14136f`, game0.45.0, protocol17, Unity6000.3.0f1. This source was published with51 required checks passing and independently confirmed on origin/main before the clean Unity build. No gameplay/runtime source changed afterward; the final evidence publication is documentation only.

Final archive: `dist/Thrones-of-Myth-Creator-Preview-0.45.0-Windows-89a4b967.zip` —131,443,936bytes (~125.4MiB). SHA256: `9d22646f7a0f320609b0146c1c261fe1f6411e02b3a018ef8ad600475636a5a8`.216 hashed payload files plus manifest. Full archive verifier read every member and passed inventory, payload/server digest, private-path/data-pattern and static offline-link checks. This is a bounded scan plus explicit public-input selection, not a mathematical proof that arbitrary hidden information cannot exist in a binary.

Extracted that exact ZIP into `dist/Creator Preview QA 89a4b967` and invoked its actual `START THRONES OF MYTH.cmd` without launcher arguments. Only that child process's LOCALAPPDATA was redirected to a disposable path with spaces; normal game saves and the default creator profile were untouched. Matching server readiness, Unity startup, actual Greek guest creation and native city rendering PASS. Screenshot01 shows source/version/empty kingdom;02 shows the created Greek city. Actual server health independently matched the package source/protocol/digest.

Windows input guards/foreground changes interrupted further interaction. No input was sent to the unrelated application. The user explicitly answered **“Finish with remaining native cases marked NOT TESTED.”** No further GUI actions were performed. Cases6–14 (navigation, camera, scouts, preparation, combat, pass/zone rendering, normal exit/save, native reopen and normal window-close cleanup) remain NOT TESTED on this final extracted ZIP. Earlier Recovery A gameplay results and included stills stay separately attributed; they do not upgrade these cases. Six of15 release checks PASS (including non-native ZIP validation); nine NOT TESTED. See `qa/evidence/creator-preview/verification.json` for every observation.

Cleanup intentionally terminated only the exact extracted QA game process after the user ended interaction. Its launcher reported unexpected game closure, saved/stopped its owned server in cleanup, and remained at its error pause. After confirming no owned extracted Node runtime remained, only that CMD was closed. This is not a spontaneous game crash and not a normal native-close PASS. Read-only production `World.fromSave` of the retained QA checkpoint confirms one Greek city/900starting infantry; it is not native reopening. The non-credential display-name preference was restored and verified byte-for-byte. No credentials, private saves, profile JSON or reconnect tokens were published. Native Player log repeats the known ArmyData serialization-depth warnings, with no Exception: lines; sanitized excerpt included. Original three recorded distribution ZIPs remain byte-identical.

## Included creative material and sharing

Send only the final ZIP above and its SHA256 through the owner's chosen private transfer. No external upload was performed. The collaborator downloads, right-clicks Extract All into a normal folder, and double-clicks **START THRONES OF MYTH.cmd**. They need neither Unity/Node/Git nor Administrator rights. Keep the launcher open while playing; close the game normally and await the saved message. Use the same name/package to resume. Creator saves live separately under `%LOCALAPPDATA%/ThronesOfMyth/CreatorPreview/0.45.0`; never send that profile with the ZIP.

Included: START_HERE.txt with exact player steps; CREATOR_FEEDBACK.md10–15-minute tour; KNOWN_LIMITATIONS.md; CREATOR_PACK/index.html; proposed PRODUCTION_BRIEF.md; identity-only rosters.json for5cultures/11commanders/17buildings/7zones/10passes;7labeled images;11original synthesized WAV samples; actual local server, Node runtime/license and Unity player/data/dependencies. Static index has no scripts/network calls/game authority or grants. Art/audio provenance and proposed handoff specifications are separate from gameplay requirements. Old contact sheets and prepared native stills are labeled; they do not promise instantly unlocked advanced troops, mythics or commanders. A finished adaptive soundtrack is not included; subjective listening/mix quality NOT TESTED here.

Missing owner inputs remain NOT INCLUDED: `Thrones_of_Myth_Creator_Asset_Tracker.xlsx` and `Thrones_of_Myth_Creator_Brief.md`. Attach these exact files for a future pack update. No private source workbook is substituted. Existing supplied-document names alone are not evidence of actual local files.

## Tests executed

- Actual Unity6000.3.0f1 full Windows build, clean source89a4b967, exit0;193-file base package hash verification passed.
- `node --test scripts/test_creator_launcher.cjs`:5PASS, real production loopback server + synthetic client; save/resume, stable port, paths with spaces, busy unowned listener, concurrent profile lock, tampering and failed-client owned cleanup. These are infrastructure tests, not native gameplay.
- `python -X utf8 scripts/test_creator_preview.py`:5PASS, synthetic archive privacy/hash/active-content/link regressions.
- `python -X utf8 scripts/publish_task.py --push`:51required source-checkpoint checks PASS, including16,784C# contracts. Research gate reported0changed gameplay paths. The final documentation/evidence publication runs the same required plan again.
- `scripts/package_creator_preview.py` assembled a new versioned archive; `scripts/verify_creator_preview.py` checked every final member/hash and local reference; independent full-ZIP hash recorded above. Existing package directories/archives were not overwritten.
- Actual extracted CMD/health/native Greek entry/city rendering observed and captured. Read-only saved-world restoration succeeded; normal native restart was NOT TESTED.

No balance, skills, Citadel, AP, pass combat, hosted kingdom/firewall change or Tasks7–10 work. Stop after this creator-preview delivery.

## Original preparation plan (historical)

Starting source418e7bb0d2863d3ba951f354bc8ded43598a5a4b; checked2026-11-17. Scope: self-contained Windows packaging, creator documentation and bounded native release QA only. Tasks7–10 and gameplay balance remain untouched. Packaging/infrastructure and offline reference documentation are exempt from invented RoK research under research/parity/README.md; no gameplay source changes are planned.

## Release design and acceptance

Use the existing Unity6000.3.0f1 full Windows pipeline with a new isolated `-thronesFullPackage` output. Preserve every existing release. Assemble a public allowlisted creator overlay from that clean matching package; identify exact source/version/protocol/build date and every payload hash. Include the actual Node runtime/license, production local server modules and Unity player/data/dependencies. Runtime JavaScript is needed for the local authority; the source repository, editor project, private workbooks and operator state are excluded.

Replace only the creator package's legacy launcher. It must not reuse a compatible8080 server or write the ordinary `%LOCALAPPDATA%/ThronesOfMyth/Saves` world. Use a separate versioned CreatorPreview profile, persistent loopback port, single-profile lock, own-process readiness plus exact health identity, explicit game endpoint, actual final-save confirmation and owned-server-only cleanup. Friendly console errors must retain saves and never claim an unconfirmed final save succeeded. A QA-only command-line profile-root argument permits testing without touching the default preview or real saves.

Five production-server launcher regressions cover paths with spaces, fresh save/resume/stable port, busy unowned port, duplicate authority/save sentinel, payload tampering and client-error cleanup. Five archive/privacy tests cover complete public payloads, hashes, private/traversal paths, secret fields/unlisted docs, remote scripts/URLs and broken offline links. These are infrastructure tests, not native gameplay acceptance.

An offline HTML image/audio index is the first read-only showcase. No client/server gameplay, grants, multiplayer visibility or pass access modifications. Public inputs are explicitly selected earlier original contact sheets, original painted portraits, synthetic-player native stills and11 original synthesized WAVs. Captions separate reference renders, prepared encounter evidence and actual fresh gameplay. No complicated gallery or fictional final models/music.

Included public guides are versioned under `packaging/creator/`: START_HERE.txt; CREATOR_FEEDBACK.md; KNOWN_LIMITATIONS.md; PRODUCTION_BRIEF.md and content-derived identity-only rosters.json. Proposed art/audio/animation backlog is separate from authoritative gameplay. Owner-supplied tracker and brief are absent locally: `Thrones_of_Myth_Creator_Asset_Tracker.xlsx` and `Thrones_of_Myth_Creator_Brief.md` are NOT INCLUDED; request these exact attachments for an update.

## Native final-archive acceptance plan

After source publication, build clean, assemble ZIP, audit every archive entry/hash and extract to a new disposable directory under dist containing spaces. Launch the actual .cmd with a separate QA profile. Record actual launcher readiness, matching health, Unity entry/city, world navigation, wheel/pan, scouts, formation, reachable combat, pass/zone presentation, saved exit, same-city reopen and owned-server shutdown. No state grants or maximum-state fixtures. Mark failed-to-execute native cases NOT TESTED, preserve observations/screenshots and compare a synthetic account only. Native audio listening, full progression/all commanders/creatures, all zones, every resolution and remote multiplayer are not inferred from compile/tests. If a release-blocking fix changes runtime source, publish/rebuild/retest before delivery.

Release status at this preparation checkpoint: IN PROGRESS; not a claim that final archive/native QA has passed. Final results, archive identity and remote SHA will be recorded after execution. Existing original native limits remain in docs/qa/RECOVERY_A_NATIVE_WINDOWS.md.
