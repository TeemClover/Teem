// Run with COURSE_URL, PLAYWRIGHT_MODULE_PATH and CHROME_PATH as needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const base=(process.env.COURSE_URL||'http://127.0.0.1:8765/course/').replace(/\/?$/,'/');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'dent-qa-'));
let checks=0;const check=(label,condition)=>{assert.ok(condition,label);checks++;console.log('PASS',label);};
const context=await browser.newContext({viewport:{width:1366,height:768},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function route(hash){await page.goto(base+hash);await page.waitForFunction(hash=>{const parts=hash.slice(1).split('/');if(parts[0]==='present')return document.querySelector('#slide-select')?.value===parts[1];const item=window.DENT_COURSE?.modules.find(m=>m.id===(parts[1]||'start'));return item&&document.querySelector('#learning-surface h1')?.textContent===item.title;},hash);}
try{
 await route('');
 check('seven lessons render',await page.locator('#lesson-nav a').count()===7);
 const modules=await page.evaluate(()=>window.DENT_COURSE.modules.map(m=>m.id));
 for(const id of modules){await route('#learn/'+id);check('module '+id,await page.locator('[data-complete="'+id+'"]').count()===1);}
 await route('#learn/sauce');
 const area=page.locator('#lesson-prompt-extract');await area.fill('ทดสอบข้อความที่แก้เอง [SOURCE]');
 await page.locator('.sidebar [data-action="resources"]').click();
 const detail=page.locator('#library-prompt-extract').locator('..').locator('..');await detail.locator('summary').click();
 await page.locator('#library-prompt-extract').fill('แก้จากหน้าต่างรวมแล้วใช้ต่อได้');await page.locator('#dialog-close').click();
 check('prompt draft stays in sync',await area.inputValue()==='แก้จากหน้าต่างรวมแล้วใช้ต่อได้');
 await page.locator('[data-copy-prompt="extract"][data-input="lesson-prompt-extract"]').click();
 check('copy uses edited prompt',await page.evaluate(()=>navigator.clipboard.readText())==='แก้จากหน้าต่างรวมแล้วใช้ต่อได้');
 const [promptDownload]=await Promise.all([page.waitForEvent('download'),page.locator('[data-save-prompt="extract"][data-input="lesson-prompt-extract"]').click()]);
 check('saved prompt has edits',fs.readFileSync(await promptDownload.path(),'utf8').includes('แก้จากหน้าต่างรวมแล้วใช้ต่อได้'));
 await page.locator('[data-check="sauce-0"]').check();await page.locator('[data-complete="sauce"]').click();await page.reload();
 check('completed lesson persists',await page.locator('#progress-count').innerText()==='1 / 7');await route('#learn/sauce');check('checklist persists',await page.locator('[data-check="sauce-0"]').isChecked());
 const resourceNames=await page.evaluate(()=>Object.keys(window.DENT_RESOURCES));check('15 embedded resources',resourceNames.length===15);
 for(const file of resourceNames){const r=await page.request.get(base+'resources/'+file);check('resource '+file,r.status()===200&&(await r.body()).length>20);}
 await page.locator('.sidebar [data-action="resources"]').click();await page.locator('#dialog-body [data-resource="answer-key.md"]').click();check('resource preview reads offline text',(await page.locator('.resource-preview').innerText()).includes('69,900'));await page.locator('#dialog-close').click();
 for(const viewport of [{width:1366,height:768},{width:1280,height:720}]){
  await page.setViewportSize(viewport);
  let tooTall=[];for(let i=1;i<=20;i++){await route('#present/'+i);const b=await page.locator('.slide-navigation').boundingBox();if(b.y+b.height>viewport.height)tooTall.push({i,bottom:Math.round(b.y+b.height)});check(`slide ${i} @${viewport.width} no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  check(`all slides and navigation fit ${viewport.width}×${viewport.height}: ${JSON.stringify(tooTall)}`,tooTall.length===0);
 }
 await route('#present/12');await page.screenshot({path:path.join(out,'slide-desktop.png'),fullPage:true});
 await page.locator('#main').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('#slide-select')?.value==='13');check('keyboard next slide',await page.locator('#slide-select').inputValue()==='13');
 await page.locator('#speaker-notes summary').click();await page.locator('#timer-duration').selectOption('15');check('activity time selection',await page.locator('.timer-readout').innerText()==='15:00');await page.locator('[data-action="timer"]').click();await page.waitForFunction(()=>document.querySelector('.timer-readout').textContent==='14:59');await page.locator('[data-action="timer"]').click();await page.locator('[data-action="timer-reset"]').click();check('timer pause/reset',await page.locator('.timer-readout').innerText()==='15:00');
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));check('print includes all slides',await page.locator('#print-surface .slide').count()===20);
 for(const width of [390,320]){await page.setViewportSize({width,height:844});for(const id of modules){await route('#learn/'+id);check('mobile '+width+' '+id,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}await route('#present/18');check('mobile slide '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await route('#learn/start');await page.screenshot({path:path.join(out,'course-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await route('#learn/start');await page.screenshot({path:path.join(out,'course-desktop.png'),fullPage:true});
 const [kit]=await Promise.all([page.waitForEvent('download'),page.locator('.start-intro a[download]').click()]);check('kit download filename',kit.suggestedFilename()==='the-dent-course-kit.zip');const zip=await kit.path();check('kit nonempty',fs.statSync(zip).size>20000);
 execFileSync('python3',['-m','zipfile','-e',zip,out]);
 const offline=await context.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.goto(pathToFileURL(path.join(out,'the-dent-course/index.html')).href+'#learn/sauce');await offline.locator('h1').waitFor();check('offline lessons work',await offline.locator('#lesson-nav a').count()===7);await offline.locator('.sidebar [data-action="resources"]').click();check('offline removes unavailable zip link',await offline.locator('#dialog-body a[href*=".zip"]').count()===0);await offline.locator('#dialog-body [data-resource="mini-prd-example.md"]').click();check('offline preview works',(await offline.locator('.resource-preview').innerText()).length>100);await offline.close();
 await page.goto(base+'daily-brief.html');await page.locator('#stats .number').first().waitFor();check('normal metrics',JSON.stringify(await page.locator('#stats .number').allTextContents())===JSON.stringify(['98ครั้ง','44นัด','2งาน','98,000บาท','28,100บาท','69,900บาท']));
 await page.locator('#missingButton').click();check('missing data warns',(await page.locator('#notice').innerText()).includes('3 จุด'));check('missing cash is not fabricated',!(await page.locator('#stats').innerText()).includes('69,900'));
 await page.locator('#fileInput').setInputFiles({name:'wrong.csv',mimeType:'text/csv',buffer:Buffer.from('date,note\n2026-09-01,no')});await page.waitForFunction(()=>document.querySelector('#notice').classList.contains('error'));check('invalid CSV hides stale totals',!(await page.locator('#stats').isVisible()));
 const normal=await (await page.request.get(base+'resources/daily-normal.csv')).body();await page.locator('#fileInput').setInputFiles({name:'uploaded-normal.csv',mimeType:'text/csv',buffer:normal});await page.waitForFunction(()=>document.querySelector('#sourceName').textContent.includes('uploaded-normal'));check('uploaded CSV restores summary',(await page.locator('#stats').innerText()).includes('69,900'));
 await page.setViewportSize({width:390,height:844});check('daily brief mobile no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'daily-mobile.png'),fullPage:true});
 check('no JavaScript runtime errors',errors.length===0);
 console.log(JSON.stringify({checks,screenshots:out,errors}));
}finally{await browser.close();}
