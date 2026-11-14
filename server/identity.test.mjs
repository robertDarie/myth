import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createGameServer } from './testing/legacy-services.mjs';
import { KingdomDatabase } from './testing/legacy-services.mjs';
import { closeHttpServer, tempDirectory } from './testing/cleanup.mjs';
const PASSWORD='long original password 123';
const nextPassword='a different long password 456';
const fixtures=new WeakMap();
function fixture(t){const bin=tempDirectory(t,'tom-identity-');fixtures.set(t,bin);return bin.path('kingdom.sqlite');}
async function start(t,options){const app=createGameServer(options);await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});const bin=fixtures.get(t);if(bin)bin.server(app.server);else t.after(()=>closeHttpServer(app.server));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 const call=async(path,body,token='',key='')=>{const r=await fetch(base+path,{method:body===null?'GET':'POST',headers:{Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})},...(body===null?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()};};return {...app,call};}
async function protect(app,name='protected_user'){
 const guest=await app.call('/join',{name:'Protected City'});assert.equal(guest.status,201);
 const account=await app.call('/auth/register',{username:name,password:PASSWORD},guest.body.token);assert.equal(account.status,201);return {guest:guest.body,account:account.body};
}
test('protect an existing city, sign in from another device and restore both sessions after restart',async t=>{
 const path=fixture(t),app=await start(t,{databasePath:path}),{guest,account}=await protect(app);
 assert.equal(app.world.players.size,1);assert.equal(account.playerId,guest.playerId);assert.ok(account.recoveryCode);
 assert.equal((await app.call('/world',null,guest.token)).status,401);
 const login=await app.call('/auth/login',{username:'PROTECTED_USER',password:PASSWORD});assert.equal(login.status,200);assert.equal(login.body.playerId,guest.playerId);assert.notEqual(login.body.token,account.token);
 assert.equal((await app.call('/world',null,login.body.token)).status,200);
 const me=await app.call('/auth/me',null,account.token);assert.equal(me.body.username,'protected_user');assert.equal(me.body.activeSessions,2);
 await new Promise(resolve=>app.server.close(resolve));const next=await start(t,{databasePath:path});
 assert.equal((await next.call('/world',null,account.token)).status,200);assert.equal((await next.call('/world',null,login.body.token)).status,200);assert.equal(next.world.players.size,1);
});
test('credentials and anchor never appear in world snapshots or public account status',async t=>{
 const path=fixture(t),app=await start(t,{databasePath:path}),{account}=await protect(app);
 const db=new DatabaseSync(path,{readOnly:true}),record=db.prepare('SELECT * FROM accounts').get();db.close();
 assert.ok(record.password_hash.startsWith('scrypt-v1:'));assert.ok(!record.password_hash.includes(PASSWORD));assert.notEqual(record.recovery_hash,account.recoveryCode);
 const snapshot=JSON.stringify((await app.call('/world',null,account.token)).body);
 for(const secret of [PASSWORD,record.password_hash,record.recovery_hash,record.anchor,account.token,account.recoveryCode])assert.ok(!snapshot.includes(secret));
 assert.equal((await app.call('/world',null,record.anchor)).status,401);
 assert.equal((await app.call('/join',{resumeToken:record.anchor})).status,401);
});
test('bad passwords, invalid names, weak passwords and competing city claims cannot alter ownership',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),{account}=await protect(app);
 assert.equal((await app.call('/auth/login',{username:'protected_user',password:nextPassword})).status,401);
 assert.equal((await app.call('/auth/login',{username:'unknown_user',password:PASSWORD})).status,401);
 assert.equal((await app.call('/auth/register',{username:'another_name',password:PASSWORD},account.token)).status,409);
 const guest=(await app.call('/join',{name:'Another City'})).body;
 assert.equal((await app.call('/auth/register',{username:'protected_user',password:PASSWORD},guest.token)).status,409);
 assert.equal((await app.call('/auth/register',{username:'bad name',password:PASSWORD},guest.token)).status,400);
 assert.equal((await app.call('/auth/register',{username:'good_name',password:'short'},guest.token)).status,400);
 assert.equal((await app.call('/world',null,account.token)).status,200);
});
test('single-device logout and authenticated all-device revocation preserve the same city',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),{account}=await protect(app);
 const second=(await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).body;
 assert.equal((await app.call('/auth/logout',{},second.token)).status,200);assert.equal((await app.call('/world',null,second.token)).status,401);assert.equal((await app.call('/world',null,account.token)).status,200);
 const newer=(await app.call('/auth/login',{username:'protected_user',password:PASSWORD,revokeOtherSessions:true})).body;
 assert.equal((await app.call('/world',null,account.token)).status,401);
 assert.equal((await app.call('/auth/logout',{allDevices:true},newer.token)).status,200);
 const again=await app.call('/auth/login',{username:'protected_user',password:PASSWORD});assert.equal(again.status,200);assert.equal(again.body.playerId,account.playerId);
});
test('one-time recovery rotates both password and code and revokes old devices',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),{account}=await protect(app);
 const wrong=await app.call('/auth/recover',{username:'protected_user',password:nextPassword,recoveryCode:'wrong'});assert.equal(wrong.status,401);
 const recovered=await app.call('/auth/recover',{username:'protected_user',password:nextPassword,recoveryCode:account.recoveryCode});assert.equal(recovered.status,200);assert.equal(recovered.body.playerId,account.playerId);assert.notEqual(recovered.body.recoveryCode,account.recoveryCode);
 assert.equal((await app.call('/world',null,account.token)).status,401);
 assert.equal((await app.call('/auth/recover',{username:'protected_user',password:PASSWORD,recoveryCode:account.recoveryCode})).status,401);
 assert.equal((await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).status,401);
 assert.equal((await app.call('/auth/login',{username:'protected_user',password:nextPassword})).status,200);
});
test('keyed commands remain once-only across account session rotation and remain private to their owner',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),{account}=await protect(app);
 assert.equal((await app.call('/command',{type:'train'},account.token,'account-train-001')).status,200);
 const second=(await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).body;
 assert.equal((await app.call('/command',{type:'train'},second.token,'account-train-001')).status,200);assert.equal(app.world.authenticate(second.token).trainingQueue.length,1);
 assert.equal((await app.call('/command',{type:'upgrade'},second.token,'account-train-001')).status,409);
 const other=(await app.call('/join',{name:'Other'})).body;
 assert.equal((await app.call('/command',{type:'train'},other.token,'account-train-001')).status,200);assert.equal(app.world.authenticate(other.token).trainingQueue.length,1);
});
test('failed registration commits neither an account nor a rotated session',async t=>{
 const db=new KingdomDatabase(fixture(t));let failing=false;
 const store=new Proxy(db,{get(target,key){if(key==='save')return (...args)=>{if(failing)throw new Error('Simulated disk failure');return target.save(...args);};const value=target[key];return typeof value==='function'?value.bind(target):value;}});
 const app=await start(t,{store}),guest=(await app.call('/join',{name:'Safe Claim'})).body;failing=true;
 assert.equal((await app.call('/auth/register',{username:'safe_claim',password:PASSWORD},guest.token)).status,503);assert.equal(db.account('safe_claim'),undefined);assert.equal(app.world.authenticate(guest.token).name,'Safe Claim');
 failing=false;app.saveNow();assert.equal((await app.call('/auth/register',{username:'safe_claim',password:PASSWORD},guest.token)).status,201);
});
test('JSON/memory local profiles remain usable and reject unavailable account actions clearly',async t=>{
 const app=await start(t,{}),guest=(await app.call('/join',{name:'Local'})).body;
 assert.equal((await app.call('/auth/register',{username:'local_name',password:PASSWORD},guest.token)).status,409);assert.equal((await app.call('/world',null,guest.token)).status,200);
});
test('expired sessions cannot bypass authentication through the legacy resume route',async t=>{
 const path=fixture(t),app=await start(t,{databasePath:path}),{account}=await protect(app);
 const db=new DatabaseSync(path);db.exec('UPDATE account_sessions SET expires_at=0');db.close();
 assert.equal((await app.call('/world',null,account.token)).status,401);assert.equal((await app.call('/join',{resumeToken:account.token})).status,401);
 assert.equal((await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).status,200);
});
test('five-device cap is explicit and password-authorized revocation frees a slot',async t=>{
 const app=await start(t,{databasePath:fixture(t)});await protect(app);
 for(let i=0;i<4;i++)assert.equal((await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).status,200);
 assert.equal((await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).status,409);
 assert.equal((await app.call('/auth/login',{username:'protected_user',password:PASSWORD,revokeOtherSessions:true})).status,200);
});
test('replacing a lost recovery code requires the password and invalidates the old code',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),{account}=await protect(app);
 assert.equal((await app.call('/auth/rotate-recovery',{password:nextPassword},account.token)).status,401);
 const rotated=await app.call('/auth/rotate-recovery',{password:PASSWORD},account.token);assert.equal(rotated.status,200);assert.notEqual(rotated.body.recoveryCode,account.recoveryCode);
 assert.equal((await app.call('/auth/recover',{username:'protected_user',password:nextPassword,recoveryCode:account.recoveryCode})).status,401);
 assert.equal((await app.call('/auth/recover',{username:'protected_user',password:nextPassword,recoveryCode:rotated.body.recoveryCode})).status,200);
});
test('schema-one upgrade and complete online backup retain account ownership and recovery',async t=>{
 const {backupKingdom}=await import('./testing/legacy-services.mjs'),path=fixture(t);
 let db=new KingdomDatabase(path);const w=db.load(),s=w.join('Old Schema');db.save(w);db.close();
 const legacy=new DatabaseSync(path);legacy.exec('DROP TABLE account_sessions; DROP TABLE accounts; PRAGMA user_version=1');legacy.close();
 db=new KingdomDatabase(path);assert.equal(db.load().authenticate(s.token).name,'Old Schema');assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,2);db.close();
 const app=await start(t,{databasePath:path}),account=(await app.call('/auth/register',{username:'old_schema',password:PASSWORD},s.token)).body;
 const copy=path+'.backup.sqlite';await backupKingdom(path,copy);
 const restored=new KingdomDatabase(copy,{now:()=>Date.now()+31000}),second=await start(t,{store:restored});
 const login=await second.call('/auth/login',{username:'old_schema',password:PASSWORD});assert.equal(login.status,200);assert.equal(login.body.playerId,s.playerId);
 assert.equal((await second.call('/auth/recover',{username:'old_schema',password:nextPassword,recoveryCode:account.recoveryCode})).status,200);
});
test('inventory item use is durable and once-only when a player retries from a new device',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),{account}=await protect(app);
 assert.equal((await app.call('/command',{type:'inventory-supplies'},account.token)).status,200);
 assert.equal((await app.call('/command',{type:'inventory-supplies'},account.token)).status,400);
 const body={type:'inventory-use',targetId:'food-pack-100',count:1};
 assert.equal((await app.call('/command',body,account.token,'open-pack-once-001')).status,200);
 const next=(await app.call('/auth/login',{username:'protected_user',password:PASSWORD})).body;
 assert.equal((await app.call('/command',body,next.token,'open-pack-once-001')).status,200);
 assert.equal(app.world.authenticate(next.token).inventory['food-pack-100'],1);
 assert.equal(app.world.authenticate(next.token).food,300);
});
test('parallel account claims bind the city once and concurrent code recovery settles once',async t=>{
 const app=await start(t,{databasePath:fixture(t)}),guest=(await app.call('/join',{name:'Parallel City'})).body;
 const claims=await Promise.all(['claim_one','claim_two'].map(username=>app.call('/auth/register',{username,password:PASSWORD},guest.token)));
 assert.equal(claims.filter(r=>r.status===201).length,1);assert.ok(claims.every(r=>[201,401,409].includes(r.status)));
 const account=claims.find(r=>r.status===201).body;
 const recovered=await Promise.all([nextPassword,'another strong password 789'].map(password=>app.call('/auth/recover',{username:account.username,password,recoveryCode:account.recoveryCode})));
 assert.equal(recovered.filter(r=>r.status===200).length,1);assert.ok(recovered.every(r=>[200,401,409].includes(r.status)));assert.equal(app.world.players.size,1);
});
