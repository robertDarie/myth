import { COMMANDERS } from './content.mjs';
export const AGES = [
  { level: 1, name: 'Age of Embers', marches: 1 },
  { level: 2, name: 'Age of Oaths', marches: 2 },
  { level: 3, name: 'Age of Myths', marches: 3 },
  { level: 4, name: 'Age of Titans', marches: 4 },
  { level: 5, name: 'Age of Ascension', marches: 5 },
];
export const age = p => AGES[Math.min(5, p.cityLevel) - 1];
export const crews = p => p.buildings.builders > 0 ? 2 : 1;
export const constructionJobs = p => [p.construction, p.secondConstruction].filter(Boolean);
export const armyList = p => [p, ...p.marches];
export const totalTroops = p => armyList(p).reduce((n, a) => n + a.troops, 0);
export const totalMythic = p => armyList(p).reduce((n, a) => n + a.mythic, 0);
const PROFILES = {
  captain: ['Rallying Cry', 'shield', 'defense'], warden: ['Ward of Stone', 'shield', 'defense'],
  scout: ['Pinning Volley', 'damage', 'gather'], 'rune-seer': ['Runes of Renewal', 'heal', 'support'],
  atalanta: ['Huntress Volley', 'damage', 'offense'], mulan: ['Banner of Resolve', 'shield', 'support'],
  tomoe: ['Crescent Strike', 'damage', 'offense'], 'horus-champion': ['Wings of Restoration', 'heal', 'support'],
  heracles: ['Lionbreaker', 'damage', 'offense'], sigurd: ['Dragonbane', 'damage', 'offense'],
  wukong: ['Heavenward Staff', 'damage', 'offense'],
};
export const activeKind = id => PROFILES[id][1];
export function ensureHero(p, id) {
  p.heroRecords[id] ??= { xp: 0, stars: 1, skills: [1, 0, 0, 0] };
  return p.heroRecords[id];
}
export function heroLevel(record) { return Math.min(record.stars * 10, 1 + Math.floor(record.xp / 100)); }
export function initializeProgression(p) {
  p.marches ??= []; p.nextMarchNumber ??= 2; p.secondConstruction ??= null;
  p.heroRecords ??= {};
  const missingPrimary = !p.heroRecords[p.commanderId];
  for (const id of p.ownedCommanders) ensureHero(p, id);
  if (missingPrimary) {
    const record = ensureHero(p, p.commanderId);
    record.xp = p.xp;
    record.stars = Math.min(6, Math.max(1, Math.ceil((1 + Math.floor(p.xp / 100)) / 10)));
    record.skills = [1, ...[2, 3, 4].map(star => record.stars >= star ? 1 : 0)];
  }
  for (const a of armyList(p)) { a.rage ??= 0; a.shield ??= 0; a.shieldTime ??= 0; a.lastSkill ??= ''; a.skillCasts ??= 0; }
}
export function skillInfo(p, id) {
  const hero = COMMANDERS.find(c => c.id === id), r = p.heroRecords[id] ?? { xp: 0, stars: 1, skills: [1, 0, 0, 0] };
  const [active, kind, role] = PROFILES[id];
  const expertise = ['Epic', 'Legendary'].includes(hero.rarity) && r.skills.every(level => level === 5);
  const descriptions = role === 'offense' ? ['+4% army damage per level.', '+3% PvE damage per level.', '+2% maximum health per level.']
    : role === 'gather' ? ['+5% gathering per level.', '+2% march speed per level.', '+2% maximum health per level.']
    : role === 'defense' ? ['+4% maximum health per level.', '+2% gathering per level.', '-2% retaliation damage per level.']
    : ['+3% maximum health per level.', '+4% recovery speed per level.', '-2% retaliation damage per level.'];
  const names = role === 'offense' ? ['Battle Discipline', 'Slayer of the Forsaken', 'Unbroken Resolve']
    : role === 'gather' ? ['Forager\'s Wisdom', 'Trailcraft', 'Hardy Travelers']
    : role === 'defense' ? ['Guardian\'s Oath', 'Provisioning', 'Hold the Line'] : ['Shared Resolve', 'Restorative Arts', 'Protect the Fallen'];
  return { id, heroLevel: heroLevel(r), xp: r.xp, stars: r.stars, expertise,
    expertiseDescription: ['Epic', 'Legendary'].includes(hero.rarity) ? 'All four normal skills at level 5: +20% active-skill effect.' : 'No expertise in this prototype rarity.',
    skills: [
      { index: 0, name: active, kind: 'Active', level: r.skills[0], unlockStar: 1, description: kind === 'damage' ? 'Automatically spends 1,000 rage for extra damage (1.2 + 0.2 × skill level) times normal attack damage.' : kind === 'shield' ? 'At 1,000 rage, shields for (8% + 2% × skill level) of maximum health for four seconds.' : 'At 1,000 rage, heals (8% + 2% × skill level) of maximum health.' },
      ...names.map((name, i) => ({ index: i + 1, name, kind: 'Passive', level: r.skills[i + 1], unlockStar: i + 2, description: descriptions[i] })),
    ] };
}
export function skillModifiers(p, a) {
  const r = ensureHero(p, a.commanderId), role = PROFILES[a.commanderId][2];
  const [, s2, s3, s4] = r.skills;
  return { damage: role === 'offense' ? 1 + 0.04 * s2 : 1,
    pve: role === 'offense' ? 1 + 0.03 * s3 : 1,
    health: role === 'offense' || role === 'gather' ? 1 + 0.02 * s4 : 1 + (role === 'defense' ? 0.04 : 0.03) * s2,
    speed: role === 'gather' ? 1 + 0.02 * s3 : 1,
    gather: role === 'gather' ? 1 + 0.05 * s2 : role === 'defense' ? 1 + 0.02 * s3 : 1,
    heal: role === 'support' ? 1 + 0.04 * s3 : 1,
    mitigation: ['defense', 'support'].includes(role) ? 0.02 * s4 : 0 };
}
export function activeSkill(p, a, stats) {
  const r = ensureHero(p, a.commanderId), [name, kind] = PROFILES[a.commanderId];
  const expert = skillInfo(p, a.commanderId).expertise ? 1.2 : 1;
  a.rage -= 1000; a.lastSkill = name; a.skillCasts++;
  if (kind === 'damage') return Math.round(stats.damage * (1.2 + 0.2 * r.skills[0]) * expert);
  const amount = Math.round(stats.maxHealth * (0.08 + 0.02 * r.skills[0]) * expert);
  if (kind === 'heal') a.health = Math.min(stats.maxHealth, a.health + amount);
  else { a.shield = amount; a.shieldTime = 4; }
  return 0;
}
export function progressionCommand(world, p, c, fail) {
  if (!['mentor-commander', 'promote-commander', 'upgrade-skill'].includes(c.type)) return false;
  if (!p.ownedCommanders.includes(c.targetId)) fail('Recruit that commander first.');
  const r = ensureHero(p, c.targetId);
  if (c.type === 'mentor-commander') {
    const capXP = (r.stars * 10 - 1) * 100;
    if (r.xp >= capXP) fail('Promote this commander to raise its level cap.');
    world.spend(p, { gold: 40, food: 20 }); r.xp = Math.min(capXP, r.xp + 100);
  }
  if (c.type === 'promote-commander') {
    if (r.stars >= 6 || heroLevel(r) < r.stars * 10) fail('Reach the current star level cap before promotion (maximum six stars).');
    world.spend(p, { gold: 100 * r.stars, mana: 10 * r.stars }); r.stars++; if (r.stars <= 4) r.skills[r.stars - 1] = 1;
  }
  if (c.type === 'upgrade-skill') {
    const slot = c.skillIndex;
    if (!Number.isInteger(slot) || slot < 0 || slot > 3 || r.skills[slot] === 0 || r.skills[slot] >= 5) fail('Choose an unlocked skill below level five.');
    const shards = 5 * (r.skills[slot] + 1);
    if ((p.commanderShards[c.targetId] ?? 0) < shards) fail('Not enough commander-specific Echo Shards.');
    world.spend(p, { gold: 25 * (r.skills[slot] + 1) }); p.commanderShards[c.targetId] -= shards; r.skills[slot]++;
  }
  return true;
}
export function validateProgression(p) {
  if (!p.heroRecords || !Array.isArray(p.marches) || p.marches.length > 4) throw new Error('Invalid saved march progression.');
  if (!Number.isInteger(p.nextMarchNumber) || p.nextMarchNumber < 2) throw new Error('Invalid saved march numbering.');
  for (const a of armyList(p)) if (['rage', 'shield', 'shieldTime', 'skillCasts'].some(key => !Number.isFinite(a[key]) || a[key] < 0) || a.rage > 1000 || typeof a.lastSkill !== 'string') throw new Error('Invalid saved army skill state.');
  for (const [id, hero] of Object.entries(p.heroRecords)) {
    if (!COMMANDERS.some(c => c.id === id) || !Number.isFinite(hero.xp) || hero.xp < 0 || !Number.isInteger(hero.stars) || hero.stars < 1 || hero.stars > 6 || !Array.isArray(hero.skills) || hero.skills.length !== 4 || hero.skills.some((value, i) => !Number.isInteger(value) || value < (i < hero.stars ? 1 : 0) || value > (i < hero.stars ? 5 : 0))) throw new Error('Invalid saved commander skills.');
  }
}
