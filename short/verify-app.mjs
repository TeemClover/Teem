import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const runtime=process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(runtime).href);
const base=(process.env.SHORT_BASE_URL||'http://127.0.0.1:4321').replace(/\/$/,'');
const proof=process.env.SHORT_PROOF_DIR||'/private/tmp/tontor-app-qa';
await mkdir(proof,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
const stateKey='tontor:prototype:v1';
const readers=['novel-ghost','novel-naga','novel-wanthong'];
const selectedChecks=process.env.SHORT_APP_VERIFY?new RegExp(process.env.SHORT_APP_VERIFY):null;

async function setup(width=1440){
  const context=await browser.newContext({viewport:{width,height:width<760?844:1000},isMobile:width<760,hasTouch:width<760,reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',r=>{if(r.status()>=400)missing.push({status:r.status(),url:r.url()});});
  await page.goto(base+'/short/',{waitUntil:'networkidle'});
  await page.locator('#catalog-grid .story-card').first().waitFor();
  return {context,page,errors,missing};
}
async function closeStory(page){
  await page.locator('[data-close="story-dialog"]').click();
  await page.waitForFunction(()=>!document.querySelector('#story-dialog').open);
  await page.waitForURL(base+'/short/');
}
async function assertNoOverflow(page,selector='html'){
  const geometry=await page.locator(selector).evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,viewport:innerWidth}));
  assert.ok(geometry.scrollWidth<=geometry.clientWidth+2,`${selector} overflows: ${JSON.stringify(geometry)}`);
}
async function clean(session){
  assert.deepEqual(session.errors,[],'browser console and runtime errors');
  assert.deepEqual(session.missing,[],'missing requested assets');
}
async function run(name,task){
  if(selectedChecks&&!selectedChecks.test(name))return;
  try{const detail=await task();results.push({name,status:'pass',detail});console.log('PASS '+name);}
  catch(error){results.push({name,status:'fail',message:error.message,stack:error.stack});console.log('FAIL '+name+': '+error.message);}
  await writeFile(proof+'/results.json',JSON.stringify({base,results},null,2));
}

