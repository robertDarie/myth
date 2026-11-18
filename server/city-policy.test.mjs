import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingPolicyQuote,cityPolicy,compileReferenceBuilding} from './city-policy.mjs';
import {BUILDINGS,CITADEL_REQUIREMENTS,INITIAL_BUILDINGS} from './city-content.mjs';
import {buildingCard} from './city.mjs';
import {World} from './world.mjs';
import {readFileSync} from 'node:fs';
const syntheticRows=()=>Array.from({length:25},(_,i)=>({level:i+1,cost:{food:(i+1)*10,wood:0,stone:0,gold:0},seconds:i+1,powerTotal:(i+1)*7,prerequisites:[],classification:'VERIFIED',source:'https://example.invalid/synthetic-not-game-reference',precision:'seconds'}));
const candidate=()=>({id:'synthetic-only',maximum:25,referenceVersion:'synthetic-v1',referenceMode:'TEST FIXTURE ONLY',rows:syntheticRows()});
test('policy keeps every legacy quote, terminal display quote and prerequisite through existing levels',()=>{
 for(const cityLevel of [1,2,3,4,5])for(const masonry of [0,1,2,3])for(const b of BUILDINGS)for(const level of [0,1,2,3,4,5]){
  const p={cityLevel,buildings:{...INITIAL_BUILDINGS,[b.id]:level},technologies:{masonry}};
  const q=buildingPolicyQuote(p,b),current=b.id==='citadel'?cityLevel:level,next=current+1;
  const cost=Object.fromEntries(Object.entries(b.base).map(([id,v])=>[id,Math.ceil(v*(b.id==='citadel'?current:Math.pow(next,1.4)))]));
  assert.deepEqual(q.cost,cost);assert.equal(q.seconds,(b.id==='citadel'?20*current:12*next)/(1+.05*masonry));assert.equal(q.maximum,b.id==='builders'?1:5);
  assert.deepEqual(q.prerequisites,b.id==='citadel'?CITADEL_REQUIREMENTS[next]??[]:b.requirements??[]);
 }
});
test('25-level table requires every explicit exact row and cannot activate partial research',()=>{
 const c=candidate(),p=compileReferenceBuilding(c);assert.equal(p.quote(25).seconds,25);assert.throws(()=>p.quote(26),/No verified/);
 for(const change of [c=>c.rows.pop(),c=>c.rows[2].prerequisites=null,c=>c.rows[3].classification='CONFLICTING',c=>c.rows[4].precision='minutes',c=>c.referenceVersion='UNKNOWN',c=>c.rows[5].cost.food=null]){
  const c=candidate();change(c);assert.throws(()=>compileReferenceBuilding(c));
 }
 const row=p.quote(2);row.cost.food=999;assert.equal(p.quote(2).cost.food,20);
 assert.throws(()=>cityPolicy({cityProgressionProfile:'rok25-unverified'}),/not activated/);
});
test('actual fresh command debit, duplicate rejection and paid job survive production save/reload',()=>{
 const w=new World({random:()=>.1}),s=w.join('PolicyConservation'),p=w.authenticate(s.token),b=BUILDINGS.find(b=>b.id==='citadel');
 const before={food:p.food,wood:p.wood,stone:p.stone,gold:p.gold},q=buildingCard(p,b);w.command(p,{type:'upgrade'});
 for(const [resource,value]of Object.entries(q.nextCost))assert.equal(p[resource],before[resource]-value);
 const paid=structuredClone(p.construction),balances={food:p.food,wood:p.wood,stone:p.stone,gold:p.gold};assert.throws(()=>w.command(p,{type:'upgrade'}),/busy|construction/);
 assert.deepEqual({food:p.food,wood:p.wood,stone:p.stone,gold:p.gold},balances);
 const restored=World.fromSave(w.toSave()),copy=restored.authenticate(s.token);assert.deepEqual(copy.construction,paid);assert.equal(copy.cityLevel,1);assert.deepEqual(copy.units,p.units);
 for(let i=0;i<Math.ceil(paid.duration*4)+2;i++)restored.tick(.25);assert.equal(copy.cityLevel,2);assert.equal(copy.construction,null);const once=copy.cityLevel;restored.tick(1);assert.equal(copy.cityLevel,once);
});
test('Windows runtime copy inventory contains the complete relative module dependency closure',()=>{
 const builder=readFileSync('client/Assets/ThronesOfMyth/Editor/WindowsPlaytestBuilder.cs','utf8');
 const section=builder.split('string server = Path.Combine(package, "Server")')[1].split('foreach (string file in new[] { "Launcher.ps1"')[0];
 const names=new Set([...section.matchAll(/"([^"\r\n]+\.(?:mjs|json))"/g)].map(m=>m[1]));
 assert.ok(names.has('city-policy.mjs'));
 for(const name of names){
  const source=readFileSync('server/'+name,'utf8');
  for(const dependency of source.matchAll(/(?:from\s*|import\s*\()\s*['"]\.\/([^'"]+)['"]/g))assert.ok(names.has(dependency[1]),name+' runtime dependency missing from Windows package: '+dependency[1]);
 }
});
