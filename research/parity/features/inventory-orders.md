# Inventory order receipts

<!-- parity
{
  "id": "CURSOR-PHASE3-INVENTORY",
  "description": "Apply one inventory order once and keep the existing item amounts",
  "reference_game": "Rise of Kingdoms",
  "reference_version": "UNKNOWN live build. No live inventory capture on 2026-11-20.",
  "checked": "2026-11-20",
  "status": "IMPLEMENTED",
  "parity": "Partial parity",
  "sources": [
    {"url": "https://apps.apple.com/us/app/rise-of-kingdoms/id1354260888", "checked": "2026-11-17", "classification": "UNKNOWN"}
  ],
  "numeric_references": [
    {"quantity": "Pack sizes, 60-second speedups, 100 commander XP, 20 AP and 10 percent oaths", "reference": "Existing ITEMS in server/inventory.mjs and research/parity/fixtures/inventory-items.json.", "classification": "UNKNOWN", "treatment": "Unchanged. A repeated request id no longer spends a second item or moves the job again."}
  ],
  "numeric_fixtures": [
    {"path": "research/parity/fixtures/inventory-items.json", "checks": ["existing item amounts and speedup durations stay unchanged"]}
  ],
  "deviations": [
    {"decision": "A successful inventory order stores its request id, and the same id does not spend or grant again.", "reason": "A retried founding-supply or item-use command spent another stack or reported the supplies as already claimed.", "impact": "The same order returns successfully without a second grant, pack opening, speedup, oath, tonic or chronicle. A different action on that id is refused. Item amounts stay on the existing table.", "authority": "Phase 3 authorizes one inventory order per request id while existing pack sizes, speedup durations, commander XP, AP tonic size and oath percents stay unchanged."}
  ],
  "essential_unknowns": [],
  "acceptance_checks": [
    "a repeated inventory request does not consume the stack or the job twice",
    "each owned item family spends once and a refused order keeps the stack",
    "existing item amounts and speedup durations stay unchanged"
  ],
  "covers": [
    "server/inventory.mjs",
    "client/Assets/ThronesOfMyth/Scripts/PrototypeClient.Inventory.cs"
  ],
  "coverage_ids": ["TM-069"]
}
-->

## Feature and RoK equivalent

Rise of Kingdoms keeps resource items, category speedups, a universal speedup, commander experience, sculptures, Action Point recovery and timed combat buffs in one bag. The live item catalog, prices and drop rates were not captured.

## Reference version and sources

The App Store listing checked on 2026-11-17 names the game. It does not publish pack sizes or speedup denominations. This checkpoint did not open a live client.

## Verified mechanics and prerequisites

The server already opens packs, applies construction, research, training, healing and universal speedups to one owned job, grants commander XP under the star cap, restores Action Points under the cap, and applies one attack oath and one defense oath. The inventory screen sends those commands. A client cannot name its own reward. Speedup buttons name the city job the way the rest of the city does, and only list a lane that hourglass can affect. Resource, shard, sigil, XP, AP and oath previews use the existing item amounts. A capped commander says to promote stars. An empty lane says which job is missing. After the stack count drops, the list records that the previewed order was accepted once.

## Numeric reference

Harvest Satchel stays 100 food, Grove Supplies 100 wood, Mason's Crate 75 stone, Sealed Crowns 50 gold and Mana Phial 10 mana. Each hourglass stays 60 seconds. Chronicle of the Fallen stays 100 XP. Pilgrim's Tonic stays 20 AP. Each oath stays 10 percent for 600 seconds. No new amount was added.

## Formulas and modifiers

A non-empty request id is kept after a successful supplies claim or item use, up to 4096 ids. The same id and the same action do not grant or spend again, including after a restart. A different action on that id is refused and the stack stays. A full ledger refuses a new id instead of forgetting an old one. Orders without an id still apply once per accepted command. A speedup subtracts its seconds from that job only. The normal tick completes the job once. Attack multiplies army damage by 1.1 and defense multiplies the incoming-damage factor by 0.9 while the oath time remains.

## Known uncertainties

Live Rise of Kingdoms pack sizes, speedup denominations, VIP, teleports, peace shields, equipment chests and drop rates are unknown. None of the authored items has a separate item-expiration time. Experimental city jobs are not inventory targets.

## Current Thrones of Myth behavior

Before this correction, sending the same item order again spent another item whenever the stack still held one. Sending the founding-supply order again returned an error after the first grant.

## Planned Thrones of Myth behavior

Implemented. The inventory screen puts a request id on founding supplies and on each use. A retry of that order does not open or spend the stack again.

## Differences and project decisions

The prototype amounts stay in place because a replacement catalog was not verified. Experimental city timers stay outside this bag. Wiring a speedup into those timers needs a change in the experimental city engine, which this task does not make.

## Systems affected

Inventory commands, the inventory window, and the saved receipt list on the city that used an id. City costs, troop stats, oath percents and the experimental city engine were not edited.

## Save migration

No schema change. A city without a receipt list still loads. New successful orders append ids on that city. An older save is not granted the new items again.

## Acceptance tests

`node --test server/inventory-orders.test.mjs` covers a repeated request, one job per speedup, the star cap, the AP cap, combat oaths, an atomic invalid order, and an experimental timer that does not move. "each owned item family spends once and a refused order keeps the stack" opens a food pack and a wood pack, a sigil, ten Warden shards and one chronicle, restores 20 AP under the cap, activates each oath, and moves construction, research, the training head, treatment and one crafting job by one hourglass. A replay after reload does not spend again. A conflicting id, a short stack, an unknown item, a queued training batch and an unknown job leave the stack and the other lanes alone. The registered checks are "a repeated inventory request does not consume the stack or the job twice", "each owned item family spends once and a refused order keeps the stack" and "existing item amounts and speedup durations stay unchanged".

## Implementation status

IMPLEMENTED. Partial parity. On 2026-11-21 the isolated Scribe kingdom on port 8102 clicked founding supplies, one Harvest Satchel, one Grove Supplies, one Sealed Oracle Sigil, one Oath of Valor, one Oath of Shelter, and one Echo of Haste on Training 100 Oathguard. Each of those stacks dropped once and the previewed effect matched the existing item. Builder's Hourglass stayed owned: with no construction job the button stayed disabled and said no construction job was active, and while Citadel level 3 was listed beside that training job the category hourglass was not applied before the building finished. Pilgrim's Tonic stayed at two because 1500/1500 AP disabled the button. Chronicle of the Fallen, Warden Echo Shards, and the research, training, and healing hourglasses were not in the bag, so those families were not clicked. The client still creates a new request id on every click. After a restart of that kingdom only, the saved food-pack request and the saved universal-minute request returned without a second spend, and a wood target on the food request id was refused. A disposable InventoryClient build was used for those clicks and was not published as the overnight package.
