# Commander skills, ages, builders and marches

Research and implementation baseline for 0.5, reviewed 6 November 2026.

## Reference patterns and important distinctions

Rise of Kingdoms commonly uses a rage-based active skill plus passive skills.
Commander level, stars and skill levels are different progression axes. Stars
unlock normal skill slots; higher star tiers also raise the level cap. Epic and
Legendary commanders commonly gain expertise after their four normal skills are
maxed. The primary commander supplies talents, while the secondary contributes
skills, including its active skill in the combat sequence. Individual commanders
and special game modes still need their own rules checked. [R1, R2]

Call of Dragons follows a similar rage/passive/awakening structure and gives a
legion a commander and, after the appropriate star unlock, a deputy. The primary
supplies systems such as talents and its artifact, while the deputy's skills
contribute without duplicating all primary systems. Some modern heroes are
exceptions to the standard rage-skill template: do not hard-code a claim that
every hero has the identical layout. Artifact actives are also distinct from a
hero's automatic rage ability. [C1–C4]

A practical shared pattern is: a signature active defines the hero; passive skills
reward a troop type or role; additional skills reinforce that identity; a mature
upgrade strengthens or changes the build. Pairing should reward complementary
roles rather than simply adding two large damage numbers.

Reference guides can disagree or lag patches. This document uses the repeated
structural pattern, not their exact combat factors or current season balance.

## Our commander progression implemented in 0.5

| Progress axis | What it does | How it increases |
|---|---|---|
| Individual XP and level | Improves the assigned hero's level-based damage contribution | Participating in camp combat; explicit in-game mentoring |
| Stars (1–6) | Raise the level cap by ten per star; stars 1–4 unlock the four normal skill slots | At the current level cap, pay stated gold/aether costs |
| Skill levels (1–5) | Improve a specific unlocked active/passive skill | Choose the skill and spend that commander's Echo Shards plus gold |
| Ascension rank (0–5) | Retains the existing modest damage/health growth | Separate shard/gold ascension action |
| Expertise | Epic/Legendary heroes: +20% active effect after all four normal skills reach 5 | Automatic, no extra hidden purchase |

Each current commander has one named active and three role-based passives.
Common/Rare commanders retain four useful skills but do not receive expertise in
this prototype. Stars 5 and 6 raise the cap to levels 50 and 60 without adding
extra normal skill slots.

We deliberately use **targeted** skill upgrades. Unlocking a new star should not
randomly redirect a player's next upgrade away from the skill they intended to
improve. Summoning remains random under its published rules; skill development
is an explicit choice.

Mentoring grants 100 XP for 40 gold and 20 food, capped at the current star tier.
Promotion costs 100 × current stars gold and 10 × current stars aether. Skill
upgrade costs 5 × next skill level commander shards and 25 × next level gold.
These are fast prototype values, not reference-game prices or launch balancing.

### Initial skill kits

| Commander | Active | Role | Working passive pattern |
|---|---|---|---|
| Frontier Captain | Rallying Cry | Defense | Maximum health, gathering, retaliation reduction |
| Sanctuary Warden | Ward of Stone | Defense | Maximum health, gathering, retaliation reduction |
| Pathfinder | Pinning Volley | Gathering | Gathering, march speed, maximum health |
| Rune Seer | Runes of Renewal | Support | Maximum health, home recovery, retaliation reduction |
| Atalanta | Huntress Volley | Offense | Army damage, PvE damage, maximum health |
| Hua Mulan | Banner of Resolve | Support | Maximum health, home recovery, retaliation reduction |
| Tomoe Gozen | Crescent Strike | Offense | Army damage, PvE damage, maximum health |
| Champion of Horus | Wings of Restoration | Support | Maximum health, home recovery, retaliation reduction |
| Heracles | Lionbreaker | Offense | Army damage, PvE damage, maximum health |
| Sigurd | Dragonbane | Offense | Army damage, PvE damage, maximum health |
| Sun Wukong | Heavenward Staff | Offense | Army damage, PvE damage, maximum health |

The first pass shares effect templates across roles; a named active is not yet a
fully unique animation or bespoke control mechanic. Damage actives add a burst;
defensive actives add a four-second shield; restorative actives heal the caster
up to its maximum health. There is no resurrection or remote full-army refill.

Each normal attack generates 200 rage in this prototype. At 1,000 rage the active
fires automatically if the target is alive. Outside melee combat, rage decays at
50 per second. Damage shields absorb retaliation and expire in real simulation
time. The selected march shows rage, shield and the most recently cast skill.

Future kits should add distinct area effects, debuffs, triggers and troop-family
conditions, with explicit durations, stacking rules and counters. Talent trees,
deputy pairings, skill targeting, ranged combat and troop-family counters are
**not implemented** in this slice. Do not advertise the full reference-game
commander system as complete.

