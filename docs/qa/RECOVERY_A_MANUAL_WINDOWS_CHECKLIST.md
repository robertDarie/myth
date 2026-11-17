# Recovery A manual Windows verification

Use only the disposable launcher below. This creates an empty kingdom; it does not grant progression or edit game files. Allow normal build/training/scout/rally timers. The automated run's accelerated prerequisite preparation is not included in this fresh manual run.

## Start and resume

Open PowerShell in `C:\Users\rober\Documents\GitHub\myth`:

```powershell
& .\dist\Windows-NativeQA-74185be\Runtime\node.exe .\scripts\start-native-windows-qa.mjs --package dist/Windows-NativeQA-74185be --clients 2
```

The helper verifies all193 package files, starts the matching production server on its own loopback port and opens two clients. Keep its terminal open. Record the printed32-character run ID and source74185be9/protocol17. Give the two windows distinct names, such as ManualPassOwner and ManualPassOutsider. Do not use the regular Start launcher, port8080 or an existing kingdom.

Close both QA windows to save and stop only this server. To resume, run:

```powershell
& .\dist\Windows-NativeQA-74185be\Runtime\node.exe .\scripts\start-native-windows-qa.mjs --package dist/Windows-NativeQA-74185be --clients 2 --resume-run REPLACE_WITH_PRINTED_RUN_ID
```

Enter the same two commander names. No file editing is required. Private saves and client/server logs remain under `work/native-windows-qa/<runID>/`. Share screenshots and a redacted log excerpt, never reconnect tokens or save files.

For each numbered case record PASS/FAIL/NOT TESTED, build, window resolution, actual result and screenshot filename. Start at1600x900. Repeat camera/card checks at1280x720 and1920x1080 using the game's supported window settings if available; otherwise record those resolutions NOT TESTED. Do not edit configuration files.

## Sixteen cases

1. **Create Greek city.** In each entry screen type its distinct name, click Greek, then Enter your kingdom. Expect separate Greek cities and persistent identities. Capture the entry build stamp and city HUD. Random starting regions can differ; record each rather than assuming Dawn Reach.

2. **Enter world.** Click Return to kingdom at the city screen's upper right. Expect terrain near the city and connected HUD. If initially viewing an unexplored region, capture that before pressing Home [H]; report whether H correctly focuses the city. Use City [C] to return and repeat. Do not count a blank fog region as a missing map without checking home/discovery.

3. **Mouse wheel.** Point at a visible resource node away from UI; scroll both ways several notches. Expect smooth bounded magnification with no input loss. Record short video with pointer visible. Repeat at both zoom limits. Move pointer over a scrollable Marches panel and wheel: the panel should scroll without moving the map behind it.

4. **Pan and cursor zoom.** On world terrain, hold an arrow/WASD key, then release; expect movement followed by stopping. Hold the middle mouse button and drag; expect ground panning without issuing army orders. Aim at a distinctive node and wheel: the same ground point should remain near the cursor. Record before/after screenshots and whether jitter or drift occurs. Automation tested wheel and a bounded keyboard response; middle-button drag remains NOT TESTED.

5. **Seven zones / ten passes.** Marches → Scouting; scroll to the coordinate fields, enter a destination, click Send scout to coordinates, and await return. Discover each zone and pass listed below through scouts. Use the lower-right minimap to focus and the lower-left minus button to zoom out. Expect distinct zone labels, mountain borders and a physical pass model at every listed crossing. Public labels alone do not prove the underlying model is visible. Capture each model/label at readable zoom, including those hidden by fog or HUD in the current evidence.

6. **Select pass.** Left-click its model or world label. Expect the correct named context card, not a nearby camp or resource. Capture the card. On74185be all existing detail lines and action buttons should fit; the deployed march ribbon belongs above it.

7. **Opening and ownership.** Before opening, select a sealed neutral pass and click View opening milestone. Expect actual unmet requirements in the milestone page. Record the requirements, complete them through ordinary play, then return. The local original baseline uses founding gathering/training followed by Citadel2 and four camp victories; follow the live checklist and claim completed milestones. Do not substitute RoK opening dates. After capture compare owner/alliance access with the outsider window and confirm hidden defender intelligence remains hidden until scouted.

8. **Alliance.** In owner window click bottom Alliance; enter an unused alliance name and click Create · 50 gold. Expect the displayed cost debited and owner membership. Keep the outsider unaffiliated. Screenshot membership and resource change.

9. **Prepare and approach.** Inspect the Frontier Captain/army panel; record troops and health. Starting900infantry can form the native test army. Complete paid Citadel2/Oathbound Hall construction and ordinary training as required by the milestone; capture debit, queue and completion separately. In Alliance click Place fort / beacon · 60 wood / 20 gold, placing a connected paid chain from the home fort toward a nearby pass. Follow preview/validation messages; disconnected territory must not count. Right-click ordinary ground on your accessible side of the pass. Expect a local march with a route and conserved troops. Do not right-click a camp accidentally.

