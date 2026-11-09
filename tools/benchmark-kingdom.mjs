import assert from 'node:assert/strict';
import {World} from '../server/world.mjs';
import {COMMANDERS} from '../server/content.mjs';
import {ensureHero,armyList} from '../server/progression.mjs';
import {performance} from 'node:perf_hooks';
import {writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir,cpus} from 'node:os';
import {KingdomDatabase} from '../server/database.mjs';
const output=process.argv[2]??'work/kingdom-benchmark.json';
const summarize=values=>{const a=[...values].sort((x,y)=>x-y);return {samples:a.length,p50Ms:a[Math.floor(a.length*.5)],p95Ms:a[Math.min(a.length-1,Math.floor(a.length*.95))],maxMs:a[a.length-1]};};
function fixture(allied){const w=new World({now:()=>Date.UTC(2026,10,9)});for(let i=0;i<32;i++)w.join('Load '+i);for(const p of w.players.values()){
 p.cityLevel=5;p.ownedCommanders=['captain',...COMMANDERS.filter(c=>c.id!=='captain').slice(0,4).map(c=>c.id)];for(const id of p.ownedCommanders)ensureHero(p,id);p.reserveUnits.infantry=20;p.reserveTroops=20;
 for(const id of p.ownedCommanders.slice(1))w.command(p,{type:'deploy-march',targetId:id,units:{infantry:5,archers:0,cavalry:0},mythic:0});
 }let i=0;for(const a of w.armies()){a.deployed=true;a.x=5+(i%8)*9;a.z=5+(Math.floor(i/8)%8)*9;a.target=null;a.state='Idle';i++;}
 if(allied){const p=[...w.players.values()][0];w.alliances.set('load',{id:'load',name:'Load alliance',leaderId:p.id,officers:[]});for(const q of w.players.values())q.allianceId='load';}
 return w;}
const reports=[];
for(const allied of [false,true]){const w=fixture(allied),p=[...w.players.values()][0];const tick=[],snapshot=[],encode=[];let bytes=0;for(let i=0;i<28;i++){
 let at=performance.now();w.tick(.1);const t=performance.now()-at;at=performance.now();const view=w.snapshot(p.id),s=performance.now()-at;at=performance.now();const text=JSON.stringify(view),e=performance.now()-at;bytes=Buffer.byteLength(text);if(i>=3){tick.push(t);snapshot.push(s);encode.push(e);}}
 const folder=await mkdtemp(join(tmpdir(),'thrones-bench-'));let database;const persist=[];try{database=new KingdomDatabase(join(folder,'world.sqlite'));for(let i=0;i<10;i++){const at=performance.now();database.save(w);persist.push(performance.now()-at);}}finally{database?.close();await rm(folder,{recursive:true,force:true});}
 assert.equal(w.players.size,32);assert.equal(w.armies().length,160);const restored=World.fromSave(w.toSave(),{now:()=>Date.UTC(2026,10,9)});assert.equal(restored.armies().reduce((n,a)=>n+a.troops,0),w.armies().reduce((n,a)=>n+a.troops,0));const view=w.snapshot(p.id);for(const a of view.armies)if(a.ownerId!==p.id){assert.equal(a.cargo,undefined);assert.deepEqual(a.route,[]);}
 reports.push({deployedMarches:w.armies().filter(a=>a.deployed).length,conservationAndPrivacyAssertions:'passed',scenario:allied?'32 allied players':'32 independent players',players:32,marches:160,visible:w.snapshot(p.id).armies.length,encodedBytes:bytes,tick:summarize(tick),snapshot:summarize(snapshot),encode:summarize(encode),sqliteSave:summarize(persist)});
}
await mkdir(dirname(output),{recursive:true});const report={node:process.version,cpu:cpus()[0]?.model,synthetic:true,note:'Production World tick/snapshot and SQLite save code with authored load fixtures. Not a gameplay/FPS, network latency or capacity guarantee.',reports};await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
