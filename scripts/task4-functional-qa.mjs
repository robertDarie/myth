import assert from 'node:assert/strict';
import {fork,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const soakSeconds=Number(value('--soak-seconds','120')),output=resolve(value('--output','work/task4/functional-results.json'));
if(!Number.isFinite(soakSeconds)||soakSeconds<0||soakSeconds>600)throw Error('Invalid soak duration');
mkdirSync(resolve('work/task4'),{recursive:true});
const evidence={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,scope:'Actual HTTP and fresh production state; accelerated setup clocks explicitly separate from real wall-clock soak; no native or remote-human certification',checks:[],backends:[]};
async function check(id,action){try{await action();evidence.checks.push({id,verdict:'PASS'});}catch(error){evidence.checks.push({id,verdict:'FAIL',error:error.message});}}
const summary=values=>{const a=[...values].sort((x,y)=>x-y);return {samples:a.length,p50Ms:a[Math.floor(a.length*.5)]??0,p95Ms:a[Math.min(a.length-1,Math.floor(a.length*.95))]??0,maxMs:a.at(-1)??0};};
for(const backend of ['json','sqlite']){
 const root=resolve('work/task4','run-'+backend+'-'+randomUUID());mkdirSync(root,{recursive:true});
 const clockOrigin=Date.now();let child,base,serial=0;const snapshotTimes=[],commandTimes=[];
 async function start(){
  const at=performance.now();child=fork(new URL('./task4-host-worker.mjs',import.meta.url),[],{env:{...process.env,QA_DIRECTORY:root,QA_BACKEND:backend,QA_CLOCK_ORIGIN:String(clockOrigin)},stdio:['ignore','ignore','pipe','ipc']});
  child.stderr.on('data',()=>{});
  const port=await new Promise((ok,no)=>{const timeout=setTimeout(()=>no(Error('QA host startup timeout')),30000);child.once('error',no);child.once('exit',code=>{if(code)no(Error('QA worker exited before ready: '+code));});const listener=message=>{if(message.ready){clearTimeout(timeout);child.off('message',listener);ok(message.port);}};child.on('message',listener);});
  base='http://127.0.0.1:'+port;return performance.now()-at;
 }
 async function stop(){if(!child||child.exitCode!==null)return;const exit=new Promise(ok=>child.once('exit',ok));await fetch(base+'/launcher-shutdown',{method:'POST',headers:{'x-thrones-launcher':'task4-owned-worker-close'}});await exit;child=null;}
 async function control(op,extra={}){const id=++serial;return new Promise((ok,no)=>{const timeout=setTimeout(()=>no(Error('QA control timeout')),30000);const listener=message=>{if(message.id===id){clearTimeout(timeout);child.off('message',listener);message.error?no(Error(message.error)):ok(message.stats);}};child.on('message',listener);child.send({id,op,...extra});});}
 async function request(path,body=null,session=null,key='',realm='alpha'){
  const at=performance.now(),response=await fetch(base+'/k/'+realm+path,{method:body===null?'GET':'POST',headers:{...(session?{Authorization:'Bearer '+session.token}:{}),...(key?{'Idempotency-Key':key}:{})},...(body===null?{}:{body:JSON.stringify(body)})});
  const result={status:response.status,body:await response.json()},elapsed=performance.now()-at;
  if(path==='/world')snapshotTimes.push(elapsed);if(path==='/command')commandTimes.push(elapsed);return result;
 }
 const command=(session,body,key='')=>request('/command',body,session,key),snap=async session=>{const r=await request('/world',null,session);assert.equal(r.status,200);return r.body;};
 const own=(view,session)=>view.players.find(p=>p.id===session.playerId);
 const sessions=[];let startupMs,soak=null;
 try{
  startupMs=await start();
  await check(backend+'.readiness-and-invitation',async()=>{assert.equal((await request('/readyz')).status,200);assert.equal((await request('/join',{name:'Rejected',joinCode:'wrong'})).status,403);assert.equal((await request('/world')).status,401);});
  for(let i=0;i<(backend==='sqlite'?10:3);i++){const joined=await request('/join',{name:'QA '+backend+' '+i,civilization:['greek','egyptian','norse','chinese','japanese'][i%5],joinCode:'task4-synthetic-invite'});assert.equal(joined.status,201);sessions.push(joined.body);}
  await check(backend+'.distinct-random-homes-and-protocol',async()=>{const homes=[];for(const s of sessions){const view=await snap(s),p=own(view,s);assert.equal(view.version,17);assert.ok(p.homeX>=1&&p.homeX<=255&&p.homeZ>=1&&p.homeZ<=255);homes.push(p.homeX+':'+p.homeZ);}assert.equal(new Set(homes).size,sessions.length);});
  await check(backend+'.army-authority-and-invalid-input',async()=>{const before=own(await snap(sessions[1]),sessions[1]);assert.equal((await command(sessions[0],{type:'move',marchId:sessions[1].playerId,x:10,z:10})).status,400);assert.equal((await command(sessions[0],{type:'move',x:-1,z:256})).status,400);const after=own(await snap(sessions[1]),sessions[1]);assert.deepEqual([after.x,after.z],[before.x,before.z]);assert.equal((await request('/world',null,sessions[0],'','beta')).status,401);});
  await check(backend+'.three-player-alliance-chat-and-roles',async()=>{assert.equal((await command(sessions[0],{type:'alliance-create',name:'QA cooperative'})).status,200);const alliance=own(await snap(sessions[0]),sessions[0]).allianceId;for(const s of sessions.slice(1,3))assert.equal((await command(s,{type:'alliance-join',targetId:alliance})).status,200);assert.equal((await command(sessions[2],{type:'alliance-promote',targetId:sessions[1].playerId})).status,400);assert.equal((await command(sessions[0],{type:'alliance-promote',targetId:sessions[1].playerId})).status,200);assert.equal((await command(sessions[1],{type:'chat-send',targetId:'alliance',name:'Task4 shared private chat'})).status,200);assert.ok((await snap(sessions[2])).chatMessages.some(m=>m.text==='Task4 shared private chat'));if(sessions[3])assert.ok(!(await snap(sessions[3])).chatMessages.some(m=>m.text==='Task4 shared private chat'));});
  await check(backend+'.paid-construction-and-alliance-help',async()=>{
   for(const s of sessions.slice(0,2))assert.equal((await command(s,{type:'building-upgrade',targetId:'citadel'})).status,200);
   await control('advance',{seconds:21});
   for(const s of sessions.slice(0,2)){assert.equal(own(await snap(s),s).cityLevel,2);assert.equal((await command(s,{type:'building-upgrade',targetId:'oathhall'})).status,200);}
   await control('advance',{seconds:13});
   assert.equal((await command(sessions[0],{type:'building-upgrade',targetId:'market'})).status,200);await control('advance',{seconds:13});
   assert.equal((await command(sessions[0],{type:'building-upgrade',targetId:'farm'})).status,200);
   const job=own(await snap(sessions[0]),sessions[0]).construction;
   assert.equal((await command(sessions[1],{type:'alliance-help',targetId:job.id})).status,200);
   assert.equal((await command(sessions[1],{type:'alliance-help',targetId:job.id})).status,400);
   await control('advance',{seconds:25});
  });
  await check(backend+'.transfer-replay-and-conservation',async()=>{const beforeA=own(await snap(sessions[0]),sessions[0]),beforeB=own(await snap(sessions[1]),sessions[1]);const body={type:'resource-transfer',targetId:sessions[1].playerId,name:'gold',count:100,jobId:'1-task4-transfer'};assert.equal((await command(sessions[0],body)).status,200);assert.equal((await command(sessions[0],body)).status,200);const afterA=own(await snap(sessions[0]),sessions[0]),afterB=own(await snap(sessions[1]),sessions[1]);assert.equal(afterA.gold,beforeA.gold-110);assert.equal(afterB.gold,beforeB.gold+100);});
  if(backend==='sqlite')await check('sqlite.concurrent-idempotent-training',async()=>{const s=sessions[4],before=own(await snap(s),s);const replies=await Promise.all([command(s,{type:'train',targetId:'infantry'},'task4_train_once'),command(s,{type:'train',targetId:'infantry'},'task4_train_once')]);assert.ok(replies.every(r=>r.status===200));const after=own(await snap(s),s);assert.equal(after.food,before.food-5000);assert.equal(after.wood,before.wood-5000);assert.equal(after.trainingQueue.length,1);assert.equal((await command(s,{type:'train',targetId:'archers'},'task4_train_once')).status,409);});
  await check(backend+'.own-movement-and-foreign-recon-privacy',async()=>{for(const s of sessions){const view=await snap(s),p=own(view,s);for(const other of view.players.filter(p=>p.id!==s.playerId)){assert.equal(other.inventory,undefined);assert.equal(other.heroRecords,undefined);assert.equal(other.trainingQueue,undefined);}assert.equal((await command(s,{type:'move',x:p.homeX+1,z:p.homeZ})).status,200);}await control('advance',{seconds:2});for(const s of sessions)assert.equal((await command(s,{type:'return'})).status,200);await control('advance',{seconds:3});});
  await check(backend+'.legal-root-beacon-and-garrison',async()=>{
   const p=own(await snap(sessions[0]),sessions[0]);
   assert.equal((await command(sessions[0],{type:'flag',x:p.homeX,z:p.homeZ})).status,200);
   await control('advance',{seconds:31});const flags=(await snap(sessions[0])).flags;
   const rootFlag=flags.find(f=>f.allianceId===p.allianceId&&f.isRoot);assert.ok(rootFlag);
   assert.equal((await command(sessions[0],{type:'garrison-join',targetId:rootFlag.id})).status,200);
   await control('advance',{seconds:1});assert.equal((await command(sessions[0],{type:'garrison-leave'})).status,200);
   assert.equal((await command(sessions[2],{type:'rally-create',targetId:'not-a-structure'})).status,400);
  });
  if(backend==='sqlite'&&soakSeconds>0){
   const startStats=await control('stats'),started=performance.now();let cycles=0,maxRss=startStats.memory.rss;
   while(performance.now()-started<soakSeconds*1000){
    await Promise.all(sessions.map(async(s,index)=>{const view=await snap(s),p=own(view,s);const result=await command(s,{type:'move',x:p.homeX+(cycles%2?1:2),z:p.homeZ});assert.equal(result.status,200);}));cycles++;
    const stats=await control('stats');maxRss=Math.max(maxRss,stats.memory.rss);await new Promise(ok=>setTimeout(ok,1000));
   }
   const finish=await control('stats');soak={wallSeconds:(performance.now()-started)/1000,cycles,authenticatedClients:10,registeredAlphaPlayers:10,simultaneousBattles:finish.realms.find(r=>r.id==='alpha').battles,cpuUserSeconds:(finish.cpu.user-startStats.cpu.user)/1e6,cpuSystemSeconds:(finish.cpu.system-startStats.cpu.system)/1e6,maxRssBytes:maxRss,tick:summary(finish.timings.tick),save:summary(finish.timings.save),scope:'Ten real loopback HTTP sessions; movement and polling; no remote PCs or ten-battle claim'};
  }
  const beforeRestart=await Promise.all(sessions.map(async s=>{const p=own(await snap(s),s);return {id:s.playerId,homeX:p.homeX,homeZ:p.homeZ,allianceId:p.allianceId,cityLevel:p.cityLevel,units:p.units,reserveTroops:p.reserveTroops,trainingJobs:p.trainingQueue.length};}));
  await check(backend+'.actual-process-restart-and-resume',async()=>{await stop();await start();for(let i=0;i<sessions.length;i++){const resumed=await request('/join',{resumeToken:sessions[i].token,name:'ignored'});assert.equal(resumed.status,201);assert.equal(resumed.body.playerId,sessions[i].playerId);const p=own(await snap(sessions[i]),sessions[i]);assert.deepEqual({id:p.id,homeX:p.homeX,homeZ:p.homeZ,allianceId:p.allianceId,cityLevel:p.cityLevel,units:p.units,reserveTroops:p.reserveTroops,trainingJobs:p.trainingQueue.length},beforeRestart[i]);}});
  if(backend==='sqlite')await check('sqlite.idempotency-survives-process-restart',async()=>{const s=sessions[4],before=own(await snap(s),s);assert.equal((await command(s,{type:'train',targetId:'infantry'},'task4_train_once')).status,200);const after=own(await snap(s),s);assert.equal(after.trainingQueue.length,before.trainingQueue.length);assert.equal(after.reserveTroops,before.reserveTroops);});
  evidence.backends.push({backend,players:sessions.length,startupMs,requests:{snapshot:summary(snapshotTimes),command:summary(commandTimes)},soak,clock:'Production auto ticks plus explicitly accelerated 109 seconds of setup through production tick(.25); no injected progression'});
 }catch(error){evidence.checks.push({id:backend+'.runner',verdict:'FAIL',error:error.message});}
 finally{try{await stop();}catch{child?.kill();}}
}
mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
const failures=evidence.checks.filter(r=>r.verdict==='FAIL');console.log(JSON.stringify({checks:evidence.checks.length,passed:evidence.checks.length-failures.length,failed:failures,output}));
if(failures.length)process.exitCode=1;
