/** Chosen-only responsive art, real canvas crops and red food at three viewport shapes. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const base=process.env.FRONTDOOR_BASE||'http://127.0.0.1:4174';
const output=process.env.FRONTDOOR_PROOF_DIR||'/tmp/frontdoor-art-proof';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const report={checks:[],errors:[],screenshots:[]};
const colors=['red','green','blue','silver'];
try{
 for(const [width,height] of [[390,844],[768,1024],[1440,900]])for(const color of colors){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width===390?2:1,reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
  const page=await context.newPage(),requests=[];page.setDefaultTimeout(18000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.url().includes('/frontdoor/art/seed-')){requests.push({url:r.url(),status:r.status()});if(r.status()!==200)report.errors.push(`Asset ${r.status()}: ${r.url()}`);}});
  await page.goto(base+'/frontdoor/');await page.locator('#pickup').click();await page.locator('#continue-discovery').click();
  assert.equal(requests.length,0,'Branch photographs must not delay the first touch');
  await page.locator(`[data-answer=${color}]`).click();await page.locator('#cross-seed').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.body.classList.contains('path-assembling'));
  const asset=requests.find(r=>r.url.includes(`/seed-${color}-`));assert.ok(asset,`Missing ${color} photograph`);
  assert.equal(requests.some(r=>colors.filter(c=>c!==color).some(c=>r.url.includes(`/seed-${c}-`))),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const name=`${color}-bank-${width}.png`;await page.screenshot({path:`${output}/${name}`});report.screenshots.push(name);
  await page.locator('#cross-seed').click();await page.locator('#seed-reward > section').waitFor({state:'visible'});
  if(color==='red'){
   for(const [flavor,label] of [['bright','สด เปรี้ยว กรอบ'],['warm','หอม นุ่ม มีอะไรให้เคี้ยว']]){
    await page.getByRole('button',{name:label,exact:true}).click();
    const photo=page.locator('.seed-reward-recipe img');await photo.waitFor({state:'visible'});
    await photo.evaluate(i=>i.decode());const src=await photo.evaluate(i=>i.currentSrc);assert.ok(src.includes(`seed-food-${flavor}-v2`));
    const size=await photo.boundingBox();assert.ok(Math.abs(size.width/size.height-1.5)<.02,'Complete dish keeps its photographic proportions');
    const foodName=`red-${flavor}-${width}.png`;await page.screenshot({path:`${output}/${foodName}`});report.screenshots.push(foodName);
   }
  }
  if(width===390&&color==='green'){
   const upgraded=page.waitForResponse(r=>r.url().endsWith('/seed-green-pause-v2.webp'));
   await page.setViewportSize({width:1440,height:900});await upgraded;
   assert.ok(requests.some(r=>r.url.endsWith('/seed-green-pause-v2.webp')),'Resize upgrades the photograph');
   assert.equal(await page.locator('body').getAttribute('data-seed'),'green');
  }
  report.checks.push({color,width,height,asset:asset.url.replace(base,''),requests:requests.map(r=>r.url.replace(base,'')),overflow:false});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);
 console.log(`PASS ${report.checks.length} actual art journeys: mobile, tall tablet, desktop; two real food variants; selected-only loading; resize upgrade`);
}finally{await writeFile(`${output}/proof.json`,JSON.stringify(report,null,2));await browser.close();}
