import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApi, createLearner, normalizeCourses, parseRoute, courseRoute, safeAssetUrl, progressSummary } from '../assets/learn-core.js';
import { safeReturn, authRequest, showVerification, googleStartUrl } from '../assets/account-step.js';
import { renderFrontDoorRoot } from '../../tools/sync-frontdoor-root.mjs';
import { renderLessonReading, readingHref, parseReadingDiagram } from '../assets/lesson-reading.js';

const active = { id:'ai-sauce',title:'AI ใส่ซอส',status:'active',summary:'หลักคิดและงานจริง' };
const foundation = {id:'FOUNDATION',title:'เริ่มที่นี่',type:'foundation',order:0,locked:false,nextLessonId:'ADV01'};
const preview = {id:'EP01',title:'บทตัวอย่าง',type:'support',order:1,preview:true,locked:false};
const main = {id:'ADV01',title:'ทำ Source',type:'main',order:2,locked:false};
const courseData = {ok:true,course:{id:'ai-sauce',title:active.title,summary:active.summary,startLessonId:'FOUNDATION',lessons:[foundation,preview,main]},access:{status:'active'},progress:{lessons:{},completedLessons:0,totalLessons:3,percent:0}};
const media = '/api/learn-media?courseId=ai-sauce&lessonId=FOUNDATION&assetId=m_safe';
const lessonData = (id = 'FOUNDATION') => ({ok:true,courseId:'ai-sauce',lesson:{...courseData.course.lessons.find(l=>l.id===id),media:{url:media,captions:[]},resources:[]},access:{status:'active'}});
const response = (body,status=200) => ({ok:status>=200&&status<300,status,json:async()=>body});
const defer = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function viewSpy(){const calls=[];const view=new Proxy({}, {get:(_,key)=>(...args)=>calls.push([key,...args])});return{view,calls};}
function controller(api,route=()=>({})){const spy=viewSpy(),paths=[];return{...spy,paths,app:createLearner({api,view:spy.view,route,navigate:(...args)=>paths.push(args)})};}
test('routes encode only bounded opaque IDs and reject foreign return URLs',()=>{
  assert.deepEqual(parseRoute('?course=ai-sauce&lesson=ADV01'),{courseId:'ai-sauce',lessonId:'ADV01'});
  assert.equal(parseRoute('?course=../secret').courseId,null);
  assert.equal(courseRoute('ai-sauce','EP01'),'/learn/?course=ai-sauce&lesson=EP01');
  for(const url of ['https://evil.example','//evil.example','/\\evil.example','/api/admin','/learn/?enroll=ai-sauce','/ai-source/../api/']) assert.equal(safeReturn(url,'https://www.myclover.com'),null);
  assert.equal(safeReturn('/ai-source/#bank-details','https://www.myclover.com'),'/ai-source/#bank-details');
});
test('media accepts only same-origin authenticated media endpoint',()=>{
  assert.equal(safeAssetUrl(media,'https://www.myclover.com'),media);
  for(const url of ['javascript:alert(1)','https://evil.example/a.mp4','//evil.example/a','/lessons/private.mp4','/api/learn-media','/api/learn-media?url=https://evil.example']) assert.equal(safeAssetUrl(url,'https://www.myclover.com'),null);
});
test('course collection requires explicit successful API shape; no synthetic unenrolled cards',()=>{
  assert.throws(()=>normalizeCourses({courses:[active]}));
  assert.deepEqual(normalizeCourses({ok:true,courses:[]}),[]);
  assert.equal(normalizeCourses({ok:true,courses:[active,active,{...active,id:'unlisted',status:'not_enrolled'}]}).length,1);
  assert.equal(progressSummary({percent:160}).percent,100);
});
test('API sends same-origin credentials and no-store and surfaces auth errors',async()=>{
  let request;const api=createApi(async(url,options)=>{request={url,options};return response({ok:true});});
  await api('progress',{courseId:'ai-sauce',lessonId:'EP01',positionSeconds:23},'PUT');
  assert.equal(request.url,'/api/learn?action=progress');assert.equal(request.options.credentials,'same-origin');assert.equal(request.options.cache,'no-store');assert.equal(JSON.parse(request.options.body).positionSeconds,23);
  await assert.rejects(createApi(async()=>response({ok:false,error:'AUTH_REQUIRED'},401))('courses'),e=>e.status===401&&e.code==='AUTH_REQUIRED');
  await assert.rejects(createApi(async()=>({ok:true,json:async()=>{throw Error();}}))('courses'));
});
test('guest and no-enrollment never request catalog or lesson',async()=>{
  let requests=[];const c=controller(async action=>{requests.push(action);return{ok:true,courses:[]};},()=>({courseId:'ai-sauce',lessonId:'FOUNDATION'}));await c.app.load();
  assert.deepEqual(requests,['courses']);assert.deepEqual(c.paths,[['/learn/',true]]);
  const guest=controller(async()=>{throw Object.assign(Error('login'),{status:401,code:'AUTH_REQUIRED'});});await guest.app.load();assert.equal(guest.calls.at(-1)[0],'error');
});
test('pending course loads preview only and cannot request locked main lesson',async()=>{
  const requests=[];const c=controller(async(action,args)=>{
    requests.push([action,args]);if(action==='courses')return{ok:true,courses:[{...active,status:'pending'}]};
    if(action==='course')return{...courseData,access:{status:'pending'},course:{...courseData.course,startLessonId:'EP01',lessons:[{...foundation,locked:true},preview,{...main,locked:true}]}};
    return lessonData('EP01');
  },()=>({courseId:'ai-sauce',lessonId:'FOUNDATION'}));
  await c.app.load();assert.equal(requests.at(-1)[1].lessonId,'EP01');assert.equal(await c.app.openLesson('ADV01'),false);assert.equal(requests.length,3);assert.equal(c.paths[0][0],'/learn/?course=ai-sauce&lesson=EP01');
});
test('account reset invalidates an in-flight paid lesson response',async()=>{
  const pending=defer();const c=controller(async action=>action==='courses'?{ok:true,courses:[active]}:action==='course'?courseData:pending.promise,()=>({courseId:'ai-sauce'}));
  const load=c.app.load();await new Promise(setImmediate);c.app.reset();pending.resolve(lessonData());await load;
  assert.equal(c.calls.filter(([k])=>k==='lesson').length,0);assert.equal(await c.app.saveProgress(10),false);
});
test('fast lesson changes cannot paint stale media',async()=>{
  let delay=false;const pending=defer();const c=controller(async(action,args)=>action==='courses'?{ok:true,courses:[active]}:action==='course'?courseData:delay&&args.lessonId==='EP01'?pending.promise:lessonData(args.lessonId),()=>({courseId:'ai-sauce'}));
  await c.app.load();delay=true;const a=c.app.openLesson('EP01');await c.app.openLesson('ADV01');pending.resolve(lessonData('EP01'));await a;
  assert.equal(c.calls.filter(([k])=>k==='lesson').at(-1)[1].lesson.id,'ADV01');
});
test('mismatched course/lesson response fails closed',async()=>{
  const c=controller(async action=>action==='courses'?{ok:true,courses:[active]}:action==='course'?courseData:{...lessonData(),courseId:'other'},()=>({courseId:'ai-sauce'}));await c.app.load();assert.equal(c.calls.filter(([k])=>k==='lesson').length,0);assert.equal(c.calls.at(-1)[0],'error');
});
test('progress is explicit and account-scoped; denied save is not reported successful',async()=>{
  const requests=[];let deny=false;const c=controller(async(action,args)=>{requests.push([action,args]);if(action==='courses')return{ok:true,courses:[active]};if(action==='course')return courseData;if(action==='lesson')return lessonData();if(deny)throw Error('offline');return{ok:true,progress:{lessons:{FOUNDATION:{completed:true}}}};},()=>({courseId:'ai-sauce'}));
  await c.app.load();assert.equal(await c.app.saveProgress(40),true);assert.equal(requests.at(-1)[1].completed,undefined);assert.equal(await c.app.saveProgress(40,true),true);assert.equal(requests.at(-1)[1].completed,true);deny=true;assert.equal(await c.app.saveProgress(42),false);assert.equal(c.calls.at(-1)[0],'progressError');
});

