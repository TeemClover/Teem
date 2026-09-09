/** Actual local HTML/browser proof. No social posting, booking, or production API writes. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {RECIPES,KITCHEN_KEY} from '../../ako/kitchen/recipes.js';
import {recipePath,recipeShare} from '../../ako/kitchen/share.js';
const base=process.env.AKO_BASE_URL||'http://127.0.0.1:4185';
const output=process.env.AKO_SHARE_PROOF_DIR||await mkdtemp(tmpdir()+'/ako-sharing-');
await mkdir(output,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const proof={base,checks:[],errors:[],badResponses:[],apiRequests:[],screenshots:[]};
const pass=message=>{proof.checks.push(message);console.log('PASS '+message);};
async function surface(width,options={}){
 const context=await browser.newContext({viewport:{width,height:width<700?844:1000},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce',...options});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/api/')){proof.apiRequests.push(url.pathname);return route.abort();}return url.origin===base||/^(data|blob):/.test(url.protocol)?route.continue():route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',error=>proof.errors.push(error.message));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)proof.badResponses.push({url:r.url(),status:r.status()});});
 return{context,page};
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
async function shot(page,name){await page.screenshot({path:`${output}/${name}.png`,fullPage:false});proof.screenshots.push(name+'.png');}
try{
 for(const width of [390,1440]){
  const {context,page}=await surface(width);
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
  for(const recipe of RECIPES){
   const response=await page.goto(base+recipePath(recipe.id));assert.equal(response.status(),200);
   await page.locator('#steps input').first().waitFor();
   assert.equal(await page.locator('#recipe-title').innerText(),recipe.name);
   const html=await response.text();assert.ok(html.includes(recipeShare(recipe).url));
   assert.ok(html.includes('id="recipe-schema"'));assert.ok(html.includes(recipe.steps[0]));
   if(recipe.image)await page.waitForFunction(()=>document.querySelector('#dish-image').complete&&document.querySelector('#dish-image').naturalWidth>0);
   await noOverflow(page);
   if(['ginger-chicken-cabbage','cabbage-egg-pan','tofu-tomato-cool'].includes(recipe.id))await shot(page,`${recipe.id}-${width}`);
  }
  await page.goto(base+'/ako/kitchen/ginger-chicken-cabbage/?fdh=h-qa-sharing&from=compass');
  await page.locator('#steps input').first().waitFor();
  await page.locator('#copy-recipe').click();
  await page.waitForFunction(()=>document.querySelector('#share-status').textContent.length>0);
  assert.match(await page.locator('#share-status').innerText(),/คัดลอกลิงก์สูตรนี้แล้ว/);
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert.equal(copied,recipeShare(RECIPES.find(r=>r.id==='ginger-chicken-cabbage')).url);
  assert.equal(new URL(copied).search,'');
  const line=new URL(await page.locator('#share-line').getAttribute('href'));
  assert.equal(line.origin,'https://line.me');assert.ok(line.searchParams.get('text').includes(copied));
  assert.doesNotMatch(line.searchParams.get('text'),/fdh|from=compass/);
  await page.locator('#recipe-browse summary').click();
  await page.locator('#recipe-search').fill('ไข่');
  const expected=RECIPES.filter(r=>[r.name,r.short,...r.ingredients.map(i=>i.name)].join(' ').includes('ไข่'));
  assert.equal(await page.locator('#recipe-list a').count(),expected.length);
  await page.locator('#recipe-search').fill('ไม่มีวัตถุดิบนี้แน่นอน');
  assert.equal(await page.locator('#recipe-list a').count(),0);assert.equal(await page.locator('#empty-library').isVisible(),true);
  await page.locator('#recipe-search').fill('');
  await page.locator('[data-recipe="cucumber-sesame-vinegar"]').first().click();
  assert.equal(new URL(page.url()).pathname,recipePath('cucumber-sesame-vinegar'));
  await page.goBack();
  assert.match(await page.locator('#recipe-title').innerText(),/ไก่ขิง/);
  await page.goForward();
  assert.match(await page.locator('#recipe-title').innerText(),/แตงกวา/);
  // A pathless library entry can restore any saved recipe, not just the default.
  await page.goto(base+'/ako/kitchen/');await page.locator('#steps input').first().waitFor();
  const restored=await page.locator('#recipe-title').innerText();
  await page.locator('#recipe-browse summary').click();
  await page.locator('[data-recipe="ginger-chicken-cabbage"]').first().click();
  await page.goBack();assert.equal(await page.locator('#recipe-title').innerText(),restored);
  await page.goto(base+'/ako/kitchen/#egg-crunch');await page.locator('#steps input').first().waitFor();
  assert.match(await page.locator('#recipe-title').innerText(),/ไข่ต้ม/);
  await page.locator('[data-portions="4"]').click();
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.share-tools').isVisible(),false);
  assert.equal(await page.locator('#ingredients').isVisible(),true);assert.equal(await page.locator('#steps').isVisible(),true);
  assert.equal(await page.locator('#portion-summary').innerText(),'ปริมาณสำหรับ 4 คน');
  assert.equal(await page.locator('#portion-summary').isVisible(),true);
  await page.emulateMedia({media:'screen'});
  pass(`${width}px:15 direct pages/images/static previews, clean clipboard+LINE payload, ingredient search, empty results, back/forward, legacy hash, printable recipe`);
  await context.close();
 }
 const plain=await surface(390,{javaScriptEnabled:false});
 for(const recipe of RECIPES){
  await plain.page.goto(base+recipePath(recipe.id));
  assert.equal(await plain.page.locator('#recipe-title').innerText(),recipe.name);
  assert.equal(await plain.page.locator('#ingredients li').count(),recipe.ingredients.length);
  assert.equal(await plain.page.locator('#steps li').count(),recipe.steps.length);
  await noOverflow(plain.page);
 }
 await plain.context.close();pass('All15 recipes contain full readable ingredients and steps without JavaScript');
 const blocked=await surface(390);
 await blocked.context.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError');}}});Object.defineProperty(navigator,'share',{value:undefined});});
 await blocked.page.goto(base+'/ako/kitchen/tofu-tomato-cool/');
 await blocked.page.locator('#share-recipe').click();
 await blocked.page.locator('#share-fallback').waitFor({state:'visible'});
 assert.equal(await blocked.page.locator('#share-fallback').isVisible(),true);
 assert.equal(await blocked.page.locator('#share-link').inputValue(),'https://www.myclover.com/ako/kitchen/tofu-tomato-cool/');
 pass('Unavailable native share/clipboard exposes a selectable clean link; no false success');
 await blocked.context.close();
 assert.deepEqual(proof.errors,[]);assert.deepEqual(proof.badResponses,[]);assert.deepEqual(proof.apiRequests,[]);
}catch(error){proof.failure=error.stack;throw error;}
finally{await writeFile(output+'/proof.json',JSON.stringify(proof,null,2));await browser.close();console.log('Proof: '+output);}
