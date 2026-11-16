import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from './world.mjs';
import {ensureHero,xpAtLevel} from './progression.mjs';
import {marchTroopCap,ensureArmaments} from './city.mjs';
import {readFileSync} from 'node:fs';
const expected=JSON.parse(readFileSync(new URL('../research/parity/fixtures/secondary-passive-correction.json',import.meta.url),'utf8'));
function setup(id='wukong'){
 const w=new World({random:()=>.25}),s=w.join('Secondary correction'),p=w.authenticate(s.token);
 p.x=p.homeX=10;p.z=p.homeZ=10;
 // Explicit ownership/stars/material fixtures; upgrades and assignments use real commands.
 if(id==='captain'){p.ownedCommanders.push('warden');ensureHero(p,'warden');w.command(p,{type:'commander',targetId:'warden'});}
 if(!p.ownedCommanders.includes(id))p.ownedCommanders.push(id);const hero=ensureHero(p,id);hero.stars=6;hero.skills=[1,1,1,1];
 p.commanderShards[id]=100;ensureArmaments(p);
 w.command(p,{type:'pair-commander',targetId:id});return {w,p,s,hero,id};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const families=[
 ...['wukong','heracles','sigurd','atalanta','tomoe'].map(id=>[id,['damage','pve','maxHealth']]),
 ['scout',['gather','speed','maxHealth']],
 ...['captain','warden'].map(id=>[id,['maxHealth','gather','mitigation']]),
 ...['rune-seer','mulan','horus-champion'].map(id=>[id,['maxHealth','heal','mitigation']])
];
test('actual secondary offensive skill upgrade changes damage by the advertised local factor',()=>{
 const {w,p}=setup(),before=w.stats(p).damage;
 w.command(p,{type:'upgrade-skill',targetId:'wukong',skillIndex:1});
 near(w.stats(p).damage/before,expected.wukongDamageBySkillRank['2']/expected.wukongDamageBySkillRank['1']);
 w.command(p,{type:'unpair-commander'});const alone=w.stats(p).damage;
 w.command(p,{type:'pair-commander',targetId:'wukong'});near(w.stats(p).damage/alone,expected.wukongDamageBySkillRank['2']);
});
test('secondary level changes neither stats nor primary march capacity at fixed learned skills',()=>{
 const {w,p,hero}=setup(),before=w.stats(p),capacity=marchTroopCap(p);
 hero.xp=xpAtLevel(hero,60);
 assert.deepEqual(w.stats(p),before);assert.equal(marchTroopCap(p),capacity);
});
test('every supported passive family affects the appropriate secondary stats once',()=>{
 for(const [id,fields]of families){
  const {w,p}=setup(id);
  for(let index=1;index<=3;index++){const before=w.stats(p)[fields[index-1]];w.command(p,{type:'upgrade-skill',targetId:id,skillIndex:index});assert.ok(w.stats(p)[fields[index-1]]>before,`${id} skill${index} inert`);}
 }
});
test('the same supported skill families still function when assigned as primary',()=>{
 for(const [id,fields]of families){
  const {w,p}=setup(id);w.command(p,{type:'unpair-commander'});w.command(p,{type:'commander',targetId:id});
  for(let index=1;index<=3;index++){const before=w.stats(p)[fields[index-1]];w.command(p,{type:'upgrade-skill',targetId:id,skillIndex:index});assert.ok(w.stats(p)[fields[index-1]]>before,`${id} primary skill${index} inert`);}
 }
});
test('secondary talent and equipment have no stat effect; the same equipment works on primary',()=>{
 const {w,p,hero}=setup();hero.xp=xpAtLevel(hero,60);const before=w.stats(p);
 hero.talents={'line-oath':1};p.ownedArmaments.push('frontier-spearhead');
 w.command(p,{type:'equip-armament',targetId:'frontier-spearhead',name:'wukong'});
 assert.deepEqual(w.stats(p),before);
 w.command(p,{type:'unpair-commander'});w.command(p,{type:'commander',targetId:'wukong'});
 const equipped=w.stats(p).damage;
 w.command(p,{type:'unequip-armament',targetId:'weapon',name:'wukong'});
 assert.ok(w.stats(p).damage<equipped);
});
test('save/load preserves secondary skills, troops and XP while capping obsolete derived HP',()=>{
 const {w,p,s,hero}=setup();hero.xp=xpAtLevel(hero,60);
 w.command(p,{type:'upgrade-skill',targetId:'wukong',skillIndex:1});
 p.health=w.stats(p).maxHealth*1.6;const expected=w.stats(p),units={...p.units},xp=hero.xp;
 const retained=structuredClone({inventory:p.inventory,wounded:p.wounded,reserveTroops:p.reserveTroops,owned:p.ownedCommanders,gold:p.gold,shards:p.commanderShards});
 const r=World.fromSave(w.toSave()),q=r.authenticate(s.token);
 assert.equal(q.health,expected.maxHealth);assert.deepEqual(q.units,units);assert.equal(q.troops,p.troops);
 assert.equal(q.heroRecords.wukong.xp,xp);assert.equal(q.heroRecords.wukong.skills[1],2);assert.deepEqual(r.stats(q),expected);
 assert.deepEqual({inventory:q.inventory,wounded:q.wounded,reserveTroops:q.reserveTroops,owned:q.ownedCommanders,gold:q.gold,shards:q.commanderShards},retained);
 const again=World.fromSave(r.toSave());assert.equal(again.authenticate(s.token).health,q.health);
});
test('secondary passive upgrade affects actual first-round PvP damage',()=>{
 const hit=rank=>{const {w,p}=setup();if(rank===2)w.command(p,{type:'upgrade-skill',targetId:'wukong',skillIndex:1});
  const q=w.authenticate(w.join('Combat target').token);p.cityLevel=q.cityLevel=2;q.homeX=30;q.homeZ=10;
  p.x=20;p.z=20;q.x=21;q.z=20;p.deployed=q.deployed=true;p.health=w.stats(p).maxHealth;q.health=w.stats(q).maxHealth;
  w.command(p,{type:'attack-player',targetId:q.id});w.tick(.25);
  const battle=[...w.battles.values()][0];assert.ok(battle);assert.equal(battle.rounds,1);
  return battle.sides.find(s=>s.armyId===p.id).damageDealt;};
 assert.ok(hit(2)>hit(1));
});
