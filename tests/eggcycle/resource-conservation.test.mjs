import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../../api/_lib/eggcycle/handler.js';
import {lazyStore} from '../../api/_lib/eggcycle/store.js';
import {call,memoryStore} from './fixture.mjs';

const env={EGGCYCLE_ADMIN_KEY:'synthetic-owner',CRON_SECRET:'synthetic-cron'};
const clock=()=>new Date('2026-10-15T00:00:00Z');
test('cron, unauthenticated requests, session and paused send never initialize SQL',async()=>{
 let databases=0,sends=0;
 const handler=createHandler({env,clock,store:lazyStore(()=>{databases++;throw Error('UNEXPECTED_DB');}),fetchImpl:()=>{sends++;throw Error('UNEXPECTED_SEND');}});
 assert.equal((await call(handler,'cron')).statusCode,401);
 const r=await call(handler,'cron',{headers:{authorization:'Bearer synthetic-cron'}});
 assert.deepEqual(r.body,{ok:true,skipped:'scheduled_notifications_disabled',sent:0});
 assert.equal((await call(handler,'state')).statusCode,401);
 assert.deepEqual((await call(handler,'session')).body,{authenticated:false});
 assert.equal((await call(handler,'state',{method:'DELETE'})).statusCode,405);
 const memory=createHandler({env,clock,store:memoryStore()});
 const login=await call(memory,'login',{method:'POST',body:{password:env.EGGCYCLE_ADMIN_KEY}});
 const cookie=login.headers['set-cookie'].split(';')[0];
 assert.equal((await call(handler,'test',{method:'POST',cookie,body:{}})).statusCode,409);
 assert.equal((await call(handler,'logout',{method:'POST',cookie,body:{}})).statusCode,200);
 assert.equal(databases,0);assert.equal(sends,0);
 // Authenticated calendar access still reaches storage when deliberately used.
 assert.equal((await call(handler,'state',{cookie})).statusCode,503);
 assert.equal(databases,1);
});

test('saved notification preference survives pause; calendar editing still works',async()=>{
 const store=memoryStore();const state=await store.load();state.notifications.enabled=true;await store.save(state);
 const handler=createHandler({store,env,clock});
 const login=await call(handler,'login',{method:'POST',body:{password:env.EGGCYCLE_ADMIN_KEY}});
 const cookie=login.headers['set-cookie'].split(';')[0];
 const r=await call(handler,'state',{cookie});
 assert.equal(r.body.notificationsScheduled,false);assert.equal(r.body.state.notifications.enabled,true);
 r.body.state.periodLength=4;
 assert.equal((await call(handler,'save',{method:'POST',cookie,body:r.body.state})).statusCode,200);
 assert.equal((await store.load()).periodLength,4);
 assert.equal((await store.load()).notifications.enabled,true);
});
