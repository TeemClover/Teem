/** 2.0 interaction proof. Isolated saves and intercepted API calls only. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeInitialState, reduceGame, serializeState, SAVE_KEY, EVENTS, STAGES } from '../../xvisor/quest/game-data.js';
import { getEconomyView } from '../../xvisor/quest/game-presentation.js';
const moduleName = process.env.XVISOR_PLAYWRIGHT || 'playwright';
const { chromium } = await import(path.isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName);
const base = process.env.XVISOR_BASE_URL || 'http://127.0.0.1:4186';
const output = process.env.XVISOR_PROOF_DIR || '/tmp/xvisor-v2-scenes';
await mkdir(output, { recursive: true });
const report = { checks: [], errors: [], screenshots: [], blockedRequests: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.XVISOR_CHROME ? { executablePath: process.env.XVISOR_CHROME } : {}) });
const check = name => { report.checks.push(name); console.log(`PASS ${name}`); };
function management(seed = 5) {
  const initial = makeInitialState({ seed });
  return { ...initial, month: 4, stage: STAGES.MANAGEMENT, phase: 'management', rank: 'xvisor', energy: 28,
    milestones: { ...initial.milestones, certified: true },
    encounters: { ...initial.encounters, months: [] },
    skills: Object.fromEntries(['people','knowledge','care','leadership'].map(id => [id,{xp:25}])),
    liveProgress: { contentSessions: 2, totalLives: 0, lastMonth: null },
    prospects: ['ปริม','เพชร','นัท','ออม','เจมส์'].map((name,i) => ({ id:`person-${i}`,name,journey:'baseline',consent:true,measured:true,fitProducts:['gus'],trust:76,readiness:82,adherence:40,followups:0,appearance:{skin:'#dfaa83',hair:'#263844',shirt:['#d98c73','#74aea1','#829cb5'][i%3],hairStyle:i%2?'short':'long'} })),
    selectedPersonId: 'person-0' };
}
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
async function load(page,state) {
  await page.goto(base+'/xvisor/quest/');
  await page.evaluate(({key,value}) => {
    localStorage.clear(); localStorage.setItem(key,value);
    localStorage.setItem('mc_xvisor_audio_1',JSON.stringify({muted:true,musicEnabled:false,sfxEnabled:false}));
  },{key:SAVE_KEY,value:serializeState(state)});
  await page.reload();
  await page.locator('body[data-game-boot="ready"]').waitFor({state:'attached'});
  await page.waitForFunction(() => {
    const canvas=document.querySelector('#worldCanvas');
    return canvas?.getContext('2d').getImageData(canvas.width/2,canvas.height/2,1,1).data[3]===255;
  });
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('neighborhood-scenes-v2.png'))),false,'illustrated rooms do not request pixel backgrounds');
}
async function capture(page,name,scene = false) {
  const file = `${name}.png`;
  if(scene) await page.locator('#worldFrame').screenshot({path:path.join(output,file)});
  else await page.screenshot({path:path.join(output,file),fullPage:true});
  report.screenshots.push(file);
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1),'page fits viewport');
  const leaks = await page.evaluate(() => [...document.querySelectorAll('.story-card,.story-choices,.routine-choices,.action-dock,.live-result')].filter(el => {
    const r=el.getBoundingClientRect(); return r.width && (r.left< -1 || r.right>innerWidth+1 || el.scrollWidth>el.clientWidth+2);
  }).map(el=>el.className));
  assert.deepEqual(leaks,[],'story and actions fit viewport without clipped content');
}
try {
  for(const width of [1440,390,320]) {
    const context = await browser.newContext({viewport:{width,height:width>1000?1000:844}, serviceWorkers:'block'});
    await context.route('**/api/**',route => { report.blockedRequests.push(route.request().url()); return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}); });
    const page = await context.newPage();
    page.on('pageerror',err=>report.errors.push(`${width}: ${err.message}`));
    try {
      const state = management();
      await load(page,state);
      await page.locator('#actionBar [data-event="RUN_LIVE"]').click();
      await page.locator('body[data-stage="live_running"]').waitFor({state:'attached'});
      assert.match(await page.locator('#goalTitle').textContent(),/ไลฟ์คุยแฟ้ม X/);
      assert.equal((await saved(page)).customers.length,0,'no sales before the scene completes');
      assert.equal((await saved(page)).energy,28,'spend only on completion');
      if(width===1440) await capture(page,'live-studio-running',true);
      await page.locator('body[data-stage="management"]').waitFor({state:'attached'});
      const completed = await saved(page);
      assert.equal(completed.liveReport.sales,3);
      assert.equal(completed.energy,26);
      assert.equal(completed.liveHistory.length,1);
      assert.equal(await page.locator('dialog[open]').count(),0,'Live outcome does not cover the scene with an automatic receipt dialog');
      assert.match(await page.locator('.live-result').textContent(),/คุย 3 คน · เริ่มแผน 3 คน/);
      const expectedIncome=getEconomyView(completed).projectedIncome;
      assert.ok(expectedIncome>0);
      await page.locator('.live-result summary').click();
      assert.equal(await page.locator('[data-live-receipt]').count(),3);
      await page.locator('[data-live-receipt="1"]').click();
      assert.match(await page.locator('#dialogReceipt').textContent(),/12,480/);
      await page.locator('[data-dialog-action="close"]').click();
      await noOverflow(page);
      await capture(page,`live-result-${width}`);
      await page.reload();
      await page.locator('body[data-game-boot="ready"]').waitFor({state:'attached'});
      assert.equal((await saved(page)).liveHistory.length,1,'reload cannot duplicate transactions');
      assert.equal((await saved(page)).economy.personalXV,completed.economy.personalXV);
      check(`${width}px: LIVE scene → 3 actual customer decisions → individual receipts → stable reload, with no overflow`);

      const contact = management();
      contact.prospects = [{...contact.prospects[0],journey:'new',consent:false,measured:false}];
      contact.skills = Object.fromEntries(['people','knowledge','care','leadership'].map(id=>[id,{xp:0}]));
      contact.liveProgress.contentSessions=0;
      await load(page,contact);
      if(width<600) await page.locator('[data-choice-help]').click();
      await page.locator('#actionBar [data-event="CONTACT_PROSPECT"]').scrollIntoViewIfNeeded();
      if(width<600) await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await page.locator('#actionBar [data-event="CONTACT_PROSPECT"]').click();
      assert.equal((await saved(page)).prospects[0].journey,'scheduled');
      if(width<600) {
        await page.locator('.action-peek:not([hidden])').waitFor();
        assert.equal(await page.locator('.action-peek').getAttribute('data-event'),'CONTACT_PROSPECT');
        await page.screenshot({path:path.join(output,`action-peek-${width}.png`)});
        report.screenshots.push(`action-peek-${width}.png`);
        await page.locator('.action-peek').waitFor({state:'hidden'});
        check(`${width}px: a real contact action shows its scene above offscreen controls and expires without a click`);
      } else {
        await page.waitForFunction(()=>document.querySelector('#worldCanvas').dataset.actionEvent==='CONTACT_PROSPECT');
        await capture(page,'contact-office',true);
        check('Desktop contact action paints a real vignette with the selected person');
      }

      const routine=management(); routine.stage=STAGES.MANAGEMENT_ROUTINE; routine.career.totalSuccessCases=2;
      await load(page,routine);
      assert.equal(await page.locator('[data-plan-id]').count(),3);
      assert.equal(await page.locator('[data-plan-id="all"]').isEnabled(),true);
      if(width===1440) await capture(page,'routine-kitchen',true);
      await page.locator('[data-plan-id="all"]').click();
      const accepted=await saved(page);
      assert.equal(accepted.stage,STAGES.MANAGEMENT);
      assert.equal(accepted.customers.length,1);
      assert.equal(accepted.energy,27);
      assert.equal(await page.locator('[data-plan-id]').count(),0,'no repeat package chooser after submitting');
      assert.equal(await page.locator('dialog[open]').count(),0);
      await noOverflow(page);
      check(`${width}px: prepared full plan advances once, creates a real sale and returns to customer care`);

      const legacy = management();
      legacy.prospects = [{...legacy.prospects[0],journey:'recommendation',consent:false,measured:false,routinePlan:{id:'all',quality:'poor',products:['gus','protein-hmb','vita-matrix','astamega']}}];
      legacy.liveProgress.contentSessions=0;
      await load(page,legacy);
      await page.locator('#peopleButton').click();
      await page.locator('[data-v9-people-tab="all"]').click();
      const talk=page.locator('#gameDialog [data-work-event="OFFER_PROSPECT"]');
      assert.equal(await talk.isEnabled(),true);
      assert.match(await talk.textContent(),/คุยแฟ้ม X กับ ปริม/);
      await talk.click();
      const advanced=await saved(page);
      assert.equal(advanced.stage,STAGES.MANAGEMENT);
      assert.ok(advanced.customers.length===1 || advanced.prospects[0]?.journey==='waiting','the saved plan must get a real decision instead of becoming stuck');
      assert.equal(await page.locator('[data-plan-id]').count(),0);
      assert.equal(await page.locator('dialog[open]').count(),0);
      assert.equal(advanced.energy,27,'one conversation spends energy once');
      assert.notEqual(advanced.lastEvent,'ROUTINE_CONSENT_REQUIRED');
      await noOverflow(page);
      await capture(page,`legacy-plan-advanced-${width}`);
      check(`${width}px: คุยแฟ้ม X advances a legacy event plan with stale consent flags in one click`);

      const bounced = management();
      bounced.liveProgress.contentSessions=0;
      bounced.prospects = [{...bounced.prospects[0],journey:'discovery',consent:false,measured:false,status:'แผนเดิมยังอยู่ · ขออนุญาตดูข้อมูลก่อนคุยต่อ',routinePlan:{id:'fit',quality:'fit',products:['gus']}}];
      await load(page,bounced);
      await page.locator('#peopleButton').click();
      await page.locator('[data-v9-people-tab="all"]').click();
      const resumed=page.locator('#gameDialog [data-work-event="OFFER_PROSPECT"]');
      assert.match(await resumed.textContent(),/คุยแฟ้ม X กับ ปริม/);
      assert.equal(await page.locator('#gameDialog [data-work-event="BASELINE_PROSPECT"]').count(),0,'already-bounced plan needs no extra baseline click');
      await resumed.click();
      const recovered=await saved(page);
      assert.equal(recovered.stage,STAGES.MANAGEMENT);
      assert.ok(recovered.customers.length===1 || recovered.prospects[0]?.journey==='waiting');
      assert.equal(recovered.energy,27);
      assert.equal(await page.locator('[data-plan-id]').count(),0);
      await page.reload();
      await page.locator('body[data-game-boot="ready"]').waitFor({state:'attached'});
      assert.equal((await saved(page)).economy.personalXV,recovered.economy.personalXV,'reload never charges or sells twice');
      assert.equal((await saved(page)).energy,recovered.energy);
      await noOverflow(page);
      check(`${width}px: a previously bounced saved plan resumes without another permission step or duplicate sale`);

      const eventBase=makeInitialState({seed:1});
      const eventStart=reduceGame({...eventBase,month:2,stage:STAGES.MANAGEMENT,phase:'management',rank:'xvisor',energy:28,
        milestones:{...eventBase.milestones,certified:true},encounters:{...eventBase.encounters,months:[]},
        skills:{people:{xp:63},knowledge:{xp:7},care:{xp:0},leadership:{xp:0}}},EVENTS.CREATE_LEAD,{source:'known'});
      assert.equal(eventStart.prospects[0].consent,false,'natural lead starts before the information conversation');
      await load(page,eventStart);
      await page.locator('#choiceToolbar [data-choice-work]').click();
      await page.locator('#gameDialog [data-work-event="RUN_OPEN_HOUSE"]').click();
      await page.locator('body[data-stage="open_house_running"]').waitFor({state:'attached'});
      await page.locator('body[data-stage="management"]').waitFor({state:'attached'});
      const afterEvent=await saved(page);
      const ready=afterEvent.prospects.filter(person=>person.journey==='recommendation');
      assert.ok(ready.length>0,'Open House creates a real ready opportunity');
      assert.ok(ready.every(person=>person.consent && person.measured),'event shortcuts complete the same information checkpoint');
      const target=ready[0];
      await page.locator('#peopleButton').click();
      await page.locator('[data-v9-people-tab="all"]').click();
      const eventOffer=page.locator(`#gameDialog [data-work-event="OFFER_PROSPECT"][data-id="${target.id}"]`);
      assert.ok((await eventOffer.textContent()).includes(`คุยแฟ้ม X กับ ${target.name}`));
      if(width===1440) await capture(page,'open-house-ready-folder');
      await eventOffer.click();
      const decided=await saved(page);
      const result=decided.customers.find(person=>person.personId===target.id) || decided.prospects.find(person=>person.id===target.id);
      assert.ok(result && (decided.customers.some(person=>person.personId===target.id) || result.journey==='waiting'),'one click obtains a real purchase decision');
      assert.equal(decided.energy,afterEvent.energy-1);
      assert.equal(await page.locator('[data-plan-id]').count(),0);
      assert.notEqual(decided.lastEvent,'ROUTINE_CONSENT_REQUIRED');
      assert.doesNotMatch(await page.locator('#choiceFeedback').textContent(),/ยังไม่ได้อนุญาต/);
      await noOverflow(page);
      await capture(page,`open-house-folder-result-${width}`);
      check(`${width}px: a real high-skill Open House leads directly to คุยแฟ้ม X and one customer decision`);
    } finally { await context.close(); }
  }
  assert.deepEqual(report.errors,[]);
  check('All 2.0 scene paths are free of uncaught errors; no score/profile writes sent');
} finally {
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
  console.log(`Proof: ${output}/report.json`);
}
