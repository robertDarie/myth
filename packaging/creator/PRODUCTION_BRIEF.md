# Creator production pack — proposed backlog, not gameplay requirements

Prepared from the existing0.45.0 content and original art/audio foundation. Owner-supplied `Thrones_of_Myth_Creator_Asset_Tracker.xlsx` and `Thrones_of_Myth_Creator_Brief.md` are absent and NOT INCLUDED. Request those exact two files before treating this proposal as the agreed commission list. Gameplay authority remains the versioned reference policy; creative feedback does not authorize balance changes.

## Art direction

Restored antiquity: weathered stone, bronze/gold, deep blue cloth, readable silhouettes and restrained divine light. A coherent strategy-scale world rather than photoreal characters standing on miniature buildings. Preserve original mythology and broad culture inspiration; no copied Rise of Kingdoms/Call of Dragons/Age of Mythology models, portraits, animations, recordings or music. Supply provenance and license terms for every delivered dependency; disclose AI assistance and third-party inputs. Existing portraits include original AI-generated paintings; existing geometric models are prototypes, not final sculpts.

## Five identities

- Greek: columned civic/temple vocabulary, stepped plinths, bronze roof accents; Minotaur.
- Egyptian: stone pylons, sloping pyramid masses, warm sandstone and sacred ornament; Sphinx Guardian.
- Norse: timber halls, broad gables, heavy wood/iron and rune accents; Frost Giant.
- Chinese: red civic walls, broad layered eaves, jade/gold accents and clear roof hierarchy; Qilin Guardian.
- Japanese: pale wall planes, narrower layered dark roofs, timber/vermillion accents; Tengu.

These are existing high-level silhouettes to refine, not a request for stereotyped costumes or copied commercial designs. Share references and explain historical/mythic inspiration before final production.

## Current inventory and naming

`rosters.json` lists the five cultures, eleven named commanders, seventeen building definitions, seven zones and ten named adjacent passes with coordinates, extracted from current content definitions. It contains identities only, no numerical balance claims. Commander roster: Frontier Captain, Sanctuary Warden, Pathfinder, Rune Seer, Atalanta, Hua Mulan, Tomoe Gozen, Champion of Horus, Heracles, Sigurd and Sun Wukong.

Existing model names follow `GreekInfantry.fbx`, `EgyptianArcher.fbx`, `NorseCavalry.fbx`, `ChineseCommander.fbx`, `JapaneseMythic.fbx`, and `Hero_<stable-id>.fbx` for eleven commanders. The dedicated `FrontierCaptainPresentation.fbx` is more developed than the shared prototype family. Building variants use stable institution IDs from rosters.json; do not rename those IDs when proposing a visual replacement. Existing current buildings: Citadel of Mortals; Temple of Echoes; Athenaeum of Ages; Hall of Spears; Sanctuary of Beasts; Blessed Fields; Sacred Grove; Titan Stoneworks; Treasury of Crowns; Mana Well; House of Renewal; Vault of Ages; Agora of Fates; Oathbound Hall; Forge of Dawn; Lodge of the First Builders; Outlook of the Horizon.

World structures include the ten Divine Passes, Shrine of Dawn, Shrine of Renewal, First Sanctuary, culture frontier oathstones/watches, alliance fort/beacons, resource nodes and ordinary Forsaken camps. No new3D asset is required to claim a new gameplay rule. The offline index includes deliberately selected earlier contact sheets and actual Recovery A native stills; those stills use synthetic QA players. The pass/combat stills have prepared prerequisites and are not a full organic fresh-city playthrough.

## Proposed priority models

