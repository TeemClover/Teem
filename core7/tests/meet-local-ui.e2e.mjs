/** Browser -> actual Meet handler -> disk SQLite -> readback -> visible receipt.
 * Only synthetic test details; every non-local request is blocked. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { startPreview } from './frontdoor-preview.mjs';
import { createLocalMeet, LOCAL_MEET_ADMIN_KEY } from './helpers/meet-local.mjs';
const { chromium } = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const output = process.env.FRONTDOOR_PROOF_DIR || await mkdtemp(path.join(tmpdir(), 'meet-local-proof-'));
await mkdir(output, { recursive: true });
const server = await startPreview({ port: 0 });
const report = { kind: 'actual handler and real disk SQLite; notifications disabled; no production submission', checks: [], receipts: [], errors: [], screenshots: [] };
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.FRONTDOOR_CHROME, headless: true });
  for (const intent of ['ai', 'health']) {
    const context = await browser.newContext({ viewport: intent === 'ai' ? { width: 1440, height: 900 } : { width: 390, height: 844 }, timezoneId: 'Asia/Bangkok', reducedMotion: 'reduce' });
    await context.route('**/*', route => route.request().url().startsWith(server.base) || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    if (intent === 'ai') {
      await page.goto(server.base + '/frontdoor/');
      await page.locator('#pickup').click();
      await page.locator('#continue-discovery').click();
      await page.locator('[data-answer="blue"]').click();
      await page.locator('#cross-seed').click();
      await page.getByRole('button', { name: 'ช่วยทีมทำงาน', exact: true }).click();
      await page.getByRole('button', { name: 'ลองเติมสิ่งที่สำคัญ', exact: true }).click();
      await page.locator('#open-path').click();
      await page.waitForURL('**/meet/?entry=compass&intent=ai&topic=team');
    } else {
      await page.goto(server.base + '/meet/?intent=health&from=xircle&open=booking&focus=sleep');
    }
    await page.locator('#booking-root').waitFor({ state: 'visible' });
    assert.equal(server.meet.sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name='mc_meet_bookings'").get().count === 0 || server.meet.sqlite.prepare('SELECT COUNT(*) AS count FROM mc_meet_bookings').get().count === report.receipts.length, true, 'opening is never submission');
    await page.getByRole('button', { name: /^ออนไลน์/ }).click();
    await page.getByRole('button', { name: /^พรุ่งนี้/ }).click();
    await page.getByRole('button', { name: '13:30 น.', exact: true }).click();
    if (intent === 'health') assert.equal(await page.getByLabel('จุดเริ่มที่อยากคุย', { exact: true }).inputValue(), 'sleep');
    await page.locator('#session-name').fill(`Local ${intent} fixture`);
    await page.locator('#session-contact').fill('fixture@example.test');
    await page.locator('#session-note').fill('ทดสอบในเครื่องเท่านั้น');
    await page.locator('#booking-next').click();
    assert.match(await page.locator('.booking-risk').innerText(), /ไม่มีการส่งนัดจริง/);
    if (intent === 'health') {
      assert.equal(await page.locator('.review-row').filter({ hasText: 'จุดเริ่มที่อยากคุย' }).locator('strong').innerText(), 'การพัก');
      assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('myclover.meet.draft.v1')))).healthFocus, 'sleep');
    }
    const requestedSlot = await page.locator('.review-row').filter({ hasText: 'เวลาที่ขอ' }).locator('strong').innerText();
    const incoming = page.waitForRequest(req => req.url() === server.base + '/api/meet' && req.method() === 'POST');
    const received = page.waitForResponse(res => res.url() === server.base + '/api/meet' && res.request().method() === 'POST');
    await page.getByRole('checkbox').check();
    await page.locator('#booking-next').click();
    const request = (await incoming).postDataJSON(), response = await received, receipt = await response.json();
    assert.equal(response.status(), 201);
    await page.getByRole('heading', { name: 'บันทึกคำขอทดลองแล้ว 🍀', exact: true }).waitFor();
    const row = server.meet.sqlite.prepare('SELECT * FROM mc_meet_bookings WHERE reference=?').get(receipt.reference);
    assert.equal(row.intent, intent);
    assert.equal(row.pref_day, request.day); assert.equal(row.pref_time, request.time); assert.equal(row.pref_time, '13:30');
    assert.equal(row.contact, 'fixture@example.test'); assert.equal(row.status, 'new');
    assert.equal(row.notified_at, null); assert.equal(receipt.notified, false);
    assert.deepEqual(receipt.receipt, { env: 'local', notifications: 'disabled' });
    if (intent === 'ai') assert.match(row.note, /^\[AI · เวิร์กช็อปทีม \/ องค์กร\]/);
    if (intent === 'health') {
      assert.equal(request.focus, 'sleep');
      assert.equal(row.note, '[XIRCLE · จุดเริ่ม: การพัก] ทดสอบในเครื่องเท่านั้น');
      assert.equal(await page.locator('.success .review-row').filter({ hasText: 'จุดเริ่มที่อยากคุย' }).locator('strong').innerText(), 'การพัก');
    }
    assert.equal(await page.locator('.success .review-title').innerText(), receipt.reference);
    assert.equal(await page.locator('.success .review-row').filter({ hasText: 'เวลาที่ขอ' }).locator('strong').innerText(), requestedSlot);
    assert.match(await page.locator('.success').innerText(), /ยังไม่ได้ส่งนัดจริง/);
    assert.match(await page.locator('.success').innerText(), /ไม่ได้รับคำขอนี้/);
    assert.equal(await page.getByRole('button', { name: 'เพิ่มลงปฏิทิน', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('myclover.meet.draft.v1')), null);
    const screenshot = `${intent}-local-sqlite-receipt.png`;
    await page.screenshot({ path: path.join(output, screenshot) }); report.screenshots.push(screenshot);
    report.receipts.push({ reference: receipt.reference, intent, day: row.pref_day, time: row.pref_time, status: row.status, notifyStatus: row.notify_status });
    report.checks.push(`${intent}: real local POST/validation/SQLite INSERT/SELECT and matching visible receipt`);
    await context.close();
  }
  for (const [intent, savedFocus, expected] of [['health', 'food', 'food'], ['health', undefined, ''], ['health', '__proto__', ''], ['ai', 'move', '']]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => route.request().url().startsWith(server.base) || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
    await context.addInitScript(draft => localStorage.setItem('myclover.meet.draft.v1', JSON.stringify({ ...draft, savedAt: Date.now() })), {
      step: 3, intent, healthFocus: savedFocus, aiTopic: intent === 'ai' ? 'private' : null,
      mode: 'ออนไลน์', day: 'flexible', time: 'เวลาไหนก็ได้', name: 'Saved fixture', contact: '@saved-fixture', note: 'Keep my earlier request',
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(server.base + '/meet/?intent=health&from=xircle&open=booking&focus=sleep');
    await page.getByRole('button', { name: /^ลงนัดเดิมต่อ/ }).click();
    assert.equal(await page.locator('#session-name').inputValue(), 'Saved fixture');
    if (intent === 'health') {
      assert.equal(await page.getByLabel('จุดเริ่มที่อยากคุย', { exact: true }).inputValue(), expected);
      assert.doesNotMatch(await page.locator('#conversation').innerText(), /จากที่คุณอยากเริ่มดูแลเรื่องการพัก/);
    } else assert.equal(await page.locator('#session-health-focus').count(), 0);
    await page.locator('#booking-next').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('myclover.meet.draft.v1')));
    assert.equal(saved.intent, intent); assert.equal(saved.healthFocus, expected || null);
    const focusRow = page.locator('.review-row').filter({ hasText: 'จุดเริ่มที่อยากคุย' });
    if (expected) assert.equal(await focusRow.locator('strong').innerText(), 'การกิน');
    else assert.equal(await focusRow.count(), 0);
    if (expected) {
      await focusRow.getByRole('button', { name: 'แก้ไข', exact: true }).click();
      await page.getByLabel('จุดเริ่มที่อยากคุย', { exact: true }).selectOption('move');
      await page.locator('#booking-next').click();
      assert.equal(await page.locator('.review-row').filter({ hasText: 'จุดเริ่มที่อยากคุย' }).locator('strong').innerText(), 'การขยับ');
      assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('myclover.meet.draft.v1')))).healthFocus, 'move');
    }
    await context.close();
  }
  report.checks.push('old health/AI drafts retain only their saved bounded focus; incoming sleep does not overwrite; visitor can edit focus before submission');
  const unauth = await fetch(server.base + '/api/meet'); assert.equal(unauth.status, 401);
  const queue = await (await fetch(server.base + '/api/meet', { headers: { 'x-admin-key': LOCAL_MEET_ADMIN_KEY } })).json();
  assert.equal(queue.bookings.length, 2); assert.deepEqual(queue.channels, { line: false, telegram: false });
  assert.equal(queue.bookings.find(row => row.intent === 'health').note, '[XIRCLE · จุดเริ่ม: การพัก] ทดสอบในเครื่องเท่านั้น');
  assert.deepEqual(report.errors, []);
  await server.close();
  const reopened = createLocalMeet(server.meet.filename);
  try { assert.equal(reopened.sqlite.prepare('SELECT COUNT(*) count FROM mc_meet_bookings').get().count, 2); }
  finally { reopened.close(); }
  report.checks.push('protected queue contains both requests; rows survive full preview shutdown and SQLite reopen');
  for (const check of report.checks) console.log('PASS ' + check);
} finally {
  await writeFile(path.join(output, 'proof.json'), JSON.stringify(report, null, 2));
  await browser?.close();
  await server.close().catch(() => {});
}
