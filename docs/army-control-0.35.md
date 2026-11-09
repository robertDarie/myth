# v0.35.0 — Army control and combat feedback

Based on v0.34 `3dfa8ed`. Existing authority, gate routing, gathering, damage,
AP costs, protocol 16 and save schema 15 are retained.

Confirmed gaps addressed:
- Selected deployed march has a persistent Stop/Recall strip and route-based,
  explicitly approximate arrival time. Gathering shows actual cargo; combat,
  post-restart pause, missing AP and blocked routes have distinct messages.
- Display paths stop at the actual engagement radius instead of drawing through
  camp/resource centers. Authoritative waypoint arrays are never modified.
- Live-observed unavailable camp interrupts with `Target unavailable`; hidden
  changes still cannot cancel remote approaches or charge AP before engagement.
- Home arrival produces a cue and slot-release message when the server actually
  returns an owned formation home. Defeat/recovery and reconnect suppression stay.
- Explicit march IDs survive client command enqueueing. A definitive HTTP 409
  rejection no longer traps the UI in permanent retry; transient/unknown outcomes
  remain retained for safe confirmation. No automatic reissue with a new key.
- Ordinary ranged attacks use an original shared arrow mesh, at most three
  representative arrows per volley, tied to existing confirmed attack events.
  This is presentation, not three independent damage rolls. Existing distinct
  commander effects, reduced motion and pooled limits are preserved.

Verification: **265 server tests passed**, including independent simultaneous
marches, interruption/invalid targets, cargo conservation, return/docking and
save/restart; prior real PvE victory/defeat/skill, privacy, economy and receipt
suites remain. **16,337 portable C# assertions passed**, including ETA, stopping
radius, route immutability, rejection classification and original arrow topology.
Source hygiene: **80 C# / 3 PowerShell, zero issues**. No Unity Editor installed;
native rendering, arrow/skill timing, input, camera picking and FPS remain pending.

Native acceptance: operate two owned marches independently; change a movement
order, interrupt gathering then deliver partial cargo, attack a remembered camp,
observe a legal signature cast/victory, recall, and check home slot release. Repeat
with a real defeat, depleted target, locked gate, reconnect and server restart.
Follow the existing Linux build procedure; no native result is asserted here.
