import { readFileSync, writeFileSync } from 'node:fs';
import { World } from '../server/world.mjs';
import { BUILDINGS } from '../server/city-content.mjs';
import { buildingCard } from '../server/city.mjs';
const directory='research/parity/audits/full-rok-audit';
const reference=JSON.parse(readFileSync(`${directory}/reference-observations.json`,'utf8'));
const rows=[];
for(const source of reference.city_hall.rows){
 const [level,food,wood,stone,seconds,power]=source;
 let card=null;if(level>=2&&level<=5){const w=new World({random:()=>.25}),p=w.authenticate(w.join('Reference comparison').token);p.cityLevel=level-1;card=buildingCard(p,BUILDINGS.find(b=>b.id==='citadel'));}
 for(const [parameter,value]of Object.entries({food,wood,stone,gold:0,seconds,published_power:power})){
  const local=level===1||level>5||parameter==='published_power'?'':parameter==='seconds'?card.nextDuration:card.nextCost[parameter]??0;
  rows.push({audit_id:`reference.city-hall.${level}.${parameter}`,subsystem:'City',parameter,level,rok_value:value,tom_value:local,
   absolute_difference:local===''?'':local-value,percentage_difference:local===''||value===0?'':(local-value)/value*100,
   unit:parameter==='seconds'?'seconds':parameter==='published_power'?'published power; incremental/cumulative interpretation unresolved':parameter,
   conditions:'Base construction; no masonry; literal functional level comparison, not an approved five-age migration',
   source_url:reference.city_hall.url,checked:reference.checked,reference_build:reference.live_build,evidence_class:reference.city_hall.classification,
   parity:level>5?'NOT IMPLEMENTED':local===''?'UNKNOWN REFERENCE':local===value?'EXACT MATCH':'NUMERICAL MISMATCH',
   code_path:'server/city.mjs#buildingCard',limitation:parameter==='published_power'?reference.city_hall.power_caution:level===1?'Fresh city is granted level1; not an upgrade purchase':'Secondary table only; matching zero stone cost does not establish progression parity'});
 }
}
const keys=Object.keys(rows[0]),quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
writeFileSync(`${directory}/reference-level-comparison.csv`,[keys.map(quote).join(','),...rows.map(row=>keys.map(key=>quote(row[key])).join(','))].join('\n')+'\n');
writeFileSync(`${directory}/reference-level-comparison.json`,JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({reference_level_rows:rows.length,local_comparison_rows:rows.filter(r=>r.tom_value!=='').length,missing_functional_levels:20,reference_build:'UNKNOWN'}));
