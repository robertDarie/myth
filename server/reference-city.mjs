// Explicitly isolated experimental authority. Never imported by normal World/index.
import {randomUUID,createHash} from 'node:crypto';
import {compileReferenceBuilding} from './city-policy.mjs';
const resources=['food','wood','stone','gold'],roles=new Set(['cityhall','production','training','academy','trade']);
const clone=x=>structuredClone(x),fingerprint=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const amount=n=>Number.isSafeInteger(n)&&n>=0;
function requireTrue(v,message){if(!v)throw new Error(message);}
function cost(c){requireTrue(c&&Object.keys(c).length===4&&resources.every(k=>amount(c[k])),'Explicit four-resource cost required');return clone(c);}
function safeAdd(a,b){requireTrue(amount(a)&&amount(b)&&amount(a+b),'Unsafe resource/unit quantity');return a+b;}
function validateEffects(e={}){
 const allowed=['workers','constructionSpeed','researchSpeed','productionBonus','production','training','transferCapacity','tradeTaxBps','stoneGatheringUnlocked'];
 requireTrue(Object.keys(e).every(k=>allowed.includes(k)),'Unsupported building effect');
 for(const k of ['constructionSpeed','researchSpeed'])if(k in e)requireTrue(Number.isFinite(e[k])&&e[k]>=0,'Invalid timer bonus');
 if(e.workers!==undefined)requireTrue(Number.isInteger(e.workers)&&e.workers>=1&&e.workers<=8,'Invalid worker effect');
 if(e.productionBonus)requireTrue(Object.keys(e.productionBonus).every(k=>resources.includes(k)&&Number.isFinite(e.productionBonus[k])&&e.productionBonus[k]>=0),'Invalid production bonus');
 if(e.production)requireTrue(resources.includes(e.production.resource)&&Number.isFinite(e.production.perHour)&&e.production.perHour>=0&&amount(e.production.capacity),'Invalid production effect');
 if(e.training){cost(e.training.cost);requireTrue(e.training.unitId&&amount(e.training.capacity)&&e.training.capacity>0&&Number.isFinite(e.training.seconds)&&e.training.seconds>0,'Invalid facility training effect');}
 if(e.transferCapacity!==undefined)requireTrue(amount(e.transferCapacity)&&Number.isInteger(e.tradeTaxBps)&&e.tradeTaxBps>=0&&e.tradeTaxBps<=10000,'Incomplete transfer effects');
 if(e.stoneGatheringUnlocked!==undefined)requireTrue(typeof e.stoneGatheringUnlocked==='boolean','Invalid unlock effect');
}
export class ReferenceCityEngine {
 #profile;#buildings;#technologies;#players=new Map();#sessions=new Map();#receipts=new Map();#time=0;
 constructor(profile,{experimental=false}={}){
  requireTrue(experimental===true,'Experimental opt-in required; normal city activation is disabled');
  requireTrue(profile?.experimental===true&&['SYNTHETIC','OBSERVED_PREPARED'].includes(profile.kind),'Only explicitly isolated experimental profiles are supported');
  requireTrue(profile.id&&profile.timerFormula&&['BASE_ONLY','DIVIDE_BY_ONE_PLUS_SUM'].includes(profile.timerFormula),'Explicit experimental timer policy required');
  requireTrue(Number.isFinite(profile.offlineProductionLimit)&&profile.offlineProductionLimit>=0,'Explicit offline production limit required');
  this.#profile=clone(profile);const defs=profile.buildings;
  requireTrue(Array.isArray(defs)&&defs.length>0&&new Set(defs.map(b=>b.id)).size===defs.length,'Independent building identities required');
  this.#buildings=new Map();this.#technologies=new Map();
  for(const b of defs){
   requireTrue(roles.has(b.role),'Unsupported nonfunctional building role');
   const table=compileReferenceBuilding(b,{allowSynthetic:profile.kind==='SYNTHETIC'});
   for(const row of b.rows){cost(row.cost);validateEffects(row.effects);
    requireTrue(b.role!=='production'||row.effects?.production,'Production role needs real production/collection effects');
    requireTrue(b.role!=='training'||row.effects?.training,'Training role needs a unit/cost/timer action');
    requireTrue(b.role!=='trade'||row.effects?.transferCapacity!==undefined,'Trade role needs capacity and tax policy');
    requireTrue(b.role!=='cityhall'||row.effects?.workers!==undefined,'Cityhall needs worker effects');
    requireTrue(b.role!=='academy'||row.effects?.researchSpeed!==undefined,'Academy needs research-speed effects');
   }
   this.#buildings.set(b.id,{...clone(b),table});
  }
  requireTrue(defs.filter(b=>b.role==='cityhall').length===1,'Exactly one cityhall identity required');
  for(const t of profile.technologies??[]){
   requireTrue(!this.#technologies.has(t.id)&&!this.#buildings.has(t.id),'Duplicate technology identity');
   const table=compileReferenceBuilding(t,{allowSynthetic:profile.kind==='SYNTHETIC'});
   for(const row of t.rows){cost(row.cost);validateEffects(row.effects);}
   this.#technologies.set(t.id,{...clone(t),table});
  }
  for(const b of [...this.#buildings.values(),...this.#technologies.values()])for(const row of b.rows)for(const r of row.prerequisites){
   const map=r.kind==='technology'?this.#technologies:this.#buildings;
   requireTrue(map.has(r.id)&&r.level<=map.get(r.id).maximum,'Unknown prerequisite identity/level');
  }
  const graph=new Map();
  for(const [kind,map]of [['building',this.#buildings],['technology',this.#technologies]])for(const b of map.values())for(const row of b.rows){
   const dependencies=row.prerequisites.map(r=>(r.kind==='technology'?'technology':'building')+':'+r.id+':'+r.level);
   if(row.level>1)dependencies.push(kind+':'+b.id+':'+(row.level-1));graph.set(kind+':'+b.id+':'+row.level,dependencies);
  }
  const visiting=new Set(),done=new Set();const visit=node=>{requireTrue(!visiting.has(node),'Cyclic building/technology prerequisite');if(done.has(node))return;visiting.add(node);for(const target of graph.get(node)??[])visit(target);visiting.delete(node);done.add(node);};for(const node of graph.keys())visit(node);
  cost(profile.initial.resources);
  for(const [id,level]of Object.entries(profile.initial.levels))requireTrue(this.#buildings.has(id)&&amount(level)&&level<=this.#buildings.get(id).maximum,'Invalid declared fixture initialization');
  requireTrue(profile.initial.levels[defs.find(b=>b.role==='cityhall').id]>=1,'Declared starting cityhall required');
 }
 get profileId(){return this.#profile.id;}
 #actor(token){const p=this.#players.get(this.#sessions.get(token));requireTrue(p,'Experimental session authorization required');return p;}
 join(name){
  requireTrue(typeof name==='string'&&name.trim().length>0&&name.length<=24,'Invalid experimental city name');
  requireTrue(![...this.#players.values()].some(p=>p.name.toLowerCase()===name.trim().toLowerCase()),'Experimental city already exists');
  const id=randomUUID(),token=randomUUID();
  const p={id,name:name.trim(),bank:clone(this.#profile.initial.resources),levels:Object.fromEntries([...this.#buildings.keys()].map(k=>[k,this.#profile.initial.levels[k]??0])),technologies:Object.fromEntries([...this.#technologies.keys()].map(k=>[k,0])),stored:{},units:{},jobs:[]};
  this.#players.set(id,p);this.#sessions.set(token,id);return {playerId:id,token,experimental:true,profileId:this.profileId};
 }
 #row(p,b){const level=(b.role?p.levels:p.technologies)[b.id];return level?b.table.quote(level):null;}
 #effects(p){
  const result={workers:1,constructionSpeed:0,researchSpeed:0,productionBonus:Object.fromEntries(resources.map(k=>[k,0])),stoneGatheringUnlocked:false};
  for(const b of [...this.#buildings.values(),...this.#technologies.values()]){
   const e=this.#row(p,b)?.effects??{};result.workers=Math.max(result.workers,e.workers??1);
   result.constructionSpeed+=e.constructionSpeed??0;result.researchSpeed+=e.researchSpeed??0;
   for(const k of resources)result.productionBonus[k]+=e.productionBonus?.[k]??0;
   result.stoneGatheringUnlocked||=e.stoneGatheringUnlocked??false;
  }
  return result;
 }
 #quote(p,b,research=false){
  const level=(research?p.technologies:p.levels)[b.id],next=level+1;
  if(next>b.maximum)return {level,maximum:b.maximum,canUpgrade:false,reason:'Maximum supplied profile level'};
  const row=b.table.quote(next),effects=this.#effects(p);
  let reason='';
  if(row.prerequisites.some(r=>(r.kind==='technology'?p.technologies:p.levels)[r.id]<r.level))reason='Building/technology prerequisite required';
  if(p.jobs.some(j=>j.targetId===b.id&&j.type===(research?'research':'building')))reason='Target already queued';
  if(research?p.jobs.some(j=>j.type==='research'):p.jobs.filter(j=>j.type==='building').length>=effects.workers)reason='Worker/research lane occupied';
  if(!reason&&resources.some(k=>p.bank[k]<row.cost[k]))reason='Not enough resources';
  const bonus=research?effects.researchSpeed:effects.constructionSpeed;
  const seconds=this.#profile.timerFormula==='BASE_ONLY'?row.seconds:row.seconds/(1+bonus);
  return {level,maximum:b.maximum,nextLevel:next,cost:row.cost,baseSeconds:row.seconds,seconds,prerequisites:row.prerequisites,effects:row.effects??{},powerTotal:row.powerTotal,canUpgrade:!reason,reason};
 }
 #spend(p,c){requireTrue(resources.every(k=>p.bank[k]>=c[k]),'Not enough resources');for(const k of resources)p.bank[k]-=c[k];}
 command(token,c){
  const p=this.#actor(token);requireTrue(c&&typeof c.requestId==='string'&&c.requestId.length>0&&c.requestId.length<=80,'Command requestId required');
  requireTrue(!('playerId'in c)||c.playerId===p.id,'Foreign city command rejected');
  const key=p.id+':'+c.requestId,hash=fingerprint(c),prior=this.#receipts.get(key);
  if(prior){requireTrue(prior.hash===hash,'RequestId reused for a different command');return clone(prior.result);}
  requireTrue(this.#receipts.size<10000,'Experimental receipt limit reached');
  const before=clone([...this.#players.entries()]);
  try{
   let result={accepted:true,experimental:true};
   if(c.type==='building-upgrade'||c.type==='research'){
    const research=c.type==='research',b=(research?this.#technologies:this.#buildings).get(c.targetId);requireTrue(b,'Unknown independent building/technology');
    const q=this.#quote(p,b,research);requireTrue(q.canUpgrade,q.reason);this.#spend(p,q.cost);
    p.jobs.push({id:randomUUID(),type:research?'research':'building',targetId:b.id,targetLevel:q.nextLevel,remaining:q.seconds,duration:q.seconds,paid:q.cost});
   }else if(c.type==='collect'){
    const defs=c.targetId?[this.#buildings.get(c.targetId)]:[...this.#buildings.values()].filter(b=>b.role==='production');
    for(const b of defs){requireTrue(b?.role==='production'&&p.levels[b.id]>0,'Unknown or unbuilt production facility');const e=this.#row(p,b).effects.production,n=Math.floor((p.stored[b.id]??0)+1e-9);p.bank[e.resource]=safeAdd(p.bank[e.resource],n);p.stored[b.id]=Math.max(0,(p.stored[b.id]??0)-n);}
   }else if(c.type==='train'){
    const b=this.#buildings.get(c.targetId),t=b&&this.#row(p,b)?.effects.training;
    requireTrue(b?.role==='training'&&t,'Working training facility required');requireTrue(Number.isSafeInteger(c.quantity)&&c.quantity>0&&c.quantity<=t.capacity,'Facility training capacity exceeded');
    requireTrue(!p.jobs.some(j=>j.type==='training'&&j.targetId===b.id),'Facility queue occupied');
    const paid=Object.fromEntries(resources.map(k=>[k,t.cost[k]*c.quantity]));cost(paid);this.#spend(p,paid);
    p.jobs.push({id:randomUUID(),type:'training',targetId:b.id,facilityLevel:p.levels[b.id],unitId:t.unitId,quantity:c.quantity,remaining:t.seconds*c.quantity,duration:t.seconds*c.quantity,paid});
   }else if(c.type==='transfer'){
    const receiver=this.#players.get(c.targetPlayerId);requireTrue(receiver&&receiver!==p&&resources.includes(c.resource)&&amount(c.amount)&&c.amount>0,'Invalid resource transfer');
    const b=[...this.#buildings.values()].find(b=>b.role==='trade'&&p.levels[b.id]>0),e=b&&this.#row(p,b).effects;
    requireTrue(e&&c.amount<=e.transferCapacity,'Trade facility/capacity required');
    const tax=Number((BigInt(c.amount)*BigInt(e.tradeTaxBps)+9999n)/10000n),debit=c.amount+tax;requireTrue(amount(debit)&&p.bank[c.resource]>=debit,'Insufficient transfer resources');
    receiver.bank[c.resource]=safeAdd(receiver.bank[c.resource],c.amount);p.bank[c.resource]-=debit;result={...result,tax,received:c.amount,settlement:'EXPERIMENTAL SUPPLIED POLICY; not verified RoK transport'};
   }else throw new Error('Unsupported experimental city command');
   this.#receipts.set(key,{hash,result});return clone(result);
  }catch(error){this.#players=new Map(before);throw error;}
 }
 tick(seconds,{productionSeconds=seconds}={}){
  requireTrue(Number.isFinite(seconds)&&seconds>=0&&Number.isFinite(productionSeconds)&&productionSeconds>=0,'Invalid authoritative clock');
  let remaining=seconds,budget=Math.min(seconds,productionSeconds);
  while(remaining>1e-9){
   let step=remaining;
   for(const p of this.#players.values())for(const j of p.jobs)if(j.remaining>1e-9)step=Math.min(step,j.remaining);
   if(budget>1e-9)step=Math.min(step,budget);
   for(const p of this.#players.values()){
    const effects=this.#effects(p);
    if(budget>1e-9)for(const b of this.#buildings.values())if(b.role==='production'&&p.levels[b.id]){
     const e=this.#row(p,b).effects.production;p.stored[b.id]=Math.min(e.capacity,(p.stored[b.id]??0)+step*e.perHour/3600*(1+effects.productionBonus[e.resource]));
    }
    for(const j of p.jobs)j.remaining=Math.max(0,j.remaining-step);
    const done=p.jobs.filter(j=>j.remaining<=1e-9);p.jobs=p.jobs.filter(j=>j.remaining>1e-9);
    for(const j of done){if(j.type==='building')p.levels[j.targetId]=j.targetLevel;else if(j.type==='research')p.technologies[j.targetId]=j.targetLevel;else p.units[j.unitId]=safeAdd(p.units[j.unitId]??0,j.quantity);}
   }
   remaining=Math.max(0,remaining-step);budget=Math.max(0,budget-step);this.#time+=step;
  }
 }
 advanceOffline(seconds){this.tick(seconds,{productionSeconds:Math.min(seconds,this.#profile.offlineProductionLimit)});}
 snapshot(token){
  const p=this.#actor(token);let power=0;
  for(const b of [...this.#buildings.values(),...this.#technologies.values()])power+=this.#row(p,b)?.powerTotal??0;
  return {experimental:true,normalActivation:false,profileId:this.profileId,evidenceKind:this.#profile.kind,time:this.#time,playerId:p.id,name:p.name,resources:clone(p.bank),units:clone(p.units),levels:clone(p.levels),technologies:clone(p.technologies),jobs:clone(p.jobs),effects:this.#effects(p),power,
   buildings:[...this.#buildings.values()].map(b=>({id:b.id,name:b.name,role:b.role,...this.#quote(p,b),stored:p.stored[b.id]??0,activeEffects:this.#row(p,b)?.effects??{}})),
   research:[...this.#technologies.values()].map(b=>({id:b.id,name:b.name,...this.#quote(p,b,true)}))};
 }
 toSave(){return {format:'EXPERIMENTAL_CITY_ENGINE_V1',normalActivation:false,profileId:this.profileId,profileHash:fingerprint(this.#profile),time:this.#time,players:clone([...this.#players]),sessions:clone([...this.#sessions]),receipts:clone([...this.#receipts])};}
 static fromSave(saved,profile,options){
  const engine=new ReferenceCityEngine(profile,options);
  requireTrue(saved?.format==='EXPERIMENTAL_CITY_ENGINE_V1'&&saved.normalActivation===false&&saved.profileHash===fingerprint(profile)&&saved.profileId===profile.id,'Incompatible experimental save/profile; no migration performed');
  requireTrue(Number.isFinite(saved.time)&&saved.time>=0&&Array.isArray(saved.players)&&Array.isArray(saved.sessions)&&Array.isArray(saved.receipts),'Malformed experimental save');
  engine.#players=new Map(clone(saved.players));engine.#sessions=new Map(clone(saved.sessions));engine.#receipts=new Map(clone(saved.receipts));engine.#time=saved.time;
  requireTrue(engine.#players.size===saved.players.length,'Duplicate saved city');
  for(const [id,p]of engine.#players){
   requireTrue(id===p.id&&p.bank&&resources.every(k=>amount(p.bank[k]))&&p.units&&Object.values(p.units).every(amount),'Invalid saved resource/unit ledger');
   requireTrue(Object.keys(p.levels).length===engine.#buildings.size&&Object.keys(p.technologies).length===engine.#technologies.size,'Unknown saved progression identity');
   for(const [key,b]of engine.#buildings)requireTrue(amount(p.levels[key])&&p.levels[key]<=b.maximum&&(b.role!=='cityhall'||p.levels[key]>=1),'Invalid saved building level');
   for(const [key,t]of engine.#technologies)requireTrue(amount(p.technologies[key])&&p.technologies[key]<=t.maximum,'Invalid saved research level');
   for(const [key,value]of Object.entries(p.stored)){const b=engine.#buildings.get(key),e=b&&engine.#row(p,b)?.effects.production;requireTrue(e&&Number.isFinite(value)&&value>=0&&value<=e.capacity,'Invalid saved production store');}
   requireTrue(Array.isArray(p.jobs)&&p.jobs.filter(j=>j.type==='building').length<=engine.#effects(p).workers&&p.jobs.filter(j=>j.type==='research').length<=1,'Invalid saved queue occupancy');
   const targets=new Set();for(const j of p.jobs){
    requireTrue(['building','research','training'].includes(j.type)&&j.id&&Number.isFinite(j.remaining)&&j.remaining>=0&&Number.isFinite(j.duration)&&j.duration>=j.remaining,'Invalid saved paid timer');cost(j.paid);
    const b=(j.type==='research'?engine.#technologies:engine.#buildings).get(j.targetId);requireTrue(b,'Unknown saved job target');const key=j.type+':'+j.targetId;requireTrue(!targets.has(key),'Duplicate saved job');targets.add(key);
    let expected;
    if(j.type==='training'){requireTrue(b.role==='training'&&Number.isInteger(j.facilityLevel)&&j.facilityLevel>=1&&j.facilityLevel<=p.levels[b.id],'Invalid saved training facility level');const t=b.table.quote(j.facilityLevel).effects.training;requireTrue(t&&j.unitId===t.unitId&&amount(j.quantity)&&j.quantity>0&&j.quantity<=t.capacity&&j.duration===t.seconds*j.quantity,'Invalid saved training ledger');expected=Object.fromEntries(resources.map(k=>[k,t.cost[k]*j.quantity]));}
    else{requireTrue(j.targetLevel===(j.type==='research'?p.technologies:p.levels)[j.targetId]+1&&j.targetLevel<=b.maximum,'Invalid saved target level');const row=b.table.quote(j.targetLevel);requireTrue(j.duration>0&&j.duration<=row.seconds,'Invalid saved original duration');expected=row.cost;}
    requireTrue(resources.every(k=>j.paid[k]===expected[k]),'Saved paid cost does not match immutable profile');
   }
  }
  requireTrue(engine.#sessions.size===saved.sessions.length&&[...engine.#sessions].every(([token,id])=>typeof token==='string'&&engine.#players.has(id)),'Invalid saved experimental session');
  requireTrue(engine.#receipts.size===saved.receipts.length&&engine.#receipts.size<=10000&&[...engine.#receipts].every(([key,r])=>[...engine.#players.keys()].some(id=>key.startsWith(id+':'))&&/^[a-f0-9]{64}$/.test(r.hash)&&r.result?.experimental===true),'Invalid saved command receipts');
  return engine;
 }
}
