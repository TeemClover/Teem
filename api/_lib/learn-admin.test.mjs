import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createLearnAdminHandler, createLearnAdminStore, progressForLearner, downloadForLearner } from './learn-admin-handler.js';

const COURSE={id:'ai-sauce',title:'AI Sauce',sections:[{id:'intro',label:'บทนำ',title:'เริ่มลงมือ',lessonIds:['one','two']}],
  lessons:[{id:'one',title:'One',mediaId:'video-one',durationSeconds:30},{id:'two',title:'Two',mediaId:'video-two',durationSeconds:60}]};
const DATE='2026-09-15T06:00:00.000Z';
function harness({key='owner-test',fail=false}={}){
  const calls=[];
  const store={ensure:async()=>{calls.push('ensure');if(fail)throw Error('postgres://private-secret');},
    counts:async(...args)=>{calls.push(['counts',...args]);return {enrolled:'7',pending:'1',active:'2',expired:'1',revoked:'1',verified_awaiting_grant:'1'};},
    learners:async(...args)=>{calls.push(['learners',...args]);return [{user_id:'z',display_name:'Student <script>',email:'z@example.com',access_status:'active',expires_at:'2027-09-15T00:00:00Z'},{user_id:'y',email:'y@example.com',access_status:'expired'}];},
    learner:async(...args)=>{calls.push(['learner',...args]);return args[2]==='outside-page'?[{user_id:'outside-page',display_name:'One selected learner',email:'selected@example.com',access_status:'active'}]:[];},
    progress:async(...args)=>{calls.push(['progress',...args]);return [{user_id:'z',lesson_id:'one',position_seconds:12,max_position_seconds:30,completed:false,updated_at:DATE},{user_id:'other',lesson_id:'one',completed:true},{user_id:'z',lesson_id:'unknown',completed:true}];},
    downloads:async()=>[{user_id:'z',file_id:'guide',filename:'GUIDE.md',requests:2,last_requested_at:DATE},{user_id:'other',file_id:'secret',filename:'other.md'}],
    campaigns:async()=>[{source:'facebook',medium:'paid',campaign:'<script>',enrolled:'3',pending:'1',active:'1'}]};
  const handler=createLearnAdminHandler({getSql:()=>{calls.push('database');return {};},config:key?{MEET_ADMIN_KEY:key}:{},storeFactory:()=>store,courseLookup:id=>id==='ai-sauce'?COURSE:null,now:()=>new Date(DATE)});
  async function call({url='/api/learn-admin?courseId=ai-sauce',method='GET',headers={'x-admin-key':'owner-test'}}={}){const r={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=JSON.parse(v);}};await handler({url,method,headers},r);return r;}
  return {call,calls,store};
}
test('admin statistics require the existing header key before reading any database or private fields',async()=>{
  for(const input of [{headers:{}},{headers:{cookie:'mc_session=student'}},{headers:{'x-admin-key':'wrong'}},{url:'/api/learn-admin?adminKey=owner-test',headers:{}},{url:'/api/learn-admin?userId=outside-page',headers:{cookie:'mc_session=student'}}]){const h=harness(),r=await h.call(input);assert.equal(r.statusCode,401);assert.deepEqual(h.calls,[]);assert.equal(r.body.learners,undefined);assert.match(r.headers['cache-control'],/private, no-store/);}
  const h=harness({key:''});assert.equal((await h.call()).statusCode,503);assert.deepEqual(h.calls,[]);
});
test('the stats endpoint has no mutations and validates course, duplicate keys and pagination',async()=>{
  for(const input of [{method:'POST'},{method:'PATCH'},{url:'/api/learn-admin?courseId=missing'},{url:'/api/learn-admin?limit=101'},{url:'/api/learn-admin?limit=0'},{url:'/api/learn-admin?before=../secret'},{url:'/api/learn-admin?courseId=ai-sauce&courseId=other'},
    ...['userId=', 'userId=../other', 'userId=a&userId=b', 'userId=a&before=z', 'userId=a&limit=1', 'userId='+ 'a'.repeat(129), 'userId=bad%20id'].map(query=>({url:'/api/learn-admin?'+query}))]){const h=harness(),r=await h.call(input);assert.ok([400,404,405].includes(r.statusCode));assert.deepEqual(h.calls,[]);}
});
test('direct lookup finds a selected paid learner independently of the current page and omits unrelated global queries',async()=>{
  const h=harness(),r=await h.call({url:'/api/learn-admin?courseId=ai-sauce&userId=outside-page'});
  assert.equal(r.statusCode,200);assert.deepEqual(r.body.learners.map(row=>row.userId),['outside-page']);assert.equal(r.body.nextCursor,null);
  assert.equal(r.body.counts,undefined);assert.equal(r.body.campaigns,undefined);
  assert.equal(h.calls.some(call=>['counts','campaigns','learners'].includes(call[0])),false);
  assert.deepEqual(h.calls.find(call=>call[0]==='learner').slice(1),['ai-sauce',new Date(DATE),'outside-page']);
  assert.deepEqual(h.calls.find(call=>call[0]==='progress').slice(1),['ai-sauce',['outside-page']]);
  assert.deepEqual(r.body.learners[0].downloads,[]);assert.equal(r.body.learners[0].lastActivityAt,null);assert.equal(r.body.learners[0].lastDownloadAt,null);
  assert.doesNotMatch(JSON.stringify(r.body),/z@example|y@example|GUIDE\.md|other\.md/);
});
test('direct lookup returns no learner when the account has no matching paid/granted enrollment',async()=>{
  const h=harness(),r=await h.call({url:'/api/learn-admin?userId=unpaid'});
  assert.equal(r.statusCode,200);assert.deepEqual(r.body.learners,[]);assert.equal(r.body.nextCursor,null);
  assert.deepEqual(h.calls.find(call=>call[0]==='progress').slice(1),['ai-sauce',[]]);
});
test('paid learner pagination never uses a cursor to page the course totals or leak another learner progress',async()=>{
  const h=harness(),r=await h.call({url:'/api/learn-admin?courseId=ai-sauce&limit=1&before=zz'});assert.equal(r.statusCode,200);assert.equal(r.body.counts.enrolled,7);assert.equal(r.body.learners.length,1);assert.equal(r.body.nextCursor,'z');
  assert.deepEqual(h.calls.find(x=>x[0]==='progress').slice(1),['ai-sauce',['z']]);assert.equal(r.body.learners[0].downloads.length,1);assert.equal(r.body.learners[0].downloads[0].filename,'GUIDE.md');assert.equal(r.body.learners[0].downloads[0].requests,2);assert.equal(r.body.learners[0].completedLessons,0);assert.equal(r.body.learners[0].lessons.length,2);assert.equal(r.body.learners[0].positionSeconds,12);assert.match(r.body.progressNote,/ไม่ยืนยัน/);assert.match(r.body.campaignNote,/ครั้งแรก/);
  assert.equal(r.body.campaigns[0].enrolled,3);assert.doesNotMatch(JSON.stringify(r.body),/receipt_bytes|password|token_hash/);assert.match(r.headers['vercel-cdn-cache-control'],/no-store/);
  assert.equal(r.body.learners[0].lastDownloadAt,DATE);
});
test('learning and file request timestamps stay separate, with parallel per-account reads', {timeout:1000}, async()=>{
  const h=harness();let finishProgress,downloadStarted=false;
  h.store.progress=()=>new Promise(resolve=>{finishProgress=resolve;});
  h.store.downloads=async()=>{downloadStarted=true;finishProgress([]);return [{user_id:'z',file_id:'toolkit:guide',filename:'GUIDE_TH.md',requests:1,last_requested_at:'2026-09-21T01:00:00Z'}];};
  const r=await h.call();assert.equal(downloadStarted,true);assert.equal(r.statusCode,200);
  assert.equal(r.body.learners[0].lastActivityAt,null);assert.equal(r.body.learners[0].lastDownloadAt,'2026-09-21T01:00:00.000Z');
  assert.equal(r.body.learners[0].downloads[0].title,'วิธีใช้สมุดงานทีละขั้น');
});
test('progress uses only catalog lessons and clamps positions, without treating the end position as completion',()=>{
  const p=progressForLearner(COURSE,[{lesson_id:'one',position_seconds:900,max_position_seconds:900,completed:false,updated_at:DATE},{lesson_id:'two',position_seconds:-1,completed:'true',updated_at:'bad-date'},{lesson_id:'removed',completed:true}]);
  assert.equal(p.positionSeconds,30);assert.equal(p.completedLessons,0);assert.equal(p.totalLessons,2);assert.equal(p.lastActivityAt,DATE);assert.equal(p.lessons[1].positionSeconds,0);
  assert.equal(p.lessons[0].hasVideo,true);assert.equal(p.lessons[0].durationSeconds,30);assert.equal(p.lessons[0].groupId,'intro');assert.equal(p.lessons[0].groupLabel,'บทนำ');assert.equal(p.lessons[0].groupTitle,'เริ่มลงมือ');
});
test('non-video toolkit completion is retained without inventing a video position or duration',()=>{
  const p=progressForLearner({...COURSE,lessons:[{id:'TOOLKIT',title:'Tools',type:'toolkit'}]},[{lesson_id:'TOOLKIT',completed:true,position_seconds:70,max_position_seconds:100,updated_at:DATE}]);
  assert.equal(p.completedLessons,1);assert.equal(p.lessons[0].hasVideo,false);assert.equal(p.lessons[0].durationSeconds,null);assert.equal(p.lessons[0].positionSeconds,0);assert.equal(p.lessons[0].maxPositionSeconds,0);
});
test('download labels use course-scoped catalog titles and lesson context, preserving separate file IDs',()=>{
  const assets=[{id:'first',courseId:'other-course',kind:'resource',title:'Other private course',lessonIds:['one']},
    {id:'first',courseId:COURSE.id,kind:'resource',title:'Source template',lessonIds:['one']},
    {id:'second',courseId:COURSE.id,kind:'resource',title:'Updated template',lessonIds:['two'],entitlement:'companion'}];
  const first=downloadForLearner(COURSE,{file_id:'first',filename:'SOURCE.md',requests:2,last_requested_at:DATE},assets);
  const second=downloadForLearner(COURSE,{file_id:'second',filename:'SOURCE.md',requests:1},assets);
  assert.equal(first.title,'Source template');assert.equal(first.context,'บทนำ · One');assert.deepEqual(first.lessonIds,['one']);assert.equal(first.group,'ไฟล์ฝึกตามบท');
  assert.equal(second.title,'Updated template');assert.equal(second.context,'บทนำ · Two');assert.equal(second.group,'คู่มือและ AI ผู้ช่วยงาน');assert.notEqual(first.fileId,second.fileId);
  const unknown=downloadForLearner(COURSE,{file_id:'unknown-old-version',filename:'LEGACY.md',last_requested_at:'bad'});
  assert.equal(unknown.title,'LEGACY.md');assert.deepEqual(unknown.lessonIds,[]);assert.equal(unknown.lastRequestedAt,null);
  const other=downloadForLearner({...COURSE,id:'other-course'},{file_id:'toolkit:guide',filename:'OTHER.md'});
  assert.equal(other.title,'OTHER.md');assert.equal(other.context,'');
});
test('database failures expose no infrastructure details',async()=>{
  const r=await harness({fail:true}).call();assert.equal(r.statusCode,503);assert.doesNotMatch(JSON.stringify(r.body),/private-secret|postgres/);
});
test('all stats SQL scopes course/account, attributes the first checkout, and fetches no slip or authentication material',async()=>{
  const calls=[],store=createLearnAdminStore({query:async(q,a)=>{calls.push({q,a});return [];}});
  await store.counts('ai-sauce',new Date(DATE));await store.learners('ai-sauce',new Date(DATE),51,'cursor-user');await store.progress('ai-sauce',['paid-user']);await store.campaigns('ai-sauce',new Date(DATE));await store.learner('ai-sauce',new Date(DATE),'paid-user');
  for(const {q,a}of calls){assert.equal(a[0],'ai-sauce');assert.match(q,/course_id=\$1/);assert.doesNotMatch(q,/receipt_bytes|password_hash|token_hash|INSERT|UPDATE|DELETE/);}
  assert.match(calls[1].q,/\(has_grant OR verified\)/);assert.match(calls[1].q,/user_id<\$3/);assert.deepEqual(calls[2].a,['ai-sauce',['paid-user']]);
  assert.match(calls[3].q,/event='checkout_started' ORDER BY occurred_at,id LIMIT 1/);assert.match(calls[0].q,/COUNT\(\*\) AS enrolled/);assert.match(calls[0].q,/WHEN active THEN 'active'/);
  assert.match(calls[4].q,/\(has_grant OR verified\) AND user_id=\$3 LIMIT 1/);assert.deepEqual(calls[4].a,['ai-sauce',new Date(DATE),'paid-user']);
});
test('admin stats and legacy binding UI use existing authenticated fetch and clear private views on logout',async()=>{
  const script=await readFile(new URL('../../ai-source/admin/admin.js',import.meta.url),'utf8'),html=await readFile(new URL('../../ai-source/admin/index.html',import.meta.url),'utf8');
  new vm.Script(script);assert.doesNotMatch(script,/innerHTML|insertAdjacentHTML|document\.write/);assert.match(script,/x-admin-key/);assert.match(script,/\/api\/learn-admin/);assert.match(script,/state\.stats=null/);assert.match(script,/epoch!==state\.epoch/);
  assert.match(script,/row\.legacyBindingEligible===true/);assert.match(script,/action:'bind_account'/);assert.match(script,/note\.input\.required=true/);assert.match(script,/ไม่เปิดสิทธิ์เรียน/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const id of ['stats-counts','stats-learners','stats-campaigns','stats-refresh','stats-more','stats-progress-note','stats-campaign-note'])assert.ok(ids.includes(id));assert.match(html,/noindex,nofollow,noarchive/);assert.doesNotMatch(html,/Skool/);
});
