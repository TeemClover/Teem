/** Local browser proof for the shared journey. All writes and external traffic blocked. */
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
      if([390,1440].includes(width))await shot(page,`${width}-${path.split('/').filter(Boolean).slice(1).join('-')||'landing'}`);
    }
    check(`six main destinations fit ${width}px, one title and landmark, shared navigation`);
    await c.close();
  }
  for(const width of [390,1440]){
    const {c,page}=await context(width);
    for(const path of (await files('doc/')).filter(p=>p!=='/xircle/doc/')){await open(page,path);await layout(page,path,width);}
    check(`all 44 deep documents open directly and fit ${width}px`);await c.close();
  }
  const {c,page}=await context(390);
  await open(page,'/xircle/');
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'journey-content');
  await page.locator('.journey-menu summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.journey-menu').getAttribute('open'),'');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'/xircle/');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.journey-menu').getAttribute('open'),null);
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');
  check('keyboard skip, mobile menu, Tab and Escape return focus correctly');
  await page.locator('.welcome-actions a[href="#experience"]').click();
  await page.locator('[data-sleep="middle"]').press('Enter');await scene(page,'food');
  await page.locator('#shutter').press('Enter');await scene(page,'move');
  await page.locator('[data-move="some"]').press('Enter');await scene(page,'day');
  await page.locator('[data-journey-step="0"]').click();await scene(page,'sleep');
  await page.locator('[data-sleep="full"]').click();await scene(page,'food');
  assert.equal(await page.locator('#record-sleep').textContent(),'7:45');
  await page.locator('[data-journey-step="3"]').click();await scene(page,'day');
  await page.locator('#expand-days').click();await scene(page,'pattern');
  assert.equal(await page.locator('[data-journey-step="6"]').isDisabled(),true);
  await page.locator('[data-context="family"]').click();await scene(page,'human');
  await page.locator('[data-context="unknown"]').click();assert.match(await page.locator('#experiment-title').innerText(),/3 คืน/);
  await page.locator('#see-yours').click();await scene(page,'real');
  await layout(page,'/xircle/#experience completed',390);
  await page.locator('#experience').screenshot({path:`${output}/390-demo-complete.png`});report.screenshots.push('390-demo-complete.png');
  const booking=await page.locator('#book-link').getAttribute('href');
  assert.equal(booking,'/meet/?intent=health&from=xircle&open=booking');
  await page.locator('#book-link').click();assert.match(page.url(),/\/meet\/\?intent=health&from=xircle&open=booking$/);
  await page.goBack();await scene(page,'real');await page.reload();await scene(page,'real');
  await page.locator('#replay').click();await scene(page,'sleep');
  assert.equal(await page.locator('[data-journey-step="6"]').isDisabled(),true);
  assert.equal(await page.locator('#record-count').textContent(),'0 / 3');
  check('full keyboard demo, visited-step navigation, revised choice, context switch, Meet/back/refresh and restart');
  await open(page,'/xircle/learn/');
  assert.equal(await page.locator('#knowledge-reset').isVisible(),false);
  await page.locator('#search').fill('HMB');
  assert.match(await page.locator('#knowledge-results').innerText(),/พบ 1 เรื่อง/);
  await page.locator('.topics a').click();await page.goBack();
  assert.equal(await page.locator('#search').inputValue(),'HMB');assert.match(page.url(),/q=HMB/);
  await page.locator('#search').fill('zz-no-match');assert.equal(await page.locator('#empty').isVisible(),true);
  await page.locator('#knowledge-reset').click();assert.equal(await page.locator('.topic').count(),21);
  await page.locator('[data-filter="care"]').click();assert.equal(await page.locator('.topic').count(),5);
  await page.reload();assert.equal(await page.locator('[data-filter="care"]').getAttribute('aria-pressed'),'true');
  await shot(page,'390-knowledge-filter',true);
  await page.locator('.topic').first().click();await page.goBack();assert.equal(await page.locator('.topic').count(),5);
  check('search, no results/reset, category controls, reload and article Back preserve URL state');
  await open(page,'/xircle/doc/app/sleep/');await page.locator('.journey-local-nav summary').press('Enter');
  await page.locator('.journey-local-nav a[href="#hrv"]').click();
  assert.match(page.url(),/#hrv$/);await shot(page,'390-sleep-reference');
  check('deep-document local contents and shared wayfinding both work');
  await c.close();
  const noScript=await context(390,{javaScriptEnabled:false});await open(noScript.page,'/xircle/');
  assert.equal(await noScript.page.locator('#fallback').isVisible(),true);
  await noScript.page.locator('.journey-menu summary').click();await noScript.page.locator('.journey-menu a[href="/xircle/hardware/"]').click();
  assert.match(noScript.page.url(),/\/xircle\/hardware\/$/);await noScript.c.close();
  check('no-JavaScript opening, fallback booking and mobile navigation remain usable');
  const cover=await context(1200,{viewport:{width:1200,height:750}});await open(cover.page,'/xircle/');await shot(cover.page,'1200-portfolio-cover');await cover.c.close();
  assert.deepEqual(report.pageErrors,[],'no browser runtime errors');
  assert.deepEqual(report.failedLocalRequests,[],'no broken local assets or links in rendered routes');
  report.passed=true;
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(done=>server.close(done));
  console.log('Proof: '+output);
}
