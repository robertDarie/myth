'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net'),{createHash}=require('node:crypto');
const {runLauncher,validatePackage}=require('../packaging/creator/CreatorLauncher.cjs');
async function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'myth creator spaces '));
 try{
  const pkg=path.join(root,'Package with spaces'),profile=path.join(root,'Separate Preview Profile');
  fs.mkdirSync(path.join(pkg,'Game'),{recursive:true});fs.mkdirSync(path.join(pkg,'Runtime'));fs.copyFileSync(process.execPath,path.join(pkg,'Runtime','node.exe'));
  fs.cpSync(path.resolve('server'),path.join(pkg,'Server'),{recursive:true,filter:s=>fs.statSync(s).isDirectory()?s===path.resolve('server'):(s.endsWith('.mjs')&&!s.includes('.test.')||path.basename(s)==='balance-reference.json')});
  const m={creatorPreview:true,platform:'windows-x86_64',protocol:17,version:'0.45.0',commit:'a'.repeat(40),dirty:false,serverDigest:'launcher-test',files:[]};
  for(const name of ['Runtime/node.exe','Server/index.mjs'])m.files.push({path:name,sha256:createHash('sha256').update(fs.readFileSync(path.join(pkg,name))).digest('hex')});
  fs.writeFileSync(path.join(pkg,'manifest.json'),JSON.stringify(m));
  await fn({pkg,profile,m,root});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
function fakeClient(source){return {file:process.execPath,args:['--input-type=module','-e',source]};}
test('actual production server saves, resumes and exits; paths contain spaces',()=>fixture(async({pkg,profile})=>{
 const script="const r=await fetch(process.env.CREATOR_QA_BASE+'/join',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'LauncherSynthetic',civilization:'greek'})});if(!r.ok)process.exit(2);";
 const a=await runLauncher({packageRoot:pkg,profileRoot:profile,client:fakeClient(script),log:()=>{}});
 assert.ok(fs.existsSync(path.join(profile,'world.json')));const before=JSON.parse(fs.readFileSync(path.join(profile,'world.json')));assert.ok(JSON.stringify(before).includes('LauncherSynthetic'));
 await assert.rejects(fetch('http://127.0.0.1:'+a.port+'/health'));
 const b=await runLauncher({packageRoot:pkg,profileRoot:profile,client:fakeClient("const h=await fetch(process.env.CREATOR_QA_BASE+'/health');if(!h.ok)process.exit(3)"),log:()=>{}});
 assert.equal(a.port,b.port);assert.ok(fs.readFileSync(path.join(profile,'world.json'),'utf8').includes('LauncherSynthetic'));assert.ok(!fs.existsSync(path.join(profile,'launcher.lock')));
}));
test('busy saved port refuses even a compatible preexisting server and does not close it',()=>fixture(async({pkg,profile})=>{
 const s=net.createServer(c=>c.end());await new Promise(ok=>s.listen(0,'127.0.0.1',ok));
 try{fs.mkdirSync(profile);fs.writeFileSync(path.join(profile,'profile.json'),JSON.stringify({protocol:17,port:s.address().port}));await assert.rejects(runLauncher({packageRoot:pkg,profileRoot:profile,log:()=>{}}),/No existing server was used or stopped/);assert.equal(s.listening,true);}finally{await new Promise(ok=>s.close(ok));}
}));
test('profile lock prevents duplicate authority; preserves existing save sentinel',()=>fixture(async({pkg,profile})=>{
 fs.mkdirSync(profile);fs.writeFileSync(path.join(profile,'launcher.lock'),JSON.stringify({pid:process.pid}));fs.writeFileSync(path.join(profile,'world.json'),'synthetic sentinel');
 await assert.rejects(runLauncher({packageRoot:pkg,profileRoot:profile}),/already running/);assert.equal(fs.readFileSync(path.join(profile,'world.json'),'utf8'),'synthetic sentinel');
}));
test('changed runtime payload is rejected before touching a profile',()=>fixture(async({pkg,profile})=>{
 fs.appendFileSync(path.join(pkg,'Server','index.mjs'),'\n// changed');assert.throws(()=>validatePackage(pkg),/missing or changed/);await assert.rejects(runLauncher({packageRoot:pkg,profileRoot:profile}),/missing or changed/);assert.ok(!fs.existsSync(profile));
}));
test('client failure still shuts down only owned authority and releases lock',()=>fixture(async({pkg,profile})=>{
 await assert.rejects(runLauncher({packageRoot:pkg,profileRoot:profile,client:fakeClient('process.exit(9)'),log:()=>{}}),/closed unexpectedly/);
 const m=JSON.parse(fs.readFileSync(path.join(profile,'profile.json')));await assert.rejects(fetch('http://127.0.0.1:'+m.port+'/health'));assert.ok(!fs.existsSync(path.join(profile,'launcher.lock')));
}));
