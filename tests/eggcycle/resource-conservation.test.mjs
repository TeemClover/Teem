import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../../api/_lib/eggcycle/handler.js';
import {lazyStore} from '../../api/_lib/eggcycle/store.js';
import {call,memoryStore} from './fixture.mjs';

const env={EGGCYCLE_ADMIN_KEY:'synthetic-owner'};
const clock=()=>new Date('2025-02-09T00:00:00Z');
test('removed send actions, unauthenticated requests and session never initialize SQL',async()=>{
  let databases=0;
  const handler=createHandler({env,clock,store:lazyStore(()=>{databases++;throw Error('UNEXPECTED_DB');})});
  assert.equal((await call(handler,'cron')).statusCode,404);
  assert.equal((await call(handler,'state')).statusCode,401);
  assert.deepEqual((await call(handler,'session')).body,{authenticated:false});
  assert.equal((await call(handler,'state',{method:'DELETE'})).statusCode,405);
  const memory=createHandler({env,clock,store:memoryStore()});
  const login=await call(memory,'login',{method:'POST',body:{password:env.EGGCYCLE_ADMIN_KEY}});
  const cookie=login.headers['set-cookie'].split(';')[0];
  assert.equal((await call(handler,'test',{method:'POST',cookie,body:{}})).statusCode,404);
  assert.equal((await call(handler,'logout',{method:'POST',cookie,body:{}})).statusCode,200);
  assert.equal(databases,0);
  assert.equal((await call(handler,'state',{cookie})).statusCode,503);
  assert.equal(databases,1);
});
