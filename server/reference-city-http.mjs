// Deliberately separate from normal game HTTP routes, saves and public hosting.
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync,renameSync,openSync,fsyncSync,closeSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {ReferenceCityEngine} from './reference-city.mjs';
export function saveExperimentalCity(file,engine){
 if(existsSync(file)&&JSON.parse(readFileSync(file,'utf8')).format!=='EXPERIMENTAL_CITY_ENGINE_V1')throw Error('Refusing to overwrite a normal or unknown save');
 const temporary=file+'.'+randomUUID()+'.tmp',fd=openSync(temporary,'wx');
 try{writeFileSync(fd,JSON.stringify(engine.toSave()));fsyncSync(fd);}finally{closeSync(fd);}renameSync(temporary,file);
}
export function loadExperimentalCity(file,profile){return ReferenceCityEngine.fromSave(JSON.parse(readFileSync(file,'utf8')),profile,{experimental:true});}
export function createExperimentalCityServer({profile,allowExperimental=false,engine}={}){
 if(allowExperimental!==true)throw Error('Explicit experimental HTTP opt-in required');
 engine??=new ReferenceCityEngine(profile,{experimental:true});
 const server=createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
  try{
   const url=new URL(req.url,'http://127.0.0.1'),token=(req.headers.authorization??'').replace(/^Bearer /,'');
   if(req.method==='GET'&&url.pathname==='/experimental/'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});return res.end(panel);}
   if(req.method==='GET'&&url.pathname==='/experimental/health')return send(200,{experimental:true,normalActivation:false,profileId:engine.profileId});
   if(req.method==='GET'&&url.pathname==='/experimental/city')return send(200,engine.snapshot(token));
   if(req.method!=='POST'||!['/experimental/join','/experimental/command'].includes(url.pathname))return send(404,{error:'No normal game or clock-control route in this experimental server'});
   let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error('Request too large');body+=chunk;}const data=JSON.parse(body);
   if(url.pathname==='/experimental/join')return send(200,engine.join(data.name));
   return send(200,engine.command(token,data));
  }catch(e){send(/authorization/.test(e.message)?401:400,{error:e.message,experimental:true,normalActivation:false});}
 });
 return {engine,server,listen:()=>new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',()=>ok(server.address()));})};
}
const panel=`<!doctype html><html lang="en"><meta charset="utf-8"><title>B1 experimental city sandbox</title>
<style>body{font:16px/1.5 system-ui;background:#12232e;color:#eee;max-width:1000px;margin:2rem auto;padding:1rem}button,input{font:inherit;padding:.4rem;margin:.3rem}article{border:1px solid #567;padding:1rem;margin:.5rem 0}strong{color:#ffd476}#error{color:#ffb5a5}</style>
<h1>B1 synthetic city engine</h1><p><strong>TEST ONLY · Not RoK numerical parity · No normal-world authority · Not the Unity client</strong></p>
<p>The server controls the simulation clock. This is an explicitly prepared synthetic city with four starting producers, not verified birth progression.</p>
<input id="name" aria-label="Experimental governor name" value="Sandbox governor"><button id="join">Create experimental city</button><button id="collect">Collect production</button><button id="refresh">Refresh</button>
<p id="error" role="status"></p><pre id="summary"></pre><main id="buildings"></main><h2>Research</h2><section id="research"></section>
<script>
let token=sessionStorage.getItem('B1-experimental-token')||'';
const error=document.querySelector('#error');
async function api(path,data){const r=await fetch('/experimental/'+path,{method:data?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:data?JSON.stringify(data):undefined});const j=await r.json();if(!r.ok)throw Error(j.error);return j;}
async function action(type,args={}){try{error.textContent='';await api('command',{requestId:crypto.randomUUID(),type,...args});await refresh();}catch(e){error.textContent=e.message;}}
function button(parent,label,disabled,fn){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=fn;parent.append(b);}
async function refresh(){if(!token)return;try{const s=await api('city');document.querySelector('#summary').textContent=JSON.stringify({profile:s.profileId,evidence:s.evidenceKind,normalActivation:s.normalActivation,simulationSeconds:s.time,resources:s.resources,reserves:s.units,jobs:s.jobs},null,2);
for(const [selector,rows,research]of [['#buildings',s.buildings,false],['#research',s.research,true]]){const root=document.querySelector(selector);root.replaceChildren();for(const row of rows){const card=document.createElement('article'),title=document.createElement('h3'),detail=document.createElement('p');title.textContent=row.name+' · '+row.level+'/'+row.maximum;detail.textContent=JSON.stringify({cost:row.cost,seconds:row.seconds,stored:row.stored,effects:row.activeEffects,reason:row.reason});card.append(title,detail);button(card,research?'Research next rank':'Upgrade',!row.canUpgrade,()=>action(research?'research':'building-upgrade',{targetId:row.id}));if(row.role==='production')button(card,'Collect '+row.id,false,()=>action('collect',{targetId:row.id}));if(row.role==='training')button(card,'Train one experimental unit',row.level===0,()=>action('train',{targetId:row.id,quantity:1}));root.append(card);}}
}catch(e){error.textContent=e.message;}}
document.querySelector('#join').onclick=async()=>{try{const s=await api('join',{name:document.querySelector('#name').value});token=s.token;sessionStorage.setItem('B1-experimental-token',token);await refresh();}catch(e){error.textContent=e.message;}};
document.querySelector('#collect').onclick=()=>action('collect');document.querySelector('#refresh').onclick=refresh;setInterval(refresh,1500);refresh();
</script></html>`;
