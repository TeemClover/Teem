import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('./first-class.css', import.meta.url), 'utf8');
const script = await readFile(new URL('./first-class.js', import.meta.url), 'utf8');
const metaScript = await readFile(new URL('./meta-pixel.js', import.meta.url), 'utf8');
const admin = await readFile(new URL('./admin/index.html', import.meta.url), 'utf8');
const adminScript = await readFile(new URL('./admin/admin.js', import.meta.url), 'utf8');
const vercelApi = await readFile(new URL('../api/first-class.js', import.meta.url), 'utf8');
const cloudflareApi = await readFile(new URL('../functions/api/first-class.js', import.meta.url), 'utf8');
const classroom = await readFile(new URL('../classroom/index.html', import.meta.url), 'utf8');
const privacy = await readFile(new URL('../privacy/index.html', import.meta.url), 'utf8');

test('course facts and instructor are exact', () => {
  for (const text of ['98 นาที', '98 บาท', 'ส.ค. 2026', '18 สิงหาคม 2026', '19:00', '19:30', 'ไม่มีวิดีโอย้อนหลัง', 'สอนสดโดย Teem']) assert.match(html, new RegExp(text));
  assert.match(html, /href="\/resume\/"/);
  assert.match(html, /<a class="instructor-link" href="\/resume\/"[^>]*><b>สอนสดโดย Teem/);
  assert.doesNotMatch(html, /Ako|ผู้สอนร่วม/);
});

test('hero, social preview and registration are ready', async () => {
  const image = await stat(new URL('./assets/ai-sauce-pilot.webp', import.meta.url));
  const socialImage = await stat(new URL('./assets/ai-sauce-pilot-social.jpg', import.meta.url));
  assert.ok(image.size > 10_000 && image.size < 300_000);
  assert.ok(socialImage.size > 30_000 && socialImage.size < 500_000);
  assert.match(html, /<figure class="hero-banner"><img[^>]+ai-sauce-pilot\.webp/);
  assert.match(html, /property="og:image" content="https:\/\/www\.myclover\.com\/first-class\/assets\/ai-sauce-pilot-social\.jpg"/);
  assert.match(html, /property="og:image:width" content="1440"/);
  assert.match(html, /property="og:image:height" content="756"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /name="twitter:image" content="https:\/\/www\.myclover\.com\/first-class\/assets\/ai-sauce-pilot-social\.jpg"/);
  assert.match(html, /คอร์สสอน AI ไม่ใช่คอร์สทำอาหาร/);
  assert.match(html, /<section class="registration-card"/);
  assert.match(html, /<form id="registrationForm"/);
  assert.match(html, /<details class="smart-details why-discord">/);
  assert.match(html, /<details class="smart-details more-value">/);
  assert.doesNotMatch(html, /<details[^>]+open/);
});

