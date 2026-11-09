import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from './world.mjs';
import { explorationTick, visible } from './exploration.mjs';
const advance=(w,n)=>{for(let i=0;i<Math.ceil(n*10);i++)w.tick(.1);};
const start=()=>{const w=new World(),s=w.join('Showcase'),p=w.authenticate(s.token);return {w,p};};
const command=(w,p,type,extra={})=>w.command(p,{type,...extra});
test('real opening patrol trains, scouts, attacks remembered Scouts, casts Rallying Cry, wins and returns without grants',()=>{
 const {w,p}=start(),camp=w.camps.find(c=>c.name==='Forsaken Scouts');assert.ok(camp);
 const originalTroops=p.troops+p.reserveTroops;
 command(w,p,'train',{targetId:'archers'});advance(w,35);
 command(w,p,'configure-march',{targetId:'captain',units:{infantry:15,archers:5,cavalry:0},mythic:0});
 assert.equal(p.troops,20);assert.equal(p.troops+p.reserveTroops,originalTroops+5);
 command(w,p,'scout-send',{x:20,z:20});advance(w,25);
 assert.ok(p.discovery.some(r=>r.kind==='camps'&&r.value.id===camp.id));assert.equal(visible(w,p,camp),false);
 const beforeAP=w.snapshot(p.id).players.find(a=>a.id===p.id).economy.ap;
 command(w,p,'attack',{targetId:camp.id});let shield=false,attacks=0;
 for(let i=0;i<1500&&p.kills===0;i++){w.tick(.1);shield||=p.shield>0;attacks=Math.max(attacks,p.attackSequence||0);}
 assert.equal(p.kills,1);assert.ok(p.skillCasts>0);assert.equal(p.lastSkill,'Rallying Cry');assert.ok(shield);assert.ok(attacks>=5);
 const city=w.snapshot(p.id).players.find(a=>a.id===p.id);assert.ok(city.economy.ap<beforeAP);assert.ok(city.reports.some(r=>r.type==='pve'&&r.outcome==='Victory'));
 command(w,p,'return');advance(w,25);assert.equal(p.deployed,false);assert.equal(p.x,p.homeX);assert.equal(p.z,p.homeZ);assert.equal(p.troops+p.reserveTroops,originalTroops+5);
 command(w,p,'building-upgrade',{targetId:'citadel'});advance(w,21);assert.equal(p.cityLevel,2);
 const restored=World.fromSave(w.toSave());assert.equal(restored.players.get(p.id).kills,1);assert.equal(restored.players.get(p.id).cityLevel,2);
});
test('hidden camp health never changes acceptance or remotely cancels a remembered approach; unseen IDs remain denied',()=>{
 const {w,p}=start(),camp=w.camps.find(c=>c.name==='Forsaken Scouts');
 assert.throws(()=>command(w,p,'attack',{targetId:camp.id}),/unavailable/);
 p.x=camp.x;p.z=camp.z;explorationTick(w,0);p.x=p.homeX;p.z=p.homeZ;explorationTick(w,0);
 assert.equal(visible(w,p,camp),false);
 for(const health of [100,0]){camp.health=health;camp.respawn=45;command(w,p,'attack',{targetId:camp.id});w.tick(.1);assert.equal(p.target?.id,camp.id);command(w,p,'return');advance(w,2);}
 camp.health=0;camp.respawn=45;command(w,p,'attack',{targetId:camp.id});const ap=p.ap;
 for(let i=0;i<500&&p.target;i++)w.tick(.1);
 assert.equal(p.target,null);assert.equal(p.kills,0);assert.equal(p.skillCasts,0);assert.ok(p.ap>=ap);
});
