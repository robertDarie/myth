import { fixtureCommand } from './testing/roster-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { World } from './world.mjs';
import { KingdomDatabase } from './database.mjs';
import { createGameServer } from './http.mjs';
import { tempDirectory } from './testing/cleanup.mjs';
import { TROOP_TYPES,unitTotal,countOf,legacyUnits,changeUnits,troopBase,tierLock } from './troops.mjs';
import { counterMultiplier,retreat } from './war.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
const command=(w,p,type,extra={})=>fixtureCommand(w,p,{type,...extra});
const advance=(w,seconds)=>{for(let i=0;i<Math.ceil(seconds/.1);i++)w.tick(.1);};
function fixture(){const w=testWorld(),s=w.join('Veteran City'),p=w.authenticate(s.token);p.gold=p.food=p.wood=p.stone=p.mana=10000;return {w,s,p};}
function unlock(w,p){
 command(w,p,'upgrade');advance(w,21);
 for(const id of ['oracle','academy','academy','barracks']){command(w,p,'building-upgrade',{targetId:id});advance(w,25);}
 command(w,p,'research',{targetId:'drill'});advance(w,13);
 command(w,p,'research',{targetId:'veterans'});advance(w,13);
}
const census=p=>[p,...p.marches].reduce((n,a)=>n+a.troops,0)+p.reserveTroops+unitTotal(p.wounded)+(p.healing?unitTotal(p.healing.units):0)+p.trainingQueue.filter(j=>['train','promote'].includes(j.type)).reduce((n,j)=>n+j.amount,0);
function reserves(w,p,id='infantry'){command(w,p,'train',{targetId:id});advance(w,15);}
test('a legal city/research path unlocks veteran training for all three classes',()=>{
 const {w,p}=fixture();for(const id of ['veteranInfantry','veteranArchers','veteranCavalry'])assert.throws(()=>command(w,p,'train',{targetId:id}));
 unlock(w,p);assert.equal(p.technologies.veterans,1);assert.throws(()=>command(w,p,'research',{targetId:'veterans'}),/Maximum/);
 for(const id of ['veteranInfantry','veteranArchers','veteranCavalry']){assert.equal(tierLock(p,TROOP_TYPES.find(t=>t.id===id)),'');command(w,p,'train',{targetId:id});advance(w,21);assert.equal(p.reserveUnits[id],5);}
 assert.equal(p.reserveTroops,15);
});
test('promotion reserves five soldiers, preserves capacity, costs only the difference and never awards new-training activity',()=>{
 const {w,p}=fixture();unlock(w,p);reserves(w,p);const before=census(p),trained=p.daily.counters.trained,food=p.food,gold=p.gold;
 command(w,p,'promote',{targetId:'veteranInfantry'});assert.equal(census(p),before);assert.equal(p.reserveUnits.infantry,0);assert.equal(p.food,food-40);assert.equal(p.gold,gold-16);
 advance(w,6);assert.equal(p.reserveUnits.veteranInfantry,5);assert.equal(census(p),before);assert.equal(p.daily.counters.trained,trained);
});
test('cancelled and stale promotions return source units/refund once without manufacturing veterans',()=>{
 const {w,p}=fixture();unlock(w,p);reserves(w,p);const before=census(p),food=p.food,gold=p.gold;
 command(w,p,'promote',{targetId:'veteranInfantry'});const job=p.trainingQueue[0];command(w,p,'cancel-job',{targetId:job.id});
 assert.equal(census(p),before);assert.equal(p.reserveUnits.infantry,5);assert.equal(countOf(p.reserveUnits,'veteranInfantry'),0);assert.equal(p.food,food);assert.equal(p.gold,gold);
 assert.throws(()=>command(w,p,'cancel-job',{targetId:job.id}));
});
test('promotion cannot consume deployed units, locked classes, or more reserves than exist',()=>{
 const {w,p}=fixture();assert.throws(()=>command(w,p,'promote',{targetId:'veteranInfantry'}));unlock(w,p);
 assert.throws(()=>command(w,p,'promote',{targetId:'veteranInfantry'}),/ready/);
 reserves(w,p);command(w,p,'promote',{targetId:'veteranInfantry'});
 assert.throws(()=>command(w,p,'promote',{targetId:'veteranInfantry'}),/ready/);assert.throws(()=>command(w,p,'promote',{targetId:'infantry'}),/ready/);
});
test('a mixed-tier march gets stronger stats, preserves counters and keeps cavalry mobility',()=>{
 const basic={units:legacyUnits(10),troops:10,mythic:0},veteran={units:{...legacyUnits(0),veteranInfantry:10},troops:10,mythic:0};
 assert.ok(troopBase(veteran).health>troopBase(basic).health);assert.ok(troopBase(veteran).damage>troopBase(basic).damage);
 const riders={units:{...legacyUnits(0),veteranCavalry:10},troops:10,mythic:0};assert.equal(counterMultiplier(veteran,riders),1.15);assert.equal(counterMultiplier(riders,veteran),.85);assert.equal(troopBase(riders).speed,1.2);
 const archers={units:{...legacyUnits(0),veteranArchers:10},troops:10,mythic:0};assert.equal(counterMultiplier(archers,veteran),1.15);
});
test('veterans can assemble, march, attack a camp, reinforce and disband with exact type conservation',()=>{
 const {w,p}=fixture();unlock(w,p);command(w,p,'train',{targetId:'veteranArchers'});advance(w,18);
 command(w,p,'unlock-commander',{targetId:'atalanta'});command(w,p,'deploy-march',{targetId:'atalanta',units:{...legacyUnits(0),veteranArchers:5}});const a=p.marches[0];assert.equal(p.reserveTroops,0);const before=census(p);
 const stats=w.stats(a);assert.ok(stats.damage>troopBase({units:{infantry:0,archers:5,cavalry:0},troops:5,mythic:0}).damage);
 const camp=w.camps[0];a.x=camp.x;a.z=camp.z;command(w,p,'attack',{marchId:a.id,targetId:camp.id});w.tick(.1);assert.ok(camp.health<camp.maxHealth);assert.equal(census(p),before);
 a.x=p.homeX;a.z=p.homeZ;a.target=null;a.health=w.stats(a).maxHealth;
 command(w,p,'train',{targetId:'veteranArchers'});advance(w,18);command(w,p,'reinforce',{marchId:a.id});assert.equal(a.units.veteranArchers,10);
 command(w,p,'disband-march',{marchId:a.id});assert.equal(p.reserveUnits.veteranArchers,10);assert.equal(census(p),before+5);
});
test('veteran wounds, paid treatment and hospital cancellation retain the tier through save/reload',()=>{
 const {w,p,s}=fixture();unlock(w,p);p.units={...legacyUnits(0),veteranInfantry:20};p.troops=20;
 const result={wounded:legacyUnits(0),woundedMythic:0};retreat(w,p,result);assert.equal(p.wounded.veteranInfantry,5);assert.equal(p.units.veteranInfantry,15);
 const before=census(p),food=p.food;command(w,p,'hospital-heal',{units:{...legacyUnits(0),veteranInfantry:5}});assert.equal(p.food,food-20);assert.equal(census(p),before);
 const restored=World.fromSave(w.toSave()),q=restored.authenticate(s.token);const id=q.healing.id;command(restored,q,'hospital-cancel',{targetId:id});assert.equal(q.wounded.veteranInfantry,5);
 command(restored,q,'hospital-heal',{units:{...legacyUnits(0),veteranInfantry:5}});advance(restored,15);assert.equal(q.reserveUnits.veteranInfantry,5);assert.equal(census(q),before);
});
test('schema 12 preserves old troop counts and pending training; invalid tier data and promotion sources are rejected',()=>{
 const {w,p,s}=fixture();command(w,p,'train');const old=structuredClone(w.toSave());old.schema=12;delete old.world.players[0].technologies.veterans;
 const restored=World.fromSave(old),q=restored.authenticate(s.token);assert.equal(q.technologies.veterans,0);assert.equal(q.troops,20);assert.equal(q.trainingQueue.length,1);
 unlock(w,p);advance(w,20);command(w,p,'promote',{targetId:'veteranInfantry'});
 const malformed=structuredClone(w.toSave());malformed.world.players[0].trainingQueue[0].sourceId='archers';assert.throws(()=>World.fromSave(malformed),/training/);
 const bad=structuredClone(w.toSave());bad.world.players[0].technologies.veterans=0;assert.throws(()=>World.fromSave(bad),/unlock/);
});
test('promotions survive SQLite downtime and an hourglass completes only the chosen active batch',t=>{
 const bin=tempDirectory(t,'tom-veterans-');let now=Date.now();const path=bin.path('world.sqlite');
 const {w,p,s}=fixture();unlock(w,p);reserves(w,p);command(w,p,'promote',{targetId:'veteranInfantry'});command(w,p,'train',{targetId:'archers'});
 command(w,p,'inventory-supplies');command(w,p,'inventory-use',{targetId:'universal-minute',count:1,jobId:p.trainingQueue[0].id});const second=p.trainingQueue[1],remaining=second.remaining;w.tick(.1);assert.equal(p.reserveUnits.veteranInfantry,5);assert.ok(second.remaining>=remaining-.1001);
 const store=new KingdomDatabase(path,{now:()=>now});store.save(w);store.close();now+=20000;
 const next=new KingdomDatabase(path,{now:()=>now});bin.close(()=>next.close());const q=next.load().authenticate(s.token);assert.equal(q.reserveUnits.veteranInfantry,5);assert.equal(q.reserveUnits.archers,5);
});
test('HTTP promotion retries are once-only, use the owning city and preserve a fixed soldier count',async t=>{
 const bin=tempDirectory(t,'tom-veteran-http-');const app=createGameServer({databasePath:bin.path('world.sqlite')});
 const session=app.world.join('HTTP Veterans'),p=app.world.authenticate(session.token);p.gold=p.food=p.wood=p.stone=p.mana=10000;unlock(app.world,p);reserves(app.world,p);app.saveNow();
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));bin.server(app.server);
 const url=`http://127.0.0.1:${app.server.address().port}/command`,body=JSON.stringify({type:'promote',targetId:'veteranInfantry'}),headers={Authorization:'Bearer '+session.token,'Idempotency-Key':'promote-once-001'};
 const before=census(p);for(let i=0;i<2;i++)assert.equal((await fetch(url,{method:'POST',headers,body})).status,200);
 assert.equal(p.trainingQueue.filter(j=>j.type==='promote').length,1);assert.equal(census(p),before);
});
test('a promotion at full troop capacity reserves its place and cannot open free training space',()=>{
 const {w,p}=fixture();unlock(w,p);p.reserveUnits.infantry=65;p.reserveTroops=65;assert.equal(census(p),85);
 command(w,p,'promote',{targetId:'veteranInfantry'});assert.equal(census(p),85);
 assert.throws(()=>command(w,p,'train'),/capacity/);assert.equal(p.trainingQueue.length,1);
 command(w,p,'cancel-job',{targetId:p.trainingQueue[0].id});assert.equal(p.reserveTroops,65);
});
test('veteran rally contributors retain their tier in group reports, rewards and restored saves',()=>{
 const {w,p}=fixture();unlock(w,p);const other=w.authenticate(w.join('Veteran Ally').token);other.gold=other.wood=other.food=other.stone=other.mana=10000;unlock(w,other);
 for(const a of[p,other]){a.buildings.oathhall=1;a.units={...legacyUnits(0),veteranInfantry:20};a.troops=20;a.health=w.stats(a).maxHealth;}
 command(w,p,'alliance-create',{name:'Veteran Oath'});command(w,other,'alliance-join',{targetId:p.allianceId});
 const before=[census(p),census(other)],target=w.strongholds[0];command(w,p,'rally-create',{targetId:target.id,count:10});command(w,other,'rally-join',{targetId:w.rallies[0].id});
 for(let i=0;i<1500&&!target.respawn;i++)w.tick(.1);
 assert.ok(target.respawn>0);assert.deepEqual([census(p),census(other)],before);
 const report=p.groupReports[0];assert.equal(report.outcome,'Stronghold defeated');assert.ok(report.participants.some(e=>e.unitsBefore.veteranInfantry===20));
 assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});
