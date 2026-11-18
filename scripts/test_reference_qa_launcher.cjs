const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
async function start(args,env){
 const child=spawn(process.execPath,['scripts/start-reference-game-qa.mjs','--qa-reference-city',...args],{cwd:path.resolve('.'),windowsHide:true,stdio:['ignore','pipe','pipe'],env});
 let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);
 for(let i=0;i<150;i++){
  const base=output.match(/Real game endpoint: (http:\/\/127\.0\.0\.1:\d+)/),directory=output.match(/Isolated QA directory: (.+)/);
  if(base&&directory)return {child,base:base[1],directory:directory[1].trim()};
  if(child.exitCode!==null)throw Error('QA launcher exited: '+errors);
  await pause(100);
 }
 child.kill();throw Error('QA launcher did not become ready');
}
async function stop(host){if(!host||host.child.exitCode!==null||host.child.signalCode!==null)return;const exited=new Promise(ok=>host.child.once('exit',ok));host.child.kill('SIGTERM');await exited;}
async function waitFor(action){for(let i=0;i<150;i++){const value=await action();if(value)return value;await pause(100);}throw Error('QA state did not reach expected result');}
test('actual disposable QA process crash/restart preserves paid progression, real session and exact-once receipt',async()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'myth-B2-launch-')),sentinel=path.join(temporary,'ordinary.json');fs.writeFileSync(sentinel,'ordinary save sentinel');
 const env={...process.env,THRONES_SAVE_PATH:sentinel,THRONES_REALMS:'must-not-load-this'};let first,second;
 try{
  first=await start([],env);
  await assert.rejects(start(['--resume',first.directory],env),/already running/);
  const api=async(host,route,data,token)=>{const r=await fetch(host.base+route,{method:data?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+(token??'')},body:data?JSON.stringify(data):undefined});assert.ok(r.ok,route+' '+r.status);return r.json();};
  const session=await api(first,'/join',{name:'Process restart QA',civilization:'greek'});
  const own=async host=>(await api(host,'/world',null,session.token)).players.find(p=>p.id===session.playerId);
  await waitFor(async()=>{const p=await own(first);return p.referenceCity.buildings.find(b=>b.id==='farm').stored>=5;});
  await api(first,'/command',{type:'qa-city-collect',requestId:'process-collect'},session.token);const before=(await own(first)).food;
  const paid={type:'qa-city-upgrade',targetId:'citadel',requestId:'process-paid-order'};
  await api(first,'/command',paid,session.token);assert.equal((await own(first)).food,before-4);
  const port=new URL(first.base).port;await stop(first);
  second=await start(['--resume',first.directory,'--port',port],env);
  const resumed=await api(second,'/join',{name:'Process restart QA',civilization:'greek',resumeToken:session.token});assert.equal(resumed.playerId,session.playerId);
  const final=await waitFor(async()=>{const p=await own(second);return p.referenceCity.buildings.find(b=>b.id==='citadel').level===2?p:null;});
  assert.equal(final.food,before-4);await api(second,'/command',paid,session.token);assert.equal((await own(second)).food,before-4);
  assert.equal(fs.readFileSync(sentinel,'utf8'),'ordinary save sentinel');
  console.log(JSON.stringify({actualProcesses:2,clock:'real server elapsed time plus explicit outage catch-up',paidUpgrade:'Citadel2',sessionRestored:true,receiptReplay:'NO SECOND DEBIT',ordinarySaveUntouched:true,native:'NOT a native UI test'}));
 }finally{
  await stop(first);await stop(second);
  assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir())+path.sep+'myth-B2-launch-'));fs.rmSync(temporary,{recursive:true,force:true});
 }
});
