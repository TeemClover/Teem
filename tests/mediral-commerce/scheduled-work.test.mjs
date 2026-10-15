import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture} from './fixture.mjs';
import {createHandler} from '../../api/_lib/mediral-commerce/handler.js';

test('all root notification schedules stay stopped',()=>{
 const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));
 assert.ok(!config.crons.some(job=>job.path.startsWith('/api/mediral-commerce')));
 assert.deepEqual(config.crons,[]);
});

test('admin status reports stopped scheduled work even when cron credentials exist',async()=>{
 const f=await fixture();await f.login();const r=await f.call('status');
 assert.equal(r.code,200);assert.ok(f.env.CRON_SECRET);
 assert.equal(r.body.retryConfigured,false);
 assert.equal(r.body.manualRetryAvailable,true);
 assert.equal(r.body.ownerAlertsScheduled,false);
 assert.equal(r.body.cleanupScheduled,false);
});

test('health remains database-free and does not send any messages',async()=>{
 const f=await fixture();let result;
 const forbidden=new Proxy({}, {get:()=>()=>{throw Error('UNEXPECTED_SIDE_EFFECT');}});
 const handler=createHandler({store:forbidden,providers:forbidden,env:f.env,ai:f.ai});
 const res={setHeader(){},set statusCode(n){assert.equal(n,200);},end(s){result=JSON.parse(s);}};
 await handler({url:'/?action=health',method:'GET',headers:{}},res);
 assert.deepEqual(result,{ok:true,service:'mediral-commerce',acceptingOrders:true});
});

test('legacy Mediral drain stays DB-free even with valid scheduler credentials',async()=>{
 const f=await fixture();let result,status;
 const forbidden=new Proxy({}, {get:()=>()=>{throw Error('UNEXPECTED_SIDE_EFFECT');}});
 const handler=createHandler({store:forbidden,providers:forbidden,env:f.env,ai:f.ai});
 await handler({url:'/?action=drain',method:'GET',headers:{authorization:`Bearer ${f.env.CRON_SECRET}`}},
  {setHeader(){},set statusCode(n){status=n;},end(s){result=JSON.parse(s);}});
 assert.equal(status,200);assert.deepEqual(result,{ok:true,skipped:'scheduled_notifications_disabled'});
});
