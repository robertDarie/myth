export const WORLD_SIZE=256, CELL_SIZE=4, FOG_WIDTH=WORLD_SIZE/CELL_SIZE;
export const WORLD_SCHEMA=28, PROTOCOL=17;
export const LIMITS=Object.freeze({defaultCities:32,maxCities:256,allianceMembers:100});
export function cityLimit(value=LIMITS.defaultCities){if(!Number.isInteger(value)||value<1||value>LIMITS.maxCities)throw new Error('City capacity must be an integer from 1 to 256.');return value;}
// The legacy four provinces keep their exact boundaries and Divine Gates.
// Province interiors remain unchanged; every shared-border crossing has a pass.
export const PROVINCES=Object.freeze([
 {id:'first-frontier',name:'First Frontier',minX:0,maxX:40,minZ:0,maxZ:40,gates:[]},
 {id:'legacy-east',name:'Sunward Province',minX:40,maxX:80,minZ:0,maxZ:40,gates:['gate-east']},
 {id:'legacy-north',name:'Runic Province',minX:0,maxX:40,minZ:40,maxZ:80,gates:['gate-north']},
 {id:'legacy-crown',name:'First Throne',minX:40,maxX:80,minZ:40,maxZ:80,gates:['gate-east','gate-north']},
 {id:'dawn-reach',name:'Dawn Reach',minX:80,maxX:256,minZ:0,maxZ:80,gates:[]},
 {id:'ashen-fields',name:'Ashen Fields',minX:0,maxX:80,minZ:80,maxZ:256,gates:[]},
 {id:'outer-marches',name:'Outer Marches',minX:80,maxX:256,minZ:80,maxZ:256,gates:[]}
]);
export function provinceAt(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=0&&p.x<=WORLD_SIZE&&p.z>=0&&p.z<=WORLD_SIZE?PROVINCES.find(r=>(p.x>r.minX||p.x===0&&r.minX===0)&&p.x<=r.maxX&&(p.z>r.minZ||p.z===0&&r.minZ===0)&&p.z<=r.maxZ):undefined;}
export const STARTING_REGIONS=PROVINCES.filter(r=>r.gates.length===0).map(r=>({...r,minX:r.minX+3,maxX:r.maxX-3,minZ:r.minZ+3,maxZ:r.maxZ-3}));
export const MAP_CORRIDORS=Object.freeze([
 {id:'east-low',gateId:'gate-east',a:{x:39,z:20},b:{x:41,z:20}},
 {id:'east-high',gateId:'gate-crown-west',a:{x:39,z:60},b:{x:41,z:60}},
 {id:'north-west',gateId:'gate-north',a:{x:20,z:39},b:{x:20,z:41}},
 {id:'north-east',gateId:'gate-crown-south',a:{x:60,z:39},b:{x:60,z:41}},
 {id:'dawn-road',gateId:'gate-dawn-low',a:{x:79,z:20},b:{x:81,z:20}},
 {id:'crown-dawn',gateId:'gate-dawn-high',a:{x:79,z:60},b:{x:81,z:60}},
 {id:'ashen-road',gateId:'gate-ashen-low',a:{x:20,z:79},b:{x:20,z:81}},
 {id:'crown-ashen',gateId:'gate-ashen-high',a:{x:60,z:79},b:{x:60,z:81}},
 {id:'dawn-outer',gateId:'gate-outer-south',a:{x:128,z:79},b:{x:128,z:81}},
 {id:'ashen-outer',gateId:'gate-outer-west',a:{x:79,z:128},b:{x:81,z:128}}
]);
const PASS_NAMES=['Eastern Divine Gate','Gate of the Norn Crown','Northern Divine Gate','Gate of the Sun Oath','Gate of Eos','Gate of the Dawn Throne','Gate of the Ashen Oath','Gate of the Ember Crown','Gate of the Starward March','Gate of the Worldroot'];
export const PASS_DEFINITIONS=Object.freeze(MAP_CORRIDORS.map((c,i)=>Object.freeze({id:c.gateId,name:PASS_NAMES[i],kind:'gate',x:c.a.x,z:c.a.z,corridorId:c.id,zoneIds:Object.freeze([provinceAt(c.a).id,provinceAt(c.b).id]),openingStage:'gates',tier:c.id.includes('crown')||c.id==='east-high'||c.id==='north-east'?3:c.id.includes('outer')?1:2,encounter:'original-divine-gate',description:'Control this adjacent mountain crossing. Original Divine Gate encounter; numerical RoK parity unverified.'})));
for(const zone of PROVINCES){zone.category=STARTING_REGIONS.some(s=>s.id===zone.id)?'starting':zone.id==='legacy-crown'?'central':'intermediate';zone.gates=PASS_DEFINITIONS.filter(p=>p.zoneIds.includes(zone.id)).map(p=>p.id);Object.freeze(zone.gates);Object.freeze(zone);}
for(const corridor of MAP_CORRIDORS){Object.freeze(corridor.a);Object.freeze(corridor.b);Object.freeze(corridor);}
export const FRONTIER_HUBS=[];
for(let z=16;z<256;z+=32)for(let x=16;x<256;x+=32)if(x>80||z>80)FRONTIER_HUBS.push({id:`frontier-${x}-${z}`,x,z});
export const frontierNodes=()=>FRONTIER_HUBS.flatMap(h=>['wood','food','gold','stone','mana'].map((resource,i)=>({id:h.id+'-'+resource,name:['Suncrest Grove','Frontier Fields','Amber Vein','Oathstone Quarry','Starwell Spring'][i],resource,x:h.x+[-5,5,0,-8,8][i],z:h.z+[3,3,-5,-8,-8][i],remaining:600,capacity:600,refill:0})));
export const frontierCamps=()=>FRONTIER_HUBS.map(h=>({id:h.id+'-camp',name:'Forsaken Waywatch',level:1,x:h.x,z:h.z+9,health:100,maxHealth:100,respawn:0,contributors:{},cycle:1}));
export const frontierSites=()=>PROVINCES.filter(r=>r.minX>=80||r.minZ>=80).flatMap((r,i)=>[
 {id:r.id+'-shrine',name:r.name+' Oathstone',kind:'shrine',x:r.minX+24,z:r.minZ+24,description:'Alliance rally and garrison objective; territory season contribution.'},
 {id:r.id+'-watch',name:r.name+' Watch',kind:'shrine',x:r.maxX-16,z:r.maxZ-16,description:'Alliance rally and garrison objective; territory season contribution.'}
]);
export const cellIndex=p=>Math.min(FOG_WIDTH-1,Math.max(0,Math.floor(p.z/CELL_SIZE)))*FOG_WIDTH+Math.min(FOG_WIDTH-1,Math.max(0,Math.floor(p.x/CELL_SIZE)));
export function migrateMap(data){
 if(!data||data.schema>=26)return data;
 const next=structuredClone(data),w=next.world;
 if(!w||!Array.isArray(w.players))return next;
 for(const p of w.players)if(Array.isArray(p.explored))p.explored=p.explored.map(i=>Number.isInteger(i)&&i>=0&&i<400?Math.floor(i/20)*FOG_WIDTH+i%20:i+FOG_WIDTH*FOG_WIDTH);
 // Append only. Known old coordinates, depletion, ownership and reports survive.
 for(const [key,items]of [['nodes',frontierNodes()],['camps',frontierCamps()],['sites',frontierSites().map(s=>({...s,allianceId:'',challengerId:'',progress:0,maxHealth:300,health:300}))]])if(Array.isArray(w[key]))for(const item of items)if(!w[key].some(v=>v.id===item.id))w[key].push(item);
 return next;
}
