# Gameplay feel and first-session milestone 0.27

Bundle **0.27.0**, protocol **14**, game save schema **13**, SQLite revision **2**.
Server rules, balance, movement/pathfinding, DTOs and persistent game data are
unchanged. Only a legal first-session integration test was added under `server`.
This builds on 0.26; no new mechanics or parallel animation/audio/effect system.

## What changed

### Movement and field interaction

- Faster settling to received positions and a small stop tolerance remove endless
  interpolation creep. No extrapolated positions or client-authoritative movement.
- Imported formations now have restrained turn/travel offsets as well as their
  existing rigged clips. Existing infantry, archer, cavalry and mythic silhouettes,
  mixed-role overview detail and selected full-detail behavior are preserved.
- Selection gets a short halo and quiet cue; destination halos appear only after a
  successful command response. Arrival is observed at the prior confirmed target,
  not inferred from a canceled order. Home arrival also handles immediate healing.
- Only the selected march draws a route. Wider dash spacing, a 160-dash draw budget
  and one terminal arrow reduce clutter. Paths still come from the server.
- Own/allied/other armies have explicit labels and consistent map/minimap colors.
  Red is an opposing affiliation, not permission to bypass PvP protection.
- Travel to a resource is labeled separately from working. The server's Gathering
  order state alone does not authorize work animations: actual server position
  must be within the interaction radius. Retreats do not become fake arrivals.

### Confirmed combat, outcomes and audio

- A map-piece presentation history survives art rebuilds. Initial snapshots,
  counter rollback, profile changes and long snapshot gaps quietly rebaseline.
  Increased counters coalesce into one representative animation, never a catch-up
  barrage. Attacks/skills/HP changes do not originate from client guesses.
- Fixed the victory cue's old counter-ordering condition. A real transition to
  Victorious can now celebrate once even when its attack counter was already read.
- Attack/hit/skill priorities, commander-only casting and attack facing are clearer.
  Arrows retain timed release/impact; formations with mythics have a heavier impact
  accent. This is aggregate army presentation, not fabricated per-unit damage.
- Confirmed defeat teleports snap to home and cancel in-flight shot effects, rather
  than drawing a sprint/projectile from home back to the old battlefield.
- Net HP feedback is distinct from damage attribution. Capacity/max-HP changes and
  forced retreat teleports do not create fake healing/damage numbers. A simultaneous
  skill and health change can both appear; low-health bars get a warning color.
- The latest observed encounter appears in Battle reports and a non-blocking notice.
  Existing private PvP/alliance reports retain their actual outcomes and wounds;
  completed report replay is guarded. A visible camp clearing does not celebrate
  as the player's victory unless their own state/report confirms an outcome.
- Camp XP/health and current treasury are shown without attributing unrelated
  passive/gathering income to a kill. There is still **no durable per-camp detailed
  battle report** in protocol 14; the journal, counters, current totals and latest
  live encounter provide the existing evidence. No new report/reward is invented.
- Existing audio assets and generated fallback cues gain quiet selection/confirmation/
  arrival/reward earcons, modest pitch variation and rate limits. Critical cues are
  not displaced by footsteps. Release and impact remain aligned to observed strikes.
- One 48-spark pool, eight reusable ground halos, one caption per actor, a 128-ID
  completed-report guard and rate-limited audio bound presentation memory/work.
  Ambient dust/work cannot evict active combat effects. Reduced motion immediately
  suppresses particles, freezes cosmetic formation offsets and keeps static state
  cues; master effects volume zero suppresses all new sounds too.

### Optional opening guidance

The existing campaign card can suggest city → Citadel → training → commander/
formation → wood → food → level-1 PvE → outcome → home. It reuses campaign progress,
normal pages, contextual actions and legal server commands. It is not a second
quest ledger and does not pay rewards or mark objectives complete on the client.

Ready campaign/chapter claims take priority. Queued training can run alongside city
work and gathering. The first march already exists: preparation edits it at home
rather than requiring a locked extra slot. The combat suggestion selects only a
received available level-1 camp; unavailable/undiscovered targets use existing
exploration guidance. Advice ends naturally after the outcome/home or more advanced
progress. It can be disabled in Settings and never opens forced pop-ups.

Pending, accepted and rejected orders remain distinct. Actual accepted campaign
claims show their configured rewards once in the session. Rejected commands do
not play success cues. Reconnecting to already-claimed objectives does not replay a
claim celebration. This is feedback around the existing idempotent server flow.

## Executed verification

- **207 server tests pass**, including a fresh-city journey with no rich fixtures,
  teleports or forced wins: construct Citadel 2, train ten, configure 30 soldiers,
  gather wood/food, defeat a real level-1 camp, confirm credited rewards/XP, claim
  once, return and restore the saved session.
- **182 compiled production-C# presentation checks pass**, including 36 new feel
  checks for counter/event replay, simultaneous HP/skill, victory, recovery,
  arrival versus stopping, actual gathering range, report continuity and all nine
  opening guidance stages. The existing navigation/fog/size/completion checks remain.
- **61 C# files and 3 PowerShell scripts** pass source/static hygiene checks;
  `git diff --check` passes. No server runtime or DTO changes.
- The pure helpers compile with .NET 8; **the Unity application has not been
  compiled or rendered here**. Native animation, sound timing, input/picking,
  camera behavior and FPS are pending. No native visual/performance pass is claimed.

Reproduce from repository root:

```powershell
npm --prefix server test
dotnet run --project tests/PresentationContracts -c Release
python tools/check-visual-sources.py
```

The .NET 8 SDK and parser dependencies described in the 0.26 guide are developer
checks only. No SDK/compiler is needed to run the packaged game.

