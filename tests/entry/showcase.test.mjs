/** /showcase/: honest demos (fictional, labelled, not indexed), what the client prepares, and claims that stay inside Thai FDA limits. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const json = async p => JSON.parse(await read(p));
const exists = p => stat(new URL(p, root)).then(() => true, () => false);
const sc = await json('showcase/showcase.json');
const links = await json('assets/site-links.json');
const pageData = html => JSON.parse(html.match(/<script type="application\/json" id="sc-data">([\s\S]*?)<\/script>/)[1]);
const visible = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');

test('every demo page is labelled as a demo, kept out of search, and says what the client prepares and gets', async () => {
  assert.ok(sc.demos.length >= 10, 'the showcase shows breadth');
  for (const d of sc.demos) {
    const file = `showcase/${d.slug}/index.html`;
    const html = await read(file);
    assert.match(html, /<meta name="robots" content="noindex,follow">/, `${file}: fictional shops must not be indexed as real ones`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.myclover\\.com/showcase/${d.slug}/">`), file);
    assert.match(html, /<b>ตัวอย่างสาธิต<\/b>/, `${file}: the frame says it is a demo`);
    assert.match(html, /ธุรกิจสมมติ/, file);
    assert.ok(d.gives.length >= 3 && d.gets.length >= 3, `${d.slug}: gives/gets`);
    for (const t of [...d.gives, ...d.gets]) assert.ok(html.includes(t.replace(/&/g, '&amp;').replace(/"/g, '&quot;')), `${file}: "${t}"`);
    for (const [, url] of html.matchAll(/href="(https:\/\/fastwork\.com[^"]*)"/g)) assert.ok([links.fastwork.profile, ...Object.values(links.fastwork.packages)].includes(url), url);
    assert.ok(await exists(`showcase/kit/${d.engine}.js`) && await exists(`showcase/kit/${d.engine}.css`), d.engine);
    const data = pageData(html);
    assert.equal(data.demo.slug, d.slug);
    if (d.engine !== 'erp') assert.ok(data.links.erp, `${d.slug}: every front end has a back office to show the order in`);
    assert.doesNotMatch(visible(html), /\b(OPEN|TODO|TBD)\b/, file);
  }
});

test('the businesses are fictional: .example domains only, and no real-looking registration numbers', async () => {
  for (const b of Object.values(sc.businesses)) assert.match(b.domain, /\.example$/, b.name);
  for (const d of sc.demos) {
    const raw = await read(`showcase/packs/${d.pack}.json`);
    assert.doesNotMatch(raw, /\b\d{2}-\d-\d{5}-\d-\d{4}\b|\b\d{13}\b/, `${d.pack}: no made-up 13-digit อย. number`);
    assert.doesNotMatch(raw, /\b\d{2}-\d-\d{7,8}\b|\b\d{10}\b/, `${d.pack}: no made-up cosmetic notification number`);
    assert.doesNotMatch(raw, /https?:\/\/(?!fonts\.googleapis)/, `${d.pack}: no outside links inside demo data`);
  }
});

test('skincare and supplement copy makes no medical or result claims, and shows what the law requires', async () => {
  const banned = /หายขาด|ขาวใน|ขาวขึ้น|ลดน้ำหนัก|เห็นผลใน|100%|การันตี|แพทย์แนะนำ|อันดับ ?1|ดีที่สุด|ลดสิว|รักษาสิว|ลดฝ้า|รักษาฝ้า|ต้านมะเร็ง|ล้างพิษ|ฟื้นฟูตับ|เพิ่มภูมิ|ชะลอวัย|ย้อนวัย/;
  for (const name of ['skincare', 'supplement']) {
    const pack = await json(`showcase/packs/${name}.json`);
    const copy = JSON.stringify({hero: pack.hero, perks: pack.perks, brand: pack.brand, products: pack.products.map(p => ({name: p.name, short: p.short, desc: p.desc, details: p.details, tag: p.tag}))});
    assert.doesNotMatch(copy, banned, name);
    // "รักษา" may appear only inside the required "not a cure" statements
    assert.doesNotMatch(copy.replace(/ไม่มีผลในการป้องกันหรือรักษาโรค|ไม่ได้มีไว้รักษาโรค/g, ''), /รักษา/, `${name}: no treatment wording`);
    for (const p of pack.products.filter(p => p.cat !== 'set')) {
      const key = name === 'supplement' ? 'เลขสารบบอาหาร' : 'เลขที่ใบรับจดแจ้ง';
      const row = p.details.find(([k]) => k === key);
      assert.ok(row && typeof row[1] === 'object' && row[1].demo, `${name}/${p.id}: ${key} is a labelled placeholder, never an invented number`);
      assert.ok(p.details.some(([k]) => k === 'คำเตือน'), `${name}/${p.id}: warning from the label`);
    }
  }
  const supp = await json('showcase/packs/supplement.json');
  assert.deepEqual(supp.required, ['ผลิตภัณฑ์เสริมอาหาร ไม่มีผลในการป้องกันหรือรักษาโรค', 'ควรกินอาหารหลากหลาย ครบ 5 หมู่ ในสัดส่วนที่เหมาะสมเป็นประจำ']);
  assert.deepEqual(pageData(await read('showcase/supplement/index.html')).pack.required, supp.required, 'the page carries both statements');
});

test('the LINE OA demos hand medical questions and complaints to a person, and say the answers are scripted', async () => {
  const brand = await json('showcase/packs/line-brand.json');
  const guarded = brand.intents.filter(i => i.guard === 'medical').flatMap(i => i.keys);
  for (const k of ['รักษา', 'สิว', 'ตั้งครรภ์', 'แพ้ง่าย']) assert.ok(guarded.includes(k), k);
  const rest = await json('showcase/packs/line-restaurant.json');
  assert.ok(rest.intents.some(i => i.guard === 'complaint' && i.keys.includes('คืนเงิน')));
  for (const slug of ['line-restaurant', 'line-brand']) {
    const html = await read(`showcase/${slug}/index.html`);
    assert.match(html, /ไม่ได้เชื่อมต่อกับ LINE จริง/, slug);
    assert.match(html, /คำตอบของ AI ในตัวอย่างเขียนไว้ล่วงหน้า/, slug);
  }
});

test('/showcase/ is a secondary "ideas" page: every demo, clearly fictional, pointing to the real work first', async () => {
  const html = await read('showcase/index.html');
  assert.match(html, /<meta name="robots" content="index,follow">/);
  for (const d of sc.demos) assert.ok(html.includes(`href="/showcase/${d.slug}/"`), d.slug);
  assert.match(visible(html), /แบรนด์และตัวเลขสมมติ/);
  assert.match(visible(html), /ยังไม่เชื่อมฐานข้อมูลหรือ LINE จริง/);
  assert.ok(html.indexOf('href="/work/"') < html.indexOf('href="/showcase/shop/"'), 'the real work is offered before the demos');
  for (const [b] of sc.prepare.items) assert.ok(html.includes(b), b);
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert.doesNotMatch(JSON.stringify(ld), /Review|Rating|"price"|"offers"|Product/);
  for (const d of sc.demos) {
    const svg = await read(`showcase/thumbs/${d.slug}.svg`);
    assert.doesNotMatch(svg.replace('http://www.w3.org/2000/svg', ''), /https?:/, `${d.slug}.svg loads nothing from outside`);
  }
  const briefs = await read('showcase/MEDIA-BRIEFS.md');
  for (const d of sc.demos) assert.ok(briefs.includes(`showcase/media/${d.slug}/cover.webp`), d.slug);
});

test('the rest of the site points to /showcase/: homepage, /work/, /hire/, sitemap, llms.txt', async () => {
  const [home, work, hire, sitemap, llms] = await Promise.all(['index.html', 'work/index.html', 'hire/index.html', 'sitemap.xml', 'llms.txt'].map(read));
  for (const [name, html] of [['/', home], ['/work/', work], ['/hire/', hire]]) assert.match(html, /href="\/showcase\//, name);
  assert.ok(sitemap.includes('<loc>https://www.myclover.com/showcase/</loc>'));
  assert.doesNotMatch(sitemap, /showcase\/(shop|menu|erp|line|skincare|supplement|food)/, 'demo pages stay out of the sitemap');
  assert.match(llms, /\/showcase\//);
  const ignore = await read('.vercelignore');
  for (const p of ['showcase/showcase.json', 'showcase/packs/', 'showcase/MEDIA-BRIEFS.md']) assert.ok(ignore.includes(p), p);
});
