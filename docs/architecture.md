# Prototype architecture

## Client and server boundary

The Unity client draws a 40×40 world with placeholder cities, armies, and a
Forsaken enemy. It polls snapshots and submits intent over HTTP. It cannot
choose damage, position updates, rewards, health, or elapsed time.

The Node.js server advances the simulation at 10 Hz using a monotonic clock.
Movement speed, bounds, melee range, attack cadence, death, and one-time kill
rewards are validated server-side. Attack intent automatically approaches the
target. This establishes an authority boundary, not production anti-cheat.

## Local HTTP protocol

- `GET /health`: readiness.
- `POST /join` with `{ "name": "Player" }`: returns a random session token and
  player ID. Sessions expire after 60 seconds without authenticated requests.
- `GET /world`, header `Authorization: Bearer <token>`: current shared snapshot.
- `POST /command`, same header, body `{ "type": "move", "x": 10, "z": 15 }`
  or `{ "type": "attack", "targetId": "forsaken-1" }`.

Commands act only on the token's army. Request bodies are limited to 4 KiB and
sessions are capped at 32. This developer server binds to `127.0.0.1` by default;
use `HOST` and `PORT` environment variables to override. Never expose it publicly
as-is: it lacks real accounts, TLS, abuse controls, persistence, and deployment
hardening. Native Unity clients do not require browser CORS.

## Technology decision

Node.js 24 with built-in HTTP and tests keeps the first slice runnable without
downloaded dependencies. This is a prototype choice, not a commitment to the
production MMO backend. Benchmark and select production services after defining
concurrency, battle simulation, storage, deployment, and team expertise.

Unity 6.3 LTS is the intended editor line. Pin the exact patch generated in
`ProjectSettings/ProjectVersion.txt` after the first successful local import and
commit Unity's generated package lock. The scaffold declares the 6.3.0 baseline without an editor revision hash; use
the latest available patch in that LTS line and commit the imported settings.
Only core built-in Unity packages are used; the prototype uses the built-in
render pipeline and legacy input.
