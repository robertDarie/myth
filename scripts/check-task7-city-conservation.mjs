// Actual prior source replay plus current production commands; no real saves.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {World} from '../server/world.mjs';
import {BUILDINGS} from '../server/city-content.mjs';
import {buildingCard} from '../server/city.mjs';
const baseline='d9418781cb3a8aca735ad0f42955a2d08b19ad3c';
const archive=resolve('work/task7/baseline-source-'+baseline.slice(0,12));
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'server'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>/^server\/[^/]+\.(mjs|json)$/.test(p)&&!p.endsWith('.test.mjs'));
for(const name of files){const file=resolve(archive,name);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,execFileSync('git',['show',baseline+':'+name]));}
const {World:PreviousWorld}=await import(pathToFileURL(resolve(archive,'server/world.mjs')));
const {buildingCard:previousCard}=await import(pathToFileURL(resolve(archive,'server/city.mjs')));
let fullCardComparisons=0;
for(let initial=1;initial<=8;initial++){
 let seed=initial,old;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32),now=()=>Date.UTC(2026,10,18)+Math.floor((old?.time??0)*1000);
 old=new PreviousWorld({random,now});const s=old.join('Task7 historical '+initial),p=old.authenticate(s.token);
 old.command(p,{type:'upgrade'});for(let i=0;i<8;i++)old.tick(.25);
 const saved=old.toSave(),current=World.fromSave(saved,{now}),copy=current.authenticate(s.token);
 assert.deepEqual(current.toSave().world.players,saved.world.players.map(p=>({...p,offline:true})), 'All earned player state and paid jobs must survive');
 // Explicit boundary fixtures, not legitimate progression evidence.
 for(const level of [1,2,3,4,5])for(const masonry of [0,1,2,3]){
  const fixture=structuredClone(p);fixture.cityLevel=level;fixture.technologies.masonry=masonry;
  for(const b of BUILDINGS){assert.deepEqual(buildingCard(fixture,b),previousCard(fixture,b));fullCardComparisons++;}
 }
 assert.deepEqual(copy.construction,p.construction);
}
// Genuine fresh legacy-rule progression. No direct level/resource assignments.
let w;const now=()=>Date.UTC(2026,10,18)+Math.floor((w?.time??0)*1000);
w=new World({random:()=>.1,now});const s=w.join('Task7 legal legacy'),p=w.authenticate(s.token),actions=[];
for(let tick=0;tick<160000&&p.cityLevel<5;tick++){
 if(!p.construction&&!p.secondConstruction){
  const cards=BUILDINGS.map(b=>buildingCard(p,b));
  const card=cards.find(b=>b.id==='citadel'&&b.canUpgrade)??cards.find(b=>b.canUpgrade);
  if(card){
   const before=Object.fromEntries(['food','wood','stone','gold','mana'].map(k=>[k,p[k]]));
   w.command(p,{type:'building-upgrade',targetId:card.id});
   for(const [k,v]of Object.entries(card.nextCost))assert.equal(p[k],before[k]-v);
   actions.push({building:card.id,from:card.level,to:card.level+1,cost:card.nextCost,seconds:card.nextDuration});
  }
 }
 w.tick(.25);
}
assert.equal(p.cityLevel,5,'Unchanged legacy path must still reach its existing maximum');
const restored=World.fromSave(w.toSave(),{now}),copy=restored.authenticate(s.token);
for(const k of ['cityLevel','buildings','technologies','units','ownedCommanders','inventory','ownedRelics','ownedArmaments','construction','research'])assert.deepEqual(copy[k],p[k],k);
const result={checked:'2026-11-18',baseline,syntheticHistoricalSaves:8,fullCardComparisons,clock:'Production World.tick(.25), injectable wall clock follows simulated time',freshLegacyCommands:actions.length,freshLegacySeconds:w.time,legacyFinalCitadel:p.cityLevel,newReference25:'NOT ACTIVATED; complete version-bound data still unresolved',native:'NOT TESTED',actions};
mkdirSync('work/task7',{recursive:true});writeFileSync('work/task7/city-conservation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,actions:undefined}));
// Reusable disposable, legitimately earned legacy save for mixed-profile QA.
export {w as earnedLegacyWorld,s as earnedLegacySession};
