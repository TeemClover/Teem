import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,passwordFor} from '../../api/_lib/eggcycle/handler.js';
import {blankState} from '../../eggcycle/cycle.js';
import {call,memoryStore} from './fixture.mjs';
const env={BACKOFFICE_ADMIN_KEY:'test-only-secret'};
function fixture(extra={}){const store=memoryStore(blankState('2025-02-03'));let now=new Date('2025-02-09T01:00:00Z');const handler=createHandler({store,env:{...env,...extra},clock:()=>now});return {handler,store,setNow:x=>now=new Date(x)};}
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
test('removed cron and Telegram test actions cannot send, even with old enabled state',async()=>{
  const f=fixture(),s=await f.store.load();s.notifications={enabled:true,hour:8,detail:true};await f.store.save(s);
  const cookie=await login(f);
  for(const options of [{},{cookie}]){
    assert.equal((await call(f.handler,'cron',options)).statusCode,404);
    assert.equal((await call(f.handler,'test',{...options,method:'POST',body:{}})).statusCode,404);
  }
});
