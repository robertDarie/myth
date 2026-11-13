import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {World} from './world.mjs';
import {ECONOMY,refreshEconomy,economySnapshot} from './economy.mjs';
import {ITEMS} from './inventory.mjs';
import {RESOURCES} from './city-content.mjs';
import {activitySnapshot,recordActivity} from './activity.mjs';
import {advanceDowntime} from './downtime.mjs';
import {KingdomDatabase} from './database.mjs';
import {closeHttpServer,tempDirectory} from './testing/cleanup.mjs';
const date=Date.UTC(2026,10,8,12);
const setup=()=>{let now=date;const w=new World({now:()=>now}),session=w.join('Economy');return {w,p:w.authenticate(session.token),session,setNow:n=>now=n};};
const command=(w,p,type,extra={})=>w.command(p,{type,...extra});
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(.1);};
const reload=(w,session,now=date)=>{const next=World.fromSave(w.toSave(),{now:()=>now});return {w:next,p:next.authenticate(session.token)};};
const oldSave=()=>JSON.parse(readFileSync(new URL('./testing/fixtures/economy-schema14.json',import.meta.url),'utf8'));
function traders(){const e=setup(),{w,p}=e,q=w.authenticate(w.join('Recipient').token);p.gold=1000;p.wood=10000;p.cityLevel=2;p.buildings.market=1;command(w,p,'alliance-create',{name:'Trade guild'});command(w,q,'alliance-join',{targetId:p.allianceId});return {...e,q};}
const transfer=(w,p,q,count=100,key='1-transfer-unique-0001',name='wood')=>command(w,p,'resource-transfer',{targetId:q.id,count,name,jobId:key});

