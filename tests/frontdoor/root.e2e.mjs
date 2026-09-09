/** Real root -> saved alias -> old house, through the Pages handler and local D1. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../../core7/tests/frontdoor-preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(tmpdir()+'/frontdoor-root-');await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),db=await server.mf.getD1Database('DB');
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={checks:[],errors:[],screenshots:[]};
const pass=message=>{console.log('PASS '+message);report.checks.push(message);};
async function waitRow(sql,...params){for(let i=0;i<80;i++){try{const row=await db.prepare(sql).bind(...params).first();if(row)return row;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Missing local D1 row: '+sql);}
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width<700?844:900},reducedMotion:'reduce',isMobile:width<700,hasTouch:width<700});
  await context.route('**/*',r=>r.request().url().startsWith(server.base)||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
  const p=await context.newPage(),requests=[];p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>requests.push(new URL(r.url()).pathname));
  await p.goto(server.base+'/');await p.locator('#pickup').waitFor({state:'visible'});
  assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),'https://www.myclover.com/');
  assert.equal(await p.locator('meta[name=robots]').getAttribute('content'),'index,follow');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.locator('#pickup').click();await p.locator('#continue-discovery').click();await p.locator('#visit-house').click();
  await p.locator('#open-path').waitFor({state:'visible'});await p.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
  const href=await p.locator('#open-path').getAttribute('href'),handoff=new URL(href,server.base).searchParams.get('fdh');
  await p.locator('#save-path').click();await p.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();
  assert.equal(requests.includes('/assets/track.js'),false,'New root must not import the legacy tracker');
  await p.screenshot({path:output+`/root-house-${width}.png`});report.screenshots.push(`root-house-${width}.png`);
  // Browser context-menu navigation does not dispatch a source click. The prepared
  // destination must deliver that departure with the original root path.
  const dest=await context.newPage();await dest.goto(server.base+href);
  const departure=await waitRow('SELECT path,install_id FROM fd_v2_events WHERE handoff_id=? AND event_name=?',handoff,'DOOR_OPEN');
  assert.equal(departure.path,'/');await waitRow('SELECT 1 FROM fd_v2_outcomes WHERE handoff_id=? AND path=?',handoff,'/home/');
  await waitRow('SELECT 1 FROM fd_v2_events WHERE install_id=? AND event_name=? AND path=?',departure.install_id,'FRONTDOOR_OPEN','/');
  assert.equal(await dest.locator('meta[name=mc-act-view]').getAttribute('content'),'home-open');await dest.close();
  await p.goto(server.base+'/frontdoor/');await p.locator('[data-answer=resume]').click();await p.locator('#open-path').waitFor({state:'visible'});
  assert.match(await p.locator('#open-path').getAttribute('href'),/^\/home\//);assert.equal(await p.locator('#pickup').isVisible(),false);
  assert.equal(await p.locator('#opening-film').getAttribute('src'),null);
  const refreshReturns=await db.prepare('SELECT COUNT(*) n FROM fd_v2_events WHERE install_id=? AND event_name=?').bind(departure.install_id,'RETURN').first();assert.equal(refreshReturns.n,0);
  await context.close();pass(`${width}px: public root -> durable Save -> new-tab house departure retains / -> alias Resume without intro or false RETURN`);
 }
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n,0);assert.deepEqual(report.errors,[]);
 pass('Actual root runtime, local HTTP validation, D1 departure/arrival and saved journey verified without production traffic');
}catch(error){report.failure=error.stack;throw error;}
finally{await writeFile(output+'/proof.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
