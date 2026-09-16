import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLearnHandler } from './learn-handler.js';
import { authorizeLearnAsset, enrollLearnCourse } from './learn-authorization.js';
import { courseAccess, oneYearAfter } from './learn-domain.js';
import { LEARN_COURSES, LEARN_ASSETS } from './learn-catalog.js';
import { createLearnStore, ensureLearnSchema, grantForVerifiedRegistration, recordLearnRegistration, revokeLearnAccess, LEARN_SCHEMA } from './learn-store.js';
import {companionEntitlement} from './learn-bonus.js';
import {learnMediaPathname} from './learn-media-handler.js';

const NOW=Date.parse('2026-09-14T10:00:00Z');
const courses=[{id:'ai-sauce',title:'AI ใส่ซอส',description:'เรียนจาก Source',startLessonId:'FOUNDATION',previewLessonId:null,trialUrl:'/classroom/',lessons:[
  {id:'EP01',title:'Supporting lesson',preview:false,durationSeconds:75,mediaId:'v_intro',captionId:'c_intro',resourceIds:['r_paid']},
  {id:'FOUNDATION',title:'Paid',preview:false,durationSeconds:234,mediaId:'v_paid',captionId:'c_paid',additionalResourceIds:['r_zip']},
  {id:'BOSS',title:'Finish your work',type:'boss',preview:false,completionMode:'manual',activityUrl:'/classroom/dungeon/'},
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
function harness({catalog=courses,media=assets}={}) {
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
  const options={store,lookupUser,courses:catalog,assets:media,now:NOW};
  const handler=createLearnHandler({getSql:()=>({}),storeFactory:()=>store,lookupUser,courses:catalog,assets:media,now:()=>NOW});
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
test('enrolled course list and detail serialize the course cover without granting lesson access',async()=>{
  const coverImage='/learn/assets/course-covers/ai-sauce-v5.webp';
  assert.equal(LEARN_COURSES.find(c=>c.id==='ai-sauce').coverImage,coverImage);
  const h=harness({catalog:[{...courses[0],coverImage},courses[1]]});h.seed();h.seed('alice','another-course');
  const list=await h.call();assert.equal(list.statusCode,200);assert.equal(list.body.courses[0].coverImage,coverImage);
  assert.equal(list.body.courses[1].coverImage,null);
  const detail=await h.call('GET','course',undefined,{query:{courseId:'ai-sauce'}});
  assert.equal(detail.body.course.coverImage,coverImage);assert.equal(detail.body.course.lessons.every(l=>l.locked),true);
  const guest=await h.call('GET','courses',undefined,{testUser:null});assert.equal(guest.statusCode,401);assert.doesNotMatch(JSON.stringify(guest.body),/coverImage|ai-sauce-v5/);
});
test('enrolling is idempotent and shows status without unlocking full-course lessons',async()=>{
  const h=harness();const a=await h.call('POST','enroll',{courseId:'ai-sauce'}),b=await h.call('POST','enroll',{courseId:'ai-sauce'});
  assert.equal(a.statusCode,200);assert.equal(a.body.access.status,'registered');assert.equal(h.enrolled.size,1);
  assert.equal(a.body.access.registeredAt,b.body.access.registeredAt);assert.equal(h.grants.length,0);
  assert.equal(a.body.access.canPreview,false);assert.equal(a.body.course.lessons.every(l=>l.locked),true);
  const items=(await h.call()).body.courses;assert.equal(items.length,1);assert.equal(items[0].status,'registered');
});
test('enrollment rejects unknown courses and forged account or paid fields',async()=>{
  const h=harness();assert.equal((await h.call('POST','enroll',{courseId:'missing'})).statusCode,404);
  for(const extra of [{userId:'bob'},{status:'active'},{expiresAt:'2099'}])assert.equal((await h.call('POST','enroll',{courseId:'ai-sauce',...extra})).statusCode,400);
});
test('course metadata exposes locked states without paid media or resource identifiers',async()=>{
  const h=harness();h.seed();const r=await h.call('GET','course',undefined,{query:{course:'ai-sauce'}});
  assert.equal(r.statusCode,200);assert.equal(r.body.course.startLessonId,'FOUNDATION');
  assert.equal(r.body.course.previewLessonId,null);assert.equal(r.body.course.trialUrl,'/classroom/');
  assert.equal(r.body.course.lessons.every(l=>l.locked),true);
  assert.doesNotMatch(JSON.stringify(r.body),/v_paid|r_paid|c_paid|r_zip|privatePath|blob/);
});
test('registered learner cannot request EP01 media or reading from the full course',async()=>{
  const h=harness();h.seed();const r=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'}});
  assert.equal(r.statusCode,403);assert.equal(r.body.lesson,undefined);
  assert.equal(h.events.some(e=>e[0]==='reading'),false);assert.doesNotMatch(JSON.stringify(r.body),/r_paid|v_intro|c_intro/);
});
test('real catalog keeps every video and caption paid, with exact lesson association',async()=>{
  const h=harness();h.seed();
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),lesson=course.lessons.find(l=>l.id==='EP01');
  const options={...h.options,courses:LEARN_COURSES,assets:LEARN_ASSETS};
  for(const entry of course.lessons.filter(l=>l.mediaId)) {
    await assert.rejects(authorizeLearnAsset({}, {}, {courseId:course.id,lessonId:entry.id,assetId:entry.mediaId},options),e=>e.code==='COURSE_ACCESS_REQUIRED');
    await assert.rejects(authorizeLearnAsset({}, {testUser:null}, {courseId:course.id,lessonId:entry.id,assetId:entry.captionId},options),e=>e.code==='AUTH_REQUIRED');
  }
  h.grants.push(grant());
  const result=await authorizeLearnAsset({}, {}, {courseId:course.id,lessonId:lesson.id,assetId:lesson.captionId},options);
  assert.equal(result.asset.kind,'captions');assert.equal(result.preview,false);
  const other=course.lessons.find(l=>l.id!=='EP01' && l.captionId);
  await assert.rejects(authorizeLearnAsset({}, {}, {courseId:course.id,lessonId:lesson.id,assetId:other.captionId},options),e=>e.code==='ASSET_NOT_FOUND');
});
test('chapter five delivers only the current privacy repair, never archived video versions',async()=>{
  const h=harness({catalog:LEARN_COURSES,media:LEARN_ASSETS});h.seed();h.grants.push(grant());
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),lesson=course.lessons.find(l=>l.id==='ADV05');
  assert.equal(lesson.mediaId,'m_08098d73bcb450aab59f8e509d85470e');
  const request={courseId:course.id,lessonId:lesson.id};
  const current=await authorizeLearnAsset({}, {}, {...request,assetId:lesson.mediaId},h.options);
  assert.equal(current.asset.bytes,12795926);
  const archived=LEARN_ASSETS.filter(a=>a.kind==='video' && a.lessonIds.includes('ADV05') && a.id!==lesson.mediaId);
  assert.ok(archived.length>=2);
  for(const asset of archived) {
    await assert.rejects(authorizeLearnAsset({}, {}, {...request,assetId:asset.id},h.options),e=>e.code==='ASSET_NOT_FOUND');
  }
});

test('companion metadata and direct asset access use package entitlement without removing course lessons',async()=>{
  const bonus={id:'ai-sauce-companion-v1',lessonId:'FOUNDATION',title:'คู่มือ + AI คู่คิด',valueTHB:1290,resourceIds:['bonus_pdf','bonus_md']};
  const bonusAssets=bonus.resourceIds.map((id,index)=>({id,courseId:'ai-sauce',lessonIds:['FOUNDATION'],kind:'resource',
    entitlement:bonus.id,title:index?'AI คู่คิด':'คู่มือ',filename:index?'coach.md':'guide.pdf',contentType:index?'text/markdown':'application/pdf',bytes:123}));
  const h=harness({catalog:[{...courses[0],bonus}],media:[...assets,...bonusAssets]});h.seed();h.grants.push(grant());
  let entitlement='not_included';h.store.bonusEntitlement=async()=>entitlement;
  const ids={courseId:'ai-sauce',lessonId:'FOUNDATION',assetId:'bonus_pdf'};
  const detail=()=>h.call('GET','course',undefined,{query:{courseId:'ai-sauce'}});
  let result=await detail();assert.equal(result.statusCode,200);assert.equal(result.body.access.active,true);
  assert.equal(result.body.bonus.status,'not_included');assert.deepEqual(result.body.bonus.resources,[]);
  assert.doesNotMatch(JSON.stringify(result.body),/bonus_pdf|bonus_md|guide.pdf|coach.md/);
  await assert.rejects(authorizeLearnAsset({}, {}, ids,h.options),e=>e.code==='BONUS_ACCESS_REQUIRED');
  entitlement='included';result=await detail();assert.equal(result.body.bonus.resources.length,2);
  assert.match(result.body.bonus.resources[0].url,/assetId=bonus_pdf/);
  assert.equal((await authorizeLearnAsset({}, {}, ids,h.options)).asset.id,'bonus_pdf');
  const lesson=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'FOUNDATION'}});
  assert.equal(lesson.statusCode,200);assert.doesNotMatch(JSON.stringify(lesson.body.lesson.resources),/bonus_pdf|bonus_md/);
  entitlement='unverified';result=await detail();assert.equal(result.body.access.active,true);assert.equal(result.body.bonus.status,'unverified');
  h.grants[0].revoked_at='2026-09-13';result=await detail();assert.equal(result.body.bonus.status,'access_required');
  h.instructors.push({user_id:'alice',course_id:'ai-sauce',granted_at:'2026-09-01'});
  result=await detail();assert.equal(result.body.bonus.status,'included');assert.equal(result.body.bonus.resources.length,2);
});
test('real learner course API lists exactly two bonus downloads for instructor/990/1690 while790 keeps the whole course',async()=>{
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce');
  for(const tier of ['instructor',990,1690,790]){
    const h=harness({catalog:LEARN_COURSES,media:LEARN_ASSETS});h.seed();
    if(tier==='instructor')h.instructors.push({user_id:'alice',course_id:'ai-sauce',granted_at:'2026-09-01'});else h.grants.push(grant());
    h.store.bonusEntitlement=(id,courseId,time)=>companionEntitlement({query:async(q,args)=>{
      assert.deepEqual(args,[user.id,course.id,new Date(NOW)]);
      return [{...grant(),status:'admitted',verified_at:'2026-09-02',verified_amount_satang:Number(tier)*100,
        verified_transferred_at:'2026-09-01T03:00:00Z',checkout_id:'owned-checkout',checkout_bound:true,
        checkout_price:tier,checkout_issued_at:'2026-09-01',checkout_expires_at:'2026-09-02'}];
    }},id,courseId,time);
    const result=await h.call('GET','course',undefined,{query:{courseId:course.id}});
    assert.equal(result.statusCode,200);assert.equal(result.body.access.active,true);assert.equal(result.body.course.lessons.length,course.lessons.length);
    assert.ok(result.body.course.lessons.every(l=>l.locked===false));
    assert.equal(result.body.bonus.status,tier===790?'not_included':'included');
    assert.deepEqual(result.body.bonus.resources.map(a=>a.id),tier===790?[]:course.bonus.resourceIds);
    if(tier!==790){assert.deepEqual(result.body.bonus.resources.map(a=>a.filename),['AI_SAUCE_FIELD_GUIDE.pdf','AI_SAUCE_WORK_COACH.md']);
      for(const a of result.body.bonus.resources){const query=new URL(a.url,'https://www.myclover.com').searchParams;
        assert.equal(query.get('courseId'),course.id);assert.equal(query.get('lessonId'),course.bonus.lessonId);assert.equal(query.get('assetId'),a.id);}}
  }
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
    assert.equal((await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:1,...fields})).statusCode,403);
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
test('private prompt libraries require lesson access and never leak into course metadata',async()=>{
  const h=harness();h.seed();
  const tools=[{kind:'prompt-cards',title:'Teacher tools',prompts:[{id:'bottle',title:'Bottle',body:'PRIVATE_TOOL_TEXT'}]}];
  h.readings.set('ai-sauce/FOUNDATION','# Work\n\n```learn-tools\n'+JSON.stringify(tools)+'\n```');
  const query={courseId:'ai-sauce',lessonId:'FOUNDATION'};
  const denied=await h.call('GET','lesson',undefined,{query});
  assert.equal(denied.statusCode,403);assert.doesNotMatch(JSON.stringify(denied.body),/PRIVATE_TOOL_TEXT/);
  h.instructors.push(instructor());
  const allowed=await h.call('GET','lesson',undefined,{query});
  assert.deepEqual(allowed.body.lesson.tools,tools);assert.equal(allowed.body.lesson.reading,'# Work');
  for(const action of ['courses','course'])assert.doesNotMatch(JSON.stringify((await h.call('GET',action,undefined,{query})).body),/PRIVATE_TOOL_TEXT|Teacher tools/);
});
test('missing private reading has an explicit empty state for authorized full-course learners',async()=>{
  const h=harness();h.seed();h.grants.push(grant());
  let result=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'}});
  assert.equal(result.body.lesson.reading,'');assert.equal(result.body.lesson.readingAvailable,false);
  h.readings.set('ai-sauce/EP01','## INTRO_ONLY');
  result=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'}});
  assert.equal(result.body.lesson.reading,'## INTRO_ONLY');assert.equal(result.body.lesson.readingAvailable,true);
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'EP01'},testUser:null})).statusCode,401);
});
test('BOSS is an authorized reading/activity stage completed explicitly without video progress',async()=>{
  const h=harness();h.seed();h.readings.set('ai-sauce/BOSS','# FINAL_ACTIVITY');
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'BOSS'}})).statusCode,403);
  assert.equal((await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'BOSS',positionSeconds:0,completed:true})).statusCode,403);
  assert.equal(h.events.some(e=>e[0]==='reading'),false);
  h.grants.push(grant());
  const result=await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'BOSS'}});
  assert.equal(result.statusCode,200);assert.equal(result.body.lesson.media,null);assert.equal(result.body.lesson.reading,'# FINAL_ACTIVITY');
  assert.equal(result.body.lesson.completionMode,'manual');assert.equal(result.body.lesson.activityUrl,'/classroom/dungeon/');
  assert.equal(result.body.lesson.durationSeconds,undefined);assert.equal(h.progress.size,0);
  assert.equal((await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'BOSS',positionSeconds:1,completed:true})).statusCode,400);
  const completed=await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'BOSS',positionSeconds:0,completed:true});
  assert.equal(completed.statusCode,200);assert.equal(completed.body.progress.lessons.BOSS.completed,true);assert.equal(completed.body.progress.lessons.BOSS.maxPositionSeconds,0);
  h.grants[0].revoked_at=new Date(NOW);h.instructors.push(instructor());
  assert.equal((await h.call('GET','lesson',undefined,{query:{courseId:'ai-sauce',lessonId:'BOSS'}})).body.access.role,'instructor');
});
test('actual catalog keeps22 videos and inserts the toolkit before chapter1',()=>{
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce');
  const chapters=[['FOUNDATION','EP01','TOOLKIT'],['EP02','ADV01','EP03'],['EP04','ADV02','EP05'],['EP06','EP07','ADV03'],
    ['EP08','ADV04','EP09'],['ADV05','EP10','EP11'],['CH06','EP12'],['EP13','EP14'],['DUNGEON']];
  const sequence=chapters.flat();
  assert.equal(course.lessons.length,23);assert.equal(course.lessons.filter(l=>l.mediaId).length,22);
  assert.deepEqual(course.mainLessonIds,['FOUNDATION','ADV01','ADV02','ADV03','ADV04','ADV05','CH06']);
  assert.equal(course.sections.length,9);assert.deepEqual(course.sections.map(section=>section.lessonIds),chapters);
  assert.deepEqual(course.sections.map(section=>section.label),['บทนำ','บท 1','บท 2','บท 3','บท 4','บท 5','บท 6','ฝึกกับงานจริง','บทส่งท้าย']);
  assert.deepEqual(course.lessons.map(lesson=>lesson.id),sequence);assert.equal(new Set(sequence).size,23);
  for(const [index,id] of sequence.entries()) {
    const lesson=course.lessons.find(item=>item.id===id),section=course.sections.find(group=>group.lessonIds.includes(id));
    assert.equal(lesson.nextLessonId,sequence[index+1]||null,id);assert.equal(lesson.sectionId,section.id,id);
    assert.ok(typeof lesson.partLabel==='string'&&lesson.partLabel.trim(),id);
    assert.equal(lesson.returnLessonId,undefined,id);assert.equal(lesson.supportingLessonIds,undefined,id);
  }
  for(let i=1;i<=14;i++)assert.ok(course.lessons.find(l=>l.id==='EP'+String(i).padStart(2,'0'))?.mediaId);
  assert.equal(course.lessons.some(l=>l.id==='BOSS'),false);
  assert.equal(course.lessons.find(l=>l.id==='DUNGEON').nextLessonId,null);
  assert.equal(course.lessons.find(l=>l.id==='DUNGEON').finale,true);
  assert.equal(course.lessons.some(l=>/Dungeon|BOSS/i.test(l.title)),false);
  assert.equal(course.lessons.every(l=>l.preview===false),true);assert.equal(LEARN_ASSETS.every(a=>a.previewAllowed===false),true);
  assert.equal(course.previewLessonId,null);assert.equal(course.trialUrl,'/classroom/');
});
test('split chapter6 and Dungeon append assets without changing the existing186 registry rows or their order',()=>{
  assert.ok(LEARN_ASSETS.length>=190);
  // Frozen public registry metadata from the pre-split release. Indexes are part
  // of the private storage mapping, so both row values and order must stay stable.
  assert.equal(createHash('sha256').update(JSON.stringify(LEARN_ASSETS.slice(0,186))).digest('hex'),
    '555cbfbc31e27d20fd5315dd646cf5c836c8d6f91c3b73652067b445efce0a58');
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),web=course.lessons.find(l=>l.id==='CH06'),dungeon=course.lessons.find(l=>l.id==='DUNGEON');
  assert.deepEqual(LEARN_ASSETS.slice(186,190).map(asset=>[asset.id,asset.kind,asset.lessonIds]),[
    [web.mediaId,'video',['CH06']],[web.captionId,'captions',['CH06']],
    ['m_2da75aad343557619aa612c66d0de710','video',['DUNGEON']],['m_e3aa689ce60e5a8888c2dc29d1fa58b0','captions',['DUNGEON']],
  ]);
  assert.notEqual(web.mediaId,dungeon.mediaId);assert.notEqual(web.captionId,dungeon.captionId);
  assert.ok(Math.abs(web.durationSeconds-227.767)<0.1);assert.ok(Math.abs(dungeon.durationSeconds-428.1)<0.001);
  assert.ok(Math.abs(web.durationSeconds+dungeon.durationSeconds-655.867)<0.1);
  assert.equal(LEARN_ASSETS[12].id,'m_4d1d2565e8da5c0d8dcfb0bb37f286e2');
  assert.equal(LEARN_ASSETS[13].id,'m_c5bc7c9bdc365fb2b1ab0b0673a5a8f4');
  assert.notEqual(web.mediaId,LEARN_ASSETS[12].id);
});
test('finale v08 uses the four appended manifest assets and durations without changing chapter5 privacy media',()=>{
  // Checked against the approved finale delivery manifest. These are storage
  // positions and media metadata only; paid video and subtitles stay private.
  const expected=[
    ['m_f4c66e8beddbcc8b181ca1644921b9b9','EP14','video','EP14_BUSINESS_CODEX_v08.mp4',4695392,'video/mp4','learn/245.mp4'],
    ['m_324c2d1ee348b75bfe5bf2b0cd017452','EP14','captions','EP14_BUSINESS_CODEX_v08.srt',3711,'application/x-subrip','learn/246.srt'],
    ['m_4ae404912e3ed1f49df2a4ddad1832a5','DUNGEON','video','DUNGEON_AI_SAUCE_v08.mp4',30492951,'video/mp4','learn/247.mp4'],
    ['m_2824b84b7bb015cda9a0efa062b90f86','DUNGEON','captions','DUNGEON_AI_SAUCE_v08.srt',23368,'application/x-subrip','learn/248.srt'],
  ];
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce');
  assert.deepEqual(LEARN_ASSETS.slice(245,249).map(a=>[a.id,a.lessonIds[0],a.kind,a.filename,a.bytes,a.contentType,learnMediaPathname(a)]),expected);
  for(const [assetId,lessonId,kind] of expected){
    const lesson=course.lessons.find(l=>l.id===lessonId),asset=LEARN_ASSETS.find(a=>a.id===assetId);
    assert.equal(lesson[kind==='video'?'mediaId':'captionId'],assetId);assert.equal(asset.courseId,course.id);
    assert.equal(asset.previewAllowed,false);assert.deepEqual(asset.lessonIds,[lessonId]);
  }
  // Unchanged CH06 kept its earlier single-decimal catalog rounding.
  for(const [id,duration,tolerance] of [['CH06',227.767,0.1],['EP14',80.767,0.001],['DUNGEON',428.1,0.001]])
    assert.ok(Math.abs(course.lessons.find(l=>l.id===id).durationSeconds-duration)<tolerance,id);
  const privacy=course.lessons.find(l=>l.id==='ADV05');assert.equal(privacy.mediaId,'m_08098d73bcb450aab59f8e509d85470e');
  assert.equal(learnMediaPathname(LEARN_ASSETS.find(a=>a.id===privacy.mediaId)),'learn/227.mp4');
});
test('chapter labels and part labels serialize to learners while split media remains exact and paid',async()=>{
  const h=harness({catalog:LEARN_COURSES,media:LEARN_ASSETS});h.seed();h.instructors.push(instructor());
  const course=LEARN_COURSES.find(c=>c.id==='ai-sauce'),result=await h.call('GET','course',undefined,{query:{courseId:course.id}});
  assert.equal(result.statusCode,200);assert.equal(result.body.course.videoLessonCount,22);
  assert.deepEqual(result.body.course.sections,course.sections);
  for(const lesson of course.lessons) {
    const metadata=result.body.course.lessons.find(item=>item.id===lesson.id);
    assert.equal(metadata.partLabel,lesson.partLabel);assert.equal(metadata.nextLessonId,lesson.nextLessonId);
    assert.equal(metadata.sectionId,lesson.sectionId);assert.equal(metadata.locked,false);
  }
  for(const lessonId of ['CH06','DUNGEON']) {
    const actual=course.lessons.find(item=>item.id===lessonId),other=course.lessons.find(item=>item.id===(lessonId==='CH06'?'DUNGEON':'CH06'));
    const part=await h.call('GET','lesson',undefined,{query:{courseId:course.id,lessonId}});
    assert.equal(part.statusCode,200);assert.equal(part.body.lesson.partLabel,actual.partLabel);assert.equal(part.body.lesson.media.id,actual.mediaId);
    await assert.rejects(authorizeLearnAsset({}, {}, {courseId:course.id,lessonId,assetId:other.mediaId},h.options),e=>e.code==='ASSET_NOT_FOUND');
  }
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
test('legacy preview flags on assets cannot unlock full-course video, captions or worksheets',async()=>{
  const h=harness();h.seed();
  for(const assetId of ['v_intro','c_intro','r_paid'])await assert.rejects(authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'EP01',assetId},h.options),e=>e.code==='COURSE_ACCESS_REQUIRED');
  h.grants.push(grant());
  for(const assetId of ['v_intro','c_intro','r_paid'])assert.equal((await authorizeLearnAsset({}, {}, {courseId:'ai-sauce',lessonId:'EP01',assetId},h.options)).preview,false);
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
  const h=harness();h.seed();h.grants.push(grant());const base={courseId:'ai-sauce',lessonId:'EP01',positionSeconds:1};
  for(const change of [{userId:'bob'},{accountId:'bob'},{status:'active'},{positionSeconds:-1},{positionSeconds:'1'},{positionSeconds:Infinity},{positionSeconds:90000},{completed:'true'}])assert.equal((await h.call('PUT','progress',{...base,...change})).statusCode,400);
  assert.equal(h.progress.size,0);
});
test('positions clamp to known duration, and instructor progress never creates purchased access',async()=>{
  const h=harness();h.seed();h.instructors.push(instructor());const r=await h.call('PUT','progress',{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:100,completed:true});
  assert.equal(r.body.progress.lessons.EP01.positionSeconds,75);assert.equal(h.grants.length,0);
  h.instructors[0].revoked_at=new Date(NOW);
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

test('all22 learner parts expose their current downloadable bundle with scoped private assets',()=>{
 const c=LEARN_COURSES.find(c=>c.id==='ai-sauce');
 for(const l of c.lessons.filter(l=>l.mediaId)){
 assert.equal(l.resourceIds.length,1,l.id);const asset=LEARN_ASSETS.find(a=>a.id===l.resourceIds[0]);
 const bundleName=new RegExp('^AI_SAUCE_'+l.id+'_LEARNER_FILES_V[0-9]+\\.zip$');
 const latest=LEARN_ASSETS.filter(a=>bundleName.test(a.filename)).at(-1);
 assert.ok(latest,l.id);assert.equal(asset.id,latest.id,'Use the current appended bundle for '+l.id);
 assert.match(asset.filename,bundleName);assert.equal(asset.kind,'resource');assert.equal(asset.contentType,'application/zip');assert.ok(asset.bytes>0);assert.ok(asset.lessonIds.includes(l.id));assert.equal(asset.previewAllowed,false);}
});
