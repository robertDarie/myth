import test from 'node:test';
import assert from 'node:assert/strict';
import {testWorld} from './testing/kingdom-fixture.mjs';
import {ownCommander} from './testing/roster-fixture.mjs';
import {buildingCard,technologyCard} from './city.mjs';
import {BUILDINGS,TECHNOLOGIES} from './city-content.mjs';
import {createGameServer} from './testing/legacy-services.mjs';
test('prerequisite cards expose actionable real dependencies without changing unlock rules or saves',()=>{
 const w=testWorld(),session=w.join('Progress'),p=w.authenticate(session.token),before=structuredClone(w.toSave());
 const academy=buildingCard(p,BUILDINGS.find(b=>b.id==='academy'));assert.ok(academy.prerequisites.some(r=>r.id==='citadel'&&!r.met&&r.level===2));assert.ok(academy.prerequisites.some(r=>r.id==='oracle'&&!r.met));
 const citadel=buildingCard(p,BUILDINGS[0]);assert.ok(citadel.prerequisites.every(r=>r.met));
 const veterans=technologyCard(p,TECHNOLOGIES.find(t=>t.id==='veterans'));assert.ok(veterans.prerequisites.some(r=>r.id==='academy'&&r.level===2&&!r.met));assert.ok(veterans.prerequisites.some(r=>r.kind==='research'&&r.id==='drill'&&!r.met));assert.deepEqual(w.toSave(),before);
 assert.throws(()=>w.command(p,{type:'research',targetId:'veterans'}));p.cityLevel=5;p.buildings.academy=5;assert.deepEqual(buildingCard(p,BUILDINGS[0]).prerequisites,[]);
});
test('commander comparisons reuse same-march authoritative stats, reject unowned/foreign requests and mutate no progress',()=>{
 const w=testWorld({now:()=>1000}),s=w.join('Comparison'),p=w.authenticate(s.token),other=w.authenticate(w.join('Other').token);ownCommander(p,'scout');const before=structuredClone(w.toSave());
 const c=w.compareCommanders(p,p.id,'scout');assert.equal(c.current.damage,w.stats(p).damage);assert.equal(c.candidate.damage,w.stats({...p,commanderId:'scout'}).damage);assert.equal(c.candidate.maxHealth,w.stats({...p,commanderId:'scout'}).maxHealth);assert.deepEqual(w.toSave(),before);
 assert.throws(()=>w.compareCommanders(p,other.id,'captain'),/owned/);assert.throws(()=>w.compareCommanders(p,p.id,'heracles'),/recruited/);assert.equal(p.ownedCommanders.includes('heracles'),false);
});
test('authenticated commander comparison is private and cannot recruit, spend or assign through GET',async t=>{
 const app=createGameServer();await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.server.close(r);app.server.closeAllConnections();}));const url='http://127.0.0.1:'+app.server.address().port;
 const join=async name=>(await fetch(url+'/join',{method:'POST',body:JSON.stringify({name,civilization:'greek'}),headers:{'Content-Type':'application/json'}})).json();const a=await join('A'),b=await join('B');
 const request=(token,march,candidate)=>fetch(url+'/commander-comparison?marchId='+march+'&candidateId='+candidate,{headers:token?{Authorization:'Bearer '+token}:{}});
 assert.equal((await request(null,a.playerId,'captain')).status,401);assert.equal((await request(a.token,b.playerId,'captain')).status,403);assert.equal((await request(a.token,a.playerId,'heracles')).status,403);
 const response=await request(a.token,a.playerId,'captain');assert.equal(response.status,200);const c=await response.json();assert.equal(c.marchId,a.playerId);assert.deepEqual(c.current,c.candidate);assert.equal('gold' in c,false);
});
