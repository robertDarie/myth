# Playtest 0.5: ages, independent marches and commander skills

Close the old game/server and Unity, pull main, then build a fresh Windows package
with **Thrones of Myth → Build Windows Playtest**. Extract the entire new ZIP.
This version uses protocol 5 and save schema 3; old clients cannot connect to it.
Existing 0.3/0.4 saves migrate with versioned backup archives.

## Two builders

Reach Citadel 2 (Age of Oaths). In City → Districts construct **Lodge of the First
Builders**. It permanently unlocks a second crew. Start two different allowed
building jobs and watch both progress. Neither crew can upgrade a building already
being worked on. Try canceling one and verify that the other continues.

## Multiple marches

Each completed Citadel level/age grants one march slot, to a maximum of five.
Recruit an unused commander and train spare units into reserves. In Army choose
that commander, 5/10/20 troops and optionally one mythic unit, then Deploy.

Select the march in the Army list or click its units in the field. Commands,
return, reinforcement and equipment changes apply to that selected march. Send
one to gather and another to fight. All resources go to the same city treasury.
Home units can visually overlap with placeholder buildings; use the Army list to
select them reliably.

To free a secondary march slot, return it home, let it recover fully, and choose
**Return selected march to reserves**. The founding march stays configured. A
commander and each crafted relic can serve only one of your marches at a time.
Unequip a relic at home before transferring it.

## Skills

Open Heroes → Skills & progression for a recruited commander. Individual XP,
stars, skill levels, and ascension rank are distinct. Camp participation earns XP;
mentoring is an explicit resource-funded shortcut for this prototype.

Reach each ten-level cap and promote to unlock the next star. Stars 1–4 unlock
four normal skill slots; stars 5–6 extend the cap to level 60. Choose an unlocked
skill to upgrade with specific Echo Shards and gold. Epic/Legendary expertise
activates when all four normal skills are at level five.

In combat, normal attacks generate rage. At 1,000 rage the commander's named
active fires automatically: burst damage, a shield, or bounded healing depending
on its current kit. The Army panel shows rage, shield and the last skill cast.

Several commanders currently share role-based passive/active templates. There
are no deputy pairings, talent trees, ranged-unit families or complex area/control
skills yet. See [the skill and progression design](skills-ages-and-marches.md)
for the research, exact rules and planned next systems.

## Save checks

Stop and reopen normally. March count, troops, commander records, positions,
resources and both builder jobs should persist. Field orders stop safely and
rage/shields reset. Saved queues resume while the server runs; no offline time
passes while it is closed.

Automated checks cover the server and migration rules. Unity compilation,
selection UI, world rendering and Windows launch still need local validation.
