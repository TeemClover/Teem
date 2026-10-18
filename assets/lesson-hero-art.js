/* AI ใส่ซอส · ภาพหัวบทชุดเดียวกันทั้ง 6 บท (สไตล์เดียวกับวิดีโอเปิดคอร์ส)
   ของที่ได้จากบทวางบนแท่นกลางแสงทอง ซ้ายคือสิ่งที่ใส่เข้าไป ขวาคือผลงานที่ได้
   วาดด้วย SVG ล้วน ไม่มีตัวหนังสือไทยในภาพ จึงไม่เพี้ยนบนเครื่องไหน
   และแทนภาพประกอบเดิมที่สไตล์ไม่ตรงกันในแต่ละบท */
(function () {
  'use strict';

  var GOLD = '#e2c27a', HOT = '#f6dc9a', CREAM = '#f4ecd8', INK = '#0d2a1b', DEEP = '#7a5c18';

  // ── small pieces, each drawn around (0,0) ──
  function jar(label) {
    return '<rect x="-34" y="-64" width="68" height="22" rx="8" fill="#7a4e1d"/>' +
      '<rect x="-30" y="-46" width="60" height="8" rx="3" fill="#5c3912"/>' +
      '<rect x="-46" y="-40" width="92" height="104" rx="26" fill="' + CREAM + '" opacity=".96"/>' +
      '<path d="M-46 8h92v30a26 26 0 0 1-26 26h-40a26 26 0 0 1-26-26z" fill="url(#lhHoney)"/>' +
      '<rect x="-30" y="-24" width="60" height="34" rx="7" fill="#fffaf0" stroke="' + GOLD + '" stroke-width="2"/>' +
      '<text x="0" y="-1" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="17" font-weight="800" fill="' + DEEP + '">' + (label || '.md') + '</text>' +
      '<rect x="-36" y="-30" width="8" height="70" rx="4" fill="#fff" opacity=".55"/>';
  }
  function mic() {
    return '<rect x="-9" y="-22" width="18" height="30" rx="9" fill="' + HOT + '"/>' +
      '<path d="M-15 0a15 15 0 0 0 30 0M0 15v9M-8 24h16" stroke="' + HOT + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  }
  function file() {
    return '<path d="M-14-20h18l10 10v30h-28z" fill="' + CREAM + '"/><path d="M4-20v10h10" fill="#d8c9a6"/>' +
      '<path d="M-8-4h16M-8 4h16M-8 12h10" stroke="' + DEEP + '" stroke-width="2.5" stroke-linecap="round"/>';
  }
  function chat() {
    return '<path d="M-20-16h40a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6h-22l-10 9v-9h-8a6 6 0 0 1-6-6v-18a6 6 0 0 1 6-6z" fill="' + CREAM + '"/>' +
      '<circle cx="-9" cy="-1" r="3" fill="' + DEEP + '"/><circle cx="0" cy="-1" r="3" fill="' + DEEP + '"/><circle cx="9" cy="-1" r="3" fill="' + DEEP + '"/>';
  }
  function check(x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><circle r="15" fill="#2f8a57" stroke="' + CREAM + '" stroke-width="3"/>' +
      '<path d="M-6 0l4 5 8-9" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }
  function doc() {
    return '<rect x="-30" y="-42" width="60" height="80" rx="9" fill="' + CREAM + '"/>' +
      '<path d="M-18-24h36M-18-12h36M-18 0h24M-18 12h30" stroke="' + DEEP + '" stroke-width="4" stroke-linecap="round" opacity=".75"/>' +
      '<text x="0" y="31" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="800" fill="' + DEEP + '">.md</text>' +
      check(26, 34);
  }
  function picture(ok) {
    return '<rect x="-30" y="-44" width="60" height="88" rx="10" fill="' + CREAM + '"/>' +
      '<rect x="-23" y="-37" width="46" height="62" rx="6" fill="#cfe3d6"/>' +
      '<circle cx="9" cy="-24" r="7" fill="' + HOT + '"/>' +
      '<path d="M-23 25l15-20 11 13 8-8 12 15z" fill="#3f8a5e"/>' +
      (ok ? check(26, 36) : '');
  }
  function spoon() {
    return '<g transform="rotate(-32)"><rect x="-6" y="-6" width="12" height="96" rx="6" fill="url(#lhGold)"/>' +
      '<ellipse cx="0" cy="-34" rx="30" ry="40" fill="url(#lhGold)"/>' +
      '<ellipse cx="0" cy="-36" rx="21" ry="29" fill="url(#lhHoney)"/>' +
      '<ellipse cx="-8" cy="-48" rx="5" ry="10" fill="#fff" opacity=".6"/></g>';
  }
  function wok() {
    return '<path d="M-74 4h148a74 52 0 0 1-148 0z" fill="#2b3a33"/>' +
      '<path d="M-74 4h148" stroke="' + GOLD + '" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="70" y="-2" width="58" height="12" rx="6" fill="#7a4e1d"/>' +
      '<path d="M-40 4c6-18 18-24 30-14s22 4 26-6 18-10 26 6" stroke="' + HOT + '" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path class="lh-tw" d="M-22-30c-6-10 6-14 0-24M2-34c-6-10 6-14 0-24M26-30c-6-10 6-14 0-24" stroke="' + CREAM + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>';
  }
  function phone() {
    return '<rect x="-34" y="-58" width="68" height="116" rx="14" fill="#10261a" stroke="' + GOLD + '" stroke-width="3"/>' +
      '<rect x="-26" y="-48" width="52" height="88" rx="6" fill="#1f5a3a"/>' +
      '<circle cx="0" cy="-4" r="17" fill="' + CREAM + '"/><path d="M-5-12l14 8-14 8z" fill="#1f5a3a"/>' +
      '<rect x="-12" y="46" width="24" height="4" rx="2" fill="' + GOLD + '"/>';
  }
  function bento() {
    return '<rect x="-74" y="-40" width="148" height="92" rx="16" fill="url(#lhGold)"/>' +
      '<rect x="-64" y="-30" width="62" height="72" rx="10" fill="#fff8e8"/>' +
      '<rect x="6" y="-30" width="58" height="32" rx="9" fill="#e86a5c"/>' +
      '<rect x="6" y="8" width="58" height="34" rx="9" fill="#5bb98c"/>' +
      '<circle cx="-44" cy="-4" r="9" fill="#f0c24b"/><circle cx="-22" cy="14" r="9" fill="#e2a33b"/><circle cx="-40" cy="22" r="7" fill="#8f7cf0"/>' +
      '<rect x="-80" y="-52" width="160" height="16" rx="8" fill="#7a4e1d"/>';
  }
  function trio() {
    return '<g transform="translate(-26 -20) rotate(-10)"><rect x="-22" y="-16" width="44" height="32" rx="6" fill="' + CREAM + '"/><path d="M-14-6h28M-14 2h18" stroke="' + DEEP + '" stroke-width="3" stroke-linecap="round"/></g>' +
      '<g transform="translate(24 -16)"><path d="M-16 6a16 16 0 0 1 32 0" stroke="' + HOT + '" stroke-width="5" fill="none"/><rect x="-20" y="2" width="9" height="16" rx="4" fill="' + HOT + '"/><rect x="11" y="2" width="9" height="16" rx="4" fill="' + HOT + '"/></g>' +
      '<g transform="translate(0 26)"><rect x="-22" y="-16" width="44" height="32" rx="6" fill="' + CREAM + '"/><circle cx="8" cy="-6" r="4" fill="' + HOT + '"/><path d="M-22 16l14-14 9 9 7-6 14 11z" fill="#3f8a5e"/></g>';
  }
  function shaker() {
    return '<path d="M-34-34a34 30 0 0 1 68 0z" fill="#c9d6cf"/>' +
      '<circle cx="-12" cy="-44" r="3" fill="#6f7f77"/><circle cx="0" cy="-48" r="3" fill="#6f7f77"/><circle cx="12" cy="-44" r="3" fill="#6f7f77"/>' +
      '<rect x="-38" y="-36" width="76" height="12" rx="5" fill="#9fb0a8"/>' +
      '<path d="M-36-24h72l-8 86h-56z" fill="' + CREAM + '" opacity=".96"/>' +
      '<path d="M-30 20h60l-4 42h-52z" fill="#fff"/>' +
      '<rect x="-24" y="-8" width="48" height="24" rx="6" fill="#8f7cf0"/>' +
      '<text x="0" y="10" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="17" font-weight="800" fill="#fff">/</text>' +
      '<g class="lh-tw" fill="' + HOT + '"><circle cx="-46" cy="-62" r="3"/><circle cx="-30" cy="-76" r="2.5"/><circle cx="44" cy="-66" r="3"/></g>';
  }
  function agent() {
    return '<path d="M0-44v-10" stroke="' + HOT + '" stroke-width="4" stroke-linecap="round"/><circle cy="-58" r="6" fill="' + HOT + '"/>' +
      '<rect x="-36" y="-44" width="72" height="56" rx="18" fill="' + CREAM + '"/>' +
      '<rect x="-26" y="-34" width="52" height="34" rx="12" fill="#10261a"/>' +
      '<circle cx="-11" cy="-17" r="6" fill="#7fd6a4"/><circle cx="11" cy="-17" r="6" fill="#7fd6a4"/>' +
      '<g transform="translate(0 34)"><rect x="-34" y="-12" width="68" height="24" rx="12" fill="#8f7cf0"/>' +
      '<text x="0" y="6" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="15" font-weight="800" fill="#fff">/help</text></g>';
  }
  function cloche() {
    return '<ellipse cx="0" cy="40" rx="84" ry="16" fill="' + CREAM + '"/><ellipse cx="0" cy="36" rx="70" ry="10" fill="#fff"/>' +
      '<path d="M-62 34a62 62 0 0 1 124 0z" fill="url(#lhGold)"/>' +
      '<path d="M-44 20a46 46 0 0 1 30-40" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".55"/>' +
      '<circle cy="-32" r="9" fill="#c8963e"/>';
  }
  function browser() {
    return '<rect x="-46" y="-40" width="92" height="80" rx="10" fill="' + CREAM + '"/>' +
      '<rect x="-46" y="-40" width="92" height="18" rx="9" fill="#d8c9a6"/><rect x="-46" y="-30" width="92" height="8" fill="#d8c9a6"/>' +
      '<circle cx="-36" cy="-31" r="3" fill="#e86a5c"/><circle cx="-26" cy="-31" r="3" fill="#f0c24b"/><circle cx="-16" cy="-31" r="3" fill="#5bb98c"/>' +
      '<text x="0" y="16" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="22" font-weight="800" fill="' + DEEP + '">&lt;/&gt;</text>' +
      check(40, 34);
  }
  function at(x, y, s, body) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' + body + '</g>'; }

  // ── one frame for every lesson ──
  function rays() {
    var out = '', n = 16;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2, w = 0.07;
      var x1 = 480 + Math.cos(a - w) * 620, y1 = 150 + Math.sin(a - w) * 620, x2 = 480 + Math.cos(a + w) * 620, y2 = 150 + Math.sin(a + w) * 620;
      out += '<path d="M480 150L' + x1.toFixed(0) + ' ' + y1.toFixed(0) + 'L' + x2.toFixed(0) + ' ' + y2.toFixed(0) + 'z"/>';
    }
    return out;
  }
  function frame(o) {
    return '<svg viewBox="0 0 960 300" role="img" aria-labelledby="lhTitle" xmlns="http://www.w3.org/2000/svg">' +
      '<title id="lhTitle">' + o.title + '</title>' +
      '<defs>' +
      '<linearGradient id="lhBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14402a"/><stop offset="1" stop-color="#06170f"/></linearGradient>' +
      '<radialGradient id="lhGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="' + HOT + '" stop-opacity=".5"/><stop offset="1" stop-color="' + HOT + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="lhGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe7b0"/><stop offset="1" stop-color="#c8963e"/></linearGradient>' +
      '<linearGradient id="lhHoney" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c45a"/><stop offset="1" stop-color="#d98a1f"/></linearGradient>' +
      '<clipPath id="lhClip"><rect width="960" height="300" rx="28"/></clipPath>' +
      '</defs>' +
      '<style>.lh-flow{animation:lhDash 1.4s linear infinite}@keyframes lhDash{to{stroke-dashoffset:-28}}' +
      '.lh-float{animation:lhFloat 4s ease-in-out infinite}@keyframes lhFloat{50%{transform:translateY(-6px)}}' +
      '.lh-tw{animation:lhTw 2.4s ease-in-out infinite}@keyframes lhTw{50%{opacity:.3}}' +
      '@media (prefers-reduced-motion:reduce){.lh-flow,.lh-float,.lh-tw{animation:none}}</style>' +
      '<g clip-path="url(#lhClip)">' +
      '<rect width="960" height="300" fill="url(#lhBg)"/>' +
      '<g fill="' + HOT + '" opacity=".07">' + rays() + '</g>' +
      '<circle cx="480" cy="150" r="170" fill="url(#lhGlow)"/>' +
      '<ellipse cx="480" cy="276" rx="420" ry="12" fill="' + HOT + '" opacity=".1"/>' +
      '</g>' +
      '<path class="lh-flow" d="M214 168C300 168 340 156 392 156M568 156C620 156 660 168 746 168" stroke="' + GOLD + '" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" fill="none"/>' +
      '<circle cx="150" cy="168" r="64" fill="' + INK + '" stroke="' + GOLD + '" stroke-opacity=".45" stroke-width="2"/>' +
      '<circle cx="810" cy="168" r="64" fill="' + INK + '" stroke="' + GOLD + '" stroke-opacity=".45" stroke-width="2"/>' +
      '<g transform="translate(150 168)">' + o.left + '</g>' +
      '<g transform="translate(810 168)">' + o.right + '</g>' +
      '<ellipse cx="480" cy="246" rx="104" ry="18" fill="#7a4e1d"/>' +
      '<ellipse cx="480" cy="238" rx="104" ry="18" fill="url(#lhGold)"/>' +
      '<g transform="translate(480 ' + (o.cy || 168) + ')"><g class="lh-float">' + o.center + '</g></g>' +
      '<g class="lh-tw" fill="' + HOT + '"><path d="M330 70l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M640 58l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M700 236l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M262 240l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>' +
      '</svg>';
  }

  var smallJar = at(0, 2, 0.62, jar());
  var ART = {
    'learn:free-ai': {title: 'เสียง ไฟล์ และแชตเดิม ปรุงเป็นซอส .md ขวดแรก',
      left: at(-26, -20, 0.9, mic()) + at(24, -18, 0.9, file()) + at(0, 26, 0.9, chat()), center: jar(), right: doc()},
    'learn:image-ai': {title: 'ใช้ซอสสร้างภาพ แล้วชิมว่า AI เข้าใจคุณไหม',
      left: smallJar, center: spoon(), cy: 172, right: picture(true)},
    'learn:clip-ai': {title: 'ซอสกับภาพ ผัดเป็นคลิปแนวตั้ง 10 วินาที',
      left: at(-18, 4, 0.5, jar()) + at(20, 0, 0.5, picture(false)), center: wok(), cy: 184, right: at(0, 0, 0.82, phone())},
    'learn:notebooklm': {title: 'ซอสขวดเดียว แบ่งเป็นภาพ เสียง และสไลด์',
      left: smallJar, center: bento(), cy: 180, right: trio()},
    'learn:prompts': {title: 'ซอสกับคำสั่งลัด ได้ผู้ช่วย AI ที่รู้ใจคุณ',
      left: smallJar, center: shaker(), right: at(0, 0, 0.9, agent())},
    'learn:first-web': {title: 'เสิร์ฟซอสเป็นเว็บของคุณเอง',
      left: smallJar, center: cloche(), cy: 186, right: at(0, 0, 0.92, browser())}
  };

  var CSS = '.mc-loot-hero{margin:18px 0 6px;max-width:820px}' +
    '.mc-loot-hero svg{display:block;width:100%;height:auto;border-radius:22px;box-shadow:0 18px 40px -26px #000,0 0 0 1px rgba(226,194,122,.25)}' +
    // The old per-lesson art used different styles; the new strip replaces it.
    '.mc-loot-on .hero-stage,.mc-loot-on .hero-art,.mc-loot-on .shelf,figure[aria-labelledby^="multiplyIll"]{display:none!important}' +
    // One title per lesson: the mission card at the top carries the name, so the header copy below stops repeating it.
    '.cl-visible-hero>.lv,.cl-visible-hero h1,.cl-visible-hero .headgrid>div>.lv,.cl-visible-hero .lesson6-hero-copy>.lv{display:none!important}';

  function mount() {
    var id = document.querySelector('meta[name="mc-item"]');
    var art = id && ART[id.content];
    if (!art || document.querySelector('.mc-loot-hero')) return;
    var hero = document.querySelector('main > .head, main > .hero, main .head, main .hero, body > .wrap > .head, header.head');
    if (!hero) return;
    if (!document.getElementById('mc-loot-css')) {
      var st = document.createElement('style'); st.id = 'mc-loot-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var box = document.createElement('div');
    box.className = 'mc-loot-hero';
    box.innerHTML = frame(art);
    var meta = hero.querySelector('.meta');
    if (meta && meta.parentNode) meta.parentNode.insertBefore(box, meta.nextSibling);
    else hero.appendChild(box);
    hero.classList.add('mc-loot-on');
  }

  // For previews and tests: MC_LESSON_ART.render('learn:image-ai') returns that lesson's SVG.
  window.MC_LESSON_ART = {render: function (id) { return ART[id] ? frame(ART[id]) : ''; }};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();
