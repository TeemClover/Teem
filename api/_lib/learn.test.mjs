import test from 'node:test';
import assert from 'node:assert/strict';
import { createLearnHandler } from './learn-handler.js';
import { authorizeLearnAsset, enrollLearnCourse } from './learn-authorization.js';
import { courseAccess, oneYearAfter } from './learn-domain.js';
import { LEARN_COURSES, LEARN_ASSETS } from './learn-catalog.js';
import { createLearnStore, ensureLearnSchema, grantForVerifiedRegistration, recordLearnRegistration, revokeLearnAccess, LEARN_SCHEMA } from './learn-store.js';

const NOW=Date.parse('2026-09-14T10:00:00Z');
const courses=[{id:'ai-sauce',title:'AI ใส่ซอส',description:'เรียนจาก Source',startLessonId:'FOUNDATION',previewLessonId:'EP01',lessons:[
  {id:'EP01',title:'Preview',preview:true,durationSeconds:75,mediaId:'v_intro',captionId:'c_intro',resourceIds:['r_paid']},
  {id:'FOUNDATION',title:'Paid',preview:false,durationSeconds:234,mediaId:'v_paid',captionId:'c_paid',additionalResourceIds:['r_zip']},
]},{id:'another-course',title:'Another',lessons:[{id:'EP01',title:'Other paid',preview:false,durationSeconds:60,mediaId:'v_other'}]}];
const assets=[
  {id:'v_intro',courseId:'ai-sauce',lessonIds:['EP01'],kind:'video',contentType:'video/mp4',previewAllowed:true},
  {id:'c_intro',courseId:'ai-sauce',lessonIds:['EP01'],kind:'captions',contentType:'application/x-subrip',previewAllowed:true},
  {id:'r_paid',courseId:'ai-sauce',lessonIds:['EP01'],kind:'resource',contentType:'text/markdown',previewAllowed:false},
  {id:'v_paid',courseId:'ai-sauce',lessonIds:['FOUNDATION'],kind:'video',contentType:'video/mp4'},
  {id:'c_paid',courseId:'ai-sauce',lessonIds:['FOUNDATION'],kind:'captions',contentType:'application/x-subrip'},
  {id:'r_zip',courseId:'ai-sauce',lessonIds:['FOUNDATION'],kind:'resource',contentType:'application/zip'},
  {id:'v_other',courseId:'another-course',lessonIds:['EP01'],kind:'video',contentType:'video/mp4'},
];
const user={id:'alice',displayName:'Alice',email:'alice@example.test',emailVerified:true};
const grant=(extra={})=>({reference:'SAUCE-verified',user_id:'alice',course_id:'ai-sauce',starts_at:'2026-09-01T00:00:00Z',expires_at:'2027-09-01T00:00:00Z',revoked_at:null,...extra});
function harness() {
  const enrolled=new Map(),grants=[],registrations=[],instructors=[],readings=new Map(),progress=new Map(),events=[];
  const key=(u,c)=>`${u}/${c}`;
  const accounts=new Map([['alice',{id:'alice',email_verified_at:'2026-09-01'}],['bob',{id:'bob',email_verified_at:'2026-09-01'}]]);
  const store={
    async ensure(){events.push('ensure');},
    async account(id){return accounts.get(id);},
    async enroll(id,c,now){const k=key(id,c);if(!enrolled.has(k))enrolled.set(k,{user_id:id,course_id:c,registered_at:now});return enrolled.get(k);},
    async enrollment(id,c){events.push(['enrollment',id,c]);return enrolled.get(key(id,c))||null;},
    async enrollments(id){return [...enrolled.values()].filter(e=>e.user_id===id);},
    async grants(id,c){return grants.filter(g=>g.user_id===id&&(!c||g.course_id===c));},
    async instructors(id,c){return instructors.filter(g=>g.user_id===id&&(!c||g.course_id===c));},
    async reading(c,l){events.push(['reading',c,l]);return readings.get(`${c}/${l}`) || '';},
    async registrations(id,c){return registrations.filter(r=>r.user_id===id&&(!c||r.course_id===c));},
    async progress(id,c){return [...progress.values()].filter(p=>p.user_id===id&&p.course_id===c);},
    async saveProgress(id,c,l,p,now){const k=`${key(id,c)}/${l}`,old=progress.get(k);const row={user_id:id,course_id:c,lesson_id:l,position_seconds:p.positionSeconds,max_position_seconds:Math.max(p.positionSeconds,old?.max_position_seconds||0),completed:p.completed||old?.completed||false,version:(old?.version||0)+1,updated_at:now};progress.set(k,row);return row;},
  };
  const lookupUser=async req=>req.testUser===undefined?user:req.testUser;
  const options={store,lookupUser,courses,assets,now:NOW};
  const handler=createLearnHandler({getSql:()=>({}),storeFactory:()=>store,lookupUser,courses,assets,now:()=>NOW});
  async function call(method='GET',action='courses',body,extra={}) {
    const query={action,...extra.query};const req={method,url:'/api/learn?'+new URLSearchParams(query),query,body,
      headers:{host:'www.myclover.com',origin:'https://www.myclover.com','content-type':'application/json',...extra.headers},testUser:extra.testUser};
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=JSON.parse(value);}};
    await handler(req,res);return res;
  }
  function seed(id='alice',c='ai-sauce'){enrolled.set(key(id,c),{user_id:id,course_id:c,registered_at:'2026-09-10T00:00:00Z'});}
  return {call,store,options,accounts,enrolled,grants,registrations,instructors,readings,progress,events,seed};
}

