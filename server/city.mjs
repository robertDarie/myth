import { trainingOptions, trainingBatch, trainingSpeed } from './troops.mjs';
import { recordActivity, activityClock } from './activity.mjs';
import { recordEvent } from './events.mjs';
import { BUILDINGS, INITIAL_BUILDINGS, CITADEL_REQUIREMENTS, TECHNOLOGIES, RELICS, ARMAMENTS, ARMAMENT_SET, ARMAMENT_SLOTS, TRADES, SUMMON_RULES, RESOURCES } from './city-content.mjs';
import { scoutCampCard } from './scout-camp.mjs';
import { armyList, age, crews, constructionJobs, totalTroops, totalMythic, skillInfo } from './progression.mjs';
import { COMMANDERS } from './content.mjs';

export function initializeCity(p, migrated = false) {
  p.buildings ??= { ...INITIAL_BUILDINGS };
  for (const [id, level] of Object.entries(INITIAL_BUILDINGS)) p.buildings[id] ??= level;
  p.technologies ??= Object.fromEntries(TECHNOLOGIES.map(t => [t.id, 0]));
  for (const t of TECHNOLOGIES) p.technologies[t.id] ??= 0;
  p.stone ??= 150; p.mana ??= 30; p.sigils ??= 3;
  p.research ??= null; p.crafting ??= null; p.secondConstruction ??= null; p.economyClock ??= 0;
  p.productionCarry ??= Object.fromEntries(RESOURCES.map(id => [id, 0]));
  p.commanderShards ??= {}; p.commanderRanks ??= {};
  p.summonHistory ??= []; p.summonCount ??= 0; p.epicPity ??= 0; p.legendaryPity ??= 0; p.lastOfferingDay ??= '';
  p.ownedRelics ??= []; p.equippedRelic ??= '';
  ensureArmaments(p);
  if (migrated && (p.mythic || p.reserveMythic || p.trainingQueue?.some(j => j.type === 'recruit'))) p.buildings.menagerie = Math.max(1, p.buildings.menagerie);
}
export const emptyArmamentSlots = () => ({ weapon: '', armor: '', banner: '' });
export function ensureArmaments(p) {
  p.ownedArmaments ??= [];
  p.commanderArmaments ??= {};
  p.secondaryCommanderId ??= '';
  for (const march of p.marches ?? []) march.secondaryCommanderId ??= '';
  for (const id of p.ownedCommanders ?? []) p.commanderArmaments[id] ??= emptyArmamentSlots();
}
export function armamentFactor(p, commanderId) {
  const slots = p.commanderArmaments?.[commanderId] ?? emptyArmamentSlots();
  const pieces = ARMAMENT_SLOTS.map(slot => ARMAMENTS.find(item => item.id === slots[slot])).filter(Boolean);
  return {
    damage: pieces.reduce((n, item) => n * item.damage, 1),
    health: pieces.reduce((n, item) => n * item.health, 1),
    speed: pieces.reduce((n, item) => n * item.speed, 1),
    pve: pieces.length >= ARMAMENT_SET.pieces ? ARMAMENT_SET.pve : 1,
  };
}
const commanderMarches = (p, commanderId) => armyList(p).filter(a => a.commanderId === commanderId || a.secondaryCommanderId === commanderId);
const armamentReady = (world, p, commanderId) => commanderMarches(p, commanderId).every(a => world.atHome(a) && !a.target && !a.deployed);
function clampCommanderHealth(world, p, commanderId) {
  for (const march of commanderMarches(p, commanderId)) march.health = Math.min(march.health, world.stats(march).maxHealth);
}
export const buildingLevel = (p, id) => id === 'citadel' ? p.cityLevel : p.buildings[id] ?? 0;
// Citadel 1 stays 40. Later citadels grow faster than the old +20 per level.
// Hall of Spears still adds 5 per level beyond the first. This is original tuning, not a RoK table.
export const CITADEL_TROOP_CAPACITY = [0, 40, 80, 140, 220, 340];
export const capacity = p => (CITADEL_TROOP_CAPACITY[p.cityLevel] ?? 40) + Math.max(0, (p.buildings.barracks ?? 1) - 1) * 5;
// Original share. The first march slot may carry the whole city store.
// Each further slot divides that store. This is not a copied reference-game capacity.
// Mythic escorts stay on mythicCapacity and do not consume this share.
export const marchTroopCap = p => Math.ceil(capacity(p) / Math.max(1, age(p).marches));
export const mythicCapacity = p => p.cityLevel + Math.max(0, p.buildings.menagerie - 1);
export const passiveCap = p => Math.floor((500 + p.buildings.vault * 250 + p.cityLevel * 50) * (1 + 0.08 * Math.max(0, Math.min(3, p.technologies?.stores ?? 0))));
const scaled = (cost, factor) => Object.fromEntries(Object.entries(cost).map(([id, value]) => [id, Math.ceil(value * factor)]));
const requirement=(p,r,kind='building')=>({kind,id:r.id,name:(kind==='building'?BUILDINGS:TECHNOLOGIES).find(v=>v.id===r.id).name,level:r.level,current:kind==='building'?buildingLevel(p,r.id):p.technologies[r.id],met:(kind==='building'?buildingLevel(p,r.id):p.technologies[r.id])>=r.level});
const affordable = (p, cost) => Object.entries(cost).every(([id, value]) => p[id] >= value);
function missing(p, requirements) {
  for (const r of requirements ?? []) if (buildingLevel(p, r.id) < r.level) return `${BUILDINGS.find(b => b.id === r.id).name} level ${r.level} required.`;
  return '';
}
export function buildingCard(p, b) {
  const level = buildingLevel(p, b.id), next = level + 1;
  const nextCost = scaled(b.base, b.id === 'citadel' ? level : Math.pow(next, 1.4));
  const nextDuration = (b.id === 'citadel' ? 20 * level : 12 * next) / (1 + 0.05 * p.technologies.masonry);
  let lockedReason = '';
  if (level >= (b.id === 'builders' ? 1 : 5)) lockedReason = 'Maximum prototype level.';
  else if (constructionJobs(p).some(j => (j.targetId || 'citadel') === b.id)) lockedReason = 'This structure is already under construction.';
  else if (constructionJobs(p).length >= crews(p)) lockedReason = 'All construction crews are busy.';
  else if (p.cityLevel < b.unlock) lockedReason = `Citadel level ${b.unlock} required.`;
  else if (b.id !== 'citadel' && next > p.cityLevel) lockedReason = 'Upgrade the Citadel first.';
  else lockedReason = missing(p, b.id === 'citadel' ? CITADEL_REQUIREMENTS[next] : b.requirements);
  if (!lockedReason && !affordable(p, nextCost)) lockedReason = 'Not enough resources.';
  const dependencies=[...(b.id==='citadel'?CITADEL_REQUIREMENTS[next]??[]:b.requirements??[])];
  if(b.id!=='citadel')dependencies.unshift({id:'citadel',level:Math.max(b.unlock,next)});
  const eachFive = b.resource && level ? (b.resource === 'mana' ? 1 : 2) * level * (1 + 0.15 * (p.technologies.harvest ?? 0)) : 0;
  const card = { ...b, prerequisites:level>=(b.id==='builders'?1:5)?[]:dependencies.map(r=>requirement(p,r)),level, maxLevel: b.id === 'builders' ? 1 : 5, nextCost, nextDuration, canUpgrade: !lockedReason, lockedReason, productionPerFive: eachFive };
  if (b.id === 'scoutcamp') card.scoutCamp = scoutCampCard(level);
  return card;
}
export function technologyCard(p, t) {
  const level = p.technologies[t.id] ?? 0, next = level + 1, cost = scaled(t.base, next * next);
  const maxLevel = t.maxLevel ?? 3;
  const duration = 12 * (t.pace ?? 1) * next / (1 + 0.05 * p.technologies.writing);
  let lockedReason = '';
  if (level >= maxLevel) lockedReason = 'Maximum research rank.';
  else if (p.research) lockedReason = 'Research lane is busy.';
  else if (p.buildings.academy < Math.max(t.academy, next)) lockedReason = `Athenaeum level ${Math.max(t.academy, next)} required.`;
  else if (t.prerequisite && p.technologies[t.prerequisite] < 1) lockedReason = `${TECHNOLOGIES.find(k => k.id === t.prerequisite).name} rank 1 required.`;
  else if (t.citadel && p.cityLevel < t.citadel) lockedReason = `Citadel level ${t.citadel} required.`;
  else if (t.hall && (p.buildings.barracks ?? 0) < t.hall) lockedReason = `Hall of Spears level ${t.hall} required.`;
  else if (t.building && !p.buildings[t.building]) lockedReason = `${BUILDINGS.find(b => b.id === t.building).name} required.`;
  else if (!affordable(p, cost)) lockedReason = 'Not enough resources.';
  const dependencies=[requirement(p,{id:'academy',level:Math.max(t.academy,next)})];if(t.prerequisite)dependencies.push(requirement(p,{id:t.prerequisite,level:1},'research'));if(t.citadel)dependencies.push(requirement(p,{id:'citadel',level:t.citadel}));if(t.hall)dependencies.push(requirement(p,{id:'barracks',level:t.hall}));if(t.building)dependencies.push(requirement(p,{id:t.building,level:1}));
  return { ...t, prerequisites:level>=maxLevel?[]:dependencies,level, maxLevel, cost, duration, currentBonus: (t.percent ?? 0) * level, nextBonus: level >= maxLevel ? (t.percent ?? 0) * level : (t.percent ?? 0) * next, canResearch: !lockedReason, lockedReason };
}
export function citySnapshot(world, p) {
  return { trainingOptions: trainingOptions(p), ageName: age(p).name, marchSlots: age(p).marches, constructionSlots: crews(p), assignedTroops:totalTroops(p),assignedMythic:totalMythic(p),deployedTroops:armyList(p).filter(a=>a.deployed).reduce((n,a)=>n+a.troops,0),deployedMythic:armyList(p).filter(a=>a.deployed).reduce((n,a)=>n+a.mythic,0), cityBuildings: BUILDINGS.map(b => buildingCard(p, b)), researchOptions: TECHNOLOGIES.map(t => technologyCard(p, t)),
    trainingBatch: trainingBatch(p), trainingDuration: 8 * trainingBatch(p) / 5 / trainingSpeed(p), recruitDuration: 20 / (1 + 0.1 * Math.max(0, p.buildings.menagerie - 1)),
    troopCapacity: capacity(p), marchTroopCap: marchTroopCap(p), mythicCapacity: mythicCapacity(p), passiveLimit: passiveCap(p),
    heroProgress: COMMANDERS.map(c => ({ ...skillInfo(p, c.id), rank: p.commanderRanks[c.id] ?? 0, shards: p.commanderShards[c.id] ?? 0, nextShards: 10 * ((p.commanderRanks[c.id] ?? 0) + 1), nextGold: 50 * ((p.commanderRanks[c.id] ?? 0) + 1) })),
    armamentLoadout: (p.ownedCommanders ?? []).map(id => ({ commanderId: id, ...(p.commanderArmaments?.[id] ?? emptyArmamentSlots()) })),
    armamentSet: ARMAMENT_SET,
    offeringAvailable: p.buildings.oracle > 0 && p.lastOfferingDay !== new Date(activityClock(world).now).toISOString().slice(0, 10),
    offeringAmount: p.buildings.oracle >= 5 ? 3 : p.buildings.oracle >= 3 ? 2 : 1,
    sealCost: { aether:10 } };
}
export function cityCommand(world, p, c, fail) {
  const requireBuilding = id => { if (!p.buildings[id]) fail(`${BUILDINGS.find(b => b.id === id).name} must be built first.`); };
  switch (c.type) {
    case 'upgrade': case 'building-upgrade': {
      const id = c.type === 'upgrade' ? 'citadel' : c.targetId;
      const b = BUILDINGS.find(b => b.id === id); if (!b) fail('Unknown building.');
      const card = buildingCard(p, b); if (!card.canUpgrade) fail(card.lockedReason);
      world.spend(p, card.nextCost);
      const lane = p.construction ? 'secondConstruction' : 'construction';
      p[lane] = { ...world.job(id === 'citadel' ? 'upgrade' : 'building', card.nextDuration, card.nextCost, 1), targetId: id }; return true;
    }
    case 'research': {
      const t = TECHNOLOGIES.find(t => t.id === c.targetId); if (!t) fail('Unknown technology.');
      const card = technologyCard(p, t); if (!card.canResearch) fail(card.lockedReason);
      world.spend(p, card.cost); p.research = { ...world.job('research', card.duration, card.cost, 1), targetId: t.id }; return true;
    }
    case 'temple-offering':
      requireBuilding('oracle');
      if (!citySnapshot(world, p).offeringAvailable) fail('The free offering has already been claimed for this UTC day.');
      p.sigils += citySnapshot(world, p).offeringAmount; p.lastOfferingDay = new Date(activityClock(world).now).toISOString().slice(0, 10); return true;
    case 'buy-sigil':
      fail('Ordinary-resource sigil purchases are closed. Earn sigils through offerings, inventory or progression.');
    case 'summon': {
      requireBuilding('oracle'); const count = c.count ?? 1;
      if (![1, 10].includes(count)) fail('Choose one or ten summons.');
      if (p.sigils < count) fail('Not enough Oracle Sigils.');
      p.sigils -= count;
      for (let i = 0; i < count; i++) summon(world, p);
      world.event(`${p.name} invoked ${count} echo${count === 1 ? '' : 'es'} at the Temple.`); return true;
    }
    case 'upgrade-commander': {
      const id = c.targetId;
      if (!p.ownedCommanders.includes(id)) fail('Recruit this commander first.');
      const rank = p.commanderRanks[id] ?? 0, shards = 10 * (rank + 1);
      if (rank >= 5) fail('Commander is at maximum rank.');
      if ((p.commanderShards[id] ?? 0) < shards) fail('Not enough commander-specific Echo Shards.');
      world.spend(p, { gold: 50 * (rank + 1) }); p.commanderShards[id] -= shards; p.commanderRanks[id] = rank + 1; return true;
    }
    case 'craft': {
      requireBuilding('forge'); if (p.crafting) fail('The forge is busy.');
      const relic = RELICS.find(r => r.id === c.targetId);
      const piece = ARMAMENTS.find(item => item.id === c.targetId);
      const order = relic ?? piece; if (!order) fail('Unknown forge order.');
      if (relic && p.ownedRelics.includes(relic.id)) fail('This relic is already crafted.');
      if (piece && p.ownedArmaments.includes(piece.id)) fail('This armament is already crafted.');
      world.spend(p, order.cost); p.crafting = { ...world.job('craft', order.duration, order.cost, 1), targetId: order.id }; return true;
    }
    case 'equip-armament': {
      const piece = ARMAMENTS.find(item => item.id === c.targetId); if (!piece) fail('Unknown armament.');
      const heroId = c.name; if (!p.ownedCommanders.includes(heroId)) fail('Recruit this commander first.');
      if (!p.ownedArmaments.includes(piece.id)) fail('Craft this armament first.');
      if (!armamentReady(world, p, heroId)) fail('Return every march led by this commander home before changing armaments.');
      ensureArmaments(p);
      for (const slots of Object.values(p.commanderArmaments)) for (const slot of ARMAMENT_SLOTS) if (slots[slot] === piece.id) slots[slot] = '';
      p.commanderArmaments[heroId][piece.slot] = piece.id;
      clampCommanderHealth(world, p, heroId); return true;
    }
    case 'unequip-armament': {
      const heroId = c.name; if (!p.ownedCommanders.includes(heroId)) fail('Recruit this commander first.');
      if (!ARMAMENT_SLOTS.includes(c.targetId)) fail('Unknown armament slot.');
      if (!armamentReady(world, p, heroId)) fail('Return every march led by this commander home before changing armaments.');
      ensureArmaments(p);
      p.commanderArmaments[heroId][c.targetId] = '';
      clampCommanderHealth(world, p, heroId); return true;
    }
    case 'alliance-help': {
      requireBuilding('oathhall'); if (!p.allianceId) fail('Join an alliance first.');
      let receiver, job;
      for (const member of world.players.values()) {
        const found = [...constructionJobs(member), member.research].find(j => j?.id === c.targetId);
        if (found) { receiver = member; job = found; break; }
      }
      if (!receiver || receiver.id === p.id || receiver.allianceId !== p.allianceId || !receiver.buildings.oathhall) fail('An allied Oathbound Hall with an active job is required.');
      job.helpedBy ??= [];
      if (job.helpedBy.includes(p.id)) fail('You already helped this job.');
      if (job.helpedBy.length >= Math.min(5, 1 + receiver.buildings.oathhall)) fail('This job has received its maximum alliance help.');
      job.helpedBy.push(p.id); job.remaining = Math.max(0.1, job.remaining - Math.max(2, job.duration * 0.1)); return true;
    }
    default: return false;
  }
}
function summon(world, p) {
  p.summonCount++; p.epicPity++; p.legendaryPity++;
  let rarity;
  // One rarity roll per summon; pity takes priority and resets on its qualifying result.
  const roll = world.random(), legendaryChance = SUMMON_RULES.legendary;
  const epicThreshold = legendaryChance + SUMMON_RULES.epic, rareThreshold = epicThreshold + SUMMON_RULES.rare;
  if (p.legendaryPity >= SUMMON_RULES.legendaryPity) rarity = 'Legendary';
  else if (p.epicPity >= SUMMON_RULES.epicPity) rarity = roll < legendaryChance ? 'Legendary' : 'Epic';
  else rarity = roll < legendaryChance ? 'Legendary' : roll < epicThreshold ? 'Epic' : roll < rareThreshold ? 'Rare' : 'Common';
  const pool = COMMANDERS.filter(c => c.rarity === rarity);
  const hero = pool[world.chooseIndex(pool.length)];
  if (rarity === 'Legendary') p.legendaryPity = 0;
  if (rarity === 'Legendary' || rarity === 'Epic') p.epicPity = 0;
  const duplicate = p.ownedCommanders.includes(hero.id), shards = duplicate ? SUMMON_RULES.duplicateShards[rarity] : 0;
  if (duplicate) p.commanderShards[hero.id] = (p.commanderShards[hero.id] ?? 0) + shards;
  else { p.ownedCommanders.push(hero.id); ensureArmaments(p); }
  p.summonHistory.unshift({ id: world.job('summon', 1, {}, 1).id, commanderId: hero.id, rarity, duplicate, shards, number: p.summonCount });
  p.summonHistory.length = Math.min(20, p.summonHistory.length);
}
export function tickCity(world, p, dt, { production = true } = {}) {
  p.economyClock += production ? dt : 0;
  // The live loop adds about 100 ms per tick. Summing that interval falls an ulp short of five seconds, so the payout uses the same completion tolerance as construction.
  while (p.economyClock >= 5 - 0.00001) {
    p.economyClock = Math.max(0, p.economyClock - 5);
    for (const b of BUILDINGS.filter(b => b.resource)) {
      const level = p.buildings[b.id]; if (!level) continue;
      const cap = passiveCap(p);
      // Carry fractional production so a 15% bonus actually works at level one.
      // Production pauses at its ceiling; existing wealth is never clamped.
      if (p[b.resource] >= cap) { p.productionCarry[b.resource] = 0; continue; }
      p.productionCarry[b.resource] += (b.resource === 'mana' ? 1 : 2) * level * (1 + 0.15 * p.technologies.harvest);
      const amount = Math.floor(p.productionCarry[b.resource] + 0.000001);
      p.productionCarry[b.resource] = Math.max(0, p.productionCarry[b.resource] - amount);
      p[b.resource] += Math.min(amount, cap - p[b.resource]);
    }
  }
  for (const lane of ['construction', 'secondConstruction', 'research', 'crafting']) {
    const job = p[lane]; if (!job) continue;
    job.remaining = Math.max(0, job.remaining - dt); if (job.remaining >= 0.00001) continue;
    if (job.type === 'upgrade') { p.cityLevel++; world.event(`${p.name} entered the ${age(p).name}: ${age(p).marches} march slots unlocked.`); }
    if (job.type === 'building') p.buildings[job.targetId]++;
    if (job.type === 'research') p.technologies[job.targetId]++;
    if (job.type === 'craft') { if (ARMAMENTS.some(item => item.id === job.targetId)) p.ownedArmaments.push(job.targetId); else p.ownedRelics.push(job.targetId); }
    if (['upgrade','building','research'].includes(job.type)) { recordActivity(world,p,'development',1); recordEvent(world,p,'development',1); }
    p[lane] = null;
    const name = job.type === 'upgrade' ? 'Citadel level ' + p.cityLevel : [...BUILDINGS, ...TECHNOLOGIES, ...RELICS, ...ARMAMENTS].find(item => item.id === job.targetId)?.name ?? job.type;
    world.event(`${p.name} completed ${name}.`);
  }
}
export function validateCity(p) {
  if (constructionJobs(p).some(job => job.type === 'building' && !BUILDINGS.some(b => b.id !== 'citadel' && b.id === job.targetId))) throw new Error('Invalid saved building job.');
  if (p.research && !TECHNOLOGIES.some(t => t.id === p.research.targetId)) throw new Error('Invalid saved research job.');
  if (p.crafting && ![...RELICS, ...ARMAMENTS].some(item => item.id === p.crafting.targetId)) throw new Error('Invalid saved crafting job.');
  if (![p.stone, p.mana, p.sigils, p.economyClock, p.summonCount, p.epicPity, p.legendaryPity].every(v => Number.isFinite(v) && v >= 0)) throw new Error('Invalid saved city economy.');
  if (!p.productionCarry || RESOURCES.some(id => !Number.isFinite(p.productionCarry[id]) || p.productionCarry[id] < 0 || p.productionCarry[id] >= 1)) throw new Error('Invalid saved production carry.');
  for (const [levels, definitions, cap] of [[p.buildings, BUILDINGS.filter(b => b.id !== 'citadel'), 5], [p.technologies, TECHNOLOGIES, 3]])
    if (definitions.some(item => !Number.isInteger(levels[item.id]) || levels[item.id] < 0 || levels[item.id] > (item.maxLevel??cap))) throw new Error('Invalid saved city progression.');
  if (['drills', 'mercy', 'stores', 'caravan'].some(id => { const tech = TECHNOLOGIES.find(t => t.id === id); return p.technologies[id] > 0 && (p.technologies[tech.prerequisite] ?? 0) < 1; })) throw new Error('Invalid saved research prerequisites.');
  if (!Array.isArray(p.ownedRelics) || p.ownedRelics.some(id => !RELICS.some(r => r.id === id)) || (p.equippedRelic && !p.ownedRelics.includes(p.equippedRelic))) throw new Error('Invalid saved relic.');
  ensureArmaments(p);
  if (!Array.isArray(p.ownedArmaments) || new Set(p.ownedArmaments).size !== p.ownedArmaments.length || p.ownedArmaments.some(id => !ARMAMENTS.some(item => item.id === id))) throw new Error('Invalid saved armament.');
  if (!p.commanderArmaments || typeof p.commanderArmaments !== 'object' || Array.isArray(p.commanderArmaments)) throw new Error('Invalid saved armament.');
  const equippedPieces = [];
  for (const [id, slots] of Object.entries(p.commanderArmaments)) {
    if (!p.ownedCommanders.includes(id) || !slots) throw new Error('Invalid saved armament.');
    for (const slot of ARMAMENT_SLOTS) {
      if (typeof slots[slot] !== 'string') throw new Error('Invalid saved armament.');
      if (!slots[slot]) continue;
      const piece = ARMAMENTS.find(item => item.id === slots[slot]);
      if (!piece || piece.slot !== slot || !p.ownedArmaments.includes(piece.id)) throw new Error('Invalid saved armament.');
      equippedPieces.push(piece.id);
    }
  }
  if (new Set(equippedPieces).size !== equippedPieces.length) throw new Error('Invalid saved armament.');
  if (!Number.isInteger(p.sigils) || !Number.isInteger(p.epicPity) || p.epicPity >= SUMMON_RULES.epicPity || !Number.isInteger(p.legendaryPity) || p.legendaryPity >= SUMMON_RULES.legendaryPity || !Array.isArray(p.summonHistory) || p.summonHistory.length > 20 || p.summonHistory.some(d => !d || !COMMANDERS.some(c => c.id === d.commanderId) || !Number.isInteger(d.shards) || d.shards < 0) || typeof p.lastOfferingDay !== 'string') throw new Error('Invalid saved summon history.');
  for (const map of [p.commanderShards, p.commanderRanks]) if (!map || typeof map !== 'object' || Object.entries(map).some(([id, value]) => !COMMANDERS.some(c => c.id === id) || !Number.isInteger(value) || value < 0)) throw new Error('Invalid saved hero progression.');
  if (Object.values(p.commanderRanks).some(rank => rank > 5)) throw new Error('Invalid saved hero rank.');
}
