// "/" — Hamburg Food Fair entrance, staged as an evening food fair.
// One DOM, two presentations (styles in src/fair.css):
//  - 3D plaza (default when supported): three booths on an arc at equal distance from the visitor.
//    Drag to look around, tap a booth to walk up to it, then enter. Built with CSS 3D so logos,
//    photos and the "enter booth" links stay real, keyboard-usable HTML.
//  - List (reduced motion, no 3D support, or the visitor's choice): a lane of three equal stalls.
// Booth order is the visitor's remembered random order in both.
import { config, totalCart } from '../product.js';
import { boothOrder, selectBooth, getCart, record, read, write } from '../store.js';
import { brands } from '../brands/meta.js';
import { brandLogo } from '../identity.js';
import { whenVisible } from '../track.js';
import { esc, href, brandMedia, baht, weight, startPrice, conceptNote, facts } from '../ui.js';

export const meta = {
  title: 'Hamburg Food Fair | แฮมเบิร์กญี่ปุ่นพร้อมซอส 3 บูธ',
  description: 'แฮมเบิร์กญี่ปุ่นพร้อมซอส 3 บูธ เลือกเข้าไปดูมื้อที่อยากกิน'
};

const NIGHT = '#15172F';

// Plaza geometry in design pixels. fair.css positions the 3D parts with the same numbers.
const G = {
  YH: 390,          // horizon / eye level inside the design view
  P: 780,           // perspective distance; equal to R so a booth is drawn at 1:1 from the centre
  R: 780,           // radius of the arc the booths stand on
  TH: 26,           // degrees between neighbouring booths
  BAND_TOP: 280,    // booth extent above the horizon (awning top)
  BAND_BOTTOM: 292, // booth extent below the horizon (ground line of the side booths)
  HALF_W: 570,      // half width needed to see all three booths
  BOOTH_W: 364,     // one booth including awning overhang
  WALK: 210         // how far the camera walks toward a booth
};
const angleOf = i => (1 - i) * G.TH; // left booth sits at +TH

// Each stall shows its own brand photo in a window of identical size.
const stallArt = {
  homechew: () => brandMedia('homechew').img('hero', { sizes: '(min-width: 760px) 30vw, 92vw', pos: '50% 60%' }),
  tmt: () => brandMedia('tmt').img('hero', { sizes: '(min-width: 760px) 30vw, 92vw', pos: '50% 58%' }),
  noomjang: () => brandMedia('noomjang').img('hero', { sizes: '(min-width: 760px) 30vw, 92vw', pos: '52% 58%' })
};

/*
 * String lights: sagging runs of wire with bulbs. The wire is one SVG path stretched to the
 * container width; bulbs sit on the same parabola so they stay round at any width.
 */
function stringLights(cls = '', swags = 3, perSwag = 6) {
  const top = 8, sag = 26;
  const wire = Array.from({ length: swags }, (_, k) =>
    `M${k * 100} ${top} Q${k * 100 + 50} ${top + sag * 2} ${(k + 1) * 100} ${top}`).join(' ');
  const bulbs = [];
  for (let k = 0; k < swags; k++) for (let j = 1; j <= perSwag; j++) {
    const t = j / (perSwag + 1);
    bulbs.push(`<i class="fair-bulb" style="left:${((k + t) / swags * 100).toFixed(2)}%;top:${(top + 4 * sag * t * (1 - t)).toFixed(1)}px;--d:${((k * perSwag + j) * 0.37 % 2.6).toFixed(2)}s"></i>`);
  }
  return `<div class="fair-lights ${cls}" aria-hidden="true">
    <svg viewBox="0 0 ${swags * 100} 70" preserveAspectRatio="none"><path d="${wire}"/></svg>
    ${bulbs.join('')}
  </div>`;
}

function stall(id, i) {
  const b = brands[id];
  return `<li class="stall stall-${id}" id="stall-${id}" style="--i:${i};--th:${angleOf(i)}deg">
    <i class="stall-wall l" aria-hidden="true"></i><i class="stall-wall r" aria-hidden="true"></i>
    <i class="stall-fascia" aria-hidden="true"></i>
    <div class="stall-awning" aria-hidden="true"></div>
    <i class="stall-valance" aria-hidden="true"></i>
    <div class="stall-body">
      <h2 class="stall-sign">${brandLogo(id, { full: true })}</h2>
      <figure class="stall-window">
        ${stallArt[id]()}
        <figcaption class="stall-tag"><span>${config.product.packPieces} ชิ้นพร้อมซอส</span><strong>เริ่ม ${startPrice()}</strong></figcaption>
      </figure>
      <div class="stall-counter">
        <p class="stall-line">${esc(b.arenaLine)}</p>
        <a class="stall-cta" data-link data-booth="${id}" href="${href(`/${id}/`)}">${esc(b.arenaCta)} <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </li>`;
}

