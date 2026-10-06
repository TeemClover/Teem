import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPreviewServer} from './preview.mjs';
const {chromium}=await import(pathToFileURL(process.env.SHORT_PLAYWRIGHT||'/Users/Teem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.SHORT_BASE_URL||`http://127.0.0.1:${server.address().port}`;
const proof=process.env.SHORT_PROOF_DIR||'/private/tmp/tontor-hero-qa';await mkdir(proof,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.SHORT_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const passed=[];
const pass=message=>{passed.push(message);console.log('PASS '+message);};
try{
  for(const width of [320,390,768,1440,2048,2560]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],missing=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)missing.push(response.url());});
    await page.goto(base+'/short/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.story-card').count(),9);
    assert.equal(await page.locator('[data-format="drama"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('[data-hero]').count(),4);
    for(const [index,id] of ['rain','krasue','warrior','village'].entries()){
      await page.locator(`[data-hero="${id}"]`).click();await page.locator('#hero-image').evaluate(image=>image.decode());
      assert.equal(await page.locator('#hero-number').textContent(),`0${index+1} / 04`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const layout=await page.evaluate(()=>{
        const art=document.querySelector('#hero-image'),hero=document.querySelector('.hero').getBoundingClientRect(),frame=art.getBoundingClientRect();
        return {fit:getComputedStyle(art).objectFit,artInside:frame.top>=hero.top&&frame.bottom<=hero.bottom,controlsInside:[...document.querySelectorAll('.hero-arrow,.hero-pagination button')].every(el=>{const r=el.getBoundingClientRect();return r.left>=hero.left&&r.right<=hero.right&&r.top>=hero.top&&r.bottom<=hero.bottom;}),copyBeforeControls:document.querySelector('.hero-creator').getBoundingClientRect().bottom<=document.querySelector('.hero-bottom').getBoundingClientRect().top};
      });
      if(width>760||id!=='rain')assert.equal(layout.fit,'contain','full poster proportions preserved');
      assert.equal(layout.artInside,true);assert.equal(layout.controlsInside,true);assert.equal(layout.copyBeforeControls,true);
      if([390,1440,2048].includes(width))await page.locator('.hero').screenshot({path:`${proof}/hero-${width}-${id}.png`});
    }
    await page.locator('#hero-next').click();assert.equal(await page.locator('[data-hero="rain"]').getAttribute('aria-pressed'),'true');
    await page.locator('#hero-prev').click();assert.equal(await page.locator('[data-hero="village"]').getAttribute('aria-pressed'),'true');
    await page.locator('.hero').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-hero="rain"]').getAttribute('aria-pressed'),'true');
    await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('[data-hero="village"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-format="comic"]').click();assert.equal(await page.locator('.story-card').count(),1);
    await page.locator('[data-format="animation"]').click();assert.equal(await page.locator('.story-card').count(),2);
    await page.locator('[data-format="all"]').click();assert.equal(await page.locator('.story-card').count(),12);
    assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await context.close();
    pass(`${width}px: four film slides, framed artwork, visible controls, wrapping arrows/keyboard and all content formats`);
  }
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto(base+'/short/',{waitUntil:'networkidle'});
  const drag=async(dx,dy=0)=>{await page.mouse.move(1050,260);await page.mouse.down();await page.mouse.move(1050+dx,260+dy,{steps:10});await page.mouse.up();};
  await drag(-220);assert.equal(await page.locator('[data-hero="krasue"]').getAttribute('aria-pressed'),'true');
  await page.locator('#hero-detail').click();assert.equal(await page.locator('#story-title').textContent(),'กระสือแถวบ้าน');await page.locator('[data-close="story-dialog"]').click();
  await drag(220);assert.equal(await page.locator('[data-hero="rain"]').getAttribute('aria-pressed'),'true');
  await drag(-20);await drag(0,130);assert.equal(await page.locator('[data-hero="rain"]').getAttribute('aria-pressed'),'true');
  await page.locator('#hero-watch').click();await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);assert.equal(await page.locator('#story-title').textContent(),'คืนที่เราไม่รู้จัก');
  await context.close();pass('mouse drag advances both ways; tiny/vertical drags ignored; detail and watch target current film');
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),phone=await mobile.newPage();
  await phone.goto(base+'/short/',{waitUntil:'networkidle'});
  const cdp=await mobile.newCDPSession(phone);
  const touch=async(from,to)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await touch({x:315,y:210},{x:75,y:210});assert.equal(await phone.locator('[data-hero="krasue"]').getAttribute('aria-pressed'),'true');
  await touch({x:75,y:210},{x:315,y:210});assert.equal(await phone.locator('[data-hero="rain"]').getAttribute('aria-pressed'),'true');
  await touch({x:195,y:380},{x:195,y:140});await phone.waitForFunction(()=>scrollY>40);assert.equal(await phone.locator('[data-hero="rain"]').getAttribute('aria-pressed'),'true');
  await mobile.close();pass('native touch swipes advance both ways; vertical touch keeps page scrolling without changing slide');
  await writeFile(proof+'/results.json',JSON.stringify({verifiedAt:new Date().toISOString(),base,passed},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
