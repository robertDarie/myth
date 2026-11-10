import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from './world.mjs';
import {testWorld} from './testing/kingdom-fixture.mjs';
test('PvE archive records actual own composition, remaining health and contribution without granting on read',()=>{
 const w=testWorld(),session=w.join('Archive'),p=w.authenticate(session.token),camp=w.camps.find(c=>c.name==='Forsaken Scouts');
 for(let i=0;i<30&&camp.health>0&&p.recovery===0;i++)w.battle(p,camp,w.stats(p));
 const r=p.coreReports.find(r=>r.type==='pve'&&r.outcome==='Victory');assert.ok(r);
 assert.ok(r.detail.includes(p.commanderId));assert.ok(r.detail.includes(p.troops+' infantry'));assert.ok(r.detail.includes(Math.ceil(p.health)+' HP remaining'));assert.ok(r.detail.includes(camp.contributors[p.id]+' damage dealt'));assert.equal(r.detail.includes('undefined'),false);
 const gold=p.gold;w.snapshot(p.id);w.snapshot(p.id);assert.equal(p.gold,gold);
 const restored=World.fromSave(w.toSave()),q=restored.authenticate(session.token);assert.equal(q.coreReports.find(x=>x.id===r.id).detail,r.detail);assert.equal(q.gold,gold);
});
