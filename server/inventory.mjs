import { constructionJobs } from './progression.mjs';
export const ITEMS = [
  { id:'food-pack-100',name:'Harvest Satchel',kind:'resource',resource:'food',amount:100,description:'Open to add 100 food to your spendable stockpile.' },
  { id:'wood-pack-100',name:'Grove Supplies',kind:'resource',resource:'wood',amount:100,description:'Open to add 100 wood to your spendable stockpile.' },
  { id:'stone-pack-75',name:'Mason’s Crate',kind:'resource',resource:'stone',amount:75,description:'Open to add 75 stone to your spendable stockpile.' },
  { id:'gold-pack-50',name:'Sealed Crowns',kind:'resource',resource:'gold',amount:50,description:'Open to add 50 gold to your spendable stockpile.' },
  { id:'aether-pack-10',name:'Aether Phial',kind:'resource',resource:'aether',amount:10,description:'Open to add 10 aether to your spendable stockpile.' },
  { id:'build-minute',name:'Builder’s Hourglass',kind:'speedup',scope:'construction',seconds:60,description:'Remove up to 60 seconds from one construction job. Unused seconds are not refunded.' },
  { id:'universal-minute',name:'Echo of Haste',kind:'speedup',scope:'universal',seconds:60,description:'Remove up to 60 seconds from one active construction, research, training, crafting or healing job.' },
];
export const INITIAL_SUPPLIES = { 'food-pack-100':2,'wood-pack-100':2,'stone-pack-75':1,'gold-pack-50':1,'aether-pack-10':1,'build-minute':1,'universal-minute':2 };
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
  const entry=inventoryJobs(p).find(({job})=>job.id===c.jobId);
  if(!entry||entry.job.remaining<=0)fail('Choose a currently active job owned by this city.');
  if(item.scope!=='universal'&&entry.lane!==item.scope)fail('This hourglass is only for construction.');
  if(count>Math.ceil(entry.job.remaining/item.seconds))fail('Fewer items can finish this job. Reduce the quantity.');
  p.inventory[item.id]-=count;
  // Do not advance the entire city: other lanes receive no free progress.
  // The normal tick completes this single job, including after a restart.
  entry.job.remaining=Math.max(.00001,entry.job.remaining-item.seconds*count);
  return true;
}
