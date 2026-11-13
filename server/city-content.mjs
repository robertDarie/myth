// Original prototype tuning; these are not the reference games' costs or odds.
export const RESOURCES = ['food', 'wood', 'stone', 'gold', 'mana'];
export const BUILDINGS = [
  { id: 'citadel', name: 'Citadel of Mortals', category: 'Civic', description: 'Sets the city level and district level cap. Unlocks new institutions.', unlock: 1, base: { wood: 100, gold: 75, stone: 40 } },
  { id: 'oracle', name: 'Temple of Echoes', category: 'Divine', description: 'Summon commanders with earned Oracle Sigils. One free sigil offering per UTC day; temple levels 3 and 5 improve the offering, never the odds.', unlock: 1, base: { wood: 60, gold: 40, stone: 30 } },
  { id: 'academy', name: 'Athenaeum of Ages', category: 'Knowledge', description: 'Independent economy and military research lane. Level limits research ranks.', unlock: 2, requirements: [{ id: 'oracle', level: 1 }], base: { wood: 70, gold: 50, stone: 40 } },
  { id: 'barracks', name: 'Hall of Spears', category: 'Military', description: '+5 troop capacity and +10% training speed per level beyond the first.', unlock: 1, base: { wood: 60, food: 40, stone: 20 } },
  { id: 'menagerie', name: 'Sanctuary of Beasts', category: 'Military', description: 'Enables mythic recruitment; each extra level adds one mythic capacity and 10% recruitment speed.', unlock: 2, requirements: [{ id: 'academy', level: 1 }], base: { wood: 80, gold: 60, stone: 50, mana: 10 } },
  { id: 'farm', name: 'Blessed Fields', category: 'Economy', description: 'Produce food every five seconds, until the passive stockpile limit.', unlock: 1, resource: 'food', base: { wood: 30, gold: 15 } },
  { id: 'lumber', name: 'Sacred Grove', category: 'Economy', description: 'Produce wood every five seconds, until the passive stockpile limit.', unlock: 1, resource: 'wood', base: { food: 30, gold: 15 } },
  { id: 'quarry', name: 'Titan Stoneworks', category: 'Economy', description: 'Produce stone for structures, technology and equipment.', unlock: 1, resource: 'stone', base: { wood: 40, food: 20 } },
  { id: 'mint', name: 'Treasury of Crowns', category: 'Economy', description: 'Produce gold for research, training, upgrades and trade.', unlock: 2, requirements: [{ id: 'quarry', level: 1 }], resource: 'gold', base: { wood: 50, stone: 40 } },
  { id: 'well', name: 'Mana Well', category: 'Divine', description: 'Produce Mana for divine research, mythic development and ordinary relic crafting.', unlock: 2, requirements: [{ id: 'oracle', level: 1 }], resource: 'mana', base: { wood: 60, stone: 40, gold: 30 } },
  { id: 'infirmary', name: 'House of Renewal', category: 'Military', description: '+15% home recovery and hospital healing speed per extra level. Each level adds 15 healing beds; paid treatment returns wounded units to reserves.', unlock: 1, base: { wood: 50, food: 40, stone: 20 } },
  { id: 'vault', name: 'Vault of Ages', category: 'Economy', description: 'Raises passive production ceiling. Gathering and battle rewards are never deleted at this ceiling; plunder protection awaits PvP.', unlock: 1, base: { wood: 50, stone: 30, gold: 20 } },
  { id: 'market', name: 'Agora of Fates', category: 'Economy', description: 'Send ordinary resources to alliance members. A visible transport tax and daily sending limit apply.', unlock: 2, requirements: [{ id: 'vault', level: 1 }], base: { wood: 60, stone: 40, gold: 30 } },
  { id: 'oathhall', name: 'Oathbound Hall', category: 'Alliance', description: 'Enables leading timed alliance rallies. Help alliance members with construction or research; each member can help a job once.', unlock: 2, base: { wood: 70, stone: 50, gold: 40 } },
  { id: 'forge', name: 'Forge of Dawn', category: 'Military', description: 'Craft relics in an independent lane. Equip completed relics when the army is at home.', unlock: 3, requirements: [{ id: 'quarry', level: 2 }], base: { wood: 80, stone: 80, gold: 50, mana: 15 } },
  { id: 'builders', name: 'Lodge of the First Builders', category: 'Civic', description: 'Permanently unlocks a second independent construction crew in the Age of Oaths. Two crews cannot upgrade the same structure simultaneously.', unlock: 2, base: { wood: 120, stone: 80, gold: 100 } },
  { id: 'scoutcamp', name: 'Outlook of the Horizon', category: 'Military', description: 'Trains scouts, separate from military marches. Higher levels add scout slots, travel speed, a wider reveal, shorter surveys and a wider auto-explore range.', unlock: 1, base: { wood: 55, food: 35, gold: 25 } },
];
export const INITIAL_BUILDINGS = Object.fromEntries(BUILDINGS.filter(b => b.id !== 'citadel').map(b => [b.id, ['barracks', 'farm', 'lumber', 'vault', 'infirmary', 'scoutcamp'].includes(b.id) ? 1 : 0]));
export const CITADEL_REQUIREMENTS = {
  2: [{ id: 'barracks', level: 1 }, { id: 'farm', level: 1 }],
  3: [{ id: 'academy', level: 1 }, { id: 'quarry', level: 1 }],
  4: [{ id: 'barracks', level: 3 }, { id: 'infirmary', level: 2 }],
  5: [{ id: 'academy', level: 3 }, { id: 'menagerie', level: 2 }, { id: 'forge', level: 1 }],
};
export const TECHNOLOGIES = [
  { id:'veterans',name:'Veteran Oaths',branch:'Military',description:'Unlock Tier II infantry, archers and cavalry at Hall of Spears level 2. Promotes existing reserves without creating extra soldiers.',academy:2,prerequisite:'drill',maxLevel:1,base:{food:100,wood:80,gold:80,stone:50} },
  { id: 'harvest', name: 'Blessings of Plenty', branch: 'Economy', description: '+15% passive production per rank.', academy: 1, base: { wood: 30, gold: 30, food: 20 } },
  { id: 'masonry', name: 'Titan Masonry', branch: 'Economy', description: '+5% construction speed per rank.', academy: 1, prerequisite: 'harvest', base: { stone: 30, gold: 40 } },
  { id: 'writing', name: 'Runic Scriptoria', branch: 'Economy', description: '+5% research speed per rank.', academy: 1, prerequisite: 'harvest', base: { wood: 40, gold: 40, mana: 5 } },
  { id: 'logistics', name: 'Pilgrim Logistics', branch: 'Economy', description: '+8% gathering per rank.', academy: 1, base: { food: 40, gold: 30 } },
  { id: 'drill', name: 'Heroic Formations', branch: 'Military', description: '+5% army damage per rank.', academy: 1, base: { food: 50, gold: 40, stone: 20 } },
  { id: 'vitality', name: 'Oaths of Endurance', branch: 'Military', description: '+5% army maximum health per rank; new capacity heals at home.', academy: 1, prerequisite: 'drill', base: { food: 50, gold: 40, mana: 5 } },
  { id: 'march', name: 'Paths of Hermes', branch: 'Military', description: '+4% march speed per rank.', academy: 2, prerequisite: 'logistics', base: { food: 40, gold: 50 } },
  { id: 'beastlore', name: 'Pacts of the First Beasts', branch: 'Divine', description: '+10% mythic damage contribution per rank.', academy: 2, prerequisite: 'vitality', building: 'menagerie', base: { food: 50, gold: 50, mana: 15 } },
  { id: 'veilreading', name: 'Reading of the Veil', branch: 'Military', description: 'The Outlook reads troop types at rank 1. Rank 2, with a fully raised Outlook, reads commanders, defenses and ordinary stores. Original v0.45 tuning.', academy: 1, prerequisite: 'drill', maxLevel: 2, base: { food: 40, gold: 50, wood: 30 } },
];
export const RELICS = [
  { id: 'aegis', name: 'Bronze Aegis', description: '+10% army maximum health.', cost: { stone: 80, gold: 60, mana: 10 }, duration: 15, damage: 1, health: 1.1 },
  { id: 'ember-spear', name: 'Ember Spear', description: '+10% army damage.', cost: { wood: 80, gold: 70, mana: 15 }, duration: 18, damage: 1.1, health: 1 },
];
// Commander-owned pieces. They do not replace a march relic.
export const ARMAMENTS = [
  { id: 'frontier-spearhead', name: 'Frontier Spearhead', slot: 'weapon', description: '+3% damage while this commander serves on the march.', cost: { wood: 60, gold: 40, mana: 10 }, duration: 20, damage: 1.03, health: 1, speed: 1 },
  { id: 'frontier-cuirass', name: 'Frontier Cuirass', slot: 'armor', description: '+3% maximum health while this commander serves on the march.', cost: { stone: 60, gold: 40, mana: 10 }, duration: 20, damage: 1, health: 1.03, speed: 1 },
  { id: 'frontier-standard', name: 'Frontier Standard', slot: 'banner', description: '+3% march speed while this commander serves on the march.', cost: { wood: 40, stone: 40, mana: 15 }, duration: 20, damage: 1, health: 1, speed: 1.03 },
];
export const ARMAMENT_SET = { id: 'oath-of-the-frontier', name: 'Oath of the Frontier', pieces: 2, pve: 1.02 };
export const ARMAMENT_SLOTS = ['weapon', 'armor', 'banner'];
export const TRADES = []; // Self-exchanges were replaced by alliance transfers.
export const SUMMON_RULES = { common: 0.4, rare: 0.35, epic: 0.2, legendary: 0.05, epicPity: 10, legendaryPity: 50, duplicateShards: { Common: 5, Rare: 8, Epic: 12, Legendary: 20 } };
export const resourceNodes = [
  { id: 'stone-1', name: 'Titan Outcrop', resource: 'stone', x: 10, z: 36 },
  { id: 'stone-2', name: 'Marble Ridge', resource: 'stone', x: 30, z: 10 },
  { id: 'stone-3', name: 'Giant Quarry', resource: 'stone', x: 50, z: 42 },
  { id: 'stone-4', name: 'Basalt Ridge', resource: 'stone', x: 62, z: 32 },
  { id: 'aether-1', name: 'Fallen Star', resource: 'mana', x: 33, z: 32 },
  { id: 'aether-2', name: 'Divine Spring', resource: 'mana', x: 54, z: 58 },
].map(n => ({ ...n, remaining: 600, capacity: 600, refill: 0 }));
