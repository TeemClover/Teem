/** Same-origin Ako continuity + Compass network request -> real local SQLite. */
import assert from 'node:assert/strict';
import { writeFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startPreview } from '../../core7/tests/frontdoor-preview.mjs';
const { chromium } = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const server = await startPreview({ port: 0 });
const browser = await chromium.launch({ executablePath: process.env.FRONTDOOR_CHROME, headless: true });
const report = { kind: 'actual local HTTP handler + disk SQLite, no external requests or notifications', checks: [], errors: [] };
async function surface() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', timezoneId: 'Asia/Bangkok' });
  await context.route('**/*', route => route.request().url().startsWith(server.base) || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  page.on('pageerror', error => report.errors.push(error.message));
  return { context, page };
}
try {
  {
    const { context, page } = await surface();
    await context.addInitScript(() => { if (!localStorage.getItem('xircle.local.v1')) localStorage.setItem('xircle.local.v1', JSON.stringify({ xtyHandoff: { partyCode: '51644', receivedAt: Date.now() }, oldProgress: 'keep' })); });
    await page.goto(server.base + '/ako/');
    const copy = await page.locator('body').innerText();
    assert.doesNotMatch(copy, /เข้าห้องแมวขาวที่เอโกะดูแลได้ฟรี|เริ่มแบบทดสอบ|แบบทดสอบสั้น/);
    assert.match(copy, /วันตัวอย่าง/);
    const href = await page.locator('[data-track="hero-routine"]').getAttribute('href');
    assert.ok(href.startsWith('/xircle/?'));
    const link = new URL(href, server.base);
    assert.equal(link.searchParams.get('focus'), 'food'); assert.equal(link.searchParams.get('xty'), '51644');
    const invitation = await page.evaluate(() => localStorage.getItem('xircle.local.v1'));
    await page.locator('[data-track="hero-routine"]').click();
    await page.locator('#compass-continuation').waitFor({ state: 'visible' });
    assert.match(await page.locator('#compass-continuation').innerText(), /มื้ออาหาร/);
    assert.equal(await page.evaluate(() => localStorage.getItem('xircle.local.v1')), invitation);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.checks.push('Ako truthful example-day CTA stays local and preserves invitation');
    await context.close();
  }
  {
    const { context, page } = await surface();
    await context.addInitScript(() => { window.acceptedSignals = 0; window.addEventListener('frontdoor:meet-requested', () => window.acceptedSignals++); });
    await page.goto(server.base + '/meet/?entry=compass&intent=opportunity&need=first-test&offer=skill');
    await page.locator('#booking-root').waitFor({ state: 'visible' });
    assert.match(await page.locator('#conversation').innerText(), /ลองก้าวแรกให้เห็นภาพ/);
    assert.match(await page.locator('#conversation').innerText(), /ทักษะที่มี/);
    assert.doesNotMatch(await page.locator('#value-panel').innerText(), /ใบอนุญาต|เตรียมสอบ/);
    assert.equal(await page.locator('#closed-folder').isHidden(), true);
    await page.getByRole('button', { name: /^ออนไลน์/ }).click();
    await page.getByRole('button', { name: /^วันไหนก็ได้/ }).click();
    await page.getByRole('button', { name: /^เวลาไหนก็ได้/ }).click();
    await page.locator('#session-opportunityNeed').selectOption('partner');
    await page.locator('#session-opportunityOffer').selectOption('project');
    await page.locator('#session-name').fill('Local network fixture');
    await page.locator('#session-contact').fill('fixture@example.test');
    await page.locator('#session-note').fill('อยากคุยความเป็นไปได้ของงานตัวอย่าง');
    await page.locator('#booking-next').click();
    assert.match(await page.locator('.review-card').innerText(), /คุยเรื่องหาคนร่วมทำ/);
    assert.match(await page.locator('.review-card').innerText(), /โครงการที่กำลังทำ/);
    const draft = await page.evaluate(() => localStorage.getItem('myclover.meet.draft.v1'));
    await page.goto(server.base + '/meet/?entry=compass&intent=opportunity&need=mentor&offer=time');
    assert.equal(await page.locator('#booking-root').isHidden(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('myclover.meet.draft.v1')), draft);
    await page.getByRole('button', { name: 'กลับไปลงนัดต่อ', exact: true }).click();
    assert.match(await page.locator('.review-card').innerText(), /คุยเรื่องหาคนร่วมทำ/);
    assert.match(await page.locator('.review-card').innerText(), /โครงการที่กำลังทำ/);
    await page.route('**/api/meet', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"message":"ทดสอบลองใหม่"}' }));
    await page.getByRole('checkbox').check(); await page.locator('#booking-next').click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(() => window.acceptedSignals), 0);
    assert.equal(await page.locator('.success').count(), 0);
    await page.unroute('**/api/meet');
    const responsePromise = page.waitForResponse(response => response.url() === server.base + '/api/meet' && response.request().method() === 'POST');
    await page.locator('#booking-next').click();
    const response = await responsePromise, receipt = await response.json();
    assert.equal(response.status(), 201);
    await page.getByRole('heading', { name: 'บันทึกคำขอทดลองแล้ว 🍀', exact: true }).waitFor();
    const row = server.meet.sqlite.prepare('SELECT * FROM mc_meet_bookings WHERE reference=?').get(receipt.reference);
    assert.equal(row.intent, 'opportunity');
    assert.equal(row.note, '[Compass · โอกาสและคนร่วมทาง · คุยเรื่องหาคนร่วมทำ · โครงการที่กำลังทำ] อยากคุยความเป็นไปได้ของงานตัวอย่าง');
    assert.equal(row.notified_at, null); assert.equal(receipt.notified, false);
    assert.equal(await page.evaluate(() => window.acceptedSignals), 1);
    assert.equal(await page.locator('.success a').filter({ hasText: 'กลับไปที่เข็มทิศ' }).getAttribute('href'), '/frontdoor/');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.checks.push('Opportunity context editable, draft preserved, failure emits no success, retry persists exact note and shows local receipt + return');
    await context.close();
  }
  {
    const { context, page } = await surface();
    await page.goto(server.base + '/meet/?entry=compass&intent=opportunity&need=__proto__&offer=skill&offer=project');
    await page.getByRole('button', { name: /^ออนไลน์/ }).click();
    await page.getByRole('button', { name: /^วันไหนก็ได้/ }).click();
    await page.getByRole('button', { name: /^เวลาไหนก็ได้/ }).click();
    assert.equal(await page.locator('#session-opportunityNeed').inputValue(), '');
    assert.equal(await page.locator('#session-opportunityOffer').inputValue(), '');
    assert.doesNotMatch(await page.locator('#conversation').innerText(), /__proto__/);
    report.checks.push('Malformed or repeated URL context is discarded');
    await context.close();
  }
  {
    const { context, page } = await surface();
    await page.goto(server.base + '/meet/');
    await page.getByRole('button', { name: /ต่อยอดเป็นธุรกิจ/ }).click();
    assert.match(await page.locator('#value-panel').innerText(), /เตรียมสอบใบอนุญาต/);
    assert.equal(await page.locator('#closed-folder').isVisible(), true);
    report.checks.push('Existing non-Compass opportunity offer remains unchanged');
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  for (const check of report.checks) console.log(`PASS ${check}`);
} finally {
  await browser.close(); await server.close(); await rm(server.directory, { recursive: true, force: true });
  await writeFile(process.env.COMPASS_INTAKE_PROOF || '/tmp/myclover-compass-intake-proof.json', JSON.stringify(report, null, 2));
}
