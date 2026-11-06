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
    if (this.players.size >= 32) throw new GameError('Prototype is full.', 503);
    const id = randomUUID(), token = randomUUID();
    // Reuse vacant slots rather than relying on player count after disconnects.
    const occupied = new Set([...this.players.values()].map(p => p.slot));
    let slot = 0; while (occupied.has(slot)) slot++;
    const x = 5 + (slot % 8) * 3.5, z = 5 + Math.floor(slot / 8) * 2.5;
    const player = { id, slot, name: name.trim(), civilization, x, z, homeX: x, homeZ: z,
      health: 0, gold: 150, wood: 150, food: 200, troops: 20, mythic: 0, cityLevel: 1,
      commanderId: 'captain', ownedCommanders: ['captain'], xp: 0, level: 1, kills: 0, questClaimed: false,
      allianceId: '', target: null, cooldown: 0, gatherClock: 0, lastSeen: 0, state: 'Idle', recovery: 0 };
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
  requireHome(p) { if (!this.atHome(p) || p.target) throw new GameError('Return home and stop before managing your city.'); }
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
    if (p.health <= 0 || p.recovery > 0) throw new GameError('Your army is recovering at home.');
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
        this.requireHome(p);
        if (p.troops >= p.cityLevel * 20 + 20) throw new GameError('Troop capacity reached. Upgrade your city.');
        this.spend(p, { food: 50, gold: 20 }); p.troops += 5; p.health = Math.min(this.stats(p).maxHealth, p.health + 25); return;
      }
      case 'recruit':
        this.requireHome(p);
        if (p.cityLevel < 2 || p.mythic >= p.cityLevel) throw new GameError('Mythic units require city level 2; capacity equals city level.');
        this.spend(p, { food: 80, gold: 100 }); p.mythic++; p.health = Math.min(this.stats(p).maxHealth, p.health + 35); return;
      case 'upgrade':
        this.requireHome(p);
        if (p.cityLevel >= 5) throw new GameError('City is already at the prototype maximum level.');
        this.spend(p, { wood: p.cityLevel * 100, gold: p.cityLevel * 75 }); p.cityLevel++; this.event(`${p.name} reached city level ${p.cityLevel}.`); return;
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
  expire(now) {
    for (const [token, id] of this.sessions) if (now - this.players.get(id).lastSeen > 30 * 60_000) {
      const p = this.players.get(id); this.sessions.delete(token); this.players.delete(id);
      if (p.allianceId) {
        const alliance = this.alliances.get(p.allianceId);
        const others = [...this.players.values()].filter(member => member.allianceId === p.allianceId);
        if (others.length && alliance.leaderId === p.id) alliance.leaderId = others[0].id;
        if (!others.length) {
          this.alliances.delete(p.allianceId); this.flags = this.flags.filter(f => f.allianceId !== p.allianceId);
          for (const site of this.sites) if (site.allianceId === p.allianceId) site.allianceId = '';
        }
      }
    }
  }
  snapshot() {
    return { version: 2, size: SIZE, time: this.time,
      players: [...this.players.values()].map(p => {
        const { lastSeen, target, cooldown, gatherClock, slot, ...visible } = p;
        return { ...visible, ...this.stats(p), health: Math.ceil(p.health), targetId: target?.id ?? '', targetX: target?.x ?? p.x, targetZ: target?.z ?? p.z };
      }), camps: this.camps.map(({ contributors, ...camp }) => ({ ...camp, respawn: Math.ceil(camp.respawn) })),
      nodes: this.nodes.map(n => ({ ...n })), sites: this.sites.map(s => ({ ...s })), flags: this.flags.map(f => ({ ...f })),
      alliances: [...this.alliances.values()].map(a => ({ ...a, members: [...this.players.values()].filter(p => p.allianceId === a.id).length })),
      commanders: COMMANDERS, civilizations: CIVILIZATIONS, events: this.events.map(e => ({ ...e })) };
  }
}
