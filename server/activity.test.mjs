import { legacySpawns, testWorld } from './testing/kingdom-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { activitySnapshot, recordActivity, recordStrongholdActivity, DAILY_TASKS, ACTIVITY_CHESTS } from './activity.mjs';
const DAY=86400000;
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(0.1);};
const cmd=(w,p,type,extra={})=>w.command(p,{type,...extra});
function setup(){let date=Date.UTC(2026,10,2,12);const w=testWorld({now:()=>date}),sessions=['Founder','Member','Rival'].map(name=>w.join(name)),[a,b,c]=sessions.map(s=>w.authenticate(s.token));return {w,a,b,c,sessions,setDate:value=>{date=value;},getDate:()=>date};}
const claim=(w,p,id)=>cmd(w,p,'daily-claim',{targetId:id,period:activitySnapshot(w,p).daily.period});
const goalClaim=(w,p,id,extra={})=>{const a=activitySnapshot(w,p).alliance;cmd(w,p,'alliance-goal-claim',{targetId:id,period:a.period,allianceId:a.id,...extra});};
const join=(w,a,b)=>{cmd(w,a,'alliance-create',{name:'Dawn'});cmd(w,b,'alliance-join',{targetId:a.allianceId});};

test('daily objectives and chest rewards are explicit; forged counts and repeated claims cannot pay',()=>{
 const {w,a}=setup(),daily=activitySnapshot(w,a).daily,gold=a.gold;assert.equal(daily.points,0);assert.equal(daily.tasks.length,10);assert.deepEqual(daily.chests.map(c=>c.points),[20,40,60,80,100]);
 assert.throws(()=>cmd(w,a,'daily-claim',{targetId:'gather',period:daily.period,count:200}),/incomplete/);assert.throws(()=>cmd(w,a,'activity-chest',{targetId:'chest-20',period:daily.period}),/enough/);assert.equal(a.gold,gold);
 cmd(w,a,'gather',{targetId:w.nodes[0].id});advance(w,30);cmd(w,a,'return');advance(w,10);assert.equal(activitySnapshot(w,a).daily.points,0);claim(w,a,'gather');assert.equal(activitySnapshot(w,a).daily.points,20);
 const paid=a.gold;assert.throws(()=>claim(w,a,'gather'),/already/);assert.equal(a.gold,paid);
 cmd(w,a,'activity-chest',{targetId:'chest-20',period:daily.period});assert.equal(a.gold,paid+30);assert.throws(()=>cmd(w,a,'activity-chest',{targetId:'chest-20',period:daily.period}),/once/);assert.equal(a.gold,paid+30);assert.equal(activitySnapshot(w,a).daily.points,20);
});

test('a city reaches the final chest through normal repeatable solo play without alliance, training, research or summons',()=>{
 const {w,a}=setup();cmd(w,a,'building-upgrade',{targetId:'oracle'});advance(w,13);cmd(w,a,'temple-offering');
 cmd(w,a,'gather',{targetId:w.nodes[2].id});advance(w,35);cmd(w,a,'return');advance(w,10);
 cmd(w,a,'scout-send',{x:20,z:20});advance(w,8);
 for(let i=0;i<2;i++){cmd(w,a,'move',{x:14,z:10});advance(w,10);cmd(w,a,'attack',{targetId:w.camps[0].id});advance(w,30);cmd(w,a,'return');advance(w,50);}
 for(const id of['gather','food','scout','camps','patrol','offering'])claim(w,a,id);
 const daily=activitySnapshot(w,a).daily;assert.equal(daily.points,105);assert.ok(daily.chests.every(c=>c.canClaim));assert.equal(a.allianceId,'');assert.equal(a.summonCount,0);assert.equal(a.daily.counters.trained,0);assert.equal(a.daily.counters.helps,0);
 const before=Object.fromEntries(['wood','food','gold','stone','mana','sigils'].map(k=>[k,a[k]]));
 for(const chest of daily.chests)cmd(w,a,'activity-chest',{targetId:chest.id,period:daily.period});
 for(const resource of Object.keys(before))assert.equal(a[resource]-before[resource],ACTIVITY_CHESTS.reduce((n,c)=>n+(c.reward[resource]||0),0));
 assert.ok(activitySnapshot(w,a).daily.chests.every(c=>c.claimed));assert.equal(activitySnapshot(w,a).daily.points,105);
});

