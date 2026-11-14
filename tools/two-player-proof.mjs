import { legacySpawns } from '../server/testing/kingdom-fixture.mjs';
import assert from 'node:assert/strict';
import {createGameServer} from '../server/http.mjs';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
// Real HTTP, SQLite, commands, ticks and reports. Accelerated simulation time;
// no resource grants, teleports, forced victories or stub gameplay.
export async function twoPlayerProof(output=null){
 const folder=await mkdtemp(join(tmpdir(),'thrones-two-player-')),databasePath=join(folder,'world.sqlite');let app,url;const steps=[];
 const start=async()=>{app=createGameServer({databasePath});legacySpawns(app.world);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+app.server.address().port;};
 const close=async()=>{await new Promise(r=>{app.server.close(r);app.server.closeAllConnections();});};
 const advance=seconds=>{for(let i=0;i<Math.ceil(seconds*10);i++)app.world.tick(.1);assert.ok(app.saveNow());};
 const get=async p=>{const r=await fetch(url+'/world',{headers:{Authorization:'Bearer '+p.token}});assert.equal(r.status,200);return r.json();};
 const own=(view,p)=>view.players.find(q=>q.id===p.playerId);
 const raw=(p,c,key=randomUUID())=>fetch(url+'/command',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+p.token,'Idempotency-Key':key},body:JSON.stringify(c)});
 const command=async(p,type,extra={})=>{const r=await raw(p,{type,...extra});const data=await r.json();assert.equal(r.status,200,type+': '+JSON.stringify(data));return data;};
 const joinPlayer=async name=>{const r=await fetch(url+'/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,civilization:'greek'})});assert.equal(r.status,201);return r.json();};
 try{
  await start();const a=await joinPlayer('Proof A'),b=await joinPlayer('Proof B'),outsider=await joinPlayer('Privacy observer');
  for(const p of [a,b]){await command(p,'inventory-supplies');let me=own(await get(p),p);for(const item of me.inventory.items.filter(i=>i.kind==='resource'&&i.count>0))await command(p,'inventory-use',{targetId:item.id,count:item.count});}
  await command(a,'train',{targetId:'archers'});advance(16);await command(a,'configure-march',{targetId:'captain',units:{infantry:15,archers:5,cavalry:0},mythic:0});
  await command(a,'scout-send',{x:20,z:20});advance(25);let view=await get(a);const camp=view.camps.find(c=>c.name==='Forsaken Scouts');assert.ok(camp?.lastKnown);await command(a,'attack',{targetId:camp.id});advance(12);let me=own(await get(a),a);assert.equal(me.kills,1);assert.ok(me.skillCasts>0);assert.ok(me.reports.some(r=>r.type==='pve'&&r.outcome==='Victory'));await command(a,'return');advance(20);steps.push('Real fresh-player patrol, remembered camp, signature cast, victory and report');
  for(const p of [a,b])await command(p,'building-upgrade',{targetId:'citadel'});advance(21);for(const p of [a,b])await command(p,'building-upgrade',{targetId:'oathhall'});advance(13);
  await command(a,'alliance-create',{name:'Two-player Proof'});const alliance=own(await get(a),a).allianceId;await command(b,'alliance-join',{targetId:alliance});await command(a,'alliance-promote',{targetId:b.playerId});
  await command(a,'chat-send',{targetId:'alliance',name:'Ready for joint operations'});me=own(await get(a),a);await command(a,'marker-place',{x:me.homeX,z:me.homeZ,name:'Assembly home'});
  await command(a,'building-upgrade',{targetId:'market'});advance(13);let va=await get(a),vb=await get(b);const beforeA=own(va,a).gold,beforeB=own(vb,b).gold,key=randomUUID();
  const transfer={type:'resource-transfer',targetId:b.playerId,name:'gold',count:20,jobId:own(va,a).economy.nextTransfer+'-'+randomUUID()};const duplicate=await Promise.all([raw(a,transfer,key),raw(a,transfer,key)]);assert.deepEqual(duplicate.map(r=>r.status),[200,200]);await Promise.all(duplicate.map(r=>r.json()));va=await get(a);vb=await get(b);assert.equal(own(va,a).gold,beforeA-22);assert.equal(own(vb,b).gold,beforeB+20);assert.ok(own(vb,b).reports.some(r=>r.type==='trade'));
  // Replenish through actual gathering rather than granting the missing construction gold.
  va=await get(a);const goldNode=va.nodes.find(n=>n.resource==='gold'&&n.remaining>0);assert.ok(goldNode);await command(a,'gather',{targetId:goldNode.id});for(let i=0;i<30;i++){advance(2);if(own(await get(a),a).cargo.gold>=60)break;}await command(a,'return');advance(20);
  await command(a,'building-upgrade',{targetId:'farm'});vb=await get(b);const job=vb.allianceRoster.find(m=>m.id===a.playerId).jobs.find(j=>j.canHelp);assert.ok(job);await command(b,'alliance-help',{targetId:job.id});assert.equal((await raw(b,{type:'alliance-help',targetId:job.id})).status,400);assert.equal((await get(b)).allianceRoster.find(m=>m.id===b.playerId).role,'Officer');const hidden=await get(outsider);assert.deepEqual(hidden.allianceRoster,[]);assert.equal(hidden.markers.length,0);assert.equal(hidden.chatMessages.some(m=>m.channel==='alliance'),false);steps.push('Real alliance, live roster, officer role, private chat/marker, exactly-once taxed delivery and one-time help');advance(25);
  // Real root fort and shared garrison, without unlocking gates or manufacturing territory.
  me=own(await get(a),a);await command(a,'flag',{x:me.homeX,z:me.homeZ});advance(31);view=await get(a);const fort=view.flags.find(f=>f.allianceId===alliance&&f.isRoot);assert.ok(fort);await command(b,'garrison-join',{targetId:fort.id});advance(5);assert.ok((await get(a)).garrisons.some(g=>g.targetId===fort.id&&g.armyIds.includes(b.playerId)));await command(b,'return');advance(5);steps.push('Completed root fort, real second-player garrison, authoritative recall');
  // Tier-1 strongholds are original shared PvE; demonstrate real assembly and recall.
  await command(a,'rally-create',{targetId:'godbreaker-watch',count:60});view=await get(b);const rally=view.rallies.find(r=>r.leaderId===a.playerId);assert.ok(rally);await command(b,'rally-join',{targetId:rally.id});advance(2);assert.equal((await get(a)).rallies.find(r=>r.id===rally.id).armyIds.length,2);await command(a,'return');advance(20);steps.push('Two real march rally assembly and leader recall; no forced stronghold outcome');
  view=await get(b);const wood=view.nodes.find(n=>n.resource==='wood'&&n.remaining>0);assert.ok(wood);await command(b,'gather',{targetId:wood.id});advance(5);const cargo=own(await get(b),b).cargo.wood;assert.ok(cargo>0);await close();await start();vb=await get(b);assert.equal(own(vb,b).cargo.wood,cargo);const afterRestartGold=own(vb,b).gold;const replay=await raw(a,transfer,key);assert.equal(replay.status,200);await replay.json();assert.equal(own(await get(b),b).gold,afterRestartGold);assert.equal(vb.allianceRoster.find(m=>m.id===b.playerId).role,'Officer');await command(b,'return');advance(20);assert.equal(own(await get(b),b).deployed,false);assert.ok(own(await get(b),b).reports.some(r=>r.type==='gathering'&&r.outcome==='Delivered'));steps.push('Persisted partial cargo, guest reconnect, alliance roles and real delivery after SQLite restart');
  const report={success:true,steps,players:2,privacyObserver:1,storage:'real SQLite',transport:'real HTTP',time:'accelerated production simulation ticks',nativeUnity:'NOT RUN'};if(output){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2));}return report;
 }finally{if(app?.server.listening)await close();await rm(folder,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))twoPlayerProof(process.argv[2]??'work/two-player-proof.json').then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
