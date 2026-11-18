// Track B: actual World commands and explicit offline server clock, SYNTHETIC only.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {QaReferenceWorld} from '../server/qa-reference-world.mjs';
import {World} from '../server/world.mjs';
import {advanceDowntime} from '../server/downtime.mjs';
import {syntheticCityProfile} from '../server/testing/reference-city-fixtures.mjs';
const profile=syntheticCityProfile(),options={qaOnly:true,profile,random:()=>.2,now:()=>0};
const world=new QaReferenceWorld(options),legacy=world.seedLegacyPlayer('Mixed legacy','greek'),session=world.join('Integrated synthetic','greek');
const baseline=new World({random:()=>.2,now:()=>0}),baselineSession=baseline.join('Mixed legacy','greek');
let commands=0;const ledger=[];
const self=()=>world.snapshot(session.playerId).players.find(p=>p.id===session.playerId);
const command=(type,targetId='')=>world.command(world.authenticate(session.token),{type,targetId,requestId:'integrated-'+(++commands)});
function elapse(seconds){world.advanceQaDowntime(0,Math.round(seconds*1000));advanceDowntime(baseline,0,Math.round(seconds*1000));}
function fund(){elapse(30);command('qa-city-collect');}
function upgrade(id){
 const before=self(),row=before.referenceCity.buildings.find(b=>b.id===id),definition=profile.buildings.find(b=>b.id===id),supplied=definition.rows[row.nextLevel-1];
 command('qa-city-upgrade',id);const paid=self();
 for(const [resource,value]of Object.entries(supplied.cost))assert.equal(before[resource]-paid[resource],value);
 elapse(row.seconds);const after=self(),active=after.referenceCity.buildings.find(b=>b.id===id);
 assert.equal(active.level,row.nextLevel);assert.deepEqual(active.activeEffects,supplied.effects);
 assert.equal(after.referenceCity.power-before.referenceCity.power,supplied.powerTotal-(row.level?definition.rows[row.level-1].powerTotal:0));
 ledger.push({id,from:row.level,to:active.level,cost:supplied.cost,seconds:row.seconds});
}
for(let level=2;level<=25;level++){
 fund();for(const id of ['farm','academy'])while(self().referenceCity.buildings.find(b=>b.id===id).level<level-1){fund();upgrade(id);}upgrade('citadel');
}
for(const b of profile.buildings)if(b.id!=='citadel')while(self().referenceCity.buildings.find(v=>v.id===b.id).level<25){fund();upgrade(b.id);}
const final=self(),restored=QaReferenceWorld.fromSave(world.toSave(),options);
assert.deepEqual(restored.snapshot(session.playerId).players.find(p=>p.id===session.playerId).referenceCity,final.referenceCity);
const actualLegacy=world.authenticate(legacy.token),ordinary=baseline.authenticate(baselineSession.token);
for(const field of ['food','wood','stone','gold','mana','aether','troops','reserveTroops','units','reserveUnits','technologies','buildings','cityLevel','construction','research','trainingQueue'])assert.deepEqual(actualLegacy[field],ordinary[field],field+': reference actions changed legacy outcome');
assert.ok(final.referenceCity.buildings.every(b=>b.level===25));assert.equal(ledger.length,270);
const result={classification:'SYNTHETIC ENGINE CAPABILITY ONLY; not RoK parity',checked:'2026-11-19',authority:'Actual QaReferenceWorld subclass, normal World authentication and command interface; no injected levels/resources after declared fixture birth',clock:'Server-only advanceQaDowntime; offline paid-job/production semantics; not native real-time proof',initialFixture:profile.initial,independentBuildings:11,paidUpgrades:ledger.length,commands,worldSeconds:world.time,engineSeconds:final.referenceCity.time,finalLevels:final.referenceCity.levels,resources:final.referenceCity.resources,legacyMatchedOrdinaryWorld:true,restart:'PASS both profiles and exact reference snapshot',normalActivation:false,native:'Independent verification required',ledger};
mkdirSync('work/task7-b2',{recursive:true});writeFileSync('work/task7-b2/track-b.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,ledger:undefined}));
