/**
 * The generated website of the homepage (v5): one pinned stage, and a different template of chapters per style.
 *   luxury  "Maison"   overture · a film you scroll through (frame sequence, WebGL) · manifesto · aperture ·
 *                      signature pieces on video · the feature in a gold frame · the film again, in reverse
 *   warm    "Journal"  a magazine cover · photos dealt from a stack · postcards that fan out · a letter
 *   playful "Pop"      bouncing type in a blob · one long sideways ride with stickers · a console · ribbons
 *   minimal "Index"    a Swiss grid · numbered index with crisp wipes · a product table · a statement
 * Engine: every chapter holds for data-len screens (its --p runs 0→1), then hands over to the next one during
 * data-tr screens with its own transition (data-tx); --in / --out drive those. Everything that moves is a
 * transform, opacity or clip-path computed in CSS from these three numbers. Loaded by entry.js on demand.
 */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t * t * (3 - 2 * t);

const FEATURE_KICKER = {profile: 'รู้จักเรา', booking: 'จองล่วงหน้า', store: 'สั่งออนไลน์', minigame: 'เล่นแล้วได้คูปอง'};
const TRY_NOTE = 'ลองกดได้จริง · ไม่มีการจองหรือสั่งซื้อจริง';
const FINE = 'ธุรกิจสมมติ ตัวอย่างสาธิตโดย myClover';
const ROMAN = ['I', 'II', 'III'];
const money = n => n === 0 ? 'ฟรี' : '฿' + n.toLocaleString('th-TH');
// Google Maps: a keyless embed, loaded only when the visitor taps it (no Google request before that)
const MAP_EMBED = q => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&hl=th&output=embed`;
const MAP_LINK = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
// a street plan drawn from the business key, so every map preview is different but stable
function streets(seed) {
  let s = [...seed].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lines = [];
  for (let i = 0; i < 5; i++) { const y = 30 + i * 60 + r() * 30; lines.push(`M-10 ${y.toFixed(0)} C120 ${(y + r() * 40 - 20).toFixed(0)} 260 ${(y + r() * 40 - 20).toFixed(0)} 410 ${(y + r() * 30 - 15).toFixed(0)}`); }
  for (let i = 0; i < 5; i++) { const x = 30 + i * 85 + r() * 30; lines.push(`M${x.toFixed(0)} -10 L${(x + r() * 50 - 25).toFixed(0)} 310`); }
  const park = `M${(40 + r() * 60).toFixed(0)} ${(170 + r() * 40).toFixed(0)} q60 -40 120 0 q30 40 -20 70 q-80 20 -100 -70z`;
  const route = `M30 280 C90 230 120 250 170 200 S230 150 200 150`;
  return `<svg class="sc-map-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path class="park" d="${park}"/><path class="river" d="M-10 ${(110 + r() * 40).toFixed(0)} C110 ${(60 + r() * 40).toFixed(0)} 260 ${(190 + r() * 40).toFixed(0)} 410 ${(130 + r() * 40).toFixed(0)}"/>${lines.map((d, i) => `<path class="${i % 3 ? 'st' : 'st main'}" d="${d}"/>`).join('')}<path class="route" d="${route}"/></svg>`;
}
const seg = (text, granularity) => typeof Intl.Segmenter === 'function'
  ? [...new Intl.Segmenter('th', {granularity}).segment(text)].map(s => s.segment)
  : granularity === 'word' ? text.split(/(\s+)/) : [...text];

