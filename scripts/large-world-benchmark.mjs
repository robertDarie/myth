// Large-map registered capacity and bounded private-alpha activity, disposable only.
import {World} from '../server/world.mjs';
import {createRealmHost} from '../server/realms.mjs';
import {WorldStore} from '../server/storage.mjs';
import {sightCells,sources} from '../server/exploration.mjs';
import {route} from '../server/navigation.mjs';
import {performance} from 'node:perf_hooks';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir,cpus} from 'node:os';
const round=n=>Math.round(n*1000)/1000;
const summary=a=>{const s=[...a].sort((a,b)=>a-b);return {samples:a.length,p50:round(s[Math.floor(s.length*.5)]??0),p95:round(s[Math.min(s.length-1,Math.floor(s.length*.95))]??0),p99:round(s[Math.min(s.length-1,Math.floor(s.length*.99))]??0)};};
const timed=(a,fn)=>{const t=performance.now(),v=fn();a.push(performance.now()-t);return v;};
const report={at:new Date().toISOString(),node:process.version,cpu:cpus()[0].model,description:'Registered cities differ from active HTTP clients; 10 concurrent loopback clients, naturally resolving PvP, gathering, scouts and moving armies. Not a sustained Internet soak.',cases:[]};
for(const count of [32,128,256]) {
 const root=mkdtempSync(join(tmpdir(),'myth-expanded-load-'));let host;
 try {
  host=createRealmHost({defaultId:'alpha',realms:[{id:'alpha',name:'Load alpha',databasePath:join(root,'kingdom.sqlite'),cityCapacity:count}]});
  const r=host.realms.get('alpha'),w=r.world;let seed=891;w.random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
  const creation=[],sessions=[];for(let i=0;i<count;i++){sessions.push(timed(creation,()=>w.join('Load '+i)));if(i%16===15&&!r.saveNow())throw new Error('setup save failed');}
  const players=[...w.players.values()],alliance=[];w.command(players[0],{type:'alliance-create',name:'Load banners'});
  for(const [i,p]of players.slice(1,Math.min(100,count)).entries()){timed(alliance,()=>w.command(p,{type:'alliance-join',targetId:players[0].allianceId}));if(i%10===9&&!r.saveNow())throw new Error('alliance setup save failed');}
  for(const p of players)p.cityLevel=2;
  // Separate fixtures for battle, gather, move and scout workloads.
  for(let i=0;i<8;i+=2){const a=players[i],b=players[i+1];b.allianceId='';a.x=120+i*3;a.z=120;b.x=a.x+1;b.z=120;a.deployed=b.deployed=true;w.command(a,{type:'attack-player',targetId:b.id});}
  for(let i=8;i<10;i++){const a=players[i],n=w.nodes.find(n=>n.x>100&&n.z>100&&n.resource===(i===8?'wood':'food'));a.x=n.x;a.z=n.z;a.deployed=true;w.command(a,{type:'gather',targetId:n.id});}
  for(const p of players.slice(10,12)){p.x=100;p.z=100;p.deployed=true;w.command(p,{type:'move',x:220,z:220});}
  for(const p of players.slice(12,22))w.command(p,{type:'scout-send',x:p.homeX<=40&&p.homeZ<=40?Math.min(37,p.homeX+4):Math.min(253,p.homeX+4),z:p.homeX<=40&&p.homeZ<=40?Math.min(37,p.homeZ+4):Math.min(253,p.homeZ+4)});
  const ticks=[],snapshots=[],encoding=[],visibility=[],paths=[],json=[],sqlite=[];let peakBattles=0,bytes=0;
  global.gc?.();const memoryBefore=process.memoryUsage();
  for(let i=0;i<50;i++){timed(ticks,()=>w.tick(.1));peakBattles=Math.max(peakBattles,w.battles.size);if(i%10===9&&!r.saveNow())throw new Error('simulation save failed');}
  for(let i=0;i<20;i++){const p=players[i%players.length];const snap=timed(snapshots,()=>w.snapshot(p.id));timed(encoding,()=>{bytes+=Buffer.byteLength(JSON.stringify(snap));});timed(visibility,()=>sightCells(sources(w,p)));}
  for(let i=0;i<30;i++)timed(paths,()=>route(w,players[10],{x:48,z:200},true));
  const store=new WorldStore(join(root,'copy.json'));for(let i=0;i<3;i++){timed(json,()=>store.save(w));timed(sqlite,()=>r.saveNow());}
  await new Promise(ok=>host.server.listen(0,'127.0.0.1',ok));r.previous=performance.now();
  const base='http://127.0.0.1:'+host.server.address().port,latency=[],commands=[],failures=[];
  const started=performance.now(),simStart=w.time;
  for(let n=0;n<5;n++){
   await Promise.all(sessions.slice(0,10).map(async s=>{const t=performance.now();try{const res=await fetch(base+'/world',{headers:{Authorization:'Bearer '+s.token},signal:AbortSignal.timeout(10000)});await res.text();latency.push(performance.now()-t);if(res.status!==200)failures.push(res.status);}catch(e){failures.push(e.name);}}));
   const s=sessions[n];const t=performance.now(),res=await fetch(base+'/command',{method:'POST',headers:{Authorization:'Bearer '+s.token},body:JSON.stringify({type:'scout-auto',enabled:false}),signal:AbortSignal.timeout(10000)});await res.text();commands.push(performance.now()-t);if(res.status!==200)failures.push(res.status);
  }
  const wall=performance.now()-started,lag=wall-(w.time-simStart)*1000;global.gc?.();
  const reloaded=World.fromSave(w.toSave());if(reloaded.players.size!==count)throw new Error('Registered identities did not survive restore.');
  report.cases.push({registeredCities:count,concurrentHttpClients:10,peakConcurrentBattles:peakBattles,allianceMembersBeforeCombat:Math.min(100,count),creation:summary(creation),allianceJoin:summary(alliance),tick:summary(ticks),snapshot:summary(snapshots),serialization:summary(encoding),visibility:summary(visibility),crossProvincePath:summary(paths),jsonSave:summary(json),sqliteSave:summary(sqlite),meanSnapshotBytes:Math.round(bytes/20),poll:summary(latency),command:summary(commands),requests:latency.length+commands.length,failures,wallMs:round(wall),simulationLagMs:round(lag),memoryBefore,memoryRetained:process.memoryUsage(),persistenceHealthy:!r.persistence.error});
 }finally{if(host)await new Promise(ok=>{host.server.close(ok);host.server.closeAllConnections();});rmSync(root,{recursive:true,force:true});}
}
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6);if(out){mkdirSync(dirname(resolve(out)),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));if(report.cases.some(c=>c.failures.length||!c.persistenceHealthy))process.exitCode=1;
