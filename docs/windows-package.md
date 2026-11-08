# Build a Windows package

This produces a real standalone Unity Windows player plus a bundled local Node
server. Players do not need Unity or Node installed. The cloud chat cannot emit
the Unity executable because its environment has no licensed Unity Editor. Run
this build once in your installed Windows Unity Editor.

## One-time build PC setup

- Unity 6.3 LTS on Windows with Windows Build Support, already used for the editor
  prototype. The build uses Mono; Android/iOS and IL2CPP modules are not required.
- Official Node.js 24 LTS installed. Restart Unity after installing Node so its
  updated PATH is visible. If the installation omits its license file, the build
  downloads the complete LICENSE and third-party notices from the official
  nodejs/node GitHub tag for your exact runtime version. Internet access is only
  needed for that first download; it is cached under `work/node-licenses/`.
  For offline builds, put that exact release LICENSE in
  `work/node-licenses/v<version>/LICENSE` before building.
- Optional: [Inno Setup 6.3 or newer](https://jrsoftware.org/isdl.php) if you want
  a single installer executable, Start menu shortcut and uninstaller.

## Build

1. Stop Play mode, pull main into your local checkout, and reopen Unity.
2. Choose **Thrones of Myth → Build Windows Playtest**.
3. Unity builds the Windows player, bundles Node and its license, copies the game
   server and launcher, and creates `dist/Thrones-of-Myth-Windows.zip`.
4. If Inno Setup is installed, it also creates `dist/Thrones-of-Myth-Setup.exe`.
   Check the Console for whether installer generation succeeded or was skipped.

The build uses `Assets/ThronesOfMyth/Scenes/Prototype.unity`, generating it if
missing. Existing scene changes are preserved. The build updates product/window
settings and uses the Standalone Mono backend; commit those settings if desired.
It replaces the generated `dist/Windows` folder on each build.

## Play and share

- **ZIP:** extract the entire archive, then double-click **Start Thrones of
  Myth.cmd**. Do not copy only the Unity executable; it needs its Data folder,
  Unity DLLs, runtime and server files.
- **Installer:** run **Thrones-of-Myth-Setup.exe**, install for the current user,
  and launch from the Start menu. A desktop shortcut is optional.
- Keep the in-game server URL at `http://127.0.0.1:8080`. The launcher starts the
  local server, waits for a compatible health response, then opens the game.
- Closing the game requests a final save and stops a server this launcher started. A compatible existing
  development server is reused and is not stopped by the launcher.
- Only one packaged launcher runs at a time. Use another editor client with a
  different player name for a two-player local test.

This package hosts a world on the same PC. It does not connect remote PCs into
one online kingdom. World state is saved under
`%LOCALAPPDATA%\ThronesOfMyth\Saves`; closing the local server pauses simulation.
See [the current playtest guide](playtest-0.5.md) for save and backup behavior.
The initial package is unsigned. Signing and a shared hosted backend come later.

For the new 0.6 screen layout and shortcuts, see [the interface guide](interface-0.6.md).

## Validation still required on Windows

Cloud checks cover server rules and C# syntax, not Unity compilation, executable
launch, PowerShell launcher behavior or installer execution. After building:

1. Start the extracted package without Unity open and without a terminal server.
2. Join, gather, fight and return home. Close the game and confirm its owned
   Node process exits. Reopen and confirm your city, resources and queues resume. Check logs in `%LOCALAPPDATA%\ThronesOfMyth\Logs` if needed.
3. Start again with a development server already running; closing the game must
   leave that server running.
4. Check a folder path with spaces, a second launch, and a busy port 8080.
5. If generated, install the Setup executable, launch via its shortcut, then
   uninstall through Windows Installed apps.

For 0.8 loading, troop selection and model previews, see [march assembly and presentation](marches-and-presentation-0.8.md). Close the old server before launching protocol 6.

Build 0.16 requires protocol 13 and bundles `kingdom.mjs` alongside the existing
kingdom modules and original FBX assets under Resources. Schemas 1–10 migrate with
archival backups and retain previously owned-site access. See
[the kingdom/art guide](kingdom-and-art-0.16.md). Rebuild both client and server.

## Build 0.17

Bundle version is 0.17.0; protocol 13 and save schema 11 remain unchanged.
Download new army models with Git LFS (`git lfs pull`) before Unity import.
Packaging now validates imported art and animation clips before building.
Use the Art Review menu for native captures and Editor frame samples; these
checks and the standalone Windows player still need a local run. See
[the 0.17 guide](army-and-living-city-0.17.md).

## Build 0.18

Bundle version is 0.18.0; protocol 13/schema 11 remain unchanged. The builder
also bundles `database.mjs` and `downtime.mjs` because HTTP imports them. Local
playtests still use JSON and loopback. Connection settings now accept a private
kingdom invitation code for hosted HTTPS play. Native Unity compilation remains
pending. See [the hosted-server guide](hosting-and-persistence-0.18.md).

## Build 0.19

Bundle version 0.19.0 starts the [visual foundation pass](visual-foundation-0.19.md).
Protocol 13/schema 11/SQLite revision 1 are unchanged. Rebuild the Windows player
after pulling; test the listed resolutions/UI scales in Unity before packaging.
No server economy or combat behavior changes in this release.

## Build 0.20

Bundle 0.20.0 adds account/recovery, retained retries, Inventory and Rankings UI.
The builder includes identity/inventory/power server modules. Protocol remains
13; saves migrate to schema 12 and SQLite revision 2. Back up before upgrading;
old binaries cannot read the new saves. Account testing requires SQLite, while
normal launcher JSON play supports inventory/rankings. See
[the local account-test instructions](accounts-and-supplies-0.20.md).

## Build 0.21

Bundle 0.21.0 requires protocol 14 and save schema 13 for tiered troops. Stop the
old local game/server and rebuild after pulling; the launcher rejects protocol 13.
SQLite revision remains 2. See [veteran unlocks and upgrade instructions](veteran-troops-0.21.md).

## Build 0.22

Bundle 0.22.0 contains the camera/world/HUD/city presentation pass. Protocol 14,
save schema 13 and SQLite revision 2 are unchanged. Pull main and rebuild; existing
executables retain their old presentation. Before visual acceptance, run the new
Unity camera validation menu and [Windows matrix](visual-camera-0.22.md).

## Build 0.23

Bundle 0.23.0 delivers visual quality phase 1. Protocol 14, save schema 13 and SQLite
revision 2 remain unchanged. Pull main and rebuild. Run both Visual Review commands
and the [native acceptance matrix](visual-quality-plan-0.23.md) before accepting
rendered quality; these checks could not run in the cloud.
