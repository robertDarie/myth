import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from './world.mjs';
import * as map from './world-map.mjs';
import {route,scoutRoute} from './navigation.mjs';
import {initializeFortification} from './campaign.mjs';
import {fork} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {KingdomDatabase} from './database.mjs';
const approvedBaseline=JSON.parse(readFileSync(new URL('../research/parity/fixtures/recovery-a-functional-passes.json',import.meta.url),'utf8'));

// Explicit old-profile/stage/home/territory fixtures isolate adversarial combat.
// Ownership is NEVER assigned here: actual production rallies capture the passes.
function encounterFixture(){
 const w=new World({numericVersion:0,random:()=>.25,now:()=>Date.UTC(2026,10,17)});
 const players=['Owners','Outsiders'].map(name=>w.authenticate(w.join(name).token));
 for(const [i,p]of players.entries()){p.homeX=p.x=20+i*3;p.homeZ=p.z=20+i*3;p.cityLevel=2;p.buildings.oathhall=1;w.command(p,{type:'alliance-create',name:p.name});const root={id:'fixture-root-'+i,allianceId:p.allianceId,x:32,z:17+i*6};initializeFortification(root,'fort',w);root.isRoot=true;w.flags.push(root);}
 w.kingdom.completed=['foundations','gates'].map(id=>({id,atMs:w.activityClockMs,legacy:true,eligible:[]}));return {w,a:players[0],b:players[1]};
}
function until(w,condition,seconds=300){for(let i=0;i<seconds*4;i++){if(condition())return;w.tick(.25);}assert.ok(condition(),'Production encounter did not complete');}
function conquer(w,p,id){if(!w.atHome(p)||p.target){w.command(p,{type:'return'});until(w,()=>w.atHome(p)&&!p.target);}w.command(p,{type:'rally-create',targetId:id,count:10});until(w,()=>w.sites.find(s=>s.id===id).allianceId===p.allianceId);assert.ok(p.groupReports.some(r=>r.targetId===id&&r.outcome==='Attackers captured objective'));}

