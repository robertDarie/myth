# Private creator preview — release preparation

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
