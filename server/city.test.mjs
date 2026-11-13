import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { BUILDINGS, TECHNOLOGIES, resourceNodes, SUMMON_RULES } from './city-content.mjs';
import { buildingCard, technologyCard, capacity, passiveCap } from './city.mjs';
import { advanceDowntime, OFFLINE_PRODUCTION_CAP } from './downtime.mjs';
const advance = (w, seconds) => { for (let i = 0; i < Math.ceil(seconds * 10); i++) w.tick(0.1); };
const setup = options => { const w = testWorld(options), s = w.join('A'), p = w.authenticate(s.token); for (const id of ['wood', 'food', 'gold', 'stone', 'mana']) p[id] = 10000; return { w, p, s }; };
const cmd = (w, p, type, targetId, extra = {}) => w.command(p, { type, targetId, ...extra });
const build = (w, p, id) => { cmd(w, p, 'building-upgrade', id); advance(w, 80); };
const prepareAcademy = (w, p) => { build(w, p, 'oracle'); build(w, p, 'citadel'); build(w, p, 'academy'); };

test('institutions enforce hall caps, prerequisite chains and one shared construction lane', () => {
  const { w, p } = setup();
  assert.equal(BUILDINGS.length, 17);
  assert.throws(() => cmd(w, p, 'building-upgrade', 'academy'), /Citadel level 2/);
  build(w, p, 'oracle');
  assert.throws(() => cmd(w, p, 'building-upgrade', 'oracle'), /Citadel/);
  cmd(w, p, 'upgrade'); assert.throws(() => cmd(w, p, 'building-upgrade', 'quarry'), /busy/); advance(w, 21);
  assert.throws(() => cmd(w, p, 'upgrade'), /Athenaeum/);
  build(w, p, 'academy'); assert.throws(() => cmd(w, p, 'upgrade'), /Stoneworks/);
  build(w, p, 'quarry'); build(w, p, 'citadel'); assert.equal(p.cityLevel, 3);
  const before = { gold: p.gold, wood: p.wood, stone: p.stone };
  cmd(w, p, 'building-upgrade', 'quarry'); const job = p.construction;
  cmd(w, p, 'cancel-job', job.id); assert.deepEqual({ gold: p.gold, wood: p.wood, stone: p.stone }, before);
  assert.throws(() => cmd(w, p, 'building-upgrade', 'fake'));
});

test('research is independent, prerequisites are visible, buffs apply only on completion and refunds are atomic', () => {
  const { w, p } = setup(); prepareAcademy(w, p);
  const before = w.stats(p).damage;
  assert.throws(() => cmd(w, p, 'research', 'vitality'), /Formations/);
  cmd(w, p, 'research', 'drill'); cmd(w, p, 'building-upgrade', 'quarry'); cmd(w, p, 'train');
  assert.equal(w.stats(p).damage, before); assert.throws(() => cmd(w, p, 'research', 'harvest'), /busy/);
  advance(w, 13); assert.ok(w.stats(p).damage > before); assert.equal(p.reserveTroops, 5); assert.equal(p.buildings.quarry, 1);
  assert.throws(() => cmd(w, p, 'research', 'drill'), /level 2/);
  const gold = p.gold; cmd(w, p, 'research', 'vitality'); const id = p.research.id;
  cmd(w, p, 'cancel-job', id); assert.equal(p.gold, gold); assert.equal(p.technologies.vitality, 0);
  assert.throws(() => cmd(w, p, 'cancel-job', id));
  assert.equal(technologyCard(p, TECHNOLOGIES.find(t => t.id === 'vitality')).canResearch, true);
});

test('each research description corresponds to a functional stat or timer bonus', () => {
  const { w, p } = setup(); prepareAcademy(w, p); build(w, p, 'menagerie');
  p.cityLevel = 3; p.buildings.academy = 3;
  for (const id of ['harvest', 'masonry', 'writing', 'logistics', 'drill', 'vitality', 'march', 'beastlore']) {
    const oldStats = w.stats(p);
    const oldBuild = buildingCard(p, BUILDINGS.find(b => b.id === 'quarry')).nextDuration;
    const oldResearch = technologyCard(p, TECHNOLOGIES.find(t => t.id === 'drill')).duration;
    if (id === 'beastlore') p.mythic = 1;
    const mythicBefore = w.stats(p).damage;
    cmd(w, p, 'research', id); advance(w, 15);
    assert.equal(p.technologies[id], 1);
    if (id === 'masonry') assert.ok(buildingCard(p, BUILDINGS.find(b => b.id === 'quarry')).nextDuration < oldBuild);
    if (id === 'writing') assert.ok(technologyCard(p, TECHNOLOGIES.find(t => t.id === 'drill')).duration < oldResearch);
    if (id === 'logistics') assert.ok(w.stats(p).gather > oldStats.gather);
    if (id === 'drill') assert.ok(w.stats(p).damage > oldStats.damage);
    if (id === 'vitality') assert.ok(w.stats(p).maxHealth > oldStats.maxHealth);
    if (id === 'march') assert.ok(w.stats(p).speed > oldStats.speed);
    if (id === 'beastlore') assert.ok(w.stats(p).damage > mythicBefore);
  }
});

