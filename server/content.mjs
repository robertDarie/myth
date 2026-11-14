export { WORLD_SIZE as SIZE } from './world-map.mjs';
export const CIVILIZATIONS = [
  { id: 'greek', name: 'Greek', specialty: 'Formation: +12% army damage', mythic: 'Minotaur', damage: 1.12, speed: 1, healing: 1, gathering: 1, health: 1 },
  { id: 'egyptian', name: 'Egyptian', specialty: 'Sacred rites: +35% recovery', mythic: 'Sphinx Guardian', damage: 1, speed: 1, healing: 1.35, gathering: 1, health: 1 },
  { id: 'norse', name: 'Norse', specialty: 'Endurance: +15% army health', mythic: 'Frost Giant', damage: 1, speed: 1, healing: 1, gathering: 1, health: 1.15 },
  { id: 'chinese', name: 'Chinese', specialty: 'Harmony: +25% gathering', mythic: 'Qilin Guardian', damage: 1, speed: 1, healing: 1, gathering: 1.25, health: 1 },
  { id: 'japanese', name: 'Japanese', specialty: 'Spirit paths: +15% march speed', mythic: 'Tengu', damage: 1, speed: 1.15, healing: 1, gathering: 1, health: 1 },
];
export const COMMANDERS = [
  { id: 'warden', name: 'Sanctuary Warden', rarity: 'Common', color: 'green', description: 'Original guardian. +5% damage.', damage: 1.05, health: 1, speed: 1, gather: 1 },
  { id: 'rune-seer', name: 'Rune Seer', rarity: 'Rare', color: 'blue', description: 'Original Norse-inspired seer. +10% health and gathering.', damage: 1, health: 1.1, speed: 1, gather: 1.1 },
  { id: 'mulan', name: 'Hua Mulan', rarity: 'Epic', color: 'purple', description: 'Legendary defender. +15% health and +10% gathering.', damage: 1, health: 1.15, speed: 1, gather: 1.1 },
  { id: 'tomoe', name: 'Tomoe Gozen', rarity: 'Epic', color: 'purple', description: 'Warrior of legend. +20% damage.', damage: 1.2, health: 1, speed: 1, gather: 1 },
  { id: 'sigurd', name: 'Sigurd', rarity: 'Legendary', color: 'gold', description: 'Dragon-slayer. +25% damage and +20% health.', damage: 1.25, health: 1.2, speed: 1, gather: 1 },
  { id: 'wukong', name: 'Sun Wukong', rarity: 'Legendary', color: 'gold', description: 'Monkey King. +25% damage and +20% speed.', damage: 1.25, health: 1, speed: 1.2, gather: 1 },
  { id: 'horus-champion', name: 'Champion of Horus', rarity: 'Epic', color: 'purple', description: 'Original mortal champion. +10% health and +15% gathering.', damage: 1, health: 1.1, speed: 1, gather: 1.15 },
  { id: 'captain', name: 'Frontier Captain', rarity: 'Common', color: 'green', description: 'Steady mortal leadership. +5% health.', damage: 1, health: 1.05, speed: 1, gather: 1 },
  { id: 'scout', name: 'Pathfinder', rarity: 'Rare', color: 'blue', description: 'Explore and gather. +15% speed, +20% gathering.', damage: 1, health: 1, speed: 1.15, gather: 1.2 },
  { id: 'atalanta', name: 'Atalanta', rarity: 'Epic', color: 'purple', description: 'Swift hunter. +15% damage and march speed.', damage: 1.15, health: 1, speed: 1.15, gather: 1 },
  { id: 'heracles', name: 'Heracles', rarity: 'Legendary', color: 'gold', description: 'Heroic strength. +30% damage, +15% health.', damage: 1.3, health: 1.15, speed: 1, gather: 1 },
];
export const campDefinitions = [
  ['forsaken-1', 'Forsaken Scouts', 1, 19, 15],
  ['forsaken-2', 'Deserter Encampment', 1, 14, 28],
  ['forsaken-3', 'Tomb Raiders', 2, 31, 15],
  ['forsaken-4', 'Unbound Minotaur', 3, 26, 36],
  ['forsaken-5', 'Godbreaker Vanguard', 4, 50, 25],
  ['forsaken-6', 'Giant Warband', 4, 25, 52],
  ['forsaken-7', 'Godbreaker Citadel', 5, 60, 58],
];
export const siteDefinitions = [
  { id: 'shrine-dawn', name: 'Shrine of Dawn', kind: 'shrine', x: 20, z: 23, description: '+10% army damage for the owning alliance' },
  { id: 'shrine-life', name: 'Shrine of Renewal', kind: 'shrine', x: 50, z: 52, description: '+25% recovery for the owning alliance' },
  { id: 'gate-east', name: 'Eastern Divine Gate', kind: 'gate', x: 39, z: 20, description: 'Opens the eastern province for your alliance' },
  { id: 'gate-north', name: 'Northern Divine Gate', kind: 'gate', x: 20, z: 39, description: 'Opens the northern province for your alliance' },
  { id: 'first-sanctuary', name: 'The First Sanctuary', kind: 'sanctuary', x: 65, z: 65, description: 'Requires both gates; +20% gathering for the owning alliance' },
];