export function createSite(ctx) {
  const {el, data, esc, icon, toast, reduced, saveData, V, media: m, widget} = ctx;
  const img = m.img;
  const fine = ind => `<p class="sc-fine">© ${esc(ind.brand)} · ${FINE}</p>`;
  const tryBox = (feat, cls) => `<div class="sc-widget ${cls}" data-widget>${cls === 'lx-frame' ? '<i class="lx-c tl"></i><i class="lx-c tr"></i><i class="lx-c bl"></i><i class="lx-c br"></i>' : ''}<p class="d-try">${esc(feat.try)}</p><div data-widget-body></div></div>`;
  const video = (src, poster) => src ? `<video muted loop playsinline preload="none" data-src="${src}"${poster ? ` poster="${poster}"` : ''} aria-hidden="true"></video>` : '';
  const heroPoster = c => m.hero(c)?.src || '';
  // the contact chapter's parts: a map that becomes Google Maps on tap, two lines of facts, three buttons
  const mapBox = (ind, cls = '') => `<div class="sc-map ${cls}" data-map="${esc(ind.contact.map)}">${streets(ind.key)}<i class="sc-pin" aria-hidden="true"></i>
    <button type="button" class="sc-map-load" data-map-load aria-label="เปิดแผนที่ Google ของ ${esc(ind.contact.area)}">${icon('pin')}<span>แตะเพื่อเปิด Google Maps</span></button></div>`;
  const facts = ind => `<dl class="sc-facts"><div><dt>ที่อยู่</dt><dd>${esc(ind.contact.area)}<small>ที่อยู่สมมติ</small></dd></div><div><dt>เวลา</dt><dd>${esc(ind.contact.hours)}</dd></div></dl>`;
  const reach = ind => `<div class="sc-reach"><button type="button" class="sc-btn" data-sim="call">${icon('phone')}โทร</button><button type="button" class="sc-btn" data-sim="line">${icon('chat')}LINE</button><a class="sc-btn" href="${MAP_LINK(ind.contact.map)}" target="_blank" rel="noopener">${icon('route')}นำทาง</a></div>`;
  const marks = (ind, cls) => ind.highlights.map((h, i) => `<li class="${cls}" style="--k:${i}"><b>${esc(h.k)}</b><span>${esc(h.t)}</span></li>`).join('');
  function chapter({role, cls = '', len, tr = .8, tx = 'fade', steps = 0, rest = 1, dust, label, html}) {
    return `<section class="sc sc-${role} ${cls}" data-role="${role}" data-len="${len}" data-tr="${tr}" data-tx="${tx}" data-rest="${rest}"${steps ? ` data-steps="${steps}"` : ''}${dust != null ? ` data-dust="${dust}"` : ''} aria-label="${esc(label)}"><div class="sc-in">${html}</div></section>`;
  }
  // words light up one by one (Thai has no spaces, so the browser's word segmenter splits it)
  function words(text) {
    let n = 0;
    const html = seg(text, 'word').map(w => /^\s+$/.test(w) ? w : `<span style="--w:${n++}">${esc(w)}</span>`).join('');
    return {html, n};
  }
  // letters bounce in one by one; a word never breaks across lines
  const letters = text => text.split(/(\s+)/).map(part => /^\s+$/.test(part) ? part
    : `<span class="w">${seg(part, 'grapheme').map((g, i) => `<span style="--i:${i}">${esc(g)}</span>`).join('')}</span>`).join('');

  /* ---------------- templates (data.json styles[].template picks one) ---------------- */
  const T = {};

  T.maison = ({ind, feat, c}) => {
    const H = m.hero(c), D = m.detail(c);
    const mono = (ind.brandEn.match(/[A-Z]/) || ['M'])[0];
    const story = words(ind.storyTitle);
    return [
      chapter({role: 'hero', cls: 'lx-ov', len: 1.1, tr: .9, dust: 1, label: ind.brand, html: `
        <div class="lx-ov-glow" aria-hidden="true"></div>
        <div class="lx-ov-mid">
          <div class="lx-seal" aria-hidden="true"><svg viewBox="0 0 140 140"><circle class="o" cx="70" cy="70" r="66"/><circle class="i" cx="70" cy="70" r="58"/></svg><span>${mono}</span></div>
          <p class="sc-kicker en lx-ov-en">${esc(ind.brandEn)}</p>
          <h2 class="sc-title lx-foil">${esc(ind.brand)}</h2>
          <i class="lx-rule" aria-hidden="true"></i>
          <p class="lx-ov-tag">${esc(ind.tagline)}</p>
          <button type="button" class="sc-cta lx-cta" data-goto-role="feature">${esc(feat.cta)}${icon('arrow')}</button>
        </div>`}),
      chapter({role: 'film', cls: 'lx-film', len: 3.4, tr: .9, tx: 'slit', dust: .4, label: `ภาพยนตร์สั้นของ ${ind.brand}`, html: `
        <div class="lx-screen" data-film="fwd">${img(H, '100vw', '', ' class="lx-still"')}${img(D, '100vw', '', ' class="lx-still2" loading="lazy"')}</div>
        <i class="lx-bar t" aria-hidden="true"></i><i class="lx-bar b" aria-hidden="true"></i>
        <div class="lx-cap lx-cap1"><p class="sc-kicker en">${esc(ind.brandEn)}</p><p class="lx-cap-big">${esc(ind.tagline)}</p></div>
        <div class="lx-cap lx-cap2"><p class="lx-cap-mid">${esc(ind.sub)}</p></div>
        <div class="lx-tc" aria-hidden="true"><span>${esc(ind.brandEn)}</span><i></i><span data-frame>01</span></div>
        <i class="lx-edge t" aria-hidden="true"></i><i class="lx-edge b" aria-hidden="true"></i>`}),
      chapter({role: 'story', cls: 'lx-mani', len: 1.6, tr: .9, dust: .8, label: 'เรื่องของเรา', html: `
        <div class="lx-mani-bg" aria-hidden="true">${img(D, '60vw', '', ' loading="lazy"')}</div>
        <p class="sc-kicker">เรื่องของเรา</p>
        <h2 class="lx-words" style="--n:${story.n}">${story.html}</h2>
        <p class="lx-sign">— ${esc(ind.brand)}</p>`}),
      chapter({role: 'detail', cls: 'lx-ap', len: 2, tr: .9, dust: .2, label: 'สิ่งที่เราตั้งใจ', html: `
        <div class="lx-ap-img">${img(D, '100vw', '', ' loading="lazy"')}</div>
        <i class="lx-ap-ring" aria-hidden="true"></i>
        <div class="lx-ap-shade" aria-hidden="true"></div>
        <div class="lx-ap-copy"><p class="sc-kicker">สิ่งที่เราตั้งใจ</p>
          <ol class="lx-facts">${ind.highlights.map((h, i) => `<li style="--k:${i}"><span class="lx-rn">${ROMAN[i] || i + 1}</span><span><b>${esc(h.k)}</b>${esc(h.t)}</span></li>`).join('')}</ol></div>`}),
      chapter({role: 'items', cls: 'lx-pc', len: 2.8, tr: .9, tx: 'rise', dust: .25, label: ind.itemsTitle, html: `
        <div class="lx-pc-track" data-pan>
          <header class="lx-pc-head"><p class="sc-kicker en">Signature</p><h2 class="sc-h2">${esc(ind.itemsTitle)}</h2><p class="lx-pc-hint">ราคาตัวอย่าง</p></header>
          ${ind.items.map((it, i) => `<article class="sc-card lx-card" style="--k:${i}"><span class="lx-num" aria-hidden="true">${ROMAN[i] || i + 1}</span><figure>${img(m.item(c, i + 1), '(min-width: 760px) 32vw, 76vw', it.name, ' loading="lazy"')}${video(m.craft(ind.key, i + 1), m.item(c, i + 1)?.src)}</figure><div class="lx-card-t"><b>${esc(it.name)}</b><span>${esc(it.desc)}</span><span class="sc-price">${money(it.price)}</span></div></article>`).join('')}
        </div>
        <div class="lx-pc-bar" aria-hidden="true"><i></i></div>`}),
      chapter({role: 'feature', cls: 'lx-ft', len: 1.3, tr: .9, dust: .35, label: feat.label, html: `
        <div class="lx-ft-bg" aria-hidden="true">${img(H, '100vw', '', ' loading="lazy"')}${video(m.loop(c), heroPoster(c))}</div>
        <div class="lx-ft-copy"><p class="sc-kicker">${esc(FEATURE_KICKER[feat.key] || feat.label)}</p><h2 class="sc-h2">${esc(feat.headline)}</h2><p class="sc-sub">${TRY_NOTE}</p></div>
        ${tryBox(feat, 'lx-frame')}`}),
      chapter({role: 'visit', cls: 'lx-vs', len: 1.3, tr: .9, dust: .5, label: ind.contact.title, html: `
        <div class="lx-vs-copy"><p class="sc-kicker en">Rendez-vous</p><h2 class="sc-h2">${esc(ind.contact.title)}</h2>${facts(ind)}${reach(ind)}</div>
        <div class="lx-vs-map"><i class="lx-c tl"></i><i class="lx-c tr"></i><i class="lx-c bl"></i><i class="lx-c br"></i>${mapBox(ind)}</div>`}),
      chapter({role: 'close', cls: 'lx-fin', len: 2.2, tx: 'iris', dust: 1, label: 'ท้ายเว็บ', html: `
        <div class="lx-screen" data-film="rev">${img(H, '100vw', '', ' class="lx-still" loading="lazy"')}</div>
        <div class="lx-fin-shade" aria-hidden="true"></div>
        <div class="lx-fin-copy">
          <p class="sc-kicker en">${esc(ind.brandEn)}</p>
          <h2 class="lx-word lx-foil">${esc(ind.brand)}</h2>
          <p class="lx-fin-line">${esc(ind.closing)}</p>
          <p class="sc-sign">${esc(ind.domain)} · ${esc(ind.sub)}</p>
          ${fine(ind)}
        </div>`}),
    ].join('');
  };

  T.journal = ({ind, feat, c}) => {
    const H = m.hero(c), D = m.detail(c);
    return [
      chapter({role: 'hero', cls: 'wm-cover', len: 1.2, tr: .75, label: ind.brand, html: `
        <header class="wm-mast"><span>ฉบับตัวอย่าง</span><span class="sc-kicker en">${esc(ind.brandEn)}</span><span class="wm-dom">${esc(ind.domain)}</span></header>
        <h2 class="sc-title wm-title" style="--chars:${[...ind.brand].length}">${esc(ind.brand)}</h2>
        <div class="wm-cover-body">
          <div class="wm-cover-copy"><p class="sc-tag">${esc(ind.tagline)}</p><p class="sc-sub">${esc(ind.sub)}</p><button type="button" class="sc-cta" data-goto-role="feature">${esc(feat.cta)}</button></div>
          <figure class="wm-pola"><div class="wm-photo">${img(H, '(min-width: 760px) 44vw, 80vw')}${video(m.loop(c), H?.src)}</div><figcaption>${esc(ind.short)} · ${esc(ind.brandEn)}</figcaption></figure>
        </div>
        <svg class="wm-doodle" viewBox="0 0 220 80" aria-hidden="true"><path d="M6 62C40 12 92 8 122 40s70 32 92-20"/><path d="M196 14l18 6-6 16"/></svg>`}),
      chapter({role: 'story', cls: 'wm-story', len: 2.2, tr: .75, tx: 'deal', steps: 3, rest: 0, label: 'เรื่องของเรา', html: `
        <div class="wm-stack" aria-hidden="true">${[D, m.item(c, 1), m.item(c, 3)].map((x, i) => `<figure class="wm-print" style="--k:${i}">${img(x, '(min-width: 760px) 36vw, 60vw', '', ' loading="lazy"')}</figure>`).join('')}</div>
        <div class="wm-notes"><p class="sc-kicker">เรื่องของเรา</p><h2 class="sc-h2">${esc(ind.storyTitle)}</h2>
          <ol class="wm-facts">${marks(ind, '')}</ol></div>`}),
      chapter({role: 'items', cls: 'wm-items', len: 1.8, tr: .75, tx: 'rise', label: ind.itemsTitle, html: `
        <header class="wm-items-head"><p class="sc-kicker">${esc(ind.brand)} · ราคาตัวอย่าง</p><h2 class="sc-h2">${esc(ind.itemsTitle)}</h2></header>
        <div class="wm-cards">${ind.items.map((it, i) => `<article class="sc-card wm-card" style="--k:${i}"><i class="wm-tape" aria-hidden="true"></i><figure>${img(m.item(c, i + 1), '(min-width: 760px) 26vw, 30vw', it.name, ' loading="lazy"')}</figure><div class="wm-card-t"><b>${esc(it.name)}</b><span>${esc(it.desc)}</span></div><span class="wm-stamp sc-price">${money(it.price)}</span></article>`).join('')}</div>`}),
      chapter({role: 'feature', cls: 'wm-feat', len: 1.3, tr: .75, tx: 'deal', label: feat.label, html: `
        <div class="wm-feat-copy"><p class="sc-kicker">${esc(FEATURE_KICKER[feat.key] || feat.label)}</p><h2 class="sc-h2">${esc(feat.headline)}</h2><p class="sc-sub">${TRY_NOTE}</p>
          <svg class="wm-arrow" viewBox="0 0 160 90" aria-hidden="true"><path d="M6 10C60 0 120 20 140 70"/><path d="M126 60l14 12 4-18"/></svg></div>
        ${tryBox(feat, 'wm-sheet')}`}),
      chapter({role: 'visit', cls: 'wm-visit', len: 1.2, tr: .75, tx: 'deal', label: ind.contact.title, html: `
        <figure class="wm-postcard"><i class="wm-tape" aria-hidden="true"></i>${mapBox(ind, 'is-paper')}<span class="wm-postmark" aria-hidden="true">${esc(ind.brand)}</span></figure>
        <div class="wm-visit-copy"><p class="wm-hand">แวะมานะ!</p><h2 class="sc-h2">${esc(ind.contact.title)}</h2>${facts(ind)}${reach(ind)}</div>`}),
      chapter({role: 'close', cls: 'wm-close', len: 1, tx: 'rise', label: 'ท้ายเว็บ', html: `
        <figure class="wm-window">${img(H, '(min-width: 760px) 40vw, 70vw', '', ' loading="lazy"')}</figure>
        <div class="wm-letter"><p class="sc-kicker">ถึงคุณ</p><h2 class="sc-h2">${esc(ind.closing)}</h2><p class="wm-sign">ด้วยรัก · ทีม${esc(ind.brand)}</p><p class="sc-sign">${esc(ind.domain)} · ${esc(ind.sub)}</p>${fine(ind)}</div>`}),
    ].join('');
  };

  const STICKERS = `
    <i class="pp-st s1" style="--s:90px" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 2 2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7L12 2Z"/></svg></i>
    <i class="pp-st s2" style="--s:160px" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg></i>
    <i class="pp-st s3" style="--s:60px" aria-hidden="true"><svg viewBox="0 0 40 12"><path d="M1 6c4-6 6 6 10 0s6 6 10 0 6 6 10 0 5 5 8 0"/></svg></i>
    <i class="pp-st s4" style="--s:130px" aria-hidden="true"><span>ลองเลย!</span></i>`;
  T.pop = ({ind, feat, c}) => {
    const H = m.hero(c), D = m.detail(c);
    const band = `${ind.brandEn} ★ ${ind.tagline} ★ `;
    return [
      chapter({role: 'hero', cls: 'pp-hero', len: 1.1, tr: .75, label: ind.brand, html: `
        <div class="pp-dots" aria-hidden="true"></div>
        <div class="pp-blob">${img(H, '(min-width: 760px) 44vw, 80vw')}${video(m.loop(c), H?.src)}</div>
        ${STICKERS}
        <div class="pp-copy"><p class="sc-kicker en">${esc(ind.brandEn)}</p><h2 class="sc-title pp-title">${letters(ind.brand)}</h2><p class="sc-tag">${esc(ind.tagline)}</p><p class="sc-sub">${esc(ind.sub)}</p><button type="button" class="sc-cta" data-goto-role="feature">${esc(feat.cta)}</button></div>`}),
      chapter({role: 'story', cls: 'pp-ride', len: 3.2, tr: .75, tx: 'pop', label: 'เรื่องของเรา', html: `
        <div class="pp-marquee" aria-hidden="true"><div><span>${esc(band.repeat(3))}</span><span>${esc(band.repeat(3))}</span></div></div>
        <div class="pp-track" data-pan>
          <div class="pp-panel pp-intro"><div class="pp-bubble"><p class="sc-kicker">เรื่องของเรา</p><h2 class="sc-h2">${esc(ind.storyTitle)}</h2></div><figure class="pp-circle">${img(D, '(min-width: 760px) 26vw, 50vw', '', ' loading="lazy"')}</figure></div>
          <ul class="pp-panel pp-facts">${marks(ind, 'pp-sticker')}</ul>
          <div class="pp-panel pp-items-head"><h3 class="sc-h2">${esc(ind.itemsTitle)}</h3><p>ราคาตัวอย่าง</p></div>
          ${ind.items.map((it, i) => `<article class="sc-card pp-card" style="--k:${i}"><figure>${img(m.item(c, i + 1), '(min-width: 760px) 22vw, 56vw', it.name, ' loading="lazy"')}</figure><b>${esc(it.name)}</b><span>${esc(it.desc)}</span><span class="sc-price">${money(it.price)}</span></article>`).join('')}
          <div class="pp-panel pp-end" aria-hidden="true">เลือกได้เลย!</div>
        </div>
        <div class="pp-bar" aria-hidden="true"><i></i></div>`}),
      chapter({role: 'feature', cls: 'pp-feat', len: 1.3, tr: .75, tx: 'pop', label: feat.label, html: `
        <div class="pp-confetti" aria-hidden="true"></div>
        <div class="pp-feat-copy"><p class="sc-kicker">${esc(FEATURE_KICKER[feat.key] || feat.label)}</p><h2 class="sc-h2">${esc(feat.headline)}</h2><svg class="pp-squiggle" viewBox="0 0 200 14" aria-hidden="true"><path d="M2 8c12-10 20 10 32 0s20 10 32 0 20 10 32 0 20 10 32 0 20 10 32 0 20 10 32 0"/></svg><p class="sc-sub">${TRY_NOTE}</p></div>
        ${tryBox(feat, 'pp-console')}`}),
      chapter({role: 'visit', cls: 'pp-visit', len: 1.2, tr: .75, tx: 'pop', label: ind.contact.title, html: `
        <div class="pp-dots" aria-hidden="true"></div>
        <div class="pp-visit-map">${mapBox(ind, 'is-pop')}</div>
        <div class="pp-visit-copy"><p class="sc-kicker">มาเจอกัน!</p><h2 class="sc-h2">${esc(ind.contact.title)}</h2>${facts(ind)}${reach(ind)}</div>`}),
      chapter({role: 'close', cls: 'pp-close', len: 1, tx: 'pop', label: 'ท้ายเว็บ', html: `
        <div class="pp-ribbon r1" aria-hidden="true"><span>${esc(`${ind.brand} ★ `.repeat(10))}</span></div>
        <div class="pp-ribbon r2" aria-hidden="true"><span>${esc(`${ind.brandEn} ★ `.repeat(10))}</span></div>
        <div class="pp-close-copy"><h2 class="sc-h2">${esc(ind.closing)}</h2><p class="sc-sign">${esc(ind.domain)} · ${esc(ind.sub)}</p>${fine(ind)}</div>`}),
    ].join('');
  };

  T.index = ({ind, feat, c}) => {
    const H = m.hero(c), D = m.detail(c);
    return [
      chapter({role: 'hero', cls: 'mn-hero', len: 1.2, tr: .6, tx: 'wipe', label: ind.brand, html: `
        <div class="mn-grid" aria-hidden="true">${Array.from({length: 12}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
        <div class="mn-frame"><div class="mn-reveal">${img(H, '100vw')}${video(m.loop(c), H?.src)}</div></div>
        <header class="mn-meta"><span>(01)</span><span class="sc-kicker en">${esc(ind.brandEn)}</span><span class="mn-dom">${esc(ind.domain)}</span><span>ตัวอย่างสาธิต</span></header>
        <div class="mn-hero-copy"><p class="sc-tag">${esc(ind.tagline)}</p><p class="sc-sub">${esc(ind.sub)}</p><button type="button" class="sc-cta mn-link" data-goto-role="feature">${esc(feat.cta)}${icon('arrow')}</button></div>
        <h2 class="sc-title mn-title">${esc(ind.brand)}</h2>`}),
      chapter({role: 'story', cls: 'mn-index', len: 2.4, tr: .6, tx: 'wipe', steps: 3, rest: 0, label: 'เรื่องของเรา', html: `
        <div class="mn-index-l">
          <p class="sc-kicker">(02) เรื่องของเรา</p>
          <p class="mn-count" aria-hidden="true"><span>01</span><span>02</span><span>03</span></p>
          <h2 class="sc-h2">${esc(ind.storyTitle)}</h2>
          <ol class="mn-rows">${ind.highlights.map((h, i) => `<li><span class="mn-no">0${i + 1}</span><span><b>${esc(h.k)}</b> ${esc(h.t)}</span></li>`).join('')}</ol>
        </div>
        <div class="mn-index-r" aria-hidden="true">${[D, m.item(c, 1), m.item(c, 2)].map(x => `<figure class="mn-shot">${img(x, '(min-width: 760px) 46vw, 90vw', '', ' loading="lazy"')}</figure>`).join('')}</div>`}),
      chapter({role: 'items', cls: 'mn-items', len: 1.6, tr: .6, tx: 'wipe', label: ind.itemsTitle, html: `
        <header class="mn-items-head"><p class="sc-kicker">(03) ${esc(ind.itemsTitle)}</p><p class="mn-items-n">${ind.items.length} รายการ · ราคาตัวอย่าง</p></header>
        <div class="mn-table">${ind.items.map((it, i) => `<article class="sc-card mn-row" style="--k:${i}"><span class="mn-no">0${i + 1}</span><figure>${img(m.item(c, i + 1), '96px', it.name, ' loading="lazy"')}</figure><b>${esc(it.name)}</b><span class="mn-desc">${esc(it.desc)}</span><span class="sc-price">${money(it.price)}</span></article>`).join('')}</div>`}),
      chapter({role: 'feature', cls: 'mn-feat', len: 1.3, tr: .6, tx: 'wipe', label: feat.label, html: `
        <div class="mn-feat-copy"><p class="sc-kicker">(04) ${esc(FEATURE_KICKER[feat.key] || feat.label)}</p><h2 class="sc-h2">${esc(feat.headline)}</h2><p class="sc-sub">${TRY_NOTE}</p></div>
        ${tryBox(feat, 'mn-box')}`}),
      chapter({role: 'visit', cls: 'mn-visit', len: 1.2, tr: .6, tx: 'wipe', label: ind.contact.title, html: `
        <div class="mn-visit-copy"><p class="sc-kicker">(05) ติดต่อ</p><h2 class="sc-h2">${esc(ind.contact.title)}</h2>${facts(ind)}${reach(ind)}</div>
        ${mapBox(ind, 'is-mono')}`}),
      chapter({role: 'close', cls: 'mn-close', len: 1, tx: 'wipe', label: 'ท้ายเว็บ', html: `
        <p class="sc-kicker">(06)</p><h2 class="mn-statement">${esc(ind.closing)}</h2>
        <footer class="mn-foot"><span class="sc-sign">${esc(ind.brandEn)} · ${esc(ind.domain)}</span>${fine(ind)}</footer>`}),
    ].join('');
  };

  /* ---------------- engine ---------------- */
  let chs = [], starts = [], total = 1, current = -1, raf = 0, renderId = 0, picked = null;
  let widgetCleanup = null, lux = null;

  function measure() {
    chs = $$('.sc', el.scenes).map((s, i) => {
      s.dataset.sc = String(i); s.style.zIndex = String(i + 1);
      return {el: s, len: +s.dataset.len || 1, tr: +s.dataset.tr || .8, steps: +s.dataset.steps || 0, rest: +(s.dataset.rest ?? 1), dust: +(s.dataset.dust || 0), shown: null, step: -1};
    });
    if (!chs.length) return;
    chs.at(-1).tr = 0;
    let u = 0;
    starts = chs.map(c => { const at = u; u += c.len + c.tr; return at; });
    total = u;
    el.site.style.setProperty('--len', `${(total + 1) * 100}svh`);
    const width = el.stage.clientWidth || innerWidth;
    $$('[data-pan]', el.scenes).forEach(t => t.style.setProperty('--pan', `${Math.max(0, t.scrollWidth - width)}px`));
    $$('[data-goto-role]', el.scenes).forEach(b => { b.dataset.goto = String(Math.max(0, chs.findIndex(c => c.el.dataset.role === b.dataset.gotoRole))); });
    el.rail.innerHTML = chs.map(() => '<li></li>').join('');
  }

  function state(u) {
    return chs.map((c, j) => {
      const hs = starts[j], he = hs + c.len;
      const p = clamp((u - hs) / c.len);
      const out = c.tr ? ease(clamp((u - he) / c.tr)) : 0;
      const prev = chs[j - 1];
      const inn = j ? 1 - ease(clamp((u - (starts[j - 1] + prev.len)) / prev.tr)) : 0;
      return {p, out, inn, visible: inn < 1 && out < 1};
    });
  }

  function videos(c, on) {
    for (const v of $$('video', c.el)) {
      if (on) {
        if (!v.src && v.dataset.src) { v.addEventListener('playing', () => v.classList.add('is-on'), {once: true}); v.src = v.dataset.src; }
        if (v.paused && !document.hidden) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    }
  }

  function paint() {
    raf = 0;
    if (!chs.length || el.site.hidden) return;
    if (reduced) return;
    const r = el.site.getBoundingClientRect();
    const span = el.site.offsetHeight - innerHeight;
    const u = (span > 0 ? clamp(-r.top / span) : 0) * total;
    const onScreen = r.top < innerHeight && r.bottom > 0 && !document.hidden;
    const st = state(u);
    // pos: the chapter being held, plus how far the hand-over to the next one has gone
    let at = chs.length - 1;
    while (at > 0 && u < starts[at]) at--;
    const pos = at + st[at].out;
    const round = clamp(Math.round(pos), 0, chs.length - 1);
    let dust = 0;
    st.forEach((s, j) => {
      const c = chs[j];
      if (s.visible) {
        c.el.style.setProperty('--p', s.p.toFixed(4));
        c.el.style.setProperty('--in', s.inn.toFixed(4));
        c.el.style.setProperty('--out', s.out.toFixed(4));
        if (c.steps) { const k = Math.min(c.steps - 1, Math.floor(s.p * c.steps)); if (k !== c.step) { c.step = k; c.el.dataset.step = String(k); } }
        dust = Math.max(dust, c.dust * (1 - Math.max(s.inn, s.out) * .6));
      }
      if (c.shown !== s.visible) {
        c.shown = s.visible;
        if (s.visible) c.el.removeAttribute('aria-hidden'); else c.el.setAttribute('aria-hidden', 'true');
      }
      c.el.inert = j !== round;
      videos(c, s.visible && onScreen);
      if (lux) lux.chapter(c, s, onScreen);
    });
    lux?.commit(onScreen ? dust : 0);
    if (round !== current) {
      current = round;
      $$('li', el.rail).forEach((li, i) => li.classList.toggle('on', i === round));
      el.site.dataset.scene = String(round);
    }
    el.site.dataset.pos = pos.toFixed(2);
    el.stage.dataset.pastHero = u > .25 ? '1' : '0';
  }
  const queue = () => { raf ||= requestAnimationFrame(paint); };
  addEventListener('scroll', queue, {passive: true});
  addEventListener('resize', () => { if (chs.length) { measure(); paint(); } });
  document.addEventListener('visibilitychange', queue);
  el.scenes.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]'); if (g) return goto(+g.dataset.goto, {smooth: true});
    // the map turns into the real Google Maps only when asked: no request to Google before this tap
    const load = e.target.closest('[data-map-load]');
    if (load) {
      const box = load.closest('[data-map]');
      const f = document.createElement('iframe');
      f.src = MAP_EMBED(box.dataset.map); f.title = `แผนที่ Google · ${box.dataset.map}`; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
      box.append(f); box.classList.add('is-live'); load.remove();
      return;
    }
    const sim = e.target.closest('[data-sim]');
    if (sim) toast(sim.dataset.sim === 'call' ? 'ตัวอย่าง · ในเว็บจริงปุ่มนี้โทรหาร้านคุณ' : 'ตัวอย่าง · ในเว็บจริงปุ่มนี้เปิดแชต LINE ของร้านคุณ');
  });

  function scrollFor(k) {
    const top = el.site.getBoundingClientRect().top + scrollY;
    const span = el.site.offsetHeight - innerHeight;
    return top + span * clamp((starts[k] + (k ? chs[k].len * .03 : 0)) / total);
  }
  function goto(k, {smooth = false} = {}) {
    if (!chs[k]) return;
    if (reduced) { chs[k].el.scrollIntoView(); return; }
    scrollTo({top: scrollFor(k), behavior: smooth ? 'smooth' : 'auto'});
  }

  async function mountWidget(ind, feat, id, c) {
    if (widgetCleanup) { try { widgetCleanup(); } catch {} widgetCleanup = null; }
    const body = $('[data-widget-body]', el.scenes);
    if (!body) return;
    const mod = await widget(feat.key);
    if (id !== renderId || !body.isConnected) return; // a newer pick won
    const photos = [1, 2, 3].map(n => m.item(c, n)?.src).filter(Boolean); // the business's own products, for the mini-game
    widgetCleanup = mod.mount(body, {industry: ind, feature: feat, toast, icon, esc, photos}) || null;
  }

  // luxury only: the film (frame sequence on WebGL), gold dust and a soft light that follows the pointer
  async function startLux(ind, id) {
    const film = m.film(ind.key);
    const mod = await import(`./lux.js?v=${V}`);
    if (id !== renderId) return;
    lux = mod.createLux({stage: el.stage, film, saveData});
    paint();
  }

  function render({ind, feat, sty}) {
    const id = ++renderId;
    lux?.dispose(); lux = null;
    for (const k of Object.keys(data.styles[0].vars)) el.site.style.removeProperty(k);
    for (const [k, v] of Object.entries(sty.vars)) el.site.style.setProperty(k, v);
    el.site.dataset.style = sty.key;
    el.site.dataset.industry = ind.key;
    const c = `${ind.key}-${sty.key}`;
    picked = {ind, feat, sty};
    el.site.dataset.template = sty.template;
    el.scenes.innerHTML = (T[sty.template] || T.journal)({ind, feat, sty, c});
    el.site.classList.remove('is-lit'); void el.site.offsetWidth;
    current = -1;
    measure();
    if (reduced) chs.forEach(ch => { ch.el.style.setProperty('--p', String(ch.rest)); if (ch.steps) ch.el.dataset.step = String(ch.steps - 1); });
    el.site.classList.add('is-lit');
    mountWidget(ind, feat, id, c);
    if (sty.template === 'maison' && !reduced) startLux(ind, id);
    paint();
    // the style's web font changes the width of the sideways tracks: measure again once it is in
    document.fonts?.ready.then(() => { if (id === renderId) { measure(); paint(); } });
  }

  return {render, goto, paint, measure, get picked() { return picked; }, stop() { lux?.dispose(); lux = null; chs.forEach(c => videos(c, false)); }};
}
