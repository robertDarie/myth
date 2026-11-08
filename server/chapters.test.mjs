import { testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { CHAPTERS, TASKS, refreshJourney, journeySnapshot } from './chapters.mjs';
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(0.1);};
const setup=()=>{const w=testWorld({random:()=>0}),session=w.join('Founder');return {w,p:w.authenticate(session.token),session};};
const cmd=(w,p,type,extra={})=>w.command(p,{type,...extra});
const claimReady=(w,p)=>{
 for(let i=0;i<100;i++){
  refreshJourney(w,p);const c=journeySnapshot(w,p).chapters.find(c=>c.id===journeySnapshot(w,p).activeId);if(!c)return;
  const t=c.tasks.find(t=>t.canClaim);if(t){cmd(w,p,'journey-claim',{targetId:t.id});continue;}
  if(c.canClaim){cmd(w,p,'chapter-claim',{targetId:c.id});continue;}return;
 }
 throw new Error('Campaign claims failed to settle');
};

test('a new city sees six original chapters and cannot claim locked, incomplete or client-forged progress',()=>{
 const {w,p}=setup(),s=w.snapshot(p.id).players.find(q=>q.id===p.id).journeyCampaign;assert.equal(s.chapters.length,6);assert.equal(TASKS.length,19);assert.equal(s.activeId,'embers');assert.equal(s.chapters[1].locked,true);
 const gold=p.gold;for(const c of [{type:'journey-claim',targetId:'gather-wood',count:40,progress:40},{type:'journey-claim',targetId:'temple'},{type:'chapter-claim',targetId:'embers'},{type:'chapter-claim',targetId:'dawn'}])assert.throws(()=>w.command(p,c),/objective|chapter/);
 assert.equal(p.gold,gold);assert.deepEqual(p.journey.claimed,[]);
});

test('only field gathering and completed training count; cancellation, gifts and passive income cannot forge those objectives',()=>{
 const {w,p}=setup();p.gold=p.food=p.wood=5000;advance(w,10);assert.equal(p.journey.metrics.wood,0);assert.equal(p.journey.metrics.food,0);
 cmd(w,p,'train');const id=p.trainingQueue[0].id;advance(w,1);assert.equal(p.journey.metrics.trained,0);cmd(w,p,'cancel-job',{targetId:id});assert.equal(p.journey.metrics.trained,0);
 cmd(w,p,'train');advance(w,9);assert.equal(p.journey.metrics.trained,5);
 cmd(w,p,'gather',{targetId:w.nodes[0].id});advance(w,10);cmd(w,p,'return');advance(w,10);assert.ok(p.journey.metrics.wood>=40);const before=p.gold;cmd(w,p,'journey-claim',{targetId:'gather-wood'});assert.equal(p.gold,before+20);
 assert.throws(()=>cmd(w,p,'journey-claim',{targetId:'gather-wood'}),/already claimed/);assert.equal(p.gold,before+20);
});

test('early achievements persist across chapter locks and loss of the measured state',()=>{
 const {w,p}=setup();cmd(w,p,'alliance-create',{name:'Early Oath'});assert.equal(p.journey.progress.alliance,1);cmd(w,p,'alliance-leave');assert.equal(p.journey.progress.alliance,1);
 p.buildings.oracle=1;p.cityLevel=2;w.tick(0.1);assert.equal(p.journey.progress.temple,1);p.buildings.oracle=0;w.tick(0.1);assert.equal(p.journey.progress.temple,1);
 assert.throws(()=>cmd(w,p,'journey-claim',{targetId:'alliance'}),/locked/);
});

test('surveys count at arrival and garrisons count only after their own march reaches an allied structure',()=>{
 const {w,p}=setup();cmd(w,p,'scout-send',{x:30,z:30});advance(w,1);assert.equal(p.journey.metrics.surveys,0);cmd(w,p,'scout-recall',{targetId:p.scout.id});advance(w,5);assert.equal(p.journey.metrics.surveys,0);
 cmd(w,p,'scout-send',{x:20,z:20});advance(w,4);assert.equal(p.journey.metrics.surveys,1);advance(w,10);assert.equal(p.journey.metrics.surveys,1);
 p.cityLevel=2;cmd(w,p,'alliance-create',{name:'Guardians'});const s=w.sites.find(s=>s.id==='shrine-dawn');s.allianceId=p.allianceId;
 cmd(w,p,'garrison-join',{targetId:s.id});assert.equal(p.journey.progress['first-garrison'],0);advance(w,0.1);assert.equal(p.journey.progress['first-garrison'],0);advance(w,10);assert.equal(p.journey.progress['first-garrison'],1);
});

