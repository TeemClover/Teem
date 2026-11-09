/** Company scrolling product experience: real local browser proof, external traffic/writes blocked. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, readdir, stat, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.XIRCLE_PROOF_DIR || '/tmp/xircle-journey-proof';
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
const report={base,checks:[],screenshots:[],layouts:[],pageErrors:[],failedLocalRequests:[],passed:false};
const check=name=>{report.checks.push(name);console.log('PASS '+name);};
async function context(width,extra={}){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',...extra});
  await c.route('**/*',route=>new URL(route.request().url()).origin===base&&route.request().method()==='GET'?route.continue():route.abort());
  const page=await c.newPage();page.on('pageerror',error=>report.pageErrors.push({url:page.url(),message:error.message}));
  page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)report.failedLocalRequests.push({url:response.url().replace(base,''),status:response.status()});});
  return {c,page};
}
async function open(page,path){await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);}
async function shot(page,name,fullPage=false){await page.screenshot({path:`${output}/${name}.png`,fullPage});report.screenshots.push(name+'.png');}
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
async function scene(page,name){await page.locator(`#stage[data-scene="${name}"]`).waitFor({state:'visible'});}
async function files(dir){return(await Promise.all((await readdir(resolve(root,'xircle',dir),{withFileTypes:true})).map(e=>e.isDirectory()&&!['assets','_shared'].includes(e.name)?files(dir+e.name+'/'):e.name==='index.html'?['/xircle/'+dir]:[]))).flat();}
try{
  for(const width of [320,390,768,1440]){
    const {c,page}=await context(width);
    for(const path of ['/xircle/','/xircle/learn/','/xircle/learn/topic/?t=habit-score','/xircle/hardware/','/xircle/products/','/xircle/doc/']){
      await open(page,path);await layout(page,path,width);
      if([390,1440].includes(width))await shot(page,`${width}-${path.split('?')[0].split('/').filter(Boolean).slice(1).join('-')||'landing'}`);
    }
    check(`six company destinations fit ${width}px, one title and landmark, shared navigation`);await c.close();
  }
  for(const width of [390,1440]){
    const {c,page}=await context(width);
    for(const path of (await files('doc/')).filter(p=>p!=='/xircle/doc/')){await open(page,path);await layout(page,path,width);}
    check(`all 44 deep documents open directly and fit ${width}px`);await c.close();
  }
  const {c,page}=await context(390);
  await c.addInitScript(()=>localStorage.setItem('xircle.local.v1','{"sentinel":"keep","xtyHandoff":{"partyCode":"12345"}}'));
  await open(page,'/xircle/');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'journey-content');
  await page.locator('.journey-menu summary').focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/xircle/');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.journey-menu').getAttribute('open'),null);assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
  check('keyboard skip, company mobile menu, Tab and Escape restore focus');
  for(const id of ['sleep','eat','move','body']){
    await page.locator(`[data-dock="${id}"]`).click();
    await page.waitForFunction(id=>document.querySelector(`[data-plate="${id}"]`).classList.contains('is-active'),id);
    assert.equal(new URL(page.url()).hash,'#'+id);
    const positions=await page.evaluate(id=>({title:document.querySelector(`#${id} h2`).getBoundingClientRect().top,stage:document.querySelector('.story-stage').getBoundingClientRect().bottom}),id);
    assert.ok(positions.title>=positions.stage-12,'mobile chapter title must clear sticky artwork: '+JSON.stringify(positions));
  }
  await page.locator('[data-dock="eat"]').click();await layout(page,'/xircle/#eat',390);await shot(page,'390-scroll-eat');
  await page.locator('#eat .product-read').click();assert.match(page.url(),/topic/);await page.goBack();assert.equal(new URL(page.url()).hash,'#eat');
  await page.locator('#eat [data-open-presentation]').click();assert.equal(await page.locator('#presentation').evaluate(el=>el.open),true);
  assert.equal(await page.locator('#presentation-count').innerText(),'3 / 7');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#presentation-count').innerText(),'4 / 7');
  await page.keyboard.press('Home');assert.equal(await page.locator('#presentation-prev').isDisabled(),true);await page.keyboard.press('End');assert.equal(await page.locator('#presentation-next').isDisabled(),true);
  await shot(page,'390-presentation');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#presentation').open);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.openPresentation),'eat');
  await page.locator('#eat [data-open-presentation]').click();await page.goBack();assert.equal(await page.locator('#presentation').evaluate(el=>el.open),false);
  await page.goForward();await page.waitForFunction(()=>document.querySelector('#presentation').open);await page.keyboard.press('Escape');
  await open(page,'/xircle/#present-devices');assert.equal(await page.locator('#presentation-count').innerText(),'6 / 7');await page.reload();assert.equal(await page.locator('#presentation').evaluate(el=>el.open),true);await page.keyboard.press('Escape');
  check('scroll chapters sync artwork, titles clear sticky art; article Back, 7-slide presentation, keys, Escape, Back/Forward, deep-link and reload work');
  await page.locator('[data-dock="devices"]').click();await page.locator('#tab-band').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-app').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#device-app').isVisible(),true);
  await page.keyboard.press('End');assert.equal(await page.locator('#device-scale').isVisible(),true);assert.equal(await page.locator('#tab-scale').getAttribute('tabindex'),'0');
  await shot(page,'390-device-scale');await page.locator('[data-dock="routine"]').click();const absorb=page.locator('.routine-letters details').first();await absorb.locator('summary').press('Enter');assert.equal(await absorb.getAttribute('open'),'');
  await shot(page,'390-routine');check('device tabs support arrows/Home/End and RoutineX details work with keyboard');
  const outbound=await page.locator('a[href*="buy.xircle.health"]').evaluateAll(links=>links.map(a=>a.href));assert.ok(outbound.length>=3);assert.ok(outbound.every(href=>href==='https://buy.xircle.health/login?ref=O5F3LN'));
  assert.equal(await page.locator('a[href*="teambook"],a[href*="/meet/"],a[href*="/xty/"],a[href*="/xvisor/?from=xircle"]').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('xircle.local.v1')),'{"sentinel":"keep","xtyHandoff":{"partyCode":"12345"}}');
  check('official portal links retain only the requested ref; no personal appointment, notebook, game or legacy-state writes');
  await open(page,'/xircle/learn/');assert.equal(await page.locator('#knowledge-reset').isVisible(),false);await page.locator('#search').fill('HMB');assert.match(await page.locator('#knowledge-results').innerText(),/พบ 1 เรื่อง/);await page.locator('.topics a').click();await page.goBack();assert.equal(await page.locator('#search').inputValue(),'HMB');await page.locator('#search').fill('zz-no-match');assert.equal(await page.locator('#empty').isVisible(),true);await page.locator('#knowledge-reset').click();assert.equal(await page.locator('.topic').count(),21);await page.locator('[data-filter="care"]').click();await page.reload();assert.equal(await page.locator('.topic').count(),5);await shot(page,'390-knowledge-filter',true);
  check('White Cat is a searchable knowledge room; search/filter/reset/article Back/reload retain URL state');
  await open(page,'/xircle/doc/app/sleep/');await page.locator('.journey-local-nav summary').press('Enter');await page.locator('.journey-local-nav a[href="#hrv"]').click();assert.match(page.url(),/#hrv$/);await shot(page,'390-sleep-reference');await c.close();
  const noScript=await context(390,{javaScriptEnabled:false});await open(noScript.page,'/xircle/');assert.equal(await noScript.page.locator('[data-device-panel]').count(),3);assert.equal(await noScript.page.locator('#device-scale').isVisible(),true);assert.equal(await noScript.page.getByRole('button',{name:'โหมดอธิบายสินค้า',exact:true}).isVisible(),false);await noScript.page.locator('.journey-menu summary').click();await noScript.page.locator('.journey-menu a[href="/xircle/hardware/"]').click();assert.match(noScript.page.url(),/hardware/);await noScript.c.close();
  const noGL=await context(390,{reducedMotion:'no-preference'});await noGL.c.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl2'?null:original.call(this,kind,...args);};});await open(noGL.page,'/xircle/');await noGL.page.waitForFunction(()=>document.querySelector('#orbit-field').dataset.renderer==='static');await noGL.page.getByRole('button',{name:'โหมดอธิบายสินค้า',exact:true}).click();assert.equal(await noGL.page.locator('#presentation').evaluate(el=>el.open),true);await noGL.c.close();
  check('no-JavaScript content/navigation and no-WebGL presentation remain usable');
  const desktop=await context(1440,{reducedMotion:'no-preference'});await open(desktop.page,'/xircle/');await desktop.page.getByRole('button',{name:'โหมดอธิบายสินค้า',exact:true}).click();await shot(desktop.page,'1440-presentation');await desktop.page.keyboard.press('Escape');await desktop.page.locator('[data-dock="eat"]').click();await desktop.page.waitForFunction(()=>document.querySelector('[data-plate="eat"]').classList.contains('is-active'));await shot(desktop.page,'1440-scroll-eat');await desktop.c.close();
  const cover=await context(1200,{viewport:{width:1200,height:750}});await open(cover.page,'/xircle/');await shot(cover.page,'1200-portfolio-cover');await cover.c.close();
  assert.deepEqual(report.pageErrors,[],'no application runtime errors');assert.deepEqual(report.failedLocalRequests,[],'no broken local assets');report.passed=true;
}finally{await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(done=>server.close(done));console.log('Proof: '+output);}
