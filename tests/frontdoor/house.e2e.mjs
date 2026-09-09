/** The preserved house is an optional real route, with its original spoken welcome. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../../core7/tests/frontdoor-preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(tmpdir()+'/frontdoor-house-');await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),db=await server.mf.getD1Database('DB');
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={checks:[],errors:[],screenshots:[]};
const pass=copy=>{console.log('PASS '+copy);report.checks.push(copy);};
async function shot(page,name){await page.screenshot({path:`${output}/${name}.png`});report.screenshots.push(name+'.png');}
async function persisted(handoff,path){for(let i=0;i<70;i++){try{if(await db.prepare('SELECT 1 FROM fd_v2_outcomes WHERE handoff_id=? AND path=?').bind(handoff,path).first())return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Missing arrival: '+path);}
try{
 for(const width of [1440,390]){
  const c=await browser.newContext({viewport:{width,height:width<700?844:900},reducedMotion:'reduce',isMobile:width<700,hasTouch:width<700});
  await c.route('**/*',r=>r.request().url().startsWith(server.base)||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(server.base+'/frontdoor/');await p.evaluate(()=>localStorage.setItem('legacy-house-sentinel','keep'));
  await p.locator('#pickup').click();await p.locator('#continue-discovery').click();
  assert.equal(await p.locator('.seed-choice').count(),4);await p.locator('#visit-house').click();
  await p.locator('#open-path').waitFor({state:'visible'});await p.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
  assert.match(await p.locator('#path-title').innerText(),/บ้านที่เรื่องทั้งหมดเริ่มต้น/);
  assert.match(await p.locator('#open-path').getAttribute('href'),/^\/home\/\?entry=compass&fdh=/);
  await shot(p,`house-found-${width}`);
  await p.locator('#save-path').click();await p.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();
  await p.reload();await p.locator('[data-answer=resume]').click();
  assert.match(await p.locator('#open-path').getAttribute('href'),/^\/home\//);
  let fullRequests=0;p.on('request',r=>{if(new URL(r.url()).pathname==='/media/home-opening-full.mp4')fullRequests++;});
  await p.locator('#open-path').click();await p.waitForURL(u=>u.pathname==='/home/');
  const handoff=new URL(p.url()).searchParams.get('fdh');await persisted(handoff,'/home/');
  assert.equal(await p.locator('meta[name=mc-act-view]').getAttribute('content'),'home-open');
  assert.match(await p.locator('#homeTitle').innerText(),/เรียนครั้งเดียว/);
  await p.waitForTimeout(2800);assert.equal(fullRequests,0,'Full welcome must not load before a watch gesture');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await shot(p,`original-house-${width}`);
  await p.locator('#openVideo').click();await p.waitForFunction(()=>document.querySelector('#fullVideo').readyState>=2);
  assert.equal(await p.locator('#fullVideo').evaluate(v=>v.duration),44);assert.ok(fullRequests>0);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#videoModal').getAttribute('aria-hidden'),'true');
  assert.equal(await p.locator('#fullVideo').evaluate(v=>v.paused),true);
  await p.locator('[data-mc-act=home-compass]').click();await p.waitForURL(u=>u.pathname==='/hall.html');
  assert.equal(new URL(p.url()).searchParams.get('fdh'),handoff);await persisted(handoff,'/hall.html');
  await p.locator('#bump').click();await p.locator('#activeCta').waitFor({state:'visible'});
  assert.match(await p.locator('#activeCta').getAttribute('href'),/forge\/intro\//);
  await p.locator('#activeCta').click();await p.waitForURL(u=>u.pathname==='/forge/intro/');
  assert.equal(await p.evaluate(()=>localStorage.getItem('legacy-house-sentinel')),'keep');
  await shot(p,`legacy-intro-${width}`);await c.close();
  pass(`${width}px: Compass additional house -> durable Save/Resume -> original 44-second welcome on demand -> Hall -> original story intro`);
 }
 const auth='Basic '+Buffer.from('teem:local-fixture-only').toString('base64');
 const data=await (await fetch(server.base+'/api/core7/frontdoor-stats?env=local',{headers:{authorization:auth}})).json();
 report.outcomes=data.outcomes;assert.deepEqual(data.outcomes.rows,[{door:'home',opened:2,arrived:2,requested:0}]);
 report.productionRows=(await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n;
 assert.equal(report.productionRows,0);assert.deepEqual(report.errors,[]);
 pass('Real local D1 counts home arrivals without inflating Hall openings; canonical registry and legacy state remain intact');
}catch(error){report.failure=error.stack;throw error;}
finally{await writeFile(`${output}/proof.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
