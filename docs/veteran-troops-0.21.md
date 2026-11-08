# Veteran troops 0.21

A playable two-tier progression loop for all three mortal classes and all five
civilizations. This milestone adds gameplay rather than a larger feature inventory.

## Play it

1. Upgrade the Citadel to level 2.
2. Build the Temple of Echoes and Athenaeum; upgrade the Athenaeum and Hall of
   Spears to level 2.
3. Research **Heroic Formations** rank 1, then **Veteran Oaths** (one rank).
4. Open **Training → Tier II · Veterans**. Train five veterans directly or promote
   five ready Tier I reserves of the same class for the difference in costs/time.
5. At home, assemble a march with exact Tier I/Tier II counts. The formation picker
   includes all six mortal stacks plus mythics, with scrolling and an All Ready action.
6. March, fight camps or players, join rallies, and treat wounded veterans in the
   House of Renewal. Healed soldiers retain their tier in reserves.

The Training screen links directly to Veteran Oaths and march assembly. Deployed
soldiers cannot be promoted remotely. To promote founding troops, return/recover
and assemble a smaller march, leaving at least five Tier I troops in reserves.

Tier II has **40% more base health and 35% more base damage**. Civilization,
commander, research, relic and skill modifiers still apply. Infantry > cavalry >
archers > infantry remains the counter cycle across mixed tiers. Pure cavalry
keeps its mobility bonus regardless of tier. Veteran healing costs/time are twice
Tier I per soldier; hospital bed usage remains one per mortal soldier.

Promotion uses the existing single military queue and reserves five source units.
It preserves total soldier count/capacity, refunds the original tier and paid cost
on cancellation, and does not generate “new troops trained” activity credit.
Universal hourglasses accelerate only the chosen active batch. Offline completion,
SQLite command retries, reports, rallies, reserve transfers and healing preserve
exact type counts. Ready/deployed veteran power is 8 per soldier versus Tier I's
5; queued/wounded soldiers remain excluded under the existing ranking policy.

Veteran world proxies have gold rank markers; map labels show veteran counts.
Existing animated models are reused. Dedicated veteran armor meshes, Tier III–V,
siege/engineering, new active combat abilities and gathering cargo remain incomplete.

## Upgrade and verification

Bundle **0.21.0**, protocol **14**, game save schema **13**; SQLite revision stays 2.
Close the old game/server, pull main, open Unity and rebuild both client and bundled
server. Old protocol-13 servers/clients are rejected rather than silently losing
Tier II counts. Back up before upgrading. Schemas 1–12 migrate with unchanged troop
counts and zero Veteran Oaths rank; inventories, account ownership, heroes and paid
jobs remain intact. JSON schema-12 sources are archived before autosave rotation.
Old binaries cannot load schema-13 saves.

**206 server tests pass**, including 14 new veteran scenarios: legal unlock path,
all-class training, promotion conservation/refund/capacity, class counters, field
march/combat/reinforce/disband, tiered wounds/healing, malformed saves, downtime,
hourglasses, once-only HTTP requests and veteran stronghold rallies.

Native Unity compilation, visual markers, scrolling and Windows frame-rate checks
remain pending. The Linux source checks do not establish native rendering quality.
Test Training, research graph, all seven formation rows, mixed-tier hospital
selection, save/restart and both direct training/promotion in the Windows player.
