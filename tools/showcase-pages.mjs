/**
 * /showcase/ and its demo pages, called by tools/build-portfolio.mjs (one generator, one --check).
 *
 *   showcase/showcase.json        catalogue: fictional businesses, demos, real work, "what to prepare"
 *   showcase/packs/<pack>.json    the data each demo runs on
 *   showcase/kit/*                the engines (store, menu, erp, chat) and shared runtime
 *   showcase/media/<pack>/<id>.webp, showcase/media/<slug>/cover.webp   optional photos (see MEDIA-BRIEFS.md)
 *
 * Output: showcase/index.html, showcase/<slug>/index.html, showcase/thumbs/<slug>.svg, showcase/MEDIA-BRIEFS.md
 * Demo pages are noindex,follow: they show fictional shops, which must not turn up in search as if real.
 */
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {art, light, dark} from '../showcase/kit/art.js';

const SITE = 'https://www.myclover.com';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const json = obj => JSON.stringify(obj).replace(/</g, '\\u003c');
const ENGINE_CSS = {store: 'store', menu: 'menu', erp: 'erp', chat: 'chat'};
const exists = p => stat(p).then(s => s.isFile(), () => false);

export async function loadShowcase(ROOT) {
  const read = async p => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));
  const sc = await read('showcase/showcase.json');
  const packs = {};
  for (const d of sc.demos) packs[d.pack] = await read(`showcase/packs/${d.pack}.json`);
  // photos replace illustrations when the file exists
  const media = async (dir, id) => (await exists(path.join(ROOT, `showcase/media/${dir}/${id}.webp`))) ? `/showcase/media/${dir}/${id}.webp` : null;
  for (const [name, pack] of Object.entries(packs)) {
    for (const list of [pack.products, pack.items]) for (const item of Array.isArray(list) ? list : []) { const img = await media(name, item.id); if (img) item.img = img; else delete item.img; }
  }
  for (const d of sc.demos) d.cover = await media(d.slug, 'cover');
  // a cache key per engine: pages change when their engine changes, so browsers never mix versions
  const hash = {};
  for (const f of ['kit.js', 'art.js', 'kit.css', ...Object.values(ENGINE_CSS).flatMap(e => [`${e}.js`, `${e}.css`])]) {
    const body = await readFile(path.join(ROOT, 'showcase/kit', f), 'utf8').catch(() => '');
    hash[f] = createHash('sha256').update(body).digest('hex').slice(0, 8);
  }
  return {sc, packs, hash};
}

const strip = obj => JSON.parse(JSON.stringify(obj, (k, v) => k === 'look' ? undefined : v));
const bySlug = sc => Object.fromEntries(sc.demos.map(d => [d.slug, d]));

/** links between the demos of one business: the ERP for a shop, the LINE OA for a brand, … */
function linksFor(demo, sc) {
  const sibs = sc.demos.filter(d => d.biz === demo.biz);
  const find = engine => sibs.find(d => d.engine === engine)?.slug;
  const href = slug => slug ? `/showcase/${slug}/` : null;
  return {erp: href(find('erp')), line: href(find('chat')), menu: href(find('menu')), stores: sibs.filter(d => d.engine === 'store').map(d => ({slug: d.slug, href: href(d.slug), title: d.title})), siblings: sibs.filter(d => d.slug !== demo.slug).map(d => ({href: href(d.slug), title: d.title}))};
}

/** what a demo's engine needs from its pack, with related packs joined in (the ERP sells what the shop shows) */
function runtimePack(demo, {sc, packs}) {
  const pack = strip(packs[demo.pack]);
  if (pack.sources) {
    pack.catalog = [];
    for (const [src, opts] of Object.entries(pack.sources)) {
      const from = strip(packs[src]);
      for (const it of [from.products, from.items].find(Array.isArray) || []) {
        pack.catalog.push({id: it.id, name: it.name, en: it.en, price: it.price, cat: it.cat, art: it.art, img: it.img, source: src, sourceLabel: opts.label, options: it.options, allergens: it.allergens, tags: it.tags, short: it.short, details: it.details, variants: it.variants});
      }
    }
  }
  return pack;
}