test('passive income, rewards and canceled jobs do not fabricate gathering, training or development',()=>{
 const {w,a}=setup();a.gold=a.wood=a.food=10000;advance(w,10);assert.equal(a.daily.counters.gather,0);assert.equal(a.daily.counters.food,0);
 cmd(w,a,'train');advance(w,1);assert.equal(a.daily.counters.trained,0);cmd(w,a,'cancel-job',{targetId:a.trainingQueue[0].id});assert.equal(a.daily.counters.trained,0);
 cmd(w,a,'building-upgrade',{targetId:'oracle'});advance(w,1);cmd(w,a,'cancel-job',{targetId:a.construction.id});assert.equal(a.daily.counters.development,0);
 cmd(w,a,'train');advance(w,9);assert.equal(a.daily.counters.trained,5);
 cmd(w,a,'building-upgrade',{targetId:'oracle'});advance(w,13);assert.equal(a.daily.counters.development,1);claim(w,a,'develop');assert.equal(a.daily.counters.gather,0);
});

test('scouting counts arrival, patrol excludes scouts, and forced retreats cannot create travel points',()=>{
 const {w,a}=setup();cmd(w,a,'scout-send',{x:30,z:30});advance(w,1);assert.equal(a.daily.counters.scouts,0);assert.equal(a.daily.counters.distance,0);cmd(w,a,'scout-recall',{targetId:a.scouts[0].id});advance(w,5);assert.equal(a.daily.counters.scouts,0);
 cmd(w,a,'scout-send',{x:20,z:20});advance(w,8);assert.equal(a.daily.counters.scouts,1);assert.equal(a.daily.counters.distance,0);
 const camp=w.camps[3];a.x=camp.x-1;a.z=camp.z;a.health=1;cmd(w,a,'attack',{targetId:camp.id});advance(w,0.1);assert.ok(a.recovery>0);assert.equal(a.daily.counters.distance,0);
});

test('only successful distinct alliance help contributes to daily and shared assistance',()=>{
 const {w,a,b}=setup();join(w,a,b);for(const p of[a,b]){p.cityLevel=2;p.buildings.oathhall=1;p.gold=p.wood=10000;}
 cmd(w,b,'building-upgrade',{targetId:'oracle'});assert.throws(()=>cmd(w,b,'alliance-help',{targetId:b.construction.id}),/allied/);assert.equal(b.daily.counters.helps,0);
 cmd(w,a,'alliance-help',{targetId:b.construction.id});assert.equal(a.daily.counters.helps,1);assert.throws(()=>cmd(w,a,'alliance-help',{targetId:b.construction.id}),/already/);assert.equal(a.daily.counters.helps,1);
 advance(w,13);cmd(w,b,'building-upgrade',{targetId:'academy'});cmd(w,a,'alliance-help',{targetId:b.construction.id});claim(w,a,'help');const weekly=activitySnapshot(w,a).alliance;assert.equal(weekly.goals.find(g=>g.id==='aid').progress,2);assert.equal(weekly.members.find(m=>m.id===a.id).helps,2);
});

test('daily rollover rejects expired requests, preserves weekly work and counts queued work on completion day',()=>{
 const env=setup(),{w,a,b}=env;join(w,a,b);recordActivity(w,a,'gather',200);claim(w,a,'gather');const old=activitySnapshot(w,a);cmd(w,a,'train');advance(w,1);
 env.setDate(Date.UTC(2026,10,3,0,0,1));advance(w,9);const next=activitySnapshot(w,a);assert.notEqual(next.daily.period,old.daily.period);assert.equal(a.daily.counters.trained,5);assert.equal(next.daily.points,0);assert.equal(next.daily.tasks.find(t=>t.id==='gather').progress,0);assert.equal(next.alliance.period,old.alliance.period);assert.equal(next.alliance.goals[0].progress,200);
 const gold=a.gold;assert.throws(()=>cmd(w,a,'daily-claim',{targetId:'gather',period:old.daily.period}),/expired/);assert.equal(a.gold,gold);
 recordActivity(w,a,'gather',200);claim(w,a,'gather');assert.equal(next.daily.resetSeconds,86399);
});

test('weekly rewards require current membership and personal work, survive leaving, and cannot be farmed across alliances',()=>{
 const {w,a,b,c}=setup();join(w,a,b);const firstId=a.allianceId;cmd(w,c,'alliance-create',{name:'Dusk'});recordActivity(w,a,'gather',1500);recordActivity(w,b,'gather',100);recordActivity(w,c,'gather',1600);
 assert.ok(activitySnapshot(w,b).alliance.goals[0].canClaim);goalClaim(w,b,'supply');const gold=b.gold;cmd(w,b,'alliance-leave');cmd(w,b,'alliance-join',{targetId:c.allianceId});
 const after=activitySnapshot(w,b).alliance;assert.equal(after.goals[0].personalProgress,0);assert.equal(after.goals[0].claimed,true);assert.throws(()=>goalClaim(w,b,'supply',{allianceId:firstId}),/another alliance/);
 recordActivity(w,b,'gather',100);assert.throws(()=>goalClaim(w,b,'supply'),/once per week/);assert.equal(b.gold,gold);
 const old=activitySnapshot(w,a).alliance;assert.equal(old.goals[0].progress,1600);assert.equal(old.members.find(m=>m.id===b.id).current,false);assert.equal(old.members.find(m=>m.id===b.id).gather,100);goalClaim(w,a,'supply');
 cmd(w,b,'alliance-leave');cmd(w,b,'alliance-join',{targetId:firstId});assert.equal(activitySnapshot(w,b).alliance.goals[0].claimed,true);
});