test('a fresh city completes the entire opening campaign using legal economy, combat, scout and alliance commands',()=>{
 const {w,p}=setup();
 // No grants, teleports, pre-completed objectives or forced victory: this is also a pacing/dependency smoke test.
 cmd(w,p,'train');cmd(w,p,'train');
 for(const index of[0,2,1]){cmd(w,p,'move',{x:w.nodes[index].x,z:w.nodes[index].z});advance(w,15);cmd(w,p,'gather',{targetId:w.nodes[index].id});advance(w,100);cmd(w,p,'return');advance(w,20);claimReady(w,p);}
 assert.equal(p.journey.chapters[0],'embers');cmd(w,p,'return');advance(w,30);
 cmd(w,p,'upgrade');advance(w,21);claimReady(w,p);
 cmd(w,p,'building-upgrade',{targetId:'farm'});advance(w,25);claimReady(w,p);
 cmd(w,p,'building-upgrade',{targetId:'builders'});advance(w,13);claimReady(w,p);assert.equal(journeySnapshot(w,p).activeId,'echoes');
 cmd(w,p,'building-upgrade',{targetId:'oracle'});advance(w,13);claimReady(w,p);cmd(w,p,'summon',{count:1});claimReady(w,p);
 cmd(w,p,'reinforce');
 for(let i=0;i<3;i++){cmd(w,p,'move',{x:14,z:10});advance(w,10);cmd(w,p,'attack',{targetId:w.camps[0].id});advance(w,30);cmd(w,p,'return');advance(w,60);claimReady(w,p);}
 assert.equal(p.questClaimed,true);assert.ok(p.ownedCommanders.includes('atalanta'));assert.equal(journeySnapshot(w,p).activeId,'veil');
 cmd(w,p,'scout-send',{x:30,z:30});advance(w,20);claimReady(w,p);
 cmd(w,p,'building-upgrade',{targetId:'academy'});advance(w,13);cmd(w,p,'research',{targetId:'logistics'});advance(w,13);claimReady(w,p);assert.equal(journeySnapshot(w,p).activeId,'banners');
 cmd(w,p,'mentor-commander',{targetId:'captain'});cmd(w,p,'research',{targetId:'drill'});advance(w,13);claimReady(w,p);
 cmd(w,p,'train');advance(w,9);cmd(w,p,'deploy-march',{targetId:'atalanta',units:{infantry:5,archers:0,cavalry:0},mythic:0});claimReady(w,p);assert.equal(journeySnapshot(w,p).activeId,'dawn');
 cmd(w,p,'alliance-create',{name:'First Dawn'});cmd(w,p,'building-upgrade',{targetId:'oathhall'});advance(w,13);claimReady(w,p);
 const build=(x,z)=>{cmd(w,p,'move',{x,z});advance(w,20);cmd(w,p,'flag',{x,z});advance(w,w.flags.at(-1).buildRemaining+0.1);};
 build(5,5);build(12,12);build(20,20);cmd(w,p,'capture',{targetId:'shrine-dawn'});advance(w,30);claimReady(w,p);
 cmd(w,p,'garrison-join',{targetId:'shrine-dawn'});advance(w,1);claimReady(w,p);
 assert.equal(journeySnapshot(w,p).complete,true);assert.equal(p.journey.chapters.length,6);assert.equal(p.journey.claimed.length,19);assert.ok(p.gold>=0&&p.wood>=0&&p.food>=0&&p.stone>=0);
 const money=p.gold;assert.throws(()=>cmd(w,p,'chapter-claim',{targetId:'dawn'}),/already complete/);assert.equal(p.gold,money);
 const restored=World.fromSave(w.toSave());assert.equal(journeySnapshot(restored,restored.players.get(p.id)).complete,true);
});

