# Ordinary Forsaken and coherent troop/AP numerical foundation

<!-- parity
{
  "id": "forsaken-numerics",
  "description": "Ordinary Forsaken and coherent troop/AP numerical foundation",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "Public fan tables checked2026-11-14; live game build UNKNOWN; Fandom indexed copy reported four months old",
  "checked": "2026-11-14",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {
      "url": "https://gacha-data.com/rise-of-kingdoms/barbarians/",
      "checked": "2026-11-14",
      "classification": "VERIFIED"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Barbarians",
      "checked": "2026-11-14",
      "classification": "CONFLICTING"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Troop_Capacity",
      "checked": "2026-11-14",
      "classification": "VERIFIED"
    },
    {
      "url": "https://gacha-data.com/rise-of-kingdoms/troops/",
      "checked": "2026-11-14",
      "classification": "CONFLICTING"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Commanders/Experience",
      "checked": "2026-11-14",
      "classification": "CONFLICTING"
    },
    {
      "url": "https://prokingdoms.com/blog/mastering-barbarian-chaining-in-rise-of-kingdoms-the-ultimate-ap-efficiency-guide",
      "checked": "2026-11-14",
      "classification": "VERIFIED"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Troops/Infantry",
      "checked": "2026-11-14",
      "classification": "VERIFIED"
    },
    {
      "url": "https://riseofkingdoms.fandom.com/wiki/Troops/Cavalry",
      "checked": "2026-11-14",
      "classification": "CONFLICTING"
    }
  ],
  "numeric_references": [
    {
      "quantity": "Enemy power Lv1\u201325",
      "reference": "https://gacha-data.com/rise-of-kingdoms/barbarians/; server/balance-reference.json ordinary[].enemyPower",
      "classification": "VERIFIED"
    },
    {
      "quantity": "Recommended troops and tier Lv1\u201325",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Barbarians; ordinary[].recommendedTroops/recommendedTier",
      "classification": "VERIFIED"
    },
    {
      "quantity": "Early commander XP levels1\u201310",
      "reference": "https://gacha-data.com/rise-of-kingdoms/barbarians/ base100\u00d7level versus https://riseofkingdoms.fandom.com/wiki/Barbarians 106\u00d7level",
      "classification": "CONFLICTING",
      "treatment": "Use requested GachaData base100\u00d7level; six-percent bonus is only a hypothesis, not verified causation."
    },
    {
      "quantity": "Commander XP levels11\u201325 and ordinary AP50",
      "reference": "https://gacha-data.com/rise-of-kingdoms/barbarians/ and https://riseofkingdoms.fandom.com/wiki/Barbarians",
      "classification": "CORROBORATED"
    },
    {
      "quantity": "AP1500 cap and36-second point recovery",
      "reference": "https://prokingdoms.com/blog/mastering-barbarian-chaining-in-rise-of-kingdoms-the-ultimate-ap-efficiency-guide",
      "classification": "VERIFIED",
      "treatment": "Direct secondary community guide, not official evidence; earlier sources differ by age/modifiers. Adopted requested baseline."
    },
    {
      "quantity": "City Hall capacity and published commander capacity rows",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Troop_Capacity; balance-reference.json cityHallCapacity/commanderCapacity",
      "classification": "VERIFIED"
    },
    {
      "quantity": "Unpublished commander-capacity rows",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Troop_Capacity has gaps",
      "classification": "ESTIMATED",
      "treatment": "Linear interpolation between documented rows; five ToM ages map to CH1/6/11/16/25, an original adaptation."
    },
    {
      "quantity": "Troop power1/2/3/4/10",
      "reference": "https://gacha-data.com/rise-of-kingdoms/troops/ and https://riseofkingdoms.fandom.com/wiki/Troops/Infantry",
      "classification": "CORROBORATED"
    },
    {
      "quantity": "Non-conflicting common troop attack/defense/health and training seconds; separately listed conflicts/inferred costs excluded",
      "reference": "https://gacha-data.com/rise-of-kingdoms/troops/; balance-reference.json troops and troopEvidence",
      "classification": "VERIFIED"
    },
    {
      "quantity": "CavalryT3 attack/defense and duplicate mislabeled Spearman row",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Troops/Cavalry comparison163/158 versus detailed158/163; https://gacha-data.com/rise-of-kingdoms/troops/ duplicate T1 zero attack",
      "classification": "CONFLICTING",
      "treatment": "Detailed cavalry card selected with reduced confidence; reject mislabeled duplicate. Not exact verified parity."
    },
    {
      "quantity": "CavalryT2\u2013T4 food/wood cost split",
      "reference": "balance-reference.json troopEvidence; source fields incomplete",
      "classification": "ESTIMATED",
      "treatment": "T1 ratio extrapolation is explicitly provisional; do not present as verified costs."
    },
    {
      "quantity": "NPC counts11\u201315 and level25 lineup label",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Barbarians",
      "classification": "UNKNOWN",
      "treatment": "Missing rows use5/6 of recommendation as an explicit ToM approximation; level25 mislabeled22 stays uncertain."
    },
    {
      "quantity": "Advertised level-dependent resources, tome XP and speedup counts",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Barbarians; balance-reference.json ordinary[].advertised",
      "classification": "VERIFIED",
      "treatment": "Printed quantities only; alternatives are not simultaneous guarantees. Preserve the odd four-minute count at level25 with its uncertainty."
    },
    {
      "quantity": "Exact ordinary loot probabilities",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Barbarians; ordinary[].advertised",
      "classification": "UNKNOWN",
      "treatment": "Advertised quantities do not establish probabilities. ToM uses one25%-weighted resource branch and optional10% item pool, explicitly original."
    },
    {
      "quantity": "Rarity XP curve missing/conflicting rows and internal combat equation",
      "reference": "https://riseofkingdoms.fandom.com/wiki/Commanders/Experience; research/rok-pve-numerical-reference.md",
      "classification": "CONFLICTING",
      "treatment": "Record every fallback/anomaly and cumulative interpretation. Aggregate combat is ToM calibration, never an exact unpublished equation."
    }
  ],
  "numeric_fixtures": [
    {
      "path": "server/balance-reference.json",
      "checks": [
        "production numerical reference, AP, migration and real troop accounting"
      ]
    },
    {
      "path": "docs/benchmarks/forsaken-calibration.json",
      "checks": [
        "175 measured Forsaken battles, rewards, unlocks, admission and durable settlement",
        "recorded Forsaken numerical evidence matches production engine"
      ]
    }
  ],
  "deviations": [
    {
      "decision": "Five-age capacity mapping, real unit conversion50\u00d7 and preserved AP fraction15\u00d7",
      "reason": "Old40\u2013340 city units cannot support source120000 recommendations; preserve actual typed state coherently",
      "impact": "Storage, march limits, jobs, wounded, reports and resources require versioned compatibility",
      "authority": "User critical numerical addendum2026-11-14; plan recorded before implementation; published0f9e4b2"
    },
    {
      "decision": "Original aggregate combat, wounded/hospital behavior, mythic scaling and progression gaps remain disclosed approximations",
      "reason": "Internal equations and some rows are unpublished or conflicting",
      "impact": "Measured outcomes are ToM results, not proof of full RoK combat equivalence",
      "authority": "User permits explicitly calibrated approximations; existing decisions recorded in docs/tm-forsaken-balance-and-spawning.md"
    },
    {
      "decision": "Explicit original loot probabilities, rare identities, kingdom pacing and retained product choices",
      "reason": "Exact drop rates and pacing are not established; identities/currencies remain original",
      "impact": "No advertised gem becomes guaranteed Aether; no premium AP purchase or unbounded free chain",
      "authority": "Published implementation decision7225d88 under the earlier brief allowing disclosed ToM choices; not independently verified or specifically approved as exact RoK values"
    }
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "production numerical reference, AP, migration and real troop accounting",
    "175 measured Forsaken battles, rewards, unlocks, admission and durable settlement",
    "recorded Forsaken numerical evidence matches production engine"
  ],
  "covers": [
    "server/numerics.mjs",
    "server/numeric-migration.mjs",
    "server/balance-reference.json",
    "server/troops.mjs",
    "server/economy.mjs",
    "server/city.mjs",
    "server/progression.mjs",
    "server/power.mjs",
    "server/war.mjs",
    "server/world.mjs",
    "server/forsaken.mjs",
    "server/inventory.mjs",
    "server/marches.mjs",
    "server/discovery.mjs",
    "server/exploration.mjs",
    "client/Assets/ThronesOfMyth/Scripts/FirstSessionGuide.cs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient*.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldArtFactory.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldView.cs"
  ],
  "coverage_ids": [
    "PVE-NUMERIC",
    "PVE-FORSAKEN"
  ]
}
-->

