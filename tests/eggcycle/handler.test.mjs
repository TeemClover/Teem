import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,passwordFor} from '../../api/_lib/eggcycle/handler.js';
import {blankState} from '../../eggcycle/cycle.js';
import {call,memoryStore} from './fixture.mjs';
const env={BACKOFFICE_ADMIN_KEY:'test-only-secret',CRON_SECRET:'cron-secret',TELEGRAM_BOT_TOKEN:'fake-token',TELEGRAM_CHAT_ID:'private-room'};
function fixture(extra={}){const store=memoryStore(blankState('2025-02-03'));let now=new Date('2025-02-09T01:00:00Z');const requests=[];const handler=createHandler({store,env:{...env,...extra},clock:()=>now,fetchImpl:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true})};}});return {handler,store,requests,setNow:x=>now=new Date(x)};}
async function login(f){const r=await call(f.handler,'login',{method:'POST',body:{password:env.BACKOFFICE_ADMIN_KEY}});assert.equal(r.statusCode,200);assert.match(r.headers['set-cookie'],/HttpOnly; Secure; SameSite=Strict/);return r.headers['set-cookie'].split(';')[0];}
test('server gates health data, rejects missing env and does not use a built-in password',async()=>{
  const f=fixture();assert.equal((await call(f.handler,'state')).statusCode,401);assert.equal(passwordFor({}),'');const empty=createHandler({store:f.store,env:{}});assert.equal((await call(empty,'session')).statusCode,503);
});
test('login, save, persistence across handlers, cookie tampering, expiry and logout',async()=>{
  const f=fixture(),cookie=await login(f);const state=(await call(f.handler,'state',{cookie})).body.state;state.periodLength=4;
  assert.equal((await call(f.handler,'save',{method:'POST',cookie,body:state})).body.state.revision,1);
  assert.equal((await call(f.handler,'save',{method:'POST',cookie,body:state})).statusCode,409);
  assert.equal((await call(f.handler,'state',{cookie})).body.state.periodLength,4);
  assert.equal((await call(f.handler,'state',{cookie:cookie+'x'})).statusCode,401);
  assert.match((await call(f.handler,'logout',{method:'POST',cookie,body:{}})).headers['set-cookie'],/Max-Age=0/);
  f.setNow('2025-03-12T01:00:00Z');assert.equal((await call(f.handler,'state',{cookie})).statusCode,401);
});
test('cross-origin and wrong content-type writes rejected; login rate limited',async()=>{
  const f=fixture();assert.equal((await call(f.handler,'login',{method:'POST',body:{},headers:{origin:'https://evil.example'}})).statusCode,403);
  assert.equal((await call(f.handler,'login',{method:'POST',body:{},headers:{'content-type':'text/plain'}})).statusCode,415);
  for(let i=0;i<8;i++)assert.equal((await call(f.handler,'login',{method:'POST',body:{password:'wrong'}})).statusCode,401);
  assert.equal((await call(f.handler,'login',{method:'POST',body:{password:env.BACKOFFICE_ADMIN_KEY}})).statusCode,429);
});
test('authenticated health output uses no-store; notes stay data and are validated',async()=>{
  const f=fixture(),cookie=await login(f);const r=await call(f.handler,'state',{cookie});assert.equal(r.headers['cache-control'],'private, no-store');
  const s=r.body.state;s.notes['2025-02-09']={text:'<script>alert(1)</script>',flow:'light',pain:1};assert.equal((await call(f.handler,'save',{method:'POST',body:s,cookie})).statusCode,200);
});
test('cron requires bearer, honors opt-in and hour, deduplicates, uses generic messages and private link',async()=>{
  const f=fixture();assert.equal((await call(f.handler,'cron')).statusCode,401);
  const options={headers:{authorization:'Bearer cron-secret'}};assert.equal((await call(f.handler,'cron',options)).body.sent,0);
  const s=await f.store.load();s.notifications.enabled=true;await f.store.save(s);
  assert.equal((await call(f.handler,'cron',options)).body.sent,1);assert.equal((await call(f.handler,'cron',options)).body.sent,0);
  assert.equal(f.requests.length,1);assert.doesNotMatch(f.requests[0].body.text,/ไข่ตก|ประจำเดือน/);assert.equal(f.requests[0].body.reply_markup.inline_keyboard[0][0].url,'https://www.myclover.com/eggcycle/');
});
test('previews cannot send real Telegram reminders; dedicated env overrides generic env',async()=>{
  const f=fixture({VERCEL_ENV:'preview'});const s=await f.store.load();s.notifications.enabled=true;await f.store.save(s);
  assert.equal((await call(f.handler,'cron',{headers:{authorization:'Bearer cron-secret'}})).body.skipped,'preview');assert.equal(f.requests.length,0);
});
test('failed Telegram sends can retry instead of being marked sent',async()=>{
  const store=memoryStore(blankState('2025-02-03'));const s=await store.load();s.notifications.enabled=true;await store.save(s);let success=false;
  const handler=createHandler({store,env,clock:()=>new Date('2025-02-09T01:00:00Z'),fetchImpl:async()=>({ok:success,json:async()=>({ok:success})})});
  const opts={headers:{authorization:'Bearer cron-secret'}};assert.equal((await call(handler,'cron',opts)).statusCode,502);success=true;assert.equal((await call(handler,'cron',opts)).body.sent,1);
});
