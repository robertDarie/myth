import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
// Opt-in bounded process measurements. No identities, tokens, commands or world data.
export class ServerTelemetry{
 constructor(path=null,capacity=512){this.path=path;this.capacity=capacity;this.phases=new Map();this.responses=0;this.encodedBytes=0;this.maxResponseBytes=0;}
 record(name,ms){if(!Number.isFinite(ms)||ms<0)return;let b=this.phases.get(name);if(!b){if(this.phases.size>=12)return;b={values:new Float64Array(this.capacity),cursor:0,count:0,total:0};this.phases.set(name,b);}b.values[b.cursor]=ms;b.cursor=(b.cursor+1)%this.capacity;b.count=Math.min(this.capacity,b.count+1);b.total++;}
 measure(name,action){const at=performance.now();try{return action();}finally{this.record(name,performance.now()-at);}}
 response(bytes){this.responses++;this.encodedBytes+=bytes;this.maxResponseBytes=Math.max(this.maxResponseBytes,bytes);}
 snapshot(){return {version:1,node:process.version,note:'Recent bounded server CPU measurements and JSON body bytes; not network latency, client rendering or FPS.',responses:this.responses,encodedBytes:this.encodedBytes,maxResponseBytes:this.maxResponseBytes,memory:process.memoryUsage(),phases:Object.fromEntries([...this.phases].map(([name,b])=>{const a=Array.from(b.values.subarray(0,b.count)).sort((x,y)=>x-y);return [name,{total:b.total,samples:b.count,p50Ms:a[Math.floor(a.length*.5)]??0,p95Ms:a[Math.min(a.length-1,Math.floor(a.length*.95))]??0,maxMs:a[a.length-1]??0}];}))};}
 flush(){if(!this.path)return;try{mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path+'.tmp',JSON.stringify(this.snapshot(),null,2),{mode:0o600});renameSync(this.path+'.tmp',this.path);}catch{console.error('Server metrics could not be written. Gameplay storage is unaffected.');}}
}
