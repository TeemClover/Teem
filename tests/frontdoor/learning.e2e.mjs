/** Real user actions -> actual local Pages collector/D1 -> protected Stat. No external booking. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../../core7/tests/frontdoor-preview.mjs';
import {FORGE_PATHS} from '../../assets/front-door/outcome-contract.js';

const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(tmpdir()+'/frontdoor-learning-');
await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),db=await server.mf.getD1Database('DB');
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={checks:[],errors:[],screenshots:[],telemetryResponses:[],base:server.base};
const pass=message=>{report.checks.push(message);console.log('PASS '+message);};
async function eventually(fn){for(let i=0;i<60;i++){try{if(await fn())return;}catch(error){if(!/no such table: fd_v2_outcomes/.test(error.message))throw error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Expected D1 receipt was not persisted');}
async function shot(page,name){await page.screenshot({path:`${output}/${name}.png`});report.screenshots.push(name+'.png');}
async function surface(width){
 const context=await browser.newContext({viewport:{width,height:width<700?844:900},reducedMotion:'reduce',timezoneId:'Asia/Bangkok',isMobile:width<700,hasTouch:width<700});
 await context.route('**/*',route=>route.request().url().startsWith(server.base)||/^(data|blob):/.test(route.request().url())?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.url().startsWith(server.base+'/api/core7/analytics/frontdoor'))report.telemetryResponses.push({path:new URL(response.url()).pathname,status:response.status()});});
 return {context,page};
}
async function chooseLearning(page,mode){
 await page.goto(server.base+'/frontdoor/');
 await page.locator('#pickup').click();await page.locator('#continue-discovery').click();
 await page.locator('[data-answer=blue]').click();
 await page.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
 await page.locator('#cross-seed').click();
 await page.locator('#seed-reward > section').waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
 await page.getByRole('button',{name:'เริ่มเรียน AI',exact:true}).click();
 await page.getByRole('button',{name:mode==='comic'?'เริ่มจากการ์ตูน':'ลอง AI ใส่ซอส',exact:true}).click();
 await page.locator('#open-path').waitFor({state:'visible'});
 assert.match(await page.locator('.seed-reward-example').innerText(),mode==='comic'?/โจทย์ไม่ได้บอกเหตุผลหรือเวลา/:/ไม่แต่งเพิ่ม/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await shot(page,mode+'-discovery');
 await page.locator('#save-path').click();await page.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();
 // The persisted choice must still produce its own direct route after refresh.
 await page.reload();await page.locator('[data-answer=resume]').click();
 await page.locator('#open-path').waitFor({state:'visible'});
 const expected=mode==='comic'?FORGE_PATHS[1]:'/classroom/free-ai.html';
 assert.equal(new URL(await page.locator('#open-path').getAttribute('href'),server.base).pathname,expected);
 await page.locator('#open-path').click();await page.waitForURL(url=>url.pathname===expected);
 const handoffId=new URL(page.url()).searchParams.get('fdh');assert.ok(handoffId);
 await eventually(async()=>!!await db.prepare("SELECT 1 FROM fd_v2_outcomes WHERE handoff_id=? AND path=? AND name='DESTINATION_ARRIVAL'").bind(handoffId,expected).first());
 return handoffId;
}
async function countPath(handoffId,path){return !!await db.prepare("SELECT 1 FROM fd_v2_outcomes WHERE handoff_id=? AND path=? AND name='DESTINATION_ARRIVAL'").bind(handoffId,path).first();}
async function reportData(){
 const response=await fetch(server.base+'/api/core7/frontdoor-stats?env=local',{headers:{authorization:'Basic '+Buffer.from('teem:local-fixture-only').toString('base64')}});
 assert.equal(response.status,200);return response.json();
}
try{
 const comic=await surface(1440),p=comic.page;
 const comicHandoff=await chooseLearning(p,'comic');
 assert.equal(await p.locator('.forge-reader-nav [data-forge-chapter]').count(),7);
 await shot(p,'comic-episode-one');
 for(const episodePath of FORGE_PATHS.slice(2)){
  const slug=episodePath.split('/').filter(Boolean).at(-1);
  await p.locator(`.forge-reader-nav [data-forge-chapter="${slug}"]`).click();
  await p.waitForURL(url=>url.pathname===episodePath);
  assert.equal(new URL(p.url()).searchParams.get('fdh'),comicHandoff);
  await eventually(()=>countPath(comicHandoff,episodePath));
 }
 await shot(p,'comic-episode-seven');
 const before=(await reportData()).outcomes.rows;
 assert.deepEqual(before,[{door:'forge',opened:1,arrived:1,requested:0}]);
 await p.locator('.forge-course-start').click();
 await p.waitForURL(url=>url.pathname==='/classroom/free-ai.html');
 assert.equal(new URL(p.url()).searchParams.get('fdh'),comicHandoff);
 await eventually(()=>countPath(comicHandoff,'/classroom/free-ai.html'));
 assert.deepEqual((await reportData()).outcomes.rows,before,'Onward lessons must not increment Forge arrival or fabricate a separate Classroom opening');
 await shot(p,'comic-to-first-lesson');
 pass('Desktop: Compass course/comic discovery -> durable Save/Resume -> all seven actual episodes -> first AI ใส่ซอส lesson with one opaque handoff');
 pass('Seven episode receipts and an onward lesson aggregate to one Forge installation arrival, with no fabricated Classroom opening');
 await comic.context.close();

 const hands=await surface(390),m=hands.page;
 const handsHandoff=await chooseLearning(m,'hands-on');
 assert.notEqual(handsHandoff,comicHandoff);
 assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await shot(m,'hands-on-first-lesson-mobile');
 await m.locator('a.nx[href*="/classroom/image-ai.html"]').click();
 await m.waitForURL(url=>url.pathname==='/classroom/image-ai.html');
 assert.equal(new URL(m.url()).searchParams.get('fdh'),handsHandoff);
 await eventually(()=>countPath(handsHandoff,'/classroom/image-ai.html'));
 pass('Mobile: Compass course/hands-on discovery -> durable Save/Resume -> first lesson -> second lesson, preserving the actual learning handoff');
 await hands.context.close();

 const unauthorized=await fetch(server.base+'/stat/frontdoor/');assert.equal(unauthorized.status,401);
 const review=await browser.newContext({viewport:{width:390,height:844},httpCredentials:{username:'teem',password:'local-fixture-only'},timezoneId:'Asia/Bangkok'});
 const sp=await review.newPage();sp.on('pageerror',error=>report.errors.push(error.message));
 await sp.goto(server.base+'/stat/frontdoor/');await sp.locator('#dashboard').waitFor({state:'visible'});
 const expected=[{door:'classroom',opened:1,arrived:1,requested:0},{door:'forge',opened:1,arrived:1,requested:0}];
 const data=await reportData();assert.deepEqual(data.outcomes.rows,expected);
 assert.equal(Object.keys(data.metrics).length,15);
 for(const door of ['forge','classroom']){
  const row=sp.locator('#outcome-rows tr').filter({has:sp.locator('td:first-child',{hasText:new RegExp('^'+door+'$')})});
  assert.deepEqual(await row.locator('td').allTextContents(),[door,'1','1','0','0%']);
 }
 assert.equal(await sp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await shot(sp,'learning-stat-mobile');await review.close();
 report.outcomes=data.outcomes;
 report.persistedEvents=(await db.prepare('SELECT event_name,COUNT(*) count FROM fd_v2_events GROUP BY event_name').all()).results;
 report.persistedReceipts=(await db.prepare('SELECT path,name,COUNT(*) count FROM fd_v2_outcomes GROUP BY path,name ORDER BY path,name').all()).results;
 report.productionEvents=(await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n;
 report.productionReceipts=(await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE env='prod'").first()).n;
 assert.equal(report.productionEvents,0);assert.equal(report.productionReceipts,0);
 const bookingTable=server.meet.sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='mc_meet_bookings'").get();
 report.bookingRequests=bookingTable?server.meet.sqlite.prepare('SELECT COUNT(*) n FROM mc_meet_bookings').get().n:0;
 assert.equal(report.bookingRequests,0);
 assert.equal(report.persistedEvents.find(row=>row.event_name==='DOOR_OPEN').count,2);
 assert.equal(report.persistedReceipts.filter(row=>row.name==='MEET_REQUEST_ACCEPTED').length,0);
 assert.equal(report.telemetryResponses.some(response=>response.status>=400&&response.status!==409),false);
 assert.deepEqual(report.errors,[]);
 pass('Protected mobile Stat renders both real D1 learning arrivals; canonical 15 metrics preserved, zero production rows, no booking requests, no browser errors');
}catch(error){report.failure=error.stack;throw error;}
finally{await writeFile(`${output}/proof.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
