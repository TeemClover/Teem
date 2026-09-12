// Start preview.mjs first. Set COURSE_URL and COURSE_TEST_PASSWORD to test a deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {COURSE_CONTENT_FILES} from '../../api/course-content.js';
const base=new URL(process.env.COURSE_URL||'http://127.0.0.1:8766/course/');
const password=process.env.COURSE_TEST_PASSWORD||(base.hostname==='127.0.0.1'?'training-preview':'');
if(!password)throw new Error('Set COURSE_TEST_PASSWORD for deployment checks');
const origin=base.origin;
let count=0;const check=(label,pass)=>{assert.ok(pass,label);count++;};
const get=(p,cookie='',method='GET')=>fetch(new URL(p,origin),{redirect:'manual',method,headers:cookie?{cookie}:{}});
const post=(body,extra={})=>fetch(new URL('/api/course-access',origin),{method:'POST',headers:{origin,'content-type':'application/json',...extra},body:JSON.stringify(body)});
check('project portal is public',(await get('/course/')).status===200);
for(const p of ['/course/thedent912/','/course/thedent912/index.html'])check('classroom is gated '+p,[307,401].includes((await get(p)).status));
check('API content gated',(await get('/api/course-content?file=index.html')).status===401);
check('password is not accepted for other projects',(await Promise.all(['pir-academy','cloverx','crescohealth','gems'].map(project=>post({project,password})))).every(r=>r.status===401));
check('wrong password rejected',(await post({project:'thedent',password:'not-the-password'})).status===401);
check('cross-origin rejected',(await post({project:'thedent',password},{origin:'https://outside.invalid'})).status===403);
check('new device has no remembered access',(await post({action:'status',project:'thedent'})).status===401);
const login=await post({project:'thedent',password});check('valid password accepted',login.status===200);
const setCookie=login.headers.get('set-cookie')||'';check('cookie protections',['HttpOnly','Secure','SameSite=Lax','Path=/'].every(value=>setCookie.includes(value)));
check('remembered cookie uses renewable 400-day lifetime',setCookie.includes('Max-Age=34560000'));
const cookie=setCookie.split(';')[0];
check('login targets relocated room',(await login.json()).redirect==='/course/thedent912/');
const remembered=await post({action:'status',project:'thedent'},{cookie});
check('remembered device enters without password',remembered.status===200&&(await remembered.json()).redirect==='/course/thedent912/');
check('remembered device refreshes its cookie',(remembered.headers.get('set-cookie')||'').includes('Max-Age=34560000'));
for(const suffix of ['', '/', '/index.html?lesson=files', '/evaluation.html?from=slides', '/resources/clinic-public-source.md?download=1']){
 for(const session of ['',cookie]){
  const old=await get('/course/thedent'+suffix,session);
  const destination=new URL(old.headers.get('location')||'/invalid',origin);
  check('old route redirects to canonical classroom '+suffix,[307,308].includes(old.status)&&destination.href===new URL('/course/thedent912'+(suffix||'/'),origin).href);
  const next=await get(destination.href,session);
  check('migration preserves existing access '+suffix,session?next.status===200:[307,401].includes(next.status));
 }
}
const encodedAliases=['/course/%74hedent/course-content.js','/course/%74%68%65%64%65%6e%74/course-content.js','/course/thedent%2fcourse-content.js','/course%2fthedent/course-content.js','/course/%2574hedent/course-content.js','/course/thedent/%63ourse-content.js'];
for(const alias of [...encodedAliases,...encodedAliases.map(p=>p.replaceAll('hedent','hedent912').replace('%74%68%65%64%65%6e%74/','%74%68%65%64%65%6e%74%39%31%32/'))]){
 for(const session of ['',cookie]){
  const response=await get(alias,session);
  check('encoded alias never reaches static delivery '+alias+' '+Boolean(session),[400,404].includes(response.status));
 }
}
for(const file of COURSE_CONTENT_FILES){
 const response=await get('/course/thedent912/'+file,cookie);
 check('authenticated file '+file,response.status===200);
 if(file.endsWith('.md'))check('Markdown download keeps filename '+file,['attachment', 'inline'].some(disposition=>response.headers.get('content-disposition')===`${disposition}; filename="${file.split('/').pop()}"`));
 check('private no-store '+file,(response.headers.get('cache-control')||'').includes('no-store'));
 const expected=await fs.readFile(new URL('../../course/thedent/'+file,import.meta.url));
 check('exact file '+file,Buffer.from(await response.arrayBuffer()).equals(expected));
 const locked=await get('/course/thedent912/'+file);
 check('warm asset still gated '+file,[307,401].includes(locked.status));
}
check('HEAD authenticates',(await get('/course/thedent912/resources/clinic-public-source.md','','HEAD')).status===401);
check('HEAD allowed with session',(await get('/course/thedent912/resources/clinic-public-source.md',cookie,'HEAD')).status===200);
for(const file of ['../api/course-access.js','%2e%2e%2fapi%2fcourse-access.js','README.md','tests/browser.e2e.mjs'])check('reject invalid file '+file,(await get('/api/course-content?file='+encodeURIComponent(file),cookie)).status===400);
const badCookie=cookie.slice(0,-3)+'abc';check('tampered cookie rejected',(await get('/course/thedent912/course-content.js',badCookie)).status===401);
// Review submissions are tested only against the explicit localhost memory
// adapter. Deployment checks must never create a learner response or reward.
if(['127.0.0.1','localhost','[::1]'].includes(base.hostname)){
 const service=await get('/api/course-review');
 check('review preview has memory-only storage',service.status===200&&service.headers.get('x-course-preview')==='fixture-memory-only');
 const submitReview=(body,extra={})=>fetch(new URL('/api/course-review',origin),{method:'POST',headers:{origin,'content-type':'application/json',cookie,...extra},body:JSON.stringify(body)});
 const answer={action:'submit',participantId:crypto.randomUUID(),name:'Local fixture learner',role:'Preview only',before:2,after:4,takeaways:['files','excel'],firstTask:'Fixture workflow test',score:8,feedback:'Local fixture only',testimonial:'',consent:'private'};
 check('review requires the existing classroom session',(await submitReview(answer,{cookie:''})).status===401);
 check('review rejects invalid fields',(await submitReview({...answer,after:6})).status===400);
 check('review rejects outside origins',(await submitReview(answer,{origin:'https://outside.invalid'})).status===403);
 const submitted=await submitReview(answer),receipt=await submitted.json();
 check('review accepts the real form contract',submitted.status===200&&receipt.ok&&receipt.cohortId==='thedent-2026-09-12'&&/^[A-Za-z0-9_-]{43}$/.test(receipt.receiptToken));
 check('review returns the expected claim destination',receipt.claimUrl==='https://www.teambook.me/course-card/#'+receipt.receiptToken);
 const retry=await submitReview({...answer,feedback:'Retry must retain its receipt'}),repeated=await retry.json();
 check('review retry returns the same receipt',retry.status===200&&repeated.receiptToken===receipt.receiptToken&&repeated.reviewReference===receipt.reviewReference);
 const other=await submitReview({...answer,participantId:crypto.randomUUID()}),separate=await other.json();
 check('different learner gets a separate receipt',other.status===200&&separate.receiptToken!==receipt.receiptToken);
 const claim=await submitReview({action:'claim',token:receipt.receiptToken,profileId:'local-fixture-profile'},{origin:'https://www.teambook.me'}),claimed=await claim.json();
 check('fixture receipt claim uses the actual handler',claim.status===200&&claimed.ok&&claimed.reward?.questId==='course:thedent-2026-09-12:feedback');
 const same=await submitReview({action:'claim',token:receipt.receiptToken,profileId:'local-fixture-profile'},{origin:'https://www.teambook.me'}),reclaimed=await same.json();
 check('fixture repeated claim returns the same card',same.status===200&&reclaimed.reward?.rewardId===claimed.reward.rewardId);
 check('fixture receipt cannot move to another profile',(await submitReview({action:'claim',token:receipt.receiptToken,profileId:'other-fixture-profile'},{origin:'https://www.teambook.me'})).status===409);
}
const logout=await post({action:'logout'},{cookie});check('logout clears cookie',logout.status===200&&(logout.headers.get('set-cookie')||'').includes('Max-Age=0'));
console.log(JSON.stringify({checks:count,url:base.href,allPassed:true}));
