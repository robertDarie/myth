import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { economyRules } from '../server/economy.mjs';
import { campaignLimits } from '../server/campaign.mjs';
import { referenceCamp } from '../server/numerics.mjs';
const directory='research/parity/audits/full-rok-audit';
const groups=JSON.parse(readFileSync(`${directory}/subsystems.json`,'utf8'));
const files=[...new Set(groups.flatMap(g=>g.files))].filter(f=>!['world.mjs'].includes(f));
const rows=[],formulas=[];
function walk(value,path,file,profile='Exported definition; effective overrides and units require review') {
 if(typeof value==='number'&&Number.isFinite(value))rows.push({parameter_id:`${file}:${path}`,code_path:`server/${file}`,symbol:path,tom_value:value,profile,rok_value:'',reference_class:'UNKNOWN',parity:'UNKNOWN REFERENCE',unit:'See parameter name and subsystem formula notes; not normalized to RoK world units'});
 else if(Array.isArray(value))value.forEach((item,index)=>walk(item,`${path}[${item?.id??index}]`,file,profile));
 else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value))walk(item,`${path}.${key}`,file,profile);
}
for(const file of files) {
 const module=await import(pathToFileURL(resolve('server',file)).href);
 for(const [name,value]of Object.entries(module)) {
  if(name==='reference')continue; // Source-linked fixture is indexed separately, not independently verified.
  if(typeof value==='function')formulas.push({formula_id:`${file}:${name}`,code_path:`server/${file}`,symbol:name,local_expression:value.toString(),rok_expression:'',reference_class:'UNKNOWN',status:'SOURCE INDEX; human semantic comparison in FORMULA_COMPARISON.md'});
  else walk(value,name,file,
   file==='troops.mjs'&&['TROOP_TYPES','TRAINING_BATCHES'].includes(name)?'Legacy profile0 definition; numeric profile1 uses referenceTroop and REFERENCE_BATCHES':
   file==='city.mjs'&&name==='CITADEL_TROOP_CAPACITY'?'Legacy profile0 capacity; profile1 total storage is10000000 and march capacity is separate':
   file==='economy.mjs'&&name==='ECONOMY'?'Legacy/default object; effective numeric profile1 override is separately recorded':
   file==='campaign.mjs'&&name==='CAMPAIGN_LIMITS'?'Legacy/default object; effective numeric profile1 override is separately recorded':
   'Exported definition; effective overrides and units require review');
 }
}
walk(economyRules({numericVersion:1}),'economyRules(profile1)','economy.mjs','Effective numeric profile1');
walk(campaignLimits({numericVersion:1}),'campaignLimits(profile1)','campaign.mjs','Effective numeric profile1');
for(let level=1;level<=25;level++)walk(referenceCamp(level),`referenceCamp(${level})`,'numerics.mjs','Effective profile1; reference fixture plus documented inferred lineup, not independently reverified');
function csv(name,data){const keys=Object.keys(data[0]),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';writeFileSync(`${directory}/${name}`,[keys.map(quote).join(','),...data.map(row=>keys.map(key=>quote(row[key])).join(','))].join('\n')+'\n');}
csv('exported-parameters.csv',rows);csv('formula-index.csv',formulas);
console.log(JSON.stringify({numeric_definition_fields:rows.length,exported_functions:formulas.length,modules:files.length,scope:'Source inventory; not independent numerical verification'}));
