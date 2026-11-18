import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { World } from './world.mjs';
import { ensureHero, xpAtLevel, skillInfo, ACTIVE_TIMING } from './progression.mjs';
import { unitTotal, changeUnits } from './troops.mjs';
import { wardTroops } from './war.mjs';

const expected = JSON.parse(readFileSync(new URL('../research/parity/fixtures/commander-battle.json', import.meta.url), 'utf8'));
const census = p => p.troops + p.marches.reduce((n, a) => n + a.troops, 0) + p.reserveTroops + wardTroops(p);
const own = (p, id) => { if (!p.ownedCommanders.includes(id)) p.ownedCommanders.push(id); const hero = ensureHero(p, id); hero.stars = 6; hero.skills = [1, 1, 1, 1]; return hero; };
function city() {
  const w = new World({ random: () => 0.25, now: () => Date.UTC(2026, 10, 19) });
  const session = w.join('Warden', 'greek');
  const p = w.authenticate(session.token);
  return { w, session, p };
}
function field(prepare) {
  const w = new World({ random: () => 0.25, now: () => Date.UTC(2026, 10, 19) });
  const a = w.authenticate(w.join('Warden', 'greek').token);
  const b = w.authenticate(w.join('Rival', 'norse').token);
  own(a, 'rune-seer'); own(a, 'heracles'); own(a, 'wukong');
  if (prepare) prepare(w, a); else w.command(a, { type: 'pair-commander', targetId: 'rune-seer' });
  a.cityLevel = b.cityLevel = 2;
  a.x = a.homeX + 4; a.z = a.homeZ; b.x = a.homeX + 5; b.z = a.homeZ; a.deployed = b.deployed = true;
  a.health = w.stats(a).maxHealth; b.health = w.stats(b).maxHealth;
  return { w, a, b };
}
const round = (w, a, b) => { w.command(a, { type: 'attack-player', targetId: b.id }); w.tick(0.1); return [...w.battles.values()][0]; };
const nextRound = w => { for (let i = 0; i < 10; i++) w.tick(0.1); };

test('advertised active timing text stays on the existing local rule', () => {
  assert.equal(ACTIVE_TIMING, expected.timing);
  const { p } = city();
  const info = skillInfo(p, 'captain');
  assert.ok(info.skills[0].description.includes(expected.timing));
  assert.ok(info.skills[0].description.includes('four seconds'));
  assert.ok(skillInfo(p, 'heracles').expertiseDescription.includes(expected.expertiseText));
});

test('primary and secondary battle skills change recorded combat', () => {
  const client = readFileSync(new URL('../client/Assets/ThronesOfMyth/Scripts/PrototypeClient.cs', import.meta.url), 'utf8');
  assert.ok(client.includes(expected.timing));
  const home = city();
  const w0 = home.w, owner = home.p;
  own(owner, 'wukong');
  assert.ok(skillInfo(owner, 'captain').skills[0].description.includes(ACTIVE_TIMING));
  assert.equal(w0.snapshot(owner.id).players.find(p => p.id === owner.id).heroProgress.find(h => h.id === 'captain').skills[0].description, skillInfo(owner, 'captain').skills[0].description);
  const alone = w0.stats(owner).damage;
  owner.commanderShards.wukong = 30;
  w0.command(owner, { type: 'pair-commander', targetId: 'wukong' });
  assert.ok(w0.stats(owner).damage > alone);
  w0.command(owner, { type: 'upgrade-skill', targetId: 'wukong', skillIndex: 1 });
  const upgraded = w0.stats(owner).damage;
  assert.ok(upgraded > alone);
  const level = ensureHero(owner, 'wukong'); level.xp = xpAtLevel(level, 60);
  assert.equal(w0.stats(owner).damage, upgraded);
  level.xp = xpAtLevel(level, 5); level.talents = {};
  w0.command(owner, { type: 'talent-raise', targetId: 'wukong', name: 'line-oath' });
  assert.equal(w0.stats(owner).damage, upgraded);
  w0.command(owner, { type: 'unpair-commander' });
  w0.command(owner, { type: 'commander', targetId: 'wukong' });
  assert.ok(w0.stats(owner).damage > upgraded);
  w0.command(owner, { type: 'commander', targetId: 'captain' });
  assert.throws(() => w0.command(owner, { type: 'pair-commander', targetId: 'captain' }), /primary/);
  assert.throws(() => w0.command(owner, { type: 'pair-commander', targetId: 'atalanta' }), /Acquire/);
  const { w, a, b } = field();
  // Boundary: rage is primed so the next production round is the cast under test.
  a.rage = 800; a.health = w.stats(a).maxHealth; b.health = w.stats(b).maxHealth;
  const battle = round(w, a, b);
  assert.equal(a.lastSkill, 'Rallying Cry'); assert.equal(a.lastSkillRole, 'primary'); assert.ok(a.shield > 0); assert.equal(a.rage, 0); assert.equal(a.nextActive, 'secondary');
  assert.equal(w.snapshot(a.id).armies.find(army => army.id === a.id).skillKind, 'shield');
  a.rage = 800; a.health = 1;
  nextRound(w);
  assert.equal(battle.rounds, 2); assert.equal(a.lastSkill, 'Runes of Renewal'); assert.equal(a.lastSkillRole, 'secondary');
  assert.ok(a.health > 1); assert.ok(battle.sides[0].healed > 0); assert.equal(a.rage, 0); assert.equal(a.nextActive, 'primary');
  assert.equal(w.snapshot(a.id).armies.find(army => army.id === a.id).skillKind, 'heal');
  const firstHeal = battle.sides[0].healed;
  w.command(a, { type: 'stop' });
  for (let i = 0; i < 50; i++) w.tick(0.1);
  assert.equal(a.shield, 0); assert.equal(a.shieldTime, 0);
  a.rage = 400; for (let i = 0; i < 20; i++) w.tick(0.1); assert.ok(a.rage < 400);
});

