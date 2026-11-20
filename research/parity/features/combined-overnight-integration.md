# Combined overnight gameplay integration

<!-- parity
{
  "id": "COMBINED-OVERNIGHT-INTEGRATION",
  "description": "Sequential six-commit integration preserving B3 city authority, actual multiplayer, visibility and interaction correctness",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build; broad functionality supported, exact commander cast timing/search UI unresolved",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {
      "url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888",
      "checked": "2026-11-20",
      "classification": "VERIFIED"
    },
    {
      "url": "https://www.reddit.com/r/RiseofKingdoms/comments/w7k7wj/",
      "checked": "2026-11-20",
      "classification": "CONFLICTING"
    },
    {
      "url": "https://www.reddit.com/r/RiseofKingdoms/comments/ga7nax/",
      "checked": "2026-11-20",
      "classification": "CONFLICTING"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Scouting",
      "checked": "2026-11-20",
      "classification": "UNKNOWN"
    }
  ],
  "numeric_references": [
    {
      "quantity": "Existing scout stats,50AP/100XP per level/90second respawn/local drop chance/100member cap",
      "reference": "Existing Cursor fixtures and source-linked feature records; no new numerical tables imported",
      "classification": "UNKNOWN",
      "treatment": "Preserve existing local/versioned values; do not infer full parity from fixtures"
    },
    {
      "quantity": "Secondary active order and rage",
      "reference": "research/parity/features/commander-battle.md plus sources listed here",
      "classification": "CONFLICTING",
      "treatment": "One versus two turn timing differs; both say secondary follows primary. Cursor local alternating full bar is a disclosed mismatch, not implied by that timing disagreement. Preserve imported explicit local owner-decision provenance only; exact live behavior needs controlled observation before parity certification."
    }
  ],
  "numeric_fixtures": [
    {
      "path": "research/parity/fixtures/scouting-exploration.json",
      "checks": [
        "legal automatic exploration of every reachable fog cell"
      ]
    },
    {
      "path": "docs/qa/evidence/combined-integration/runtime-sources.json",
      "checks": [
        "combined current Unity and source-bound evidence"
      ]
    }
  ],
  "deviations": [
    {
      "decision": "Preserve reviewed Cursor local functionality and existing original combat coefficients, retaining all disclosed parity gaps",
      "reason": "Owner explicitly requests both streams in one game, without new unsupported balance or city activation",
      "impact": "Secondary full-bar alternation remains local/non-parity; no claim of live RoK cast timer. UI two-click preview is original presentation; server always authorizes actual commands.",
      "authority": "No regression to Codex B3 is acceptable. Owner integration mission: Integrate Cursor five gameplay-development checkpoints with Codex published Task7 B3 implementation; correct supported defects; keep unknown numeric requirements explicitly unresolved."
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "combined multiplayer and stale preview authority",
    "combined current Unity and source-bound evidence",
    "complete integrated server suite",
    "Task7 B3 concurrent production HTTP queues payments and save boundaries",
    "Task7 B2 integrated synthetic progression and legacy conservation"
  ],
  "covers": [
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.CityExperience.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Exploration.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Interface.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Kingdom.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.KingdomSearch.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.ReferenceCityQa.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Screens.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "server/campaign.mjs",
    "server/city-content.mjs",
    "server/exploration.mjs",
    "server/forsaken-population.mjs",
    "server/forsaken.mjs",
    "server/http.mjs",
    "server/marches.mjs",
    "server/progression.mjs",
    "server/qa-reference-world.mjs",
    "server/realms.mjs",
    "server/social.mjs",
    "server/strongholds.mjs",
    "server/war.mjs",
    "server/world.mjs"
  ],
  "coverage_ids": [
    "TM-020",
    "TM-027",
    "TM-029",
    "TM-031",
    "TM-057",
    "TM-064"
  ]
}
-->

## Feature and RoK equivalent

Scouting/fog, barbarian-like Forsaken search, primary/secondary skills, alliance invitations and visible kingdom search/route preview. Integrate six reviewed commits onto ab033864; plan recorded before changes in docs/qa/evidence/combined-integration/PLAN.md.

## Reference version and sources

Official AppStore reopened2026-11-20 supports broad explore/conquer/alliance functionality only. Community discussion supports secondary following primary but one/two-turn timing conflicts; neither disagreement proves a second full rage bar. Wiki direct fetch402 unavailable; no payment/access bypass. Existing per-feature evidence retains its original dates. No current live account measurement.

## Verified mechanics and prerequisites

Actual World commands/auth, scout physical routes, military gate routes and private search/invitation snapshots tested. Secondary passives/talent exclusion preserved. Imported alternating active order is local compatibility, never verified reference behavior.

## Numeric reference

Reuse Cursor fixtures and B1/B2/B3 records. No new speed,capacity,cost,reward,AP,timer,drop or battle coefficient. Complete early25-level birth data still blocked. All synthetic fixture capabilities remain separated from genuine gameplay.

## Formulas and modifiers

Existing formulas unchanged. Only local active scheduling is imported as disclosed Cursor behavior. Timers/payments for legacy and QA cities retain semantics. UI preview consumption and reservation checks restore authority; no gameplay multiplier added.

## Known uncertainties

Current RoK search gestures/ranking/radius, scout progression, active timing/rage mechanics, exact hidden combat/spawn/drop probabilities and full25-level city birth/economy remain unverified. No certification. New repairs require no substitute reference number.

## Current Thrones of Myth behavior

Codex B3 complete before integration; Cursor branch3b05027 has six ordered unpublished checkpoints. Overlap is client DTO/UI plus metadata. Defects reproduced: reference preview allowed forbidden movement; invitation recipient could not reject; legacy exact-equality test ignored new default cast fields. Preview repeat-click reuse and invitation reservation overflow also repaired within requested scope.

## Planned Thrones of Myth behavior

Sequential cherry-picks preserve both sets of fields/registries/checks. Private decline, invitation reservation, consumed preview/client busy guards, null army guard and QA preview denial. Existing command authorization remains mandatory after any stale preview. Tests write ignored work instead of changing dated evidence.

## Differences and project decisions

Owner requested reviewed integration and conservation, not balance activation. Preserve explicit imported compatibility decisions as provenance, disclose mismatch instead of calling them exact. Normal reference profile and real-city migration disabled. No other milestone expansion.

## Systems affected

See covered runtime paths and reviewed commit inventory. New authenticated GET/march-preview exists in local and hosted realms. Optional snapshot/save fields: private incoming/outgoing/pin; scout autoAssigned/stuck; army nextActive/lastSkillRole. No new external dependency or schema/protocol bump. Normal package remains safe legacy profile.

## Save migration

Missing skill-state fields default primary/empty; old alliance invites default empty; old scouts default manual. Paid jobs,resources,troops,commanders,alliances preserved. Historical comparison adds only declared defaults and separately checks corrected scout description; all other state and numeric quote fields remain strict. No real saves used.

## Acceptance tests

Per-checkpoint focused real World commands, combined multiplayer HTTP including three independent identities, stale preview rejection and capacity boundary; complete server suite and full required publication plan. Actual Unity compile/DTO/topology bound to all current C# scripts. Historical source-bound artifacts validated against preintegration immutable commit plus fresh current evidence. Native cases separately recorded. Synthetic fixtures explicitly labeled.

## Implementation status

Bounded combined integration implemented; test/build/native results in docs/qa/COMBINED_OVERNIGHT_INTEGRATION.md. No full RoK parity or normal25activation. Publication SHA and immutable package source recorded after successful checks.
