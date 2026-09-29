import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

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
function modulePath(specifier, owner) {
  assert.ok(/^(?:\.|\/)/.test(specifier), `${relative(root, owner)} imports a bare specifier ${specifier}; the page has no import map`);
  return localReference(specifier, owner);
}
const steps = () => routine().steps;
const PAGES = ['cl', 'ac', 'br', 'su', 'po'];
const publicCode = () => ['index.html', 'js/main.js', 'js/score.js', 'js/detail-view.js', 'js/detail.js', ...PAGES.map(p => `${p}/index.html`)].map(f => read(join(site, f))).join('\n');
const details = () => JSON.parse(read(join(site, 'data/details.json')));
const SCREENSHOT = {path: 'assets/trust/owner-chat-original.jpg', sha256: '0bbe1a1155b323d4d58d11269ddbb5b4b0d98532f8919f0da1f1285a86894b92'};


test('the routine is the five chosen steps, in the owner-selected order', () => {
  assert.deepEqual(steps().map(s => s.id), ['CL', 'AC', 'BR', 'SU', 'PO']);
  assert.deepEqual(steps().map(s => s.order), [1, 2, 3, 4, 5]);
  for (const s of steps()) {
    for (const field of ['headline', 'nick', 'verb', 'for_you', 'how', 'ingredients_note', 'image_alt']) {
      assert.ok(typeof s[field] === 'string' && s[field].trim(), `${s.id}.${field} is required`);
    }
    assert.ok(Array.isArray(s.when) && s.when.length, `${s.id} says when it is used`);
  }
});

test('the mousse uses the current clover-reference draft without inheriting the old formula or size', () => {
  const cl = steps().find(s => s.id === 'CL');
  assert.equal(cl.image, 'assets/pack/cl-clover-front-v2.webp');
  assert.equal(cl.image_status, 'ai-draft', 'The reconstructed package is not a literal product photograph');
  assert.equal(cl.size, null, 'The reference image does not verify the current mousse size');
  assert.equal(cl.ingredients_status, 'pending-current-sku');
  assert.deepEqual(cl.featured, [], 'The old Natural Blossom list must not be attached to the current mousse');
  assert.deepEqual(cl.ingredients, []);
  assert.deepEqual(cl.scene.waves, [], 'No mousse ingredient waves while its formula is unconfirmed');
  assert.doesNotMatch(JSON.stringify(cl.scene), /ชบา|ลิลลี่|SLS|80 ?ml|ดีท็อกซ์|ไม่แห้ง|กันน้ำ/, 'No old rose-pack formula or claims');
  for (const path of walkFiles(site).filter(p => ['.html', '.js', '.json', '.css'].includes(extname(p)))) {
    if (relative(site, path).startsWith(`assets${sep}`)) continue;
    assert.doesNotMatch(read(path), /cl-front-ai-draft-hold/, `${relative(root, path)} must not use the held mousse draft`);
  }
});

test('ingredient explanations retain their source and separate individual from group-only claims', () => {
  for (const step of steps()) {
    for (const ingredient of [...step.featured, ...step.ingredients]) {
      assert.ok(ingredient.benefit?.trim(), `${step.id}: ${ingredient.name} needs a readable role or limitation`);
      assert.ok(ingredient.benefit_source?.trim(), `${step.id}: ${ingredient.name} needs attribution`);
      assert.ok(['brand-claim', 'identity-only'].includes(ingredient.benefit_status));
    }
  }
  const powder = steps().find(s => s.id === 'PO');
  assert.ok([...powder.featured, ...powder.ingredients].every(i => i.benefit_status === 'identity-only'), 'Group-level powder copy is not individual efficacy evidence');
});

