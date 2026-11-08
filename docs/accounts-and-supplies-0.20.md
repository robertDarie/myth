# Accounts, reliable orders and supplies 0.20

This is the next implementation batch of the [whole reference program](reference-adaptation-plan.md),
not a claim that all 679 records are complete. Previously optional roles are now
scheduled work. Equivalent reference functions share original implementations.

## Playable systems added

### Protect and recover an existing city

A SQLite kingdom now supports realm-local username/password accounts. Create a
city as usual, then open **Settings → Account and recovery → Protect this city**.
This attaches an account to that city; it does not create a second city or grant
another starter economy. Names are case-insensitive, 3–24 ASCII letters/numbers/
underscores. Passwords require 12 characters, with a 128 UTF-8-byte maximum.

The entry screen has **Sign in to a protected account** for another device.
Use the same kingdom URL and account credentials. Up to five active device
sessions are allowed, each lasting seven days. Sign out one device, all devices,
or choose to revoke other devices during a password-authorized login.

Registration shows a recovery code once. Save it privately. Recovery requires
that code plus a new password; it rotates the code and invalidates previous
sessions. A signed-in player can replace a lost code using their password.
Losing both the password and recovery code has no self-service solution in this
version. Email/platform identity, global multi-kingdom accounts, account deletion
and operator recovery are tracked follow-up work; do not promise those yet.

Passwords use randomly salted scrypt; recovery codes are random and stored only
as hashes. Account secrets never appear in world snapshots/rankings. Expired or
revoked sessions cannot bypass authentication through the old `/join` resume
route. Registration rotates old guest sessions. An internal unexposed anchor
preserves legacy save invariants and is explicitly rejected as an HTTP session.
Account changes, new session state and the world save commit in one transaction.

Remote credential requests require HTTPS; HTTP is accepted only on loopback for
local development. Private-alpha invitation requirements still apply when creating
new cities. This is a tested first identity layer, not a completed production
identity/abuse service. Password hashing is limited to two simultaneous operations,
and identity requests have per-address rate limits.

### Orders remain once-only after a lost response

The SQLite client writes one pending order's exact JSON body and random key to a
local PlayerPrefs journal **before** sending it. Connection/server failures allow
one automatic retry with the same key. An unresolved order stays visible as
**Retry order** and blocks subsequent commands until resolved. The journal is
restored after relaunch or account sign-in to that same server/character. No
password or recovery code is stored in it; ordinary player preferences already
contain session tokens. Local disk/user-profile protection remains a deployment
consideration, not a hardened encrypted credential vault.

Receipts are now keyed by character plus command key, rather than device token,
so logging in again cannot charge the same retained order twice. Old token-scoped
receipts remain readable by their original token. Identical JSON bytes/property
ordering are required. A conflicting body returns 409; the client retains the
order for review instead of blindly creating a new key. Explicit validation/
permission rejections clear the pending order; uncertain responses keep it.
Legacy JSON/memory servers send once and never automatically replay unkeyed orders.
Unreadable local records require checking city state and an explicit Settings
clear action; clearing a record cannot undo a server-accepted order.

### Inventory and timer items

The new **Inventory** navigation tab contains seven earned item definitions:

| Item | Effect |
| --- | --- |
| Harvest Satchel | 100 food |
| Grove Supplies | 100 wood |
| Mason's Crate | 75 stone |
| Sealed Crowns | 50 gold |
| Aether Phial | 10 aether |
| Builder's Hourglass | Up to 60 seconds off one construction job |
| Echo of Haste | Up to 60 seconds off one active construction/research/training/crafting/healing job |

Each city can explicitly collect its founding supply bundle once. Unopened packs
are not spendable resource balances. Opening packs adds exact amounts and does
not count as gathering/activity progress. Quantities are whole numbers, 1–100,
and cannot exceed owned items. Inventory is private; other players receive no
item counts in snapshots. No real-money purchase or artificial item roll is added.

