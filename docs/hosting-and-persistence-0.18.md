# First hosted kingdom and persistence 0.18

We can now prepare one continuously running private-alpha kingdom. This release
provides the server/data foundation and tested deployment files. No VPS, domain,
public TLS certificate or paid hosting has been provisioned from this chat.

## What runs where

Players run the Unity client. One authoritative Node.js process runs on a hosted
Linux machine, even when every player has closed the game. Caddy fronts it with
HTTPS. SQLite stores committed kingdom snapshots and command receipts on a
persistent Docker volume. Each kingdom needs a separate process and database;
do not scale the same database to multiple simulation replicas.

A modest European VPS with roughly 2 vCPUs, 4 GB RAM and SSD storage is a sensible
initial test target, not a tested capacity promise. The game still has the
prototype's **32-city limit**. Commercial-scale populations require profiling,
a different world layout/capacity model and further backend work. We do not need
Kubernetes or a separate physical computer per player.

## Persistence contract

- `THRONES_DB_PATH` selects SQLite in the hosted server. Local Windows playtests
  retain JSON saves and do not require Docker or a database migration.
- SQLite uses WAL and synchronous FULL transactions. A successful join or command
  response is sent only after saving. Failed writes roll back the in-memory
  mutation, return 503 and pause new actions/simulation until a save succeeds.
- Live simulation checkpoints save every two seconds. A hard crash can lose up
  to the latest unsaved simulation interval; acknowledged commands are committed.
- Optional `Idempotency-Key` command headers atomically store a receipt alongside
  the world. Replaying the same token/key/body returns the stored response, even
  after restart. Reusing it for another body returns 409. Receipts persist without
  expiry in this first version. Keys are 8–128 ASCII letters/digits/underscore/hyphen.
  Identical JSON property ordering is required. The Unity client does not yet
  automatically retry ambiguous commands with a retained key; this API is the
  foundation for that follow-up. Unkeyed commands must not be blindly retried.
- A 30-second renewable writer lease fences competing processes. After a hard
  kill, replacement processes may need to wait up to 30 seconds; Docker retries
  failed starts with backoff. Graceful shutdown releases the lease immediately.
- Unsupported/corrupted databases fail startup instead of silently starting a new
  world. Database revision is 1; game save schema remains 11 and protocol stays 13.
  Bundle version is 0.18.0. Back up before upgrading or migrating.
- Database state is still serialized as one world document, rather than normalized
  player tables. This is a transactional single-kingdom foundation, not a finished
  distributed backend. Real account login/recovery is still missing. Possession
  of a saved session token controls that city; backups contain these secrets.

## Offline players versus server downtime

A player's disconnect now marks presence only. Accepted marches and field combat
continue while the server runs. Presence expiry no longer cancels orders.

When the **server itself** restarts, existing recovery rules interrupt PvP and
sieges and pause field orders. Positions and surviving troops are preserved;
no offline battles, captures or victories are invented. Scouts/territorial work
resume under the existing restart rules, not a full replay of missed world combat.

SQLite timestamps support bounded downtime catch-up:

- Paid construction, research, crafting, sequential training and hospital jobs
  complete according to elapsed time. No automatic purchases are created.
- Passive production accrues for at most eight hours per outage and respects the
  existing resource ceilings. Job completion boundaries update production rates.
- Home recovery/healing advances; field armies receive no free home healing.
- Daily task completion is credited at its completion time, not the later login.
- Catch-up and its new timestamp commit together, preventing repeated rewards.
  Backward clock changes never lower the saved timestamp or award negative time.
- Sanctuary hold credit restarts at recovery time; downtime cannot satisfy a
  defended continuous-hold requirement. Other field timers remain paused under
  existing recovery rules. This is a maintenance policy, not uninterrupted uptime.

Keep the host clock synchronized. Changes to the economy/offline cap should be
balanced against real play sessions before public release.

## Provision and start

Choose a Linux VPS/cloud account and a hostname such as `kingdom1.yourdomain.com`.
Use its provider's supported Docker Engine + Compose plugin installation guide.
Enable Docker at boot. Point DNS A (and only a working AAAA) at the machine.
Permit inbound 80/443 and restrict SSH to administrators. The game port 8080 is
not published by Compose; only the gateway can reach it.

Clone the repository to `/opt/thrones-of-myth`. Server-only hosts can use
`GIT_LFS_SKIP_SMUDGE=1 git clone ...` to avoid downloading Unity assets.

