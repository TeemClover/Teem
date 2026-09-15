/** Notebook image scheduling in a real browser. Auth/cache integration is tested separately. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const {chromium}=await import(process.env.FRONTDOOR_PLAYWRIGHT?pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href:'playwright');
const output=process.env.CLASSROOM_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'notebook-images-'));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
  try{
    let filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    const relative=path.relative(root,filename);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.')))throw Error('Invalid path');
    if((await stat(filename)).isDirectory())filename=path.join(filename,'index.html');
    // Give the upcoming images a measurable request window during the real effect.
    if(/\/nb-0[34]\.(webp|jpg)$/.test(filename))await new Promise(resolve=>setTimeout(resolve,180));
    res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream'});
    res.end(await readFile(filename));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={scope:'Local notebook scheduling; game progress fixture only, no auth/cache claim',base,cases:[]};

try{
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,serviceWorkers:'block'});
    // Isolate optional analytics/video dependencies. This test does not measure browser caching.
    await context.route('https://**/*',route=>route.fulfill({status:204}));
    await context.addInitScript(()=>{
      localStorage.setItem('mc_dungeon_state_v2',JSON.stringify({v:2,voice:true}));
      window.__notebookProof={revealedAt:null,clickedAt:null};
      document.addEventListener('DOMContentLoaded',()=>{
        document.getElementById('restoreBtn').addEventListener('click',()=>{window.__notebookProof.clickedAt=performance.now();},true);
        new MutationObserver(()=>{
          if(!document.getElementById('restoredTail').hidden&&window.__notebookProof.revealedAt===null)window.__notebookProof.revealedAt=performance.now();
        }).observe(document.getElementById('restoredTail'),{attributes:true,attributeFilter:['hidden']});
      });
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/classroom/awaken/notebook/?from=dungeon',{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('.pages img').complete&&document.querySelector('.pages img').naturalWidth>0);
    const initial=await page.evaluate(()=>({
      first:{loading:document.querySelector('.pages img').loading,priority:document.querySelector('.pages img').fetchPriority,src:document.querySelector('.pages img').currentSrc},
      requests:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/notebook/img/')).map(entry=>({path:new URL(entry.name).pathname,at:entry.startTime})),
      tailHidden:document.getElementById('restoredTail').hidden,
      sources:[...document.querySelectorAll('picture')].map(picture=>({source:picture.querySelector('source')?.getAttribute('srcset')||null,img:picture.querySelector('img')?.getAttribute('src')}))
    }));
    assert.notEqual(initial.first.loading,'lazy','First notebook image must not wait for lazy loading');
    assert.equal(initial.first.priority,'high');
    assert.equal(initial.tailHidden,true);
    assert.ok(!initial.requests.some(entry=>/nb-(0[3-9]|10)\./.test(entry.path)),'The hidden story must not eagerly download on entry');
    assert.equal(initial.sources[1].img,'img/nb-02.jpg','The original restored page 2 artwork must remain the JPG');
    await page.screenshot({path:path.join(output,`notebook-${width}-entry.png`)});
    await page.locator('#restoreBtn').click();
    await page.waitForFunction(()=>document.getElementById('restoreFx').classList.contains('on'));
    await page.waitForTimeout(500);
    const during=await page.evaluate(()=>({
      tailHidden:document.getElementById('restoredTail').hidden,
      images:[...document.querySelectorAll('#restoredPages img')].map(img=>({src:img.currentSrc,loading:img.loading,priority:img.fetchPriority,decoded:img.complete&&img.naturalWidth>0})),
      requests:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/notebook/img/')).map(entry=>({path:new URL(entry.name).pathname,at:entry.startTime}))
    }));
    await page.screenshot({path:path.join(output,`notebook-${width}-restore.png`)});
    await page.waitForFunction(()=>document.getElementById('restoreFx').hidden&&!document.getElementById('restoredTail').hidden);
    await page.waitForTimeout(550);
    const after=await page.evaluate(()=>({
      ...window.__notebookProof,
      requests:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/notebook/img/')).map(entry=>({path:new URL(entry.name).pathname,at:entry.startTime,end:entry.responseEnd})),
      restored:localStorage.getItem('mc_nb_restored'),
      meter:document.getElementById('pgCount').textContent,
      tailHidden:document.getElementById('restoredTail').hidden,
      firstRestoredDecoded:document.querySelector('#restoredPages img').complete&&document.querySelector('#restoredPages img').naturalWidth>0
    }));
    await page.screenshot({path:path.join(output,`notebook-${width}-restored.png`)});
    report.cases.push({width,initial,during,after,errors});
    await context.close();
    assert.equal(during.tailHidden,true,'The reveal must retain the existing cinematic timing');
    assert.equal(during.images[0].decoded,true,'Upcoming page 3 must already load during RESTORE');
    assert.equal(during.images[1].decoded,true,'Upcoming page 4 must already load during RESTORE');
    assert.equal(during.images[0].priority,'high','Prioritize the first page the reader will see');
    assert.equal(during.images[1].priority,'low','The second page must not compete with the first');
    assert.ok(during.images.slice(2).every(img=>img.loading==='lazy'),'Pages 5–10 remain lazy');
    assert.ok(!during.requests.some(entry=>/nb-(0[5-9]|10)\./.test(entry.path)),'RESTORE must warm only the next two pages');
    for(const index of ['03','04']){
      const requests=after.requests.filter(entry=>entry.path.endsWith(`/nb-${index}.webp`));
      assert.equal(requests.length,1,`Page ${index} must reuse its original picture request`);
      assert.ok(requests[0].at<after.revealedAt-1000,`Page ${index} starts well before the effect reveals it`);
      assert.ok(requests[0].end<after.revealedAt,`Page ${index} completes before reveal on the test connection`);
      assert.ok(!after.requests.some(entry=>entry.path.endsWith(`/nb-${index}.jpg`)),`Do not fetch an unnecessary JPG fallback for page ${index}`);
    }
    assert.equal(after.restored,'1');
    assert.equal(after.meter,'Pages readable: 10 / 10');
    assert.equal(after.firstRestoredDecoded,true);
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: first image immediate; only pages 3/4 warm during RESTORE; original sequence/artwork retained`);
  }
}finally{
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log('Notebook evidence: '+output);
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