## Five ages and five marches

The user's desired rule is direct: entering a new age unlocks one more march,
up to five. We follow that rule exactly for the compact prototype:

| Completed Citadel level | Age | March slots |
|---|---|---:|
| 1 | Age of Embers | 1 |
| 2 | Age of Oaths | 2 |
| 3 | Age of Myths | 3 |
| 4 | Age of Titans | 4 |
| 5 | Age of Ascension | 5 |

This is compressed progression for testing. If the game expands to 25 Citadel
levels, age boundaries should be redistributed and balanced rather than changing
these prototype numbers into a long grind accidentally.

**Reference distinction:** RoK's additional dispatch slots are associated with
City Hall 5, 11, 17 and 22. Age transitions and dispatch unlocks are not always the
same upgrade; the source describes the extra queue after entering the new age.
Our direct-at-age rule is an intentional simplification. We are not asserting
that all Call of Dragons seasons/modes have an identical five-slot cap. [R3]

### Real march rules

- A march has its own ID, commander, assigned troops, position, health, order,
  recovery, rage, shield and equipped relic.
- A new march consumes actual city reserves. It does not clone the founding army.
  Choose troop amounts in multiples of five and optional mythic units.
- One commander cannot lead two of your marches simultaneously. A single relic
  copy cannot equip two marches. Relics can be unequipped at home before transfer.
- All marches share the city's resource treasury and global troop/mythic
  capacity. Training accounts for deployed units, reserves and pending orders.
- Marches can gather, fight, return, place beacons or capture independently.
  A recovered secondary march can return its units to reserves at home.
- The founding march remains configured. In this slice, configured home marches
  count toward slots; return a fully healed secondary march to reserves to free
  its slot. This is not yet a separate unlimited formation-preset system.
- Multiple marches from one city do not multiply camp currency, kill credit or
  total commander XP. Shared rewards are apportioned by city; that city's XP is
  divided among its participating commanders.

## Second construction crew

In RoK, a second builder can be temporarily activated by an item and permanently
unlocked through VIP progression. That is a reference, not a requirement for our
game. [R4]

Our second crew is permanently earned in the **Age of Oaths** by constructing the
**Lodge of the First Builders**: 120 wood, 80 stone and 100 gold; 12 seconds of
prototype construction. It is a single-level institution. No subscription, timed
rental or paid membership is implemented.

Both crews work independently. A Citadel upgrade can overlap another permitted
building upgrade, but the same building cannot be upgraded by both crews. Only
completed levels satisfy prerequisites. Canceling one job refunds only its own
cost and leaves the other running. Alliance help can target either job.

Research, training and forging keep their separate lanes; a second builder is
not a second research or training queue.

## Persistence and migration

Protocol 5 / save schema 3. Older schema 1 and 2 saves migrate without resetting
the founding army, resources, commander collection, or paid jobs. Existing shared
army XP is assigned to the currently equipped founding commander, with a star
cap appropriate to its earned level (up to six stars). Other owned commanders
begin with individual level-one records when they have no prior individual XP.

Saved marches retain units, positions, commanders and health; both construction
jobs retain their remaining times. Orders stop safely on reload, and combat rage
and shields reset. Skill/star/XP progression persists. Legacy archives are kept
as `world.json.schema1.bak` or `world.json.schema2.bak` before autosave rotation.

## Sources

R1. [RoK commander guide](https://riseofkingdomsguides.com/rise-of-kingdoms-commander-guide/)
— active, passive, expertise and pairing framework.

R2. [RoK combat guide](https://www.bluestacks.com/blog/game-guides/rise-of-kingdoms/rok-combat-guide-en.html)
— rage generation and primary/secondary active sequence.

R3. [RoK troop dispatch queues](https://riseofkingdoms.fandom.com/wiki/Troop_Dispatch_Queue)
and [march queue guide](https://riseofkingdomsguides.com/rise-of-kingdoms-troop-capacity-and-march-queue-guide/)
— five-slot progression and unlock milestones.

R4. [Builder Recruitment](https://riseofkingdoms.fandom.com/wiki/Items/Builder_Recruitment)
— temporary item and VIP-based permanent second builder in the reference.

C1. [Call of Dragons hero framework](https://minmax.wiki/call-of-dragons/heroes)
— primary/deputy contributions and star-based deputy access.

C2. [Call of Dragons heroes guide](https://callofdragonsguides.com/call-of-dragons-heroes-guide/)
— rage and role/troop specialization.

C3. [Maggrat](https://codwiki.net/wiki/Maggrat)
— an exception to a universal rage-active template.

C4. [Theia](https://codwiki.net/wiki/Theia)
— shield/rage kit example and separate awakening.
