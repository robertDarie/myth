# Playtest 0.3: a working city and saved kingdom (historical)

For the current version, see [Playtest 0.4](playtest-0.4.md).

## Update

Close the old packaged game, stop any terminal server, close Unity and pull main.
Reopen Unity and use **Thrones of Myth → Build Windows Playtest**. Extract the new
ZIP to a fresh folder (or rebuild the installer) and use its launcher. Do not mix
0.2 client/server files with 0.3: the protocol is now version 3.

Version 0.2 did not write world saves. Version 0.3 starts a fresh persistent world
on first launch; subsequent 0.3 launches resume that world.

## City development while your army is away

1. Join, send your army to gather wood, and open City.
2. Queue a city upgrade for 100 wood / 75 gold. The first takes 20 seconds.
3. Queue five troops for 50 food / 20 gold. Training takes eight seconds.
4. Watch the army continue gathering. Construction and training use independent
   lanes. Neither changes or cancels the field order.
5. Completed troops appear under **Ready reserves**, not in the deployed army.
6. Return home, stop if necessary, and choose **Add ready reserves to army**.
7. At city level 2, queue a mythic recruit for 80 food / 100 gold. It takes 20s
   in the same training lane and also waits in reserves.

The training lane holds three orders. Capacity includes deployed troops, reserves
and queued orders. Canceling a queued or active order gives a full resource refund
in this prototype. A completed order cannot be canceled or refunded.

The Heroes panel lets you recruit commanders from anywhere. Equipping them still
requires the army idle at home. City development is also available during army
recovery. Healing still happens automatically at home.

## Saving

The local server autosaves every two seconds and after accepted orders, and the
packaged launcher requests a final save on normal exit. A forced termination can
lose the last two seconds of simulation. A valid previous save is kept as backup.

Windows save files:

```text
%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json
%LOCALAPPDATA%\ThronesOfMyth\Saves\world.json.bak
```

Use the same name and saved local client profile when reopening. The name alone
is not a credential. Keep both the server save and your Windows client profile;
this is not yet a portable account/login system. Save files contain local session
credentials and should not be shared publicly.

The simulation pauses while its server is closed: no offline training or resource
income yet. On reload, existing field orders stop safely, but positions, health,
resources, commander ownership, army composition, reserves, queues, alliances,
beacons and objectives are preserved. Continue orders manually after joining.
Inactive cities remain saved and keep their territory. The prototype has 32 city
slots per saved world; it does not automatically delete old cities.

The Journal displays save status. If disk space/access prevents a save, the client
shows an error in its status bar. A damaged primary file falls back to the previous
valid backup. If neither loads, the server stops and preserves both files rather
than silently replacing your kingdom.

For a separate development world, set `THRONES_SAVE_PATH` to another absolute
filename before running `node index.mjs`. `createGameServer()` defaults to memory
when imported by tests; the normal CLI enables persistence.

## Scope

This milestone retains one deployed army per player. Multiple armies, a dedicated
city interior, hospital treatment queues, unique mythic abilities, PvP, scheduled
passes and KvK remain future work. Windows Unity compilation and visual testing
must still be performed locally after the automated checks.
