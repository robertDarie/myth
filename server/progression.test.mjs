import { fixtureCommand } from './testing/roster-fixture.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { AGES, age, crews, armyList, constructionJobs, heroLevel, skillInfo, activeSkill } from './progression.mjs';
const advance = (w, n) => { for (let i = 0; i < Math.ceil(n * 10); i++) w.tick(0.1); };
const setup = () => { const w = testWorld(), session = w.join('A'), p = w.authenticate(session.token); for (const key of ['food','wood','gold','stone','mana']) p[key] = 10000; return { w,p,session }; };
const cmd = (w,p,type,extra={}) => fixtureCommand(w,p,{type,...extra});
const unlock = (w,p,id) => cmd(w,p,'unlock-commander',{targetId:id});
function deploy(w,p,id,troops=5) {
  unlock(w,p,id); cmd(w,p,'deploy-march',{targetId:id,troops,mythic:0}); return p.marches.at(-1);
}

test('five ages unlock exactly one through five real march slots', () => {
  const {w,p} = setup(); assert.equal(AGES.length,5);
  p.reserveTroops = 25;p.reserveUnits.infantry=25; unlock(w,p,'warden');
  cmd(w,p,'move',{x:12,z:12});
  const ids=['warden','scout','atalanta','mulan'];
  for (let level=2;level<=5;level++) {
    p.cityLevel=level; assert.equal(age(p).marches,level);
    if (!p.ownedCommanders.includes(ids[level-2])) unlock(w,p,ids[level-2]);
    cmd(w,p,'deploy-march',{targetId:ids[level-2],troops:5});
    assert.equal(armyList(p).length,level);
    const march=p.marches.at(-1);cmd(w,p,'move',{marchId:march.id,x:14,z:14});
  }
  assert.equal(p.reserveTroops,5); assert.equal(w.snapshot().armies.length,5);
  assert.throws(()=>cmd(w,p,'deploy-march',{targetId:'rune-seer',troops:5}),/Five prepared/);
});

test('march deployment consumes real reserves and rejects duplicate commanders, bad counts and unowned heroes', () => {
  const {w,p} = setup(); p.cityLevel=3; unlock(w,p,'warden');
  assert.throws(()=>cmd(w,p,'deploy-march',{targetId:'warden',troops:5}),/reserves/);
  cmd(w,p,'train'); advance(w,9); assert.equal(p.reserveTroops,5);
  cmd(w,p,'deploy-march',{targetId:'warden',troops:5}); assert.equal(p.reserveTroops,0); assert.equal(p.marches[0].troops,5);
  p.reserveTroops=20;p.reserveUnits.infantry=20;
  assert.throws(()=>cmd(w,p,'deploy-march',{targetId:'warden',troops:5}),/another march/);
  for (const troops of [-1,1,2.5,'5']) assert.throws(()=>cmd(w,p,'deploy-march',{targetId:'scout',troops}));
  assert.throws(()=>cmd(w,p,'deploy-march',{targetId:'heracles',troops:5}),/recruited/);
  assert.equal(p.reserveTroops,20);
});

test('independent gathering marches contribute to one treasury; player tokens cannot command another city march', () => {
  const {w,p} = setup(); p.cityLevel=2;p.reserveTroops=5;p.reserveUnits.infantry=5;const a=deploy(w,p,'scout');
  const wood=w.nodes[0], gold=w.nodes[1];p.x=wood.x;p.z=wood.z;a.x=gold.x;a.z=gold.z;
  cmd(w,p,'gather',{targetId:wood.id});cmd(w,p,'gather',{targetId:gold.id,marchId:a.id});
  const before={wood:p.wood,gold:p.gold};advance(w,3);
  assert.equal(p.wood,before.wood);assert.equal(p.gold,before.gold);assert.ok(p.cargo.wood>0);assert.ok(a.cargo.gold>0);assert.equal(p.target.id,wood.id);assert.equal(a.target.id,gold.id);
  const other=w.authenticate(w.join('Other').token);const position=a.x;
  assert.throws(()=>cmd(w,other,'move',{marchId:a.id,x:10,z:10}),/belong/);assert.equal(a.x,position);
  cmd(w,p,'return',{marchId:a.id});assert.equal(p.target.id,wood.id);assert.equal(a.target.type,'return');
});

