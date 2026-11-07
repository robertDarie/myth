# March assembly and presentation · 0.8

This milestone adds loading screens, typed troop selection, troop and commander
poses, and a live commander preview. It uses familiar kingdom-strategy interaction
patterns with original Thrones of Myth artwork and models.

## Assemble a march

Open an unlocked empty march slot on the right rail, select **Prepare march** on
your city, or use **Marches & reserves → Assemble a new march**. The city shortcut edits an idle home march when one is available, including your
founding march in the first age; an empty rail slot creates an additional march.
Choose an available recruited commander on the left. On the right, each mortal troop type
and your civilization's mythic unit has an exact-count entry, slider and Max
button. **Clear** and **All ready** affect the whole draft. Scroll to see all four
rows on shorter windows. The footer shows selected mortal/mythic counts and march
slots; unavailable actions explain their requirement.

Only selected units leave the city's reserve pool. A march starts at home and is
selected automatically after the next snapshot; choose its destination on the
world map. No extra march slot is created beyond the existing age unlocks.

For an existing march, open **Choose troops for selected march**. Its existing
units join the editable pool with city reserves. Confirmation replaces its exact
composition and returns unselected units to reserves. This requires the march
idle at home, recovered and fully healed. A founding march must retain at least
one mortal or mythic unit. Other marches can be returned entirely to reserves
through the existing disband action. Assignment remains unique per commander.
The backend checks all these rules again and rejects stale or invalid requests.

## Mortal troops

Training still uses one lane with up to three paid orders. Each order trains
five of its chosen type. Deployment can select any whole count, including one;
it is no longer restricted to groups of five.

| Type | Unit | Base HP | Base damage | Cost / 5 | Base seconds | Citadel |
| --- | --- | --- | --- | --- | --- | --- |
| Infantry | Oathguard | 5 | 0.75 | 50 food, 20 gold | 8 | 1 |
| Archers | Dawn Archers | 4 | 0.95 | 55 food, 25 gold | 10 | 1 |
| Cavalry | Dawn Riders | 5 | 0.85 | 70 food, 30 gold | 12 | 2 |

Barracks levels reduce the displayed training time. Capacity counts troops in
all marches, all typed reserves and pending training. Cancelling refunds that
order's actual cost. Recruitment for the five civilization-specific mythic units
continues through the Sanctuary of Beasts.

Mortal health and damage sum the chosen types, then receive existing civilization,
commander, research, relic and skill modifiers. A pure cavalry march receives
20% extra movement speed. Adding infantry, archers or a mythic escort removes that
mounted-only bonus. This is an initial troop balance: ranged standoff distances,
a counter triangle, troop tiers and siege engines are not implemented here.

## Loading screens

Startup asynchronously prepares the sanctuary, commander atlas and new
`Resources/Art/LoadingMarch.png` artwork. Kingdom entry then shows separate
connection, city restoration and map preparation stages. The progress bar marks
completed preparation stages, not a download percentage or a timed simulation.
Gameplay input stays blocked until the first world snapshot has been applied.
There is no forced wait solely to display the artwork.

Connection errors show **Retry connection** and **Back to entry**. Failed initial
snapshot requests continue retrying with a delay; retry can shorten that delay.
Returning to entry stops the initial polling coroutine and keeps the saved local
profile token for later resume. Existing in-world connection warnings remain in
the HUD after initial entry. The server remains the source of saved city state.

Loading artwork is original AI-generated key art, bundled with the game and
available offline. Kingdom entry retains Sanctuary Dawn; loading into the world
uses the new army-and-sanctuary scene. Tips describe actual implemented rules.
Reduced motion stops tip rotation and optional animated poses/effects.

## Troop and commander movement

`WorldArtFactory` now builds articulated hip and shoulder pivots. Infantry strike
with their weapons; archer arms draw and release, with a short reused arrow
visual on an observed attack. Mounted proxies have horses with separate hip
pivots and rider bounce. Mythic escorts have moving legs, and winged escorts have
wing motion. A march's composition determines its visible troop classes.

