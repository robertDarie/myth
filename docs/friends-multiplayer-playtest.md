# Friends multiplayer playtest

One persistent authoritative kingdom runs independently of the Unity clients. The host must remain online for continuous shared play. Closing one game never shuts down the shared server. Scope: private 3–10-person alpha, default 32 registered cities; 256 is an opt-in registered-capacity test ceiling, not 256-active-player certification.

## Host: private encrypted network

1. Use the matching published main source and Node.js 24+ on the host. Friends need no Node, Unity, Git or repository. Use a private mesh account/plan that already covers the participants; no subscription or service was purchased here.
2. Connect the host and friends to an encrypted private mesh. With Tailscale, share only the host device with invited people and restrict its HTTPS endpoint to them. See [official device-sharing instructions](https://tailscale.com/docs/features/sharing). No public Internet exposure is required.
3. At the repository root, start the dedicated server:

```powershell
$env:THRONES_JOIN_CODE = Read-Host 'Private invitation code'
.\scripts\start-friends-server.ps1 -Port 8088 -TrustLocalProxy
```

Storage is `%LOCALAPPDATA%\ThronesOfMyth\FriendsAlpha\friends.sqlite`. The script refuses the real Saves directory, isolated playtest data and port 8091. It requires invitations and persistence, binds only 127.0.0.1 and restores its environment when stopped. Keep this terminal open. Never run two writers on this database.

4. In another host terminal, make the local service reachable through private HTTPS:

```powershell
tailscale serve --bg 8088
tailscale serve status
```

Use the exact HTTPS hostname printed by Serve and enable tailnet HTTPS if prompted. Serve remains within the private tailnet; do not use Funnel for this alpha. The [official Serve reference](https://tailscale.com/docs/reference/tailscale-cli/serve) documents background serving and status. Private mesh policy must allow the invited friends to reach that HTTPS endpoint. No public router forwarding or public Windows inbound rule for Node port 8088 is needed. No firewall or network account was changed by this task.

5. Verify readiness locally and through the shared address:

```powershell
Invoke-RestMethod http://127.0.0.1:8088/readyz
Invoke-RestMethod https://HOST.TAILNET.ts.net/readyz
Invoke-RestMethod https://HOST.TAILNET.ts.net/kingdoms
```

Expect status ok, protocol 17, healthy persistence and the friends kingdom. Share only the approved HTTPS address, kingdom name, invitation code and matching client ZIP. Never share passwords, recovery codes or session tokens.
6. Stop with Ctrl+C in the server terminal; it flushes and closes storage. Restart the same command/data directory to resume. Stop mesh sharing separately with `tailscale serve reset` when appropriate. Do not delete data to fix connection errors.
7. Back up to a NEW private filename using the existing online backup API:

```powershell
node server/backup.mjs "$env:LOCALAPPDATA\ThronesOfMyth\FriendsAlpha\friends.sqlite" "C:\PRIVATE-BACKUPS\friends-YYYYMMDD.sqlite"
```

Create the private backup directory first. Do not copy only a live SQLite file while WAL writes are running. Backups contain account/session secrets and never belong in Git or the client ZIP. Restore only with the server stopped, preserving the current database/WAL/SHM recovery set first.

## Multiple private kingdoms

The existing multi-realm host is retained. Pass `-RealmFile C:\PRIVATE-CONFIG\kingdoms.json` to the friends script. Choose one to four unique kingdoms and paths, exactly one persistent SQLite/JSON path per kingdom, and absolute storage paths within the selected alpha DataDirectory. Include a defaultId. Each kingdom needs its own invitation code or the THRONES_JOIN_CODE fallback. Example structure (replace paths locally):

```json
{"defaultId":"friends","kingdoms":[
 {"id":"friends","name":"Friends alpha","databasePath":"C:/Users/USER/AppData/Local/ThronesOfMyth/FriendsAlpha/friends.sqlite"},
 {"id":"second","name":"Second alpha","databasePath":"C:/Users/USER/AppData/Local/ThronesOfMyth/FriendsAlpha/second.sqlite"}
]}
```

Verify `/k/friends/readyz` and each other configured realm separately. Friends must select the SAME kingdom ID to share a world; cross-kingdom city transfer is not implemented.

## Mode 2: hosted private alpha

This is preparation only: no hosting/domain purchase, public deployment or firewall change was made. After separate operator authorization, use the existing `ops/kingdom/compose.yaml`, Dockerfile, Caddyfile and `.env.example`. Create the actual .env privately with KINGDOM_DOMAIN, ACME_EMAIL, THRONES_KINGDOM_ID and a long THRONES_JOIN_CODE. Never commit it. See [hosting and persistence](hosting-and-persistence-0.18.md).

The /data volume preserves SQLite; Caddy terminates HTTPS and Node remains on the internal container network. Run Compose from ops/kingdom only when deployment is approved, verify readiness over HTTPS and use ops/kingdom/backup.sh for online backups. Preserve the volume. The operator's approved firewall should expose only the required HTTPS/certificate endpoints, not Node's direct port. Internet account registration/login requires HTTPS; existing client/server protections remain enabled. Build server and client from matching published source.

## Friend: join and resume

1. Download the host's matching Thrones-of-Myth-Windows-Client.zip and extract ALL files.
2. Run **Start Thrones of Myth Online.cmd**. It starts only the game; it never launches Node or a local simulation.
3. Connection settings open automatically. Enter the host's HTTPS address, click **Refresh kingdoms**, and choose the shared kingdom. Remote client-only entry requires HTTPS; loopback remains allowed for local tests.
4. Enter the invitation code, choose a unique city name and civilization, and enter. New cities receive separate suitable random locations. Everyone connects to the same server-owned world.
5. Close/reopen with the same address, kingdom and name to resume the saved local session. The remote address is remembered locally. Never distribute preferences/session tokens.
6. Use the existing protected-account registration/login when configured; the supplied SQLite host supports it. Sign in to your own account on another PC. Keep passwords and recovery codes private.

Optional direct launch: `Game\ThronesOfMyth.exe --thrones-client-only --thrones-server https://HOSTNAME`.

Protocol mismatch or a stamped source-commit mismatch stops entry and asks for a matching ZIP. An unavailable-host error asks the host to verify readiness. An invitation rejection needs the current code; an existing city should resume its saved profile. For DNS/TLS failures, check the mesh device share, connection and Serve status. Do not disable certificate validation or send account credentials over public HTTP. If the host is offline, no continuous shared game is available.

## Real 3–10-person acceptance checklist

**NOT YET PLAYER-VERIFIED.** Record client/host source versions, kingdom ID, date, observed errors and outcomes without recording credentials.

- Join one kingdom from separate real Windows PCs; verify distinct random homes and the same persistent kingdom state.
- Explore toward another city; check current fog and private historical scouting information.
- Join an alliance, promote an officer, exchange alliance chat and confirm outsider privacy.
- Build the market normally; transfer resources once and reconcile sender debit/tax, recipient credit and report.
- Gather and return cargo; check no treasury credit before delivery and no duplicate payment after reconnect.
- Move armies independently; one client's command must not control another player's army.
- Defeat one beginner camp; inspect AP, XP, rewards and report; stale commands must not pay again.
- Build the Oathbound Hall; assemble/recall a legal two-player rally and use a garrison. Progress through any required gates normally.
- Close one client while others play, then resume its same city, troops, inventory, jobs and accepted march orders.
- Make a backup, restart the dedicated host safely and reconnect everyone without duplicate cities or rewards.

Automated evidence: three real loopback HTTP clients with production spawn selection, temporary SQLite, scouting, gathering/delivery, alliance chat, independent movement and durable restart/reconnect. Existing two-player authored scenarios additionally cover legal city progression, trade/idempotency, camp combat, garrisons and rallies. Accelerated local tests do not establish real remote friend connectivity.

## Client-only Windows build

The existing **Build Windows Playtest** and local launcher stay separate. Build from clean published main with Unity 6000.3.0f1 and Windows Build Support: **Thrones of Myth / Build Windows Client Only**, or:

```powershell
& 'C:\Program Files\Unity\Hub\Editor\6000.3.0f1\Editor\Unity.exe' -batchmode -quit -nographics -projectPath "$PWD\client" -executeMethod ThronesOfMyth.Editor.WindowsPlaytestBuilder.BuildClientOnlyFromCommandLine -logFile "$PWD\work\client-only-build.log"
python -X utf8 scripts/verify-client-package.py
```

Output: dist/Thrones-of-Myth-Windows-Client.zip; staging: dist/WindowsClient. Source commit, version, protocol and payload hashes are stamped. Only fresh Game output, the game-only launcher, public instructions and manifest enter the archive. Verification checks every payload hash and rejects server/runtime folders, databases, saves, workbooks, credentials and escaping paths. Required executable/Unity data are included. Personal PlayerPrefs, operator files and invitations are excluded.

A native Windows build and ZIP integrity/privacy verification succeeded here (145 payload files). Release identity is refreshed when rebuilding a clean published checkpoint. No compiled binaries are committed. Native rendering/FPS and real 3–10-person Internet/VPN acceptance remain **NOT YET PLAYER-VERIFIED**.
