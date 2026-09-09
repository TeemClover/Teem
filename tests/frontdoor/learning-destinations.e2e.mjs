// Real local browser navigation. Existing quest.js remains the sole source of reading completion.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const origin = process.env.FRONTDOOR_ORIGIN || 'http://127.0.0.1:4174';
const out = process.env.FRONTDOOR_PROOF_DIR || '/tmp/classroom-forge-proof';
await fs.mkdir(out,{recursive:true});
const episodes = ['ep1-everyone-gets-to-play','ep2-the-first-item','ep3-the-item-that-came-back','ep4-what-traveled-without-us','ep5-from-answers-to-a-system','ep6-the-starter-kit','ep7-a-voice-that-went-further'];
const proof=[];
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true,args:['--no-sandbox']});
try {
 for(const width of [390,1440]) {
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/classroom/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#courseStart')?.offsetHeight>0);
  const first=await page.locator('#courseStart').boundingBox();assert(first.y+first.height<844,'Start must appear in first mobile viewport');
  assert.equal(await page.locator('#courseStart').getAttribute('href'),'/classroom/free-ai.html');
  await page.screenshot({path:path.join(out,`course-${width}.png`),fullPage:false});
  await page.evaluate(()=>{localStorage.setItem('mc_learn','free-ai,image-ai');localStorage.setItem('mc_titles','["TEST_LEGACY"]');localStorage.setItem('mc_read_v2','1');});
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#courseStart').getAttribute('href'),'/classroom/clip-ai.html');
  await page.locator('.course-story').click();await page.waitForURL(`${origin}/forge/`);
  const visible=await page.locator('.grid a.ep:not(.bonus)').evaluateAll(nodes=>nodes.map(n=>({visible:!n.hidden&&n.getBoundingClientRect().height>0,href:n.getAttribute('href')})));
  assert.equal(visible.length,7);assert(visible.every(v=>v.visible&&v.href));
  await page.screenshot({path:path.join(out,`forge-${width}.png`),fullPage:false});
  await page.locator('[data-mc-demote="forge:ghost"]').click();
  for(let i=0;i<episodes.length;i++) {
   await page.waitForURL(`${origin}/forge/${episodes[i]}/`);
   await page.waitForFunction(()=>window.MC_QUEST?.track('forge'));
   assert.equal(await page.locator('.forge-reader-nav__chapters a').count(),7);
   assert.equal(await page.locator('.forge-reader-nav [aria-current="page"]').textContent(),String(i+1));
   if(i===0) {await page.waitForTimeout(900);assert.equal(await page.locator('#mcSauceCupOffer').count(),0);await page.screenshot({path:path.join(out,`episode1-${width}.png`),fullPage:false});}
   await page.locator('[data-mc-end]').scrollIntoViewIfNeeded();
   await page.waitForFunction(slug=>(localStorage.getItem('mc_read')||'').split(',').includes(slug),episodes[i]);
   if(i<6) await page.locator('a[data-next]').click();
  }
  await page.waitForTimeout(3300);assert.equal(await page.locator('#mcForgePathChoice').count(),0);
  const stored=await page.evaluate(()=>({read:localStorage.getItem('mc_read'),titles:JSON.parse(localStorage.getItem('mc_titles')||'[]'),done:localStorage.getItem('mc_forge_done'),learn:localStorage.getItem('mc_learn')}));
  assert(episodes.every(ep=>stored.read.split(',').includes(ep)));assert(stored.titles.includes('BLACKSMITH'));assert(stored.titles.includes('TEST_LEGACY'));assert.equal(stored.done,'1');assert.equal(stored.learn,'free-ai,image-ai');
  await page.locator('.forge-next-course').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`episode7-ending-${width}.png`),fullPage:false});
  const gameHref=await page.locator('.forge-course-extras a[href*="core7"]').getAttribute('href');assert.equal(new URL(gameHref,origin).searchParams.get('entry'),'forge');
  await page.evaluate(()=>{const a=document.createElement('a');a.id='legacyGameRewriteFixture';a.href='/core7/tutorial/?entry=forge';document.body.append(a)});
  await page.waitForFunction(()=>document.getElementById('legacyGameRewriteFixture')?.getAttribute('href')==='/core7/quick/');
  await page.locator('.forge-course-start').click();await page.waitForURL(`${origin}/classroom/free-ai.html`);
  assert(await page.locator('h1').count()>0);
  assert.equal(await page.locator('meta[name="mc-item"]').getAttribute('content'),'learn:free-ai');
  await page.goto(`${origin}/classroom/sauce-cup/`,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.end .primary').getAttribute('href'),'/classroom/free-ai.html');
  assert(!/ไถผ่าน.*7 ตอน|ระบบจะปลดล็อกบท 1/.test(await page.locator('body').innerText()));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No primary horizontal overflow');
  proof.push({width,passed:true,visibleChapters:7,readingCompleted:7,blacksmithPreserved:true,priorLessonProgressPreserved:true,episodeOneInterrupt:false,episodeSevenInterrupt:false,courseDirect:true,errors});
  assert.equal(errors.length,0,JSON.stringify(errors));
  await context.close();
 }
 // Public entry remains usable when browser storage is entirely unavailable.
 const c=await browser.newContext({viewport:{width:390,height:844}});
 await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await c.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})});
 const p=await c.newPage();await p.goto(`${origin}/forge/`,{waitUntil:'domcontentloaded'});
 assert.equal(await p.locator('.grid a.ep:not(.bonus)').evaluateAll(a=>a.filter(n=>!n.hidden&&n.getAttribute('href')).length),7);
 await p.goto(`${origin}/classroom/`,{waitUntil:'domcontentloaded'});assert.equal(await p.locator('#courseStart').getAttribute('href'),'/classroom/free-ai.html');
 await c.close();proof.push({storageUnavailable:true,passed:true});
 await fs.writeFile(path.join(out,'proof.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
} finally {await browser.close()}