test('global training capacity counts all marches and commander/relic assignments are unique', () => {
  const {w,p}=setup();p.cityLevel=2;p.reserveTroops=40;p.reserveUnits.infantry=40;const a=deploy(w,p,'scout',40);
  assert.throws(()=>cmd(w,p,'train'),/capacity/);
  assert.throws(()=>cmd(w,p,'commander',{targetId:'scout'}),/already leads/);
  p.ownedRelics.push('aegis');cmd(w,p,'equip-relic',{targetId:'aegis'});
  assert.throws(()=>cmd(w,p,'equip-relic',{targetId:'aegis',marchId:a.id}),/another march/);
});

test('multiple marches cannot multiply a city kill reward or duplicate commander experience', () => {
  const {w,p}=setup();p.cityLevel=3;p.reserveTroops=10;p.reserveUnits.infantry=10;
  deploy(w,p,'warden');deploy(w,p,'scout');const camp=w.camps[0];
  for(const a of armyList(p)){a.x=camp.x-1;a.z=camp.z;cmd(w,p,'attack',{targetId:camp.id,marchId:a.id});}
  const gold=p.gold;advance(w,15);assert.equal(camp.health,0);assert.equal(p.gold-gold,50);assert.equal(p.kills,1);
  const experience=armyList(p).reduce((n,a)=>n+p.heroRecords[a.commanderId].xp,0);
  assert.ok(Math.abs(experience-25)<0.001);
});

test('returning a secondary march to reserves requires full recovery and never duplicates units', () => {
  const {w,p}=setup();p.cityLevel=2;p.reserveTroops=5;p.reserveUnits.infantry=5;const a=deploy(w,p,'warden');
  a.health=1;assert.throws(()=>cmd(w,p,'disband-march',{marchId:a.id}),/Recover fully/);
  advance(w,10);cmd(w,p,'disband-march',{marchId:a.id});assert.equal(p.reserveTroops,5);assert.equal(p.marches.length,0);
  assert.throws(()=>cmd(w,p,'disband-march',{marchId:a.id}));assert.equal(p.reserveTroops,5);
  assert.throws(()=>cmd(w,p,'disband-march'),/founding/);
});

test('a second builder is permanently earned, runs independent jobs, and cannot double-upgrade one building', () => {
  const {w,p}=setup();assert.equal(crews(p),1);
  assert.throws(()=>cmd(w,p,'building-upgrade',{targetId:'builders'}),/Citadel level 2/);
  cmd(w,p,'upgrade');advance(w,21);
  cmd(w,p,'building-upgrade',{targetId:'builders'});advance(w,13);assert.equal(crews(p),2);
  cmd(w,p,'building-upgrade',{targetId:'oracle'});
  assert.throws(()=>cmd(w,p,'building-upgrade',{targetId:'oracle'}),/already/);
  cmd(w,p,'building-upgrade',{targetId:'quarry'});assert.equal(constructionJobs(p).length,2);
  assert.throws(()=>cmd(w,p,'building-upgrade',{targetId:'mint'}),/busy/);
  advance(w,13);assert.equal(p.buildings.oracle,1);assert.equal(p.buildings.quarry,1);assert.equal(constructionJobs(p).length,0);
  cmd(w,p,'building-upgrade',{targetId:'farm'});cmd(w,p,'building-upgrade',{targetId:'lumber'});
  const id=p.secondConstruction.id, food=p.food, refund=p.secondConstruction.cost.food;cmd(w,p,'cancel-job',{targetId:id});
  assert.equal(p.food,food+refund);
  assert.equal(constructionJobs(p).length,1);
});

