import test from 'node:test';
import assert from 'node:assert/strict';
import {Writable} from 'node:stream';
import {authorizeLearnMedia} from './learn-media-authorization.js';
import {createLearnMediaHandler} from './learn-media-handler.js';
import {sha256} from './core.js';

const NOW=Date.parse('2026-09-20T10:00:00Z'),TOKEN='fixture-session-never-log';
const assets=[{id:'m_'+'a'.repeat(32),courseId:'ai-sauce',lessonIds:['EP01'],kind:'video',filename:'lesson.mp4',contentType:'video/mp4',bytes:12},
  {id:'m_'+'b'.repeat(32),courseId:'ai-sauce',lessonIds:['EP02'],kind:'video'},
  {id:'m_'+'c'.repeat(32),courseId:'another',lessonIds:['EP01'],kind:'video'}];
const courses=[{id:'ai-sauce',lessons:[{id:'EP01',mediaId:assets[0].id},{id:'EP02',mediaId:assets[1].id},{id:'BOSS',type:'boss'}]}];
const ids={courseId:'ai-sauce',lessonId:'EP01',assetId:assets[0].id};
const request={headers:{cookie:'mc_session='+TOKEN}},options={now:NOW,courses,assets};
const allowed={account_id:'alice',session_verified_at:'2026-09-01',account_verified_at:'2026-09-01',session_expires_at:'2026-10-01',
  enrolled_user_id:'alice',active_grant:true,active_instructor:false,pathname:'learn/000.mp4',content_type:'video/mp4',bytes:12,sha256:'1'.repeat(64)};
function fixture(row={...allowed}) {const calls=[];const state={row};const sql={query:async(text,args)=>{calls.push({text,args});return state.row?[state.row]:[];}};return {sql,calls,state};}