test('passive income pauses at the vault limit without deleting earned wealth; new nodes are gatherable', () => {
  const { w, p } = setup();
  p.wood = passiveCap(p) - 1; advance(w, 6); assert.equal(p.wood, passiveCap(p));
  p.wood = passiveCap(p) + 200; advance(w, 20); assert.equal(p.wood, passiveCap(p) + 200);
  for (const resource of ['stone', 'mana']) {
    const node = w.nodes.find(n => n.resource === resource); p.x = node.x; p.z = node.z;
    const amount = p[resource]; cmd(w, p, 'gather', node.id); advance(w, 3); cmd(w,p,'return'); advance(w,20); assert.ok(p[resource] > amount);
  }
});

test('barracks, menagerie and infirmary upgrades improve their actual systems', () => {
  const { w, p } = setup(); prepareAcademy(w, p); build(w, p, 'menagerie');
  const oldCapacity = capacity(p), oldHealing = w.stats(p).heal;
  build(w, p, 'barracks'); build(w, p, 'infirmary'); build(w, p, 'menagerie');
  assert.equal(capacity(p), oldCapacity + 5); assert.ok(w.stats(p).heal > oldHealing);
  cmd(w, p, 'train'); assert.ok(p.trainingQueue[0].duration < 8);
  cmd(w, p, 'recruit'); assert.ok(p.trainingQueue[1].duration < 20);
});

test('temple consumes sigils, duplicates yield shards, and every displayed rarity can occur', () => {
  const { w, p } = setup(); assert.throws(() => cmd(w, p, 'summon'), /Temple/);
  build(w, p, 'oracle'); p.sigils = 10;
  // Two rolls per summon: rarity, then a uniform commander index within its rarity.
  for (const [roll, rarity] of [[0, 'Legendary'], [0.05, 'Epic'], [0.25, 'Rare'], [0.60, 'Common']]) {
    const numbers = [roll, 0]; w.random = () => numbers.shift();
    cmd(w, p, 'summon', '', { count: 1 }); assert.equal(p.summonHistory[0].rarity, rarity);
  }
  const common = p.summonHistory[0].commanderId; w.random = () => 0.9;
  // Select the first common explicitly to repeat the prior result.
  let rollIndex = 0; w.random = () => (rollIndex++ % 2 === 0 ? 0.9 : 0);
  cmd(w, p, 'summon', '', { count: 1 }); assert.equal(p.summonHistory[0].commanderId, common);
  assert.equal(p.summonHistory[0].duplicate, true); assert.equal(p.commanderShards[common], SUMMON_RULES.duplicateShards.Common);
  assert.equal(p.sigils, 5);
});

test('pity guarantees reset correctly and persist through save/load', () => {
  const { w, p, s } = setup({ random: () => 0.99 }); build(w, p, 'oracle'); p.sigils = 60;
  cmd(w, p, 'summon', '', { count: 10 });
  assert.equal(p.summonHistory[0].rarity, 'Epic'); assert.equal(p.epicPity, 0); assert.equal(p.legendaryPity, 10);
  for (let i = 0; i < 3; i++) cmd(w, p, 'summon', '', { count: 10 });
  const restored = World.fromSave(w.toSave()); restored.random = () => 0.99;
  const q = restored.authenticate(s.token); assert.equal(q.legendaryPity, 40);
  cmd(restored, q, 'summon', '', { count: 10 });
  assert.equal(q.summonHistory[0].rarity, 'Legendary'); assert.equal(q.legendaryPity, 0); assert.equal(q.epicPity, 0);
  assert.equal(q.summonHistory.length, 20); assert.equal(q.summonCount, 50);
});

