import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
const setup = () => { const w=new World(), p=['Leader','Officer','Member','Outsider'].map(name=>w.authenticate(w.join(name).token));for(const x of p)x.gold=1000;w.command(p[0],{type:'alliance-create',name:'Dawn'});for(const x of p.slice(1,3))w.command(x,{type:'alliance-join',targetId:p[0].allianceId});return {w,p}; };
const cmd=(w,p,type,targetId='',extra={})=>w.command(p,{type,targetId,...extra});
test('leaders manage ranks and succession; officers cannot remove peers or transfer leadership',()=>{
 const {w,p:[leader,officer,member]}=setup();const id=leader.allianceId;
 cmd(w,leader,'alliance-promote',officer.id);assert.equal(w.snapshot(officer.id).players.find(p=>p.id===officer.id).allianceRole,'Officer');
 assert.throws(()=>cmd(w,officer,'alliance-promote',member.id),/leader/);assert.throws(()=>cmd(w,officer,'alliance-kick',leader.id),/permission/);
 cmd(w,officer,'alliance-kick',member.id);assert.equal(member.allianceId,'');assert.throws(()=>cmd(w,leader,'alliance-leave'),/Transfer/);
 cmd(w,leader,'alliance-transfer',officer.id);assert.equal(w.alliances.get(id).leaderId,officer.id);assert.ok(w.alliances.get(id).officers.includes(leader.id));
 cmd(w,leader,'alliance-leave');assert.equal(leader.allianceId,'');assert.deepEqual(w.alliances.get(id).officers,[]);
});
test('closing an empty alliance neutralizes its territory and markers rather than leaving orphan ownership',()=>{
 const {w,p:[leader,officer,member]}=setup();const id=leader.allianceId;
 cmd(w,officer,'alliance-leave');cmd(w,member,'alliance-leave');
 w.flags.push({health:250,maxHealth:250,buildRemaining:0,isRoot:true,connected:true,id:'flag',allianceId:id,x:5,z:5});w.sites[0].allianceId=id;w.sites[0].challengerId=id;w.sites[0].progress=5;
 cmd(w,leader,'marker-place','',{name:'Meet',x:10,z:10});cmd(w,leader,'alliance-leave');
 assert.equal(w.alliances.has(id),false);assert.equal(w.flags.length,0);assert.equal(w.markers.length,0);assert.equal(w.sites[0].allianceId,'');assert.equal(w.sites[0].progress,0);
 assert.doesNotThrow(()=>World.fromSave(w.toSave()));
});
test('alliance chat is private, kingdom chat is shared and spam limits and malformed messages are rejected',()=>{
 const {w,p:[leader,officer,member,outsider]}=setup();
 cmd(w,leader,'chat-send','alliance',{name:'Hold the northern gate'});
 assert.equal(w.snapshot(officer.id).chatMessages.length,1);assert.equal(w.snapshot(outsider.id).chatMessages.length,0);
 assert.throws(()=>cmd(w,leader,'chat-send','kingdom',{name:'spam'}),/Wait/);w.tick(0.25);w.tick(0.25);w.tick(0.25);w.tick(0.25);
 cmd(w,leader,'chat-send','kingdom',{name:'Welcome'});assert.equal(w.snapshot(outsider.id).chatMessages.length,1);
 assert.throws(()=>cmd(w,outsider,'chat-send','alliance',{name:'intrusion'}),/available/);
 assert.throws(()=>cmd(w,member,'chat-send','kingdom',{name:'x'.repeat(241)}),/240/);
 const restored=World.fromSave(w.toSave());assert.equal(restored.snapshot(outsider.id).chatMessages.length,1);
 cmd(w,officer,'alliance-leave');assert.equal(w.snapshot(officer.id).chatMessages.length,1);
});
test('shared markers enforce ranks, accessible coordinates, membership visibility and expiration',()=>{
 const {w,p:[leader,officer,member,outsider]}=setup();
 assert.throws(()=>cmd(w,member,'marker-place','',{name:'No',x:10,z:10}),/officers/);
 cmd(w,leader,'alliance-promote',officer.id);cmd(w,officer,'marker-place','',{name:'Regroup',x:10,z:10});
 const id=w.markers[0].id;assert.equal(w.snapshot(member.id).markers.length,1);assert.equal(w.snapshot(outsider.id).markers.length,0);
 assert.throws(()=>cmd(w,outsider,'marker-remove',id),/officer/);assert.throws(()=>cmd(w,officer,'marker-place','',{name:'Invalid',x:60,z:60}),/accessible/);
 cmd(w,leader,'marker-remove',id);assert.equal(w.markers.length,0);
 cmd(w,leader,'marker-place','',{name:'Expires',x:10,z:10});w.time+=600;w.tick(0.1);assert.equal(w.markers.length,0);
});
test('allied job help stays visible while enemy resources and all private ward/report data stay hidden',()=>{
 const {w,p:[leader,officer,,outsider]}=setup();leader.wood=leader.stone=1000;
 cmd(w,leader,'upgrade');const ally=w.snapshot(officer.id).players.find(p=>p.id===leader.id), enemy=w.snapshot(outsider.id).players.find(p=>p.id===leader.id);
 assert.equal(ally.construction.id,leader.construction.id);assert.equal(ally.construction.cost,undefined);assert.equal(enemy.construction,null);
 for(const p of[ally,enemy])for(const field of['gold','food','wounded','healing','battleReports','heroRecords'])assert.equal(p[field],undefined);
});
test('saved communication and officer data is validated rather than silently granting permissions',()=>{
 const {w,p:[leader,officer,,outsider]}=setup();
 for(const mutate of [s=>s.world.alliances[0].officers=[outsider.id],s=>s.world.players[0].lastChatAt='bad',s=>s.world.markers=[{id:'bad'}],s=>s.world.messages=[{id:'bad'}]]){
  const bad=structuredClone(w.toSave());mutate(bad);assert.throws(()=>World.fromSave(bad));
 }
});