## Exact Unity first-session demonstration

Use a separate server URL/save for a reproducible new-city recording. In a **new**
PowerShell terminal at the repository root:

```powershell
$env:PORT = '8081'
$env:HOST = '127.0.0.1'
$env:THRONES_SAVE_PATH = Join-Path $PWD ('work\feel027-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '\world.json')
Remove-Item Env:THRONES_DB_PATH -ErrorAction SilentlyContinue
Remove-Item Env:THRONES_JOIN_CODE -ErrorAction SilentlyContinue
node server/index.mjs
```

These environment changes affect only that terminal; the main save is not deleted.
Keep the terminal running. Restore your usual entry server/name after the test.

1. Pull main. Open `client` in **Unity 6000.3.0f1** and wait for compilation/import.
   Open `Assets/ThronesOfMyth/Scenes/Prototype.unity`. If it is absent, use
   **Thrones of Myth → Create Prototype Scene**. Run **Visual Review → Run Headless
   Contracts** outside Play mode, then enter Play mode. Those native checks have
   not run in the cloud.
2. Set Game View to **1920×1080**. At kingdom entry expand Connection settings,
   set `http://127.0.0.1:8081`, choose **Greek** and a new name such as `Feel027-A`.
   Enter the kingdom. Enable opening guidance in Settings if previously disabled.
3. Use the campaign card's **Show** to enter the city. Select the Citadel and inspect
   its cost/purpose. Start the legal level-2 upgrade. Verify pending versus accepted
   feedback; the construction queue runs while you leave this screen.
4. Open **Menu → Train & promote**. Queue **Train 5** twice in Tier I. Watch ready
   reserves/queue counters; let both finish. The prototype has short timers: use the
   time to inspect the city, resources and camera rather than treating this as a
   literal enforced ten-minute timer.
5. From the opening card choose **Commander & troops → Show**, or select your city
   and **Prepare march**. Edit the first march, keep **Frontier Captain**, include
   the existing 20 plus the ten ready infantry, and confirm. No second commander
   or additional march slot is required. Do not configure while troops are still
   queued if you want exactly 30 for this demonstration.
6. **Gather timber → Show** selects a visible grove. Click **March & gather**.
   Inspect the accepted destination halo and authoritative path; use Space or the
   march rail to focus. Confirm `To resource` during travel, then work/arrival
   feedback only within range. Gather at least 40 wood. Claim the ready campaign
   objective. Repeat with food and claim it; claim training/chapter rewards when
   ready. The guidance never invents progress or auto-claims rewards.
7. **Challenge a camp → Show** selects an available level-1 camp. Inspect health,
   select your prepared march and click **March & attack**. Stay at close zoom for
   the real encounter. Watch turning/strikes, actual HP changes, low-health states
   and the confirmed victory transition. A basic first fight may finish before a
   commander skill charges; that is valid server behavior, not a missing cue.
8. Use **Review the outcome → Show** or **Menu → Battle reports**. Verify the latest
   live result, remaining health/XP and current resource totals. Read the treasury
   disclaimer: totals are not a per-kill reward breakdown. Check the journal and
   campaign progress. Camp combat does not produce the field-duel wound report.
9. Choose **Return and grow → Show**, or press R on the world. Verify the return
   path, home arrival/healing and editable troops once fully recovered. Enter city
   and continue construction. Reconnect: historic attacks, report victories and
   reward fanfares must not replay.

## Additional native acceptance matrix

- Repeat the journey/key interactions at 1280×720 and 2560×1440 and 85/100/115% UI
  scale. Check the compact guidance card, clipping, context actions and no click-through.
- At min/max zoom: move/stop/turn, change destination, select mixed infantry/archer/
  cavalry/mythic formations on an existing progressed city. Full detail returns on
  inspection; overview retains roles. Select outer units after turning. Check
  boundary focus/clicks and that only one route/terminal arrow is shown.
- For real PvP, use two legitimate level-2 cities on the same test server, different
  commanders/names, enough legal troops and both marches outside home protection.
  Attack through the normal action. Verify protected targets remain disabled,
  hostile/ally identification, counter-driven arrows/skills, retreat and actual
  private field report wounds. No PvP plunder/reward popup should appear.
- Use progressed armies for a longer real fight to exercise commander skills and
  mythic/archer impacts; avoid creating a guaranteed win fixture. Compare health
  changes with server-confirmed report totals, not cosmetic projectile counts.
- Toggle **Reduced motion**, effects and sound volume zero during movement/combat.
  No new particles/sway should persist; static selection, health, state and result
  information remains. Test multiple visible armies for bounded effects/audio.
- While an order is in flight inspect Pending; reject a legal UI action after its
  resources/state change and inspect the real rejection. For unconfirmed SQLite
  orders use the existing safe retry control; no double reward/celebration.
- Run **Visual Review → Validate Map Readability (Play Mode)** and existing camera
  checks. Capture unique screenshots and **Art Review → Measure 300 Game Frames**.
  For the packaged player use **Thrones of Myth → Build Windows Playtest** and the
  [0.26 opt-in F8 recorder](visual-quality-delivery-0.26.md). Record matched dense
  world/combat/city cases; no native FPS budget or rendering result is established yet.

Known limits: presentation coalesces counters when polling misses multiple strikes;
no historical shot playback, no inferred damage and no durable new camp report.
The latest live encounter is session-local. The full UI is still designed for the
supported desktop layouts, not extreme portrait windows. Native visuals, animation/
audio timing, simultaneous-caption density, formation edge picking and real FPS
remain unverified until this combined Windows recording.
