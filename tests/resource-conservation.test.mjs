import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

let dbCalls=0,schemaCalls=0;
const core={database:()=>{dbCalls++;return {query:async()=>[]};},ensureSchema:async()=>{schemaCalls++;},sameOrigin:req=>req.headers.origin==='https://synthetic.invalid',currentUser:async()=>null,sha256:async x=>x,sendJson:(res,body,status=200)=>{res.body=body;res.statusCode=status;}};
const brain={aiConfigured:()=>false,hasPersona:()=>false,isDirectedAtPet:()=>false,readAndRespond:()=>{throw Error('UNEXPECTED_AI');}};
for(const base of ['../api/','../teambook/api/']){
 mock.module(new URL(base+'_lib/core.js',import.meta.url).href,{namedExports:core});
 mock.module(new URL(base+'_lib/pet-brain.js',import.meta.url).href,{namedExports:brain});
}
const workers=[['XTY',(await import('../api/xty-pet.js')).default],['TeamBook',(await import('../teambook/api/teambook-pet.js')).default],['TeamBook compatibility',(await import('../teambook/api/teambook-pet-compat.js')).default]];

test('both published projects have no cron notification jobs',()=>{
 for(const file of ['../vercel.json','../teambook/vercel.json'])assert.deepEqual(JSON.parse(readFileSync(new URL(file,import.meta.url))).crons,[]);
});
for(const [name,handler] of workers)test(name+' rejects or skips scheduled/automatic work before DB, preserving direct interactions',async()=>{
 const before=[dbCalls,schemaCalls];const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='synthetic-cron';
 const call=async(method='GET',body,headers={})=>{const res={};await handler({method,body,query:{force:'1'},headers},res);return res;};
 try{
  assert.equal((await call()).statusCode,401);
  assert.equal((await call('DELETE')).statusCode,405);
  for(const method of ['GET','POST'])assert.equal((await call(method,undefined,{authorization:'Bearer synthetic-cron'})).body.skipped,'scheduled_notifications_disabled');
  for(const mode of ['white_cat_intro',...(name.startsWith('TeamBook')?['first_wake_catchup']:[])])assert.equal((await call('POST',{mode,code:'12345'})).body.skipped,'scheduled_notifications_disabled');
  assert.equal((await call('POST',{mode:'direct',code:'12345'})).statusCode,403);
  assert.equal((await call('POST',{mode:'direct',code:'bad'},{origin:'https://synthetic.invalid'})).statusCode,400);
  assert.deepEqual([dbCalls,schemaCalls],before);
  assert.equal((await call('POST',{mode:'direct',code:'12345'},{origin:'https://synthetic.invalid'})).statusCode,409);
  assert.deepEqual([dbCalls,schemaCalls],[before[0]+1,before[1]+1]);
 }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
