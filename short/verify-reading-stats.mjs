import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const server=process.env.SHORT_BASE_URL?null:createPreviewServer();if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=(process.env.SHORT_BASE_URL||`http://127.0.0.1:${server.address().port}`).replace(/\/$/,'');
const proof=process.env.SHORT_PROOF_DIR||'/private/tmp/torntor-reading-stats-qa';await mkdir(proof,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[],key='torntor:platform:demo:v1';
async function run(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS '+name)}catch(e){results.push({name,status:'fail',error:e.stack});console.log('FAIL '+name+': '+e.message)}}
try{
 await run('blocked chapter creates no reads; episode 21 reading, completion, dedup and CSV persist',async()=>{
  const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});try{
   const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(base+'/short/story/somchai/?episode=21',{waitUntil:'networkidle'});
   await p.locator('#unlock-dialog[open]').waitFor();await p.waitForTimeout(11000);
   assert.equal(await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).events?.length||0,key),0,'coin prompt must not count fallback free chapter');
   await p.locator('#confirm-unlock').click();await p.waitForFunction(()=>!document.querySelector('#unlock-dialog').open);
   assert.equal(await p.locator('.webtoon-page').count(),11);
   await p.locator('#comic-reader').evaluate(e=>e.scrollTop=0);await p.waitForTimeout(11500);
   let ev=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).events,key);
   assert.equal(ev.length,1);assert.equal(ev[0].episode,21);assert.equal(ev[0].complete,false);assert.ok(ev[0].seconds>=10);
   for(const img of await p.locator('#comic-reader img').all()){await img.evaluate(e=>e.scrollIntoView());await img.evaluate(e=>e.decode())}
   await p.locator('#comic-reader').evaluate(e=>e.scrollTop=e.scrollHeight);await p.waitForTimeout(1600);
   await p.locator('[data-close="story-dialog"]').click();
   await p.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).events[0]?.complete===true,key);
   ev=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).events,key);assert.equal(ev.length,1,'one session recorded once');
   await p.goto(base+'/short/admin/?story=somchai',{waitUntil:'networkidle'});
   await p.waitForFunction(()=>document.querySelectorAll('#episode-stats tr').length===30);
   const row=p.locator('[data-stat-episode="21"]');assert.match(await row.textContent(),/ขยายแปลงเพาะปลูก/);
   assert.equal(await row.locator('td').nth(1).textContent(),'1');assert.equal(await row.locator('td').nth(2).textContent(),'1');assert.equal(await row.locator('td').nth(3).textContent(),'100%');assert.equal(await row.locator('td').nth(5).textContent(),'1');assert.equal(await row.locator('td').nth(7).textContent(),'10');
   assert.equal(await p.locator('[data-stat-episode="30"] td').nth(1).textContent(),'0');assert.equal(await p.locator('#stats-views-label').textContent(),'ยอดอ่าน');
   const [d]=await Promise.all([p.waitForEvent('download',{timeout:10000}),p.locator('#export').click()]).catch(async e=>{await p.screenshot({path:proof+'/csv-error.png'});throw Error(e.message+'; browser errors: '+JSON.stringify(errors))});await d.saveAs(proof+'/somchai-30-stats.csv');
   const csv=await(await import('node:fs/promises')).readFile(proof+'/somchai-30-stats.csv','utf8');assert.equal(csv.trim().split('\n').length,31);assert.match(csv,/หมากฮอสกับหมากรุกไทย/);
   await p.screenshot({path:proof+'/somchai-stats-mobile.png',fullPage:true});
   await p.reload({waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelectorAll('#episode-stats tr').length===30);assert.equal(await p.locator('[data-stat-episode="21"] td').nth(1).textContent(),'1');
   assert.deepEqual(errors,[]);
  }finally{await c.close()}
 });
 for(const width of [320,1440])await run('empty chapters and stats filter responsive '+width,async()=>{
  const c=await browser.newContext({viewport:{width,height:1000}});try{const p=await c.newPage();await p.goto(base+'/short/admin/?story=somchai',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelectorAll('#episode-stats tr').length===30);assert.ok(await p.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.equal(await p.locator('[data-stat-episode="21"] td').nth(1).textContent(),'0');await p.screenshot({path:proof+`/somchai-stats-${width}.png`,fullPage:true});await p.locator('#stats-story').selectOption('');assert.equal(await p.locator('#episode-stats tr').count(),1);assert.match(await p.locator('#episode-stats').textContent(),/ยังไม่มียอด/);await p.goto(base+'/short/studio/',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#mode').textContent.includes('โหมดทดลอง'));assert.equal(await p.locator('#stats-story option[value="somchai"]').count(),0,'Creator must not see unowned catalogue');}finally{await c.close()}
 });
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));await writeFile(proof+'/results.json',JSON.stringify({base,results},null,2))}
if(results.some(r=>r.status==='fail'))process.exitCode=1;
