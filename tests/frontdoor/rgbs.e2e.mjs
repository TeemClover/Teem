/** Real browser, isolated local D1, original Pages handler. Never contacts external APIs. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../../core7/tests/frontdoor-preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'seed-v6-proof-'));await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),{base,mf}=server,db=await mf.getD1Database('DB');
const report={checks:[],errors:[],screenshots:[],base};let browser;
const check=s=>{report.checks.push(s);console.log('PASS '+s);};
async function shot(p,name){await p.screenshot({path:`${output}/${name}.png`});report.screenshots.push(name+'.png');}
async function context(options={}){const c=await browser.newContext({viewport:{width:1440,height:900},...options});await c.route('**/*',r=>r.request().url().startsWith(base)||/^https:\/\/fonts\./.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());c.on('page',p=>p.on('pageerror',e=>report.errors.push(e.message)));return c;}
async function begin(p){await p.goto(base+'/frontdoor/');await p.locator('#pickup').click();await p.locator('#continue-discovery').waitFor({state:'visible'});await p.locator('#continue-discovery').click();}
async function bank(p,color){await p.locator(`[data-answer="${color}"]`).click();await p.locator('#cross-seed').waitFor({state:'visible'});await p.waitForFunction(()=>!document.body.classList.contains('path-assembling'));}
async function cross(p){await p.locator('#cross-seed').click();await p.locator('#seed-reward > section').waitFor({state:'visible'});await p.waitForFunction(()=>!document.body.classList.contains('path-assembling'));}
async function complete(p,color){
 if(color==='silver'){await p.locator('[data-collection=garden]').click();await p.getByRole('button',{name:'ให้ภาพนำ',exact:true}).click();await p.locator('.seed-craft-edit summary').click();await p.getByLabel('ชื่อบนหน้าเว็บ',{exact:true}).fill('พื้นที่จากมือฉัน');await p.getByRole('button',{name:'ใช้ชื่อนี้',exact:true}).click();}
 if(color==='red')await p.getByRole('button',{name:'สด เปรี้ยว กรอบ',exact:true}).click();
 if(color==='green'){await p.getByRole('button',{name:'การพัก',exact:true}).click();await p.getByRole('button',{name:'หลังแปรงฟันคืนนี้',exact:true}).click();}
 if(color==='blue'){await p.getByRole('button',{name:'ช่วยทีมทำงาน',exact:true}).click();await p.getByRole('button',{name:'10 นาที',exact:true}).click();}
 await p.locator('#open-path').waitFor({state:'visible'});
}
try{
 browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true,args:['--no-sandbox']});
 const c=await context(),p=await c.newPage();await begin(p);await shot(p,'rgbs-question-desktop');
 await p.evaluate(()=>window.originalWorld=['.world','#instrument','#underpaper','#paper-crossing','video'].map(s=>document.querySelector(s)));
 await bank(p,'silver');await shot(p,'silver-bank-desktop');const install=await p.evaluate(()=>localStorage.getItem('c7:install_id'));await p.waitForTimeout(250);
 assert.equal((await db.prepare("SELECT COUNT(*) count FROM fd_v2_events WHERE install_id=? AND event_name='DOOR_FOUND'").bind(install).first()).count,0);
 await p.locator('#save-path').click();await p.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();await cross(p);assert.equal(await p.locator('#save-path').textContent(),'เก็บสิ่งที่เจอไว้');
 await complete(p,'silver');await shot(p,'silver-built-desktop');assert.equal(await p.locator('.seed-reward-preview h4').textContent(),'พื้นที่จากมือฉัน');
 assert.equal(await p.evaluate(()=>window.originalWorld.every((n,i)=>n===document.querySelector(['.world','#instrument','#underpaper','#paper-crossing','video'][i]))),true);
 await p.locator('#save-path').click();await p.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();const prior=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes('seed:v6:')).map(k=>[k,localStorage.getItem(k)])));
 await p.reload();await p.locator('[data-answer="resume"]').click();await p.locator('.seed-craft-edit summary').click();await p.getByLabel('ชื่อบนหน้าเว็บ',{exact:true}).waitFor();assert.equal(await p.getByLabel('ชื่อบนหน้าเว็บ',{exact:true}).inputValue(),'พื้นที่จากมือฉัน');assert.equal(await p.locator('.seed-reward-preview').getAttribute('data-design'),'signal');
 assert.equal(await p.locator('#pickup').isVisible(),false);await shot(p,'saved-work-return-desktop');
 assert.equal(await p.locator('#seed-exhibit .seed-reward-preview').count(),1);
 await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.querySelector('#seed-reward .seed-reward-preview'));assert.equal(await p.locator('#seed-reward .seed-reward-preview').count(),1);
 await p.setViewportSize({width:1440,height:900});await p.waitForFunction(()=>document.querySelector('#seed-exhibit .seed-reward-preview'));
 const newTabHref=await p.locator('#open-path').getAttribute('href');assert.match(newTabHref,/work=h-/);
 const workTab=await c.newPage();await workTab.goto(base+newTabHref);await workTab.locator('#compass-craft-code').waitFor({state:'attached'});assert.match(await workTab.locator('#compass-craft-code').inputValue(),/พื้นที่จากมือฉัน/);await workTab.close();
 await p.locator('#open-path').click();await p.getByText('อยากดูข้างใน? เปิดโค้ดของเว็บนี้',{exact:true}).click();await p.locator('#compass-craft-code').waitFor();
 assert.match(await p.locator('#compass-craft-code').inputValue(),/พื้นที่จากมือฉัน/);
 await p.locator('#compass-craft-code').fill('<!doctype html><html lang="th"><body><h1>ข้ามมาแล้วสร้างต่อได้</h1></body></html>');
 await p.getByRole('button',{name:'เปิดดูชิ้นที่แก้แล้ว',exact:true}).click();
 await p.frameLocator('#compass-craft-frame').getByText('ข้ามมาแล้วสร้างต่อได้').waitFor();await shot(p,'craft-real-dungeon-continuation');
 await p.goto(base+'/frontdoor/');await p.locator('[data-answer="resume"]').click();
 check('same world survives RGBS → crossing → actual editable work; saved work restores, adapts viewport, and carries into real Dungeon HTML rendering');
 await p.locator('#rebuild-path').click();assert.deepEqual(await p.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(prior)),prior);await bank(p,'blue');await cross(p);await complete(p,'blue');assert.match(await p.locator('#open-path').getAttribute('href'),/intent=ai&topic=team/);await p.locator('#open-path').click();await p.locator('#booking-root').waitFor({state:'visible'});assert.equal(await p.locator('#session-root').getAttribute('data-intent'),'ai');await shot(p,'ai-team-handoff-desktop');await c.close();
 check('REBUILD preserves earlier work; MIND scenario continues directly to the relevant AI meeting purpose');
 for(const color of ['red','green','blue','silver']){
  const ctx=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage();await begin(page);await bank(page,color);await shot(page,`${color}-bank-mobile`);await cross(page);await complete(page,color);await shot(page,`${color}-reward-mobile`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#save-path').isEnabled(),true);
  const href=await page.locator('#open-path').getAttribute('href');assert.match(href,{red:/^\/ako\//,green:/^\/xircle\//,blue:/intent=ai/,silver:/dungeon/}[color]);
  if(color==='green'){await page.locator('#open-path').click();await page.locator('#stage[data-scene="sleep"]').waitFor();assert.match(await page.locator('#compass-continuation').textContent(),/การพัก/);assert.match(await page.locator('#art-hero').getAttribute('src'),/\/assets\/v3\/hero-800\.webp/);assert.equal(await page.locator('#demo').count(),0);}
  if(color==='red'){await page.locator('#open-path').click();await page.waitForURL(u=>u.pathname==='/ako/');assert.equal((await page.locator('h1').innerText()).length>0,true);}
  if(color==='blue'){await page.getByRole('button',{name:'เปลี่ยนเรื่อง',exact:true}).click();await page.getByRole('button',{name:'เริ่มเรียน AI',exact:true}).click();assert.equal(await page.locator('#open-path').isVisible(),false);}
  await ctx.close();
 }
 check('all four RGBS wishes have actual distinct rewards and truthful destinations on mobile; changing an unfinished reward hides old continuation');
 const blocked=await context({viewport:{width:320,height:568},reducedMotion:'reduce'});await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('storage unavailable')}});Object.defineProperty(window,'sessionStorage',{get(){throw Error('storage unavailable')}});});
 const bp=await blocked.newPage();await begin(bp);await bank(bp,'green');await cross(bp);await complete(bp,'green');await bp.locator('#save-path').click();await bp.getByText('เครื่องนี้ยังเก็บให้ไม่ได้ แต่สิ่งที่ทำยังอยู่ และเล่นต่อได้').waitFor();assert.equal(await bp.locator('#open-path').isVisible(),true);assert.equal(await bp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot(bp,'storage-unavailable-320');await blocked.close();
 check('small mobile and blocked storage keep reward/navigation usable without a false durable save');
 const later=await context({reducedMotion:'reduce'});await later.addInitScript(()=>{if(location.protocol!=='http:')return;const real=Date.now.bind(Date),offset=Number(sessionStorage.getItem('audit-offset')??-2400000);Date.now=()=>real()+offset;});
 const lp=await later.newPage();await begin(lp);await bank(lp,'green');await cross(lp);await complete(lp,'green');await lp.locator('#save-path').click();const laterId=await lp.evaluate(()=>localStorage.getItem('c7:install_id'));await lp.reload();await lp.locator('[data-answer="resume"]').click();await lp.evaluate(()=>sessionStorage.setItem('audit-offset','0'));await lp.goto(base+'/frontdoor/?from=qr');await lp.locator('[data-answer="resume"]').click();await lp.waitForTimeout(500);
 assert.deepEqual((await db.prepare("SELECT event_name,COUNT(*) count FROM fd_v2_events WHERE install_id=? AND event_name IN ('RETURN','RESUME') GROUP BY event_name").bind(laterId).all()).results,[{event_name:'RESUME',count:1},{event_name:'RETURN',count:1}]);await later.close();
 check('saved V6 refresh remains ordinary; later qualifying navigation and explicit continue record one RETURN/RESUME');
 const recovery=await context({reducedMotion:'reduce'}),rp=await recovery.newPage();await begin(rp);await recovery.route('**/frontdoor/art/seed-red-ako-v2*.webp',r=>r.abort());await rp.locator('[data-answer="red"]').click();await rp.locator('#retry-assembly').waitFor({state:'visible'});await recovery.unroute('**/frontdoor/art/seed-red-ako-v2*.webp');await rp.locator('#retry-assembly').click();await rp.locator('#cross-seed').waitFor({state:'visible'});await cross(rp);await complete(rp,'red');await recovery.close();
 check('missing bank image has a retry that preserves the chosen wish and recovers without a blank route');
 const legacyCtx=await context({reducedMotion:'reduce'}),legacyPage=await legacyCtx.newPage();await legacyPage.goto(base+'/frontdoor/legacy-fixture');
 await legacyPage.evaluate(async()=>{const {createTelemetry}=await import('/assets/front-door/telemetry.js'),{prototypeStorage}=await import('/frontdoor/flow.js'),{savePath}=await import('/frontdoor/compass-path.js');const s=prototypeStorage(localStorage),t=createTelemetry({storage:s,sessionStorage:prototypeStorage(sessionStorage),enabled:false,window:null,document:null});t.open();savePath(t,s,{wish:'care',answer:'notice'},'cp-legacy-fixture');t.dispose();});
 await legacyPage.goto(base+'/frontdoor/');await legacyPage.locator('[data-answer="resume"]').click();assert.match(await legacyPage.locator('#open-path').getAttribute('href'),/^\/xircle\/\?entry=compass&fdh=h-/);await legacyPage.locator('#rebuild-path').click();assert.equal(await legacyPage.locator('.seed-choice').count(),4);await legacyCtx.close();
 check('previous six-pair checkpoint opens its original destination and can start a V6 journey without losing its record');
 await p?.close().catch(()=>{});await new Promise(r=>setTimeout(r,600));
 report.events=(await db.prepare('SELECT event_name,COUNT(*) count FROM fd_v2_events GROUP BY event_name').all()).results;
 report.prodRows=(await db.prepare("SELECT COUNT(*) count FROM fd_v2_events WHERE env='prod'").first()).count;assert.equal(report.prodRows,0);
 const stat=await context({httpCredentials:{username:'teem',password:'local-fixture-only'}}),sp=await stat.newPage();await sp.goto(base+'/stat/frontdoor/');await sp.locator('#dashboard').waitFor({state:'visible'});assert.equal(await sp.locator('#environment').textContent(),'LOCAL');const expectedOpen=(await db.prepare("SELECT COUNT(DISTINCT install_id) count FROM fd_v2_events WHERE env='local' AND event_name='FRONTDOOR_OPEN'").first()).count;assert.equal(Number((await sp.locator('[data-event=FRONTDOOR_OPEN] .kpi-value').textContent()).replace(/,/g,'')),expectedOpen);await shot(sp,'stat-v6-local');
 assert.equal(report.errors.length,0,report.errors.join('\n'));check('real browser events validated/persisted in local D1; protected Stat renders and no production rows or page errors');await stat.close();
}finally{await writeFile(`${output}/proof.json`,JSON.stringify(report,null,2));await browser?.close();await server.close();}