test('guest cannot see a catalog or enroll',async()=>{
  const h=harness();for(const [method,action,body] of [['GET','courses'],['POST','enroll',{courseId:'ai-sauce'}]]) {
    const r=await h.call(method,action,body,{testUser:null});assert.equal(r.statusCode,401);assert.equal(r.body.code,'AUTH_REQUIRED');
  }assert.equal(h.enrolled.size,0);assert.equal(h.events.length,0);
});
test('verified account alone never upgrades an old/password session',async()=>{
  const h=harness();const r=await h.call('GET','courses',undefined,{testUser:{...user,emailVerified:false}});
  assert.equal(r.statusCode,403);assert.equal(r.body.code,'EMAIL_VERIFICATION_REQUIRED');assert.equal(h.events.length,0);
});
test('verified session alone does not bypass account verification',async()=>{
  const h=harness();h.accounts.set('alice',{id:'alice',email_verified_at:null});
  const r=await h.call('POST','enroll',{courseId:'ai-sauce'});assert.equal(r.statusCode,403);assert.equal(h.enrolled.size,0);
});
test('empty enrollment has no catalog browsing or other users courses',async()=>{
  const h=harness();h.seed('bob');h.grants.push(grant({user_id:'bob'}));
  assert.deepEqual((await h.call()).body.courses,[]);
  assert.equal((await h.call('GET','course',undefined,{query:{courseId:'ai-sauce'}})).statusCode,403);
});
test('enrolling is idempotent and grants only the configured introductory video',async()=>{
  const h=harness();const a=await h.call('POST','enroll',{courseId:'ai-sauce'}),b=await h.call('POST','enroll',{courseId:'ai-sauce'});
  assert.equal(a.statusCode,200);assert.equal(a.body.access.status,'registered');assert.equal(h.enrolled.size,1);
  assert.equal(a.body.access.registeredAt,b.body.access.registeredAt);assert.equal(h.grants.length,0);
  const items=(await h.call()).body.courses;assert.equal(items.length,1);assert.equal(items[0].status,'registered');
});
test('enrollment rejects unknown courses and forged account or paid fields',async()=>{
  const h=harness();assert.equal((await h.call('POST','enroll',{courseId:'missing'})).statusCode,404);
  for(const extra of [{userId:'bob'},{status:'active'},{expiresAt:'2099'}])assert.equal((await h.call('POST','enroll',{courseId:'ai-sauce',...extra})).statusCode,400);
});
test('course metadata exposes locked states without paid media or resource identifiers',async()=>{
  const h=harness();h.seed();const r=await h.call('GET','course',undefined,{query:{course:'ai-sauce'}});
  assert.equal(r.statusCode,200);assert.equal(r.body.course.startLessonId,'EP01');
  assert.equal(r.body.course.lessons[0].locked,false);assert.equal(r.body.course.lessons[1].locked,true);
  assert.doesNotMatch(JSON.stringify(r.body),/v_paid|r_paid|c_paid|r_zip|privatePath|blob/);
});
test('registered preview returns guarded media/caption routes but no worksheet',async()=>{
  const h=harness();h.seed();const r=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'}});
  assert.equal(r.statusCode,200);assert.equal(r.body.preview,true);assert.equal(r.body.lesson.resourcesLocked,true);
  assert.deepEqual(r.body.lesson.resources,[]);assert.match(r.body.lesson.media.url,/^\/api\/learn-media\?/);
  assert.equal(r.body.lesson.media.captions.length,1);assert.doesNotMatch(JSON.stringify(r.body),/r_paid|https:\/\//);
});
test('real catalog caption kind authorizes only the configured preview caption',async()=>{
  const h=harness();h.seed();
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),lesson=course.lessons.find(l=>l.id==='EP01');
  const options={...h.options,courses:LEARN_COURSES,assets:LEARN_ASSETS};
  const result=await authorizeLearnAsset({}, {}, {courseId:course.id,lessonId:lesson.id,assetId:lesson.captionId},options);
  assert.equal(result.asset.kind,'captions');assert.equal(result.preview,true);
  const other=course.lessons.find(l=>l.id!=='EP01' && l.captionId);
  await assert.rejects(authorizeLearnAsset({}, {}, {courseId:course.id,lessonId:lesson.id,assetId:other.captionId},options),e=>e.code==='ASSET_NOT_FOUND');
});
test('preview flag in a request cannot open a paid lesson',async()=>{
  const h=harness();h.seed();const r=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION',preview:'true'}});
  assert.equal(r.statusCode,403);assert.equal(r.body.code,'COURSE_ACCESS_REQUIRED');assert.equal(r.body.lesson,undefined);
});
test('pending payment and verified-but-ungranted payment remain locked',async()=>{
  for(const status of ['pending_verification','payment_verified']){
    const h=harness();h.seed();h.registrations.push({reference:'r',user_id:'alice',course_id:'ai-sauce',status,created_at:new Date(NOW)});
    assert.equal((await h.call()).body.courses[0].status,'pending');
    assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).statusCode,403);
  }
});
test('active entitlement opens paid media and exercises, scoped to that course only',async()=>{
  const h=harness();h.seed();h.grants.push(grant());
  const r=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}});
  assert.equal(r.statusCode,200);assert.equal(r.body.preview,false);assert.equal(r.body.lesson.resources[0].id,'r_zip');assert.equal(r.body.lesson.resources[0].optional,true);
  h.seed('alice','another-course');assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'another-course',lessonId:'EP01'}})).statusCode,403);
});
const instructor=(extra={})=>({user_id:'alice',course_id:'ai-sauce',granted_at:'2026-09-01T00:00:00Z',revoked_at:null,...extra});
test('a trusted instructor can read course lessons, media and resources without a purchased grant',async()=>{
  const h=harness();h.seed();h.instructors.push(instructor());
  const r=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}});
  assert.equal(r.statusCode,200);assert.equal(r.body.access.role,'instructor');assert.equal(r.body.access.active,true);
  assert.equal(r.body.access.expiresAt,null);assert.equal(r.body.access.paymentStatus,null);assert.equal(r.body.preview,false);
  assert.equal(r.body.lesson.resources[0].id,'r_zip');
  for(const assetId of ['v_paid','c_paid','r_zip']) {
    const media=await authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId},h.options);
    assert.equal(media.access.role,'instructor');assert.equal(media.preview,false);
  }
  assert.equal(h.grants.length,0);assert.equal(h.registrations.length,0);
  assert.equal((await h.call()).body.courses[0].access.role,'instructor');
});
test('instructor access remains scoped to its own enrolled account and course',async()=>{
  const h=harness();h.seed();h.seed('bob');h.seed('alice','another-course');h.instructors.push(instructor());
  const otherAccount=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'},testUser:{...user,id:'bob'}});
  const otherCourse=await h.call('GET','lesson',undefined,{query:{courseId:'another-course',lessonId:'EP01'}});
  assert.equal(otherAccount.statusCode,403);assert.equal(otherCourse.statusCode,403);
  h.enrolled.delete('alice/ai-sauce');
  assert.equal((await h.call()).body.courses.length,1);
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).body.code,'COURSE_ENROLLMENT_REQUIRED');
  const own={user_id:'alice',course_id:'ai-sauce',registered_at:new Date(NOW)};
  assert.equal(courseAccess(own,[],[],NOW,[instructor({user_id:'bob'})]).active,false);
  assert.equal(courseAccess(own,[],[],NOW,[instructor({course_id:'another-course'})]).active,false);
});
test('instructor role never bypasses verified session and account checks',async()=>{
  const h=harness();h.seed();h.instructors.push(instructor());
  assert.equal((await h.call('GET','course',undefined,{query:{courseId:'ai-sauce'},testUser:{...user,emailVerified:false}})).body.code,'EMAIL_VERIFICATION_REQUIRED');
  h.accounts.set('alice',{id:'alice',email_verified_at:null});
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).body.code,'EMAIL_VERIFICATION_REQUIRED');
});
test('future or revoked instructor role cannot open paid content, and revocation applies on the next media request',async()=>{
  const h=harness();h.seed();const row=instructor();h.instructors.push(row);
  await authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'v_paid'},h.options);
  row.revoked_at=new Date(NOW);
  await assert.rejects(authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'v_paid'},h.options),e=>e.code==='COURSE_ACCESS_REQUIRED');
  row.revoked_at=null;row.granted_at=new Date(NOW+1);
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).statusCode,403);
  row.granted_at='invalid';assert.equal((await h.call()).body.courses[0].status,'registered');
});
test('a learner cannot assign instructor access in request bodies or queries',async()=>{
  const h=harness();h.seed();
  for(const fields of [{role:'instructor'},{instructor:true}]) {
    assert.equal((await h.call('POST','enroll',{courseId:'ai-sauce',...fields})).statusCode,400);
    assert.equal((await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:1,...fields})).statusCode,400);
  }
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION',role:'instructor'}})).statusCode,403);
  assert.equal((await h.call('POST','instructor',{courseId:'ai-sauce'})).statusCode,400);assert.equal(h.instructors.length,0);
});
test('paid lesson reading is looked up only after access succeeds and never appears in course metadata',async()=>{
  const h=harness();h.seed();h.readings.set('ai-sauce/FOUNDATION','# PRIVATE_READING\nPractice this task.');
  const denied=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}});
  assert.equal(denied.statusCode,403);assert.equal(h.events.some(e=>e[0]==='reading'),false);
  h.instructors.push(instructor());
  const allowed=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}});
  assert.equal(allowed.body.lesson.reading,h.readings.get('ai-sauce/FOUNDATION'));assert.equal(allowed.body.lesson.readingAvailable,true);
  for(const action of ['course','courses']) {
    const result=await h.call('GET',action,undefined,{query:{courseId:'ai-sauce'}});
    assert.doesNotMatch(JSON.stringify(result.body),/PRIVATE_READING|Practice this task/);
  }
  h.instructors[0].revoked_at=new Date(NOW);h.grants.push(grant());
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).body.lesson.readingAvailable,true);
});
test('preview reading follows preview access, with an explicit empty state for missing private content',async()=>{
  const h=harness();h.seed();
  let result=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'}});
  assert.equal(result.body.lesson.reading,'');assert.equal(result.body.lesson.readingAvailable,false);
  h.readings.set('ai-sauce/EP01','## INTRO_ONLY');
  result=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'}});
  assert.equal(result.body.lesson.reading,'## INTRO_ONLY');assert.equal(result.body.lesson.readingAvailable,true);
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'},testUser:null})).statusCode,401);
});
test('private instructor and reading schema preserve enrollment scope and bounded server-only content',async()=>{
  const roleDDL=LEARN_SCHEMA.find(s=>s.includes('CREATE TABLE IF NOT EXISTS mc_learn_instructors'));
  assert.match(roleDDL,/FOREIGN KEY\(user_id,course_id\) REFERENCES mc_learn_enrollments/);
  assert.match(roleDDL,/PRIMARY KEY\(user_id,course_id\)/);assert.doesNotMatch(roleDDL,/INSERT INTO|mc_learn_grants/);
  const readingDDL=LEARN_SCHEMA.find(s=>s.includes('CREATE TABLE IF NOT EXISTS mc_learn_readings'));
  assert.match(readingDDL,/octet_length\(body_markdown\)<=200000/);
  const calls=[];const sql={query:async(text,args)=>{calls.push({text,args});return text.includes('body_markdown')?[{body_markdown:'# Text'}]:[];}};
  const store=createLearnStore(sql);await store.instructors('alice','ai-sauce');assert.equal(await store.reading('ai-sauce','FOUNDATION'),'# Text');
  assert.deepEqual(calls[0].args,['alice','ai-sauce']);assert.match(calls[0].text,/WHERE user_id=\$1/);
  assert.deepEqual(calls[1].args,['ai-sauce','FOUNDATION']);assert.match(calls[1].text,/WHERE course_id=\$1 AND lesson_id=\$2/);
});
for(const [label,change] of [['expired',{expires_at:new Date(NOW)}],['revoked',{revoked_at:new Date(NOW-1)}],['future',{starts_at:new Date(NOW+1)}]]) {
  test(`${label} grant cannot open paid lessons or write their progress`,async()=>{
    const h=harness();h.seed();h.grants.push(grant(change));
    assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).statusCode,403);
    assert.equal((await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'FOUNDATION',positionSeconds:10})).statusCode,403);
    assert.equal(h.progress.size,0);
  });
}
test('one revoked old grant does not erase a separately purchased active grant',()=>{
  assert.equal(courseAccess({registered_at:'2026-01-01'},[grant({revoked_at:'2026-09-02'}),grant({reference:'new'})],[],NOW).active,true);
});
test('asset authorization checks catalog course and lesson association on every request',async()=>{
  const h=harness();h.seed();h.grants.push(grant());
  const got=await authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'v_paid'},h.options);assert.equal(got.assetId,'v_paid');
  for(const assetId of ['v_other','v_intro','r_paid','missing'])await assert.rejects(authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId},h.options),e=>e.status===404);
});
test('preview media and captions work, paid preview-associated worksheets and ZIP do not',async()=>{
  const h=harness();h.seed();
  for(const assetId of ['v_intro','c_intro'])assert.equal((await authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'EP01',assetId},h.options)).preview,true);
  await assert.rejects(authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'EP01',assetId:'r_paid'},h.options),e=>e.code==='COURSE_ACCESS_REQUIRED');
  const blockedAssets=assets.map(a=>a.id==='c_intro'?{...a,previewAllowed:false}:a);
  await assert.rejects(authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'EP01',assetId:'c_intro'},{...h.options,assets:blockedAssets}),e=>e.status===403);
});
test('revocation takes effect on the next media request without a cached entitlement',async()=>{
  const h=harness();h.seed();const g=grant();h.grants.push(g);
  await authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'v_paid'},h.options);
  g.revoked_at=new Date(NOW);await assert.rejects(authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'v_paid'},h.options),e=>e.status===403);
});
test('progress is scoped by the session account and course, including duplicate lesson IDs',async()=>{
  const h=harness();h.seed();h.seed('bob');h.seed('alice','another-course');h.grants.push(grant());
  const r=await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:40,completed:true});assert.equal(r.statusCode,200);assert.equal(r.body.progress.lessons.EP01.positionSeconds,40);
  assert.deepEqual((await h.call('GET','progress',undefined,{query:{courseId:'ai-sauce'},testUser:{...user,id:'bob'}})).body.progress.lessons,{});
  assert.deepEqual((await h.call('GET','progress',undefined,{query:{courseId:'another-course'}})).body.progress.lessons,{});
});
test('invalid progress cannot write entitlement fields or another account',async()=>{
  const h=harness();h.seed();const base={courseId:'ai-sauce',lessonId:'EP01',positionSeconds:1};
  for(const change of [{userId:'bob'},{accountId:'bob'},{status:'active'},{positionSeconds:-1},{positionSeconds:'1'},{positionSeconds:Infinity},{positionSeconds:90000},{completed:'true'}])assert.equal((await h.call('PUT','progress',{...base,...change})).statusCode,400);
  assert.equal(h.progress.size,0);
});
test('positions clamp to known duration, and completing a preview does not grant access',async()=>{
  const h=harness();h.seed();const r=await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:100,completed:true});
  assert.equal(r.body.progress.lessons.EP01.positionSeconds,75);assert.equal(h.grants.length,0);
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}})).statusCode,403);
});
test('all writes require same-origin JSON; no public grant action exists',async()=>{
  const h=harness();for(const headers of [{origin:'https://evil.example'},{origin:undefined},{'sec-fetch-site':'cross-site'}])assert.equal((await h.call('POST','enroll',{courseId:'ai-sauce'},{headers})).statusCode,403);
  assert.equal((await h.call('POST','enroll',{courseId:'ai-sauce'},{headers:{'content-type':'text/plain'}})).statusCode,415);
  assert.equal((await h.call('POST','grant',{reference:'r'})).statusCode,400);assert.equal(h.enrolled.size,0);
});
test('body bounds, repeated query keys, and traversal IDs fail closed',async()=>{
  const h=harness();h.seed();assert.equal((await h.call('POST','enroll','x'.repeat(9000))).statusCode,413);
  assert.equal((await h.call('GET','course',undefined,{query:{courseId:'../ai-sauce'}})).statusCode,400);
  assert.equal((await h.call('GET','course',undefined,{query:{courseId:'ai-sauce',course:'another-course'}})).statusCode,400);
});
test('responses forbid browser and CDN caches; infrastructure errors hide details',async()=>{
  const h=harness();let r=await h.call();assert.match(r.headers['Cache-Control'],/no-store/);assert.match(r.headers['Vary'],/Cookie/);
  h.store.enrollments=async()=>{throw new Error('postgres secret connection string');};r=await h.call();assert.equal(r.statusCode,503);assert.doesNotMatch(JSON.stringify(r.body),/postgres|secret/);
});
test('enroll helper requires session proof before any enrollment mutation',async()=>{
  const h=harness();await assert.rejects(enrollLearnCourse({}, {testUser:{...user,emailVerified:false}},{courseId:'ai-sauce'},h.options),e=>e.code==='EMAIL_VERIFICATION_REQUIRED');assert.equal(h.enrolled.size,0);
});
test('one-year access means a calendar year and clamps a leap day',()=>{
  assert.equal(oneYearAfter('2024-02-29T12:34:56Z'),'2025-02-28T12:34:56.000Z');
  assert.equal(oneYearAfter('2026-09-14T12:34:56Z'),'2027-09-14T12:34:56.000Z');
});

