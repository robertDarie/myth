# Greek battlefield slice · 0.9

This is the next presentation pass toward a polished Greek army. It adds original
low-poly equipment meshes to the existing transform rigs, rather than claiming
that final sculpted/skinned characters and authored animation clips are complete.
The core systems audit is in [core-systems-audit.md](core-systems-audit.md).

## Changes

- Greek troops receive breastplates, skirt strips and greaves. Melee troops have
  helmet cheek guards and a custom convex bronze aspis with a boss and emblem.
- The Minotaur has reusable curved horn meshes, muzzle/shoulder details and an
  articulated axe arm. Meshes are shared within each art factory and disposed
  with it. Other civilization commanders retain their own culture selection.
- Marching blends in/out instead of instantly toggling leg poses. Gait follows
  displayed travel distance; preview walking uses a controlled demonstration pace.
  Turn rate is limited and formation slots ease behind the heading, with subtle
  individual yaw lag. These are presentation offsets, not server collision or
  pathfinding changes.
- Attacks have wind-up, strike and recovery phases. Arrows launch after wind-up
  and reach the stored attack position alongside a short impact ring. Casting
  takes precedence over the normal strike so weapon poses do not add excessively.
- Observed HP loss causes brief recoil and a renderer-local hit flash. Other
  instances sharing a material are not tinted. Net snapshot HP changes remain
  distinct from a per-hit combat log.
- A newly observed army recovery triggers a retreat message and a resting pose.
  A newly observed victory produces a brief commander salute. Defeated camps
  receive a gray tilted pose and a short defeat message; loading an already dead
  camp does not replay victory cues. There is no new permanent troop death rule.
- Selected routes are color-coded dashed arrows for attack, gather, return and
  move. Dash flow stops with reduced motion; route parts behind HUD panes are
  hidden. These depict the existing straight-line server order, not an obstacle-
  aware path that the server has not computed.
- Original synthesized step, strike, arrow, skill, retreat and victory cues are
  generated once at runtime. They are placeholder feedback, not recorded sound
  design. Playback is limited to on-screen events and rate-limited by cue type.
  Army sounds are enabled for the owning player; model previews do not emit them.
  A saved Battlefield sound effects slider can mute all cues. The built-in Unity
  audio module is added, and an AudioListener is added to the main camera only
  when the scene has none. Settings now scroll on shorter windows.

## Compatibility and review

Build version is 0.9.0. Server rules, protocol 6 and save schema 4 are unchanged.
Existing Windows saves and the generated scene are reusable. No third-party art,
rigging or audio packages are required.

The Linux workspace can check C# source syntax, packaging consistency and the
existing Node server regression suite. It has no Unity Editor, so Unity semantic
compilation, mesh winding/shading, audio playback, animation feel and Windows
performance remain native validation tasks.

Review a Greek Captain march with each troop class and a recruited Minotaur:

1. Move short/long distances, turn sharply, stop, gather and return. Inspect feet,
   spacing, formation yaw and idle settling at close and distant zoom.
2. Attack a low-level camp and a tougher camp. Inspect wind-up, arrow impact,
   recoil, shields/skills, victory, and actual server defeat/recovery.
3. Confirm that newly loading a saved army/camp does not replay old combat events.
4. Inspect every commander in the model preview after the Greek equipment change.
5. Toggle reduced motion and set sound to zero; restart to verify preferences.
6. Profile multiple visible marches before increasing proxy counts or asset detail.

Final skinned character models, authored animation clips, terrain navigation,
PvP, wounded troops, hospital queues and detailed battle reports remain open.