test('chapter claims and legacy Atalanta rewards share one grant even when invoked in either order',()=>{
 for(const legacyFirst of[false,true]){
  const {w,p}=setup();p.kills=3;
  // Seed earlier chapter completion to isolate compatibility with the pre-existing quest endpoint.
  for(const c of CHAPTERS.slice(0,2)){p.journey.chapters.push(c.id);for(const t of c.tasks){p.journey.progress[t.id]=t.goal;p.journey.claimed.push(t.id);}}
  p.buildings.oracle=1;p.summonCount=1;refreshJourney(w,p);
  for(const t of CHAPTERS[2].tasks)cmd(w,p,'journey-claim',{targetId:t.id});
  const before=p.gold;if(legacyFirst)cmd(w,p,'quest');cmd(w,p,'chapter-claim',{targetId:'echoes'});
  assert.equal(p.gold,before+200);assert.equal(p.ownedCommanders.filter(id=>id==='atalanta').length,1);assert.throws(()=>cmd(w,p,'quest'),/once/);
  assert.equal(p.gold,before+200);assert.equal(journeySnapshot(w,p).chapters[2].commanderReward,'');
 }
});

test('save migration preserves proven training without fabricating historical gathering and validates all claims',()=>{
 const {w,p,session}=setup();p.reserveUnits.infantry=10;p.reserveTroops=10;const old=w.toSave();old.schema=7;delete old.world.players[0].journey;
 const restored=World.fromSave(old),q=restored.authenticate(session.token);assert.equal(q.journey.metrics.trained,10);assert.equal(q.journey.metrics.wood,0);assert.equal(q.journey.metrics.food,0);
 for(const mutate of[j=>j.claimed=['unknown'],j=>j.claimed=['train-ten','train-ten'],j=>j.chapters=['dawn'],j=>j.progress['train-ten']=11,j=>j.metrics.wood=-1,j=>j.metrics.trained=1.5]){const bad=structuredClone(restored.toSave());mutate(bad.world.players[0].journey);assert.throws(()=>World.fromSave(bad),/journey|chapter/);}
 cmd(restored,q,'journey-claim',{targetId:'train-ten'});const saved=World.fromSave(restored.toSave());assert.throws(()=>cmd(saved,saved.authenticate(session.token),'journey-claim',{targetId:'train-ten'}),/already claimed/);
});

test('the opening wood and food goals have visible starter sites instead of requiring a later scouting unlock',()=>{
 const {w,p}=setup(),snapshot=w.snapshot(p.id);
 for(const resource of['wood','food'])assert.ok(snapshot.nodes.some(n=>n.resource===resource&&n.remaining>0));
 assert.equal(p.journey.progress['citadel-two'],1);assert.equal(p.journey.progress['farm-two'],1);
 const old=w.toSave();old.schema=7;old.world.nodes[0].x=8;old.world.nodes[0].z=18;old.world.nodes[2].x=24;old.world.nodes[2].z=18;old.world.nodes[0].remaining=123;
 const loaded=World.fromSave(old);assert.equal(loaded.nodes[0].remaining,123);assert.equal(loaded.nodes[0].z,12);assert.equal(loaded.nodes[2].x,12);
});

test('authenticated claims expose only the owner campaign and reject repeated or foreign task payloads',async t=>{
 const {createGameServer}=await import('./http.mjs');const {server,world:w}=createGameServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const sessions=await Promise.all(['HTTP Campaign','HTTP Observer'].map(async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json()));
 const [p,q]=sessions.map(s=>w.authenticate(s.token));
 const post=(i,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+sessions[i].token},body:JSON.stringify(body)});
 const get=async i=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+sessions[i].token}})).json();
 assert.equal((await post(1,{type:'journey-claim',targetId:'train-ten',playerId:p.id,count:10})).status,400);
 assert.equal((await post(0,{type:'train'})).status,200);assert.equal((await post(0,{type:'train'})).status,200);advance(w,17);
 const gold=p.gold;assert.equal((await post(0,{type:'journey-claim',targetId:'train-ten'})).status,200);assert.equal(p.gold,gold+40);
 assert.equal((await post(0,{type:'journey-claim',targetId:'train-ten'})).status,400);assert.equal(p.gold,gold+40);
 const own=await get(0),outside=await get(1);assert.equal(own.version,15);assert.ok(own.players.find(a=>a.id===p.id).journeyCampaign);assert.equal(outside.players.find(a=>a.id===p.id).journeyCampaign,undefined);assert.equal(outside.players.find(a=>a.id===p.id).journey,undefined);assert.deepEqual(q.journey.claimed,[]);
});