try{
  for(const width of [320,390,760,1440])await run(`responsive cold load ${width}px`,async()=>{
    const session=await setup(width);const {page,context}=session;
    try{
      assert.equal(await page.locator('#catalog-grid .story-card').count(),9,'movie-first discovery has nine movies');
      assert.equal(await page.locator('.hc-slide').count(),5,'hero keeps all five slides mounted');
      assert.equal(await page.locator('.community-card').count(),4,'four compact featured creator profiles');
      await assertNoOverflow(page);
      await page.screenshot({path:`${proof}/discover-${width}.png`});
      await page.locator('[data-format="novel"]').click();
      await page.locator('[data-open="novel-ghost"]').first().click();
      await page.locator('.novel-body p').first().waitFor();
      await assertNoOverflow(page,'#story-dialog');
      assert.equal(await page.locator('.novel-body p').count(),10);
      await page.screenshot({path:`${proof}/reader-${width}.png`});
      await closeStory(page);await clean(session);
      return 'Movie catalog, creator grid and novel modal fit viewport; no runtime or asset errors';
    }finally{await context.close();}
  });

  await run('nine distinct novel chapters and chapter advance',async()=>{
    const session=await setup();const {page,context}=session;
    try{
      await page.locator('[data-format="novel"]').click();
      assert.equal(await page.locator('#catalog-grid .story-card').count(),3);
      const texts=[];
      for(const id of readers){
        await page.locator(`[data-open="${id}"]`).first().click();
        assert.equal(await page.locator('#episode-grid button').count(),3);
        for(let chapter=1;chapter<=3;chapter++){
          if(chapter>1)await page.locator('[data-read-next]').click();
          await page.waitForFunction(ep=>document.querySelector('.reader-heading span').textContent.startsWith(`บทที่ ${ep}`),chapter);
          const text=await page.locator('.novel-body').textContent();
          assert.ok(text.length>2500,'chapter contains substantial readable fiction');
          texts.push(text);
          assert.equal(await page.locator('.novel-body p').count(),10);
          assert.equal(await page.locator('#story-video').getAttribute('src'),null,'reader does not retain video audio');
        }
        assert.match(await page.locator('.reader-end').textContent(),/จบเรื่องแล้ว/);
        await page.locator('[data-reader-finish]').click();
        await page.waitForFunction(()=>!document.querySelector('#story-dialog').open);
      }
      assert.equal(new Set(texts).size,9,'each chapter contains different prose');
      await clean(session);return 'Three original novels, three full chapters each, next chapter and finished-story return';
    }finally{await context.close();}
  });

  await run('reading theme font size and resume persist after reload',async()=>{
    const session=await setup(390);const {page,context}=session;
    try{
      await page.locator('[data-shelf-open="novel-ghost"]').click();
      await page.locator('[data-reader-theme="night"]').click();
      await page.locator('[data-reader-size="1"]').click();
      assert.equal(await page.locator('#reader-size-value').textContent(),'19');
      assert.equal(await page.locator('#comic-reader').getAttribute('data-theme'),'night');
      await page.locator('[data-episode="2"]').click();
      await page.waitForFunction(()=>document.querySelector('.reader-heading span').textContent.startsWith('บทที่ 2'));
      await page.locator('#comic-reader').evaluate(reader=>reader.scrollTop=760);
      await closeStory(page);
      const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).progress['novel-ghost'],stateKey);
      assert.equal(saved.episode,2);assert.ok(saved.time>650,'actual reading position is saved');
      await page.reload({waitUntil:'networkidle'});
      await page.locator('[data-resume="novel-ghost"]').click();
      await page.waitForFunction(()=>document.querySelector('#comic-reader').scrollTop>650);
      assert.match(await page.locator('.reader-heading span').textContent(),/บทที่ 2/);
      assert.equal(await page.locator('#comic-reader').getAttribute('data-theme'),'night');
      assert.equal(await page.locator('#reader-size-value').textContent(),'19');
      await page.screenshot({path:proof+'/reader-night-resumed.png'});
      await clean(session);return {savedEpisode:saved.episode,savedPosition:saved.time,theme:'night',fontSize:19};
    }finally{await context.close();}
  });

  await run('two comic episodes use different images that decode',async()=>{
    const session=await setup(390);const {page,context}=session;
    try{
      await page.locator('[data-format="comic"]').click();
      await page.locator('[data-open="hr"]').first().click();
      assert.equal(await page.locator('#episode-grid button').count(),2);
      const chapters=[];
      for(const episode of [1,2]){
        if(episode===2)await page.locator('[data-read-next]').click();
        const images=await page.locator('.comic-page img').evaluateAll(async images=>Promise.all(images.map(async image=>{await image.decode();return {src:image.src,width:image.naturalWidth,height:image.naturalHeight};})));
        assert.equal(images.length,episode===1?3:2);
        assert.ok(images.every(image=>image.width>0&&image.height>0));chapters.push(images);
        await assertNoOverflow(page,'#story-dialog');
        await page.screenshot({path:`${proof}/comic-episode-${episode}.png`});
      }
      assert.equal(new Set(chapters.flat().map(image=>image.src)).size,5,'five separate comic pages');
      await clean(session);return chapters;
    }finally{await context.close();}
  });

  await run('creator portrait linked novel and follow persistence',async()=>{
    const session=await setup(390);const {page,context}=session;
    try{
      await page.locator('[data-community-creator="ghost"]').click();
      await page.locator('.community-dialog[open]').waitFor();
      const portrait=await page.locator('.community-profile-portrait').evaluate(async image=>{await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};});
      assert.ok(portrait.width>=256&&portrait.height>=256);
      assert.equal(await page.locator('.community-dialog [data-community-work="novel-ghost"]').count(),1);
      await page.locator('.community-dialog [data-community-follow="ghost"]').click();
      assert.equal(await page.locator('.community-dialog [data-community-follow="ghost"]').getAttribute('aria-pressed'),'true');
      await assertNoOverflow(page,'.community-dialog');
      await page.screenshot({path:proof+'/creator-profile.png'});
      await page.locator('.community-dialog [data-community-work="novel-ghost"]').click();
      await page.locator('.novel-body p').first().waitFor();
      assert.match(await page.locator('#story-title').textContent(),/ห้องที่ไม่มีเลข/);
      assert.equal(await page.locator('.community-dialog').getAttribute('open'),null,'profile closes before story opens');
      await closeStory(page);await page.reload({waitUntil:'networkidle'});
      await page.locator('[data-community-creator="ghost"]').click();
      await page.locator('.community-dialog[open]').waitFor();
      assert.equal(await page.locator('.community-dialog [data-community-follow="ghost"]').getAttribute('aria-pressed'),'true');
      await page.locator('.community-dialog [data-community-follow="ghost"]').click();
      assert.equal(await page.locator('.community-dialog [data-community-follow="ghost"]').getAttribute('aria-pressed'),'false');
      await clean(session);return {portrait,followAndUnfollowPersisted:true,linkedNovelOpens:true};
    }finally{await context.close();}
  });

  await run('format genre search and saved collection',async()=>{
    const session=await setup();const {page,context}=session;
    try{
      await page.locator('[data-format="animation"]').click();assert.equal(await page.locator('#catalog-grid .story-card').count(),2);
      await page.locator('[data-format="all"]').click();assert.equal(await page.locator('#catalog-grid .story-card').count(),16);
      await page.locator('[data-genre="ผีไทย"]').click();assert.equal(await page.locator('#catalog-grid .story-card').count(),3);
      await page.locator('[data-genre="ทั้งหมด"]').click();
      await page.locator('.search-toggle').click();await page.locator('#search-input').fill('ไปรษณีย์');
      assert.equal(await page.locator('#catalog-grid .story-card').count(),1);
      assert.equal(await page.locator('#catalog-grid .story-card').getAttribute('data-story-id'),'novel-naga');
      await page.locator('[data-save="novel-naga"]').click();
      await page.locator('#search-close').click();
      await page.locator('.site-header [data-view="saved"]').click();
      assert.equal(await page.locator('#catalog-grid .story-card').count(),1);
      assert.equal(await page.locator('[data-save="novel-naga"]').getAttribute('aria-pressed'),'true');
      await page.reload({waitUntil:'networkidle'});await page.locator('.site-header [data-view="saved"]').click();
      assert.equal(await page.locator('#catalog-grid .story-card').count(),1,'saved novel survives cold reload');
      await page.locator('[data-save="novel-naga"]').click();
      assert.equal(await page.locator('#empty-state').isVisible(),true);
      await clean(session);return 'Formats and genres filter all content, Thai search finds novel, saved collection persists and can be emptied';
    }finally{await context.close();}
  });

  await run('completed native MP4 pilots play video and audio',async()=>{
    const session=await setup(390);const {page,context}=session;
    try{
      const available=await page.evaluate(async()=>{const {stories}=await import('./library.js');return stories.filter(s=>s.pilots?.length).map(s=>({id:s.id,episodes:s.pilots.length}));});
      assert.ok(available.some(p=>p.id==='village'),'village pilot is completed');
      const decoded=[];
      for(const story of available){
        await page.locator(`[data-shelf-open="${story.id}"]`).click();
        for(let episode=1;episode<=story.episodes;episode++){
          if(episode>1)await page.locator('#next-episode').click();
          await page.waitForFunction(()=>{const v=document.querySelector('#story-video');return v.readyState>=2&&v.currentTime>.3;});
          const media=await page.locator('#story-video').evaluate(video=>({src:video.currentSrc,duration:video.duration,width:video.videoWidth,height:video.videoHeight,controls:video.controls,playsInline:video.playsInline,muted:video.muted,error:video.error?.code||null,decodedAudio:video.webkitAudioDecodedByteCount||0,decodedVideo:video.webkitVideoDecodedByteCount||0,frames:video.getVideoPlaybackQuality().totalVideoFrames}));
          assert.match(media.src,/\.mp4$/);assert.ok(media.duration>=5&&media.width>0&&media.height>0);assert.ok(media.controls&&media.playsInline);assert.equal(media.error,null);
          assert.ok(media.frames>0,'native video frames decoded');assert.ok(media.decodedAudio>0,'native audio decoded');
          assert.match(await page.locator('.video-topline .demo-badge').textContent(),/AI PILOT/);
          await assertNoOverflow(page,'#story-dialog');decoded.push({...media,story:story.id,episode});
          await page.screenshot({path:`${proof}/pilot-${story.id}-${episode}.png`});
        }
        await closeStory(page);
      }
      await clean(session);return decoded;
    }finally{await context.close();}
  });
}finally{
  await browser.close();
  await writeFile(proof+'/results.json',JSON.stringify({base,results},null,2));
}
if(results.some(result=>result.status==='fail'))process.exitCode=1;
