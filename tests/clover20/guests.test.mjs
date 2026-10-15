import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createGuestsHandler,createGuestSqlStore,guestsCsv} from '../../api/_lib/clover20-guests.js';
import {createRegistrationHandler} from '../../api/_lib/clover20-registration.js';
import {createFileStore} from '../../tools/clover20/preview-store.mjs';

async function request(handler,url='/api/clover20-guests',method='GET',body){
  const req={url,method,body,headers:{host:'localhost:4179',origin:'http://localhost:4179','content-type':'application/json'}};
  const res={headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value;},status(code){this.code=code;return this;},json(value){this.body=value;return this;},send(value){this.body=value;return this;}};
  await handler(req,res);return res;
}

test('submitted names and stories are readable after reopening the store, without private metadata',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'clover20-guests-'));
  try{
    const filename=join(dir,'guests.json'),write=createRegistrationHandler({getStore:async()=>createFileStore(filename)});
    const name='เพื่อน "Clover", คนเดิม',message='คิดถึงทุกคน\nรอฟังเรื่องใหม่ ๆ';
    assert.equal((await request(write,'/api/clover20-rsvp','POST',{name,message,requestId:randomUUID()})).code,201);
    const read=createGuestsHandler({getStore:async()=>createFileStore(filename)});
    const result=await request(read);
    assert.equal(result.code,200);assert.deepEqual(result.body.summary,{total:1,withMessages:1});
    assert.equal(result.body.guests[0].name,name);assert.equal(result.body.guests[0].message,'คิดถึงทุกคนรอฟังเรื่องใหม่ ๆ');
    assert.deepEqual(Object.keys(result.body.guests[0]).sort(),['createdAt','message','name']);
    assert.equal(result.body.nextCursor,null);
    assert.match(result.headers['cache-control'],/no-store/);assert.match(result.headers['x-robots-tag'],/noindex/);
    assert.ok(!JSON.stringify(result.body).includes('ipHash'));
    const csv=await request(read,'/api/clover20-guests?format=csv');
    assert.equal(csv.code,200);assert.match(csv.headers['content-type'],/text\/csv/);assert.match(csv.headers['content-disposition'],/^attachment;/);
    assert.equal(csv.body.charCodeAt(0),0xFEFF);assert.ok(csv.body.includes('"เพื่อน ""Clover"", คนเดิม"'));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('pagination handles equal timestamps; search and stories filters do not change overall totals',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'clover20-paging-'));
  try{
    const file=join(dir,'guests.json');
    const {writeFile}=await import('node:fs/promises');
    const rows=Array.from({length:7},(_,i)=>({name:i<3?'Tom '+i:'เพื่อน '+i,message:i%2?'เรื่องเล่าของเรา':'',reference:'CL20-'+i.toString(16).toUpperCase().padStart(8,'0'),createdAt:'2026-10-15T23:00:00.000Z',requestId:randomUUID(),ipHash:'private'}));
    await writeFile(file,JSON.stringify(rows));
    const handler=createGuestsHandler({getStore:async()=>createFileStore(file)});
    let url='/api/clover20-guests?limit=2',names=[];
    for(let i=0;i<4;i++){
      const result=await request(handler,url);assert.equal(result.code,200);
      names.push(...result.body.guests.map(guest=>guest.name));
      url='/api/clover20-guests?limit=2&before='+result.body.nextCursor;
      if(i===3)assert.equal(result.body.nextCursor,null);
    }
    assert.equal(names.length,7);assert.equal(new Set(names).size,7);
    const filtered=await request(handler,'/api/clover20-guests?search=tom&stories=1');
    assert.deepEqual(filtered.body.summary,{total:7,withMessages:3});assert.equal(filtered.body.matching,1);assert.equal(filtered.body.guests[0].name,'Tom 1');
    const exportAll=await request(handler,'/api/clover20-guests?format=csv&search=tom&stories=1');
    assert.ok(exportAll.body.includes('เพื่อน 6'));assert.ok(exportAll.body.includes('Tom 0'));
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('only the approved public fields leave the JSON adapter',async()=>{
  const handler=createGuestsHandler({getStore:async()=>({read:async()=>({summary:{total:1,withMessages:0,secret:'hidden'},matching:1,guests:[{name:'A',message:'',createdAt:'2026-10-15T23:00:00Z',ip_hash:'hidden',payload_hash:'hidden',request_id:'hidden'}],nextCursor:null})})});
  const result=await request(handler);
  assert.deepEqual(Object.keys(result.body.guests[0]).sort(),['createdAt','message','name']);assert.ok(!JSON.stringify(result.body).includes('hidden'));
});

test('invalid parameters and write methods never reach storage; failure is not a false empty list',async()=>{
  let touched=false;
  const handler=createGuestsHandler({getStore:async()=>{touched=true;throw Error('postgres://private-secret');}});
  for(const url of ['/api/clover20-guests?before=bad','/api/clover20-guests?limit=100000','/api/clover20-guests?stories=yes','/api/clover20-guests?format=html','/api/clover20-guests?search='+'a'.repeat(101)])assert.equal((await request(handler,url)).code,400);
  assert.equal((await request(handler,'/api/clover20-guests','DELETE')).code,405);assert.equal(touched,false);
  const result=await request(handler);assert.equal(result.code,503);assert.equal(result.body.ok,false);assert.ok(!('guests' in result.body));assert.ok(!JSON.stringify(result.body).includes('private-secret'));
});

test('CSV preserves Thai, commas, newlines and quotes and neutralizes spreadsheet formulas',()=>{
  const csv=guestsCsv([{name:'คุณ "เอ", Clover',message:'แล้วเจอกัน\nคิดถึงเสมอ',createdAt:'2026-10-15T23:00:00Z'},...['=1+1','+SUM(A1:A2)','-1+2','@SUM(A1:A2)','  =HYPERLINK("https://example.test")','\ttext'].map(message=>({name:'เพื่อน',message,createdAt:'2026-10-15T23:00:00Z'}))]);
  assert.ok(csv.startsWith('\uFEFF"ชื่อ","ข้อความที่ฝากไว้"'));
  assert.ok(csv.includes('"คุณ ""เอ"", Clover","แล้วเจอกัน\nคิดถึงเสมอ","2026-10-16 06:00:00"'));
  for(const start of ['=','+','-','@','  =','\t'])assert.ok(csv.includes('"\''+start));
  assert.ok(csv.endsWith('\r\n'));
});

test('SQL reads are transactional, parameterized, preserve microsecond cursors and expose no private columns',async()=>{
  let seen;
  const sql={transaction:async(callback,options)=>{
    const queries=[];const values=callback({query:(text,params)=>{queries.push({text,params});return queries.length;}});
    seen={queries,options,values};
    return [[{total:3,with_messages:2}],[{matching:3}],[{name:'A',message:'hello',created_at:'2026-10-16T00:00:00.123456Z',reference:'CL20-00000003'},{name:'B',message:'',created_at:'2026-10-16T00:00:00.123455Z',reference:'CL20-00000002'}]];
  }};
  const store=createGuestSqlStore(sql),search="%' OR true --";
  const result=await store.read({search,storiesOnly:true,limit:1});
  assert.deepEqual(seen.options,{isolationLevel:'RepeatableRead',readOnly:true});
  assert.ok(seen.queries.every(q=>/^SELECT/.test(q.text)));assert.ok(seen.queries.every(q=>!q.text.includes(search)));
  assert.equal(seen.queries[2].params[0],search);assert.equal(seen.queries[2].params[4],2);
  assert.ok(!seen.queries.some(q=>/ip_hash|request_id|payload_hash/.test(q.text)));
  assert.equal(JSON.parse(Buffer.from(result.nextCursor,'base64url')).time,'2026-10-16T00:00:00.123456Z');
  let before;
  const handler=createGuestsHandler({getStore:async()=>({read:async options=>{before=options.before;return result;}})});
  await request(handler,'/api/clover20-guests?before='+result.nextCursor);
  assert.equal(before.time,'2026-10-16T00:00:00.123456Z');
});

test('an uninitialized table is empty, while a database outage stays an error',async()=>{
  const missing=createGuestSqlStore({transaction:async()=>{throw Object.assign(Error('missing'),{code:'42P01'});},query:async()=>{throw Object.assign(Error('missing'),{code:'42P01'});}});
  assert.equal((await missing.read()).summary.total,0);assert.deepEqual(await missing.export(),[]);
  const offline=createGuestSqlStore({transaction:async()=>{throw Error('offline');}});
  await assert.rejects(offline.read(),/offline/);
});