test('ingredient groups cover every source-listed name once without treating aliases as extra actives', () => {
  const counts = {CL: 0, AC: 24, BR: 18, SU: 14, PO: 18};
  for (const step of steps()) {
    const names = [...step.featured, ...step.ingredients].map(i => i.name);
    assert.equal(names.length, counts[step.id], `${step.id}: preserve the full source-list display inventory`);
    const grouped = step.ingredient_groups.flatMap(g => g.ingredientNames);
    assert.equal(new Set(grouped).size, grouped.length, `${step.id}: each name belongs to one reading group`);
    assert.deepEqual([...grouped].sort(), [...names].sort(), `${step.id}: no source-listed name is omitted`);
  }
  const sun = steps().find(s => s.id === 'SU');
  const names = [...sun.featured, ...sun.ingredients].map(i => i.name);
  assert.equal(names.filter(n => /ไฮยา/.test(n)).length, 1, 'HA aliases share one source entry');
  assert.ok(!names.some(n => /Giga White/.test(n)), 'The botanical blend is a group, not an extra counted ingredient');
  assert.equal(sun.ingredient_groups.find(g => g.id === 'su-alpine-botanicals').ingredientNames.length, 7);
});

test('when each piece is used retains the source method without serum layering instructions', () => {
  const byId = Object.fromEntries(steps().map(s => [s.id, s]));
  assert.deepEqual(byId.CL.when, ['ตามฉลาก']);
  for (const id of ['AC', 'BR']) {
    assert.deepEqual(byId[id].when, ['เช้า', 'เย็น']);
    assert.doesNotMatch(`${byId[id].verb} ${byId[id].how}`, /ชั้นที่\s*[12]|ต่อจากเซรั่ม|ทา(?:ก่อน|หลัง)เซรั่ม|รอ\s*\d+|\d+\s*หยด/, `${id}: no invented layering, waits or dose`);
  }
  assert.match(byId.SU.how, /ทาซ้ำ/);
  assert.equal(byId.PO.size, null, 'The powder weight is not established by the source');
  assert.equal(byId.PO.size_note, 'ดูเฉด น้ำหนัก และรายละเอียดตัวเลือกที่ร้าน', 'Finished guidance, not a pending note');
  assert.match(byId.SU.size_note, /SPF\/PA ให้ดูบนฉลาก/, 'Protection values are read from the tube received');
});

test('scroll-selling beats use attributed roles and only names present in the product catalogue', () => {
  const ids = new Set();
  for (const step of steps()) {
    const names = new Set([...step.featured, ...step.ingredients].map(i => i.name));
    assert.ok(step.selling?.source?.trim(), `${step.id}: the short story needs source attribution`);
    for (const beat of step.selling.beats) {
      assert.ok(!ids.has(beat.id), `Duplicate selling beat ${beat.id}`);
      ids.add(beat.id);
      for (const name of beat.names) assert.ok(names.has(name), `${beat.id}: unknown ingredient ${name}`);
      if (step.id === 'CL') assert.deepEqual(beat.names, [], 'Mousse atmosphere must not invent a current formula');
    }
  }
});

// The finished-copy table this release was written from (private copy review, 2026-09-29).
const HEADLINES = {
  CL: [['ล้างวันนี้ออก', 'ก่อนเริ่มดูแล'], 'มูสล้างหน้าและเครื่องสำอาง เริ่มดูแลเมื่อกลับถึงบ้าน', 'กลับถึงบ้าน ผิวผ่านมาทั้งวัน'],
  AC: [['ดูแลความมัน', 'เติมความชุ่มชื้น'], 'เซรั่มสำหรับผิวที่เป็นสิวง่าย บางเบา ซึมไว ไม่เหนอะหนะ', 'สิวง่าย แต่ไม่อยากเหนอะหนะ'],
  BR: [['ให้สีผิว', 'ดูสม่ำเสมอ'], 'ดูแลความหมองคล้ำและความเรียบเนียน ด้วยเซรั่มบางเบา เกลี่ยง่าย', 'ผิวดูหมอง สีผิวดูไม่สม่ำเสมอ'],
  SU: [['กันแดดเนื้อเซรั่ม', 'เบาสบายผิว'], 'เกลี่ยง่าย พร้อมไฮยาเติมความชุ่มชื้น และ Giga White® พืช 7 ชนิด', 'ไม่ชอบกันแดดหนักหน้า?'],
  PO: [['ปกปิดรอย', 'ให้ผิวดูเนียน'], 'แป้งพัฟเนื้อละเอียด บางเบา เกลี่ยง่าย สำหรับวันที่อยากแต่งผิว', 'วันนี้อยากปกปิดรอย'],
};
test('each chapter says its problem, then a two-line promise and one support line, in the reviewed words', () => {
  const grammars = new Set();
  for (const step of steps()) {
    const [headline, support, problem] = HEADLINES[step.id];
    assert.deepEqual(step.scene.headline, headline, `${step.id}: headline`);
    assert.equal(step.scene.support, support, `${step.id}: support`);
    assert.equal(step.scene.problem, problem, `${step.id}: the reader's problem opens the chapter`);
    assert.ok(!grammars.has(step.scene.grammar), `${step.id}: its own visual grammar`);
    grammars.add(step.scene.grammar);
    assert.doesNotMatch(JSON.stringify(step.scene), /SPF|PA\+/, `${step.id}: no protection value in the story copy`);
  }
});

