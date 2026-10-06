import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';
import {stories} from './catalog.js';

const runtime = process.env.SHORT_PLAYWRIGHT || '/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium} = await import(pathToFileURL(runtime).href);
const proof = process.env.SHORT_PROOF_DIR || '/private/tmp/tontor-qa';
await mkdir(proof,{recursive:true});
const server = createPreviewServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = process.env.SHORT_BASE_URL?.replace(/\/$/,'') || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath:process.env.SHORT_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const passed=[];
const readingOnly=process.env.SHORT_VERIFY==='reading';
const pass = message => { passed.push(message); console.log('PASS '+message); };
async function open(options={}, init) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',...options});
  await context.route('**/*',route=>route.request().url().startsWith(base) ? route.continue() : route.abort());
  if(init)await context.addInitScript(init);
  const page=await context.newPage();const errors=[];const missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)missing.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+'/short/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  return {context,page,errors,missing};
}
const getState=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tontor:prototype:v1')));
try {
  if(!readingOnly){
  {
    const {context,page,errors,missing}=await open();
    assert.equal(await page.locator('.story-card').count(),stories.length);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('.poster-button img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
    await page.screenshot({path:proof+'/desktop.png',fullPage:true});
    await page.getByRole('button',{name:'สยองขวัญ',exact:true}).click();assert.equal(await page.locator('.story-card').count(),2);
    assert.ok((await page.locator('.card-title').allTextContents()).includes('ห้องสุดท้าย'));
    await page.getByRole('button',{name:'ทั้งหมด',exact:true}).click();
    await page.getByRole('button',{name:'ค้นหาเรื่อง',exact:true}).click();
    await page.locator('#search-input').fill('เชียงใหม่');assert.equal(await page.locator('.story-card').count(),1);
    assert.equal(await page.locator('.card-title').textContent(),'ฝากรักไว้ที่เหนือ');
    await page.locator('#search-input').fill('ไม่มีเรื่องชื่อนี้');assert.equal(await page.locator('#empty-state').isVisible(),true);
    await page.locator('#reset-filters').click();assert.equal(await page.locator('.story-card').count(),stories.length);
    await page.locator('#search-close').click();
    await page.locator('[data-save="north"]').click();
    await page.locator('.desktop-nav [data-view="saved"]').click();assert.equal(await page.locator('.story-card').count(),1);
    await page.reload();assert.equal((await getState(page)).saved.includes('north'),true);
    await page.locator('.desktop-nav [data-view="saved"]').click();assert.equal(await page.locator('.story-card').count(),1);
    await page.locator('.desktop-nav [data-view="discover"]').click();
    await page.locator('[data-creator="มะลิ"]').click();assert.equal(await page.locator('.story-card').count(),1);
    assert.equal(await page.locator('.card-title').textContent(),'บุพเพอีกครา');
    await page.locator('#search-input').fill('');await page.locator('#search-close').click();
    await page.locator('[data-hero="warrior"]').click();assert.match(await page.locator('#hero-title').textContent(),/นาคา/);
    await page.locator('[data-hero="rain"]').click();
    await page.locator('#hero-detail').click();assert.equal(await page.locator('#story-dialog').isVisible(),true);
    await page.locator('#play-episode').click();
    await page.waitForFunction(()=>document.querySelector('video').currentTime>.3);
    assert.equal(await page.locator('video').evaluate(v=>Number.isFinite(v.duration)&&v.duration>10&&v.videoWidth===360),true);
    await page.screenshot({path:proof+'/desktop-player.png'});
    await page.locator('[data-episode="4"]').click();assert.equal(await page.locator('#unlock-dialog').isVisible(),true);
    assert.equal((await getState(page)).balance,120);
    await page.locator('[data-close="unlock-dialog"]').click();
    assert.equal(await page.locator('#playing-episode').textContent(),'ตอนที่ 1');
    await page.locator('[data-episode="4"]').click();await page.locator('#confirm-unlock').click();
    await page.waitForFunction(()=>document.querySelector('#playing-episode').textContent==='ตอนที่ 4');
    assert.equal((await getState(page)).balance,110);
    await page.locator('[data-episode="1"]').click();await page.locator('[data-episode="4"]').click();
    assert.equal((await getState(page)).balance,110);assert.equal(await page.locator('#unlock-dialog').isVisible(),false);
    await page.waitForFunction(()=>document.querySelector('video').currentTime>.6);
    await page.locator('[data-close="story-dialog"]').click();await page.locator('#continue-section').waitFor({state:'visible'});
    const progress=(await getState(page)).progress.rain;assert.equal(progress.episode,4);assert.ok(progress.time>.5);
    await page.reload();await page.locator('[data-resume="rain"]').click();
    await page.waitForFunction(()=>document.querySelector('video').currentTime>.5);
    assert.equal(await page.locator('#playing-episode').textContent(),'ตอนที่ 4');assert.equal((await getState(page)).balance,110);
    await page.locator('[data-close="story-dialog"]').click();
    await page.locator('.header-actions [data-wallet]').click();await page.locator('[data-pack="50"]').click();assert.equal((await getState(page)).balance,160);
    await page.goto(base+'/short/?story=ghost&episode=2',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#story-title').textContent(),'ห้องสุดท้าย');assert.equal(await page.locator('#playing-episode').textContent(),'ตอนที่ 2');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#story-dialog').isVisible(),false);
    await page.waitForFunction(()=>document.querySelector('video').paused);
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    await context.close();pass('desktop: images, search/genres/creators, favorites, playback, cancel/unlock/replay, reload/resume, free demo coins, direct links and Escape');
  }
  for(const viewport of [{width:390,height:844},{width:320,height:740},{width:768,height:1024}]) {
    const {context,page,errors,missing}=await open({viewport,isMobile:viewport.width<760,hasTouch:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`no overflow ${viewport.width}`);
    assert.equal(await page.locator('.story-card').count(),stories.length);
    await page.screenshot({path:`${proof}/screen-${viewport.width}.png`,fullPage:true});
    if(viewport.width<760){
      await page.locator('.mobile-nav [data-view="saved"]').click();assert.equal(await page.locator('#empty-state').isVisible(),true);
      await page.locator('.mobile-nav [data-view="discover"]').click();await page.locator('#mobile-search').click();
      await page.locator('#search-input').fill('ออฟฟิศนี้');assert.equal(await page.locator('.story-card').count(),1);
      await page.locator('#search-input').fill('');await page.locator('#search-close').click();
    }
    await page.locator('[data-open="north"]').first().click();await page.locator('#play-episode').click();
    await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
    assert.equal(await page.locator('#story-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth),true);
    assert.ok(await page.locator('.video-frame').evaluate(el=>Math.abs(el.clientWidth/el.clientHeight-9/16)<.01),'portrait player keeps 9:16 framing');
    await page.screenshot({path:`${proof}/player-${viewport.width}.png`});
    await page.locator('[data-close="story-dialog"]').click();assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
    await context.close();pass(`${viewport.width}px responsive layout, mobile actions, playable player and no horizontal overflow`);
  }
  {
    const {context,page,errors,missing}=await open();
    for(const story of stories.filter(s=>s.format!=='comic')){
      await page.locator(`[data-open="${story.id}"]`).first().click();await page.locator('#play-episode').click();
      await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
      assert.equal(await page.locator('video').evaluate(v=>Number.isFinite(v.duration)&&v.duration>10),true,`${story.id} finite duration`);
      await page.locator('[data-close="story-dialog"]').click();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await context.close();pass('all eleven local dummy videos decode, advance and report finite duration');
  }
  for(const mode of ['malformed','blocked','empty-wallet']) {
    const init=mode==='blocked'?()=>{
      Storage.prototype.getItem=function(){throw new Error('blocked');};Storage.prototype.setItem=function(){throw new Error('blocked');};
    }:mode==='malformed'?()=>localStorage.setItem('tontor:prototype:v1','{broken'):()=>localStorage.setItem('tontor:prototype:v1',JSON.stringify({balance:0,saved:[],unlocked:[],progress:{}}));
    const {context,page,errors,missing}=await open({},init);assert.equal(await page.locator('.story-card').count(),stories.length);
    await page.locator('#hero-detail').click();await page.locator('[data-episode="4"]').click();
    if(mode==='empty-wallet'){
      await page.locator('#confirm-unlock').click();assert.equal(await page.locator('#wallet-dialog').isVisible(),true);
      await page.locator('[data-pack="50"]').click();await page.locator('[data-episode="4"]').click();await page.locator('#confirm-unlock').click();
      assert.equal((await getState(page)).balance,40);
    }else{await page.locator('#confirm-unlock').click();assert.equal(await page.locator('#playing-episode').textContent(),'ตอนที่ 4');}
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await context.close();pass(`${mode}: browsing and demo unlock remain usable`);
  }
  }
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
    const {context,page,errors,missing}=await open({viewport});
    await page.locator('[data-world="พญานาค"]').click();assert.equal(await page.locator('.story-card').count(),2);
    await page.getByRole('button',{name:'ทั้งหมด',exact:true}).click();
    await page.locator('[data-format="animation"]').click();assert.equal(await page.locator('.story-card').count(),2);
    await page.locator('[data-format="comic"]').click();assert.equal(await page.locator('.story-card').count(),1);
    await page.locator('[data-open="hr"]').first().click();await page.locator('#play-episode').click();
    assert.equal(await page.locator('#comic-reader').isVisible(),true);assert.equal(await page.locator('.video-frame').isVisible(),false);
    await page.waitForFunction(()=>[...document.querySelectorAll('.comic-page img')].every(img=>img.complete&&img.naturalWidth>0));
    assert.equal(await page.locator('.comic-page').count(),3);
    await page.locator('.story-provenance summary').click();assert.match(await page.locator('.story-provenance').textContent(),/ตีความวรรณคดีใหม่/);
    if(viewport.width<760){assert.equal(await page.locator('#story-dialog>[data-close]').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true,'mobile close stays visible while scrolling story details');}
    assert.match(await page.locator('#completion-price').textContent(),/30 เหรียญ/);
    await page.locator('#comic-reader').evaluate(el=>el.scrollTop=300);
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tontor:prototype:v1'))?.progress.hr?.time>200);
    await page.screenshot({path:`${proof}/comic-${viewport.width}.png`});
    await page.locator('[data-close="story-dialog"]').click();await page.locator('[data-resume="hr"]').waitFor({state:'visible'});
    assert.ok((await getState(page)).progress.hr.time>200,'closing reader preserves scroll position');
    await page.reload();await page.locator('[data-resume="hr"]').click();
    await page.waitForFunction(()=>document.querySelector('#comic-reader').scrollTop>200);
    await page.locator('[data-episode="4"]').click();await page.locator('#confirm-unlock').click();
    assert.equal((await getState(page)).balance,110);assert.match(await page.locator('#completion-price').textContent(),/20 เหรียญ/);
    await page.locator('[data-close="story-dialog"]').click();
    for(const key of ['creators','pricing','content']){await page.locator(`[data-trust="${key}"]`).click();assert.equal(await page.locator('#trust-dialog').isVisible(),true);assert.ok((await page.locator('#trust-body').textContent()).length>80);await page.locator('[data-close="trust-dialog"]').click();}
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await context.close();pass(`${viewport.width}px: Thai theme collections, format filters, three-page comic reading/resume/unlock, credits/warnings/total price and transparency dialogs`);
  }
  {
    const {context,page,errors,missing}=await open();
    const html=await(await fetch(base+'/short/')).text();
    assert.match(html,/<meta property="og:title" content="ตอนต่อ — เรื่องสั้น ความรู้สึกยาว">/);
    assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
    for(const story of stories){
      const response=await fetch(`${base}/short/story/${story.id}/`);assert.equal(response.status,200);
      const source=await response.text();assert.ok(source.includes(`<body data-story="${story.id}">`));
      assert.ok(source.includes(`content="${story.title} | ตอนต่อ"`));
      assert.ok(source.includes(`https://www.myclover.com/short/assets/og/${story.id}-v1.jpg`));
    }
    const covers=['tontor',...stories.map(story=>story.id)];
    const dimensions=await page.evaluate(async ids=>Promise.all(ids.map(async id=>{const image=new Image();image.src=`/short/assets/og/${id}-v1.jpg`;await image.decode();return [image.naturalWidth,image.naturalHeight];})),covers);
    dimensions.forEach(size=>assert.deepEqual(size,[1200,630]));
    await page.goto(base+'/short/story/hr/?episode=2',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#story-title').textContent(),'ทศกัณฐ์ แผนก HR');assert.equal(await page.locator('#playing-episode').textContent(),'ตอนที่ 2');
    await page.locator('[data-close="story-dialog"]').click();assert.equal(new URL(page.url()).pathname,'/short/');
    await page.goto(base+'/short/story/naga/',{waitUntil:'networkidle'});await page.locator('#play-episode').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
    await page.locator('#share-story').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'https://www.myclover.com/short/story/naga/?episode=1');
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await context.close();pass('all twelve social pages expose metadata without JavaScript; thirteen 1200×630 share images load; comic/video deep links and public share URLs work');
  }
  const config=await(await import('node:fs/promises')).readFile(new URL('../vercel.json',import.meta.url),'utf8');
  const routing=JSON.parse(config);assert.ok(routing.redirects.some(r=>r.source==='/short'&&r.destination==='/short/'));assert.ok(routing.rewrites.some(r=>r.source==='/short/'&&r.destination==='/short/index.html'));
  assert.ok(routing.headers.some(r=>r.source==='/short/:path*'&&r.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex'))));
  pass('/short routing configuration and noindex prototype header');
  await writeFile(proof+(readingOnly?'/results-reading.json':'/results.json'),JSON.stringify({date:'2026-10-07',passed,screenshots:proof},null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