test('real schema 14 fixture converts all spendable containers, paid jobs and cargo while preserving immutable report originals',()=>{
 const original=oldSave(),before=original.world.players[0],w=World.fromSave(original,{now:()=>date}),p=[...w.players.values()][0];
 assert.equal(w.toSave().schema,21);assert.equal(p.mana,before.aether);assert.equal(p.aether,0);assert.equal(p.cargo.mana,before.cargo.aether);assert.equal(p.cargoSources[0].resource,'mana');
 assert.deepEqual(p.ownedCommanders,before.ownedCommanders);const expectedHeroes=structuredClone(before.heroRecords);for(const hero of Object.values(expectedHeroes))hero.talents={};assert.deepEqual(p.heroRecords,expectedHeroes);assert.deepEqual(p.commanderShards,before.commanderShards);assert.deepEqual(p.commanderRanks,before.commanderRanks);assert.deepEqual(p.journey,before.journey);assert.equal(p.suppliesClaimed,true);assert.equal(p.inventory['mana-pack-10'],before.inventory['aether-pack-10']);assert.equal(p.inventory['aether-pack-10'],undefined);
 for(const lane of ['construction','research','crafting']){assert.equal(p[lane].remaining,before[lane].remaining);assert.equal(p[lane].id,before[lane].id);if(before[lane].cost.aether)assert.equal(p[lane].cost.mana,before[lane].cost.aether);}
 assert.deepEqual(p.coreReports[0].legacyEconomy,before.coreReports[0]);assert.equal(p.coreReports[0].resources.mana,10);assert.match(p.coreReports[0].currencyNote,/Legacy/);
 const current=World.fromSave(w.toSave(),{now:()=>date}),again=[...current.players.values()][0];assert.equal(again.mana,p.mana);assert.equal(again.ap,100);assert.deepEqual(again.coreReports[0].legacyEconomy,before.coreReports[0]);assert.equal(original.world.players[0].aether,before.aether);
});
test('migrated queued refunds, sealed packs and cargo delivery become Mana without any premium credit',()=>{
 const source=oldSave(),w=World.fromSave(source,{now:()=>date}),p=[...w.players.values()][0],initial=p.mana,cargo=p.cargo.mana,refund=p.research.cost.mana+p.crafting.cost.mana;
 command(w,p,'cancel-job',{targetId:p.construction.id});command(w,p,'cancel-job',{targetId:p.research.id});command(w,p,'cancel-job',{targetId:p.crafting.id});command(w,p,'inventory-use',{targetId:'mana-pack-10'});assert.equal(p.mana,initial+refund+10);assert.equal(p.aether,0);
 advance(w,40);assert.equal(p.cargo.mana,0);assert.equal(p.mana,initial+refund+10+cargo);assert.equal(p.aether,0);assert.equal(p.coreReports.filter(r=>r.type==='gathering'&&r.outcome==='Delivered').length,2);
});
test('ambiguous legacy currencies and malformed current balances, clocks, passes, buffs and transfer ledgers are rejected',()=>{
 const ambiguous=oldSave();ambiguous.world.players[0].mana=1;assert.throws(()=>World.fromSave(ambiguous),/Ambiguous/);
 const {w}=setup();for(const mutate of[p=>p.aether=-1,p=>p.ap=101,p=>p.apRemainder=60000,p=>p.apUpdated=date+1,p=>p.buffs.attack=date+601000,p=>p.tradeSequence=-1,p=>p.tradeSent=3001,p=>p.campPasses.fake=1,p=>p.tradeReceipts=[{}]]){const bad=structuredClone(w.toSave());mutate(bad.world.players[0]);assert.throws(()=>World.fromSave(bad,{now:()=>date}),/saved/);}
});
test('ordinary production and Mana packs never mint premium Aether or fund premium sigils',()=>{
 const {w,p}=setup();p.cityLevel=2;p.buildings.well=1;const mana=p.mana;advance(w,10);assert.ok(p.mana>mana);assert.equal(p.aether,0);command(w,p,'inventory-supplies');command(w,p,'inventory-use',{targetId:'mana-pack-10'});assert.equal(p.aether,0);assert.throws(()=>command(w,p,'premium-sigil'),/Temple/);p.buildings.oracle=1;assert.throws(()=>command(w,p,'premium-sigil'),/Ten/);
 assert.ok(RESOURCES.includes('mana')&&!RESOURCES.includes('aether'));assert.ok(!ITEMS.some(i=>i.resource==='aether'));
});
test('AP regenerates exactly from monotonic wall time with fractional remainder, cap and restart continuity',()=>{
 const {w,p,session,setNow}=setup();p.ap=80;setNow(date+59999);refreshEconomy(w,p);assert.equal(p.ap,80);assert.equal(p.apRemainder,59999);setNow(date+60000);refreshEconomy(w,p);assert.equal(p.ap,81);assert.equal(p.apRemainder,0);
 const {w:next,p:q}=reload(w,session,date+90000);refreshEconomy(next,q);assert.equal(q.ap,81);assert.equal(q.apRemainder,30000);next.now=()=>date+30000;refreshEconomy(next,q);assert.equal(q.ap,81);assert.equal(q.apRemainder,30000);
 next.now=()=>date+10000000;refreshEconomy(next,q);assert.equal(q.ap,100);assert.equal(q.apRemainder,0);q.ap-=5;refreshEconomy(next,q);assert.equal(q.ap,95);assert.equal(economySnapshot(next,q).nextAPSeconds,60);
});
test('downtime regenerates AP and expires timed buffs without inventing encounters or premium rewards',()=>{
 const {w,p}=setup();p.ap=20;p.buffs.attack=date+600000;const gold=p.gold;advanceDowntime(w,date,date+3600000);assert.equal(p.ap,80);assert.equal(p.buffs.attack,0);assert.equal(p.kills,0);assert.equal(p.aether,0);assert.equal(p.gold,gold);
});
test('camp AP is charged at actual contact once per city per generation, including stop/rejoin and restart',()=>{
 let {w,p,session}=setup();const camp=w.camps[0];command(w,p,'move',{x:camp.x-5,z:camp.z});advance(w,5);command(w,p,'attack',{targetId:camp.id});assert.equal(p.ap,100);advance(w,.3);assert.equal(p.ap,100);advance(w,2);assert.equal(p.ap,95);command(w,p,'stop');command(w,p,'attack',{targetId:camp.id});w.tick(.1);assert.equal(p.ap,95);
 ({w,p}=reload(w,session));command(w,p,'attack',{targetId:camp.id});advance(w,1);assert.equal(p.ap,95);assert.ok(p.campPasses[camp.id]>=1);
});
test('unaffordable camp contact and invalid targets neither spend AP nor start damage; free activities remain free',()=>{
 const {w,p}=setup();p.ap=0;const camp=w.camps[0];p.x=camp.x;p.z=camp.z;const health=camp.health;command(w,p,'attack',{targetId:camp.id});w.tick(.1);assert.equal(camp.health,health);assert.equal(p.ap,0);assert.equal(p.state,'Not enough AP');assert.throws(()=>command(w,p,'attack',{targetId:'fake'}));assert.equal(p.ap,0);
 command(w,p,'return');advance(w,10);command(w,p,'scout-send',{x:20,z:20});command(w,p,'gather',{targetId:w.nodes[0].id});advance(w,3);command(w,p,'return');advance(w,10);assert.equal(p.ap,0);assert.equal(p.kills,0);
});
test('camp respawn starts a new AP entitlement; multiple own formations share the city entitlement',()=>{
 const {w,p}=setup();p.cityLevel=2;p.ownedCommanders.push('warden');p.reserveTroops=2;p.reserveUnits.infantry=2;command(w,p,'deploy-march',{targetId:'warden',troops:2});const a=p.marches[0],camp=w.camps[0];for(const actor of[p,a]){actor.x=camp.x;actor.z=camp.z;command(w,p,'attack',{targetId:camp.id,marchId:actor.id});}w.tick(.1);assert.equal(p.ap,95);advance(w,10);assert.equal(camp.health,0);advance(w,46);assert.equal(camp.cycle,2);command(w,p,'attack',{targetId:camp.id});w.tick(.1);assert.equal(p.ap,90);
});
test('commander assignment cannot acquire heroes with gold; shards, earned items, Temple and duplicate shards use existing progression',()=>{
 const {w,p}=setup();p.gold=10000;assert.throws(()=>command(w,p,'unlock-commander',{targetId:'heracles'}),/Recruit/);assert.throws(()=>command(w,p,'commander',{targetId:'heracles'}),/Acquire/);assert.equal(p.gold,10000);
 p.inventory['warden-echoes-10']=1;command(w,p,'inventory-use',{targetId:'warden-echoes-10'});command(w,p,'recruit-shards',{targetId:'warden'});assert.equal(p.commanderShards.warden,0);assert.ok(p.ownedCommanders.includes('warden'));assert.throws(()=>command(w,p,'recruit-shards',{targetId:'warden'}),/unowned/);command(w,p,'commander',{targetId:'warden'});assert.equal(p.gold,10000);
 p.buildings.oracle=1;w.random=()=>.5;w.chooseIndex=()=>0;p.sigils=1;const summonCount=p.summonCount;command(w,p,'summon',{count:1});assert.equal(p.summonCount,summonCount+1);assert.equal(p.gold,10000);assert.throws(()=>command(w,p,'buy-sigil'),/closed/);
});
test('stored summon items and energy tonics are exact, capped and cannot replay consumption',()=>{
 const {w,p}=setup();command(w,p,'inventory-supplies');const sigils=p.sigils;command(w,p,'inventory-use',{targetId:'echo-sigil'});assert.equal(p.sigils,sigils+1);assert.throws(()=>command(w,p,'inventory-use',{targetId:'echo-sigil'}),/Not enough/);
 const count=p.inventory['ap-tonic-20'];assert.throws(()=>command(w,p,'inventory-use',{targetId:'ap-tonic-20'}),/cap/);assert.equal(p.inventory['ap-tonic-20'],count);p.ap=75;command(w,p,'inventory-use',{targetId:'ap-tonic-20'});assert.equal(p.ap,95);assert.equal(p.inventory['ap-tonic-20'],count-1);assert.throws(()=>command(w,p,'inventory-use',{targetId:'ap-tonic-20'}),/cap/);
});
test('attack and defense oaths have real authoritative effects, reject stacking/refresh, persist and expire exactly',()=>{
 const {w,p,session,setNow}=setup();command(w,p,'inventory-supplies');const damage=w.stats(p).damage,mitigation=w.stats(p).mitigation;
 command(w,p,'inventory-use',{targetId:'attack-oath-10m'});assert.ok(Math.abs(w.stats(p).damage-damage*1.1)<.0001);p.inventory['attack-oath-10m']=1;assert.throws(()=>command(w,p,'inventory-use',{targetId:'attack-oath-10m'}),/stack/);assert.equal(p.inventory['attack-oath-10m'],1);
 command(w,p,'inventory-use',{targetId:'defense-oath-10m'});assert.ok(Math.abs(w.stats(p).mitigation-(1-(1-mitigation)*.9))<.0001);const restored=reload(w,session,date+300000);assert.equal(economySnapshot(restored.w,restored.p).buffs[0].remaining,300);assert.ok(restored.w.stats(restored.p).damage>damage);
 setNow(date+600000);refreshEconomy(w,p);assert.equal(w.stats(p).damage,damage);assert.equal(w.stats(p).mitigation,mitigation);assert.equal(p.buffs.attack,0);
});
test('premium Aether is authored, bounded by daily/chapter claim ledgers, never retroactively repaid or gold-purchasable',()=>{
 const {w,p,session}=setup();for(const [key,n]of[['gather',200],['food',120],['trained',10],['scouts',1],['camps',2],['distance',40],['offering',1],['development',1]])recordActivity(w,p,key,n);
 let daily=activitySnapshot(w,p).daily;for(const task of daily.tasks.filter(t=>t.canClaim))command(w,p,'daily-claim',{targetId:task.id,period:daily.period});daily=activitySnapshot(w,p).daily;
 for(const chest of daily.chests.filter(c=>c.canClaim))command(w,p,'activity-chest',{targetId:chest.id,period:daily.period});assert.equal(p.aether,5);assert.ok(p.inventory['ap-tonic-20']>=1);assert.ok(p.inventory['echo-sigil']>=1);assert.equal(p.inventory['training-minute'],1);assert.equal(p.inventory['research-minute'],1);assert.equal(p.inventory['healing-minute'],1);
 const restored=reload(w,session);assert.equal(restored.p.aether,5);assert.throws(()=>command(restored.w,restored.p,'activity-chest',{targetId:'chest-100',period:daily.period}),/once/);assert.equal(restored.p.aether,5);
});
test('alliance transfers conserve resource plus tax and produce private durable reports',()=>{
 const {w,p,q,session}=traders(),wood=p.wood+q.wood,received=q.wood;transfer(w,p,q);assert.equal(q.wood,received+100);assert.equal(p.wood+q.wood,wood-10);assert.equal(p.tradeSent,100);assert.equal(p.tradeSequence,1);transfer(w,p,q);assert.equal(q.wood,received+100);
 const a=w.snapshot(p.id).players.find(a=>a.id===p.id),b=w.snapshot(q.id).players.find(a=>a.id===q.id);assert.ok(a.reports.some(r=>r.type==='trade'));assert.ok(b.reports.some(r=>r.type==='trade'));const outsider=w.authenticate(w.join('Outsider').token);assert.equal(w.snapshot(outsider.id).players.find(a=>a.id===p.id).tradeReceipts,undefined);assert.equal(w.snapshot(outsider.id).players.find(a=>a.id===p.id).economy,undefined);
 const restored=reload(w,session);const recipient=restored.w.players.get(q.id);transfer(restored.w,restored.p,recipient);assert.equal(recipient.wood,received+100);
});
test('transfer permissions, typed amounts, premium exclusion, limits, sequences and late membership are enforced before mutation',()=>{
 const {w,p,q,setNow}=traders(),before=p.wood;
 for(const count of[0,-1,.5,3001,'100'])assert.throws(()=>transfer(w,p,q,count));for(const resource of['aether','sigils','__proto__'])assert.throws(()=>transfer(w,p,q,100,'1-valid-transfer-0001',resource));assert.throws(()=>transfer(w,p,p));assert.equal(p.wood,before);const recipientBalance=q.wood;q.wood=Number.MAX_SAFE_INTEGER;assert.throws(()=>transfer(w,p,q),/balance limit/);assert.equal(p.wood,before);assert.equal(p.tradeSequence,0);q.wood=recipientBalance;
 transfer(w,p,q,3000);assert.throws(()=>transfer(w,p,q,1,'2-transfer-limit-0002'),/limit/);setNow(date+86400000);transfer(w,p,q,1,'2-transfer-limit-0002');assert.equal(p.tradeSent,1);assert.throws(()=>transfer(w,p,q,2,'2-transfer-limit-0002'),/different/);
 setNow(date);assert.throws(()=>transfer(w,p,q,3000,'3-transfer-clock-rollback'),/limit/);
 command(w,q,'alliance-leave');assert.throws(()=>transfer(w,p,q,1,'3-transfer-member-0003'),/member/);
});
test('old transfer IDs cannot replay after bounded receipt eviction',()=>{
 const {w,p,q}=traders();for(let i=1;i<=101;i++)transfer(w,p,q,1,i+'-eviction-test-unique');assert.equal(p.tradeReceipts.length,100);const balance=q.wood;assert.throws(()=>transfer(w,p,q,1,'1-eviction-test-unique'),/Stale/);assert.equal(q.wood,balance);
});
test('stronghold AP admission charges actual participating cities once, and rejects underfunded parties without charging others',()=>{
 for(const enough of[false,true]){
  const {w,p}=setup(),q=w.authenticate(w.join('Rally ally').token);for(const a of[p,q]){a.cityLevel=2;a.buildings.oathhall=1;}command(w,p,'alliance-create',{name:'Rally party'});command(w,q,'alliance-join',{targetId:p.allianceId});q.ap=enough?100:9;
  const target=w.strongholds[0];command(w,p,'rally-create',{targetId:target.id,count:10});command(w,q,'rally-join',{targetId:w.rallies[0].id});assert.equal(p.ap,100);assert.equal(q.ap,enough?100:9);
  for(let i=0;i<400&&w.rallies.length;i++){w.tick(.1);if(w.sieges.length)break;}
  if(enough){assert.equal(p.ap,90);assert.equal(q.ap,90);advance(w,3);assert.equal(p.ap,90);assert.equal(q.ap,90);}
  else{assert.equal(w.rallies.length,0);assert.equal(p.ap,100);assert.equal(q.ap,9);assert.equal(target.health,target.maxHealth);}
 }
});
test('PvP is AP-free and combat oaths alter actual server combat damage and received hits',()=>{
 const {w,p}=setup(),q=w.authenticate(w.join('Duel opponent').token);p.cityLevel=q.cityLevel=2;p.x=20;p.z=20;q.x=22;q.z=20;command(w,p,'attack-player',{targetId:q.id});advance(w,2);assert.equal(p.ap,100);assert.equal(q.ap,100);
 const control=setup(),buffed=setup();command(buffed.w,buffed.p,'inventory-supplies');for(const id of['attack-oath-10m','defense-oath-10m'])command(buffed.w,buffed.p,'inventory-use',{targetId:id});
 for(const e of[control,buffed]){const camp=e.w.camps[0];e.p.x=camp.x;e.p.z=camp.z;command(e.w,e.p,'attack',{targetId:camp.id});e.w.tick(.1);}
 assert.ok(buffed.w.camps[0].health<control.w.camps[0].health);assert.ok(buffed.p.health>control.p.health);
});
async function http(t,options={},bin=null){
 const {createGameServer}=await import('./http.mjs');const app=createGameServer(options);await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));if(bin)bin.server(app.server);else t.after(()=>closeHttpServer(app.server));
 const base='http://127.0.0.1:'+app.server.address().port;return {...app,post:(path,body,token='',key='')=>fetch(base+path,{method:'POST',headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)})};
}
test('concurrent HTTP transfers serialize, failed saves roll back both balances/reports and SQLite retries survive reconnect',async t=>{
 const bin=tempDirectory(t,'tom-economy-');const db=new KingdomDatabase(bin.path('world.sqlite'));let fail=false;
 const app=await http(t,{store:{load:()=>db.load(),save:(...args)=>{if(fail)throw new Error('Disk full');db.save(...args);},receipt:(...args)=>db.receipt(...args),close:()=>db.close()}},bin);
 const s=await(await app.post('/join',{name:'Trade sender'})).json(),other=await(await app.post('/join',{name:'Trade recipient'})).json();let p=app.world.authenticate(s.token),q=app.world.authenticate(other.token);p.gold=1000;p.wood=10000;p.cityLevel=2;p.buildings.market=1;command(app.world,p,'alliance-create',{name:'HTTP guild'});command(app.world,q,'alliance-join',{targetId:p.allianceId});app.saveNow();
 const body={type:'resource-transfer',targetId:q.id,name:'wood',count:100,jobId:'1-http-transfer-unique'},before=p.wood,received=q.wood;
 const responses=await Promise.all([app.post('/command',body,s.token,'transfer-once-1'),app.post('/command',body,s.token,'transfer-once-1')]);assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.equal(p.wood,before-110);assert.equal(q.wood,received+100);
 fail=true;const next={...body,jobId:'2-http-transfer-failure'};assert.equal((await app.post('/command',next,s.token,'transfer-once-2')).status,503);p=app.world.authenticate(s.token);q=app.world.authenticate(other.token);assert.equal(p.wood,before-110);assert.equal(q.wood,received+100);assert.equal(p.tradeSequence,1);
 fail=false;app.saveNow();assert.equal((await app.post('/command',next,s.token,'transfer-once-2')).status,200);assert.equal((await app.post('/command',next,s.token,'transfer-once-2')).status,200);p=app.world.authenticate(s.token);assert.equal(p.tradeSequence,2);assert.equal(p.tradeReceipts.length,2);
 const saved=db.load(),restored=saved.authenticate(s.token),recipient=saved.authenticate(other.token);const balance=recipient.wood;transfer(saved,restored,recipient,100,'2-http-transfer-failure');assert.equal(recipient.wood,balance);
});
test('concurrent consumable and premium claims cannot consume or reward twice, and private economy stays private',async t=>{
 const app=await http(t),s=await(await app.post('/join',{name:'Item owner'})).json(),o=await(await app.post('/join',{name:'Other viewer'})).json();const p=app.world.authenticate(s.token);command(app.world,p,'inventory-supplies');
 const before=p.sigils,responses=await Promise.all([app.post('/command',{type:'inventory-use',targetId:'echo-sigil'},s.token),app.post('/command',{type:'inventory-use',targetId:'echo-sigil'},s.token)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal(p.sigils,before+1);assert.equal(app.world.snapshot(o.playerId).players.find(a=>a.id===p.id).economy,undefined);
});
test('previously claimed legacy rewards and founding supplies do not retroactively grant new premium or consumables',()=>{
 const old=oldSave(),p=old.world.players[0];p.daily.counters.gather=200;p.daily.counters.food=120;p.daily.counters.trained=10;p.daily.counters.scouts=1;p.daily.claimed=['gather','food','train','scout'];p.daily.chests=['chest-60'];
 const w=World.fromSave(old,{now:()=>date}),q=[...w.players.values()][0];assert.equal(q.aether,0);assert.equal(q.ap,100);assert.equal(q.inventory['ap-tonic-20'],undefined);assert.equal(q.inventory['attack-oath-10m'],undefined);assert.throws(()=>command(w,q,'inventory-supplies'),/already/);
 const period=activitySnapshot(w,q).daily.period;assert.throws(()=>command(w,q,'activity-chest',{targetId:'chest-60',period}),/once/);assert.equal(q.aether,0);
});
test('a legal new city earns its first premium and shard commander, deploys it, fights and preserves economy after restart',()=>{
 const {w,p,session}=setup();const until=(predicate,limit=240)=>{for(let i=0;i<limit*10&&!predicate();i++)w.tick(.1);assert.ok(predicate());};
 command(w,p,'upgrade');command(w,p,'train');command(w,p,'train');until(()=>p.cityLevel===2&&!p.trainingQueue.length);command(w,p,'configure-march',{targetId:'captain',units:{infantry:30,archers:0,cavalry:0},mythic:0});
 for(const resource of['wood','food']){const node=w.nodes.find(n=>n.resource===resource&&n.x<20&&n.z<20);command(w,p,'gather',{targetId:node.id});until(()=>p.cargo[resource]>=40);command(w,p,'return');until(()=>!p.deployed);}
 for(const id of['gather-wood','gather-food','train-ten'])command(w,p,'journey-claim',{targetId:id});command(w,p,'chapter-claim',{targetId:'embers'});assert.equal(p.aether,5);assert.equal(p.inventory['warden-echoes-10'],1);
 const preview=w.snapshot(p.id).players[0].journeyCampaign.chapters[0].reward;assert.equal(preview.itemRewards[0].id,'warden-echoes-10');command(w,p,'inventory-use',{targetId:'warden-echoes-10'});command(w,p,'recruit-shards',{targetId:'warden'});command(w,p,'train');until(()=>!p.trainingQueue.length);command(w,p,'deploy-march',{targetId:'warden',troops:5});
 const march=p.marches[0];command(w,p,'move',{marchId:march.id,x:14,z:10});until(()=>!march.target);command(w,p,'return',{marchId:march.id});until(()=>!march.deployed);command(w,p,'move',{x:14,z:10});until(()=>!p.target);command(w,p,'attack',{targetId:w.camps[0].id});until(()=>p.kills>0);assert.equal(p.ap,95);command(w,p,'return');until(()=>!p.deployed);const saved=reload(w,session);assert.equal(saved.p.aether,5);assert.equal(saved.p.ap,95);assert.ok(saved.p.ownedCommanders.includes('warden'));assert.equal(saved.p.inventory['warden-echoes-10'],0);assert.ok(w.time<900);console.log('Automated new-player economy journey: '+w.time.toFixed(1)+' simulated seconds, 5 AP spent, 5 premium Aether earned.');
});
test('concurrent premium chest claims grant the authored amount and stored items once',async t=>{
 const app=await http(t),s=await(await app.post('/join',{name:'Premium claimant'})).json(),p=app.world.authenticate(s.token);for(const [key,n]of[['gather',200],['food',120],['trained',10],['scouts',1]])recordActivity(app.world,p,key,n);
 let daily=activitySnapshot(app.world,p).daily;for(const task of daily.tasks.filter(t=>t.canClaim))command(app.world,p,'daily-claim',{targetId:task.id,period:daily.period});
 const body={type:'activity-chest',targetId:'chest-60',period:daily.period};const responses=await Promise.all([app.post('/command',body,s.token),app.post('/command',body,s.token)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,400]);assert.equal(p.aether,2);assert.equal(p.inventory['ap-tonic-20'],1);
});
test('AP admission and camp damage roll back together on a failed simulation save',async t=>{
 const {w,p,session}=setup(),camp=w.camps[0];p.x=camp.x;p.z=camp.z;command(w,p,'attack',{targetId:camp.id});let fail=false;
 const app=await http(t,{store:{load:()=>w,save:()=>{if(fail)throw new Error('Disk full');}}});fail=true;
 const until=async predicate=>{const end=Date.now()+2000;while(!predicate()&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,20));assert.ok(predicate());};
 await until(()=>!!app.persistence.error);let owner=w.authenticate(session.token);assert.equal(owner.ap,100);assert.equal(owner.campPasses[camp.id],undefined);assert.equal(w.camps[0].health,camp.maxHealth);
 fail=false;assert.equal(app.saveNow(),true);await until(()=>w.authenticate(session.token).ap===95);owner=w.authenticate(session.token);assert.equal(owner.campPasses[camp.id],1);assert.ok(w.camps[0].health<camp.maxHealth);
});
test('JSON migration archives the untouched schema fourteen fixture before writing the new economy',async t=>{
 const {writeFileSync}=await import('node:fs');const {WorldStore}=await import('./storage.mjs');const dir=mkdtempSync(join(tmpdir(),'tom-currency-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'world.json'),original=JSON.stringify(oldSave());writeFileSync(path,original);const store=new WorldStore(path),w=store.load();store.save(w);assert.equal(readFileSync(path+'.schema14.bak','utf8'),original);const current=JSON.parse(readFileSync(path,'utf8'));assert.equal(current.schema,21);assert.equal(current.world.players[0].aether,0);assert.equal(current.world.players[0].mana,oldSave().world.players[0].aether);
});
test('SQLite migrates schema fourteen atomically and a second load does not mint premium, items or AP',t=>{
 const bin=tempDirectory(t,'tom-sql-economy-');const db=new KingdomDatabase(bin.path('world.sqlite'),{now:()=>date});bin.close(()=>db.close());const old=oldSave();db.db.prepare('INSERT INTO kingdom VALUES(1,?,?)').run(JSON.stringify(old),date);const w=db.load(),p=[...w.players.values()][0];assert.equal(p.aether,0);assert.equal(p.mana,old.world.players[0].aether);p.ap=17;db.save(w);const next=db.load(),q=[...next.players.values()][0];assert.equal(q.ap,17);assert.equal(q.aether,0);assert.equal(q.inventory['mana-pack-10'],1);assert.equal(JSON.parse(db.db.prepare('SELECT payload FROM kingdom').get().payload).schema,21);
});
test('migration grandfathers already engaged legacy camp contributors without retroactive AP charges',()=>{
 const old=oldSave(),id=old.world.players[0].id;old.world.camps[0].health=90;old.world.camps[0].contributors={[id]:10};const w=World.fromSave(old,{now:()=>date}),p=[...w.players.values()][0];assert.equal(p.campPasses[w.camps[0].id],1);p.x=w.camps[0].x;p.z=w.camps[0].z;command(w,p,'attack',{targetId:w.camps[0].id});w.tick(.1);assert.equal(p.ap,100);
});
test('current schema never resets legitimate premium Aether, AP or timed oaths on reconnect',()=>{
 const {w,p,session}=setup();p.aether=7;p.ap=42;p.buffs.defense=date+600000;command(w,p,'inventory-supplies');command(w,p,'scout-send',{x:20,z:20});const next=reload(w,session,date+30000);assert.equal(next.p.aether,7);assert.equal(next.p.ap,42);assert.equal(economySnapshot(next.w,next.p).buffs[1].remaining,570);assert.equal(next.p.suppliesClaimed,true);
});
test('specialized speedups affect only their real eligible lane; finishing jobs cannot consume another item',()=>{
 const {w,p}=setup();p.cityLevel=2;p.buildings.academy=1;p.food=p.gold=p.wood=1000;p.inventory['research-minute']=2;command(w,p,'research',{targetId:'logistics'});command(w,p,'train');const other=p.trainingQueue[0].remaining;
 assert.throws(()=>command(w,p,'inventory-use',{targetId:'research-minute',jobId:p.trainingQueue[0].id}),/research/);const id=p.research.id;command(w,p,'inventory-use',{targetId:'research-minute',jobId:id});assert.equal(p.trainingQueue[0].remaining,other);assert.throws(()=>command(w,p,'inventory-use',{targetId:'research-minute',jobId:id}),/active/);assert.equal(p.inventory['research-minute'],1);w.tick(.1);assert.equal(p.technologies.logistics,1);
 p.wounded.infantry=2;p.inventory['healing-minute']=1;command(w,p,'hospital-heal',{units:{infantry:2,archers:0,cavalry:0},mythic:0});const healing=p.healing.id;command(w,p,'inventory-use',{targetId:'healing-minute',jobId:healing});w.tick(.1);assert.equal(p.wounded.infantry,0);assert.equal(p.healing,null);assert.ok(p.reserveTroops>=2);
});
