import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const runtime=process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(runtime).href);
const base=(process.env.SHORT_BASE_URL||'http://127.0.0.1:4321').replace(/\/$/,'');
const proof=process.env.SHORT_PROOF_DIR||'/private/tmp/tontor-state-qa';
const selectedChecks=process.env.SHORT_STATE_VERIFY?new RegExp(process.env.SHORT_STATE_VERIFY):null;
await mkdir(proof,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
const stateKey='tontor:prototype:v1';

async function setup({seed,blocked=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  if(blocked)await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked for QA','SecurityError');}}));
  else if(seed!==undefined)await context.addInitScript(({key,value})=>{try{localStorage.setItem(key,value);}catch{}},{key:stateKey,value:typeof seed==='string'?seed:JSON.stringify(seed)});
  const page=await context.newPage();const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',r=>{if(r.status()>=400)missing.push({status:r.status(),url:r.url()});});
  await page.goto(base+'/short/',{waitUntil:'networkidle'});
  await page.locator('#catalog-grid .story-card').first().waitFor();
  return {context,page,errors,missing};
}
async function clean(session){assert.deepEqual(session.errors,[],'runtime and console errors');assert.deepEqual(session.missing,[],'missing requested assets');}
async function closeStory(page){await page.locator('[data-close="story-dialog"]').click();await page.waitForFunction(()=>!document.querySelector('#story-dialog').open);await page.waitForURL(base+'/short/');}
async function balance(page){return Number((await page.locator('.wallet-button [data-balance]').textContent()).replace(/,/g,''));}
async function state(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}'),stateKey);}
async function waitPlaying(page){await page.waitForFunction(()=>{const v=document.querySelector('#story-video');return v.readyState>=2&&!v.paused&&v.currentTime>.3;});}
async function run(name,task){
  if(selectedChecks&&!selectedChecks.test(name))return;
  try{const detail=await task();results.push({name,status:'pass',detail});console.log('PASS '+name);}
  catch(error){results.push({name,status:'fail',message:error.message,stack:error.stack});console.log('FAIL '+name+': '+error.message);}
  await writeFile(proof+'/results-state.json',JSON.stringify({base,results},null,2));
}

try{
  await run('demo coins free episodes cancel unlock once pack and episode resume',async()=>{
    const session=await setup();const {page,context}=session;
    try{
      assert.equal(await balance(page),120);
      await page.locator('[data-open="north"]').first().click();
      assert.equal(await page.locator('#episode-grid button:not(.locked)').count(),3,'three concept episodes free');
      assert.equal(await page.locator('#episode-grid button.locked').count(),13);
      await page.locator('[data-episode="3"]').click();await waitPlaying(page);
      assert.equal(await balance(page),120,'free episode does not deduct coins');
      await page.locator('[data-episode="4"]').click();
      await page.locator('#unlock-dialog[open]').waitFor();
      assert.equal(await page.locator('#story-video').evaluate(v=>v.paused),true,'playback pauses at paid episode confirmation');
      await page.locator('[data-close="unlock-dialog"]').click();
      await page.waitForFunction(()=>!document.querySelector('#unlock-dialog').open);
      assert.equal(await balance(page),120);
      assert.equal(await page.locator('[data-episode="3"]').getAttribute('aria-pressed'),'true','cancel keeps current episode');
      assert.ok(!(await state(page)).unlocked.includes('north:4'));
      await page.locator('[data-episode="4"]').click();await page.locator('#confirm-unlock').click();await waitPlaying(page);
      assert.equal(await balance(page),110);
      assert.deepEqual((await state(page)).unlocked,['north:4']);
      await page.locator('[data-episode="3"]').click();await waitPlaying(page);
      await page.locator('[data-episode="4"]').click();await waitPlaying(page);
      assert.equal(await balance(page),110,'already unlocked episode does not charge again');
      assert.equal(await page.locator('#unlock-dialog').getAttribute('open'),null);
      await page.locator('#story-video').evaluate(video=>video.currentTime=3.2);
      await closeStory(page);
      const saved=(await state(page)).progress.north;
      assert.equal(saved.episode,4);assert.ok(saved.time>=3,'selected episode and watched position are saved');
      await page.reload({waitUntil:'networkidle'});await page.locator('[data-resume="north"]').click();
      await page.waitForFunction(()=>document.querySelector('#story-video').currentTime>=3);
      assert.equal(await page.locator('[data-episode="4"]').getAttribute('aria-pressed'),'true');
      assert.match(page.url(),/episode=4/);assert.equal(await balance(page),110);
      await closeStory(page);
      await page.locator('.wallet-button').click();await page.locator('[data-pack="50"]').click();
      assert.equal(await balance(page),160);assert.match(await page.locator('#toast').textContent(),/ไม่มีการชำระเงิน/);
      await page.screenshot({path:proof+'/demo-pack-and-resume.png'});
      await clean(session);return {freeEpisodes:3,cancelBalance:120,unlockBalance:110,resumedEpisode:saved.episode,resumedPosition:saved.time,freePackBalance:160};
    }finally{await context.close();}
  });

  await run('insufficient coins opens free demo pack without unlocking',async()=>{
    const session=await setup({seed:{balance:5,saved:[],unlocked:[],progress:{}}});const {page,context}=session;
    try{
      await page.locator('[data-open="north"]').first().click();await page.locator('[data-episode="4"]').click();
      assert.match(await page.locator('#confirm-unlock').textContent(),/รับเหรียญทดลองเพิ่ม/);
      await page.locator('#confirm-unlock').click();await page.locator('#wallet-dialog[open]').waitFor();
      assert.equal(await balance(page),5);assert.deepEqual((await state(page)).unlocked,[]);
      await page.locator('[data-pack="50"]').click();assert.equal(await balance(page),55);
      await page.locator('[data-episode="4"]').click();await page.locator('#confirm-unlock').click();
      assert.equal(await balance(page),45);assert.deepEqual((await state(page)).unlocked,['north:4']);
      await clean(session);return 'Insufficient balance offers a free demo pack; unlock requires another explicit confirmation';
    }finally{await context.close();}
  });

  await run('malformed storage resets to a usable default app',async()=>{
    const session=await setup({seed:'{not json'});const {page,context}=session;
    try{
      assert.equal(await balance(page),120);assert.equal(await page.locator('#catalog-grid .story-card').count(),9);
      await page.locator('[data-save="north"]').click();assert.equal(await page.locator('[data-save="north"]').getAttribute('aria-pressed'),'true');
      const saved=await state(page);assert.equal(saved.balance,120);assert.deepEqual(saved.saved,['north']);assert.deepEqual(saved.unlocked,[]);
      await clean(session);return 'Broken JSON does not prevent discovery or saving; next interaction writes valid state';
    }finally{await context.close();}
  });

  await run('untrusted storage drops invalid credits unlocks progress and story IDs',async()=>{
    const session=await setup({seed:{balance:-100,saved:['missing','north','north',null],unlocked:['north:1','north:999','north:4','missing:4',99],progress:{north:{episode:6,time:4,duration:12,updated:1},rain:{episode:99,time:9,duration:12,updated:2},missing:{episode:1,time:1,duration:12,updated:3}}}});const {page,context}=session;
    try{
      assert.equal(await balance(page),120,'invalid balance falls back to demo default');
      assert.equal(await page.locator('[data-save="north"]').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('[data-resume]').count(),0,'locked or nonexistent episode progress is discarded');
      await page.locator('[data-open="north"]').first().click();
      assert.equal(await page.locator('[data-episode="4"]').evaluate(button=>button.classList.contains('locked')),false);
      assert.equal(await page.locator('[data-episode="6"]').evaluate(button=>button.classList.contains('locked')),true);
      await closeStory(page);await page.locator('[data-save="north"]').click();
      const saved=await state(page);assert.equal(saved.balance,120);assert.deepEqual(saved.saved,[]);assert.deepEqual(saved.unlocked,['north:4']);assert.deepEqual(saved.progress,{});
      await clean(session);return 'Unknown IDs, duplicate saves, free/out-of-range unlocks and locked episode progress are rejected';
    }finally{await context.close();}
  });

  await run('blocked localStorage retains functional in-memory app',async()=>{
    const session=await setup({blocked:true});const {page,context}=session;
    try{
      assert.equal(await balance(page),120);
      await page.locator('[data-save="north"]').click();assert.equal(await page.locator('[data-save="north"]').getAttribute('aria-pressed'),'true');
      await page.locator('.wallet-button').click();await page.locator('[data-pack="50"]').click();assert.equal(await balance(page),170);
      await page.locator('[data-shelf-open="novel-ghost"]').click();
      await page.locator('[data-reader-theme="night"]').click();assert.equal(await page.locator('#comic-reader').getAttribute('data-theme'),'night');
      await page.locator('[data-reader-size="1"]').click();assert.equal(await page.locator('#reader-size-value').textContent(),'19');
      await page.locator('[data-episode="2"]').click();assert.match(await page.locator('.reader-heading span').textContent(),/บทที่ 2/);
      await closeStory(page);await page.locator('[data-community-creator="ghost"]').click();
      await page.locator('.community-dialog[open]').waitFor();
      await page.locator('.community-dialog [data-community-follow="ghost"]').click();
      assert.equal(await page.locator('.community-dialog [data-community-follow="ghost"]').getAttribute('aria-pressed'),'true');
      await clean(session);return 'Saving, free coins, reader settings/chapter selection and following work when browser storage throws';
    }finally{await context.close();}
  });

  await run('native audio and video stop before switching to novel or comic',async()=>{
    const session=await setup();const {page,context}=session;
    try{
      for(const reader of ['novel-ghost','hr']){
        await page.locator('[data-shelf-open="rain"]').click();await waitPlaying(page);
        assert.ok(await page.locator('#story-video').evaluate(v=>v.webkitAudioDecodedByteCount>0),'Flow native audio is decoded');
        await closeStory(page);assert.equal(await page.locator('#story-video').evaluate(v=>v.paused),true);
        await page.locator(`[data-shelf-open="${reader}"]`).click();
        await page.locator('#comic-reader').waitFor({state:'visible'});
        await page.waitForFunction(()=>{const v=document.querySelector('#story-video');return v.paused&&v.getAttribute('src')===null&&v.readyState===0&&v.currentTime===0;});
        const media=await page.locator('#story-video').evaluate(v=>({paused:v.paused,src:v.getAttribute('src'),readyState:v.readyState,currentTime:v.currentTime}));
        assert.equal(media.paused,true);assert.equal(media.src,null);assert.equal(media.readyState,0);assert.equal(media.currentTime,0);
        // The unloaded player must remain stopped after native media events settle.
        await page.waitForTimeout(250);
        assert.equal(await page.locator('#story-video').evaluate(v=>v.paused&&v.currentTime===0),true);
        assert.doesNotMatch(await page.locator('#player-status').textContent(),/โหลดคลิปไม่สำเร็จ/);
        await closeStory(page);
      }
      await clean(session);return 'Closing a pilot pauses playback; switching to each reader unloads the video and its audio';
    }finally{await context.close();}
  });

  await run('fifteen static story deep links have matching OG metadata images and readers',async()=>{
    const session=await setup();const {page,context}=session;
    try{
      const stories=await page.evaluate(async()=>{const {stories}=await import('./library.js');return stories.map(s=>({id:s.id,title:s.title,format:s.format,episodes:s.episodes}));});
      assert.equal(stories.length,15);const checked=[];
      for(const story of stories){
        const path=`/short/story/${story.id}/`;
        const response=await context.request.get(base+path,{headers:{'user-agent':'facebookexternalhit/1.1'}});
        assert.equal(response.status(),200,`${story.id} static page exists`);
        const html=await response.text();
        const metadata=await page.evaluate(html=>{const doc=new DOMParser().parseFromString(html,'text/html');const meta=key=>doc.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.content;return {story:doc.body.dataset.story,title:meta('og:title'),description:meta('og:description'),image:meta('og:image'),twitterImage:meta('twitter:image'),card:meta('twitter:card'),width:meta('og:image:width'),height:meta('og:image:height'),canonical:doc.querySelector('link[rel="canonical"]')?.href,base:doc.querySelector('base')?.getAttribute('href')};},html);
        assert.equal(metadata.story,story.id);assert.equal(metadata.title,`${story.title} | ตอนต่อ`);assert.ok(metadata.description.length>40);
        assert.equal(metadata.base,'/short/');assert.equal(metadata.canonical,'https://www.myclover.com'+path);
        assert.equal(metadata.card,'summary_large_image');assert.equal(metadata.twitterImage,metadata.image);assert.equal(metadata.width,'1200');assert.equal(metadata.height,'630');
        const imageURL=base+new URL(metadata.image).pathname;
        const imageResponse=await context.request.head(imageURL);assert.equal(imageResponse.status(),200,`${story.id} OG JPEG exists`);assert.match(imageResponse.headers()['content-type'],/image\/jpeg/);
        const dimensions=await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};},imageURL);
        assert.deepEqual(dimensions,{width:1200,height:630});
        const episode=story.format==='novel'?2:1;
        await page.goto(base+path+`?episode=${episode}`,{waitUntil:'networkidle'});
        assert.equal(await page.locator('#story-dialog').getAttribute('open'),'');assert.equal(await page.locator('#story-title').textContent(),story.title);
        assert.equal(await page.locator(`[data-episode="${episode}"]`).getAttribute('aria-pressed'),'true');
        if(story.format==='novel')assert.equal(await page.locator('.novel-body p').count(),10);
        checked.push({id:story.id,episode,image:new URL(metadata.image).pathname});
      }
      await clean(session);return checked;
    }finally{await context.close();}
  });
}finally{
  await browser.close();await writeFile(proof+'/results-state.json',JSON.stringify({base,results},null,2));
}
if(results.some(result=>result.status==='fail'))process.exitCode=1;