test('a higher secondary active rank and expertise change the recorded second cast', () => {
  const heal = rank => {
    const { w, a, b } = field();
    ensureHero(a, 'rune-seer').skills[0] = rank;
    a.rage = 800; round(w, a, b); a.rage = 800; a.health = 1; nextRound(w);
    return [...w.battles.values()][0].sides[0].healed;
  };
  assert.ok(heal(2) > heal(1));
  const strike = skills => {
    const { w, a, b } = field((world, owner) => { const hero = ensureHero(owner, 'heracles'); hero.stars = 4; hero.skills = skills; world.command(owner, { type: 'pair-commander', targetId: 'heracles' }); });
    a.rage = 800; a.health = w.stats(a).maxHealth; b.health = w.stats(b).maxHealth;
    round(w, a, b); a.rage = 800; nextRound(w);
    return [...w.battles.values()][0].sides[0].damageDealt;
  };
  assert.equal(skillInfo({ heroRecords: { heracles: { numericVersion: 1, rarity: 'Legendary', xp: 0, stars: 4, skills: [5, 5, 5, 5], talents: {} } }, numericVersion: 1 }, 'heracles').expertise, true);
  assert.ok(strike([5, 5, 5, 5]) > strike([5, 5, 5, 4]));
});

test('PvE uses the PvE factor, casualties stay conserved, and commander state survives restart', () => {
  const { w, session, p } = city();
  const hero = own(p, 'wukong');
  w.command(p, { type: 'commander', targetId: 'wukong' });
  w.command(p, { type: 'forsaken-search', count: 1 });
  const found = p.forsaken.searchResult;
  assert.equal(found.status, 'found');
  const camp = w.camps.find(c => c.id === found.id);
  camp.health = 1e15;
  w.command(p, { type: 'attack', targetId: camp.id });
  for (let i = 0; i < 800 && Math.hypot(p.x - camp.x, p.z - camp.z) > 2; i++) w.tick(0.25);
  assert.ok(Math.hypot(p.x - camp.x, p.z - camp.z) <= 2);
  w.command(p, { type: 'stop' });
  const swing = () => {
    camp.health = 1e15; delete camp.encounter; camp.contributors = {}; p.rage = 0; p.cooldown = 0;
    w.command(p, { type: 'attack', targetId: camp.id }); w.tick(0.1);
    return camp.encounter.participants[p.id].damageDealt;
  };
  const base = swing();
  w.command(p, { type: 'stop' });
  p.commanderShards.wukong = 20;
  const damage = w.stats(p).damage;
  w.command(p, { type: 'upgrade-skill', targetId: 'wukong', skillIndex: 2 });
  assert.equal(w.stats(p).damage, damage); assert.ok(w.stats(p).pve > 1);
  assert.ok(swing() > base);
  const rival = w.authenticate(w.join('Rival', 'norse').token);
  rival.cityLevel = p.cityLevel = 2; p.x = p.homeX + 4; p.z = p.homeZ; rival.x = p.homeX + 5; rival.z = p.homeZ; rival.deployed = p.deployed = true;
  const before = census(rival); rival.health = 1; p.cooldown = rival.cooldown = 0;
  w.command(p, { type: 'stop' });
  w.command(p, { type: 'attack-player', targetId: rival.id }); w.tick(0.1);
  assert.equal(census(rival), before);
  const report = rival.battleReports[0];
  assert.equal(unitTotal(report.sides[1].unitsBefore), unitTotal(report.sides[1].unitsAfter) + unitTotal(report.sides[1].wounded));
  const wounded = unitTotal(rival.wounded);
  assert.ok(wounded > 0);
  rival.buildings.infirmary = 1;
  w.command(rival, { type: 'hospital-heal', units: { ...rival.wounded }, mythic: 0 });
  assert.equal(unitTotal(rival.wounded), 0); assert.equal(census(rival), before);
  for (let i = 0; i < 2000 && rival.healing; i++) w.tick(0.25);
  assert.equal(rival.healing, null); assert.equal(unitTotal(rival.reserveUnits), wounded); assert.equal(census(rival), before);
  hero.xp = xpAtLevel(hero, 10);
  camp.health = camp.maxHealth; delete camp.encounter;
  const saved = World.fromSave(w.toSave());
  const restored = saved.authenticate(session.token);
  assert.equal(restored.heroRecords.wukong.xp, hero.xp);
  assert.equal(restored.heroRecords.wukong.skills[2], 2);
  const restoredRival = [...saved.players.values()].find(player => player.name === 'Rival');
  assert.equal(unitTotal(restoredRival.reserveUnits), wounded);
  assert.equal(unitTotal(restoredRival.wounded), 0);
  if (!restored.ownedCommanders.includes('warden')) restored.ownedCommanders.push('warden');
  ensureHero(restored, 'warden');
  changeUnits(restored.units, 'infantry', -2); changeUnits(restored.reserveUnits, 'infantry', 2);
  restored.troops = unitTotal(restored.units); restored.reserveTroops = unitTotal(restored.reserveUnits);
  saved.command(restored, { type: 'deploy-march', targetId: 'warden', units: { infantry: 1, archers: 0, cavalry: 0 }, mythic: 0 });
  assert.throws(() => saved.command(restored, { type: 'deploy-march', targetId: 'warden', units: { infantry: 1, archers: 0, cavalry: 0 }, mythic: 0 }), /another march/);
  assert.throws(() => saved.command(restored, { type: 'deploy-march', targetId: 'wukong', units: { infantry: 1, archers: 0, cavalry: 0 }, mythic: 0 }), /another march/);
});
