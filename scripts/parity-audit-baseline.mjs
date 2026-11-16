// Read-only audit extraction. No real saves, HTTP servers or gameplay mutations.
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { World } from '../server/world.mjs';
import { BUILDINGS, TECHNOLOGIES } from '../server/city-content.mjs';
import { buildingCard, technologyCard, marchTroopCap } from '../server/city.mjs';
import { TROOP_TYPES } from '../server/troops.mjs';
import { referenceTroop, commanderCapacity } from '../server/numerics.mjs';
import { ensureHero, xpAtLevel, talentPoints } from '../server/progression.mjs';
import { SCOUT_CAMP_LEVELS } from '../server/scout-camp.mjs';
import { MAP_CORRIDORS, FOG_WIDTH } from '../server/world-map.mjs';
import { route } from '../server/navigation.mjs';

const output = resolve(process.argv[2] ?? 'work/task3/baseline');
mkdirSync(output, { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const rows = [];
function add(id, subsystem, mechanic, parameter, level, value, unit, code, formula = '', conditions = '') {
  rows.push({ audit_id:id, subsystem, mechanic, parameter, level, rok_value:'', rok_formula:'', unit,
    conditions, source_url:'', evidence_class:'UNKNOWN', tom_value:value, tom_formula:formula,
    code_path:code, absolute_difference:'', percentage_difference:'', parity:'UNKNOWN REFERENCE',
    dependencies:subsystem === 'City' ? 'city; research; training; economy; migration' : subsystem,
    proposed_correction:'Obtain independently reviewed reference before numerical implementation',
    migration_risk:'Review before implementation; this extractor changes no save', priority:'P1',
    verification_test:'Source evaluation only; not organic progression', audited_commit:commit });
}
function csv(path, values) {
  const keys = Object.keys(values[0]);
  const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  writeFileSync(path, [keys.map(quote).join(','), ...values.map(row => keys.map(key=>quote(row[key])).join(','))].join('\n')+'\n');
}
function fresh() {
  const w = new World({ random:()=>.25, now:()=>Date.UTC(2026,10,16) });
  const session = w.join('Disposable audit fixture');
  return { w, p:w.authenticate(session.token) };
}
// Explicitly prepared level fixtures. Calling cards does not mean progression is reachable.
for (const b of BUILDINGS) for (let level=b.id==='citadel'?1:0; level<(b.id==='builders'?1:5); level++) {
  const {p}=fresh(); p.cityLevel=5;
  if (b.id==='citadel') p.cityLevel=level; else p.buildings[b.id]=level;
  const card=buildingCard(p,b), next=level+1;
  add(`building.${b.id}.${next}.seconds`,'City',b.id,'upgrade duration',next,card.nextDuration,'seconds','server/city.mjs#buildingCard',b.id==='citadel'?'20*currentLevel/(1+.05*masonry)':'12*nextLevel/(1+.05*masonry)','masonry=0; prepared levels; no purchase');
  for (const [resource,amount] of Object.entries(card.nextCost)) add(`building.${b.id}.${next}.${resource}`,'City',b.id,`upgrade ${resource}`,next,amount,resource,'server/city.mjs#buildingCard',b.id==='citadel'?'ceil(base*currentLevel)':'ceil(base*nextLevel^1.4)','masonry=0; prepared levels');
}
for (const t of TECHNOLOGIES) for (let level=0; level<(t.maxLevel??3); level++) {
  const {p}=fresh(); p.technologies[t.id]=level;
  const card=technologyCard(p,t), next=level+1;
  add(`research.${t.id}.${next}.seconds`,'Research',t.id,'research duration',next,card.duration,'seconds','server/city.mjs#technologyCard','12*pace*nextLevel/(1+.05*writing)','writing=0 except when auditing its own current rank');
  for (const [resource,amount] of Object.entries(card.cost)) add(`research.${t.id}.${next}.${resource}`,'Research',t.id,`research ${resource}`,next,amount,resource,'server/city.mjs#technologyCard','ceil(base*nextLevel^2)');
}
for (const t of TROOP_TYPES) {
  const r=referenceTroop(t);
  for (const key of ['attack','defense','health','marchSpeed','load','duration']) add(`troop.${t.id}.${key}`,'Troops',t.id,key,t.tier,r[key],key==='duration'?'seconds':'source units','server/numerics.mjs#referenceTroop','','Local reference fixture is an input, not independent reference verification');
  for (const [resource,amount] of Object.entries(r.cost)) add(`troop.${t.id}.cost.${resource}`,'Troops',t.id,`training ${resource}`,t.tier,amount,resource,'server/numerics.mjs#referenceTroop');
}
for (const rarity of ['Common','Rare','Epic','Legendary']) for (let level=1;level<=60;level++) {
  const record={numericVersion:1,rarity,stars:6,xp:0,skills:[1,1,1,1],talents:{}};
  record.xp=xpAtLevel(record,level);
  add(`commander.${rarity}.${level}.xp`,'Commanders',rarity,'cumulative XP',level,record.xp,'XP','server/progression.mjs#xpAtLevel','sum(round(epicRow*rarityRatio)); Common level49/50 exceptions','rarity ratios are local assumptions unless independently verified');
  add(`commander.${rarity}.${level}.talents`,'Commanders',rarity,'talent capacity',level,talentPoints(record),'points','server/progression.mjs#talentPoints','floor(level/5)','prepared XP and six stars');
}
for (let level=1;level<=60;level++) add(`capacity.commander.${level}`,'Marches','commander capacity','capacity',level,commanderCapacity(level),'troops','server/numerics.mjs#commanderCapacity','piecewise linear interpolation for missing reference rows','Known table rows and interpolated rows must be reviewed separately');
for(let age=1;age<=5;age++) for (const level of [1,30,60]) {
  const {p}=fresh();p.cityLevel=age; const hero=ensureHero(p,p.commanderId);hero.stars=6;hero.xp=xpAtLevel(hero,level);
  add(`capacity.age${age}.commander${level}`,'Marches','march capacity','capacity',age,marchTroopCap(p),'troops','server/city.mjs#marchTroopCap','ageBase+commanderCapacity(level)',`primary level=${level}; prepared city age`);
}
for(let level=0;level<SCOUT_CAMP_LEVELS.length;level++) for(const [key,value] of Object.entries(SCOUT_CAMP_LEVELS[level])) add(`scouts.${level}.${key}`,'Scouting','scout camp',key,level,value,'local world units / seconds / counts; parameter-specific','server/scout-camp.mjs#SCOUT_CAMP_LEVELS');

// Freshly read secondary sources, not a current live RoK-client measurement.
const infantryReference={attack:62,defense:120,health:120,marchSpeed:85,load:7,duration:15};
for(const [parameter,value] of Object.entries(infantryReference)) {
  const row=rows.find(r=>r.audit_id===`troop.infantry.${parameter}`);
  row.rok_value=value;row.source_url='https://gacha-data.com/rise-of-kingdoms/troops/';
  row.evidence_class='VERIFIED';row.absolute_difference=row.tom_value-value;
  row.percentage_difference=(row.tom_value-value)/value*100;
  row.parity=row.absolute_difference===0?'EXACT MATCH':'NUMERICAL MISMATCH';
  row.conditions+='; generic T1 infantry only; secondary table checked 2026-11-16; live build UNKNOWN';
}
for(const row of rows.filter(r=>r.subsystem==='Commanders'&&r.parameter==='talent capacity'&&r.level===60)) {
  row.rok_value=74;row.source_url='https://rokhub.app/faq/talents';row.evidence_class='VERIFIED';
  row.absolute_difference=row.tom_value-74;row.percentage_difference=(row.tom_value-74)/74*100;
  row.parity='NUMERICAL MISMATCH';row.conditions+='; single community source checked 2026-11-16; live build UNKNOWN; full award schedule unverified';
}

// Reconstructed independent defect probes. A matching defect is FAIL, never gameplay PASS.
const probes=[];
{
  const {w,p}=fresh();p.x=p.homeX=128;p.z=p.homeZ=30;
  const path=route(w,p,{x:128,z:128});let accepted=false,error='';
  try {w.command(p,{type:'move',x:128,z:128});accepted=true;}catch(e){error=e.message;}
  let ticks=0;while(accepted&&ticks<1000&&Math.hypot(p.x-128,p.z-128)>.001){w.tick(.25);ticks++;}
  probes.push({id:'military-frontier',expected:'Reject unauthorized cross-zone move',accepted,error,path,ticks,arrived:Math.hypot(p.x-128,p.z-128)<.001,verdict:accepted?'FAIL':'PASS',fixture:'Coordinates prepared; production command and ticks'});
}
{
  const {w,p}=fresh();p.x=p.homeX=20;p.z=p.homeZ=20;let error='';
  try{w.command(p,{type:'scout-send',x:50,z:20});}catch(e){error=e.message;}
  probes.push({id:'scout-pass',expected:'Accept scout through physical corridor without pass ownership',error,verdict:error?'FAIL':'PASS',fixture:'Coordinates prepared; production command'});
}
{
  const {w,p}=fresh();p.ownedCommanders.push('wukong');const secondary=ensureHero(p,'wukong');secondary.stars=2;secondary.skills=[1,1,0,0];
  p.x=p.homeX;p.z=p.homeZ;w.command(p,{type:'pair-commander',targetId:'wukong'});
  const before=w.stats(p);secondary.skills[1]=2;const after=w.stats(p);
  probes.push({id:'secondary-passive',expected:'Secondary offensive passive rank affects army damage',before:before.damage,after:after.damage,verdict:after.damage>before.damage?'PASS':'FAIL',fixture:'Prepared ownership/stars/skill ranks; actual pair command and stat calculation; not an organic skill purchase'});
  secondary.skills=[1,0,0,0];secondary.stars=6;secondary.xp=0;const low=w.stats(p);secondary.xp=xpAtLevel(secondary,60);const high=w.stats(p);
  probes.push({id:'secondary-level',expected:'No blanket skill-independent companion-level damage multiplier',level1:low.damage,level60:high.damage,ratio:high.damage/low.damage,verdict:high.damage===low.damage?'PASS':'FAIL',fixture:'Prepared levels; production stats'});
}
const healthy=fresh();healthy.w.tick(.25);const restored=World.fromSave(healthy.w.toSave(),{now:healthy.w.now,random:healthy.w.random});
const freshRestart={playerCount:restored.players.size,positionPreserved:restored.players.get(healthy.p.id).x===healthy.p.x&&restored.players.get(healthy.p.id).z===healthy.p.z};
writeFileSync(resolve(output,'diagnostics.json'),JSON.stringify({commit,referenceBuild:'UNKNOWN',fogWidth:FOG_WIDTH,gateSites:new World().sites.filter(s=>s.kind==='gate').length,ungatedCorridors:MAP_CORRIDORS.filter(c=>!c.gateId).map(c=>c.id),freshRestart,probes},null,2)+'\n');
csv(resolve(output,'parity-matrix.csv'),rows);
writeFileSync(resolve(output,'matrix.json'),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify({commit,rows:rows.length,probes:probes.map(({id,verdict})=>({id,verdict})),output}));
