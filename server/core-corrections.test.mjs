import { fixtureCommand } from './testing/roster-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { cargoTotal,carryCapacity,coreReport } from './field-logistics.mjs';
import { explorationTick } from './exploration.mjs';
import { armyList } from './progression.mjs';
import { testWorld } from './testing/kingdom-fixture.mjs';
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(.1);};
const setup=()=>{const w=testWorld(),session=w.join('Logistics');const p=w.authenticate(session.token);p.buildings.lumber=0;return {w,p,session};};
const command=(w,p,type,extra={})=>fixtureCommand(w,p,{type,...extra});
const load=(w,session)=>{const next=World.fromSave(w.toSave());return {w:next,p:next.authenticate(session.token)};};
const at=(a,b)=>{a.x=b.x;a.z=b.z;};
const total=p=>armyList(p).reduce((n,a)=>n+a.troops,0)+p.reserveTroops+p.wounded.infantry+p.wounded.archers+p.wounded.cavalry;

test('static intelligence persists without disclosing hidden depletion, ownership changes or destruction',()=>{
 let {w,p,session}=setup();const node=w.nodes[0];at(p,node);let snap=w.snapshot(p.id),old=structuredClone(snap.nodes.find(n=>n.id===node.id));
 assert.equal(old.lastKnown,false);command(w,p,'return');advance(w,10);node.remaining=17;
 snap=w.snapshot(p.id);const memory=snap.nodes.find(n=>n.id===node.id);assert.equal(memory.lastKnown,false); // starter deposit remains inside city vision
 const remote=w.nodes.find(n=>n.x>20&&n.x<40&&n.z<40);at(p,remote);w.snapshot(p.id);const amount=remote.remaining;command(w,p,'return');advance(w,20);remote.remaining=1;
 let remembered=w.snapshot(p.id).nodes.find(n=>n.id===remote.id);assert.equal(remembered.lastKnown,true);assert.equal(remembered.remaining,amount);
 ({w,p}=load(w,session));remembered=w.snapshot(p.id).nodes.find(n=>n.id===remote.id);assert.equal(remembered.remaining,amount);
 at(p,w.nodes.find(n=>n.id===remote.id));assert.equal(w.snapshot(p.id).nodes.find(n=>n.id===remote.id).remaining,1);
 // Removable structures remain ghosts until their old location is observed again.
 const flag={id:'observed-beacon',x:30,z:30,allianceId:'',isRoot:false,connected:false,health:100,maxHealth:100,buildRemaining:0};w.flags.push(flag);at(p,flag);w.snapshot(p.id);command(w,p,'return');advance(w,20);w.flags=[];
 assert.ok(w.snapshot(p.id).flags.some(f=>f.id===flag.id&&f.lastKnown));at(p,flag);assert.equal(w.snapshot(p.id).flags.some(f=>f.id===flag.id),false);
});
test('unknown static locations and enemy formations are absent; allied and enemy cargo and routes remain private',()=>{
 const {w,p}=setup(),q=w.authenticate(w.join('Private cargo').token);assert.equal(w.snapshot(p.id).sites.some(s=>s.id==='first-sanctuary'),false);
 at(q,{x:30,z:30});assert.equal(w.snapshot(p.id).armies.some(a=>a.id===q.id),false);at(p,q);
 const seen=w.snapshot(p.id).armies.find(a=>a.id===q.id);assert.ok(seen);for(const key of ['cargo','cargoSources','carryCapacity','homeX','homeZ'])assert.equal(seen[key],undefined);assert.deepEqual(seen.route,[]);
 command(w,p,'return');advance(w,20);assert.equal(w.snapshot(p.id).armies.some(a=>a.id===q.id),false);
 const foreign=w.snapshot(q.id).players.find(a=>a.id===p.id);for(const key of ['homeFormations','reports','discovery','coreReports'])assert.equal(foreign[key],undefined);
});
test('home formations do not occupy the map or deployment slots; return and redeployment conserve units and equipment',()=>{
 const {w,p,session}=setup(),before=total(p);assert.equal(w.snapshot(p.id).armies.length,0);assert.equal(w.snapshot(p.id).players[0].homeFormations.length,1);
 p.ownedRelics.push('aegis');command(w,p,'equip-relic',{targetId:'aegis'});command(w,p,'move',{x:18,z:12});advance(w,5);assert.equal(p.deployed,true);
 const health=p.health;command(w,p,'return');advance(w,10);assert.equal(p.deployed,false);assert.equal(w.snapshot(p.id).armies.length,0);assert.equal(total(p),before);assert.equal(p.equippedRelic,'aegis');assert.ok(p.health>=health);
 const restored=load(w,session);assert.equal(restored.p.deployed,false);command(restored.w,restored.p,'move',{x:18,z:12});assert.equal(restored.p.deployed,true);assert.equal(total(restored.p),before);assert.equal(restored.p.commanderId,'captain');assert.equal(restored.p.equippedRelic,'aegis');
});
test('prepared formations and active march limits are distinct; duplicate commander assignment is rejected',()=>{
 const {w,p}=setup();p.gold=1000;p.reserveTroops=5;p.reserveUnits.infantry=5;command(w,p,'unlock-commander',{targetId:'warden'});command(w,p,'deploy-march',{targetId:'warden',troops:5});
 const a=p.marches[0];assert.equal(a.deployed,false);assert.throws(()=>command(w,p,'deploy-march',{targetId:'warden',troops:5}));
 command(w,p,'move',{x:18,z:12});assert.throws(()=>command(w,p,'move',{marchId:a.id,x:20,z:12}),/slots/);assert.equal(a.target,null);assert.equal(a.deployed,false);
 command(w,p,'return');advance(w,10);command(w,p,'move',{marchId:a.id,x:20,z:12});assert.equal(a.deployed,true);assert.equal(p.deployed,false);
});
test('cargo is withheld from treasury, partial recall delivers exactly once with a durable attributed report',()=>{
 let {w,p,session}=setup();const node=w.nodes[0],before=p.wood,stock=node.remaining;at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,3);
 const amount=cargoTotal(p);assert.ok(amount>0);assert.equal(p.wood,before);assert.equal(stock-node.remaining,amount);assert.throws(()=>command(w,p,'configure-march',{units:{infantry:20}}),/cargo/);
 command(w,p,'stop');advance(w,2);assert.equal(cargoTotal(p),amount);command(w,p,'return');advance(w,10);assert.equal(p.wood,before+amount);assert.equal(cargoTotal(p),0);assert.equal(p.deployed,false);
 const reports=p.coreReports.filter(r=>r.type==='gathering');assert.equal(reports.length,1);assert.equal(reports[0].resources.wood,amount);assert.equal(reports[0].sources[0].nodeId,node.id);const id=reports[0].id;
 ({w,p}=load(w,session));for(let i=0;i<3;i++){command(w,p,'return');w.snapshot(p.id);advance(w,1);}assert.equal(p.wood,before+amount);assert.equal(p.coreReports.filter(r=>r.id===id).length,1);
});
test('capacity reflects actual mixed troop composition and logistics, full cargo automatically returns',()=>{
 const {w,p}=setup();p.units={infantry:2,archers:3,cavalry:4,veteranInfantry:1};p.troops=10;p.mythic=1;
 assert.equal(carryCapacity(w,p),3*16+3*12+4*24+80);p.technologies.logistics=1;assert.equal(carryCapacity(w,p),Math.floor(260*1.08));
 p.units={infantry:2,archers:0,cavalry:0};p.troops=2;p.mythic=0;p.technologies.logistics=0;const node=w.nodes[0];at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,4.2);assert.equal(cargoTotal(p),32);assert.equal(p.target.type,'return');advance(w,10);assert.equal(p.deployed,false);assert.equal(p.coreReports[0].resources.wood,32);
});
test('simultaneous gatherers cannot overdraw a depleted node and each delivers only its own cargo',()=>{
 const {w,p}=setup(),q=w.authenticate(w.join('Second gatherer').token),node=w.nodes[0];node.remaining=19;at(p,node);at(q,node);q.buildings.lumber=0;const balances=p.wood+q.wood;
 command(w,p,'gather',{targetId:node.id});command(w,q,'gather',{targetId:node.id});advance(w,3);assert.equal(node.remaining,0);assert.equal(cargoTotal(p)+cargoTotal(q),19);assert.equal(p.target.type,'return');assert.equal(q.target.type,'return');advance(w,10);
 assert.equal(p.wood+q.wood,balances+19);assert.equal(p.coreReports[0].resources.wood+q.coreReports[0].resources.wood,19);
});
test('accepted gathering and return orders resume across restarts without dropping or replaying cargo',()=>{
 let {w,p,session}=setup();const node=w.nodes[0];at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,2);const original=cargoTotal(p),balance=p.wood;
 ({w,p}=load(w,session));assert.equal(p.target.type,'gather');assert.equal(cargoTotal(p),original);advance(w,2);assert.ok(cargoTotal(p)>original);command(w,p,'return');const amount=cargoTotal(p);w.tick(.1);({w,p}=load(w,session));assert.equal(p.target.type,'return');advance(w,10);assert.equal(p.wood,balance+amount);({w,p}=load(w,session));assert.equal(p.wood,balance+amount);assert.equal(p.coreReports.filter(r=>r.type==='gathering').length,1);
});
test('combat defeat destroys carried resources with an attributed loss report and no delivery or plunder',()=>{
 const {w,p}=setup(),node=w.nodes[0];at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,3);const amount=cargoTotal(p),before=p.wood,camp=w.camps[3];at(p,camp);p.health=1;command(w,p,'attack',{targetId:camp.id});w.tick(.1);
 assert.equal(p.deployed,false);assert.equal(cargoTotal(p),0);assert.equal(p.wood,before);const loss=p.coreReports.find(r=>r.type==='gathering');assert.equal(loss.outcome,'Lost');assert.equal(loss.lost.wood,amount);assert.equal(loss.resources.wood,0);advance(w,20);assert.equal(p.wood,before);
});
test('schema thirteen migration preserves paid progress and balances without inventing cargo or historical observations',()=>{
 const {w,p,session}=setup();p.gold=777;p.ownedRelics.push('aegis');command(w,p,'train');at(p,{x:30,z:30});const save=structuredClone(w.toSave());save.schema=13;
 for(const a of save.world.players){delete a.cargo;delete a.cargoTripId;delete a.cargoSources;delete a.cargoStarted;delete a.deployed;delete a.discovery;delete a.coreReports;}
 const next=World.fromSave(save),q=next.authenticate(session.token);assert.equal(next.toSave().schema,15);assert.equal(q.gold,p.gold);assert.equal(q.trainingQueue.length,1);assert.equal(cargoTotal(q),0);assert.ok(q.ownedRelics.includes('aegis'));assert.ok(q.discovery.every(r=>r.observedAt===next.time));
});
test('damaged cargo, discovery, settled trip replay and malformed report saves are rejected',()=>{
 const {w,p}=setup();const node=w.nodes[0];at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,2);
 for(const mutate of [a=>a.cargo.wood++,a=>a.cargo.food=-1,a=>a.deployed=false,a=>a.cargoTripId='',a=>a.discovery[0].value.secret=1,a=>a.discovery[0].observedAt=-1,a=>a.coreReports=[{id:a.cargoTripId,type:'system',title:'Settled',time:0}],a=>a.coreReports=[{id:'bad',type:'gathering',title:'Fake delivery',time:0}]]){const save=structuredClone(w.toSave());mutate(save.world.players[0]);assert.throws(()=>World.fromSave(save),/cargo|discovery|intelligence|report/i);}
});
test('unified reports are bounded, private, durable and do not grant rewards when read',()=>{
 const {w,p,session}=setup(),q=w.authenticate(w.join('Outsider').token);for(let i=0;i<110;i++)coreReport(w,p,{id:'event-'+i,type:'system',title:'Confirmed event '+i});assert.equal(p.coreReports.length,100);
 command(w,p,'scout-send',{x:20,z:20});advance(w,15);const balance=p.gold;const own=w.snapshot(p.id).players.find(a=>a.id===p.id);assert.ok(own.reports.some(r=>r.type==='scouting'));assert.ok(own.reports.some(r=>r.type==='system'));assert.equal(w.snapshot(q.id).players.find(a=>a.id===p.id).reports,undefined);
 for(let i=0;i<3;i++)w.snapshot(p.id);assert.equal(p.gold,balance);const restored=load(w,session);assert.equal(restored.p.coreReports.length,100);assert.equal(restored.p.scoutReports.length,1);
});
test('transactional storage failure rolls back cargo delivery and its report; recovery settles it once',async t=>{
 const {createGameServer}=await import('./http.mjs');const {w,p,session}=setup(),node=w.nodes[0];at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,2);command(w,p,'stop');
 // Put a stopped loaded march on its actual home position to isolate command settlement.
 at(p,{x:p.homeX,z:p.homeZ});const amount=cargoTotal(p),balance=p.wood;let fail=false;
 const app=createGameServer({store:{load:()=>w,save:()=>{if(fail)throw new Error('Disk full');}}});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{app.server.close(resolve);app.server.closeAllConnections();}));
 const base='http://127.0.0.1:'+app.server.address().port,post=()=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+session.token},body:JSON.stringify({type:'stop'})});
 fail=true;assert.equal((await post()).status,503);let current=app.world.authenticate(session.token);assert.equal(current.wood,balance);assert.equal(cargoTotal(current),amount);assert.equal(current.coreReports.filter(r=>r.type==='gathering').length,0);
 fail=false;assert.equal(app.saveNow(),true);assert.equal((await post()).status,200);current=app.world.authenticate(session.token);assert.equal(current.wood,balance+amount);assert.equal(cargoTotal(current),0);assert.equal((await post()).status,200);assert.equal(current.wood,balance+amount);assert.equal(current.coreReports.filter(r=>r.type==='gathering').length,1);
});
test('a recalled home formation never consumes an additional deployment slot',()=>{
 const {w,p}=setup();p.gold=1000;p.reserveTroops=5;p.reserveUnits.infantry=5;command(w,p,'unlock-commander',{targetId:'warden'});command(w,p,'deploy-march',{targetId:'warden',troops:5});command(w,p,'move',{x:20,z:20});command(w,p,'return',{marchId:p.marches[0].id});assert.equal(p.marches[0].deployed,false);assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});