test('classroom promotes the current live First Class course', () => {
  assert.match(classroom, /<a class="liveart" href="\/first-class\/"[^>]*><img src="\/first-class\/assets\/ai-sauce-pilot-social\.jpg" width="1440" height="756"/);
  assert.match(classroom, /🔴 คลาสสดของบ้าน · AI ใส่ซอส/);
  assert.match(classroom, /98 นาที · 98 บาท · สดผ่าน Discord/);
  assert.match(classroom, /อังคาร 18 สิงหาคม 2026 ห้องเปิด 19:00 · เริ่ม 19:30 ตรงเวลา/);
  assert.match(classroom, /<a href="\/first-class\/">ดูรายละเอียดและลงทะเบียน →<\/a>/);
  assert.match(classroom, /\.livebody\{padding:20px 24px 22px/);
  assert.match(classroom, /\.livebody>a\{background:var\(--gold\)/);
  assert.doesNotMatch(classroom, /รับข่าวคลาสถัดไป/);
});

test('Discord has two entry routes and stays optional', () => {
  assert.match(html, /https:\/\/discord\.gg\/A5nmMqvTm/);
  assert.match(html, /href="\/guild\/"/);
  assert.match(html, /Why Discord\?/);
  assert.match(html, /ทุกคนแชร์หน้าจอได้/);
  assert.match(html, /กิจกรรมฟรีทุกสัปดาห์/);
  const discordInput = html.match(/<input name="discordUsername"[^>]*>/)?.[0] || '';
  assert.ok(discordInput);
  assert.doesNotMatch(discordInput, /\brequired\b/);
  assert.doesNotMatch(script, /if \(!payload\.discordUsername\)/);
  assert.doesNotMatch(vercelApi, /if \(!discord\).*discordUsername/);
  assert.doesNotMatch(cloudflareApi, /if\(!discord\).*discordUsername/);
  assert.match(html, /Username พร้อมแนบสลิปทาง LINE Official/);
});

test('AI fields support writable other option and level 1–10', () => {
  for (const name of ['name', 'email', 'discordUsername', 'aiTools', 'aiOther', 'aiLevel', 'transferTime', 'lineId', 'consent']) assert.match(html, new RegExp(`name="${name}"`));
  for (const tool of ['ChatGPT', 'Claude', 'Gemini', 'NotebookLM', 'ยังไม่ค่อยได้ใช้ AI', 'อื่น ๆ']) assert.match(html, new RegExp(tool));
  assert.ok(html.indexOf('value="อื่น ๆ"') > html.indexOf('value="ยังไม่ค่อยได้ใช้ AI"'));
  assert.match(html, /name="aiLevel" value="1"/);
  assert.match(html, /name="aiLevel" value="10"/);
  assert.match(script, /aiOtherToggle/);
  assert.match(vercelApi, /ai_level INTEGER/);
  assert.match(cloudflareApi, /ai_level INTEGER/);
  assert.match(adminScript, /'ai_level'/);
});

test('payment and LINE information are wired exactly', () => {
  for (const text of ['ธนาคารกสิกรไทย', 'นรินทร์ ลีลาภรณ์', '049-3-86430-0', 'ไม่ต้องแนบสลิป']) assert.match(html, new RegExp(text));
  assert.match(html, /id="copyBankButton" data-account="0493864300"/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(html, /https:\/\/lin\.ee\/rlSlhzT/);
  assert.doesNotMatch(html, /line\.me\/ti\/p|type="file"|name="phone"|เบอร์โทร/);
  assert.match(html, /href="\/privacy\/"/);
});

test('free path starts from homepage and live value is explained', () => {
  assert.match(html, /ของฟรีดีแค่ไหน/);
  assert.match(html, /ดีพอให้เริ่มทำของจริงได้เลย/);
  assert.match(html, /แนะนำให้เล่นเส้นทางหลักให้จบก่อนวันเรียน/);
  assert.match(html, /แต่ไม่บังคับ/);
  assert.match(html, /href="\/">เริ่มเล่นจากหน้าแรก myClover/);
  assert.doesNotMatch(html, /href="\/classroom\/"/);
  assert.doesNotMatch(vercelApi, /myclover\.com\/classroom/);
  assert.doesNotMatch(cloudflareApi, /myclover\.com\/classroom/);
});

test('success state, admin password and control room remain operational', () => {
  for (const id of ['successName', 'successDiscordStatus', 'successEmail', 'successReference']) assert.match(html, new RegExp(`id="${id}"`));
  for (const text of ['ดาวน์โหลด CSV', 'First Class Control Room']) assert.match(admin, new RegExp(text));
  assert.match(adminScript, /ยืนยัน 98 บาท/);
  assert.match(adminScript, /ยังไม่แจ้ง Discord/);
  assert.match(vercelApi, /FIRST_CLASS_ADMIN_KEY \|\| 'calling'/);
  assert.match(cloudflareApi, /FIRST_CLASS_ADMIN_KEY\|\|'calling'/);
});

test('Meta browser events use production-only canonical funnel data', () => {
  assert.match(html, /meta-pixel\.js\?v=20260813-2/);
  assert.ok(html.indexOf('meta-pixel.js') < html.indexOf('first-class.js'));
  assert.match(metaScript, /PRODUCTION_HOSTS/);
  assert.match(metaScript, /pixelIds\.forEach/);
  assert.match(vercelApi, /META_PROFILE_PIXEL_ID/);
  assert.match(vercelApi, /pixelIds/);
  assert.match(cloudflareApi, /META_PROFILE_PIXEL_ID/);
  assert.match(cloudflareApi, /pixelIds/);
  for (const event of ['PageView', 'ViewContent', 'Lead']) assert.match(metaScript, new RegExp(`['"]${event}['"]`));
  for (const value of ['AI ใส่ซอส · First Class', 'ai-sauce-first-class-2026-08-18', 'Online Course', 'THB']) assert.match(metaScript, new RegExp(value));
  assert.match(metaScript, /value: 98/);
  assert.match(metaScript, /_fbp/);
  assert.match(metaScript, /_fbc/);
  assert.match(metaScript, /utm_source/);
  assert.match(script, /attribution: window\.firstClassMeta/);
  assert.ok(script.indexOf('trackLead?.(result.reference)') > script.indexOf('if (!response.ok || !result.ok)'));
  assert.doesNotMatch(metaScript, /META_CAPI_ACCESS_TOKEN|Purchase/);
});

test('Purchase is server-side, idempotent and visible to admins', () => {
  for (const api of [vercelApi, cloudflareApi]) {
    assert.match(api, /META_CAPI_ACCESS_TOKEN/);
    assert.match(api, /event_name:\s*['"]Purchase['"]/);
    assert.match(api, /meta_purchase_status/);
    assert.match(api, /meta_purchase_event_id/);
    assert.match(api, /meta_purchase_sent_at/);
    assert.match(api, /already_sent/);
    assert.match(api, /currency:\s*['"]THB['"]/);
    assert.match(api, /value:\s*98/);
    assert.match(api, /retry_meta/);
    assert.match(api, /client_user_agent/);
    assert.match(api, /client_ip/);
  }
  assert.match(vercelApi, /createHash\(['"]sha256['"]\)/);
  assert.match(cloudflareApi, /crypto\.subtle\.digest\(['"]SHA-256['"]/);
  assert.match(adminScript, /Meta: \$\{label\(row\.meta_purchase_status\)\}/);
  assert.match(adminScript, /Retry Meta/);
  assert.match(adminScript, /meta_purchase_event_id/);
});

test('privacy copy matches Meta tracking implementation', () => {
  assert.match(html, /วัดผลการสมัคร First Class/);
  for (const value of ['Meta Pixel และ Conversions API', '_fbp/_fbc', 'SHA-256 hash', 'Purchase 98 บาท']) assert.match(privacy, new RegExp(value));
  assert.match(privacy, /เราไม่ส่ง LINE ID, Discord Username/);
  assert.doesNotMatch(privacy, /ไม่มีตัวติดตามของบริษัทโฆษณาใด ๆ/);
});

test('responsive styles cover desktop, tablet and mobile', () => {
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /\.registration-card\{display:grid/);
  assert.match(css, /\.level-scale\{display:grid/);
  assert.match(css, /\.intro-lead\{font-size:16px\}/);
  assert.match(css, /\.field>span,fieldset legend\{font-size:15px\}/);
  assert.match(css, /\.instructor-line b\{font-size:14px\}/);
});
