/** Six real lesson pages: start, resume, confirmed work, and the intentional secret passage. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat, mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const {chromium}=await import(process.env.FRONTDOOR_PLAYWRIGHT?pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href:'playwright');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.mp4':'video/mp4','.md':'text/markdown; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root)||path.relative(root,file).split(path.sep).some(part=>part.startsWith('.')))throw Error('Invalid path');
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.CLASSROOM_BASE_URL||`http://127.0.0.1:${server.address().port}`;
const output=process.env.CLASSROOM_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'classroom-learning-'));
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const lessons=['free-ai','image-ai','clip-ai','notebooklm','prompts','first-web'];
const report={base,checks:[],errors:[],layout:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
async function context(width){
 const c=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
 await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,reviews:[]}});return u.origin===new URL(base).origin?route.continue():route.abort();});
 return c;
}
async function topOf(page,selector){return page.locator(selector).evaluate(el=>el.getBoundingClientRect().top);}
try{
 const common=await readFile(path.join(root,'assets/course-learning-journey.js'),'utf8');
 for(const slug of lessons){
  const html=await readFile(path.join(root,'classroom',slug+'.html'),'utf8');
  const script=html.match(/<script[^>]*data-self-contained="course-learning-journey.js"[^>]*>([\s\S]*?)<\/script>/);
  assert.equal(script?.[1].trim(),common.trim(),slug+' embedded journey must match source');
 }
 pass('All six self-contained pages include the current shared journey');
 for(const width of [390,1440]){
  const c=await context(width);
  for(const [index,slug] of lessons.entries()){
   const page=await c.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>report.errors.push(slug+': '+e.message));
   await page.addLocatorHandler(page.locator('.mc-bi__later'),async()=>{await page.locator('.mc-bi__later').click();});
   await page.goto(base+'/classroom/'+slug+'.html',{waitUntil:'domcontentloaded'});
   await page.locator('#cl-launch').waitFor();await page.waitForTimeout(1400);
   const box=await page.locator('#cl-start').boundingBox();
   assert.ok(box&&box.y>=0&&box.y+box.height<844,`${slug} ${width}: start must be visible without scrolling (${JSON.stringify(box)})`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,slug+' horizontal overflow');
   assert.equal(await page.locator('#cl-completion').count(),1,slug+' completion must survive delayed page scripts');
   assert.equal(await page.locator('.cl-rail a').count(),6);
   assert.equal(await page.locator('#cl-introduction').getAttribute('open'),null);
   if(index<5)assert.equal(await page.locator('.cl-next').isVisible(),false,'next artifact link stays hidden until confirmation');
   const before=await page.evaluate(id=>JSON.parse(localStorage.getItem('mc_course_journey_v1')).lessons[id],slug);
   assert.notEqual(before.done,true,'reading a lesson must not claim a finished artifact');
   await page.screenshot({path:path.join(output,`${slug}-${width}.png`)});
   report.layout.push({slug,width,startY:Math.round(box.y),startBottom:Math.round(box.y+box.height)});
   await page.locator('#cl-start').click();await page.waitForTimeout(400);
   const work=await page.locator('.cl-steps a').nth(0).getAttribute('href');
   assert.ok(await topOf(page,work)<400,slug+' start reaches hands-on work');
   assert.equal(await page.evaluate(selector=>document.activeElement===document.querySelector(selector),work),true,slug+' keyboard focus follows start');
   await page.locator('.cl-steps a').nth(1).click();await page.waitForTimeout(250);
   const check=await page.locator('.cl-steps a').nth(1).getAttribute('href');
   assert.ok(await topOf(page,check)<400,slug+' second step reaches work review');
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#cl-start').waitFor();await page.waitForTimeout(1400);
   await page.evaluate(()=>scrollTo(0,0));await page.locator('#cl-start').click();await page.waitForTimeout(300);
   assert.ok(await topOf(page,check)<400,slug+' resume restores saved step');
   await page.locator('.cl-steps a').nth(2).click();await page.waitForTimeout(300);
   // The automatic encounter can open near the end; returning must keep the work usable.
   const signal=page.locator('#lesson6Signal');
   if(await signal.count()&&await signal.isVisible()){await page.keyboard.press('Escape');await page.waitForTimeout(200);}
   assert.equal(await page.locator('.cl-save').isDisabled(),true);
   await page.locator('[data-cl-check="artifact"]').check();assert.equal(await page.locator('.cl-save').isDisabled(),true);
   await page.locator('[data-cl-check="review"]').check();assert.equal(await page.locator('.cl-save').isEnabled(),true);
   await page.locator('.cl-save').click();
   await page.waitForFunction(id=>JSON.parse(localStorage.getItem('mc_course_journey_v1')).lessons[id].done===true,slug);
   assert.match(await page.locator('#cl-course-progress').innerText(),new RegExp(`${index+1} / 6`));
   if(index<5)assert.equal(await page.locator('.cl-next').isVisible(),true);
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#cl-launch').waitFor();await page.waitForTimeout(1400);
   assert.equal(await page.locator('.cl-save').isDisabled(),true);
   assert.equal(await page.locator('[data-cl-check="artifact"]').isChecked(),true);
   assert.equal(await page.locator('.cl-rail a[data-done="true"]').count(),index+1);
   pass(`${width}px ${slug}: visible start, three working steps, reload/resume, explicit artifact confirmation and cross-lesson progress`);
   await page.close();
  }
  await c.close();
 }
 // Legacy reading progress is deliberately distinct from the learner's actual deliverable.
 const c=await context(320);await c.addInitScript(()=>localStorage.setItem('mc_learn','free-ai,image-ai,clip-ai'));
 const page=await c.newPage();await page.goto(base+'/classroom/free-ai.html',{waitUntil:'domcontentloaded'});await page.locator('#cl-start').waitFor();await page.waitForTimeout(1400);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.match(await page.locator('#cl-course-progress').innerText(),/0 \/ 6/);
 if(await page.locator('.mc-bi__later').isVisible())await page.locator('.mc-bi__later').click();
 await page.locator('.cl-art').click();assert.equal(await page.locator('#cl-introduction').getAttribute('open'),'');
 assert.equal(await page.locator('#cl-introduction .classroom-lesson-header-image').isVisible(),true);
 pass('320px readable layout; original artwork remains accessible; reading progress does not count as an artifact');
 await c.close();
 assert.deepEqual(report.errors,[]);
}catch(error){report.failure=error.stack;throw error;}
finally{await writeFile(path.join(output,'proof.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));console.log('Proof: '+output);}
