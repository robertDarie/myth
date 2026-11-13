import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm,copyFile,lstat,symlink,unlink} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import http from 'node:http';
import {launch,verifyPackage} from '../packaging/linux/Launch.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'thrones-linux-'));await mkdir(join(dir,'Game'));await mkdir(join(dir,'Server'));
 await writeFile(join(dir,'Game/ThronesOfMyth.x86_64'),'#!/bin/sh\nexit 0\n',{mode:0o755});
 for(const name of await readdir(join(root,'server')))if(name.endsWith('.mjs')&&!name.endsWith('.test.mjs'))await copyFile(join(root,'server',name),join(dir,'Server',name));
 await copyFile(join(root,'packaging/linux/Launch.mjs'),join(dir,'Launch.mjs'));
 const files=[];for(const folder of ['Game','Server'])for(const name of await readdir(join(dir,folder))){const path=folder+'/'+name;files.push({path,sha256:createHash('sha256').update(await readFile(join(dir,path))).digest('hex')});}
 files.push({path:'Launch.mjs',sha256:createHash('sha256').update(await readFile(join(dir,'Launch.mjs'))).digest('hex')});
 const manifest={version:'0.34.0',commit:'0'.repeat(40),protocol:16,platform:'linux-x86_64',dirty:false,files};await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));return {dir,manifest};
}
test('Linux manifest checks matching game/server payloads, blocks tampering and traversal',async()=>{
 const {dir,manifest}=await fixture();try{
  assert.equal((await verifyPackage(dir)).version,'0.34.0');
  await writeFile(join(dir,'Server/world.mjs'),'tampered');await assert.rejects(()=>verifyPackage(dir),/changed/);
  await copyFile(join(root,'server/world.mjs'),join(dir,'Server/world.mjs'));
  manifest.files[0].path='../escape';await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));await assert.rejects(()=>verifyPackage(dir),/path/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Linux package verification rejects a symlinked server file',async t=>{
 const {dir}=await fixture();try{
  await unlink(join(dir,'Server/world.mjs'));
  try{await symlink(join(root,'server/world.mjs'),join(dir,'Server/world.mjs'));}
  catch(error){if(error.code==='EPERM'&&process.platform==='win32'){t.skip('Windows cannot create this symlink fixture without Developer Mode. Linux still rejects substituted package files.');return;}throw error;}
  await assert.rejects(()=>verifyPackage(dir),/regular/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
const linuxClient=process.platform==='linux'?false:'The packaged client is a Linux executable. This assertion runs unchanged on Linux.';
test('Linux package includes the entire live server import graph and source-version contract',async()=>{
 const {dir,manifest}=await fixture();try{
  const included=new Set(manifest.files.map(f=>f.path));const visited=new Set();
  async function visit(file){if(visited.has(file))return;visited.add(file);assert.ok(included.has('Server/'+file));const source=await readFile(join(dir,'Server',file),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))await visit(match[1]);}
  await visit('index.mjs');assert.ok(visited.has('economy.mjs')&&visited.has('discovery.mjs'));
  const builder=await readFile(join(root,'client/Assets/ThronesOfMyth/Editor/LinuxPlaytestBuilder.cs'),'utf8');assert.ok(builder.includes('StandaloneLinux64')&&builder.includes('ReleaseVersion.Current')&&builder.includes('identity.WriteManifest'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Linux launcher starts the real packaged server, runs a client stub, saves and stops only its child',{skip:linuxClient},async()=>{
 const {dir}=await fixture(),port=await freePort(),old=process.env.XDG_DATA_HOME;process.env.XDG_DATA_HOME=join(dir,'data');
 try{await launch(dir,['--port='+port]);const save=JSON.parse(await readFile(join(dir,'data/ThronesOfMyth/Saves/world-'+port+'.json'),'utf8'));assert.equal(save.schema,20);assert.deepEqual(save.world.players,[]);await assert.rejects(()=>lstat(join(dir,'data/ThronesOfMyth/launcher-'+port+'.lock')),/ENOENT/);await assert.rejects(()=>fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(400)}));}
 finally{if(old===undefined)delete process.env.XDG_DATA_HOME;else process.env.XDG_DATA_HOME=old;await rm(dir,{recursive:true,force:true});}
});
test('Linux launcher refuses an occupied port without stopping or altering that server',async()=>{
 const {dir}=await fixture(),old=process.env.XDG_DATA_HOME;process.env.XDG_DATA_HOME=join(dir,'data');const existing=http.createServer((q,s)=>{s.writeHead(200);s.end('unrelated');});await new Promise(r=>existing.listen(0,'127.0.0.1',r));const port=existing.address().port;
 try{await assert.rejects(()=>launch(dir,['--port='+port]),/already in use/);assert.equal(await (await fetch('http://127.0.0.1:'+port)).text(),'unrelated');}
 finally{await new Promise(r=>existing.close(r));if(old===undefined)delete process.env.XDG_DATA_HOME;else process.env.XDG_DATA_HOME=old;await rm(dir,{recursive:true,force:true});}
});
test('a failing client stub still leaves a saved world and no owned server or launcher lock',{skip:linuxClient},async()=>{
 const {dir,manifest}=await fixture(),port=await freePort(),old=process.env.XDG_DATA_HOME;process.env.XDG_DATA_HOME=join(dir,'data');
 try{
  const exe=join(dir,'Game/ThronesOfMyth.x86_64');await writeFile(exe,'#!/bin/sh\nexit 7\n');manifest.files.find(f=>f.path==='Game/ThronesOfMyth.x86_64').sha256=createHash('sha256').update(await readFile(exe)).digest('hex');await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
  await assert.rejects(()=>launch(dir,['--port='+port]),/Client exited with 7/);assert.equal(JSON.parse(await readFile(join(dir,'data/ThronesOfMyth/Saves/world-'+port+'.json'),'utf8')).schema,20);await assert.rejects(()=>lstat(join(dir,'data/ThronesOfMyth/launcher-'+port+'.lock')),/ENOENT/);await assert.rejects(()=>fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(400)}));
 }finally{if(old===undefined)delete process.env.XDG_DATA_HOME;else process.env.XDG_DATA_HOME=old;await rm(dir,{recursive:true,force:true});}
});
test('SIGTERM waits for owned client/server cleanup before releasing the launcher lock',{skip:linuxClient},async()=>{
 const {dir,manifest}=await fixture(),port=await freePort();let child;
 try{
  const exe=join(dir,'Game/ThronesOfMyth.x86_64');await writeFile(exe,"#!/usr/bin/env node\nrequire('node:fs').writeFileSync('stub.started','ready');setInterval(()=>{},1000);\n");manifest.files.find(f=>f.path==='Game/ThronesOfMyth.x86_64').sha256=createHash('sha256').update(await readFile(exe)).digest('hex');await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
  child=spawn(process.execPath,[join(dir,'Launch.mjs'),'--port='+port],{env:{...process.env,XDG_DATA_HOME:join(dir,'data')},stdio:'ignore'});const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
  let started=false;for(let i=0;i<100;i++){try{await lstat(join(dir,'Game/stub.started'));started=true;break;}catch{}await pause(50);}
  assert.equal(started,true,'Client stub must start');child.kill('SIGTERM');const result=await Promise.race([exited,pause(10000,null,{ref:false}).then(()=>{throw Error('Launcher cleanup timed out');})]);assert.equal(result.code,0);await assert.rejects(()=>lstat(join(dir,'data/ThronesOfMyth/launcher-'+port+'.lock')),/ENOENT/);await assert.rejects(()=>fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(400)}));
 }finally{if(child&&child.exitCode===null)child.kill('SIGTERM');await rm(dir,{recursive:true,force:true});}
});
test('client-only join verifies host build/server payload and never stops the independently managed server',{skip:linuxClient},async()=>{
 const {createGameServer}=await import('./http.mjs');const {joinClient,serverDigest}=await import('../packaging/linux/Launch.mjs');const {dir,manifest}=await fixture();manifest.serverDigest=serverDigest(manifest);const app=createGameServer({buildIdentity:{version:manifest.version,commit:manifest.commit,serverDigest:manifest.serverDigest}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const address='http://127.0.0.1:'+app.server.address().port,old=process.env.XDG_DATA_HOME;process.env.XDG_DATA_HOME=join(dir,'data');
 try{await joinClient(dir,manifest,address,[]);assert.equal((await fetch(address+'/health')).status,200);await assert.rejects(()=>joinClient(dir,{...manifest,commit:'1'.repeat(40)},address,[]),/does not match/);assert.equal((await fetch(address+'/health')).status,200);assert.equal((await readdir(join(dir,'data/ThronesOfMyth'))).some(n=>n.endsWith('.lock')),false);}
 finally{await new Promise(r=>{app.server.close(r);app.server.closeAllConnections();});if(old===undefined)delete process.env.XDG_DATA_HOME;else process.env.XDG_DATA_HOME=old;await rm(dir,{recursive:true,force:true});}
});