- P0: one approved Greek city kit (Citadel, Hall, Temple, wall/gate), readable infantry and Frontier Captain replacement/finish; a modular mountain and pass kit with neutral/owned/blocked color states. First agree one camera-scale benchmark before expanding the library.
- P1: the other four city kits and infantry/archer/cavalry culture families; the five mythic escorts with distinct movement/attack silhouettes. Creatures need normal gameplay unlocks; asset review must not promise immediate fresh-city access.
- P1: eleven commander silhouettes and portraits with rarity/selection readability; distinguish bespoke final models from shared placeholder rigs. Prioritize the actually available Captain and then agree recruitment priorities.
- P2: shrines/sanctuary, academy/forge/economic institutions, building construction stages, resource/camp/environment kits, faction banners and restrained cast/impact effects.

These are proposals, not asset counts/deadlines/prices or an approved production order. Return an estimate and dependencies per item before beginning a large batch.

## Animation and technical handoff proposal

Deliver editable source plus clean FBX export, separate textures and a short turnaround/contact sheet. Supply stable names, author, license, version and change log. Use a grounded pivot, consistent forward/up axes and a documented real-world scale; validate one sample in Unity6000.3.0f1 before batch export. Existing animation consumers use names such as Idle, March, Attack, Hit, Skill, Victory and Retreat; confirm actual per-asset clip availability rather than assuming every rig has every clip. In-place locomotion should avoid foot sliding; root motion must not move the authoritative army. Supply rig hierarchy/rest pose, loop ranges, contact/release/impact timing and equipment attachment points.

Proposed first review budgets: keep silhouettes readable at strategic zoom, offer at least a close and distant LOD, and report triangle/material/bone/texture counts. Numerical production budgets are NOT yet approved: propose measured performance on the target Windows build before accepting them. Avoid unnecessary material slots and transparent overdraw; provide albedo/normal/metallic-smoothness or an agreed pipeline conversion. Do not ship editor plugins or require collaborators to install Unity merely to view feedback renders. Runtime integration is the developer's task; do not modify gameplay scripts or save files.

## Soundtrack cue proposal — music still to commission

- Entry/kingdom identity: short memorable original theme, welcoming but uncertain.
- City peace: quiet loop with space for UI and construction cues; culture instrumentation variants after a common motif is approved.
- Exploration: airy sparse loop, fog/revelation transition and frontier tension without combat false alarms.
- Small combat: restrained intensity layer and clean exit; do not swamp unit impacts.
- Pass rally/siege: anticipation, assembly, combat intensity, victory/retreat stingers, all driven by real states during later integration.
- Sacred structures/mythic discovery: original restrained wonder; never imitate another game's melody, orchestration or recording.

Propose loop lengths and stems before production. Deliver lossless stereo WAV masters (proposed48kHz/24-bit), seamless loop markers, non-looping intro/outro/stingers, loudness/peak measurements and license/provenance. Final mix targets and adaptive trigger implementation are not approved yet. No finished adaptive soundtrack is promised in this preview.

## Sound effects proposal and existing samples

The offline index contains11 original synthesized WAV references: Footstep, HorseHoof, BowRelease, MetalImpact, DivineCast, CityAmbience, RallyCharge, RallyRelease, RenewalChime, HuntressFlight and CrescentImpact. They are placeholder direction samples, not final recording quality. Runtime also synthesizes lightweight selection/confirm/arrival/reward/retreat/victory fallbacks. Audio files are locally playable without a server; subjective mix/listening acceptance remains a human task.

Prioritize UI selection/confirm/invalid order, construction start/finish, march/hoof/arrow/impact, scout departure/return, rally/capture, healing/casts, resource gathering and five distinct creature families. Include variants to reduce fatigue, mono positional source options and clean tails. Deliver dry/wet variants only if agreed; supply filenames, context, gain recommendation, loop markers and source/licensing notes. A sound must not imply a reward/capture/skill that the actual game did not confirm.

## Feedback and integration boundary

Use CREATOR_FEEDBACK.md; identify screenshots/audio names and camera scale. All tour pages are offline static references; they cannot grant troops, XP, currencies, items, visibility or passage, and are not connected to multiplayer. Keep the proposed asset backlog separate from any authoritative research or balancing contract.
