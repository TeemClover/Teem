import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLearnSnapshot} from './learn-snapshot.js';
import {createLearnHandler} from './learn-handler.js';
import {courseAccess} from './learn-domain.js';
import {sha256} from './core.js';

const NOW=Date.parse('2026-09-20T10:00:00Z'),TOKEN='snapshot-fixture-token';
const enrollment={user_id:'alice',course_id:'ai-sauce',registered_at:'2026-09-01'};
const grant={reference:'owned-receipt',course_id:'ai-sauce',starts_at:'2026-09-01',expires_at:'2027-09-01',revoked_at:null};
const instructor={user_id:'alice',course_id:'ai-sauce',granted_at:'2026-09-01',revoked_at:null};
const row={id:'alice',email:'alice@example.test',display_name:'Alice',member_no:'MY-fixture',session_verified_at:'2026-09-01',
  session_expires_at:'2026-10-01',account_verified_at:'2026-09-01',enrollment,grants:[grant],registrations:[],instructors:[],reading:'# Private lesson',progress:[]};
const courses=[{id:'ai-sauce',title:'Course',lessons:[{id:'EP01',title:'Lesson',mediaId:'v_intro',durationSeconds:75},{id:'BOSS',type:'boss'}]},
  {id:'another-course',title:'Other',lessons:[{id:'EP01',title:'Other lesson'}]}];
const assets=[{id:'v_intro',courseId:'ai-sauce',lessonIds:['EP01'],kind:'video',filename:'intro.mp4'}];
const req={headers:{cookie:'mc_session='+TOKEN}},opts={courseId:'ai-sauce',lessonId:'EP01',includeReading:true,now:NOW};
function fixture(initial={...row}) {
  const state={row:structuredClone(initial),progress:[]},calls=[];
  const sql={query:async(text,args)=>{
    calls.push({text,args});
    if(text.startsWith('SELECT a.id'))return state.row?[state.row]:[];
    if(text.startsWith('INSERT INTO mc_learn_progress')) {
      const old=state.progress.find(p=>p.lesson_id===args[2]);
      const next={lesson_id:args[2],position_seconds:args[3],max_position_seconds:Math.max(args[3],old?.max_position_seconds||0),completed:args[4]||old?.completed||false,version:(old?.version||0)+1,updated_at:args[5]};
      state.progress=state.progress.filter(p=>p.lesson_id!==args[2]).concat(next);return [next];
    }
    if(text.includes('FROM mc_learn_progress WHERE user_id=$1 AND course_id=$2'))return state.progress;
    throw Error('Unexpected SQL request');
  }};
  const handler=createLearnHandler({getSql:()=>sql,courses,assets,now:()=>NOW});
  async function call(action='lesson',{method='GET',body,query={},cookie=req.headers.cookie,headers={}}={}) {
    const q={action,courseId:'ai-sauce',...(action==='lesson'?{lessonId:'EP01'}:{}),...query};
    const request={method,url:'/api/learn?'+new URLSearchParams(q),query:q,body,headers:{host:'www.myclover.com',origin:'https://www.myclover.com',cookie,'content-type':'application/json',...headers}};
    const response={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(value){this.body=JSON.parse(value);}};
    await handler(request,response);return response;
  }
  return {sql,state,calls,call};
}