test('each physical corridor has one unique adjacent persistent pass',()=>{
 const w=new World();const ids=map.MAP_CORRIDORS.map(c=>c.gateId);
 assert.equal(new Set(ids).size,map.MAP_CORRIDORS.length);assert.ok(ids.every(Boolean));
 for(const c of map.MAP_CORRIDORS){const site=w.sites.find(s=>s.id===c.gateId);assert.ok(site,c.id);assert.equal(site.kind,'gate');assert.deepEqual(new Set(site.zoneIds),new Set([map.provinceAt(c.a).id,map.provinceAt(c.b).id]));assert.equal(site.corridorId,c.id);}
});
test('all corners and every integer position have exactly one physical province',()=>{
 for(let z=0;z<=256;z++)for(let x=0;x<=256;x++)assert.ok(map.provinceAt({x,z}),`${x},${z}`);
 for(const p of [{x:-.001,z:20},{x:257,z:20},{x:NaN,z:20},{x:20,z:Infinity}])assert.equal(map.provinceAt(p),undefined);
});
test('a saved city may move locally in its own province without owning a distant Divine Gate',()=>{
 const w=new World(),p=w.authenticate(w.join('Existing city').token);p.x=p.homeX=60;p.z=p.homeZ=60;
 assert.ok(route(w,p,{x:61,z:61}));assert.equal(route(w,p,{x:20,z:20}),null);
});
test('a distant gate never authorizes a different physical border; scouts retain physical access',()=>{
 const w=new World(),p=w.authenticate(w.join('Border owner').token);p.x=p.homeX=20;p.z=p.homeZ=20;
 w.command(p,{type:'alliance-create',name:'Border owners'});w.kingdom.completed.push({id:'gates',atMs:w.activityClockMs,eligible:[]});
 w.sites.find(s=>s.id==='gate-east').allianceId=p.allianceId;
 assert.ok(route(w,p,{x:60,z:20}));assert.equal(route(w,p,{x:128,z:20}),null);
 assert.ok(scoutRoute(w,p,{x:128,z:128}));
});
test('old schema27 map appends missing passes without relocating or replacing existing identities',()=>{
 const options={now:()=>Date.UTC(2026,10,17)},w=new World(options),s=w.join('Migrating'),p=w.authenticate(s.token);w.command(p,{type:'alliance-create',name:'Preserved'});
 const saved=w.toSave();saved.schema=27;saved.world.sites=saved.world.sites.filter(t=>!t.corridorId||['gate-east','gate-north'].includes(t.id));
 const before=structuredClone(saved.world.players),oldSites=structuredClone(saved.world.sites);
 const restored=World.fromSave(saved,options);assert.deepEqual(restored.toSave().world.players,before.map(p=>({...p,offline:true})));
 for(const old of oldSites){const current=restored.sites.find(t=>t.id===old.id);assert.equal(current.x,old.x);assert.equal(current.z,old.z);assert.equal(current.allianceId,old.allianceId);}
 assert.equal(restored.sites.filter(t=>t.kind==='gate').length,10);assert.equal(restored.authenticate(s.token).id,p.id);
 const once=World.fromSave(restored.toSave(),options).toSave();assert.deepEqual(World.fromSave(once,options).toSave(),once);
});
test('saved pass type, position and adjacency cannot replace the canonical authority graph',()=>{
 const w=new World();for(const edit of [s=>{s.kind='shrine';},s=>{s.x++;},s=>{s.zoneIds=['first-frontier','outer-marches'];},s=>{s.corridorId='dawn-outer';}]){
  const save=structuredClone(w.toSave());edit(save.world.sites.find(s=>s.id==='gate-east'));assert.throws(()=>World.fromSave(save),/pass topology/);
 }
});
test('returning privilege is constrained to the saved home destination',()=>{
 const w=new World(),p=w.authenticate(w.join('Recall').token);p.x=p.homeX=128;p.z=p.homeZ=30;
 assert.equal(route(w,p,{x:128,z:128},true),null);
 p.z=128;assert.ok(route(w,p,{x:p.homeX,z:p.homeZ},true));
});
test('production pass encounter captures from either accessible approach; outsiders and forged scout payloads cannot cross',()=>{
 for(const otherSide of [false,true]){
  const {w,a,b}=encounterFixture(),pass=w.sites.find(s=>s.id==='gate-east');
  if(otherSide){a.homeX=a.x=50;a.homeZ=a.z=20;w.flags[0].x=47;}
  const destination=otherSide?{x:20,z:20}:{x:55,z:20};
  assert.throws(()=>w.command(a,{type:'move',...destination}),/gate|route/i);
  conquer(w,a,pass.id);w.command(a,{type:'move',...destination});until(w,()=>!a.target);assert.ok(Math.hypot(a.x-destination.x,a.z-destination.z)<.001);
  assert.throws(()=>w.command(b,{type:'move',x:55,z:20,scout:true,returning:true}),/gate|route/i);
  w.command(b,{type:'scout-send',x:55,z:20});until(w,()=>b.scouts.length===0);assert.ok(b.explored.includes(map.cellIndex({x:55,z:20})));
 }
});
test('all ten passes can be captured through production combat from either adjacent approach',()=>{
 for(const corridor of map.MAP_CORRIDORS)for(const side of [0,1]){
  const {w,a}=encounterFixture(),dx=(corridor.b.x-corridor.a.x)/2,dz=(corridor.b.z-corridor.a.z)/2;
  const approach=side?corridor.b:corridor.a,other=side?corridor.a:corridor.b,sign=side?1:-1;
  a.homeX=a.x=approach.x+sign*dx*4;a.homeZ=a.z=approach.z+sign*dz*4;w.flags[0].x=a.homeX;w.flags[0].z=a.homeZ;
  const destination={x:other.x-sign*dx*4,z:other.z-sign*dz*4};assert.equal(route(w,a,destination),null,corridor.id);
  conquer(w,a,corridor.gateId);w.command(a,{type:'move',...destination});until(w,()=>!a.target);
  assert.equal(map.provinceAt(a).id,map.provinceAt(other).id,corridor.id+' side'+side);
 }
});
test('two actual consecutive pass conquests are required; neither distant gate nor diagonal crossing substitutes',()=>{
 const {w,a}=encounterFixture();conquer(w,a,'gate-east');
 assert.equal(route(w,a,{x:65,z:60}),null);
 assert.throws(()=>w.command(a,{type:'move',x:40.001,z:40.001}),/gate|route/i);
 for(const [i,[x,z]]of [[43,20],[53,20],[53,28],[60,34]].entries()){const flag={id:'fixture-chain-'+i,allianceId:a.allianceId,x,z};initializeFortification(flag,'flag',w);w.flags.push(flag);}
 conquer(w,a,'gate-crown-south');w.command(a,{type:'move',x:65,z:60});until(w,()=>!a.target);assert.ok(a.z>40);
});
test('enemy production recapture halts an in-flight march, preserves cargo/units and permits only controlled home return',()=>{
 const {w,a,b}=encounterFixture();conquer(w,a,'gate-east');
 const node=w.snapshot(a.id).nodes.find(n=>n.resource==='wood'&&!n.lastKnown&&n.remaining>0&&route(w,a,n));assert.ok(node);w.command(a,{type:'gather',targetId:node.id});until(w,()=>Object.values(a.cargo).reduce((x,y)=>x+y,0)>=7);
 w.command(a,{type:'move',x:39,z:20});until(w,()=>!a.target);
 w.command(b,{type:'rally-create',targetId:'gate-east',count:10});until(w,()=>w.rallies.some(r=>r.leaderId===b.id&&r.phase==='Fighting'));
 until(w,()=>w.sites.find(s=>s.id==='gate-east').health<=w.stats(b).damage*3);
 const units=structuredClone(a.units),cargo=structuredClone(a.cargo);w.command(a,{type:'move',x:79,z:20});
 until(w,()=>w.sites.find(s=>s.id==='gate-east').allianceId===b.allianceId);w.tick(.25);
 assert.equal(a.target,null);assert.equal(a.state,'Route locked');assert.ok(a.x<79);assert.deepEqual(a.units,units);assert.deepEqual(a.cargo,cargo);
 const position={x:a.x,z:a.z};w.tick(.25);assert.deepEqual({x:a.x,z:a.z},position);
 w.command(a,{type:'return',x:250,z:250});until(w,()=>w.atHome(a)&&!a.target);assert.deepEqual(a.units,units);assert.equal(Object.values(a.cargo).reduce((x,y)=>x+y,0),0);const delivered=a.coreReports.find(r=>r.outcome==='Delivered');assert.ok(delivered);for(const [key,amount]of Object.entries(cargo))assert.equal(delivered.resources[key]??0,amount);
});
test('garrison admission and withdrawal use the same local pass ownership and route rules',()=>{
 const {w,a,b}=encounterFixture();conquer(w,a,'gate-east');
 assert.throws(()=>w.command(b,{type:'garrison-join',targetId:'gate-east'}),/held by your alliance/);
 w.command(a,{type:'garrison-join',targetId:'gate-east'});until(w,()=>a.state==='Garrisoned');
 w.command(b,{type:'alliance-leave'});w.command(b,{type:'alliance-join',targetId:a.allianceId});w.command(b,{type:'garrison-join',targetId:'gate-east'});until(w,()=>b.state==='Garrisoned');assert.equal(w.garrisons[0].armyIds.length,2);
 w.command(a,{type:'garrison-leave'});until(w,()=>w.atHome(a)&&!a.target);assert.equal(w.garrisons[0].armyIds.length,1);
 w.command(b,{type:'garrison-leave'});until(w,()=>w.atHome(b)&&!b.target);assert.equal(w.garrisons.length,0);assert.equal(a.troops,20);assert.equal(b.troops,20);
});
test('rally route preview ends at its accessible approach without claiming the target pass is owned',()=>{
 const {w,a}=encounterFixture();a.homeX=a.x=50;a.homeZ=a.z=20;w.flags[0].x=47;
 w.command(a,{type:'rally-create',targetId:'gate-east',count:10});until(w,()=>w.rallies[0]?.phase==='Marching');
 const preview=w.armySnapshot(a);assert.ok(preview.route.length);assert.deepEqual(preview.route.at(-1),{x:41,z:20});assert.equal(w.sites.find(s=>s.id==='gate-east').allianceId,'');
});
test('topology does not change the approved original numerical encounter and kingdom opening baseline',async()=>{
 const {KINGDOM_STAGES}=await import('./kingdom.mjs');assert.equal(KINGDOM_STAGES.find(s=>s.id==='gates').afterSeconds,approvedBaseline.gateOpeningSeconds);
 for(const numericVersion of [0,1]){const w=new World({numericVersion});assert.equal(w.sites.filter(s=>s.kind==='gate').length,approvedBaseline.passCount);for(const s of w.sites.filter(s=>s.kind==='gate'))assert.equal(s.maxHealth,approvedBaseline.gateBaseHealth*approvedBaseline.numericProfileScale[numericVersion]);}
});

