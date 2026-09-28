import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const site = join(root, 'mediral');
const read = path => readFileSync(path, 'utf8');
const routine = () => JSON.parse(read(join(site, 'data/routine.json')));
const html = () => read(join(site, 'index.html'));

function attributes(tag) {
  const result = {};
  const pattern = /([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(pattern)) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return result;
}
const tags = (source, name) => [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(m => attributes(m[0]));
function walkFiles(directory) {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}
function assertFile(path, context) {
  let stat;
  try { stat = statSync(path); } catch { assert.fail(`${context}: missing ${relative(root, path)}`); }
  assert.ok(stat.isFile() && stat.size > 0, `${context}: expected a non-empty file at ${relative(root, path)}`);
}
function localReference(reference, owner) {
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return null;
  const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  const path = clean.startsWith('/') ? resolve(root, `.${clean}`) : resolve(dirname(owner), clean);
  assert.ok(path.startsWith(`${root}${sep}`), `Reference escapes repository: ${reference}`);
  return path;
}
function imageRefs(value, pointer = '') {
  if (Array.isArray(value)) return value.flatMap((item, i) => imageRefs(item, `${pointer}/${i}`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, item]) =>
    key === 'image' ? (item === null ? [] : [{reference: item, pointer: `${pointer}/image`}]) : imageRefs(item, `${pointer}/${key}`));
}
function importsIn(source) {
  const refs = new Set();
  const declarations = /(?:^|[;\n])\s*(?:import|export)\s+(?:[^;"']*?\s+from\s*)?(["'])([^"']+)\1/gm;
  const dynamic = /\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g;
  for (const pattern of [declarations, dynamic]) for (const m of source.matchAll(pattern)) refs.add(m[2]);
  return refs;
}
function importMap(source) {
  const maps = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m => attributes(m[1]).type === 'importmap');
  assert.equal(maps.length, 1, 'The browser must have exactly one parseable import map');
  return JSON.parse(maps[0][2]).imports ?? {};
}
function modulePath(specifier, owner, mappings) {
  if (/^(?:\.|\/)/.test(specifier)) return localReference(specifier, owner);
  const key = Object.keys(mappings).filter(k => k === specifier || (k.endsWith('/') && specifier.startsWith(k))).sort((a, b) => b.length - a.length)[0];
  assert.ok(key, `${relative(root, owner)} imports unresolved bare specifier ${specifier}`);
  return localReference(mappings[key] + (key.endsWith('/') ? specifier.slice(key.length) : ''), join(site, 'index.html'));
}

test('the routine is the five chosen steps, in the owner-selected order', () => {
  const {steps} = routine();
  assert.deepEqual(steps.map(s => s.id), ['CL', 'AC', 'BR', 'SU', 'PO']);
  assert.deepEqual(steps.map(s => s.order), [1, 2, 3, 4, 5]);
  for (const s of steps) {
    for (const field of ['headline', 'nick', 'verb', 'verb_en', 'for_you', 'how', 'image_note', 'ingredients_note']) {
      assert.ok(typeof s[field] === 'string' && s[field].trim(), `${s.id}.${field} is required`);
    }
    assert.ok(Array.isArray(s.when) && s.when.length, `${s.id} says when it is used`);
    assert.ok(s.featured.length <= 5, `${s.id}: only a few names per screen`);
  }
});

test('the mousse uses the current clover-reference draft without inheriting the old formula or size', () => {
  const cl = routine().steps.find(s => s.id === 'CL');
  assert.equal(cl.image, 'assets/pack/cl-clover-front-v2.webp', 'Use the draft checked against the current clover-label poster');
  assert.equal(cl.image_status, 'ai-draft', 'The reconstructed package is not a literal product photograph');
  assert.equal(cl.size, null, 'The reference image does not verify the current mousse size');
  assert.match(cl.source_image_note, /โปสเตอร์/, 'Keep the reference type attached to the package draft');
  assert.match(cl.source_image_note, /2026-09-28/, 'Identify when the current reference was received');
  assert.match(cl.source_image_note, /โคลเวอร์/, 'Distinguish this reference from the old rose-label pack');
  assert.equal(cl.ingredients_status, 'pending-current-sku');
  assert.deepEqual(cl.featured, [], 'The old Natural Blossom list must not be attached to the current mousse');
  assert.deepEqual(cl.ingredients, []);
  for (const path of walkFiles(site).filter(p => ['.html', '.js', '.json', '.css'].includes(extname(p)))) {
    if (relative(site, path).startsWith(`assets${sep}`) || relative(site, path).startsWith(`vendor${sep}`)) continue;
    assert.doesNotMatch(read(path), /cl-front-ai-draft-hold/, `${relative(root, path)} must not use the held mousse draft`);
  }
});

