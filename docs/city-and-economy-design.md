# Thrones of Myth: city, progression and economy design

Status: 0.4 design baseline; see [the 0.5 progression design](skills-ages-and-marches.md)
for current builders, marches and commander skills. Original baseline reviewed 6 November 2026.
Numbers below are our prototype tuning, not copied reference-game statistics.

## What the reference games teach us

Rise of Kingdoms' core city institutions connect city development, troop training,
research, recruitment, recovery, equipment and alliance cooperation. A building's
value usually comes from the system it unlocks, not its appearance. Its resource
and prerequisite costs make the player choose an upgrade order. [R1–R4]

Call of Dragons uses the same broad strategy structure, with faction names and
additional fantasy systems. Its catalog includes an academic institution, hero
recruitment, specialized troop structures, an ore/mana economy, recovery, equipment
or artifact systems, alliance support, exploration and season objectives. [C1–C4]

These are secondary community references, not authoritative live server data.
Their patch-specific numbers and naming can change. We use their functional
categories rather than transplanting their cost tables, season resets or odds.

## Design rules

1. Every institution must produce a decision, unlock an activity or support a
   real system. A renamed building with no working effect is a design placeholder.
2. City construction, troop training, research and forging have separate lanes.
   Armies never need to return just to let the city work.
3. New troops go into reserves. Composition, commander and equipment changes
   happen at home; remote recruitment and research remain available.
4. Equal building functions and costs across civilizations preserve alliance
   accessibility. Names, architecture and creature rosters provide cultural identity.
5. Counterplay and specialization matter more than unbounded stacked bonuses.
6. Recruitment should be exciting, legible and rewarding on duplicates. Keep a
   deterministic acquisition path. Do not make basic progression depend on luck.
7. Prototype cap is five city/building levels and three technology ranks. A larger
   production progression (potentially 25 levels) needs economy and battle testing.

## Full structure adaptation map

**Live** means a working rule and client interface in 0.4. **Partial** identifies
an intentionally narrower existing mechanic. **Planned** means design only.
This covers core city/world roles; temporary event structures and every decorative
variant are not separate implementation requirements.

