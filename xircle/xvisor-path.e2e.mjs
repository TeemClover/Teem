/** Local browser regression for the optional XIRCLE → knowledge → X-VISOR path.
 * Uses real pages and its own isolated preview. All API/external traffic is blocked;
 * no appointment, score, telemetry delivery or gameplay completion is fabricated.
 */
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {startPreview} from '../core7/tests/frontdoor-preview.mjs';

const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output = process.env.FRONTDOOR_PROOF_DIR || await mkdtemp(path.join(tmpdir(), 'xircle-xvisor-path-'));
await mkdir(output, {recursive:true});
const server = await startPreview({port:0});
const {base} = server;
const handoff = 'h-xircle-path-browser-fixture';
// These are synthetic privacy sentinels, never visitor answers.
const privateQuery = '&health_note=qa-do-not-copy&weight=qa-private';
const report = {base, checks:[], views:[], screenshots:[], pageErrors:[], failedAssets:[], blockedRequests:[], passed:false};
let browser;
const check = name => {report.checks.push(name); console.log('PASS ' + name);};
const routeURL = value => new URL(value, base);

async function pageFor(width, {blockedStorage=false}={}) {
  const context = await browser.newContext({viewport:{width,height:width>1000?1000:width<350?568:844}, isMobile:width<700, hasTouch:width<700, reducedMotion:'reduce', serviceWorkers:'block'});
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base && ['GET','HEAD'].includes(request.method()) && !url.pathname.startsWith('/api/')) return route.continue();
    if (['data:','blob:'].includes(url.protocol)) return route.continue();
    report.blockedRequests.push({method:request.method(), url:request.url()});
    return route.abort('blockedbyclient');
  });
  if (blockedStorage) await context.addInitScript(() => {
    for (const name of ['localStorage','sessionStorage']) Object.defineProperty(window, name, {get(){throw new Error('QA storage unavailable');}});
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push({width,url:page.url(),message:error.message}));
  page.on('response', response => {
    if (new URL(response.url()).origin === base && response.status() >= 400) report.failedAssets.push({url:response.url(),status:response.status()});
  });
  return {context,page};
}

async function goto(page, pathname) {
  const response = await page.goto(base + pathname, {waitUntil:'domcontentloaded'});
  assert.equal(response.status(), 200, pathname);
}

async function view(page, label, screenshot=false) {
  // Check requested, actually visible pictures; deferred images in later scenes are not failures.
  await page.waitForFunction(() => [...document.images].filter(img => {
    if (!(img.getAttribute('src') || img.getAttribute('srcset'))) return false;
    const r=img.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom<0 || r.top>innerHeight) return false;
    for (let node=img; node; node=node.parentElement) {
      const s=getComputedStyle(node);
      if (s.display==='none' || s.visibility==='hidden' || Number(s.opacity)===0) return false;
    }
    return true;
  }).every(img => img.complete && img.naturalWidth>0), null, {timeout:15000});
  const layout = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(layout.scroll <= layout.width+1, `${label}: horizontal overflow ${JSON.stringify(layout)}`);
  report.views.push({label,url:page.url(),...layout});
  if (screenshot) {
    const filename = label + '.png';
    await page.screenshot({path:path.join(output,filename),fullPage:true});
    report.screenshots.push(filename);
  }
}

async function scene(page, name) {
  await page.locator(`#stage[data-scene="${name}"]`).waitFor({state:'visible'});
  assert.ok(await page.locator('#world').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-.5 && r.right<=innerWidth+.5;}), `${name}: clipped world`);
}

async function header(page) {
  await page.evaluate(()=>scrollTo(0,0));
  const knowledge=page.locator('.knowledge-shortcut');
  await knowledge.click({trial:true});
  assert.ok((await knowledge.boundingBox()).height >= 44, 'knowledge header touch target');
  if (await page.locator('#sound-toggle').isVisible()) {
    await page.locator('#sound-toggle').click({trial:true});
    const [a,b]=await Promise.all([knowledge.boundingBox(),page.locator('#sound-toggle').boundingBox()]);
    assert.ok(a.x+a.width<=b.x+.5 || b.x+b.width<=a.x+.5 || a.y+a.height<=b.y+.5 || b.y+b.height<=a.y+.5, 'header knowledge and sound targets must not overlap');
  }
}

async function sixActions(page) {
  await scene(page,'sleep'); await header(page);
  await page.locator('[data-sleep="middle"]').click();
  await scene(page,'food'); await page.locator('#shutter').click();
  await scene(page,'move'); await page.locator('[data-move="some"]').click();
  await scene(page,'day');
  assert.equal(await page.locator('#record-count').textContent(),'3 / 3');
  await page.locator('#expand-days').click();
  await scene(page,'pattern'); await page.locator('[data-context="work"]').click();
  await scene(page,'human'); await page.locator('#see-yours').click();
  await scene(page,'real');
  await page.locator('#stage[data-phase="ready"]').waitFor();
  const meeting = routeURL(await page.locator('#book-link').getAttribute('href'));
  assert.equal(meeting.pathname,'/meet/');
  assert.equal(meeting.searchParams.get('intent'),'health');
  assert.equal(meeting.searchParams.get('from'),'xircle');
  assert.equal(meeting.searchParams.get('open'),'booking');
  assert.equal(await page.locator('#book-link').evaluate(el=>el.classList.contains('main-action')),true);
  assert.equal(await page.locator('#xvisor-link').evaluate(el=>el.classList.contains('main-action')),false);
  assert.equal(await page.locator('#xvisor-link').isVisible(),true);
}

