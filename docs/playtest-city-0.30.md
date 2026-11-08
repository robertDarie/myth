# v0.30.0 Windows / Unity acceptance

## Rebuild

1. Back up the existing kingdom as usual. Pull main and Git LFS assets.
2. Open `client` in Unity 6.3 LTS and wait for import/compilation. Confirm no red
   Console errors. Open the existing prototype scene (generate it through the
   Thrones of Myth menu if absent).
3. For Editor testing, start Node 24+ with `cd server` then `node index.mjs`; enter
   Play and connect to `http://127.0.0.1:8080`. v0.29-compatible protocol 16 remains.
4. For standalone, choose **Thrones of Myth → Build Windows Playtest**, extract the
   complete `dist/Thrones-of-Myth-Windows.zip`, then run **Start Thrones of Myth.cmd**.
   Rebuild the client; an existing v0.29 executable does not contain the new view.

## Entry, return and camera

- Pan and zoom to a recognizable kingdom position. Click your own city. Watch the
  approach and city blend; it should fill the main viewport without a city modal.
  Return using the visible control and confirm the previous kingdom framing.
- Enter with C; exit with C and Esc. Repeat at least twenty times. Reverse entry
  and exit midway, and press Esc repeatedly. No stuck fade, invisible world,
  continuing input lock, duplicated city stage or recurring texture allocation
  should result. Check the Console after these repetitions.
- Repeat with the city near each kingdom edge/corner, at minimum/maximum world
  zoom, and after resizing the window. Approach and return must never reveal
  blank kingdom background outside its bounds.
- Rotate through a full turn with Q/E and buttons. Zoom to both limits. Fit/Home
  should restore the complete city. The city camera cannot freely drift into
  empty space. Check foreground/background terrain and edge clipping.
- Resize during entry, inside city, while zoomed, and during exit. Re-enter after
  changing resolution; selection must use the visible projection.

## Selection and every institution

For each civilization (Greek, Egyptian, Norse, Chinese, Japanese), use an existing
legitimate test profile and inspect all sixteen buildings/foundations:

Citadel, Temple, Athenaeum, Hall of Spears, Sanctuary of Beasts, Blessed Fields,
Sacred Grove, Stoneworks, Treasury, Mana Well, Hospital, Vault, Agora, Oathbound
Hall, Forge and Builders' Lodge.

- Select each through several camera angles, including overlap between tall and
  short buildings. The visible building and selected context must agree. Hover,
  selection ring, label and upgrade/lock marker should remain readable.
- Zoom toward a selected edge district; verify framing stays within the city
  presentation and clicking does not select its neighbor. Fit and select again.
- Use Tab/Shift+Tab to traverse every district and wrap correctly. Q/E, Home and C
  must still work after clicking rotation buttons, queue links and context actions.
- Open every supported institution action. Its existing UI must work; close it
  back to the city. Use its Kingdom button to return directly to the map. Existing
  K/L and the bottom navigation must preserve their normal destinations.
- Open District list, select every institution and perform an allowed action.
  Return to the 3D city; the same building should remain selected.

## Construction, queues and feedback

- With sufficient ordinary resources, construct an unlocked foundation. Verify
  exact server cost, crew usage, scaffold and timer. No optimistic completion.
- Run both crews if unlocked, plus training and research. Inspect each queue.
  Selecting academy research must not prevent an otherwise legal building upgrade.
- Watch construction finish while inside the city and while an institution screen
  is open. Return: the level, appearance, crew availability and short completion
  highlight must reflect the confirmed server snapshot.
- Check locked prerequisites, insufficient resources, full crews, cancel/refund,
  and a rejected or retrying request. Existing economy/receipt behavior must hold.
- Use training, research, recruiting, hospital, inventory, buffs and Agora from
  the city. Close/reopen them without losing queue, item or resource information.

## No field input leakage or state changes

Before entry, give a march a known gather/move order and note its destination,
commander, troop composition, cargo and AP. Repeatedly right-click buildings,
city ground, empty city areas, UI and transition frames. Press R/H/Space while
inside the city. None should send an unintended field order or move the kingdom
camera. Explicit march actions in existing army interfaces must remain usable.
Accepted field orders and city queues should continue on the server.

After exit, verify normal world selection, right-click orders, panning, minimap,
zoom and numbered-march shortcuts. Returning from an explicit map-focus action
in another screen should focus its requested target. Disconnect/reconnect and
sign into another profile; no old city overlay or zero culling mask should remain.
Load the same existing v0.29 save and compare buildings, levels, prerequisites,
queues, resources, premium Aether, AP, inventory and formations. No migration is
required for v0.30; protocol/save/economy mechanics are unchanged.

## Display, accessibility and performance evidence

Repeat the essential entry/selection/queue/exit checks at 1280×720, 1920×1080,
2560×1440, 3440×1440 and a supported 4:3 window. Test UI scales 0.85 / 1 / 1.15,
fullscreen/windowed and a resize while the city is active. Check text clipping,
context scrolling, all building targets, notification overlap and return controls.

Enable Reduced motion: entry/exit and rotation/zoom should settle immediately;
construction/selection/completion meaning must remain visible. Disable sound:
no city ambience or selection sound should play. Check keyboard navigation after
using controls and institution text fields.

Capture Unity Profiler samples for idle kingdom, entry, idle city, continuous
rotation, a building completion, an institution overlay and exit. Record actual
CPU/GPU frame time, GC allocations, render-texture memory and frame rate; compare
first entry with repeated entry. Verify targets are bounded and unchanged-size
frames do not repeatedly allocate textures. These are **pending measurements**,
not inferred performance results. Save a gameplay recording and Console errors
alongside the tested resolution, UI scale and reduced-motion setting.
