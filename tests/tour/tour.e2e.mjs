/**
 * 3D house tour: loads with WebGL, walks every room, the accessible clover quest works,
 * the lucky card opens after four clovers, and the page still works without WebGL.
 * Run: TOUR_PLAYWRIGHT=/path/to/playwright [TOUR_CHROME=/path/to/chrome] node tests/tour/tour.e2e.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const {chromium} = await import(process.env.TOUR_PLAYWRIGHT ? pathToFileURL(process.env.TOUR_PLAYWRIGHT + '/index.mjs').href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.env.TOUR_PROOF_DIR || await mkdtemp(tmpdir() + '/tour-'); await mkdir(out, {recursive: true});
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg'};
const server = http.createServer(async (q, r) => {
  const requested=new URL(q.url,'http://tour.test');
  if(requested.pathname==='/api/learn'&&requested.searchParams.get('action')==='entry'){r.writeHead(401,{'content-type':'application/json','x-tour-test-fixture':'anonymous-learning'});r.end(JSON.stringify({error:'unauthenticated'}));return;}
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(root, p)); r.writeHead(200, {'content-type': types[extname(p)] || 'application/octet-stream'}); r.end(b); } catch { r.writeHead(404); r.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.TOUR_CHROME || undefined, args: process.env.TOUR_HARDWARE ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const portfolioOnly=process.env.TOUR_PORTFOLIO_ONLY==='1';
const report={startedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirtyFiles:execFileSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean),mode:portfolioOnly?'portfolio-only':'full',runtime:process.version,browser:await browser.version(),checks:[],pageErrors:[],failedLocalResources:[],blockedWrites:[],apiStubs:[],passed:false};
const pass = m => {report.checks.push(m);console.log('PASS ' + m);};
function noWebGL(){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /^(?:webgl2?|experimental-webgl)$/.test(kind)?null:original.call(this,kind,...args);};}

async function open(opts, init, block, path='/tour/') {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', r => {if(r.request().method()!=='GET'){report.blockedWrites.push({url:r.request().url(),method:r.request().method()});return r.abort();}return r.request().url().startsWith(base) && !(block && block.test(r.request().url())) ? r.continue() : r.abort();});
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errors = [], requests = [];
  page.on('request', r => requests.push(r.url()));
  page.on('pageerror', e => {errors.push(e.message);report.pageErrors.push({url:page.url(),message:e.message});});
  page.on('response',r=>{if(!r.url().startsWith(base)||r.status()<400)return;const url=new URL(r.url());if(url.pathname==='/api/learn'&&url.searchParams.get('action')==='entry'&&r.status()===401){report.apiStubs.push({url:r.url().replace(base,''),status:401,fixture:'anonymous-learning'});return;}report.failedLocalResources.push({url:r.url().replace(base,''),status:r.status()});});
  if (block||opts.javaScriptEnabled===false) { await page.goto(base + path, {waitUntil: 'domcontentloaded'}); return {ctx, page, errors, requests}; }
  await page.goto(base + path, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, {timeout: 60000});
  return {ctx, page, errors, requests};
}

async function roomRest(page,id){
  await page.waitForFunction(id=>Math.abs(window.__tour.progress()-window.__tour.order.indexOf(id))<.05,id,{timeout:20000});
  const boxes=await page.evaluate(id=>{const card=document.querySelector(`#${id} .card`),heading=card.querySelector('h2'),c=card.getBoundingClientRect(),h=heading.getBoundingClientRect();return {id,card:{top:c.top,bottom:c.bottom,height:c.height},heading:{top:h.top,bottom:h.bottom},height:innerHeight,activeTag:document.activeElement.tagName};},id);
  assert.ok(boxes.heading.top>=-1&&boxes.heading.bottom<=boxes.height+1,`native ${id} heading must be visible: ${JSON.stringify(boxes)}`);
  if(boxes.card.height<=boxes.height-24)assert.ok(boxes.card.top>=-1&&boxes.card.bottom<=boxes.height+1,`native ${id} card must fit at rest: ${JSON.stringify(boxes)}`);
  assert.equal(boxes.activeTag,'H2',`native ${id} jump focuses its heading`);
  (report.roomAnchorBoxes??=[]).push(boxes);
}
async function nativeRoomJumps(page){
  await page.locator('.hero-actions a[href="#office"]').click();await roomRest(page,'office');
  await page.locator('.rail [data-rail="classroom"]').click();await roomRest(page,'classroom');
  await page.goBack();await roomRest(page,'office');await page.goBack();await page.waitForFunction(()=>window.__tour.progress()<.05);
  pass('native hero and room rail clicks center their cards, focus headings and restore the room on Back');
}

try {
  if(!portfolioOnly) { // WebGL tour, reduced motion so camera and cards settle immediately
    const {ctx, page, errors, requests} = await open({viewport: {width: 1280, height: 800}, reducedMotion: 'reduce'}, () => localStorage.setItem('mc:tour:quality','hd'));
    assert.equal(await page.locator('[data-quality]').count(),0);
    assert.equal(await page.evaluate(()=>window.__tour.quality()),'sd');
    assert.equal(await page.evaluate(()=>localStorage.getItem('mc:tour:quality')),null);
    pass('returning HD visitors enter the light scene without a quality switch');
    await page.waitForFunction(()=>!window.__introOpening);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/desktop-hero.png`});
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), false);
    const seam = await page.evaluate(() => window.__tour.storeySeam());
    assert.ok(seam.frontClearance > 0.005 && seam.overlap > 0, `storey edge must overlap without coplanar faces: ${JSON.stringify(seam)}`);
    assert.deepEqual(await page.evaluate(() => window.__tour.order), ['hero', 'door', 'living', 'kitchen', 'stairs', 'classroom', 'office', 'finale']);
    // outside the house nothing inside can be picked: the walls are in the way
    const outside = await page.evaluate(() => { const got = new Set(); for (let x = 20; x < innerWidth; x += 40) for (let y = 60; y < innerHeight; y += 40) { const h = window.__tour.pickAt(x, y); if (h) got.add(h.id || h.type); } return [...got]; });
    assert.ok(outside.every(id => id === 'meet'), 'picked through the wall: ' + outside);
    pass('from the garden, clicks never reach objects inside the house');
    await nativeRoomJumps(page);
    for (const [i, id] of ['living', 'kitchen', 'stairs', 'classroom', 'office', 'finale'].entries()) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }, id);
      await page.waitForFunction(n => { const want = document.querySelectorAll('[data-scene]')[n].dataset.scene; return Math.abs(window.__tour.progress() - n) < 0.05 && document.querySelector('.rail a.active')?.dataset.rail === (want === 'stairs' ? 'classroom' : want); }, i + 2, {timeout: 20000});
      assert.equal(await page.$eval(`#${id} .card`, c => getComputedStyle(c).opacity), '1');
      await page.screenshot({path: `${out}/desktop-${id}.png`});
    }
    pass('scroll walks every room with its rail and card');

    const domItems = await page.$$eval('[data-item]', as => as.map(a => a.dataset.item).sort());
    assert.deepEqual(await page.evaluate(() => window.__tour.items().sort()), domItems);
    pass(`all ${domItems.length} objects in the house match a link on the page`);

    // a real click on the hidden clover in the 3D office collects it
    await page.evaluate(() => { const s = document.getElementById('office'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForFunction(() => Math.abs(window.__tour.progress() - window.__tour.order.indexOf('office')) < 0.05);
    const settled = async id => { // wait until the camera has settled (software GL renders slowly)
      let spot = null;
      for (let i = 0; i < 40; i++) {
        const next = await page.evaluate(id => window.__tour.screenOf(id), id);
        if (spot && next && Math.hypot(next.x - spot.x, next.y - spot.y) < 0.5) return next;
        spot = next; await page.waitForTimeout(400);
      }
      return spot;
    };
    const tap = async (id, done, arg=null) => { // software GL can drop a tap during a slow frame; retry a few times
      for (let i = 0; i < 3; i++) {
        const at = await settled(id);
        await page.mouse.move(at.x, at.y); await page.mouse.down(); await page.mouse.up();
        try { await page.waitForFunction(done, arg, {timeout: 5000}); return; } catch {}
      }
      throw Error('tap did not register on ' + id);
    };
    await tap('house3d', () => window.__tour.inspecting() === 'house3d');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/showcase/house/');
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    await tap('xvisor', () => window.__tour.inspecting() === 'xvisor');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/xvisor/');
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    await tap('resume', () => window.__tour.inspecting() === 'resume');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/resume/');
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    pass('the sideboard house model and desk screens remain reachable in the new office layout');
    for(const [id,href] of [['office-xircle','/xircle/'],['company-cloverx','https://www.cloverx.co.th/th'],['depa-news','https://www.depa.or.th/th/article-view/20260918_01']]){
      await tap(id,id=>window.__tour.inspecting()===id,id);assert.equal(await page.getAttribute('#inspect-go','href'),href);await page.click('.inspect-close');await page.waitForFunction(()=>document.querySelector('#inspect').hidden);
    }
    pass('the new office XIRCLE screen, company wall and depa clipping are reachable and use the approved destinations');
    const blockedSpot=await settled('office-xircle');await page.locator('[data-open-workbench]').first().click();await page.mouse.click(blockedSpot.x,blockedSpot.y);assert.equal(await page.evaluate(()=>window.__tour.inspecting()),null);await page.keyboard.press('Escape');await tap('office-xircle',()=>window.__tour.inspecting()==='office-xircle');await page.click('.inspect-close');await page.waitForFunction(()=>document.querySelector('#inspect').hidden);
    pass('native portfolio blocks house picking while open and restores picking after Escape');

    await tap('mediral', () => window.__tour.inspecting() === 'mediral');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/mediral/');
    assert.match(await page.textContent('#inspect-title'), /Mediral/);
    await page.waitForTimeout(800);
    await page.screenshot({path: `${out}/desktop-mediral.png`});
    const [mediralTab] = await Promise.all([page.waitForEvent('popup'), page.click('#inspect-go')]);
    await mediralTab.waitForLoadState('domcontentloaded');
    assert.equal(new URL(mediralTab.url()).pathname, '/mediral/');
    await mediralTab.close();
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    pass('the skincare cabinet opens the Mediral brand project in a new tab');

    assert.equal(await page.evaluate(() => window.__tour.itemState('teambook').badge), 'gold');
    await tap('teambook', () => window.__tour.inspecting() === 'teambook');
    await page.waitForSelector('#inspect.open');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/teambook/');
    assert.match(await page.textContent('#inspect-title'), /TeamBook/);
    await page.screenshot({path: `${out}/desktop-inspect.png`});
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    assert.equal(await page.evaluate(() => window.__tour.itemState('teambook').badge), 'silver');
    await page.waitForFunction(() => window.__tour.itemState('teambook').opacity > 0.9);
    pass('tapping the TeamBook notebook in the project room picks it up and offers its page');

    await tap('airova', () => window.__tour.inspecting() === 'airova');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/airova/');
    assert.match(await page.textContent('#inspect-title'), /Airova/i);
    await page.screenshot({path: `${out}/desktop-airova.png`});
    const homeURL = page.url(), homeScroll = await page.evaluate(() => scrollY);
    const [airovaTab] = await Promise.all([page.waitForEvent('popup'), page.click('#inspect-go')]);
    await airovaTab.waitForLoadState('domcontentloaded');
    assert.equal(new URL(airovaTab.url()).pathname, '/airova/');
    assert.equal(await airovaTab.evaluate(() => window.opener), null);
    await airovaTab.close();
    assert.equal(page.url(), homeURL);
    assert.equal(await page.evaluate(() => scrollY), homeScroll);
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    assert.equal(await page.evaluate(() => window.__tour.itemState('airova').badge), 'silver');
    await page.locator('#office .office-more summary').click();
    const [resumeTab] = await Promise.all([page.waitForEvent('popup'), page.click('#office [data-item="resume"]')]);
    await resumeTab.waitForLoadState('domcontentloaded');
    assert.equal(new URL(resumeTab.url()).pathname, '/resume/');
    await resumeTab.close();await page.locator('#office .office-more summary').click();
    assert.equal(await page.evaluate(() => window.__tour.itemState('resume').badge), 'silver');
    await tap('teambook', () => window.__tour.inspecting() === 'teambook');
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    pass('gold changes to persistent silver; silver items remain pickable; panel and direct links open a new tab while home stays put');
    pass('the additional studio computer opens Airova for video and marketing');

    // the classroom computers open lessons 1, 4, 5 and the Dungeon; objects of other rooms stay out of reach
    const lessonHref = await page.$$eval('#classroom [data-item]', as => Object.fromEntries(as.map(a => [a.dataset.item, a.getAttribute('href')])));
    assert.deepEqual([lessonHref['lesson-1'], lessonHref['lesson-4'], lessonHref['lesson-5'], lessonHref.dungeon], ['/classroom/free-ai.html', '/classroom/notebooklm.html', '/classroom/prompts.html', '/classroom/dungeon/']);
    const far = await page.evaluate(() => window.__tour.screenOf('dungeon'));
    if (far) { const h = await page.evaluate(({x, y}) => window.__tour.pickAt(x, y), far); assert.notEqual(h?.id, 'dungeon'); }
    pass('lesson computers link to บท 1, บท 4, บท 5 and the Dungeon; other rooms are out of reach');

    const spot = await settled('office');
    assert.ok(spot && spot.x > 0 && spot.x < 1280 && spot.y > 0 && spot.y < 800, JSON.stringify(spot));
    await tap('office', () => document.querySelector('#clover-count .count-text').textContent === '1/4');
    assert.match(await page.textContent('[data-find="office"]'), /เก็บใบนี้แล้ว/);
    pass('clicking the hidden clover in the 3D room collects it');

    await page.evaluate(() => { const s = document.getElementById('kitchen'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForFunction(() => Math.abs(window.__tour.progress() - window.__tour.order.indexOf('kitchen')) < 0.05);
    await tap('absorb', () => window.__tour.inspecting() === 'absorb');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/routinex/absorb/');
    const kitchenURL = page.url(), kitchenScroll = await page.evaluate(() => scrollY);
    const [absorbTab] = await Promise.all([page.waitForEvent('popup'), page.click('#inspect-go')]);
    await absorbTab.waitForLoadState('domcontentloaded');
    assert.equal(new URL(absorbTab.url()).pathname, '/routinex/absorb/');
    assert.equal(await absorbTab.evaluate(() => window.opener), null);
    await absorbTab.close();
    assert.equal(page.url(), kitchenURL);
    assert.equal(await page.evaluate(() => scrollY), kitchenScroll);
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    assert.equal(await page.evaluate(() => window.__tour.itemState('absorb').badge), 'silver');
    pass('the left-wall anatomy model opens Absorb in a new tab and keeps the kitchen in place');
    await tap('ako', () => window.__tour.inspecting() === 'ako');
    assert.equal(await page.getAttribute('#inspect-go', 'href'), '/ako/');
    await page.screenshot({path: `${out}/desktop-ako-cookbook.png`});
    await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    pass('the illustrated Ako recipe notebook is pickable and opens Ako');

    // the record player in the living room plays the house music
    await page.evaluate(() => { const s = document.getElementById('living'); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); });
    await page.waitForFunction(() => Math.abs(window.__tour.progress() - window.__tour.order.indexOf('living')) < 0.05);
    await tap('music', () => document.querySelector('#music').getAttribute('aria-pressed') === 'true');
    await page.click('#music'); await page.waitForFunction(() => document.querySelector('#music').getAttribute('aria-pressed') === 'false');
    pass('the record player (and the music button) play and stop the house music');

    for (const [id, href] of [['teem-photo', '/resume/'], ['ako-photo', '/ako/']]) {
      await tap(id, () => document.querySelector('#inspect').classList.contains('open'));
      assert.equal(await page.evaluate(() => window.__tour.inspecting()), id);
      assert.equal(await page.getAttribute('#inspect-go', 'href'), href);
      const [portraitTab] = await Promise.all([page.waitForEvent('popup'), page.click('#inspect-go')]);
      await portraitTab.waitForLoadState('domcontentloaded');
      assert.equal(new URL(portraitTab.url()).pathname, href);
      await portraitTab.close();
      await page.click('.inspect-close'); await page.waitForFunction(() => document.querySelector('#inspect').hidden);
    }
    pass('both Meet portraits are pickable and open their own profile in a new tab');

    await page.evaluate(() => scrollTo(0, 0));
    for (const room of ['living', 'kitchen', 'classroom']) {
      const btn = page.locator(`[data-find="${room}"]`);
      await btn.click(); assert.match(await btn.textContent(), /กดอีกครั้ง/);
      await btn.click(); assert.match(await btn.textContent(), /เก็บใบนี้แล้ว/);
    }
    assert.equal(await page.textContent('#clover-count .count-text'), '4/4');
    await page.waitForSelector('#lucky[open]');
    assert.match(await page.textContent('#lucky-title'), /รางวัล/);
    assert.ok((await page.textContent('#lucky-message')).trim().length > 10, 'the card still carries a line to keep');
    assert.match(await page.textContent('#lucky-prize'), /คอมชั้น 2/);
    assert.equal(await page.isVisible('#lucky-go'), true);
    assert.equal(await page.locator('#lucky a:visible').count(), 0, 'the prize card points the way without a link');
    await page.screenshot({path: `${out}/desktop-lucky.png`});
    pass('keyboard-accessible clover quest reaches the lucky card');

    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => !document.body.classList.contains('is-loading'));
    assert.equal(await page.textContent('#clover-count .count-text'), '4/4');
    pass('collected clovers persist for this viewer');
    for (const id of ['teambook', 'airova', 'resume', 'teem-photo', 'ako-photo', 'mediral']) assert.equal(await page.evaluate(id => window.__tour.itemState(id).badge, id), 'silver');

    assert.equal(await page.locator('[data-quality]').count(),0);
    // Warm every room and await the actual lazy-image GPU-upload promises, rather than treating cold assets as leaks.
    for(const id of ['living','kitchen','classroom','office']){
      await page.evaluate(id=>{const s=document.getElementById(id);scrollTo(0,s.offsetTop+s.offsetHeight/2-innerHeight/2);},id);
      await page.waitForFunction(id=>Math.abs(window.__tour.progress()-window.__tour.order.indexOf(id))<.05,id);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    await page.waitForFunction(()=>window.__tour.picturesPending()===0,null,{timeout:60000});
    report.textureReadiness={pending:await page.evaluate(()=>window.__tour.picturesPending()),stats:await page.evaluate(()=>window.__tour.stats())};
    const memory=[];
    for(let lap=0;lap<3;lap++) {
      for(const id of ['living','kitchen','classroom','office']) {
        await page.evaluate(id=>{const s=document.getElementById(id);scrollTo(0,s.offsetTop+s.offsetHeight/2-innerHeight/2)},id);
        await page.waitForTimeout(450);
      }
      await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.__tour.picturesPending()),0,'measured samples require completed picture uploads');memory.push(await page.evaluate(()=>window.__tour.stats()));
    }
    report.memorySamples=memory;
    assert.ok(memory.at(-1).geometries<=memory[0].geometries+2,JSON.stringify(memory));
    assert.ok(memory.at(-1).textures<=memory[0].textures+2,JSON.stringify(memory));
    assert.ok(memory[0].batchedMeshes>100);
    assert.ok(memory.every(m=>!m.ao&&!m.bloom&&m.pixelRatio<=1.25));
    assert.ok(!requests.some(url=>/postprocessing|GTAOPass|UnrealBloom/.test(url)));
    await page.screenshot({path:`${out}/desktop-light-office.png`});
    pass('repeat room visits keep geometry stable and never load HD effects');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  if(!portfolioOnly) { // Real WebGL phone framing with a legacy HD preference.
    const {ctx, page, errors} = await open({viewport: {width: 393, height: 852}, screen: {width: 393, height: 852}, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce'}, () => localStorage.setItem('mc:tour:quality','hd'));
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), false);
    assert.equal(await page.evaluate(()=>window.__tour.quality()),'sd');
    assert.equal(await page.locator('[data-quality]').count(),0);
    await nativeRoomJumps(page);
    for (const id of ['living', 'kitchen', 'classroom', 'office']) {
      await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.offsetTop + s.offsetHeight / 2 - innerHeight / 2); }, id);
      await page.waitForTimeout(800);
      if(id==='office'){
        const positions=await page.evaluate(()=>[...document.querySelectorAll('#office [data-item]')].map(a=>({id:a.dataset.item,point:window.__tour.screenOf(a.dataset.item)})));
        assert.ok(positions.every(({point})=>point&&point.x>0&&point.x<393&&point.y>0&&point.y<852),JSON.stringify(positions));
        report.phoneOfficePositions=positions;
      }
      await page.screenshot({path: `${out}/phone-light-${id}.png`});
    }
    const buffer = await page.$eval('#stage', c => c.width * c.height);
    assert.ok(buffer <= 1_000_000);
    assert.deepEqual(errors, []);
    pass('phone light scene loads all rooms within its pixel budget');
    await ctx.close();
  }
  if(!portfolioOnly) { // Closing a directly linked workbench returns to a centered office; real width changes preserve the walk.
    const {ctx,page,errors}=await open({viewport:{width:1440,height:900},reducedMotion:'reduce'},null,null,'/tour/?view=work&filter=all#office');
    await page.waitForFunction(()=>document.querySelector('#workbench').open);await page.keyboard.press('Escape');await page.waitForFunction(()=>Math.abs(window.__tour.progress()-6)<.03);
    assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-open-workbench')),true);
    const resize=[];
    for(const [width,height] of [[393,852],[1440,900]]){await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForFunction(()=>Math.abs(window.__tour.progress()-6)<.03);resize.push({case:'office',width,progress:await page.evaluate(()=>window.__tour.progress())});assert.equal(new URL(page.url()).hash,'#office');}
    await page.evaluate(()=>{const s=[...document.querySelectorAll('[data-scene]')],a=s[3].offsetTop+s[3].offsetHeight/2-innerHeight/2,b=s[4].offsetTop+s[4].offsetHeight/2-innerHeight/2;scrollTo(0,a+(b-a)*.35);});await page.waitForFunction(()=>Math.abs(window.__tour.progress()-3.35)<.03);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.setViewportSize({width:393,height:852});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForFunction(()=>Math.abs(window.__tour.progress()-3.35)<.03);resize.push({case:'midwalk',progress:await page.evaluate(()=>window.__tour.progress())});
    await page.locator('[data-open-workbench]').click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const before=await page.evaluate(()=>window.__tour.progress());
    await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForFunction(before=>Math.abs(window.__tour.progress()-before)<.03,before);assert.equal(await page.locator('#workbench').evaluate(el=>el.open),true);resize.push({case:'open-gallery',before,after:await page.evaluate(()=>window.__tour.progress())});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>Math.abs(window.__tour.progress()-6)<.03);report.resizeProgress=resize;assert.deepEqual(errors,[]);await ctx.close();pass('direct gallery close centers the office; mobile/desktop, midwalk and open-dialog width changes preserve the actual camera position');
  }
  if(!portfolioOnly) { // No WebGL: the story and links still work
    const {ctx, page, errors} = await open({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true},
      noWebGL);
    assert.equal(await page.evaluate(() => document.body.classList.contains('no-webgl')), true);
    assert.equal(await page.locator('[data-primary]').count(), 5);
    const rail = await page.$$eval('.rail a', as => as.map(a => { const r = a.getBoundingClientRect(); return {name: a.getAttribute('aria-label'), w: r.width, h: r.height}; }));
    assert.ok(rail.length === 6 && rail.every(r => r.name && r.w >= 32 && r.h >= 44), JSON.stringify(rail));
    pass('room menu on a phone: every dot has a name and a finger-sized target');
    await page.locator('#kitchen').scrollIntoViewIfNeeded(); await page.waitForTimeout(900);
    await page.screenshot({path: `${out}/phone-no-webgl.png`});
    assert.deepEqual(errors, []);
    pass('falls back to a readable page without WebGL');
    await ctx.close();
  }
  if(!portfolioOnly) { // the house module can't load (blocked, offline): the story and every link come back on their own
    const {ctx, page} = await open({viewport: {width: 393, height: 852}}, null, /\/tour\/tour\.js/);
    await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, {timeout: 10000});
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('static')), true);
    await page.locator('#living').scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    assert.equal(await page.$eval('#living .card', c => getComputedStyle(c).opacity), '1');
    await page.screenshot({path: `${out}/phone-module-blocked.png`});
    pass('if the 3D module fails to load, the loader lifts and the content is readable');
    await ctx.close();
  }
  { // The workbench is useful even when the 3D renderer is unavailable.
    for(const width of [320,390,768,1440]){
      const {ctx,page,errors}=await open({viewport:{width,height:900},reducedMotion:'reduce'},noWebGL);
      await page.locator('#workbench[data-portfolio-ready="true"]').waitFor({state:'attached'});
      const opener=page.locator('[data-open-workbench]').first();await opener.click();
      assert.equal(await page.locator('#workbench').evaluate(el=>el.open),true);assert.equal(new URL(page.url()).searchParams.get('view'),'work');assert.equal(new URL(page.url()).hash,'#office');assert.equal(await page.evaluate(()=>document.activeElement.id),'workbench-title');
      const categories=await page.locator('[data-work-card]').evaluateAll(cards=>cards.map(card=>card.dataset.workCategory.split(/\s+/)));
      assert.equal(categories.length,8);
      for(const filter of ['all','cloverx','systems','learning']){
        await page.locator(`.workbench-filters [data-work-filter="${filter}"]`).click();
        const expected=categories.filter(values=>filter==='all'||values.includes(filter)).length;
        assert.equal(await page.locator('[data-work-card]:visible').count(),expected);
        assert.equal((await page.locator('#workbench-count').innerText()).match(/\d+/)?.[0],String(expected));
        assert.equal(await page.locator(`.workbench-filters [data-work-filter="${filter}"]`).getAttribute('aria-pressed'),'true');
        assert.equal(new URL(page.url()).searchParams.get('filter'),filter);
      }
      const boxes=await page.evaluate(()=>{const r=document.querySelector('#workbench').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,document:document.documentElement.scrollWidth};});
      assert.ok(boxes.left>=-1&&boxes.right<=width+1&&boxes.top>=-1&&boxes.bottom<=900+1&&boxes.document<=width+1,`gallery fits ${width}px: ${JSON.stringify(boxes)}`);
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#workbench').open);
      assert.equal(await page.locator('.workbench-filters [data-work-filter="learning"]').getAttribute('aria-pressed'),'true');
      await page.keyboard.press('Escape');assert.equal(await page.locator('#workbench').evaluate(el=>el.open),false);assert.equal(new URL(page.url()).searchParams.has('view'),false);assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-open-workbench')),true);
      await opener.click();await page.goBack();assert.equal(await page.locator('#workbench').evaluate(el=>el.open),false);await page.goForward();await page.waitForFunction(()=>document.querySelector('#workbench').open);
      await page.locator('.workbench-filters [data-work-filter="all"]').click();
      for(const img of await page.locator('[data-work-card] img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());}
      await page.locator('#workbench').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`${out}/workbench-${width}.png`});
      await page.locator('[data-close-workbench]').click();assert.equal(await page.locator('#workbench').evaluate(el=>el.open),false);assert.deepEqual(errors,[]);await ctx.close();
      pass(`native portfolio ${width}px: eight typed cards, every category, reload/Back/Forward/Escape/focus and decoded artwork`);
    }
  }
  { // Incoming state cannot select a prototype property or ambiguous duplicate field.
    for(const [query,openGallery,filter] of [['?view=work&filter=constructor',true,'all'],['?view=work&filter=learning&filter=systems',true,'all'],['?view=work&view=work&filter=cloverx',false,'cloverx']]){
      const {ctx,page,errors}=await open({viewport:{width:390,height:844},reducedMotion:'reduce'},noWebGL,null,'/tour/'+query+'#office');
      await page.locator('#workbench[data-portfolio-ready="true"]').waitFor({state:'attached'});assert.equal(await page.locator('#workbench').evaluate(el=>el.open),openGallery);
      assert.equal(await page.locator(`.workbench-filters [data-work-filter="${filter}"]`).getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);await ctx.close();
    }
    pass('gallery URL restores supported filters and rejects prototype/duplicate view/filter fields');
  }
  { // The real destinations and professional identity remain readable with no JavaScript at all.
    const {ctx,page}=await open({viewport:{width:390,height:844},javaScriptEnabled:false});
    await page.locator('#office').scrollIntoViewIfNeeded();assert.equal(await page.locator('#office [data-primary]').getAttribute('href'),'/xircle/');
    assert.match(await page.locator('#office').innerText(),/CAIO/);assert.equal(await page.locator('#office [data-item="company-cloverx"]').getAttribute('href'),'https://www.cloverx.co.th/th');assert.equal(await page.locator('#office [data-item="depa-news"]').getAttribute('href'),'https://www.depa.or.th/th/article-view/20260918_01');
    assert.equal(await page.locator('[data-open-workbench]').isVisible(),false);assert.equal(await page.locator('#office .card').isVisible(),true);
    await page.screenshot({path:`${out}/phone-no-javascript-office.png`});await ctx.close();pass('no-JavaScript office retains CAIO identity, XIRCLE primary and exact company/news links');
  }
  console.log('Screenshots: ' + out);
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.failedLocalResources,[]);report.passed=true;
} catch(error){report.failure={message:error.message,stack:error.stack};throw error;} finally {report.completedAt=new Date().toISOString();await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();server.close();}
