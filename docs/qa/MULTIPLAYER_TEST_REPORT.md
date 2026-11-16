# Task 4 — multiplayer and persistence

Tested gameplay `f5c0cdf75af286c33a9c116f46139ee40c8fbce1`; Windows Node 24.18.0, 2026-11-16. **PASS for the bounded scenarios below; overall alpha NOT READY.** No real remote friends tested. One native Windows client was inspected separately; it was not a ten-client graphics test.

## Fresh production HTTP scenarios

Reproduce: `node scripts/task4-functional-qa.mjs --soak-seconds 120 --output work/task4/functional-results.json`. The harness forks a genuine production realm host on ephemeral 127.0.0.1, issues HTTP join/snapshot/command requests and closes/restarts the actual child process. Creates unique disposable stores under `work/task4/`; invitation/shutdown strings in the harness are synthetic test constants, never real access credentials. Alpha/beta worlds exercise token scoping. Three independently authenticated JSON players and ten independently authenticated SQLite players use distinct actual random home positions and cycling original civilizations.

**20/20 checks passed**, recorded in [canonical functional evidence](evidence/task4/functional-results.json):

- Readiness and protocol 17; unauthenticated world request 401, wrong invitation 403, foreign-kingdom token rejected.
- Valid distinct spawns; own movement and recall for each identity; out-of-map input rejected; one player cannot issue another player's army command.
- Three-player alliance create/join; unauthorized role promotion denied; leader promotion accepted. Alliance chat reaches members and is absent from outsider's alliance messages. Foreign snapshots omit inventory, hero records and training queue.
- Paid Citadel 2 for required players, then genuine Oathhalls and market; paid farm upgrade can receive help from an eligible member. Same member's second help rejected. No state-injected prerequisites.
- Transfer 100 gold charges sender 110, recipient gets 100. Repeated request with the same game job ID does not transfer twice. This checks conservation including the documented local fee, not RoK tax parity.
- SQLite concurrent identical train requests with one idempotency key produce one 100-unit job and one 5,000 food/5,000 wood debit; same key/different command returns 409. Replay after restart adds no job/reserves.
- Paid root beacon at own legal home, build completes after production ticks, own army garrison join/leave accepted. Invalid rally target rejected. **Valid multiplayer fort rally creation/join/completion was not reached in this fresh flow**; existing stronghold/war regressions use prepared fixtures.
- Graceful host shutdown followed by a new Node process, production store load, resume-token join and snapshot verification for all identities. Tested homes, city level, membership, unit counts, reserve counts and training job counts survive both JSON and SQLite restarts.

Setup advances 109 production seconds through actual `tick(.25)` over the IPC control channel. This is explicitly accelerated time, not direct progression injection or normal elapsed play. The HTTP surface is unchanged; no test-only public endpoint added. Existing protected-account, expiry, login/recovery and persistence regressions also pass in the complete server suite. Native protected-account UX and external transport security remain NOT TESTED here.

## Sustained ten-client activity

SQLite: 120.80 wall seconds, 101 command/poll rounds, ten authenticated loopback clients/cities, own army movement. No simultaneous battles. No failed scenario assertion. Timing and memory distributions are in the readiness report and JSON. This tests bounded synchronization, HTTP persistence and command authority under concurrency; no client rendering, independent networks, WAN packet loss, overnight leak or public capacity claim.

The separate short [large-world benchmark](evidence/task4/large-world-results.json) prepares battle/gather/scout positions and city stages, then measures mixed workloads for 32/128/256 **registered** cities with ten polling clients. Consult `peakConcurrentBattles` instead of equating registered cities with combatants. These fixtures must never be cited as legitimate progression or 256 simultaneous human players.

## Open authorization and lifecycle gaps

Per-player/realm command authorization passed tested requests. **Military geography authorization fails**: an authorized owner can move their own army between restricted provinces along ungated corridors. This is a world-rule failure, not evidence that another player's token can be impersonated. Scout access also incorrectly inherits military gate restrictions.

Rally/PvP/hospital/death/reward race cases have fixture regressions, not comprehensive new native/cooperative proof. No blanket absence-of-duplication claim beyond the tested training/trade/help operations. Native disconnect/restart, valid fort rally across clients, private-network deployment, friends' client compatibility and real network reconnection must be retested after recovery. No live or port-8091 save was read/modified, no migration introduced, and no public listener or infrastructure setting changed.
