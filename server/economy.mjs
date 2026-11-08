import { randomUUID } from 'node:crypto';
import { activityClock } from './activity.mjs';
import { COMMANDERS } from './content.mjs';
import { ensureHero } from './progression.mjs';
import { RESOURCES } from './city-content.mjs';
import { coreReport } from './field-logistics.mjs';
export const ECONOMY={version:2,apCap:100,apIntervalMs:60000,campAP:5,strongholdAP:10,tradeTax:.1,tradeDailyLimit:3000,shardRecruit:10,buffPercent:.1,buffSeconds:600};
export const economyTime=w=>activityClock(w).now;
export function initializeEconomy(w,p){const now=economyTime(w);p.aether=0;p.ap=ECONOMY.apCap;p.apUpdated=now;p.apRemainder=0;p.campPasses={};p.tradeDay=Math.floor(now/86400000);p.tradeSent=0;p.tradeSequence=0;p.tradeReceipts=[];p.buffs={attack:0,defense:0};}
export function refreshEconomy(w,p){
 const now=economyTime(w),elapsed=Math.max(0,now-p.apUpdated);p.apUpdated=Math.max(now,p.apUpdated);
 if(p.ap>=ECONOMY.apCap)p.apRemainder=0;
 else {const ms=p.apRemainder+elapsed,gain=Math.floor(ms/ECONOMY.apIntervalMs);p.ap=Math.min(ECONOMY.apCap,p.ap+gain);p.apRemainder=p.ap===ECONOMY.apCap?0:ms%ECONOMY.apIntervalMs;}
 const day=Math.floor(now/86400000);if(day>p.tradeDay){p.tradeDay=day;p.tradeSent=0;}
 for(const kind of ['attack','defense'])if(p.buffs[kind]&&p.buffs[kind]<=now)p.buffs[kind]=0;
}
export function economySnapshot(w,p){refreshEconomy(w,p);return {rules:ECONOMY,ap:p.ap,apCap:ECONOMY.apCap,nextAPSeconds:p.ap>=ECONOMY.apCap?0:Math.ceil((ECONOMY.apIntervalMs-p.apRemainder)/1000),fullAPSeconds:p.ap>=ECONOMY.apCap?0:Math.ceil(((ECONOMY.apCap-p.ap)*ECONOMY.apIntervalMs-p.apRemainder)/1000),nextTransfer:p.tradeSequence+1,tradeRemaining:ECONOMY.tradeDailyLimit-p.tradeSent,tradeResetSeconds:Math.ceil(((p.tradeDay+1)*86400000-economyTime(w))/1000),buffs:['attack','defense'].map(kind=>({kind,percent:ECONOMY.buffPercent,remaining:Math.max(0,Math.ceil((p.buffs[kind]-economyTime(w))/1000))})),members:[...w.players.values()].filter(q=>q.id!==p.id&&p.allianceId&&q.allianceId===p.allianceId).map(q=>({id:q.id,name:q.name})),transfers:p.tradeReceipts};}
export function campAdmission(w,p,camp){
 refreshEconomy(w,p);if(p.campPasses[camp.id]===camp.cycle)return true;if(p.ap<ECONOMY.campAP)return false;
 p.ap-=ECONOMY.campAP;p.campPasses[camp.id]=camp.cycle;w.logisticsRevision++;return true;
}
export function economyCommand(w,p,c,fail){
 if(c.type==='unlock-commander')fail('Recruit commanders through the Temple, earned progression or ten matching Echo Shards.');
 if(c.type==='recruit-shards'){
  if(!COMMANDERS.some(h=>h.id===c.targetId)||p.ownedCommanders.includes(c.targetId))fail('Choose an unowned commander.');
  if((p.commanderShards[c.targetId]??0)<ECONOMY.shardRecruit)fail('Ten matching Echo Shards are required.');
  p.commanderShards[c.targetId]-=ECONOMY.shardRecruit;p.ownedCommanders.push(c.targetId);ensureHero(p,c.targetId);return true;
 }
 if(c.type==='premium-sigil'){
  if(!p.buildings.oracle)fail('Build the Temple of Echoes first.');if(p.aether<10)fail('Ten premium Aether are required.');if(!Number.isSafeInteger(p.sigils+1))fail('Sigil balance limit reached.');
  p.aether-=10;p.sigils++;return true;
 }
 if(c.type==='trade')fail('Self-exchanges are closed. Send resources to an alliance member at the Agora.');
 if(c.type!=='resource-transfer')return false;
 refreshEconomy(w,p);const receiver=w.players.get(c.targetId),amount=c.count,resource=c.name,key=c.jobId;
 if(!p.buildings.market)fail('Build the Agora of Fates first.');
 if(!receiver||receiver.id===p.id||!p.allianceId||receiver.allianceId!==p.allianceId)fail('Choose another current alliance member.');
 if(!RESOURCES.includes(resource)||!Number.isSafeInteger(amount)||amount<1||amount>ECONOMY.tradeDailyLimit)fail('Choose an ordinary resource and a positive whole amount within the limit.');
 if(typeof key!=='string'||!/^([1-9][0-9]*)-[A-Za-z0-9-]{8,60}$/.test(key))fail('A unique transfer request ID is required.');
 // Retained IDs survive session changes; reject conflict or replay without a second debit.
 const previous=p.tradeReceipts.find(r=>r.requestId===key);if(previous){if(previous.recipientId!==receiver.id||previous.resource!==resource||previous.amount!==amount)fail('This transfer ID already describes a different transfer.');return true;}
 const sequence=Number(key.split('-')[0]);if(!Number.isSafeInteger(sequence)||sequence!==p.tradeSequence+1)fail('Stale transfer sequence. Refresh the Agora before sending again.');
 const tax=Math.ceil(amount*ECONOMY.tradeTax),cost=amount+tax;
 if(p.tradeSent+amount>ECONOMY.tradeDailyLimit)fail('Daily sending limit reached.');if(p[resource]<cost)fail('Insufficient resources including transport tax.');if(!Number.isSafeInteger(receiver[resource]+amount))fail('Recipient resource balance limit reached.');
 const id=randomUUID(),record={id,requestId:key,senderId:p.id,senderName:p.name,recipientId:receiver.id,recipientName:receiver.name,resource,amount,tax,time:w.time,day:p.tradeDay};
 p[resource]-=cost;receiver[resource]+=amount;p.tradeSent+=amount;p.tradeSequence=sequence;p.tradeReceipts.unshift(record);p.tradeReceipts.length=Math.min(100,p.tradeReceipts.length);
 const resources=Object.fromEntries(RESOURCES.map(k=>[k,k===resource?amount:0]));
 coreReport(w,p,{id,type:'trade',title:'Resources sent to '+receiver.name,detail:amount+' '+resource+' delivered; '+tax+' transport tax paid.',resources});coreReport(w,receiver,{id,type:'trade',title:'Resources received from '+p.name,detail:amount+' '+resource+' received. Sender paid '+tax+' tax.',resources});return true;
}
export function validateEconomy(w,p){
 const now=economyTime(w),int=n=>Number.isSafeInteger(n)&&n>=0;
 if(!RESOURCES.every(k=>int(p[k]))||!int(p.sigils)||!int(p.tradeSequence)||!int(p.aether)||!int(p.ap)||p.ap>ECONOMY.apCap||!int(p.apUpdated)||p.apUpdated>now||!int(p.apRemainder)||p.apRemainder>=ECONOMY.apIntervalMs||!int(p.tradeDay)||p.tradeDay>Math.floor(now/86400000)||!int(p.tradeSent)||p.tradeSent>ECONOMY.tradeDailyLimit)throw new Error('Invalid saved economy balances or clocks.');
 if(!p.campPasses||typeof p.campPasses!=='object'||Array.isArray(p.campPasses)||Object.keys(p.campPasses).length>30||Object.entries(p.campPasses).some(([id,cycle])=>!w.camps.some(c=>c.id===id)||!int(cycle)||cycle<1))throw new Error('Invalid saved PvE entitlements.');
 if(!p.buffs||Object.keys(p.buffs).length!==2||!['attack','defense'].every(k=>int(p.buffs[k])&&p.buffs[k]<=now+ECONOMY.buffSeconds*1000))throw new Error('Invalid saved timed buffs.');
 if(!Array.isArray(p.tradeReceipts)||p.tradeSequence<p.tradeReceipts.length||p.tradeReceipts.length>100||new Set(p.tradeReceipts.map(r=>r.requestId)).size!==p.tradeReceipts.length||p.tradeReceipts.some((r,index)=>!r||typeof r.requestId!=='string'||!/^([1-9][0-9]*)-[A-Za-z0-9-]{8,60}$/.test(r.requestId)||Number(r.requestId.split('-')[0])!==p.tradeSequence-index||typeof r.senderName!=='string'||typeof r.recipientName!=='string'||r.day>p.tradeDay||typeof r.id!=='string'||r.senderId!==p.id||typeof r.recipientId!=='string'||!RESOURCES.includes(r.resource)||!int(r.amount)||r.amount<1||!int(r.tax)||r.tax!==Math.ceil(r.amount*ECONOMY.tradeTax)||!int(r.day)||!Number.isFinite(r.time)||r.time<0))throw new Error('Invalid saved transfer history.');
}
// Convert economic containers, keeping immutable originals of historical reports.
export function migrateEconomy(data){
 const copy=structuredClone(data);if(!copy?.world||!Array.isArray(copy.world.players))throw new Error('Unsupported or damaged save format.');if(copy.schema>=15)return copy;
 const reports=[];for(const p of copy.world.players)for(const key of ['coreReports','battleReports','groupReports','scoutReports'])for(const r of p[key]??[])reports.push([r,structuredClone(r)]);
 function convert(value){if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){
   if(key==='aether'){if(value.mana!==undefined&&value.aether!==0)throw new Error('Ambiguous legacy currency values.');value.mana??=value[key];delete value[key];}
   else if(key==='aether-pack-10'){if(value['mana-pack-10']!==undefined)throw new Error('Ambiguous legacy inventory pack.');value['mana-pack-10']=value[key];delete value[key];}
   else if(key==='resource'&&value[key]==='aether')value[key]='mana';
   else convert(value[key]);
 }}convert(copy.world);
 for(const [r,original] of reports){r.legacyEconomy=original;r.currencyNote='Legacy earned Aether is ordinary Mana; historical original retained.';}
 for(const c of copy.world.camps)c.cycle??=1;
 return copy;
}
