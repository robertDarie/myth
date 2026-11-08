import { grantReward, rewardSnapshot } from './inventory.mjs';
import { recordKingdomContribution } from './kingdom.mjs';
const DAY=86400000,MAX_COUNTER=1000000000;
export const ACTIVITY_KEYS=['gather','food','trained','scouts','camps','distance','offering','helps','development','strongholds'];
const task=(id,title,description,key,goal,points,guide,targetId='')=>({id,title,description,key,goal,points,guide,targetId,reward:{gold:10}});
export const DAILY_TASKS=[
 task('gather','Supply the city','Gather 200 resources in the field. Passive income and rewards do not count.','gather',200,20,'gather','wood'),
 task('food','Fill the granaries','Gather 120 food from resource sites. This also contributes to Supply the city.','food',120,15,'gather','food'),
 task('train','Prepare the ranks','Complete training for 10 mortal troops. Canceled orders do not count.','trained',10,20,'training','infantry'),
 task('scout','Read the frontier','Complete one scouting survey and receive its report.','scouts',1,20,'exploration'),
 task('camps','Clear the roads','Take part in two Forsaken camp victories. Strongholds have their own task.','camps',2,20,'combat'),
 task('patrol','March through the realm','Move your armies 40 map units in total. Scouts and forced retreats do not count.','distance',40,20,'patrol'),
 task('offering','Hear an echo','Collect the free daily offering at the Temple of Echoes. No summon result or purchase is required.','offering',1,10,'temple'),
 task('help','Lend your strength','Successfully help two allied construction or research jobs.','helps',2,15,'alliance'),
 task('develop','Build for tomorrow','Finish one building, Citadel upgrade or research project. Queuing and cancellation do not count.','development',1,15,'city','citadel'),
 task('stronghold','Break the Godbreakers','Earn contribution credit in one victorious stronghold rally.','strongholds',1,25,'warfare')
];
export const ACTIVITY_CHESTS=[
 {id:'chest-20',points:20,reward:{wood:60,food:60,gold:30,items:{'training-minute':1}}},
 {id:'chest-40',points:40,reward:{stone:50,food:80,gold:40,items:{'research-minute':1,'healing-minute':1}}},
 {id:'chest-60',points:60,reward:{wood:100,food:100,gold:60,mana:5,aether:2,items:{'ap-tonic-20':1}}},
 {id:'chest-80',points:80,reward:{stone:100,gold:80,sigils:1}},
 {id:'chest-100',points:100,reward:{wood:150,food:150,gold:100,mana:10,aether:3,sigils:2,items:{'echo-sigil':1,'attack-oath-10m':1,'defense-oath-10m':1}}}
];
export const ALLIANCE_GOALS=[
 {id:'supply',title:'Provision the alliance',description:'Gather resources while a member of this alliance.',key:'gather',goal:1600,personal:100,guide:'gather',targetId:'wood',reward:{wood:200,food:200,gold:150,stone:100}},
 {id:'aid',title:'Many hands, one city',description:'Successfully help allied building and research jobs.',key:'helps',goal:8,personal:1,guide:'alliance',targetId:'',reward:{gold:120,wood:120,stone:80,mana:10}},
 {id:'strongholds',title:'Bring down their banners',description:'Earn stronghold-victory contribution credit while in this alliance. Each encounter counts once for shared progress, even with several contributors.',key:'strongholds',goal:3,personal:1,guide:'warfare',targetId:'',reward:{gold:200,food:200,mana:20,sigils:2}}
];
const date=day=>new Date(day*DAY).toISOString().slice(0,10);
const emptyDaily=day=>({day,counters:Object.fromEntries(ACTIVITY_KEYS.map(k=>[k,0])),claimed:[],chests:[]});
export function activityClock(w){
 const now=w.now();if(!Number.isFinite(now)||now<0||now>8640000000000000-DAY)throw new Error('Invalid activity clock.');
 w.activityClockMs=Math.max(w.activityClockMs||0,Math.floor(now));const day=Math.floor(w.activityClockMs/DAY);return {day,week:Math.floor((day+3)/7),now:w.activityClockMs};
}
export function initializeActivity(w,p){const {day,week}=activityClock(w);p.daily=emptyDaily(day);p.weeklyClaims={week,claimed:[]};}
export function ensureActivity(w,p){
 const time=activityClock(w);if(!p.daily||p.daily.day!==time.day)p.daily=emptyDaily(time.day);
 if(!p.weeklyClaims||p.weeklyClaims.week!==time.week)p.weeklyClaims={week:time.week,claimed:[]};return time;
}
function allianceWeek(w,a){const {week}=activityClock(w);if(!a.weekly||a.weekly.week!==week)a.weekly={week,contributions:{},strongholdEvents:[]};return a.weekly;}
const emptyContribution=()=>({gather:0,helps:0,strongholds:0});
export function recordActivity(w,p,key,amount){
 if(!ACTIVITY_KEYS.includes(key)||!Number.isFinite(amount)||amount<=0||(key!=='distance'&&!Number.isSafeInteger(amount)))return;ensureActivity(w,p);
 recordKingdomContribution(w,p,key,amount);
 p.daily.counters[key]=Math.min(MAX_COUNTER,p.daily.counters[key]+amount);
 if(['gather','helps'].includes(key)&&w.alliances.has(p.allianceId)){
  const data=allianceWeek(w,w.alliances.get(p.allianceId));data.contributions[p.id]??=emptyContribution();data.contributions[p.id][key]=Math.min(MAX_COUNTER,data.contributions[p.id][key]+amount);
 }
}
export function recordStrongholdActivity(w,report){
 if(report.activityCredited||!report.settled)return;report.activityCredited=true;
 const credited=new Set((report.rewards||[]).map(r=>r.playerId));
 for(const id of credited){const p=w.players.get(id);if(!p)continue;recordActivity(w,p,'strongholds',1);
  // Contribution is attributed to the alliance of the battle, only while still a member.
  if(p.allianceId!==report.attackingAllianceId||!w.alliances.has(p.allianceId))continue;
  const data=allianceWeek(w,w.alliances.get(p.allianceId));data.contributions[p.id]??=emptyContribution();data.contributions[p.id].strongholds=Math.min(MAX_COUNTER,data.contributions[p.id].strongholds+1);
 }
 if([...credited].some(id=>w.players.get(id)?.allianceId===report.attackingAllianceId)&&w.alliances.has(report.attackingAllianceId)){
  const data=allianceWeek(w,w.alliances.get(report.attackingAllianceId));if(!data.strongholdEvents.includes(report.id))data.strongholdEvents.push(report.id);
  // Only three distinct wins are needed; contribution counters continue for members.
  if(data.strongholdEvents.length>3)data.strongholdEvents.length=3;
 }
}
const score=p=>DAILY_TASKS.filter(t=>p.daily.claimed.includes(t.id)).reduce((n,t)=>n+t.points,0);
const progress=(p,t)=>Math.min(t.goal,Math.floor(p.daily.counters[t.key]+0.000001));
const total=(data,g)=>g.key==='strongholds'?data.strongholdEvents.length:Object.values(data.contributions).reduce((n,c)=>n+c[g.key],0);
const grant=grantReward;
export function activityCommand(w,p,c,fail){
 if(!['daily-claim','activity-chest','alliance-goal-claim'].includes(c.type))return false;
 const {day,week}=ensureActivity(w,p);
 if(c.type==='alliance-goal-claim'){
  const a=w.alliances.get(p.allianceId);if(!a||c.allianceId!==a.id||c.period!==date(week*7-3))fail('This alliance objective request is stale or belongs to another alliance.');
  const g=ALLIANCE_GOALS.find(g=>g.id===c.targetId),data=allianceWeek(w,a);if(!g||p.weeklyClaims.claimed.includes(g.id)||total(data,g)<g.goal||(data.contributions[p.id]?.[g.key]||0)<g.personal)fail('Meet the shared goal and personal contribution requirement; each goal pays once per week across alliances.');
  grant(p,g.reward);p.weeklyClaims.claimed.push(g.id);return true;
 }
 if(c.period!==date(day))fail('This daily reward request has expired. Refresh the activity screen.');
 if(c.type==='daily-claim'){
  const t=DAILY_TASKS.find(t=>t.id===c.targetId);if(!t||p.daily.claimed.includes(t.id)||progress(p,t)<t.goal)fail('This daily task is incomplete or already claimed.');
  grant(p,t.reward);p.daily.claimed.push(t.id);
 }else{
  const chest=ACTIVITY_CHESTS.find(t=>t.id===c.targetId);if(!chest||p.daily.chests.includes(chest.id)||score(p)<chest.points)fail('Earn enough claimed activity points; each chest opens once per day.');
  grant(p,chest.reward);p.daily.chests.push(chest.id);
 }
 return true;
}
export function activitySnapshot(w,p){
 const {day,week,now}=ensureActivity(w,p),points=score(p),a=w.alliances.get(p.allianceId);let alliance=null;
 if(a){const data=allianceWeek(w,a);alliance={id:a.id,name:a.name,period:date(week*7-3),resetSeconds:Math.ceil(((week+1)*7-3)*DAY/1000-now/1000),goals:ALLIANCE_GOALS.map(g=>({...g,reward:rewardSnapshot(g.reward),progress:Math.min(g.goal,total(data,g)),personalProgress:data.contributions[p.id]?.[g.key]||0,claimed:p.weeklyClaims.claimed.includes(g.id),canClaim:!p.weeklyClaims.claimed.includes(g.id)&&total(data,g)>=g.goal&&(data.contributions[p.id]?.[g.key]||0)>=g.personal})),members:Object.entries(data.contributions).map(([id,c])=>({id,name:w.players.get(id)?.name||'Former member',current:w.players.get(id)?.allianceId===a.id,...c}))};}
 return {daily:{period:date(day),resetSeconds:Math.ceil(((day+1)*DAY-now)/1000),points,maxChestPoints:100,tasks:DAILY_TASKS.map(t=>({...t,reward:rewardSnapshot(t.reward),progress:progress(p,t),claimed:p.daily.claimed.includes(t.id),canClaim:!p.daily.claimed.includes(t.id)&&progress(p,t)>=t.goal})),chests:ACTIVITY_CHESTS.map(c=>({...c,reward:rewardSnapshot(c.reward),claimed:p.daily.chests.includes(c.id),canClaim:!p.daily.chests.includes(c.id)&&points>=c.points}))},alliance};
}
export function validateActivity(w){
 if(!Number.isSafeInteger(w.activityClockMs)||w.activityClockMs<0||w.activityClockMs>8640000000000000-DAY)throw new Error('Invalid saved activity clock.');
 const day=Math.floor(w.activityClockMs/DAY),week=Math.floor((day+3)/7),integer=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_COUNTER;
 const validList=(a,ids)=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(id=>ids.includes(id));
 for(const p of w.players.values()){
  const d=p.daily,c=p.weeklyClaims;
  if(!d||!integer(d.day)||d.day>day||!d.counters||Object.keys(d.counters).length!==ACTIVITY_KEYS.length||ACTIVITY_KEYS.some(k=>!Number.isFinite(d.counters[k])||d.counters[k]<0||d.counters[k]>MAX_COUNTER||(k!=='distance'&&!Number.isSafeInteger(d.counters[k])))||!validList(d.claimed,DAILY_TASKS.map(t=>t.id))||!validList(d.chests,ACTIVITY_CHESTS.map(c=>c.id))||d.claimed.some(id=>{const t=DAILY_TASKS.find(t=>t.id===id);return progress(p,t)<t.goal;})||d.chests.some(id=>score(p)<ACTIVITY_CHESTS.find(c=>c.id===id).points)||!c||!integer(c.week)||c.week>week||!validList(c.claimed,ALLIANCE_GOALS.map(g=>g.id)))throw new Error('Invalid saved daily activity or reward claims.');
 }
 for(const a of w.alliances.values()){
  const data=a.weekly;if(data===undefined)continue;
  if(!data||!integer(data.week)||data.week>week||!data.contributions||typeof data.contributions!=='object'||Array.isArray(data.contributions)||Object.keys(data.contributions).length>32||!validList(data.strongholdEvents,data.strongholdEvents)||data.strongholdEvents.length>3||data.strongholdEvents.some(id=>typeof id!=='string')||Object.entries(data.contributions).some(([id,c])=>!w.players.has(id)||!c||Object.keys(c).length!==3||!['gather','helps','strongholds'].every(k=>integer(c[k]))))throw new Error('Invalid saved alliance activity.');
 }
}