test('ingredient explanations retain their source and separate individual from group-only claims', () => {
  for (const step of routine().steps) {
    for (const ingredient of [...step.featured, ...step.ingredients]) {
      assert.ok(ingredient.benefit?.trim(), `${step.id}: ${ingredient.name} needs a readable role or limitation`);
      assert.ok(ingredient.benefit_source?.trim(), `${step.id}: ${ingredient.name} needs attribution`);
      assert.ok(['brand-claim', 'identity-only'].includes(ingredient.benefit_status));
    }
    for (const ingredient of step.featured) assert.ok(ingredient.image, 'A focused material must have an available illustration');
  }
  const powder = routine().steps.find(s => s.id === 'PO');
  assert.ok(powder.featured.every(i => i.benefit_status === 'identity-only'), 'Group-level powder copy is not individual efficacy evidence');
});

test('the sunscreen shows the softened web draft, with its lettering caveat in view', () => {
  const su = routine().steps.find(s => s.id === 'SU');
  assert.equal(su.image, 'assets/pack/su-front-web.webp', 'The unsoftened draft makes AI-lettered PA marks legible');
  assert.match(su.visible_note, /AI/);
  assert.ok(!su.featured.some(f => /mineral/.test(f.image)), 'An abstract powder must not be captioned as the UV filters');
});

test('ingredient groups cover every source-listed name once without treating aliases as extra actives', () => {
  for (const step of routine().steps) {
    const names = [...step.featured, ...step.ingredients].map(i => i.name);
    const grouped = step.ingredient_groups.flatMap(g => g.ingredientNames);
    assert.equal(new Set(names).size, names.length, `${step.id}: no duplicated named entry`);
    assert.equal(new Set(grouped).size, grouped.length, `${step.id}: each name belongs to one reading group`);
    assert.deepEqual([...grouped].sort(), [...names].sort(), `${step.id}: no source-listed name is omitted from the visible groups`);
    for (const group of step.ingredient_groups) {
      assert.ok(group.title && group.summary && group.source, `${step.id}: groups explain their role and attribution`);
    }
  }
  const sun = routine().steps.find(s => s.id === 'SU');
  const names = [...sun.featured, ...sun.ingredients].map(i => i.name);
  assert.equal(names.filter(n => /ไฮยา/.test(n)).length, 1, 'HA aliases share one source entry');
  assert.ok(!names.some(n => /Giga White/.test(n)), 'The botanical blend is a group, not an extra counted ingredient');
  assert.equal(sun.ingredient_groups.find(g => g.id === 'su-alpine-botanicals').ingredientNames.length, 7);
});

test('when each piece is used comes from the brand-stated method, with no invented sequence', () => {
  const {steps, use_time_labels: labels} = routine();
  const byId = Object.fromEntries(steps.map(s => [s.id, s]));
  assert.deepEqual(Object.keys(labels), ['morning', 'evening', 'reapply', 'makeup']);
  for (const s of steps) {
    assert.ok(s.use_times.every(key => key in labels), `${s.id}: known time keys only`);
    assert.ok(s.role_short?.trim(), `${s.id}: the opening map needs a short role`);
  }
  assert.deepEqual(byId.CL.use_times, [], 'The current mousse label is the only method source');
  assert.deepEqual(byId.CL.when, ['ตามฉลาก']);
  for (const id of ['AC', 'BR']) {
    assert.deepEqual(byId[id].use_times, ['morning', 'evening']);
    assert.deepEqual(byId[id].when, ['เช้า', 'เย็น']);
    assert.match(byId[id].how, /เช้าและเย็น/);
    assert.equal(byId[id].compare_points.length, 3, `${id}: a short, comparable role summary`);
  }
  assert.deepEqual(byId.SU.use_times, ['morning', 'reapply']);
  assert.match(byId.SU.how, /ทาซ้ำ/);
  assert.deepEqual(byId.PO.use_times, ['makeup']);
  assert.deepEqual(byId.PO.when, ['เมื่อแต่งหน้า']);
  assert.ok(!steps.some(s => s.compare_points && !['AC', 'BR'].includes(s.id)), 'Only the two serums are compared');
});