class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.currentTime=0;this.duration=90;this.text='';this.className='';this.parentElement=null;}
  set textContent(v){this.text=String(v);this.children=[];}get textContent(){return this.text+this.children.map(c=>c.textContent||'').join('');}
  append(...nodes){for(const n of nodes){if(typeof n==='string')this.children.push({textContent:n});else{n.parentElement=this;this.children.push(n);}}}appendChild(n){this.append(n);return n;}
  prepend(n){n.parentElement=this;this.children.unshift(n);}replaceChildren(...n){this.children=[];this.text='';this.append(...n);}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
  setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}removeAttribute(k){delete this.attributes[k];if(k==='src')this.src='';}
  get childElementCount(){return this.children.length;}addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}async fire(k){for(const fn of this.listeners[k]||[])await fn({preventDefault(){},target:this,currentTarget:this});}
  all(){return this.children.flatMap(n=>n instanceof Element?[n,...n.all()]:[]);}querySelector(s){return this.all().find(n=>s.startsWith('.')?n.className.split(' ').includes(s.slice(1)):n.tagName.toLowerCase()===s)||null;}
  closest(s){let n=this;while(n){if(n.tagName.toLowerCase()===s)return n;n=n.parentElement;}return null;}focus(){this.focused=true;}select(){this.selected=true;}scrollIntoView(options){this.scrollRequest=options;}pause(){this.paused=true;}load(){this.loads=(this.loads||0)+1;}
  reportValidity(){return this.all().filter(n=>n.required).every(n=>n.type==='checkbox'?n.checked:!!n.value);}
}
let run=0;
async function dom(fetcher,search='') {
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),ids=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element(m[1]==='lesson-video'?'video':'div')]));
  const events={},head=new Element('head'),mount=new Element('div'),back=new Element('a');
  const doc={head,hidden:false,getElementById:id=>ids.get(id)||head.all().find(n=>n.id===id),createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelector:s=>s==='[data-home]'?back:['.quiet-tools','[data-my-learning-mount]'].includes(s)?mount:null,addEventListener:(type,fn)=>{(events['d:'+type]??=[]).push(fn);}};
  const location={origin:'https://www.myclover.com',search,pathname:'/learn/',assign(url){this.assigned=url;},replace(url){this.replaced=url;},reload(){this.reloaded=true;}};
  const history={pushState(_,__,url){location.search=new URL(url,location.origin).search;this.last=url;},replaceState(_,__,url){this.pushState(_,__,url);}};
  const window={fetch:fetcher,location,history,MC_ACCOUNT:{user:null,open(mode){window.accountOpened=mode;}},addEventListener:(type,fn)=>{(events[type]??=[]).push(fn);}};
  Object.assign(globalThis,{window,document:doc,location,history});
  const fire=async(type)=>{for(const fn of events[type]||[])await fn();};
  const settle=async()=>{for(let i=0;i<10;i++)await new Promise(setImmediate);};
  return{ids,doc,window,location,history,mount,fire,settle,load:async()=>{await import(`../assets/learn.js?test=${++run}`);await settle();}};
}
function mockedFetch(status='active') {return async url=>{if(url==='/api/auth/providers')return response({ok:true,providers:{email:true,google:false,otp:true}});const u=new URL(url,'https://www.myclover.com');const action=u.searchParams.get('action');if(action==='courses')return response({ok:true,user:{displayName:'ผู้เรียนทดสอบ'},courses:status==='empty'?[]:[{...active,status}]});if(action==='course')return response(courseData);if(action==='lesson')return response(lessonData(u.searchParams.get('lessonId')));return response({ok:false},404);};}
test('private reading renders headings, steps, prompt blocks and bold text without executing HTML',async()=>{
  const d=await dom(mockedFetch());const target=d.ids.get('lesson-reading');
  renderLessonReading(target,'# สรุปบท\n\nข้อมูล **สำคัญ** และ <script>alert(1)</script>\n\n1. เลือกงาน\n2. เก็บ Source\n\n```text\n<img src=x onerror=alert(2)>\n```\n\n> ลองทำกับงานของคุณ',{origin:d.location.origin});
  assert.equal(target.hidden,false);assert.equal(target.querySelector('h3').textContent,'สรุปบท');assert.equal(target.querySelector('strong').textContent,'สำคัญ');assert.equal(target.querySelector('ol').children.length,2);assert.equal(target.querySelector('script'),null);assert.equal(target.querySelector('img'),null);assert.match(target.querySelector('pre').textContent,/<img/);assert.match(target.textContent,/<script>/);
});
test('reading links keep course navigation and private resources but reject unsafe protocols',async()=>{
  const d=await dom(mockedFetch()),target=d.ids.get('lesson-reading');let route;
  renderLessonReading(target,'[ต่อบท 1](/learn/?course=ai-sauce&lesson=ADV01) [ไฟล์]('+media+') [ไม่เปิด](javascript:alert) [ไฟล์ในเครื่อง](file:///private/a)',{origin:d.location.origin,onLesson:value=>route=value,onResource:()=>false});
  const links=target.all().filter(n=>n.tagName==='A');assert.equal(links.length,2);await links[0].fire('click');assert.deepEqual(route,{courseId:'ai-sauce',lessonId:'ADV01'});let prevented=false;for(const fn of links[1].listeners.click)fn({preventDefault(){prevented=true;}});assert.equal(prevented,true);
  for(const href of ['javascript:alert(1)','data:text/html,hi','file:///a','//evil.example','/lessons/paid.mp4','https://name:secret@example.com/a'])assert.equal(readingHref(href,d.location.origin),null);
});
test('authorized lesson reading becomes visible below video and clears on account reset',async()=>{
  let pending;const base=mockedFetch();const d=await dom(async url=>pending?pending.promise:url.includes('action=lesson')?response({...lessonData(),lesson:{...lessonData().lesson,reading:'## ลองทำต่อ\n\nเลือกงานหนึ่งเรื่อง แล้วเก็บข้อมูลต้นทาง',readingAvailable:true}}):base(url),'?course=ai-sauce');await d.load();
  assert.equal(d.ids.get('lesson-reading').hidden,false);assert.match(d.ids.get('lesson-reading').textContent,/เลือกงานหนึ่งเรื่อง/);
  pending=defer();await d.fire('mc:account-changed');assert.equal(d.ids.get('lesson-reading').textContent,'');pending.resolve(response({ok:false,error:'AUTH_REQUIRED'},401));await d.settle();
});
test('instructor is labelled distinctly and can switch main lessons without a payment prompt',async()=>{
  const base=mockedFetch();const d=await dom(async url=>url.includes('action=course&')?response({...courseData,access:{status:'active',active:true,role:'instructor'}}):base(url),'?course=ai-sauce');await d.load();
  assert.match(d.ids.get('course-access').textContent,/ผู้สอน/);assert.equal(d.ids.get('access-notice').hidden,true);
  const link=d.ids.get('lesson-navigation').all().find(n=>n.dataset.lessonId==='ADV01');await link.fire('click');await d.settle();assert.equal(d.ids.get('lesson-title').textContent,'ทำ Source');assert.match(d.location.search,/lesson=ADV01/);
});
test('locked chapter gives a visible explanation rather than an inert sidebar row',async()=>{
  const base=mockedFetch();const d=await dom(async url=>url.includes('action=course&')?response({...courseData,access:{status:'registered',active:false},course:{...courseData.course,lessons:[{...foundation,locked:true},preview,{...main,locked:true}]}}):base(url),'?course=ai-sauce&lesson=EP01');await d.load();
  const link=d.ids.get('lesson-navigation').all().find(n=>n.dataset.lessonId==='ADV01');assert.match(link.textContent,/คอร์สเต็ม/);await link.fire('click');assert.match(d.ids.get('page-status').textContent,/ยังเปิดสิทธิ์ไม่ครบ/);assert.ok(d.ids.get('page-status').scrollRequest);assert.equal(d.ids.get('lesson-title').textContent,'บทตัวอย่าง');
});
test('mocked DOM: active route paints authenticated landscape player and next main, with no autoplay',async()=>{
  const d=await dom(mockedFetch(),'?course=ai-sauce&lesson=FOUNDATION');await d.load();assert.equal(d.ids.get('classroom').hidden,false);assert.equal(d.ids.get('lesson-video').src,media);assert.equal(d.ids.get('lesson-video').autoplay,undefined);assert.match(d.ids.get('next-lesson').href,/lesson=ADV01/);assert.equal(d.ids.get('lesson-title').textContent,'เริ่มที่นี่');assert.equal(d.ids.get('account-label').textContent,'ผู้เรียนทดสอบ');
});
test('mocked DOM: logout clears actual video src/resources immediately before server resolves',async()=>{
  let pending;const base=mockedFetch();const d=await dom(async url=>pending?pending.promise:base(url),'?course=ai-sauce');await d.load();pending=defer();await d.fire('mc:account-changed');assert.equal(d.ids.get('lesson-video').src,'');assert.equal(d.ids.get('resource-list').childElementCount,0);pending.resolve(response({ok:false,error:'AUTH_REQUIRED'},401));await d.settle();assert.equal(d.ids.get('state-panel').hidden,false);
});
test('mocked DOM: empty room contains no course or sales CTA',async()=>{
  const d=await dom(mockedFetch('empty'));await d.load();assert.equal(d.ids.get('course-grid').childElementCount,0);assert.match(d.ids.get('state-panel').textContent,/ห้องเรียนยังว่าง/);assert.equal(d.ids.get('state-panel').all().some(n=>String(n.href).includes('ai-source')),false);
});
test('mocked DOM: failed media URL and resource URL never become links',async()=>{
  const base=mockedFetch();const d=await dom(async url=>url.includes('action=lesson')?response({...lessonData(),lesson:{...lessonData().lesson,media:{url:'https://public.example/paid.mp4'},resources:[{title:'bad',url:'javascript:alert(1)'}]}}):base(url),'?course=ai-sauce');await d.load();assert.equal(d.ids.get('player-wrap').hidden,true);assert.equal(d.ids.get('resources-section').hidden,true);assert.equal(d.ids.get('lesson-video').src,'');
});
test('mocked DOM: authenticated enroll waits for server enrollment before returning',async()=>{
  const requests=[];const d=await dom(async(url,options)=>{requests.push([url,options]);if(url==='/api/auth/session')return response({ok:true,user:{emailVerified:true}});if(url==='/api/learn?action=enroll')return response({ok:true});return response({ok:false},404);},'?enroll=ai-sauce&return=%2Fai-source%2F%23bank-details');await d.load();assert.equal(d.location.replaced,'/ai-source/#bank-details');assert.equal(requests.length,2);assert.equal(JSON.parse(requests[1][1].body).courseId,'ai-sauce');
});
test('mocked DOM: unverified enroll requests neither enrollment nor payment and offers OTP',async()=>{
  const requests=[];const d=await dom(async url=>{requests.push(url);return url==='/api/auth/providers'?response({ok:true,providers:{google:false,otp:true}}):response({ok:true,user:{email:'test@example.com',emailVerified:false}});},'?enroll=ai-sauce');await d.load();assert.deepEqual(requests,['/api/auth/session','/api/auth/providers']);assert.match(d.ids.get('state-panel').textContent,/รหัส 6 หลัก/);assert.equal(d.ids.get('state-panel').querySelector('form').all().find(n=>n.name==='email').value,'test@example.com');
});
test('mocked DOM: home learning link absent for guest/empty; present for real pending enrollment',async()=>{
  const d=await dom(async()=>response({ok:true,hasEnrollment:false}));const module=await import(`../../assets/my-learning-entry.js?test=${++run}`);await d.settle();assert.equal(d.mount.childElementCount,0);
  await module.refreshLearningEntry(async()=>response({ok:true,hasEnrollment:true}));assert.equal(d.mount.childElementCount,1);assert.equal(d.mount.children[0].href,'/learn/');
  await module.refreshLearningEntry(async()=>response({ok:false},401));assert.equal(d.mount.childElementCount,0);
});
test('mocked DOM: late pre-logout home response cannot restore learning entry',async()=>{
  const d=await dom(async()=>response({ok:true,hasEnrollment:false}));const module=await import(`../../assets/my-learning-entry.js?test=${++run}`);await d.settle();const pending=defer();const first=module.refreshLearningEntry(()=>pending.promise);await module.refreshLearningEntry(async()=>response({ok:false},401));pending.resolve(response({ok:true,hasEnrollment:true}));await first;assert.equal(d.mount.childElementCount,0);
});
test('OTP API only trusts successful server response',async()=>{
  await assert.rejects(authRequest(async()=>response({ok:false,message:'รหัสไม่ถูกต้อง'},401),'otp/verify',{requestId:'test',otp:'123456'}),/รหัสไม่ถูกต้อง/);
  const result=await authRequest(async()=>response({ok:true,user:{emailVerified:true}}),'session');assert.equal(result.user.emailVerified,true);
});
test('mocked OTP: consent required, real request then verification then verified session before success',async()=>{
  const d=await dom(mockedFetch()), calls=[];let verified=false;
  await showVerification({panel:d.ids.get('state-panel'),email:'learner@example.com',fetcher:async(url,options)=>{if(url==='/api/auth/providers')return response({ok:true,providers:{otp:true,google:false}});calls.push([url,options]);if(url.endsWith('/request'))return response({ok:true,requestId:'opaque-request',resendAfter:45});if(url.endsWith('/verify'))return response({ok:true,user:{emailVerified:true}});return response({ok:true,user:{emailVerified:true,email:'learner@example.com'}});},onVerified:async()=>{verified=true;}});
  const form=d.ids.get('state-panel').querySelector('form'),inputs=Object.fromEntries(form.all().filter(n=>n.name).map(n=>[n.name,n]));inputs.name.value='ผู้เรียน';
  await form.fire('submit');assert.equal(calls.length,0);inputs.consent.checked=true;await form.fire('submit');assert.equal(calls.length,1);assert.equal(inputs.email.readOnly,true);assert.equal(verified,false);
  inputs.otp.value='123456';await form.fire('submit');assert.equal(verified,true);assert.deepEqual(calls.map(c=>c[0]),['/api/auth/otp/request','/api/auth/otp/verify','/api/auth/session']);assert.deepEqual(JSON.parse(calls[1][1].body),{requestId:'opaque-request',otp:'123456',name:'ผู้เรียน'});
});
test('mocked OTP: failed delivery/verification cannot enroll; resend cooldown and email correction are explicit',async()=>{
  const d=await dom(mockedFetch());let verified=false,requests=0;
  await showVerification({panel:d.ids.get('state-panel'),fetcher:async url=>{if(url==='/api/auth/providers')return response({ok:true,providers:{otp:true,google:false}});if(url.endsWith('/request')){requests++;return response({ok:true,requestId:'request',resendAfter:45});}return response({ok:false,message:'รหัสไม่ถูกต้อง'},401);},onVerified:async()=>{verified=true;}});
  const form=d.ids.get('state-panel').querySelector('form'),inputs=Object.fromEntries(form.all().filter(n=>n.name).map(n=>[n.name,n]));Object.assign(inputs.name,{value:'ผู้เรียน'});inputs.email.value='learner@example.com';inputs.consent.checked=true;await form.fire('submit');
  await form.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='ขอรหัสใหม่').fire('click');assert.equal(requests,1);assert.match(form.textContent,/วินาที/);
  inputs.otp.value='000000';await form.fire('submit');assert.equal(verified,false);assert.match(form.textContent,/รหัสไม่ถูกต้อง/);
  await form.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='แก้อีเมล').fire('click');assert.equal(inputs.email.readOnly,false);assert.equal(inputs.otp.required,false);assert.equal(inputs.otp.value,'');
});
test('mocked DOM: embedded subtitles do not create duplicate SRT track, optional resources remain collapsed',async()=>{
  const base=mockedFetch();const d=await dom(async url=>url.includes('action=lesson')?response({...lessonData(),lesson:{...lessonData().lesson,media:{url:media,captionsEmbedded:true,captions:[{url:media,mimeType:'application/x-subrip'}]},resources:[{title:'ไฟล์หลัก',url:media},{title:'ชุดทบทวน',url:media,optional:true}]}}):base(url),'?course=ai-sauce');await d.load();assert.equal(d.ids.get('lesson-video').childElementCount,0);const details=d.ids.get('resource-list').querySelector('details');assert.ok(details);assert.notEqual(details.open,true);assert.match(details.textContent,/ชุดทบทวน/);
});
test('mocked DOM: final main chapter offers optional cases; support return is labelled honestly',async()=>{
  const last={id:'CH06',title:'ส่งต่องาน',type:'main',order:60,locked:false},support={id:'EP12',title:'ส่งไฟล์',type:'support',order:61,locked:false,returnLessonId:'CH06'},cases=[{id:'EP13',title:'งานสำนักงาน',type:'case',order:70,locked:false},{id:'EP14',title:'งานธุรกิจ',type:'case',order:71,locked:false}];
  const fixture={...courseData,course:{...courseData.course,lessons:[last,support,...cases],applicationLessonIds:['EP13','EP14'],startLessonId:'CH06'}};
  const fetcher=async url=>{const p=new URL(url,'https://www.myclover.com').searchParams;if(p.get('action')==='course')return response(fixture);if(p.get('action')==='lesson')return response({ok:true,courseId:'ai-sauce',lesson:{...fixture.course.lessons.find(l=>l.id===p.get('lessonId')),media:{url:media}}});return response({ok:true,courses:[active]});};
  const d=await dom(fetcher,'?course=ai-sauce&lesson=CH06');await d.load();assert.equal(d.ids.get('application-section').hidden,false);assert.equal(d.ids.get('application-links').childElementCount,2);assert.equal(d.ids.get('next-lesson').hidden,true);
  await d.ids.get('application-links').children[0].fire('click');await d.settle();assert.equal(d.ids.get('lesson-title').textContent,'งานสำนักงาน');assert.equal(d.ids.get('lesson-title').scrollRequest.block,'start');
  const d2=await dom(fetcher,'?course=ai-sauce&lesson=EP12');await d2.load();assert.equal(d2.ids.get('next-lesson').textContent,'กลับบทหลัก →');assert.match(d2.ids.get('next-lesson').href,/CH06/);
});
test('static shell protects paid assets and maintains home source sync and accessibility basics',async()=>{
  const [html,js,css,root,frontdoor,home]=await Promise.all(['learn/index.html','learn/assets/learn.js','learn/assets/learn.css','index.html','frontdoor/index.html','home/index.html'].map(p=>readFile(new URL('../../'+p,import.meta.url),'utf8')));
  assert.equal(renderFrontDoorRoot(frontdoor),root);
  for(const page of [root,frontdoor,home])assert.equal((page.match(/src="\/assets\/my-learning-entry.js"/g)||[]).length,1);
  assert.match(html,/<html lang="th">/);assert.doesNotMatch(html,/href="\/learn\/classroom\/"/);assert.match(html,/href="\/classroom\/dungeon\/"/);assert.match(html,/controls playsinline preload="metadata"/);assert.doesNotMatch(html,/autoplay|<iframe|\.mp4|\.zip|COURSE_MANIFEST|file:\/\//);assert.doesNotMatch(js,/innerHTML|localStorage|sessionStorage/);
  assert.match(css,/aspect-ratio:16\/9/);assert.match(css,/\[hidden\]\{display:none!important\}/);assert.match(css,/@media\(max-width:375px\)/);assert.match(css,/prefers-reduced-motion/);
});


test('foundation onboarding returns to the requested room and preserves its work reference',()=>{
  assert.equal(safeReturn('/learn/classroom/dungeon/?work=craft-123&entry=compass','https://www.myclover.com'),'/learn/classroom/dungeon/?work=craft-123&entry=compass');
  for(const path of ['/learn/classroom/%2f%2fevil.test','/learn/classroom/../../api/learn-media','//evil.test/learn/classroom/'])assert.equal(safeReturn(path,'https://www.myclover.com'),null);
});

test('Google uses existing OAuth route and preserves complete local onboarding and campaign return',()=>{
  const target='/learn/?enroll=ai-sauce&lesson=EP01&return='+encodeURIComponent('/ai-source/?utm_source=fb&utm_campaign=launch#bank-details');
  const oauth=new URL(googleStartUrl(target,'https://www.myclover.com'),'https://www.myclover.com');
  assert.equal(oauth.pathname,'/api/auth/oauth/google/start');assert.equal(oauth.searchParams.get('return'),target);
  const foundation='/learn/classroom/dungeon/?work=craft-123&entry=compass';
  assert.equal(new URL(googleStartUrl(foundation,'https://www.myclover.com'),'https://www.myclover.com').searchParams.get('return'),foundation);
  for(const bad of ['https://evil.test','//evil.test/learn/','/\\evil.test/learn/','/api/admin'])assert.equal(new URL(googleStartUrl(bad,'https://www.myclover.com'),'https://www.myclover.com').searchParams.get('return'),'/learn/');
});
test('Google fallback with otp:false never presents unusable OTP and requires consent before redirect',async()=>{
  const d=await dom(mockedFetch()),requests=[],target='/learn/?enroll=ai-sauce&return='+encodeURIComponent('/ai-source/?utm_medium=paid#bank-details');
  await showVerification({panel:d.ids.get('state-panel'),returnTo:target,fetcher:async url=>{requests.push(url);return response({ok:true,providers:{email:true,google:true,line:true,otp:false}});},onVerified:()=>assert.fail('Google click is not verification proof')});
  const panel=d.ids.get('state-panel'),form=panel.querySelector('form');assert.match(panel.textContent,/เข้าสู่ห้องเรียนด้วย Google/);assert.doesNotMatch(panel.textContent,/รับรหัสทางอีเมล|รหัส 6 หลัก/);
  await form.fire('submit');assert.equal(d.location.assigned,undefined);form.all().find(n=>n.name==='google_consent').checked=true;await form.fire('submit');
  assert.equal(d.location.assigned,googleStartUrl(target,d.location.origin));assert.deepEqual(requests,['/api/auth/providers']);
});
test('missing otp flag is closed even when email/password and LINE are available',async()=>{
  const d=await dom(mockedFetch());const requests=[];
  await showVerification({panel:d.ids.get('state-panel'),fetcher:async url=>{requests.push(url);return response({ok:true,providers:{email:true,line:true,google:false}});},onVerified:()=>assert.fail()});
  assert.match(d.ids.get('state-panel').textContent,/การยืนยันอีเมลยังไม่พร้อม/);assert.equal(d.ids.get('state-panel').querySelector('form'),null);assert.match(d.ids.get('state-panel').textContent,/ติดต่อผู้สอน/);assert.deepEqual(requests,['/api/auth/providers']);
});
test('providers unavailable offers clear retry without constructing an OTP form',async()=>{
  const d=await dom(mockedFetch());await showVerification({panel:d.ids.get('state-panel'),fetcher:async()=>response({ok:false},503),onVerified:()=>assert.fail()});
  assert.match(d.ids.get('state-panel').textContent,/ตรวจวิธีเข้าสู่ระบบไม่สำเร็จ/);assert.match(d.ids.get('state-panel').textContent,/ลองตรวจอีกครั้ง/);assert.equal(d.ids.get('state-panel').querySelector('form'),null);
});
test('Google and configured OTP coexist with OTP as a collapsed alternative',async()=>{
  const d=await dom(mockedFetch());await showVerification({panel:d.ids.get('state-panel'),fetcher:async()=>response({ok:true,providers:{google:true,otp:true}}),onVerified:()=>{}});
  const panel=d.ids.get('state-panel');assert.equal(panel.all().filter(n=>n.tagName==='FORM').length,2);const alternative=panel.querySelector('details');assert.ok(alternative);assert.notEqual(alternative.open,true);assert.match(alternative.textContent,/รับรหัสทางอีเมล/);
});
test('late provider response cannot overwrite a newer account or classroom view',async()=>{
  const d=await dom(mockedFetch()),pending=defer();let current=true;
  const work=showVerification({panel:d.ids.get('state-panel'),fetcher:()=>pending.promise,isCurrent:()=>current,onVerified:()=>{}});current=false;d.ids.get('state-panel').textContent='new account state';pending.resolve(response({ok:true,providers:{google:true,otp:true}}));await work;assert.equal(d.ids.get('state-panel').textContent,'new account state');
});


test('guided reading diagrams render as accessible steps and never execute supplied markup',async()=>{
  const d=await dom(mockedFetch()), target=d.ids.get('lesson-reading');
  const payload={title:'จาก Source ไปสู่งานจริง',steps:[{label:'ซอสแม่',detail:'เก็บข้อมูลที่ยืนยันแล้ว'},{label:'<img onerror=evil()>',detail:'แยกตามงาน'}],caption:'มนุษย์ตรวจทุกครั้ง'};
  renderLessonReading(target,'```diagram\n'+JSON.stringify(payload)+'\n```',{origin:d.location.origin});
  assert.equal(target.querySelector('figure').querySelector('figcaption').textContent,payload.title);
  assert.equal(target.querySelector('ol').children.length,2);assert.equal(target.querySelector('img'),null);assert.match(target.textContent,/มนุษย์ตรวจทุกครั้ง/);
  for(const source of ['null','{}','{"steps":[]}','{"title":"x","steps":[{"label":"x"}]}','not-json'])assert.equal(parseReadingDiagram(source),null);
});
test('prompt copy preserves exact text and offers selected text when clipboard fails',async()=>{
  const d=await dom(mockedFetch()), target=d.ids.get('lesson-reading'), prompt='งานของฉัน: [ใส่ข้อมูล]\nห้ามเติมข้อมูลที่ไม่มี';let copied;
  renderLessonReading(target,'```text\n'+prompt+'\n```',{origin:d.location.origin,copyText:async text=>{copied=text;}});
  await target.querySelector('button').fire('click');assert.equal(copied,prompt);assert.match(target.textContent,/คัดลอกแล้ว/);
  renderLessonReading(target,'```text\n'+prompt+'\n```',{origin:d.location.origin,copyText:async()=>{throw new Error('denied');}});
  await target.querySelector('button').fire('click');assert.equal(target.querySelector('textarea').value,prompt);assert.equal(target.querySelector('textarea').selected,true);assert.equal(target.querySelector('button').disabled,false);
});
test('full reading sends learners outward only to the real Dungeon',()=>{
  const origin='https://www.myclover.com';assert.equal(readingHref('/classroom/dungeon/',origin),'/classroom/dungeon/');
  for(const path of ['/classroom/','/learn/classroom/','/ai-source/','https://www.myclover.com/classroom/','https://other.example/'])assert.equal(readingHref(path,origin),null);
});
test('free classroom trial verifies account without enrolling in the paid course',async()=>{
  const requests=[];const d=await dom(async url=>{requests.push(url);return response({ok:true,user:{emailVerified:true}});},'?trial=classroom&return='+encodeURIComponent('/classroom/dungeon/?work=craft-123&entry=compass'));await d.load();
  assert.equal(d.location.replaced,'/classroom/dungeon/?work=craft-123&entry=compass');assert.deepEqual(requests,['/api/auth/session']);
  assert.equal(safeReturn('/classroom/','https://www.myclover.com'),'/classroom/');
});
test('Boss is a main stage with reading and Dungeon entry, without a broken video notice',async()=>{
  const boss={id:'BOSS',title:'ด่านบอส',type:'boss',order:7,locked:false};
  const fixture={...courseData,course:{...courseData.course,lessons:[foundation,main,boss],startLessonId:'BOSS'}};let saved;
  const d=await dom(async (url,options)=>{const p=new URL(url,'https://www.myclover.com').searchParams;
    if(p.get('action')==='progress'){saved=JSON.parse(options.body);return response({ok:true,progress:{completedLessons:1,totalLessons:22,lessons:{BOSS:{completed:true}}}});}
    if(p.get('action')==='course')return response(fixture);
    if(p.get('action')==='lesson')return response({ok:true,courseId:'ai-sauce',lesson:{...boss,reading:'# พร้อมต่อยอด\n\nต่อซอสของคุณให้เป็นระบบ',media:null,resources:[]}});
    return response({ok:true,courses:[active]});
  },'?course=ai-sauce&lesson=BOSS');await d.load();
  assert.match(d.ids.get('lesson-navigation').textContent,/เส้นทางหลัก · 3 ช่วง/);assert.equal(d.ids.get('player-wrap').hidden,true);assert.equal(d.ids.get('media-message').hidden,true);assert.equal(d.ids.get('boss-invitation').hidden,false);assert.match(d.ids.get('lesson-reading').textContent,/ต่อซอสของคุณ/);
  d.ids.get('lesson-video').currentTime=500;await d.ids.get('lesson-video').fire('error');assert.equal(d.ids.get('media-message').hidden,true);
  await d.ids.get('complete-lesson').fire('click');assert.equal(saved.positionSeconds,0);assert.equal(saved.completed,true);
});
