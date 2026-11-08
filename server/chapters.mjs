import { grantReward, rewardSnapshot } from './inventory.mjs';
// Original opening campaign. Objectives observe server state; rewards never depend on client counts.
const task=(id,title,description,goal,guide,targetId,reward,read)=>({id,title,description,goal,guide,targetId,reward,read});
export const CHAPTERS=[
 {id:'embers',title:'I · From the Embers',story:'A city survives on full granaries and willing defenders. Restore the foundations before seeking the gods.',reward:{wood:100,food:100,gold:75,stone:50,aether:5,items:{'warden-echoes-10':1}},tasks:[
  task('gather-wood','Gather 40 wood','March to a Sacred Grove. Return your gathered wood home. Only delivered cargo counts; gifts and passive income do not.',40,'gather','wood',{food:40,gold:20},p=>p.journey.metrics.wood),
  task('gather-food','Gather 40 food','Gather from Harvest Fields, then return cargo home while your city continues working.',40,'gather','food',{wood:40,gold:20},p=>p.journey.metrics.food),
  task('train-ten','Train 10 mortal troops','Complete two training orders. Recruits wait in reserves and do not require your field army to return.',10,'training','infantry',{food:80,gold:40},p=>p.journey.metrics.trained)]},
 {id:'oaths',title:'II · The Age of Oaths',story:'Build for a growing people. A second construction crew lets your city develop while your armies explore.',reward:{wood:150,food:100,gold:100,stone:100},tasks:[
  task('citadel-two','Reach Citadel level 2','Advance to the Age of Oaths and unlock a second march slot.',2,'city','citadel',{wood:80,stone:50},p=>p.cityLevel),
  task('farm-two','Upgrade Blessed Fields to level 2','Strengthen passive food production for training and recovery.',2,'city','farm',{wood:50,gold:30},p=>p.buildings.farm),
  task('second-crew','Build the Lodge of the First Builders','Unlock your permanent second construction crew.',1,'city','builders',{stone:60,gold:40},p=>p.buildings.builders)]},
 {id:'echoes',title:'III · A Hero Answers',story:'The Temple of Echoes remembers fallen champions. Earn their allegiance and drive the Forsaken from the frontier.',reward:{stone:100,sigils:1,aether:5},legacyHero:true,tasks:[
  task('temple','Build the Temple of Echoes','Construct your temple. Offerings use earned sigils, with published odds and persistent guarantees.',1,'city','oracle',{sigils:1,gold:30},p=>p.buildings.oracle),
  task('first-echo','Make one Temple summon','Use an earned Oracle Sigil. Any result completes this objective; no rarity is required.',1,'temple','',{gold:50,food:50},p=>p.summonCount),
  task('forsaken','Defeat three Forsaken camps','Victories count across all your marches. The chapter reward includes guaranteed Epic Atalanta unless already claimed.',3,'combat','',{food:80,gold:50},p=>p.kills)]},
 {id:'veil',title:'IV · Beyond the Veil',story:'Knowledge is strength. Send a scout, remember the land and study how to supply a longer campaign.',reward:{wood:100,food:100,gold:100,stone:100,mana:10},tasks:[
  task('scout-survey','Complete a scouting survey','Reach a destination and receive its report. Recalling before arrival does not count.',1,'exploration','',{gold:50,stone:40},p=>p.journey.metrics.surveys),
  task('discover','Discover 50 land sectors','Explore with scouts or marches. Current allied vision helps uncover land; discovery stays remembered.',50,'exploration','',{food:80,wood:80},p=>p.explored.length),
  task('logistics','Research Pilgrim Logistics level 1','Build the Athenaeum of Ages, then improve gathering through research.',1,'research','logistics',{gold:50,stone:50},p=>p.technologies.logistics)]},
 {id:'banners',title:'V · Raise the Banners',story:'One army cannot be everywhere. Develop a commander, train your force and prepare a second independent march.',reward:{wood:100,food:150,gold:100,stone:80},tasks:[
  task('hero-two','Reach commander level 2','Gain 100 experience with one commander through camp victories or existing commander training.',2,'heroes','', {food:60,gold:60},p=>Math.max(1,...Object.values(p.heroRecords).map(h=>Math.min(h.stars*10,1+Math.floor(h.xp/100))))),
  task('drill','Research Heroic Formations level 1','Improve your armies through the military research branch.',1,'research','drill',{gold:50,food:80},p=>p.technologies.drill),
  task('two-marches','Deploy two marches','Train reserves and assign a second recruited commander. Each march keeps its own troops and orders.',2,'marches','',{food:100,gold:50},p=>1+p.marches.length)]},
 {id:'dawn',title:'VI · An Oath at Dawn',story:'Join your strength to others. Establish an alliance foothold and defend the sacred land you reclaim together.',reward:{wood:200,food:200,gold:150,stone:150,mana:20,sigils:2},tasks:[
  task('alliance','Join or found an alliance','An alliance shares vision and can build territory and capture sacred sites.',1,'alliance','',{wood:100,gold:50},p=>p.allianceId?1:0),
  task('oath-hall','Build the Oathbound Hall','Unlock alliance assistance and the institution required to lead rallies.',1,'city','oathhall',{stone:80,gold:50},p=>p.buildings.oathhall),
  task('shrine','Help your alliance hold a shrine','Connect completed territory to a neutral shrine and occupy it. An allied shrine held when you join also counts.',1,'territory','',{wood:100,food:100},(p,w)=>p.allianceId&&w.sites.some(s=>s.kind==='shrine'&&s.allianceId===p.allianceId)?1:0),
  task('first-garrison','Garrison an allied structure','Arrive at a completed allied fort, beacon or sacred site with your own march. Merely issuing the order does not count.',1,'warfare','',{gold:80,food:80},p=>p.journey.metrics.garrison)]}
];
export const TASKS=CHAPTERS.flatMap(c=>c.tasks);
export function initializeJourney(p,migrated=false){p.journey={metrics:{wood:0,food:0,trained:migrated?Math.max(0,p.troops+p.marches.reduce((n,a)=>n+a.troops,0)+p.reserveTroops+Object.values(p.wounded).reduce((n,v)=>n+v,0)+Object.values(p.healing?.units||{}).reduce((n,v)=>n+v,0)-20):0,surveys:migrated?p.scoutReports.length:0,garrison:0},progress:Object.fromEntries(TASKS.map(t=>[t.id,0])),claimed:[],chapters:[]};}
export function journeyMetric(p,key,amount){if(p.journey)p.journey.metrics[key]=Math.min(1_000_000_000,p.journey.metrics[key]+amount);}
export function refreshJourney(w,p){
 for(const t of TASKS)p.journey.progress[t.id]=Math.min(t.goal,Math.max(p.journey.progress[t.id],t.read(p,w)||0));
 if(w.armies().some(a=>w.owner(a).id===p.id&&a.state==='Garrisoned')){p.journey.metrics.garrison=1;p.journey.progress['first-garrison']=1;}
}
const activeChapter=p=>CHAPTERS.find(c=>!p.journey.chapters.includes(c.id));
export function legacyHeroReward(p,fail){
 if(p.questClaimed||p.kills<3){if(fail)fail('Defeat three camps to claim this reward once.');return false;}
 p.questClaimed=true;p.gold+=200;p.wood+=150;p.food+=150;if(!p.ownedCommanders.includes('atalanta'))p.ownedCommanders.push('atalanta');return true;
}
const grant=grantReward;
export function journeyCommand(w,p,c,fail){
 if(c.type!=='journey-claim'&&c.type!=='chapter-claim')return false;
 refreshJourney(w,p);const chapter=activeChapter(p);if(!chapter)fail('The opening campaign is already complete.');
 if(c.type==='journey-claim'){
  const t=chapter.tasks.find(t=>t.id===c.targetId);if(!t||p.journey.claimed.includes(t.id)||p.journey.progress[t.id]<t.goal)fail('That objective is locked, incomplete or already claimed.');
  grant(p,t.reward);p.journey.claimed.push(t.id);
 }else{
  if(c.targetId!==chapter.id||!chapter.tasks.every(t=>p.journey.claimed.includes(t.id)))fail('Claim every objective in this chapter first.');
  grant(p,chapter.reward);if(chapter.legacyHero)legacyHeroReward(p);p.journey.chapters.push(chapter.id);
 }
 return true;
}
export function journeySnapshot(w,p){
 const active=activeChapter(p);
 return {activeId:active?.id||'',complete:!active,chapters:CHAPTERS.map((c,index)=>{
  const claimed=p.journey.chapters.includes(c.id),locked=!!active&&index>CHAPTERS.indexOf(active),tasks=c.tasks.map(t=>({id:t.id,title:t.title,description:t.description,goal:t.goal,guide:t.guide,targetId:t.targetId,reward:rewardSnapshot(t.reward),progress:p.journey.progress[t.id],claimed:p.journey.claimed.includes(t.id),canClaim:c===active&&!p.journey.claimed.includes(t.id)&&p.journey.progress[t.id]>=t.goal}));
  const legacy=c.legacyHero&&!p.questClaimed;
  return {id:c.id,title:c.title,story:c.story,claimed,locked,tasks,reward:rewardSnapshot(legacy?{...c.reward,gold:200,wood:150,food:150}:c.reward),commanderReward:legacy?'atalanta':'',canClaim:c===active&&tasks.every(t=>t.claimed)};
 })};
}
export function validateJourney(p){
 const j=p.journey,keys=['wood','food','trained','surveys','garrison'];
 if(!j||!j.metrics||keys.some(k=>!Number.isSafeInteger(j.metrics[k])||j.metrics[k]<0||j.metrics[k]>1_000_000_000)||!j.progress||TASKS.some(t=>!Number.isSafeInteger(j.progress[t.id])||j.progress[t.id]<0||j.progress[t.id]>t.goal)||Object.keys(j.progress).length!==TASKS.length||!Array.isArray(j.claimed)||!Array.isArray(j.chapters)||new Set(j.claimed).size!==j.claimed.length||new Set(j.chapters).size!==j.chapters.length||j.chapters.length>CHAPTERS.length)throw new Error('Invalid saved journey.');
 if(j.chapters.some((id,i)=>id!==CHAPTERS[i].id)||j.claimed.some(id=>!TASKS.some(t=>t.id===id)||j.progress[id]!==TASKS.find(t=>t.id===id).goal)||j.claimed.some(id=>CHAPTERS.findIndex(c=>c.tasks.some(t=>t.id===id))>j.chapters.length)||CHAPTERS.slice(0,j.chapters.length).some(c=>!c.tasks.every(t=>j.claimed.includes(t.id))))throw new Error('Invalid saved chapter claims.');
}
