import { World } from '../server/world.mjs';
import { referenceCamp } from '../server/numerics.mjs';
import { marchTroopCap } from '../server/city.mjs';
import { troopTypes, emptyUnits, unitTotal } from '../server/troops.mjs';
import { configureForsaken } from '../server/forsaken.mjs';
import { ensureHero, xpAtLevel } from '../server/progression.mjs';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export const variants=['recommended','half','more','strong-commander','higher-tier','lower-tier','technology'];
export function simulateForsaken(level,variant='recommended') {
  let now=Date.UTC(2026,10,14);
  const w=new World({random:()=>.25,now:()=>now}),s=w.join('Calibration'),p=w.authenticate(s.token),c=w.camps[0],r=referenceCamp(level);
  // Authored isolated combat scenario. No substitute equation determines outcome:
  // commands, cooldowns, shield expiry, rage, AP, rewards, wounds and HP all tick in World.
  w.kingdom.startedAtMs=now-25*86400000;p.forsaken.unlocked=25;p.cityLevel=5;p.buildings.barracks=p.buildings.academy=5;
  const tier=variant==='higher-tier'?Math.min(5,r.recommendedTier+1):variant==='lower-tier'?Math.max(1,r.recommendedTier-1):r.recommendedTier;
  if(tier>=2){p.technologies.drill=1;for(const id of ['veterans','columns','bulwarks','titanhost'].slice(0,tier-1))p.technologies[id]=1;}
  if(variant==='technology')p.technologies.drill=p.technologies.vitality=3;
  const count=Math.round(r.recommendedTroops*(variant==='half'?.5:variant==='more'?1.2:1)),type=troopTypes(p).find(t=>t.baseId==='infantry'&&t.tier===tier);
  p.units={...emptyUnits(),[type.id]:count};p.troops=count;p.reserveTroops=0;p.reserveUnits=emptyUnits();
  if(variant==='strong-commander'){
    p.ownedCommanders.push('heracles');p.commanderId='heracles';const hero=ensureHero(p,'heracles');hero.stars=3;hero.skills=[5,5,5,0];hero.xp=xpAtLevel(hero,30);
  }
  p.homeX=p.homeZ=10;p.x=p.z=22;p.health=w.stats(p).maxHealth;
  c.level=level;c.x=c.z=22;configureForsaken(c);c.health=c.maxHealth;c.respawn=0;c.contributors={};
  if(count>marchTroopCap(p))throw new Error('Illegal calibration march capacity.');
  const startHP=p.health,startXP=ensureHero(p,p.commanderId).xp,startAP=p.ap;
  w.command(p,{type:'attack',targetId:c.id});
  let ticks=0;for(;ticks<2400&&!p.coreReports.some(report=>report.encounterId===c.id);ticks++){now+=250;w.tick(.25);}
  const report=p.coreReports.find(report=>report.encounterId===c.id);
  if(!report)throw new Error('Combat did not settle: '+level+' '+variant+' ('+p.state+')');
  if(p.troops+unitTotal(p.wounded)!==count)throw new Error('Simulation lost real soldiers.');
  return {level,variant,enemyPower:r.enemyPower,enemyTroops:r.troopCount,enemyComposition:r.composition,enemyTier:r.recommendedTier,recommendedTroops:r.recommendedTroops,recommendedTier:r.recommendedTier,
    attackerTroops:count,attackerTier:tier,commander:p.commanderId,commanderLevel:variant==='strong-commander'?30:1,technology:{drill:p.technologies.drill,vitality:p.technologies.vitality},
    outcome:report.outcome,seconds:ticks*.25,initialHealth:startHP,remainingHealth:p.health,wounded:unitTotal(p.wounded),remainingTroops:p.troops,apCharged:report.apCharged,netAPSpent:startAP-p.ap,
    xpAwarded:ensureHero(p,p.commanderId).xp-startXP,resources:report.resources,items:report.items,firstClear:report.firstClear,damageDealt:report.damageDealt,damageTaken:report.damageTaken};
}
export function runCalibration(){return {engine:'Production World.command + World.tick(0.25); authored deterministic combat fixtures',randomPolicy:'Fixed .25 for reproducible loot; does not estimate drop frequencies',assumptions:'Infantry composition; source recommendations are not guaranteed minimums. Missing NPC counts inferred. Higher/lower-tier boundary cases clamp at T5/T1. Original ToM commander abilities and aggregate equation.',rows:Array.from({length:25},(_,i)=>variants.map(v=>simulateForsaken(i+1,v))).flat()};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=runCalibration(),output=process.argv[2]??'docs/benchmarks/forsaken-calibration.json';writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  const columns=['level','variant','enemyPower','enemyTroops','enemyTier','recommendedTroops','recommendedTier','attackerTroops','attackerTier','commander','commanderLevel','outcome','seconds','initialHealth','remainingHealth','wounded','remainingTroops','apCharged','netAPSpent','xpAwarded','resources','items','firstClear'];
  const quote=value=>'"'+String(typeof value==='object'?JSON.stringify(value):value).replaceAll('"','""')+'"';
  writeFileSync(output.replace(/\.json$/,'.csv'),columns.join(',')+'\n'+result.rows.map(row=>columns.map(key=>quote(row[key])).join(',')).join('\n')+'\n');
  const summary=Object.fromEntries(variants.map(v=>[v,result.rows.filter(r=>r.variant===v&&r.outcome==='Victory').length]));
  console.log(JSON.stringify({battles:result.rows.length,victoriesByVariant:summary,output}));
}
