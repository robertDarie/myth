import { initializeLogistics, cargoTotal } from './field-logistics.mjs';
import { visible } from './exploration.mjs';
import { siteIsOpen } from './kingdom.mjs';
import { initializeFortification, territoryNear } from './campaign.mjs';
import { allianceRole } from './social.mjs';
import { TROOP_TYPES, selection, readyFor, transfer, unitTotal, countOf, changeUnits } from './troops.mjs';
import { randomUUID } from 'node:crypto';
import { COMMANDERS } from './content.mjs';
import { armyList, ensureHero } from './progression.mjs';
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = c => [c.x, c.z].every(n => Number.isFinite(n) && n >= 1 && n <= 79);
export function marchCommand(world, p, c, fail) {
  if (c.type === 'deploy-march') {
    const chosen = selection(c, fail), { troops, mythic, units } = chosen;
    if(armyList(p).length>=5)fail('Five prepared formations already exist. Edit or disband a home formation.');
    if (!readyFor(p, null, chosen)) fail('Not enough ready reserves of that troop type. Train units first.');
    if (!p.ownedCommanders.includes(c.targetId) || armyList(p).some(a => a.commanderId === c.targetId)) fail('Choose a recruited commander who is not leading another march.');
    const a = { id: randomUUID(), ownerId: p.id, name: p.name + ' · March ' + (p.nextMarchNumber++),
      commanderId: c.targetId, equippedRelic: '', x: p.homeX, z: p.homeZ, homeX: p.homeX, homeZ: p.homeZ,
      troops, mythic, units, health: 1, xp: 0, level: 1, rage: 0, shield: 0, shieldTime: 0, lastSkill: '', skillCasts: 0,
      target: null, state: 'Idle', cooldown: 0, gatherClock: 0, recovery: 0 };
    transfer(p, null, chosen);
    ensureHero(p, c.targetId); p.marches.push(a);initializeLogistics(p);a.deployed=false; a.health = world.stats(a).maxHealth; return true;
  }
  const types = ['move', 'attack', 'gather', 'return', 'stop', 'commander', 'reinforce', 'flag', 'capture', 'equip-relic', 'unequip-relic', 'disband-march', 'configure-march'];
  if (!types.includes(c.type)) return false;
  const a = armyList(p).find(a => a.id === (c.marchId || p.id));
  if (!a) fail('That march does not belong to your city.');
  if (c.type === 'return') { if(!a.deployed&&world.atHome(a)){a.target=null;a.state='Home';return true;}a.target = { type: 'return', x: p.homeX, z: p.homeZ }; a.state = 'Returning'; a.returnReason='Manual recall'; return true; }
  if (c.type === 'stop') { a.target = null; a.state = 'Idle'; return true; }
  if (a.health <= 0 || a.recovery > 0) fail('This army is recovering at home.');
  if(['configure-march','commander','reinforce','disband-march','equip-relic','unequip-relic'].includes(c.type)&&cargoTotal(a))fail('Return home and deliver cargo before changing this formation.');
  switch (c.type) {
    case 'move':
      if (!point(c)) fail('Destination must be inside the map (1–79).');
      if (!world.canEnter(p, c)) fail('Your alliance must capture the corresponding Divine Gate first.');
      a.target = { type: 'move', x: c.x, z: c.z }; break;
    case 'attack': {
      const camp = world.camps.find(e => e.id === c.targetId);
      const known = camp && (visible(world,p,camp) || p.discovery.some(r=>r.kind==='camps'&&r.value.id===camp.id));
      if (!known || (visible(world,p,camp)&&camp.health<=0)||!world.canEnter(p, camp)) fail('Camp unavailable or behind a locked gate.');
      a.target = { type: 'attack', id: camp.id }; break;
    }
    case 'gather': {
      const node = world.nodes.find(n => n.id === c.targetId);
      if (!node || (!visible(world,p,node)&&!p.discovery.some(r=>r.kind==='nodes'&&r.value.id===node.id))||!world.canEnter(p, node)) fail('Resource unavailable.');
      a.target = { type: 'gather', id: node.id }; a.gatherClock = 0; break;
    }
    case 'commander': {
      world.requireHome(a);
      const hero = COMMANDERS.find(h => h.id === c.targetId); if (!hero) fail('Unknown commander.');
      if (armyList(p).some(other => other.id !== a.id && other.commanderId === c.targetId)) fail('That commander already leads another march.');
      if (!p.ownedCommanders.includes(hero.id)) fail('Acquire this commander through summons, shards or progression first.');
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
      a.health = world.stats(a).maxHealth; a.rage = 0; a.shield = 0; a.shieldTime = 0; a.state = 'Idle'; return true;
    }
    case 'reinforce': {
      world.requireHome(a); if (!p.reserveTroops && !p.reserveMythic) fail('No reserves are ready.');
      const oldMax = world.stats(a).maxHealth;
      for (const t of TROOP_TYPES) { changeUnits(a.units,t.id,countOf(p.reserveUnits,t.id));changeUnits(p.reserveUnits,t.id,-countOf(p.reserveUnits,t.id)); }
      a.troops = unitTotal(a.units); a.mythic += p.reserveMythic; p.reserveTroops = 0; p.reserveMythic = 0;
      a.health = Math.min(world.stats(a).maxHealth, a.health + world.stats(a).maxHealth - oldMax); return true;
    }
    case 'disband-march':
      world.requireHome(a);
      if (a.id === p.id) fail('The founding march stays assigned.');
      if (a.health + 0.001 < world.stats(a).maxHealth) fail('Recover fully at home before returning this march to reserves.');
      for (const t of TROOP_TYPES) changeUnits(p.reserveUnits,t.id,countOf(a.units,t.id));
      p.reserveTroops = unitTotal(p.reserveUnits); p.reserveMythic += a.mythic; p.marches = p.marches.filter(other => other.id !== a.id); return true;
    case 'unequip-relic':
      world.requireHome(a); a.equippedRelic = ''; a.health = Math.min(a.health, world.stats(a).maxHealth); return true;
    case 'equip-relic':
      world.requireHome(a); if (!p.ownedRelics.includes(c.targetId)) fail('Craft this relic first.');
      if (armyList(p).some(other => other.id !== a.id && other.equippedRelic === c.targetId)) fail('That relic is equipped by another march.');
      a.equippedRelic = c.targetId; a.health = Math.min(a.health, world.stats(a).maxHealth); return true;
    case 'flag': {
      if (!p.allianceId) fail('Join an alliance first.');
      if (!['Leader','Officer'].includes(allianceRole(world,p))) fail('Only alliance leaders and officers can build beacons.');
      if (!point(c) || !world.canEnter(p, c) || dist(a, c) > 4) fail('Place a beacon within 4 units of the selected march in an accessible province.');
      const flags = world.flags.filter(f => f.allianceId === p.allianceId);
      if (flags.length >= 20) fail('Alliance beacon limit reached.');
      if (world.flags.some(f => dist(f, c) < 4)) fail('Too close to another beacon.');
      const hasRoot = flags.some(f=>f.isRoot);
      if (!hasRoot) {
        if (world.alliances.get(p.allianceId).leaderId !== p.id || dist({ x: p.homeX, z: p.homeZ }, c) > 6) fail('The leader must place the first beacon near their city.');
      } else if (!flags.some(f => f.connected && f.buildRemaining <= 0 && dist(f, c) <= 12)) fail('Beacons must connect within 12 units of alliance territory.');
      if (world.flags.some(f => f.allianceId !== p.allianceId && dist(f, c) < 10)) fail('Enemy territory blocks this location.');
      world.spend(p, { wood: 60, gold: 20 }); const beacon = { id: randomUUID(), allianceId: p.allianceId, x: c.x, z: c.z }; initializeFortification(beacon, hasRoot ? 'flag' : 'fort'); beacon.buildRemaining = hasRoot ? 10 : 30; beacon.isRoot = !hasRoot; world.flags.push(beacon); return true;
    }
    case 'capture': {
      const site = world.sites.find(s => s.id === c.targetId);
      if (!site || !p.allianceId) fail('Join an alliance to capture a site.');
      if (!siteIsOpen(world,site.id)) fail('This sacred site is sealed until its kingdom milestone opens.');
      if (site.allianceId && site.allianceId !== p.allianceId) fail('An enemy-held site must be defeated with a rally.');
      if (!world.canEnter(p, site)) fail('Capture the necessary gates first.');
      if (!territoryNear(world, p.allianceId, site)) fail('Extend alliance beacons to within 12 units of this site.');
      a.target = { type: 'capture', id: site.id }; break;
    }
  }
  a.state = ({ move: 'Marching', attack: 'Attacking', gather: 'Gathering', capture: 'Capturing' })[c.type]; return true;
}
