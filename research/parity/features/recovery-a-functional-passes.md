# Recovery A — functional passes

<!-- parity
{
  "id": "RECOVERY-A-FUNCTIONAL-PASSES",
  "description": "Adjacent-zone pass topology, approach-side objective access and persistent original Divine Gate encounters; approved compatibility scope, not numeric parity",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build; secondary published pass semantics reviewed2026-11-17; owner-authorized original compatibility baseline",
  "checked": "2026-11-17",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Holy_Sites",
      "checked": "2026-11-17",
      "classification": "CORROBORATED"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Scouting",
      "checked": "2026-11-17",
      "classification": "CORROBORATED"
    },
    {
      "url": "https://rokhub.app/faq/kvk",
      "checked": "2026-11-17",
      "classification": "CORROBORATED"
    },
    {
      "url": "https://www.reddit.com/r/RiseofKingdoms/comments/gglv0r/a_few_questions_about_lvl_1_pass_mechanics/",
      "checked": "2026-11-17",
      "classification": "CORROBORATED"
    }
  ],
  "numeric_references": [
    {
      "quantity": "Exact pass defenders/opening timelines",
      "reference": "Unverified for current home-kingdom version; do not transplant KvK chapter timings",
      "classification": "UNKNOWN",
      "treatment": "Owner explicitly approved reusing existing original Divine Gate combat/opening rules for functional recovery; no numerical parity claim or new defender balancing"
    }
  ],
  "numeric_fixtures": [
    {
      "path": "research/parity/fixtures/recovery-a-functional-passes.json",
      "checks": [
        "original Divine Gate numerical compatibility baseline"
      ]
    }
  ],
  "deviations": [
    {
      "decision": "Reuse existing original Divine Gate combat and kingdom-opening rules for each original-map pass",
      "reason": "Exact current RoK tables unverified; independently implement usable functional infrastructure",
      "impact": "New passes use the unchanged original fortification encounter and gates milestone, not numerically verified RoK defenders or per-tier opening calendars",
      "authority": "Owner reply2026-11-17: Reuse existing rules; clearly mark numerical parity unverified"
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "functional adjacent passes, capture, revocation and save migration",
    "fresh legal two-pass expedition and outsider/scout separation",
    "original Divine Gate numerical compatibility baseline",
    "source-bound RecoveryA topology, legal expedition and actual Unity object evidence"
  ],
  "covers": [
    "server/world-map.mjs",
    "server/navigation.mjs",
    "server/world.mjs",
    "server/kingdom.mjs",
    "server/campaign.mjs",
    "server/marches.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldView.Environment.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldView.Territory.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Screens.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "server/forsaken-population.mjs",
    "client/Assets/ThronesOfMyth/Scripts/WorldView.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Warfare.cs"
  ],
  "coverage_ids": [
    "10-031"
  ]
}
-->

## Feature and RoK equivalent

Complete the original seven-zone graph with ten distinct adjacent-border pass objectives. Alliance-held open passes authorize ordinary military; scouts follow physical corridors independently. Approach-side capture must never require owning its target pass.

## Reference version and sources

URLs above reviewed2026-11-17. Fandom indexed excerpts (direct access limited), independent player observations and community guide agree on mountains/pass gates, alliance access, territory adjoining attacks and scout passage. This corroborates bounded behavior, not exact current version or numeric tables. Home-kingdom and KvK evidence remain distinct; no copied seasonal timings.

## Verified mechanics and prerequisites

Physical adjacent-zone crossings must map one-to-one to real sites. Ownership permits only that local crossing. Territory-adjacent alliance can attack from either accessible approach. Use existing production rally/fortification encounter, garrison and battle report rules. Never grant scout exemption via payload.

## Numeric reference

UNKNOWN exact RoK defender stats, opening hours, occupation timings and protection modes. User-authorized compatibility fixture will pin original local gate health450×numeric scale, existing regeneration/capture and kingdom milestone rules. Existing combat has fortification defense and optional player garrisons, not a fabricated neutral troop roster. All ten pass encounters share this disclosed local baseline; tiers are topological labels, not source-verified defender tiers.

## Formulas and modifiers

No new combat coefficient, cost, timer, unit or reward. Route edges require open corresponding site with matching alliance; compute access from the player home province through authorized edges. A stranded army cannot gain arbitrary travel from its stranded zone; controlled return may traverse physical corridors only to its saved home. Border endpoints must lie in the two declared adjacent zones; no diagonal/zero-width shortcuts.