```sh
cd /opt/thrones-of-myth/ops/kingdom
cp .env.example .env
chmod 600 .env
# Edit hostname, certificate email, kingdom ID and a random invitation code locally.
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

Compose builds a non-root Node 24 image with a read-only application filesystem,
persistent writable data volume, health checks, bounded logs, graceful shutdown
and `restart: unless-stopped`. Caddy obtains/renews certificates once real DNS and
public reachability are correct. Do not use example values for a deployment.
Never commit `.env`, backup files or session tokens.

In Unity/the rebuilt player, open **Connection settings**, enter the HTTPS server
address and invitation code, then join. New cities require the invitation;
existing valid sessions can reconnect after code rotation. The code is a private
alpha gate, not an account/password system. Do not share session tokens.
The player still needs its saved local profile to resume that city.

The process also supports direct native Linux operation:

```sh
THRONES_DB_PATH=/absolute/private/kingdom.sqlite node server/index.mjs
```

By default it binds loopback; Compose explicitly binds inside its private network.
Set `THRONES_TRUST_PROXY=1` only behind a trusted proxy which controls forwarded
headers. There are basic per-address request/join limits, not comprehensive
anti-abuse or DDoS protection. Keep the kingdom invitation-only for this stage.

## Management and uptime

- **Status:** `docker compose ps` and `curl -f https://YOUR_DOMAIN/readyz`.
  `/health` and `/readyz` return 503 on persistence errors or stale simulation.
- **Logs:** `docker compose logs --tail=100 kingdom gateway`.
- **Update:** create/verify a backup, pull the reviewed release, then
  `docker compose up -d --build`. Expect a short reconnect period.
- **Monitor:** configure an external uptime service against `/readyz`; alert for
  failure, disk pressure and stale backups. Check host CPU/RAM/disk as well.
- **Restart:** `docker compose restart kingdom` after diagnosing a problem.
  Restart policy handles exited containers. An unhealthy but running container
  only becomes marked unhealthy; Compose does not automatically restart it.
- **Disk full:** the kingdom pauses instead of accepting unsaved purchases. Free
  space/repair access, check `/readyz`, then restart if necessary. A lost writer
  lease requires stopping the stale process, not forcing it to overwrite data.
- **Limits:** one VPS is one point of failure. Restart policy is not high
  availability. Failover replicas, database replication, operations dashboards,
  real identity, command retry UI and load/security testing remain future work.

## Backups and restore

`sh ops/kingdom/backup.sh` uses SQLite's online backup API and validates the source
world before export. It copies a consistent snapshot out of the container and
removes that temporary volume copy only after a successful host copy. **Do not
copy only the active `.sqlite` file while WAL writes are running.**

For hourly scheduling at the documented installation path:

```sh
sudo cp ops/kingdom/thrones-backup.service ops/kingdom/thrones-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now thrones-backup.timer
```

The timer runs a root-owned script using Docker; keep the repository and scripts
writable only by trusted administrators. Adjust paths if installed elsewhere.
Backups are retained until the operator removes them. Monitor backup disk usage;
configure encrypted off-machine copies and a retention policy before inviting
players. Local hourly backups alone do not protect against loss of the VPS and
can lose up to an hour of progress in a total storage failure.

Restore rehearsal (use a separate test volume first): validate the backup with
`World.fromSave`/the database loader, stop the kingdom, archive the current data
volume, and replace the database with the verified backup as the Node container
user. Move the old matching `-wal`/`-shm` files into the archive as well; never pair
old WAL files with a replacement database. Wait for the backup's writer lease to
expire (at most 30 seconds), restart and confirm sessions, reserves, queues,
alliances, territory and keyed command receipts. Do not run two restored writers
against the same kingdom's active data. A restored backup necessarily loses
changes made after that backup; announce that recovery to testers.

## Reproduce verification

```sh
cd server && npm test
# From repository root:
docker build -f ops/kingdom/Dockerfile -t thrones-kingdom:0.18-test .
sh tools/test_hosted_kingdom.sh
```

Tests cover atomic persistence, failed-write rollback, retries across restart,
writer fencing, backward clocks, paid job/healing completion, production caps,
completion-day attribution, online backup restore, JSON migration, hard-kill WAL
recovery, invitation gating and disconnected marching. The Docker smoke test
creates a disposable private container/volume, restarts it, restores a backup and
cleans up. It accelerates the lease timeout using a test clock for backup restore;
production uses real time. Native Unity compilation and public HTTPS issuance
still need the actual Windows client/hosting environment.

Release verification in the cloud: **171 server tests passed**, including an
actual SIGKILL/WAL recovery test. The non-root read-only Docker image built and
its restart/backup smoke test passed. Compose and Caddy configuration validation
passed. These checks do not establish public uptime or a tested player capacity.
