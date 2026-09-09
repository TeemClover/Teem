// Browser request-contract fixture. Every API is intercepted; no live book is created.
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=fileURLToPath(new URL('../../teambook/',import.meta.url)).replace(/\/$/,'');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const browser=await chromium.launch({executablePath:process.env.FRONTDOOR_CHROME,headless:true});
const results=[];let profileState;
async function surface(saved){const ctx=await browser.newContext({viewport:{width:390,height:844},...(saved?{storageState:saved}:{})});const data={errors:[],posts:[]};await ctx.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='teambook.audit'){await route.abort();return;}if(url.pathname.startsWith('/api/')){if(route.request().method()==='POST')data.posts.push({path:url.pathname,body:route.request().postDataJSON()});await route.fulfill({status:503,contentType:'application/json',body:'{"error":"AUDIT_NO_SUBMISSION"}'});return;}try{const file=path.resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));if(!file.startsWith(root+'/'))throw Error('path');await route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'not found'});}});const page=await ctx.newPage();page.on('pageerror',e=>data.errors.push(e.message));return{ctx,page,data};}
async function settle(page){await page.locator('#activityPick').waitFor({state:'attached'});await page.waitForTimeout(500);}
async function summary(page){return page.evaluate(()=>({url:location.href,title:document.querySelector('.wizard-heading .title')?.textContent,count:document.querySelector('#wizardCount')?.textContent,summary:[...document.querySelectorAll('.wizard-note')].map(n=>n.textContent),selectedDuration:document.querySelector('#durationPick [aria-checked="true"]')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth}));}
try{
{
const{ctx,page,data}=await surface();await page.goto('http://teambook.audit/?open=1&entry=compass');await page.locator('#tb14Alias').fill('Audit Compass');await page.locator('#tb14SaveName').click();await page.waitForURL('**/new/?entry=compass');await settle(page);profileState=await ctx.storageState();await page.locator('#pname').fill('สมุดตรวจทางเข้า');const ui=await summary(page);await page.locator('#go').click();await page.waitForTimeout(100);results.push({case:'new-compass',ui,...data});await ctx.close();
}
for(const item of [{name:'existing-compass',href:'/?open=1&entry=compass'},{name:'default',href:'/new/'},{name:'template',href:'/new/?entry=compass&template=xircle_xvisor'}]){
const{ctx,page,data}=await surface(profileState);await page.goto('http://teambook.audit'+item.href);await settle(page);const initial=await summary(page);if(item.name==='existing-compass')await page.locator('#pname').fill('สมุดตรวจทางเข้า');else{for(let step=0;step<7;step++){if(await page.locator('#pname').isVisible())await page.locator('#pname').fill('สมุดตรวจทางเข้า');if(await page.locator('#go').isVisible())break;await page.locator('#wizardNext').click();}}const ui=await summary(page);await page.locator('#go').click();await page.waitForTimeout(100);results.push({case:item.name,initial,ui,...data});await ctx.close();
}
for(const existing of [false,true])for(const compass of [false,true]){
const{ctx,page,data}=await surface(existing?profileState:null);await page.goto('http://teambook.audit/?c=12345'+(compass?'&entry=compass':''));if(!existing){await page.locator('#enterRoom').click();await page.locator('#tb14Alias').fill('Audit Invite');await page.locator('#tb14SaveName').click();}else if(await page.locator('#enterRoom').isVisible())await page.locator('#enterRoom').click();await page.waitForURL('**/join/?c=12345');results.push({case:`invite-${existing?'existing':'new'}-${compass?'compass':'default'}`,url:page.url(),...data});await ctx.close();
}
{
const{ctx,page,data}=await surface(profileState);await page.goto('http://teambook.audit/new/?entry=compass');await settle(page);await page.evaluate(()=>{localStorage.setItem('teambook_books_v1',JSON.stringify([{code:'12345',state:'ACTIVE',ownerId:'audit-owner',members:[],log:[]}]));localStorage.setItem('teambook_book_tokens_v1',JSON.stringify({'12345':{token:'audit-token',userId:'audit-owner'}}));});await page.reload();await settle(page);await page.locator('#pname').fill('ชื่อเมื่อเต็ม');await page.waitForTimeout(100);results.push({case:'capacity-full',disabled:await page.locator('#go').isDisabled(),warning:await page.locator('#capacityWarning').textContent(),warningVisible:await page.locator('#capacityWarning').isVisible(),backHref:await page.getByRole('link',{name:'กลับไปสมุดที่มีอยู่'}).getAttribute('href'),...data});await ctx.close();
}
{
const{ctx,page,data}=await surface();await page.goto('http://teambook.audit/?account=1&open=1&entry=compass');await page.locator('#tb14Alias').fill('Audit Account');const beforeClick=page.url();await page.locator('#tb14SaveName').click();await page.waitForURL('**/new/**');await settle(page);results.push({case:'account-query-new',beforeClick,ui:await summary(page),...data});await ctx.close();
}
for(const result of results){
  assert.deepEqual(result.errors,[],result.case);
  if(result.ui)assert.equal(result.ui.overflow,false,result.case);
  if(result.case==='new-compass'||result.case==='existing-compass'){
    const payload=result.posts.find(p=>p.path==='/api/teambook-v12')?.body;
    assert.equal(payload?.durationDays,7,result.case);assert.equal(payload.visibility,'private');assert.equal(payload.verificationMode,'trust');assert.equal(result.ui.count,'1 / 1');
  }
  if(result.case==='account-query-new')assert.ok(result.ui.url.includes('entry=compass'));
  if(result.case==='capacity-full'){assert.equal(result.disabled,true);assert.equal(result.warningVisible,true);assert.equal(result.backHref,'/');}
  console.log('PASS '+result.case);
}
}finally{await browser.close();await writeFile(process.env.FRONTDOOR_DESTINATION_PROOF||'/tmp/compass-teambook-entry-proof.json',JSON.stringify(results,null,2));}
