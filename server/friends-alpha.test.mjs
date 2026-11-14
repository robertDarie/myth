import test from 'node:test';
import assert from 'node:assert/strict';
import { createRealmHost } from './realms.mjs';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

test('three invited HTTP clients share random cities, scouts, cargo, chat, independent orders and durable reconnect',async t=>{
 const root=mkdtempSync(join(tmpdir(),'myth-friends-'));let host,base;
 const specs=[{id:'friends',name:'Friends alpha',joinCode:'fixture-private-invite',databasePath:join(root,'alpha.sqlite')}];
 const start=async()=>{host=createRealmHost({defaultId:'friends',realms:specs});await new Promise(ok=>host.server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+host.server.address().port;};
 const close=()=>new Promise(ok=>{host.server.close(ok);host.server.closeAllConnections();});
 t.after(async()=>{if(host)await close();rmSync(root,{recursive:true,force:true});});await start();
 const realm=()=>host.realms.get('friends');
 // Controlled RNG goes through the production continuous spawn sampler. No
 // city/army coordinate overrides, forced victories or resource grants.
 realm().world.random=()=>.5;
 const call=async(path,body,token='')=>{const r=await fetch(base+'/k/friends'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 const advance=seconds=>{const r=realm();for(let i=0;i<seconds*10;i++)r.tick(r.previous+100);r.previous=performance.now();assert.equal(r.persistence.error,'');};
 const command=async(s,body)=>{const r=await call('/command',body,s.token);assert.equal(r.status,200,JSON.stringify(r.body));return r;};
 assert.equal((await call('/join',{name:'Rejected',joinCode:'wrong'})).status,403);assert.equal(realm().world.players.size,0);
 const sessions=[];for(let i=0;i<3;i++){const r=await call('/join',{name:'Friend '+i,joinCode:'fixture-private-invite'});assert.equal(r.status,201);sessions.push(r.body);}
 const w=realm().world, homes=sessions.map(s=>{const p=w.authenticate(s.token);return {x:p.homeX,z:p.homeZ};});
 assert.equal(new Set(homes.map(h=>h.x+':'+h.z)).size,3);
 const totalTroops=()=>[...realm().world.players.values()].reduce((n,p)=>n+p.troops+p.reserveTroops,0),initial=totalTroops();
 const nodes=sessions.map(s=>{const p=w.authenticate(s.token);return w.nodes.filter(n=>w.canEnter(p,n)).sort((a,b)=>Math.hypot(a.x-p.homeX,a.z-p.homeZ)-Math.hypot(b.x-p.homeX,b.z-p.homeZ))[0];});
 for(let i=0;i<3;i++)await command(sessions[i],{type:'scout-send',x:nodes[i].x,z:nodes[i].z});advance(20);
 for(let i=0;i<3;i++)await command(sessions[i],{type:'gather',targetId:nodes[i].id});advance(15);
 for(const s of sessions)await command(s,{type:'return'});advance(15);
 for(const s of sessions){const p=w.authenticate(s.token);assert.ok(p.coreReports.some(r=>r.outcome==='Delivered'));assert.equal(p.deployed,false);}
 await command(sessions[0],{type:'alliance-create',name:'Three friends'});const alliance=w.authenticate(sessions[0].token).allianceId;
 for(const s of sessions.slice(1))await command(s,{type:'alliance-join',targetId:alliance});
 await command(sessions[1],{type:'chat-send',targetId:'alliance',name:'Shared persistent kingdom'});
 const snap=(await call('/world',null,sessions[2].token)).body;assert.equal(snap.allianceRoster.length,3);assert.ok(snap.chatMessages.some(m=>m.text==='Shared persistent kingdom'));
 for(let i=0;i<3;i++)await command(sessions[i],{type:'move',x:Math.max(3,homes[i].x-2),z:homes[i].z});advance(2);
 assert.equal(totalTroops(),initial);await close();host=null;await start();
 for(let i=0;i<3;i++){
  const s=sessions[i],r=await call('/join',{name:'ignored',resumeToken:s.token});assert.equal(r.status,201);assert.equal(r.body.playerId,s.playerId);
  const p=realm().world.authenticate(s.token);assert.deepEqual([p.homeX,p.homeZ],[homes[i].x,homes[i].z]);assert.equal(p.allianceId,alliance);
 }
 assert.equal(totalTroops(),initial);assert.equal(realm().world.players.size,3);
 assert.equal((await call('/command',{type:'train'},'unknown-token')).status,401);
});

test('client-only launcher starts the executable without a server and preserves the standalone launcher',()=>{
 const launcher=readFileSync(new URL('../packaging/windows/Start%20Thrones%20of%20Myth%20Online.cmd',import.meta.url),'utf8');
 assert.ok(launcher.includes('--thrones-client-only'));assert.ok(!/node|Server\\|Launcher.ps1/i.test(launcher));
 const local=readFileSync(new URL('../packaging/windows/Start%20Thrones%20of%20Myth.cmd',import.meta.url),'utf8');assert.ok(local.includes('Launcher.ps1'));
 const builder=readFileSync(new URL('../client/Assets/ThronesOfMyth/Editor/WindowsPlaytestBuilder.cs',import.meta.url),'utf8');assert.ok(builder.includes('BuildClientOnlyFromCommandLine'));assert.ok(builder.includes('WindowsClient'));
});
