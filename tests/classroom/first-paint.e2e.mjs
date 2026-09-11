/** Cold first paint: no native-layout flash, stable reveal, and readable no-JS fallback. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const {chromium}=await import(process.env.FRONTDOOR_PLAYWRIGHT?pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href:'playwright');
const lessons=(process.env.FIRST_PAINT_LESSONS||'free-ai,image-ai,clip-ai,notebooklm,prompts,first-web').split(',');
const widths=(process.env.FIRST_PAINT_WIDTHS||'390,1440').split(',').map(Number);
const output=process.env.CLASSROOM_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'classroom-first-paint-'));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.md':'text/markdown; charset=utf-8','.woff2':'font/woff2','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    let filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    const relative=path.relative(root,filename);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.')))throw Error('Invalid path');
    if((await stat(filename)).isDirectory())filename=path.join(filename,'index.html');
    res.writeHead(200,{'content-type':mime[path.extname(filename)]||'application/octet-stream','cache-control':'no-store'});
    res.end(await readFile(filename));
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={base,cpuSlowdown:4,coldContexts:true,frontDoorDelayMs:3000,checks:[],cases:[],errors:[]};
const pass=name=>{report.checks.push(name);console.log('PASS '+name);};

function installProbe(){
  const proof=window.__firstPaintProof={timeOrigin:performance.timeOrigin,frames:[],shifts:[],paints:[],stopped:false};
  function visible(element){
    if(!element)return false;
    const rect=element.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return false;
    for(let node=element;node;node=node.parentElement){
      const style=getComputedStyle(node);
      if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)===0)return false;
    }
    return true;
  }
  function rect(element){
    if(!element)return null;
    const box=element.getBoundingClientRect();
    return {x:box.x,y:box.y,width:box.width,height:box.height};
  }
  function sample(){
    if(proof.stopped)return;
    const main=document.querySelector('main')||document.querySelector('body > .wrap');
    const hero=main?.querySelector('.head,.hero');
    const launch=document.getElementById('cl-launch');
    const start=document.getElementById('cl-start');
    const nativeVisible=visible(hero);
    const launchVisible=visible(launch);
    const heroRect=rect(hero);
    proof.frames.push({at:performance.now(),nativeVisible,launchVisible,startVisible:visible(start),nativeInViewport:nativeVisible&&heroRect.y<innerHeight&&heroRect.y+heroRect.height>0,hero:heroRect,start:rect(start)});
  }
  function tick(){
    if(proof.stopped)return;
    // A task queued from rAF observes the layout after that frame's render callbacks,
    // avoiding a false flash when the enhancement itself runs in the same rAF.
    setTimeout(sample,0);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())proof.paints.push({name:entry.name,at:entry.startTime});}).observe({type:'paint',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)proof.shifts.push({at:entry.startTime,value:entry.value,sources:(entry.sources||[]).map(source=>({node:source.node?.id||source.node?.className||source.node?.nodeName||'',previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()}))});}).observe({type:'layout-shift',buffered:true});}catch{}
}

async function context(options={}){
  const ctx=await browser.newContext({viewport:{width:options.width||390,height:844},isMobile:(options.width||390)===390,hasTouch:(options.width||390)===390,reducedMotion:'reduce',javaScriptEnabled:options.javaScriptEnabled!==false,serviceWorkers:'block'});
  const delay=options.dependencyDelay;
  let releaseDependency;
  await ctx.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(delay&&url.origin===base&&url.pathname.startsWith('/assets/front-door/')){
      delay.paths.push(url.pathname);
      if(!releaseDependency){
        delay.startedAt=Date.now();
        releaseDependency=new Promise(resolve=>setTimeout(()=>{delay.releasedAt=Date.now();resolve();},3000));
      }
      await releaseDependency;
    }
    if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,reviews:[]}});
    return url.origin===base?route.continue():route.abort();
  });
  return ctx;
}

function drift(frames,key){
  const values=frames.map(frame=>frame[key]).filter(Boolean);
  return Object.fromEntries(['x','y','width','height'].map(property=>[property,values.length?Math.max(...values.map(value=>value[property]))-Math.min(...values.map(value=>value[property])):0]));
}

try{
  const renderSource=(await readFile(path.join(root,'assets/classroom-render.js'),'utf8')).trim();
  for(const slug of ['free-ai','image-ai','clip-ai','notebooklm','prompts','first-web']){
    const html=await readFile(path.join(root,'classroom',slug+'.html'),'utf8');
    const match=html.match(/<script[^>]*data-self-contained="classroom-render\.js"[^>]*>([\s\S]*?)<\/script>/);
    assert.equal(match?.[1].trim(),renderSource,slug+' inline first-paint guard must match its source asset');
  }
  pass('All six lessons embed the current first-paint guard without source drift');
  for(const slug of lessons){
    for(const width of widths){
      const dependencyDelay={paths:[],startedAt:null,releasedAt:null};
      const ctx=await context({width,dependencyDelay});
      await ctx.addInitScript(installProbe);
      const page=await ctx.newPage();page.setDefaultTimeout(10000);
      const caseErrors=[];page.on('pageerror',error=>caseErrors.push(error.message));
      const client=await ctx.newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate',{rate:4});
      await client.send('Network.enable');await client.send('Network.setCacheDisabled',{cacheDisabled:true});
      const captures=[];
      client.on('Page.screencastFrame',event=>{
        if(captures.length<10)captures.push({data:event.data,timestamp:event.metadata.timestamp});
        client.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
      });
      await client.send('Page.startScreencast',{format:'png',maxWidth:width,maxHeight:844,everyNthFrame:1});
      await page.goto(base+'/classroom/'+slug+'.html',{waitUntil:'domcontentloaded',timeout:15000});
      let revealTimedOut=false;
      try{await page.waitForFunction(()=>window.__firstPaintProof.frames.some(frame=>frame.launchVisible&&frame.startVisible),null,{timeout:8000});}catch{revealTimedOut=true;}
      const revealedShot=`${slug}-${width}-revealed.png`;
      await page.screenshot({path:path.join(output,revealedShot)});
      // Observe through the retained one-second startup passes, not only the reveal callback.
      await page.waitForTimeout(1800);
      const settledShot=`${slug}-${width}-settled.png`;
      await page.screenshot({path:path.join(output,settledShot)});
      const observed=await page.evaluate(()=>{window.__firstPaintProof.stopped=true;return window.__firstPaintProof;});
      await client.send('Page.stopScreencast');
      const frameFiles=[];
      for(const [index,capture] of captures.entries()){
        const filename=`${slug}-${width}-frame-${String(index).padStart(2,'0')}.png`;
        await writeFile(path.join(output,filename),Buffer.from(capture.data,'base64'));
        frameFiles.push({filename,timestamp:capture.timestamp});
      }
      const firstReveal=observed.frames.find(frame=>frame.launchVisible&&frame.startVisible);
      const exposedFrames=observed.frames.filter(frame=>frame.nativeInViewport&&!frame.launchVisible);
      const revealedFrames=firstReveal?observed.frames.filter(frame=>frame.at>=firstReveal.at&&frame.launchVisible&&frame.startVisible):[];
      const geometry={hero:drift(revealedFrames,'hero'),start:drift(revealedFrames,'start')};
      const cls=observed.shifts.reduce((sum,shift)=>sum+shift.value,0);
      const revealedBeforeDependencyRelease=Boolean(firstReveal&&dependencyDelay.releasedAt&&observed.timeOrigin+firstReveal.at<dependencyDelay.releasedAt);
      const caseReport={slug,width,dependencyDelay,revealedBeforeDependencyRelease,revealTimedOut,firstRevealAt:firstReveal?.at??null,exposedNativeFrames:exposedFrames.length,geometry,cls,errors:caseErrors,screenshots:[revealedShot,settledShot],frameScreenshots:frameFiles,...observed};
      delete caseReport.stopped;
      report.cases.push(caseReport);report.errors.push(...caseErrors.map(message=>({slug,width,message})));
      await ctx.close();
      console.log(JSON.stringify({slug,width,firstRevealAt:caseReport.firstRevealAt,exposedNativeFrames:exposedFrames.length,geometry,cls,revealedBeforeDependencyRelease,errors:caseErrors}));
      assert.equal(revealTimedOut,false,`${slug} ${width}: enhanced content must appear within 8 seconds, never remain blank`);
      assert.ok(firstReveal,`${slug} ${width}: missing visible enhanced content`);
      assert.ok(dependencyDelay.paths.length>0,`${slug} ${width}: the delayed ancillary dependency must actually be requested`);
      assert.equal(revealedBeforeDependencyRelease,true,`${slug} ${width}: final UI must reveal before delayed front-door dependencies are released`);
      assert.equal(exposedFrames.length,0,`${slug} ${width}: native layout appeared visibly before the enhanced launch`);
      assert.ok(revealedFrames.length>=2,`${slug} ${width}: insufficient revealed frames to check stability`);
      for(const [element,properties] of Object.entries(geometry))for(const [property,amount] of Object.entries(properties))assert.ok(amount<=2,`${slug} ${width}: ${element}.${property} jumped ${amount.toFixed(2)}px after reveal`);
      assert.deepEqual(caseErrors,[],`${slug} ${width}: page errors`);
      pass(`${slug} ${width}px cold CPU 4x: no native flash, stable header/CTA, reveals before delayed ancillary scripts`);
    }
    const ctx=await context({javaScriptEnabled:false});const page=await ctx.newPage();
    await page.goto(base+'/classroom/'+slug+'.html',{waitUntil:'load'});
    const heading=page.locator('h1').first();
    assert.equal(await heading.isVisible(),true,slug+' no-JS native heading must remain visible');
    assert.ok((await page.locator('body').innerText()).trim().length>300,slug+' no-JS page must retain meaningful lesson text');
    const nativeShot=`${slug}-no-js.png`;await page.screenshot({path:path.join(output,nativeShot)});
    await ctx.close();
    pass(`${slug}: JavaScript-disabled native lesson stays readable`);
  }
  {
    const ctx=await context({width:390});
    await ctx.addInitScript(installProbe);
    const page=await ctx.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/classroom/clip-ai.html',async route=>{
      const response=await route.fetch();
      const html=await response.text();
      const fixture=html.replace(/<script[^>]*data-self-contained="course-learning-journey\.js"[^>]*>[\s\S]*?<\/script>/,'');
      assert.notEqual(fixture,html,'Failure fixture must remove the enhancer while retaining the head guard');
      await route.fulfill({response,body:fixture});
    });
    await page.goto(base+'/classroom/clip-ai.html',{waitUntil:'domcontentloaded'});
    const parsedAt=await page.evaluate(()=>performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd);
    await page.waitForFunction(()=>window.__firstPaintProof.frames.some(frame=>frame.nativeInViewport),null,{timeout:8000});
    const firstNative=await page.evaluate(()=>window.__firstPaintProof.frames.find(frame=>frame.nativeInViewport));
    assert.equal(await page.locator('#cl-launch').count(),0,'Removed enhancement must not mount a launch panel');
    assert.ok(firstNative.at-parsedAt<=8000,'Missing enhancer must fail open within eight seconds of parsed HTML');
    assert.ok((await page.locator('body').innerText()).trim().length>300,'Failure fallback must expose useful native content');
    assert.equal(await page.locator('h1').first().isVisible(),true);
    assert.deepEqual(errors,[],'A missing enhancer must not cause other lesson modules to throw');
    const screenshot='clip-ai-missing-enhancer-fallback.png';
    await page.screenshot({path:path.join(output,screenshot)});
    report.fallback={slug:'clip-ai',nativeVisibleAt:firstNative.at,domParsedAt:parsedAt,recoveryAfterParseMs:firstNative.at-parsedAt,screenshot,errors};
    await ctx.close();
    pass('Missing enhancement fails open to readable native content without input or a perpetual blank page');
  }
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;throw error;}
finally{
  const proof=path.join(output,'first-paint-report.json');await writeFile(proof,JSON.stringify(report,null,2));
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,proof}));
}
