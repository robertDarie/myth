// Disposable generated worlds only; never takes a save path or fixed port.
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { tmpdir, cpus, totalmem } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const arg = (key, fallback) => process.argv.find(a => a.startsWith('--' + key + '='))?.split('=').slice(1).join('=') ?? fallback;
const source = resolve(arg('server-dir', 'server'));
const moduleAt = name => import(pathToFileURL(join(source, name + '.mjs')));
const { World } = await moduleAt('world');
const { createRealmHost } = await moduleAt('realms');
const { initializeFortification } = await moduleAt('campaign');
const { KINGDOM_STAGES } = await moduleAt('kingdom');
const ticks = Number(arg('ticks', 100)), rounds = Number(arg('rounds', 6));
assert.ok(Number.isInteger(ticks) && ticks >= 10 && Number.isInteger(rounds) && rounds >= 1);
const fixedNow = Date.UTC(2026, 10, 14, 12);
const round = n => Math.round(n * 1000) / 1000;
function summary(values) {
  const sorted = [...values].sort((a,b) => a-b);
  const at = p => round(sorted[Math.min(sorted.length-1, Math.floor(sorted.length*p))] ?? 0);
  return { samples: values.length, p50: at(.5), p95: at(.95), p99: at(.99), max: at(1) };
}
const timed = (values, fn) => { const at = performance.now(); const value = fn(); values.push(performance.now()-at); return value; };
const cloneWorld = w => structuredClone(Object.fromEntries(Object.entries(w).filter(([,v])=>typeof v!=='function')));
const checkpoint = (await moduleAt('checkpoint').catch(error => { if(error.code !== 'ERR_MODULE_NOT_FOUND')throw error;return {checkpoint:cloneWorld}; })).checkpoint;
function populate(w, count, idle = false) {
  w.now = () => fixedNow; w.random = () => .5;
  w.kingdom.completed = KINGDOM_STAGES.slice(0,3).map(s=>({id:s.id,atMs:w.activityClockMs,legacy:true,eligible:[]}));
  const sessions = Array.from({length:count},(_,i)=>w.join('Load'+i, 'greek'));
  const players = [...w.players.values()];
  for (const p of players) { p.cityLevel=2; p.buildings.scoutcamp=1; p.buildings.oathhall=1; p.gold=10000; }
  if (!idle && count >= 16) {
    for(let i=0;i<8;i+=2) {
      const a=players[i], b=players[i+1];
      a.x=8+i*3; a.z=22; b.x=a.x+1; b.z=a.z; a.deployed=b.deployed=true;
      w.command(a,{type:'attack-player',targetId:b.id});
    }
    for(let i=8;i<12;i++) {
      const p=players[i], n=w.nodes[i-8];p.x=n.x;p.z=n.z;p.deployed=true;
      w.command(p,{type:'gather',targetId:n.id});
    }
    for(let i=12;i<14;i++) w.command(players[i],{type:'move',x:34,z:34});
    const leader=players[14], defender=players[15];
    w.command(leader,{type:'alliance-create',name:'Load attackers'});
    w.command(defender,{type:'alliance-create',name:'Load defenders'});
    const gate=w.sites.find(s=>s.id==='gate-east');gate.allianceId=defender.allianceId;
    const supply={id:'load-supply',allianceId:leader.allianceId,x:32,z:20};
    initializeFortification(supply);supply.isRoot=true;w.flags.push(supply);
    w.command(leader,{type:'rally-create',targetId:gate.id,count:10});
    w.command(defender,{type:'garrison-join',targetId:gate.id});
    leader.x=34;leader.z=20;defender.x=36;defender.z=20;
    if(count>16) {
      w.command(players[16],{type:'alliance-join',targetId:leader.allianceId});
      w.command(players[16],{type:'rally-join',targetId:w.rallies[0].id});
    }
  }
  if(!idle) for(const p of players) w.command(p,{type:'scout-send',x:34,z:34});
  World.fromSave(w.toSave()); // Validate generated fixture before measuring.
  return sessions;
}
function activity(w) {
  return { battles:w.battles.size, battleRounds:[...w.battles.values()].reduce((n,b)=>n+b.rounds,0), rallies:w.rallies.length, garrisons:w.garrisons.length, scouts:[...w.players.values()].reduce((n,p)=>n+p.scouts.length,0), gatherers:w.armies().filter(a=>a.target?.type==='gather').length, moving:w.armies().filter(a=>a.target?.type==='move').length, logisticsRevision:w.logisticsRevision };
}
function direct(count,idle) {
  const w=new World({now:()=>fixedNow,random:()=>.5});populate(w,count,idle);
  const startActivity=activity(w), tick=[], clone=[], snapshot=[], encode=[];
  for(let i=0;i<10;i++)w.tick(.1);
  global.gc?.();const before=process.memoryUsage();
  for(let i=0;i<ticks;i++)timed(tick,()=>w.tick(.1));
  for(let i=0;i<30;i++)timed(clone,()=>checkpoint(w));
  let bytes=0;
  for(let i=0;i<30;i++) {
    const snap=timed(snapshot,()=>w.snapshot([...w.players.keys()][i%count]));
    timed(encode,()=>{bytes+=Buffer.byteLength(JSON.stringify(snap));});
  }
  const peak=process.memoryUsage();global.gc?.();const retained=process.memoryUsage();
  return {count,idle,startActivity,endActivity:activity(w),tick:summary(tick),checkpoint:summary(clone),snapshot:summary(snapshot),serialization:summary(encode),meanSnapshotBytes:Math.round(bytes/30),memory:{before,peak,retained}};
}
async function httpCase(kingdoms,count,backend) {
  const root=mkdtempSync(join(tmpdir(),'myth-scale-'));let host;
  try {
    host=createRealmHost({defaultId:'k0',realms:Array.from({length:kingdoms},(_,i)=>({id:'k'+i,name:'Kingdom '+i,...(backend==='json'?{savePath:join(root,'k'+i+'.json')}:{databasePath:join(root,'k'+i+'.sqlite')})}))});
    const sessions=[];
    for(const realm of host.realms.values()) {
      sessions.push(...populate(realm.world,count).map(s=>({...s,kingdomId:realm.id})));
      assert.equal(realm.saveNow(),true);
    }
    const tick=[], hostTick=[], save=[], polls=[], commands=[], failures=[], drift=[];
    const initial = new Map([...host.realms.values()].map(r=>[r.id,cloneWorld(r.world)]));
    // Measure a separate fixed-step host loop including checkpoints, then live HTTP timers.
    let now=performance.now();
    for(const realm of host.realms.values())realm.previous=now;
    for(let i=0;i<ticks;i++) {
      now+=100;
      timed(hostTick,()=>{for(const realm of host.realms.values())timed(tick,()=>realm.tick(now));});
    }
    for(const realm of host.realms.values()){Object.assign(realm.world,initial.get(realm.id));assert.equal(realm.saveNow(),true);}
    await new Promise((ok,fail)=>{host.server.once('error',fail);host.server.listen(0,'127.0.0.1',ok);});
    // Reset the scheduler after the synthetic clock used above.
    for(const realm of host.realms.values())realm.previous=performance.now();
    const base='http://127.0.0.1:'+host.server.address().port;
    global.gc?.();
    const memoryBefore=process.memoryUsage(), worldStart=host.world.time, wallStart=performance.now();
    let memoryPeak=memoryBefore;
    const request=async(session,command)=>{
      const at=performance.now();
      try {
        const response=await fetch(base+'/k/'+session.kingdomId+(command?'/command':'/world'),{method:command?'POST':'GET',headers:{Authorization:'Bearer '+session.token,...(command?{'Content-Type':'application/json'}:{})},body:command?JSON.stringify({type:'scout-auto',enabled:false}):undefined,signal:AbortSignal.timeout(10000)});
        const body=await response.text();(command?commands:polls).push({ms:performance.now()-at,bytes:Buffer.byteLength(body),status:response.status});
        if(response.status!==200)failures.push({status:response.status,command});
      } catch(error) {failures.push({error:error.name,command});}
    };
    for(let r=0;r<rounds;r++) {
      const at=performance.now();
      await Promise.all([...sessions.map(s=>request(s,false)),...Array.from(host.realms.keys()).flatMap(id=>sessions.filter(s=>s.kingdomId===id).slice(0,2).map(s=>request(s,true)))]);
      const deadline=at+200;await new Promise(ok=>setTimeout(ok,Math.max(0,deadline-performance.now())));
      drift.push(Math.max(0,performance.now()-deadline));
      const memory=process.memoryUsage();if(memory.heapUsed>memoryPeak.heapUsed)memoryPeak=memory;
    }
    const wallMs=performance.now()-wallStart, simulatedMs=(host.world.time-worldStart)*1000;
    for(let i=0;i<5;i++)for(const realm of host.realms.values())timed(save,()=>assert.equal(realm.saveNow(),true));
    global.gc?.();const memoryRetained=process.memoryUsage();
    return {kingdoms,count,backend,tick:summary(tick),hostTick:summary(hostTick),save:summary(save),poll:summary(polls.map(p=>p.ms)),command:summary(commands.map(p=>p.ms)),pollRequests:polls.length,commandRequests:commands.length,meanSnapshotBytes:Math.round(polls.reduce((n,p)=>n+p.bytes,0)/polls.length),failures,roundOverrun:summary(drift),wallMs:round(wallMs),simulatedMs:round(simulatedMs),simulationLagMs:round(wallMs-simulatedMs),memoryBefore,memoryPeak,memoryRetained,perRealmSimulatedMs:[...host.realms.values()].map(r=>round((r.world.time-worldStart)*1000)),activity:[...host.realms.values()].map(r=>activity(r.world)),healthy:[...host.realms.values()].every(r=>!r.persistence.error)};
  } finally {
    if(host)await new Promise(ok=>{host.server.close(ok);host.server.closeAllConnections();});
    rmSync(root,{recursive:true,force:true}); // Only our mkdtemp directory.
  }
}
const report={version:2,at:new Date().toISOString(),node:process.version,cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemory:totalmem(),source,ticks,rounds,direct:[],http:[]};
for(const [count,idle] of [[1,true],[16,false],[32,true],[32,false]])report.direct.push(direct(count,idle));
if(arg('http','yes')!=='no') for(const backend of ['json','sqlite'])for(const [kingdoms,count] of [[1,1],[1,16],[1,32],[4,32]])report.http.push(await httpCase(kingdoms,count,backend));
const out=arg('out',null);
if(out){mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
if(report.http.some(c=>!c.healthy||c.failures.length))process.exitCode=1;
