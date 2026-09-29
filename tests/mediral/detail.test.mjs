import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The five product pages share one pure renderer; these tests read exactly what a visitor gets.
const read = path => readFileSync(new URL(`../../mediral/${path}`, import.meta.url), 'utf8');
const routine = JSON.parse(read('data/routine.json'));
const details = JSON.parse(read('data/details.json'));
const {detailHTML, DETAIL_IDS} = await import(new URL('../../mediral/js/detail-view.js', import.meta.url));
const render = id => detailHTML({routine, details, id, asset: path => `../${path}`});
const COUNTS = {CL: 15, AC: 24, BR: 18, SU: 14, PO: 18};

test('every source-listed name appears in its group, and the counts are names in brand material', () => {
  for (const id of DETAIL_IDS) {
    const html = render(id);
    const product = details.products.find(p => p.id === id);
    const names = product.ingredient_groups.flatMap(g => g.items.map(i => i.name));
    assert.equal(names.length, COUNTS[id], `${id}: the source-listed names`);
    for (const group of product.ingredient_groups) {
      const start = html.indexOf(`<span>${group.title}</span>`);
      assert.ok(start > 0, `${id}: group ${group.title}`);
      const block = html.slice(start, html.indexOf('</ul>', start));
      assert.equal((block.match(/class="mr-atlas__item"/g) || []).length, group.items.length, `${id}: one card per name in ${group.title}`);
      for (const item of group.items) {
        assert.ok(block.includes(`<b>${item.name}</b>`), `${id}: ${item.name} sits in ${group.title}`);
        if (item.benefit) assert.ok(block.includes(item.benefit), `${id}: ${item.name} keeps its sourced role`);
      }
    }
    if (COUNTS[id]) assert.match(html, new RegExp(`${COUNTS[id]} รายการ`));
    if (COUNTS[id]) assert.match(html, /รายการนี้มาจากสื่อแบรนด์ ไม่ใช่ลำดับส่วนผสมทั้งหมดบนฉลาก/, `${id}: not presented as the full label list`);
  }
});

test('a name without a sourced role is shown as a name only; nothing is filled in for it', () => {
  for (const product of details.products) for (const group of product.ingredient_groups) for (const item of group.items) {
    if (item.benefit) continue;
    const html = render(product.id);
    const at = html.indexOf(`<b>${item.name}</b>`);
    assert.equal(html.slice(at, at + item.name.length + 20).includes('<small>'), false, `${product.id}: ${item.name}`);
  }
});

test('the mousse restores the confirmed fifteen source names without invented individual benefits or size', () => {
  const html = render('CL');
  const product = details.products.find(p => p.id === 'CL');
  const items = product.ingredient_groups.flatMap(g => g.items);
  assert.equal(items.length, 15);
  assert.ok(items.every(i => i.benefit === null), 'Names are not ingredient-specific efficacy evidence');
  assert.match(html, /id="ingredients"/);
  assert.match(html, /สเต็มเซลล์จากดอกชบา/);
  assert.match(html, /สเต็มเซลล์จากดอกลิลลี่/);
  assert.match(html, /กรดโคจิ จากเห็ดและยีสต์/);
  assert.doesNotMatch(html, /80 ?ml|มาร์ก.{0,12}นาที|กลิ่น(?:ชบา|ลิลลี่)|ฟื้นฟูเซลล์/);
  assert.equal(product.size, null);
  assert.match(html, /ทำความสะอาด|ล้างหน้า/);
});

test('the sunscreen page notes a brand trade name without counting it as an ingredient', () => {
  const html = render('SU');
  assert.match(html, /<h3>ชื่อที่พบในสื่อแบรนด์<\/h3><p>สื่อ Mediral อีกภาพใช้ชื่อ HydroAlgae™ ในเรื่องราวของสารสกัดสาหร่าย<\/p>/);
  assert.ok(!details.products.find(p => p.id === 'SU').ingredient_groups.some(g => g.items.some(i => /HydroAlgae/.test(i.name))), 'Not a fifteenth name');
  assert.match(html, /14 รายการ/);
});

