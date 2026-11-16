# Task 4 — first-session evidence

Tested gameplay: `f5c0cdf75af286c33a9c116f46139ee40c8fbce1`, 2026-11-16. **PARTIAL functional journey; no full native first-hour certification.** Fresh production defaults, not an injected maximum city. The independent supplied Linux retest is supporting input, separate from the Windows observations below.

## Native Windows journey

1. Launch the clean client-only 0.45.0 build with `--thrones-client-only --thrones-server http://127.0.0.1:<disposable-port> -screen-fullscreen 0 -screen-width 1280 -screen-height 720`. Use a separate production `createRealmHost` with a new named kingdom, test-only invitation and fresh `work/task4/native-world.json`; never use live saves or port 8091.
2. Choose the displayed Task4 disposable kingdom, enter the test invitation, create **Task4 Native Greek**, choose Greek, enter the city. Actual UI guest creation succeeded. Home (147.778, 23.073) is an in-bounds production random spawn in Dawn Reach. Camera initially showed own city; Connected status, resource strip, building labels and First Steps were visible. Native protected account creation/recovery was not executed.
3. Select Citadel 1 and upgrade. Displayed quote: 100 wood, 40 stone, 75 gold, 20 seconds. Running countdown observed, then actual Citadel 2. The next upgrade exposes academy/quarry prerequisites rather than freely permitting level 3. See [running](evidence/task4/native-upgrade-running.jpg) and [completed](evidence/task4/native-upgrade-complete.jpg) captures.
4. Open training, queue 100 T1 infantry. UI quote 5,000 food, 5,000 wood, 1,500 seconds; debit and one queued job observed. Read-only sanitized server observation confirms exact duration, cost and count, Citadel 2, 900 existing troops and zero reserves. [Training screenshot](evidence/task4/native-training-queued.jpg); [observations](evidence/task4/native-observations.json). Natural production continued; completion was **not observed**, so no completion claim.
5. Close training and return to kingdom. World objects, resource labels, fog, Forsaken levels and own city rendered. [World screenshot](evidence/task4/native-world-before-zoom.jpg). In the latest inspected view a level-5 Forsaken selection said “Defeat Forsaken Lv. 1 to unlock the next level” and disabled attack. This verifies that particular locked-target feedback, not all level unlocking or combat.
6. Further camera wheel automation was blocked by the UI tool detecting user input. No reliable controlled zoom comparison or second resolution was obtained. Native scout dispatch, gathering, primary/secondary assignment, research completion, attack/rewards/report, healing, inventory claims, second march, reconnect and fort participation remain **NOT TESTED** in this native journey. No server PASS is substituted.

At 1280×720 several labels are visibly abbreviated (player name, daily tab and tutorial text). Main city/world navigation and the observed upgrade/train actions were reachable. Record abbreviation as a minor UX finding; no claim that every screen or resolution is usable. No reliable FPS/start-to-interactive timing/audio measurement. No native crashes observed during these actions, but native long-soak stability is not certified.

## Reproducible accelerated production journey

Run `node scripts/parity-audit-progression.mjs docs/qa/evidence/task4/production-progression.json`. It starts a fresh production World and issues actual legal commands while recording accepted actions, costs, queues, resources and restart comparisons. No resource, coordinates, XP, fog, technology or troop grants are injected. The supplied inventory-supplies command grants zero resources in this policy; it is not a hidden fixture credit.

The first hour uses production `tick(.25)` with a controlled clock. A greedy available building/research purchase policy, affordable infantry training, visible local field orders and return commands produces:

- Fresh: Citadel 1, default balances and starting troops.
- 30 simulated minutes: Citadel 3, two Forsaken kills.
- 60 simulated minutes: Citadel 4, two kills. Consult the milestone and action records for exact buildings, training queues, research, balances and XP.
- Later reference-only checkpoints: Citadel 5 by one simulated day, stays 5 through week/month. After the first hour this is production offline city catch-up with a five-minute reconnect purchase policy. It does **not** simulate offline battles. Paid infantry tiers I–V eventually train, with 2,000 T5 reserves at the month milestone. This demonstrates one reachable local path, not parity, a human retention forecast or optimal progression.

The file contains 827 accepted commands. Every milestone passed disposable save round-trip. Local Citadel maximum remains 5, some builders stay level 1 by design, and the local technology catalog has 17 definitions with 42 total ranks. Do not mistake local maximum completion for RoK progression completeness.

## Remaining first-hour acceptance

Construction/research/training/economy/local camp policy and round-trip have production-engine evidence. The HTTP journey independently verifies early paid construction, alliance prerequisites/help/trade and garrison. Existing server regressions cover tier promotion, commander XP/skills/equipment, healing, daily/inventory, rallies and field PvP using prepared fixtures. **Those later systems were not all reached organically in this first-hour policy**, nor all clicked in Windows. See the [feature matrix](FEATURE_VERIFICATION_MATRIX.csv) for scope rather than interpreting a suite PASS as the whole journey.

Major gameplay blocks: army routes can bypass zone ownership; scouts can be denied by military gates; secondary passives are ineffective; companion-level blanket scaling differs from the requested mechanics. Full 4,096-cell legal exploration, end-to-end PvP/fort cooperation and all commander visuals remain unverified. AP/formula accuracy and progression pacing are deferred to the research/recovery milestones; nothing was rebalanced during QA.
