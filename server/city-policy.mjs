// Progression-policy boundary. Legacy formulas are retained verbatim, not RoK claims.
import { CITADEL_REQUIREMENTS } from './city-content.mjs';
export const LEGACY_CITY_PROFILE = 'legacy-five-level-v1';
export function cityPolicy(p) {
  const id=p.cityProgressionProfile??LEGACY_CITY_PROFILE;
  if(id!==LEGACY_CITY_PROFILE)throw new Error('City progression profile is not activated: '+id);
  return {id,buildingMaximum:b=>b.id==='builders'?1:5};
}
export function buildingPolicyQuote(p,b) {
  const policy=cityPolicy(p),level=b.id==='citadel'?p.cityLevel:p.buildings[b.id]??0,next=level+1;
  const factor=b.id==='citadel'?level:Math.pow(next,1.4);
  return {level,next,maximum:policy.buildingMaximum(b),cost:Object.fromEntries(Object.entries(b.base).map(([id,value])=>[id,Math.ceil(value*factor)])),
    seconds:(b.id==='citadel'?20*level:12*next)/(1+0.05*p.technologies.masonry),
    prerequisites:b.id==='citadel'?CITADEL_REQUIREMENTS[next]??[]:b.requirements??[]};
}
// A future table cannot silently interpolate absent/unverified progression.
// Structural validation is not independent factual review or activation permission.
export function compileReferenceBuilding({id,maximum,referenceVersion,referenceMode,rows}, {allowSynthetic=false}={}) {
  if(!id||!Number.isInteger(maximum)||maximum<1||!referenceVersion||!referenceMode||/UNKNOWN|UNRESOLVED/i.test(referenceVersion+' '+referenceMode))throw new Error('Unresolved reference identity');
  if(!Array.isArray(rows)||rows.length!==maximum)throw new Error('Every individual level needs an explicit row');
  const levels=new Map();
  for(const row of rows){
    if(!Number.isInteger(row.level)||row.level<1||row.level>maximum||levels.has(row.level))throw new Error('Missing or duplicate reference level');
    const synthetic=allowSynthetic&&referenceVersion.startsWith('SYNTHETIC:');
    if((synthetic?(row.classification!=='TEST_ONLY'||!row.source?.startsWith('fixture://')):(!['VERIFIED','CORROBORATED'].includes(row.classification)||!row.source?.startsWith('https://')))||row.precision!=='seconds')throw new Error('Unverified or imprecise reference row');
    if(!Number.isFinite(row.seconds)||row.seconds<0||!Number.isInteger(row.powerTotal)||row.powerTotal<0||!row.cost||!Array.isArray(row.prerequisites))throw new Error('Incomplete reference quote or prerequisites');
    if(['food','wood','stone','gold'].some(id=>!Object.hasOwn(row.cost,id))||Object.values(row.cost).some(v=>!Number.isSafeInteger(v)||v<0)||row.prerequisites.some(r=>!r.id||!Number.isInteger(r.level)||r.level<1))throw new Error('Invalid reference requirement/cost');
    levels.set(row.level,structuredClone(row));
  }
  return Object.freeze({id,maximum,referenceVersion,referenceMode,quote(level){if(!levels.has(level))throw new Error('No verified level quote');return structuredClone(levels.get(level));}});
}