test('each page orders through the one LINE config and returns to its exact chapter and neighbours', () => {
  for (const [i, id] of DETAIL_IDS.entries()) {
    const html = render(id);
    const links = [...html.matchAll(/href="(https:\/\/[^"]+)"/g)].map(m => m[1]).filter(h => !/nhs\.uk|niams/.test(h));
    assert.ok(links.length >= 2 && links.every(h => h === routine.order.url), `${id}: LINE only via the config`);
    assert.match(html, /rel="noopener"/);
    assert.match(html, new RegExp(`href="\\.\\./#step-${id}"`), `${id}: back to its chapter`);
    if (i > 0) assert.match(html, new RegExp(`href="\\.\\./${DETAIL_IDS[i - 1].toLowerCase()}/" rel="prev"`));
    if (i < 4) assert.match(html, new RegExp(`href="\\.\\./${DETAIL_IDS[i + 1].toLowerCase()}/" rel="next"`));
    assert.match(html, /การสั่งซื้อเกิดขึ้นเมื่อยืนยันในแชตเท่านั้น/);
  }
  for (const id of DETAIL_IDS) {
    const nav = render(id).match(/<nav class="mr-route-nav"[\s\S]*?<\/nav>/)[0];
    const links = [...nav.matchAll(/<a href="\.\.\/(\w+)\/" aria-label="([^"]+)"( aria-current="page")?>/g)];
    assert.deepEqual(links.map(l => l[1]), DETAIL_IDS.map(x => x.toLowerCase()), `${id}: the route strip links all five in order`);
    for (const [k, step] of routine.steps.entries()) assert.equal(links[k][2], `ขั้น 0${step.order} ${step.tone.word} ${step.nick}`, `${id}: each link is named by number, colour and piece`);
    assert.deepEqual(links.filter(l => l[3]).map(l => l[1]), [id.toLowerCase()], `${id}: only the current piece is marked current`);
  }
  assert.match(render('AC'), /ทำความเข้าใจผิวที่เป็นสิวง่าย[\s\S]*nhs\.uk[\s\S]*niams/, 'General acne knowledge stays behind its own link');
});

test('the pages read as finished and carry no backstage wording or treatment claims', () => {
  for (const id of DETAIL_IDS) {
    const html = render(id);
    assert.doesNotMatch(html, /ยังไม่ยืนยัน|รอยืนยัน|กำลังตรวจ|ฉบับร่าง|ภาพร่าง|รอสูตร|source_ids|internal/, `${id}: status wording`);
    assert.doesNotMatch(html, /รักษา(?:สิว|ฝ้า)|สิวหาย|ฝ้าหาย|ฆ่าเชื้อ|(?:ซ่อม|ฟื้นฟู|สร้างใหม่).{0,6}เซลล์/, `${id}: claims to hold`);
    // A protection value appears only on the sunscreen page, and only as what brand material states.
    const spf = [...html.matchAll(/.{0,24}SPF ?\d+.{0,8}/g)].map(m => m[0]);
    if (id !== 'SU') assert.deepEqual(spf, [], `${id}: no SPF`);
    else assert.ok(spf.length && spf.every(line => /สื่อ Mediral ระบุ SPF 50 PA\+\+\+/.test(line)), 'SU: attributed to brand media');
  }
});

test('the public details file holds only public fields', () => {
  const text = read('data/details.json');
  assert.doesNotMatch(text, /source_ids|"internal"|claude-work|Sources\/|LINE_NOTE|\b[A-Z]{2}-K\d\b|\bTT0\d\b|\b290\b/);
  for (const product of details.products) {
    assert.deepEqual(Object.keys(product).sort(), ['benefits', 'brand_attribution', 'faq', 'fit', 'headline', 'how', 'id', 'ingredient_groups', 'ingredient_note', 'ingredients_heading', 'ingredients_intro', 'lead', 'name_notes', 'problem', 'role', 'role_in_set', 'sequence', 'short_name', 'size', 'texture', 'title']);
  }
});