test('a batch is all-or-nothing on insufficient sigils and invalid counts; summons do not auto-spend gold', () => {
  const { w, p } = setup(); build(w, p, 'oracle'); p.sigils = 9;
  const gold = p.gold, history = p.summonHistory.length;
  assert.throws(() => cmd(w, p, 'summon', '', { count: 10 }));
  for (const count of [0, -1, 2, 100, '10', 1.5]) assert.throws(() => cmd(w, p, 'summon', '', { count }));
  assert.equal(p.sigils, 9); assert.equal(p.gold, gold); assert.equal(p.summonHistory.length, history);
  assert.throws(()=>cmd(w,p,'buy-sigil'),/closed/);p.aether=10;cmd(w,p,'premium-sigil');assert.equal(p.sigils,10);assert.equal(p.gold,gold);assert.equal(p.aether,0);
});

test('daily offering is once per UTC day, saved across restart, with explicit higher-level benefits', () => {
  let date = Date.UTC(2026, 10, 6, 12);
  const { w, p, s } = setup({ now: () => date }); build(w, p, 'oracle');
  const before = p.sigils; cmd(w, p, 'temple-offering'); assert.equal(p.sigils, before + 1);
  assert.throws(() => cmd(w, p, 'temple-offering'), /already/);
  const restored = World.fromSave(w.toSave(),{now:()=>date});
  const q = restored.authenticate(s.token); assert.throws(() => cmd(restored, q, 'temple-offering'));
  date += 86400000; q.buildings.oracle = 3; cmd(restored, q, 'temple-offering'); assert.equal(q.sigils, before + 3);
});

test('commander ascension spends specific shards once and changes stats without restoring field health', () => {
  const { w, p } = setup(); p.commanderShards.captain = 10; p.health = 20;
  const damage = w.stats(p).damage, gold = p.gold;
  cmd(w, p, 'upgrade-commander', 'captain');
  assert.equal(p.commanderRanks.captain, 1); assert.equal(p.commanderShards.captain, 0); assert.equal(p.gold, gold - 50);
  assert.ok(w.stats(p).damage > damage); assert.equal(p.health, 20);
  assert.throws(() => cmd(w, p, 'upgrade-commander', 'captain'));
});

test('self exchanges are closed before and after building the Agora',()=>{
 const {w,p}=setup();assert.throws(()=>cmd(w,p,'trade','timber-stone'),/closed/);p.cityLevel=2;build(w,p,'market');const wood=p.wood,stone=p.stone;
 assert.throws(()=>cmd(w,p,'trade','timber-stone'),/closed/);assert.equal(p.wood,wood);assert.equal(p.stone,stone);
});

test('forging has its own saved lane and relics must be equipped at home', () => {
  const { w, p, s } = setup(); p.cityLevel = 3; p.buildings.quarry = 2; build(w, p, 'forge');
  p.x = 30; p.z = 20; cmd(w, p, 'craft', 'aegis'); advance(w, 5);
  const restored = World.fromSave(w.toSave()), q = restored.authenticate(s.token); advance(restored, 11);
  assert.ok(q.ownedRelics.includes('aegis')); assert.throws(() => cmd(restored, q, 'equip-relic', 'aegis'), /home/);
  q.x = q.homeX; q.z = q.homeZ; const before = restored.stats(q).maxHealth;
  cmd(restored, q, 'equip-relic', 'aegis'); assert.ok(restored.stats(q).maxHealth > before);
  assert.throws(() => cmd(restored, q, 'craft', 'aegis'), /already/);
});

test('alliance assistance rejects self, outsiders and repeated help, and caps accepted helpers', () => {
  const { w, p } = setup(); p.cityLevel = 2; p.buildings.oathhall = 1;
  cmd(w, p, 'alliance-create', '', { name: 'Oathkeepers' });
  const ally = w.authenticate(w.join('Ally').token), outsider = w.authenticate(w.join('Other').token);
  ally.buildings.oathhall = 1; outsider.buildings.oathhall = 1;
  cmd(w, ally, 'alliance-join', p.allianceId); cmd(w, p, 'building-upgrade', 'oracle'); const job = p.construction;
  assert.throws(() => cmd(w, p, 'alliance-help', job.id)); assert.throws(() => cmd(w, outsider, 'alliance-help', job.id));
  const before = job.remaining; cmd(w, ally, 'alliance-help', job.id); assert.ok(job.remaining < before);
  assert.throws(() => cmd(w, ally, 'alliance-help', job.id), /already/);
  const helper2 = w.authenticate(w.join('Helper 2').token), helper3 = w.authenticate(w.join('Helper 3').token);
  for (const helper of [helper2, helper3]) { helper.buildings.oathhall = 1; cmd(w, helper, 'alliance-join', p.allianceId); }
  cmd(w, helper2, 'alliance-help', job.id);
  assert.throws(() => cmd(w, helper3, 'alliance-help', job.id), /maximum/);
});