test('hero XP, star promotion and targeted skill upgrades are separate from ascension ranks', () => {
  const {w,p}=setup();const r=p.heroRecords.captain;
  assert.equal(r.stars,1);assert.deepEqual(r.skills,[1,0,0,0]);
  assert.throws(()=>cmd(w,p,'promote-commander',{targetId:'captain'}),/level cap/);
  assert.throws(()=>cmd(w,p,'upgrade-skill',{targetId:'captain',skillIndex:1}),/unlocked/);
  for(let i=0;i<9;i++)cmd(w,p,'mentor-commander',{targetId:'captain'});
  assert.equal(heroLevel(r),10);assert.throws(()=>cmd(w,p,'mentor-commander',{targetId:'captain'}));
  cmd(w,p,'promote-commander',{targetId:'captain'});assert.equal(r.stars,2);assert.equal(r.skills[1],1);
  p.commanderShards.captain=10;const hp=p.health;
  cmd(w,p,'upgrade-skill',{targetId:'captain',skillIndex:0});assert.deepEqual(r.skills,[2,1,0,0]);
  assert.equal(p.commanderRanks.captain??0,0);assert.equal(p.health,hp);
  assert.throws(()=>cmd(w,p,'upgrade-skill',{targetId:'captain',skillIndex:0}),/Shards/);
});

test('rage triggers an automatic shield, damage, or bounded healing and expertise strengthens the active effect', () => {
  for(const [hero,kind]of[['captain','shield'],['heracles','damage'],['rune-seer','heal']]){
    const {w,p}=setup();if(hero!=='captain')cmd(w,p,'commander',{targetId:hero});
    const camp=w.camps[3];p.x=camp.x-1;p.z=camp.z;p.rage=800;p.health=50;
    cmd(w,p,'attack',{targetId:camp.id});const health=camp.health;w.tick(0.1);
    assert.equal(p.rage,0);assert.equal(p.skillCasts,1);assert.ok(p.lastSkill);
    if(kind==='shield')assert.ok(p.shieldTime>0);
    if(kind==='damage')assert.ok(health-camp.health>w.stats(p).damage*2);
    if(kind==='heal')assert.ok(p.health>50-24);
    assert.ok(p.health<=w.stats(p).maxHealth);
  }
  const {w,p}=setup();cmd(w,p,'commander',{targetId:'heracles'});
  p.heroRecords.heracles.stars=4;p.heroRecords.heracles.skills=[5,5,5,5];
  assert.equal(skillInfo(p,'heracles').expertise,true);assert.equal(skillInfo(p,'captain').expertise,false);
  p.rage=1000;const expertDamage=activeSkill(p,p,{damage:10,maxHealth:100});
  p.heroRecords.heracles.stars=1;p.heroRecords.heracles.skills=[5,0,0,0];p.rage=1000;
  assert.ok(expertDamage>activeSkill(p,p,{damage:10,maxHealth:100}));
});

test('five formations, both construction jobs and accepted movement survive schema-14 reload', () => {
  const {w,p,session}=setup();p.cityLevel=5;p.buildings.builders=1;p.reserveTroops=20;p.reserveUnits.infantry=20;
  for(const id of['warden','scout','atalanta','mulan'])deploy(w,p,id);
  cmd(w,p,'building-upgrade',{targetId:'oracle'});cmd(w,p,'building-upgrade',{targetId:'quarry'});
  cmd(w,p,'move',{marchId:p.marches[0].id,x:20,z:20});advance(w,2);
  const position=p.marches[0].x, restored=World.fromSave(w.toSave()),q=restored.authenticate(session.token);
  assert.equal(armyList(q).length,5);assert.equal(constructionJobs(q).length,2);assert.equal(crews(q),2);
  assert.equal(q.marches[0].x,position);assert.equal(q.marches[0].target.type,'move');assert.equal(restored.toSave().schema,18);
  advance(restored,11);assert.equal(q.buildings.oracle,1);assert.equal(q.buildings.quarry,1);
});