test('each static page is readable before scripts: noindex, its name, the way back and the LINE link', () => {
  for (const id of DETAIL_IDS) {
    const html = read(`${id.toLowerCase()}/index.html`);
    const product = details.products.find(p => p.id === id);
    assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
    assert.match(html, new RegExp(`<body class="mr-detail-page" data-product="${id}">`));
    assert.ok(html.includes(product.short_name) && html.includes(product.problem));
    assert.match(html, new RegExp(`href="\\.\\./#step-${id}"`));
    assert.deepEqual([...new Set([...html.matchAll(/href="(https:\/\/lin[^"]+)"/g)].map(m => m[1]))], [routine.order.url]);
    assert.match(html, /<script type="module" src="\.\.\/js\/detail\.js"><\/script>/);
  }
});

test('every listed name is image-led: each card shows its picture, and a shared material picture never merges names', () => {
  for (const product of details.products) for (const group of product.ingredient_groups) for (const item of group.items) {
    assert.match(item.image || '', /^assets\/(botanicals|materials|experience)\/[a-z0-9-]+\.webp$/, `${product.id}: ${item.name} has its picture`);
  }
  const html = render('AC');
  assert.doesNotMatch(html, /<details class="mr-names"|mr-names__dot/, 'No closed lists, no bare dots');
  assert.equal((html.match(/class="mr-atlas__item"/g) || []).length, COUNTS.AC);
  assert.match(html, /ภาพส่วนผสมเป็นภาพประกอบชื่อหรือลักษณะวัตถุดิบ ไม่ใช่ภาพจากผู้ผลิต/, 'Pictures are illustrations');
});

test('each page tells one short sequence from its own sourced lines including the confirmed mousse ingredients', () => {
  for (const product of details.products) {
    const {sequence} = product;
    const names = new Set(product.ingredient_groups.flatMap(g => g.items.map(i => i.name)));
    for (const name of sequence.select.names || []) assert.ok(names.has(name), `${product.id}: ${name} is a listed name`);
    const html = render(product.id);
    assert.equal((html.match(/<li class="mr-beat mr-beat--/g) || []).length, 3, `${product.id}: three beats`);
    assert.match(html, new RegExp(`mr-seq--${sequence.rhythm}`));
    for (const benefit of product.benefits) assert.ok(html.includes(benefit.title), `${product.id}: care keeps "${benefit.title}"`);
  }
  const cl = details.products.find(p => p.id === 'CL').sequence;
  assert.equal(cl.select.names.length, 5, 'CL introduces the five source-listed hero ingredients');
  assert.match(render('CL'), /assets\/botanicals\/hibiscus-flower\.webp/);
  const copy = JSON.stringify(details.products.map(p => p.sequence));
  assert.doesNotMatch(copy, /ที่แบรนด์เลือกมาเล่า|คัดสรร|คัดพิเศษ|บริสุทธิ์|ธรรมชาติ ?100|จากธรรมชาติทั้งหมด|สกัดเย็น|สกัดด้วย|เก็บเกี่ยว|เข้มข้น|%/, 'No selection, purity, harvest, method or concentration claim');
});

test('motion is optional: reduced motion or no observer leaves every part shown and nothing waiting', async () => {
  const {initDetailMotion} = await import(new URL('../../mediral/js/detail-motion.js', import.meta.url));
  const classList = () => { const set = new Set(); return {add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c)}; };
  const targets = [1, 2, 3].map(() => ({classList: classList()}));
  const root = {querySelectorAll: () => targets};
  const saved = {document: globalThis.document, matchMedia: globalThis.matchMedia, IntersectionObserver: globalThis.IntersectionObserver};
  try {
    globalThis.document = {documentElement: {classList: classList()}};
    globalThis.matchMedia = () => ({matches: true, addEventListener() {}});
    globalThis.IntersectionObserver = class { observe() { throw new Error('no observing under reduced motion'); } };
    initDetailMotion(root);
    assert.ok(targets.every(t => t.classList.contains('is-in')), 'Everything is shown');
    assert.equal(document.documentElement.classList.contains('mr-reveal'), false, 'Nothing is held back');
  } finally { Object.assign(globalThis, saved); }
  const css = read('mediral.css');
  const hidden = [...css.matchAll(/[^{}]*:not\(\.is-in\)[^{]*\{[^}]*opacity:0/g)].map(m => m[0]);
  assert.ok(hidden.length && hidden.every(rule => /\.mr-reveal /.test(rule)), 'Only a running reveal hides anything');
  const motion = css.slice(css.indexOf('@media (prefers-reduced-motion:no-preference){'));
  assert.ok(hidden.every(rule => motion.includes(rule.trim())), 'And only when motion is allowed');
});
