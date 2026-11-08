export const KINGDOM_STAGES=[
 {id:'foundations',name:'Embers Become Cities',description:'Gather 400 resources and train 10 mortal troops across the kingdom.',afterSeconds:0,minScore:1,reward:{wood:100,food:100,gold:50,stone:50}},
 {id:'gates',name:'The Divine Gates Awaken',description:'Defeat four camps and raise at least one Citadel to level 2. Opens both Divine Gates for contest.',afterSeconds:600,minScore:5,reward:{wood:150,food:150,gold:100,stone:100}},
 {id:'sanctuary',name:'The Road to the First Throne',description:'Defeat two strongholds and occupy both Divine Gates. Opens the First Sanctuary for contest.',afterSeconds:1800,minScore:10,reward:{gold:150,food:150,stone:150,mana:15,sigils:1}},
 {id:'secured',name:'An Oath Holds the Throne',description:'One alliance must hold the sanctuary continuously for five minutes.',afterSeconds:2100,minScore:15,reward:{gold:250,wood:200,food:200,mana:30,sigils:3}}
];
const KEYS=['gather','trained','camps','strongholds','development','scouts','helps'];
const zero=()=>Object.fromEntries(KEYS.map(k=>[k,0]));
export const contributionScore=c=>Math.floor(c.gather/100)+Math.floor(c.trained/5)+c.camps*2+c.strongholds*5+c.development+c.scouts+c.helps;
export function initializeKingdom(w,legacy=false){
 const now=w.activityClockMs;w.kingdom={startedAtMs:Math.max(0,Math.floor(now-(legacy?w.time*1000:0))),metrics:zero(),contributions:{},completed:[],holdAllianceId:'',holdSinceMs:0};
 for(const p of w.players.values())p.kingdomClaims=[];
 if(legacy){let opened=w.sites.some(s=>s.kind==='gate'&&s.allianceId)?2:0;if(w.sites.some(s=>s.kind==='sanctuary'&&s.allianceId))opened=3;
  w.kingdom.completed=KINGDOM_STAGES.slice(0,opened).map(s=>({id:s.id,atMs:now,legacy:true,eligible:[]}));}
}
export function recordKingdomContribution(w,p,key,amount){
 if(!w.kingdom||!KEYS.includes(key)||!Number.isSafeInteger(amount)||amount<=0)return;
 const k=w.kingdom;k.contributions[p.id]??=zero();k.contributions[p.id][key]=Math.min(1000000000,k.contributions[p.id][key]+amount);
 if(!['camps','strongholds'].includes(key))k.metrics[key]=Math.min(1000000000,k.metrics[key]+amount);
}
export function recordKingdomVictory(w,key){if(w.kingdom&&['camps','strongholds'].includes(key))w.kingdom.metrics[key]=Math.min(1000000000,w.kingdom.metrics[key]+1);}
export const siteIsOpen=(w,id)=>!['gate-east','gate-north','first-sanctuary'].includes(id)||w.kingdom.completed.some(s=>s.id===(id==='first-sanctuary'?'sanctuary':'gates'));
function goals(w,id){
 const k=w.kingdom,m=k.metrics;
 if(id==='foundations')return [{name:'Resources gathered',progress:m.gather,goal:400},{name:'Mortal troops trained',progress:m.trained,goal:10}];
 if(id==='gates')return [{name:'Camp victories',progress:m.camps,goal:4},{name:'Cities at Citadel 2+',progress:[...w.players.values()].filter(p=>p.cityLevel>=2).length,goal:1}];
 if(id==='sanctuary')return [{name:'Stronghold victories',progress:m.strongholds,goal:2},{name:'Divine Gates occupied',progress:w.sites.filter(s=>s.kind==='gate'&&s.allianceId).length,goal:2}];
 return [{name:'Continuous sanctuary hold (seconds)',progress:k.holdAllianceId?Math.max(0,Math.floor((w.activityClockMs-k.holdSinceMs)/1000)):0,goal:300}];
}
export function tickKingdom(w){
 const k=w.kingdom,now=w.activityClockMs,owner=w.sites.find(s=>s.kind==='sanctuary')?.allianceId||'';
 if(owner!==k.holdAllianceId){k.holdAllianceId=owner;k.holdSinceMs=owner?now:0;}
 for(const s of KINGDOM_STAGES){
  if(k.completed.some(c=>c.id===s.id))continue;
  if(now<k.startedAtMs+s.afterSeconds*1000||!goals(w,s.id).every(g=>g.progress>=g.goal))break;
  k.completed.push({id:s.id,atMs:now,legacy:false,eligible:Object.entries(k.contributions).filter(([id,c])=>w.players.has(id)&&contributionScore(c)>=s.minScore).map(([id])=>id)});
 }
}
export function kingdomCommand(w,p,c,fail){
 if(c.type!=='kingdom-claim')return false;tickKingdom(w);
 const s=KINGDOM_STAGES.find(s=>s.id===c.targetId),done=w.kingdom.completed.find(s=>s.id===c.targetId);
 if(!s||!done||!done.eligible.includes(p.id)||p.kingdomClaims.includes(s.id))fail('This kingdom reward is locked, already claimed, or you did not qualify before its completion.');
 for(const [key,n]of Object.entries(s.reward))p[key]+=n;p.kingdomClaims.push(s.id);return true;
}
export function kingdomSnapshot(w,p){
 tickKingdom(w);const k=w.kingdom,score=contributionScore(k.contributions[p.id]||zero());
 return {preset:'Local playtest · openings at 10 and 30 minutes',score,stages:KINGDOM_STAGES.map((s,index)=>{const done=k.completed.find(d=>d.id===s.id),previous=index===0||k.completed.some(d=>d.id===KINGDOM_STAGES[index-1].id),eligible=!!done?.eligible.includes(p.id);
  return {...s,goals:goals(w,s.id).map(g=>({...g,progress:Math.min(g.goal,g.progress)})),openInSeconds:Math.max(0,Math.ceil((k.startedAtMs+s.afterSeconds*1000-w.activityClockMs)/1000)),completed:!!done,legacy:!!done?.legacy,previousComplete:previous,eligible,claimed:p.kingdomClaims.includes(s.id),canClaim:eligible&&!p.kingdomClaims.includes(s.id)};
 })};
}
export function validateKingdom(w){
 const k=w.kingdom,integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000,validCounters=c=>c&&Object.keys(c).length===KEYS.length&&KEYS.every(key=>integer(c[key]));
 if(!k||!Number.isSafeInteger(k.startedAtMs)||k.startedAtMs<0||k.startedAtMs>w.activityClockMs||!validCounters(k.metrics)||!k.contributions||Array.isArray(k.contributions)||Object.keys(k.contributions).length>32||Object.entries(k.contributions).some(([id,c])=>!w.players.has(id)||!validCounters(c))||!Array.isArray(k.completed)||k.completed.length>4||typeof k.holdAllianceId!=='string'||(k.holdAllianceId&&!w.alliances.has(k.holdAllianceId))||!Number.isSafeInteger(k.holdSinceMs)||k.holdSinceMs<0||k.holdSinceMs>w.activityClockMs)throw new Error('Invalid saved kingdom milestones.');
 if(k.completed.some((c,i)=>!c||c.id!==KINGDOM_STAGES[i].id||typeof c.legacy!=='boolean'||!Number.isSafeInteger(c.atMs)||c.atMs<k.startedAtMs||c.atMs>w.activityClockMs||!Array.isArray(c.eligible)||new Set(c.eligible).size!==c.eligible.length||c.eligible.some(id=>!w.players.has(id))||(c.legacy&&c.eligible.length)||(!c.legacy&&(c.atMs<k.startedAtMs+KINGDOM_STAGES[i].afterSeconds*1000||c.eligible.some(id=>contributionScore(k.contributions[id]||zero())<KINGDOM_STAGES[i].minScore)))||(i>0&&c.atMs<k.completed[i-1].atMs)))throw new Error('Invalid saved kingdom completions.');
 for(const p of w.players.values())if(!Array.isArray(p.kingdomClaims)||new Set(p.kingdomClaims).size!==p.kingdomClaims.length||p.kingdomClaims.some(id=>!k.completed.some(c=>c.id===id&&c.eligible.includes(p.id))))throw new Error('Invalid saved kingdom claims.');
}
