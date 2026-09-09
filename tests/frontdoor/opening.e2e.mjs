/** Approved under-paper study: real browser → Pages V2 → local D1 → protected Stat. */
import assert from 'node:assert/strict';
import { mkdir,mkdtemp,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startPreview } from '../../core7/tests/frontdoor-preview.mjs';
const moduleName=process.env.FRONTDOOR_PLAYWRIGHT||'playwright';
const {chromium}=await import(path.isAbsolute(moduleName)?pathToFileURL(moduleName).href:moduleName);
const output=process.env.FRONTDOOR_PROOF_DIR||await mkdtemp(path.join(tmpdir(),'underpaper-proof-'));
await mkdir(output,{recursive:true});
const server=await startPreview({port:0}),{base,mf}=server,db=await mf.getD1Database('DB');
const auth={Authorization:`Basic ${Buffer.from('teem:local-fixture-only').toString('base64')}`};
const report={checks:[],screenshots:[],errors:[],requests:[],responsive:[],timing:{}};
let browser;
const check=name=>{report.checks.push(name);console.log(`PASS ${name}`);};
async function capture(page,name){await page.screenshot({path:path.join(output,`${name}.png`)});report.screenshots.push(`${name}.png`);}
async function settled(page){await page.waitForFunction(()=>document.body.dataset.phase==='alive');await page.waitForTimeout(250);}
async function context(options={}){
 const ctx=await browser.newContext({viewport:{width:1440,height:900},...options});
 await ctx.route('**/*',route=>{
  const u=route.request().url();if(u.startsWith(base)||u.startsWith('data:')||u.startsWith('blob:')||/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u))return route.continue();return route.abort();
 });
 ctx.on('page',p=>{p.on('pageerror',e=>report.errors.push(e.message));p.on('request',req=>report.requests.push(req.url()));});return ctx;
}
async function sample(page){return page.evaluate(()=>{
 const base=document.querySelector('#underpaper'),c=document.querySelector('#underpaper-raster')||base;
 const gl=c===base?c.getContext('webgl'):null;
 const pixels=new Uint8Array(c.width*c.height*4);
 if(gl)gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);else pixels.set(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
 const grid=[];let checksum=0;
 // WebGL readback starts at the bottom; compare both renderers in screen order.
 for(let y=0;y<c.height;y+=Math.max(1,Math.floor(c.height/32)))for(let x=0;x<c.width;x+=Math.max(1,Math.floor(c.width/24))){const i=((gl?c.height-1-y:y)*c.width+x)*4;grid.push(pixels[i+3]>200?1:0);checksum+=(pixels[i]+pixels[i+1]*3+pixels[i+2]*7)*(1+(i%17));}
 return {grid,checksum,count:grid.reduce((a,b)=>a+b,0),reveals:Number(base.dataset.reveals||0),renderer:gl?'webgl':'raster'};
});}
async function events(){return(await db.prepare('SELECT * FROM fd_v2_events ORDER BY occurred_at,rowid').all()).results;}
// Deterministic lifecycle injection: automation keeps tabs visible on some hosts.
// This exercises real listeners/rendering; native iPhone tab lifecycle is separate QA.
async function visibility(page,hidden){await page.evaluate(value=>{
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>value});
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>value?'hidden':'visible'});
 document.dispatchEvent(new Event('visibilitychange'));
},hidden);}
async function paperPixels(page){return page.locator('#paper-crossing').evaluate(c=>{
 const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=0,count=0;
 for(let i=0;i<data.length;i+=4){if(data[i+3]>100)count++;if(i%16===0)hash=(hash*31+data[i]+data[i+1]*3+data[i+2]*7+data[i+3]*11)>>>0;}
 return {hash,count,width:c.width,height:c.height,revision:Number(c.dataset.revision||0),phase:c.dataset.phase};
});}
async function stablePaperReadback(ctx){await ctx.addInitScript(()=>{
 // Repeated diagnostic readbacks otherwise make Chrome switch rasterization
 // paths mid-test, including the cached source-paper canvas. Keep both source
 // and destination 2D contexts stable for exact-pixel assertions. Production
 // retains its ordinary accelerated contexts; this is a standard readback hint.
 const get=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,type==='2d'?{...options,willReadFrequently:true}:options);};
});}
async function pullPaper(page,ctx,points,end='touchEnd'){
 const session=await ctx.newCDPSession(page),grip=await page.locator('#paper-grip').boundingBox(),paper=await page.locator('#film-space').boundingBox();
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:grip.x+grip.width*.5,y:grip.y+grip.height*.5}]});
 for(const [x,y]of points){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:paper.x+paper.width*x,y:paper.y+paper.height*y}]});await page.waitForTimeout(35);}
 await session.send('Input.dispatchTouchEvent',{type:end,touchPoints:[]});await session.detach();
}
try{
 browser=await chromium.launch({headless:true,...(process.env.FRONTDOOR_CHROME?{executablePath:process.env.FRONTDOOR_CHROME}:{})});
 const ctx=await context(),page=await ctx.newPage();
 const legacy={'c7:install_id':'underpaper-proof-installation','mc:frontdoor:v2:active_journey':'j-approved','mc:frontdoor:v2:journey:j-approved':'{"checkpoint":{"doorId":"dungeon"}}','mc:frontdoor:compass-study:v1:active_journey':'j-old-leaf-study',mc_nb_seen_ever_v1:'1',mc_read:'ep1-everyone-gets-to-play'};
 await ctx.addInitScript(values=>{if(location.protocol!=='http:')return;for(const[k,v]of Object.entries(values))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);},legacy);
 await page.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#underpaper').dataset.ready==='true');
 await capture(page,'opening-desktop');
 await page.evaluate(()=>{
  window.studyNodes=['.world','video','#film-space','#instrument','#underpaper'].map(s=>[s,document.querySelector(s)]);
  document.querySelector('#pickup').addEventListener('click',()=>{window.touchBegan=performance.now();requestAnimationFrame(()=>window.studyResponse=performance.now()-window.touchBegan);},{once:true});
  new MutationObserver(()=>{if(document.body.dataset.phase==='alive'&&!window.discoveryMeasuredMs)window.discoveryMeasuredMs=performance.now()-window.touchBegan;}).observe(document.body,{attributes:true,attributeFilter:['data-phase']});
 });
 await page.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();
 await capture(page,'pickup-first-frame');await settled(page);await capture(page,'discovery-desktop');
 report.timing.firstTouchFrameMs=await page.evaluate(()=>window.studyResponse);
 report.timing.discoveryMs=await page.evaluate(()=>window.discoveryMeasuredMs);
 assert.ok(report.timing.firstTouchFrameMs<200);assert.ok(report.timing.discoveryMs<5000);
 assert.equal(await page.evaluate(()=>window.studyNodes.every(([s,n])=>n===document.querySelector(s)&&n.isConnected)),true);
 assert.equal(await page.locator('input,textarea,select,[data-answer],#open-door,#portal').count(),0);
 let rows=await events();assert.equal(rows.filter(r=>r.event_name==='LUCKY_RETURN').length,1,'pickup itself must GIVE the visible discovery');
 check('same world and object nodes; first pickup yields a painted discovery and value event without another answer');
 const before=await sample(page);assert.ok(before.count>40&&before.count<before.grid.length*.8);
 await page.waitForTimeout(550);const living=await sample(page);if(living.renderer==='webgl')assert.notEqual(living.checksum,before.checksum,'revealed water must actually move');
 await page.getByRole('slider').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowRight');await page.waitForTimeout(600);
 const explored=await sample(page);assert.ok(explored.count>before.count+10);assert.ok(before.grid.every((a,i)=>!a||explored.grid[i]),'old discovered ground must remain');
 await capture(page,'exploration-desktop');
 check('water is alive, keyboard reveals adjacent ground, and previously opened paper stays open');
 const stored=await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(legacy));assert.deepEqual(stored,legacy);
 await page.getByRole('button',{name:'วางคืน',exact:true}).click();await page.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click({force:true});
 const earlyBox=await page.getByRole('slider').boundingBox(),point={x:earlyBox.x+earlyBox.width*.5,y:earlyBox.y+earlyBox.height*.58};
 await page.mouse.move(point.x,point.y);await page.mouse.down();const early=Number(await page.getByRole('slider').getAttribute('aria-valuenow'));
 await page.waitForTimeout(450);await page.mouse.move(point.x+1,point.y+1);await page.waitForTimeout(40);
 assert.ok(Math.abs(Number(await page.getByRole('slider').getAttribute('aria-valuenow'))-early)<2);await page.mouse.up();await settled(page);
 assert.ok((await sample(page)).count>=explored.count);
 rows=await events();assert.equal(rows.filter(r=>r.event_name==='LUCKY_RETURN').length,1);assert.equal(rows.some(r=>['SAVE','REBUILD','DOOR_FOUND','DOOR_OPEN','DUNGEON_HANDOFF','REWARD_HORIZON'].includes(r.event_name)),false);
 check('early repeat touch stays stable, replay keeps the discovery, and approved saves/history remain unchanged');
 const interrupted=await context({viewport:{width:390,height:844}}),ip=await interrupted.newPage();
 await ip.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await ip.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();
 await ip.waitForFunction(()=>document.body.dataset.phase==='holding');await ip.waitForTimeout(650);const partial=await sample(ip);assert.ok(partial.count>10);
 await ip.getByRole('button',{name:'วางคืน',exact:true}).click();await ip.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click({force:true});await ip.waitForTimeout(80);
 assert.ok((await sample(ip)).count>=partial.count,'unfinished discovery must not close on another pickup');await settled(ip);
 for(const [width,height]of [[844,390],[640,360],[390,844]]){
  const b=await ip.getByRole('slider').boundingBox();await ip.mouse.move(b.x+b.width*.5,b.y+b.height*.58);await ip.mouse.down();
  assert.equal(await ip.evaluate(()=>document.body.classList.contains('interacting')),true);
  await ip.setViewportSize({width,height});await ip.waitForTimeout(450);
  assert.equal(await ip.evaluate(()=>document.body.classList.contains('interacting')),false);await ip.mouse.up();
  assert.equal(await ip.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
  const placed=await ip.getByRole('slider').boundingBox();assert.ok(placed.y>=0&&placed.y+placed.height<=height);
  await ip.getByRole('slider').focus();await ip.keyboard.press('ArrowLeft');await ip.waitForTimeout(150);
  if(width===844)await capture(ip,'discovery-landscape');
 }
 await interrupted.close();
 check('interrupted pickup preserves its partial reveal; rotation releases the hand and fits both landscape sizes');
 for(const [width,height]of [[1280,633],[390,844],[360,640],[320,568]]){
  const mobile=await context({viewport:{width,height},isMobile:width<700,hasTouch:width<700});const p=await mobile.newPage();await p.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});
  const btn=p.getByRole('button',{name:'หยิบเข็มทิศ',exact:true});await btn.waitFor();await p.waitForTimeout(300);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
  if(width===390)await capture(p,'opening-mobile');await btn.click();await settled(p);
  if(width===390)await capture(p,'discovery-mobile');
  const start=await sample(p);
  if(width<700){
   const session=await mobile.newCDPSession(p),b=await p.getByRole('slider').boundingBox();
   const x=b.x+b.width*.5,y=b.y+b.height*.58;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-width*.3,y:y+height*.22}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);await session.detach();
   const end=await sample(p);assert.ok(end.reveals>start.reveals);assert.ok(end.count>=start.count);
  }
  if(width===390)await capture(p,'exploration-mobile');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
  assert.deepEqual(await p.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)),[]);
  report.responsive.push({width,height,touch:width<700});await mobile.close();
 }
 check('desktop and three phone sizes: no overflow/broken assets, actual touch expands the discovery');
 const essential=await context({viewport:{width:390,height:844},reducedMotion:'reduce'}),ep=await essential.newPage();
 await ep.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await ep.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await settled(ep);await capture(ep,'reduced-motion-mobile');
 assert.equal(await ep.locator('video').getAttribute('src'),null);const still=await sample(ep);await ep.waitForTimeout(500);assert.equal((await sample(ep)).checksum,still.checksum);
 await ep.getByRole('slider').focus();await ep.keyboard.press('ArrowRight');await ep.keyboard.press('ArrowDown');await ep.keyboard.press('ArrowRight');await ep.waitForTimeout(250);assert.ok((await sample(ep)).count>still.count);await essential.close();
 check('reduced motion gives the same discovery immediately, with static water and working keyboard exploration');
 const blocked=await context({viewport:{width:390,height:844}});
 await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}});Object.defineProperty(window,'sessionStorage',{get(){throw Error('blocked')}});const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});
 await blocked.route('**/media/*.mp4*',route=>route.abort());const bp=await blocked.newPage();await bp.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await bp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await settled(bp);assert.equal((await sample(bp)).renderer,'raster');await bp.getByRole('slider').focus();await bp.keyboard.press('ArrowLeft');await capture(bp,'blocked-video-storage-webgl');await blocked.close();
 check('blocked video, unavailable storage and unavailable WebGL retain a usable raster discovery');
 const failure=await context();await failure.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('c7:install_id','underpaper-asset-failure');});
 await failure.route('**/frontdoor/art/underpaper-valley.webp',r=>r.abort());const fp=await failure.newPage();await fp.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await fp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await fp.getByRole('button',{name:'ลองเปิดภาพอีกครั้ง'}).waitFor();
 rows=await events();assert.equal(rows.some(r=>r.install_id==='underpaper-asset-failure'&&['LUCKY_RETURN','FRONTDOOR_REACTION_COMPLETE'].includes(r.event_name)),false);
 await failure.unroute('**/frontdoor/art/underpaper-valley.webp');await fp.getByRole('button',{name:'ลองเปิดภาพอีกครั้ง'}).click();await settled(fp);await failure.close();
 check('failed discovery image gives a retry, never a false value event; retry recovers the experience');
 const lifecycle=await context({viewport:{width:390,height:844}});
 await lifecycle.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('c7:install_id','underpaper-lifecycle-proof');});
 await lifecycle.route('**/frontdoor/art/paper-clean.webp',r=>r.abort());const lp=await lifecycle.newPage();
 await lp.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await lp.waitForFunction(()=>document.querySelector('#underpaper').dataset.ready==='true');
 await lp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await lp.getByRole('button',{name:'ลองเปิดภาพอีกครั้ง'}).waitFor();
 for(let i=0;i<2;i++){await visibility(lp,true);await visibility(lp,false);await lp.waitForTimeout(i===0?2600:200);}
 assert.equal(await lp.locator('body').getAttribute('data-phase'),'opening');
 rows=await events();assert.equal(rows.some(r=>r.install_id==='underpaper-lifecycle-proof'&&['LUCKY_RETURN','FRONTDOOR_REACTION_COMPLETE'].includes(r.event_name)),false);
 await lifecycle.unroute('**/frontdoor/art/paper-clean.webp');await lp.getByRole('button',{name:'ลองเปิดภาพอีกครั้ง'}).click();await settled(lp);
 const gestureBox=await lp.getByRole('slider').boundingBox();
 await lp.evaluate(()=>document.querySelector('#playfield').addEventListener('pointerdown',e=>{window.heldPointer=e.pointerId;},{once:true}));
 await lp.mouse.move(gestureBox.x+gestureBox.width*.5,gestureBox.y+gestureBox.height*.58);await lp.mouse.down();
 await visibility(lp,true);
 assert.equal(await lp.evaluate(()=>document.body.classList.contains('interacting')||document.querySelector('#playfield').hasPointerCapture(window.heldPointer)),false);
 const pausedPixels=await sample(lp);await lp.waitForTimeout(350);assert.equal((await sample(lp)).checksum,pausedPixels.checksum);await lp.mouse.up();
 // Actual WebGL loss while hidden must retain the explored mask after recovery.
 assert.equal(await lp.evaluate(()=>{const ext=document.querySelector('#underpaper').getContext('webgl').getExtension('WEBGL_lose_context');ext?.loseContext();return !!ext;}),true);
 await lp.locator('#underpaper-raster').waitFor({state:'attached'});await visibility(lp,false);await lp.waitForTimeout(350);
 const recovered=await sample(lp);assert.equal(recovered.renderer,'raster');
 const retained=pausedPixels.grid.reduce((sum,a,i)=>sum+(a&&recovered.grid[i]?1:0),0);assert.ok(retained>=pausedPixels.count*.98,'context loss must preserve already discovered ground');
 await lp.getByRole('slider').focus();await lp.keyboard.press('ArrowRight');await lp.keyboard.press('ArrowDown');await lp.keyboard.press('ArrowRight');await lp.waitForTimeout(200);
 assert.ok((await sample(lp)).reveals>recovered.reveals);await capture(lp,'context-loss-recovery-mobile');
 rows=await events();assert.equal(rows.filter(r=>r.install_id==='underpaper-lifecycle-proof'&&r.event_name==='LUCKY_RETURN').length,1);await lifecycle.close();
 check('visibility lifecycle: pending assets cannot report value; hiding releases capture and pauses; actual GL loss recovers retained ground');
 const lastFrame=await context({reducedMotion:'reduce'}),lastPage=await lastFrame.newPage();
 await lastPage.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await lastPage.waitForFunction(()=>document.querySelector('#underpaper').dataset.ready==='true');
 assert.equal(await lastPage.evaluate(()=>{
  const gl=document.querySelector('#underpaper').getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context'),draw=gl.drawArrays;
  if(!ext)return false;
  gl.drawArrays=function(...args){gl.drawArrays=draw;ext.loseContext();return draw.apply(gl,args);};
  new MutationObserver(()=>{
   if(document.body.dataset.phase!=='alive'||window.completionPaint!==undefined)return;
   const c=document.querySelector('#underpaper-raster');
   window.completionPaint=!!c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>200);
  }).observe(document.body,{attributes:true,attributeFilter:['data-phase']});return true;
 }),true);
 await lastPage.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await settled(lastPage);
 assert.equal(await lastPage.evaluate(()=>window.completionPaint),true,'lost final GL frame must be painted in raster before discovery acknowledgment');
 assert.equal((await sample(lastPage)).renderer,'raster');await lastFrame.close();
 check('actual GL loss on the completion draw cannot acknowledge a blank frame');
 const crossing=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),cp=await crossing.newPage();
 await stablePaperReadback(crossing);
 await crossing.addInitScript(()=>{if(location.protocol==='http:')localStorage.setItem('c7:install_id','paper-crossing-proof');});
 await cp.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await cp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).tap();await settled(cp);
 await cp.getByRole('slider').focus();await cp.keyboard.press('ArrowLeft');await cp.locator('#paper-grip').waitFor();await cp.waitForTimeout(150);
 await pullPaper(cp,crossing,[[.16,.42],[.15,.31]]);await cp.waitForTimeout(100);assert.equal((await paperPixels(cp)).revision,0,'vertical tug cannot invent a crossing');
 await pullPaper(cp,crossing,[[.3,.53],[.52,.48],[.8,.57]],'touchCancel');await cp.waitForTimeout(100);
 assert.equal((await paperPixels(cp)).revision,0);rows=await events();assert.equal(rows.some(r=>r.install_id==='paper-crossing-proof'&&r.event_name==='FRONTDOOR_FREE_ROAM'),false);
 await pullPaper(cp,crossing,[[.25,.55],[.4,.47],[.58,.48],[.8,.57]]);await cp.waitForFunction(()=>document.querySelector('#paper-crossing').dataset.phase==='complete');
 const firstPath=await paperPixels(cp);assert.equal(firstPath.phase,'complete');assert.equal(firstPath.revision,1);assert.ok(firstPath.count>700);
 await capture(cp,'paper-crossing-mobile');rows=await events();assert.equal(rows.filter(r=>r.install_id==='paper-crossing-proof'&&r.event_name==='FRONTDOOR_FREE_ROAM').length,1);
 await cp.getByRole('button',{name:'วางคืน',exact:true}).tap();await cp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).tap();await settled(cp);
 const replayedPath=await paperPixels(cp);if(replayedPath.hash!==firstPath.hash){console.log('Replay comparison',JSON.stringify({firstPath,replayedPath}));await capture(cp,'paper-replay-diagnostic');}
 assert.equal(replayedPath.hash,firstPath.hash,'putdown and pickup preserve the created paper path');
 await pullPaper(cp,crossing,[[.25,.66],[.42,.72],[.61,.67],[.81,.6]]);await cp.waitForFunction(()=>document.querySelector('#paper-crossing').dataset.phase==='complete');
 const secondPath=await paperPixels(cp);assert.equal(secondPath.revision,2);assert.notEqual(secondPath.hash,firstPath.hash,'another hand trace must produce a different actual crossing');
 const compassBefore=await cp.getByRole('slider').boundingBox();await cp.getByRole('slider').focus();for(let i=0;i<4;i++)await cp.keyboard.press('ArrowLeft');await cp.waitForTimeout(450);
 const compassAfter=await cp.getByRole('slider').boundingBox();assert.ok(Math.abs(compassBefore.x-compassAfter.x)>10,'normal Compass exploration must work after building');
 rows=await events();assert.equal(rows.filter(r=>r.install_id==='paper-crossing-proof'&&r.event_name==='FRONTDOOR_FREE_ROAM').length,2);
 assert.ok(rows.filter(r=>r.install_id==='paper-crossing-proof').every(r=>!r.intent_primary&&!r.door_id));
 report.paperCrossing={realTouch:true,canceledCount:0,paintedCrossings:2,differentTraces:true,replayPreserves:true};await crossing.close();
 check('paper crossing: real touch creates different paths, canceled/vertical tugs do not count, replay and ordinary Compass exploration work');
 const paperKeyboard=await context({viewport:{width:844,height:390},reducedMotion:'reduce'}),kp=await paperKeyboard.newPage();
 await stablePaperReadback(paperKeyboard);
 await kp.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});await kp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await settled(kp);await kp.getByRole('slider').focus();await kp.keyboard.press('ArrowLeft');
 await kp.locator('#paper-grip').focus();await kp.keyboard.press('Enter');for(let i=0;i<4;i++)await kp.keyboard.press('ArrowRight');await kp.keyboard.press('Enter');await kp.waitForFunction(()=>document.querySelector('#paper-crossing').dataset.phase==='complete');
 const keyboardPath=await paperPixels(kp);assert.equal(keyboardPath.revision,1);await kp.waitForTimeout(250);assert.equal((await paperPixels(kp)).hash,keyboardPath.hash);
 await kp.locator('#paper-grip').focus();await kp.keyboard.press('Enter');await kp.keyboard.press('ArrowRight');await visibility(kp,true);await visibility(kp,false);await kp.waitForTimeout(100);
 assert.equal((await paperPixels(kp)).hash,keyboardPath.hash,'hiding during redraw restores the completed path');
 await kp.locator('#paper-grip').focus();await kp.keyboard.press('Enter');await kp.keyboard.press('ArrowRight');await kp.setViewportSize({width:390,height:844});await kp.waitForTimeout(150);
 assert.equal((await paperPixels(kp)).phase,'complete');assert.equal((await paperPixels(kp)).revision,1);
 assert.equal(await kp.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
 await kp.setViewportSize({width:844,height:390});await kp.locator('#continue-discovery').click();await kp.locator('[data-answer="green"]').waitFor();await paperKeyboard.close();
 check('paper crossing: keyboard and reduced motion retain meaning; hidden/rotated redraw restores the prior path');
 const slow=await context({viewport:{width:390,height:844}});await slow.route('**/media/*.mp4*',async r=>{await new Promise(resolve=>setTimeout(resolve,2500));await r.continue().catch(()=>{});});const sp=await slow.newPage();await sp.goto(`${base}/frontdoor/`,{waitUntil:'domcontentloaded'});const began=Date.now();await sp.getByRole('button',{name:'หยิบเข็มทิศ',exact:true}).click();await settled(sp);assert.ok(Date.now()-began<6000);await slow.close();
 check('the discovery does not wait for delayed video');
 const range=await fetch(`${base}/media/home-opening-bg.mp4`,{headers:{Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);const bad=await fetch(`${base}/media/home-opening-bg.mp4`,{headers:{Range:'bytes=999999999-'}});assert.equal(bad.status,416);
 check('original film supports valid partial requests without deployment changes');
 const stat=await browser.newContext({viewport:{width:1280,height:900},httpCredentials:{username:'teem',password:'local-fixture-only'}}),statPage=await stat.newPage();await statPage.goto(`${base}/stat/frontdoor/`);await statPage.waitForTimeout(600);await capture(statPage,'stat-local');
 rows=await events();for(const event of ['FRONTDOOR_OPEN','FRONTDOOR_CHOICE','FRONTDOOR_REACTION_COMPLETE','LUCKY_RETURN'])assert.ok(rows.some(r=>r.event_name===event));assert.ok(rows.every(r=>r.env==='local'));
 report.aggregation=await(await fetch(`${base}/api/core7/frontdoor-stats?env=local`,{headers:auth})).json();report.persistedEvents=rows.length;report.productionRows=0;
 assert.equal(report.requests.some(u=>u.includes('/assets/track.js')),false);assert.equal(report.requests.some(u=>/\/(classroom|xircle|meet|forge)\//.test(new URL(u).pathname)),false);assert.deepEqual(report.errors,[]);
 check('real UI events validated/persisted/aggregated/rendered in local protected Stat; no prod/rooms/global tracker');
 report.verifiedAt=new Date().toISOString();await writeFile(path.join(output,'proof.json'),JSON.stringify(report,null,2));console.log(`Proof: ${output}`);await stat.close();await ctx.close();
}finally{await browser?.close();await server.close();}
