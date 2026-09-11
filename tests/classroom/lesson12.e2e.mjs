/** Lessons 1–2: coherent Voice, a reusable Source example, and saved image review. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const {chromium}=await import(process.env.FRONTDOOR_PLAYWRIGHT
  ? pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href : 'playwright');
const output=process.env.CLASSROOM_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'classroom-lesson12-'));
await mkdir(output,{recursive:true});
const mime={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif',
  '.md':'text/markdown; charset=utf-8','.json':'application/json','.woff2':'font/woff2'
};
const server=createServer(async(req,res)=>{
  try{
    let filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    const relative=path.relative(root,filename);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.')))throw Error('Invalid path');
    if((await stat(filename)).isDirectory())filename=path.join(filename,'index.html');
    res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream'});
    res.end(await readFile(filename));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={base,checks:[],errors:[],layout:[],screenshots:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};
async function copy(page,selector){
  const count=await page.evaluate(()=>window.__copied.length);
  await page.locator(selector).click();
  await page.waitForFunction(n=>window.__copied.length===n+1,count);
  return page.evaluate(()=>window.__copied.at(-1));
}
async function capture(page,target,name){
  await page.locator(target).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,name)});
  report.screenshots.push(name);
}
async function open(page,slug){
  await page.goto(base+'/classroom/'+slug+'.html',{waitUntil:'domcontentloaded'});
  await page.locator('#cl-completion').waitFor();
  await page.waitForTimeout(1400); // Retained lesson modules reconcile once after one second.
  assert.equal(await page.locator('#finishLesson').isHidden(),true,'The common journey owns the visible completion control');
  assert.equal(await page.locator('#cl-completion').count(),1);
}

try{
  for(const [slug,name] of [['free-ai','lesson1-starter.js'],['image-ai','lesson2-life-poster.js']]){
    const html=await readFile(path.join(root,'classroom',slug+'.html'),'utf8');
    const match=html.match(new RegExp('<script[^>]*data-self-contained="'+name.replaceAll('.','\\.')+'"[^>]*>([\\s\\S]*?)<\\/script>'));
    assert.ok(match,'Missing embedded '+name);
    assert.equal(match[1].trim(),(await readFile(path.join(root,'assets',name),'utf8')).trim());
  }
  pass('Lesson-specific source assets match their self-contained HTML blocks');

  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce',acceptDownloads:true});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,reviews:[]}});
      return url.origin===base?route.continue():route.abort();
    });
    await context.addInitScript(()=>{
      window.__copied=[];
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied.push(text)},configurable:true});
    });
    const page=await context.newPage();page.setDefaultTimeout(8000);
    page.on('pageerror',error=>report.errors.push({width,message:error.message}));
    await page.addLocatorHandler(page.locator('.mc-bi__later'),async()=>page.locator('.mc-bi__later').click());

    await open(page,'free-ai');
    await page.locator('.sauce-open').first().click();
    const voice=await copy(page,'.sauce .cpx >> nth=0');
    assert.match(voice,/ช่วงที่ 1 — รับข้อมูลจากฉัน/);
    assert.match(voice,/ถามเพิ่มได้ทีละ 1 คำถาม/);
    assert.match(voice,/รอจนกว่าฉันจะพูดหรือพิมพ์ว่า “สรุปเป็นไฟล์”/);
    assert.match(voice,/ช่วงที่ 2 — เริ่มเมื่อได้รับคำว่า “สรุปเป็นไฟล์” เท่านั้น/);
    assert.doesNotMatch(voice,/ห้ามถามคำถามกลับ|กติกาการลงมือ:|ปรุง Source/);
    assert.match(voice,/สร้างเป็นไฟล์ Markdown จริง/,'The downloadable output contract stays intact');
    pass(`${width}px: actual Voice copy keeps listen/build phases and download instructions without the blanket immediate-action guard`);

    const example=await copy(page,'#lesson1TryExample');
    assert.match(example,/Main Source/);assert.match(example,/เมล็ดเล็ก/);
    assert.match(example,/ร้านยังไม่เปิด ยังไม่มีราคา รีวิว หรือรางวัล/);
    const source=await readFile(path.join(root,'classroom/examples/main-source-example.md'),'utf8');
    assert.equal((await page.locator('#lesson1ExampleSource').textContent()).trim(),source.trim());
    const downloaded=page.waitForEvent('download');
    await page.locator('#lesson1DownloadExample').click();
    const download=await downloaded;
    assert.equal(download.suggestedFilename(),'main-source-example.md');
    assert.equal(await readFile(await download.path(),'utf8'),source,'The actual download must contain the complete displayed Source');
    assert.equal(await page.locator('#cleanSauce').textContent(),'ลบกรอบโค้ด');
    assert.match(await page.locator('#downloadSauce').textContent(),/ดาวน์โหลดไฟล์ \.md/);
    await capture(page,'#lesson1Example',`lesson1-example-${width}.png`);
    pass(`${width}px: the fictional example copies its complete task and downloads the exact reusable Source shown on the page`);

    await open(page,'image-ai');
    assert.equal(await page.locator('#lesson2Taste').count(),1);
    const checks=page.locator('.life-done input');
    await checks.nth(0).check();await checks.nth(4).check();
    await page.locator('input[name="lesson2TasteCause"][value="missing"]').check();
    await page.locator('#lifeTasteChange').fill('เปลี่ยนผ้ากันเปื้อนเป็นเขียวเข้ม');
    await page.locator('#lifeTasteKeep').fill('โต๊ะไม้และต้นไม้ 1 ต้น');
    const repair=await copy(page,'#lifeRepairPrompt .cpx');
    assert.match(repair,/เปลี่ยนผ้ากันเปื้อนเป็นเขียวเข้ม/);assert.match(repair,/เพิ่มเป็นกติกา/);
    assert.match(repair,/โต๊ะไม้และต้นไม้ 1 ต้น/);
    assert.match(repair,/Task Source \.md ฉบับอัปเดต/);
    await page.locator('#lifeTasteChange').fill('เปลี่ยนผ้ากันเปื้อนเป็นสีครีม');
    const latest=await copy(page,'#lifeRepairPrompt .cpx');
    assert.match(latest,/สีครีม/);assert.doesNotMatch(latest,/เขียวเข้ม/,'Copy must use current input, not the first generated prompt');
    for(const [cause,expected] of [['ignored',/คงข้อเท็จจริงใน Source/],['decision',/การตัดสินใจใหม่ของฉัน/]]){
      await page.locator(`input[name="lesson2TasteCause"][value="${cause}"]`).check();
      assert.match(await copy(page,'#lifeRepairPrompt .cpx'),expected);
    }
    pass(`${width}px: every repair cause copies the current input and preserves verified details in the Source update`);

    await page.reload({waitUntil:'domcontentloaded'});await page.locator('#lesson2Taste').waitFor();
    assert.equal(await checks.nth(0).isChecked(),true);assert.equal(await checks.nth(1).isChecked(),false);assert.equal(await checks.nth(4).isChecked(),true);
    assert.equal(await page.locator('#lifeTasteChange').inputValue(),'เปลี่ยนผ้ากันเปื้อนเป็นสีครีม');
    assert.equal(await page.locator('#lifeTasteKeep').inputValue(),'โต๊ะไม้และต้นไม้ 1 ต้น');
    assert.equal(await page.locator('input[name="lesson2TasteCause"][value="decision"]').isChecked(),true);
    assert.match(await page.locator('#lifeCheckStatus').innerText(),/2 \/ 5/);
    pass(`${width}px: checkbox state, review reason and both text fields survive a reload`);

    await page.locator('#lifeTasteChange').fill('');
    await page.locator('input[name="lesson2TasteCause"][value="correct"]').check();
    assert.equal(await page.locator('#lifeTasteChangeField').isHidden(),true);
    const correct=await copy(page,'#lifeRepairPrompt .cpx');
    assert.match(correct,/ยังไม่ต้องสร้างภาพใหม่/);assert.match(correct,/กติกาที่ผ่านการตรวจภาพ/);
    assert.doesNotMatch(correct,/แก้เฉพาะจุดต่อไปนี้|สีครีม/);
    await page.reload({waitUntil:'domcontentloaded'});await page.locator('#lesson2Taste').waitFor();
    assert.equal(await page.locator('input[name="lesson2TasteCause"][value="correct"]').isChecked(),true);
    assert.equal(await page.locator('#lifeTasteChangeField').isHidden(),true);
    assert.match(await copy(page,'#lifeRepairPrompt .cpx'),/ยังไม่ต้องสร้างภาพใหม่/);
    await page.waitForTimeout(1600);
    const idleMutations=await page.locator('#lesson2Taste').evaluate(element=>new Promise(resolve=>{
      let count=0;const observer=new MutationObserver(records=>count+=records.length);
      observer.observe(element,{childList:true,subtree:true,attributes:true,characterData:true});
      setTimeout(()=>{observer.disconnect();resolve(count);},450);
    }));
    assert.equal(idleMutations,0,'The review controls must stop changing while idle');
    await capture(page,'#lesson2Taste',`lesson2-taste-${width}.png`);
    const layout=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}));
    assert.ok(layout.page<=layout.viewport,'Lesson 2 must not overflow horizontally');
    report.layout.push({...layout,idleMutations});
    pass(`${width}px: checked-correct needs no invented error, stays selected after reload, and remains stable while idle`);
    await context.close();
  }
  assert.deepEqual(report.errors,[],'Lessons must not produce page errors');
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;throw error;}
finally{
  const proof=path.join(output,'lesson12-report.json');
  await writeFile(proof,JSON.stringify(report,null,2));
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,proof}));
}
