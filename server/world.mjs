import { route, travel } from './navigation.mjs';
import { initializeExploration, explorationTick, explorationCommand, filterFog, visible, validateExploration } from './exploration.mjs';
import { campaignCommand, campaignFor, campaignDestination, tickCampaign, campaignSnapshot, groupReports, initializeCampaign, initializeFortification, restoreCampaign, territoryNear, reconcileCampaign } from './campaign.mjs';
import { socialCommand, allianceRole, initializeSocial, validateSocial } from './social.mjs';
import { initializeWar, warCommand, tickBattle, finishBattle, attackReason, combatFor, tickHospital, warSnapshot, wardTroops, wardMythic, validateWar, validateReport } from './war.mjs';
import { TROOP_TYPES, legacyUnits, migrateUnits, validateUnits, troopBase } from './troops.mjs';
import { randomUUID, randomInt } from 'node:crypto';
import { resourceNodes, RELICS, SUMMON_RULES, TRADES, RESOURCES } from './city-content.mjs';
import { marchCommand } from './marches.mjs';
import { AGES, age, crews, armyList, constructionJobs, totalTroops, totalMythic, ensureHero, heroLevel, activeKind, initializeProgression, skillModifiers, activeSkill, progressionCommand, validateProgression } from './progression.mjs';
import { initializeCity, capacity, mythicCapacity, cityCommand, citySnapshot, tickCity, validateCity } from './city.mjs';
import { SIZE, CIVILIZATIONS, COMMANDERS, campDefinitions, siteDefinitions } from './content.mjs';
export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const secureRandom = () => randomInt(1_000_000) / 1_000_000;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const finitePoint = p => [p.x, p.z].every(n => Number.isFinite(n) && n >= 1 && n <= SIZE - 1);
export class World {
  constructor({ random = secureRandom, now = () => Date.now() } = {}) {
    this.random = random; this.now = now;
    this.chooseIndex = length => this.random === secureRandom ? randomInt(length) : Math.floor(this.random() * length);
    this.rallies = []; this.garrisons = []; this.sieges = []; this.messages = []; this.markers = []; this.battles = new Map(); this.players = new Map(); this.sessions = new Map(); this.alliances = new Map();
    this.time = 0; this.events = [];
    this.camps = campDefinitions.map(([id, name, level, x, z]) => ({ id, name, level, x, z,
      health: 100 * level, maxHealth: 100 * level, respawn: 0, contributors: {} }));
    this.nodes = Array.from({ length: 12 }, (_, i) => ({ id: `resource-${i}`, name: ['Sacred Grove', 'Golden Vein', 'Harvest Fields'][i % 3],
      resource: ['wood', 'gold', 'food'][i % 3], x: 8 + (i % 4) * 8, z: 18 + Math.floor(i / 4) * 8, remaining: 600, capacity: 600, refill: 0 }));
    this.nodes.push(...resourceNodes.map(n => ({ ...n })));
    this.sites = siteDefinitions.map(s => ({ ...s, allianceId: '', challengerId: '', progress: 0 }));
    this.flags = []; for (const site of this.sites) initializeFortification(site, site.kind);
  }
  event(message) { this.events.unshift({ time: Math.round(this.time), message }); this.events.length = Math.min(this.events.length, 12); }
  join(name, civilization = 'greek', resumeToken = '') {
    if (resumeToken && this.sessions.has(resumeToken)) return { playerId: this.sessions.get(resumeToken), token: resumeToken };
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 24) throw new GameError('Name must contain 1–24 characters.');
    if (!CIVILIZATIONS.some(c => c.id === civilization)) throw new GameError('Unknown civilization.');
    if ([...this.players.values()].some(p => p.name.toLowerCase() === name.trim().toLowerCase())) throw new GameError('That city already exists. Use its saved local profile or choose a new name.');
    if (this.players.size >= 32) throw new GameError('Prototype is full.', 503);
    const id = randomUUID(), token = randomUUID();
    // Reuse vacant slots rather than relying on player count after disconnects.
    const occupied = new Set([...this.players.values()].map(p => p.slot));
    let slot = 0; while (occupied.has(slot)) slot++;
    const x = 5 + (slot % 8) * 3.5, z = 5 + Math.floor(slot / 8) * 2.5;
    const player = { id, slot, name: name.trim(), civilization, x, z, homeX: x, homeZ: z,
      health: 0, gold: 150, wood: 150, food: 200, troops: 20, mythic: 0, cityLevel: 1,
      commanderId: 'captain', ownedCommanders: ['captain'], xp: 0, level: 1, kills: 0, questClaimed: false,
      allianceId: '', target: null, cooldown: 0, gatherClock: 0, lastSeen: 0, state: 'Idle', recovery: 0, reserveTroops: 0, reserveMythic: 0, construction: null, trainingQueue: [], offline: false };
    initializeCity(player); initializeProgression(player); migrateUnits(player); initializeWar(player); initializeSocial(player); player.groupReports = []; initializeExploration(player);
    player.health = this.stats(player).maxHealth;
    this.players.set(id, player); this.sessions.set(token, id);
    this.event(`${player.name} founded a ${civilization} city.`);
    return { playerId: id, token };
  }
  authenticate(token) {
    const id = this.sessions.get(token);
    if (!id || !this.players.has(id)) throw new GameError('Session expired. Join the world again.', 401);
    return this.players.get(id);
  }
  owner(a) { return this.players.get(a.ownerId || a.id) ?? a; }
  armies() { return [...this.players.values()].flatMap(armyList); }
  army(id) { return this.armies().find(a => a.id === id); }
  stats(a) {
    const p = this.owner(a), r = ensureHero(p, a.commanderId);
    const civ = CIVILIZATIONS.find(c => c.id === p.civilization), commander = COMMANDERS.find(c => c.id === a.commanderId);
    const rank = p.commanderRanks[a.commanderId] ?? 0;
    const relic = RELICS.find(r => r.id === a.equippedRelic) ?? { damage: 1, health: 1 };
    const skill = skillModifiers(p, a), level = heroLevel(r), base = troopBase(a);
    const owns = id => !!p.allianceId && this.sites.some(s => s.id === id && s.allianceId === p.allianceId);
    return { level, maxHealth: Math.round((base.health + a.mythic * 35) * civ.health * commander.health * (1 + 0.05 * p.technologies.vitality) * (1 + 0.02 * rank) * relic.health * skill.health),
      damage: (base.damage + a.mythic * 12 * (1 + 0.1 * p.technologies.beastlore)) * (1 + 0.05 * p.technologies.drill) * (1 + 0.03 * rank) * relic.damage * civ.damage * commander.damage * (1 + (level - 1) * 0.03) * (owns('shrine-dawn') ? 1.1 : 1) * skill.damage,
      speed: 4 * base.speed * civ.speed * commander.speed * (1 + 0.04 * p.technologies.march) * skill.speed,
      heal: 12 * civ.healing * (1 + 0.15 * Math.max(0, p.buildings.infirmary - 1)) * (owns('shrine-life') ? 1.25 : 1) * skill.heal,
      gather: civ.gathering * commander.gather * (1 + 0.08 * p.technologies.logistics) * (owns('first-sanctuary') ? 1.2 : 1) * skill.gather,
      pve: skill.pve, mitigation: skill.mitigation };
  }
  atHome(p) { return distance(p, { x: p.homeX, z: p.homeZ }) < 2; }
  requireHome(p) { if (!this.atHome(p) || p.target) throw new GameError('Return your army home and stop before changing its composition or commander.'); }
  spend(p, cost) {
    if (Object.entries(cost).some(([key, value]) => p[key] < value)) throw new GameError('Not enough resources.');
    for (const [key, value] of Object.entries(cost)) p[key] -= value;
  }
  canEnter(p, destination) {
    p = this.owner(p);
    const owns = id => !!p.allianceId && this.sites.find(s => s.id === id).allianceId === p.allianceId;
    return (destination.x <= 40 || owns('gate-east')) && (destination.z <= 40 || owns('gate-north'));
  }
  command(p, c) {
    if (!c || typeof c !== 'object') throw new GameError('Invalid command.');
    const fail = message => { throw new GameError(message); };
    if (explorationCommand(this, p, c, fail) || campaignCommand(this, p, c, fail) || socialCommand(this, p, c, fail) || warCommand(this, p, c, fail) || marchCommand(this, p, c, fail) || progressionCommand(this, p, c, fail) || cityCommand(this, p, c, fail)) { reconcileCampaign(this); return; }
    switch (c.type) {
      case 'train': {
        if (p.trainingQueue.length >= 3) throw new GameError('Training queue is full (three orders).');
        const queued = p.trainingQueue.filter(j => j.type === 'train').reduce((total, j) => total + j.amount, 0);
        if (totalTroops(p) + p.reserveTroops + wardTroops(p) + queued + 5 > capacity(p)) throw new GameError('Troop capacity reached. Upgrade your city.');
        const type = TROOP_TYPES.find(t => t.id === (c.targetId || 'infantry'));
        if (!type) throw new GameError('Choose a valid troop type.');
        if (p.cityLevel < type.cityLevel) throw new GameError('This troop type requires Citadel level ' + type.cityLevel + '.');
        this.spend(p, type.cost);
        const job = this.job('train', type.duration / (1 + 0.1 * Math.max(0, p.buildings.barracks - 1)), { ...type.cost }, 5);
        job.targetId = type.id; p.trainingQueue.push(job); return;
      }
      case 'recruit': {
        if (p.trainingQueue.length >= 3) throw new GameError('Training queue is full (three orders).');
        const queued = p.trainingQueue.filter(j => j.type === 'recruit').length;
        if (p.cityLevel < 2 || !p.buildings.menagerie || totalMythic(p) + p.reserveMythic + wardMythic(p) + queued >= mythicCapacity(p)) throw new GameError('Mythic units require Citadel level 2 and a Sanctuary of Beasts; capacity reached or building missing.');
        const cost = { food: 80, gold: 100 }; this.spend(p, cost);
        p.trainingQueue.push(this.job('recruit', 20 / (1 + 0.1 * Math.max(0, p.buildings.menagerie - 1)), cost, 1)); return;
      }
      case 'cancel-job': {
        let job;
        const lane = ['construction', 'secondConstruction', 'research', 'crafting'].find(key => p[key]?.id === c.targetId);
        if (lane) { job = p[lane]; p[lane] = null; }
        else {
          const index = p.trainingQueue.findIndex(j => j.id === c.targetId);
          if (index < 0) throw new GameError('Queue order no longer exists.');
          [job] = p.trainingQueue.splice(index, 1);
        }
        for (const [resource, amount] of Object.entries(job.cost)) p[resource] += amount;
        return;
      }
      case 'unlock-commander': {
        const commander = COMMANDERS.find(k => k.id === c.targetId);
        if (!commander) throw new GameError('Unknown commander.');
        if (p.ownedCommanders.includes(commander.id)) throw new GameError('Commander is already recruited.');
        this.spend(p, { gold: commander.cost }); p.ownedCommanders.push(commander.id); return;
      }
      case 'quest':
        if (p.questClaimed || p.kills < 3) throw new GameError('Defeat three camps to claim this reward once.');
        p.questClaimed = true; p.gold += 200; p.wood += 150; p.food += 150;
        if (!p.ownedCommanders.includes('atalanta')) p.ownedCommanders.push('atalanta'); return;
      case 'alliance-create': {
        if (p.allianceId) throw new GameError('You already belong to an alliance.');
        if (typeof c.name !== 'string' || !c.name.trim() || c.name.trim().length > 24) throw new GameError('Alliance name must contain 1–24 characters.');
        if ([...this.alliances.values()].some(a => a.name.toLowerCase() === c.name.trim().toLowerCase())) throw new GameError('Alliance name is already used.');
        this.spend(p, { gold: 50 });
        const id = randomUUID(); this.alliances.set(id, { id, name: c.name.trim(), leaderId: p.id, officers: [] }); p.allianceId = id;
        this.event(`${p.name} founded ${c.name.trim()}.`); return;
      }
      case 'alliance-join':
        if (p.allianceId || !this.alliances.has(c.targetId)) throw new GameError('Choose an existing alliance while unaffiliated.');
        p.allianceId = c.targetId; this.event(`${p.name} joined ${this.alliances.get(p.allianceId).name}.`); return;
      default: throw new GameError('Unknown command.');
    }
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.25); this.time += dt; this.markers = this.markers.filter(m => m.expires > this.time);
    for (const camp of this.camps) if (camp.health <= 0) {
      camp.respawn = Math.max(0, camp.respawn - dt);
      if (camp.respawn === 0) { camp.health = camp.maxHealth; camp.contributors = {}; }
    }
    for (const node of this.nodes) if (node.remaining <= 0) {
      node.refill += dt; if (node.refill >= 30) { node.remaining = node.capacity; node.refill = 0; }
    }
    for (const owner of this.players.values()) this.cityTick(owner, dt);
    for (const p of this.armies()) {
      const owner = this.owner(p);
      p.shieldTime = Math.max(0, p.shieldTime - dt); if (p.shieldTime === 0) p.shield = 0;
      if (!['attack', 'pvp', 'siege'].includes(p.target?.type) || (!['pvp','siege'].includes(p.target?.type) && !this.camps.some(c => c.id === p.target.id && c.health > 0 && distance(p, c) <= 2.001))) p.rage = Math.max(0, p.rage - 50 * dt);
      const stats = this.stats(p); p.cooldown = Math.max(0, p.cooldown - dt);
      if (p.recovery > 0) { p.recovery = Math.max(0, p.recovery - dt); p.state = 'Recovering'; continue; }
      if (campaignFor(this, p.id)) continue;
      if (!p.target && this.atHome(p)) { p.health = Math.min(stats.maxHealth, p.health + stats.heal * dt); p.state = p.health < stats.maxHealth ? 'Healing' : 'Idle'; }
      if (!p.target || p.health <= 0) continue;
      const target = p.target;
      const destination = target.type === 'pvp' ? this.army(target.id) : target.type === 'attack' ? this.camps.find(e => e.id === target.id)
        : target.type === 'gather' ? this.nodes.find(n => n.id === target.id)
        : target.type === 'capture' ? this.sites.find(s => s.id === target.id) : target;
      if (target.type === 'pvp' && (!destination || campaignFor(this, destination.id) || !visible(this, owner, destination) || attackReason(this, p, destination))) { const battle = combatFor(this, p.id); if (battle) finishBattle(this, battle, 'Protected / unavailable'); p.target = null; p.state = 'Idle'; continue; }
      if (!destination || (target.type === 'attack' && destination.health <= 0) || (target.type === 'gather' && destination.remaining <= 0)) { p.target = null; p.state = 'Idle'; continue; }
      // Ownership can change while an army is marching. Returning home always remains possible.
      if (target.type !== 'return' && !route(this, p, destination)) { p.target = null; p.state = 'Route locked'; continue; }
      const stop = ['move', 'return'].includes(target.type) ? 0 : 2;
      travel(this, p, destination, stats.speed, dt, stop, target.type === 'return');
      if (distance(p, destination) > stop + 0.0001) continue;
      if (target.type === 'move' || target.type === 'return') { p.target = null; p.state = 'Idle'; }
      if (target.type === 'pvp') tickBattle(this, p, destination);
      if (target.type === 'attack' && p.cooldown === 0) this.battle(p, destination, stats);
      if (target.type === 'gather') {
        p.gatherClock += dt;
        if (p.gatherClock >= 1) { p.gatherClock -= 1; const amount = Math.min(destination.remaining, Math.ceil(8 * stats.gather)); destination.remaining -= amount; owner[destination.resource] += amount; }
      }
    }
    tickCampaign(this, dt);
    for (const site of this.sites) this.captureTick(site, dt);
    explorationTick(this, dt);
  }
  battle(a, camp, stats) {
    const p = this.owner(a);
    a.cooldown = 1;
    a.attackSequence = (a.attackSequence ?? 0) + 1; a.attackX = camp.x; a.attackZ = camp.z;
    let damage = Math.min(camp.health, Math.round(stats.damage * stats.pve)); camp.health -= damage;
    a.rage = Math.min(1000, a.rage + 200);
    if (camp.health > 0 && a.rage >= 1000) {
      const extra = Math.min(camp.health, activeSkill(p, a, { ...stats, damage: stats.damage * stats.pve }));
      camp.health -= extra; damage += extra;
    }
    camp.contributors[a.id] = (camp.contributors[a.id] ?? 0) + damage;
    if (camp.health === 0) {
      camp.respawn = 45;
      const participants = Object.keys(camp.contributors).map(id => this.army(id)).filter(Boolean);
      const owners = [...new Set(participants.map(actor => this.owner(actor).id))].map(id => this.players.get(id));
      for (const member of owners) {
        member.gold += Math.floor(50 * camp.level / owners.length); member.food += Math.floor(30 * camp.level / owners.length);
        member.stone += 20 * camp.level; member.aether += 5 * camp.level; member.sigils++; member.kills++;
        const ownArmies = participants.filter(actor => this.owner(actor).id === member.id);
        for (const actor of ownArmies) {
          const record = ensureHero(member, actor.commanderId);
          record.xp += 25 * camp.level / ownArmies.length; actor.xp = record.xp; actor.level = heroLevel(record);
        }
      }
      this.event(`${p.name} defeated ${camp.name} (level ${camp.level}).`); a.target = null; a.state = 'Victorious';
    } else {
      const hit = 8 * camp.level * (1 - stats.mitigation), absorbed = Math.min(a.shield, hit);
      a.shield -= absorbed; a.health = Math.max(0, a.health - (hit - absorbed));
      if (a.health === 0) {
        a.x = p.homeX; a.z = p.homeZ; a.target = null; a.recovery = 8; a.health = 1; a.rage = 0; a.shield = 0; a.state = 'Recovering';
        this.event(`${p.name}'s march retreated home after defeat.`);
      }
    }
  }
  captureTick(site, dt) {
    const contenders = new Set(this.armies().filter(p => p.target?.type === 'capture' && p.target.id === site.id && p.health > 0 && p.recovery === 0 && distance(p, site) <= 2.001 && this.owner(p).allianceId && this.canEnter(p, site) && (!site.allianceId || site.allianceId === this.owner(p).allianceId) && territoryNear(this, this.owner(p).allianceId, site)).map(p => this.owner(p).allianceId));
    if (contenders.size !== 1) { if (contenders.size === 0) site.progress = Math.max(0, site.progress - dt); return; }
    const allianceId = [...contenders][0];
    if (site.allianceId === allianceId) { site.progress = Math.max(0, site.progress - dt); return; }
    if (site.challengerId !== allianceId) { site.progress = 0; site.challengerId = allianceId; }
    site.progress += dt;
    if (site.progress >= 15) {
      site.allianceId = allianceId; site.progress = 0; site.challengerId = '';
      this.event(`${this.alliances.get(allianceId).name} captured ${site.name}.`);
      for (const p of this.armies()) if (p.target?.id === site.id && p.target.type === 'capture') { p.target = null; p.state = 'Idle'; }
    }
  }
  job(type, duration, cost, amount) {
    return { id: randomUUID(), type, duration, remaining: duration, cost, amount };
  }
  cityTick(p, dt) {
    tickCity(this, p, dt); tickHospital(this, p, dt);
    // One training lane: excess time carries into the next paid order.
    let remaining = dt;
    while (remaining > 0 && p.trainingQueue.length) {
      const job = p.trainingQueue[0];
      const spent = Math.min(remaining, job.remaining); job.remaining -= spent; remaining -= spent;
      if (job.remaining > 0.00001) break;
      if (job.type === 'train') { p.reserveTroops += job.amount; p.reserveUnits[job.targetId] += job.amount; }
      else p.reserveMythic += job.amount;
      p.trainingQueue.shift();
      this.event(`${p.name}: ${job.type === 'train' ? job.amount + ' troops' : 'a mythic recruit'} ready in city reserves.`);
    }
  }
  expire(now) {
    // Saved cities and their alliance territory are never deleted for inactivity.
    for (const p of this.players.values()) if (!p.offline && now - p.lastSeen > 30 * 60_000) {
      p.offline = true; for (const a of armyList(p)) if (!campaignFor(this, a.id)) { a.target = null; a.state = 'Offline'; }
    }
  }
  toSave() {
    return { schema: 7, world: { players: [...this.players.values()], sessions: [...this.sessions.entries()],
      alliances: [...this.alliances.values()], camps: this.camps, nodes: this.nodes, sites: this.sites,
      flags: this.flags, rallies: this.rallies, garrisons: this.garrisons, sieges: this.sieges, messages: this.messages, markers: this.markers, battles: [...this.battles.values()], time: this.time, events: this.events } };
  }
  static fromSave(data) {
    const w = structuredClone(data?.world);
    if (![1, 2, 3, 4, 5, 6, 7].includes(data?.schema) || !w || !['players', 'sessions', 'alliances', 'camps', 'nodes', 'sites', 'flags', 'events'].every(k => Array.isArray(w[k]))) throw new Error('Unsupported or damaged save format.');
    if (w.players.length > 32 || !Number.isFinite(w.time) || w.time < 0) throw new Error('Invalid saved world.');
    const world = new World();
    if (data.schema === 1) for (const node of resourceNodes) if (!w.nodes.some(n => n.id === node.id)) w.nodes.push({ ...node });
    for (const p of w.players) {
      if (data.schema < 3 && p) { initializeCity(p, true); initializeProgression(p); }
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || world.players.has(p.id) || !CIVILIZATIONS.some(c => c.id === p.civilization) || !COMMANDERS.some(c => c.id === p.commanderId)) throw new Error('Invalid saved city.');
      if (!['gold', 'wood', 'food', 'troops', 'mythic', 'reserveTroops', 'reserveMythic', 'health', 'xp', 'recovery', 'cooldown', 'gatherClock'].every(k => Number.isFinite(p[k]) && p[k] >= 0) || !finitePoint(p) || !finitePoint({ x: p.homeX, z: p.homeZ }) || !Number.isInteger(p.cityLevel) || p.cityLevel < 1 || p.cityLevel > 5) throw new Error('Invalid saved city values.');
      if (!Number.isInteger(p.slot) || p.slot < 0 || p.slot >= 32 || !Number.isInteger(p.level) || p.level < 1 || !Number.isInteger(p.kills) || p.kills < 0 || !Array.isArray(p.ownedCommanders) || !p.ownedCommanders.includes(p.commanderId) || p.ownedCommanders.some(id => !COMMANDERS.some(c => c.id === id)) || !Array.isArray(p.trainingQueue) || p.trainingQueue.length > 3) throw new Error('Invalid saved roster or queue.');
      if (data.schema < 4) migrateUnits(p);
      if (data.schema < 5) { initializeWar(p); initializeSocial(p); }
      if (data.schema < 7) initializeExploration(p); else validateExploration(p);
      validateCity(p); validateProgression(p); validateUnits(p); validateWar(p);
      for (const job of [...constructionJobs(p), p.research, p.crafting, ...p.trainingQueue].filter(Boolean)) {
        if (!['upgrade', 'building', 'research', 'craft', 'train', 'recruit'].includes(job.type) || typeof job.id !== 'string' || !Number.isFinite(job.remaining) || job.remaining < 0 || !Number.isFinite(job.duration) || job.duration <= 0 || job.remaining > job.duration || !Number.isInteger(job.amount) || job.amount < 1 || !job.cost || Object.entries(job.cost).some(([k, v]) => !RESOURCES.includes(k) || !Number.isFinite(v) || v < 0)) throw new Error('Invalid saved queue.');
      }
      if (constructionJobs(p).some(job => !['upgrade', 'building'].includes(job.type)) || (p.research && p.research.type !== 'research') || (p.crafting && p.crafting.type !== 'craft') || p.trainingQueue.some(job => !['train', 'recruit'].includes(job.type))) throw new Error('Invalid saved queue lane.');
      const ids = new Set([p.id]), commanders = new Set([p.commanderId]);
      for (const a of p.marches) {
        if (!a || typeof a.id !== 'string' || ids.has(a.id) || a.ownerId !== p.id || !p.ownedCommanders.includes(a.commanderId) || commanders.has(a.commanderId) || !finitePoint(a) || ['troops', 'mythic', 'health', 'recovery', 'cooldown', 'gatherClock', 'rage', 'shield', 'shieldTime'].some(key => !Number.isFinite(a[key]) || a[key] < 0) || a.homeX !== p.homeX || a.homeZ !== p.homeZ) throw new Error('Invalid saved march.');
        ids.add(a.id); commanders.add(a.commanderId); a.target = null; a.rage = 0; a.shield = 0; a.shieldTime = 0; a.state = 'Paused';
      }
      if (new Set(constructionJobs(p).map(job => job.targetId || 'citadel')).size !== constructionJobs(p).length) throw new Error('Duplicate saved building upgrade.');
      if (armyList(p).length > age(p).marches || (p.secondConstruction && crews(p) < 2)) throw new Error('Invalid saved age unlock.');
      world.players.set(p.id, { ...p, target: null, rage: 0, shield: 0, shieldTime: 0, lastSeen: 0, offline: true, state: 'Paused' });
    }
    if (new Set(world.armies().map(a => a.id)).size !== world.armies().length) throw new Error('Duplicate saved march ID.');
    for (const [token, id] of w.sessions) {
      if (typeof token !== 'string' || !world.players.has(id) || world.sessions.has(token)) throw new Error('Invalid saved session.');
      world.sessions.set(token, id);
    }
    if (new Set(world.sessions.values()).size !== world.players.size) throw new Error('Saved city has no session.');
    for (const a of w.alliances) {
      if (!a || typeof a.id !== 'string' || typeof a.name !== 'string' || !world.players.has(a.leaderId)) throw new Error('Invalid saved alliance.');
      if (data.schema < 5) a.officers = [];
      world.alliances.set(a.id, a);
    }
    if (w.players.some(p => p.allianceId && !world.alliances.has(p.allianceId))) throw new Error('Invalid saved alliance membership.');
    for (const [key, metrics] of [['camps', ['x', 'z', 'health', 'maxHealth', 'respawn']], ['nodes', ['x', 'z', 'remaining', 'capacity', 'refill']], ['sites', ['x', 'z', 'progress']]]) {
      if (w[key].length !== world[key].length || new Set(w[key].map(item => item.id)).size !== world[key].length || w[key].some(item => !world[key].some(base => base.id === item.id) || !metrics.every(k => Number.isFinite(item[k]) && item[k] >= 0))) throw new Error('Invalid saved map.');
      if (key === 'camps' && w.camps.some(c => !c.contributors || typeof c.contributors !== 'object' || Object.values(c.contributors).some(amount => !Number.isFinite(amount) || amount < 0))) throw new Error('Invalid saved battle state.');
      world[key] = w[key];
    }
    if (w.sites.some(s => s.allianceId && !world.alliances.has(s.allianceId)) || w.flags.some(f => !finitePoint(f) || !world.alliances.has(f.allianceId))) throw new Error('Invalid saved territory.');
    world.flags = w.flags; world.events = w.events.slice(0, 12); world.time = w.time;
    if (data.schema >= 5) {
      if (!Array.isArray(w.battles) || w.battles.length > 80 || new Set(w.battles.map(b => b.id)).size !== w.battles.length) throw new Error('Invalid saved engagements.');
      const engaged = new Set();
      for (const battle of w.battles) {
        validateReport(battle);
        for (const side of battle.sides) { const army = world.army(side.armyId); if (!army || world.owner(army).id !== side.playerId || engaged.has(army.id)) throw new Error('Invalid saved engagement participants.'); engaged.add(army.id); }
        world.battles.set(battle.id, battle); finishBattle(world, battle, 'Interrupted by restart');
      }
    }
    world.messages = data.schema >= 5 ? w.messages : []; world.markers = data.schema >= 5 ? w.markers : []; validateSocial(world);
    if (data.schema < 6) initializeCampaign(world); else restoreCampaign(world, w);
    explorationTick(world, 0);
    return world;
  }
  armySnapshot(a) {
    const p = this.owner(a);
    const destination = campaignDestination(this, a) ?? (a.target?.type === 'pvp' ? this.army(a.target.id) : a.target?.id ? [...this.camps, ...this.nodes, ...this.sites].find(item => item.id === a.target.id) : a.target);
    const assignment = campaignFor(this, a.id);
    const path = destination ? route(this, a, destination, a.target?.type === 'return') : [];
    return { route: path || [], assignmentKind: assignment?.kind || '', assignmentId: assignment ? (assignment.group.id || assignment.group.targetId) : '', id: a.id, ownerId: p.id, civilization: p.civilization, attackSequence: a.attackSequence ?? 0, attackX: a.attackX ?? a.x, attackZ: a.attackZ ?? a.z, allianceId: p.allianceId, name: a.id === p.id ? p.name + ' · March 1' : a.name,
      units: { ...a.units }, skillKind: activeKind(a.commanderId), commanderId: a.commanderId, equippedRelic: a.equippedRelic, x: a.x, z: a.z, homeX: p.homeX, homeZ: p.homeZ,
      troops: a.troops, mythic: a.mythic, health: Math.ceil(a.health), recovery: a.recovery, rage: Math.floor(a.rage), shield: Math.ceil(a.shield), lastSkill: a.lastSkill, skillCasts: a.skillCasts,
      state: a.state, hasOrder: !!a.target, targetId: a.target?.id ?? '', targetX: destination?.x ?? a.x, targetZ: destination?.z ?? a.z, ...this.stats(a) };
  }
  snapshot(viewerId = null) {
    const snapshot = { version: 9, ...campaignSnapshot(this, viewerId), chatMessages: this.messages.filter(m => !viewerId || m.channel === 'kingdom' || (m.allianceId && m.allianceId === this.players.get(viewerId)?.allianceId)), markers: this.markers.filter(m => !viewerId || m.allianceId === this.players.get(viewerId)?.allianceId), troopTypes: TROOP_TYPES, ages: AGES, armies: this.armies().map(a => this.armySnapshot(a)), summonRules: SUMMON_RULES, relics: RELICS, trades: TRADES, size: SIZE, time: this.time,
      players: [...this.players.values()].map(p => {
        const { lastSeen, target, cooldown, gatherClock, slot, marches, ...visible } = p;
        if (viewerId && viewerId !== p.id) {
          const ally = p.allianceId && this.players.get(viewerId)?.allianceId === p.allianceId;
          const visibleJob = job => ally && job ? { id: job.id, type: job.type, remaining: job.remaining, duration: job.duration } : null;
          return { id: p.id, name: p.name, civilization: p.civilization, allianceId: p.allianceId, allianceRole: allianceRole(this, p), x: p.x, z: p.z, homeX: p.homeX, homeZ: p.homeZ, cityLevel: p.cityLevel, ageName: age(p).name, construction: visibleJob(p.construction), secondConstruction: visibleJob(p.secondConstruction), research: visibleJob(p.research) };
        }
        return { ...visible, ...warSnapshot(this, p), groupReports: groupReports(this, p), allianceRole: allianceRole(this, p), ...citySnapshot(this, p), ...this.stats(p), health: Math.ceil(p.health), hasOrder: !!target, targetId: target?.id ?? '', targetX: target?.x ?? p.x, targetZ: target?.z ?? p.z };
      }), camps: this.camps.map(({ contributors, ...camp }) => ({ ...camp, respawn: Math.ceil(camp.respawn) })),
      nodes: this.nodes.map(n => ({ ...n })), sites: this.sites.map(s => ({ ...s })), flags: this.flags.map(f => ({ ...f })),
      alliances: [...this.alliances.values()].map(a => ({ ...a, members: [...this.players.values()].filter(p => p.allianceId === a.id).length })),
      commanders: COMMANDERS.map(c => ({ ...c, skillKind: activeKind(c.id) })), civilizations: CIVILIZATIONS, events: this.events.map(e => ({ ...e })) };
    return viewerId && this.players.has(viewerId) ? filterFog(this, snapshot, this.players.get(viewerId)) : snapshot;
  }
}