test('weekly reset is Monday UTC, lazy catch-up survives restart, and clock rollback cannot reopen old claims',()=>{
 const env=setup(),{w,a,b,sessions}=env;join(w,a,b);recordActivity(w,a,'gather',1600);goalClaim(w,a,'supply');recordActivity(w,a,'gather',200);claim(w,a,'gather');const old=activitySnapshot(w,a);
 env.setDate(Date.UTC(2026,10,9,0,0,1));let snapshot=activitySnapshot(w,a);assert.equal(snapshot.alliance.period,'2026-11-09');assert.equal(snapshot.alliance.goals[0].progress,0);assert.equal(snapshot.alliance.goals[0].claimed,false);assert.equal(snapshot.alliance.resetSeconds,604799);
 recordActivity(w,a,'gather',1600);goalClaim(w,a,'supply');claim(w,a,'gather');const save=structuredClone(w.toSave());
 const restored=World.fromSave(save,{now:()=>Date.UTC(2026,10,2)}),q=restored.authenticate(sessions[0].token);snapshot=activitySnapshot(restored,q);assert.equal(snapshot.daily.period,'2026-11-09');assert.equal(snapshot.daily.tasks.find(t=>t.id==='gather').claimed,true);assert.equal(snapshot.alliance.goals[0].claimed,true);
 assert.throws(()=>cmd(restored,q,'daily-claim',{targetId:'gather',period:old.daily.period}),/expired/);assert.throws(()=>goalClaim(restored,q,'supply'),/once per week/);
 const future=World.fromSave(save,{now:()=>Date.UTC(2026,10,30)});assert.equal(activitySnapshot(future,future.authenticate(sessions[0].token)).alliance.period,'2026-11-30');assert.equal(activitySnapshot(future,future.authenticate(sessions[0].token)).daily.points,0);
});

test('one stronghold victory is one shared event, with personal credit for each reward owner and no duplicate delivery',()=>{
 const {w,a,b}=setup();join(w,a,b);for(const p of[a,b]){p.cityLevel=2;p.buildings.oathhall=1;}
 cmd(w,a,'rally-create',{targetId:w.strongholds[0].id,count:10});cmd(w,b,'rally-join',{targetId:w.rallies[0].id});for(let i=0;i<1000&&!a.strongholdVictories;i++)w.tick(0.1);
 assert.equal(a.strongholdVictories,1);assert.equal(a.daily.counters.strongholds,1);assert.equal(b.daily.counters.strongholds,1);let weekly=activitySnapshot(w,a).alliance;assert.equal(weekly.goals.find(g=>g.id==='strongholds').progress,1);assert.ok(weekly.members.every(m=>m.strongholds===1));
 recordStrongholdActivity(w,a.groupReports[0]);assert.equal(a.daily.counters.strongholds,1);assert.equal(activitySnapshot(w,a).alliance.goals.find(g=>g.id==='strongholds').progress,1);
 const restored=World.fromSave(w.toSave(),{now:()=>Date.UTC(2026,10,2,12)});assert.equal(restored.players.get(a.id).daily.counters.strongholds,1);assert.equal(activitySnapshot(restored,restored.players.get(a.id)).alliance.goals.find(g=>g.id==='strongholds').progress,1);
});

test('malformed daily counters, chest claims, alliance contribution rows and clocks are rejected',()=>{
 const {w,a,b}=setup();join(w,a,b);recordActivity(w,a,'gather',100);activitySnapshot(w,a);
 for(const mutate of[s=>s.world.activityClockMs=-1,s=>s.world.players[0].daily.counters.gather=-1,s=>s.world.players[0].daily.claimed=['gather'],s=>s.world.players[0].daily.chests=['chest-100'],s=>s.world.players[0].weeklyClaims.claimed=['unknown'],s=>s.world.alliances[0].weekly.contributions.fake={gather:1,helps:0,strongholds:0},s=>s.world.alliances[0].weekly.strongholdEvents=['duplicate','duplicate']]){
  const bad=structuredClone(w.toSave());mutate(bad);assert.throws(()=>World.fromSave(bad,{now:()=>Date.UTC(2026,10,2,12)}),/activity|claims/);
 }
 const old=structuredClone(w.toSave());old.schema=9;delete old.world.activityClockMs;for(const p of old.world.players){delete p.daily;delete p.weeklyClaims;}for(const a of old.world.alliances)delete a.weekly;
 const migrated=World.fromSave(old,{now:()=>Date.UTC(2026,10,2,12)}),p=migrated.players.get(a.id);assert.equal(migrated.toSave().schema,25);assert.equal(activitySnapshot(migrated,p).daily.points,0);assert.equal(activitySnapshot(migrated,p).alliance.goals[0].progress,0);
});

