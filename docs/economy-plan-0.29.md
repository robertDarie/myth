# v0.29 proposed economy — design and migration contract

**Implemented in v0.29.0:** see [release rules and migration](economy-release-0.29.md). This document records the approved design foundation.

**Original design proposal:** v0.28 intentionally keeps gold recruitment, Aether production,
existing market exchanges and current PvE access. The changes below must ship as
one versioned model, with revised UI/content/tests, rather than isolated renames.
No premium entitlement, paid item or energy balance is created by this document.

## Consistent resource model

| Resource | Source | Intended use | Transferable? |
|---|---|---|---|
| Food / Wood / Stone / Gold | Production, gathering delivery, explicit rewards | City, research, troop training, healing, ordinary crafting | Through alliance trade |
| Mana | Gatherable arcane deposits, wells, gameplay rewards | Mythic training, magical research and ordinary mythic crafting | Through alliance trade |
| Premium Aether | Explicit premium grants and later verified store purchases | Optional premium offers and carefully scoped convenience | No |
| Sigils | Explicit progression/event rewards or defined offers | Commander summons at Temple of Echoes | No |
| Action Points (AP) | Time regeneration to a cap, explicit stored consumables | Starting eligible PvE encounters | No |

Gold remains a real ordinary strategic resource; it must not buy any arbitrary
commander through `commander` or `unlock-commander`. Commanders come from existing
starter/tutorial guarantees, explicitly authored earned rewards, or Temple draws.
Assignment only accepts already-owned commanders. Existing recruitment is removed
from every server entry point and UI, not merely hidden. Shards/stars/skills stay
separate; ordinary mentoring and upgrade costs require a tuning audit, not an
unannounced reset. Draw probabilities/pity remain disclosed, persistent and tested.

## Migration: legacy Aether is earned Mana, not premium credit

All Aether in current saves has gameplay provenance, not verified purchase
provenance. Migrate each player's old `aether` balance to `mana`; start the new
premium balance at zero. Apply the same conversion to held march cargo, cargo
source records, node types, wells, costs, queued job refund records, inventory
resource packs and unclaimed gameplay reward definitions. Historical report
amounts remain an immutable versioned **legacy Aether (now Mana)** record; do not
reinterpret an old report as a spendable premium entitlement. Archive old draw
records unchanged. If future purchase provenance exists, require a receipt-backed
entitlement migration; never guess from a balance.

Existing paid construction/training/research/healing jobs keep their remaining
work and paid entitlement. A canceled old job refunds the same economic value in
ordinary resources/Mana. Already recruited commanders, shards, relics, pity,
formation assignments, earned item stacks and claimed reward IDs are retained.
No retroactive commander charges or refunds. Starter and existing players receive
AP initialized to the configured cap exactly once, recorded by schema version;
reconnecting does not refill it. No retrospective charges for completed combat.

New save schema and protocol revisions are required, with old JSON archives and
SQLite backups. Migration must be deterministic/idempotent and reconcile every
resource container. Refuse unknown schema/purchase provenance rather than issuing
premium credit or silently discarding value. Add fixture saves containing active
cargo, returns, all paid queue lanes, old item packs and unclaimed rewards.

## Alliance resource trading replaces fixed self-exchanges

Use the existing Market identity and alliance membership; replace authored
self-exchange recipes with deliveries between two distinct alliance members.
Only ordinary resources and Mana may be sent. Sender pays the resource amount
plus a visible per-resource transport tax (sink); receiver gets the exact stated
amount. Initial implementation should be immediate server settlement with a
visible delivery report, not a cosmetic caravan implying interceptable transport.
A real convoy/interception mechanic requires its own later design.

Validate membership and permissions at commit time, never allow self-trade,
negative/fractional/overflow amounts or transfers of premium currencies/items.
Authenticate the sender; resolve recipient server-side. Add per-day configurable
limits and an auditable, bounded private transfer ledger. Atomic sender debit,
receiver credit, tax and both reports share the existing database transaction and
idempotency receipt. Retry after reconnect/save failure must not repeat transfers.
Keep resource ratios meaningful by removing the former self-conversion paths.
Before shipping, tune taxes/limits against actual kingdom production and demand.

## Inventory and stored rewards

Extend the existing inventory and item definitions; do not create a second bag.
Add typed ordinary-resource/Mana packs, AP consumables, summon items and compatible
speedups. Stored packs are not treasury resources and cannot fund costs until
explicitly used. Define whether a reward grants an item or a balance in its
versioned reward definition, never both. Use atomically consumes a stack and
credits its exact result; overflow rejects without burning items. Reward event
IDs, receipts and existing claim ledgers prevent replay. Reports describe what
was granted but do not independently grant or reclaim it. Historical rewards
remain claimed; expand future rewards without retroactive duplicate payouts.

## AP rules and encounter boundaries

Charge AP once on an accepted eligible PvE engagement, not for marching,
reconnecting, a rejected target, gathering, scouting or PvP. Define the combat
instance ID and participation entitlement before enabling charges. A camp attack
charges on first actual engagement with that camp generation; stop/rejoin and
multiple own marches cannot evade or repeat the charge. No refund after an actual
combat round. A pre-engagement invalidation incurs no charge. Stronghold rallies
charge each eligible participant on actual siege entry, not assembly; insufficient
AP excludes that contributor safely without charging anyone twice. Do not charge
once per attack animation/tick. AP reservations for marching are unnecessary in
this initial model; UI must warn that another activity can spend AP before arrival.

Store integer AP, authoritative last-regeneration timestamp and remainder. Regen
uses monotonic server wall-clock reconciliation, caps at maximum, and does not
accumulate hidden over-cap energy. Stored AP items may exceed the cap only if that
policy is explicitly adopted and tested; default proposal rejects overflow.
Costs, regen period/cap and consumable values belong in versioned content tables;
set them from a measured 10–15 minute onboarding and daily pacing test.

## Execution dependencies and acceptance gates

1. Audit **all** currency/recruitment/market/reward entry points and content;
   freeze the model, schema, definitions and disclosed draw rules.
2. Implement migration + container conservation tests before currency consumers.
3. Update resource DTOs, item labels, treasury/costs, cargo, reports, building data,
   summon/commander screens and old client rejection together.
4. Implement alliance trading with transactional rollback/idempotency tests.
5. Add AP regeneration/instance entitlement tests and update onboarding rewards.
6. Re-run legal fresh-player and migrated-player journeys through city progression,
   resource delivery, guaranteed commanders, real PvE and alliance trade.

Acceptance: no ordinary resource becomes premium credit; all legacy paid value
reconciles; no lost inventory or commanders; no duplicate transfers/claims/charges;
PvP/gathering/scouting remain energy-free; concurrent AP/trade requests serialize;
restart/downtime and clock rollback cannot mint balances. Price tuning and store
billing are separate decisions; verified billing is not part of this proposal.
