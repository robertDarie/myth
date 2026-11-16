// Production commands and production online/offline clock rules only.
import { writeFileSync } from 'node:fs';
import { World } from '../server/world.mjs';
import { BUILDINGS, TECHNOLOGIES } from '../server/city-content.mjs';
import { buildingCard, technologyCard } from '../server/city.mjs';
import { trainingOptions } from '../server/troops.mjs';
import { powerOf } from '../server/power.mjs';
import { advanceDowntime } from '../server/downtime.mjs';
import { route } from '../server/navigation.mjs';
import { visible } from '../server/exploration.mjs';
let milliseconds=Date.UTC(2026,10,16),seed=319;
const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
let world=new World({random,now:()=>milliseconds});
const session=world.join('Legal progression audit','greek');let player=world.authenticate(session.token);
const actions=[],milestones=[],spending={},commandGrants={};
const balances=()=>Object.fromEntries(['food','wood','stone','gold','mana','aether'].map(key=>[key,player[key]]));
function command(type,extra={}){
 const before=balances();try{world.command(player,{type,...extra});}catch(e){return {accepted:false,error:e.message};}
 const after=balances();for(const key of Object.keys(before)){spending[key]=(spending[key]??0)+Math.max(0,before[key]-after[key]);commandGrants[key]=(commandGrants[key]??0)+Math.max(0,after[key]-before[key]);}
 const job=type==='train'?player.trainingQueue.at(-1):type==='research'?player.research:type==='building-upgrade'?[player.construction,player.secondConstruction].find(j=>j?.targetId===extra.targetId):null;
 actions.push({seconds:world.time,type,...extra,before,after,...(job?{jobQuote:{amount:job.amount,duration:job.duration,cost:job.cost}}:{})});return {accepted:true};
}
function policy(field=true) {
 // Prefer progression over troop expenditure. Every purchase still passes production prerequisites.
 for(const building of BUILDINGS)if(buildingCard(player,building).canUpgrade)command('building-upgrade',{targetId:building.id});
 if(!player.research)for(const technology of TECHNOLOGIES)if(technologyCard(player,technology).canResearch){command('research',{targetId:technology.id});break;}
 if(!player.trainingQueue.length) {
  const trained=new Set(actions.filter(a=>a.type==='train').map(a=>a.targetId));
  const next=trainingOptions(player).find(t=>t.baseId==='infantry'&&!trained.has(t.id));
  if(next&&!next.lockedReason&&Object.entries(next.orderCost).every(([resource,amount])=>amount<=player[resource]))command('train',{targetId:next.id});
 }
 if(field&&!player.target&&player.health>world.stats(player).maxHealth*.8) {
  if(player.deployed){command('return');return;}
  const camp=world.camps.filter(c=>c.spawned!==false&&c.health>0&&c.level<=player.forsaken.unlocked&&visible(world,player,c)&&route(world,player,c)).sort((a,b)=>a.level-b.level)[0];
  if(camp&&player.ap>=50)command('attack',{targetId:camp.id});
  else {const node=world.nodes.find(n=>n.remaining>0&&visible(world,player,n)&&route(world,player,n));if(node)command('gather',{targetId:node.id});}
 }
 if(field&&player.target?.type==='gather'&&Object.values(player.cargo).reduce((a,b)=>a+b,0)>=100)command('return');
}
function record(label,clock) {
 const save=world.toSave(),restored=World.fromSave(save,{random,now:()=>milliseconds}),copy=restored.authenticate(session.token);
 for(const key of ['cityLevel','buildings','technologies','units','reserveUnits','wounded','troops','reserveTroops','heroRecords','ownedCommanders','inventory','allianceId','explored','food','wood','stone','gold','mana','aether'])
  if(JSON.stringify(copy[key])!==JSON.stringify(player[key]))throw Error(`Progression restart changed ${key}`);
 for(const lane of ['construction','secondConstruction','research','crafting','healing']){
  const old=player[lane],next=copy[lane];
  for(const key of ['targetId','amount','duration','remaining','cost'])if(JSON.stringify(old?.[key])!==JSON.stringify(next?.[key]))throw Error(`Progression restart changed ${lane}.${key}`);
 }
 if(JSON.stringify(copy.trainingQueue)!==JSON.stringify(player.trainingQueue))throw Error('Progression restart changed paid training jobs');
 milestones.push({label,clock,seconds:world.time,resources:balances(),spent:{...spending},commandGrants:{...commandGrants},cityLevel:player.cityLevel,buildings:{...player.buildings},technologies:{...player.technologies},trainedReserves:player.reserveTroops,reserveUnits:{...player.reserveUnits},troopPower:powerOf(player).ready+powerOf(player).deployed,commanderXP:player.heroRecords[player.commanderId].xp,ap:player.ap,kills:player.kills,construction:player.construction?.remaining??0,trainingJobs:player.trainingQueue.length,referenceTrajectory:'UNKNOWN',restart:'PASS; disposable round-trip'});
}
command('inventory-supplies');record('fresh','production join');
for(let step=0;step<14400;step++) {
 if(step%20===0)policy();milliseconds+=250;world.tick(.25);
 if(step+1===7200)record('30 minutes','production quarter-second ticks');
}
record('1 hour','production quarter-second ticks');
command('return');for(let i=0;i<2000&&player.deployed;i++){milliseconds+=250;world.tick(.25);}
// Simulate logged-out city progression, not offline field victories. Reconnect at
// five-minute intervals to issue legal purchases, using the actual downtime routine.
for(const [days,label]of [[1,'1 day'],[7,'1 week'],[30,'1 month']]) {
 while(world.time<days*86400) {
  policy(false);const seconds=Math.min(300,days*86400-world.time),before=milliseconds;milliseconds+=seconds*1000;
  advanceDowntime(world,before,milliseconds);
 }
 record(label,'production advanceDowntime; 5-minute reconnect purchase policy after first hour');
}
writeFileSync(process.argv[2]??'research/parity/audits/full-rok-audit/progression-results.json',JSON.stringify({policy:'Greedy available building/research purchases; one infantry training order per tier in ascending order as genuinely affordable; visible local field orders during first hour; no direct progress/resource/coordinate/fog mutation',onlineStepSeconds:.25,offlineReconnectSeconds:300,referenceTrajectory:'UNKNOWN; no live RoK playthrough',actions,milestones,limits:'A strategy example, not an optimality proof. Offline city catch-up does not simulate field combat. Level25 cannot be reached because production maximum is5.'},null,2)+'\n');
console.log(JSON.stringify({milestones:milestones.map(m=>({label:m.label,cityLevel:m.cityLevel,seconds:m.seconds,kills:m.kills,trainingJobs:m.trainingJobs})),acceptedCommands:actions.length}));