function themeVars(demo, biz, engine) {
  const t = {...biz.theme, ...(demo.theme || {})};
  const appFont = engine === 'erp' || engine === 'chat';
  const head = appFont ? `'Kanit', 'Anuphan', system-ui, sans-serif` : `'${biz.font}', 'Anuphan', system-ui, sans-serif`;
  const body = appFont || biz.bodyFont ? `'Anuphan', system-ui, -apple-system, 'Segoe UI', sans-serif` : head;
  return [['bg', t.bg], ['surface', t.surface], ['ink', t.ink], ['muted', t.muted], ['line', t.line], ['accent', t.accent], ['accent2', t.accent2], ['on-accent', t.onAccent], ['soft', t.soft], ['radius', t.radius]]
    .map(([k, v]) => `--b-${k}:${v}`).concat([`--b-font:${body}`, `--b-head:${head}`]).join(';');
}

function staticFallback(demo, pack) {
  const items = [pack.products, pack.items, pack.catalog].find(Array.isArray)?.slice(0, 12) || [];
  return `<div class="sc-static">
  <h1>${esc(demo.title)}</h1>
  <p>${esc(demo.line)}</p>
  ${items.length ? `<ul>${items.map(i => `<li>${esc(i.name)}${i.price ? ` · ฿${Number(i.price).toLocaleString('en-US')}` : ''}</li>`).join('')}</ul>` : ''}
  <p>ตัวอย่างนี้กดลองได้เมื่อเปิด JavaScript</p>
</div>`;
}