| Reference role | Thrones of Myth adaptation | Why it exists and what a player does | Main resource sink | Status |
|---|---|---|---|---|
| City Hall / faction main hall | Citadel of Mortals | Choose the next development tier; caps other buildings and unlocks institutions | Wood, stone, gold | Live |
| Builder hut / construction management | Lodge of the First Builders | Manage construction crews and eventual city layout; avoid meaningless extra queues | Wood and stone | Construction lane live; physical lodge planned |
| Academy / College | Athenaeum of Ages | Choose economy, military or divine knowledge; commit resources and research time | Gold plus branch resources | Live: eight technologies |
| Tavern / recruitment Altar | Temple of Echoes | Invoke hero memories, claim offerings, inspect odds and build a collection | Oracle Sigils | Live |
| Barracks / infantry camp | Hall of Spears | Increase mortal capacity and training efficiency | Food, wood, stone | Live: generic mortal troops |
| Archery training building | Court of the Bow | Train ranged troops with their own strengths and counters | Food and wood | Planned |
| Stable / cavalry camp | Riders' Enclave | Train cavalry for mobility and exposed-target attacks | Food, wood, gold | Planned |
| Siege workshop | Siegeworks of the Titans | Build siege engines; create a reason to protect slow armies | Wood, stone, gold | Planned with siege rules |
| Magic training building | Circle of Mystics | Train mortal magic/support units; avoid treating all magic as monsters | Food, aether | Planned |
| Flying-unit building | Aerie of the Skybound | Recruit flying units only once air routes and counters work | Food, aether | Planned |
| Mythic recruitment / fantasy roster | Sanctuary of Beasts | Unlock and expand civilization-specific mythic recruitment | Food, gold, later aether | Live recruitment; unique creature abilities planned |
| Hospital | House of Renewal | Recover combat strength; eventually treat a bounded wounded-troop pool | Future food/gold treatment | Partial: home health recovery bonus; no wounded population yet |
| Farm | Blessed Fields | Provide dependable food between field trips | Wood and gold upgrades | Live |
| Lumber Mill | Sacred Grove | Supply the construction and training economy | Food and gold upgrades | Live |
| Quarry / ore production | Titan Stoneworks | Supply structural and forging demand | Wood and food upgrades | Live |
| Gold mine / mint | Treasury of Crowns | Support research, recruitment and specialized spending | Wood and stone upgrades | Live |
| Mana production | Aether Well | Supply divine institutions and magical development | Wood, stone, gold | Live |
| Storehouse | Vault of Ages | Bound unattended production; later protect a portion of resources from raids | Wood, stone, gold | Partial: passive-production ceiling; no plunder protection before PvP |
| Wall | Wardwall | Define city durability, siege damage and repair | Stone, wood, gold | Planned with city attacks |
| Watchtower | Sentinel Spire | Support a garrison against attackers; must have counterplay | Stone, gold, aether | Planned with garrisons |
| Scout camp / sentry post | Wayfinder Lodge | Explore fog, discover ruins and gather enemy intelligence | Food and wood | Planned with fog/scouting |
| Castle / Rally Beacon | War Council of the Oath | Organize rallies with shared timing and capacity limits | Wood, stone, earned war tokens | Planned; do not confuse with territory beacons |
| Alliance Center | Oathbound Hall | Help allies finish jobs; later host reinforcements | Wood, stone, gold | Live job assistance; reinforcements planned |
| Trading Post / Bazaar | Agora of Fates | Convert surpluses; later send taxed caravans to allies | Resource exchange | Live fixed exchanges; transport planned |
| Courier Station / merchant | Pilgrim Caravanserai | Optional rotating supplies with visible prices and bounded inventories | Ordinary resources | Planned; not needed for basic progression |
| Blacksmith / artifact development | Forge of Dawn | Craft a loadout, then choose which relic to equip | Stone/wood, gold, aether | Live: two relic recipes; full equipment sets planned |
| Relic collection / artifact inventory | Reliquary | Manage acquired divine tools without adding another summon dependency | Later crafting materials | Current relic inventory live in Forge; dedicated institution planned |
| Pet Sanctuary | Grove of Companions | Develop companions only after the core army counter system works | Later companion items | Planned; separate from mythic army recruitment |
| Monument / Augurstone | Chronicle of the Fallen | Explain kingdom milestones and award season-wide achievements | Progress conditions, not cash | Current quest/journal partial; world schedule planned |
| Lyceum / knowledge events | Hall of Sages | Optional lore challenges and small progression rewards | Player knowledge/time | Planned |
| Shop / membership building | Envoys' Exchange | Optional cosmetics and clearly priced goods if commercialization is introduced | Undecided | Not implemented; not required for city progression |
| Decorations | Civic gardens, banners and monuments | Express identity and improve readability; start with cosmetic value | Cosmetic economy later | Planned |
| Alliance fortress | Oath Citadel | Establish an alliance's territorial origin and reinforcement hub | Shared alliance resources | Partial: first leader beacon is the prototype root |
| Alliance flags | Oath Beacons | Extend connected territory and create defendable supply routes | Wood/gold now; shared treasury later | Live placement/connectivity; destruction planned |
| Alliance resource center | Covenant Supply Grounds | Offer cooperative gathering that rewards held territory | Alliance construction | Planned |
| Altars / sanctums | Divine Shrines | Create distributed, contestable alliance buffs | Occupation and territorial effort | Live |
| Passes | Divine Gates | Gate access to richer provinces and create strategic frontiers | Territorial effort | Live access rules; physical routing/scheduled openings planned |
| Central temple | First Sanctuary | Resolve the kingdom campaign around a shared central objective | Alliance coordination | Live capture; ruler governance planned |
| Barbarian fort / rally PvE | Godbreaker Stronghold | Give alliances a coordinated PvE target beyond solo camp farming | Army time and recovery | Camps live; proper rallies planned |
| Behemoth lairs / boss sites | Fallen Titan Sanctuaries | Require mechanics, team roles and territorial preparation | Group combat/recovery | Planned |
| Villages, caves and ruins | Lost Sanctuaries and Mortal Settlements | Reward discovery and lore; sometimes liberation instead of combat | Exploration time | Planned |
| KvK structures | Expedition bastions, gates and divine objectives | Organize cross-kingdom competition without overwriting home worlds | Seasonal alliance logistics | Planned |

## Civilization presentation

Core IDs and balance stay shared. These are candidate cultural presentation names,
not separate sets of mechanics and not claims of historical authenticity.

