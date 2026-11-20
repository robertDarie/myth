import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from './world.mjs';
import {QaReferenceWorld} from './qa-reference-world.mjs';
import {syntheticCityProfile} from './testing/reference-city-fixtures.mjs';
import {createGameServer} from './http.mjs';
import {LIMITS,MAP_CORRIDORS} from './world-map.mjs';
import {route} from './navigation.mjs';
import {openKingdom} from './testing/kingdom-fixture.mjs';

test('reference QA preview rejects the same unsupported military as the real command',()=>{
 const w=new QaReferenceWorld({qaOnly:true,profile:syntheticCityProfile()}),s=w.join('Reference QA','greek'),p=w.authenticate(s.token);
 const q={type:'move',x:p.homeX+1,z:p.homeZ};
 assert.throws(()=>w.command(p,q),/BLOCKED/);
 assert.equal(w.previewMarch(w.authenticate(s.token),q).authorized,false);
});

test('invitation recipient can reject privately and release the reserved slot through real HTTP',async t=>{
 const host=createGameServer();await new Promise(ok=>host.server.listen(0,'127.0.0.1',ok));
 t.after(()=>new Promise(ok=>{host.server.close(ok);host.server.closeAllConnections();}));
 const url='http://127.0.0.1:'+host.server.address().port;
 const api=async(path,data,s)=>{const r=await fetch(url+path,{method:data?'POST':'GET',headers:{authorization:'Bearer '+(s?.token??''),'content-type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json()};};
 const a=(await api('/join',{name:'Leader',civilization:'greek'})).body,b=(await api('/join',{name:'Invited',civilization:'norse'})).body,c=(await api('/join',{name:'Outsider',civilization:'egyptian'})).body;
 assert.equal((await api('/command',{type:'alliance-create',name:'Combined'},a)).status,200);
 assert.equal((await api('/command',{type:'alliance-invite',targetId:b.playerId},a)).status,200);
 const invited=(await api('/world',null,b)).body.incoming[0];assert.ok(invited);
 assert.equal((await api('/world',null,c)).body.incoming.length,0);
 assert.equal((await api('/command',{type:'alliance-decline-invite',targetId:invited.id},c)).status,400);
 assert.equal((await api('/command',{type:'alliance-decline-invite',targetId:invited.id},b)).status,200);
 assert.equal((await api('/world',null,b)).body.incoming.length,0);
 assert.equal((await api('/command',{type:'alliance-decline-invite',targetId:invited.id},b)).status,400);
 await api('/command',{type:'alliance-invite',targetId:b.playerId},a);
 const alliance=host.world.authenticate(a.token).allianceId;
 assert.equal((await api('/command',{type:'alliance-join',targetId:alliance},b)).status,200);
 const before=host.world.toSave(),restored=World.fromSave(before);
 assert.equal(restored.authenticate(b.token).allianceId,alliance);
 assert.deepEqual(restored.authenticate(b.token).heroRecords,host.world.authenticate(b.token).heroRecords);
});

test('a stale authorized preview never grants command permission after recovery changes',()=>{
 const w=new World(),p=w.authenticate(w.join('Stale').token),q={type:'move',x:0,z:0};q.x=p.homeX+1;q.z=p.homeZ;
 const before=structuredClone(w.toSave());assert.equal(w.previewMarch(p,q).authorized,true);assert.deepEqual(w.toSave(),before);
 p.recovery=1;assert.throws(()=>w.command(p,q),/recovering/);assert.equal(p.target,null);
});

test('reserved-capacity boundary rejects open join but permits the invited player without corrupting membership',()=>{
 const w=new World(),a=w.authenticate(w.join('Boundary leader').token),b=w.authenticate(w.join('Invited boundary').token),c=w.authenticate(w.join('Open boundary').token);
 w.command(a,{type:'alliance-create',name:'Capacity boundary'});w.command(a,{type:'alliance-invite',targetId:b.id});
 // Explicit capacity fixture only; never evidence of earned gameplay progression.
 for(let i=1;i<LIMITS.allianceMembers-1;i++){const copy=structuredClone(a);copy.id='capacity-fixture-'+i;copy.ownerId=copy.id;w.players.set(copy.id,copy);}
 assert.throws(()=>w.command(c,{type:'alliance-join',targetId:a.allianceId}),/reserved/);
 assert.equal(c.allianceId,'');w.command(b,{type:'alliance-join',targetId:a.allianceId});
 assert.equal(w.alliances.get(a.allianceId).invites.length,0);
 assert.equal([...w.players.values()].filter(p=>p.allianceId===a.allianceId).length,LIMITS.allianceMembers);
});

test('a private search pin never reveals a recycled camp slot from a different respawn cycle',()=>{
 const w=new World({random:()=>.25}),p=w.authenticate(w.join('Cycle privacy','greek').token);
 w.command(p,{type:'forsaken-search',count:1});const result=p.forsaken.searchResult;assert.equal(result.status,'found');
 const camp=w.camps.find(c=>c.id===result.id);
 // Negative recycled-slot fixture, not a legitimate progression claim.
 camp.cycle++;camp.x=250;camp.z=250;
 assert.equal(w.snapshot(p.id).camps.some(c=>c.id===camp.id&&c.searchPin),false);
});

test('stale authorized gate preview cannot send a real march after ownership is lost',()=>{
 const w=new World({random:()=>.25}),p=w.authenticate(w.join('Gate preview','greek').token);
 w.command(p,{type:'alliance-create',name:'Gate preview QA'});
 openKingdom(w); // Explicit milestone boundary fixture, not earned pass capture evidence.
 const border=MAP_CORRIDORS.find(c=>!!route(w,p,c.a)!==!!route(w,p,c.b));assert.ok(border);
 const destination=route(w,p,border.a)?border.b:border.a,gate=w.sites.find(s=>s.id===border.gateId);
 gate.allianceId=p.allianceId;const q={type:'move',x:destination.x,z:destination.z};
 assert.equal(w.previewMarch(p,q).authorized,true);
 const before={units:structuredClone(p.units),position:[p.x,p.z]};gate.allianceId='';
 assert.throws(()=>w.command(p,q),/authorized gate/);assert.equal(p.target,null);
 assert.deepEqual(p.units,before.units);assert.deepEqual([p.x,p.z],before.position);
});
