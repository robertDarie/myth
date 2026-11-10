# Ancient discoveries · 0.44

Protocol stays **16**. World saves move to **schema 17**. Schema 16 and older still load. Explored land is kept, and the next load records any ancient place already inside that land. Claims are not invented. A schema 16 file is archived beside the save as `.schema16.bak`.

Places are shared geography. Each city has its own discovery, investigation and claim. One city claiming a gift does not remove it for anyone else.

## Places

Fifteen places, five of each kind, one of each kind for every civilization. They are fixed coordinates, at least five world units from camps, resources, gates, shrines, strongholds and each other, and off the province walls.

| Category | How it is found | What finishes it |
| --- | --- | --- |
| Ancient settlement | The sector leaves the fog | Claim. No scout is required. |
| Forgotten cavern | The sector leaves the fog | A scout travels there and spends 12 seconds inside. |
| Ancient ruin | The sector leaves the fog | A scout travels there and spends 20 seconds surveying. |

A place that is still under fog is omitted from that city's snapshot and journal. The journal reports only how many places remain, not where they are.

Recall, redirect and a failed gate crossing clear an unfinished investigation. The place stays discovered and can be investigated again. One scout carries one investigation. A second order to the same place is rejected while that scout is still assigned.

## Rewards

The base is fixed. One extra is rolled from the place and the city id, stored on the city, and never rolled again. Nothing in these tables grants Aether.

Settlements are the small gift: less than a Citadel of Mortals upgrade (100 wood, 75 gold, 40 stone) and less than one commander level (100 experience).

| | Food | Wood | Stone | Gold | Mana | Experience | Extra, one of |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Settlement | 80 | 60 | 0 | 25 | 0 | 40 | Harvest Satchel, Grove Supplies, or Builder’s Hourglass |
| Cavern | 0 | 0 | 90 | 40 | 8 | 80 | Pilgrim’s Tonic, Builder’s Hourglass, or Mason’s Crate |
| Ruin | 0 | 40 | 50 | 70 | 0 | 120 | Sealed Oracle Sigil, Echo of Haste, or Scholar’s Hourglass |

Mana 8 is deliberately under one Mana Phial. The Stoa of the First Warden does not roll: its extra is ten Warden Echo Shards, enough to recruit the Sanctuary Warden once.

## Journal

The journal shows discovered, investigated, claimed and unclaimed counts, counts by kind, the number still beyond the fog, and six milestones: first hearth, all five hearths, first cavern, first ruin, ten places, five gifts. **Next unclaimed discovery** focuses a place that is already revealed and ready to claim.
