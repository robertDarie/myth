import { randomUUID } from 'node:crypto';
import { SIZE, CIVILIZATIONS, COMMANDERS, campDefinitions, siteDefinitions } from './content.mjs';
export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const finitePoint = p => [p.x, p.z].every(n => Number.isFinite(n) && n >= 1 && n <= SIZE - 1);
export class World {
  constructor() {
    this.players = new Map(); this.sessions = new Map(); this.alliances = new Map();
    this.time = 0; this.events = [];
    this.camps = campDefinitions.map(([id, name, level, x, z]) => ({ id, name, level, x, z,
      health: 100 * level, maxHealth: 100 * level, respawn: 0, contributors: {} }));
    this.nodes = Array.from({ length: 12 }, (_, i) => ({ id: `resource-${i}`, name: ['Sacred Grove', 'Golden Vein', 'Harvest Fields'][i % 3],
      resource: ['wood', 'gold', 'food'][i % 3], x: 8 + (i % 4) * 8, z: 18 + Math.floor(i / 4) * 8, remaining: 600, capacity: 600, refill: 0 }));
    this.sites = siteDefinitions.map(s => ({ ...s, allianceId: '', challengerId: '', progress: 0 }));
    this.flags = [];
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
  stats(p) {
    const civ = CIVILIZATIONS.find(c => c.id === p.civilization), commander = COMMANDERS.find(c => c.id === p.commanderId);
    const owns = id => !!p.allianceId && this.sites.some(s => s.id === id && s.allianceId === p.allianceId);
    return { maxHealth: Math.round((p.troops * 5 + p.mythic * 35) * civ.health * commander.health),
      damage: (p.troops * 0.75 + p.mythic * 12) * civ.damage * commander.damage * (1 + (p.level - 1) * 0.03) * (owns('shrine-dawn') ? 1.1 : 1),
      speed: 4 * civ.speed * commander.speed,
      heal: 12 * civ.healing * (owns('shrine-life') ? 1.25 : 1),
      gather: civ.gathering * commander.gather * (owns('first-sanctuary') ? 1.2 : 1) };
  }
  atHome(p) { return distance(p, { x: p.homeX, z: p.homeZ }) < 2; }
  requireHome(p) { if (!this.atHome(p) || p.target) throw new GameError('Return your army home and stop before changing its composition or commander.'); }
  spend(p, cost) {
    if (Object.entries(cost).some(([key, value]) => p[key] < value)) throw new GameError('Not enough resources.');
    for (const [key, value] of Object.entries(cost)) p[key] -= value;
  }
  canEnter(p, destination) {
    const owns = id => !!p.allianceId && this.sites.find(s => s.id === id).allianceId === p.allianceId;
    return (destination.x <= 40 || owns('gate-east')) && (destination.z <= 40 || owns('gate-north'));
  }
  command(p, c) {
    if (!c || typeof c !== 'object') throw new GameError('Invalid command.');
    if (c.type === 'return') { p.target = { type: 'return', x: p.homeX, z: p.homeZ }; p.state = 'Returning'; return; }
    if (c.type === 'stop') { p.target = null; p.state = 'Idle'; return; }
    const armyOrders = ['move', 'attack', 'gather', 'capture', 'flag', 'commander', 'reinforce'];
    if (armyOrders.includes(c.type) && (p.health <= 0 || p.recovery > 0)) throw new GameError('Your army is recovering at home.');
    switch (c.type) {
      case 'move':
        if (!finitePoint(c)) throw new GameError('Destination must be inside the map (1–79).');
        if (!this.canEnter(p, c)) throw new GameError('Your alliance must capture the corresponding Divine Gate first.');
        p.target = { type: 'move', x: c.x, z: c.z }; break;
      case 'attack': {
        const camp = this.camps.find(e => e.id === c.targetId && e.health > 0);
        if (!camp || !this.canEnter(p, camp)) throw new GameError('Camp unavailable or behind a locked gate.');
        p.target = { type: 'attack', id: camp.id }; break;
      }
      case 'gather': {
        const node = this.nodes.find(n => n.id === c.targetId && n.remaining > 0);
        if (!node || !this.canEnter(p, node)) throw new GameError('Resource unavailable.');
        p.target = { type: 'gather', id: node.id }; p.gatherClock = 0; break;
      }
      case 'train': {
        if (p.trainingQueue.length >= 3) throw new GameError('Training queue is full (three orders).');
        const queued = p.trainingQueue.filter(j => j.type === 'train').reduce((total, j) => total + j.amount, 0);
        if (p.troops + p.reserveTroops + queued + 5 > p.cityLevel * 20 + 20) throw new GameError('Troop capacity reached. Upgrade your city.');
        const cost = { food: 50, gold: 20 }; this.spend(p, cost);
        p.trainingQueue.push(this.job('train', 8, cost, 5)); return;
      }
      case 'recruit': {
        if (p.trainingQueue.length >= 3) throw new GameError('Training queue is full (three orders).');
        const queued = p.trainingQueue.filter(j => j.type === 'recruit').length;
        if (p.cityLevel < 2 || p.mythic + p.reserveMythic + queued >= p.cityLevel) throw new GameError('Mythic units require city level 2; capacity equals city level.');
        const cost = { food: 80, gold: 100 }; this.spend(p, cost);
        p.trainingQueue.push(this.job('recruit', 20, cost, 1)); return;
      }
      case 'upgrade': {
        if (p.construction) throw new GameError('A city upgrade is already under construction.');
        if (p.cityLevel >= 5) throw new GameError('City is already at the prototype maximum level.');
        const cost = { wood: p.cityLevel * 100, gold: p.cityLevel * 75 }; this.spend(p, cost);
        p.construction = this.job('upgrade', p.cityLevel * 20, cost, 1); return;
      }
      case 'cancel-job': {
        let job;
        if (p.construction?.id === c.targetId) { job = p.construction; p.construction = null; }
        else {
          const index = p.trainingQueue.findIndex(j => j.id === c.targetId);
          if (index < 0) throw new GameError('Queue order no longer exists.');
          [job] = p.trainingQueue.splice(index, 1);
        }
        for (const [resource, amount] of Object.entries(job.cost)) p[resource] += amount;
        return;
      }
      case 'reinforce': {
        this.requireHome(p);
        if (!p.reserveTroops && !p.reserveMythic) throw new GameError('No reserves are ready.');
        const oldMax = this.stats(p).maxHealth;
        p.troops += p.reserveTroops; p.mythic += p.reserveMythic;
        p.reserveTroops = 0; p.reserveMythic = 0;
        p.health = Math.min(this.stats(p).maxHealth, p.health + this.stats(p).maxHealth - oldMax); return;
      }
      case 'unlock-commander': {
        const commander = COMMANDERS.find(k => k.id === c.targetId);
        if (!commander) throw new GameError('Unknown commander.');
        if (p.ownedCommanders.includes(commander.id)) throw new GameError('Commander is already recruited.');
        this.spend(p, { gold: commander.cost }); p.ownedCommanders.push(commander.id); return;
      }
      case 'commander': {
        this.requireHome(p);
        const commander = COMMANDERS.find(k => k.id === c.targetId);
        if (!commander) throw new GameError('Unknown commander.');
        if (!p.ownedCommanders.includes(commander.id)) { this.spend(p, { gold: commander.cost }); p.ownedCommanders.push(commander.id); }
        p.commanderId = commander.id; p.health = Math.min(p.health, this.stats(p).maxHealth); return;
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
        const id = randomUUID(); this.alliances.set(id, { id, name: c.name.trim(), leaderId: p.id }); p.allianceId = id;
        this.event(`${p.name} founded ${c.name.trim()}.`); return;
      }
      case 'alliance-join':
        if (p.allianceId || !this.alliances.has(c.targetId)) throw new GameError('Choose an existing alliance while unaffiliated.');
        p.allianceId = c.targetId; this.event(`${p.name} joined ${this.alliances.get(p.allianceId).name}.`); return;
      case 'flag': {
        if (!p.allianceId) throw new GameError('Join an alliance first.');
        if (!finitePoint(c) || !this.canEnter(p, c) || distance(p, c) > 4) throw new GameError('Place a beacon within 4 units of your army in an accessible province.');
        const flags = this.flags.filter(f => f.allianceId === p.allianceId);
        if (flags.length >= 20) throw new GameError('Alliance beacon limit reached.');
        if (this.flags.some(f => distance(f, c) < 4)) throw new GameError('Too close to another beacon.');
        if (!flags.length) {
          const alliance = this.alliances.get(p.allianceId);
          if (alliance.leaderId !== p.id || distance({ x: p.homeX, z: p.homeZ }, c) > 6) throw new GameError('The leader must place the first beacon near their city.');
        } else if (!flags.some(f => distance(f, c) <= 12)) throw new GameError('Beacons must connect within 12 units of alliance territory.');
        if (this.flags.some(f => f.allianceId !== p.allianceId && distance(f, c) < 10)) throw new GameError('Enemy territory blocks this location.');
        this.spend(p, { wood: 60, gold: 20 });
        this.flags.push({ id: randomUUID(), allianceId: p.allianceId, x: c.x, z: c.z }); return;
      }
      case 'capture': {
        const site = this.sites.find(s => s.id === c.targetId);
        if (!site || !p.allianceId) throw new GameError('Join an alliance to capture a site.');
        if (!this.canEnter(p, site)) throw new GameError('Capture the necessary gates first.');
        if (!this.flags.some(f => f.allianceId === p.allianceId && distance(f, site) <= 12)) throw new GameError('Extend alliance beacons to within 12 units of this site.');
        p.target = { type: 'capture', id: site.id }; break;
      }
      default: throw new GameError('Unknown command.');
    }
    p.state = ({ move: 'Marching', attack: 'Attacking', gather: 'Gathering', capture: 'Capturing' })[c.type];
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.25); this.time += dt;
    for (const camp of this.camps) if (camp.health <= 0) {
      camp.respawn = Math.max(0, camp.respawn - dt);
      if (camp.respawn === 0) { camp.health = camp.maxHealth; camp.contributors = {}; }
    }
    for (const node of this.nodes) if (node.remaining <= 0) {
      node.refill += dt; if (node.refill >= 30) { node.remaining = node.capacity; node.refill = 0; }
    }
    for (const p of this.players.values()) {
      this.cityTick(p, dt);
      const stats = this.stats(p); p.cooldown = Math.max(0, p.cooldown - dt);
      if (p.recovery > 0) { p.recovery = Math.max(0, p.recovery - dt); p.state = 'Recovering'; continue; }
      if (!p.target && this.atHome(p)) { p.health = Math.min(stats.maxHealth, p.health + stats.heal * dt); p.state = p.health < stats.maxHealth ? 'Healing' : 'Idle'; }
      if (!p.target || p.health <= 0) continue;
      const target = p.target;
      const destination = target.type === 'attack' ? this.camps.find(e => e.id === target.id)
        : target.type === 'gather' ? this.nodes.find(n => n.id === target.id)
        : target.type === 'capture' ? this.sites.find(s => s.id === target.id) : target;
      if (!destination || (target.type === 'attack' && destination.health <= 0) || (target.type === 'gather' && destination.remaining <= 0)) { p.target = null; p.state = 'Idle'; continue; }
      // Ownership can change while an army is marching. Returning home always remains possible.
      if (target.type !== 'return' && !this.canEnter(p, destination)) { p.target = null; p.state = 'Route locked'; continue; }
      const stop = ['move', 'return'].includes(target.type) ? 0 : 2;
      const dist = distance(p, destination);
      if (dist > stop) {
        const step = Math.min(stats.speed * dt, dist - stop);
        p.x += (destination.x - p.x) / dist * step; p.z += (destination.z - p.z) / dist * step;
      }
      if (distance(p, destination) > stop + 0.0001) continue;
      if (target.type === 'move' || target.type === 'return') { p.target = null; p.state = 'Idle'; }
      if (target.type === 'attack' && p.cooldown === 0) this.battle(p, destination, stats);
      if (target.type === 'gather') {
        p.gatherClock += dt;
        if (p.gatherClock >= 1) { p.gatherClock -= 1; const amount = Math.min(destination.remaining, Math.ceil(8 * stats.gather)); destination.remaining -= amount; p[destination.resource] += amount; }
      }
    }
    for (const site of this.sites) this.captureTick(site, dt);
  }
  battle(p, camp, stats) {
    p.cooldown = 1;
    const damage = Math.min(camp.health, Math.round(stats.damage)); camp.health -= damage;
    camp.contributors[p.id] = (camp.contributors[p.id] ?? 0) + damage;
    if (camp.health === 0) {
      camp.respawn = 45;
      // Contributors share rewards once, even when the final blow comes from a different army.
      const contributors = Object.keys(camp.contributors).map(id => this.players.get(id)).filter(Boolean);
      for (const member of contributors) {
        member.gold += Math.floor(50 * camp.level / contributors.length);
        member.food += Math.floor(30 * camp.level / contributors.length);
        member.xp += 25 * camp.level; member.level = 1 + Math.floor(member.xp / 100); member.kills++;
      }
      this.event(`${p.name} defeated ${camp.name} (level ${camp.level}).`); p.target = null; p.state = 'Victorious';
    } else {
      p.health = Math.max(0, p.health - 8 * camp.level);
      if (p.health === 0) {
        p.x = p.homeX; p.z = p.homeZ; p.target = null; p.recovery = 8; p.health = 1; p.state = 'Recovering';
        this.event(`${p.name}'s army retreated home after defeat.`);
      }
    }
  }
  captureTick(site, dt) {
    const contenders = new Set([...this.players.values()].filter(p => p.target?.type === 'capture' && p.target.id === site.id && p.health > 0 && p.recovery === 0 && distance(p, site) <= 2.001 && p.allianceId && this.canEnter(p, site) && this.flags.some(f => f.allianceId === p.allianceId && distance(f, site) <= 12)).map(p => p.allianceId));
    if (contenders.size !== 1) { if (contenders.size === 0) site.progress = Math.max(0, site.progress - dt); return; }
    const allianceId = [...contenders][0];
    if (site.allianceId === allianceId) { site.progress = Math.max(0, site.progress - dt); return; }
    if (site.challengerId !== allianceId) { site.progress = 0; site.challengerId = allianceId; }
    site.progress += dt;
    if (site.progress >= 15) {
      site.allianceId = allianceId; site.progress = 0; site.challengerId = '';
      this.event(`${this.alliances.get(allianceId).name} captured ${site.name}.`);
      for (const p of this.players.values()) if (p.target?.id === site.id && p.target.type === 'capture') { p.target = null; p.state = 'Idle'; }
    }
  }
  job(type, duration, cost, amount) {
    return { id: randomUUID(), type, duration, remaining: duration, cost, amount };
  }
  cityTick(p, dt) {
    if (p.construction) {
      p.construction.remaining = Math.max(0, p.construction.remaining - dt);
      if (p.construction.remaining < 0.00001) {
        p.cityLevel++; p.construction = null;
        this.event(`${p.name} completed city level ${p.cityLevel}.`);
      }
    }
    // One training lane: excess time carries into the next paid order.
    let remaining = dt;
    while (remaining > 0 && p.trainingQueue.length) {
      const job = p.trainingQueue[0];
      const spent = Math.min(remaining, job.remaining); job.remaining -= spent; remaining -= spent;
      if (job.remaining > 0.00001) break;
      if (job.type === 'train') p.reserveTroops += job.amount;
      else p.reserveMythic += job.amount;
      p.trainingQueue.shift();
      this.event(`${p.name}: ${job.type === 'train' ? job.amount + ' troops' : 'a mythic recruit'} ready in city reserves.`);
    }
  }
  expire(now) {
    // Saved cities and their alliance territory are never deleted for inactivity.
    for (const p of this.players.values()) if (!p.offline && now - p.lastSeen > 30 * 60_000) {
      p.offline = true; p.target = null; p.state = 'Offline';
    }
  }
  toSave() {
    return { schema: 1, world: { players: [...this.players.values()], sessions: [...this.sessions.entries()],
      alliances: [...this.alliances.values()], camps: this.camps, nodes: this.nodes, sites: this.sites,
      flags: this.flags, time: this.time, events: this.events } };
  }
  static fromSave(data) {
    const w = structuredClone(data?.world);
    if (data?.schema !== 1 || !w || !['players', 'sessions', 'alliances', 'camps', 'nodes', 'sites', 'flags', 'events'].every(k => Array.isArray(w[k]))) throw new Error('Unsupported or damaged save format.');
    if (w.players.length > 32 || !Number.isFinite(w.time) || w.time < 0) throw new Error('Invalid saved world.');
    const world = new World();
    for (const p of w.players) {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || world.players.has(p.id) || !CIVILIZATIONS.some(c => c.id === p.civilization) || !COMMANDERS.some(c => c.id === p.commanderId)) throw new Error('Invalid saved city.');
      if (!['gold', 'wood', 'food', 'troops', 'mythic', 'reserveTroops', 'reserveMythic', 'health', 'xp', 'recovery', 'cooldown', 'gatherClock'].every(k => Number.isFinite(p[k]) && p[k] >= 0) || !finitePoint(p) || !finitePoint({ x: p.homeX, z: p.homeZ }) || !Number.isInteger(p.cityLevel) || p.cityLevel < 1 || p.cityLevel > 5) throw new Error('Invalid saved city values.');
      if (!Number.isInteger(p.slot) || p.slot < 0 || p.slot >= 32 || !Number.isInteger(p.level) || p.level < 1 || !Number.isInteger(p.kills) || p.kills < 0 || !Array.isArray(p.ownedCommanders) || !p.ownedCommanders.includes(p.commanderId) || p.ownedCommanders.some(id => !COMMANDERS.some(c => c.id === id)) || !Array.isArray(p.trainingQueue) || p.trainingQueue.length > 3) throw new Error('Invalid saved roster or queue.');
      for (const job of [p.construction, ...p.trainingQueue].filter(Boolean)) {
        if (!['upgrade', 'train', 'recruit'].includes(job.type) || typeof job.id !== 'string' || !Number.isFinite(job.remaining) || job.remaining < 0 || !Number.isFinite(job.duration) || job.duration <= 0 || job.remaining > job.duration || !Number.isInteger(job.amount) || job.amount < 1 || !job.cost || Object.entries(job.cost).some(([k, v]) => !['wood', 'gold', 'food'].includes(k) || !Number.isFinite(v) || v < 0)) throw new Error('Invalid saved queue.');
      }
      if ((p.construction && p.construction.type !== 'upgrade') || p.trainingQueue.some(job => !['train', 'recruit'].includes(job.type))) throw new Error('Invalid saved queue lane.');
      world.players.set(p.id, { ...p, target: null, lastSeen: 0, offline: true, state: 'Paused' });
    }
    for (const [token, id] of w.sessions) {
      if (typeof token !== 'string' || !world.players.has(id) || world.sessions.has(token)) throw new Error('Invalid saved session.');
      world.sessions.set(token, id);
    }
    if (new Set(world.sessions.values()).size !== world.players.size) throw new Error('Saved city has no session.');
    for (const a of w.alliances) {
      if (!a || typeof a.id !== 'string' || typeof a.name !== 'string' || !world.players.has(a.leaderId)) throw new Error('Invalid saved alliance.');
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
    return world;
  }
  snapshot() {
    return { version: 3, size: SIZE, time: this.time,
      players: [...this.players.values()].map(p => {
        const { lastSeen, target, cooldown, gatherClock, slot, ...visible } = p;
        return { ...visible, ...this.stats(p), health: Math.ceil(p.health), hasOrder: !!target, targetId: target?.id ?? '', targetX: target?.x ?? p.x, targetZ: target?.z ?? p.z };
      }), camps: this.camps.map(({ contributors, ...camp }) => ({ ...camp, respawn: Math.ceil(camp.respawn) })),
      nodes: this.nodes.map(n => ({ ...n })), sites: this.sites.map(s => ({ ...s })), flags: this.flags.map(f => ({ ...f })),
      alliances: [...this.alliances.values()].map(a => ({ ...a, members: [...this.players.values()].filter(p => p.allianceId === a.id).length })),
      commanders: COMMANDERS, civilizations: CIVILIZATIONS, events: this.events.map(e => ({ ...e })) };
  }
}
