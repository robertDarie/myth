import { randomUUID } from 'node:crypto';

export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export class World {
  constructor() {
    this.players = new Map();
    this.sessions = new Map();
    this.enemy = { id: 'forsaken-1', x: 20, z: 20, health: 120, maxHealth: 120 };
  }

  join(name) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 24)
      throw new GameError('Name must contain 1–24 characters.');
    if (this.players.size >= 32) throw new GameError('Prototype is full.', 503);
    const id = randomUUID();
    const token = randomUUID();
    const index = this.players.size;
    this.players.set(id, {
      id, name: name.trim(), x: 4 + (index % 8) * 4, z: 4 + Math.floor(index / 8) * 3,
      health: 100, maxHealth: 100, gold: 0, target: null, cooldown: 0, lastSeen: 0,
    });
    this.sessions.set(token, id);
    return { playerId: id, token };
  }

  authenticate(token) {
    const id = this.sessions.get(token);
    if (!id) throw new GameError('Join the world first.', 401);
    return this.players.get(id);
  }

  command(player, command) {
    if (player.health <= 0) throw new GameError('Your army was defeated. Join again with a new session.');
    if (!command || typeof command !== 'object') throw new GameError('Invalid command.');
    if (command.type === 'move') {
      if (![command.x, command.z].every(n => Number.isFinite(n) && n >= 0 && n <= 40))
        throw new GameError('Destination must be inside the 40×40 map.');
      player.target = { type: 'move', x: command.x, z: command.z };
    } else if (command.type === 'attack') {
      if (command.targetId !== this.enemy.id || this.enemy.health <= 0)
        throw new GameError('Target is unavailable.');
      player.target = { type: 'attack' };
    } else throw new GameError('Unknown command.');
  }

  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.25);
    for (const player of this.players.values()) {
      player.cooldown = Math.max(0, player.cooldown - dt);
      if (!player.target || player.health <= 0) continue;
      const attacking = player.target.type === 'attack';
      if (attacking && this.enemy.health <= 0) { player.target = null; continue; }
      const destination = attacking ? this.enemy : player.target;
      const dx = destination.x - player.x;
      const dz = destination.z - player.z;
      const distance = Math.hypot(dx, dz);
      const stoppingDistance = attacking ? 1.5 : 0;
      if (distance > stoppingDistance) {
        const step = Math.min(4 * dt, distance - stoppingDistance);
        player.x += dx / distance * step;
        player.z += dz / distance * step;
      }
      if (!attacking && Math.hypot(dx, dz) <= 4 * dt) player.target = null;
      if (attacking && Math.hypot(this.enemy.x - player.x, this.enemy.z - player.z) <= 1.5001 && player.cooldown === 0) {
        this.enemy.health = Math.max(0, this.enemy.health - 15);
        player.cooldown = 1;
        if (this.enemy.health === 0) {
          player.gold += 50;
          player.target = null;
        } else {
          player.health = Math.max(0, player.health - 8);
          if (player.health === 0) player.target = null;
        }
      }
    }
  }

  expire(now) {
    for (const [token, id] of this.sessions) {
      if (now - this.players.get(id).lastSeen > 60_000) {
        this.sessions.delete(token);
        this.players.delete(id);
      }
    }
  }

  snapshot() {
    return {
      size: 40,
      players: [...this.players.values()].map(({ id, name, x, z, health, maxHealth, gold }) =>
        ({ id, name, x, z, health, maxHealth, gold })),
      enemy: { ...this.enemy },
    };
  }
}
