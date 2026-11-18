// SYNTHETIC ENGINE CAPABILITY ONLY. None of these progression values are RoK facts.
export function syntheticCityProfile(){
 const resources=['food','wood','stone','gold'];
 const definitions=[['citadel','cityhall'],['farm','production'],['lumber','production'],['quarry','production'],['mine','production'],['barracks','training'],['archery','training'],['stable','training'],['siege','training'],['academy','academy'],['market','trade']];
 const buildings=definitions.map(([id,role])=>({id,name:'TEST ONLY '+id,role,maximum:25,referenceVersion:'SYNTHETIC:B1-v1',referenceMode:'ENGINE CAPABILITY ONLY',rows:Array.from({length:25},(_,i)=>{
  const level=i+1,effects={};
  if(role==='cityhall')effects.workers=level>=2?2:1;
  if(role==='production')effects.production={resource:resources[['farm','lumber','quarry','mine'].indexOf(id)],perHour:3600*level,capacity:1000*level};
  if(role==='training')effects.training={unitId:'TEST_ONLY_'+id,cost:{food:2,wood:1,stone:0,gold:0},seconds:2,capacity:level*10};
  if(role==='academy')effects.researchSpeed=level/100;
  if(role==='trade'){effects.transferCapacity=100*level;effects.tradeTaxBps=1000;}
  const prerequisites=role==='cityhall'?(level>1?[{id:'farm',level:level-1},...(level>2?[{id:'academy',level:level-1}]:[])]:[]):[{id:'citadel',level}];
  return {level,cost:{food:level*2,wood:level*2,stone:level,gold:level},seconds:level,powerTotal:level*7,prerequisites,effects,classification:'TEST_ONLY',source:'fixture://reference-city/B1',precision:'seconds'};
 })}));
 const technologies=[{id:'test-writing',name:'TEST ONLY writing',maximum:5,referenceVersion:'SYNTHETIC:B1-v1',referenceMode:'ENGINE CAPABILITY ONLY',rows:Array.from({length:5},(_,i)=>({level:i+1,cost:{food:3,wood:3,stone:1,gold:1},seconds:10,powerTotal:5*(i+1),prerequisites:[{id:'academy',level:i+1}],effects:{constructionSpeed:(i+1)/10,productionBonus:{food:(i+1)/10}},classification:'TEST_ONLY',source:'fixture://reference-city/research',precision:'seconds'}))}];
 return {id:'SYNTHETIC-B1-CAPABILITY-NOT-ROK',kind:'SYNTHETIC',experimental:true,timerFormula:'DIVIDE_BY_ONE_PLUS_SUM',offlineProductionLimit:3600,initial:{resources:{food:0,wood:0,stone:0,gold:0},levels:{citadel:1,farm:1,lumber:1,quarry:1,mine:1}},buildings,technologies};
}
// Prepared Academy fixture: only Quarrying1 quote/effect is source-observed.
// Building setup is explicitly synthetic and is NOT birth/city progression evidence.
export function preparedQuarryingProfile(){
 const p=syntheticCityProfile();p.id='PREPARED-QUARRYING-PUBLISHED-SNAPSHOT';p.initial.resources={food:100,wood:100,stone:0,gold:0};p.initial.levels.academy=1;
 p.timerFormula='BASE_ONLY';p.technologies=[{id:'quarrying',name:'Quarrying observed snapshot',maximum:1,referenceVersion:'Published community table checked2026-11-18; no live parity binding',referenceMode:'Prepared Academy1; zero modifiers explicitly selected',rows:[{level:1,cost:{food:100,wood:100,stone:0,gold:0},seconds:60,powerTotal:5,prerequisites:[{id:'academy',level:1}],effects:{stoneGatheringUnlocked:true},classification:'VERIFIED',source:'https://gacha-data.com/rise-of-kingdoms/technology/',precision:'seconds'}]}];
 // This profile remains kind SYNTHETIC because the surrounding world is prepared;
 // technology row validation separately preserves its published source provenance.
 return p;
}
