// Private creator preview: loopback authority and a separate, persistent local profile.
'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function profileDefault(version){
 if(!process.env.LOCALAPPDATA)throw Error('Windows Local AppData is unavailable. Launch from your normal Windows account.');
 return path.join(process.env.LOCALAPPDATA,'ThronesOfMyth','CreatorPreview',version);
}
function validatePackage(root){
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 if(m.platform!=='windows-x86_64'||m.protocol!==17||m.dirty!==false||!m.creatorPreview||!/^\d+\.\d+\.\d+$/.test(m.version)||!/^[a-f0-9]{40}$/.test(m.commit))throw Error('This is not a clean, matching creator preview package. Extract the complete ZIP again.');
 for(const item of m.files){
  const file=path.resolve(root,item.path);
  if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Unsafe package inventory.');
  if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error('A preview file is missing or changed: '+item.path+'. Extract the complete ZIP again.');
 }
 return m;
}
async function unusedPort(){const s=net.createServer();await new Promise((ok,no)=>{s.once('error',no);s.listen(0,'127.0.0.1',ok);});const port=s.address().port;await new Promise(ok=>s.close(ok));return port;}
async function portAvailable(port){const s=net.createServer();try{await new Promise((ok,no)=>{s.once('error',no);s.listen(port,'127.0.0.1',ok);});return true;}catch{return false;}finally{if(s.listening)await new Promise(ok=>s.close(ok));}}
function takeLock(file){
 try{const fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));fs.closeSync(fd);return;}
 catch(e){if(e.code!=='EEXIST')throw e;}
 let prior;try{prior=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('The creator preview profile is locked. Close its other launcher, then try again.');}
 if(!Number.isInteger(prior.pid)||prior.pid<1)throw Error('The creator preview profile is locked.');
 try{process.kill(prior.pid,0);}catch(e){if(e.code==='ESRCH'){fs.unlinkSync(file);return takeLock(file);}throw e;}
 throw Error('This creator preview is already running. Switch to its game window.');
}
async function runLauncher({packageRoot=__dirname,profileRoot,client,readyTimeout=12000,log=console.log}={}){
 const manifest=validatePackage(packageRoot);
 profileRoot=path.resolve(profileRoot||profileDefault(manifest.version));fs.mkdirSync(profileRoot,{recursive:true});
 const lock=path.join(profileRoot,'launcher.lock');takeLock(lock);
 let server,game,shutdown,base,output,errorLog,listening=false,serverError,serverSaved=false;
 const logs=path.join(profileRoot,'Logs');
 async function stop(){
  if(!server||server.exitCode!==null||server.signalCode)return;
  try{const response=await fetch(base+'/launcher-shutdown',{method:'POST',headers:{'x-thrones-launcher':shutdown},signal:AbortSignal.timeout(5000)});serverSaved=response.ok&&(await response.json()).saved===true;}catch{}
  for(let i=0;i<60&&server.exitCode===null&&!server.signalCode;i++)await pause(100);
  if(server.exitCode===null&&!server.signalCode){log('The local server needed emergency closure. Its last autosave is retained.');server.kill();await new Promise(ok=>server.once('exit',ok));}
 }
 const signal=()=>{if(game&&game.exitCode===null)game.kill();void stop();};
 try{
  const metaFile=path.join(profileRoot,'profile.json');let metadata;
  if(fs.existsSync(metaFile)){metadata=JSON.parse(fs.readFileSync(metaFile,'utf8'));if(metadata.protocol!==manifest.protocol||!Number.isInteger(metadata.port)||metadata.port<1024||metadata.port>65535)throw Error('This saved creator preview uses an incompatible profile. Your kingdom has not been changed.');}
  else{metadata={protocol:manifest.protocol,port:await unusedPort()};fs.writeFileSync(metaFile,JSON.stringify(metadata,null,2)+'\n',{flag:'wx'});}
  if(!await portAvailable(metadata.port))throw Error('This preview’s saved local port is busy. Close the other preview or restart Windows, then retry. No existing server was used or stopped.');
  base='http://127.0.0.1:'+metadata.port;shutdown=randomUUID();fs.mkdirSync(logs,{recursive:true});
  output=fs.createWriteStream(path.join(logs,'server.log'));errorLog=fs.createWriteStream(path.join(logs,'server-error.log'));
  const env={...process.env,THRONES_SAVE_PATH:path.join(profileRoot,'world.json'),THRONES_DB_PATH:'',THRONES_REALMS:'',THRONES_METRICS_PATH:'',THRONES_JOIN_CODE:'',THRONES_KINGDOM_ID:'local',THRONES_LAUNCH_TOKEN:shutdown,THRONES_BUILD_VERSION:manifest.version,THRONES_BUILD_COMMIT:manifest.commit,THRONES_SERVER_DIGEST:manifest.serverDigest};
  server=spawn(path.join(packageRoot,'Runtime','node.exe'),[path.join(packageRoot,'Server','index.mjs'),'--local-playtest','--local-port='+metadata.port],{cwd:packageRoot,windowsHide:true,env,stdio:['ignore','pipe','pipe']});
  server.on('error',e=>{serverError=e;});server.stdout.pipe(output);server.stderr.pipe(errorLog);
  server.stdout.on('data',chunk=>{if(chunk.toString().includes('listening at '+base))listening=true;});
  process.on('SIGINT',signal);process.on('SIGTERM',signal);
  let ready=false;
  for(const end=Date.now()+readyTimeout;Date.now()<end;){
   if(serverError||server.exitCode!==null)throw Error('The preview server could not start. See '+logs+'. '+(serverError?.message||''));
   if(listening)try{const response=await fetch(base+'/health',{signal:AbortSignal.timeout(700)});const h=await response.json();if(h.game!=='thrones-of-myth'||h.version!==manifest.protocol||h.build?.version!==manifest.version||h.build?.commit!==manifest.commit||h.build?.serverDigest!==manifest.serverDigest)throw Error('The local server identity does not match this game.');ready=true;break;}catch(e){if(e.message.includes('identity'))throw e;}
   await pause(100);
  }
  if(!ready)throw Error('The local preview did not become ready. See '+logs+'.');
  log('PRIVATE CREATOR PREVIEW — work in progress');log('Matching local server ready: '+manifest.version+' / '+manifest.commit.slice(0,12)+' / protocol '+manifest.protocol);log('Your private preview kingdom: '+profileRoot);log('Keep this window open. Closing the game saves and closes only this preview server.');
  const file=client?.file||path.join(packageRoot,'Game','ThronesOfMyth.exe');
  const args=client?.args||['--thrones-server',base,'-screen-fullscreen','0','-logFile',path.join(logs,'Player.log')];
  game=spawn(file,args,{cwd:path.join(packageRoot,'Game'),windowsHide:false,stdio:'ignore',env:{...process.env,CREATOR_QA_BASE:base}});
  const code=await new Promise((ok,no)=>{game.once('error',no);game.once('exit',ok);});
  if(code!==0)throw Error('The game closed unexpectedly. Your last autosave is retained. Logs: '+logs);
  await stop();if(!serverSaved)throw Error('The final save could not be confirmed. Keep your preview profile and check its logs; the last successful autosave is retained.');log('Preview closed. Your kingdom is saved for next time.');
  return {profileRoot,port:metadata.port,commit:manifest.commit};
 }finally{
  await stop();process.off('SIGINT',signal);process.off('SIGTERM',signal);output?.end();errorLog?.end();
  try{if(JSON.parse(fs.readFileSync(lock,'utf8')).pid===process.pid)fs.unlinkSync(lock);}catch{}
 }
}
module.exports={runLauncher,validatePackage,profileDefault};
if(require.main===module){
 const args=process.argv.slice(2),i=args.indexOf('--profile-root');
 runLauncher({profileRoot:i>=0?args[i+1]:undefined}).catch(e=>{console.error('\nCould not open Thrones of Myth: '+e.message+'\nNo Administrator access or installed Node/Unity is required. Read START_HERE.txt.');process.exitCode=1;});
}
