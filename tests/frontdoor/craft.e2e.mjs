// Run against the local Front Door preview. No external request or appointment is sent.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const base = process.env.FRONTDOOR_BASE_URL || 'http://127.0.0.1:4174';
const output = process.env.FRONTDOOR_PROOF_DIR || '/tmp/frontdoor-craft-proof';
await mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const results=[];
try {
  for (const width of [390, 1440]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/frontdoor/`);await page.locator('#pickup').click();
    await page.locator('#continue-discovery').click();await page.locator('[data-answer="silver"]').click();
    await page.locator('#cross-seed').click();await page.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
    assert.equal(await page.getByLabel('ชื่อบนหน้าเว็บ',{exact:true}).count(),0);
    await page.getByRole('button',{name:'โลกเล็ก ๆ',exact:true}).click();
    await page.locator('#open-path').waitFor({state:'visible'});
    assert.equal(await page.locator('.seed-craft-edit').getAttribute('open'),null);
    assert.equal(await page.evaluate(()=>document.activeElement?.tagName==='INPUT'),false);
    await page.getByRole('button',{name:'ดูภาพ 2: มุมพักของวัน',exact:true}).click();
    assert.match(await page.locator('.seed-craft-open img').getAttribute('src'),/seed-green-pause/);
    await page.getByRole('button',{name:'เปิดภาพเต็ม',exact:true}).click();
    assert.equal(await page.locator('.seed-craft-gallery').getAttribute('data-expanded'),'true');
    await page.getByRole('button',{name:'ย่อภาพกลับ',exact:true}).click();
    await page.getByRole('button',{name:'ให้ภาพนำ',exact:true}).click();
    assert.equal(await page.locator('.seed-craft-gallery').getAttribute('data-design'),'signal');
    await page.locator('.seed-craft-gallery').screenshot({path:`${output}/silver-gallery-${width}.png`});
    await page.screenshot({path:`${output}/silver-world-${width}.png`});
    await page.locator('#save-path').click();await page.getByText('เก็บไว้แล้วบนเครื่องนี้',{exact:true}).waitFor();
    await page.reload();await page.locator('[data-answer="resume"]').click();
    assert.match(await page.locator('.seed-craft-open img').getAttribute('src'),/seed-green-pause/);
    assert.equal(await page.locator('.seed-craft-gallery h4').textContent(),'โลกที่อยากเก็บไว้');
    await page.locator('#open-path').click();await page.locator('#compass-craft-frame').waitFor();
    assert.equal(await page.locator('.craft-code').getAttribute('open'),null);
    // A real immediate pointer click must work on arrival. This caught the
    // native #q2 smooth scroll continuing after the adapter had been inserted.
    // Do not replace with keyboard, force, sleep or a pre-click scroll helper.
    await page.locator('.craft-code summary').click();
    await page.locator('#compass-craft-code').waitFor({state:'visible'});
    await page.locator('.craft-code summary').click();
    await page.locator('#compass-craft-code').waitFor({state:'hidden'});
    const frame=page.frameLocator('#compass-craft-frame');
    await frame.getByRole('heading',{name:'โลกที่อยากเก็บไว้'}).waitFor();
    assert.equal(await frame.locator('#craft-photo-1').isChecked(),true);
    await frame.getByRole('radio',{name:'ดูภาพ 3: โลกบนโต๊ะทำงาน'}).check();
    assert.equal(await frame.locator('.craft-slide-2').isVisible(),true);
    await frame.locator('#craft-expand').check();
    assert.equal(await frame.locator('#craft-expand').isChecked(),true);
    assert.equal(await frame.locator('.craft-slide-2 img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await page.getByRole('button',{name:'เล่าเป็นเรื่อง',exact:true}).click();
    await frame.locator('body[data-craft-design=editorial][data-craft-photo="1"]').waitFor();
    await page.getByRole('button',{name:'เปลี่ยนภาพเปิด',exact:true}).click();
    await frame.locator('body[data-craft-design=editorial][data-craft-photo="2"]').waitFor();
    assert.equal(await frame.locator('#craft-photo-2').isChecked(),true);
    const visualSource=await page.locator('#compass-craft-code').inputValue();
    assert.match(visualSource,/"collection":"garden","photo":2/);
    await page.getByRole('button',{name:'เก็บเว็บชิ้นนี้',exact:true}).scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.getByRole('button',{name:'เก็บเว็บชิ้นนี้',exact:true}).click();
    assert.equal(await page.locator('.craft-status').getAttribute('data-state'),'saved',await page.locator('.craft-status').textContent());
    const savedInfo=await page.evaluate(async()=>{const m=await import('/frontdoor/craft-handoff.js');const id=new URLSearchParams(location.search).get('work');return {saved:m.loadCraftWork(localStorage,id)?.source,active:localStorage.getItem('mc:frontdoor:underpaper-study:v1:active_journey')};});
    assert.equal(savedInfo.saved,visualSource,JSON.stringify({active:savedInfo.active,url:page.url()}));
    // Capturing an element taller than the viewport scrolls the browser for QA.
    // Finish that capture before reload, so the next pointer assertion measures
    // normal arrival rather than Playwright's screenshot viewport adjustment.
    await page.locator('#compass-craft').screenshot({path:`${output}/silver-dungeon-visual-${width}.png`});
    await page.reload();await page.locator('#compass-craft-frame').waitFor();
    assert.equal(await page.locator('#compass-craft-code').inputValue(),visualSource);
    assert.equal(await page.locator('.craft-code').getAttribute('open'),null);
    assert.equal(await page.frameLocator('#compass-craft-frame').locator('#craft-photo-2').isChecked(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    // Reload restores a viewport, then the artifact aligns its new DOM. Make
    // the manual scroll a separate painted action before testing its pointer;
    // the unsynchronized first-arrival regression above remains intentional.
    await page.locator('.craft-code summary').scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.locator('.craft-code summary').click();
    await page.locator('#compass-craft-code').fill('<h1>แก้โค้ดเองก็ได้</h1><script>parent.CRAFT_EXECUTED=true</script><img src="https://example.invalid/not-allowed.jpg">');
    await page.getByRole('button',{name:'เปิดดูชิ้นที่แก้แล้ว',exact:true}).click();
    assert.equal(await page.locator('.craft-visual').isVisible(),false);
    assert.equal(await page.evaluate(()=>globalThis.CRAFT_EXECUTED),undefined);
    assert.deepEqual(errors,[]);results.push({width,noTyping:true,oneTouchPayoff:true,realPhotoSwitch:true,fullPhoto:true,layoutChange:true,saveResume:true,sameGalleryHandoff:true,visualEditor:true,durableVisualEdit:true,immediatePointerDisclosure:true,pointerDisclosureAfterReload:true,codeOptionalAndSandboxed:true,errors});
    await context.close();console.log(`PASS no-typing Silver ${width}`);
  }
  for (const width of [390, 1440]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:1000}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
    const page=await context.newPage(), errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}/classroom/dungeon/?entry=compass`);
    const href=await page.evaluate(async()=>{
      const {writeCraftHandoff}=await import('/frontdoor/craft-handoff.js');
      localStorage.setItem('mc:frontdoor:underpaper-study:v1:active_journey','j-craft-browser-proof');
      localStorage.setItem('mc_dungeon_state_v2','legacy-state-sentinel');
      localStorage.setItem('mc_titles','["UNCHANGED"]');
      return writeCraftHandoff(localStorage,{title:'สวนที่ฉันอยากสร้าง',design:'editorial',edited:true,complete:true},
        {journeyId:'j-craft-browser-proof',idFactory:()=> 'h-craft-browser-proof'}).href;
    });
    await page.goto(base+href);await page.locator('#compass-craft-frame').waitFor();
    await page.locator('.craft-code summary').click();await page.locator('#compass-craft-code').waitFor();
    // Keep native keyboard access as a separate assertion; it must not hide a
    // pointer failure. Enter closes and reopens the disclosure already clicked.
    await page.locator('.craft-code summary').press('Enter');
    await page.locator('#compass-craft-code').waitFor({state:'hidden'});
    await page.locator('.craft-code summary').press('Enter');
    await page.locator('#compass-craft-code').waitFor({state:'visible'});
    assert.equal(await page.locator('#compass-craft-frame').getAttribute('sandbox'),'');
    const source='<h1>สวนที่สร้างด้วยมือฉัน</h1><p>กลับมาต่อได้จริง</p><style>body{margin:0;padding:28px;background:#e7dec6;color:#263c2e;font:20px system-ui}h1{font-size:28px}</style><script>parent.CRAFT_UNSAFE_EXECUTED=true</script>';
    await page.locator('#compass-craft-code').fill(source);
    await page.getByRole('button',{name:'เปิดดูชิ้นที่แก้แล้ว',exact:true}).click();
    assert.match(await page.locator('.craft-status').textContent(),/กดเก็บ/);
    assert.equal(await page.frameLocator('#compass-craft-frame').locator('h1').textContent(),'สวนที่สร้างด้วยมือฉัน');
    assert.equal(await page.evaluate(()=>globalThis.CRAFT_UNSAFE_EXECUTED),undefined);
    await page.getByRole('button',{name:'เก็บเว็บชิ้นนี้',exact:true}).scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.getByRole('button',{name:'เก็บเว็บชิ้นนี้',exact:true}).click();
    assert.equal(await page.locator('.craft-status').getAttribute('data-state'),'saved');
    await page.reload();await page.locator('#compass-craft-code').waitFor();
    assert.equal(await page.locator('#compass-craft-code').inputValue(),source);
    assert.equal(await page.frameLocator('#compass-craft-frame').locator('h1').textContent(),'สวนที่สร้างด้วยมือฉัน');
    assert.equal(await page.locator('.craft-ending').isVisible(),true);
    assert.match(await page.locator('#compass-craft h3').textContent(),/เก็บไว้/);
    assert.equal(await page.getByRole('link',{name:'คุยกับทีมเรื่องเว็บชิ้นนี้'}).getAttribute('href'),'/meet/?entry=compass&intent=ai&topic=private');
    assert.equal(await page.getByRole('link',{name:'กลับไปที่เข็มทิศ'}).getAttribute('href'),'/frontdoor/');
    assert.equal(await page.evaluate(()=>localStorage.getItem('mc_titles')),'["UNCHANGED"]');
    assert.equal(await page.locator('#compass-craft').evaluate(el=>el.scrollWidth>el.clientWidth),false);
    await page.locator('#compass-craft-frame').scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.locator('#compass-craft-frame').screenshot({path:`${output}/craft-rendered-${width}.png`});
    await page.locator('#compass-craft').screenshot({path:`${output}/craft-saved-${width}.png`});
    // Quota failure is shown honestly, with the edited source still available.
    await page.evaluate(()=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key.startsWith('mc:frontdoor:craft-work:'))throw new DOMException('full','QuotaExceededError');return original.call(this,key,value);};
    });
    await page.locator('#compass-craft-code').fill('<h1>ฉบับที่ยังเก็บไม่ได้</h1>');
    await page.getByRole('button',{name:'เก็บเว็บชิ้นนี้',exact:true}).scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.getByRole('button',{name:'เก็บเว็บชิ้นนี้',exact:true}).click();
    assert.equal(await page.locator('.craft-status').getAttribute('data-state'),'error');
    assert.equal(await page.locator('#compass-craft-code').inputValue(),'<h1>ฉบับที่ยังเก็บไม่ได้</h1>');
    await page.reload();await page.locator('#compass-craft-code').waitFor();
    assert.equal(await page.locator('#compass-craft-code').inputValue(),source);
    assert.equal(await page.frameLocator('#compass-craft-frame').locator('h1').textContent(),'สวนที่สร้างด้วยมือฉัน');
    assert.deepEqual(errors,[]);
    results.push({width,rendered:true,sandboxed:true,durableReload:true,immediatePointerDisclosure:true,nativeKeyboardDisclosure:true,quotaFailureRetainsPrevious:true,ending:true,localOnly:true,errors});
    await context.close();console.log(`PASS craft complete ${width}`);
  }
} finally {
  await browser.close();await writeFile(`${output}/proof.json`,JSON.stringify(results,null,2));
}