test('schema-2 migration preserves the founding army, paid job and legacy commander XP', () => {
  const {w,p,session}=setup();cmd(w,p,'upgrade');p.xp=1100;
  const old=structuredClone(w.toSave());old.schema=2;
  const a=old.world.players[0];for(const key of['heroRecords','marches','secondConstruction','rage','shield','shieldTime','lastSkill','skillCasts'])delete a[key];
  delete a.buildings.builders;
  const restored=World.fromSave(old),q=restored.authenticate(session.token);
  assert.equal(q.construction.type,'upgrade');assert.equal(q.troops,20);assert.equal(q.heroRecords.captain.xp,1100);
  assert.equal(q.heroRecords.captain.stars,2);assert.equal(q.marches.length,0);assert.equal(q.buildings.builders,0);
});

test('a secondary march can capture for its owner while the founding march gathers', () => {
  const {w,p}=setup();p.cityLevel=2;p.reserveTroops=5;p.reserveUnits.infantry=5;const a=deploy(w,p,'scout');
  cmd(w,p,'alliance-create',{name:'Marching Oath'});
  w.flags.push({health:250,maxHealth:250,buildRemaining:0,isRoot:true,connected:true,id:'territory',allianceId:p.allianceId,x:20,z:20});
  a.x=20;a.z=23;cmd(w,p,'capture',{marchId:a.id,targetId:'shrine-dawn'});
  cmd(w,p,'gather',{targetId:w.nodes[0].id});advance(w,16);
  assert.equal(w.sites[0].allianceId,p.allianceId);assert.equal(p.target.type,'gather');
});

test('six stars cap a commander at level 60, and a relic can be unequipped before transfer', () => {
  const {w,p}=setup();const r=p.heroRecords.captain;r.stars=5;r.xp=4900;r.skills=[1,1,1,1];
  cmd(w,p,'promote-commander',{targetId:'captain'});assert.equal(r.stars,6);assert.equal(r.skills.length,4);
  r.xp=5900;assert.equal(heroLevel(r),60);assert.throws(()=>cmd(w,p,'promote-commander',{targetId:'captain'}));
  assert.throws(()=>cmd(w,p,'mentor-commander',{targetId:'captain'}));
  p.cityLevel=2;p.reserveTroops=5;p.reserveUnits.infantry=5;const a=deploy(w,p,'scout');p.ownedRelics.push('aegis');
  cmd(w,p,'equip-relic',{targetId:'aegis'});cmd(w,p,'unequip-relic');
  cmd(w,p,'equip-relic',{targetId:'aegis',marchId:a.id});assert.equal(a.equippedRelic,'aegis');assert.equal(p.equippedRelic,'');
});

test('all five ages are reachable through the real prerequisite graph with two legal crews', () => {
  const {w,p}=setup();
  const finish=id=>{cmd(w,p,'building-upgrade',{targetId:id});advance(w,85);};
  finish('citadel');finish('builders');finish('oracle');finish('academy');finish('quarry');finish('menagerie');
  finish('citadel'); // age three
  finish('barracks');finish('barracks');finish('infirmary');finish('citadel'); // age four
  finish('academy');finish('academy');finish('menagerie');finish('quarry');finish('forge');finish('citadel');
  assert.equal(p.cityLevel,5);assert.equal(age(p).marches,5);assert.equal(crews(p),2);
  for(let i=0;i<4;i++){cmd(w,p,'train');advance(w,9);}
  for(const id of['warden','scout','atalanta','mulan'])deploy(w,p,id);
  assert.equal(armyList(p).length,5);assert.ok(p.gold>=0&&p.wood>=0&&p.stone>=0);
});