10. **Unauthorized crossing.** Before capturing the open neutral pass, right-click empty terrain beyond its border. Expect “No authorized gate route from this march to that destination.” Record the click, toast, troop count and unchanged side. Repeat with a distant ordinary ground destination to check route validation, not just the model collider. Do not count a sealed-pass test as proof of post-opening ownership rules.

11. **Capture neutral pass.** Recall [R] if needed. Select the pass → Plan pass rally; open Marches → Rallies, select that pass, use the displayed assembly duration and click ASSEMBLE RALLY. Meet any hall/territory/troop requirements through normal actions. Expect accepted assembly, Fighting, decreasing fortification health, then victory and your alliance owner. Record the rally card, battle, outcome and blue/access label. If the army loses, record the actual loss and build strength legally; do not grant units or lower defenders. This is the owner-approved original encounter, numerical parity unverified.

12. **Controlled passage.** After victory repeat the exact ground destination rejected in10. Expect accepted movement through the controlled crossing, arriving on the other side with conserved troops. Record both sides, route and owner. A changed target or unrelated local move is insufficient.

13. **Outsider.** In the second window select the same pass: expect the owning alliance but BLOCKED CROSSING and no authorized access. Attempt empty ground on its far side; expect rejection and preserved troops/location. For an isolated single-pass comparison, the outsider must already be legitimately in the adjacent starting zone with no other blocked border on its route. If random spawn differs, label a distant-route denial as PARTIAL and keep the isolated comparison NOT TESTED. Do not teleport or alter saves.

14. **Scout exemption.** Before owning a selected pass, Marches → Scouting → coordinate fields; send a scout into its opposite province. Expect accepted scouting, travel/return, new discovery and a report despite army denial. In Dawn Reach,20,20 tests a route through uncontrolled Eos and Eastern Divine Gate. Else select an adjacent province from your actual home. Capture departure, completed return, explored count/4096 and report. Scouts must not grant military access.

15. **Restart integrity.** Record pass owner/access, army field location, health, troop/reserve counts, commander and alliance. Close both QA clients; await helper shutdown. Resume the same printed run ID/package/names. Expect identical identities, ownership, troops and field location. A field army can safely resume Paused; it must not teleport, duplicate or lose units. Capture before/after and use the minimap or army focus to revisit the actual field army rather than only its city.

16. **Minimap / boundaries.** Click each minimap corner and center, then Home [H]. Expect the view to focus correspondingly and remain inside world limits as zoom changes. Compare visible city/pass dots and fog to the main map. Send normal scouts to0,0;255,0;0,255;255,255 as allowed by the live UI, await completion, then compare edge cells. Attempt pan/zoom past each outer edge: no missing ground, unbounded camera or off-map destination should be accepted. Capture all four edges at both zoom extremes. Current native evidence does not certify every boundary cell.

## Inventory to inspect

Zones: First Frontier(20,20); Sunward Province(60,20); Runic Province(20,60); First Throne(60,60); Dawn Reach(168,40); Ashen Fields(40,168); Outer Marches(168,168). Coordinates are navigation references, not an instruction to move military through unauthorized borders.

Pass models and adjacent zones:

- Eastern Divine Gate(39,20): First Frontier / Sunward.
- Gate of the Norn Crown(39,60): Runic / First Throne.
- Northern Divine Gate(20,39): First Frontier / Runic.
- Gate of the Sun Oath(60,39): Sunward / First Throne.
- Gate of Eos(79,20): Sunward / Dawn Reach.
- Gate of the Dawn Throne(79,60): First Throne / Dawn Reach.
- Gate of the Ashen Oath(20,79): Runic / Ashen Fields.
- Gate of the Ember Crown(60,79): First Throne / Ashen Fields.
- Gate of the Starward March(128,79): Dawn Reach / Outer Marches.
- Gate of the Worldroot(79,128): Ashen Fields / Outer Marches.

## Evidence and outstanding observations

See RECOVERY_A_NATIVE_WINDOWS.md for executed results, screenshot36 for the corrected deployed card,37–38 for actual outsider denial/private defender presentation, and the before/after restart JSON. Capture any initial city/world focus issue before using H; that observation is not yet an isolated reproducible defect. Native logs also contain Unity serialization-depth warnings around recursive ArmyData.homeFormations; no associated loss was observed in this restart, and wider DTO/serialization investigation is outside this UI checkpoint. Preserve an excerpt if it reproduces; do not infer complete serialization correctness from one saved army.
