/** Lesson 5 drafts and Lesson 6 secret-stage / offline-output regression. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const {chromium}=await import(process.env.FRONTDOOR_PLAYWRIGHT ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const output=process.env.CLASSROOM_PROOF_DIR || await mkdtemp(path.join(tmpdir(),'classroom-lesson56-'));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const server=createServer(async(req,res)=>{try{
  let filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!filename.startsWith(root)||path.relative(root,filename).split(path.sep).some(p=>p.startsWith('.')))throw Error('invalid');
  if((await stat(filename)).isDirectory())filename=path.join(filename,'index.html');
  res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream'});res.end(await readFile(filename));
}catch{res.writeHead(404);res.end('Not found')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.CLASSROOM_BASE_URL || `http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={base,checks:[],errors:[],measurements:{}};
function pass(name){report.checks.push(name);console.log('PASS',name)}
async function makePage(slug,{prior='',reduced=false,width=390}={}){
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,reducedMotion:reduced?'reduce':'no-preference',acceptDownloads:true});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/api/'))return r.fulfill({json:{ok:true,reviews:[]}});return u.origin===base?r.continue():r.abort()});
  await ctx.addInitScript(({prior})=>{
    if(!sessionStorage.getItem('qa-initialized')){
      localStorage.setItem('mc_learn',prior);localStorage.removeItem('mc_learn_done');localStorage.setItem('mc_boss_invite','1');sessionStorage.setItem('qa-initialized','1');
    }
    window.__copied=[];
    window.__audioContexts=0;
    if(window.AudioContext){
      const NativeAudioContext=window.AudioContext;
      window.AudioContext=class extends NativeAudioContext{constructor(...args){super(...args);window.__audioContexts++;}};
    }
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied.push(text)},configurable:true});
    window.__signalAt=0;
    new MutationObserver(records=>{
      if(records.some(r=>r.target.id==='lesson6Signal'&&r.attributeName==='hidden'&&!r.target.hidden)&&!window.__signalAt)window.__signalAt=performance.now();
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['hidden']});
  },{prior});
  const page=await ctx.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>report.errors.push({slug,error:e.message}));
  await page.goto(base+'/classroom/'+slug+'.html',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1400);
  assert.ok((await page.locator('body').innerText()).length>100);
  return page;
}
async function showSignal(page){await page.locator('#glitchTrigger').evaluate(el=>el.scrollIntoView({block:'center'}));await page.locator('#lesson6Signal').waitFor({state:'visible'})}
try{
  for(const width of [390,1440]){
    const page=await makePage('prompts',{width});
    await page.locator('[data-prompt-pick="reply"]').click();
    const card=page.locator('#results .pc[data-id="reply"]');
    const input=card.locator('[data-k]').first();
    await input.fill('เก็บร่างนี้ไว้ QA');
    await page.keyboard.press('Escape');
    await card.locator('[data-act="use"]').click();
    assert.equal(await input.inputValue(),'เก็บร่างนี้ไว้ QA');
    await page.locator('[data-prompt-pick="meeting"]').click();
    await page.locator('#results .pc[data-id="meeting"] [data-k]').first().fill('ร่างประชุม QA');
    await page.locator('[data-prompt-pick="reply"]').click();
    assert.equal(await input.inputValue(),'เก็บร่างนี้ไว้ QA');
    await page.locator('#q').fill('zzzz-no-matching-prompt-12345');
    await page.waitForFunction(()=>document.querySelectorAll('#results .pc').length===0);
    await page.locator('[data-prompt-pick="reply"]').click();
    assert.equal(await input.inputValue(),'เก็บร่างนี้ไว้ QA');
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1400);
    await page.locator('[data-prompt-pick="reply"]').click();
    assert.equal(await input.inputValue(),'เก็บร่างนี้ไว้ QA');
    await card.locator('[data-act="clear"]').click();
    assert.equal(await input.inputValue(),'');
    await page.keyboard.press('Escape');await card.locator('[data-act="use"]').click();
    assert.equal(await input.inputValue(),'');
    await page.locator('[data-prompt-pick="meeting"]').click();
    assert.equal(await page.locator('#results .pc[data-id="meeting"] [data-k]').first().inputValue(),'ร่างประชุม QA');
    await page.locator('#promptExample summary').click();
    assert.match(await page.locator('#promptExample').innerText(),/วันส่ง.*วันรับ/s);
    await page.locator('#promptPractice').screenshot({path:path.join(output,`lesson5-practice-${width}.png`)});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    pass(`${width}px L5 draft persists close/reopen, another recipe, search and reload; reset clears only current recipe; curated choices/example usable`);
    await page.context().close();
  }
  for(const prior of ['', 'free-ai,image-ai']){
    const page=await makePage('first-web',{prior});
    await showSignal(page);
    assert.equal(await page.locator('.lesson6-signal__continue').isEnabled(),true);
    assert.equal(await page.evaluate(()=>window.__audioContexts),0,'No sound may start on the automatic surprise');
    const dt=await page.evaluate(()=>performance.now()-window.__signalAt);
    await page.locator('.lesson6-signal__continue').click();
    assert.equal(await page.evaluate(()=>window.__audioContexts),1,'Portal sound starts once after Continue gesture');
    assert.equal(await page.locator('#lesson6Signal').isVisible(),false);
    const target=prior?'#bossDoor':'#bossLock';
    assert.equal(await page.locator(target).isVisible(),true);
    assert.equal(await page.evaluate(()=>document.querySelector('main').inert),false);
    assert.equal(await page.evaluate(()=>document.activeElement.closest('#bossDoor,#bossLock')?.id),target.slice(1));
    if(!prior)assert.match(await page.locator('#bossLock').innerText(),/3 จาก 6/);
    else assert.equal(await page.locator('#bossDoor .boss-go').getAttribute('href'),'/classroom/dungeon/');
    report.measurements[`continue-${prior?'unlocked':'locked'}-ms`]=Math.round(dt);
    await page.waitForTimeout(2200);
    assert.equal(await page.locator('#lesson6Signal').isVisible(),false);
    assert.equal(await page.locator('.lesson6-noise').evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length),0);
    await page.locator(target).screenshot({path:path.join(output,`lesson6-${prior?'unlocked':'locked'}.png`)});
    pass(`L6 automatic entrance with ${prior?2:0} prior lessons; gesture-only sound; immediate Continue (${Math.round(dt)} ms), ${prior?'open':'locked'} portal, focus restored, finite after-effects`);
    await page.context().close();
  }
  {
    const page=await makePage('first-web',{prior:'free-ai,image-ai'});
    await showSignal(page);
    assert.equal(await page.evaluate(()=>document.activeElement.className),'lesson6-signal__continue');
    await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'lesson6-signal__back');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'lesson6-signal__continue');
    await page.waitForTimeout(1800);
    await page.screenshot({path:path.join(output,'lesson6-signal-ready.png')});
    assert.equal(await page.locator('#lesson6Signal').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lesson6Signal').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'cl-completion');
    assert.equal(await page.evaluate(()=>document.querySelector('main').inert),false);
    pass('L6 keyboard focus trap cycles both buttons; finite signal animation; Escape returns focus to integrated completion');
    await page.context().close();
  }
  {
    const page=await makePage('first-web',{reduced:true});
    await showSignal(page);
    assert.equal(await page.locator('#lesson6Signal').getAttribute('data-phase'),'ready');
    assert.equal(await page.locator('#lesson6Signal').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await page.locator('.lesson6-signal__back').click();
    assert.equal(await page.locator('#lesson6Signal').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'cl-completion');
    pass('L6 reduced motion shows readable ready state without signal animation; Back returns to completion');
    await page.context().close();
  }
  {
    const page=await makePage('first-web',{reduced:true,prior:'free-ai,image-ai',width:1440});
    await showSignal(page);
    await page.locator('.lesson6-signal__continue').click();
    assert.equal(await page.evaluate(()=>window.__audioContexts),0,'Reduced motion also skips the optional portal sound');
    assert.equal(await page.locator('#bossDoor').isVisible(),true);
    assert.equal(await page.locator('#lesson6Signal').isVisible(),false);
    pass('1440px L6 reduced-motion Continue opens portal without audio');
    await page.context().close();
  }
  {
    const page=await makePage('first-web');
    await page.locator('[data-copy-target="resumeStarterPrompt"]').click();
    assert.match(await page.evaluate(()=>window.__copied.at(-1)),/index\.html.*เพียงไฟล์เดียว/s);
    await page.locator('#resumeDeviceGuide summary').click();
    assert.match(await page.locator('#resumeDeviceGuide').innerText(),/ขึ้นอยู่กับแอปและระบบ/);
    const downloadPromise=page.waitForEvent('download');
    await page.locator('a[download="smart-resume-example.html"]').click();
    const download=await downloadPromise;
    const filename=path.resolve(output,'downloaded-smart-resume-example.html');
    await download.saveAs(filename);
    assert.equal(download.suggestedFilename(),'smart-resume-example.html');
    assert.equal(await readFile(filename,'utf8'),await readFile(path.join(root,'classroom/examples/lesson6-smart-resume.html'),'utf8'));
    const exampleContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,offline:true});
    const example=await exampleContext.newPage();example.on('pageerror',e=>report.errors.push({slug:'offline-example',error:e.message}));await example.goto(pathToFileURL(filename).href,{waitUntil:'domcontentloaded'});
    await example.locator('#lifeTab').click();assert.equal(await example.locator('#life').isVisible(),true);assert.equal(await example.locator('#work').isVisible(),false);
    await example.keyboard.press('ArrowLeft');assert.equal(await example.locator('#workTab').getAttribute('aria-selected'),'true');
    assert.equal(await example.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await example.screenshot({path:path.join(output,'downloaded-example-mobile.png'),animations:'disabled'});
    await exampleContext.close();
    await page.locator('#resumeStarter').screenshot({path:path.join(output,'lesson6-starter-mobile.png')});
    pass('L6 starter copies, device guidance opens, HTML downloads and works offline with WORK/LIFE keyboard controls on mobile viewport');
    await page.context().close();
  }
  assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;console.error(error);process.exitCode=1}
finally{await writeFile(path.join(output,'interactions-proof.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));console.log('Proof:',output)}
