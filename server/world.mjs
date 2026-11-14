import { ECONOMY, initializeEconomy, refreshEconomy, economySnapshot, economyCommand, validateEconomy, migrateEconomy, campAdmission, economyTime } from './economy.mjs';
import { initializeLogistics, validateLogistics, activeMarches, cargoTotal, carryCapacity, gatherCargo, returnCargo, loseCargo, dock, unifiedReports, coreReport } from './field-logistics.mjs';
import { validateDiscovery } from './discovery.mjs';
import { initializeInventory, validateInventory, inventoryCommand, inventorySnapshot } from './inventory.mjs';
import { powerOf, rankings } from './power.mjs';
import { initializeKingdom, tickKingdom, siteIsOpen, recordKingdomVictory, kingdomCommand, kingdomSnapshot, validateKingdom } from './kingdom.mjs';
import { activityClock, initializeActivity, ensureActivity, recordActivity, activityCommand, activitySnapshot, validateActivity, emptyLogin } from './activity.mjs';
import { ensureEvents, recordEvent, eventSnapshot, eventCommand, validateEvents } from './events.mjs';
import { ensureDiplomacy, diplomacyCommand, diplomacySnapshot, validateDiplomacy, coalitionCommand, coalitionSnapshot, validateCoalitions, coalitionOf } from './diplomacy.mjs';
import { ensureSeason, seasonSnapshot, validateSeason, seasonCommand } from './season.mjs';
import { createStrongholds, tickStrongholds, STRONGHOLD_RULES, validateStrongholds } from './strongholds.mjs';
import { initializeJourney, refreshJourney, journeyMetric, journeyCommand, journeySnapshot, validateJourney, legacyHeroReward } from './chapters.mjs';
import { route, travel } from './navigation.mjs';
import { initializeExploration, migrateScouting, explorationTick, explorationCommand, filterFog, visible, visionContext, validateExploration } from './exploration.mjs';
import { initializeFindings, validateFindings, findingCommand } from './findings.mjs';
import { initializeRecon, validateRecon } from './recon.mjs';
import { campaignCommand, campaignFor, campaignDestination, tickCampaign, campaignSnapshot, groupReports, initializeCampaign, initializeFortification, restoreCampaign, territoryNear, reconcileCampaign } from './campaign.mjs';
import { socialCommand, allianceRole, allianceRoster, initializeSocial, validateSocial } from './social.mjs';
import { initializeWar, warCommand, tickBattle, finishBattle, attackReason, combatFor, tickHospital, warSnapshot, wardTroops, wardMythic, validateWar, validateReport } from './war.mjs';
import { TROOP_TYPES, FORMATION, legacyUnits, migrateUnits, validateUnits, troopBase, classCounts, countOf, changeUnits, tierLock, promotionCost, sourceType, trainingBatch, batchCost, formationOf, trainingSpeed } from './troops.mjs';
import { randomUUID, randomInt } from 'node:crypto';
import { resourceNodes, RELICS, ARMAMENTS, SUMMON_RULES, TRADES, RESOURCES, TECHNOLOGIES } from './city-content.mjs';
import { marchCommand } from './marches.mjs';
import { AGES, age, crews, armyList, constructionJobs, totalTroops, totalMythic, ensureHero, heroLevel, activeKind, initializeProgression, skillModifiers, activeSkill, progressionCommand, validateProgression } from './progression.mjs';
import { initializeCity, capacity, mythicCapacity, cityCommand, citySnapshot, tickCity, validateCity, ensureArmaments, armamentFactor } from './city.mjs';
import { SIZE, CIVILIZATIONS, COMMANDERS, campDefinitions, siteDefinitions } from './content.mjs';
export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const secureRandom = () => randomInt(1_000_000) / 1_000_000;
const rosters = new WeakMap();
const routeCache = new WeakMap();
function cachedRoute(world, army, destination, returning) {
  const key = (world.gateEpoch || 0) + '|' + army.x + '|' + army.z + '|' + (destination.id || '') + '|' + destination.x + '|' + destination.z + '|' + (returning ? 1 : 0);
  const box = routeCache.get(army);
  if (box?.key === key) return box.path;
  const path = route(world, army, destination, returning);
  routeCache.set(army, { key, path });
  return path;
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const finitePoint = p => [p.x, p.z].every(n => Number.isFinite(n) && n >= 1 && n <= SIZE - 1);
export class World {
  constructor({ random = secureRandom, now = () => Date.now() } = {}) {
    this.random = random; this.now = now; this.activityClockMs = 0; activityClock(this);
    this.chooseIndex = length => this.random === secureRandom ? randomInt(length) : Math.floor(this.random() * length);
    this.strongholds = createStrongholds(); this.rallies = []; this.garrisons = []; this.sieges = []; this.messages = []; this.markers = []; this.battles = new Map(); this.players = new Map(); this.sessions = new Map(); this.alliances = new Map();
    this.time = 0; this.events = []; this.diplomacy = { proposals: [], pacts: [] }; this.coalitions = []; this.coalitionInvites = []; this.logisticsRevision=0;
    this.camps = campDefinitions.map(([id, name, level, x, z]) => ({ id, name, level, x, z,
      health: 100 * level, maxHealth: 100 * level, respawn: 0, contributors: {}, cycle:1 }));
    this.nodes = Array.from({ length: 12 }, (_, i) => ({ id: `resource-${i}`, name: ['Sacred Grove', 'Golden Vein', 'Harvest Fields'][i % 3],
      resource: ['wood', 'gold', 'food'][i % 3], x: 8 + (i % 4) * 8, z: 18 + Math.floor(i / 4) * 8, remaining: 600, capacity: 600, refill: 0 }));
    this.nodes[0].x = 8; this.nodes[0].z = 12;
    this.nodes[2].x = 12; this.nodes[2].z = 10;
    this.nodes.push(...resourceNodes.map(n => ({ ...n })));
    this.sites = siteDefinitions.map(s => ({ ...s, allianceId: '', challengerId: '', progress: 0 }));
    this.flags = []; for (const site of this.sites) initializeFortification(site, site.kind); initializeKingdom(this);
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
    initializeCity(player); initializeInventory(player); initializeProgression(player); migrateUnits(player); initializeWar(player); initializeSocial(player); player.groupReports = []; initializeExploration(player); initializeFindings(player); initializeRecon(player); initializeJourney(player); player.strongholdVictories = 0; initializeActivity(this, player); ensureEvents(this, player); player.kingdomClaims = [];
    initializeEconomy(this,player);initializeLogistics(player);player.health = this.stats(player).maxHealth;
    this.players.set(id, player); this.sessions.set(token, id); this.noteRoster(); refreshJourney(this, player);explorationTick(this,0);
    this.event(`${player.name} founded a ${civilization} city.`);
    return { playerId: id, token };
  }
  authenticate(token) {
    const id = this.sessions.get(token);
    if (!id || !this.players.has(id)) throw new GameError('Session expired. Join the world again.', 401);
    return this.players.get(id);
  }
  owner(a) { return this.players.get(a.ownerId || a.id) ?? a; }
  noteRoster() { this.rosterGeneration = (this.rosterGeneration || 0) + 1; }
  armies() {
    const generation = this.rosterGeneration || 0;
    let roster = rosters.get(this);
    if (!roster || roster.generation !== generation) {
      const list = []; const byId = new Map();
      for (const player of this.players.values()) for (const army of armyList(player)) { list.push(army); byId.set(army.id, army); }
      roster = { generation, list, byId }; rosters.set(this, roster);
    }
    return roster.list;
  }
  army(id) {
    this.armies();
    return rosters.get(this).byId.get(id);
  }
  stats(a) {
    const cached = this._statsTick?.get(a);
    if (cached) return cached;
    const value = this._stats(a);
    if (this._statsTick) this._statsTick.set(a, value);
    return value;
  }
  invalidateStats(a) { this._statsTick?.delete(a); }
  _stats(a) {
    const p = this.owner(a), r = ensureHero(p, a.commanderId);
    const civ = CIVILIZATIONS.find(c => c.id === p.civilization), commander = COMMANDERS.find(c => c.id === a.commanderId);
    const rank = p.commanderRanks[a.commanderId] ?? 0;
    const relic = RELICS.find(r => r.id === a.equippedRelic) ?? { damage: 1, health: 1 };
    const skill = skillModifiers(p, a), level = heroLevel(r), base = troopBase(a);
    const gear = armamentFactor(p, a.commanderId);
    const companionId = a.secondaryCommanderId || '';
    const companionGear = companionId ? armamentFactor(p, companionId) : { damage: 1, health: 1, speed: 1, pve: 1 };
    const companion = companionId && p.ownedCommanders?.includes(companionId) ? 1 + 0.01 * heroLevel(ensureHero(p, companionId)) : 1;
    const owns = id => !!p.allianceId && this.sites.some(s => s.id === id && s.allianceId === p.allianceId);
    const formation = formationOf(a.units);
    return { level, maxHealth: Math.round((base.health + a.mythic * 35) * civ.health * commander.health * (1 + 0.05 * p.technologies.vitality) * (1 + 0.02 * rank) * relic.health * skill.health * gear.health * companionGear.health * companion * formation.appliedHealth),
      damage: (base.damage + a.mythic * 12 * (1 + 0.1 * p.technologies.beastlore)) * (1 + 0.05 * p.technologies.drill) * (1 + 0.03 * rank) * relic.damage * civ.damage * commander.damage * (1 + (level - 1) * 0.03) * (owns('shrine-dawn') ? 1.1 : 1) * skill.damage * gear.damage * companionGear.damage * companion * (p.buffs?.attack>economyTime(this)?1+ECONOMY.buffPercent:1),
      speed: 4 * base.speed * civ.speed * commander.speed * (1 + 0.04 * p.technologies.march) * skill.speed * gear.speed * companionGear.speed,
      heal: 12 * civ.healing * (1 + 0.15 * Math.max(0, p.buildings.infirmary - 1)) * (owns('shrine-life') ? 1.25 : 1) * skill.heal,
      gather: civ.gathering * commander.gather * (1 + 0.08 * p.technologies.logistics) * (owns('first-sanctuary') ? 1.2 : 1) * skill.gather,
      pve: skill.pve * gear.pve * companionGear.pve, mitigation:1-(1-skill.mitigation)*(p.buffs?.defense>economyTime(this)?1-ECONOMY.buffPercent:1) };
  }
  atHome(p) { return distance(p, { x: p.homeX, z: p.homeZ }) < 2; }
  requireHome(p) { if (!this.atHome(p) || p.target) throw new GameError('Return your army home and stop before changing its composition or commander.'); }
  spend(p, cost) {
    if (Object.entries(cost).some(([key, value]) => p[key] < value)) throw new GameError('Not enough resources.');
    for (const [key, value] of Object.entries(cost)) p[key] -= value;
  }
  canEnter(p, destination) {
    p = this.owner(p);
    const owns = id => !!p.allianceId && this.sites.find(s => s.id === id).allianceId === p.allianceId && siteIsOpen(this,id);
    return (destination.x <= 40 || owns('gate-east')) && (destination.z <= 40 || owns('gate-north'));
  }
  normalizeDeployment(){for(const a of this.armies())if(a.target||!this.atHome(a))a.deployed=true;}
  command(p, c) {
    if(!c||typeof c!=='object')throw new GameError('Invalid command.');
    this.noteRoster();
    this.normalizeDeployment();
    refreshEconomy(this,p);
    if(economyCommand(this,p,c,message=>{throw new GameError(message);}))return;
    if(inventoryCommand(this,p,c,message=>{throw new GameError(message);}))return;
    ensureActivity(this,p);tickKingdom(this);
    const actor=armyList(p).find(a=>a.id===(c.marchId||p.id));
    const field=['move','attack','gather','capture','attack-player','rally-create','rally-join','garrison-join'];
    if(actor&&!actor.deployed&&field.includes(c.type)&&activeMarches(p).length>=age(p).marches)throw new GameError('All deployment slots are in use. Return a march first.');
    const formerAlliance=p.allianceId;
    const result=this.applyCommand(p,c);
    if(actor&&(actor.target||campaignFor(this,actor.id)))actor.deployed=true;
    for(const a of armyList(p))if(!campaignFor(this,a.id))dock(this,a);
    if(['alliance-create','alliance-join','alliance-leave','alliance-kick','alliance-promote','alliance-demote','alliance-transfer','kingdom-claim'].includes(c.type)){const report={id:randomUUID(),type:c.type.startsWith('alliance-')?'alliance':'system',title:c.type.replaceAll('-',' '),detail:p.name+' · '+(c.name||this.players.get(c.targetId)?.name||c.targetId||'')};for(const recipient of this.players.values())if(recipient.id===p.id||report.type==='alliance'&&((formerAlliance&&recipient.allianceId===formerAlliance)||(p.allianceId&&recipient.allianceId===p.allianceId)||recipient.id===c.targetId))coreReport(this,recipient,report);}
    explorationTick(this,0);
    if(c.type==='alliance-help')recordActivity(this,p,'helps',1);
    if(c.type==='temple-offering')recordActivity(this,p,'offering',1);
    refreshJourney(this, p);tickKingdom(this); return result;
  }
  applyCommand(p, c) {
    if (!c || typeof c !== 'object') throw new GameError('Invalid command.');
    const fail = message => { throw new GameError(message); };
    if (kingdomCommand(this, p, c, fail) || eventCommand(this, p, c, fail) || diplomacyCommand(this, p, c, fail) || coalitionCommand(this, p, c, fail) || seasonCommand(this, p, c, fail) || activityCommand(this, p, c, fail) || journeyCommand(this, p, c, fail) || findingCommand(this, p, c, fail) || explorationCommand(this, p, c, fail) || campaignCommand(this, p, c, fail) || socialCommand(this, p, c, fail) || warCommand(this, p, c, fail) || marchCommand(this, p, c, fail) || progressionCommand(this, p, c, fail) || cityCommand(this, p, c, fail)) { reconcileCampaign(this); return; }
    switch (c.type) {
      case 'promote': case 'train': {
        if (p.trainingQueue.length >= 3) throw new GameError('Training queue is full (three orders).');
        const queued = p.trainingQueue.filter(j => ['train','promote'].includes(j.type)).reduce((total, j) => total + j.amount, 0);
        const promoting=c.type==='promote';
        const amount=promoting?5:trainingBatch(p);
        if (totalTroops(p) + p.reserveTroops + wardTroops(p) + queued + (promoting?0:amount) > capacity(p)) throw new GameError('Troop capacity reached. Upgrade your city.');
        const type = TROOP_TYPES.find(t => t.id === (c.targetId || 'infantry'));
        if (!type) throw new GameError('Choose a valid troop type.');
        const locked=tierLock(p,type);if(locked)throw new GameError(locked);
        const source=sourceType(type);
        if(promoting&&(!source||countOf(p.reserveUnits,source.id)<5))throw new GameError('Promotion requires five ready reserves of the previous tier.');
        const cost=batchCost(promoting?promotionCost(type):type.cost, amount);
        this.spend(p,cost);
        if(promoting){changeUnits(p.reserveUnits,source.id,-5);p.reserveTroops-=5;}
        const baseDuration=promoting?type.duration-source.duration:type.duration;
        const job = this.job(promoting?'promote':'train', baseDuration * (promoting?1:amount/5) / trainingSpeed(p), { ...cost }, amount);
        job.targetId = type.id;if(promoting)job.sourceId=source.id; p.trainingQueue.push(job); return;
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
        if(job.type==='promote'){changeUnits(p.reserveUnits,job.sourceId,job.amount);p.reserveTroops+=job.amount;}
        for (const [resource, amount] of Object.entries(job.cost)) p[resource] += amount;
        return;
      }
      case 'quest': legacyHeroReward(p, fail); return;
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
    this.noteRoster();
    Object.defineProperty(this, '_statsTick', { value: new Map(), writable: true, enumerable: false, configurable: true });
    try { this._tick(dt); }
    finally { this._statsTick = null; }
  }
  _tick(dt) {
    activityClock(this);ensureDiplomacy(this);ensureSeason(this);const beforeMovement=new Map(this.armies().map(a=>[a.id,{x:a.x,z:a.z}]));
    dt = Math.min(dt, 0.25); this.time += dt; this.markers = this.markers.filter(m => m.expires > this.time);
    for (const camp of this.camps) if (camp.health <= 0) {
      camp.respawn = Math.max(0, camp.respawn - dt);
      if (camp.respawn === 0) { camp.cycle++;camp.health = camp.maxHealth; camp.contributors = {}; }
    }
    for (const node of this.nodes) if (node.remaining <= 0) {
      node.refill += dt; if (node.refill >= 30) { node.remaining = node.capacity; node.refill = 0; }
    }
    for (const owner of this.players.values()) {refreshEconomy(this,owner);this.cityTick(owner, dt);}
    for (const p of this.armies()) {
      if(p.target)p.deployed=true;
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
      if(target.type==='gather'&&(!destination||visible(this,owner,destination)&&destination.remaining<=0)){returnCargo(this,p,'Deposit exhausted');continue;}
      if (!destination || (target.type === 'attack' && visible(this, owner, destination) && destination.health <= 0)) { p.target = null; p.state = 'Target unavailable'; continue; }
      // Ownership can change while an army is marching. Returning home always remains possible.
      if (target.type !== 'return' && !route(this, p, destination)) { p.target = null; p.state = 'Route locked'; continue; }
      const stop = ['move', 'return'].includes(target.type) ? 0 : 2;
      travel(this, p, destination, stats.speed, dt, stop, target.type === 'return');
      if (distance(p, destination) > stop + 0.0001) continue;
      if (target.type === 'move' || target.type === 'return') { p.target = null; p.state = 'Idle'; }
      if (target.type === 'pvp') tickBattle(this, p, destination);
      if (target.type === 'attack' && p.cooldown === 0) this.battle(p, destination, stats);
      if(target.type==='gather')gatherCargo(this,p,destination,dt);
    }
    tickCampaign(this, dt); tickStrongholds(this, dt);
    for(const a of this.armies())if(!campaignFor(this,a.id)){dock(this,a);if(a.deployed&&!a.target&&cargoTotal(a)>=carryCapacity(this,a)&&cargoTotal(a)>0&&!combatFor(this,a.id))returnCargo(this,a,'Capacity reached');}
    for (const site of this.sites) this.captureTick(site, dt);
    this._statsTick?.clear();
    for(const a of this.armies()){const previous=beforeMovement.get(a.id);if(previous&&a.recovery<=0){const moved=distance(a,previous);if(moved<=this.stats(a).speed*dt+0.001)recordActivity(this,this.owner(a),'distance',moved);}}
    explorationTick(this, dt);
    for (const p of this.players.values()) refreshJourney(this, p); tickKingdom(this);
  }
  battle(a, camp, stats) {
    if(!campAdmission(this,this.owner(a),camp)){a.target=null;a.state='Not enough AP';return;}
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
      recordKingdomVictory(this,'camps');
      camp.respawn = 45;
      const participants = Object.keys(camp.contributors).map(id => this.army(id)).filter(Boolean);
      const owners = [...new Set(participants.map(actor => this.owner(actor).id))].map(id => this.players.get(id));
      for (const member of owners) {
        member.gold += Math.floor(50 * camp.level / owners.length); member.food += Math.floor(30 * camp.level / owners.length);
        member.stone += 20 * camp.level; member.mana += 5 * camp.level; member.sigils++; member.kills++; recordActivity(this,member,'camps',1,camp.id+':'+camp.cycle); recordEvent(this,member,'camps',1,camp.id+':'+camp.cycle);
        const ownArmies = participants.filter(actor => this.owner(actor).id === member.id);
        coreReport(this,member,{id:randomUUID(),type:'pve',title:camp.name+' · Victory',outcome:'Victory',detail:'Level '+camp.level+' camp defeated. Earned 1 Oracle Sigil and '+(25*camp.level)+' commander XP shared among participating marches.\n'+ownArmies.map(actor=>{const u=classCounts(actor.units);return actor.commanderId+' · '+u.infantry+' infantry / '+u.archers+' archers / '+u.cavalry+' cavalry / '+actor.mythic+' mythic at outcome · '+Math.ceil(actor.health)+' HP remaining · '+camp.contributors[actor.id]+' damage dealt';}).join('\n'),resources:{food:Math.floor(30*camp.level/owners.length),gold:Math.floor(50*camp.level/owners.length),stone:20*camp.level,mana:5*camp.level,wood:0}});
        for (const actor of ownArmies) {
          const record = ensureHero(member, actor.commanderId);
          const gained = 25 * camp.level / ownArmies.length;
          record.xp += gained; actor.xp = record.xp; actor.level = heroLevel(record);
          if (actor.secondaryCommanderId) { const companion = ensureHero(member, actor.secondaryCommanderId); companion.xp += Math.floor(gained / 2); }
        }
      }
      this.event(`${p.name} defeated ${camp.name} (level ${camp.level}).`); a.target = null; a.state = 'Victorious';
    } else {
      const hit = 8 * camp.level * (1 - stats.mitigation), absorbed = Math.min(a.shield, hit);
      a.shield -= absorbed; a.health = Math.max(0, a.health - (hit - absorbed));
      if (a.health === 0) {
        coreReport(this,p,{id:randomUUID(),type:'pve',title:camp.name+' · Defeat',outcome:'Defeat',detail:'Survivors are recovering at home.'});
        loseCargo(this,a);a.deployed=false;a.x = p.homeX; a.z = p.homeZ; a.target = null; a.recovery = 8; a.health = 1; a.rage = 0; a.shield = 0; a.state = 'Recovering';
        this.event(`${p.name}'s march retreated home after defeat.`);
      }
    }
  }
  captureTick(site, dt) {
    if (!siteIsOpen(this, site.id)) { for (const a of this.armies()) if (a.target?.type==='capture'&&a.target.id===site.id) { a.target=null;a.state='Kingdom stage locked'; } return; }
    const contenders = new Set(this.armies().filter(p => p.target?.type === 'capture' && p.target.id === site.id && p.health > 0 && p.recovery === 0 && distance(p, site) <= 2.001 && this.owner(p).allianceId && this.canEnter(p, site) && (!site.allianceId || site.allianceId === this.owner(p).allianceId) && territoryNear(this, this.owner(p).allianceId, site)).map(p => this.owner(p).allianceId));
    if (contenders.size !== 1) { if (contenders.size === 0) site.progress = Math.max(0, site.progress - dt); return; }
    const allianceId = [...contenders][0];
    if (site.allianceId === allianceId) { site.progress = Math.max(0, site.progress - dt); return; }
    if (site.challengerId !== allianceId) { site.progress = 0; site.challengerId = allianceId; }
    site.progress += dt;
    if (site.progress >= 15) {
      site.allianceId = allianceId; site.progress = 0; site.challengerId = ''; this.gateEpoch = (this.gateEpoch || 0) + 1;
      this.event(`${this.alliances.get(allianceId).name} captured ${site.name}.`);
      for (const p of this.armies()) if (p.target?.id === site.id && p.target.type === 'capture') { p.target = null; p.state = 'Idle'; }
    }
  }
  job(type, duration, cost, amount) {
    return { id: randomUUID(), type, duration, remaining: duration, cost, amount };
  }
  cityTick(p, dt, options = {}) {
    tickCity(this, p, dt, options); tickHospital(this, p, dt);
    // One training lane: excess time carries into the next paid order.
    let remaining = dt;
    while (remaining > 0 && p.trainingQueue.length) {
      const job = p.trainingQueue[0];
      const spent = Math.min(remaining, job.remaining); job.remaining -= spent; remaining -= spent;
      if (job.remaining > 0.00001) break;
      if (['train','promote'].includes(job.type)) { p.reserveTroops += job.amount; changeUnits(p.reserveUnits,job.targetId,job.amount);if(job.type==='train'){journeyMetric(p,'trained',job.amount);recordActivity(this,p,'trained',job.amount,job.id);} }
      else p.reserveMythic += job.amount;
      p.trainingQueue.shift();
      const trained = TROOP_TYPES.find(t => t.id === job.targetId);
      this.event(`${p.name}: ${['train','promote'].includes(job.type) ? job.amount + ' ' + (trained?.name ?? 'troops') : 'a mythic recruit'} ready in city reserves.`);
    }
  }
  expire(now) {
    // Saved cities and their alliance territory are never deleted for inactivity.
    for (const p of this.players.values()) if (!p.offline && now - p.lastSeen > 30 * 60_000) {
      p.offline = true; // Connection presence does not cancel accepted field orders.
    }
  }
  toSave() {
    this.normalizeDeployment();
    ensureSeason(this);
    return { schema: 25, world: { kingdom: this.kingdom, diplomacy: this.diplomacy, coalitions: this.coalitions, coalitionInvites: this.coalitionInvites, season: this.season, activityClockMs: this.activityClockMs, players: [...this.players.values()], sessions: [...this.sessions.entries()],
      alliances: [...this.alliances.values()], camps: this.camps, nodes: this.nodes, sites: this.sites,
      flags: this.flags, strongholds: this.strongholds, rallies: this.rallies, garrisons: this.garrisons, sieges: this.sieges, messages: this.messages, markers: this.markers, battles: [...this.battles.values()], time: this.time, events: this.events } };
  }
  static fromSave(data, options = {}) {
    if(data?.schema<15)data=migrateEconomy(data);
    const w = structuredClone(data?.world);
    if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].includes(data?.schema) || !w || !['players', 'sessions', 'alliances', 'camps', 'nodes', 'sites', 'flags', 'events'].every(k => Array.isArray(w[k]))) throw new Error('Unsupported or damaged save format.');
    if (w.players.length > 32 || !Number.isFinite(w.time) || w.time < 0) throw new Error('Invalid saved world.');
    const world = new World(options);
    if (data.schema >= 10) {if(!Number.isSafeInteger(w.activityClockMs)||w.activityClockMs<0)throw new Error('Invalid saved activity clock.');world.activityClockMs = w.activityClockMs;}
    if (data.schema === 1) for (const node of resourceNodes) if (!w.nodes.some(n => n.id === node.id)) w.nodes.push({ ...node });
    const resumedOrders=new Map();
    for (const p of w.players) {
      if (data.schema < 3 && p) { initializeCity(p, true); initializeProgression(p); }
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || world.players.has(p.id) || !CIVILIZATIONS.some(c => c.id === p.civilization) || !COMMANDERS.some(c => c.id === p.commanderId)) throw new Error('Invalid saved city.');
      if (!['gold', 'wood', 'food', 'troops', 'mythic', 'reserveTroops', 'reserveMythic', 'health', 'xp', 'recovery', 'cooldown', 'gatherClock'].every(k => Number.isFinite(p[k]) && p[k] >= 0) || !finitePoint(p) || !finitePoint({ x: p.homeX, z: p.homeZ }) || !Number.isInteger(p.cityLevel) || p.cityLevel < 1 || p.cityLevel > 5) throw new Error('Invalid saved city values.');
      if (!Number.isInteger(p.slot) || p.slot < 0 || p.slot >= 32 || !Number.isInteger(p.level) || p.level < 1 || !Number.isInteger(p.kills) || p.kills < 0 || !Array.isArray(p.ownedCommanders) || !p.ownedCommanders.includes(p.commanderId) || p.ownedCommanders.some(id => !COMMANDERS.some(c => c.id === id)) || !Array.isArray(p.trainingQueue) || p.trainingQueue.length > 3) throw new Error('Invalid saved roster or queue.');
      if (data.schema < 4) migrateUnits(p);
      if (data.schema < 5) { initializeWar(p); initializeSocial(p); }
      if (data.schema < 16) { p.buildings ??= {}; if (!Number.isInteger(p.buildings.scoutcamp)) p.buildings.scoutcamp = 1; }
      if (data.schema < 7) initializeExploration(p); else { if (data.schema < 16) migrateScouting(p); for (const s of p.scouts ?? []) { if (typeof s.investigationId !== 'string') s.investigationId = ''; if (s.recon === undefined) s.recon = null; if (!Number.isFinite(s.watchSeconds)) s.watchSeconds = 0; } validateExploration(p); }
      if (data.schema < 17) initializeFindings(p); else validateFindings(p);
      if (data.schema < 18) initializeRecon(p); else validateRecon(p);
      if (data.schema < 19) ensureArmaments(p);
      p.technologies ??= {};
      for (const tech of TECHNOLOGIES) {
        const value = p.technologies[tech.id];
        if (value === undefined) p.technologies[tech.id] = 0;
        else if (!Number.isInteger(value)) throw new Error('Invalid saved city progression.');
      }
      if (data.schema < 8) initializeJourney(p, true); else validateJourney(p);
      if (data.schema < 9) p.strongholdVictories = 0;
      if (!Number.isSafeInteger(p.strongholdVictories) || p.strongholdVictories < 0) throw new Error('Invalid saved stronghold victories.');
      if(data.schema<12)initializeInventory(p);
      if(data.schema<13)p.technologies.veterans=0;
      if(data.schema<20)for(const id of ['columns','bulwarks','titanhost'])p.technologies[id]??=0;
      if(data.schema<21)p.loginStreak=emptyLogin();
      if(data.schema<14){initializeLogistics(p,true);p.discovery=[];}else {validateLogistics(p);validateDiscovery(p);}
      for(const a of armyList(p))if(data.schema>=14&&a.target)resumedOrders.set(a.id,structuredClone(a.target));
      if(p.discovery.some(r=>r.observedAt>w.time)||p.coreReports.some(r=>r.time>w.time)||armyList(p).some(a=>a.cargoStarted>w.time))throw new Error('Invalid saved logistics observation time.');
      if(data.schema<15)initializeEconomy(world,p);validateEconomy(world,p);
      validateInventory(p);
      validateCity(p); validateProgression(p); validateUnits(p); validateWar(p);
      for (const job of [...constructionJobs(p), p.research, p.crafting, ...p.trainingQueue].filter(Boolean)) {
        if (!['upgrade', 'building', 'research', 'craft', 'train', 'promote', 'recruit'].includes(job.type) || typeof job.id !== 'string' || !Number.isFinite(job.remaining) || job.remaining < 0 || !Number.isFinite(job.duration) || job.duration <= 0 || job.remaining > job.duration || !Number.isInteger(job.amount) || job.amount < 1 || !job.cost || Object.entries(job.cost).some(([k, v]) => !RESOURCES.includes(k) || !Number.isFinite(v) || v < 0)) throw new Error('Invalid saved queue.');
      }
      if (constructionJobs(p).some(job => !['upgrade', 'building'].includes(job.type)) || (p.research && p.research.type !== 'research') || (p.crafting && p.crafting.type !== 'craft') || p.trainingQueue.some(job => !['train', 'promote', 'recruit'].includes(job.type))) throw new Error('Invalid saved queue lane.');
      const ids = new Set([p.id]), commanders = new Set([p.commanderId]);
      p.secondaryCommanderId ??= '';
      if (p.secondaryCommanderId) {
        if (p.secondaryCommanderId === p.commanderId || !p.ownedCommanders.includes(p.secondaryCommanderId)) throw new Error('Invalid saved companion.');
        commanders.add(p.secondaryCommanderId);
      }
      for (const a of p.marches) {
        if (!a || typeof a.id !== 'string' || ids.has(a.id) || a.ownerId !== p.id || !p.ownedCommanders.includes(a.commanderId) || commanders.has(a.commanderId) || !finitePoint(a) || ['troops', 'mythic', 'health', 'recovery', 'cooldown', 'gatherClock', 'rage', 'shield', 'shieldTime'].some(key => !Number.isFinite(a[key]) || a[key] < 0) || a.homeX !== p.homeX || a.homeZ !== p.homeZ) throw new Error('Invalid saved march.');
        ids.add(a.id); commanders.add(a.commanderId); a.secondaryCommanderId ??= '';
        if (a.secondaryCommanderId) {
          if (a.secondaryCommanderId === a.commanderId || !p.ownedCommanders.includes(a.secondaryCommanderId) || commanders.has(a.secondaryCommanderId)) throw new Error('Invalid saved companion.');
          commanders.add(a.secondaryCommanderId);
        }
        a.target = null; a.rage = 0; a.shield = 0; a.shieldTime = 0; a.state = 'Paused';
      }
      const assignedRelics = [];
      for (const a of armyList(p)) {
        a.equippedRelic ??= '';
        if (typeof a.equippedRelic !== 'string' || (a.equippedRelic && (!p.ownedRelics.includes(a.equippedRelic) || !RELICS.some(r => r.id === a.equippedRelic)))) throw new Error('Invalid saved relic assignment.');
        if (a.equippedRelic) assignedRelics.push(a.equippedRelic);
      }
      if (new Set(assignedRelics).size !== assignedRelics.length) throw new Error('Invalid saved relic assignment.');
      if (new Set(constructionJobs(p).map(job => job.targetId || 'citadel')).size !== constructionJobs(p).length) throw new Error('Duplicate saved building upgrade.');
      if (activeMarches(p).length > age(p).marches || (p.secondConstruction && crews(p) < 2)) throw new Error('Invalid saved age unlock.');
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
      if (data.schema < 10) delete a.weekly;
      world.alliances.set(a.id, a);
    }
    if (w.players.some(p => p.allianceId && !world.alliances.has(p.allianceId))) throw new Error('Invalid saved alliance membership.');
    for (const [key, metrics] of [['camps', ['x', 'z', 'health', 'maxHealth', 'respawn']], ['nodes', ['x', 'z', 'remaining', 'capacity', 'refill']], ['sites', ['x', 'z', 'progress']]]) {
      if (w[key].length !== world[key].length || new Set(w[key].map(item => item.id)).size !== world[key].length || w[key].some(item => !world[key].some(base => base.id === item.id) || !metrics.every(k => Number.isFinite(item[k]) && item[k] >= 0))) throw new Error('Invalid saved map.');
      if (key === 'camps' && w.camps.some(c => !c.contributors || typeof c.contributors !== 'object' || Object.values(c.contributors).some(amount => !Number.isFinite(amount) || amount < 0))) throw new Error('Invalid saved battle state.');
      if(key==='camps'&&w.camps.some(c=>!Number.isSafeInteger(c.cycle)||c.cycle<1))throw new Error('Invalid saved camp generation.');
      world[key] = w[key];
    }
    if(data.schema>=15&&[...world.players.values()].some(p=>Object.entries(p.campPasses).some(([id,cycle])=>cycle>world.camps.find(c=>c.id===id).cycle)))throw new Error('Invalid saved PvE generation entitlement.');
    if(data.schema<15)for(const camp of world.camps)for(const [id,amount]of Object.entries(camp.contributors)){const a=world.army(id);if(a&&amount>0)world.owner(a).campPasses[camp.id]=camp.cycle;}
    if (w.sites.some(s => s.allianceId && !world.alliances.has(s.allianceId)) || w.flags.some(f => !finitePoint(f) || !world.alliances.has(f.allianceId))) throw new Error('Invalid saved territory.');
    if (data.schema < 8) for (const id of ['resource-0', 'resource-2']) { const node = world.nodes.find(n => n.id === id); node.x = id === 'resource-0' ? 8 : 12; node.z = id === 'resource-0' ? 12 : 10; }
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
    world.messages = data.schema >= 5 ? w.messages : []; world.markers = data.schema >= 5 ? w.markers : [];
    if (data.schema >= 24) { world.coalitions = w.coalitions; world.coalitionInvites = w.coalitionInvites; validateCoalitions(world); } else { world.coalitions = []; world.coalitionInvites = []; }
    validateSocial(world);
    if (data.schema >= 9) world.strongholds = validateStrongholds(w.strongholds);
    if (data.schema < 6) initializeCampaign(world); else restoreCampaign(world, w);
    if (data.schema >= 10) validateActivity(world); else for (const p of world.players.values()) initializeActivity(world, p);
    if (data.schema < 22) for (const p of world.players.values()) delete p.events;
    if (data.schema >= 22) validateEvents(world, w.activityClockMs);
    if (data.schema >= 23) { world.diplomacy = w.diplomacy; validateDiplomacy(world); } else world.diplomacy = { proposals: [], pacts: [] };
    if (data.schema >= 25 && w.season) { world.season = w.season; validateSeason(world); } else world.season = null;
    for (const p of world.players.values()) ensureEvents(world, p);
    if (data.schema < 11) initializeKingdom(world, true); else { world.kingdom = w.kingdom; validateKingdom(world); }
    for(const a of world.armies()){
      const order=resumedOrders.get(a.id);
      if(data.schema>=14&&order&&!campaignFor(world,a.id)&&a.recovery<=0){
        if(!['move','gather','return','attack','pvp','capture','siege','rally','garrison'].includes(order.type))throw new Error('Invalid saved field order.');
        if(['move','return'].includes(order.type)&&!finitePoint(order))throw new Error('Invalid saved field destination.');
        if(order.type==='return'&&(order.x!==a.homeX||order.z!==a.homeZ))throw new Error('Invalid saved home destination.');
        if(order.type==='gather'&&!world.nodes.some(n=>n.id===order.id))throw new Error('Invalid saved gathering destination.');
        if(['move','gather','return'].includes(order.type)){a.target=order;a.state=order.type==='gather'?'Gathering':order.type==='return'?'Returning':'Marching';a.deployed=true;}
        else if(cargoTotal(a))returnCargo(world,a,'Combat interrupted by restart');
      }
      if(!campaignFor(world,a.id))dock(world,a);
    }
    explorationTick(world, 0);
    for (const p of world.players.values()) refreshJourney(world, p);
    return world;
  }
  compareCommanders(p,marchId,candidateId){
    const a=armyList(p).find(a=>a.id===marchId);if(!a||!p.ownedCommanders.includes(candidateId))throw new GameError('Choose an owned march and recruited commander.',403);
    const pick=stats=>Object.fromEntries(['maxHealth','damage','speed','gather','heal','mitigation','level'].map(k=>[k,stats[k]]));
    return {marchId:a.id,candidateId,currentId:a.commanderId,current:pick(this.stats(a)),candidate:pick(this.stats({...a,commanderId:candidateId,secondaryCommanderId:a.secondaryCommanderId===candidateId?'':a.secondaryCommanderId})),available:candidateId!==a.commanderId&&candidateId!==a.secondaryCommanderId&&!armyList(p).some(other=>other.id!==a.id&&(other.commanderId===candidateId||other.secondaryCommanderId===candidateId))};
  }
  armySnapshot(a) {
    const p = this.owner(a);
    const destination = campaignDestination(this, a) ?? (a.target?.type === 'pvp' ? this.army(a.target.id) : a.target?.id ? [...this.camps, ...this.nodes, ...this.sites].find(item => item.id === a.target.id) : a.target);
    const assignment = campaignFor(this, a.id);
    const path = destination ? cachedRoute(this, a, destination, a.target?.type === 'return') : [];
    return { protectedField:p.cityLevel<2||this.atHome(a)||a.recovery>0,deployed:a.deployed,cargo:{...a.cargo},carryCapacity:carryCapacity(this,a), route: path || [], assignmentKind: assignment?.kind || '', assignmentId: assignment ? (assignment.group.id || assignment.group.targetId) : '', id: a.id, ownerId: p.id, civilization: p.civilization, attackSequence: a.attackSequence ?? 0, attackX: a.attackX ?? a.x, attackZ: a.attackZ ?? a.z, allianceId: p.allianceId, name: a.id === p.id ? p.name + ' · March 1' : a.name,
      units: { ...a.units }, skillKind: activeKind(a.commanderId), commanderId: a.commanderId, secondaryCommanderId: a.secondaryCommanderId || '', equippedRelic: a.equippedRelic, formationActive: formationOf(a.units).active, formationName: FORMATION.name, x: a.x, z: a.z, homeX: p.homeX, homeZ: p.homeZ,
      troops: a.troops, mythic: a.mythic, health: Math.ceil(a.health), recovery: a.recovery, rage: Math.floor(a.rage), shield: Math.ceil(a.shield), lastSkill: a.lastSkill, skillCasts: a.skillCasts,
      state: a.state, hasOrder: !!a.target, targetId: a.target?.id ?? '', targetX: destination?.x ?? a.x, targetZ: destination?.z ?? a.z, ...this.stats(a) };
  }
  snapshot(viewerId = null) {
    this.normalizeDeployment();
    const viewer=this.players.get(viewerId),vision=viewer?visionContext(this,viewer):null;
    const activity = viewerId && this.players.has(viewerId) ? { ...activitySnapshot(this, this.players.get(viewerId)), events: eventSnapshot(this, this.players.get(viewerId)) } : null;
    const kingdom = viewerId && this.players.has(viewerId) ? kingdomSnapshot(this, this.players.get(viewerId)) : null;
    const viewerAlliance = viewer?.allianceId;
    const snapshot = { allianceRoster:allianceRoster(this,viewer),diplomacy:diplomacySnapshot(this,viewer),coalition:coalitionSnapshot(this,viewer),season:seasonSnapshot(this,viewer),version: 16, rankings: rankings(this), activity, kingdom, strongholds: this.strongholds.map(t => ({ ...t })), strongholdRules: STRONGHOLD_RULES, ...campaignSnapshot(this, viewerId), chatMessages: this.messages.filter(m => !viewerId || m.channel === 'kingdom' || (m.channel === 'alliance' && m.allianceId && m.allianceId === viewerAlliance) || (m.channel === 'coalition' && m.coalitionId && coalitionOf(this, viewerAlliance)?.id === m.coalitionId)), markers: this.markers.filter(m => !viewerId || m.allianceId === viewerAlliance), troopTypes: TROOP_TYPES, ages: AGES, armies: this.armies().filter(a=>a.deployed&&(!viewer||this.owner(a).id===viewer.id||viewer.allianceId&&this.owner(a).allianceId===viewer.allianceId||vision.seen(a))).map(a => this.armySnapshot(a)), summonRules: SUMMON_RULES, relics: RELICS, armaments: ARMAMENTS, trades: TRADES, size: SIZE, time: this.time,
      formation: { id: FORMATION.id, name: FORMATION.name, minimumPercent: FORMATION.minimumPercent, health: FORMATION.health },
      players: [...this.players.values()].map(p => {
        const { ap,apUpdated,apRemainder,campPasses,tradeDay,tradeSent,tradeReceipts,tradeSequence,buffs,lastSeen, target, cooldown, gatherClock, slot, marches, discovery, coreReports, loginStreak, events, ...visible } = p;
        if (viewerId && viewerId !== p.id) {
          const ally = p.allianceId && this.players.get(viewerId)?.allianceId === p.allianceId;
          const visibleJob = job => ally && job ? { id: job.id, type: job.type, remaining: job.remaining, duration: job.duration } : null;
          return { id: p.id, name: p.name, civilization: p.civilization, allianceId: p.allianceId, allianceRole: allianceRole(this, p), x: p.x, z: p.z, homeX: p.homeX, homeZ: p.homeZ, cityLevel: p.cityLevel, ageName: age(p).name, construction: visibleJob(p.construction), secondConstruction: visibleJob(p.secondConstruction), research: visibleJob(p.research) };
        }
        return { ...visible, activeMarches:activeMarches(p).length,homeFormations:armyList(p).filter(a=>!a.deployed).map(a=>this.armySnapshot(a)),economy:economySnapshot(this,p),reports:unifiedReports(this,p,warSnapshot(this,p).battleReports,groupReports(this,p)), inventory: inventorySnapshot(p), powerBreakdown: powerOf(p), journeyCampaign: journeySnapshot(this, p), ...warSnapshot(this, p), groupReports: groupReports(this, p), allianceRole: allianceRole(this, p), ...citySnapshot(this, p), ...this.stats(p), health: Math.ceil(p.health), hasOrder: !!target, targetId: target?.id ?? '', targetX: target?.x ?? p.x, targetZ: target?.z ?? p.z };
      }), camps: this.camps.map(({ contributors, ...camp }) => ({ ...camp, respawn: Math.ceil(camp.respawn) })),
      nodes: this.nodes.map(n => ({ ...n })), sites: this.sites.map(s => ({ ...s, locked: !siteIsOpen(this,s.id) })), flags: this.flags.map(f => ({ ...f })),
      alliances: [...this.alliances.values()].map(({weekly,...a}) => ({ ...a, members: [...this.players.values()].filter(p => p.allianceId === a.id).length })),
      commanders: COMMANDERS.map(c => ({ ...c, skillKind: activeKind(c.id) })), civilizations: CIVILIZATIONS, events: this.events.map(e => ({ ...e })) };
    return viewerId && this.players.has(viewerId) ? filterFog(this, snapshot, this.players.get(viewerId),vision) : snapshot;
  }
}