test('the page order explains roles; it is not presented as a verified application order', () => {
  const expected = 'หน้านี้เรียงให้เห็นบทบาทของทั้ง 5 ชิ้น วิธีใช้จริงให้ยึดฉลากสินค้า';
  assert.equal(routine().order_note, expected);
  const copy = [html(), read(join(site, 'js/main.js')), read(join(site, 'js/card.js'))].join('\n');
  assert.ok(html().includes(expected), 'The static page repeats the correction without JavaScript');
  assert.doesNotMatch(copy, /เล่าเรื่องตามโปสเตอร์|ตามโปสเตอร์ชุดของแบรนด์|ตามลำดับรูทีน/);
});

test('the sales path: why and roles, serum comparison, product chapters, offer, then optional atlas', () => {
  const source = html();
  const at = id => source.indexOf(`id="${id}"`);
  const order = ['routine', 'serums', 'lab-film', 'step-CL', 'story', 'set', 'ingredients'].map(at);
  assert.ok(order.every(i => i > 0), 'Every chapter exists');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'The offer precedes the complete ingredient library');
  const opening = source.slice(at('routine'), at('serums'));
  for (const id of ['CL', 'AC', 'BR', 'SU', 'PO']) assert.match(opening, new RegExp(`href="#step-${id}"`));
  assert.match(opening, /href="#set"[^>]*data-cta="offer"/, 'A direct route to the offer in the opening');
  assert.match(opening, /data-slot="hero-offer"/);
  assert.match(opening, /ไม่จำเป็นต้องใช้ครบ/, 'The opening never says every reader needs all five');
  assert.equal((source.match(/data-slot="(?:offer|buy-link|buy-hint)"/g) || []).length, 3, 'One offer, one checkout control, one hint');
  assert.match(source.slice(at('serums'), at('lab-film')), /ไม่ใช่คำแนะนำให้ทาหลายชิ้นซ้อนกัน/);
});

test('an enabled lab film ships a real faststart-ready MP4 and its poster, both deployable', () => {
  const film = html().match(/<section\b[^>]*id="lab-film"[^>]*>/)?.[0] || '';
  if (!film.includes('data-film-ready="true"')) return;
  const clip = readFileSync(join(site, 'assets/motion/lab-film-10s.mp4'));
  assert.equal(clip.toString('ascii', 4, 8), 'ftyp', 'An ISO MP4 container');
  assert.ok(clip.length < 3_000_000, 'Keep the deferred clip light for phones');
  const head = clip.subarray(0, 64 * 1024).toString('latin1');
  assert.ok(head.indexOf('moov') >= 0 && head.indexOf('moov') < head.indexOf('mdat'), 'moov precedes mdat so playback can start early');
  const poster = readFileSync(join(site, 'assets/motion/lab-film-poster.webp'));
  assert.equal(poster.toString('ascii', 8, 12), 'WEBP');
  const ignore = [read(join(root, '.gitignore')), read(join(root, '.vercelignore'))].join('\n').split('\n').map(l => l.trim());
  assert.ok(!ignore.some(line => line && /mediral\/assets\/motion|\.mp4$/.test(line)), 'The film is not excluded from git or deployment');
});

test('internal manifests and unsoftened drafts stay out of git', () => {
  const ignore = read(join(root, '.gitignore')).split('\n').map(l => l.trim());
  for (const line of ['mediral/assets/evidence/', 'mediral/assets/*.md', 'mediral/assets/*.json', 'mediral/assets/pack/cl-front-ai-draft-hold.webp', 'mediral/assets/pack/su-front.webp']) {
    assert.ok(ignore.includes(line), `.gitignore should list ${line}`);
  }
});

