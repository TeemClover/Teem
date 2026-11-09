/** Real-app landing proof. Remote players are blocked; local app footage is played. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const output=process.env.XIRCLE_PROOF_DIR||'/tmp/xircle-landing-proof';
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4','.m4v':'video/mp4'};
const server=createServer(async(req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    const url=new URL(req.url,'http://localhost');
    const path=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!path.startsWith(root+sep)||url.pathname.split('/').some(p=>p.startsWith('.')))throw Error('invalid path');
    const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;
    const data=await readFile(file);
    const headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){
      const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;
      if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
      res.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${data.length}`});
      res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
    }else{
      res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
    }
  }catch {res.writeHead(404);res.end('Not found');}
});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
const base=`http://127.0.0.1:${server.address().port}`;
const report={startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),runtime:process.version,checks:[],screenshots:[],pageErrors:[],failedLocalRequests:[],externalRequests:[],passed:false};
let browser;
const check=label=>{report.checks.push(label);console.log('PASS '+label);};
async function context(width,extra={}){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference',...extra});
  await c.route('**/*',route=>{
    const request=route.request();
    if(new URL(request.url()).origin===base&&['GET','HEAD'].includes(request.method()))return route.continue();
    report.externalRequests.push(request.url());return route.abort();
  });
  const page=await c.newPage();
  page.on('pageerror',error=>report.pageErrors.push({url:page.url(),message:error.message}));
  page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)report.failedLocalRequests.push({url:response.url().replace(base,''),status:response.status()});});
  return {c,page};
}
async function open(page,path='/xircle/'){
  await page.goto(base+path,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
}
async function shot(page,name){await page.screenshot({path:resolve(output,name+'.png')});report.screenshots.push(name+'.png');}
async function stage(page,value){
  try {await page.waitForFunction(value=>document.querySelector('#food-demo').dataset.stage===value,value,{timeout:10000,polling:50});}
  catch(error){throw new Error(`Food demo did not reach ${value}: `+JSON.stringify(await page.locator('#food-demo').evaluate(el=>({stage:el.dataset.stage,status:document.querySelector('#scan-status').textContent,states:window.__foodStages}))),{cause:error});}
}
async function layout(page,width){
  assert.equal(await page.locator('h1:visible').count(),1);
  assert.equal(await page.locator('main').count(),1);
  assert.equal(await page.locator('.site-header').count(),1);
  const overflow=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,items:[...document.querySelectorAll('h1,h2,a,button,select,summary')].filter(el=>{
    if(!el.checkVisibility()||el.closest('.skip,.sr-only'))return false;
    const r=el.getBoundingClientRect();return r.width>0&&(r.left< -2||r.right>innerWidth+2);
  }).map(el=>({tag:el.tagName,text:el.textContent.slice(0,60),class:el.className}))}));
  assert.ok(overflow.document<=width+1,`page overflow at ${width}: ${JSON.stringify(overflow)}`);
  assert.deepEqual(overflow.items,[],`control/title overflow at ${width}: ${JSON.stringify(overflow)}`);
}
try {
  browser=await chromium.launch({executablePath:process.env.XIRCLE_CHROME||process.env.FRONTDOOR_CHROME,headless:true});
  report.browser=await browser.version();
  for(const width of [320,390,768,1440]){
    const {c,page}=await context(width);
    await open(page);
    await page.locator('#official-media[data-media-ready="true"]').waitFor();
    await layout(page,width);await shot(page,`${width}-landing`);
    assert.equal(await page.locator('.routine-episode').count(),4);
    assert.equal(await page.locator('.routine-episode .coming').count(),4);
    for(const label of await page.locator('.routine-episode .coming').allTextContents())assert.equal(label.trim(),'COMING SOON');
    assert.equal(await page.locator('.routine-episode button,.routine-episode [data-video]').count(),0);
    for(const key of ['download','ios','android']){
      const links={download:'https://www.xircle.health/download',ios:'https://apps.apple.com/th/app/id6785562482',android:'https://play.google.com/store/apps/details?id=health.xircle.app'};
      assert.ok(await page.locator(`a[href="${links[key]}"]`).count(),`missing ${key} download`);
    }
    assert.equal(await page.locator('.media-card-art img').count(),10);
    for(const image of await page.locator('.media-card-art img').all()){
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(img=>img.decode());
      assert.ok(await image.evaluate(img=>img.naturalWidth>=400));
      assert.equal(await image.getAttribute('data-fallback'),null,'official thumbnail should not need generic fallback');
    }
    assert.equal(await page.locator('iframe').count(),0);
    await layout(page,width);
    await page.locator('#food-demo').evaluate(el=>{
      window.__foodStages=[];
      new MutationObserver(()=>window.__foodStages.push(el.dataset.stage)).observe(el,{attributes:true,attributeFilter:['data-stage']});
    });
    const play=page.locator(width<700?'#scan-camera-play':'#scan-play');
    await play.click();await stage(page,'scanning');
    assert.equal(await page.locator('#portion').isEnabled(),true);
    if(width<700){
      const visibleCamera=await page.locator('.camera-view').evaluate(el=>{const r=el.getBoundingClientRect();return r.bottom>100&&r.top<innerHeight-30;});
      assert.equal(visibleCamera,true,'mobile scan starts while camera remains on screen');
    }
    await stage(page,'complete');
    assert.deepEqual(await page.evaluate(()=>window.__foodStages),['scanning','ingredients','complete']);
    assert.equal(await page.locator('.scan-step[aria-current="step"]').getAttribute('data-step'),'2');
    await page.locator('#portion').selectOption('2');
    assert.equal(await page.locator('[data-nutrition="kcal"]').innerText(),'628');
    assert.equal(await page.locator('[data-nutrition="protein"]').innerText(),'70');
    assert.equal(await page.locator('[data-nutrition="carbs"]').innerText(),'48');
    assert.equal(await page.locator('[data-nutrition="fat"]').innerText(),'17.4');
    await page.locator('#portion').selectOption('0.5');
    assert.equal(await page.locator('[data-nutrition="kcal"]').innerText(),'157');
    await page.locator('#portion').selectOption('1');
    await play.click();await stage(page,'scanning');
    await page.locator('.scan-step[data-step="2"]').click();await stage(page,'complete');
    // A canceled replay must not return the result to an intermediate stage later.
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#food-demo').getAttribute('data-stage'),'complete');
    await page.locator('.scan-step[data-step="1"]').click();await stage(page,'ingredients');
    await page.locator('.scan-step[data-step="2"]').click();await stage(page,'complete');
    assert.equal(await page.locator('.scan-step').first().isEnabled(),true);
    await shot(page,`${width}-food`);
    await page.locator('#band-choice [data-band="white"]').click();
    assert.match(await page.locator('#band-product').getAttribute('src'),/band-white\.jpg$/);
    assert.equal(await page.locator('#band-color').innerText(),'สีขาว');
    await page.locator('#band-choice [data-band="black"]').click();
    assert.match(await page.locator('#band-product').getAttribute('src'),/band-black\.jpg$/);
    if(width<700){
      await page.locator('#nav-menu summary').click();
      assert.equal(await page.locator('#nav-menu').evaluate(el=>el.open),true);
      await page.locator('#nav-menu a[href="#eat"]').click();
      assert.equal(await page.locator('#nav-menu').evaluate(el=>el.open),false);
      await page.locator('#nav-menu summary').click();await page.keyboard.press('Escape');
      assert.equal(await page.locator('#nav-menu').evaluate(el=>el.open),false);
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
    }
    check(`${width}px: layout, 10 real thumbnails, food scan/portions/replay, band colors and Routine X`);
    await c.close();
  }

  assert.deepEqual(report.externalRequests,[],'the page should not request third-party players or thumbnails before Play');
  const {c,page}=await context(390);
  await open(page);
  const trigger=page.locator('.local-clip[data-video]').first();
  assert.equal(await trigger.isEnabled(),true);
  await trigger.click();
  assert.equal(await page.locator('#video-dialog').evaluate(el=>el.open),true);
  const video=page.locator('#video-host video');
  await video.waitFor();
  await page.waitForFunction(()=>document.querySelector('#video-host video')?.currentTime>0.5,null,{timeout:15000});
  const playingTime=await video.evaluate(el=>el.currentTime);
  const videoHandle=await video.elementHandle();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#video-dialog').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#video-host video').count(),0);
  assert.equal(await videoHandle.evaluate(el=>el.paused),true);
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
  await trigger.click();await page.locator('#video-close').click();
  assert.equal(await page.locator('#video-host').innerText(),'');
  report.localVideoPlaybackSeconds=playingTime;
  check('actual local app footage advances; Escape/close pauses, removes player and restores focus');
  await c.close();

  const restored=await context(390,{reducedMotion:'reduce'});
  await open(restored.page,'/xircle/?category=band&watch=w31zX_f5iqI');
  await restored.page.locator('#official-media[data-media-ready="true"]').waitFor();
  assert.equal(await restored.page.locator('.media-dialog').evaluate(el=>el.open),true);
  assert.equal(await restored.page.locator('.media-dialog iframe').count(),0);
  await restored.page.keyboard.press('Escape');
  await restored.page.locator('#scan-camera-play').click();await stage(restored.page,'complete');
  assert.equal(await restored.page.locator('.camera-result-link').isVisible(),true);
  assert.equal(await restored.page.locator('.reveal.will-reveal:not(.is-visible)').count(),0);
  check('old official-video URLs restore without autoplay; reduced motion shows the food result immediately');
  await restored.c.close();

  const staticPage=await context(320,{javaScriptEnabled:false});
  await open(staticPage.page);
  await layout(staticPage.page,320);
  assert.equal(await staticPage.page.locator('h1').isVisible(),true);
  assert.equal(await staticPage.page.locator('#portion').isDisabled(),true);
  assert.equal(await staticPage.page.locator('.scan-step').first().isDisabled(),true);
  assert.equal(await staticPage.page.locator('.local-clip').first().isDisabled(),true);
  assert.equal(await staticPage.page.locator('.local-clips a.video-fallback').count(),2);
  assert.equal(await staticPage.page.locator('.routine-episode').count(),4);
  assert.equal(await staticPage.page.locator('#official-media a[href="https://www.youtube.com/@CloverXOfficial"]').count(),1);
  assert.equal(await staticPage.page.locator('.food-demo .nutrition-card').evaluate(el=>getComputedStyle(el).opacity),'1');
  check('without JavaScript, content/nutrition/download links remain readable and local video links remain available');
  await staticPage.c.close();
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedLocalRequests,[]);
  report.passed=true;
} catch(error) {
  report.error={message:error.message,stack:error.stack};
  console.error(error);
  process.exitCode=1;
} finally {
  report.finishedAt=new Date().toISOString();
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await browser?.close();
  await new Promise(done=>server.close(done));
  console.log(`Landing evidence: ${resolve(output,'report.json')}`);
}
