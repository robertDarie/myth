// Disposable native QA only. Does not invoke the normal launcher or its real save.
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFileSync,writeFileSync,mkdirSync,existsSync,createWriteStream} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),value=(flag,fallback)=>{const i=args.indexOf(flag);if(i<0)return fallback;assert.ok(args[i+1]&&!args[i+1].startsWith('--'),'Missing '+flag);return args[i+1];};
assert.equal(process.platform,'win32','Use an actual Windows desktop.');
const folder=resolve(repo,value('--package','dist/Windows-Passes-f6cb144'));
const manifest=JSON.parse(readFileSync(resolve(folder,'manifest.json'),'utf8'));
assert.equal(manifest.platform,'windows-x86_64');assert.equal(manifest.protocol,17);assert.equal(manifest.dirty,false);
assert.match(manifest.commit,/^[a-f0-9]{40}$/);
for(const item of manifest.files){
 const path=resolve(folder,item.path);assert.ok(path.startsWith(folder+sep),'Invalid manifest path');
 assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),item.sha256,'Package integrity: '+item.path);
}
for(const file of ['Game/ThronesOfMyth.exe','Runtime/node.exe','Server/index.mjs'])assert.ok(manifest.files.some(f=>f.path===file),'Full package required: '+file);
if(args.includes('--validate-only')){console.log(JSON.stringify({commit:manifest.commit,protocol:17,files:manifest.files.length,integrity:'PASS'}));process.exit(0);}
const resumed=value('--resume-run',''),clients=Number(value('--clients','1'));
assert.ok(clients===1||clients===2,'Choose one or two QA clients');
assert.ok(!resumed||/^[a-f0-9]{32}$/.test(resumed),'Resume requires only the printed QA run ID');
const id=resumed||randomUUID().replaceAll('-',''),root=resolve(repo,'work/native-windows-qa',id);
let port;
if(resumed){
 const prior=JSON.parse(readFileSync(resolve(root,'run.json'),'utf8'));
 assert.equal(prior.commit,manifest.commit,'Resume with the same package commit');port=prior.port;
 assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid saved QA port');
 assert.ok(existsSync(resolve(root,'world.json')),'No QA save to resume');
}else{
 mkdirSync(root,{recursive:true});const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));port=probe.address().port;await new Promise(ok=>probe.close(ok));
 writeFileSync(resolve(root,'run.json'),JSON.stringify({commit:manifest.commit,port},null,2)+'\n');
}
const base='http://127.0.0.1:'+port,shutdown=randomUUID(),children=[];
const out=createWriteStream(resolve(root,'server.log')),err=createWriteStream(resolve(root,'server-error.log'));
const server=spawn(resolve(folder,'Runtime/node.exe'),[resolve(folder,'Server/index.mjs'),'--local-playtest','--local-port='+port],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,THRONES_SAVE_PATH:resolve(root,'world.json'),THRONES_REALMS:'',THRONES_METRICS_PATH:'',THRONES_LAUNCH_TOKEN:shutdown,THRONES_BUILD_VERSION:manifest.version,THRONES_BUILD_COMMIT:manifest.commit,THRONES_SERVER_DIGEST:manifest.serverDigest}});
let listening=false,serverError,stopping;
server.stdout.on('data',chunk=>{if(chunk.toString().includes('listening at '+base))listening=true;});server.stdout.pipe(out);server.stderr.pipe(err);server.on('error',error=>{serverError=error;});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
async function stop(){
 if(stopping)return stopping;
 stopping=(async()=>{if(server.exitCode!==null)return;try{await fetch(base+'/launcher-shutdown',{method:'POST',headers:{'x-thrones-launcher':shutdown},signal:AbortSignal.timeout(5000)});}catch{}
 for(let i=0;i<50&&server.exitCode===null;i++)await pause(100);
 if(server.exitCode===null)server.kill();})();return stopping;
}
process.once('SIGINT',()=>{void stop();});process.once('SIGTERM',()=>{void stop();});
try{
 let ready=false;
 for(let i=0;i<200;i++){
  if(serverError)throw serverError;if(server.exitCode!==null)throw Error('Own QA server exited; existing servers are never reused. Read '+resolve(root,'server-error.log'));
  if(listening){try{const response=await fetch(base+'/health',{signal:AbortSignal.timeout(1000)});const health=await response.json();if(health.version===17&&health.build?.commit===manifest.commit&&health.build?.serverDigest===manifest.serverDigest){ready=true;break;}}catch{}}
  await pause(100);
 }
 assert.ok(ready&&server.exitCode===null,'Owned matching QA server did not become ready');
 console.log('Disposable QA run: '+id+' | '+base+' | source '+manifest.commit);
 console.log('Use a new QA commander name. Close all QA client windows to save and stop this server.');
 console.log('Resume with the same --package and --resume-run '+id+'; the port stays unchanged for client session recovery.');
 for(let index=1;index<=clients;index++){
  const child=spawn(resolve(folder,'Game/ThronesOfMyth.exe'),['--thrones-server',base,'-screen-fullscreen','0','-screen-width','1600','-screen-height','900','-logFile',resolve(root,'client-'+index+'.log')],{windowsHide:false,stdio:'ignore'});
  children.push(child);console.log('Owned QA client PID: '+child.pid);
 }
 await Promise.all(children.map(child=>new Promise((ok,reject)=>{child.once('exit',ok);child.once('error',reject);})));
}finally{await stop();out.end();err.end();}