test('pack drafts are labelled as drafts wherever they appear', () => {
  const {steps} = routine();
  for (const s of steps.filter(s => s.image)) {
    assert.equal(s.image_status, 'ai-draft', `${s.id}: status must state the pack is an AI draft`);
    assert.match(s.image_note, /AI ฉบับร่าง/, `${s.id}: the visible note must say AI draft`);
  }
  const source = html();
  const stageNote = source.match(/<p\b[^>]*class="mr-stage__note"[^>]*>([\s\S]*?)<\/p>/)?.[1] || '';
  assert.match(stageNote, /ภาพแพ็ก/, 'The stage identifies the package illustrations before JavaScript');
  assert.match(stageNote, /AI/, 'The stage identifies generated imagery');
  assert.match(source, /ภาพแพ็ก[^<]*AI ฉบับร่าง[^<]*ไม่ใช่ฉลากต้นฉบับ/, 'The static HTML explains the package draft limitation');
});

test('copy leads with each step’s role and avoids drug-like or unverified claims', () => {
  const {steps} = routine();
  const heads = steps.map(s => s.headline).join(' ');
  for (const word of ['ล้าง', 'สิว', 'หมองคล้ำ', 'กันแดด', 'ปกปิด']) assert.ok(heads.includes(word), `Headlines should name the role: ${word}`);
  const copy = [html(), read(join(site, 'data/routine.json')), read(join(site, 'js/main.js')), read(join(site, 'js/card.js'))].join('\n');
  const banned = /(melasma|anti[- ]?acne|stem ?x?cell|สเต็มเซลล์|รักษา(?:สิว|ฝ้า|ได้)|สิวหาย|ฝ้าหาย|สลายฝ้า|ปราบฝ้า|ฆ่าเชื้อ|จบเชื้อ|ล็อก ?DNA|ซ่อมเซลล์|ไม่มีสารเคมี|ออร์แกนิก ?100|organic 100|เหมาะกับทุกสีผิว|ทุกสีผิว|ไม่แพ้|แพทย์รับรอง|USDA|ECOCERT|SPF ?50|PA\+{3}|SPF ?30|90%|95%|144 ชั่วโมง|12 ชั่วโมง|เสริมฤทธิ์|synerg)/iu;
  const hit = copy.match(banned);
  assert.equal(hit, null, `Public copy contains a claim to hold: ${hit?.[0]}`);
});

test('the set offer is poster evidence with dates, never a live or discounted price', () => {
  const {set} = routine();
  assert.equal(set.poster.price, 1899);
  assert.equal(set.poster.valid_from, '2026-09-21');
  assert.equal(set.poster.valid_to, '2026-09-30');
  assert.equal(set.poster.status, 'poster-only');
  assert.match(set.poster.note, /ยังไม่ยืนยัน/);
  const copy = [html(), read(join(site, 'data/routine.json'))].join('\n');
  assert.doesNotMatch(copy, /8,?540|\b820\b|\b880\b|45%|฿60|max ฿60/, 'Other offers, strike prices and coupons stay out of the set story');
});

test('pending Affiliate checkout stays inert in data and in the pre-JavaScript HTML', () => {
  const {buy} = routine();
  assert.equal(buy.affiliate_url, null);
  assert.equal(buy.status, 'pending');
  const links = tags(html(), 'a').filter(t => t['data-slot'] === 'buy-link');
  assert.equal(links.length, 1);
  assert.equal(links[0]['aria-disabled'], 'true');
  assert.ok(!links[0].href, 'An unverified purchase button must not navigate anywhere');
});

