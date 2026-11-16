# Task 4 — reproducible open findings

Tested `f5c0cdf75af286c33a9c116f46139ee40c8fbce1`, 2026-11-16. Overall **NOT READY — BLOCKERS REMAIN**. No gameplay defects fixed in this QA publication. Severity and release blocking are separate: a MAJOR design failure may block this alpha milestone without being a token-security exploit.

## QA-001 — MAJOR / release blocking: unrestricted military frontier

Repro: `node scripts/parity-audit-baseline.mjs work/task4/defect-probes`. The disclosed disposable fixture places an unaffiliated starting army/home at (128,30), Dawn Reach, then issues production `{type:'move',x:128,z:128}`. No pass ownership. Expected: military zone authority denies departure across a locked frontier. Actual: accepted; route includes (128,79)→(128,81), arrives after 98 × 0.25-second ticks. Both dawn-outer and ashen-outer ungated corridor identifiers are reported. [Diagnostic evidence](evidence/task4/diagnostics.json).

Cause scope: navigation/world-map topology contains ungated cross-province corridors; legacy physical gate tests do not establish universal province authorization. Restore, recall, gather, scout and alliance ownership dependencies require coherent authoritative-zone recovery. **Deferred to Critical Recovery A**, no topology redesign in QA.

## QA-002 — MAJOR / release blocking: scouts denied by military passes

Same command above; prepared scout start (20,20), production scout-send to (50,20), with no alliance gate access. Expected requested design: scouts traverse physical corridors independently of military ownership. Actual: “Scouts need alliance access through the corresponding Divine Gate.” The failing behavior is recorded, not counted as a successful scouting feature. Exact RoK exceptions remain subject to independent reference review; no speculative alternate scout formula implemented. Deferred to pass/scout recovery.

## QA-003 — MAJOR / release blocking: secondary offensive passive inert

Same probe: prepared owned/star-qualified Wukong secondary, actual pair command; compare damage with offensive passive rank 1 and 2. Expected: the requested supported secondary passive contributes its documented effect. Actual damage is 3156.048 in both cases. Fixture prepares ranks rather than purchasing organically. No claim every commander skill was tested or that an external hidden formula is exact. Current primary-oriented stat/skill integration needs researched secondary behavior. Deferred to separate commander recovery; do not alter balance in Task 4.

## QA-004 — BALANCE / MAJOR / release blocking: blanket secondary-level scaling

Same probe: keep skill ranks fixed, change prepared secondary level 1→60. Actual damage 3156.048→4999.68, ratio 1.5841584 between those two paired states. Production applies the same level-dependent factor to damage and maximum health: 1.01 at level 1 and 1.60 at level 60 relative to no companion. **Not +60% relative to level 1.** Requested behavior must derive supported secondary skills, not unconditional level power. Formula correction and old-save implications require explicit researched implementation; deferred.

## QA-005 — MAJOR: minimap fog grid source mismatch

Repro: compare `DrawKingdomMinimap` in `client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs:366` with production FOG_WIDTH=64, on the 256×256 world. The overlay still loops over 20×20 cells at line 378. Run `rg -n '20|fog|explored' client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs`; source evidence, not a certified pixel-to-cell native test. World minimap rendered in Windows screenshot; full-map clicks, exact fog cells and pan/zoom relation NOT TESTED. No full 4,096-cell organic exploration claim. Requires a focused fix/retest; not silently marked complete from persistence of injected fog.

## QA-006 — MINOR: compact native labels abbreviated

Repro: launch current Windows client 1280×720, enter fresh city/world. Player name, daily tab and tutorial phrases are visibly ellipsized. Expected important next actions readable; actual full text not visible in those labels. Main upgrade/train controls remained reachable. See first-session screenshots. Other resolutions NOT TESTED because further UI control was interrupted. No aesthetic redesign attempted.

## QA-007 — UNKNOWN: reported Windows wheel zoom failure

Independent report records a Windows player complaint; new build was launched but controlled wheel test hit the tool's user-input guard. A later inspected view differed in scale/selection, but input ownership was uncontrolled, so it does **not** resolve the complaint or prove a regression. Expected: repeatable zoom over terrain, UI scroll capture, home/focus/minimap behavior across resolutions. Actual controlled result **NOT TESTED**. Requires exclusive native input for a conclusive repro; no source-only dismissal using earlier Linux behavior.

## Numerical and feature gaps retained from Task 3

- Local Citadel five levels vs referenced 25; local research/catalog is smaller. Local completion is not reference equivalence.
- Level-60 local talent capacity 12 vs 74 corroborated in Task 3; complete level award schedule remains unverified.
- Three local mortal classes; siege reference class absent. Maximum-state troop/commander tests do not establish acquisition pacing.
- AP source baselines conflict; unpublished combat/drop formulas remain estimated/unknown. Do not change them to guessed numbers.
- Full special PvE, season/KvK and alliance-war parity is not certified. Existing frameworks are not full implementations of reference systems.

These are design/numerical research work, not authorized QA rebalancing. Source URLs, dates and classification remain in the [published Task 3 audit](../../research/parity/audits/full-rok-audit/FULL_PARITY_AUDIT.md).

## Unknown acceptance, not falsely filed as confirmed defects

Native account recovery, second resolution, FPS/audio, native training completion/combat/rallies, full legal fog exploration, overnight stability and real remote multiplayer remain NOT TESTED. No reproducible new save corruption, cross-player token takeover, double training debit or duplicated transfer was found in the bounded tests; that is not an exhaustive security certification. The complete server suite's five platform skips remain visible. Next milestone is recovery A; no later milestone started.
