/** Real root → Ako kitchen → XIRCLE → Meet, through workerd and isolated D1.
 * No event injection, API mocks, production traffic or appointment submission.
 */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../../core7/tests/frontdoor-preview.mjs';

const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'ako-handoff-'));
await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),db=await server.mf.getD1Database('DB');
const report={checks:[],flows:[],pageErrors:[],formSubmissions:[],screenshots:[],base:server.base};
let browser;
const pass=message=>{report.checks.push(message);console.log('PASS '+message);};
async function receipt(handoffId,pathname){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    try{
      const row=await db.prepare("SELECT event_id,name,path FROM fd_v2_outcomes WHERE env='local' AND handoff_id=? AND path=? AND name='DESTINATION_ARRIVAL'").bind(handoffId,pathname).first();
      if(row)return row;
    }catch{/* First accepted departure initializes this isolated database. */}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error(`No persisted arrival for ${pathname} (${handoffId})`);
}
async function arrived(page,pathname,handoffId){
  await page.waitForURL(url=>url.pathname===pathname);
  assert.equal(new URL(page.url()).searchParams.get('fdh'),handoffId,`Handoff lost at ${pathname}`);
  await receipt(handoffId,pathname);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,pathname);
}
async function shot(page,name){
  await page.screenshot({path:path.join(output,name+'.png')});report.screenshots.push(name+'.png');
}
try{
  browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:width<700?844:900},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==server.base)return route.abort();
      if(url.pathname==='/api/meet'&&request.method()==='POST'){
        report.formSubmissions.push({width,path:url.pathname});return route.abort();
      }
      return route.continue();
    });
    const page=await context.newPage();page.on('pageerror',error=>report.pageErrors.push({width,message:error.message}));
    await page.goto(server.base+'/');
    await page.locator('#pickup').click();
    await page.locator('#continue-discovery').click();
    await page.locator('[data-answer=red]').click();
    await page.locator('#cross-seed').waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
    await page.locator('#cross-seed').click();
    await page.getByRole('button',{name:'สด เปรี้ยว กรอบ',exact:true}).click();
    await page.locator('#open-path').waitFor({state:'visible'});
    const doorURL=new URL(await page.locator('#open-path').getAttribute('href'),server.base);
    assert.equal(doorURL.pathname,'/ako/');
    assert.match(doorURL.searchParams.get('fdh'),/^h-/);
    const installId=await page.evaluate(()=>localStorage.getItem('c7:install_id'));
    // Each real opening commits its own handoff, replacing the prepared link's
    // reference. Follow that committed ID; D1 below proves its root departure.
    await page.locator('#open-path').click();await page.waitForURL(url=>url.pathname==='/ako/');
    const handoffId=new URL(page.url()).searchParams.get('fdh');assert.match(handoffId,/^h-/);
    await arrived(page,'/ako/',handoffId);
    assert.ok((await page.locator('h1').innerText()).length>0);
    await page.locator('[data-track=hero-kitchen]').click();await arrived(page,'/ako/kitchen/',handoffId);
    await page.locator('#recipe-title').waitFor({state:'visible'});
    assert.match(await page.locator('#recipe-title').innerText(),/มะเขือเทศ/);
    await page.locator('[data-portions="1"]').click();
    assert.equal(await page.locator('[data-portions="1"]').getAttribute('aria-pressed'),'true');
    await shot(page,`kitchen-arrival-${width}`);
    const paths=['/ako/','/ako/kitchen/'];
    if(width===1440){
      await page.getByRole('link',{name:'รู้จักเอโกะ',exact:true}).click();await arrived(page,'/ako/story/',handoffId);
      paths.push('/ako/story/');
      await page.getByRole('link',{name:'สูตรจากครัวสลัดเอโกะ',exact:true}).click();await arrived(page,'/ako/kitchen/',handoffId);
      assert.equal((await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE handoff_id=? AND path='/ako/kitchen/'").bind(handoffId).first()).n,1,'Revisiting kitchen must deduplicate its arrival');
    }
    await page.locator('.kitchen-next a[href^="/xircle/"]').click();await arrived(page,'/xircle/',handoffId);paths.push('/xircle/');
    assert.equal(new URL(page.url()).searchParams.get('focus'),'food');
    await page.locator('#stage[data-scene=sleep]').waitFor();
    await page.locator('[data-sleep=middle]').click();
    await page.locator('#stage[data-scene=food]').waitFor();await page.locator('#shutter').click();
    await page.locator('#stage[data-scene=move]').waitFor();await page.locator('[data-move=some]').click();
    await page.locator('#expand-days').click();await page.locator('[data-context=work]').click();
    await page.locator('#see-yours').click();await page.locator('#book-link').waitFor({state:'visible'});
    assert.equal(new URL(await page.locator('#book-link').getAttribute('href'),server.base).searchParams.get('fdh'),handoffId);
    await page.locator('#book-link').click();await arrived(page,'/meet/',handoffId);paths.push('/meet/');
    await page.locator('#booking-root').waitFor({state:'visible'});
    assert.equal(await page.locator('#session-root').getAttribute('data-intent'),'health');
    await shot(page,`meet-ready-${width}`);
    const departure=await db.prepare("SELECT path,door_id,install_id FROM fd_v2_events WHERE handoff_id=? AND event_name='DOOR_OPEN'").bind(handoffId).all();
    assert.deepEqual(departure.results,[{path:'/',door_id:'ako',install_id:installId}]);
    const persisted=await db.prepare('SELECT path,name FROM fd_v2_outcomes WHERE handoff_id=? ORDER BY path').bind(handoffId).all();
    assert.deepEqual(persisted.results,paths.slice().sort().map(path=>({path,name:'DESTINATION_ARRIVAL'})));
    report.flows.push({width,handoffId,installId,paths,persisted:persisted.results});
    await context.close();
    pass(`${width}px root red → Ako → kitchen${width===1440?' → story → kitchen':''} → complete XIRCLE experience → Meet retains one handoff`);
  }
  const auth='Basic '+Buffer.from('teem:local-fixture-only').toString('base64');
  const response=await fetch(server.base+'/api/core7/frontdoor-stats?env=local',{headers:{authorization:auth}});
  assert.equal(response.status,200);const stats=await response.json();
  report.outcomes=stats.outcomes;assert.deepEqual(stats.outcomes.rows,[{door:'ako',opened:2,arrived:2,requested:0}]);
  const roots=await db.prepare("SELECT COUNT(DISTINCT install_id) n FROM fd_v2_events WHERE event_name='FRONTDOOR_OPEN' AND path='/' AND env='local'").first();
  assert.equal(roots.n,2);
  report.productionEvents=(await db.prepare("SELECT COUNT(*) n FROM fd_v2_events WHERE env='prod'").first()).n;
  report.productionOutcomes=(await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE env='prod'").first()).n;
  report.meetingRequests=(await db.prepare("SELECT COUNT(*) n FROM fd_v2_outcomes WHERE name='MEET_REQUEST_ACCEPTED'").first()).n;
  assert.equal(report.productionEvents,0);assert.equal(report.productionOutcomes,0);assert.equal(report.meetingRequests,0);
  assert.deepEqual(report.formSubmissions,[]);assert.deepEqual(report.pageErrors,[]);
  pass('Real D1 records nine destination receipts as two distinct Ako arrivals, zero accepted appointment requests and zero production rows');
}catch(error){report.failure=error.stack;throw error;}
finally{
  await writeFile(path.join(output,'proof.json'),JSON.stringify(report,null,2));
  await browser?.close();await server.close();
}