test('benefit waves lead with the benefit and name only catalogued ingredients, pairing each role correctly', () => {
  const expected = {
    AC: [['ปลอบประโลม', 'ac-soothe'], ['สมดุลความมัน', 'ac-balance'], ['เติมความชุ่มชื้น', 'ac-hydrate']],
    BR: [['ผิวดูกระจ่างใส', 'br-even'], ['สมดุลผิว', 'br-balance'], ['ผิวดูเรียบเนียน', 'br-balance']],
    SU: [['ปกป้องผิวจากแดด', 'su-filters'], ['เติมความชุ่มชื้น', 'su-hydrate'], ['สีผิวดูสม่ำเสมอ', 'su-giga']],
    PO: [['บางเบา เกลี่ยง่าย', 'po-powder-oil'], ['ชุ่มชื้น · ปลอบประโลม', 'po-hydrate']],
  };
  for (const step of steps().filter(s => expected[s.id])) {
    assert.deepEqual(step.scene.waves.map(w => [w.label, w.beat]), expected[step.id], `${step.id}: waves`);
    for (const w of step.scene.waves) {
      assert.ok(step.selling.beats.some(b => b.id === w.beat), `${step.id}: ${w.label} belongs to a real beat`);
      if (w.split) assert.ok(w.split > 0 && w.split < w.label.length, `${step.id}: a split lands inside the phrase`);
    }
  }
  const br = steps().find(s => s.id === 'BR').scene.waves;
  assert.deepEqual(br[1].show, ['โพรไบโอติก'], 'Probiotic is paired with balance');
  assert.deepEqual(br[2].show, ['บากูชิล'], 'Bakuchiol is paired with smoothness');
  const ac = steps().find(s => s.id === 'AC').scene.waves[1];
  assert.equal(ac.label.slice(0, ac.split), 'สมดุล', 'The glass stem stands at a real word boundary');
});