function assertCarry(value, pathname, expectedHandoff=handoff) {
  const url=routeURL(value);
  assert.equal(url.origin,base);
  assert.equal(url.pathname,pathname);
  assert.equal(url.searchParams.get('fdh'),expectedHandoff);
  for (const key of ['health_note','weight','note','sleep','focus']) assert.equal(url.searchParams.has(key),false, `private/context query leaked: ${key}`);
  assert.equal(url.searchParams.getAll('fdh').length,expectedHandoff?1:0);
}

async function gameLanding(page, width, screenshot=false) {
  await page.locator('[data-xircle-return]').waitFor({state:'visible'});
  assertCarry(page.url(),'/xvisor/');
  assert.equal(routeURL(page.url()).searchParams.get('from'),'xircle');
  assert.equal(await page.locator('#playButton').getAttribute('href'),'/xvisor/quest/');
  await page.locator('#playButton').click({trial:true});
  assertCarry(await page.locator('[data-xircle-return] a').first().getAttribute('href'),'/xircle/');
  assert.equal(routeURL(await page.locator('[data-xircle-return] a').first().getAttribute('href')).hash,'#appointment');
  await view(page,`game-return-${width}`,screenshot);
}

const legacyValues = {
  'mc:xircle:compass-action:v1':'{"version":1,"action":"eat","savedAt":123}',
  'xircle.local.v1':'{"firstDayComplete":true,"careComplete":true,"sentinel":"prior-progress"}',
  'xvisorQuestContinueV4':'{"version":6,"stage":"qa-preserve-stage","sentinel":"existing-game-save"}',
  'xvisor.highscores.v1':'[{"sentinel":"existing-score"}]'
};
const priorSession='{"scene":"S7","sentinel":"prior-session"}';
async function seedLegacy(page) {
  await page.evaluate(({values,session})=>{
    for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value);
    sessionStorage.setItem('xircle.session.v1',session);
  },{values:legacyValues,session:priorSession});
}
async function legacyIntact(page) {
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(legacyValues)),legacyValues);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('xircle.session.v1')),priorSession);
}
async function noIdentity(page) {
  const values=await page.evaluate(()=>({install:localStorage.getItem('c7:install_id'),keys:[...Object.keys(localStorage),...Object.keys(sessionStorage)].filter(key=>key.startsWith('mc:frontdoor:'))}));
  assert.equal(values.install,null,'an opaque handoff without context must not mint installation identity');
  assert.deepEqual(values.keys,[],'an opaque handoff without context must not create telemetry queues or context');
}

