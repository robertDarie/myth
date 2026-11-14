import { economyRules, ECONOMY, refreshEconomy, economyTime } from './economy.mjs';
import { constructionJobs } from './progression.mjs';
export const ITEMS = [
  { id:'food-pack-100',name:'Harvest Satchel',kind:'resource',resource:'food',amount:100,description:'Open to add 100 food to your spendable stockpile.' },
  { id:'wood-pack-100',name:'Grove Supplies',kind:'resource',resource:'wood',amount:100,description:'Open to add 100 wood to your spendable stockpile.' },
  { id:'stone-pack-75',name:'Mason’s Crate',kind:'resource',resource:'stone',amount:75,description:'Open to add 75 stone to your spendable stockpile.' },
  { id:'gold-pack-50',name:'Sealed Crowns',kind:'resource',resource:'gold',amount:50,description:'Open to add 50 gold to your spendable stockpile.' },
  { id:'mana-pack-10',name:'Mana Phial',kind:'resource',resource:'mana',amount:10,description:'Open to add 10 mana to your spendable stockpile.' },
  { id:'build-minute',name:'Builder’s Hourglass',kind:'speedup',scope:'construction',seconds:60,description:'Remove up to 60 seconds from one construction job. Unused seconds are not refunded.' },
  { id:'universal-minute',name:'Echo of Haste',kind:'speedup',scope:'universal',seconds:60,description:'Remove up to 60 seconds from one active construction, research, training, crafting or healing job.' },
];
ITEMS.push(
 {id:'warden-echoes-10',name:'Warden Echo Shards',kind:'shards',resource:'warden',amount:10,description:'Add ten Warden Echo Shards. Recruit the Warden from the Commanders screen with ten matching shards.'},
 {id:'research-minute',name:'Scholar’s Hourglass',kind:'speedup',scope:'research',seconds:60,description:'Remove up to 60 seconds from one research job.'},
 {id:'training-minute',name:'Muster Hourglass',kind:'speedup',scope:'training',seconds:60,description:'Remove up to 60 seconds from the first active training batch.'},
 {id:'healing-minute',name:'Renewal Hourglass',kind:'speedup',scope:'healing',seconds:60,description:'Remove up to 60 seconds from active treatment.'},
 {id:'echo-sigil',name:'Sealed Oracle Sigil',kind:'summon',amount:1,description:'Unseal one Oracle Sigil for Temple summons. No commander or rarity is guaranteed.'},
 {id:'ap-tonic-20',name:'Pilgrim’s Tonic',kind:'energy',amount:20,description:'Restore 20 AP. Cannot exceed your AP cap; no item is consumed on overflow.'},
 {id:'attack-oath-10m',name:'Oath of Valor',kind:'buff',scope:'attack',amount:10,seconds:600,description:'+10% army attack for 10 real minutes, across all your marches. Same buff cannot stack or refresh while active.'},
 {id:'defense-oath-10m',name:'Oath of Shelter',kind:'buff',scope:'defense',amount:10,seconds:600,description:'10% less incoming damage for 10 real minutes, across all your marches. Multiplies existing mitigation; does not add health. Same buff cannot stack or refresh.'}
);
for(const item of ITEMS)item.category=item.kind==='resource'?'Resources':item.kind==='speedup'?'Speedups':(item.kind==='summon'||item.kind==='shards')?'Summons':item.kind==='energy'?'Energy':'Combat buffs';
export const INITIAL_SUPPLIES = { 'food-pack-100':2,'wood-pack-100':2,'stone-pack-75':1,'gold-pack-50':1,'mana-pack-10':1,'build-minute':1,'universal-minute':2,'echo-sigil':1,'ap-tonic-20':2,'attack-oath-10m':1,'defense-oath-10m':1 };
export function initializeInventory(p) { p.inventory={};p.suppliesClaimed=false; }
export function validateInventory(p) {
  if(!p.inventory||typeof p.inventory!=='object'||Array.isArray(p.inventory)||typeof p.suppliesClaimed!=='boolean'||Object.entries(p.inventory).some(([id,count])=>!ITEMS.some(i=>i.id===id)||!Number.isSafeInteger(count)||count<0||count>1000000))throw new Error('Invalid saved inventory.');
}
export function inventoryJobs(p) {
  return [...constructionJobs(p).map(job=>({job,lane:'construction'})),...[p.research,p.crafting,p.healing,p.trainingQueue[0]].filter(Boolean).map(job=>({job,lane:job===p.research?'research':job===p.crafting?'crafting':job===p.healing?'healing':'training'}))];
}
export function inventorySnapshot(p) {
  return { suppliesAvailable:!p.suppliesClaimed,items:ITEMS.map(i=>({...i,count:p.inventory[i.id]??0})),
    jobs:inventoryJobs(p).map(({job,lane})=>({id:job.id,lane,type:job.type,targetId:job.targetId??'',remaining:job.remaining})) };
}
export function inventoryCommand(w,p,c,fail) {
  if(c.type==='inventory-supplies') {
    if(p.suppliesClaimed)fail('Your founding supplies have already been claimed.');
    for(const [id,count] of Object.entries(INITIAL_SUPPLIES))if((p.inventory[id]??0)+count>1000000)fail('Inventory capacity exceeded.');
    for(const [id,count] of Object.entries(INITIAL_SUPPLIES))p.inventory[id]=(p.inventory[id]??0)+count;
    p.suppliesClaimed=true;return true;
  }
  if(c.type!=='inventory-use')return false;
  const item=ITEMS.find(i=>i.id===c.targetId),count=c.count??1;
  if(!item||!Number.isSafeInteger(count)||count<1||count>100)fail('Choose a known item and a whole quantity from 1 to 100.');
  if((p.inventory[item.id]??0)<count)fail('Not enough items in your inventory.');
  if(item.kind==='resource') {
    const balance=p[item.resource]+item.amount*count;
    if(!Number.isFinite(balance)||balance>Number.MAX_SAFE_INTEGER)fail('Resource balance limit reached.');
    p.inventory[item.id]-=count;p[item.resource]=balance;return true;
  }
  if(item.kind==='shards'){const value=(p.commanderShards[item.resource]??0)+item.amount*count;if(!Number.isSafeInteger(value))fail('Shard balance limit reached.');p.inventory[item.id]-=count;p.commanderShards[item.resource]=value;return true;}
  if(item.kind==='summon') {if(!Number.isSafeInteger(p.sigils+item.amount*count))fail('Sigil balance limit reached.');p.inventory[item.id]-=count;p.sigils+=item.amount*count;return true;}
  if(item.kind==='energy'){refreshEconomy(w,p);if(p.ap+item.amount*count>economyRules(p).apCap)fail('This tonic would exceed the AP cap.');p.inventory[item.id]-=count;p.ap+=item.amount*count;if(p.ap===economyRules(p).apCap)p.apRemainder=0;return true;}
  if(item.kind==='buff'){refreshEconomy(w,p);if(count!==1||p.buffs[item.scope]>economyTime(w))fail('Use one oath at a time; an active oath cannot stack or refresh.');p.inventory[item.id]--;p.buffs[item.scope]=economyTime(w)+item.seconds*1000;return true;}
  const entry=inventoryJobs(p).find(({job})=>job.id===c.jobId);
  if(!entry||entry.job.remaining<=.00001)fail('Choose a currently active job owned by this city.');
  if(item.scope!=='universal'&&entry.lane!==item.scope)fail('This hourglass is only for '+item.scope+'.');
  if(count>Math.ceil(entry.job.remaining/item.seconds))fail('Fewer items can finish this job. Reduce the quantity.');
  p.inventory[item.id]-=count;
  // Do not advance the entire city: other lanes receive no free progress.
  // The normal tick completes this single job, including after a restart.
  entry.job.remaining=Math.max(.00001,entry.job.remaining-item.seconds*count);
  return true;
}

export function grantReward(p,reward){
 const items=reward.items??{};
 for(const [id,count] of Object.entries(items))if(!ITEMS.some(i=>i.id===id)||!Number.isSafeInteger(count)||count<0||(p.inventory[id]??0)+count>1000000)throw new Error('Reward inventory capacity exceeded.');
 for(const [key,amount] of Object.entries(reward))if(key!=='items'&&(!['food','wood','stone','gold','mana','aether','sigils'].includes(key)||!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(p[key]+amount)))throw new Error('Reward balance limit reached.');
 for(const [key,amount] of Object.entries(reward))if(key!=='items')p[key]+=amount;
 for(const [id,count] of Object.entries(items))p.inventory[id]=(p.inventory[id]??0)+count;
}

export function rewardSnapshot(reward){return {...reward,itemRewards:Object.entries(reward.items??{}).map(([id,count])=>({id,count,name:ITEMS.find(i=>i.id===id)?.name??id}))};}
