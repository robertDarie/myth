import {spawn} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,mkdir,open,unlink,lstat,chmod} from 'node:fs/promises';
import {dirname,join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {setTimeout as pause} from 'node:timers/promises';
export async function verifyPackage(root){
 const m=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
 if(m.platform!=='linux-x86_64'||m.protocol!==16||!/^\d+\.\d+\.\d+$/.test(m.version)||!/^[a-f0-9]{40,64}$/.test(m.commit)||!Array.isArray(m.files))throw Error('Invalid Linux package identity. Rebuild the entire package.');
 const seen=new Set();
 for(const entry of m.files){
  if(typeof entry.path!=='string'||entry.path.includes('\\')||entry.path.split('/').some(p=>!p||p==='.'||p==='..')||entry.path.startsWith('/')||seen.has(entry.path)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Invalid package path or hash.');seen.add(entry.path);
  const file=resolve(root,entry.path);if(relative(root,file).startsWith('..')||!(await lstat(file)).isFile())throw Error('Package files must be regular files.');
  let cursor=dirname(file);while(cursor!==resolve(root)){if((await lstat(cursor)).isSymbolicLink())throw Error('Package directories must not be symlinks.');cursor=dirname(cursor);}
  const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);if(hash.digest('hex')!==entry.sha256)throw Error('Package file changed: '+entry.path+'. Extract a fresh complete ZIP.');
 }
 for(const required of ['Game/ThronesOfMyth.x86_64','Server/index.mjs','Launch.mjs'])if(!seen.has(required))throw Error('Incomplete package: '+required);
 return m;
}
export async function launch(root,args=process.argv.slice(2)){
 if(Number(process.versions.node.split('.')[0])<24)throw Error('Node.js 24 LTS or later is required on the Linux playtest PC.');
 const flag=args.find(a=>a.startsWith('--port='));const port=flag?Number(flag.slice(7)):8080;if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use --port=1024..65535.');
 const m=await verifyPackage(root);console.log('Thrones of Myth '+m.version+' · '+m.commit+(m.dirty?' · MODIFIED SOURCE CHECKOUT':''));
 const data=join(process.env.XDG_DATA_HOME||join(homedir(),'.local/share'),'ThronesOfMyth');await mkdir(join(data,'Logs'),{recursive:true});await mkdir(join(data,'Saves'),{recursive:true});
 const lockPath=join(data,'launcher-'+port+'.lock'),token=randomBytes(24).toString('hex');let lock,server,game,stopping=false,stopPromise;
 try{lock=await open(lockPath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,token}));}catch(e){if(e.code==='EEXIST')throw Error('A launcher lock already exists: '+lockPath+'. If no launcher is running, inspect its PID before removing the stale lock.');throw e;}
 const endpoint='http://127.0.0.1:'+port;
 const stop=()=>stopPromise??=(async()=>{stopping=true;if(game&&game.exitCode===null)game.kill('SIGTERM');if(server&&server.exitCode===null){try{await fetch(endpoint+'/launcher-shutdown',{method:'POST',headers:{'X-Thrones-Launcher':token},signal:AbortSignal.timeout(5000)});}catch{}for(let i=0;i<50&&server.exitCode===null;i++)await pause(100);if(server.exitCode===null)server.kill('SIGTERM');}})();
 const signal=()=>{void stop();};process.once('SIGINT',signal);process.once('SIGTERM',signal);
 try{
  try{await fetch(endpoint+'/health',{signal:AbortSignal.timeout(700)});throw Error('Port '+port+' is already in use. This launcher never reuses or stops another server. Use --port=8081 for a separate test world.');}catch(e){if(e.message.startsWith('Port '))throw e;}
  const log=await open(join(data,'Logs','server-'+port+'.log'),'a');
  server=spawn(process.execPath,[join(root,'Server/index.mjs'),'--local-playtest','--local-port='+port],{cwd:root,env:{...process.env,THRONES_LAUNCH_TOKEN:token,THRONES_SAVE_PATH:join(data,'Saves',port===8080?'world.json':'world-'+port+'.json')},stdio:['ignore',log.fd,log.fd]});await log.close();
  let spawnError;server.once('error',e=>{spawnError=e;});let ready=false;
  for(let i=0;i<100;i++){if(stopping)throw Error('Launch interrupted.');if(spawnError)throw spawnError;if(server.exitCode!==null)throw Error('Local server exited. Check '+join(data,'Logs','server-'+port+'.log'));try{const response=await fetch(endpoint+'/health',{signal:AbortSignal.timeout(400)});const h=await response.json();if(response.ok&&h.game==='thrones-of-myth'&&h.version===m.protocol){ready=true;break;}}catch{}await pause(100);}
  if(!ready)throw Error('Local server did not become ready.');if(stopping)throw Error('Launch interrupted.');
  const exe=join(root,'Game/ThronesOfMyth.x86_64');await chmod(exe,0o755);
  const clientArgs=['--thrones-server',endpoint,'-logFile',join(data,'Logs','player-'+port+'.log'),...args.filter(a=>!a.startsWith('--port='))];
  if(stopping)throw Error('Launch interrupted.');
  game=spawn(exe,clientArgs,{cwd:join(root,'Game'),stdio:'inherit'});
  await new Promise((resolve,reject)=>{game.once('error',reject);game.once('exit',(code,sig)=>code===0||sig&&stopping?resolve():reject(Error('Client exited with '+(sig||code)+'. Inspect player log.')));});
 }finally{await stop();process.removeListener('SIGINT',signal);process.removeListener('SIGTERM',signal);await lock.close();try{const held=JSON.parse(await readFile(lockPath,'utf8'));if(held.token===token)await unlink(lockPath);}catch{}}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))launch(dirname(fileURLToPath(import.meta.url))).catch(e=>{console.error(e.message);process.exitCode=1;});
