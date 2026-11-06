# Playtest 0.2

## Updating an existing checkout

1. Stop Play mode and close Unity. Stop the server with Ctrl+C in PowerShell.
2. In the repository root run `git pull`. If Git reports local changes, preserve
   those changes and inspect `git status`; do not discard generated scenes or
   settings blindly. If you are still on the old setup branch, switch to `main`
   before pulling.
3. In `server/`, run `npm test`, then `node index.mjs` and leave it running.
4. Reopen the Unity project and your Prototype scene. The map is built at runtime,
   so scene regeneration is optional. If there is no scene, use **Thrones of Myth
   → Create Prototype Scene**. Press Play.

## First campaign

1. Choose a civilization and a distinct name. Establish your city.
2. Learn camera navigation: WASD/arrows, wheel zoom and middle-drag. H focuses
   home; Space focuses your army. Inspect by left-clicking, act by right-clicking.
3. Select a level-1 camp and attack. Watch health, gold and army XP. Return home
   with R to heal. Defeat three camps and claim the Journal quest for Atalanta.
4. Gather wood, gold and food by selecting resource sites and choosing Gather.
   Your army travels there and collects over time; resource totals update live.
5. Return home, upgrade the city, train troops and recruit a mythic escort. Open
   Heroes to equip a commander. These orders require an idle army at home.
6. Found an alliance, place the first beacon near your city, then gather supplies
   and extend connected territory toward the Shrine of Dawn. Walk your army near
   each location before placing a beacon.
7. Capture the shrine from the selected-site panel. Stay there for 15 seconds.
8. Extend toward the Eastern Divine Gate around (39,20), and Northern Divine Gate
   around (20,39). Capturing each grants your whole alliance access to a province.
9. With both gates owned, extend toward Renewal and the First Sanctuary at (65,65).

Beacons cost 60 wood and 20 gold each. A legal example route is (5,5), (13,12),
(20,20), (30,20), (40,20), (20,30), (40,30), (50,30), (50,40), (50,50), (60,50),
(60,60), capturing gates as needed before entering the corresponding province.
The first coordinate assumes the first player spawn; later players start nearby.

## Multiplayer and contesting

Run a standalone Windows build beside the editor; use different names so each
gets a separate army. Join one alliance to share buffs/access, or create opposing
alliances and bring connected territory near a shrine. Both armies occupying a
site should pause capture. This prototype has no player-versus-player damage.

## Known boundaries

- Server restart resets cities, resources, armies, alliances and objectives.
- Stopping Play and returning with the same name resumes the saved session while
  the server runs, for up to 30 minutes without authenticated requests.
- All mythic types currently share base statistics and generic placeholder art.
- Flags are indestructible in this slice; there is no alliance leave/migration,
  production city construction, siege, schedule, garrison or KvK.
- Unity visual and build validation is still pending. Capture the first red
  Console error if the editor fails; record player count and actions if a rule
  behaves unexpectedly.