| Institution | Greek | Egyptian | Norse | Chinese | Japanese |
|---|---|---|---|---|---|
| Main hall | Acropolis Council | Pharaoh's Court | Great Hall | Celestial Court | Sovereign's Keep |
| Temple of Echoes | Oracle of Echoes | House of Eternal Names | Hall of the Remembered | Shrine of Celestial Echoes | Shrine of Remembered Heroes |
| Research | Athenaeum | House of Life | Council of Runes | Academy of Sages | Hall of Ancient Wisdom |
| Recovery | Sanctuary of Asclepius | House of Restoration | Hall of Renewal | Hall of Healing Arts | House of Renewal |
| Mythic recruitment | Sanctuary of Beasts | Court of Sacred Guardians | Hall of Giants | Court of Auspicious Beasts | Sanctuary of Spirits |

0.4 uses the shared institution names and placeholder visuals. Cultural skins,
art and localized text should be reviewed before being treated as final names.

## Resource economy: sources, spending and pressure

| Resource | Main sources in 0.4 | Main sinks | Why it is distinct |
|---|---|---|---|
| Food | Fields, gathering, camps, fixed market exchange | Training, mythic recruitment, military research | Supports growth and replacement of the fighting force |
| Wood | Grove, gathering, quests | Construction, economy research, some relics and exchanges | Makes expanding a city compete with territorial expansion |
| Stone | Stoneworks, outcrops, camps | Structures, military research, relics | Gives heavy infrastructure its own demand |
| Gold | Treasury, gathering, camps, quests | Research, direct commander recruitment, ascension, training, offerings | Broad development choice, not real-money currency |
| Aether | Well, divine nodes, camps | Divine buildings/research, sigil exchanges, relics | Connects mortal economy to restored divine power |
| Oracle Sigils | Three starter sigils, camp victories, one daily offering, explicit gold+aether exchange | Temple summons | Keeps recruitment visible and separable from basic construction |
| Commander Echo Shards | Duplicate draws of that commander | That commander's ascension | Makes duplicates useful without silently converting them to generic gold |

No passive troop upkeep in the prototype: returning players should not discover a
bankrupt city. No purchasable currency or payment flow is implemented. New basic
resources are granted once when migrating 0.3 saves, not on every restart.

A passive stockpile limit pauses production; it never destroys gathered or earned
resources above the limit. This is deliberately different from future protected
resources during raids. Field gathering remains faster than passive income.
Fixed exchanges lose value on a round trip so a player cannot manufacture wealth.

Future currencies must have a concrete system before introduction: forging
materials for a full equipment system; earned war codices for rally progression;
alliance contribution credits for shared development. Do not add separate tokens
for every menu simply to increase complexity.

## Upgrade and queue rules implemented in 0.4

- One shared city construction lane for all structures; all other buildings are
  capped by Citadel level. Institutions have explicit hall/prerequisite conditions.
- New buildings start at zero. Barracks, Fields, Grove, Vault and Renewal begin
  at level one. Citadel also starts at one.
- Citadel 2 needs Barracks 1 and Fields 1; Citadel 3 needs Athenaeum 1 and
  Stoneworks 1; Citadel 4 needs Barracks 3 and Renewal 2; Citadel 5 needs
  Athenaeum 3, Beasts 2 and Forge 1. The dependency graph has no circular gates.
- Building cost grows by next-level^1.4 from its base recipe; Citadel retains its
  linear current-level recipe, now including stone. Prototype construction time
  is 12 seconds × next building level; Citadel is 20 seconds × current level.
- Training and mythic recruitment share a three-order lane. Completed units wait
  in reserves. Barracks/Beasts upgrades reduce their respective durations.
- Research and forging each have an independent single lane. A paid unfinished
  job can be canceled for a full refund in this prototype.
- Alliance help is a real job action, not a flat permanent bonus. Both cities
  need an Oathbound Hall and the same alliance. Each helper contributes once per
  construction/research job; receiver level bounds the number of helpers (max 5).
- A better commander/research/relic can increase maximum health, but it does not
  instantly refill an injured army in the field.

## Athenaeum research

| Branch | Technology | Per-rank effect | Prerequisite |
|---|---|---|---|
| Economy | Blessings of Plenty | +15% passive production | Athenaeum 1 |
| Economy | Titan Masonry | +5% construction speed | Plenty 1 |
| Economy | Runic Scriptoria | +5% research speed | Plenty 1 |
| Economy | Pilgrim Logistics | +8% gathering modifier | Athenaeum 1 |
| Military | Heroic Formations | +5% army damage | Athenaeum 1 |
| Military | Oaths of Endurance | +5% army maximum health | Formations 1 |
| Military | Paths of Hermes | +4% march speed | Logistics 1, Athenaeum 2 |
| Divine | Pacts of the First Beasts | +10% mythic damage contribution | Endurance 1, Athenaeum 2, Beasts 1 |