## Known uncertainties

Full numerical parity, actual RoK neutral defender troop rosters, per-tier/calendar opening, semi-protected mode exceptions and full reference map dimensions remain unverified and out of this approved compatibility scope. Native interaction requires separate evidence; compile is insufficient.

## Current Thrones of Myth behavior

Seven rectangles and ten corridors reuse only two gates; two links have empty gate IDs. Hard-coded province-wide gates can demand ownership before approach, and a single distant gate grants unrelated mountain crossings. Schema27 has eleven sites; no append migration for the eight missing objectives.

## Planned Thrones of Myth behavior

Keep all seven original rectangles/cities and two Divine Gate IDs/positions. Give the remaining eight crossings unique mythological pass sites; persist canonical adjacency/opening metadata, ownership and fortification state. Derive reachable regions from home and graph, route to the near approach before attacking a border objective. Render mountains/borders/crossings from the same snapshot graph. New passes inherit original gate milestone; do not change existing global kingdom progression counts merely because more gates exist.

## Differences and project decisions

Owner explicitly approved temporary original Divine Gate combat/opening reuse on2026-11-17 after disclosure of missing exact values. No full numerical or map parity. This documented approval is feature-scoped, not a blanket research waiver. Existing original artwork/identity/currencies preserved.

## Systems affected

Map topology, routing, capture/rally/garrison targets, territory, kingdom opening, save loading, spawn suitability, scout physical travel, native map and objective UI. Source-bound old QA remains historical and must not be silently reused after source changes.

## Save migration

Append missing pass sites only for older saves; preserve all existing city/army/home/commander/alliance/site IDs, coordinates, ownership, cargo, queues and reports. Reject duplicate/unknown IDs and tampered adjacency; canonical map metadata comes from definitions. Preserve valid in-flight targets or safely stop/revalidate; never reroll cities. New schema migration must be idempotent and tested through production storage restart. Keep protocol additive where possible.

## Acceptance tests

Write red tests before production edits: one unique physical site per corridor; declared adjacent rectangle bounds; complete graph connectivity; starting content reachable; no army/scout privilege leak; both legacy Divine Gates accessible/capturable from approach; actual production capture then travel and outsider denial; two sequential passes require both; revocation/cargo/home recall; all command families; all border/corner/diagonal combinations; append/restart conservation; truthful native UI/build separation. Fixture preparation explicitly distinguished from actual production capture/ownership transitions. Full suite and complete publication plan required.

## Implementation status

Plan recorded before gameplay edits; bounded functional infrastructure now IMPLEMENTED, numerical parity unverified. Starting remote69c58ea6e55b7bfe0c0cba0c2a0ea096e32a6d81. Owner approval recorded before implementation.

## Approval and execution notes

Owner approval2026-11-17: “Reuse existing rules; clearly mark numerical parity unverified.” Neutral passes now use the existing production fortification/rally encounter (450×existing profile scale), not the old free occupation channel; no invented neutral troop roster. Original non-pass15-second occupation and existing attack/defense/garrison rules remain. Source schema28 appends eight passes and archives schema27 JSON. The population starting-zone predicate uses explicit category to preserve the original four starter areas and beginner distribution after gate metadata changes. Historical9dde979 QA remains source-bound to that historical commit; it is not reused as current pass acceptance.

Six initial topology/recall tests ran red0/6 against the starting source, then green6/6. Expanded adversarial suite19/19 includes20 actual production pass conquests across ten passes/two sides, real enemy recapture, cargo-safe recall and a two-start hosted migration/byte-exact schema27 archive. Separate default-profile fresh run uses56 commands, four real camp victories, original milestone, two production rallies and actual crossings; outsider military denied and scout completes. No direct progression grants. Actual Unity6000.3.0f1 scene validation found seven zone labels, ten crossing objects,447 mountain mesh renderers and ten correctly positioned original pass models; exit0. This is not native interaction proof. Complete publication plan and final server results recorded in the recovery report before publication.

Reference context warning: https://riseofkingdoms.fandom.com/wiki/Kingdom (indexed2026-11-17) describes a home-kingdom tier-one early free-passage interval ending24hours after Rising of Heroes. This is not the same mode/phase as the alliance-owned KvK1–3 guide. Applicability to the current version is UNKNOWN; retain the distinction. The owner explicitly requires controlled military crossings and authorized existing local milestone compatibility, so no unverified free-passage window is introduced.
