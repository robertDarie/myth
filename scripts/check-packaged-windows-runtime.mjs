// Optional actual Windows artifact acceptance. Fresh local-playtest store only;
// never invokes the desktop launcher or its real default save path.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {performance} from 'node:perf_hooks';
assert.equal(process.platform,'win32','Actual Windows packaged runtime is required; not a platform skip');
const folder=resolve(process.argv[2]??'dist/Windows');
assert.ok(folder.startsWith(resolve('dist')+sep),'Use a generated package inside dist');
const manifest=JSON.parse(readFileSync(resolve(folder,'manifest.json'),'utf8'));
assert.equal(manifest.platform,'windows-x86_64');assert.equal(manifest.dirty,false);
const root=resolve('work/task4','packaged-'+randomUUID());mkdirSync(root,{recursive:true});
const shutdown=randomUUID(),sessions=[],checks=[];let child,base;
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const report={testedPackageCommit:manifest.commit,protocol:manifest.protocol,scope:'Actual bundled Windows Node and Server/index.mjs; fresh JSON and real wall-clock construction; no native graphics or remote PCs',checks};
async function freePort(){const server=createServer();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const port=server.address().port;await new Promise(ok=>server.close(ok));return port;}
async function start(){
 const port=await freePort(),at=performance.now();base='http://127.0.0.1:'+port;
 child=spawn(resolve(folder,'Runtime/node.exe'),[resolve(folder,'Server/index.mjs'),'--local-playtest','--local-port='+port],{windowsHide:true,stdio:'ignore',env:{...process.env,THRONES_SAVE_PATH:resolve(root,'disposable-world.json'),THRONES_METRICS_PATH:'',THRONES_REALMS:'',THRONES_LAUNCH_TOKEN:shutdown,THRONES_BUILD_VERSION:manifest.version,THRONES_BUILD_COMMIT:manifest.commit,THRONES_SERVER_DIGEST:manifest.serverDigest}});
 let error;child.on('error',e=>{error=e;});
 for(let i=0;i<300;i++){if(error)throw error;if(child.exitCode!==null)throw Error('Packaged server exited before readiness');try{const response=await fetch(base+'/readyz');if(response.ok)return performance.now()-at;}catch{}await pause(50);}
 throw Error('Packaged runtime readiness timed out');
}
async function stop(){if(!child||child.exitCode!==null)return;const done=new Promise(ok=>child.once('exit',ok));assert.ok((await fetch(base+'/launcher-shutdown',{method:'POST',headers:{'x-thrones-launcher':shutdown}})).ok);await done;assert.equal(child.exitCode,0);child=null;}
async function request(path,body=null,s=null){const response=await fetch(base+path,{method:body===null?'GET':'POST',headers:{...(s?{Authorization:'Bearer '+s.token}:{}),'Content-Type':'application/json'},...(body===null?{}:{body:JSON.stringify(body)})});return {status:response.status,body:await response.json()};}
const command=(s,body)=>request('/command',body,s),own=async s=>{const r=await request('/world',null,s);assert.equal(r.status,200);return r.body.players.find(p=>p.id===s.playerId);};
try{
 report.startupMs=await start();const health=await request('/health');assert.equal(health.body.build.commit,manifest.commit);assert.equal(health.body.build.serverDigest,manifest.serverDigest);checks.push('PASS matching packaged build readiness');
 assert.equal((await request('/world')).status,401);checks.push('PASS unauthenticated request rejected');
 for(let i=0;i<3;i++){const r=await request('/join',{name:'Packaged QA '+i,civilization:['greek','egyptian','norse'][i]});assert.equal(r.status,201);sessions.push(r.body);}checks.push('PASS three authenticated fresh cities');
 const p=await own(sessions[0]),target=p.homeX<=40&&p.homeZ<=40?{x:128,z:128}:{x:20,z:20};
 assert.equal((await command(sessions[0],{type:'move',...target})).status,400);
 assert.equal((await command(sessions[0],{type:'scout-send',...target})).status,200);checks.push('PASS military denial with scout exemption');
 assert.equal((await command(sessions[0],{type:'move',marchId:sessions[1].playerId,x:10,z:10})).status,400);checks.push('PASS foreign army control rejected');
 assert.equal((await command(sessions[0],{type:'train',targetId:'infantry'})).status,200);const queued=(await own(sessions[0])).trainingQueue;assert.equal(queued.length,1);assert.equal(queued[0].amount,100);assert.equal(queued[0].duration,1500);checks.push('PASS paid production training queue');
 const at=performance.now();assert.equal((await command(sessions[0],{type:'building-upgrade',targetId:'citadel'})).status,200);
 for(let i=0;i<240&&(await own(sessions[0])).cityLevel<2;i++)await pause(250);
 assert.equal((await own(sessions[0])).cityLevel,2);report.actualConstructionWallSeconds=(performance.now()-at)/1000;checks.push('PASS Citadel2 completion on real production clock');
 await stop();await start();for(const s of sessions){const resumed=await request('/join',{resumeToken:s.token,name:'ignored'});assert.equal(resumed.status,201);assert.equal(resumed.body.playerId,s.playerId);}
 const restored=await own(sessions[0]);assert.equal(restored.cityLevel,2);assert.equal(restored.trainingQueue.length,1);checks.push('PASS new packaged process preserves three identities, city and paid job');
 await stop();checks.push('PASS both graceful packaged process shutdowns');
 mkdirSync('work/task4',{recursive:true});writeFileSync('work/task4/packaged-runtime.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{if(child&&child.exitCode===null){try{await stop();}catch{child.kill();}}}