try {
  browser = await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true,args:['--no-sandbox']});
  for (const width of [390,320,1440]) {
    const {context,page}=await pageFor(width);
    await goto(page,`/xircle/?entry=compass&focus=food&fdh=${handoff}${privateQuery}`);
    await seedLegacy(page);
    await sixActions(page);
    await page.locator('#xvisor-link').scrollIntoViewIfNeeded();
    await view(page,`xircle-final-${width}`,true);
    assertCarry(await page.locator('#xvisor-link').getAttribute('href'),'/xvisor/');
    await page.locator('#xvisor-link').click();
    await gameLanding(page,width,true); await legacyIntact(page); await noIdentity(page);
    await page.goBack(); await scene(page,'real');
    assert.equal(routeURL(page.url()).hash,'#appointment');
    await page.locator('#knowledge-link').click();
    await page.locator('#rooms .topic').first().waitFor();
    assertCarry(page.url(),'/xircle/learn/');
    const feature=page.locator('[data-xvisor-feature]');
    assert.equal(await feature.count(),1);
    assert.equal(await feature.evaluate(el=>Boolean(document.querySelector('#rooms').compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)),true,'knowledge articles precede the optional game invitation');
    assertCarry(await feature.locator('[data-xvisor-game]').getAttribute('href'),'/xvisor/');
    await feature.scrollIntoViewIfNeeded(); await view(page,`knowledge-game-${width}`,true);
    // Force a real result rebuild: the carry module must also handle new anchors.
    await page.locator('#search').fill('no-qa-match');
    assert.equal(await page.locator('#rooms .topic').count(),0);
    await page.locator('#search').fill('');
    const topic=page.locator('#rooms .topic[href*="t=xvisor-context"]');
    await topic.waitFor();
    await topic.click();
    await page.locator('[data-xvisor-topic-bridge]').waitFor({state:'visible'});
    assertCarry(page.url(),'/xircle/learn/topic/');
    assert.equal(routeURL(page.url()).searchParams.get('t'),'xvisor-context');
    await page.locator('[data-xvisor-topic-bridge]').scrollIntoViewIfNeeded();
    await view(page,`topic-game-${width}`,true);
    await page.locator('[data-xvisor-topic-bridge] [data-xvisor-game]').click();
    await gameLanding(page,width);
    await page.locator('[data-xircle-return] a[href*="/xircle/learn/"]').click();
    await page.locator('#search').waitFor(); assertCarry(page.url(),'/xircle/learn/');
    await legacyIntact(page); await noIdentity(page);
    await context.close();
    check(`${width}px: six actions → optional game → browser back to appointment → knowledge search → care topic → game → knowledge; Meet remains primary; legacy/game saves unchanged; no identity minted`);
  }

  const gating=await pageFor(320);
  for (const [query,visible] of [
    ['t=xvisor-context',true],['t=care-framework',true],['t=certification',true],['t=privacy-boundary',true],
    ['',false],['t=xircle-habit-tracker',false],['t=unknown',false],['t=__proto__',false],
    ['t=xvisor-context&t=care-framework',false],['t=xvisor-context&t=xvisor-context',false]
  ]) {
    await goto(gating.page,`/xircle/learn/topic/?${query}`);
    assert.equal(await gating.page.locator('[data-xvisor-topic-bridge]').isVisible(),visible,query||'no topic');
    assert.equal(await gating.page.locator('[data-xvisor-topic-bridge] [data-xvisor-game]').count(),1);
    if (visible) await gating.page.locator('[data-xvisor-topic-bridge]').scrollIntoViewIfNeeded();
    await view(gating.page,`topic-gate-${query||'default'}`);
  }
  for (const query of ['', '?from=other','?from=xircle&from=xircle']) {
    await goto(gating.page,'/xvisor/'+query);
    assert.equal(await gating.page.locator('[data-xircle-return]').isVisible(),false,query||'standalone game');
    assert.equal(await gating.page.locator('#playButton').getAttribute('href'),'/xvisor/quest/');
    await view(gating.page,'standalone-game'+query);
  }
  await noIdentity(gating.page); await gating.context.close();
  check('only the four care topics expose one optional game bridge; generic, unknown, prototype and duplicate topics do not; standalone/duplicate acquisition does not fabricate a return context');

  const documentPage=await pageFor(390);
  await goto(documentPage.page,`/xircle/doc/xvisor/?fdh=${handoff}${privateQuery}`);
  const docLink=documentPage.page.locator('[data-xvisor-feature] [data-xvisor-game]');
  await docLink.waitFor(); assertCarry(await docLink.getAttribute('href'),'/xvisor/');
  await docLink.scrollIntoViewIfNeeded(); await view(documentPage.page,'document-game-390',true);
  await docLink.click(); await gameLanding(documentPage.page,390);
  await documentPage.page.locator('[data-xircle-return] a').first().click();
  await scene(documentPage.page,'real'); assertCarry(documentPage.page.url(),'/xircle/');
  assert.equal(routeURL(documentPage.page.url()).hash,'#appointment');
  await noIdentity(documentPage.page); await documentPage.context.close();
  check('the detailed X-VISOR document links to the game, whose explicit return reaches the XIRCLE appointment without replaying the stranger intro');

  const blocked=await pageFor(320,{blockedStorage:true});
  await goto(blocked.page,`/xircle/?fdh=${handoff}${privateQuery}`);
  await sixActions(blocked.page);
  await blocked.page.locator('#xvisor-link').click(); await gameLanding(blocked.page,320);
  await blocked.page.locator('[data-xircle-return] a[href*="/xircle/learn/"]').click();
  await blocked.page.locator('[data-xvisor-feature] .xv-path__read').click();
  await blocked.page.locator('[data-xvisor-topic-bridge] [data-xvisor-game]').click();
  await gameLanding(blocked.page,320);
  await blocked.page.locator('[data-xircle-return] a').first().click(); await scene(blocked.page,'real');
  await view(blocked.page,'storage-blocked-return-320',true);
  await blocked.context.close();
  check('blocked local/session storage still permits all six actions, optional game, knowledge, topic and appointment return');

  const attemptedWrites=report.blockedRequests.filter(r=>!['GET','HEAD'].includes(r.method));
  const attemptedAPI=report.blockedRequests.filter(r=>new URL(r.url).pathname.startsWith('/api/'));
  assert.deepEqual(attemptedWrites,[],'no score, appointment or analytics write attempted');
  assert.deepEqual(attemptedAPI,[],'a handoff without stored context is not a tracking context');
  assert.deepEqual(report.pageErrors,[]);
  assert.deepEqual(report.failedAssets,[]);
  check('all checked views fit; visible images load; zero page errors, HTTP failures, API requests or write attempts; external traffic was blocked');
  report.passed=true;
} catch(error) {
  report.failure={message:error.message,stack:error.stack};
  throw error;
} finally {
  await writeFile(path.join(output,'proof.json'),JSON.stringify(report,null,2));
  await browser?.close(); await server.close();
  console.log('Proof: '+output);
}
