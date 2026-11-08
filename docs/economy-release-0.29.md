# v0.29.0 — Economy redesign

This implements the approved [economy model](economy-plan-0.29.md), including timed
combat consumables. Client/server protocol **16**, world schema **15**, existing
SQLite container schema **2**. No billing or real-money purchase integration.

## Playable rules

| System | Implemented behavior |
|---|---|
| Ordinary resources | Food, Wood, Stone, Gold and **Mana**. Production, deposits, cargo, crafting, research and ordinary rewards use these. |
| Premium Aether | Separate balance, initially zero. Never produced, gathered, transferred or created by opening legacy packs. |
| Free premium earnings | Chapters I and III each grant 5 Aether once. Daily 60/100-point chests grant 2/3 respectively: at most 5 per UTC day from these chests. Existing claim ledgers enforce limits. |
| Premium use | Optional 10 Aether → one Sigil at the built Temple. Existing free offerings, earned Sigils, pity and disclosed summon odds remain. Gold/Mana Sigil purchases are closed. |
| Commanders | Owned commanders can be assigned; ordinary gold cannot recruit any commander. Summons, matching shards and guaranteed progression are the acquisition paths. Ten matching shards recruit an unowned commander. Chapter I grants a stored ten-shard Warden pack; Atalanta's existing progression reward remains. Gold costs for training/mentoring/ascension are ordinary progression costs, not recruitment. |
| AP | Capacity 100; regenerate one per real minute. Camp entry costs 5 per city per camp generation, on first actual hit. Stop/rejoin, another own march or reconnect cannot charge the same generation again. Respawn creates a new generation. |
| Stronghold AP | 10 per participating city at actual siege entry, not assembly. Multiple own marches share that charge. Underfunded contributors are excluded; if fewer than two affordable marches remain, nobody is charged. Existing minimum-party/combat rules remain. |
| AP-free actions | PvP, scouting, gathering, movement, construction and research. Marching toward a PvE target does not reserve or spend AP. Rejected/non-engaged attacks do not charge. AP may be spent elsewhere before arrival. |
| Alliance trade | Immediate, transactional delivery between distinct current alliance members. Sender needs an Agora; receiver does not. Receiver gets the amount, sender pays amount plus **10% tax rounded up**. No cosmetic or interceptable convoy is implied. |
| Trade limit | Send up to 3,000 ordinary resources/Mana per UTC day. Taxes are additional. Premium Aether, Sigils and inventory items cannot be sent. No self-exchange recipes remain. |

The AP choice supports 20 fresh camp generations from a full bar; the existing
three-camp opening objective costs 15, leaving 85 before regeneration. A 20-AP tonic
is earnable from the 60-point daily chest without requiring a battle (gather,
training and scouting can earn those points). Thus the opening progression does
not require premium spending or waiting for AP. These are prototype-specific
values, not imported reference-game numbers. All numeric rules live in
`server/economy.mjs` / existing content definitions for future measured tuning.

A legal automated city-upgrade → training → wood/food delivery → Chapter I →
shard recruitment → second formation deployment → real camp → return journey
completed in **60.7 simulated server seconds**, spending 5 AP and earning 5 Aether.
This reflects the prototype's accelerated city timers and scripted immediate
choices; it is **not** a measured human session, native performance result or
claim that the final game's pacing is finished.

## Existing inventory, expanded

The same saved bag now categorizes resources, speedups, summons, energy and combat
buffs. Existing packs/hourglasses retain their counts and value. Added items:

- Mana Phial (renamed ordinary legacy pack), Warden Echo Shards (10), and a sealed
  Oracle Sigil that adds one Sigil rather than rolling a commander by itself.
- Pilgrim's Tonic: restore 20 AP. Reject the entire use if it would exceed 100;
  no overflow is banked and no item is burned on rejection.
- Research, training and healing minute hourglasses, alongside construction and
  universal items. They accelerate only a real owned eligible active job; only
  the first training batch runs. A job already finishing cannot consume another.
- Oath of Valor: +10% server-calculated army damage for **600 real seconds**.
- Oath of Shelter: multiply received damage after existing mitigation by 0.9 for
  **600 real seconds**. Does not increase maximum health or create/heal troops.

