// Fresh production commands/clock only. A full-map manual result does not
// certify the separately reported bounded automatic-exploration behavior.
import {World} from '../server/world.mjs';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
let seed=431;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
let world;world=new World({random,now:()=>Date.UTC(2026,10,16)+Math.floor((world?.time??0)*1000)});
const session=world.join('Full map QA','greek');
const p=world.authenticate(session.token),started=performance.now(),actions=[];
const command=body=>{world.command(p,body);actions.push({seconds:world.time,...body});};
const view=()=>world.snapshot(session.playerId),count=()=>view().exploration.explored.length;
command({type:'scout-auto',enabled:true});let lastCount=count(),lastGain=world.time;
for(let i=0;i<12000&&lastCount<4096;i++){
 world.tick(.25);if(i%40===0){const n=count();if(n>lastCount){lastCount=n;lastGain=world.time;}if(world.time-lastGain>120)break;}
}
const automatic={cells:count(),seconds:world.time,activeScouts:p.scouts.length,verdict:count()===4096?'PASS':'FAIL incomplete automatic exploration'};
command({type:'scout-auto',enabled:false});
// Manual strategy uses only the same owner-visible map/scout data and legal
// redirect commands available to the player; never assigns fog or coordinates.
let manualCommands=0;
for(let i=0;i<16000&&count()<4096;i++){
 const snapshot=view(),scout=snapshot.exploration.scouts.find(s=>s.phase!=='Idle'),known=new Set(snapshot.exploration.explored);
 if(!scout||scout.phase==='Exploring'||scout.phase==='Returning'){
  const at=scout??{x:p.homeX,z:p.homeZ};let target,score=Infinity;
  for(let cell=0;cell<4096;cell++)if(!known.has(cell)){const x=cell%64*4+2,z=Math.floor(cell/64)*4+2,d=Math.hypot(at.x-x,at.z-z);if(d<score){score=d;target={x,z};}}
  if(target){command({type:scout?'scout-redirect':'scout-send',...(scout?{targetId:scout.id}:{}),...target});manualCommands++;}
 }
 world.tick(.25);
}
const cells=count(),restored=World.fromSave(world.toSave()),q=restored.authenticate(session.token);
const report={testedParent:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Fresh production city, default scout level/capacity, actual commands and tick(.25); accelerated simulation clock, no resources/XP/coordinates/fog injected; manual phase follows automatic test if incomplete; full-map automatic reference behavior UNKNOWN',automatic,finalCells:cells,simulationSeconds:world.time,wallSeconds:(performance.now()-started)/1000,manualCommands,restartCells:q.explored.length,actions};
writeFileSync('work/task4/natural-exploration.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,actions:actions.length}));
if(cells!==4096||q.explored.length!==cells)process.exitCode=1;
