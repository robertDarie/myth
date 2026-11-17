// Fresh production progression. Never assigns resources, XP, positions, units,
// structures, territory, opening milestones or pass ownership.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,sep} from 'node:path';
import {World} from '../server/world.mjs';
import {route} from '../server/navigation.mjs';
import {cellIndex} from '../server/world-map.mjs';
let seed=3,world;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32);
world=new World({random,now:()=>Date.UTC(2026,10,17)+Math.floor((world?.time??0)*1000)});
const session=world.join('Pass expedition','greek'),player=world.authenticate(session.token),actions=[];
const view=()=>world.snapshot(player.id),balances=()=>Object.fromEntries(['food','wood','gold','stone'].map(k=>[k,player[k]]));
function command(type,extra={}){const before=balances();world.command(player,{type,...extra});actions.push({seconds:world.time,type,...extra,before,after:balances(),x:player.x,z:player.z});}
function wait(condition,seconds=600){for(let i=0;i<seconds*4;i++){if(condition())return;world.tick(.25);}assert.ok(condition(),'Timed out at '+world.time+'s: '+player.state);}
const home=()=>{command('return');wait(()=>world.atHome(player)&&!player.target);wait(()=>player.health>=world.stats(player).maxHealth);};
function move(x,z){command('move',{x,z});wait(()=>!player.target);assert.ok(Math.hypot(player.x-x,player.z-z)<.001);}
command('inventory-supplies');command('building-upgrade',{targetId:'citadel'});wait(()=>player.cityLevel===2);
command('building-upgrade',{targetId:'oathhall'});wait(()=>player.buildings.oathhall===1);
command('train',{targetId:'infantry'});
const resource=view().nodes.find(n=>n.resource==='wood'&&n.remaining>0&&route(world,player,n));assert.ok(resource);
command('gather',{targetId:resource.id});wait(()=>Object.values(player.cargo).reduce((a,b)=>a+b,0)>=400);home();
command('scout-send',{x:20,z:20});wait(()=>player.scouts.length===0);
for(let round=0;world.kingdom.metrics.camps<4&&round<60;round++){
 const camp=view().camps.find(c=>c.level===1&&c.health>0&&route(world,player,c));
 if(!camp){const point=[[10,10],[30,10],[30,30],[10,30],[20,20]][round%5];move(...point);command('scout-send',{x:point[0],z:point[1]});wait(()=>player.scouts.length===0);continue;}
 if(camp.lastKnown){move(camp.x,camp.z);const live=view().camps.find(c=>c.id===camp.id&&!c.lastKnown&&c.health>0);if(!live){home();for(let i=0;i<240;i++)world.tick(.25);continue;}}
 const before=world.kingdom.metrics.camps;command('attack',{targetId:camp.id});wait(()=>world.kingdom.metrics.camps>before||!player.target,600);home();
}
assert.ok(world.kingdom.metrics.camps>=4,'Four actual camp victories required: '+JSON.stringify({metrics:world.kingdom.metrics,attacks:actions.filter(a=>a.type==='attack').length,reports:player.coreReports.slice(0,4).map(r=>({outcome:r.outcome,reason:r.reason})),camps:view().camps.filter(c=>c.level===1).map(c=>({id:c.id,health:c.health,lastKnown:c.lastKnown}))}));
wait(()=>world.kingdom.completed.some(s=>s.id==='gates'),1800);
command('alliance-create',{name:'Oath of the Crossing'});
function flag(x,z){move(x,z);command('flag',{x,z});wait(()=>world.flags.at(-1).buildRemaining===0);}
flag(player.homeX,player.homeZ);flag(26,20);flag(34,20);home();
function capture(id){const pass=world.sites.find(s=>s.id===id);assert.equal(pass.allianceId,'');command('rally-create',{targetId:id,count:10});wait(()=>pass.allianceId===player.allianceId,600);assert.ok(player.groupReports.some(r=>r.targetId===id&&r.outcome==='Attackers captured objective'));return pass;}
assert.equal(route(world,player,{x:50,z:20}),null);
const first=capture('gate-east');move(50,20);const firstCrossing={x:player.x,z:player.z};
flag(43,20);flag(51,24);flag(59,30);home();
assert.equal(route(world,player,{x:65,z:60}),null,'One gate cannot grant a second border');
const second=capture('gate-crown-south');move(65,60);const secondCrossing={x:player.x,z:player.z};
const other=world.authenticate(world.join('Outside expedition','norse').token);
assert.equal(other.allianceId,'');assert.equal(route(world,other,{x:65,z:60}),null);
assert.throws(()=>world.command(other,{type:'move',x:65,z:60}),/route|gate/i);
world.command(other,{type:'scout-send',x:65,z:60});assert.ok(other.scouts.length);
wait(()=>other.scouts.length===0);assert.ok(other.explored.includes(cellIndex({x:65,z:60})));
const saved=world.toSave(),restored=World.fromSave(saved,{random,now:world.now}),copy=restored.authenticate(session.token);
assert.equal(restored.sites.find(s=>s.id===first.id).allianceId,player.allianceId);assert.equal(restored.sites.find(s=>s.id===second.id).allianceId,player.allianceId);
for(const key of ['id','homeX','homeZ','x','z','units','wounded','heroRecords','allianceId','cargo'])assert.deepEqual(copy[key],player[key]);
const output=resolve(process.argv[2]??'work/recovery-a/legal-playthrough.json');mkdirSync(dirname(output),{recursive:true});
const result={scope:'Fresh default city; legal production commands, accelerated tick(.25), owner-visible target selection; no direct progression grants or ownership mutation',numericParity:'UNVERIFIED; owner-approved original Divine Gate encounter/opening baseline',seed:3,seconds:world.time,cityLevel:player.cityLevel,campVictories:world.kingdom.metrics.camps,opened:world.kingdom.completed.map(s=>s.id),passes:[first,second].map(s=>({id:s.id,name:s.name,zoneIds:s.zoneIds,health:s.health,maxHealth:s.maxHealth,owned:true})),firstCrossing,secondCrossing,outsideMilitary:'production move DENIED',outsideScout:'ARRIVED, explored target cell and returned',restart:'World serialization/load preserves both owners and audited player state',commands:actions.length,actions};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,actions:undefined}));
const saveArgument=process.argv.indexOf('--save');
if(saveArgument>=0){const target=resolve(process.argv[saveArgument+1]),allowed=resolve('work/task4')+sep;if(!target.startsWith(allowed))throw Error('Disposable save output must stay under work/task4');mkdirSync(dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(world.toSave()),{mode:0o600});}
