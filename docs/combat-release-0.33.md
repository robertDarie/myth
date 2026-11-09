# v0.33.0 — Combat and commander presentation

Based on v0.32 `7d26252`. The existing Rallying Cry pool is generalized to
`CommanderSkillVfx` (retaining its Unity asset GUID), rather than adding a second
parallel effect system. All eleven existing commanders have style profiles from
**observed server skill kind**. Captain keeps the gold charge/shockwave/protection;
Warden uses stone-green protection; Mulan red banner wards. Rune Seer uses rising
teal renewal rings/runes, Horus gold restoration. Scout and Atalanta have green
and gold arcing projectile trails. Tomoe has violet crescent cuts, Sigurd orange
strikes, Heracles gold impacts and Wukong a green-gold staff sigil. Existing
commander animations provide anticipation and weapon movement.

Profiles compose shared arcs, paths, expanding rings, protective shells, particles,
sigils and envelopes. The components support physical, shield, heal, projectile,
area, charge-trail and buff/debuff shapes for future **real** events; no new dash,
AoE hit, debuff, critical hit or gameplay buff was invented. Current damage skills
remain single-target where the server says so. Protection persists only with real
positive shield state. A healed-at-full-health cast may animate, but no invented
healing number appears. Cast replay guards remain unchanged.

The single eight-lease pool caps particles at 32 each and keeps the existing
cheap status-ring fallback when saturated. Strategic zoom suppresses fine wards
and particles and softens shield opacity. Effects-off releases leases; reduced
motion retains static real protection and cast labels/sound without moving trails.
No effect expands picking bounds. Endpoints stay attached to their confirmed cast,
not a later target. Commander changes release an old presentation lease.

Troops now have a shared anticipation → strike → recovery envelope, actual shield
stances and higher-priority hit reactions. Existing walk/turn/formation, victory,
retreat and return clips remain. Bounded impact flecks use one original shared
shard mesh instead of cubes. Health bars show actual HP plus a short receding loss
trace; repeated snapshots do not erase it, healing resets it and remembered objects
clear it. Gold shield strips show actual shield fraction. A deployed own march
confirmed recovering at home emits a retreat cue at the old position and a journal
message, then disappears normally. Reconnect gaps suppress this cue.

Three original synthesized mono cues (RenewalChime, HuntressFlight,
CrescentImpact) come from `tools/build_skill_audio.py`, seed 33033, no recordings
or external assets. Existing global/per-cue audio limits apply. Native sound timing
and quality remain unverified.

## Verification and compatibility

- Full server/save/migration suite: 257 passed.
- Production C# contracts: 16,114 passed, including 3,066 new profile, authority,
  timing, trajectory and health-trace assertions.
- Source/import hygiene: 72 C# / 3 PowerShell, zero issues. New audio generates.
- Protocol 16, save schema 15, damage/rewards/AP, acquisition and economy unchanged.
- **Native Unity compilation, effects appearance, animation/audio synchronization,
  input and FPS are pending**, no Unity Editor available. No visual success claim.

For Captain use the v0.31 real Scout patrol journey. For other commanders, use an
account that legitimately owns them, assign an available healthy home formation,
then fight an available camp with enough health for five rage-building hits. A
smaller 10 infantry / 5 archers patrol may suit a level-1 camp; inspect real health
and AP and do not guarantee survival or a cast for arbitrary upgraded rosters.
Do not use gold/debug recruitment. Record Rune Seer healing and Scout/Atalanta
projectiles or Tomoe's crescent if owned. The commander portrait buttons remain
isolated **pose previews**, not proof of a real ability activation.
