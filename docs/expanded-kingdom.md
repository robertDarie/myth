# Expanded kingdom - checkpoint B

## World and provinces

The actual world is 256 by 256 coordinate units. The legacy 80 by 80 area and every existing entity coordinate are preserved. First Frontier, Sunward Province, Runic Province and First Throne retain their original 40-unit boundaries and Divine Gates. New gate-free starting lands are Dawn Reach (east), Ashen Fields (north) and Outer Marches (northeast). The province rectangles, permitted gate connections, starter bounds, map size, fog size and authoritative limits live in server/world-map.mjs.

Ten route corridors connect the convex provinces. Legacy gate permissions apply to the destination, current actor and intermediate waypoints. A stranded army can recall home but cannot use expansion roads as a detour around lost gates. New frontier cities have reachable local deposits/camps without requiring old gates; a city in the legacy starting province must progress through its existing gates to reach the frontier. Outer travel uses the declared frontier roads. No direct diagonal shortcut crosses a locked province.

The map contains 293 resource deposits (275 new), 62 camps (55 new level-one waywatches), 11 sacred sites (six new alliance rally/garrison and territory-score objectives), and eight strongholds (three new). Fifty-five populated frontier hubs distribute wood, food, gold, stone, Mana and beginner camps throughout the added land. Existing nodes retain depletion, camps retain cycles, and sites retain ownership. New strategic sites do not grant ownership of another province or blanket gate access.

## Capacity and operational configuration

Central limits are 256 registered identities per kingdom and 100 alliance members. The default operational city cap remains 32. That cap controls admission and kingdom discovery; saved cities and valid resume sessions are preserved when an operator lowers the cap. Set THRONES_CITY_CAPACITY for a single server, or cityCapacity in each THRONES_REALMS kingdom entry. Values must be integers from 1 through 256. The high end is opt-in for controlled tests; it is not certification for 256 connected or fighting clients.

Alliance officer roles, private chat, contributions and save validation support a real 100-member roster. Contribution bounds allow former members as well as current ones, bounded by registered-world capacity. Kingdom contribution, coalition/invitation and communication bounds no longer assume 32 cities. Troop, march, rally and coalition membership limits are otherwise unchanged.

## Schema and fog migration

Save schema is now 26; network protocol is 17. Older protocol-16 clients are rejected by the matching client/launcher checks, rather than reading 64-column fog as 20-column fog. Rebuild both server and client packages together.

Legacy cell index i becomes floor(i/20)*64 + i%20. For example, old 20 becomes 64 and old 399 becomes 1235; index 20 in the new map remains concealed unless actually explored. Migration copies the input before changing it, rejects invalid old indices, and does not move city coordinates or reinterpret position-based scout/reconnaissance histories. Existing identity sessions, resources, commanders, equipment, buildings/research, inventory, armies, alliances, diplomacy, seasons, event records and reward entitlements continue through the existing validators. JSON migration archives the exact schema-25 source as .schema25.bak before ordinary rotation. SQLite uses the same validated map conversion inside its existing durable load/save transaction workflow. Only disposable saves were used for verification.

Historic migration tests now construct an actual legacy map through server/testing/legacy-save.mjs before lowering a schema number. A new 64-column test world cannot be relabeled as schema 25 and treated as authentic old fog.

## Unity terrain and map presentation

The ground collider, painted terrain texture coordinates, bounded 128-by-128 surface mesh, world rim and procedural scenery distribution cover the full 256-unit extent. They are built once, not rebuilt for each snapshot. Existing dictionary-based entity models are reused; only authorized/remembered objects are presented. Fog arrays and textures allocate according to the received row width and update only when sector states change. The veil footprint covers that extent. Minimap dots and clicks use snapshot size, camera bounds follow the snapshot, the far clip accommodates the larger view, and the initial view focuses the saved city wherever it is. Frontier Captain and the existing art system are preserved; this is functional terrain support, not new final art.

Unity 6000.3.0f1 hidden batch import/compilation completed with exit code 0. Portable C# contracts include 64-column fog, dimension changes and no stale-profile sectors (16,754 assertions total). Native rendering, frame rate and real-client exploration remain NOT YET PLAYER-VERIFIED.

## Reproducible load evidence

Run: node --expose-gc scripts/large-world-benchmark.mjs --out=work/expanded-benchmark.json . All worlds and JSON/SQLite files are generated under mkdtemp; an ephemeral loopback port is used and cleaned up. Raw evidence: [expanded-kingdom.json](benchmarks/expanded-kingdom.json). The timing summaries follow the previous scalability harness; tick is direct simulation CPU, while HTTP includes queued requests and durable commands. No paid service or production save is involved.

