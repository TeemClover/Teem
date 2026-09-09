/** Actual staged video, canvas and DOM effects. Isolated local API/D1; no deployment. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../../core7/tests/frontdoor-preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'frontdoor-motion-'));
await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),{base}=server;
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={checks:[],errors:[],screenshots:[],base};
const check=message=>{report.checks.push(message);console.log('PASS '+message);};
async function context(options={}){
 const c=await browser.newContext({viewport:{width:1440,height:900},...options});
 await c.route('**/*',route=>route.request().url().startsWith(base)||/^(data|blob):/.test(route.request().url())?route.continue():route.abort());
 await c.addInitScript(()=>{
  window.motionFilmPlays=0;
  document.addEventListener('play',event=>{if(event.target.id==='opening-film')window.motionFilmPlays++;},true);
 });
 c.on('page',page=>page.on('pageerror',error=>report.errors.push(error.message)));
 return c;
}
async function screenshot(page,name){await page.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');}
const pixels=page=>page.locator('#underpaper').evaluate(canvas=>canvas.toDataURL());
async function toggle(page,enabled){
 if(await page.locator('#motion-toggle').getAttribute('aria-pressed')!==String(enabled))await page.locator('#motion-toggle').click();
 assert.equal(await page.locator('body').getAttribute('data-motion'),enabled?'full':'reduced');
 assert.equal(await page.locator('#motion-toggle').textContent(),enabled?'เอฟเฟกต์: เปิด':'เอฟเฟกต์: ปิด');
}
try{
 const c=await context(),page=await c.newPage();
 await page.goto(base+'/frontdoor/');
 await page.waitForFunction(()=>document.querySelector('#opening-film').dataset.stage==='playing');
 await toggle(page,false);const stopped=await page.locator('#opening-film').evaluate(v=>v.currentTime);
 await page.waitForTimeout(450);
 assert.ok(Math.abs(await page.locator('#opening-film').evaluate(v=>v.currentTime)-stopped)<.08,'Effects off pauses the unfinished staging');
 await toggle(page,true);await page.waitForFunction(()=>document.querySelector('#opening-film').dataset.stage==='held');
 const plays=await page.evaluate(()=>window.motionFilmPlays),rest=await page.locator('#pickup').boundingBox();
 for(let i=0;i<3;i++){await toggle(page,false);await toggle(page,true);}
 await page.waitForTimeout(1400);
 assert.equal(await page.evaluate(()=>window.motionFilmPlays),plays,'Effects cannot replay a completed film');
 assert.equal(await page.locator('#opening-film').evaluate(v=>v.paused),true);
 assert.deepEqual(await page.locator('#pickup').boundingBox(),rest,'The rest artifact keeps its physical pickup geometry');
 await screenshot(page,'held-compass-effects-on');
 check('Opening pauses/resumes only while unfinished; completed Compass stays held across three effects toggles, with no one-second replay');

 await page.locator('#pickup').click();await page.locator('#continue-discovery').waitFor({state:'visible'});
 await page.waitForTimeout(450);
 assert.equal(await page.locator('#underpaper').evaluate(canvas=>!canvas.hidden),true,'WebGL renderer is available for pixel motion checks');
 const moving=await pixels(page);await page.waitForTimeout(450);assert.notEqual(await pixels(page),moving,'River has actual changing pixels');
 await toggle(page,false);await page.waitForTimeout(160);const frozen=await pixels(page);
 await page.waitForTimeout(450);assert.equal(await pixels(page),frozen,'Effects off freezes the rendered river');
 await toggle(page,true);await page.waitForTimeout(250);assert.notEqual(await pixels(page),frozen,'Effects on wakes the river without restarting discovery');
 assert.equal(await page.locator('#opening-film').getAttribute('data-stage'),'held');
 check('After pickup effects control actual water pixels, while the original opening film remains held');

 // Headless Chrome treats all automation tabs as visible. Exercise the native
 // visibilitychange listener with a controlled document visibility fixture.
 // Do not claim this fixture tests iPhone/background-tab browser scheduling.
 await page.evaluate(()=>{
  window.motionHidden=false;
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.motionHidden});
  window.setMotionVisibility=hidden=>{window.motionHidden=hidden;document.dispatchEvent(new Event('visibilitychange'));};
  window.setMotionVisibility(true);
 });
 const hidden=await pixels(page);await page.waitForTimeout(400);assert.equal(await pixels(page),hidden);
 assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('motion-hidden')),true);
 await page.evaluate(()=>window.setMotionVisibility(false));await page.waitForTimeout(350);assert.notEqual(await pixels(page),hidden);
 assert.equal(await page.locator('#opening-film').getAttribute('data-stage'),'held');
 check('Browser document-visibility fixture suspends and resumes canvas/CSS lifecycle without film replay (real background scheduling remains device QA)');

 await page.waitForTimeout(30700);const idle=await pixels(page);await page.waitForTimeout(200);assert.equal(await pixels(page),idle);
 await toggle(page,false);await toggle(page,true);await page.waitForTimeout(350);assert.notEqual(await pixels(page),idle);
 check('After a real 30-second idle, effects re-enable wakes the water renderer');

 await toggle(page,false);await page.locator('#continue-discovery').click();await page.locator('[data-answer=green]').click();
 await page.locator('#cross-seed').waitFor({state:'visible'});await page.locator('#cross-seed').click();
 await page.getByRole('button',{name:'การพัก',exact:true}).click();await page.getByRole('button',{name:'หลังแปรงฟันคืนนี้',exact:true}).click();
 await page.locator('#open-path').waitFor({state:'visible'});
 assert.equal(await page.locator('.seed-reward-rhythm').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.locator('#save-path').click();await page.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();
 await screenshot(page,'green-complete-effects-off');
 await page.reload();await page.locator('[data-answer=resume]').click();await page.locator('#open-path').waitFor({state:'visible'});
 assert.equal(await page.locator('#pickup').isVisible(),false);
 assert.equal(await page.locator('#opening-film').getAttribute('src'),null,'Returning visitor never downloads/replays opening');
 await toggle(page,false);await toggle(page,true);assert.equal(await page.evaluate(()=>window.motionFilmPlays),0);
 check('Effects-off preserves complete green path, durable Save/Resume and returning visitors bypass all opening-film replay');
 await c.close();

 const mobile=await context({viewport:{width:390,height:844},reducedMotion:'reduce',isMobile:true,hasTouch:true}),mp=await mobile.newPage();
 await mp.goto(base+'/frontdoor/');await mp.waitForFunction(()=>document.body.dataset.runtimeReady==='true');
 assert.equal(await mp.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
 assert.equal(await mp.locator('#opening-film').getAttribute('src'),null);
 await toggle(mp,true);await mp.waitForFunction(()=>document.querySelector('#opening-film').dataset.stage==='held');
 assert.equal(await mp.locator('.artifact').evaluate(el=>getComputedStyle(el).transitionDuration),'0.7s','Explicit motion preference can override OS preference');
 await toggle(mp,false);await mp.locator('#pickup').click();await mp.locator('#continue-discovery').waitFor({state:'visible'});
 await mp.locator('#continue-discovery').click();await mp.locator('[data-answer=green]').click();await mp.locator('#cross-seed').waitFor({state:'visible'});
 assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await screenshot(mp,'mobile-reduced-green');
 check('390px reduced-motion starts without video; explicit enable works, disabling again preserves immediate discovery and complete assembly without horizontal overflow');
 await mobile.close();assert.deepEqual(report.errors,[]);
}finally{
 await writeFile(path.join(output,'proof.json'),JSON.stringify(report,null,2));
 await browser.close();await server.close();
}
