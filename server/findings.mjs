import { grantReward, ITEMS } from './inventory.mjs';
import { ensureHero, heroLevel } from './progression.mjs';

// Ancient places are shared geography. Each city keeps its own discovery, investigation and claim.
// Reward extras are rolled once, from the player id and place id, and then stored. A restart cannot reroll them.
import { cellIndex as cellOf } from './world-map.mjs';
const clone = value => structuredClone(value);

const settlement = (id, name, culture, x, z, description) => ({
  id, name, category: 'settlement', culture, x, z, description, seconds: 0,
  preview: 'A living community can offer food, wood, gold and one small supply once you claim it.',
  base: { food: 80, wood: 60, gold: 25, xp: 40 },
  extras: [{ 'food-pack-100': 1 }, { 'wood-pack-100': 1 }, { 'build-minute': 1 }],
});
const cavern = (id, name, culture, x, z, description) => ({
  id, name, category: 'cavern', culture, x, z, description, seconds: 12,
  preview: 'A scout must descend. The cave can yield stone, gold, a little Mana and one field supply.',
  base: { stone: 90, gold: 40, mana: 8, xp: 80 },
  extras: [{ 'ap-tonic-20': 1 }, { 'build-minute': 1 }, { 'stone-pack-75': 1 }],
});
const ruin = (id, name, culture, x, z, description, fixedItems = null) => ({
  id, name, category: 'ruin', culture, x, z, description, seconds: 20,
  preview: fixedItems
    ? 'A scout must survey the ruin. This one keeps a fixed cache of Warden Echo Shards besides gold, stone and wood.'
    : 'A scout must survey the ruin. It can yield gold, stone, wood and one Temple or research gift.',
  base: { wood: 40, stone: 50, gold: 70, xp: 120 },
  extras: [{ 'echo-sigil': 1 }, { 'universal-minute': 1 }, { 'research-minute': 1 }],
  fixedItems,
});

export const FINDINGS = [
  settlement('olive-rest', 'Olive Rest of the Low Road', 'greek', 10, 20, 'A Greek hamlet of timber houses and a red-tiled roof, still tending olives beside the low road.'),
  settlement('reed-haven', 'Reed Haven of the Quiet Bank', 'egyptian', 70, 18, 'An Egyptian river hamlet. Reed screens and a pale limestone porch face the quiet bank.'),
  settlement('fjord-hearth', 'Fjord Hearth', 'norse', 16, 50, 'A Norse stead. Turf eaves and a bronze hearth-post mark a community that kept its fire.'),
  settlement('lantern-hamlet', 'Lantern Hamlet of the Inner Terrace', 'chinese', 44, 52, 'A Chinese hamlet. Green-glazed roofs and hanging lanterns line one inner terrace.'),
  settlement('cedar-ward', 'Cedar Ward', 'japanese', 72, 44, 'A Japanese ward of cedar posts and dark bark roofs, set back from the pine road.'),
  cavern('whispering-cleft', 'The Whispering Cleft', 'greek', 38, 28, 'A Greek cleft. The mouth is a stone arch, and the dark inside answers with a low echo.'),
  cavern('tomb-breath', 'Breath of the Sealed Tomb', 'egyptian', 62, 18, 'An Egyptian cavern behind a sealed limestone lip. Warm air moves, but no one stands guard.'),
  cavern('ice-throat', 'Ice Throat', 'norse', 10, 44, 'A Norse cave. Ice ribs the throat of the rock, and meltwater rings on the stone.'),
  cavern('jade-hollow', 'Jade Hollow', 'chinese', 50, 32, 'A Chinese hollow. Pale jade seams catch the lamp and then disappear into the dark.'),
  cavern('fox-den', 'Den of the Quiet Fox', 'japanese', 74, 32, 'A Japanese den. Cedar roots frame the mouth, and fox tracks stop at the threshold.'),
  ruin('warden-stoa', 'Stoa of the First Warden', 'greek', 38, 36, 'A broken Greek stoa. One column still carries the Warden’s bronze name.', { 'warden-echoes-10': 1 }),
  ruin('sunken-court', 'Sunken Court of the Horizon', 'egyptian', 54, 18, 'An Egyptian court half sunk in sand. The horizon frieze is worn, not erased.'),
  ruin('yew-ring', 'Broken Ring of Yew', 'norse', 32, 52, 'A Norse ring of yew posts, split by old frost. The offering stone is still in the center.'),
  ruin('unlit-bell', 'Terrace of the Unlit Bell', 'chinese', 56, 44, 'A Chinese terrace. The bell frame stands, and the bell itself was never hung again.'),
  ruin('quiet-pine', 'Road of the Quiet Pine', 'japanese', 74, 62, 'A Japanese processional road. Pine posts remain; the gate beam lies in the moss.'),
];

