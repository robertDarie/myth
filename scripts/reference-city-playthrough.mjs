// Purely experimental SYNTHETIC progression; never real saves or RoK parity proof.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {ReferenceCityEngine} from '../server/reference-city.mjs';
import {syntheticCityProfile} from '../server/testing/reference-city-fixtures.mjs';
const profile=syntheticCityProfile(),engine=new ReferenceCityEngine(profile,{experimental:true}),session=engine.join('B1 synthetic playthrough'),ledger=[];
let request=0;
const command=(type,args={})=>engine.command(session.token,{requestId:'play-'+(++request),type,...args});
const snapshot=()=>engine.snapshot(session.token);
function fund(){engine.tick(30);command('collect');}
function upgrade(id){
 const before=snapshot(),q=before.buildings.find(b=>b.id===id);command('building-upgrade',{targetId:id});const paid=snapshot();
 for(const [r,n]of Object.entries(q.cost))assert.equal(before.resources[r]-paid.resources[r],n);
 engine.tick(q.seconds);assert.equal(snapshot().levels[id],q.nextLevel);
 ledger.push({id,from:q.level,to:q.nextLevel,cost:q.cost,seconds:q.seconds,before:before.resources,afterPayment:paid.resources});
}
for(let level=2;level<=25;level++){
 fund();for(const id of ['farm','academy'])while(snapshot().levels[id]<level-1){fund();upgrade(id);}upgrade('citadel');
}
for(const b of profile.buildings)if(b.id!=='citadel')while(snapshot().levels[b.id]<25){fund();upgrade(b.id);}
const final=snapshot(),copy=ReferenceCityEngine.fromSave(engine.toSave(),profile,{experimental:true});assert.deepEqual(copy.snapshot(session.token),final);
const result={checked:'2026-11-18',evidence:'SYNTHETIC ENGINE CAPABILITY ONLY — NOT RoK numerical parity or birth progression',initialFixture:profile.initial,independentBuildings:profile.buildings.length,finalLevels:final.levels,paidUpgradeCommands:ledger.length,totalCommands:request,simulationSeconds:final.time,clock:'Authoritative experimental engine tick(seconds), exact event-boundary completion; supplied TEST_ONLY modifier formula',resources:final.resources,saveRestart:'PASS separate experimental format, exact same profile fingerprint',normalActivation:false,native:'NOT TESTED',ledger};
mkdirSync('work/task7-b1',{recursive:true});writeFileSync('work/task7-b1/progression.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,ledger:undefined}));