Hourglasses target a specific owned active job. The second waiting training batch
cannot jump the first. Items never advance unrelated lanes. Remaining time is
reduced, then the normal server tick settles completion; restart preserves that
state and does not pay twice. Excess seconds of the final necessary item are
lost and previewed. Additional items beyond the number needed are refused.
This batch does not implement equipment instances, pet food, teleports or full
item reward tables; those remain scheduled inventory extensions.

### Transparent power and live rankings

Open **Settings → Kingdom power rankings** or the activity navigation. Players
and alliances are ranked by derived power with stable ID tie breaks. The UI shows
city, research, heroes, reserves and deployed troop components. Wounded/queued
troops, wealth and unopened packs are excluded. Deploying reserves therefore
cannot manufacture power. Hero defaults count as soon as that hero is owned,
not only after the first deployment. This is an original initial formula, not a
battle predictor or a copied reference formula. Rankings expose deliberate public
identity/score fields, never hidden positions, inventory or credentials.

These are live rankings, not immutable event results or a reward competition.
Event score ledgers, historical cutoffs and matchmaking power policies remain work.

## Testing on the PC

Normal **Start Thrones of Myth.cmd** still uses the existing local JSON profile.
Inventory and rankings work there. Account protection requires SQLite, so for a
local account test stop any other server using port 8080, then use PowerShell at
the repository root:

```powershell
$env:THRONES_DB_PATH = "$env:LOCALAPPDATA\ThronesOfMyth\AccountTest\kingdom.sqlite"
node server/index.mjs
```

Keep it running and connect the Unity client to `http://127.0.0.1:8080`. This is a
separate empty account-test kingdom, not an automatic import of your JSON city.
To migrate an existing city, stop the old server and use the explicit migration
CLI with an existing JSON path and a new SQLite target, as described in the
hosting guide. Never point two simulations at the same active database.

Rebuild the Windows player for the new UI. Test account protection, note the
recovery code privately, sign out, sign in again and recover from a second client.
Test interruption of a pack-open response, relaunch and Retry order; the same
pack must not be consumed twice. Test a construction hourglass beside an active
training queue and confirm only the chosen lane changes.

Native Unity compilation, GUI layout, network interruption journal behavior and
Windows/Android credential UX still require native tests. Cloud C# parsing is
not a substitute. Never send real passwords or recovery codes in chat/screenshots.

## Contracts, storage and compatibility

- `GET /auth/me`: protected/guest status and active session count.
- `POST /auth/register`: bearer guest session, `{username,password}`.
- `POST /auth/login`: `{username,password,revokeOtherSessions?}`.
- `POST /auth/recover`: `{username,password,recoveryCode}`; password is the new one.
- `POST /auth/rotate-recovery`: bearer protected session, `{password}`.
- `POST /auth/logout`: bearer protected session, `{allDevices?}`.
- `/command` adds `inventory-supplies` and `inventory-use` with `targetId`, `count`
  and optional `jobId`; existing idempotency headers still apply.

Bundle 0.20.0 keeps protocol **13** for additive snapshot/command compatibility.
Game save schema advances to **12** for inventory; schema 1–11 loads migrate with
empty inventories and an unclaimed explicit founding bundle. JSON schema-11
sources are archived before later autosaves rotate backups. SQLite database
revision advances to **2** for account/session tables and upgrades existing
revision-1 databases without changing character ownership or paid timers.
Back up before upgrading; older binaries cannot safely read these newer saves.
A complete SQLite online backup includes credentials/session rows and world state;
restoring only the JSON document cannot restore account ownership.

The Windows builder includes `identity.mjs`, `inventory.mjs` and `power.mjs` plus
all their dependencies. Server tests cover accounts, privacy, expiry, revocation,
password recovery, concurrent/session-safe receipts, failed writes, migrations,
item conservation/eligibility, power invariance and backup restore. Docker smoke
checks account protection, restart, receipt replay and complete backup restore.

Release verification: **192 server tests pass**. The read-only non-root Docker
image builds; its smoke test protects a city with an account, restarts, replays
an accepted command under the rotated session and restores a complete backup.
Forty C# sources parse and the Windows builder includes all 24 transitive server
modules. Native Unity compilation and client interaction/journal testing remain
pending. All 679 workbook records remain uniquely tracked, including all 33
research questions; no record is marked production-complete.
