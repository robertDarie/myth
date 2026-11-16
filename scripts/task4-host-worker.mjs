// Disposable QA host. All public requests use the production realm router.
// Private parent IPC advances only production clocks/ticks; it grants no state.
import {createRealmHost} from '../server/realms.mjs';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
const root=resolve(process.env.QA_DIRECTORY??'');
if(!root.startsWith(resolve('work/task4')+'\\')&&!root.startsWith(resolve('work/task4')+'/'))throw Error('QA storage must stay under work/task4');
const backend=process.env.QA_BACKEND,clockOrigin=Number(process.env.QA_CLOCK_ORIGIN),timings={tick:[],save:[]};
if(!['json','sqlite'].includes(backend))throw Error('Unsupported QA backend');
const specs=['alpha','beta'].map(id=>({id,name:'Disposable '+id,joinCode:'task4-synthetic-invite',...(backend==='sqlite'?{databasePath:resolve(root,id+'.sqlite')}:{savePath:resolve(root,id+'.json')})}));
const host=createRealmHost({defaultId:'alpha',realms:specs,shutdownToken:'task4-owned-worker-close'});
for(const realm of host.realms.values()){
 realm.world.now=()=>Math.floor(clockOrigin+realm.world.time*1000);
 for(const [method,key]of [['tick','tick'],['saveNow','save']]){const original=realm[method];realm[method]=(...args)=>{const at=performance.now();try{return original(...args);}finally{timings[key].push(performance.now()-at);if(timings[key].length>20000)timings[key].shift();}};}
}
process.on('message',message=>{
 try{
  if(message.op==='advance'){
   if(!Number.isInteger(message.seconds)||message.seconds<0||message.seconds>3600)throw Error('Invalid simulation interval');
   for(let i=0;i<message.seconds*4;i++)for(const realm of host.realms.values())realm.world.tick(.25);
   for(const realm of host.realms.values())if(!realm.saveNow())throw Error('QA save failed');
  }
  const stats={cpu:process.cpuUsage(),memory:process.memoryUsage(),timings,realms:[...host.realms.values()].map(r=>({id:r.id,players:r.world.players.size,activeMarches:r.world.armies().filter(a=>a.deployed).length,battles:r.world.battles.size,simulationSeconds:r.world.time,persistenceHealthy:!r.persistence.error}))};
  process.send({id:message.id,stats});
 }catch(error){process.send({id:message.id,error:error.message});}
});
host.server.on('close',()=>{if(process.connected)process.disconnect();});
host.server.listen(0,'127.0.0.1',()=>process.send({ready:true,port:host.server.address().port}));
