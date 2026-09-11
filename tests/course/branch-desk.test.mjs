import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../../course/thedent/daily-brief.html', import.meta.url), 'utf8');
const script = html.match(/<script id="branch-desk-script">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Standalone Branch Desk script is present');
const context = vm.createContext({});
vm.runInContext(script, context);
const desk = context.BranchDesk;
const ids = matches => Array.from(matches, branch => branch.id);

test('public branch records preserve verified names, landmarks, and phone numbers', () => {
  assert.deepEqual(Array.from(desk.BRANCHES, b => [b.id, b.name, b.landmark, b.phone]), [
    ['ratchayothin', 'รัชโยธิน', 'BTS รัชโยธิน ทางออก 4', '02-512-4595'],
    ['rangsit', 'รังสิต', 'คลอง 1 ใกล้โรงกษาปณ์', '02-147-2244'],
    ['ratchaphruek', 'ราชพฤกษ์', 'โครงการแลนด์มาร์ค ราชพฤกษ์', '02-591-6868']
  ]);
  assert.equal(desk.REVIEW_DATE, '2026-09-11');
});

test('search supports Thai names, transit landmarks, combined words, and telephone punctuation', () => {
  assert.deepEqual(ids(desk.filterBranches('รัชโยธิน')), ['ratchayothin']);
  assert.deepEqual(ids(desk.filterBranches('BTS ทางออก 4')), ['ratchayothin']);
  assert.deepEqual(ids(desk.filterBranches('คลอง 1')), ['rangsit']);
  assert.deepEqual(ids(desk.filterBranches('แลนด์มาร์ค')), ['ratchaphruek']);
  assert.deepEqual(ids(desk.filterBranches('RANGSIT')), ['rangsit']);
  assert.deepEqual(ids(desk.filterBranches('02 591 6868')), ['ratchaphruek']);
});

test('empty search shows the source records and unmatched search returns none', () => {
  assert.equal(desk.filterBranches('  ').length, 3);
  assert.equal(desk.filterBranches('เชียงใหม่').length, 0);
  assert.equal(desk.filterBranches('<script>alert(1)</script>').length, 0);
});

test('rendered records escape text and attributes instead of injecting markup', () => {
  const markup = desk.branchMarkup({
    id: 'unsafe" onmouseover="alert(1)',
    name: '<img src=x onerror=alert(1)>',
    landmark: 'A&B <script>bad()</script>',
    phone: '02-512-4595" onclick="bad()'
  });
  assert.ok(markup.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(markup.includes('A&amp;B &lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(markup.includes('unsafe&quot; onmouseover=&quot;alert(1)'));
  assert.ok(markup.includes('href="tel:025124595"'));
  assert.ok(!markup.includes('<img'));
  assert.ok(!markup.includes('<script>'));
  assert.equal(desk.escapeHTML('"\'<>&'), '&quot;&#39;&lt;&gt;&amp;');
});

test('copied contact text contains the matching branch and source review date', () => {
  const text = desk.contactText(desk.BRANCHES[1]);
  assert.ok(text.includes('สาขารังสิต'));
  assert.ok(text.includes('คลอง 1 ใกล้โรงกษาปณ์'));
  assert.ok(text.includes('02-147-2244'));
  assert.ok(text.includes('https://thedent.co.th'));
  assert.ok(text.includes('2026-09-11'));
  assert.ok(!text.includes('02-512-4595'));
});

test('successful Clipboard API copy skips the fallback', async () => {
  const calls = [];
  const result = await desk.copyText('branch contact', {
    clipboard: async text => calls.push(text),
    fallback: () => assert.fail('fallback should not run after successful copy')
  });
  assert.equal(result, 'clipboard');
  assert.deepEqual(calls, ['branch contact']);
});

test('denied Clipboard API uses fallback and preserves exact text', async () => {
  let received;
  const result = await desk.copyText('ข้อมูลสาขา\n02-147-2244', {
    clipboard: async () => { throw new Error('Permission denied'); },
    fallback: text => { received = text; return true; }
  });
  assert.equal(result, 'fallback');
  assert.equal(received, 'ข้อมูลสาขา\n02-147-2244');
});

test('copy failures return manual state and the page provides a selectable readonly field', async () => {
  assert.equal(await desk.copyText('contact', { clipboard: async () => { throw new Error('denied'); }, fallback: () => false }), 'manual');
  assert.equal(await desk.copyText('contact', { fallback: () => { throw new Error('unsupported'); } }), 'manual');
  assert.match(html, /<textarea id="fallback-text" readonly/);
  assert.match(script, /\$\('fallback-text'\)\.value=text/);
  assert.match(script, /\$\('fallback-text'\)\.select\(\)/);
  assert.match(script, /\$\('empty-description'\)\.textContent=/);
});

test('all external links use noopener and the tool identifies its source and workshop status', () => {
  const external = [...html.matchAll(/<a\b[^>]*href="https?:[^>]*>/g)].map(match => match[0]);
  assert.ok(external.length >= 5);
  for (const link of external) assert.match(link, /rel="[^"]*noopener/);
  assert.ok(html.includes('https://thedent.co.th/quotation/'));
  assert.ok(html.includes('https://www.clinicthedent.com/'));
  assert.ok(html.includes('รายการสาขาที่พบในแหล่งข้อมูล'));
  assert.ok(html.includes('ไม่ใช่ระบบบริการอย่างเป็นทางการของคลินิก'));
  assert.ok(!html.includes('cash_in'));
  assert.ok(!html.includes('daily-normal.csv'));
});
