# Military roster orders

<!-- parity
{
  "id": "CURSOR-PHASE4-TROOPS",
  "description": "Apply one training order once and keep siege out of normal cities",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live troop-stat capture on 2026-11-20.",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"},
    {"url": "https://gacha-data.com/rise-of-kingdoms/troops/", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "Fifteen prototype troop costs, health, damage, speed and training durations", "reference": "Existing TROOP_TYPES in server/troops.mjs and research/parity/fixtures/prototype-troops.json.", "classification": "UNKNOWN", "treatment": "Unchanged. A repeated training request no longer opens a second batch. Siege has no authored stats."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/prototype-troops.json", "checks": ["existing troop costs and stats stay unchanged"]}
  ],
  "deviations": [
    {"decision": "A successful train or promotion stores its request id, and the same id does not spend or queue again. Siege is named and refused.", "reason": "A second delivery of the same training order could pay for another batch. Siege had no verified cost, stat, load, speed, power or facility row.", "impact": "Normal cities still train infantry, archers and cavalry at tiers I through V on the existing table. Siege cannot be trained. A retry of a stored order does not move resources or soldiers again.", "authority": "Phase 4 task 8A authorizes one training or promotion order per request id and a closed siege class while existing troop costs, stats, batch sizes and the shared Hall of Spears stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "a repeated training request does not open a second batch",
    "existing troop costs and stats stay unchanged"
  ],
  "covers": [
    "server/troops.mjs",
    "server/world.mjs",
    "server/city.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs",
    "client/Assets/ThronesOfMyth/Scripts/WorldModels.cs"
  ],
  "coverage_ids": ["TM-039"]
}
-->

## Feature and RoK equivalent

Rise of Kingdoms trains infantry, archers, cavalry and siege, each through five tiers, from separate facilities with their own queues. The live cost, time, health, attack, defense, speed, load and power tables were not captured.

## Reference version and sources

The App Store listing checked on 2026-11-17 names the game. The troop page checked on 2026-11-17 does not by itself certify a version-bound stat row. This checkpoint did not open a live client.

## Verified mechanics and prerequisites

Normal cities already train and promote three classes through five tiers from the Hall of Spears, keep typed reserves, marches, wounds and treatment, and refund a cancelled order once. Tier II and above still require the Citadel, the Hall and the matching Athenaeum research. Those gates were not loosened.

## Numeric reference

The fifteen existing health, damage, speed, duration and resource costs stay on the prototype curve. Batch sizes stay 5, 5, 10, 20 and 40. No siege number was added.

## Formulas and modifiers

A non-empty training request id is stored only after the order is accepted, up to 4096 ids. The same id and the same action do not spend or queue again, including after a restart. A different action on that id is refused. A full ledger refuses a new id. Orders without an id still apply once per accepted command. The census is reserves plus deployed marches plus queued train and promotion amounts plus wounded plus troops in treatment.

## Known uncertainties

Live Rise of Kingdoms training costs, times, batch sizes, separate facility levels, siege stats, load, power, and the split among wounded, severely wounded and dead troops are unknown. The local retreat still moves a prototype share into the hospital and leaves the rest with the commander. That share was not retuned.

## Current Thrones of Myth behavior

Before this correction, sending the same train or promotion command again could pay for a second batch whenever the queue and resources allowed. The training screen did not say that siege was closed.

## Planned Thrones of Myth behavior

Implemented. The training buttons send a request id. The server roster tells the screen that three classes and five tiers share the Hall of Spears, and that siege training is closed.

## Differences and project decisions

Separate class buildings and a 25-level military facility were not added. Those depend on the City Hall reference profile, which this task does not edit. A synthetic siege stat block was not created.

## Systems affected

Training and promotion commands, the city roster snapshot, and the training screen. Combat formulas, hospital rates and the experimental city engine were not edited.

## Save migration

No schema change. A city without a training receipt list still loads. New successful orders append ids on that city. Existing troop counts and pending jobs stay.

## Acceptance tests

`node --test server/military-roster.test.mjs` covers a repeated order, a closed siege id, an unaffordable order, three queued classes, one cancellation refund, and a locked promotion that does not spend. The registered checks are "a repeated training request does not open a second batch" and "existing troop costs and stats stay unchanged".

## Implementation status

IMPLEMENTED. Partial parity. Native training clicks were not run. The Windows player was not rebuilt.
