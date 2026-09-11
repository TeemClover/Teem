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
for(const p of ['/course/thedent/','/course/thedent/index.html'])check('classroom is gated '+p,[307,401].includes((await get(p)).status));
check('API content gated',(await get('/api/course-content?file=index.html')).status===401);
check('password is not accepted for other projects',(await Promise.all(['pir-academy','cloverx','crescohealth','gems'].map(project=>post({project,password})))).every(r=>r.status===401));
check('wrong password rejected',(await post({project:'thedent',password:'not-the-password'})).status===401);
check('cross-origin rejected',(await post({project:'thedent',password},{origin:'https://outside.invalid'})).status===403);
check('new device has no remembered access',(await post({action:'status',project:'thedent'})).status===401);
const login=await post({project:'thedent',password});check('valid password accepted',login.status===200);
const setCookie=login.headers.get('set-cookie')||'';check('cookie protections',['HttpOnly','Secure','SameSite=Lax','Path=/'].every(value=>setCookie.includes(value)));
check('remembered cookie uses renewable 400-day lifetime',setCookie.includes('Max-Age=34560000'));
const cookie=setCookie.split(';')[0];
check('login targets relocated room',(await login.json()).redirect==='/course/thedent/');
const remembered=await post({action:'status',project:'thedent'},{cookie});
check('remembered device enters without password',remembered.status===200&&(await remembered.json()).redirect==='/course/thedent/');
check('remembered device refreshes its cookie',(remembered.headers.get('set-cookie')||'').includes('Max-Age=34560000'));
for(const alias of ['/course/%74hedent/course-content.js','/course/%74%68%65%64%65%6e%74/course-content.js','/course/thedent%2fcourse-content.js','/course%2fthedent/course-content.js','/course/%2574hedent/course-content.js','/course/thedent/%63ourse-content.js']){
 for(const session of ['',cookie]){
  const response=await get(alias,session);
  check('encoded alias never reaches static delivery '+alias+' '+Boolean(session),[400,404].includes(response.status));
 }
}
for(const file of COURSE_CONTENT_FILES){
 const response=await get('/course/thedent/'+file,cookie);
 check('authenticated file '+file,response.status===200);
 if(file.endsWith('.md'))check('Markdown download keeps filename '+file,response.headers.get('content-disposition')===`attachment; filename="${file.split('/').pop()}"`);
 check('private no-store '+file,(response.headers.get('cache-control')||'').includes('no-store'));
 const expected=await fs.readFile(new URL('../../course/thedent/'+file,import.meta.url));
 check('exact file '+file,Buffer.from(await response.arrayBuffer()).equals(expected));
 const locked=await get('/course/thedent/'+file);
 check('warm asset still gated '+file,[307,401].includes(locked.status));
}
check('HEAD authenticates',(await get('/course/thedent/resources/clinic-public-source.md','','HEAD')).status===401);
check('HEAD allowed with session',(await get('/course/thedent/resources/clinic-public-source.md',cookie,'HEAD')).status===200);
for(const file of ['../api/course-access.js','%2e%2e%2fapi%2fcourse-access.js','README.md','tests/browser.e2e.mjs'])check('reject invalid file '+file,(await get('/api/course-content?file='+encodeURIComponent(file),cookie)).status===400);
const badCookie=cookie.slice(0,-3)+'abc';check('tampered cookie rejected',(await get('/course/thedent/course-content.js',badCookie)).status===401);
const logout=await post({action:'logout'},{cookie});check('logout clears cookie',logout.status===200&&(logout.headers.get('set-cookie')||'').includes('Max-Age=0'));
console.log(JSON.stringify({checks:count,url:base.href,allPassed:true}));
