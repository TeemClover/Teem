import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createRegistrationHandler} from '../../api/_lib/clover20-registration.js';
import {createFileStore} from '../../tools/clover20/preview-store.mjs';

const payload=()=>({name:'เพื่อน Clover',message:'แล้วพบกัน',requestId:randomUUID()});
async function request(handler,body,options={}){
  const req={method:options.method||'POST',headers:{host:'localhost:4178',origin:options.origin||'http://localhost:4178','content-type':'application/json'},body};
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
  await handler(req,res);return res;
}
test('a real write survives reopening, and concurrent retries create one record',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'clover20-test-'));
  try{
    const file=join(dir,'rsvp.json'),store=createFileStore(file),handler=createRegistrationHandler({getStore:async()=>store}),body=payload();
    const responses=await Promise.all([request(handler,body),request(handler,body)]);
    assert.deepEqual(responses.map(r=>r.code),[201,200]);
    assert.equal(responses[0].body.reference,responses[1].body.reference);
    const rows=JSON.parse(await readFile(file,'utf8'));assert.equal(rows.length,1);assert.equal(rows[0].name,body.name);assert.ok(!('contact' in rows[0]));assert.equal(rows[0].noticeVersion,'clover20-name-story-v1');
    const reopened=createRegistrationHandler({getStore:async()=>createFileStore(file)});
    assert.equal((await request(reopened,body)).body.reference,responses[0].body.reference);
    const changed=await request(handler,{...body,message:'มีเรื่องใหม่จะเล่า'});assert.equal(changed.code,409);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('rejects an empty name and oversized input before touching storage',async()=>{
  const handler=createRegistrationHandler({getStore:async()=>{throw Error('must not run');}});
  assert.equal((await request(handler,{...payload(),name:' '})).code,400);
  assert.equal((await request(handler,{...payload(),message:'a'.repeat(501)})).code,400);
  assert.equal((await request(handler,{...payload(),name:'a'.repeat(9000)})).code,413);
});
test('does not expose registrations via GET and rejects cross-origin submissions',async()=>{
  const handler=createRegistrationHandler({getStore:async()=>{throw Error('must not run');}});
  assert.equal((await request(handler,null,{method:'GET'})).code,405);
  assert.equal((await request(handler,payload(),{origin:'https://another.test'})).code,403);
});
test('storage failure never reports acceptance or returns personal details',async()=>{
  const handler=createRegistrationHandler({getStore:async()=>({save:async()=>{throw Error('secret database URL');}})});
  const res=await request(handler,payload());assert.equal(res.code,503);assert.equal(res.body.ok,false);
  assert.ok(!JSON.stringify(res.body).includes('secret'));assert.ok(!JSON.stringify(res.body).includes('เพื่อน Clover'));
});
test('name alone is enough to RSVP; an old contact field is never retained',async()=>{
  let saved;
  const handler=createRegistrationHandler({getStore:async()=>({save:async record=>{saved=record;return {reference:record.reference};}})});
  const body={...payload(),message:'',contact:'should-not-be-saved@example.test'};
  assert.equal((await request(handler,body)).code,201);assert.equal(saved.message,'');assert.ok(!('contact' in saved));
});
test('rate limiting is durable and preserves the original accepted reference',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'clover20-limit-'));
  try{
    const store=createFileStore(join(dir,'rsvp.json')),handler=createRegistrationHandler({getStore:async()=>store}),first=payload();
    const initial=await request(handler,first);
    for(let i=0;i<59;i++)assert.equal((await request(handler,payload())).code,201);
    assert.equal((await request(handler,payload())).code,429);
    assert.equal((await request(handler,first)).body.reference,initial.body.reference);
  }finally{await rm(dir,{recursive:true,force:true});}
});