const byId = new Map(FINDINGS.map(f => [f.id, f]));
export const findingById = id => byId.get(id);
export const FINDING_COUNT = FINDINGS.length;

export function rolledExtra(playerId, finding) {
  if (finding.fixedItems) return finding.fixedItems;
  let hash = 2166136261;
  const text = playerId + ':' + finding.id;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return finding.extras[(hash >>> 0) % finding.extras.length];
}
export function materializeReward(playerId, finding) {
  return { ...clone(finding.base), items: clone(rolledExtra(playerId, finding)) };
}

export function initializeFindings(p) {
  p.findings = { known: [], completed: [], claimed: [], rewards: {} };
}
function blank(p) {
  p.findings ??= { known: [], completed: [], claimed: [], rewards: {} };
  p.findings.known ??= []; p.findings.completed ??= []; p.findings.claimed ??= []; p.findings.rewards ??= {};
}
export function validateFindings(p) {
  blank(p);
  const f = p.findings;
  const ids = new Set(FINDINGS.map(place => place.id));
  const unique = list => Array.isArray(list) && list.length <= FINDINGS.length && new Set(list).size === list.length && list.every(id => ids.has(id));
  if (!unique(f.known) || !unique(f.completed) || !unique(f.claimed)) throw new Error('Invalid saved ancient places.');
  if (f.completed.some(id => !f.known.includes(id)) || f.claimed.some(id => !f.known.includes(id))) throw new Error('Invalid saved ancient places.');
  if (f.completed.some(id => findingById(id).category === 'settlement')) throw new Error('Invalid saved ancient places.');
  const rewardIds = Object.keys(f.rewards);
  if (rewardIds.length > FINDINGS.length || rewardIds.some(id => !f.known.includes(id))) throw new Error('Invalid saved ancient reward.');
  for (const id of rewardIds) {
    const reward = f.rewards[id];
    const place = findingById(id);
    if (!reward || typeof reward !== 'object' || !reward.items || typeof reward.items !== 'object') throw new Error('Invalid saved ancient reward.');
    for (const [key, amount] of Object.entries(reward)) {
      if (key === 'items') continue;
      if (!['food', 'wood', 'stone', 'gold', 'mana', 'xp'].includes(key) || !Number.isSafeInteger(amount) || amount < 0 || amount > 100000) throw new Error('Invalid saved ancient reward.');
    }
    if (reward.aether !== undefined) throw new Error('Invalid saved ancient reward.');
    for (const [item, count] of Object.entries(reward.items)) if (typeof item !== 'string' || !Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error('Invalid saved ancient reward.');
    if (place.category !== 'settlement' && !f.completed.includes(id)) throw new Error('Invalid saved ancient reward.');
  }
}

export function revealFindings(p) {
  blank(p);
  const known = new Set(p.findings.known);
  for (const place of FINDINGS) {
    if (!p.explored.includes(cellOf(place)) || known.has(place.id)) continue;
    p.findings.known.push(place.id); known.add(place.id);
    if (place.category === 'settlement') p.findings.rewards[place.id] = materializeReward(p.id, place);
  }
}

export function completeInvestigation(p, placeId) {
  const place = findingById(placeId);
  if (!place || place.category === 'settlement' || !p.findings.known.includes(placeId) || p.findings.completed.includes(placeId)) return false;
  p.findings.completed.push(placeId);
  p.findings.rewards[placeId] ??= materializeReward(p.id, place);
  return true;
}

function claimable(p, place) {
  if (!p.findings.known.includes(place.id) || p.findings.claimed.includes(place.id)) return false;
  if (place.category === 'settlement') return !!p.findings.rewards[place.id];
  return p.findings.completed.includes(place.id) && !!p.findings.rewards[place.id];
}

export function prepareInvestigation(p, id, fail) {
  blank(p);
  const place = findingById(id);
  if (!place || !p.findings.known.includes(place.id)) fail('That place is still beyond your explored land.');
  if (place.category === 'settlement') fail('This settlement offers its gift when you claim it. No investigation is required.');
  if (p.findings.completed.includes(place.id) || p.findings.claimed.includes(place.id)) fail('That investigation is already complete.');
  if (p.scouts.some(s => s.investigationId === place.id)) fail('A scout is already investigating that place.');
  return place;
}
export function findingCommand(w, p, c, fail) {
  blank(p);
  if (c.type !== 'finding-claim') return false;
  const place = findingById(c.targetId);
  if (!place || !p.findings.known.includes(place.id)) fail('That place is still beyond your explored land.');
  if (c.type === 'finding-claim') {
    if (p.findings.claimed.includes(place.id)) fail('That gift has already been claimed.');
    if (!claimable(p, place)) fail('Investigate this place with a scout before claiming its gift.');
    const reward = p.findings.rewards[place.id];
    const { xp, items, ...resources } = reward;
    if (resources.aether) fail('Ancient gifts cannot mint Aether.');
    grantReward(p, { ...resources, items });
    if (xp) {
      const record = ensureHero(p, p.commanderId);
      record.xp += xp; p.xp = record.xp; p.level = heroLevel(record);
    }
    p.findings.claimed.push(place.id);
    return true;
  }
  return false;
}

export function journalFor(p, ownScouts) {
  blank(p);
  const investigating = new Set((ownScouts ?? []).filter(s => s.investigationId).map(s => s.investigationId));
  const places = [];
  for (const place of FINDINGS) {
    if (!p.findings.known.includes(place.id)) continue;
    const scout = (ownScouts ?? []).find(s => s.investigationId === place.id);
    const completed = p.findings.completed.includes(place.id);
    const claimed = p.findings.claimed.includes(place.id);
    const state = claimed ? 'claimed' : completed ? 'completed' : scout ? 'investigating' : 'known';
    const stored = claimable(p, place) || claimed ? p.findings.rewards[place.id] : null;
    const reward = stored ? { food: stored.food ?? 0, wood: stored.wood ?? 0, stone: stored.stone ?? 0, gold: stored.gold ?? 0, mana: stored.mana ?? 0, xp: stored.xp ?? 0, items: Object.entries(stored.items ?? {}).map(([id, count]) => ({ id, count, name: ITEMS.find(item => item.id === id)?.name ?? id })) } : null;
    places.push({
      id: place.id, name: place.name, category: place.category, culture: place.culture, x: place.x, z: place.z,
      description: place.description, preview: place.preview, seconds: place.seconds, known: true,
      requiresInvestigation: place.category !== 'settlement', state, claimed,
      progress: scout && scout.phase === 'Exploring' && place.seconds > 0 ? Math.max(0, Math.min(1, 1 - scout.surveyRemaining / place.seconds)) : 0,
      eta: scout ? scout.eta ?? 0 : 0,
      reward,
    });
  }
  const discovered = places.length;
  const investigated = places.filter(place => place.category !== 'settlement' && (place.state === 'completed' || place.state === 'claimed')).length;
  const claimed = places.filter(place => place.claimed).length;
  const byType = category => places.filter(place => place.category === category).length;
  const next = places.find(place => !place.claimed && (place.category === 'settlement' || place.state === 'completed'));
  const milestones = [
    { id: 'first-hearth', name: 'First hearth found', reached: byType('settlement') >= 1 },
    { id: 'all-hearths', name: 'All five hearths found', reached: byType('settlement') >= 5 },
    { id: 'first-descent', name: 'First cavern investigated', reached: places.some(place => place.category === 'cavern' && (place.state === 'completed' || place.state === 'claimed')) },
    { id: 'first-ruin', name: 'First ruin surveyed', reached: places.some(place => place.category === 'ruin' && (place.state === 'completed' || place.state === 'claimed')) },
    { id: 'ten-places', name: 'Ten ancient places found', reached: discovered >= 10 },
    { id: 'five-gifts', name: 'Five gifts claimed', reached: claimed >= 5 },
  ];
  return {
    discovered, investigated, claimed, unclaimed: places.filter(place => !place.claimed && (place.category === 'settlement' || place.state === 'completed')).length,
    byType: { settlement: byType('settlement'), cavern: byType('cavern'), ruin: byType('ruin') },
    remaining: FINDINGS.length - discovered,
    investigating: investigating.size,
    milestones, nextUnclaimedId: next?.id ?? '',
    places,
  };
}