A distinctive commander model stands at the front. Character cues include bows,
cloaks, plumes, a seer's staff, Horus-inspired headwear, fur shoulders, Heracles'
club and Wukong's staff/tail. Idle breathing, walking, cloak movement and a raised
weapon cast pose give the leaders motion. The current shared primitive modeling
style remains a prototype, not a final rigged or motion-captured character set.

Normal strikes follow server `attackSequence`; skills follow `skillCasts`.
`skillKind` selects damage, healing or shield ring materials. Stored attack
coordinates keep the arrow aimed at its target even on a camp's killing blow.
Projectiles and poses are visual feedback, never extra hits or client damage.
Large server position jumps snap rather than animate a defeat retreat as a long
sprint. Formations use at most three mortal and three mythic proxies, plus their
leader. At distant zoom, one mortal proxy and the commander remain visible.

In **Commanders → Animation preview**, an isolated RenderTexture stage displays
the selected model with **Idle**, **March** and **Skill** preview controls. These
controls issue no server commands, spend no resources and show no combat result.
The painted portrait remains the default. Preview rendering is limited to 30 Hz
and its stage is disabled outside this view. Reduced motion applies to both the
world and preview; static skill indicators remain visible.

## Versions, saves and Windows packaging

Build version is **0.8.0**, protocol **6**, save schema **4**. Client, server health
endpoint and Windows launcher agree on protocol 6. The Windows builder includes
the new `troops.mjs` server module and artwork through Resources.

Schemas 1–3 migrate existing generic mortal troops, reserves and queued training
to infantry without changing quantities, prices, commanders or city progress.
Typed data in schema 4 is validated for whole non-negative counts and matching
aggregate totals. Invalid current-format data is rejected instead of repaired by
creating troops. The save store keeps an untouched `.schema3.bak` archive before
ordinary autosaves rotate the older save. Older builds cannot read schema 4.
Close the previous game/server, pull main and rebuild the Windows playtest.
A save reset or scene regeneration is not needed.

## Validation and native review

Automated checks cover typed training/cancellation, exact mixed deployment,
formation replacement, home/recovery rules, atomic rejections, reserve ownership,
reinforcement/disband conservation, class stats, schema migration, archival backup,
and Unity-style HTTP payloads, alongside the existing campaign and HTTP tests.
C# and PowerShell source receive syntax checks and the Windows server-module list
is checked against local imports. Native Unity compilation/rendering and Windows
playback cannot be run in this Linux workspace.

For the next native review:

1. Launch a rebuilt package, inspect loading stages and resume your existing city.
   In the Editor, stop the server before entering to inspect retry/back controls.
2. Train each type. At Citadel 2, try cavalry. Cancel one paid order and verify its
   refund and typed reserve counts.
3. Reform the founding march with a small exact selection. Unlock an additional
   age/commander and assemble a mixed secondary march. Check units left home.
4. Try changing a wounded or away formation; return and recover before confirming.
5. March, gather and fight. Compare infantry, archer, mounted and mythic motion,
   commander poses, arrows, skill colors and reduced motion.
6. Open every commander in the animation preview; try all three poses, then return
   to the painted portrait and close the screen. Inspect at 85% and 115% UI scale.

## Interaction references

The design adapts commander selection, troop sliders, formation summaries and a
clear dispatch confirmation into our existing map HUD. It does not reproduce
another game's artwork or make a pixel-identical interface. Reference reading:

- [RoK troop-selection discussion](https://www.reddit.com/r/RiseofKingdoms/comments/1gtm4lm/)
- [Call of Dragons legion guide](https://codwiki.net/wiki/Legion)
- [Call of Dragons official PC FAQ](https://callofdragons.playfun.vn/FAQ.html)