## Feature and RoK equivalent

Stable feature `forsaken-numerics`: ordinary Barbarians1–25, troop/commander march capacity, troop attributes/training, AP and rewards. ToM keeps Forsaken mortals, its commanders/civilizations, currencies and original UI. Player flow: survey, inspect recommendations/AP, select a real march, attack, review actual results, use stored Chronicles, unlock the next level.

## Reference version and sources

Exact URLs, classifications and checked dates are in metadata. See [source review](../../rok-pve-numerical-reference.md) for access limitations. GachaData was live; direct Fandom access was blocked and public indexed text was read. This is not a direct current-build gameplay observation. Source labels distinguish direct fan-table support from independent corroboration.

## Verified mechanics and prerequisites

Source describes ordinary per-level progression, initially1–6 kingdom availability, primary/secondary XP and per-army loot. Source capacity adds city and primary commander capacity. ToM gate, tier research, commander ownership and real troop constraints still apply. Forts and special encounters are separate; their existence does not verify ordinary combat equations.

## Numeric reference

Reuse [the full25-row fixture](../../../server/balance-reference.json) and [documented provenance/conflicts](../../rok-pve-numerical-reference.md). Enemy power, recommended troops/tier, AP and XP are separate measurements. Direct source values do not imply that the derived NPC composition or damage equation is verified.