Both oaths apply to the owner's armies in PvE and PvP, including actual damage
and commander attacks that use the existing army stats. Different oath types can
coexist. The same type cannot stack, refresh or extend while active. Quantity
must be one. Expiration uses authoritative monotonic UTC time and includes server
downtime. Reconnecting never restarts a duration. These are functional items,
not unused placeholder buffs.

New unclaimed founding supplies include one sealed Sigil, two tonics and one of
each oath. Previously claimed supplies are not reopened or backfilled. The daily
100-point chest grants one sealed Sigil and one of each oath; the 60-point chest
grants one tonic. The 20-point chest grants one training minute; the 40-point
chest grants one research minute and one healing minute. Exact named quantities appear in reward previews, while the
items stay unspent in inventory until used.

## Transactions and privacy

`resource-transfer` is separate from existing `alliance-transfer` (leadership).
Transfers validate current membership, integer amounts, resource type, available
funds including tax, daily limit and recipient overflow before mutation. Sender,
receiver, tax and both private reports commit in the same existing world/SQLite
transaction. There is no independent claimable reward on a report.

A monotonically increasing per-player transfer sequence plus a unique request ID
prevents old transfers from replaying even after the bounded 100-entry transfer
history is evicted. Existing durable HTTP idempotency receipts also apply, survive
session changes and serialize concurrent requests. Stale/conflicting sequences
reject without a second debit. Reports contain delivery and tax details; the
sender's report never labels the delivery as income to the sender.

AP admission, entitlement, combat state/damage and its snapshot commit together
through the existing simulation economic-revision transaction. Storage failure
rolls back all of them and pauses the kingdom until recovery. Ordinary snapshot
saving remains in place for regeneration/expiry. A process crash cannot restore
an oath's effect after its actual end time. Private AP, transfer history, inventory
and buffs are not exposed in another player's city snapshot; observable combat
strength continues through existing field stat information.

## Migration and immutable history

Schemas **1–14** load through versioned migration to 15. Legacy gameplay Aether
becomes Mana in balances, sealed item IDs, cargo, cargo-source resource names,
production carry, map deposits, paid job costs/refunds and old reward containers.
Deposit IDs such as `aether-1` intentionally stay stable; their resource is Mana.
New premium Aether starts at zero; AP starts at 100 once. Legacy active camp
contributors are grandfathered into their current camp generation without a
retroactive AP charge. Current-schema reconnects never reset earned premium or AP.

Commanders, shard counts, XP, skills, units, equipment, paid queue identities and
remaining work, inventory, claimed objectives and draw history are preserved.
No commander refund/clawback, AP backcharge, new consumable backpay or retroactive
premium grant is made for previously claimed rewards. Unclaimed rewards follow
the new disclosed definitions and still require their existing eligibility.

Historical reports retain their **exact original record** in `legacyEconomy`.
Their normal presentation fields normalize earned Aether amounts to Mana, with a
visible legacy-currency note. They cannot be interpreted as premium entitlements
or used to grant resources. This preserves the immutable source while allowing
current report details to use the new currency model. The original schema-14 JSON
archive is also retained. Applying the current-schema loader again does not
repeat conversion or nest another original record.

JSON storage archives the untouched source as `.schema14.bak` before saving 15;
other old schema archives follow the existing convention. SQLite migration uses
the existing atomic payload write and leaves accounts/receipts unchanged. **Make
a complete SQLite backup before upgrading** using the existing backup workflow;
SQLite container schema does not change. Invalid/ambiguous currency containers,
unknown formats, unsafe balances, invalid clocks, inconsistent generation passes,
malformed ledgers or invalid buff durations fail validation instead of guessing.

## Verification and limitations

See [recorded automated verification](validation/economy-0.29.md) and the
[Windows acceptance checklist](playtest-economy-0.29.md). Existing combat,
exploration/cargo, hospital, account, inventory, kingdom and campaign tests remain
part of the full suite. Rallies retain their existing safe restart interruption.

Unity Editor compilation, rendering, native input, narrow-screen HUD/report
layout, Windows executable/installer launch and FPS remain unverified here.
Premium earning is per city under the existing identity model; cross-account
anti-farming and a production trade market are future operational work. No
production-scale throughput result, convoy gameplay or paid store is claimed.