test('general acne knowledge sits behind its own link, attributed to NHS and NIAMS, never beside the promise', () => {
  const fact = steps().find(s => s.id === 'AC').fact;
  assert.equal(fact.status, 'general-fact');
  assert.equal(fact.label, 'ทำความเข้าใจผิวที่เป็นสิวง่าย');
  assert.ok(fact.links.every(link => /^https:\/\/(www\.nhs\.uk|www\.niams\.nih\.gov)\//.test(link.href)));
  assert.equal(steps().find(s => s.id === 'AC').scene.fact, undefined, 'The fact is not part of the story chapter');
});

test('native pack sizing has usable visible bounds for every draft', () => {
  for (const step of steps()) {
    const b = step.image_bounds;
    for (const key of ['x0', 'y0', 'x1', 'y1']) assert.ok(Number.isFinite(b[key]) && b[key] >= 0 && b[key] <= 1, `${step.id}.${key}`);
    assert.ok(b.x1 > b.x0 && b.y1 > b.y0 && b.aspect > 0, `${step.id}: non-empty pack bounds`);
  }
});

test('the page order explains roles; it is not presented as a verified application order', () => {
  assert.equal(routine().order_note, 'หน้านี้เรียงให้เห็นบทบาทของทั้ง 5 ชิ้น วิธีใช้จริงให้ยึดฉลากสินค้า');
  assert.match(html(), /วิธีใช้จริงให้ยึดฉลาก/, 'The static page retains label guidance without JavaScript');
});

test('the page runs from the opening through one story to one LINE close, with every piece a page of its own', () => {
  const source = html();
  const at = id => source.indexOf(`id="${id}"`);
  const order = ['story', 'routine', 'set', 'order'].map(at);
  assert.ok(order.every(i => i > 0), 'Every part exists');
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.equal(tags(source, 'section').find(t => t.id === 'story').class, 'mr-cinema', 'One cinema holds the whole story');
  const opening = source.slice(at('routine'), at('set'));
  assert.match(opening, /href="#step-CL"/, 'A way into the first chapter');
  assert.match(opening, /href="#order"[^>]*data-cta="order"/, 'A direct route to ordering');
  const packImages = tags(opening, 'img').filter(i => /assets\/pack\//.test(i.src || ''));
  assert.deepEqual(packImages.map(i => i.src).sort(), steps().map(s => s.image).sort(), 'All five packs paint before JavaScript');
  assert.match(opening, /<h1\b[^>]*>[\s\S]*จากล้างหน้า[\s\S]*ออกจากบ้าน[\s\S]*<\/h1>/);
  assert.match(opening, /ครบทุกขั้นในชุดเดียว · ใช้เฉพาะชิ้นที่ผิวต้องการ/, 'The set first, and nobody needs all five');
  assert.match(opening, /เซรั่มผิวเป็นสิวง่าย[\s\S]*เลือกบำรุง[\s\S]*เซรั่มผิวดูหมอง[\s\S]*เลือกบำรุง/, 'The two serums are told apart by what they are for, and chosen');
  for (const id of ['serums', 'ingredients', 'founder', 'relay']) assert.equal(at(id), -1, `#${id} is retired from the page`);
  for (const page of PAGES) assert.ok(read(join(site, page, 'index.html')).includes(`data-product="${page.toUpperCase()}"`), `/${page}/ exists`);
  assert.match(read(join(site, 'js/score.js')), /class="mr-foot__more" href="\$\{detailHref\(step\)\}"/, 'Each chapter’s last hold offers its page');
});

test('the colour route names every piece: number, colour, pack and role, in pack order, with no barrier claim', () => {
  const {steps: list, route} = routine();
  const opening = html().slice(html().indexOf('id="routine"'), html().indexOf('id="set"'));
  const rows = [...opening.matchAll(/<p class="mr-step mr-step--(\w+)" data-layer="hero\.s\d">([\s\S]*?)<\/p>/g)];
  assert.deepEqual(rows.map(r => r[1]), list.map(s => s.id.toLowerCase()), 'One whole line per piece, in pack order');
  for (const [i, [, , row]] of rows.entries()) {
    const step = list[i], text = row.replace(/<[^>]+>/g, '');
    for (const part of [`0${step.order}`, step.tone.word, step.route.name, step.route.role]) assert.ok(text.includes(part), `${step.id}: ${part}`);
  }
  assert.equal(list[0].tone.word, list[1].tone.word, 'CL and AC share white, so the number and name tell them apart');
  const code = [html(), ...['js/score.js', 'js/main.js', 'js/detail-view.js'].map(f => read(join(site, f))), JSON.stringify(route)].join('\n');
  assert.doesNotMatch(code, /PM ?2\.?5|มลพิษ|กันฝุ่น|ป้องกันฝุ่น|ฝุ่นละออง|anti[- ]?pollution|ความเข้มข้น/iu, 'A memory aid, not a dust barrier or a strength scale');
});

test('the real exchange is the authorized screenshot, unchanged, with exact quotes and a separate personal account', () => {
  const {exchange} = routine();
  const [teem, owner] = exchange.messages;
  assert.equal(teem.text, 'ได้ลองใช้แล้ว กลิ่นหอม สบายหน้ามากครับ ของดี น่าบอกต่อ ชอบที่มี 🍀 ด้วยครับ', 'Teem’s whole message, as sent');
  assert.equal(owner.text, 'ดีใจจังเลยครับที่น้องงทีมชอบ พี่ตั้งใจทำของที่ดีที่สุดให้ทุกคนเลย', 'The owner’s reply, spelling as sent');
  assert.equal(exchange.screenshot.src, SCREENSHOT.path);
  const bytes = readFileSync(join(site, SCREENSHOT.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), SCREENSHOT.sha256, 'The evidence file is the original, byte for byte');
  assert.equal(exchange.experience.text, 'หลังได้ลองใช้ ผมรู้สึกว่าสิวดีขึ้น');
  assert.equal(exchange.experience.note, 'ประสบการณ์ใช้ส่วนตัวของ Teem ผลของแต่ละคนแตกต่างกัน');
  assert.equal(exchange.experience.verbatim, false);
  assert.doesNotMatch(JSON.stringify(exchange), /หมอ|แพทย์|ผู้ก่อตั้ง|โรงงาน|ห้องแล็บ|รักษา|หายขาด/, 'No credential, cure or process claim');
  assert.doesNotMatch(publicCode(), /[★⭐]|\b\d\.\d\s*\/\s*5\b|รีวิวจากลูกค้า/, 'No stars, ratings or invented reviews');
});

test('the published page reads as finished: no backstage status, and provenance said once', () => {
  const code = publicCode();
  assert.doesNotMatch(code, /AI ฉบับร่าง|ภาพร่าง|กำลังตรวจ|รอสูตร|รอยืนยัน|ยังไม่ยืนยัน|ลิงก์ชุดนี้กำลังตรวจ/, 'Status language stays backstage');
  assert.doesNotMatch(read(join(site, 'js/main.js')) + read(join(site, 'js/score.js')), /image_note|visible_note|pack_note/, 'Draft notes are not rendered');
  const {provenance} = routine();
  assert.equal(provenance, 'ภาพสินค้าและฉากบางส่วนสร้างด้วย AI จากสื่อแบรนด์ ใช้เล่าแนวคิดของส่วนผสม รายละเอียดสินค้ายึดฉลากและหน้าร้าน');
  const footer = html().match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/)?.[1] || '';
  assert.equal(footer.split(provenance).length - 1, 1, 'The AI-imagery line appears once, in the footer');
  assert.equal(html().split(provenance).length - 1, 1);
  for (const s of steps()) assert.equal(s.image_status, 'ai-draft', `${s.id}: the data still records the package as an AI draft`);
});

test('one way to order: the myClover LINE from one config, no pretend checkout, a gated offer', () => {
  const {buy, set, order} = routine();
  assert.equal(buy.affiliate_url, null);
  assert.equal(buy.status, 'pending');
  assert.equal(order.channel, 'line');
  assert.equal(order.url, 'https://lin.ee/rlSlhzT', 'The myClover house LINE');
  assert.equal(order.status, 'verified');
  assert.equal(order.label, 'แอด LINE สั่งชุดดูแลผิว');
  assert.match(order.note, /การสั่งซื้อเกิดขึ้นเมื่อยืนยันในแชตเท่านั้น/, 'Opening LINE is not an order');
  const code = publicCode();
  const lineUrls = [...new Set([...code.matchAll(/https:\/\/(?:lin\.ee|line\.me)\/[^"'\s)]+/g)].map(m => m[0]))];
  assert.deepEqual(lineUrls, [order.url], 'Every static LINE link equals the config');
  assert.doesNotMatch(code, /oaMessage|line\.me\/R\//, 'No prefilled-message endpoint');
  assert.ok(!existsSync(join(site, 'js/card.js')), 'No saved-list picture any more');
  assert.doesNotMatch(code, /บันทึกรายการ|ใบสรุป|กดจ่าย|หน้าชำระ/, 'No save or payment framing');
  assert.equal(tags(html(), 'a').filter(t => t['data-slot'] === 'buy-link').length, 0);
  assert.equal(set.show_offer, false);
  assert.doesNotMatch(html(), /1,899|฿\s*1899|ของแถม/, 'No poster price or gift');
});

test('copy leads with each step’s role and avoids drug-like or unverified claims', () => {
  const heads = steps().map(s => s.headline).join(' ');
  for (const word of ['ล้าง', 'สิว', 'หมองคล้ำ', 'กันแดด', 'ปกปิด']) assert.ok(heads.includes(word), `Headlines should name the role: ${word}`);
  const copy = [publicCode(), JSON.stringify(steps().map(s => s.scene)), JSON.stringify(routine().exchange)].join('\n');
  const banned = /(melasma|anti[- ]?acne|stem ?x?cell|สเต็มเซลล์|รักษา(?:สิว|ฝ้า|ได้)|สิวหาย|ฝ้าหาย|สลายฝ้า|ปราบฝ้า|ฆ่าเชื้อ|จบเชื้อ|ล็อก ?DNA|ซ่อมเซลล์|ไม่มีสารเคมี|ออร์แกนิก ?100|organic 100|ทุกสีผิว|ไม่แพ้|แพทย์รับรอง|USDA|ECOCERT|SPF ?\d|PA\+|90%|95%|ชั่วโมง|เสริมฤทธิ์|synerg|สกัดบริสุทธิ์|สูตรเข้มข้น)/iu;
  const hit = copy.match(banned);
  assert.equal(hit, null, `Public copy contains a claim to hold: ${hit?.[0]}`);
});

test('AC’s film ships as a faststart-ready body cut in two sizes, with its poster and final lens', () => {
  const score = read(join(site, 'js/score.js'));
  for (const file of ['crown-body-1080.mp4', 'crown-body-720.mp4']) {
    assert.match(score, new RegExp(`assets/motion/${file.replace('.', '\\.')}`));
    const clip = readFileSync(join(site, 'assets/motion', file));
    assert.equal(clip.toString('ascii', 4, 8), 'ftyp');
    assert.ok(clip.length < 2_500_000, `${file} stays light`);
    const head = clip.subarray(0, 64 * 1024).toString('latin1');
    assert.ok(head.indexOf('moov') >= 0 && head.indexOf('moov') < head.indexOf('mdat'), `${file}: moov precedes mdat`);
  }
  for (const file of ['crown-poster.webp', 'crown-end.webp']) assert.equal(readFileSync(join(site, 'assets/motion', file)).toString('ascii', 8, 12), 'WEBP');
  assert.match(html(), /data-layer="fx.lens"[^>]*>[^<]*<img data-src="assets\/motion\/crown-end\.webp"/, 'The film’s lens bridges AC into BR');
  assert.deepEqual(readdirSync(join(site, 'assets/motion')).sort(), ['crown-body-1080.mp4', 'crown-body-720.mp4', 'crown-end.webp', 'crown-poster.webp'], 'Only what the page uses ships');
});

test('the film is material, not a player: muted, inline, deferred, no controls, no loop, a small source for phones', () => {
  const videos = tags(read(join(site, 'js/score.js')), 'video');
  assert.equal(videos.length, 1);
  for (const video of videos) {
    assert.ok(Object.hasOwn(video, 'muted') && Object.hasOwn(video, 'playsinline'));
    assert.equal(video.preload, 'none');
    assert.ok(!Object.hasOwn(video, 'controls') && !Object.hasOwn(video, 'loop'));
    assert.ok(!video.src, 'No eager video URL');
    assert.match(video['data-src'], /film\.src/);
    assert.match(video['data-src-small'], /film\.small/);
  }
  assert.doesNotMatch(publicCode(), /data-film-toggle|data-film-duration|mr-film__controls|เล่นอีกครั้ง/, 'No player interface');
});

test('experience imagery ships as consumed final WebP only, and every stylesheet and story image resolves', () => {
  const dir = join(site, 'assets/experience');
  const files = readdirSync(dir).sort();
  assert.deepEqual(files, ['m2-glass-cone.webp', 'm2-powder-veil.webp', 'm2-rinse-portal.webp', 'm2-serum-ribbon.webp', 'm2-teatree-foreground.webp',
    'p0-1-stage-tall.webp', 'p0-1-stage-wide.webp', 'p0-2-drop-amber.webp', 'p0-2-drop-clear.webp', 'p0-3-foam-band.webp']);
  const css = read(join(site, 'mediral.css'));
  const refs = [...css.matchAll(/url\(([^)]+)\)/g)].map(m => ({ref: m[1].replace(/["']/g, ''), owner: join(site, 'mediral.css')}));
  for (const file of ['index.html', 'js/score.js']) {
    for (const m of read(join(site, file)).matchAll(/(?:src|data-src)="((?:\$\{asset\(')?)(assets\/[^"'`)]+\.(?:webp|mp4))/g)) refs.push({ref: m[2], owner: join(site, 'index.html')});
    for (const m of read(join(site, file)).matchAll(/'(assets\/[^']+\.webp)'/g)) refs.push({ref: m[1], owner: join(site, 'index.html')});
  }
  const used = new Set();
  for (const {ref, owner} of refs) {
    const path = localReference(ref, owner);
    assertFile(path, ref);
    if (extname(path) === '.webp') assert.equal(readFileSync(path).toString('ascii', 8, 12), 'WEBP', `${ref} is WebP`);
    if (path.startsWith(dir)) used.add(relative(dir, path));
  }
  assert.deepEqual([...used].sort(), files, 'Every shipped experience image is actually used');
});

test('internal manifests and unsoftened drafts stay out of git', () => {
  const ignore = read(join(root, '.gitignore')).split('\n').map(l => l.trim());
  for (const line of ['mediral/assets/evidence/', 'mediral/assets/*.md', 'mediral/assets/*.json', 'mediral/assets/pack/cl-front-ai-draft-hold.webp', 'mediral/assets/pack/su-front.webp']) {
    assert.ok(ignore.includes(line), `.gitignore should list ${line}`);
  }
  // The one original shipped on purpose is the authorized chat screenshot, pinned by hash above.
  for (const path of walkFiles(site).filter(p => relative(site, p) !== SCREENSHOT.path)) {
    assert.doesNotMatch(relative(site, path), /\.(?:png|psd)$|manifest|prompts|qa-gallery|original|provenance|contact-sheet/i, `${relative(root, path)} is a private working file`);
  }
});

test('every referenced image is a real local WebP, except the authorized original screenshot', () => {
  const entry = join(site, 'index.html');
  const refs = imageRefs(routine());
  for (const t of tags(html(), 'img')) refs.push({reference: t.src || t['data-src'], pointer: 'HTML img'});
  for (const product of details().products) for (const g of product.ingredient_groups) for (const item of g.items) if (item.image) refs.push({reference: item.image, pointer: `${product.id} ${item.name}`});
  for (const {reference, pointer} of refs) {
    const path = localReference(reference, entry);
    assert.ok(path?.startsWith(`${site}${sep}`), `${pointer}: expected a local Mediral image`);
    assertFile(path, pointer);
    assert.equal(extname(path), '.webp', `${relative(root, path)} should be WebP`);
    assert.equal(readFileSync(path).toString('ascii', 8, 12), 'WEBP');
  }
  assert.equal(extname(routine().exchange.screenshot.src), '.jpg', 'The evidence keeps its original format');
});

test('the page and the five product pages have a complete local module graph without WebGL', () => {
  const entries = [join(site, 'index.html'), ...PAGES.map(p => join(site, p, 'index.html'))];
  const visited = new Set();
  for (const entry of entries) {
    const source = read(entry);
    assert.ok(!/type="importmap"/.test(source), 'No import map');
    const queue = tags(source, 'script').filter(t => t.src && t.type === 'module').map(t => localReference(t.src, entry));
    assert.equal(queue.length, 1, `${relative(root, entry)}: one module entry point`);
    for (const link of tags(source, 'link').filter(t => t.rel?.split(/\s+/).includes('stylesheet'))) {
      const path = localReference(link.href, entry);
      if (path) assertFile(path, 'Stylesheet');
    }
    while (queue.length) {
      const owner = queue.pop();
      if (visited.has(owner)) continue;
      assertFile(owner, 'ES module');
      visited.add(owner);
      for (const spec of importsIn(read(owner))) queue.push(modulePath(spec, owner));
    }
  }
  for (const name of ['main.js', 'cinema.js', 'score.js', 'lab-film.js', 'detail.js', 'detail-view.js']) assert.ok(visited.has(join(site, 'js', name)), `${name} is reachable`);
  assert.ok(!walkFiles(site).some(p => /story\.js$|three\.module|card\.js$/.test(p)), 'Retired modules are gone');
});

test('reduced motion and short screens start in normal flow before the module runs', () => {
  const inline = [...html().matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(inline.length, 1);
  assert.match(inline[0], /prefers-reduced-motion: reduce\), \(max-height: 520px\)/);
  assert.match(inline[0], /mr-flow/);
  assert.match(read(join(site, 'js/main.js')), /matchMedia\('\(prefers-reduced-motion: reduce\), \(max-height: 520px\)'\)/, 'The controller uses the same query');
  const css = read(join(site, 'mediral.css'));
  assert.match(css, /\.mr-flow \.mr-cinema\{height:auto\}/);
  assert.match(css, /\.mr-flow \.mr-cinema__view\{position:relative/);
  assert.match(css, /body\[data-step=routine\] \.mr-rail,body\[data-reading-chapter\] \.mr-rail,body\[data-chapter=close\] \.mr-rail\{opacity:0;visibility:hidden/, 'A hidden rail is not a tab stop, and it clears the regroup');
  assert.match(css, /\.mr-flow \.mr-hero__pick,\.mr-flow \.mr-step\{background:rgba\(250,249,241,\.96\)\}/, 'In flow the route reads on an ivory ledge over any stage');
  assert.match(css, /\.mr-flow \.mr-badge,\.mr-flow \.mr-route\{display:none\}/, 'Flow keeps the whole lines, not the marks');
  assert.match(css, /\.mr-cinema__view\{[^}]*overflow:hidden;overflow:clip/, 'The viewport clips without being a scroll container');
  assert.match(css, /\.mr-shot\{overflow:hidden;overflow:clip\}/, 'So do the shots');
  assert.match(css, /\.mr-flow \.mr-cinema__view\{[^}]*overflow:visible/, 'Flow keeps visible overflow');
  assert.match(css, /\.mr-flow \.mr-shot--po \.mr-actor\.mr-actor--po\{--h:clamp\(96px,20vh,150px\)\}/, 'The compact keeps its own size in flow');
  assert.match(css, /\.mr-flow \.mr-shot\{overflow-x:clip\}/, 'No pack or shadow widens the phone layout');
  assert.match(css, /body:is\(\[data-chapter=AC\],\[data-chapter=PO\]\) :is\(\.mr-header,\.mr-rail\) :focus-visible\{outline-color:var\(--chartreuse\)\}/, 'Focus stays visible on dark chapters');
});

test('first-party browser JavaScript parses', () => {
  for (const path of walkFiles(join(site, 'js')).filter(p => extname(p) === '.js')) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', path], {stdio: 'pipe'}), `${relative(root, path)} should parse`);
  }
});

test('internal partner purchase cost and private notes are absent from the published folder', () => {
  const files = walkFiles(site).filter(p => ['.html', '.json', '.js', '.md', '.css', '.txt'].includes(extname(p)));
  for (const path of files) {
    const content = read(path);
    assert.doesNotMatch(content, /(?:฿\s*290(?:[.,]00)?\b|\b290(?:[.,]00)?\s*(?:บาท|THB)|ราคาพันธมิตร|partner[_ -]?(?:price|cost)|claude-work|น้องทีม(?!ชอบ))/iu,
      `${relative(root, path)} exposes internal pricing or private notes`);
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
  assert.ok(config.headers.some(r => r.source === '/mediral/:page(cl|ac|br|su|po)/'
    && r.headers.some(h => h.key.toLowerCase() === 'x-robots-tag' && h.value.includes('noindex'))),
  'Product directory pages need the same explicit rule as the entry');
  for (const pathname of ['/mediral', '/mediral/', '/mediral/index.html', '/mediral/data/routine.json', '/mediral/js/cinema.js', '/mediral/cl/index.html', '/mediral/data/details.json']) {
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

test('assistive technology meets each chapter by its heading, and the closing ensemble is not read twice', () => {
  const score = read(join(site, 'js/score.js'));
  for (const key of ['ac', 'br', 'su', 'po']) {
    const problem = score.indexOf(`problem(step, '${key}')`), heading = score.indexOf(`title(step, '${key}'`);
    assert.ok(problem > 0 && heading > problem, `${key}: the heading follows the problem line in the markup`);
    const next = score.slice(heading).search(/wave\(step|<p class="mr-wave"|packMarkup\(step/);
    assert.ok(next > 0, `${key}: and precedes its waves and pack`);
  }
  assert.equal((score.match(/<div role="region" class="mr-shot mr-shot--/g) || []).length, 5, 'Each product chapter is a labelled region');
  const closing = score.slice(score.indexOf('export function closingShot'));
  assert.match(closing, /decorative: true/, 'The reassembled packs repeat the opening and are decorative');
  assert.match(closing, /data-layer="rg.title" aria-hidden="true">\$\{lines\(route.title\)\}/, 'The closing title is the route, one whole phrase per line');
  const brand = tags(html(), 'a').find(t => t.class === 'mr-brand');
  assert.ok(brand['aria-label'].startsWith('myClover · Mediral'), 'The accessible name contains the visible brand text');
});
