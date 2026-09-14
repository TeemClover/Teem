import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createLearnAdminHandler, createLearnAdminStore, progressForLearner } from './learn-admin-handler.js';

const COURSE={id:'ai-sauce',title:'AI Sauce',lessons:[{id:'one',title:'One',durationSeconds:30},{id:'two',title:'Two',durationSeconds:60}]};
const DATE='2026-09-15T06:00:00.000Z';
function harness({key='owner-test',fail=false}={}){
  const calls=[];
  const store={ensure:async()=>{calls.push('ensure');if(fail)throw Error('postgres://private-secret');},
    counts:async(...args)=>{calls.push(['counts',...args]);return {enrolled:'7',pending:'1',active:'2',expired:'1',revoked:'1',verified_awaiting_grant:'1'};},
    learners:async(...args)=>{calls.push(['learners',...args]);return [{user_id:'z',display_name:'Student <script>',email:'z@example.com',access_status:'active',expires_at:'2027-09-15T00:00:00Z'},{user_id:'y',email:'y@example.com',access_status:'expired'}];},
    progress:async(...args)=>{calls.push(['progress',...args]);return [{user_id:'z',lesson_id:'one',position_seconds:12,max_position_seconds:30,completed:false,updated_at:DATE},{user_id:'other',lesson_id:'one',completed:true},{user_id:'z',lesson_id:'unknown',completed:true}];},
    campaigns:async()=>[{source:'facebook',medium:'paid',campaign:'<script>',enrolled:'3',pending:'1',active:'1'}]};
  const handler=createLearnAdminHandler({getSql:()=>{calls.push('database');return {};},config:key?{MEET_ADMIN_KEY:key}:{},storeFactory:()=>store,courseLookup:id=>id==='ai-sauce'?COURSE:null,now:()=>new Date(DATE)});
  async function call({url='/api/learn-admin?courseId=ai-sauce',method='GET',headers={'x-admin-key':'owner-test'}}={}){const r={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=JSON.parse(v);}};await handler({url,method,headers},r);return r;}
  return {call,calls};
}
test('admin statistics require the existing header key before reading any database or private fields',async()=>{
  for(const input of [{headers:{}},{headers:{cookie:'mc_session=student'}},{headers:{'x-admin-key':'wrong'}},{url:'/api/learn-admin?adminKey=owner-test',headers:{}}]){const h=harness(),r=await h.call(input);assert.equal(r.statusCode,401);assert.deepEqual(h.calls,[]);assert.equal(r.body.learners,undefined);assert.match(r.headers['cache-control'],/private, no-store/);}
  const h=harness({key:''});assert.equal((await h.call()).statusCode,503);assert.deepEqual(h.calls,[]);
});
test('the stats endpoint has no mutations and validates course, duplicate keys and pagination',async()=>{
  for(const input of [{method:'POST'},{method:'PATCH'},{url:'/api/learn-admin?courseId=missing'},{url:'/api/learn-admin?limit=101'},{url:'/api/learn-admin?limit=0'},{url:'/api/learn-admin?before=../secret'},{url:'/api/learn-admin?courseId=ai-sauce&courseId=other'}]){const h=harness(),r=await h.call(input);assert.ok([400,404,405].includes(r.statusCode));assert.deepEqual(h.calls,[]);}
});
test('paid learner pagination never uses a cursor to page the course totals or leak another learner progress',async()=>{
  const h=harness(),r=await h.call({url:'/api/learn-admin?courseId=ai-sauce&limit=1&before=zz'});assert.equal(r.statusCode,200);assert.equal(r.body.counts.enrolled,7);assert.equal(r.body.learners.length,1);assert.equal(r.body.nextCursor,'z');
  assert.deepEqual(h.calls.find(x=>x[0]==='progress').slice(1),['ai-sauce',['z']]);assert.equal(r.body.learners[0].completedLessons,0);assert.equal(r.body.learners[0].lessons.length,2);assert.equal(r.body.learners[0].positionSeconds,12);assert.match(r.body.progressNote,/ไม่ยืนยัน/);assert.match(r.body.campaignNote,/ครั้งแรก/);
  assert.equal(r.body.campaigns[0].enrolled,3);assert.doesNotMatch(JSON.stringify(r.body),/receipt_bytes|password|token_hash/);assert.match(r.headers['vercel-cdn-cache-control'],/no-store/);
});
test('progress uses only catalog lessons and clamps positions, without treating the end position as completion',()=>{
  const p=progressForLearner(COURSE,[{lesson_id:'one',position_seconds:900,max_position_seconds:900,completed:false,updated_at:DATE},{lesson_id:'two',position_seconds:-1,completed:'true',updated_at:'bad-date'},{lesson_id:'removed',completed:true}]);
  assert.equal(p.positionSeconds,30);assert.equal(p.completedLessons,0);assert.equal(p.totalLessons,2);assert.equal(p.lastActivityAt,DATE);assert.equal(p.lessons[1].positionSeconds,0);
});
test('database failures expose no infrastructure details',async()=>{
  const r=await harness({fail:true}).call();assert.equal(r.statusCode,503);assert.doesNotMatch(JSON.stringify(r.body),/private-secret|postgres/);
});
test('all stats SQL scopes course/account, attributes the first checkout, and fetches no slip or authentication material',async()=>{
  const calls=[],store=createLearnAdminStore({query:async(q,a)=>{calls.push({q,a});return [];}});
  await store.counts('ai-sauce',new Date(DATE));await store.learners('ai-sauce',new Date(DATE),51,'cursor-user');await store.progress('ai-sauce',['paid-user']);await store.campaigns('ai-sauce',new Date(DATE));
  for(const {q,a}of calls){assert.equal(a[0],'ai-sauce');assert.match(q,/course_id=\$1/);assert.doesNotMatch(q,/receipt_bytes|password_hash|token_hash|INSERT|UPDATE|DELETE/);}
  assert.match(calls[1].q,/\(has_grant OR verified\)/);assert.match(calls[1].q,/user_id<\$3/);assert.deepEqual(calls[2].a,['ai-sauce',['paid-user']]);
  assert.match(calls[3].q,/event='checkout_started' ORDER BY occurred_at,id LIMIT 1/);assert.match(calls[0].q,/COUNT\(\*\) AS enrolled/);assert.match(calls[0].q,/WHEN active THEN 'active'/);
});
test('admin stats and legacy binding UI use existing authenticated fetch and clear private views on logout',async()=>{
  const script=await readFile(new URL('../../ai-source/admin/admin.js',import.meta.url),'utf8'),html=await readFile(new URL('../../ai-source/admin/index.html',import.meta.url),'utf8');
  new vm.Script(script);assert.doesNotMatch(script,/innerHTML|insertAdjacentHTML|document\.write/);assert.match(script,/x-admin-key/);assert.match(script,/\/api\/learn-admin/);assert.match(script,/state\.stats=null/);assert.match(script,/epoch!==state\.epoch/);
  assert.match(script,/row\.legacyBindingEligible===true/);assert.match(script,/action:'bind_account'/);assert.match(script,/note\.input\.required=true/);assert.match(script,/ไม่เปิดสิทธิ์เรียน/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const id of ['stats-counts','stats-learners','stats-campaigns','stats-refresh','stats-more','stats-progress-note','stats-campaign-note'])assert.ok(ids.includes(id));assert.match(html,/noindex,nofollow,noarchive/);assert.doesNotMatch(html,/Skool/);
});
