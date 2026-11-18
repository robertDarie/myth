// Operator-selected QA kingdom only. Normal World/index never imports fixtures or this adapter.
import {World,GameError} from './world.mjs';
import {ReferenceCityEngine} from './reference-city.mjs';
import {checkpoint,restoreCheckpoint} from './checkpoint.mjs';
import {advanceDowntime} from './downtime.mjs';

const configurations=new WeakMap(),engines=new WeakMap();
const resources=['food','wood','stone','gold'];
const membership=new Set(['alliance-join','alliance-leave','alliance-kick','alliance-promote','alliance-demote','alliance-transfer']);
const referenceSocial=new Set(['alliance-join','alliance-leave','chat']);
const label='EXPERIMENTAL / TEST DATA — NOT RoK parity';
export const QA_REFERENCE_FORMAT='QA_REFERENCE_KINGDOM_V1';
const requireQa=(condition,message)=>{if(!condition)throw new GameError(message);};
const includesIdentity=(value,ids)=>typeof value==='string'?ids.has(value):value&&typeof value==='object'?Object.values(value).some(v=>includesIdentity(v,ids)):false;

function configure(world,options){
 requireQa(options?.qaOnly===true,'Explicit isolated QA-only operator configuration required');
 requireQa(options.profile?.kind==='SYNTHETIC','B2 QA integration accepts only disclosed synthetic fixtures; normal reference activation disabled');
 configurations.set(world,{profile:structuredClone(options.profile)});
}
function engine(world){
 const prior=engines.get(world);
 if(prior?.state===world.qaReferenceState)return prior.engine;
 const restored=ReferenceCityEngine.fromSave(world.qaReferenceState.engine,configurations.get(world).profile,{experimental:true});
 engines.set(world,{state:world.qaReferenceState,engine:restored});return restored;
}
function flush(world,e){world.qaReferenceState.engine=e.toSave();}
function synchronize(world,e){
 for(const [id,binding]of Object.entries(world.qaReferenceState.bindings)){
  const p=world.players.get(id),s=e.snapshot(binding.token);
  requireQa(p,'Missing bound QA World identity');for(const r of resources)p[r]=s.resources[r];
 }
}
function mirrors(world,e){
 for(const [id,binding]of Object.entries(world.qaReferenceState.bindings)){
  const p=world.players.get(id),s=e.snapshot(binding.token);
  requireQa(p&&resources.every(r=>p[r]===s.resources[r]),'QA resource authority mismatch; refusing inconsistent state');
 }
}

