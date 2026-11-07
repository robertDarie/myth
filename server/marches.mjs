import { TROOP_TYPES, selection, readyFor, transfer, unitTotal } from './troops.mjs';
import { randomUUID } from 'node:crypto';
import { COMMANDERS } from './content.mjs';
import { age, armyList, ensureHero } from './progression.mjs';
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = c => [c.x, c.z].every(n => Number.isFinite(n) && n >= 1 && n <= 79);
export function marchCommand(world, p, c, fail) {
  if (c.type === 'deploy-march') {
    if (armyList(p).length >= age(p).marches) fail('Reach the next age to unlock another march (maximum five).');
    const chosen = selection(c, fail), { troops, mythic, units } = chosen;
    if (!readyFor(p, null, chosen)) fail('Not enough ready reserves of that troop type. Train units first.');
    if (!p.ownedCommanders.includes(c.targetId) || armyList(p).some(a => a.commanderId === c.targetId)) fail('Choose a recruited commander who is not leading another march.');
    const a = { id: randomUUID(), ownerId: p.id, name: p.name + ' · March ' + (p.nextMarchNumber++),
      commanderId: c.targetId, equippedRelic: '', x: p.homeX, z: p.homeZ, homeX: p.homeX, homeZ: p.homeZ,
      troops, mythic, units, health: 1, xp: 0, level: 1, rage: 0, shield: 0, shieldTime: 0, lastSkill: '', skillCasts: 0,
      target: null, state: 'Idle', cooldown: 0, gatherClock: 0, recovery: 0 };
    transfer(p, null, chosen);
    ensureHero(p, c.targetId); p.marches.push(a); a.health = world.stats(a).maxHealth; return true;
  }
  const types = ['move', 'attack', 'gather', 'return', 'stop', 'commander', 'reinforce', 'flag', 'capture', 'equip-relic', 'unequip-relic', 'disband-march', 'configure-march'];
  if (!types.includes(c.type)) return false;
  const a = armyList(p).find(a => a.id === (c.marchId || p.id));
  if (!a) fail('That march does not belong to your city.');
  if (c.type === 'return') { a.target = { type: 'return', x: p.homeX, z: p.homeZ }; a.state = 'Returning'; return true; }
  if (c.type === 'stop') { a.target = null; a.state = 'Idle'; return true; }
  if (a.health <= 0 || a.recovery > 0) fail('This army is recovering at home.');
  switch (c.type) {
    case 'move':
      if (!point(c)) fail('Destination must be inside the map (1–79).');
      if (!world.canEnter(p, c)) fail('Your alliance must capture the corresponding Divine Gate first.');
      a.target = { type: 'move', x: c.x, z: c.z }; break;
    case 'attack': {
      const camp = world.camps.find(e => e.id === c.targetId && e.health > 0);
      if (!camp || !world.canEnter(p, camp)) fail('Camp unavailable or behind a locked gate.');
      a.target = { type: 'attack', id: camp.id }; break;
    }
    case 'gather': {
      const node = world.nodes.find(n => n.id === c.targetId && n.remaining > 0);
      if (!node || !world.canEnter(p, node)) fail('Resource unavailable.');
      a.target = { type: 'gather', id: node.id }; a.gatherClock = 0; break;
    }
    case 'commander': {
      world.requireHome(a);
      const hero = COMMANDERS.find(h => h.id === c.targetId); if (!hero) fail('Unknown commander.');
      if (armyList(p).some(other => other.id !== a.id && other.commanderId === c.targetId)) fail('That commander already leads another march.');
      if (!p.ownedCommanders.includes(hero.id)) { world.spend(p, { gold: hero.cost }); p.ownedCommanders.push(hero.id); }
      ensureHero(p, hero.id); a.commanderId = hero.id; a.health = Math.min(a.health, world.stats(a).maxHealth); a.rage = 0; return true;
    }
    case 'configure-march': {
      world.requireHome(a);
      if (a.health + 0.001 < world.stats(a).maxHealth) fail('Recover fully at home before assembling a different formation.');
      const chosen = selection(c, fail);
      if (!readyFor(p, a, chosen)) fail('Not enough ready reserves of that troop type.');
      const commanderId = c.targetId || a.commanderId;
      if (!p.ownedCommanders.includes(commanderId) || armyList(p).some(other => other.id !== a.id && other.commanderId === commanderId)) fail('Choose a recruited commander who is not leading another march.');
      transfer(p, a, chosen); ensureHero(p, commanderId); a.commanderId = commanderId;
      a.health = world.stats(a).maxHealth; a.rage = 0; a.shield = 0; a.shieldTime = 0; a.cooldown = 0; a.state = 'Idle'; return true;
    }
    case 'reinforce': {
      world.requireHome(a); if (!p.reserveTroops && !p.reserveMythic) fail('No reserves are ready.');
      const oldMax = world.stats(a).maxHealth;
      for (const t of TROOP_TYPES) { a.units[t.id] += p.reserveUnits[t.id]; p.reserveUnits[t.id] = 0; }
      a.troops = unitTotal(a.units); a.mythic += p.reserveMythic; p.reserveTroops = 0; p.reserveMythic = 0;
      a.health = Math.min(world.stats(a).maxHealth, a.health + world.stats(a).maxHealth - oldMax); return true;
    }
    case 'disband-march':
      world.requireHome(a);
      if (a.id === p.id) fail('The founding march stays assigned.');
      if (a.health + 0.001 < world.stats(a).maxHealth) fail('Recover fully at home before returning this march to reserves.');
      for (const t of TROOP_TYPES) p.reserveUnits[t.id] += a.units[t.id];
      p.reserveTroops = unitTotal(p.reserveUnits); p.reserveMythic += a.mythic; p.marches = p.marches.filter(other => other.id !== a.id); return true;
    case 'unequip-relic':
      world.requireHome(a); a.equippedRelic = ''; a.health = Math.min(a.health, world.stats(a).maxHealth); return true;
    case 'equip-relic':
      world.requireHome(a); if (!p.ownedRelics.includes(c.targetId)) fail('Craft this relic first.');
      if (armyList(p).some(other => other.id !== a.id && other.equippedRelic === c.targetId)) fail('That relic is equipped by another march.');
      a.equippedRelic = c.targetId; a.health = Math.min(a.health, world.stats(a).maxHealth); return true;
    case 'flag': {
      if (!p.allianceId) fail('Join an alliance first.');
      if (!point(c) || !world.canEnter(p, c) || dist(a, c) > 4) fail('Place a beacon within 4 units of the selected march in an accessible province.');
      const flags = world.flags.filter(f => f.allianceId === p.allianceId);
      if (flags.length >= 20) fail('Alliance beacon limit reached.');
      if (world.flags.some(f => dist(f, c) < 4)) fail('Too close to another beacon.');
      if (!flags.length) {
        if (world.alliances.get(p.allianceId).leaderId !== p.id || dist({ x: p.homeX, z: p.homeZ }, c) > 6) fail('The leader must place the first beacon near their city.');
      } else if (!flags.some(f => dist(f, c) <= 12)) fail('Beacons must connect within 12 units of alliance territory.');
      if (world.flags.some(f => f.allianceId !== p.allianceId && dist(f, c) < 10)) fail('Enemy territory blocks this location.');
      world.spend(p, { wood: 60, gold: 20 }); world.flags.push({ id: randomUUID(), allianceId: p.allianceId, x: c.x, z: c.z }); return true;
    }
    case 'capture': {
      const site = world.sites.find(s => s.id === c.targetId);
      if (!site || !p.allianceId) fail('Join an alliance to capture a site.');
      if (!world.canEnter(p, site)) fail('Capture the necessary gates first.');
      if (!world.flags.some(f => f.allianceId === p.allianceId && dist(f, site) <= 12)) fail('Extend alliance beacons to within 12 units of this site.');
      a.target = { type: 'capture', id: site.id }; break;
    }
  }
  a.state = ({ move: 'Marching', attack: 'Attacking', gather: 'Gathering', capture: 'Capturing' })[c.type]; return true;
}
