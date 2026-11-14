import { LIMITS } from './world-map.mjs';
import { WORLD_SIZE } from './world-map.mjs';
import { randomUUID } from 'node:crypto';
import { releaseAllianceDiplomacy, coalitionOf } from './diplomacy.mjs';
export const allianceRole = (w, p) => { const a = w.alliances.get(p.allianceId); return !a ? 'None' : a.leaderId === p.id ? 'Leader' : a.officers.includes(p.id) ? 'Officer' : 'Member'; };
export function initializeSocial(p) { p.lastChatAt = -10; }
const canManage = (w,p) => ['Leader','Officer'].includes(allianceRole(w,p));
export function socialCommand(w,p,c,fail) {
  if(c.type === 'chat-send') {
    const channel = c.targetId || 'kingdom';
    if(!['kingdom','alliance','coalition'].includes(channel) || (channel==='alliance' && !p.allianceId)) fail('Choose an available chat channel.');
    if(channel==='coalition' && !coalitionOf(w,p.allianceId)) fail('Join a coalition before using coalition chat.');
    if(typeof c.name !== 'string' || !c.name.trim() || c.name.trim().length>240 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(c.name)) fail('Messages must contain 1–240 readable characters.');
    if(w.time-p.lastChatAt<1) fail('Wait a moment before sending another message.');
    w.messages.unshift({id:randomUUID(),channel,allianceId:channel==='alliance'?p.allianceId:'',coalitionId:channel==='coalition'?coalitionOf(w,p.allianceId).id:'',authorId:p.id,author:p.name,text:c.name.trim(),time:w.time});
    w.messages.length=Math.min(120,w.messages.length);p.lastChatAt=w.time;return true;
  }
  if(c.type==='marker-place') {
    if(!canManage(w,p)) fail('Only alliance leaders and officers can place shared markers.');
    if(![c.x,c.z].every(v=>Number.isFinite(v)&&v>=1&&v<=WORLD_SIZE-1)||!w.canEnter(p,c)) fail('Choose an accessible map position.');
    if(typeof c.name!=='string'||!c.name.trim()||c.name.trim().length>40) fail('Marker names contain 1–40 characters.');
    if(w.markers.filter(m=>m.allianceId===p.allianceId).length>=12) fail('Alliance marker limit reached.');
    w.markers.push({id:randomUUID(),allianceId:p.allianceId,authorId:p.id,name:c.name.trim(),x:c.x,z:c.z,expires:w.time+600});return true;
  }
  if(c.type==='marker-remove') {
    const marker=w.markers.find(m=>m.id===c.targetId&&m.allianceId===p.allianceId);
    if(!marker||!canManage(w,p)) fail('Only an alliance leader or officer can remove this marker.');
    w.markers=w.markers.filter(m=>m.id!==marker.id);return true;
  }
  if(!['alliance-leave','alliance-kick','alliance-promote','alliance-demote','alliance-transfer'].includes(c.type))return false;
  const alliance=w.alliances.get(p.allianceId);if(!alliance)fail('Join an alliance first.');
  const leader=alliance.leaderId===p.id;
  if(c.type==='alliance-leave') {
    const members=[...w.players.values()].filter(q=>q.allianceId===alliance.id);
    if(leader&&members.length>1)fail('Transfer leadership before leaving your alliance.');
    p.allianceId='';alliance.officers=alliance.officers.filter(id=>id!==p.id);
    if(leader) {
      w.alliances.delete(alliance.id);releaseAllianceDiplomacy(w,alliance.id);w.flags=w.flags.filter(f=>f.allianceId!==alliance.id);w.markers=w.markers.filter(m=>m.allianceId!==alliance.id);
      for(const site of w.sites){if(site.allianceId===alliance.id)site.allianceId='';if(site.challengerId===alliance.id){site.challengerId='';site.progress=0;}}
    }
    w.event(`${p.name} left ${alliance.name}.`);return true;
  }
  const other=w.players.get(c.targetId);
  if(!other||other.id===p.id||other.allianceId!==p.allianceId)fail('Choose another member of your alliance.');
  if(c.type==='alliance-kick') {
    if(!canManage(w,p)||other.id===alliance.leaderId||(!leader&&alliance.officers.includes(other.id)))fail('You do not have permission to remove that member.');
    other.allianceId='';alliance.officers=alliance.officers.filter(id=>id!==other.id);w.event(`${other.name} was removed from ${alliance.name}.`);return true;
  }
  if(!leader)fail('Only the alliance leader can change ranks or transfer leadership.');
  if(c.type==='alliance-transfer'){alliance.leaderId=other.id;alliance.officers=alliance.officers.filter(id=>id!==other.id);if(!alliance.officers.includes(p.id))alliance.officers.push(p.id);}
  if(c.type==='alliance-promote'&&!alliance.officers.includes(other.id))alliance.officers.push(other.id);
  if(c.type==='alliance-demote')alliance.officers=alliance.officers.filter(id=>id!==other.id);
  return true;
}
export function validateSocial(w) {
  if(!Array.isArray(w.messages)||w.messages.length>120||!Array.isArray(w.markers)||w.markers.length>LIMITS.maxCities*12)throw new Error('Invalid saved communications.');
  for(const p of w.players.values())if(!Number.isFinite(p.lastChatAt)||p.lastChatAt < -10)throw new Error('Invalid saved chat timing.');
  if(new Set(w.messages.map(m=>m.id)).size!==w.messages.length||new Set(w.markers.map(m=>m.id)).size!==w.markers.length)throw new Error('Invalid saved communication IDs.');
  for(const m of w.messages){if(!m||typeof m.id!=='string'||!['kingdom','alliance','coalition'].includes(m.channel)||typeof m.authorId!=='string'||typeof m.author!=='string'||typeof m.allianceId!=='string'||typeof m.text!=='string'||m.text.length>240||!Number.isFinite(m.time)||m.time<0)throw new Error('Invalid saved message.');const coalitionId=typeof m.coalitionId==='string'?m.coalitionId:'';if((m.channel==='coalition'&&!w.coalitions?.some(c=>c.id===coalitionId))||(m.channel!=='coalition'&&coalitionId!==''))throw new Error('Invalid saved message.');}
  for(const m of w.markers)if(!m||typeof m.id!=='string'||typeof m.name!=='string'||m.name.length>40||!w.alliances.has(m.allianceId)||!w.players.has(m.authorId)||![m.x,m.z].every(v=>Number.isFinite(v)&&v>=1&&v<=WORLD_SIZE-1)||!Number.isFinite(m.expires))throw new Error('Invalid saved marker.');
  for(const a of w.alliances.values())if(!Array.isArray(a.officers)||new Set(a.officers).size!==a.officers.length||a.officers.some(id=>id===a.leaderId||w.players.get(id)?.allianceId!==a.id)||w.players.get(a.leaderId)?.allianceId!==a.id)throw new Error('Invalid saved alliance roles.');
}

// Alliance membership/assistance is live social data, separate from frozen city intelligence.
export function allianceRoster(w,p){
 if(!p?.allianceId)return [];
 return [...w.players.values()].filter(q=>q.allianceId===p.allianceId).map(q=>({id:q.id,name:q.name,role:allianceRole(w,q),jobs:[q.construction,q.secondConstruction,q.research].filter(j=>j&&j.id&&q.buildings.oathhall).map(j=>({id:j.id,type:j.type,remaining:j.remaining,duration:j.duration,canHelp:q.id!==p.id&&p.buildings.oathhall>0&&!(j.helpedBy??[]).includes(p.id)&&(j.helpedBy??[]).length<Math.min(5,1+q.buildings.oathhall)}))}));
}
