/** Actual remote Xircle V3 → scoped Meet. Local browser only; never submits an appointment. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../core7/tests/frontdoor-preview.mjs';
import {RETIRED_ENTRIES} from './route-contract.js';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'xircle-compass-proof-'));
await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),{base}=server;
const report={version:'V3',checks:[],errors:[],screenshots:[],motion:[],base};let browser;
const check=name=>{report.checks.push(name);console.log('PASS '+name);};
async function shot(page,name){await page.screenshot({path:`${output}/${name}.png`,fullPage:true});report.screenshots.push(name+'.png');}
async function pageFor(options={}){
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',...options});
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===base&&request.method()==='GET')return route.continue();
  if(/^https:\/\/fonts\./.test(request.url())||/^(data|blob):/.test(request.url()))return route.continue();
  return route.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 return {context,page};
}
async function scene(page,name){
 await page.locator(`#stage[data-scene="${name}"]`).waitFor({state:'visible'});
 // overflow:hidden can conceal a too-wide grid item even when the page does not scroll.
 assert.equal(await page.locator('#world').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-.5&&r.right<=innerWidth+.5;}),true,`${name}: the whole scene must fit`);
}
async function phase(page,name){await page.locator(`#stage[data-phase="${name}"]`).waitFor({state:'visible'});}
async function play(page,proof){
 await scene(page,'sleep');
 await page.waitForFunction(()=>document.querySelector('#art-hero').naturalWidth>0);
 assert.match(await page.locator('#art-hero').getAttribute('src'),/\/assets\/v3\/hero-800\.webp/);
 assert.equal(await page.locator('#art-hero').isVisible(),true);
 if(proof)await shot(page,`${proof}-opening`);
 await page.locator('[data-sleep="middle"]').click();
 if(proof){await phase(page,'sleep-recorded');assert.equal(await page.locator('#sleep-reveal-value').textContent(),'6:40');}
 await scene(page,'food');
 assert.equal(await page.locator('#record-sleep').textContent(),'6:40');
 await page.waitForFunction(()=>document.querySelector('#capture-photo img').naturalWidth>0);
 const meal=await page.locator('#meal-view').getAttribute('src');
 assert.match(meal,/meal-detail-800\.webp/);
 assert.equal(await page.locator('#capture-photo img').getAttribute('src'),meal);
 await page.locator('#shutter').click();
 if(proof){
  await phase(page,'capturing');
  assert.equal(await page.locator('#capture-photo').isVisible(),true);
  assert.equal(await page.locator('#shutter').isDisabled(),true);
  // After the brief shutter flash, one opaque photograph should remain.
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.camera-view').evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal(await page.locator('#capture-photo').evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal(await page.locator('#meal-view').evaluate(el=>getComputedStyle(el).opacity),'0');
  await shot(page,`${proof}-capture`);
  await phase(page,'docking');
  assert.equal(await page.locator('#meal-stamp').isVisible(),true);
  assert.equal(await page.locator('#record-food').textContent(),'12:30');
  report.motion.push({proof,phases:['sleep-recorded','capturing','docking'],mealRecorded:'12:30'});
 }
 await scene(page,'move');
 await page.locator('[data-move="some"]').click();
 await scene(page,'day');
 assert.equal(await page.locator('#record-count').textContent(),'3 / 3');
 assert.equal(await page.locator('#day-sleep').textContent(),'6:40');
 assert.equal(await page.locator('#day-move').textContent(),'6,100');
 assert.equal(await page.locator('#assembled-day .day-fragment').count(),3);
 assert.equal(await page.locator('#meal-stamp').getAttribute('src'),meal);
 assert.equal(await page.locator('.fragment-food img').getAttribute('src'),meal);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(proof){
  await page.waitForFunction(()=>[...document.querySelectorAll('.day-fragment')].every(el=>el.getAnimations().every(a=>a.playState==='finished')));
  await shot(page,`${proof}-assembled-day`);
 }
 await page.locator('#expand-days').click();
 await scene(page,'pattern');
 assert.equal(await page.locator('.night-film i').count(),7);
 const originalPattern=await page.locator('.pattern-line').getAttribute('d');
 await page.locator('[data-context="work"]').click();
 await scene(page,'human');
 assert.equal(await page.locator('.pattern-line').getAttribute('d'),originalPattern);
 assert.match(await page.locator('#experiment-title').textContent(),/พัก 10 นาที/);
 assert.match(await page.locator('#sample-label').textContent(),/ไม่ใช่ค่าของคุณ/);
 if(proof){
  await page.waitForFunction(()=>[...document.querySelectorAll('.people-reveal figure')].every(el=>el.getAnimations().every(a=>a.playState==='finished')));
  await shot(page,`${proof}-context`);
 }
 await page.locator('#see-yours').click();
 await scene(page,'real');await phase(page,'ready');
 assert.equal(await page.locator('#real-world').isVisible(),true);
 assert.match(await page.locator('#scene-title').textContent(),/เป็นเรื่องของคุณ/);
 assert.match(await page.locator('#book-link').getAttribute('href'),/from=xircle&open=booking/);
 assert.equal(await page.locator('#demo,#start,#register-link,a[download],a[href^="/invite"]').count(),0);
}
try{
 browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true,args:['--no-sandbox']});
 for(const [focus,label] of [['sleep','การพัก'],['move','การขยับ'],['food','มื้ออาหาร']]){
  const {context,page}=await pageFor(focus==='sleep'?{reducedMotion:'no-preference'}:{viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:focus==='food'?'no-preference':'reduce'});
  await page.goto(`${base}/xircle/?entry=compass&focus=${focus}`);
  assert.match(await page.locator('#compass-continuation').textContent(),new RegExp(label));
  assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'/favicon.ico');
  await page.evaluate(()=>{
   localStorage.setItem('mc:xircle:compass-action:v1',JSON.stringify({version:1,action:'eat',savedAt:123}));
   localStorage.setItem('xircle.local.v1',JSON.stringify({firstDayComplete:true,careComplete:true,sentinel:'prior-progress'}));
   sessionStorage.setItem('xircle.session.v1',JSON.stringify({scene:'S7',sentinel:'prior-session'}));
  });
  const legacy=()=>({action:localStorage.getItem('mc:xircle:compass-action:v1'),local:localStorage.getItem('xircle.local.v1'),session:sessionStorage.getItem('xircle.session.v1')});
  const old=await page.evaluate(legacy);
  await play(page,focus==='sleep'?'v3-desktop':focus==='food'?'v3-mobile':null);await shot(page,`xircle-${focus}-complete`);
  assert.equal(new URL(await page.locator('#book-link').getAttribute('href'),base).searchParams.get('focus'),focus);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#book-link').click();
  await page.locator('#booking-root').waitFor({state:'visible'});
  assert.equal(await page.locator('#session-root').getAttribute('data-intent'),'health');
  assert.equal(await page.locator('#session-root').getAttribute('data-entry'),'xircle');
  assert.match(await page.locator('#conversation').innerText(),/ข้อมูล|กิจวัตร/);
  assert.match(await page.locator('#conversation').innerText(),new RegExp(focus==='food'?'การกิน':label));
  await shot(page,`meet-${focus}-handoff`);
  assert.deepEqual(await page.evaluate(legacy),old);
  await page.goBack();await scene(page,'real');
  assert.equal(new URL(page.url()).hash,'#appointment');
  await page.locator('#replay').click();await scene(page,'sleep');
  assert.equal(await page.locator('#record-count').textContent(),'0 / 3');
  await context.close();check(`${focus}: actual V3 six actions → scoped health meeting; back resumes appointment, replay clears only the fictional day, legacy record preserved`);
 }
 for(const query of ['', '?entry=compass&focus=unknown','?entry=compass&focus=__proto__','?entry=compass&focus=constructor','?entry=compass&focus=toString','?entry=compass&focus=sleep&focus=food','?entry=compass&entry=other&focus=sleep']){
  const {context,page}=await pageFor({viewport:{width:320,height:568}});await page.goto(base+'/xircle/'+query);
  await scene(page,'sleep');
  const href=await page.locator('#book-link').getAttribute('href');assert.equal(new URL(href,base).searchParams.has('focus'),false);
  if(!query||query.includes('entry=other'))assert.equal(await page.locator('#compass-continuation').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
 }
 check('default and malformed/duplicate acquisition inputs do not fabricate personal focus; 320px entry fits');
 const discarded=await pageFor();
 await discarded.page.goto(base+'/xircle/?entry=compass&focus=sleep');
 const oldDraft={savedAt:Date.now(),step:3,schedulePart:'time',scheduleWeek:null,intent:'ai',aiTopic:'team',mode:'ออนไลน์',day:'flexible',time:'เวลาไหนก็ได้',name:'discarded-draft-name',contact:'discarded-draft-contact',note:'discarded-draft-note'};
 await discarded.page.evaluate(value=>localStorage.setItem('myclover.meet.draft.v1',JSON.stringify(value)),oldDraft);
 await discarded.page.goto(base+'/meet/?intent=health&from=xircle&open=booking&focus=sleep');
 await discarded.page.locator('#booking-root').waitFor({state:'visible'});
 assert.match(await discarded.page.locator('#conversation').innerText(),/คุณมีคำขอนัดที่เริ่มไว้/);
 await discarded.page.locator('#booking-close').click();
 await discarded.page.locator('#booking-root').waitFor({state:'hidden'});
 await discarded.page.locator('.draft-resume').getByRole('button',{name:'เริ่มใหม่',exact:true}).click();
 assert.equal(await discarded.page.evaluate(()=>localStorage.getItem('myclover.meet.draft.v1')),null);
 assert.equal(await discarded.page.locator('.draft-resume').count(),0);
 await discarded.page.locator('.value-cta').click();
 await discarded.page.locator('#booking-root').waitFor({state:'visible'});
 const reopened=await discarded.page.locator('#conversation').innerText();
 assert.match(reopened,/อยากเริ่มเจอกันแบบไหน/);
 assert.doesNotMatch(reopened,/คุณมีคำขอนัดที่เริ่มไว้|ลงนัดเดิมต่อ|discarded-draft-/);
 assert.equal(await discarded.page.getByRole('button',{name:/^ลงนัดเดิมต่อ/}).count(),0);
 assert.equal(await discarded.page.locator('#session-root').getAttribute('data-intent'),'health');
 assert.equal(await discarded.page.evaluate(()=>localStorage.getItem('myclover.meet.draft.v1')),null);
 await discarded.context.close();
 check('discarding an existing draft after closing the Xircle choice cannot resurrect old answers on reopening');
 for(const focus of ['unknown','__proto__','constructor','toString']){
  const malformed=await pageFor();
  await malformed.page.goto(base+'/meet/?intent=health&from=xircle&open=booking&focus='+focus);
  await malformed.page.locator('#booking-root').waitFor({state:'visible'});
  const conversation=await malformed.page.locator('#conversation').innerText();
  assert.match(conversation,/ดูข้อมูล XIRCLE และกิจวัตรกับทีม \+ เอโกะ/);
  assert.doesNotMatch(conversation,/จากที่คุณอยากเริ่มดูแลเรื่อง|\[object Object\]|native code/);
  await malformed.context.close();
 }
 check('unknown and prototype focus values keep the generic scoped Xircle meeting copy');
 const {context,page}=await pageFor();await page.goto(base+'/xircle/?entry=compass&focus=sleep&invite=12345');
 assert.equal(await page.locator('#legacy-invite').getAttribute('href'),'https://teambook.me/join/?c=12345');await context.close();
 check('legacy explicit invitation remains reachable without redirecting V3');
 const blocked=await pageFor({viewport:{width:320,height:568}});await blocked.context.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw Error('blocked')}});Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}});});
 await blocked.page.goto(base+'/xircle/?entry=compass&focus=move');await play(blocked.page);await blocked.page.locator('#book-link').click();await blocked.page.locator('#booking-root').waitFor({state:'visible'});await blocked.context.close();
 check('storage unavailable keeps the complete demo and actual meeting link usable');
 for(const route of RETIRED_ENTRIES){
  const {context,page}=await pageFor({viewport:{width:390,height:844}});
  await page.goto(base+'/xircle/');
  const original=JSON.stringify({firstDayCompletedV10:false,journeyCompleted:false,sentinel:'preserve-old-state',xtyHandoff:{partyCode:'54321',receivedAt:Date.now()}});
  await page.evaluate(value=>localStorage.setItem('xircle.local.v1',value),original);
  const requested=[];page.on('request',r=>requested.push(r.url()));
  await page.goto(`${base}/xircle/${route}/?entry=compass&focus=food`);
  await page.waitForURL(url=>url.pathname==='/xircle/');
  await page.locator('#legacy-invite').waitFor({state:'visible'});
  assert.equal(await page.locator('#legacy-invite').getAttribute('href'),'https://teambook.me/join/?c=54321');
  assert.match(await page.locator('#compass-continuation').textContent(),/มื้ออาหาร/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('xircle.local.v1')),original);
  assert.equal(requested.some(url=>/\/(state|story-v6|v3|v4|v5|playable|experience-v1|experience-v2|experience)\.js/.test(url)),false);
  assert.equal(requested.some(url=>/\/experience-v3\.js/.test(url)),true);
  await scene(page,['circle','care/party','explore'].includes(route)?'real':'sleep');
  await context.close();
 }
 check('all eight retired entrances reach the single current experience, preserving saved invitations and old progress without loading old engines');
 const creator=await pageFor();await creator.page.goto(base+'/xircle/');
 const savedInvite=JSON.stringify({sentinel:'keep-invite',xtyHandoff:{partyCode:'54321',receivedAt:Date.now()}});
 await creator.page.evaluate(value=>localStorage.setItem('xircle.local.v1',value),savedInvite);
 await creator.page.goto(base+'/xircle/care/party/?mode=create');
 await creator.page.waitForURL(url=>url.pathname==='/xircle/'&&url.search==='?notebook=create');
 await creator.page.locator('#legacy-invite').waitFor({state:'visible'});
 assert.equal(await creator.page.locator('#legacy-invite').getAttribute('href'),'https://teambook.me/new/?template=xircle_xvisor');
 assert.equal(await creator.page.locator('#legacy-invite').innerText(),'เปิดสมุดของคุณ ↗');
 assert.equal(await creator.page.evaluate(()=>localStorage.getItem('xircle.local.v1')),savedInvite);
 await creator.page.goto(base+'/xircle/');
 assert.equal(await creator.page.locator('#legacy-invite').getAttribute('href'),'https://teambook.me/join/?c=54321');
 await creator.context.close();check('explicit creation opens a new notebook; the existing saved invitation remains available on a later normal visit');
 for(const route of ['learn','learn/topic','hardware','products','doc']){
  const {context,page}=await pageFor({viewport:{width:390,height:844}});await page.goto(base+'/xircle/');
  const original='{"firstDayCompletedV10":false,"journeyCompleted":false}';await page.evaluate(value=>localStorage.setItem('xircle.local.v1',value),original);
  await page.goto(`${base}/xircle/${route}/`);await page.locator('.xp-nav a').filter({hasText:'นัดคุย'}).waitFor();
  assert.equal(new URL(page.url()).pathname,`/xircle/${route}/`);
  assert.equal(await page.evaluate(()=>localStorage.getItem('xircle.local.v1')),original);
  assert.equal((await page.locator('h1').innerText()).trim().length>0,true);
  if(['hardware','products'].includes(route))await page.locator('img[data-art-src]').waitFor({state:'visible'});
  if(route==='products')assert.equal(await page.getByRole('link',{name:/กลับสู่ RoutineX/}).getAttribute('href'),'/xircle/doc/routinex/');
  if(route.startsWith('learn'))assert.equal(await page.getByRole('link',{name:'กลับไป XIRCLE',exact:true}).getAttribute('href'),'/xircle/');
  await context.close();
 }
 check('all five reference entrances remain readable without an old completion gate or legacy writes');
 const alias=await pageFor({viewport:{width:390,height:844}});await alias.page.goto(base+'/Xircle/?entry=compass&focus=sleep');await play(alias.page);
 assert.equal(new URL(alias.page.url()).pathname,'/xircle/');
 assert.equal(await alias.page.locator('#register-link,a[download],a[href^="/invite"]').count(),0);
 await shot(alias.page,'single-current-xircle-mobile');await alias.context.close();
 check('shared uppercase URL opens the same V3 and ends with an appointment, without a registration or download detour');
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(`${output}/proof.json`,JSON.stringify(report,null,2));await browser?.close();await server.close();}