test('public pass control is complete without revealing hidden defenders or enemy garrison details',()=>{
 const {w,a,b}=encounterFixture(),snapshot=w.snapshot(a.id);assert.equal(snapshot.passes.length,10);
 const far=snapshot.passes.find(s=>s.id==='gate-outer-south');assert.equal(far.defendersKnown,false);assert.equal(far.health,0);assert.equal(far.garrisonMarches,-1);assert.equal(far.approachAccessible,false);
 assert.ok(snapshot.passes.every(s=>typeof s.accessExplanation==='string'&&s.zoneIds.length===2));
});
test('every shared mountain border has exactly one crossing, with adjacent axis-aligned endpoints',()=>{
 let borders=0;const links=new Map(map.PROVINCES.map(p=>[p.id,new Set()]));
 for(let i=0;i<map.PROVINCES.length;i++)for(let j=i+1;j<map.PROVINCES.length;j++){
  const a=map.PROVINCES[i],b=map.PROVINCES[j];
  const adjacent=((a.maxX===b.minX||b.maxX===a.minX)&&Math.min(a.maxZ,b.maxZ)>Math.max(a.minZ,b.minZ))||((a.maxZ===b.minZ||b.maxZ===a.minZ)&&Math.min(a.maxX,b.maxX)>Math.max(a.minX,b.minX));
  if(!adjacent)continue;borders++;
  const crossings=map.MAP_CORRIDORS.filter(c=>new Set([map.provinceAt(c.a).id,map.provinceAt(c.b).id]).has(a.id)&&new Set([map.provinceAt(c.a).id,map.provinceAt(c.b).id]).has(b.id));
  assert.equal(crossings.length,1,a.id+' / '+b.id);const c=crossings[0];assert.equal(Math.abs(c.a.x-c.b.x)+Math.abs(c.a.z-c.b.z),2);assert.ok(c.a.x===c.b.x||c.a.z===c.b.z);links.get(a.id).add(b.id);links.get(b.id).add(a.id);
 }
 assert.equal(borders,10);const visited=new Set(),queue=[map.PROVINCES[0].id];for(const id of queue){if(visited.has(id))continue;visited.add(id);queue.push(...[...links.get(id)].filter(next=>!visited.has(next)));}assert.equal(visited.size,7);
});
test('all four starting regions retain usable nearby resources and beginner PvE with every pass uncontrolled',()=>{
 const seen=new Set();for(let initial=1;initial<=32;initial++){let seed=initial;const w=new World({random:()=>((seed=(1664525*seed+1013904223)>>>0)/2**32)}),p=w.authenticate(w.join('Starter').token);seen.add(map.provinceAt(p).id);
  for(const resource of ['wood','food','gold'])assert.ok(w.nodes.some(n=>n.resource===resource&&Math.hypot(p.x-n.x,p.z-n.z)<=17&&route(w,p,n)));
  assert.ok(w.camps.some(c=>c.spawned!==false&&c.level===1&&Math.hypot(p.x-c.x,p.z-c.z)<=23&&route(w,p,c)));assert.ok(w.sites.filter(s=>s.kind==='gate').every(s=>!s.allianceId));
 }assert.deepEqual(seen,new Set(map.STARTING_REGIONS.map(r=>r.id)));
});
for(const backend of ['json','sqlite'])test('actual hosted '+backend+' process migration/restart preserves captured pass control',async()=>{
 const {w,a}=encounterFixture();conquer(w,a,'gate-east');const original=w.toSave();original.schema=27;
 original.world.sites=original.world.sites.filter(s=>s.kind!=='gate'||['gate-east','gate-north'].includes(s.id));for(const site of original.world.sites)for(const key of ['corridorId','zoneIds','openingStage','tier','encounter'])delete site[key];
 assert.doesNotThrow(()=>World.fromSave(original),'Schema27 migration preflight');
 const root=fileURLToPath(new URL('../',import.meta.url)),directory=resolve(root,'work/task4','pass-restart-'+randomUUID());mkdirSync(directory,{recursive:true});const bytes=JSON.stringify(original);writeFileSync(resolve(directory,'alpha.json'),bytes);
 if(backend==='sqlite'){const database=new KingdomDatabase(resolve(directory,'alpha.sqlite'));try{database.save({toSave:()=>original});}finally{database.close();}}
 const token=[...w.sessions].find(([,id])=>id===a.id)[0];let child,base,childError='';
 async function start(){child=fork(new URL('../scripts/task4-host-worker.mjs',import.meta.url),[],{cwd:root,env:{...process.env,QA_DIRECTORY:directory,QA_BACKEND:backend,QA_CLOCK_ORIGIN:String(w.activityClockMs)},stdio:['ignore','ignore','pipe','ipc']});child.stderr.on('data',chunk=>{childError+=chunk;});const port=await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Pass host startup timed out')),20000);child.once('error',no);child.once('exit',code=>{if(code){clearTimeout(timer);no(Error('Pass host exited '+code+': '+childError));}});child.on('message',message=>{if(message.ready){clearTimeout(timer);ok(message.port);}});});base='http://127.0.0.1:'+port;}
 async function stop(){if(!child||child.exitCode!==null)return;const exit=new Promise(ok=>child.once('exit',ok));await fetch(base+'/launcher-shutdown',{method:'POST',headers:{'x-thrones-launcher':'task4-owned-worker-close'}});await exit;}
 try{for(let restart=0;restart<2;restart++){await start();const resumed=await fetch(base+'/k/alpha/join',{method:'POST',body:JSON.stringify({resumeToken:token,name:'ignored',joinCode:'task4-synthetic-invite'})});assert.equal(resumed.status,201);const response=await fetch(base+'/k/alpha/world',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);const snapshot=await response.json();assert.equal(snapshot.passes.length,10);assert.equal(snapshot.passes.find(s=>s.id==='gate-east').allianceId,a.allianceId);const owner=snapshot.players.find(p=>p.id===a.id);assert.equal(owner.homeX,a.homeX);assert.equal(owner.homeZ,a.homeZ);assert.deepEqual(owner.units,a.units);assert.equal(owner.commanderId,a.commanderId);await stop();}if(backend==='json'){assert.equal(readFileSync(resolve(directory,'alpha.json.schema27.bak'),'utf8'),bytes);assert.equal(JSON.parse(readFileSync(resolve(directory,'alpha.json'),'utf8')).schema,28);}else{const database=new KingdomDatabase(resolve(directory,'alpha.sqlite'));try{assert.equal(database.load().toSave().schema,28);}finally{database.close();}}}
 finally{await stop();if(child?.exitCode===null)child.kill();}
});
