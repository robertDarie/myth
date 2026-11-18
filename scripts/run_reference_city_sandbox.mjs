// Opt-in, disposable, loopback-only synthetic client/server demonstration.
import {createExperimentalCityServer} from '../server/reference-city-http.mjs';
import {syntheticCityProfile} from '../server/testing/reference-city-fixtures.mjs';
if(!process.argv.includes('--synthetic-engine'))throw Error('Explicit --synthetic-engine required. This is not the normal game.');
const i=process.argv.indexOf('--clock-rate'),rate=i<0?1:Number(process.argv[i+1]);
if(!Number.isFinite(rate)||rate<1||rate>3600)throw Error('Choose a declared synthetic clock rate from1to3600');
const host=createExperimentalCityServer({profile:syntheticCityProfile(),allowExperimental:true}),address=await host.listen();
const timer=setInterval(()=>host.engine.tick(.1*rate),100);
console.log('TEST ONLY: synthetic engine, not RoK parity or native Unity. No normal saves/resources/visibility/passes.');
console.log('Authoritative simulation clock: '+rate+'x. In-memory disposable world; closing discards this sandbox.');
console.log('Open http://127.0.0.1:'+address.port+'/experimental/');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);host.server.closeIdleConnections();host.server.close();});
