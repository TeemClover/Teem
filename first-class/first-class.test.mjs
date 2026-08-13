import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('./first-class.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('./admin/index.html', import.meta.url), 'utf8');
const adminScript = await readFile(new URL('./admin/admin.js', import.meta.url), 'utf8');
const vercelApi = await readFile(new URL('../api/first-class.js', import.meta.url), 'utf8');
const cloudflareApi = await readFile(new URL('../functions/api/first-class.js', import.meta.url), 'utf8');

test('course facts and instructor are exact', () => {
  for (const text of ['98 นาที', '98 บาท', 'วันอังคาร', '18 สิงหาคม 2026', '19:00', '19:30', 'ไม่มีวิดีโอย้อนหลัง', 'สอนสดโดย TEEM']) assert.match(html, new RegExp(text));
  assert.match(html, /href="\/resume\/"/);
  assert.doesNotMatch(html, /Ako|ผู้สอนร่วม/);
});

test('Discord flow has both routes and every requested benefit', () => {
  assert.match(html, /https:\/\/discord\.gg\/A5nmMqvTm/);
  assert.match(html, /href="\/guild\/"/);
  assert.match(html, /<details class="why-discord">/);
  for (const text of ['ทุกคนแชร์จอได้', 'ผู้สอนและผู้ช่วยสอน', 'กิจกรรมฟรีทุกสัปดาห์', 'ไม่บังคับ', 'First Class']) assert.match(html, new RegExp(text));
});

test('pilot form is short and contains only the approved fields', () => {
  for (const name of ['name', 'email', 'discordUsername', 'aiTools', 'transferTime', 'lineId', 'consent']) assert.match(html, new RegExp(`name="${name}"`));
  for (const tool of ['ChatGPT', 'Claude', 'Gemini', 'NotebookLM', 'อื่น ๆ', 'ยังไม่ค่อยได้ใช้ AI']) assert.match(html, new RegExp(tool));
  assert.doesNotMatch(html, /type="file"|name="phone"|เบอร์โทร/);
  assert.match(html, /ไม่ต้องแนบสลิป/);
  assert.match(html, /href="\/privacy\/"/);
});

test('success state and admin control room are present', () => {
  for (const id of ['successName', 'successDiscord', 'successEmail', 'successReference']) assert.match(html, new RegExp(`id="${id}"`));
  for (const text of ['ดาวน์โหลด CSV', 'First Class Control Room']) assert.match(admin, new RegExp(text));
  assert.match(adminScript, /ยืนยัน 98 บาท/);
});

test('campaign image, LINE Official and pilot admin password are wired', async () => {
  const image = await stat(new URL('./assets/ai-sauce-pilot.webp', import.meta.url));
  assert.ok(image.size > 10_000 && image.size < 300_000);
  assert.match(html, /assets\/ai-sauce-pilot\.webp/);
  assert.match(html, /https:\/\/lin\.ee\/rlSlhzT/);
  assert.doesNotMatch(html, /line\.me\/ti\/p/);
  assert.match(vercelApi, /FIRST_CLASS_ADMIN_KEY \|\| 'calling'/);
  assert.match(cloudflareApi, /FIRST_CLASS_ADMIN_KEY\|\|'calling'/);
});

test('responsive styles cover desktop, tablet and mobile', () => {
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:650px\)/);
  assert.match(css, /\.mobile-bar\{display:block/);
});
