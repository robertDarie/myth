# Windows setup

The connected Codex environment is Linux in the cloud. It cannot install apps
on your Windows PC. Perform these steps locally; Codex can prepare repository
files and help diagnose errors you share.

1. Install [Git for Windows](https://git-scm.com/downloads/win) and
   [Git LFS](https://git-lfs.com/), then run `git lfs install` in PowerShell.
2. Install [Node.js 24 LTS](https://nodejs.org/).
3. Install [Unity Hub](https://unity.com/download). Sign in and activate a license
   suitable for your organization under Unity's current eligibility terms.
4. In Hub, install **Unity 6.3 LTS**, including **Microsoft Visual Studio** with
   Unity development support. For Android builds add **Android Build Support**,
   **Android SDK & NDK Tools**, and **OpenJDK**. These modules are optional for
   the initial Windows prototype. Final iOS builds require macOS and Xcode.
5. Once the prepared changes have been committed and pushed to GitHub, clone the
   repository or pull them into your existing checkout. Unpushed cloud edits
   will not appear in a Windows clone automatically. The command below uses the
   published setup branch; use the default branch after it has been merged:

   ```powershell
   git clone --branch setup/thrones-of-myth-foundation https://github.com/robertDarie/myth.git
   cd myth
   git lfs install
   powershell -NoProfile -File .\tools\check-windows.ps1
   cd server
   npm test
   npm start
   ```

6. Leave the server terminal open. In Unity Hub choose **Add → Add project from
   disk** (wording may vary), select the repository's `client` folder, and open
   it with the installed Unity 6.3 LTS editor. The scaffold declares a 6.3.0
   baseline; choose your installed latest 6.3 LTS patch if Hub offers an editor
   version choice. Unity will update the version file on import.
7. After import, choose **Thrones of Myth → Create Prototype Scene**. It saves
   `Assets/ThronesOfMyth/Scenes/Prototype.unity` and adds it to Build Settings.
8. Press Play, enter a player name, and click Join. Click ground to move; click
   the red Forsaken army to attack. Watch health and gold in the top-left HUD.
9. For a second player, build a Windows standalone player from this scene and
   run it alongside the editor. Both should see each other's movement and the
   same enemy health. Two editor windows must use separate repository copies.
10. Commit the generated scene, its `.meta` files, package lock, and exact editor
    version after a successful import. Library, Temp, Logs, and builds stay ignored.

The client defaults to localhost. A remote cloud server is not your PC's
localhost. Run this server locally for the first test. The prototype polls at
5 Hz; smoothing, mobile controls, real art, and persistence come later.