test('media access and registry use one parameterized fresh read with no schema or payment writes',async()=>{
  const f=fixture(),result=await authorizeLearnMedia(f.sql,request,ids,options);assert.equal(result.asset.id,assets[0].id);assert.equal(result.mediaRow.pathname,'learn/000.mp4');
  assert.equal(f.calls.length,1);const {text,args}=f.calls[0];
  assert.deepEqual(args,[await sha256(TOKEN),'ai-sauce',assets[0].id,new Date(NOW)]);
  assert.match(text,/FROM mc_sessions s JOIN mc_accounts a ON a.id=s.user_id/);assert.match(text,/WHERE s.token_hash=\$1/);
  assert.match(text,/e.user_id=a.id AND e.course_id=\$2/);assert.match(text,/m.asset_id=\$3/);
  assert.match(text,/g.revoked_at IS NULL AND g.starts_at<=\$4 AND g.expires_at>\$4/);assert.match(text,/i.revoked_at IS NULL AND i.granted_at<=\$4/);
  assert.doesNotMatch(text,/CREATE|ALTER|INSERT|UPDATE|DELETE|mc_ai_source_registrations|fixture-session-never-log/);
});
test('anonymous or malformed-cookie requests fail before reading any database',async()=>{
  for(const req of [{headers:{}},{headers:{cookie:'other=value'}},{headers:{cookie:'mc_session=%XX'}}]){
    const f=fixture();await assert.rejects(authorizeLearnMedia(f.sql,req,ids,options),e=>e.code==='AUTH_REQUIRED'&&e.status===401);assert.equal(f.calls.length,0);
  }
});
test('unknown, expired and unverifiable sessions keep the established authorization errors',async()=>{
  for(const [change,code] of [[null,'AUTH_REQUIRED'],[{session_expires_at:new Date(NOW)},'AUTH_REQUIRED'],[{session_expires_at:'invalid'},'AUTH_REQUIRED'],
    [{session_verified_at:null},'EMAIL_VERIFICATION_REQUIRED'],[{account_verified_at:null},'EMAIL_VERIFICATION_REQUIRED'],[{account_verified_at:'invalid'},'EMAIL_VERIFICATION_REQUIRED'],
    [{enrolled_user_id:null},'COURSE_ENROLLMENT_REQUIRED'],[{enrolled_user_id:'bob'},'COURSE_ENROLLMENT_REQUIRED'],
    [{active_grant:false,active_instructor:false},'COURSE_ACCESS_REQUIRED'],[{active_grant:'true'},'COURSE_ACCESS_REQUIRED']]){
    const f=fixture(change===null?null:{...allowed,...change});
    await assert.rejects(authorizeLearnMedia(f.sql,request,ids,options),e=>e.code===code);assert.equal(f.calls.length,1);
  }
});
test('instructors have course-scoped access without a paid grant and cannot bypass enrollment',async()=>{
  const f=fixture({...allowed,active_grant:false,active_instructor:true});assert.equal((await authorizeLearnMedia(f.sql,request,ids,options)).asset.id,assets[0].id);
  f.state.row.enrolled_user_id=null;await assert.rejects(authorizeLearnMedia(f.sql,request,ids,options),e=>e.code==='COURSE_ENROLLMENT_REQUIRED');
});
test('revocation, session logout and account verification changes apply on the next range request',async()=>{
  const f=fixture();await authorizeLearnMedia(f.sql,request,ids,options);
  f.state.row.active_grant=false;await assert.rejects(authorizeLearnMedia(f.sql,request,ids,options),e=>e.code==='COURSE_ACCESS_REQUIRED');
  f.state.row.active_grant=true;f.state.row.account_verified_at=null;await assert.rejects(authorizeLearnMedia(f.sql,request,ids,options),e=>e.code==='EMAIL_VERIFICATION_REQUIRED');
  f.state.row=null;await assert.rejects(authorizeLearnMedia(f.sql,request,ids,options),e=>e.code==='AUTH_REQUIRED');assert.equal(f.calls.length,4);
});
test('a valid course entitlement cannot fetch another lesson or course asset',async()=>{
  for(const change of [{assetId:assets[1].id},{assetId:assets[2].id},{lessonId:'BOSS'},{assetId:'unknown'}]){
    const f=fixture();await assert.rejects(authorizeLearnMedia(f.sql,request,{...ids,...change},options),e=>e.code==='ASSET_NOT_FOUND');
  }
  const f=fixture();await assert.rejects(authorizeLearnMedia(f.sql,request,{...ids,lessonId:'missing'},options),e=>e.code==='LESSON_NOT_FOUND');
});
test('absent registry data stays unavailable instead of reading an arbitrary asset path',async()=>{
  const f=fixture({...allowed,pathname:null,content_type:null,bytes:null,sha256:null});
  assert.equal((await authorizeLearnMedia(f.sql,request,ids,options)).mediaRow,null);assert.equal(f.calls.length,1);
});
test('stream handler uses the combined authorization without any migration or extra registry roundtrip',async()=>{
  const f=fixture(),timings=[];let blobCalls=0;
  const handler=createLearnMediaHandler({getSql:()=>f.sql,authorize:(sql,req,values)=>authorizeLearnMedia(sql,req,values,options),registryAssets:assets,
    config:{LEARN_BLOB_READ_WRITE_TOKEN:'test-private'},timingLog:data=>timings.push(data),
    getBlob:async()=>{
      blobCalls++;
      return {headers:new Headers({'content-length':'12'}),stream:new ReadableStream({start(c){c.enqueue(Buffer.from('Hello World!'));c.close();}})};
    }
  });
  const response=new Writable({write(chunk,encoding,done){this.parts.push(Buffer.from(chunk));done();}});response.parts=[];response.headers={};
  response.setHeader=(k,v)=>{response.headers[k.toLowerCase()]=v;};response.removeHeader=k=>{delete response.headers[k.toLowerCase()];};
  await handler({...request,method:'GET',url:'/api/learn-media?'+new URLSearchParams(ids)},response);
  assert.equal(response.statusCode,200);assert.equal(blobCalls,1);assert.equal(f.calls.length,1);assert.equal(Buffer.concat(response.parts).toString(),'Hello World!');
  assert.equal(response.headers['cache-control'],'private, max-age=0, must-revalidate');assert.match(response.headers['server-timing'],/authorization;dur=/);
  assert.doesNotMatch(JSON.stringify(timings),/alice|fixture-session|test-private|pathname|m_aaaa/);
});
test('known cached video ETag never bypasses fresh logout, revocation, verification, enrollment or asset checks',async()=>{
  const f=fixture();let storageCalls=0;
  const handler=createLearnMediaHandler({getSql:()=>f.sql,authorize:(sql,req,values)=>authorizeLearnMedia(sql,req,values,options),registryAssets:assets,
    timingLog:()=>{},getOidcToken:async()=>{storageCalls++;throw Error('conditional requests must not reach storage');}});
  const call=async({row={...allowed},cookie=request.headers.cookie,values=ids,method='GET'}={})=>{
    f.state.row=row;
    const response=new Writable({write(chunk,encoding,done){this.parts.push(Buffer.from(chunk));done();}});response.parts=[];response.headers={};
    response.setHeader=(k,v)=>{response.headers[k.toLowerCase()]=v;};response.removeHeader=k=>{delete response.headers[k.toLowerCase()];};
    await handler({method,url:'/api/learn-media?'+new URLSearchParams(values),headers:{cookie,'if-none-match':'"sha256-'+ '1'.repeat(64)+'"'}},response);
    return response;
  };
  assert.equal((await call()).statusCode,304);assert.equal(f.calls.length,1);
  for(const method of ['GET','HEAD']){
    for(const [change,status] of [[{active_grant:false},403],[{account_verified_at:null},403],[{session_verified_at:null},403],
      [{enrolled_user_id:'bob'},403],[{session_expires_at:new Date(NOW)},401],[{pathname:'learn/001.mp4'},503]]){
      const r=await call({method,row:{...allowed,...change}});assert.equal(r.statusCode,status);assert.equal(r.headers.etag,undefined);assert.equal(r.headers['cache-control'],'private, no-store');
    }
    assert.equal((await call({method,row:null})).statusCode,401);
    for(const cookie of ['', 'mc_session=%XX','mc_session=one; mc_session=two'])assert.equal((await call({method,cookie})).statusCode,401);
    assert.equal((await call({method,values:{...ids,assetId:assets[1].id}})).statusCode,404);
  }
  assert.equal(storageCalls,0);
});
