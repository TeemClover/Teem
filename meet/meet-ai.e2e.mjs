// Offline browser request-contract proof. Every request is intercepted; this
// intentionally neither creates a live booking nor sends a notification.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const { chromium } = await import(pathToFileURL(process.env.FRONTDOOR_PLAYWRIGHT).href);
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon' };
const browser = await chromium.launch({ executablePath: process.env.FRONTDOOR_CHROME, headless: true });
const results = [];
async function surface(draft) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const data = { posts: [], errors: [] };
  await ctx.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'meet.audit') return route.abort();
    if (url.pathname.startsWith('/api/')) {
      if (route.request().method() === 'POST') data.posts.push(route.request().postDataJSON());
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"message":"AUDIT_NO_SUBMISSION"}' });
    }
    try {
      const file = path.resolve(root, '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
      if (!file.startsWith(root) || !(url.pathname.startsWith('/meet/') || url.pathname === '/favicon.ico')) throw new Error('asset outside bounded fixture');
      return route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: await readFile(file) });
    } catch { return route.fulfill({ status: 404, body: 'not found' }); }
  });
  if (draft) await ctx.addInitScript(value => localStorage.setItem('myclover.meet.draft.v1', JSON.stringify(value)), draft);
  const page = await ctx.newPage();
  page.on('pageerror', e => data.errors.push(e.message));
  page.setDefaultTimeout(6000);
  return { ctx, page, data };
}
async function toContact(page) {
  await page.getByRole('button', { name: /^ออนไลน์/ }).click();
  await page.getByRole('button', { name: /^วันไหนก็ได้/ }).click();
  await page.getByRole('button', { name: /^เวลาไหนก็ได้/ }).click();
  await page.locator('#session-name').fill('Fixture <b>ผู้ทดลอง</b>');
  await page.locator('#session-contact').fill('@fixture-only');
  await page.locator('#session-note').fill('อยากใช้ AI กับงานที่ทำ');
  await page.locator('#booking-next').click();
}
try {
  for (const [topic, label] of Object.entries({ private: 'เรียน 1–1 / Executive coaching', team: 'เวิร์กช็อปทีม / องค์กร', course: 'คอร์สย่อยของทีม', academy: 'แนะนำคอร์ส Pi R Academy', explore: 'ช่วยเลือกวิธีเรียน AI' })) {
    const { ctx, page, data } = await surface();
    await page.goto(`http://meet.audit/meet/?entry=compass&intent=ai&topic=${topic}`);
    assert.equal(await page.locator('#booking-root').isVisible(), true);
    assert.ok((await page.locator('#conversation').innerText()).includes(label));
    assert.equal(data.posts.length, 0, 'opening is never submission');
    await toContact(page);
    const review = await page.locator('#conversation').innerText();
    assert.ok(review.includes(label));
    assert.doesNotMatch(review, /ไม่มีค่าใช้จ่าย|วินิจฉัยทางการแพทย์/);
    assert.equal(await page.locator('.review-card b').count(), 0, 'free-form contact is text, not HTML');
    await page.getByRole('checkbox').check();
    await page.locator('#booking-next').click();
    await page.getByRole('alert').waitFor();
    assert.equal(data.posts[0].intent, 'ai');
    assert.equal(data.posts[0].topic, topic);
    assert.equal(data.posts[0].note, 'อยากใช้ AI กับงานที่ทำ');
    assert.equal(await page.locator('.success').count(), 0, 'failed persistence is never success');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('myclover.meet.draft.v1')));
    assert.equal(saved.aiTopic, topic);
    assert.equal(saved.contact, '@fixture-only');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(data.errors, []);
    results.push({ case: topic, requestedTopic: data.posts[0].topic, retainsDraftAfterFailure: true, overflow: false });
    if (topic === 'private' && process.env.MEET_PROOF_SCREENSHOT) await page.screenshot({ path: process.env.MEET_PROOF_SCREENSHOT });
    await ctx.close();
  }
  {
    const { ctx, page, data } = await surface();
    await page.goto('http://meet.audit/meet/?entry=compass&intent=ai&topic=__proto__');
    await page.getByRole('button', { name: /^เวิร์กช็อปทีม/ }).click();
    assert.ok((await page.locator('#conversation').innerText()).includes('เวิร์กช็อปทีม / องค์กร'));
    await page.getByRole('button', { name: 'เปลี่ยนเรื่องที่อยากคุยเกี่ยวกับ AI' }).click();
    await page.getByRole('button', { name: /^แนะนำคอร์ส Pi R Academy/ }).click();
    await toContact(page);
    assert.ok((await page.locator('.review-card').innerText()).includes('แนะนำคอร์ส Pi R Academy'));
    assert.equal(data.posts.length, 0);
    results.push({ case: 'unknown-url-topic-and-explicit-change', noAutosubmit: true });
    await ctx.close();
  }
  for (const intent of ['health', 'ai']) {
    const draft = { savedAt: Date.now(), step: 3, intent, ...(intent === 'ai' ? { aiTopic: 'team' } : {}), mode: 'ออนไลน์', day: 'flexible', time: 'เวลาไหนก็ได้', name: 'Saved fixture', contact: '@saved-only', note: 'keep this note' };
    const { ctx, page, data } = await surface(draft);
    await page.goto('http://meet.audit/meet/?entry=compass&intent=ai&topic=private');
    assert.equal(await page.locator('#booking-root').isHidden(), true);
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('myclover.meet.draft.v1')))).intent, intent);
    await page.getByRole('button', { name: 'กลับไปลงนัดต่อ' }).click();
    assert.equal(await page.locator('#session-name').inputValue(), 'Saved fixture');
    assert.equal(await page.locator('#session-note').inputValue(), 'keep this note');
    if (intent === 'ai') assert.ok((await page.locator('#conversation').innerText()).includes('เวิร์กช็อปทีม / องค์กร'));
    await page.locator('#session-name').fill('Updated fixture');
    await page.locator('#session-contact').fill('@updated-only');
    await page.locator('#booking-close').click();
    await page.getByRole('button', {name: 'ออกจากหน้านี้', exact:true}).click();
    await page.getByRole('button', { name: 'กลับไปลงนัดต่อ' }).click();
    assert.equal(await page.locator('#session-name').inputValue(), 'Updated fixture');
    assert.equal(await page.locator('#session-contact').inputValue(), '@updated-only');
    assert.equal(data.posts.length, 0);
    assert.deepEqual(data.errors, []);
    results.push({ case: `${intent}-draft-preserved`, noAutosubmit: true });
    await ctx.close();
  }
  for (const result of results) console.log(`PASS ${result.case}`);
} finally {
  await browser.close();
  await writeFile(process.env.MEET_PROOF_JSON || '/tmp/myclover-meet-ai-proof.json', JSON.stringify({ kind: 'offline request fixture, no live submission', results }, null, 2));
}