test('JSON schema-12 migration archives the untouched source and preserves reserves, inventory and paid training',async t=>{
 const {WorldStore}=await import('./storage.mjs'),{readFileSync,writeFileSync}=await import('node:fs');
 const dir=mkdtempSync(join(tmpdir(),'tom-veteran-migration-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'world.json');
 const {w,p,s}=fixture();command(w,p,'inventory-supplies');command(w,p,'train',{targetId:'archers'});
 const old=structuredClone(w.toSave());old.schema=12;delete old.world.players[0].technologies.veterans;const bytes=JSON.stringify(old);writeFileSync(path,bytes);
 const store=new WorldStore(path),loaded=store.load(),q=loaded.authenticate(s.token);assert.equal(q.technologies.veterans,0);assert.deepEqual(q.units,p.units);assert.deepEqual(q.inventory,p.inventory);assert.equal(q.trainingQueue[0].id,p.trainingQueue[0].id);
 assert.equal(readFileSync(path+'.schema12.bak','utf8'),bytes);store.save(loaded);assert.equal(JSON.parse(readFileSync(path,'utf8')).schema,19);assert.equal(q.gold,p.gold);
});

test('splitting a class between tiers cannot evade severe wounds through rounding',()=>{
 const {w,p}=fixture();unlock(w,p);p.units={infantry:3,archers:0,cavalry:0,veteranInfantry:3};p.troops=6;
 const result={wounded:legacyUnits(0),woundedMythic:0};retreat(w,p,result);
 assert.equal(unitTotal(result.wounded),1);assert.equal(p.troops+unitTotal(p.wounded),6);
});
