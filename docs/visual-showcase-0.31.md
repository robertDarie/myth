# v0.31.0 — Starting-region and Captain combat showcase

Built on main `2e06bf5` (v0.30). **Implemented, but native visual acceptance is
pending.** This environment has no Unity Editor; neither this document nor the
passing tests establish rendered quality, animation/audio timing or 60 FPS.

## Implemented

A — World and city: original irregular loft meshes replace tree canopies,
trunks and border/worksite rocks; shared painted-grain textures give terrain and
architecture a common surface treatment. Terrain uses a tiled detail layer;
forest clusters increase from 85 to 125, and starter clearing exclusions allow
more vegetation while retaining city/worksite/road space. Existing province
colors, roads, relief, sacred landmarks, distance fog and three-state exploration
remain. Scenery remains cosmetic, without order-blocking colliders. All new
starter trees fit below the existing fog surface.

The city retains its five culture models, direct selection and v0.30 transition.
Chamfered civic terraces replace the circular platforms; paved boulevard edges,
roadside gardens, rectilinear crenellated walls and an open southern gate organize
the settlement. Vaulted citadel porticos, steps, capitals, academy/temple arches,
forge chimney and barracks equipment add architectural detail. Citadel level 2
adds roofed watchtowers and banners; level 3 adds an upper arch. Construction adds
material stacks and a hanging hoist to the existing queue-controlled scaffolds.
Existing guards, construction motion, locked-plot indicators, completion feedback
and reduced-motion behavior are retained. The city key light now casts shadows.

B — Troops and skill: existing original skinned rigs/clips remain the animation
foundation. Added local anticipation/lunge/recoil, commander rise and guarded
stance layer over formation smoothing, without changing world positions. Rallying
Cry replaces the Captain's generic skill ring/burst: gathering gold around the
leader, the existing weapon-raise clip, a timed outward shockwave, particle embers,
wards on up to four actual represented soldiers and a Fresnel shield. The subtle
aura and soldier wards follow **actual positive shield state**, not a guessed buff
timer. Shield exhaustion removes protective visuals. A reconnect with an already
active shield shows a quiet aura without replaying a cast.

The spectacle pool has eight reusable leases, at most 32 particles per lease,
one shared shader material and property blocks; excess armies retain the cheap
original shield status ring. Existing strategic formation LOD, attack feedback,
victory/retreat clips and audio throttles remain. Charge and release use two new
original synthesized audio cues. Reduced motion removes shockwave, embers and
oscillation, retaining a static confirmed-shield indicator and a single cast sound.
Other skills retain existing projectile/impact/heal presentation; this milestone
does not claim a complete effects library for every commander. Shared ring,
property-block, particle, timing and audio components provide the next effects'
foundation without adding unused skill mechanics.

C — Real opening encounter: the formation editor includes an optional Captain /
15 infantry / 5 archers patrol preset. It only selects available units, clears
mythic escorts and uses the existing configure/deploy command; it grants nothing.
A fresh player's one paid archer batch supplies the patrol. Against the real
Forsaken Scouts, this composition allows five rage-building hits and Rallying Cry
before victory under unchanged combat calculations. Results depend on real
conditions: an upgraded commander, another participant or a wounded army can
change the encounter; no skill or victory is guaranteed for arbitrary marches.

Optional advice now goes city → five archers → patrol → scout/fight → reports →
return → Citadel. It does not replace, complete or remove campaign gathering and
training objectives, grant resources, or impose a forced tutorial.

D — Shared UI and camera: compact navigation titles retain full screen titles,
actions, shortcuts and hover descriptions. Shared navigation text supports wrapping.
Marker width includes enough icon/text padding; minimap navigation says Chronicle.
Tooltips use fresh control hit tests and a screen-scoped dwell session instead of
retaining `GUI.tooltip`. Resource, march, building/status and disabled-action hints
participate. AP shows both next regeneration and full-refill estimates from server
values. Home [H] is visible on the world HUD; home and surveyed-location focus use
bounded tactical zoom. Existing viewport-footprint camera clamping is retained.

## Remembered camp attack rule

A player may order an approach/attack to a camp that is currently visible **or**
exists in that player's persisted camp discovery. An undiscovered ID remains
unavailable. A visibly defeated camp remains unavailable; a remembered camp is
approached even if its hidden live health changed. Hidden depletion cannot cancel
the march remotely. Once current vision reveals an unavailable camp, the march
stops; AP is charged only by the existing actual engagement logic. UI labels this
“March & attack” with last-seen information. Dynamic enemy armies remain hidden
without vision, and remembered health/rewards/ownership are not refreshed remotely.
This does not change PvP targeting or resource gathering rules.

## Compatibility and limits

Protocol 16 and save schema 15 are unchanged. No currency, reward, AP cost,
commander ownership, troop transfer, combat damage, movement speed or migration
rule was changed. Existing saves need no new migration. Restart behavior continues
to pause accepted march orders under the established server policy.

This is one representative showcase, not a completed production asset replacement
for every institution, camp and unit. Some existing modular geometry remains;
other commanders retain their current effects. Native readability, sorting, shader
compilation, particle appearance, shadows and performance must still be reviewed.
The 60 FPS target has **not** been measured.

## Verification

- Full Node suite: **257 passed, 0 failed**, including the legal new-player mixed
  patrol/scout/remembered attack/skill/victory/report/home/save journey and hidden
  camp change / unknown-ID / no-AP-on-empty-approach tests.
- Portable .NET production-source contracts: **617 passed**. Includes 335 showcase
  timing, reduced-motion, tooltip scope and compact-title assertions, plus existing
  gameplay presentation, exploration and city contracts.
- Source/import hygiene: **68 C# and 3 PowerShell files, 0 issues**. This is syntax
  and asset-reference hygiene, not Unity compilation.
- Both original asset generators compile and reproduce their committed textures
  and audio. Native Unity shader/import/render, animation, input, audio, framing,
  fog appearance and FPS checks: **PENDING**.

See [asset provenance](art/showcase-provenance-0.31.md) and
[exact rebuild and native showcase checks](playtest-showcase-0.31.md).