function sqlFixture({payment,grantResult,failGrant=false}={}) {
  const calls=[];
  const sql={async query(text,args=[]){calls.push({text,args});
    if(/^CREATE/.test(text))return [];
    if(text.startsWith('SELECT r.reference'))return payment?[payment]:[];
    if(text.startsWith('WITH eligible') && text.includes('enrollment AS'))return payment?.account_id ? [{reference:payment.reference,user_id:payment.account_id,course_id:'ai-sauce'}] : [];
    if(text.startsWith('WITH eligible') && text.includes('granted AS'))return failGrant?[]:[grantResult];
    return [];
  }};return {sql,calls};
}
const payment={reference:'SAUCE-paid',account_id:'alice',status:'payment_verified',verified_at:'2026-09-14',verified_amount_satang:99000,verified_transferred_at:'2026-09-14',email_verified_at:'2026-09-01'};
test('pending receipt, missing verification evidence and unbound account never reach a grant write',async()=>{
  for(const change of [{status:'pending_verification'},{verified_at:null},{verified_amount_satang:0},{verified_transferred_at:null},{account_id:null},{email_verified_at:null}]) {
    const f=sqlFixture({payment:{...payment,...change}});await assert.rejects(grantForVerifiedRegistration(f.sql,{reference:payment.reference,actorId:'admin'}));
    assert.equal(f.calls.some(c=>c.text.includes('INSERT INTO mc_learn_grants')),false);
  }
});
test('grant uses a locked payment proof, atomic admitted update, and server-only account binding',async()=>{
  const original=grant({reference:payment.reference});const f=sqlFixture({payment,grantResult:original});
  const result=await grantForVerifiedRegistration(f.sql,{reference:payment.reference,actorId:'admin',now:new Date(NOW),note:'manual payment verified'});
  assert.deepEqual(result,original);const statement=f.calls.find(c=>c.text.includes('INSERT INTO mc_learn_grants'));
  assert.match(statement.text,/FOR UPDATE OF r/);assert.match(statement.text,/UPDATE mc_ai_source_registrations r SET status='admitted'/);
  assert.match(statement.text,/mc_learn_grants.revoked_at IS NULL/);assert.match(statement.text,/a.email_verified_at IS NOT NULL/);
  assert.equal(statement.args[2],'2027-09-14T10:00:00.000Z');
  assert.doesNotMatch(statement.text,/starts_at=EXCLUDED|expires_at=EXCLUDED|revoked_at=NULL/);
});
test('a later retry returns the original expiry, and a revoked grant cannot be regranted',async()=>{
  const original=grant({reference:payment.reference});const f=sqlFixture({payment:{...payment,status:'admitted'},grantResult:original});
  assert.equal((await grantForVerifiedRegistration(f.sql,{reference:payment.reference,actorId:'admin',now:new Date('2028-01-01')})).expires_at,original.expires_at);
  const revoked=sqlFixture({payment,failGrant:true});await assert.rejects(grantForVerifiedRegistration(revoked.sql,{reference:payment.reference,actorId:'admin'}),e=>e.code==='GRANT_REVOKED_OR_CONFLICT');
});
test('registration linking requires the stored account ID, never an email match',async()=>{
  const f=sqlFixture();await assert.rejects(recordLearnRegistration(f.sql,{reference:'r',courseId:'ai-sauce',userId:'mallory'}),e=>e.code==='REGISTRATION_ACCOUNT_MISMATCH');
  const q=f.calls.find(c=>c.text.includes('enrollment AS'));assert.match(q.text,/r.account_id=\$2/);assert.equal(q.args[1],'mallory');assert.doesNotMatch(q.text,/a.email=|r.email=/);
});
test('progress SQL merges completed/max atomically and every read scopes account+course',async()=>{
  const calls=[];const sql={query:async(text,args)=>{calls.push({text,args});return [{}];}};const store=createLearnStore(sql);
  await store.saveProgress('alice','ai-sauce','EP01',{positionSeconds:10,completed:false},new Date(NOW));await store.progress('alice','ai-sauce');
  assert.match(calls[0].text,/completed=mc_learn_progress.completed OR EXCLUDED.completed/);assert.match(calls[0].text,/version=mc_learn_progress.version\+1/);
  assert.match(calls[0].text,/GREATEST/);assert.deepEqual(calls[0].args.slice(0,3),['alice','ai-sauce','EP01']);
  assert.match(calls[1].text,/WHERE user_id=\$1 AND course_id=\$2/);assert.deepEqual(calls[1].args,['alice','ai-sauce']);
});
test('schema failure retries, and additive schema does not modify account/auth tables',async()=>{
  let fail=true;const calls=[];const sql={query:async text=>{calls.push(text);if(fail){fail=false;throw new Error('retry');}return [];}};
  await assert.rejects(ensureLearnSchema(sql));await ensureLearnSchema(sql);assert.ok(calls.length>3);assert.equal(calls.some(t=>/ALTER TABLE|DROP TABLE|CREATE TABLE IF NOT EXISTS mc_accounts/.test(t)),false);
});
test('revocation preserves the original revocation record and has no public API action',async()=>{
  const calls=[];const sql={query:async(text,args)=>{calls.push({text,args});return [];}};
  await revokeLearnAccess(sql,{reference:'r',actorId:'admin',reason:'refund'});const q=calls.find(c=>c.text.startsWith('UPDATE'));
  assert.match(q.text,/revoked_at=COALESCE/);assert.equal(q.args[0],'r');assert.equal(q.args[3],'refund');
});


test('home entry exposes only own enrollment boolean even before email step-up',async()=>{
  const h=harness();h.seed('bob');
  assert.deepEqual((await h.call('GET','entry')).body,{ok:true,hasEnrollment:false});
  h.seed('alice');
  const r=await h.call('GET','entry',undefined,{testUser:{...user,emailVerified:false}});
  assert.equal(r.statusCode,200);assert.deepEqual(r.body,{ok:true,hasEnrollment:true});
  assert.equal((await h.call('GET','courses',undefined,{testUser:{...user,emailVerified:false}})).statusCode,403);
  assert.equal((await h.call('GET','entry',undefined,{testUser:null})).statusCode,401);
});