Each technology currently has three ranks. Rank requires at least that Athenaeum
level. Costs grow with rank squared. Duration is captured when a job begins;
researching a speed technology does not retroactively refund an active job.
Fractional passive income is carried so low-level production bonuses actually
produce their advertised benefit instead of disappearing through rounding.

## Temple of Echoes

### Experience

A player invokes a remembered hero, sees a brief reveal, then gets either a new
commander or a clear duplicate reward. The latest twenty results stay visible.
No fake near misses, hidden odds or automatic gold conversion on a summon click.
Single and ten-pull actions have the same per-pull rules and costs.

### Published prototype rules

| Result rarity | Base chance | Duplicate reward |
|---|---:|---:|
| Common / green | 40% | 5 commander-specific shards |
| Rare / blue | 35% | 8 shards |
| Epic / purple | 20% | 12 shards |
| Legendary / gold | 5% | 20 shards |

The commander within a rarity is selected uniformly from that rarity's roster.
There are eleven commanders across the four tiers in this slice. The collection
is shared across civilizations; civilization choice does not lock hero recruitment.

- One summon costs one earned Oracle Sigil; a ten-pull costs ten.
- Epic-or-better is guaranteed by the tenth pull since the last Epic/Legendary.
  That guaranteed pull is 95% Epic and 5% Legendary.
- Legendary is guaranteed by the fiftieth pull since the last Legendary, taking
  priority over the Epic guarantee. A Legendary resets both counters.
- Guarantees count across batches, restarts and temple upgrades. Base rates are
  not the aggregate rates after guarantees; the UI states both conditional rules.
- Every result is a full commander, not an undisclosed mixture of resource items.
- Duplicates grant the listed commander's shards. Ascension consumes
  10 × (next rank) shards plus 50 × (next rank) gold, to rank 5. Each rank adds
  3% damage and 2% maximum health to that equipped commander.
- Temple 1 gives one free sigil offering per UTC day, Temple 3 gives two, Temple
  5 gives three. Levels never change summon odds. Explicit extra-sigil exchanges
  use gold and aether; they never happen automatically when a summon is clicked.
- Direct earned-gold recruitment and the Epic quest remain available. A player
  can target a known commander without relying on random luck.

These are initial design values, not production economy guarantees. Measure
collection completion, duplicates, retained relevance of lower rarities, and
combat gaps before expanding the roster or any commercial model.

Commander-specific XP, active skills, skill ranks, talents, star unlocks and
commander pairings remain a separate milestone. Current army XP is shared army
progression, not yet independent XP on each hero. Gods remain patrons; named
mortal champions and demigods lead armies.

## Delivery phases

0.4 implements the civic/economic/research/recruitment foundation, basic relics,
trade and alliance help with server authority and save migration. It uses a city
institution overview rather than finished 3D city placement.

Next: validate pacing and usability; then add troop families and counters,
commander skills and per-hero development; then wounded populations, real garrisons,
rallies, scouting, siege and destructible territory. Only after those rules work
should advanced fortress, storage-protection and seasonal structures claim their
full functions. Persistent hosted kingdoms, account recovery and KvK follow.

## Reference sources

R1. [Rise of Kingdoms buildings index](https://riseofkingdomsguides.com/buildings/)
— core civic/military/support categories.

R2. [RoK Academy](https://riseofkingdoms.fandom.com/wiki/Buildings/Academy)
— research institution; indexed summaries were accessible, full-page fetch failed.

R3. [RoK Blacksmith](https://riseofkingdoms.fandom.com/wiki/Buildings/Blacksmith)
— equipment crafting and commander equipment.

R4. [RoK Trading Post](https://riseofkingdoms.fandom.com/wiki/Buildings/Trading_Post)
— resource transport capacity.

C1. [Call of Dragons building catalog](https://codwiki.net/wiki/Buildings)
— broad role/faction-name cross-check.

C2. [Call of Dragons buildings guide](https://callofdragons.net/buildings/)
— main-hall progression and storage distinction.

C3. [Call of Dragons Tavern](https://codwiki.net/wiki/Tavern)
— recruitment/draw interaction and faction presentation.

C4. [Call of Dragons technology](https://callofdragons.net/technology/)
— economic/military research branches.

C5. [Call of Dragons healing guide](https://callofdragonsguides.com/call-of-dragons-healing-guide/)
and [hospital reference](https://codwiki.net/wiki/Hospital) — recovery as a
separate military resource decision, distinct from city training.
