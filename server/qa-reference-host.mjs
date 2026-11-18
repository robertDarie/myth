// Uses the actual game HTTP/auth/rollback implementation with a separate QA save envelope.
import {existsSync,readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {createGameServer} from './http.mjs';
import {QaReferenceWorld,QA_REFERENCE_FORMAT} from './qa-reference-world.mjs';

export class QaReferenceStore {
 constructor(path,options){if(typeof path!=='string'||!path)throw Error('Explicit isolated QA save path required');this.path=path;this.options=options;}
 load(){
  if(!existsSync(this.path))return new QaReferenceWorld(this.options);
  const data=JSON.parse(readFileSync(this.path,'utf8'));
  const w=QaReferenceWorld.fromSave(data,this.options);
  if(Number.isSafeInteger(data.savedAt)&&data.savedAt>=0&&Date.now()>data.savedAt)w.advanceQaDowntime(data.savedAt,Date.now());
  return w;
 }
 save(world){
  if(!(world instanceof QaReferenceWorld))throw Error('QA store cannot save a normal kingdom');
  if(existsSync(this.path)&&JSON.parse(readFileSync(this.path,'utf8')).format!==QA_REFERENCE_FORMAT)throw Error('Refusing to overwrite ordinary or unknown save');
  mkdirSync(dirname(this.path),{recursive:true});const temporary=this.path+'.'+process.pid+'.tmp';
  writeFileSync(temporary,JSON.stringify({...world.toSave(),savedAt:Date.now()}),{mode:0o600,flush:true});renameSync(temporary,this.path);
 }
}
export function createQaReferenceGameServer({profile,qaOnly=false,savePath,store,random,buildIdentity=null}={}){
 if(qaOnly!==true)throw Error('Explicit QA-only host opt-in required');
 const options={qaOnly:true,profile,random};
 const authority=store??new QaReferenceStore(savePath,options);
 if(buildIdentity&&!/^[a-f0-9]{40}$/.test(buildIdentity.commit??''))throw Error('QA build identity requires the actual full source SHA');
 const host=createGameServer({store:authority,kingdomId:'reference-qa',buildIdentity});
 if(!(host.world instanceof QaReferenceWorld))throw Error('QA host requires its isolated World authority');
 const listen=host.server.listen.bind(host.server);
 host.server.listen=(port,callback)=>{
  if(!Number.isInteger(port)||port<0||port>65535)throw Error('QA loopback listener requires a numeric port; network option overrides forbidden');
  if(callback!==undefined&&typeof callback!=='function')throw Error('QA host is loopback only; host overrides forbidden');
  return listen(port,'127.0.0.1',callback);
 };
 return host;
}
