# Build a Windows package

This produces a real standalone Unity Windows player plus a bundled local Node
server. Players do not need Unity or Node installed. The cloud chat cannot emit
the Unity executable because its environment has no licensed Unity Editor. Run
this build once in your installed Windows Unity Editor.

## One-time build PC setup

- Unity 6.3 LTS on Windows with Windows Build Support, already used for the editor
  prototype. The build uses Mono; Android/iOS and IL2CPP modules are not required.
- Official Node.js 24 LTS installed, including its LICENSE. Restart Unity after
  installing Node so its updated PATH is visible.
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
- Closing the game stops a server this launcher started. A compatible existing
  development server is reused and is not stopped by the launcher.
- Only one packaged launcher runs at a time. Use another editor client with a
  different player name for a two-player local test.

This package hosts a world on the same PC. It does not connect remote PCs into
one online kingdom. Server state is in memory; ending its server resets progress.
The initial package is unsigned. Signing and a shared hosted backend come later.

## Validation still required on Windows

Cloud checks cover server rules and C# syntax, not Unity compilation, executable
launch, PowerShell launcher behavior or installer execution. After building:

1. Start the extracted package without Unity open and without a terminal server.
2. Join, gather, fight and return home. Close the game and confirm its owned
   Node process exits. Check logs in `%LOCALAPPDATA%\ThronesOfMyth\Logs` if needed.
3. Start again with a development server already running; closing the game must
   leave that server running.
4. Check a folder path with spaces, a second launch, and a busy port 8080.
5. If generated, install the Setup executable, launch via its shortcut, then
   uninstall through Windows Installed apps.
