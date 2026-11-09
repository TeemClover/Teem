/** Interactive Clover X brand journey: real local browser proof, external writes/playback blocked. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, readdir, stat, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.XIRCLE_PROOF_DIR || '/tmp/xircle-journey-proof';
const interactiveOnly=process.env.XIRCLE_INTERACTIONS_ONLY==='1';
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
  if(req.method!=='GET'){res.writeHead(405);res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!path.startsWith(root)||url.pathname.split('/').some(p=>p.startsWith('.')))throw Error('bad path');
    const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.XIRCLE_CHROME||process.env.FRONTDOOR_CHROME,headless:true});
const report={base,mode:interactiveOnly?'interactions-only':'full',startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirtyFiles:execFileSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean),runtime:process.version,browser:await browser.version(),checks:[],screenshots:[],layouts:[],pageErrors:[],failedLocalRequests:[],externalRequests:[],passed:false};
const check=name=>{report.checks.push(name);console.log('PASS '+name);};
async function context(width,extra={}){
  const externalRequests=[];
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',...extra});
  await c.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin===base&&request.method()==='GET')return route.continue();report.externalRequests.push(request.url());externalRequests.push(request.url());return route.abort();});
  const page=await c.newPage();page.on('pageerror',error=>report.pageErrors.push({url:page.url(),message:error.message}));
  page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)report.failedLocalRequests.push({url:response.url().replace(base,''),status:response.status()});});
  return {c,page,externalRequests};
}
async function open(page,path){await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);}
async function shot(page,name,fullPage=false){
  if(/brand-(?:signal|habix|devices|routine)$/.test(name)&&!await page.locator('#brand-presentation').evaluate(el=>el.open))await page.evaluate(()=>{const target=document.querySelector('#brand-experience');scrollTo({top:scrollY+target.getBoundingClientRect().top-100,behavior:'instant'});});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:`${output}/${name}.png`,fullPage});report.screenshots.push(name+'.png');
}
async function layout(page,path,width){
  assert.equal(await page.locator('.journey-header').count(),1,path+' shared header');
  assert.equal(await page.locator('main').count(),1,path+' one main landmark');
  assert.equal(await page.locator('h1:visible').count(),1,path+' one visible page title');
  const metrics=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('h1,a,button,input,summary')].filter(el=>{
    if(!el.checkVisibility()||el.closest('.journey-skip,.x-cinema,.hero-shape,.scene-plates,.flying-day,.assembled-day'))return false;
    const r=el.getBoundingClientRect();return r.right>innerWidth+2||r.left < -2;
  }).map(el=>({tag:el.tagName,text:el.textContent.slice(0,55),class:el.className}))}));
  assert.ok(metrics.document<=metrics.width+1,`${path} @${width} page overflow ${JSON.stringify(metrics)}`);
  assert.deepEqual(metrics.overflow,[],`${path} @${width} interactive or heading overflow`);
  report.layouts.push({path,width});
}
async function station(page,name){await page.waitForFunction(name=>location.hash==='#visit-'+name,name);await page.locator('#brand-stage').waitFor({state:'visible'});}
async function visibleSceneTitle(page){
  try{await page.waitForFunction(()=>{const title=document.querySelector('#scene-title').getBoundingClientRect(),bar=document.querySelector('#brand-presentation').open?document.querySelector('.brand-presentation-bar'):document.querySelector('.journey-header');return title.top>=bar.getBoundingClientRect().bottom-2&&title.bottom<=innerHeight-20;},{},{timeout:5000});}
  catch(error){throw new Error('Scene title must remain visible after navigation: '+JSON.stringify(await page.evaluate(()=>({url:location.href,station:document.querySelector('#brand-stage').dataset.station,top:document.querySelector('#scene-title').getBoundingClientRect().top,bottom:document.querySelector('#scene-title').getBoundingClientRect().bottom,scrollY,active:document.activeElement.id}))),{cause:error});}
}
async function action(page,name,value){const selector=`[data-action="${name}"]${value===undefined?'':`[data-value="${value}"]`}`;const scope=await page.locator('#brand-presentation').evaluate(el=>el.open)?page.locator('#brand-presentation'):page;await scope.locator(selector+':visible').first().click();}
async function visit(page,name){await action(page,'open-map');await page.locator('#map-dialog').waitFor({state:'visible'});await page.locator(`#map-dialog [data-action="visit"][data-value="${name}"]`).click();await station(page,name);assert.equal(await page.locator('#map-dialog').evaluate(el=>el.open),false);}
async function files(dir){return(await Promise.all((await readdir(resolve(root,'xircle',dir),{withFileTypes:true})).map(e=>e.isDirectory()&&!['assets','_shared'].includes(e.name)?files(dir+e.name+'/'):e.name==='index.html'?['/xircle/'+dir]:[]))).flat();}
try{
  // Stable public routes and all references retain the original 112 route/viewport checks.
  for(const width of (interactiveOnly?[]:[320,390,768,1440])){
    const {c,page}=await context(width);
    for(const path of ['/xircle/','/xircle/learn/','/xircle/learn/topic/?t=habit-score','/xircle/hardware/','/xircle/products/','/xircle/doc/']){
      await open(page,path);await layout(page,path,width);
      if([390,1440].includes(width))await shot(page,`${width}-${path.split('?')[0].split('/').filter(Boolean).slice(1).join('-')||'landing'}`);
    }
    check(`six brand destinations fit ${width}px, one title and landmark, shared navigation`);await c.close();
  }
  for(const width of (interactiveOnly?[]:[390,1440])){
    const {c,page}=await context(width);
    const documents=(await files('doc/')).filter(p=>p!=='/xircle/doc/');assert.equal(documents.length,44);
    for(const path of documents){await open(page,path);await layout(page,path,width);}
    check(`all 44 deep documents open directly and fit ${width}px`);await c.close();
  }
  // All interactive stations and the expanded walking map also fit narrow, tablet and desktop widths.
  for(const width of (interactiveOnly?[]:[320,768,1440])){
    const {c,page}=await context(width);await open(page,'/xircle/');
    for(const id of ['hello','signal','connect','routine','habix','finish']){await visit(page,id);await layout(page,'/xircle/#visit-'+id,width);}
    await action(page,'open-map');await layout(page,'/xircle/#expanded-map',width);if(width===320)await shot(page,'320-brand-map');await page.keyboard.press('Escape');
    check(`all six interactive stations and the expanded map fit ${width}px`);await c.close();
  }
  const {c,page,externalRequests:brandExternalRequests}=await context(390);
  await c.addInitScript(()=>{if(self===top)localStorage.setItem('xircle.local.v1','{"sentinel":"keep","xtyHandoff":{"partyCode":"12345"}}');});
  await open(page,'/xircle/');await page.locator('#official-media[data-media-ready="true"]').waitFor();
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'journey-content');
  await page.locator('.journey-menu summary').focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/xircle/');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.journey-menu').getAttribute('open'),null);assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
  check('keyboard skip, mobile company menu, Tab and Escape restore focus');

  await visit(page,'hello');await action(page,'choose-focus','eat');
  assert.equal(await page.locator('[data-action="choose-focus"][data-value="eat"]').getAttribute('aria-pressed'),'true');
  await action(page,'next');await station(page,'signal');await visibleSceneTitle(page);await action(page,'back');await station(page,'hello');await visibleSceneTitle(page);await action(page,'next');await station(page,'signal');await visibleSceneTitle(page);
  await action(page,'moment','noon');assert.equal(await page.locator('[data-action="moment"][data-value="noon"]').getAttribute('aria-pressed'),'true');
  await action(page,'collect','eat');assert.equal(await page.locator('[data-action="collect"][data-value="eat"]').getAttribute('aria-pressed'),'true');
  await action(page,'collect','eat');assert.equal(await page.locator('[data-action="collect"][data-value="eat"]').getAttribute('aria-pressed'),'false');await action(page,'collect','eat');
  await page.reload();await station(page,'signal');assert.equal(await page.locator('[data-action="moment"][data-value="noon"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-action="collect"][data-value="eat"]').getAttribute('aria-pressed'),'true');await shot(page,'390-brand-signal');
  await action(page,'next');await station(page,'habix');
  for(const id of ['gus','protein-hmb','astamega','vita-matrix','flavor']){
    await action(page,'product',id);assert.equal(await page.locator(`[data-action="product"][data-value="${id}"]`).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator(`#brand-stage a[href="/xircle/doc/habix/${id}/"]`).count(),1);
  }
  await layout(page,'/xircle/#visit-habix',390);await shot(page,'390-brand-habix');
  await page.reload();await station(page,'habix');assert.equal(await page.locator('[data-action="product"][data-value="flavor"]').getAttribute('aria-pressed'),'true');await page.goBack();await station(page,'signal');await visibleSceneTitle(page);assert.equal(await page.evaluate(()=>document.activeElement.id),'scene-title');assert.equal(await page.locator('[data-action="collect"][data-value="eat"]').getAttribute('aria-pressed'),'true');await page.goForward();await station(page,'habix');await visibleSceneTitle(page);assert.equal(await page.evaluate(()=>document.activeElement.id),'scene-title');assert.equal(await page.locator('[data-action="product"][data-value="flavor"]').getAttribute('aria-pressed'),'true');
  check('food interest changes the recommended route; sample day, moments and real Habix selections respond and restore through reload and history');

  await visit(page,'connect');
  for(const id of ['app','band','scale']){await action(page,'device',id);assert.equal(await page.locator(`[data-action="device"][data-value="${id}"]`).getAttribute('aria-pressed'),'true');}
  await shot(page,'390-brand-devices');
  await visit(page,'routine');
  for(const letter of ['A','B','C','D']){await action(page,'loop',letter);assert.equal(await page.locator(`[data-action="loop"][data-value="${letter}"]`).getAttribute('aria-pressed'),'true');}
  await action(page,'loop','C');assert.match(await page.locator('#brand-stage').innerText(),/ไม่มี.*(?:ขาย|สินค้า)|ไม่มีขาย/);
  await action(page,'loop','A');const absorb=page.locator('#brand-stage a[href*="/routinex/absorb/"]');assert.equal(await absorb.count(),1);
  assert.equal(new URL(await absorb.getAttribute('href'),base).searchParams.get('brand'),'xircle');
  await shot(page,'390-brand-routine');
  check('device choices and all RoutineX ABCD stages explain distinct roles; Control is behavior and A enters the contextual brand room');

  await action(page,'open-map');await shot(page,'390-brand-map');await page.keyboard.press('Escape');assert.equal(await page.locator('#map-dialog').evaluate(el=>el.open),false);
  await action(page,'present');assert.equal(await page.locator('#brand-presentation').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#brand-stage').count(),1,'presentation reuses one interactive stage');
  await visit(page,'habix');await action(page,'product','gus');await page.keyboard.press('ArrowRight');await station(page,'routine');await visibleSceneTitle(page);await page.keyboard.press('ArrowLeft');await station(page,'habix');await visibleSceneTitle(page);await shot(page,'390-brand-presentation');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#brand-presentation').evaluate(el=>el.open),false);assert.equal(await page.locator('#brand-stage').count(),1);
  await action(page,'present');await visit(page,'finish');await page.locator('#brand-stage a[href="#official-media"]').click();assert.equal(await page.locator('#brand-presentation').evaluate(el=>el.open),false);assert.equal(new URL(page.url()).hash,'#official-media');assert.equal(await page.locator('#brand-stage').getAttribute('data-station'),'finish');await page.reload();assert.equal(await page.locator('#brand-stage').getAttribute('data-station'),'finish');
  await visit(page,'finish');const links=await page.locator('#brand-stage a').evaluateAll(links=>links.map(a=>a.href));
  assert.ok(links.includes('https://apps.apple.com/th/app/id6785562482'));assert.ok(links.includes('https://play.google.com/store/apps/details?id=health.xircle.app'));
  await action(page,'open-map');await page.locator('#map-dialog [data-action="restart"]').click();await station(page,'hello');assert.equal(await page.locator('#map-dialog').evaluate(el=>el.open),false);
  await visit(page,'finish');await action(page,'restart');await station(page,'hello');
  assert.equal(await page.evaluate(()=>localStorage.getItem('xircle.local.v1')),'{"sentinel":"keep","xtyHandoff":{"partyCode":"12345"}}');
  check('map and presentation support Escape and reuse the active state; official app-store finish, restart and legacy storage preservation work');

  // Embedded playback is intentionally blocked. Verify the consent boundary and exact selected ID, not remote playback.
  await page.locator('[data-media-category="band"]').click();assert.equal(await page.locator('.media-grid .media-card').count(),2);
  const firstVideo=page.locator('[data-media-open]').first();const firstId=await firstVideo.getAttribute('data-media-open');await firstVideo.click();
  assert.equal(await page.locator('.media-dialog').evaluate(el=>el.open),true);assert.equal(await page.locator('.media-dialog iframe').count(),0);
  report.prePlayBrandExternalRequests=[...brandExternalRequests];assert.deepEqual(brandExternalRequests,[],'no third-party player/thumbnail request in the interactive root before explicit Play');
  await page.locator(`[data-media-play="${firstId}"]`).click();const playerURL=new URL(await page.locator('.media-dialog iframe').getAttribute('src'));assert.equal(playerURL.origin,'https://www.youtube-nocookie.com');assert.equal(playerURL.pathname,'/embed/'+firstId);
  await page.locator('[data-media-next]').click();assert.equal(await page.locator('.media-dialog iframe').count(),0);assert.equal(await page.locator('[data-media-next]').isDisabled(),true);
  await page.goBack();assert.equal(new URL(page.url()).searchParams.get('watch'),firstId);assert.equal(await page.locator('.media-dialog iframe').count(),0);
  await page.goBack();assert.equal(new URL(page.url()).searchParams.has('watch'),false);assert.equal(await page.locator('.media-dialog').evaluate(el=>el.open),false);
  await page.goForward();await page.waitForFunction(()=>document.querySelector('.media-dialog').open);assert.equal(await page.locator('.media-dialog iframe').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.locator('.media-dialog').evaluate(el=>el.open),false);assert.equal(new URL(page.url()).searchParams.has('watch'),false);
  await page.locator(`[data-media-open="${firstId}"]`).click();await page.reload();await page.waitForFunction(()=>document.querySelector('.media-dialog')?.open);assert.equal(await page.locator('.media-dialog iframe').count(),0);await page.keyboard.press('Escape');
  await page.locator('[data-media-category="app"]').click();assert.equal(await page.locator('.media-grid .media-card').count(),5);await page.reload();
  assert.equal(await page.locator('[data-media-category="app"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.media-dialog').evaluate(el=>el.open),false);assert.equal(await page.locator('iframe').count(),0);
  await shot(page,'390-official-playlist');await page.locator('[data-media-category="all"]').click();await page.locator('[data-media-category="app"]').click();await page.locator('[data-action="choose-focus"][data-value="sleep"]').focus();await page.goBack();assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'choose-focus');await page.goForward();assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'choose-focus');check('official categories, local queues and URL restoration work; YouTube-nocookie loads only after explicit Play and is removed on queue/history/close');

  await visit(page,'hello');await action(page,'choose-focus','eat');await visit(page,'routine');await action(page,'loop','A');await page.locator('#brand-stage a[href*="/routinex/absorb/"]').click();await page.locator('html.routinex-brand').waitFor({state:'attached'});await page.locator('html.ready').waitFor({state:'attached'});
  assert.equal(await page.locator('a[href*="lin.ee"],a[href*="line.me"]').count(),0);const roomReturn=new URL(await page.locator('.routine-brand-map').getAttribute('href'),base);assert.equal(roomReturn.pathname,'/xircle/');assert.equal(roomReturn.hash,'#visit-routine');assert.equal(roomReturn.searchParams.get('path'),'eat');
  const nextRoom=page.locator('a[href*="/routinex/build/"][href*="brand=xircle"]').first();assert.ok(await nextRoom.count());await nextRoom.click();await page.locator('html.routinex-brand').waitFor({state:'attached'});
  assert.match(page.url(),/build\/\?brand=xircle/);await page.goBack();assert.match(page.url(),/absorb/);await page.locator('.routine-brand-map').click();await station(page,'routine');assert.equal(new URL(page.url()).searchParams.get('path'),'eat');
  check('immersive RoutineX A/B rooms preserve company context and return to the brand map without personal exits');

  await open(page,'/xircle/learn/');assert.equal(await page.locator('#knowledge-reset').isVisible(),false);await page.locator('#search').fill('HMB');assert.match(await page.locator('#knowledge-results').innerText(),/พบ 1 เรื่อง/);await page.locator('.topics a').click();await page.goBack();assert.equal(await page.locator('#search').inputValue(),'HMB');await page.locator('#search').fill('zz-no-match');assert.equal(await page.locator('#empty').isVisible(),true);await page.locator('#knowledge-reset').click();assert.equal(await page.locator('.topic').count(),21);await page.locator('[data-filter="care"]').click();await page.reload();assert.equal(await page.locator('.topic').count(),5);
  await open(page,'/xircle/doc/app/sleep/');await page.locator('.journey-local-nav summary').press('Enter');await page.locator('.journey-local-nav a[href="#hrv"]').click();assert.match(page.url(),/#hrv$/);
  check('knowledge search/filter/empty/reset/article Back/reload and native reference anchors remain available');await c.close();

  const noScript=await context(390,{javaScriptEnabled:false});await open(noScript.page,'/xircle/');assert.ok(await noScript.page.locator('a[href="/xircle/doc/routinex/"]').count());assert.ok(await noScript.page.locator('a[href="https://www.xircle.health/download"]').count());await noScript.page.locator('.journey-menu summary').click();await noScript.page.locator('.journey-menu a[href="/xircle/hardware/"]').click();assert.match(noScript.page.url(),/hardware/);await noScript.c.close();
  const noGL=await context(390,{reducedMotion:'no-preference'});await noGL.c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:original.call(this,kind,...args);};});await open(noGL.page,'/xircle/');await noGL.page.waitForFunction(()=>document.querySelector('#orbit-field').dataset.renderer==='static');await visit(noGL.page,'signal');await action(noGL.page,'moment','night');await action(noGL.page,'collect','sleep');await noGL.c.close();
  check('no-JavaScript reference/download paths and no-WebGL interactive controls remain usable');
  const desktop=await context(1440,{reducedMotion:'no-preference'});await open(desktop.page,'/xircle/');await visit(desktop.page,'connect');await action(desktop.page,'present');await shot(desktop.page,'1440-brand-presentation');await visit(desktop.page,'habix');await shot(desktop.page,'1440-habix-presentation');await desktop.page.keyboard.press('Escape');await visit(desktop.page,'habix');await shot(desktop.page,'1440-brand-habix');await desktop.c.close();
  const cover=await context(1200,{viewport:{width:1200,height:750}});await open(cover.page,'/xircle/');await shot(cover.page,'1200-portfolio-cover');await cover.c.close();
  assert.deepEqual(report.pageErrors,[],'no application runtime errors');assert.deepEqual(report.failedLocalRequests,[],'no broken local assets');report.passed=true;
}finally{report.completedAt=new Date().toISOString();await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(done=>server.close(done));console.log('Proof: '+output);}