test('every referenced image is a real local WebP', () => {
  const entry = join(site, 'index.html');
  const refs = imageRefs(routine());
  assert.ok(refs.length >= 20, 'Check botanicals as well as the pack images');
  for (const t of tags(html(), 'img')) refs.push({reference: t.src, pointer: 'HTML img'});
  for (const {reference, pointer} of refs) {
    const path = localReference(reference, entry);
    assert.ok(path?.startsWith(`${site}${sep}`), `${pointer}: expected a local Mediral image`);
    assertFile(path, pointer);
    assert.equal(extname(path), '.webp', `${relative(root, path)} should be WebP`);
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('the page, lazy story scene and summary card have a complete local dependency graph', () => {
  const entry = join(site, 'index.html');
  const source = html();
  const mappings = importMap(source);
  const queue = tags(source, 'script').filter(t => t.src && t.type === 'module').map(t => localReference(t.src, entry));
  assert.ok(queue.length, 'There must be a local module entry point');
  for (const link of tags(source, 'link').filter(t => t.rel?.split(/\s+/).includes('stylesheet'))) {
    const path = localReference(link.href, entry);
    if (path) assertFile(path, 'Stylesheet');
  }
  const visited = new Set();
  while (queue.length) {
    const owner = queue.pop();
    if (visited.has(owner)) continue;
    assertFile(owner, 'ES module');
    visited.add(owner);
    for (const spec of importsIn(read(owner))) queue.push(modulePath(spec, owner, mappings));
  }
  for (const name of ['story.js', 'card.js']) assert.ok(visited.has(join(site, 'js', name)), `Check the lazy ${name}`);
  assert.ok([...visited].some(p => p.startsWith(join(site, 'vendor') + sep)), 'three must resolve locally');
  const vendor = JSON.parse(read(join(site, 'vendor/VENDOR.json')));
  const exported = new Set(vendor.exports);
  const used = [...read(join(site, 'js/story.js')).matchAll(/import\s*\{([^}]+)\}\s*from\s*'three'/g)]
    .flatMap(m => m[1].split(',').map(s => s.trim()).filter(Boolean));
  for (const name of used) assert.ok(exported.has(name), `The vendored three subset does not export ${name}`);
});

test('first-party browser JavaScript parses', () => {
  for (const path of walkFiles(join(site, 'js')).filter(p => extname(p) === '.js')) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', path], {stdio: 'pipe'}), `${relative(root, path)} should parse`);
  }
});

test('internal partner purchase cost and private notes are absent from the published folder', () => {
  const files = walkFiles(site).filter(p => !relative(site, p).startsWith(`vendor${sep}`) && ['.html', '.json', '.js', '.md', '.css', '.txt'].includes(extname(p)));
  for (const path of files) {
    const content = read(path);
    assert.doesNotMatch(content, /(?:฿\s*290(?:[.,]00)?\b|\b290(?:[.,]00)?\s*(?:บาท|THB)|ราคาพันธมิตร|partner[_ -]?(?:price|cost))/iu,
      `${relative(root, path)} exposes internal partner pricing`);
    if (extname(path) === '.json') {
      const values = v => v && typeof v === 'object' ? Object.values(v).flatMap(values) : [v];
      assert.ok(!values(JSON.parse(content)).some(v => v === 290 || v === '290'), `${relative(root, path)} contains the internal cost`);
    }
  }
});

function matchesRoute(source, pathname) {
  if (source === pathname) return true;
  if (/\/:\w+\*$/.test(source)) {
    const prefix = source.replace(/\/:\w+\*$/, '');
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
  return false;
}

test('page HTML and route responses declare noindex, and dev/reference files do not deploy', () => {
  const robots = tags(html(), 'meta').filter(t => t.name?.toLowerCase() === 'robots');
  assert.ok(robots.some(t => t.content?.toLowerCase().split(/[\s,]+/).includes('noindex')));
  const config = JSON.parse(read(join(root, 'vercel.json')));
  assert.ok(config.headers.some(r => r.source === '/mediral/'
    && r.headers.some(h => h.key.toLowerCase() === 'x-robots-tag' && h.value.includes('noindex'))),
  'The directory entry needs an explicit rule: production did not apply the wildcard header there');
  for (const pathname of ['/mediral', '/mediral/', '/mediral/index.html', '/mediral/data/routine.json', '/mediral/js/story.js']) {
    const values = config.headers.filter(r => !r.has?.length && matchesRoute(r.source, pathname)).flatMap(r => r.headers)
      .filter(h => h.key.toLowerCase() === 'x-robots-tag').map(h => h.value.toLowerCase().split(/[\s,]+/));
    assert.ok(values.some(v => v.includes('noindex')), `${pathname} needs X-Robots-Tag noindex`);
  }
  assert.ok(config.redirects.some(r => r.source === '/mediral' && r.destination === '/mediral/'));
  const ignore = read(join(root, '.vercelignore'));
  for (const line of ['tests/mediral/', 'docs/mediral/', 'mediral/assets/evidence/', 'mediral/assets/*.md', 'mediral/assets/*.json', 'mediral/assets/pack/cl-front-ai-draft-hold.webp', 'mediral/assets/pack/su-front.webp']) {
    assert.ok(ignore.split('\n').map(l => l.trim()).includes(line), `.vercelignore should exclude ${line}`);
  }
});