test('remembered enemy ownership and resource stock stay frozen until legitimately observed again',()=>{
 const {w,p}=setup(),q=w.authenticate(w.join('Enemy owner').token),r=w.authenticate(w.join('Other owner').token);q.gold=r.gold=1000;command(w,q,'alliance-create',{name:'Old owner'});command(w,r,'alliance-create',{name:'New owner'});
 const flag={id:'remote-fort',x:30,z:30,allianceId:q.allianceId,isRoot:true,connected:true,health:100,maxHealth:100,buildRemaining:0};w.flags.push(flag);at(p,flag);const first=w.snapshot(p.id).flags.find(f=>f.id===flag.id);command(w,p,'return');advance(w,20);const lastSeen=w.snapshot(p.id).flags.find(f=>f.id===flag.id).observedAt;flag.allianceId=r.allianceId;flag.health=42;
 const remembered=w.snapshot(p.id).flags.find(f=>f.id===flag.id);assert.equal(remembered.lastKnown,true);assert.equal(remembered.allianceId,first.allianceId);assert.equal(remembered.health,first.health);assert.equal(remembered.observedAt,lastSeen);at(p,flag);const live=w.snapshot(p.id).flags.find(f=>f.id===flag.id);assert.equal(live.allianceId,r.allianceId);assert.equal(live.health,42);
});
test('a hidden remembered depleted deposit accepts the same travel order without exposing its unseen stock',()=>{
 const {w,p}=setup(),node=w.nodes.find(n=>n.x>20&&n.x<40&&n.z<40);at(p,node);w.snapshot(p.id);command(w,p,'return');advance(w,20);node.remaining=0;node.refill=0;
 const stock=w.snapshot(p.id).nodes.find(n=>n.id===node.id).remaining;assert.ok(stock>0);command(w,p,'gather',{targetId:node.id});w.tick(.1);assert.equal(p.target.type,'gather');assert.equal(w.snapshot(p.id).nodes.find(n=>n.id===node.id).remaining,stock);advance(w,15);assert.equal(p.deployed,false);assert.equal(cargoTotal(p),0);
});
test('a failed simulation delivery commit rolls back and pauses, then recovery delivers once',async t=>{
 const {createGameServer}=await import('./http.mjs');const {w,p,session}=setup(),node=w.nodes[0];at(p,node);command(w,p,'gather',{targetId:node.id});advance(w,2);const amount=cargoTotal(p),balance=p.wood;command(w,p,'return');p.x=p.homeX+.01;p.z=p.homeZ;
 let fail=false;const app=createGameServer({store:{load:()=>w,save:()=>{if(fail)throw new Error('Disk full');}}});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{app.server.close(resolve);app.server.closeAllConnections();}));fail=true;
 const until=async predicate=>{const deadline=Date.now()+2000;while(!predicate()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(predicate());};
 await until(()=>!!app.persistence.error);let current=w.authenticate(session.token);assert.equal(current.wood,balance);assert.equal(cargoTotal(current),amount);assert.equal(current.coreReports.filter(r=>r.type==='gathering').length,0);
 fail=false;assert.equal(app.saveNow(),true);await until(()=>w.authenticate(session.token).coreReports.some(r=>r.type==='gathering'));current=w.authenticate(session.token);assert.equal(current.wood,balance+amount);assert.equal(cargoTotal(current),0);assert.equal(current.coreReports.filter(r=>r.type==='gathering').length,1);
});
test('schema thirteen JSON migration archives the untouched original before saving current cargo format',async t=>{
 const {mkdtempSync,readFileSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {WorldStore}=await import('./storage.mjs');
 const directory=mkdtempSync(join(tmpdir(),'tom-028-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'world.json'),{w}=setup(),old=structuredClone(w.toSave());old.schema=13;const original=JSON.stringify(old);writeFileSync(path,original);const store=new WorldStore(path),migrated=store.load();store.save(migrated);assert.equal(readFileSync(path+'.schema13.bak','utf8'),original);assert.equal(JSON.parse(readFileSync(path,'utf8')).schema,15);
});
test('Windows package includes the entire server import graph and matches protocol sixteen',async()=>{
 const {readFileSync}=await import('node:fs');const builder=readFileSync(new URL('../client/Assets/ThronesOfMyth/Editor/WindowsPlaytestBuilder.cs',import.meta.url),'utf8');const launcher=readFileSync(new URL('../packaging/windows/Launcher.ps1',import.meta.url),'utf8');const visited=new Set();
 function visit(file){if(visited.has(file))return;visited.add(file);assert.ok(builder.includes('"'+file+'"'),'Windows builder must bundle '+file);const source=readFileSync(new URL(file,import.meta.url),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))visit(match[1]);}
 visit('index.mjs');assert.ok(visited.has('field-logistics.mjs')&&visited.has('discovery.mjs'));assert.ok(launcher.includes('$health.version -eq 16'));assert.ok(builder.includes('bundleVersion = "0.31.0"'));
});
