import test from 'node:test';
import assert from 'node:assert/strict';
import {testWorld} from './testing/kingdom-fixture.mjs';
import {ownCommander} from './testing/roster-fixture.mjs';
import {World} from './testing/legacy-world.mjs';
import {cargoTotal} from './field-logistics.mjs';
const advance=(w,s)=>{for(let i=0;i<s*10;i++)w.tick(.1);};
test('independent simultaneous marches retain their own target, cargo and troops across interruptions and restart',()=>{
 const w=testWorld(),s=w.join('Control'),p=w.authenticate(s.token);p.cityLevel=2;p.buildings.lumber=0;ownCommander(p,'scout');p.reserveUnits.infantry=10;p.reserveTroops=10;
 w.command(p,{type:'deploy-march',targetId:'scout',units:{infantry:10,archers:0,cavalry:0},mythic:0});const second=p.marches[0],node=w.nodes[0];
 w.command(p,{type:'move',marchId:p.id,x:12,z:10});w.command(p,{type:'gather',marchId:second.id,targetId:node.id});advance(w,5);
 w.command(p,{type:'stop',marchId:p.id});assert.equal(p.target,null);assert.equal(second.target?.id,node.id);assert.ok(cargoTotal(second)>0);
 const target=structuredClone(second.target),cargo=cargoTotal(second);assert.throws(()=>w.command(p,{type:'attack',marchId:second.id,targetId:'unseen-or-invalid'}));assert.deepEqual(second.target,target);assert.equal(cargoTotal(second),cargo);assert.throws(()=>w.command(p,{type:'return',marchId:'foreign'}));
 const restored=World.fromSave(w.toSave()),q=restored.authenticate(s.token),a=q.marches[0];assert.equal(cargoTotal(a),cargo);const before=q.wood;
 restored.command(q,{type:'return',marchId:a.id});restored.command(q,{type:'return',marchId:q.id});advance(restored,20);assert.equal(a.deployed,false);assert.equal(q.deployed,false);assert.equal(q.wood,before+cargo);assert.equal(q.troops+a.troops+q.reserveTroops,30);assert.equal(q.coreReports.filter(r=>r.type==='gathering').length,1);
});
test('a remembered dead camp cancels only on live vision with an actionable state and no AP charge',()=>{
 const w=testWorld(),s=w.join('Scout approach'),p=w.authenticate(s.token);w.command(p,{type:'scout-send',x:20,z:20});advance(w,25);const camp=w.camps.find(c=>c.name==='Forsaken Scouts');camp.health=0;camp.respawn=45;
 const ap=p.ap;w.command(p,{type:'attack',targetId:camp.id});advance(w,.1);assert.equal(p.target?.id,camp.id);for(let i=0;i<300&&p.target;i++)w.tick(.1);assert.equal(p.target,null);assert.equal(p.state,'Target unavailable');assert.ok(p.ap>=ap);assert.equal(p.kills,0);
});