export function render() {
  const drafts = boothOrder.map(id => [id, totalCart(getCart(id))]).filter(([, t]) => t.sets > 0);
  return `<div class="page fair" data-brand="arena">
  <header class="fair-gate">
    ${stringLights()}
    <p class="fair-arch"><span class="fair-arch-en">Hamburg Food Fair</span><span class="fair-arch-th">เปิดเตา 3 บูธ</span></p>
    <h1 class="fair-h1"><span class="nb">เลือกบูธ</span><span class="nb">ที่ทำให้หิว</span></h1>
    <p class="fair-sub"><span class="nb">แฮมเบิร์กญี่ปุ่นพร้อมซอส 3 บูธ</span> <span class="nb">เลือกเข้าไปดูมื้อที่อยากกิน</span></p>
    <p class="fair-invite"><span class="nb">เริ่มบูธไหนก็ได้</span> <span class="nb">แล้วค่อยกลับมาเดินดูอีกบูธ</span></p>
    <nav class="fair-signpost" aria-label="ป้ายบอกทางไปแต่ละบูธ">
      ${boothOrder.map(id => `<a href="#stall-${id}" data-walk="${id}">${esc(brands[id].name)} <span aria-hidden="true">↓</span></a>`).join('')}
    </nav>
  </header>

  <main id="main">
    <section class="fair-lane" aria-labelledby="lane-title">
      <h2 class="fair-sr" id="lane-title">บูธในงาน</h2>
      <div class="fair-stage" data-stage>
        <div class="fair-backdrop" aria-hidden="true"></div>
        <div class="fair-view"><div class="fair-world">
          <div class="fair-ground" aria-hidden="true"></div>
          ${stringLights('fair-string s2', 5, 6)}
          <ul class="stalls" role="list">${boothOrder.map(stall).join('')}</ul>
          ${stringLights('fair-string s1', 5, 6)}
        </div></div>
        <div class="fair-fade" aria-hidden="true"></div>
        <div class="fair-hud">
          <div class="fair-cam">
            <button type="button" data-cam="prev" aria-label="เลี้ยวไปบูธทางซ้าย">◀</button>
            <button type="button" data-cam="all">ดูทั้งงาน</button>
            <button type="button" data-cam="next" aria-label="เลี้ยวไปบูธทางขวา">▶</button>
          </div>
          <p class="fair-hint" aria-hidden="true">ลากเพื่อมองรอบงาน · แตะบูธเพื่อเดินเข้าไป</p>
          <p class="fair-sr" role="status" data-say></p>
        </div>
      </div>
      <p class="fair-mode"><button type="button" data-mode hidden></button></p>
    </section>

    <section class="fair-board" aria-labelledby="same-title">
      <div class="board">
        <p class="board-kicker">ป้ายหน้างาน</p>
        <h2 id="same-title">ทุกบูธใช้สินค้าและราคาเดียวกัน</h2>
        <p class="board-what">แฮมเบิร์กสไตล์ญี่ปุ่น ${config.product.packPieces} ก้อนพร้อมซอสต่อแพ็ก · อาหารสุทธิ ${weight()}</p>
        <ul class="board-prices" role="list">
          ${config.offers.map(o => `<li><span>${o.packs} แพ็ก</span><strong>${baht(o.priceBaht)}</strong></li>`).join('')}
        </ul>
        <p class="board-note">ราคาไม่รวมค่าจัดส่ง</p>
      </div>
    </section>

    ${drafts.length ? `<section class="fair-bag" aria-labelledby="drafts-title">
      <h2 id="drafts-title">ตะกร้าที่คุณเลือกไว้</h2>
      <ul role="list">${drafts.map(([id, t]) => `<li>
        <span><strong>${esc(brands[id].name)}</strong> · ${t.sets} ชุด · ${t.packs} แพ็ก · ${baht(t.subtotal)}</span>
        <a data-link href="${href(`/checkout/?brand=${id}`)}">ดูสรุป</a>
      </li>`).join('')}</ul>
      <p class="fair-small">ตะกร้าแต่ละบูธเป็นร่างแยกกัน สรุปได้ทีละบูธ</p>
    </section>` : ''}
  </main>

  <footer class="fair-foot">
    <p class="fair-design-link"><a data-link href="${href('/branding/')}">ดูโลโก้และแพ็กเกจทั้ง 3 แบรนด์ →</a></p>
    ${facts.seller().map(s => `<p>${esc(s)}</p>`).join('')}
    <p>${facts.fulfilment()}</p>
    <p class="fair-small">${conceptNote}</p>
  </footer>
  </div>`;
}

