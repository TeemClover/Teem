import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';
import {stories} from './library.js';
import {seriesVersions} from './story-identity.js';
const {chromium}=await import(pathToFileURL(process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const server=process.env.SHORT_BASE_URL?null:createPreviewServer();if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.SHORT_BASE_URL||`http://127.0.0.1:${server.address().port}`,proof=process.env.SHORT_PROOF_DIR||'/private/tmp/tontor-identity';await mkdir(proof,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
async function run(name,task){try{await task();results.push({name,status:'pass'});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',message:e.message,stack:e.stack});console.log('FAIL '+name+': '+e.message);}await writeFile(proof+'/results.json',JSON.stringify({base,results},null,2));}
try{
 for(const width of [390,1440])await run(`series identity, expandable information and creator profiles ${width}`,async()=>{
  const c=await browser.newContext({viewport:{width,height:width<760?844:1000},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce'});
  try{const p=await c.newPage(),errors=[],missing=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
   await p.goto(base+'/short/',{waitUntil:'networkidle'});
   assert.equal(await p.locator('.community-card').count(),4);
   assert.equal(await p.locator('.hc-series-logo').count(),5);
   assert.equal(await p.locator('.story-card .poster-wordmark').count(),9);
   for(const img of await p.locator('.hc-series-logo,.poster-wordmark').all())await img.evaluate(async e=>{e.loading='eager';await e.decode();});
   for(const card of await p.locator('.story-card').all()){
    assert.ok((await card.locator('.card-synopsis span').textContent()).length>20);
    assert.ok((await card.locator('.card-creator').textContent()).trim());
    assert.ok(await card.locator('.poster-wordmark').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.poster-button').getBoundingClientRect();return a.width>60&&a.left>=b.left&&a.right<=b.right+1&&a.bottom<=b.bottom;}),'title stays inside poster');
   }
   await p.locator('#catalog').scrollIntoViewIfNeeded();await p.screenshot({path:proof+`/catalog-${width}.png`});
   await p.locator('#reading-grid').scrollIntoViewIfNeeded();await p.locator('.reading-cover img').evaluateAll(async images=>{await Promise.all(images.map(async e=>{e.loading='eager';await e.decode();}));});await p.screenshot({path:proof+`/reading-${width}.png`});
   const savedByVersion={};
   for(const [filmId,novelId] of seriesVersions){const film=stories.find(s=>s.id===filmId),novel=stories.find(s=>s.id===novelId);
    assert.equal(novel.title,film.title);assert.equal(novel.seriesLogo,film.seriesLogo);assert.notEqual(novel.description,film.description);
    await p.goto(base+`/short/story/${filmId}/?episode=1`,{waitUntil:'networkidle'});
    assert.equal(await p.locator('#story-description').textContent(),film.summary);
    assert.equal(await p.locator('#story-creator').isVisible(),true);
    assert.equal(await p.locator('#story-full-description').isVisible(),false);
    await p.locator('#story-about>summary').click();assert.equal(await p.locator('#story-full-description').textContent(),film.description);assert.equal(await p.locator('#story-full-description').isVisible(),true);
    await p.locator('#story-about>summary').click();
    await p.locator('#story-creator').click();assert.equal(await p.locator('.community-dialog').getAttribute('open'),'');assert.equal(await p.locator('.community-work').count(),2);await p.locator('.community-close').click();assert.equal(await p.locator('#story-dialog').getAttribute('open'),'');
    await p.screenshot({path:proof+`/${filmId}-${width}.png`});
    const filmURL=p.url();await p.locator(`[data-story-version="${novelId}"]`).click();assert.ok(p.url().includes('/'+novelId+'/'));
    assert.equal(await p.locator('#story-title').textContent(),film.title);assert.equal(await p.locator('#story-dialog').evaluate(e=>e.classList.contains('reading-mode')),true);assert.equal(await p.locator('.novel-body p').count(),10);
    await p.locator('#comic-reader').evaluate(e=>e.scrollTop=(e.scrollHeight-e.clientHeight)*.45);await p.waitForTimeout(250);
    savedByVersion[novelId]=await p.evaluate(id=>JSON.parse(localStorage.getItem('tontor:prototype:v1')).progress[id],novelId);assert.ok(savedByVersion[novelId].time>0);
    if(width<760)await p.locator('#reader-episodes').click();assert.equal(await p.locator('#story-description').textContent(),novel.summary);assert.equal(await p.locator('#story-creator').isVisible(),true);
    await p.locator(`[data-story-version="${filmId}"]`).click();assert.equal(p.url(),filmURL);assert.equal(await p.locator('#story-dialog').evaluate(e=>e.classList.contains('reading-mode')),false);
    assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('tontor:prototype:v1')).balance),120,'format switches do not charge coins');
   }
   await p.goto(base+'/short/',{waitUntil:'networkidle'});await p.locator('[data-story-details="novel-ghost"]').first().click();if(width<760)assert.equal(await p.locator('#story-panel').isVisible(),true);assert.equal(await p.locator('#story-description').isVisible(),true);await p.locator('[data-close="story-dialog"]').click();
   await p.goto(base+'/short/story/somchai/?episode=1',{waitUntil:'networkidle'});if(width<760)await p.locator('#reader-episodes').click();await p.locator('#story-creator').click();assert.equal(await p.locator('.community-dialog').getAttribute('data-community-kind'),'team');assert.equal(await p.locator('.community-work').count(),1);await p.locator('.community-close').click();
   assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  }finally{await c.close();}
 });
 await run('all sixteen share pages match their series title and format',async()=>{for(const s of stories){const r=await fetch(base+`/short/story/${s.id}/`);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`${s.title} | ตอนต่อ`));assert.ok(html.includes(`${s.formatLabel} AI ภาษาไทย`));const og=html.match(/property="og:image" content="([^"]+)"/)[1];const asset=await fetch(base+new URL(og).pathname);assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),'image/jpeg');}});
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
