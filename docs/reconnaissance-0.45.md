# Enemy reconnaissance · 0.45

Protocol stays **16**. World saves move to **schema 18**. Schema 17 and older still load. Explored land, findings and claims are kept. A save without `veilreading` starts that research at rank 0. Reconnaissance reports and defender notices start empty. Schema 17 files are archived as `.schema17.bak` on the next successful load.

These depths and durations are original v0.45 tuning. They are not a verified Rise of Kingdoms table.

## What stays public

| Kind of information | Rule |
| --- | --- |
| Explored terrain | Permanent and clear. Leaving the sector does not restore fog. |
| Live marches inside current allied vision | Shown while they remain in sight, including the public troop total already used by combat. |
| Marches that leave sight | Removed. There is no grey fog and no last-seen march ghost. |
| Another city's stores, home host, commander and defenses | Not on the ordinary player card or public snapshot. |
| Veil readings and defender notices | Private to the reader or the defender. Another player does not receive them. |

A terrain survey is still the v0.43 observation of what the scout can see on arrival. A veil reading is a separate order. It does not publish that city, march or garrison through the survey report.

## Reading depth

Depth is the Outlook of the Horizon (`scoutcamp`) plus Academy research **Reading of the Veil** (`veilreading`, Military, Academy 1, prerequisite Heroic Formations, max rank 2).

| Depth | Requirement | The report includes | Watch after arrival |
| --- | --- | --- | --- |
| 0 | Outlook 0 | No reading can be sent. | — |
| 1 | Outlook 1 or 2, and Veil rank 0 | City or subject, civilization, Citadel, and a strength band taken from the real total: a handful under 50, a company under 200, a host under 500, otherwise a war host. The integer is omitted. | 8s |
| 2 | Outlook 3 or 4, or Veil rank 1 or higher | Depth 1, plus each home or target march, its troop types, tiers and exact quantities. | 6s |
| 3 | Outlook 5 and Veil rank 2 | Depth 2, plus the defending commander, Heroic Formations and Oaths of Endurance, an equipped relic, and for a city the ordinary stores (food, wood, stone, gold, Mana). Aether is never included. | 4s |

The watch duration is stored on the scout when the watch begins. Research finished during the watch does not shorten it. The depth used in the report is the Outlook and research at the moment the watch ends.

A march must be inside current allied vision to start a reading. The scout then follows that march. A city does not move. A garrison is read at the sacred site or beacon that holds it.

Recall, redirect, or the target becoming protected, allied, or gone before the scout arrives cancels the reading. No report and no defender notice are written. If the target withdraws during the watch, the finished report says the host withdrew and contains no troop numbers and no notice.

## Notices

A successful city reading writes one notice on the defender, keyed by the scout id. A repeated completion of that same scout cannot add a second notice. Marches and garrisons do not notify. Notices and readings appear in the Scouting section of the Messengers' Archive, not in Battles. Each list keeps the latest 20.

## Orders

- **Read this city** sends a free scout. Several scouts may read the same city. One scout has one target.
- **Read this march** requires the march to be deployed, hostile, and inside current allied vision.
- **Read the garrison** requires an enemy garrison on that site or beacon.
- A city still at Citadel 1, an ally, your own city, a home or recovering march, and a province behind a closed Divine Gate are rejected in the command result.
