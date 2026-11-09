THRONES OF MYTH — LINUX x86_64 PLAYTEST 0.35.0

Requires a desktop Linux x86_64 system, a compatible graphics driver and host
Node.js 24 LTS or later. Node is NOT bundled in this package. Use the official
Node.js distribution or your organization's approved Node 24 installation.
This is a local playtest, not a publicly deployed MMO server.

Extract the ENTIRE ZIP, open a terminal in its folder and run:
  bash Start-Thrones-of-Myth.sh
or:
  node Launch.mjs

The launcher verifies manifest file hashes, prints version/source commit, starts
only its packaged server, opens the game, and saves/stops its own server on exit.
It never reuses or stops another server. If 8080 is busy:
  node Launch.mjs --port=8081
That uses a distinct local world and passes its address to the player. Other
Unity arguments, e.g. -screen-width 1366 -screen-height 768, are forwarded.

Saves: $XDG_DATA_HOME/ThronesOfMyth/Saves (default ~/.local/share/ThronesOfMyth/Saves)
Logs:  the sibling Logs folder. Back up Saves before experiments; do not delete
existing progress to start a fresh profile. A leftover launcher lock is NOT
removed automatically: inspect the PID in the lock and confirm no launcher/server
is still running before removing that specific stale lock.

For a fresh player, choose a new unique guest name at the entry screen. To leave
an existing guest session: Settings -> Return to guest profile selection. For a
protected account use Account and recovery -> Sign out this device, then Back to
local / guest profile. Existing cities and guest resume tokens remain saved.

SHOWCASE: optional city introduction -> Captain panel -> train 5 archers -> edit
founding formation -> Scout patrol preset (Captain, 15 infantry, 5 archers, no
mythics) -> confirm -> send a scout toward (20,20) -> select remembered Forsaken
Scouts -> March & attack. Observe the real fifth-hit Rallying Cry, victory/report
resource credit, return home and Citadel upgrade. Costs and rewards are real;
do not press ALL READY after the patrol preset. Upgraded/alternative rosters may
kill too quickly to cast. Other skill styles require legitimately owned heroes.

manifest.json identifies source commit, release, Unity version, dirty-source
flag and exact packaged file hashes. The entry screen and Settings show the same
baked client identity. A modified checkout is labeled, not claimed as a clean
release. Hashes detect accidental mismatch; they are not a publisher signature.

No native Linux gameplay/FPS result is claimed merely because this package built.
