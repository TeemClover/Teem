import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';
import {somchaiWebtoon} from './somchai-webtoon.js';

const {chromium} = await import(pathToFileURL(process.env.SHORT_PLAYWRIGHT || '/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const server = process.env.SHORT_BASE_URL ? null : createPreviewServer();
if (server) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = (process.env.SHORT_BASE_URL || `http://127.0.0.1:${server.address().port}`).replace(/\/$/, '');
const proof = process.env.SHORT_PROOF_DIR || '/private/tmp/tontor-somchai-episode2-qa';
await mkdir(proof, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.SHORT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results = [], key = 'tontor:prototype:v1';
async function run(name, task) {
  try { await task(); results.push({name,status:'pass'}); console.log('PASS '+name); }
  catch (error) { results.push({name,status:'fail',message:error.message,stack:error.stack}); console.log('FAIL '+name+': '+error.message); }
  await writeFile(proof+'/results.json', JSON.stringify({base,results},null,2));
}
async function checkGeometry(page) {
  for (const selector of ['html','#story-dialog','#reader-toolbar','#comic-reader']) {
    assert.ok(await page.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth+2), selector+' overflows');
  }
}
try {
  assert.equal(somchaiWebtoon.episodes,2);
  assert.equal(somchaiWebtoon.comicChapters.length,2);
  assert.deepEqual(somchaiWebtoon.comicChapters.map(p=>p.length),[10,10]);
  assert.deepEqual(somchaiWebtoon.comicChapters.map(p=>p.flatMap(e=>e.transcript).length),[40,40]);
  for (const width of [320,390,992,1440]) await run(`fifth hero and free episode 2 ${width}px`, async()=>{
    const context = await browser.newContext({viewport:{width,height:width<760?844:1000},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce'});
    try {
      await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({balance:0,saved:[],unlocked:[],progress:{}})),key);
      const page=await context.newPage(), errors=[], missing=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
      await page.goto(base+'/short/',{waitUntil:'networkidle'});
      const ids=await page.locator('.hc-slide').evaluateAll(p=>p.map(e=>e.dataset.hcId));
      assert.equal(new Set(ids).size,5);assert.ok(ids.includes('somchai'));
      assert.equal(await page.locator('.community-card').count(),4);
      await page.locator(`[data-hc-index="${ids.indexOf('somchai')}"]`).click();
      await page.waitForFunction(()=>document.querySelector('.hc-hero').dataset.hcActive==='somchai');
      const hero=page.locator('[data-hc-id="somchai"]');
      const art=await hero.locator('.hc-visual img').evaluate(async e=>{await e.decode();const r=e.getBoundingClientRect();return {src:e.currentSrc,ratio:e.naturalWidth/e.naturalHeight,width:r.width};});
      assert.match(art.src,width<760?/somchai-portrait-v1/:/somchai-wide-v1/);
      assert.ok(Math.abs(art.width-width)<1);assert.ok(width<760?art.ratio<.6:art.ratio>2);
      assert.match(await hero.locator('.hc-eyebrow').textContent(),/เว็บตูน ภาษาไทย.*ตอน 2 มาแล้ว/);
      assert.equal(await hero.locator('video').count(),0);
      assert.ok(await hero.locator('.hc-title').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      await page.screenshot({path:proof+`/hero-somchai-${width}.png`});
      await hero.locator('.hc-watch').click();
      assert.match(page.url(),/somchai\/\?episode=2/);
      assert.match(await page.locator('.reader-heading strong').textContent(),/วันแรก ต้องรอด/);
      assert.equal(await page.locator('#episode-grid button').count(),2);
      assert.equal(await page.locator('#episode-grid .locked').count(),0);
      assert.equal(await page.locator('#comic-reader img').count(),10);
      assert.equal(await page.locator('.webtoon-transcript section').count(),40);
      assert.equal(await page.locator('#story-video').getAttribute('src'),null);
      await checkGeometry(page);
      await page.screenshot({path:proof+`/episode2-${width}.png`});
      await page.locator('#reader-expand').click();
      assert.equal(await page.locator('#reader-expand').getAttribute('aria-pressed'),'true');
      for (const img of await page.locator('.webtoon-page img').all()) {
        await img.evaluate(e=>e.scrollIntoView({block:'start'}));
        await img.evaluate(async e=>{await e.decode();if(e.naturalWidth!==793||e.naturalHeight!==1983)throw Error('Sheet dimensions changed');});
      }
      assert.match(await page.locator('.webtoon-transcript').last().textContent(),/ตั้งสองดวง/);
      assert.equal(await page.locator('[data-read-next]').count(),0);
      assert.equal(await page.locator('#unlock-dialog[open]').count(),0);
      assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).balance,key),0);
      await checkGeometry(page);
      // The same free reader switches backward and advances from the actual first chapter.
      await page.locator('#reader-expand').click();
      await page.locator('[data-episode="1"]').click();
      assert.match(await page.locator('.reader-heading strong').textContent(),/ขอเริ่มใหม่อีกครั้ง/);
      assert.match(await page.locator('.webtoon-page img').first().getAttribute('src'),/somchai\/page-01/);
      await page.locator('[data-read-next]').click();
      assert.match(await page.locator('.webtoon-page img').first().getAttribute('src'),/episode-02\/page-01/);
      await page.locator('.webtoon-page img').first().evaluate(async e=>await e.decode());
      await page.locator('#reader-expand').click();
      await page.locator('#comic-reader').evaluate(e=>e.scrollTop=(e.scrollHeight-e.clientHeight)*.36);
      await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).progress.somchai?.episode===2&&JSON.parse(localStorage.getItem(key)).progress.somchai?.time>0,key);
      await page.locator('[data-close="story-dialog"]').click();
      const state=await context.storageState();
      const resumed=await browser.newContext({viewport:{width,height:width<760?844:1000},storageState:state});
      try {
        const p=await resumed.newPage();await p.goto(base+'/short/story/somchai/?episode=2',{waitUntil:'networkidle'});
        await p.waitForFunction(()=>document.querySelector('#comic-reader').scrollTop>0);
        const ratio=await p.locator('#comic-reader').evaluate(e=>e.scrollTop/(e.scrollHeight-e.clientHeight));
        assert.ok(Math.abs(ratio-.36)<.02,'Episode 2 relative scroll resumes: '+ratio);
      } finally {await resumed.close();}
      assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    } finally {await context.close();}
  });
  await run('direct episode 2 link and updated share metadata',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}});
    try {
      const page=await context.newPage();await page.goto(base+'/short/story/somchai/?episode=2',{waitUntil:'networkidle'});
      assert.equal(await page.locator('[data-episode="2"]').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('.reader-heading strong').textContent(),/วันแรก ต้องรอด/);
      const html=await (await page.request.get(base+'/short/story/somchai/')).text();
      assert.match(html,/og:image[^>]+somchai-v3/);assert.match(html,/og:description[^>]+วันแรก ต้องรอด/);
      const og=await page.request.get(base+'/short/assets/og/somchai-v3.jpg');
      assert.equal(og.status(),200);assert.ok((await og.body()).length>40000);
      await page.setContent(`<img src="${base}/short/assets/og/somchai-v3.jpg">`);
      assert.deepEqual(await page.locator('img').evaluate(async e=>{await e.decode();return [e.naturalWidth,e.naturalHeight];}),[1200,630]);
    } finally {await context.close();}
  });
} finally {await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
