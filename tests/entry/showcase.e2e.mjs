/**
 * /showcase/ in a real browser: every demo works on a phone, and the demos of one business really
 * talk to each other (shop / QR menu / LINE OA → ERP → back to the customer).
 *
 *   npm run test:showcase:ui                                     local copy of the repo (static server)
 *   ENTRY_BASE_URL=https://<deployment> npm run test:showcase:ui  a real deployment
 *
 * Setup and options are the same as tests/entry/entry.e2e.mjs (see tests/entry/README.md).
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startServer} from './serve.mjs';

const sc = JSON.parse(await readFile(new URL('../../showcase/showcase.json', import.meta.url), 'utf8'));
const remote = process.env.ENTRY_BASE_URL?.replace(/\/$/, '');
const local = remote ? null : await startServer();
const base = remote || local.base;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const browser = await chromium.launch(process.env.ENTRY_CHROME ? {executablePath: process.env.ENTRY_CHROME} : {});
const results = [];
const check = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name, e.message.split('\n').slice(0, 3).join(' | ')]); } };
async function context(options = {}) {
  const ctx = await browser.newContext({...options, acceptDownloads: true, ...(bypass ? {extraHTTPHeaders: {'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true'}} : {})});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); // brand fonts are optional; keep runs offline-safe
  ctx.errors = [];
  ctx.page = async path => { const p = await ctx.newPage(); p.on('pageerror', e => ctx.errors.push(`${path}: ${e.message}`)); if (path) await p.goto(base + path, {waitUntil: 'domcontentloaded'}); return p; };
  return ctx;
}
const phone = {viewport: {width: 375, height: 667}, isMobile: true, hasTouch: true};
const ready = (p, name) => p.waitForFunction(n => document.documentElement.dataset.ready === n, name, {timeout: 15000});
const ENGINE_READY = {store: 'store', menu: 'menu', erp: 'erp', chat: 'chat'};
console.log(`showcase checks against ${base}`);

await check(`all ${sc.demos.length} demos start on a 375 px phone without errors or sideways scrolling`, async () => {
  const ctx = await context(phone);
  for (const d of sc.demos) {
    const p = await ctx.page(`/showcase/${d.slug}/`);
    await ready(p, ENGINE_READY[d.engine]);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${d.slug} scrolls sideways`);
    assert.match(await p.locator('.sc-bar').textContent(), /ตัวอย่างสาธิต/, d.slug);
    await p.close();
  }
  assert.deepEqual(ctx.errors, []);
  await ctx.close();
});

await check('shop: a variant, a coupon and checkout give an order that appears live in the ERP, which can move it along', async () => {
  const ctx = await context(phone);
  const shop = await ctx.page('/showcase/shop/');
  await ready(shop, 'store');
  await shop.click('.st-card [data-open="vase-clay"].st-add');
  await shop.click('dialog [data-vi="1"]');
  await shop.click('dialog [data-buy]');
  await shop.click('.st-card [data-add="tray-teak"]');
  await shop.click('.st-cartbtn');
  await shop.fill('dialog input[name=code]', 'MAIMUM10');
  await shop.click('dialog .st-coupon button');
  assert.match(await shop.locator('dialog .st-sum').textContent(), /ส่วนลด/);
  await shop.click('dialog [data-step=checkout]');
  await shop.click('dialog [data-place]');
  const no = (await shop.locator('.st-no b').textContent()).trim();
  assert.match(no, /^MMH-\d{6}-W\d{3}$/);
  const erp = await ctx.page('/showcase/erp-retail/?view=orders');
  await ready(erp, 'erp');
  const row = erp.locator('.orow.live', {hasText: no});
  await row.waitFor();
  assert.match(await row.textContent(), /แจกันดินเผาทรงหยดน้ำ \(ดินเผา\)/);
  await row.locator('[data-advance]').click();
  await erp.locator('.orow.live', {hasText: 'กำลังแพ็ก'}).waitFor();
  assert.deepEqual(ctx.errors, []);
  await ctx.close();
});

await check('QR menu → kitchen screen: the kitchen moves the order and the table sees it', async () => {
  const ctx = await context({viewport: {width: 1280, height: 860}});
  const menu = await ctx.page('/showcase/menu/?table=3');
  await ready(menu, 'menu');
  await menu.click('.mn-sec:not(.rec) [data-item="padthai"].mn-add');
  await menu.click('dialog [data-addcart]');
  await menu.click('#mn-bar [data-opencart]');
  await menu.click('dialog [data-send]');
  await menu.uncheck('[data-sim]');
  const kitchen = await ctx.page('/showcase/erp-restaurant/?view=kitchen');
  await ready(kitchen, 'erp');
  const ticket = kitchen.locator('.ticket.live', {hasText: 'โต๊ะ 3'});
  await ticket.waitFor();
  await ticket.locator('[data-advance]').click();
  await menu.locator('.mn-track[data-status="doing"]').waitFor({timeout: 5000});
  await menu.click('[data-lang]');
  assert.match(await menu.locator('.mn-track').textContent(), /Cooking/);
  assert.deepEqual(ctx.errors, []);
  await ctx.close();
});

await check('ERP: a POS sale uses ingredients by recipe; a purchase order refills stock; the CSV export downloads', async () => {
  const ctx = await context({viewport: {width: 1280, height: 860}});
  const erp = await ctx.page('/showcase/erp-restaurant/?view=stock');
  await ready(erp, 'erp');
  const pork = async () => Number((await erp.locator('.srow', {hasText: 'หมูสับ'}).first().locator('.srow-q b').textContent()).replace(/,/g, ''));
  const before = await pork();
  await erp.click('[data-view="pos"]');
  await erp.click('[data-tile="kaprao"]');
  await erp.click('[data-tile="kaprao"]');
  await erp.click('[data-pay="เงินสด"]');
  await erp.locator('dialog .receipt').waitFor();
  await erp.click('dialog [data-close]');
  await erp.click('[data-view="stock"]');
  assert.equal(Math.round((before - await pork()) * 100) / 100, 0.24, '2 × 0.12 kg of pork per plate');
  const prawn = async () => Number((await erp.locator('.srow', {hasText: 'กุ้งแม่น้ำ'}).first().locator('.srow-q b').textContent()).replace(/,/g, ''));
  const prawnBefore = await prawn();
  await erp.click('[data-view="buy"]');
  await erp.click('[data-po-auto]');
  while (await erp.locator('[data-po-send]').count()) await erp.locator('[data-po-send]').first().click();
  while (await erp.locator('[data-po-receive]').count()) await erp.locator('[data-po-receive]').first().click();
  await erp.click('[data-view="stock"]');
  assert.ok(await prawn() > prawnBefore, 'the received purchase order refills the low ingredient');
  await erp.click('[data-view="report"]');
  const [download] = await Promise.all([erp.waitForEvent('download'), erp.click('[data-csv]')]);
  const csv = await readFile(await download.path(), 'utf8');
  assert.match(csv.split('\r\n')[0], /เลขที่.*ข้อมูลสมมติ/);
  assert.ok(csv.split('\r\n').length > 100, 'two weeks of orders');
  assert.deepEqual(ctx.errors, []);
  await ctx.close();
});

await check('LINE OA: a table booking reaches the ERP; a treatment question goes to a person; status comes back from the ERP', async () => {
  const ctx = await context(phone);
  const line = await ctx.page('/showcase/line-restaurant/');
  await line.locator('[data-act="consent:no"]').click({timeout: 15000});
  await ready(line, 'chat');
  await line.click('.ch-rich [data-act="book"]');
  await line.click('[data-act="bday:1"]');
  await line.locator('[data-act^="btime:"]').first().click();
  await line.locator('[data-act^="bsize:"]').first().click();
  await line.locator('.ch-confirm', {hasText: 'BK-'}).waitFor();
  const erp = await ctx.page('/showcase/erp-restaurant/?view=bookings');
  await ready(erp, 'erp');
  await erp.locator('.orow.live', {hasText: 'ลูกค้า LINE (สาธิต)'}).waitFor();

  const brand = await ctx.page('/showcase/line-brand/');
  await brand.locator('[data-act="consent:yes"]').click({timeout: 15000});
  await ready(brand, 'chat');
  await brand.fill('#ch-text', 'รักษาสิวได้ไหม');
  await brand.press('#ch-text', 'Enter');
  await brand.locator('.ch-note', {hasText: 'ส่งต่อแอดมิน'}).waitFor();
  assert.match(await brand.locator('.ch-events').textContent(), /ถามเรื่องการรักษา/);
  await brand.click('[data-admin-release]');
  await brand.click('.ch-rich [data-act="menu"]');
  await brand.click('.ch-card [data-act="add:sun-milk"]');
  await brand.click('[data-act="checkout"]');
  await brand.locator('[data-act^="place:"]').first().click();
  await brand.locator('[data-act="track"]').waitFor();
  const back = await ctx.page('/showcase/erp-brand/?view=orders');
  await ready(back, 'erp');
  const row = back.locator('.orow.live', {hasText: 'กันแดด'});
  await row.locator('[data-advance]').click();
  await back.locator('.orow.live', {hasText: 'กำลังแพ็ก'}).waitFor();
  await brand.bringToFront();
  await brand.click('[data-act="track"]');
  await brand.locator('.ch-confirm', {hasText: 'กำลังแพ็ก'}).waitFor();
  assert.deepEqual(ctx.errors, []);
  await ctx.close();
});

await check('/showcase/ filters by type and every card opens; without JavaScript a demo still says what it is', async () => {
  const ctx = await context(phone);
  const p = await ctx.page('/showcase/');
  await p.click('[data-filter="erp"]');
  assert.equal(await p.locator('.demo:not([hidden])').count(), sc.demos.filter(d => d.groups.includes('erp')).length);
  await p.click('[data-filter="all"]');
  assert.equal(await p.locator('.demo:not([hidden])').count(), sc.demos.length);
  await ctx.close();
  const nojs = await context({...phone, javaScriptEnabled: false});
  const s = await nojs.page('/showcase/skincare/');
  assert.match(await s.locator('.sc-static h1').textContent(), /สกินแคร์/);
  assert.ok(await s.locator('#want a[href*="fastwork.com"]').count(), 'hire link works without JS');
  await nojs.close();
});

await browser.close(); local?.server.close();
for (const r of results) console.log(r.join(' · '));
process.exit(results.some(r => r[0] === 'FAIL') ? 1 : 0);