test('schema-1 saves migrate once without losing queues, resources, commanders or existing beasts', () => {
  const { w, p, s } = setup(); p.cityLevel = 2; p.mythic = 1; cmd(w, p, 'train'); p.gold = 1234;
  const old = structuredClone(w.toSave()); old.schema = 1;
  const q = old.world.players[0];
  for (const field of ['buildings', 'technologies', 'stone', 'mana', 'sigils', 'research', 'crafting', 'economyClock', 'commanderShards', 'commanderRanks', 'summonHistory', 'summonCount', 'epicPity', 'legendaryPity', 'lastOfferingDay', 'ownedRelics', 'equippedRelic', 'productionCarry']) delete q[field];
  old.world.nodes = old.world.nodes.filter(n => !resourceNodes.some(r => r.id === n.id));
  const migrated = World.fromSave(old), city = migrated.authenticate(s.token);
  assert.equal(city.gold, 1234); assert.equal(city.trainingQueue.length, 1); assert.equal(city.mythic, 1);
  assert.equal(city.buildings.menagerie, 1); assert.equal(city.stone, 150); assert.equal(city.sigils, 3);
  assert.equal(migrated.nodes.length, 18); assert.equal(migrated.toSave().schema,21);
  city.sigils = 0; const again = World.fromSave(migrated.toSave()); assert.equal(again.authenticate(s.token).sigils, 0);
});

test('fractional economic bonuses produce the advertised gain even at a level-one farm', () => {
  const { w, p } = setup(); p.food = 0; p.technologies.harvest = 1;
  advance(w, 50.1); assert.equal(p.food, 23); // baseline 20 plus 15%
});

test('Blessed Fields pay a five-second cycle after 100 ms ticks, and a finished upgrade changes the next cycle', () => {
  const { w, p, s } = setup();
  p.food = 0; p.economyClock = 0; advance(w, 100); assert.equal(p.food, 40);
  assert.throws(() => cmd(w, p, 'building-upgrade', 'farm'), /Upgrade the Citadel first/);
  p.cityLevel = 2; p.wood = 0; p.gold = 0;
  assert.throws(() => cmd(w, p, 'building-upgrade', 'farm'), /Not enough resources/);
  assert.equal(p.buildings.farm, 1);
  p.wood = 10000; p.gold = 10000;
  cmd(w, p, 'building-upgrade', 'farm');
  advance(w, p.construction.duration + 0.2);
  assert.equal(p.buildings.farm, 2); assert.equal(p.construction, null);
  p.economyClock = 0; const food = p.food; advance(w, 5); assert.equal(p.food, food + 4);
  const other = w.authenticate(w.join('Neighbor').token);
  other.food = 0; other.economyClock = 0; p.economyClock = 0;
  const mine = p.food; advance(w, 5);
  assert.equal(p.food, mine + 4); assert.equal(other.food, 2);
  const loaded = World.fromSave(w.toSave()), q = loaded.authenticate(s.token);
  assert.equal(q.food, p.food); assert.equal(q.buildings.farm, 2); assert.equal(loaded.toSave().schema, 21);
});

test('the city card quotes the same five-second yield the server adds', () => {
  const { w, p } = setup();
  p.food = 0; p.wood = 0; p.stone = 0; p.gold = 0; p.mana = 0;
  const card = () => w.snapshot(p.id).players.find(player => player.id === p.id).cityBuildings.find(b => b.id === 'farm');
  assert.equal(card().productionPerFive, 2);
  advance(w, 5); assert.equal(p.food, 2);
  p.technologies.harvest = 1;
  assert.ok(Math.abs(card().productionPerFive - 2.3) < 1e-9);
  const before = p.food; advance(w, 5); assert.equal(p.food, before + 2);
  assert.equal(p.wood, 4); assert.equal(p.stone, 0); assert.equal(p.gold, 0); assert.equal(p.mana, 0);
});

test('eight hours of downtime fills the stockpile and another hour does not', () => {
  const at = Date.UTC(2026, 10, 9, 12);
  const w = testWorld({ now: () => at }), s = w.join('Fields'), p = w.authenticate(s.token);
  p.food = 0; p.wood = 0;
  const stone = p.stone, cap = passiveCap(p);
  advanceDowntime(w, at, at + OFFLINE_PRODUCTION_CAP * 1000);
  assert.equal(p.food, cap); assert.equal(p.wood, cap); assert.equal(p.stone, stone);
  advanceDowntime(w, at + OFFLINE_PRODUCTION_CAP * 1000, at + (OFFLINE_PRODUCTION_CAP + 3600) * 1000);
  assert.equal(p.food, cap); assert.equal(p.wood, cap); assert.equal(p.stone, stone);
  assert.equal(w.toSave().schema, 21);
});
