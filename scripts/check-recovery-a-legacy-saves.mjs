// Read-only replay of immutable prior source into an ignored archive directory.
// This is not a checkout/worktree and never reads a real user's kingdom save.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {World} from '../server/world.mjs';
const baseline='69c58ea6e55b7bfe0c0cba0c2a0ea096e32a6d81',archive=resolve('work/recovery-a/baseline-source-'+baseline.slice(0,12));
const files=execFileSync('git',['ls-tree','-r','--name-only',baseline,'server'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>/^server\/[^/]+\.(mjs|json)$/.test(p)&&!p.endsWith('.test.mjs'));
assert.ok(files.includes('server/world.mjs'));
for(const name of files){const target=resolve(archive,name);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,execFileSync('git',['show',baseline+':'+name]));}
const {World:OldWorld}=await import(pathToFileURL(resolve(archive,'server/world.mjs')).href);
for(let initial=1;initial<=32;initial++){
 let seed=initial,old;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/2**32),now=()=>Date.UTC(2026,10,17)+Math.floor((old?.time??0)*1000);
 old=new OldWorld({random,now});const session=old.join('Historical migration '+initial),player=old.authenticate(session.token);
 old.command(player,{type:'alliance-create',name:'Historical synthetic '+initial});old.command(player,{type:'building-upgrade',targetId:'citadel'});
 for(let i=0;i<16;i++)old.tick(.25);
 const saved=structuredClone(old.toSave());assert.equal(saved.schema,27);
 const copy=World.fromSave(saved,{now}),next=copy.toSave();assert.equal(next.schema,28);
 const expected=saved.world.players.map(p=>({...p,offline:true,nextActive:'primary',lastSkillRole:'',marches:p.marches.map(a=>({...a,nextActive:'primary',lastSkillRole:''})),scouts:p.scouts.map(s=>({...s,autoAssigned:s.autoAssigned??false}))}));assert.ok(isDeepStrictEqual(next.world.players,expected),'Player/commander/job/resource state changed beyond declared defaults for seed'+initial);
 for(const key of ['sessions','alliances','nodes','camps','flags','strongholds','rallies','garrisons','sieges','kingdom']){const expectedValue=key==='alliances'?saved.world[key].map(a=>({...a,invites:[]})):saved.world[key];assert.ok(isDeepStrictEqual(next.world[key],expectedValue),key+' changed beyond declared empty invitations for seed'+initial);}
 for(const site of saved.world.sites){const actual=next.world.sites.find(s=>s.id===site.id);assert.ok(actual);for(const [key,value]of Object.entries(site))assert.ok(isDeepStrictEqual(actual[key],value),'Existing site '+site.id+'.'+key+' changed');}
 assert.equal(next.world.sites.length,saved.world.sites.length+8);assert.equal(next.world.sites.filter(s=>s.kind==='gate').length,10);
}
const result={baseline,syntheticSaves:32,paidConstructionQueues:32,sourceSchema:27,resultSchema:28,addedPassesPerSave:8,unchanged:'Players, commanders, paid jobs, resources, sessions, alliances, nodes, camps, existing sites, flags, strongholds, rallies, garrisons, sieges and kingdom state; normal offline presence flag excepted',scope:'Actual baseline-code synthetic saves, not maximum-state fixtures or real user saves; no extra Git worktree'};
mkdirSync(resolve('work/recovery-a'),{recursive:true});writeFileSync(resolve('work/recovery-a/historical-migration.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
