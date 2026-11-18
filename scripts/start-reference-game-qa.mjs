// Separate opt-in source QA server. Never uses normal launcher/env save locations.
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createQaReferenceGameServer} from '../server/qa-reference-host.mjs';
import {syntheticCityProfile} from '../server/testing/reference-city-fixtures.mjs';
if(!process.argv.includes('--qa-reference-city'))throw Error('Required explicit --qa-reference-city. Synthetic TEST DATA only.');
const at=process.argv.indexOf('--resume'),root=resolve('work/task7-b2/kingdoms');
const portArgument=process.argv.indexOf('--port'),port=portArgument<0?0:Number(process.argv[portArgument+1]);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid loopback QA port');
const directory=at<0?join(root,randomUUID()):resolve(process.argv[at+1]??'');
if(!directory.startsWith(root+'\\')&&!directory.startsWith(root+'/'))throw Error('QA worlds must remain below work/task7-b2/kingdoms');
const marker=join(directory,'QA_ONLY.json');
if(at>=0&&(!existsSync(marker)||JSON.parse(readFileSync(marker,'utf8')).format!=='B2_DISPOSABLE_QA'))throw Error('Resume requires an existing disposable QA marker');
if(at<0){mkdirSync(directory,{recursive:true});writeFileSync(marker,JSON.stringify({format:'B2_DISPOSABLE_QA',testData:true}),{flag:'wx'});}
const lock=join(directory,'qa-authority.lock');
if(existsSync(lock)){
 const prior=JSON.parse(readFileSync(lock,'utf8'));
 if(prior.format!=='B2_QA_AUTHORITY'||!Number.isSafeInteger(prior.pid)||prior.pid<=0)throw Error('Unknown QA authority lock; preserved without modification');
 let running=true;try{process.kill(prior.pid,0);}catch(error){if(error.code==='ESRCH')running=false;else throw error;}
 if(running)throw Error('QA authority is already running; no existing session was used or stopped');
 unlinkSync(lock); // Verified stale lock inside the validated disposable QA directory only.
}
writeFileSync(lock,JSON.stringify({format:'B2_QA_AUTHORITY',pid:process.pid}),{flag:'wx'});
process.on('exit',()=>{try{const owner=JSON.parse(readFileSync(lock,'utf8'));if(owner.format==='B2_QA_AUTHORITY'&&owner.pid===process.pid)unlinkSync(lock);}catch{}});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
const server=createQaReferenceGameServer({qaOnly:true,profile:syntheticCityProfile(),savePath:join(directory,'qa-kingdom.json'),buildIdentity:{version:'B2 EXPERIMENTAL TEST DATA',commit,dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).trim()}});
server.server.listen(port,()=>{
 console.log('EXPERIMENTAL / TEST DATA. Not RoK parity. Normal activation disabled.');
 console.log('Real game endpoint: http://127.0.0.1:'+server.server.address().port);
 console.log('Isolated QA directory: '+directory);
 console.log('New joins use operator-selected synthetic profile; no client profile selector. Simulation clock:1x.');
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.saveNow();server.server.closeIdleConnections();server.server.close();});
