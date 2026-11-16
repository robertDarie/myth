// Read only the known disposable native-world file; never reads real Saves or preferences.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
const output='docs/qa/evidence/task4/native-observations.json';
const saved=JSON.parse(readFileSync('work/task4/native-world.json','utf8'));
const p=saved.world.players.find(p=>p.name==='Task4 Native Greek');
if(!p)throw Error('Disposable native QA city is not present');
const rows=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):[];
rows.push({label:process.argv[2]??'observation',observedAt:new Date().toISOString(),testedCommit:'f5c0cdf75af286c33a9c116f46139ee40c8fbce1',schema:saved.schema,cityLevel:p.cityLevel,buildings:p.buildings,resources:Object.fromEntries(['food','wood','stone','gold','mana','aether'].map(k=>[k,p[k]])),troops:p.troops,reserveTroops:p.reserveTroops,training:p.trainingQueue.map(j=>({type:j.type,targetId:j.targetId,amount:j.amount,duration:j.duration,remaining:j.remaining,cost:j.cost})),construction:p.construction?{type:p.construction.type,targetId:p.construction.targetId,duration:p.construction.duration,remaining:p.construction.remaining,cost:p.construction.cost}:null,position:{x:p.x,z:p.z,homeX:p.homeX,homeZ:p.homeZ},scouts:p.scouts?.length??0,exploredCells:p.explored.length,kills:p.kills,commanderXP:p.xp});
mkdirSync('docs/qa/evidence/task4',{recursive:true});writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.at(-1)));