export function mount(root) {
  const gate = root.querySelector('.fair-gate');
  const stage = root.querySelector('[data-stage]');
  const viewEl = root.querySelector('.fair-view');
  const world = root.querySelector('.fair-world');
  const backdrop = root.querySelector('.fair-backdrop');
  const fade = root.querySelector('.fair-fade');
  const say = root.querySelector('[data-say]');
  const modeBtn = root.querySelector('[data-mode]');
  const stalls = [...root.querySelectorAll('.stall')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const can3d = !!globalThis.CSS?.supports?.('transform-style', 'preserve-3d') && CSS.supports('perspective', '1px');

  const offs = [];
  const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); offs.push(() => target.removeEventListener(type, fn, opts)); };

  // Browser chrome matches the night sky while the fair is open.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', NIGHT);
  offs.push(whenVisible(() => record('arena_view')));

  let mode = 'list';
  let view = -1;                       // -1 = whole plaza, 0..2 = standing at that booth
  let look = { yaw: 0, strafe: 0 };    // temporary look-around offset from drag or pointer
  let entering = false;
  let L = null;                        // measured layout for the current stage size
  let io = null;

  function layout() {
    const Ws = stage.clientWidth;
    const gateH = gate.offsetHeight;
    const band = G.BAND_TOP + G.BAND_BOTTOM;
    root.style.setProperty('--gate-h', `${gateH}px`);
    const kW = Math.min((Ws - 16) / (2 * G.HALF_W), 1.05);
    const Hs = Math.round(Math.min(Math.max(560, innerHeight), Math.max(560, gateH + band * kW + 78)));
    stage.style.height = `${Hs}px`;
    const kAll = Math.max(0.2, Math.min(kW, (Hs - gateH - 70) / band));
    const sf = G.R / (G.R - G.WALK);   // a booth grows by this much when the camera walks up
    const top = 66;                    // room for the camera buttons
    const kFocus = Math.max(0.2, Math.min((Ws - 24) / (G.BOOTH_W * sf), (Hs - top - 18) / (band * sf), 1));
    L = {
      Hs,
      all: { k: kAll, yh: gateH + G.BAND_TOP * kAll + 6 },
      focus: { k: kFocus, yh: top + (Hs - top - 18) / 2 + (G.BAND_TOP - G.BAND_BOTTOM) / 2 * kFocus * sf }
    };
  }

  function apply() {
    if (mode !== '3d' || !L) return;
    const focused = view >= 0;
    const g = focused ? L.focus : L.all;
    const th = focused ? angleOf(view) : 0;
    const rad = th * Math.PI / 180;
    const walk = focused ? G.WALK + (entering ? 250 : 0) : 0;
    const cx = -walk * Math.sin(rad) + look.strafe;
    const cz = -walk * Math.cos(rad);
    const k = g.k * (entering ? 1.18 : 1);
    viewEl.style.transform = `translateY(${(g.yh - G.YH).toFixed(1)}px) scale(${k.toFixed(4)})`;
    world.style.transform = `translateZ(${G.P}px) rotateY(${(-th + look.yaw).toFixed(2)}deg) translate3d(${(-cx).toFixed(1)}px,0,${(-cz).toFixed(1)}px)`;
    backdrop.style.transform = `translateY(${(g.yh - L.Hs).toFixed(1)}px)`;
    root.classList.toggle('is-focus', focused);
    // A flat screen stretches whatever sits off the camera axis. Project each booth front from the
    // real camera position and undo that stretch, so all three are drawn the same size as the booth
    // the camera faces. While standing at one booth, its neighbours step back a little.
    const fwd = [-Math.sin(rad), -Math.cos(rad)], right = [Math.cos(rad), -Math.sin(rad)];
    const cam = [-walk * Math.sin(rad), -walk * Math.cos(rad)];
    const depthRef = G.R - walk;
    stalls.forEach((el, i) => {
      el.classList.toggle('is-focus', i === view);
      const a = angleOf(i) * Math.PI / 180;
      const pos = [-G.R * Math.sin(a) - cam[0], -G.R * Math.cos(a) - cam[1]];
      const half = [Math.cos(a) * 160, -Math.sin(a) * 160];   // half of the 320px front, along the booth
      const proj = sign => {
        const q = [pos[0] + sign * half[0], pos[1] + sign * half[1]];
        return (q[0] * right[0] + q[1] * right[1]) / Math.max(60, q[0] * fwd[0] + q[1] * fwd[1]);
      };
      const depth = Math.max(60, pos[0] * fwd[0] + pos[1] * fwd[1]);
      const aside = focused && i !== view ? 0.84 : 1;
      const sx = Math.min(1.2, Math.max(0.3, (320 / depthRef) / Math.abs(proj(1) - proj(-1)))) * aside;
      const sy = Math.min(1.2, Math.max(0.3, depth / depthRef)) * aside;
      el.style.setProperty('--sx', sx.toFixed(4));
      el.style.setProperty('--sy', sy.toFixed(4));
    });
    root.querySelector('[data-cam="prev"]').disabled = view <= 0;
    root.querySelector('[data-cam="next"]').disabled = view < 0 || view >= stalls.length - 1;
  }

  function go(i) {
    if (mode !== '3d' || entering) return;
    view = Math.max(-1, Math.min(stalls.length - 1, i));
    look = { yaw: 0, strafe: 0 };
    root.classList.add('has-walked');
    apply();
    say.textContent = view < 0 ? 'มองเห็นทั้งงาน' : `ยืนอยู่หน้าบูธ ${brands[boothOrder[view]].name}`;
  }

  // Walk through the booth front, then let the router follow the real link.
  function walkIn(anchor) {
    entering = true;
    view = stalls.indexOf(anchor.closest('.stall'));
    look = { yaw: 0, strafe: 0 };
    fade.style.background = getComputedStyle(anchor.closest('.stall')).getPropertyValue('--b') || NIGHT;
    root.classList.add('is-entering');
    apply();
    setTimeout(() => { anchor.dataset.go = '1'; anchor.click(); }, 430);
  }

  function setMode(next, remember = false) {
    mode = next;
    if (remember) write('fairMode', next);
    io?.disconnect(); io = null;
    root.classList.toggle('is-3d', mode === '3d');
    root.classList.remove('is-walk', 'is-focus', 'is-entering', 'has-walked');
    stalls.forEach(el => el.classList.remove('is-focus', 'is-lit'));
    view = -1; entering = false; look = { yaw: 0, strafe: 0 };
    if (can3d) { modeBtn.hidden = false; modeBtn.textContent = mode === '3d' ? 'ดูแบบรายการ' : 'เดินชมงานแบบ 3D'; }
    root.classList.remove('is-ready');
    if (mode === '3d') {
      layout(); apply();
      // Camera moves animate only after the first frame, so the plaza never "flies in" on load.
      setTimeout(() => { if (mode === '3d') root.classList.add('is-ready'); }, 80);
      return;
    }
    for (const el of [stage, viewEl, world, backdrop]) el.removeAttribute('style');
    stalls.forEach(el => { el.style.removeProperty('--sx'); el.style.removeProperty('--sy'); });
    root.style.removeProperty('--gate-h');
    // List view: stall lights switch on as you walk up to each one. Stalls already on screen light
    // up right away (never waiting on an observer); with reduced motion every stall is simply lit.
    if (!reduce && 'IntersectionObserver' in window) {
      root.classList.add('is-walk');
      io = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-lit'); io.unobserve(entry.target); }
      }, { threshold: 0.18 });
      for (const el of stalls) {
        if (el.getBoundingClientRect().top < innerHeight * 0.9) el.classList.add('is-lit');
        else io.observe(el);
      }
    }
  }

  // ----- pointer: drag to look around, swipe between booths -----
  let drag = null, suppressClick = false;
  on(stage, 'pointerdown', e => {
    if (mode !== '3d' || entering || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, active: false };
  });
  on(stage, 'pointermove', e => {
    if (mode !== '3d' || entering) return;
    if (drag && e.pointerId === drag.id) {
      drag.dx = e.clientX - drag.x;
      if (!drag.active && Math.abs(drag.dx) > 10 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y)) {
        drag.active = true;
        stage.classList.add('is-dragging');
        try { stage.setPointerCapture(e.pointerId); } catch { /* capture is optional */ }
      }
      if (drag.active) {
        look.yaw = Math.max(-38, Math.min(38, -drag.dx * 0.09));
        look.strafe = Math.max(-130, Math.min(130, -drag.dx * 0.28));
        apply();
      }
    } else if (!drag && e.pointerType === 'mouse') {
      // Gentle parallax under the mouse: the camera leans toward where you point.
      const f = (e.clientX - stage.getBoundingClientRect().left) / stage.clientWidth - 0.5;
      const amount = view < 0 ? 1 : 0.5;
      look.yaw = f * 5 * amount;
      look.strafe = f * 90 * amount;
      stage.classList.add('is-leaning');
      apply();
    }
  });
  const endDrag = e => {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    const { active, dx } = drag;
    drag = null;
    stage.classList.remove('is-dragging');
    if (!active) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 60);
    look = { yaw: 0, strafe: 0 };
    if (view >= 0 && Math.abs(dx) > 60) go(view + (dx < 0 ? 1 : -1));
    else apply();
  };
  on(stage, 'pointerup', endDrag);
  on(stage, 'pointercancel', endDrag);
  on(stage, 'pointerleave', e => {
    if (drag || mode !== '3d' || e.pointerType !== 'mouse') return;
    stage.classList.remove('is-leaning');
    look = { yaw: 0, strafe: 0 };
    apply();
  });

  // ----- clicks -----
  on(root, 'click', e => {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (e.target.closest('[data-mode]')) { setMode(mode === '3d' ? 'list' : '3d', true); return; }
    const cam = e.target.closest('[data-cam]');
    if (cam) { go(cam.dataset.cam === 'all' ? -1 : view + (cam.dataset.cam === 'next' ? 1 : -1)); return; }
    const sign = e.target.closest('[data-walk]');
    if (sign && mode === '3d') { e.preventDefault(); go(boothOrder.indexOf(sign.dataset.walk)); return; }
    const anchor = e.target.closest('[data-booth]');
    if (anchor) {
      if (anchor.dataset.go) { delete anchor.dataset.go; return; }   // second pass after the walk-in
      selectBooth(anchor.dataset.booth);
      if (mode === '3d' && !reduce && !entering) { e.preventDefault(); walkIn(anchor); }
      return;
    }
    const st = e.target.closest('.stall');
    if (st && mode === '3d' && !entering) {
      const i = stalls.indexOf(st);
      if (view === i) st.querySelector('[data-booth]').click();
      else go(i);
    }
  });

  // Keyboard: tabbing to a booth's link turns the camera to it; arrows turn, Escape steps back.
  on(root, 'focusin', e => {
    const st = e.target.closest?.('.stall');
    if (st && mode === '3d' && !entering && view !== stalls.indexOf(st)) go(stalls.indexOf(st));
  });
  on(root, 'keydown', e => {
    if (mode !== '3d' || entering || !stage.contains(e.target)) return;
    if (e.key === 'Escape' && view >= 0) go(-1);
    else if (e.key === 'ArrowRight') go(view < 0 ? 1 : view + 1);
    else if (e.key === 'ArrowLeft') go(view < 0 ? 1 : view - 1);
  });

  let resizeFrame = 0;
  on(window, 'resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { if (mode === '3d') { layout(); apply(); } });
  });

  // Default to the 3D plaza; reduced motion gets the list unless the visitor asked for 3D.
  const pref = read('fairMode', null);
  setMode(can3d && pref !== 'list' && !(reduce && pref !== '3d') ? '3d' : 'list');
  document.fonts?.ready.then(() => { if (mode === '3d' && root.isConnected) { layout(); apply(); } });

  return () => { offs.forEach(off => off()); io?.disconnect(); cancelAnimationFrame(resizeFrame); };
}
