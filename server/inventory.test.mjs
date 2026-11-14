import { legacyMap } from './testing/legacy-save.mjs';
import { fixtureCommand } from './testing/roster-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
import { powerOf,rankings } from './power.mjs';
const fixture=()=>{const w=testWorld({now:()=>Date.UTC(2026,10,8)}),s=w.join('Supplied'),p=w.authenticate(s.token);return {w,s,p};};
const cmd=(w,p,type,extra={})=>fixtureCommand(w,p,{type,...extra});
test('founding inventory is once-only, unopened packs are not spendable wealth and pack opening is exact',()=>{
 const {w,p}=fixture(),food=p.food;cmd(w,p,'inventory-supplies');assert.equal(p.food,food);assert.equal(p.inventory['food-pack-100'],2);
 assert.throws(()=>cmd(w,p,'inventory-supplies'),/already/);cmd(w,p,'inventory-use',{targetId:'food-pack-100',count:2});assert.equal(p.food,food+200);assert.equal(p.inventory['food-pack-100'],0);
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'food-pack-100',count:1}),/Not enough/);
 assert.equal(p.journey.metrics.food,0);assert.equal(p.daily.counters.gather,0);
});
test('invalid item IDs, fractions, zero, negative and oversized quantities never deduct items or grant resources',()=>{
 const {w,p}=fixture();cmd(w,p,'inventory-supplies');const before=structuredClone(w.toSave());
 for(const count of [-1,0,.5,101,NaN])assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'wood-pack-100',count}));
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'forged-pack',count:1}));assert.deepEqual(w.toSave(),before);
});
test('speedups affect one owned eligible job, never adjacent queues or another city',()=>{
 const {w,p}=fixture();cmd(w,p,'inventory-supplies');cmd(w,p,'upgrade');cmd(w,p,'train');
 const training=p.trainingQueue[0],construction=p.construction,before=training.remaining;
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'build-minute',count:1,jobId:training.id}),/only for construction/);
 const other=w.authenticate(w.join('Other').token);cmd(w,other,'train');
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'universal-minute',count:1,jobId:other.trainingQueue[0].id}),/owned/);
 cmd(w,p,'inventory-use',{targetId:'build-minute',count:1,jobId:construction.id});assert.ok(construction.remaining<.001);assert.equal(training.remaining,before);
 w.tick(.1);assert.equal(p.cityLevel,2);assert.equal(p.construction,null);assert.equal(p.inventory['build-minute'],0);
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'universal-minute',count:1,jobId:construction.id}),/owned/);
});
test('universal hourglass targets only active training head and settles once across save/reload',()=>{
 const {w,p,s}=fixture();cmd(w,p,'inventory-supplies');cmd(w,p,'train');cmd(w,p,'train',{targetId:'archers'});
 const first=p.trainingQueue[0],second=p.trainingQueue[1];
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'universal-minute',count:1,jobId:second.id}),/owned/);
 assert.throws(()=>cmd(w,p,'inventory-use',{targetId:'universal-minute',count:2,jobId:first.id}),/Fewer/);
 cmd(w,p,'inventory-use',{targetId:'universal-minute',count:1,jobId:first.id});
 const loaded=World.fromSave(w.toSave()),q=loaded.authenticate(s.token);loaded.tick(.1);
 assert.equal(q.reserveUnits.infantry,5);assert.equal(q.trainingQueue[0].id,second.id);assert.ok(q.trainingQueue[0].remaining>9.8);
 const again=World.fromSave(loaded.toSave());again.tick(.1);assert.equal(again.authenticate(s.token).reserveUnits.infantry,5);
});
test('inventory migrates schema 11 without historical grants and rejects damaged current inventory',()=>{
 const {w,p,s}=fixture();const old=structuredClone(w.toSave());legacyMap(old);old.schema=11;delete old.world.players[0].inventory;delete old.world.players[0].suppliesClaimed;
 const migrated=World.fromSave(old).authenticate(s.token);assert.deepEqual(migrated.inventory,{});assert.equal(migrated.suppliesClaimed,false);
 for(const bad of [null,{'forged-item':1},{'food-pack-100':-1},{'food-pack-100':1.2}]){const save=structuredClone(w.toSave());save.world.players[0].inventory=bad;assert.throws(()=>World.fromSave(save),/inventory/);}
 cmd(w,p,'inventory-supplies');const restored=World.fromSave(w.toSave());assert.throws(()=>cmd(restored,restored.authenticate(s.token),'inventory-supplies'),/already/);
});
test('inventory is private while rankings expose only deliberate public power fields',()=>{
 const {w,p,s}=fixture(),other=w.authenticate(w.join('Other').token);cmd(w,p,'inventory-supplies');
 const view=w.snapshot(other.id),foreign=view.players.find(row=>row.id===p.id);if(foreign)assert.equal(foreign.inventory,undefined);
 const entry=view.rankings.players.find(row=>row.id===p.id);assert.ok(entry);assert.deepEqual(Object.keys(entry).sort(),['allianceId','civilization','id','name','power']);
 assert.ok(w.snapshot(p.id).players.find(row=>row.id===p.id).inventory.items.some(i=>i.count>0));
});
test('power is derived, deterministic and invariant under moving ready troops into a march',()=>{
 const {w,p}=fixture();p.cityLevel=2;p.gold=10000;cmd(w,p,'unlock-commander',{targetId:'atalanta'});
 p.reserveUnits.infantry=5;p.reserveTroops=5;const before=powerOf(p).total;
 cmd(w,p,'deploy-march',{targetId:'atalanta',units:{infantry:5,archers:0,cavalry:0},mythic:0});assert.equal(powerOf(p).total,before);
 const power=powerOf(p);assert.equal(power.total,power.city+power.research+power.heroes+power.ready+power.deployed);
 p.wounded.infantry=10;assert.equal(powerOf(p).total,before);cmd(w,p,'inventory-supplies');assert.equal(powerOf(p).total,before);
 assert.deepEqual(rankings(w),rankings(w));
});