test('lesson snapshot checks fresh session/account/course and retrieves authorized reading in one parameterized query',async()=>{
  const f=fixture(),result=await loadLearnSnapshot(f.sql,req,opts);
  assert.equal(result.reading,row.reading);assert.equal(result.user.id,'alice');assert.equal(result.access.active,true);assert.equal(f.calls.length,1);
  const {text,args}=f.calls[0];assert.deepEqual(args,[await sha256(TOKEN),'ai-sauce','EP01',true,false,new Date(NOW)]);
  assert.match(text,/FROM mc_sessions s JOIN mc_accounts a ON a.id=s.user_id/);assert.match(text,/WHERE s.token_hash=\$1/);
  assert.match(text,/e.user_id=a.id AND e.course_id=\$2::text/);
  assert.match(text,/g.user_id=a.id AND g.course_id=\$2::text/);assert.match(text,/i.user_id=a.id AND i.course_id=\$2::text/);
  assert.match(text,/r.reference=l.reference AND r.account_id=l.user_id/);assert.match(text,/l.user_id=a.id AND l.course_id=\$2::text/);
  assert.match(text,/p.user_id=a.id AND p.course_id=\$2::text/);assert.match(text,/course_id=\$2::text AND lesson_id=\$3::text/);
  assert.match(text,/CASE WHEN \$4::boolean AND s.expires_at>\$6 AND s.email_verified_at IS NOT NULL AND a.email_verified_at IS NOT NULL AND e.user_id=a.id/);
  assert.match(text,/g.revoked_at IS NULL AND g.starts_at<=\$6 AND g.expires_at>\$6/);assert.match(text,/i.revoked_at IS NULL AND i.granted_at<=\$6/);
  assert.doesNotMatch(text,/\b(?:CREATE|ALTER|INSERT|UPDATE|DELETE)\b|snapshot-fixture-token/);
});
test('guests and ambiguous/malformed cookies do not query any private data',async()=>{
  for(const cookie of ['', 'other=value','mc_session=%XX','mc_session=one; mc_session=two']) {
    const f=fixture();await assert.rejects(loadLearnSnapshot(f.sql,{headers:{cookie}},opts),e=>e.code==='AUTH_REQUIRED'&&e.status===401);assert.equal(f.calls.length,0);
  }
});
test('expired, deleted and unverified sessions/accounts preserve denial errors',async()=>{
  for(const [patch,code] of [[null,'AUTH_REQUIRED'],[{session_expires_at:new Date(NOW)},'AUTH_REQUIRED'],[{session_expires_at:'invalid'},'AUTH_REQUIRED'],
    [{session_verified_at:null},'EMAIL_VERIFICATION_REQUIRED'],[{account_verified_at:null},'EMAIL_VERIFICATION_REQUIRED'],[{account_verified_at:'invalid'},'EMAIL_VERIFICATION_REQUIRED']]) {
    const f=fixture(patch===null?null:{...row,...patch});const r=await f.call();assert.equal(r.body.code,code);assert.equal(r.body.lesson,undefined);assert.equal(f.calls.length,1);
  }
});
test('all registered/pending/expired/revoked/rejected/instructor access semantics reuse courseAccess',async()=>{
  const cases=[{grants:[]},{grants:[],registrations:[{reference:'new',status:'pending_verification',created_at:'2026-09-01'}]},
    {grants:[{...grant,expires_at:'2026-09-10'}]},{grants:[{...grant,revoked_at:'2026-09-10'}]},
    {grants:[],registrations:[{status:'rejected',created_at:'2026-09-01'}]},
    {grants:[{...grant,starts_at:'2026-10-01'}]},{grants:[{...grant,revoked_at:'2026-09-01'},grant]},
    {grants:[],instructors:[instructor]},{grants:[],instructors:[{...instructor,revoked_at:'2026-09-10'}]},
    {grants:[],instructors:[{...instructor,granted_at:'2026-10-01'}]}];
  for(const change of cases){const f=fixture({...row,...change}),r=await loadLearnSnapshot(f.sql,req,opts),v=f.state.row;
    assert.deepEqual(r.access,courseAccess(enrollment,v.grants,v.registrations,NOW,v.instructors));if(!r.access.active)assert.equal(r.reading,'');
  }
});
test('lesson requires the matching enrolled course even with a paid grant or instructor role',async()=>{
  for(const enrollment of [null,{...row.enrollment,user_id:'bob'},{...row.enrollment,course_id:'another-course'}]) {
    const f=fixture({...row,enrollment,instructors:[instructor]});const r=await f.call();assert.equal(r.body.code,'COURSE_ENROLLMENT_REQUIRED');assert.equal(r.body.lesson,undefined);
  }
  const f=fixture({...row,grants:[],instructors:[{...instructor,course_id:'another-course'}]});assert.equal((await f.call()).body.code,'COURSE_ACCESS_REQUIRED');
});
test('lesson denies revoked access on the very next request, with no account/session/grant cache',async()=>{
  const f=fixture();assert.equal((await f.call()).statusCode,200);
  f.state.row.grants[0].revoked_at='2026-09-20';assert.equal((await f.call()).body.code,'COURSE_ACCESS_REQUIRED');
  f.state.row.instructors=[instructor];assert.equal((await f.call()).body.access.role,'instructor');
  f.state.row.account_verified_at=null;assert.equal((await f.call()).body.code,'EMAIL_VERIFICATION_REQUIRED');
  f.state.row=null;assert.equal((await f.call()).body.code,'AUTH_REQUIRED');assert.equal(f.calls.length,5);
});
test('GET lesson uses one query and private timing while preserving missing-reading and unknown-lesson behavior',async()=>{
  const f=fixture();const r=await f.call();assert.equal(r.statusCode,200);assert.equal(r.body.lesson.readingAvailable,true);
  assert.match(r.headers['server-timing'],/learn-db;dur=[\d.]+, learn-queries;desc="1"/);assert.equal(f.calls.length,1);
  for(const key of ['cache-control','cdn-cache-control','vercel-cdn-cache-control'])assert.equal(r.headers[key],'private, no-store, max-age=0');
  assert.doesNotMatch(r.headers['server-timing'],/alice|receipt|session|Private/);
  f.state.row.reading='';assert.equal((await f.call()).body.lesson.readingAvailable,false);
  assert.equal((await f.call('lesson',{query:{lessonId:'missing'}})).body.code,'LESSON_NOT_FOUND');
});
test('GET progress remains available to an expired but verified enrolled learner in one scoped read',async()=>{
  const progress=[{lesson_id:'EP01',position_seconds:20,max_position_seconds:30,completed:true,version:4,updated_at:'2026-09-20'},
    {lesson_id:'unknown-lesson',position_seconds:20,completed:true}];
  const f=fixture({...row,grants:[{...grant,expires_at:'2026-09-10'}],progress}),r=await f.call('progress');
  assert.equal(r.statusCode,200);assert.equal(r.body.progress.lessons.EP01.positionSeconds,20);assert.equal(r.body.progress.lessons['unknown-lesson'],undefined);
  assert.equal(r.body.reading,undefined);assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].args.slice(1,5),['ai-sauce',null,false,true]);
});
test('GET progress keeps identity before query/course/enrollment validation',async()=>{
  const f=fixture();assert.equal((await f.call('progress',{cookie:'',query:{courseId:'bad id'}})).body.code,'AUTH_REQUIRED');assert.equal(f.calls.length,0);
  assert.equal((await f.call('progress',{query:{courseId:'bad id'}})).body.code,'INVALID_COURSE_ID');
  assert.equal((await f.call('progress',{query:{courseId:'missing'}})).body.code,'COURSE_NOT_FOUND');
  f.state.row.enrollment=null;assert.equal((await f.call('progress')).body.code,'COURSE_ENROLLMENT_REQUIRED');
});
test('PUT progress uses fresh access plus existing atomic write and scoped reload, never migrations',async()=>{
  const f=fixture(),body={courseId:'ai-sauce',lessonId:'EP01',positionSeconds:100,completed:true};
  const r=await f.call('progress',{method:'PUT',body});assert.equal(r.statusCode,200);assert.equal(r.body.progress.lessons.EP01.positionSeconds,75);
  assert.equal(f.calls.length,3);assert.match(r.headers['server-timing'],/learn-queries;desc="3"/);
  assert.deepEqual(f.calls[1].args.slice(0,5),['alice','ai-sauce','EP01',75,true]);assert.deepEqual(f.calls[2].args,['alice','ai-sauce']);
  assert.match(f.calls[1].text,/completed=mc_learn_progress.completed OR EXCLUDED.completed/);assert.match(f.calls[1].text,/version=mc_learn_progress.version\+1/);
  assert.doesNotMatch(f.calls.map(c=>c.text).join('\n'),/CREATE|ALTER/);
  f.state.row.grants[0].revoked_at='2026-09-20';assert.equal((await f.call('progress',{method:'PUT',body})).body.code,'COURSE_ACCESS_REQUIRED');assert.equal(f.calls.length,4);
});
test('PUT progress rejects forged identity and invalid boss progress before any write',async()=>{
  for(const patch of [{userId:'bob'},{instructor:true},{positionSeconds:-1},{positionSeconds:'5'},{lessonId:'BOSS',positionSeconds:1}]){
    const f=fixture(),r=await f.call('progress',{method:'PUT',body:{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:10,...patch}});
    assert.equal(r.statusCode,400);assert.equal(f.calls.length,1);assert.equal(f.state.progress.length,0);
  }
  const f=fixture(),r=await f.call('progress',{method:'PUT',body:{courseId:'ai-sauce',lessonId:'BOSS',positionSeconds:0,completed:true}});
  assert.equal(r.statusCode,200);assert.equal(r.body.progress.lessons.BOSS.completed,true);
});
test('cross-origin writes and infrastructure errors stay denied/private with no SQL details',async()=>{
  const f=fixture(),r=await f.call('progress',{method:'PUT',body:{},headers:{origin:'https://other.example'}});assert.equal(r.body.code,'BAD_ORIGIN');assert.equal(f.calls.length,0);
  f.sql.query=async()=>{throw Error('private postgres connection');};const failed=await f.call();assert.equal(failed.statusCode,503);assert.equal(failed.body.code,'LEARN_UNAVAILABLE');
  assert.equal(failed.headers['cache-control'],'private, no-store, max-age=0');assert.doesNotMatch(JSON.stringify(failed.body),/postgres|connection/);
});