## Formulas and modifiers

Detailed expected formulas and old/new values are in [balance/migration decisions](../../../docs/tm-forsaken-balance-and-spawning.md). Source base XP100×level and AP50 are asserted. Actual troop power uses1/2/3/4/10. ToM aggregate attack is soldier attack×0.05 with existing commander/civilization/technology factors; target defense applies120/defense. Missing rows, city-age mapping, numeric conversion, hospital and loot choices retain explicit uncertainty/design status.

## Known uncertainties

Early XP discrepancy; cavalry comparison/card conflicts; missing NPC and commander-capacity rows; incomplete Advanced XP; source version uncertainty; hidden combat, casualty and exact drop equations. Roaming radius/spawn probability are not established and belong to the separate population record. No essential exact hidden equation was promised: the earlier user brief explicitly permits measured, disclosed approximations. Full numerical parity remains unproven.

## Current Thrones of Myth behavior

Published0f9e4b2 and7225d88 implement numeric profile1/schema27/PvE subversion1. Before those checkpoints, capacity40–340, AP100/60000ms/cost5 and tiny troop counts were incompatible with the reference. Current900 starting real troops, mapped march capacities,1500/36000ms/50 AP, per-soldier training and calibrated ordinary encounters are tested. Building/research power and several prototype rules remain original.

## Planned Thrones of Myth behavior

For this completed scope, retain checked fixture values, real unit conservation and once-only generation settlement. Any future adjustment must update this record or create its own feature record before edits. Next population/search and special encounters require separate source comparison, plan and expected tests; they are not certified by these175 battles.

## Differences and project decisions

Metadata and the linked balance document record each existing decision and authority. Five ages differ from25 City Hall levels; some cost/XP rows are inferred; damage0.05/defense120 are a ToM model; winning wounds remain zero; loot weights and item substitutions are original. Those are Partial parity, not exactness claims. The permanent policy does not retroactively approve these as source-verified.

## Systems affected

Typed armies/reserves/queues/hospital; capacity and formations; commanders/XP/UI; AP/inventory; NPC health/combat/reward reports; PvP/fort compatibility; client packaging; persistence, restart, rollback and fog privacy. These dependencies are covered as coupled systems, not an isolated displayed-power multiplier.

## Save migration

Schemas1–26 without a numeric marker validate under old rules before one-time50× mortal conversion. Preserve typed composition, health/AP fractions, banked XP, paid queue cost/time, resources/cargo and historical reports. Existing engagement restart semantics remain. Profile1 older PvE saves gain the recorded progress/admission migration. Real saves were not edited. See numeric migration assertions and compatibility document.

## Acceptance tests

Registered checks in metadata verify independent expected level tables, real training/promotion/capacity/AP/hospital conservation and migration.175 production-command/tick cases measure recommended, half,120%, stronger commander, higher/lower tier and technology variants. A fresh run must equal the recorded numerical fixture. Tests also cover per-march AP, restart/no-duplicate reward, first clears, privacy and failed-save rollback. These tests do not verify external source truth.

## Implementation status

IMPLEMENTED, Partial parity. At7225d88:392 server passes, five platform skips;27 publication checks;16757 portable C# assertions; Unity compilation exit0. Recorded recommended25/25 wins and half-count0/25 wins are ToM measurements. Native rendering and real remote players are not player-verified. This policy record was added later to index/classify existing evidence; it is not falsely dated as a new pre-implementation record.
