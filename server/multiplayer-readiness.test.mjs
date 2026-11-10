import test from 'node:test';
import assert from 'node:assert/strict';
import {testWorld} from './testing/kingdom-fixture.mjs';
import {visionContext,visible} from './exploration.mjs';
import {scoutProfile} from './scout-camp.mjs';
import {ServerTelemetry} from './telemetry.mjs';
import {twoPlayerProof} from '../tools/two-player-proof.mjs';
const legacySources=(w,p)=>[...w.players.values()].filter(q=>p.id===q.id||p.allianceId&&p.allianceId===q.allianceId).flatMap(q=>[{x:q.homeX,z:q.homeZ,radius:10},...w.armies().filter(a=>(a.deployed||a.target||Math.hypot(a.x-q.homeX,a.z-q.homeZ)>=2)&&w.owner(a).id===q.id).map(a=>({x:a.x,z:a.z,radius:8})),...(q.scouts??[]).map(s=>({...s,radius:scoutProfile(q.buildings.scoutcamp).radius}))]);
test('vision reuse matches original geometry and never survives alliance membership or movement changes',()=>{
 const w=testWorld(),p=w.authenticate(w.join('A').token),q=w.authenticate(w.join('B').token);w.command(p,{type:'alliance-create',name:'Vision'});w.command(q,{type:'alliance-join',targetId:p.allianceId});w.command(q,{type:'move',x:25,z:25});for(let i=0;i<50;i++)w.tick(.1);
 for(const viewer of [p,q]){const eyes=legacySources(w,viewer),context=visionContext(w,viewer);for(let z=0;z<=80;z+=2)for(let x=0;x<=80;x+=2)assert.equal(context.seen({x,z}),eyes.some(s=>Math.hypot(x-s.x,z-s.z)<=s.radius));}
 const at={x:q.x,z:q.z};assert.equal(visible(w,p,at),true);w.command(q,{type:'alliance-leave'});assert.equal(visible(w,p,at),legacySources(w,p).some(s=>Math.hypot(at.x-s.x,at.z-s.z)<=s.radius));
});
test('live roster drops departed members while their last-known city intelligence stays frozen',()=>{
 const w=testWorld(),p=w.authenticate(w.join('Leader').token),q=w.authenticate(w.join('Member').token);q.homeX=q.x=70;q.homeZ=q.z=70;w.command(p,{type:'alliance-create',name:'Roster'});w.command(q,{type:'alliance-join',targetId:p.allianceId});w.command(p,{type:'alliance-promote',targetId:q.id});let view=w.snapshot(p.id);assert.equal(view.allianceRoster.find(m=>m.id===q.id).role,'Officer');assert.ok(view.players.find(v=>v.id===q.id).mapVisible);
 w.command(q,{type:'alliance-leave'});view=w.snapshot(p.id);assert.equal(view.allianceRoster.some(m=>m.id===q.id),false);assert.equal(view.players.find(v=>v.id===q.id).allianceId,p.allianceId);assert.equal(view.players.find(v=>v.id===q.id).lastKnown,true);assert.equal('gold' in view.allianceRoster[0],false);
});
test('server telemetry remains bounded and contains phase measurements rather than player data',()=>{
 const t=new ServerTelemetry(null,8);for(let i=0;i<100;i++)t.record('tick',i);t.response(1000);const report=t.snapshot();assert.equal(report.phases.tick.samples,8);assert.equal(report.phases.tick.total,100);assert.ok(report.phases.tick.p95Ms>=report.phases.tick.p50Ms);assert.equal(report.encodedBytes,1000);assert.equal('players' in report,false);
});
test('real two-player HTTP/SQLite progression, alliance conflicts, garrison/rally and restart proof',async()=>{const r=await twoPlayerProof();assert.equal(r.success,true);assert.equal(r.nativeUnity,'NOT RUN');assert.equal(r.steps.length,5);});
test('opt-in real HTTP telemetry records server phases/bytes and flushes without player identifiers',async t=>{
 const {createGameServer}=await import('./http.mjs');const {mkdtemp,readFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const folder=await mkdtemp(join(tmpdir(),'thrones-metrics-')),path=join(folder,'metrics.json'),metrics=new ServerTelemetry(path,16),app=createGameServer({telemetry:metrics,databasePath:join(folder,'world.sqlite')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+app.server.address().port;
 try{let response=await fetch(url+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Private telemetry player'})});const session=await response.json();response=await fetch(url+'/world',{headers:{Authorization:'Bearer '+session.token}});assert.equal(response.status,200);await response.json();metrics.flush();const raw=await readFile(path,'utf8'),report=JSON.parse(raw);assert.ok(report.phases.snapshot.samples>0&&report.phases.persist.samples>0&&report.encodedBytes>0);assert.equal(raw.includes(session.token),false);assert.equal(raw.includes('Private telemetry player'),false);}
 finally{await new Promise(r=>{app.server.close(r);app.server.closeAllConnections();});await rm(folder,{recursive:true,force:true});}
});
test('metrics cannot overwrite a configured game save or SQLite WAL/SHM',async()=>{
 const {createGameServer}=await import('./http.mjs');for(const target of ['/tmp/game-save.json','/tmp/game-save.json.bak','/tmp/game.sqlite','/tmp/game.sqlite-wal','/tmp/game.sqlite-shm'])assert.throws(()=>createGameServer({savePath:target.includes('game-save')?'/tmp/game-save.json':null,databasePath:target.includes('game-save')?null:'/tmp/game.sqlite',telemetry:new ServerTelemetry(target)}),/separate file/);
});
