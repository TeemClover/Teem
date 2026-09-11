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
const login=await post({project:'thedent',password});check('valid password accepted',login.status===200);
const setCookie=login.headers.get('set-cookie')||'';check('cookie protections',['HttpOnly','Secure','SameSite=Lax','Path=/'].every(value=>setCookie.includes(value)));
const cookie=setCookie.split(';')[0];
check('login targets relocated room',(await login.json()).redirect==='/course/thedent/');
for(const file of COURSE_CONTENT_FILES){
 const response=await get('/course/thedent/'+file,cookie);
 check('authenticated file '+file,response.status===200);
 check('private no-store '+file,(response.headers.get('cache-control')||'').includes('no-store'));
 const expected=await fs.readFile(new URL('../../course/thedent/'+file,import.meta.url));
 check('exact file '+file,Buffer.from(await response.arrayBuffer()).equals(expected));
 const locked=await get('/course/thedent/'+file);
 check('warm asset still gated '+file,[307,401].includes(locked.status));
}
check('HEAD authenticates',(await get('/course/thedent/resources/daily-normal.csv','','HEAD')).status===401);
check('HEAD allowed with session',(await get('/course/thedent/resources/daily-normal.csv',cookie,'HEAD')).status===200);
for(const file of ['../api/course-access.js','%2e%2e%2fapi%2fcourse-access.js','README.md','tests/browser.e2e.mjs'])check('reject invalid file '+file,(await get('/api/course-content?file='+encodeURIComponent(file),cookie)).status===400);
const badCookie=cookie.slice(0,-3)+'abc';check('tampered cookie rejected',(await get('/course/thedent/course-content.js',badCookie)).status===401);
const logout=await post({action:'logout'},{cookie});check('logout clears cookie',logout.status===200&&(logout.headers.get('set-cookie')||'').includes('Max-Age=0'));
console.log(JSON.stringify({checks:count,url:base.href,allPassed:true}));
