import { FOG_WIDTH } from '../world-map.mjs';
import { campDefinitions, siteDefinitions } from '../content.mjs';
import { resourceNodes } from '../city-content.mjs';
// Author an actual legacy map before older-system migration fixtures downgrade
// the schema number. New 64-column indices are not valid 20-column input.
export function legacyMap(save) {
  const w=save.world=structuredClone(save.world);
  for(const p of w.players??[])if(Array.isArray(p.explored))p.explored=p.explored.filter(i=>i%FOG_WIDTH<20&&Math.floor(i/FOG_WIDTH)<20).map(i=>Math.floor(i/FOG_WIDTH)*20+i%FOG_WIDTH);
  const ids={camps:new Set(campDefinitions.map(c=>c[0])),sites:new Set(siteDefinitions.map(s=>s.id)),nodes:new Set([...Array.from({length:12},(_,i)=>'resource-'+i),...resourceNodes.map(n=>n.id)])};
  for(const key of Object.keys(ids))if(Array.isArray(w[key]))w[key]=w[key].filter(v=>ids[key].has(v.id));
  if(Array.isArray(w.strongholds))w.strongholds=w.strongholds.filter(v=>!v.id.startsWith('frontier-'));
  delete w.cityCapacity;
  return save;
}