export class QaReferenceWorld extends World {
 constructor(options={}){
  super(options);configure(this,options);
  const e=new ReferenceCityEngine(options.profile,{experimental:true});
  this.qaReferenceState={format:QA_REFERENCE_FORMAT,bindings:{},engine:e.toSave()};
  engines.set(this,{state:this.qaReferenceState,engine:e});
 }
 // Trusted operator API only: there is no HTTP route/command for this selection.
 seedLegacyPlayer(name,civilization='greek'){return super.join(name,civilization);}
 join(name,civilization='greek',resumeToken=''){
  const resumed=resumeToken&&this.sessions.has(resumeToken),s=super.join(name,civilization,resumeToken);
  if(!resumed){
   const e=engine(this),p=this.players.get(s.playerId),city=e.join(p.name);
   this.qaReferenceState.bindings[p.id]={token:city.token,cityId:city.playerId,
    quarantinedBirthResources:Object.fromEntries(resources.map(r=>[r,p[r]]))};
   flush(this,e);synchronize(this,e);
  }
  return s;
 }
 isReference(id){return Object.hasOwn(this.qaReferenceState.bindings,id);}
 command(p,c){
  requireQa(p&&this.players.get(p.id)===p,'Authenticated World actor required');
  requireQa(c&&typeof c==='object','Invalid QA command');
  requireQa(!['profile','cityProgressionProfile','experimental','time','resources','levels'].some(k=>Object.hasOwn(c,k)),'Client profile, clock or fixture overrides are forbidden');
  requireQa(!c.playerId||c.playerId===p.id,'Foreign city actor rejected');
  const before=checkpoint(this);
  try{
   const e=engine(this);mirrors(this,e);
   if(this.isReference(p.id)){
    requireQa(!c.marchId||c.marchId===p.id,'QA city command cannot control another march');
    if(referenceSocial.has(c.type)){
     const result=super.command(p,c);mirrors(this,e);return result;
    }
    const types={'qa-city-upgrade':'building-upgrade','qa-city-collect':'collect','qa-city-train':'train','qa-city-research':'research','qa-city-transfer':'transfer'};
    requireQa(types[c.type],'Reference QA military, reinforcement, capacity, legacy rewards/economy and profile switching are BLOCKED pending verified integration');
    const request={type:types[c.type],requestId:c.requestId,targetId:c.targetId};
    if(c.type==='qa-city-train')request.quantity=c.count;
    if(c.type==='qa-city-transfer'){
     const recipient=this.qaReferenceState.bindings[c.targetId];
     requireQa(recipient,'Cross-profile resource transfer BLOCKED; no verified conversion/transport rules');
     request.targetPlayerId=recipient.cityId;request.resource=c.name;request.amount=c.count;delete request.targetId;
    }
    let result;
    try{result=e.command(this.qaReferenceState.bindings[p.id].token,request);}catch(error){throw new GameError(error.message);}
    flush(this,e);synchronize(this,e);return result;
   }
   requireQa(!c.type.startsWith('qa-city-'),'Legacy city cannot select or spend from a reference profile');
   const protectedIds=new Set(Object.keys(this.qaReferenceState.bindings));
   for(const a of this.armies())if(this.isReference(this.owner(a).id))protectedIds.add(a.id);
   if(!membership.has(c.type))requireQa(!includesIdentity(c,protectedIds),'Cross-profile transfer, combat, reinforcement or targeting BLOCKED in QA');
   const result=super.command(p,c);mirrors(this,e);return result;
  }catch(error){restoreCheckpoint(this,before);throw error;}
 }
 // Reference jobs and production have ONE authority; legacy jobs stay untouched.
 cityTick(p,dt,options={}){if(!this.isReference(p.id))super.cityTick(p,dt,options);}
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  const e=engine(this);mirrors(this,e);const elapsed=Math.min(dt,.25);
  super.tick(elapsed);e.tick(elapsed);flush(this,e);synchronize(this,e);
 }
 // Server/store-only outage catch-up, never exposed through /command.
 advanceQaDowntime(savedAt,now){
  const e=engine(this);mirrors(this,e);const result=advanceDowntime(this,savedAt,now);
  e.advanceOffline(result.elapsedSeconds);flush(this,e);synchronize(this,e);return result;
 }
 snapshot(viewerId=null){
  const e=engine(this);mirrors(this,e);const s=super.snapshot(viewerId);
  s.qaReferenceKingdom=true;s.qaLabel=label;
  const own=s.players.find(p=>p.id===viewerId),binding=this.qaReferenceState.bindings[viewerId];
  if(own&&binding){
   const city=e.snapshot(binding.token);
   own.referenceCity={...city,playerId:viewerId,label,
    reserves:Object.entries(city.units).map(([id,count])=>({id,count})),units:undefined,
    blockedActions:['Military deployment/capacity/combat/reinforcement','Cross-profile resource transfers','Normal research and reward systems','Reference alliance creation charge'],
    quarantinedLegacyTroops:own.troops+own.reserveTroops};
  }
  return s;
 }
 toSave(){
  const e=engine(this);mirrors(this,e);flush(this,e);
  return {format:QA_REFERENCE_FORMAT,qaOnly:true,normalActivation:false,worldSave:super.toSave(),reference:structuredClone(this.qaReferenceState)};
 }
 static fromSave(data,options){
  requireQa(data?.format===QA_REFERENCE_FORMAT&&data.qaOnly===true&&data.normalActivation===false,'Not an isolated QA reference kingdom; ordinary saves are never converted');
  const w=World.fromSave(data.worldSave,options);Object.setPrototypeOf(w,QaReferenceWorld.prototype);configure(w,options);
  w.qaReferenceState=structuredClone(data.reference);
  requireQa(w.qaReferenceState?.format===QA_REFERENCE_FORMAT&&w.qaReferenceState.bindings&&typeof w.qaReferenceState.bindings==='object','Missing QA binding metadata');
  requireQa(Number.isFinite(w.qaReferenceState.engine?.time)&&Math.abs(w.time-w.qaReferenceState.engine.time)<.00001,'QA World/city clock mismatch');
  const e=engine(w),seen=new Set();
  for(const [id,b]of Object.entries(w.qaReferenceState.bindings)){
   const p=w.players.get(id),s=e.snapshot(b.token);
   requireQa(p&&s.playerId===b.cityId&&s.name===p.name&&!seen.has(b.cityId),'Invalid or duplicated QA World identity binding');seen.add(b.cityId);
   requireQa(!p.target&&!p.deployed&&!p.marches.some(a=>a.target||a.deployed)&&!p.construction&&!p.secondConstruction&&!p.research&&!p.trainingQueue.length,'Reference QA city contains incompatible legacy military/jobs');
  }
  requireQa(seen.size===w.qaReferenceState.engine.players.length,'Orphan experimental city in QA save');
  mirrors(w,e);return w;
 }
}