export function demoPage(demo, ctx, {fastwork, VERSION}) {
  const {sc, hash} = ctx;
  const biz = sc.businesses[demo.biz];
  const pack = runtimePack(demo, ctx);
  const links = linksFor(demo, sc);
  const engine = demo.engine;
  const v = f => hash[f] || VERSION;
  const payload = {demo: {slug: demo.slug, title: demo.title, engine, biz: demo.biz}, biz: {name: biz.name, en: biz.en, code: biz.code, domain: biz.domain, about: biz.about}, links, pack};
  const fontLink = (engine === 'store' || engine === 'menu') && biz.fontUrl ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${esc(biz.fontUrl)}">\n` : '';
  const fine = [demo.fine, engine === 'chat' ? 'LINE เป็นเครื่องหมายการค้าของเจ้าของสิทธิ์ ตัวอย่างนี้จำลองหน้าตาแชต ไม่ได้เชื่อมต่อกับ LINE จริง และคำตอบของ AI ในตัวอย่างเขียนไว้ล่วงหน้า' : '', `${biz.name} (${biz.domain}) เป็นธุรกิจสมมติ ชื่อ ราคา และตัวเลขทั้งหมดในตัวอย่างนี้สร้างขึ้นเพื่อสาธิต ข้อมูลที่ลองกรอกหรือสั่งเก็บอยู่ในเบราว์เซอร์ของคุณเท่านั้น ยังไม่เชื่อมฐานข้อมูลหรือ LINE จริง`].filter(Boolean);
  const title = `${demo.title} · ตัวอย่างระบบ | Teem Clover`;
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#04100a">
<!-- Generated by tools/build-portfolio.mjs from showcase/showcase.json and showcase/packs/${demo.pack}.json. Edit those, then run: node tools/build-portfolio.mjs -->
<title>${esc(title)}</title>
<meta name="description" content="${esc(demo.line)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${SITE}/showcase/${demo.slug}/">
<meta property="og:type" content="website">
<meta property="og:locale" content="th_TH">
<meta property="og:site_name" content="myClover">
<meta property="og:url" content="${SITE}/showcase/${demo.slug}/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(demo.line)}">
<meta property="og:image" content="${SITE}${demo.cover || '/img/og-home-lucky-20260916-v2.jpg'}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="stylesheet" href="/assets/fonts/site/fonts.css?v=20261024">
${fontLink}<link rel="stylesheet" href="/showcase/kit/kit.css?v=${v('kit.css')}">
<link rel="stylesheet" href="/showcase/kit/${ENGINE_CSS[engine]}.css?v=${v(engine + '.css')}">
<link rel="modulepreload" href="/showcase/kit/kit.js?v=${v('kit.js')}">
<script type="module" src="/showcase/kit/${engine}.js?v=${v(engine + '.js')}"></script>
</head>
<body class="sc sc-${engine}" style="${themeVars(demo, biz, engine)}">
<a class="skip" href="#app">ข้ามไปที่ตัวอย่าง</a>
<header class="sc-bar">
  <a class="sc-back" href="/showcase/"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>ไอเดียระบบทั้งหมด</span></a>
  <p class="sc-tag"><b>ตัวอย่างสาธิต</b><span>${esc(biz.name)} เป็นธุรกิจสมมติ ไม่มีการขายหรือตัดเงินจริง</span></p>
  <a class="sc-want" href="#want">อยากได้แบบนี้</a>
</header>
<main id="app" class="sc-app" tabindex="-1">
${staticFallback(demo, pack)}
</main>
<section class="sc-wantsec" id="want" aria-labelledby="want-title">
  <div class="sc-wrap">
    <p class="sc-kicker">อยากได้แบบนี้</p>
    <h2 id="want-title">${esc(demo.title)} สำหรับธุรกิจของคุณ</h2>
    <div class="sc-cols">
      <div class="sc-col"><h3>คุณเตรียมให้เรา</h3><ul>${demo.gives.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="sc-col"><h3>คุณได้รับ</h3><ul>${demo.gets.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    </div>
    <div class="sc-actions"><a class="sc-btn sc-btn-gold" href="${esc(fastwork(demo.hire))}" rel="noopener">จ้างผ่าน Fastwork</a><a class="sc-btn sc-btn-glass" href="/meet/">คุยขอบเขตก่อน</a><a class="sc-btn sc-btn-glass" href="/hire/#${demo.hire}">ดูขอบเขตงาน</a></div>
    <nav class="sc-sibs" aria-label="ตัวอย่างอื่นของ${esc(biz.name)}"><b>ชุดเดียวกัน:</b>${links.siblings.map(s => `<a href="${s.href}">${esc(s.title)}</a>`).join('')}<a href="/showcase/">ไอเดียระบบทั้งหมด</a><a href="/work/">ผลงานจริง</a></nav>
    <div class="sc-fine">${fine.map(t => `<p>${esc(t)}</p>`).join('')}<p>ขอบเขต ราคา และระยะเวลาของงานจริงตกลงกันใน Fastwork ก่อนเริ่มงาน</p></div>
  </div>
</section>
<script type="application/json" id="sc-data">${json(payload)}</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------ thumbnails */
const place = (svg, x, y, w) => svg.replace('<svg class="art"', `<svg x="${x}" y="${y}" width="${w}" height="${w}"`).replace(/ (role="img" aria-label="[^"]*"|aria-hidden="true") focusable="false"/, '');
let tid = 0;
const uid = () => 't' + (++tid);

export function thumb(demo, ctx) {
  const {sc, packs} = ctx;
  const t = {...sc.businesses[demo.biz].theme, ...(demo.theme || {})};
  const pack = runtimePack(demo, ctx);
  const items = [pack.products, pack.items, pack.catalog].find(Array.isArray) || [];
  const pick = ids => ids.map(id => items.find(i => i.id === id)).filter(Boolean);
  const W = 640, H = 400;
  let body = '';
  const frame = (fill = t.bg) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;
  if (demo.engine === 'store') {
    const f = pick(pack.hero.feature);
    body = frame(t.soft) + `<circle cx="470" cy="150" r="190" fill="${light(t.accent2, .55)}" opacity=".55"/><rect x="0" y="0" width="${W}" height="54" fill="${t.surface}"/><rect x="22" y="13" width="28" height="28" rx="7" fill="${t.accent}"/><rect x="60" y="22" width="90" height="11" rx="5" fill="${t.ink}" opacity=".8"/><rect x="380" y="16" width="190" height="22" rx="11" fill="${t.bg}" stroke="${t.line}"/><circle cx="604" cy="27" r="14" fill="${t.ink}"/>`
      + `<rect x="36" y="110" width="220" height="22" rx="8" fill="${t.ink}" opacity=".85"/><rect x="36" y="142" width="180" height="22" rx="8" fill="${t.ink}" opacity=".85"/><rect x="36" y="182" width="200" height="10" rx="5" fill="${t.muted}" opacity=".6"/><rect x="36" y="200" width="160" height="10" rx="5" fill="${t.muted}" opacity=".6"/><rect x="36" y="236" width="118" height="38" rx="12" fill="${t.accent}"/>`
      + f.map((p, i) => place(art(p.art, {bg: false, uid: uid()}), [300, 384, 480][i], [128, 168, 120][i], [160, 200, 150][i])).join('');
  } else if (demo.engine === 'menu') {
    const f = pick(['kaprao', 'tomyum', 'mango']);
    body = frame(t.bg) + `<rect x="190" y="18" width="260" height="400" rx="34" fill="#16110d"/><rect x="200" y="28" width="240" height="380" rx="26" fill="${t.surface}"/><rect x="216" y="48" width="120" height="14" rx="7" fill="${t.ink}" opacity=".85"/><rect x="368" y="44" width="56" height="22" rx="11" fill="${t.accent}"/>`
      + [0, 1, 2, 3].map(i => `<rect x="${216 + i * 54}" y="80" width="48" height="20" rx="10" fill="${i ? t.soft : t.accent}"/>`).join('')
      + f.map((p, i) => `<rect x="214" y="${116 + i * 86}" width="212" height="76" rx="16" fill="${t.bg}"/>` + place(art(p.art, {bg: false, uid: uid()}), 218, 112 + i * 86, 80) + `<rect x="306" y="${132 + i * 86}" width="90" height="10" rx="5" fill="${t.ink}" opacity=".8"/><rect x="306" y="${150 + i * 86}" width="60" height="9" rx="4" fill="${t.muted}" opacity=".6"/><circle cx="404" cy="${168 + i * 86}" r="11" fill="${t.accent}"/>`).join('')
      + `<rect x="40" y="120" width="120" height="150" rx="16" fill="${t.surface}" stroke="${t.line}"/><rect x="56" y="140" width="60" height="60" fill="${t.ink}"/><rect x="64" y="148" width="18" height="18" fill="${t.surface}"/><rect x="90" y="148" width="18" height="18" fill="${t.surface}"/><rect x="64" y="174" width="18" height="18" fill="${t.surface}"/><rect x="56" y="214" width="88" height="10" rx="5" fill="${t.accent}"/><rect x="56" y="232" width="60" height="9" rx="4" fill="${t.muted}" opacity=".6"/>`
      + `<rect x="482" y="140" width="120" height="110" rx="16" fill="#1d1712"/><rect x="496" y="156" width="92" height="10" rx="5" fill="${t.accent2}"/>` + [0, 1, 2].map(i => `<rect x="496" y="${178 + i * 20}" width="${80 - i * 14}" height="8" rx="4" fill="#fff" opacity=".7"/>`).join('');
  } else if (demo.engine === 'erp') {
    const vals = [38, 52, 44, 61, 57, 70, 64, 78, 72, 88, 80, 94];
    body = frame('#eef1ef') + `<rect width="132" height="${H}" fill="#14201a"/><rect x="18" y="20" width="30" height="30" rx="8" fill="${t.accent}"/>` + [0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="18" y="${76 + i * 34}" width="${i ? 80 : 96}" height="16" rx="6" fill="${i ? '#ffffff' : t.accent}" opacity="${i ? .18 : 1}"/>`).join('')
      + [0, 1, 2, 3].map(i => `<rect x="${152 + i * 120}" y="22" width="108" height="66" rx="12" fill="#fff"/><rect x="${164 + i * 120}" y="36" width="50" height="8" rx="4" fill="#9aa59f"/><rect x="${164 + i * 120}" y="54" width="${70 - i * 8}" height="18" rx="6" fill="${i === 3 ? '#d9822b' : '#16201b'}"/>`).join('')
      + `<rect x="152" y="104" width="300" height="276" rx="14" fill="#fff"/>` + vals.map((h, i) => `<rect x="${172 + i * 22}" y="${352 - h * 2.3}" width="14" height="${h * 2.3}" rx="4" fill="${i === vals.length - 1 ? t.accent : light(t.accent, .55)}"/>`).join('')
      + `<rect x="468" y="104" width="152" height="276" rx="14" fill="#fff"/>` + [0, 1, 2, 3, 4, 5].map(i => `<rect x="482" y="${124 + i * 40}" width="124" height="28" rx="8" fill="${i === 1 ? '#fde8d2' : '#f2f4f3'}"/><circle cx="496" cy="${138 + i * 40}" r="6" fill="${i === 1 ? '#d9822b' : t.accent}"/>`).join('');
  } else if (demo.engine === 'chat') {
    const f = items.slice(0, 2);
    body = frame('#e8edf3') + `<rect x="60" y="18" width="250" height="400" rx="34" fill="#111"/><rect x="70" y="28" width="230" height="380" rx="26" fill="#dfe6ee"/><rect x="70" y="28" width="230" height="52" rx="26" fill="${t.accent}"/><circle cx="102" cy="56" r="14" fill="#fff"/><rect x="124" y="50" width="90" height="11" rx="5" fill="#fff"/>`
      + `<rect x="84" y="96" width="150" height="40" rx="16" fill="#fff"/><rect x="146" y="148" width="140" height="34" rx="16" fill="${light(t.accent, .35)}"/><rect x="84" y="196" width="196" height="150" rx="16" fill="#fff"/>` + f.map((p, i) => place(art(p.art, {bg: false, uid: uid()}), 92 + i * 94, 200, 86)).join('') + `<rect x="96" y="300" width="170" height="30" rx="10" fill="${t.accent}"/>`
      + `<rect x="340" y="50" width="250" height="300" rx="18" fill="#fff"/><rect x="360" y="72" width="120" height="12" rx="6" fill="#16201b"/>` + [0, 1, 2, 3].map(i => `<rect x="360" y="${104 + i * 56}" width="210" height="42" rx="10" fill="${['#e3f2ea', '#fff1d6', '#e1ecfb', '#f2f4f3'][i]}"/><rect x="374" y="${118 + i * 56}" width="${120 - i * 16}" height="9" rx="4" fill="#16201b" opacity=".6"/>`).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>\n`;
}

/* ---------------------------------------------------------------- gallery */
export function showcaseIndex(ctx, {layout, ctaBox, ARROW}) {
  const {sc} = ctx;
  const demos = sc.demos;
  const thumbSrc = d => d.cover || `/showcase/thumbs/${d.slug}.svg`;
  const demoCard = d => `<article class="demo" data-groups="${d.groups.join(' ')}">
      <a class="demo-pic" href="/showcase/${d.slug}/" tabindex="-1" aria-hidden="true"><img src="${thumbSrc(d)}" width="640" height="400" alt="" loading="lazy" decoding="async"></a>
      <div class="demo-body">
        <p class="demo-kind"><span>${esc(d.kind)}</span><span>${esc(sc.businesses[d.biz].name)} · ธุรกิจสมมติ</span></p>
        <h3><a href="/showcase/${d.slug}/">${esc(d.title)}</a></h3>
        <p>${esc(d.line)}</p>
        <details class="demo-more"><summary>ลูกค้าเตรียม ${d.gives.length} อย่าง · ลองได้ ${d.try.length} อย่าง</summary>
          <h4>ลูกค้าเตรียมให้เรา</h4><ul class="ticks dash">${d.gives.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <h4>ในตัวอย่างนี้ลองได้</h4><ul class="ticks">${d.try.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        </details>
        <div class="demo-links"><a class="text-link" href="/showcase/${d.slug}/">เปิดตัวอย่าง${ARROW}</a></div>
      </div>
    </article>`;
  const body = `<section class="band band-sm">
  <div class="wrap">
    <p class="kicker">ไอเดียระบบ · ตัวอย่างสาธิต</p>
    <h1>ไอเดียระบบเพิ่มเติม กดลองได้</h1>
    <p class="lede">หน้าร้านออนไลน์ เมนู QR ระบบหลังบ้าน ERP และ LINE OA + AI ${demos.length} แบบ ทำงานในเบราว์เซอร์จริง แต่ใช้แบรนด์และตัวเลขสมมติ ยังไม่เชื่อมฐานข้อมูลหรือ LINE จริง</p>
    <div class="actions"><a class="btn btn-gold" href="/work/">ดูผลงานจริงก่อน${ARROW}</a><a class="btn btn-glass" href="/hire/">จ้างทำ</a></div>
  </div>
</section>
<section class="sec alt" id="all">
  <div class="wrap">
    <div class="filters" role="group" aria-label="กรองตัวอย่าง" hidden>
      <button type="button" class="chip-f" data-filter="all" aria-pressed="true">ทั้งหมด</button>
      ${sc.groups.map(g => `<button type="button" class="chip-f" data-filter="${g.key}" aria-pressed="false">${esc(g.label)}</button>`).join('\n      ')}
    </div>
    <p class="ideas-note">ระบบของธุรกิจเดียวกันต่อกัน: สั่งจากหน้าร้าน เมนู QR หรือ LINE แล้วเปิดหลังบ้านอีกแท็บ จะเห็นออเดอร์เข้า</p>
    <div class="demos">
    ${demos.map(demoCard).join('\n    ')}
    </div>
  </div>
</section>
<section class="sec" id="prepare">
  <div class="wrap">
    <p class="kicker">ลูกค้าให้อะไรเราบ้าง</p>
    <h2>${esc(sc.prepare.title)}</h2>
    <p class="lede">${esc(sc.prepare.lede)}</p>
    <ol class="prep">${sc.prepare.items.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join('')}</ol>
  </div>
</section>
<section class="sec mint">
  <div class="wrap">
    ${ctaBox('อยากได้ระบบแบบนี้ให้ธุรกิจของคุณ', 'เลือกไอเดียที่ใกล้ที่สุด แล้วคุยขอบเขตกัน ราคาและแพ็กเกจอยู่ใน Fastwork', '')}
  </div>
</section>
<script>
(() => {
  const bar = document.querySelector('.filters'); if (!bar) return; bar.hidden = false;
  const cards = [...document.querySelectorAll('.demo')];
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    const f = b.dataset.filter;
    bar.querySelectorAll('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    cards.forEach(c => { c.hidden = f !== 'all' && !c.dataset.groups.split(' ').includes(f); });
  });
})();
</script>`;
  return layout({
    title: 'ไอเดียระบบ: ร้านออนไลน์ เมนู QR ERP LINE OA (ตัวอย่างสาธิต) | Teem Clover',
    description: `ไอเดียระบบแบบกดลองได้ ${demos.length} แบบ: หน้าร้านออนไลน์ เมนู QR ระบบหลังบ้าน ERP และ LINE OA + AI ใช้แบรนด์สมมติ พร้อมรายการที่ลูกค้าต้องเตรียม`,
    canonical: '/showcase/', current: '/work/', ogImage: '/work/media/house-3d-cover.webp',
    jsonld: [{'@context': 'https://schema.org', '@type': 'CollectionPage', name: 'ไอเดียระบบ (ตัวอย่างสาธิต) ของ Teem Clover', url: `${SITE}/showcase/`, inLanguage: 'th',
      mainEntity: {'@type': 'ItemList', itemListElement: demos.map((d, i) => ({'@type': 'ListItem', position: i + 1, url: `${SITE}/showcase/${d.slug}/`, name: d.title}))}}],
    body,
  });
}

/* ------------------------------------------------------------ media brief */
export function mediaBriefs(ctx) {
  const {sc, packs} = ctx;
  const rows = [];
  for (const d of sc.demos) rows.push([`showcase/media/${d.slug}/cover.webp`, '1280×800', '≤ 120 KB', `${d.title} (${sc.businesses[d.biz].name}): ภาพหน้าปกการ์ดในหน้า /showcase/ — ${d.line}`, d.cover ? 'มีแล้ว' : 'ยังไม่มี (ใช้ภาพวาดอัตโนมัติ)']);
  for (const [name, pack] of Object.entries(packs)) {
    for (const it of [pack.products, pack.items].find(Array.isArray) || []) {
      if (!it.look) continue;
      rows.push([`showcase/media/${name}/${it.id}.webp`, '800×800', '≤ 60 KB', `${it.name}: ${it.look}`, it.img ? 'มีแล้ว' : 'ยังไม่มี (ใช้ภาพวาดอัตโนมัติ)']);
    }
  }
  return `# Showcase media briefs (generated)

> สร้างอัตโนมัติโดย \`node tools/build-portfolio.mjs\` จาก showcase/showcase.json และ showcase/packs/*.json · อย่าแก้ไฟล์นี้ด้วยมือ
> วิธีทำภาพและกติกาทั้งหมดอยู่ใน \`entry/GPT-IMAGE-UPGRADE.md\` กลุ่ม P2 และ P3

ทุกช่องมีภาพวาดอัตโนมัติอยู่แล้ว เว็บใช้งานได้ครบโดยไม่ต้องมีภาพจริง เมื่อวางไฟล์ตามชื่อด้านล่างแล้วรัน \`node tools/build-portfolio.mjs\` ภาพจริงจะแทนภาพวาดเอง

กติกาย่อ: แบรนด์และสินค้าเป็นของสมมติ ห้ามมีโลโก้หรือชื่อแบรนด์จริง ห้ามมีตัวหนังสือในภาพ ห้ามมีหน้าคน สินค้าอยู่กลางภาพบนพื้นเรียบสีอ่อน แสงนุ่ม มุมเดียวกันทั้งชุด

| ไฟล์ | ขนาด | ไม่เกิน | ภาพอะไร (prompt) | สถานะ |
|---|---|---|---|---|
${rows.map(r => `| \`${r[0]}\` | ${r[1]} | ${r[2]} | ${r[3].replace(/\|/g, '/')} | ${r[4]} |`).join('\n')}
`;
}

export async function showcaseOutputs(ROOT, deps) {
  const ctx = await loadShowcase(ROOT);
  const out = {};
  out['showcase/index.html'] = showcaseIndex(ctx, deps);
  for (const d of ctx.sc.demos) {
    out[`showcase/${d.slug}/index.html`] = demoPage(d, ctx, deps);
    out[`showcase/thumbs/${d.slug}.svg`] = thumb(d, ctx);
  }
  out['showcase/MEDIA-BRIEFS.md'] = mediaBriefs(ctx);
  return {out, ctx};
}
