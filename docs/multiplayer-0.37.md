# v0.37.0 — Multiplayer reliability and measured readiness

Preserves protocol 16, save schema 15, combat/economy rules and existing saves.
No new production hosting claim or native Unity result is implied.

## Implemented

- Live private alliance roster, officer roles and eligible help jobs are separate
  from frozen city-map intelligence. Leaving/kicking a member removes their live
  roster entry immediately without rewriting legitimately remembered cities.
  Member resource-transfer shortcuts use existing economy permissions and limits.
- Visibility sources are built once per stable snapshot/final exploration pass,
  shared within that pass for allied players, and never cached across commands.
  Hidden armies are filtered before expensive presentation stats are assembled;
  downstream sensitive-field stripping remains. Geometry/privacy regression tests
  compare the original visibility model and immediate membership changes.
- March route/status advice is reused per authoritative snapshot, bounded to five
  formations; reconnect/profile/snapshot changes clear it. Measured portable CLR
  allocation is documented separately from unmeasured Unity rendering.
- Opt-in server metrics record bounded tick/snapshot/encoding/command/persistence
  CPU samples and JSON response bytes. They contain no player identity, tokens,
  chat or commands. Metrics paths cannot overwrite configured save/backup/SQLite
  files. Failure to write metrics does not alter gameplay storage.
- Linux client-only `--join=URL` verifies matching game/protocol/version/commit/
  server payload digest and never owns or stops the host. Packaged Windows host
  reuse also requires the matching build stamp. Both builders include the same
  complete production server modules. Rebuild whole packages; do not mix files.

## Actual multiplayer verification

`node tools/two-player-proof.mjs work/two-player-proof.json` starts real HTTP and
SQLite with two independently authenticated players plus a privacy observer.
It uses accelerated **production simulation ticks**, real commands, earned
supplies and legitimate gathering, not stubs or granted combat outcomes.
It verifies mixed-unit PvE/signature/victory/report/return; real alliance roles,
chat/marker privacy, concurrent duplicate taxed transfer, help rejection on reuse,
root fort/garrison/recall, two-player rally assembly/recall, partial cargo and
reconnect after SQLite restart. Replaying the original transfer receipt after
restart cannot pay twice. Rally victory is not claimed by this proof.

`node tools/benchmark-kingdom.mjs work/kingdom-benchmark.json` is a separate
**synthetic load fixture**, not a legitimate player journey. It measures production
tick, snapshot, encoding and SQLite save; checks roster round-trip troop totals
and foreign route/cargo privacy. Raw matched before/after results and scope are in
[validation measurements](validation/measurements-0.37.md).

The launcher tests intentionally use a non-Unity client stub. The gameplay proof
uses the actual server; neither verifies native client input/rendering/audio/FPS.
See [native acceptance](playtest-linux-0.37.md).

## Final automated verification

- **275 server tests passed**, zero failures/skips, including migration,
  acquisition/economy, visibility, PvP/PvE, cargo conservation, idempotent receipts,
  SQLite restart, launcher integration and the new two-player proof.
- **16,349 portable C# assertions passed**, including production presentation
  state/model contracts. These are not Unity compilation/rendering tests.
- **83 C# / 3 PowerShell source checks, zero issues**; Bash/Node syntax and
  `git diff --check` passed. No Unity Editor was installed in this environment.
- Measured baseline/after load results and real proof output are retained under
  `docs/validation`; no native screenshots or FPS figures were fabricated.

## Remaining limits

The kingdom remains a 32-player prototype with five march slots, one simulation
process/database and polling/full snapshots. Short CPU samples do not establish
internet latency, large-MMO capacity, soak stability or GPU performance. No public
hosting, billing, multi-region deployment or automatic exposure was introduced.
Native two-client UI, formation visuals, camera, sound and performance are pending.
