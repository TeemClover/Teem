// Verify responsive art selection and real mobile video controls on the actual app.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const server=process.env.SHORT_BASE_URL?null:createPreviewServer();
if(server)await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=(process.env.SHORT_BASE_URL||`http://127.0.0.1:${server.address().port}`).replace(/\/$/,'');
const proof=process.env.SHORT_PROOF_DIR||'/private/tmp/tontor-responsive-hero-qa';
await mkdir(proof,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
const selectedChecks=process.env.SHORT_HERO_MEDIA_VERIFY?new RegExp(process.env.SHORT_HERO_MEDIA_VERIFY):null;
async function run(name,fn){if(selectedChecks&&!selectedChecks.test(name))return;try{const detail=await fn();results.push({name,status:'pass',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'fail',message:e.message});console.log('FAIL '+name+': '+e.message);}await writeFile(proof+'/results.json',JSON.stringify({base,results},null,2));}
async function setup(width,height=1000,options={}){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<=760,hasTouch:width<=760,...options});
 const page=await context.newPage();const errors=[],missing=[],videos=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});
 await page.goto(base+'/short/',{waitUntil:'networkidle'});await page.locator('.hc-slide').first().waitFor();
 const ids=await page.locator('.hc-slide').evaluateAll(p=>p.map(e=>e.dataset.hcId));assert.equal(new Set(ids).size,4);
 return {page,context,ids,errors,missing,videos};
}
async function choose(s,id){const index=s.ids.indexOf(id);await s.page.locator(`[data-hc-index="${index}"]`).click();await s.page.waitForFunction(({id,index})=>{let h=document.querySelector('.hc-hero'),t=h.querySelector('.hc-track');return h.dataset.hcActive===id&&Math.abs(t.scrollLeft-index*t.clientWidth)<1;},{id,index});}
async function clean(s){assert.deepEqual(s.errors,[]);assert.deepEqual(s.missing,[]);assert.ok(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
async function playing(s,id){await s.page.waitForFunction(id=>{let v=document.querySelector(`[data-hc-id="${id}"] .hc-preview-video`);return v?.readyState>=2&&!v.paused&&v.currentTime>.15;},id);}
try{
for(const width of [992,1440,2560])await run(`four full-width desktop compositions ${width}`,async()=>{
 const s=await setup(width);try{
 const art=[];
 for(const id of s.ids){await choose(s,id);const frame=await s.page.locator(`[data-hc-id="${id}"] .hc-visual img`).evaluate(async img=>{await img.decode();let r=img.getBoundingClientRect();return {src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight,left:r.left,right:r.right,viewport:innerWidth};});assert.match(frame.src,new RegExp(id+'-wide-v1.webp'));assert.ok(frame.width/frame.height>2);assert.ok(Math.abs(frame.left)<1&&Math.abs(frame.right-frame.viewport)<1);art.push(frame);await s.page.screenshot({path:proof+`/desktop-${width}-${id}.png`});}
 assert.equal(s.videos.length,0,'desktop hero does not request MP4 backgrounds');
 assert.equal(await s.page.locator('.hc-preview').first().isVisible(),false);
 assert.ok(await s.page.locator('.hc-preview-video').evaluateAll(v=>v.every(e=>!e.getAttribute('src')&&e.paused)));
 await choose(s,'warrior');await s.page.locator('[data-hc-id="warrior"] .hc-watch').click();await s.page.waitForFunction(()=>document.querySelector('#story-video').videoWidth>0&&!document.querySelector('#story-video').paused);
 assert.equal(await s.page.locator('#story-video').evaluate(v=>v.videoWidth/v.videoHeight),9/16);
 assert.match(await s.page.locator('#story-video').getAttribute('src'),/hero-warrior-1.mp4/);
 await s.page.screenshot({path:proof+`/vertical-player-${width}.png`});await clean(s);return art;
 }finally{await s.context.close();}
});
for(const {width,height} of [{width:320,height:568},{width:390,height:844}])await run(`two-button real mobile previews ${width}x${height}`,async()=>{
 const s=await setup(width,height);try{
 for(const id of ['warrior','village']){
 await choose(s,id);await playing(s,id);
 const panel=s.page.locator(`[data-hc-id="${id}"]`),v=panel.locator('.hc-preview-video');
 assert.equal(await panel.locator('.hc-preview-buttons button').count(),2);
 assert.equal(await panel.locator('.hc-preview-buttons').innerText(),'');
 assert.equal(await panel.locator('.hc-preview-progress,.hc-preview-duration,.hc-preview-label').count(),0);
 for(const button of await panel.locator('.hc-preview-buttons button').all()){const r=await button.boundingBox();assert.ok(r.width>=44&&r.height>=44);}
 assert.ok((await panel.locator('.hc-visual img').evaluate(e=>e.currentSrc)).includes('/clips/'));
 assert.equal(await v.evaluate(e=>e.muted),true);
 await panel.locator('.hc-preview-play').click();assert.equal(await v.evaluate(e=>e.paused),true);
 await panel.locator('.hc-preview-sound').click();assert.equal(await v.evaluate(e=>e.paused),true,'sound toggle must preserve a user pause');
 await panel.locator('.hc-preview-sound').click();
 await panel.locator('.hc-preview-play').click();await playing(s,id);
 await panel.locator('.hc-preview-sound').click();assert.equal(await v.evaluate(e=>e.muted),false);
 await panel.locator('.hc-preview-sound').click();assert.equal(await v.evaluate(e=>e.muted),true);
 await s.page.screenshot({path:proof+`/mobile-${width}-${id}.png`});
 await panel.locator('.hc-watch').click();assert.match(await s.page.locator('#story-video').getAttribute('src'),id==='warrior'?/hero-warrior-1.mp4/:/village-1.mp4/);
 assert.equal(await v.evaluate(e=>e.paused),true,'modal pauses background');await s.page.locator('[data-close="story-dialog"]').click();await playing(s,id);
 }
 await choose(s,'krasue');assert.ok(await s.page.locator('.hc-preview-video').evaluateAll(v=>v.every(e=>!e.getAttribute('src')&&e.paused&&e.muted)));
 await clean(s);return 'Both native videos play; play/pause and sound work; inactive and modal audio stop; no textual HUD.';
 }finally{await s.context.close();}
});
await run('responsive resize unloads video and restores landscape key art',async()=>{
 const s=await setup(390,844);try{await choose(s,'warrior');await playing(s,'warrior');await s.page.setViewportSize({width:1440,height:1000});await s.page.waitForFunction(()=>{let v=document.querySelector('[data-hc-id="warrior"] .hc-preview-video');return !v.getAttribute('src')&&v.paused;});await s.page.waitForFunction(()=>{let img=document.querySelector('[data-hc-id="warrior"] .hc-visual img');return img.complete&&img.naturalWidth>0&&img.currentSrc.includes('warrior-wide');});assert.match(await s.page.locator('[data-hc-id="warrior"] .hc-visual img').evaluate(e=>e.currentSrc),/warrior-wide/);await s.page.setViewportSize({width:390,height:844});await playing(s,'warrior');await clean(s);return 'Crossing breakpoint selects wide/portrait source correctly; desktop removes video, mobile resumes safely.';}finally{await s.context.close();}
});
await run('reduced motion preserves manual play',async()=>{
 const s=await setup(390,844,{reducedMotion:'reduce'});try{await choose(s,'warrior');const v=s.page.locator('[data-hc-id="warrior"] .hc-preview-video');assert.equal(await v.getAttribute('src'),null);await s.page.locator('[data-hc-id="warrior"] .hc-preview-play').click();await playing(s,'warrior');await clean(s);}finally{await s.context.close();}
});
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
