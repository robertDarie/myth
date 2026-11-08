# v0.28.0 — Core gameplay corrections

Protocol **15**, world save schema **14**. SQLite container schema remains 2.
Rebuild client and bundled server together; stop the previous server first.

## Playable changes

- The server remembers observed resource deposits, camps, sacred sites, beacons,
  strongholds and cities. Remembered markers say **Last seen** and inspection
  offers scouting rather than presenting old numbers as current facts. Unknown
  locations are absent. Live sight refreshes the observation; a removed beacon
  remains a remembered ghost until its former position is observed. Enemy armies
  are never remembered. Cargo, enemy home coordinates and other players' routes
  are removed from field snapshots. Terrain discovery remains permanent.
- Troops assigned to a commander form a **home formation**, separate from reserves.
  Preparing a formation does not place an idle army outside the city. Select its
  card and issue a destination, gathering, combat or contribution order to deploy.
  Age limits apply to concurrently deployed marches (one through five); up to
  five formations can be prepared. Actual arrival home removes the field actor
  and frees its slot, preserving its identity, commander, relic, units and health.
  Changing composition still requires recovery; home healing has not changed.
- Gathering debits shared node stocks into private march cargo, not the treasury.
  Infantry carry 16, archers 12, cavalry 24 and mythic units 80 each; veterans use
  their class capacity. Logistics research adds 8% per level, rounded down after
  composition is summed. Existing gathering-speed modifiers still apply. These
  capacities are explicit v0.28 rules, not a change to troop combat strength.
- Full cargo and exhausted nodes trigger a return. Manual recall delivers partial
  loads. Stopping or changing a field destination retains cargo. Composition,
  commander and equipment changes are blocked while carrying cargo. A cargo trip
  can include multiple deposits; its report retains each source and quantity.
- Successful home arrival credits resources and creates one private delivery
  report. Daily/chapter/kingdom gathering progress counts **delivery**, not pickup.
  Passive production remains independent and may increase treasury balances while
  cargo is still in the field. Carried cargo is destroyed on combat defeat, with
  an attributed loss report; it does not teleport home or become PvP plunder.
- **Reports** is the unified existing navigation destination: search and category
  filters cover gathering, PvE outcomes, field battles, rallies/strongholds,
  scouting and confirmed alliance/system actions. Original detailed duel/group
  records remain the source of truth. No report has a reward-claim action.
  Gathering/PvE/alliance/system history retains 100 entries per owner; existing
  battle/group/scout limits remain 30/20/20. The merged view is bounded to 170.
  Alliance membership/leadership events reach relevant members only. System
  entries currently cover kingdom reward claims; this is not a generic news feed.

## Persistence, privacy and economic safety

Schema 1–13 saves migrate into 14. Existing balances, rewards, units, inventory,
commander progress and paid jobs are retained. There is no retroactive cargo and
no fabricated historical static observation: currently visible objects seed the
new cache; old explored terrain remains explored. JSON storage archives schema 13
before overwriting it, following the existing migration archive convention.
Back up SQLite kingdoms using the existing backup command before upgrading.

Schema 14 resumes accepted move/gather/return orders, without simulating gathering
or battles during server downtime. Old-schema field orders retain their previous
pause-on-migration behavior. Battles/rallies keep the existing safe interruption
on restart; interrupted combat orders carrying cargo return it safely. Offline
production and paid city queues still use existing downtime recovery.

Cargo resource totals must reconcile with source totals. Duplicate active trip
IDs, a cargo trip already present in settled reports, malformed balances, future
observations and invalid destinations are rejected on load. Trip settlement and
report insertion share the existing command/storage transaction. Simulation ticks
that transfer cargo commit their entire world snapshot before another HTTP request
can observe them. Storage failure restores the pre-tick world and pauses the
kingdom until recovery; normal autosaving still covers other simulation changes.
No extra loot/reward endpoint or parallel report reward ledger was introduced.

Static memory contains only whitelisted observed fields, not references to live
server objects. It does not retain enemy armies, garrisons, contributions, cargo,
relic assignments or routes. Own/allied institutions still use existing alliance
information sharing. Remembered values and timestamps never update from unseen
node depletion or ownership changes.

## Reproducible Windows acceptance checks (pending native execution)

1. Back up saves. Pull main and Git LFS assets. Open `client` with Unity 6.3 LTS.
   Wait for compilation; confirm there are no Console errors. Generate/open the
   existing prototype scene using the Thrones of Myth menu if needed.
2. Stop the old local server. Run `cd server` then `node index.mjs` (Node 24+).
   In Unity enter Play, connect to `http://127.0.0.1:8080`, and use a fresh city.
   Alternatively choose **Thrones of Myth → Build Windows Playtest**, extract
   `dist/Thrones-of-Myth-Windows.zip` and run **Start Thrones of Myth.cmd**.
3. Confirm the founding formation is Home, with zero deployed marches and no
   troops standing outside the city. Select it; march to a visible grove. Inspect
   cargo in Marches / the selected-army context. Treasury must not receive pickups
   (allow for separately timed passive production).
4. Recall a partial load. Before arrival, balance is unchanged by cargo; after
   arrival its report lists the exact delivered amount and sources. The army
   disappears, slot count falls, and its Home formation can be selected again.
   Deploy it twice more; confirm commander, relic and troop counts do not duplicate.
5. Gather until full; repeat with a depleted deposit and two clients gathering
   the same deposit. Verify automatic recall, conservation and separate reports.
   Stop a partial load, change destination, recall and deliver. Test a failed order
   and an army already assigned to a rally; existing commitment rules still apply.
6. Scout remote deposits/structures. Return all sight sources home. Confirm faded
   land and Last seen markers remain, enemy armies disappear, and stale markers
   offer reconnaissance. Have another client deplete/change a remote object;
   its unseen marker must stay unchanged. Rescout to refresh; test a dismantled
   beacon's ghost disappearing only on renewed sight.
7. Restart during gathering, during cargo return, and after delivery. Reconnect to
   the same city. Check cargo/order resumption and exactly one delivery. Repeat
   with a copy of a v0.27 save; check balances, jobs, hero progress and inventory.
8. Lose a cargo-carrying march to a strong camp. Confirm a loss report, no cargo
   delivery and no duplicated wounded/surviving troops. Exercise a real PvP duel
   with a second Age 2 player and review its existing detailed battle report.
9. Use Reports category filters/search; inspect a delivery, camp outcome, scout
   survey and field/group report. Reopen/reconnect; no reward should replay.
   Confirm another account cannot see private reports/cargo/home formations.
10. Complete the first-session city upgrade, training, assembly, wood/food delivery,
    real level-one camp, outcome and home-return journey. Open every existing
    screen; verify reduced motion, audio settings and keyboard shortcuts.
11. Repeat HUD/context/report/camera checks at 1280×720, 1920×1080 and 2560×1440,
    UI scales 0.85/1/1.15, 4:3 and ultrawide. Verify field selection, map corners,
    zoom limits, scrolling report details, disabled actions and text truncation.

Automated server and portable C# results are recorded in the delivery notes.
Unity Editor compilation, rendering, native input, launcher/installer execution,
visual layout and FPS require the Windows run above. No native pass is claimed.