test('all three weekly goals unlock individual rewards only for members who earned the required contributions',()=>{
 const {w,a,b,c}=setup();join(w,a,b);recordActivity(w,a,'gather',1600);recordActivity(w,a,'helps',8);recordActivity(w,b,'gather',100);recordActivity(w,b,'helps',1);
 for(let i=0;i<3;i++)recordStrongholdActivity(w,{id:'earned-victory-'+i,settled:true,attackingAllianceId:a.allianceId,rewards:[{playerId:a.id},{playerId:b.id}]});
 const board=activitySnapshot(w,b).alliance;assert.ok(board.goals.every(g=>g.canClaim));const before=Object.fromEntries(['wood','food','gold','stone','mana','sigils'].map(k=>[k,b[k]]));
 for(const goal of board.goals)goalClaim(w,b,goal.id);
 for(const k of Object.keys(before))assert.equal(b[k]-before[k],board.goals.reduce((n,g)=>n+(g.reward[k]||0),0));
 assert.ok(activitySnapshot(w,b).alliance.goals.every(g=>g.claimed));assert.ok(activitySnapshot(w,a).alliance.goals.every(g=>g.canClaim));
 recordActivity(w,c,'gather',1000);cmd(w,c,'alliance-join',{targetId:a.allianceId});assert.ok(activitySnapshot(w,c).alliance.goals.every(g=>!g.canClaim&&g.personalProgress===0));
 for(const goal of board.goals)assert.throws(()=>goalClaim(w,c,goal.id),/personal contribution/);
 recordActivity(w,c,'gather',100);goalClaim(w,c,'supply');assert.equal(activitySnapshot(w,c).alliance.goals[0].claimed,true);assert.equal(activitySnapshot(w,c).alliance.goals[1].canClaim,false);
});

test('authenticated activity claims preserve daily privacy, alliance-only ledgers and replay safety over HTTP',async testContext=>{
 const {createGameServer}=await import('./http.mjs');const {server,world:w}=createGameServer();legacySpawns(w);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});testContext.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const sessions=await Promise.all(['HTTP Active','HTTP Member','HTTP Outsider'].map(async name=>(await fetch(base+'/join',{method:'POST',body:JSON.stringify({name})})).json()));
 const [a,b,c]=sessions.map(s=>w.authenticate(s.token));join(w,a,b);
 const post=(i,body)=>fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+sessions[i].token},body:JSON.stringify(body)}),get=async i=>(await fetch(base+'/world',{headers:{Authorization:'Bearer '+sessions[i].token}})).json();
 assert.equal((await post(0,{type:'gather',targetId:w.nodes[0].id})).status,200);advance(w,30);await post(0,{type:'return'});advance(w,10);const own=await get(0),period=own.activity.daily.period;assert.equal(own.version,16);
 assert.equal((await post(2,{type:'daily-claim',targetId:'gather',period,playerId:a.id,count:200})).status,400);
 assert.equal((await post(0,{type:'daily-claim',targetId:'gather',period})).status,200);const gold=a.gold;
 assert.equal((await post(0,{type:'daily-claim',targetId:'gather',period})).status,400);assert.equal(a.gold,gold);
 assert.equal((await post(0,{type:'activity-chest',targetId:'chest-20',period})).status,200);assert.equal((await post(0,{type:'activity-chest',targetId:'chest-20',period})).status,400);
 const outsider=await get(2),ally=await get(1);assert.equal(outsider.activity.alliance,null);assert.equal(outsider.players.find(p=>p.id===a.id).daily,undefined);assert.equal(outsider.players.find(p=>p.id===a.id).weeklyClaims,undefined);assert.equal(outsider.alliances.find(p=>p.id===a.allianceId).weekly,undefined);assert.ok(ally.activity.alliance.members.some(p=>p.id===a.id));
 recordActivity(w,a,'gather',1600);const weekly=activitySnapshot(w,a).alliance;
 assert.equal((await post(1,{type:'alliance-goal-claim',targetId:'supply',period:weekly.period,allianceId:a.allianceId})).status,400);
 assert.equal((await post(0,{type:'alliance-goal-claim',targetId:'supply',period:weekly.period,allianceId:a.allianceId})).status,200);
 assert.equal((await post(0,{type:'alliance-goal-claim',targetId:'supply',period:weekly.period,allianceId:a.allianceId})).status,400);assert.deepEqual(c.weeklyClaims.claimed,[]);
});
