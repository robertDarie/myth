# Functional playtest checklist

Use a fresh isolated kingdom. Do not open or edit `%LOCALAPPDATA%\ThronesOfMyth\Saves`.

1. From the repository, in PowerShell, point the server at an empty file under `work\` and start it:

   ```powershell
   New-Item -ItemType Directory -Force work\playtest-save | Out-Null
   $env:THRONES_SAVE_PATH = (Resolve-Path work\playtest-save).Path + "\world.json"
   node server/index.mjs --local-playtest --local-port=8091
   ```

2. Launch `dist\Windows\Game\ThronesOfMyth.exe --thrones-server http://127.0.0.1:8091`.

3. Create a new commander and civilization. Complete First Steps 1 through 8, including a reload after stage recovery.

4. Upgrade one resource building. Confirm the city card yield matches the resources added after a five-second cycle.

5. Train one Hall of Spears batch. Confirm the quoted cost, time, and troop count. Cancel a second order and confirm the refund.

6. Prepare a march. Confirm it cannot take more troops than the shown per-march share.

7. Spend one talent point. Open the Forge of Dawn. A relic can be equipped on only one march at home. Unequipping a health relic must not leave health above the new maximum.

8. Send a scout. Leave the revealed ground and confirm it stays discovered. Confirm an unseen enemy army is not shown.

9. Attack one camp. Read the battle report. Confirm a dead camp does not pay a second time.

10. Found or join an alliance, place a beacon, and toggle **Show supply reach**. The ring is the server supply radius.

11. Close the player, start the same isolated server again, and confirm the city, queue, and relic are still there.

Unity compilation or a successful player build does not complete this checklist. Mark a step only after it is played.