The workload distinguishes registered cities (32, 128, 256), ten concurrent authenticated loopback polling clients, up to four simultaneous PvP battles/eight combatants, two gatherers, two moving armies, ten scouts and an alliance built up to 100 members before assigning opposing combat fixtures. Each case samples 50 ticks, 20 snapshots/encodes, 30 cross-province routes, three JSON and SQLite saves, 50 polls and five durable commands. Battles finish naturally. This is a short bounded test with accelerated simulation, not a sustained Internet soak. Fixed setup phases save periodically so they do not artificially starve SQLite lease renewal.

Measured on 11th Gen Intel(R) Core(TM) i5-11400 @ 2.60GHz / Node v24.18.0:

- 32 registered, 10 concurrent HTTP clients: city creation p95 2.722 ms; tick p50/p95/p99 5.893/10.859/15.644 ms; snapshot p95 20.433 ms; JSON encode p95 2.137 ms; visibility p95 0.382 ms; cross-province route p95 0.682 ms.
  Poll p95 112.747 ms; command p95 53.315 ms; JSON save median 55.11 ms; SQLite save median 15.19 ms. Mean snapshot 159992 bytes; retained heap 31.7 MiB; live simulation lag 83.977 ms over 561.949 ms wall time. Failures/timeouts: 0.
- 128 registered, 10 concurrent HTTP clients: city creation p95 11.963 ms; tick p50/p95/p99 41.606/50.773/53.666 ms; snapshot p95 11.53 ms; JSON encode p95 2.191 ms; visibility p95 2.692 ms; cross-province route p95 0.865 ms.
  Poll p95 990 ms; command p95 989.377 ms; JSON save median 422.328 ms; SQLite save median 246.044 ms. Mean snapshot 254391 bytes; retained heap 67.9 MiB; live simulation lag 2393.755 ms over 5298.969 ms wall time. Failures/timeouts: 0.
- 256 registered, 10 concurrent HTTP clients: city creation p95 30.708 ms; tick p50/p95/p99 72.785/84.125/88.586 ms; snapshot p95 17.32 ms; JSON encode p95 2.438 ms; visibility p95 0.67 ms; cross-province route p95 0.46 ms.
  Poll p95 1622.034 ms; command p95 1025.749 ms; JSON save median 415.43 ms; SQLite save median 221.859 ms. Mean snapshot 305810 bytes; retained heap 75.5 MiB; live simulation lag 3883.68 ms over 7985.635 ms wall time. Failures/timeouts: 0.

All 165 final HTTP requests succeeded and all persistence remained healthy. All 256 identities also survived validated restoration. Ten concurrent clients is the tested network-client count; eight is the peak battle-participant fixture count, not 256. At 128/256 registrations, large snapshots and full-state synchronous persistence cause visible queuing and drift. The default remains 32, suitable for the forthcoming 3-10-person alpha scope; neither a sustained throughput SLA nor large-scale readiness is claimed.

An initial diagnostic run on the earlier 183-deposit map at 256 registrations measured tick p95 about 291 ms and its long synchronous setup let the SQLite lease expire. Profiling found discovery copying and repeated sight lookup dominant. Static observations are now prepared once per world/alliance sight pass and shared as immutable records; subsequent observations replace records, so a former ally keeps historical values rather than receiving live updates. The final run measured 84.125 ms tick p95. The final map has 293 deposits and setup also gained periodic durable writes, so the diagnostic and final full runs are not an isolated throughput comparison. This optimization retains rollback, atomic logistics saves and durable acknowledgments.

## Automated verification and limits

- Full Node suite: 381 tests; 376 passed, five existing Linux packaging/symlink checks skipped on Windows, zero failures. All 15 troop types and existing gameplay regression suites remain included.
- New server/world-map.test.mjs: seven tests cover content distribution, true schema-25 fog/history migration, archive preservation, gate isolation/recall, 256 registered identities, a 100-member alliance including contribution persistence, and expanded gathering/scouting.
- All 23 scripts/publish-tests.json commands passed, including 16,754 portable C# presentation assertions.
- Unity batch compilation passed. Actual remote Windows clients, visual/FPS verification and prolonged soak are NOT YET PLAYER-VERIFIED.
- scripts/start-isolated-playtest.ps1 is unchanged. Neither the real kingdom save nor port-8091 test data was opened. No compiled binaries, saves, private workbooks or secrets are committed.

Next checkpoint: dedicated private-alpha start/join instructions and a separate Windows client-only build, followed by real 3-10-person acceptance. Large-world snapshot/persistence throughput and native visual verification remain further work.
