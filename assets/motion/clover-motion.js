/*!
 * Clover Motion · the shared motion layer for every room of myClover.
 *
 *   <link rel="stylesheet" href="/assets/motion/clover-motion.css">
 *   <script src="/assets/motion/clover-motion.js" defer data-profile="story"></script>
 *
 * The house (/) links to every page, so each page is its own entrance. This layer gives all
 * of them the same feel as the house: smooth wheel scrolling, page-to-page transitions,
 * blocks that rise in as you scroll, media with depth, cards that answer the pointer, and a
 * small door back to the room you came from. It is strictly progressive: no dependency, no
 * layout of its own, nothing hidden without JavaScript, and "reduce motion" turns it off.
 *
 * Profiles (data-profile)
 *   story      reading pages: every feature below
 *   immersive  pages that choreograph their own scroll: smooth scroll, progress, portal
 *   app        games, tools and 3D rooms: page transitions only; their own UI owns the screen
 *   hub        the house itself: transitions, and remembers which room you leave from
 * Fine tuning: data-off="tilt lenis", data-on="chapters", data-chapters="h2" (selector).
 * In the page: data-cm="off" skips an element (and everything inside) for reveal/tilt;
 * data-cm-reveal marks a block to reveal, data-cm-parallax="8%" adds depth to media,
 * data-cm-tilt="sheen" makes a card follow the pointer, data-lenis-prevent keeps native scroll.
 */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  if (root.hasAttribute('data-cm')) return;
  const me = doc.currentScript, opt = (me && me.dataset) || {};

  const PROFILES = {
    story: ['lenis', 'progress', 'reveal', 'hero', 'parallax', 'tilt', 'magnetic', 'portal', 'prefetch', 'anchors'],
    immersive: ['lenis', 'progress', 'portal', 'prefetch', 'anchors'],
    app: ['prefetch'],
    hub: ['hub', 'prefetch'],
  };
  const profile = PROFILES[opt.profile] ? opt.profile : 'story';
  const on = new Set(PROFILES[profile]);
  for (const k of (opt.off || '').split(/[\s,]+/)) on.delete(k);
  for (const k of (opt.on || '').split(/[\s,]+/)) if (k) on.add(k);
  if (opt.chapters) on.add('chapters');
  root.setAttribute('data-cm', profile);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const framed = (() => { try { return window.top !== window; } catch { return true; } })();
  const session = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const style = el => getComputedStyle(el);
  const skipped = el => !!(el.closest && el.closest('[data-cm="off"]'));
  const scope = () => doc.querySelector('main') || doc.body;

  /* ---------- rooms of the house, so every page knows its way back ---------- */
  const ROOMS = {living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', classroom: 'ห้องเรียน', office: 'ห้องโปรเจกต์', finale: ''};
  const GUESS = [
    [/^\/(ako|homechew|xircle)(\/|$)/, 'kitchen'],
    [/^\/(courses|classroom|learn|course|ai-source)(\/|$)/, 'classroom'],
    [/^\/(xvisor|teambook|showcase|resume)(\/|$)/, 'office'],
    [/^\/(meet|privacy)(\/|$)/, 'finale'],
    [/^\/(compass|core7|forge|walkthrough|home|hall|book)(\/|\.|$)/, 'living'],
  ];
  const areaOf = path => (path.match(/^\/[^/.]+/) || [path])[0];
  const ROOM_KEY = 'cm:room';

  function whereFrom() {
    try {
      const saved = JSON.parse(session.get(ROOM_KEY) || 'null');
      if (saved && saved.area === areaOf(location.pathname) && saved.room in ROOMS) return saved.room;
    } catch {}
    for (const [re, room] of GUESS) if (re.test(location.pathname)) return room;
    return '';
  }

  /* the house: remember the room a visitor leaves from */
  function hub() {
    doc.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.origin !== location.origin || a.pathname === '/') return;
      let room = a.closest('[data-scene]')?.dataset.scene;
      if (!(room in ROOMS)) room = doc.querySelector('.rail a.active')?.dataset.rail;
      if (room === 'stairs') room = 'classroom';
      if (room in ROOMS) session.set(ROOM_KEY, JSON.stringify({room, area: areaOf(a.pathname)}));
    }, true);
  }

  /* ---------- the portal: a small door back to the house ---------- */
  const LEAF = '<svg viewBox="0 0 100 100" aria-hidden="true">' + [0, 90, 180, 270].map(r => `<path transform="rotate(${r} 50 50)" d="M50 50C40 44 30 36 30 26c0-7 5-12 11-12 4 0 7 2 9 6 2-4 5-6 9-6 6 0 11 5 11 12 0 10-10 18-20 24z"/>`).join('') + '</svg>';

  function portal() {
    if (framed || doc.querySelector('.cm-portal')) return;
    const room = whereFrom(), label = ROOMS[room] || '';
    const a = doc.createElement('a');
    a.className = 'cm-portal';
    a.href = '/' + (room ? '#' + room : '');
    a.setAttribute('aria-label', 'กลับบ้าน myClover' + (label ? ' · ' + label : ''));
    a.innerHTML = `<span class="cm-portal__leaf">${LEAF}</span><span class="cm-portal__text">กลับบ้าน${label ? `<small>${label}</small>` : ''}</span>`;
    doc.body.append(a);

    // never sit on top of the page's own floating controls: try bottom-left, then bottom-right
    const fixedLayer = n => {
      for (let el = n; el && el !== doc.body && el !== root; el = el.parentElement) {
        if (el === a) return false;
        const p = style(el).position;
        // on a one-screen app page, pinned labels and controls are absolutely placed too
        if (p === 'fixed' || p === 'sticky' || (p === 'absolute' && root.scrollHeight <= innerHeight + 40)) {
          const r = el.getBoundingClientRect(); // a full-screen backdrop is scenery, not a control
          return r.width * r.height < innerWidth * innerHeight * 0.4;
        }
      }
      return false;
    };
    // a one-screen app has no scroll to move things out from under the door: keep its links clear too
    const control = n => root.scrollHeight <= innerHeight + 40 && !!n.closest?.('a[href], button, input, select, textarea, label, [role="button"], [tabindex]');
    const blocked = side => {
      const w = a.offsetWidth, h = a.offsetHeight, x = side === 'bl' ? 16 : innerWidth - 16 - w, y = innerHeight - 16 - h;
      for (const [px, py] of [[x + 6, y + 6], [x + w / 2, y + h / 2], [x + w - 6, y + h - 6]]) {
        if (px < 0 || py < 0 || px > innerWidth || py > innerHeight) continue;
        if (doc.elementsFromPoint(px, py).some(n => n !== a && !a.contains(n) && (fixedLayer(n) || control(n)))) return true;
      }
      return false;
    };
    const place = () => {
      if (a.hidden) a.hidden = false;
      const side = ['bl', 'br'].find(s => !blocked(s));
      if (side && a.dataset.side !== side) a.dataset.side = side;
      if (!side) a.hidden = true;
    };
    requestAnimationFrame(place);
    addEventListener('load', place);
    addEventListener('resize', debounce(place, 250));
    // controls that a page adds later (a sticky bar, a banner) also move the door out of the way
    const later = debounce(place, 400);
    if (window.MutationObserver) new MutationObserver(records => { if (records.some(r => !a.contains(r.target))) later(); })
      .observe(doc.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style']});

    // a long page starts with its own header, so the door waits: it appears once you are
    // reading, steps aside while you scroll down, and comes back on the way up or at the end
    const long = () => root.scrollHeight > innerHeight * 1.5;
    let last = scrollY, idle;
    const tuck = down => {
      const y = scrollY, end = y + innerHeight >= root.scrollHeight - 120;
      a.classList.toggle('cm-tuck', long() && !end && (y < innerHeight * 0.45 || down));
      // the first time it shows in this visit, it rings once so it is noticed
      if (!reduced && !a.classList.contains('cm-tuck') && !session.get('cm:portal-seen')) { a.classList.add('cm-arrive'); session.set('cm:portal-seen', '1'); }
    };
    tuck(false);
    addEventListener('scroll', () => {
      const y = scrollY;
      if (Math.abs(y - last) > 6) { tuck(y > last); last = y; }
      clearTimeout(idle); idle = setTimeout(place, 420);
    }, {passive: true});
    addEventListener('load', () => tuck(false));
  }

  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ---------- smooth wheel scrolling: the same Lenis the house uses ---------- */
  let lenis = null;
  function smooth() {
    if (reduced || !fine || framed) return;
    const locked = () => {
      const h = style(root), b = style(doc.body);
      return /hidden|clip/.test(h.overflowY) || /hidden|clip/.test(b.overflowY) || !!doc.querySelector('dialog[open]:modal, [aria-modal="true"]:not([hidden])');
    };
    import('/tour/vendor/lenis.mjs').then(({default: Lenis}) => {
      lenis = new Lenis({
        lerp: 0.085, wheelMultiplier: 0.9, autoRaf: true, allowNestedScroll: true,
        prevent: n => n.matches?.('[data-cm="off"], dialog, [role="dialog"], canvas, textarea, select, iframe'),
        virtualScroll: () => !locked(),
      });
      window.cloverMotion.lenis = lenis;
    }).catch(() => {});
  }

  /* in-page links glide instead of jumping; the browser still owns :target and hashchange */
  function anchors() {
    doc.addEventListener('click', e => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || a.origin !== location.origin || a.pathname !== location.pathname || a.hash.length < 2) return;
      let target = null;
      try { target = doc.getElementById(decodeURIComponent(a.hash.slice(1))); } catch {}
      if (!target) return;
      if (lenis) {
        e.preventDefault();
        if (location.hash !== a.hash) history.pushState(null, '', a.hash);
        lenis.scrollTo(target, {offset: -headerOffset(), duration: 1.2, onComplete: () => {
          // a skip link still moves keyboard focus, as a native jump would
          if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
          target.focus({preventScroll: true});
        }});
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        return;
      }
      if (reduced) return;
      root.style.scrollBehavior = 'smooth';
      setTimeout(() => { root.style.scrollBehavior = ''; }, 1200);
    });
  }
  function headerOffset() {
    const h = doc.querySelector('header, .topbar, nav');
    if (!h) return 0;
    const p = style(h).position, r = h.getBoundingClientRect();
    return (p === 'fixed' || p === 'sticky') && r.top <= 1 && r.height < innerHeight / 3 ? Math.round(r.height + 12) : 0;
  }

  /* ---------- reading progress ---------- */
  function progress() {
    const bar = doc.createElement('div');
    bar.className = 'cm-progress'; bar.setAttribute('aria-hidden', 'true');
    doc.body.append(bar);
    const fit = () => bar.classList.toggle('cm-progress--on', root.scrollHeight > innerHeight * 1.8);
    fit(); addEventListener('load', fit); addEventListener('resize', debounce(fit, 200));
    if (window.ResizeObserver) new ResizeObserver(debounce(fit, 200)).observe(doc.body);
    if (window.CSS && CSS.supports('animation-timeline: scroll()')) return;
    let raf = 0;
    const paint = () => { raf = 0; const max = root.scrollHeight - innerHeight; bar.style.setProperty('--cm-p', max > 0 ? (scrollY / max).toFixed(4) : '0'); };
    addEventListener('scroll', () => { raf ||= requestAnimationFrame(paint); }, {passive: true}); paint();
  }

  /* ---------- reveal: blocks below the fold rise in as they arrive ---------- */
  const NEVER = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|DIALOG|HEADER|NAV|LINK|META|BR|HR|INPUT|SELECT|TEXTAREA|OPTION|IFRAME|svg|path|g|SOURCE|TRACK|AREA|MAP|DATALIST)$/;
  const OWN_MOTION = /(^|[\s_-])(reveal|aos|fade|anim|animate|rise|in-view|inview|appear|sr-only|visually-hidden)([\s_-]|$)/i;

  function units(start) {
    const vh = innerHeight, vw = innerWidth, out = [];
    let visited = 0;
    const walk = (el, depth) => {
      for (const c of el.children) {
        if (out.length >= 320 || ++visited > 4000) return;
        if (NEVER.test(c.tagName) || c.hidden || c.matches('[data-cm="off"], [role="dialog"], [aria-modal], [popover], .cm-portal, .cm-progress, .cm-chapters')) continue;
        const cs = style(c);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed' || cs.position === 'sticky' || cs.position === 'absolute') continue;
        if (cs.display === 'contents') { walk(c, depth); continue; }
        if (cs.animationName !== 'none' || parseFloat(cs.opacity) < 0.99 || OWN_MOTION.test(typeof c.className === 'string' ? c.className : '') || c.hasAttribute('data-aos')) continue;
        const r = c.getBoundingClientRect();
        if (r.width < 24 || r.height < 14 || r.width > vw * 1.2) continue;
        const kids = c.children.length;
        const row = /grid|flex/.test(cs.display) && kids >= 3 && r.height > 90;
        if ((r.height > vh * 0.82 || row) && kids && depth < 9) { walk(c, depth + 1); continue; }
        out.push(c);
      }
    };
    walk(start, 0);
    return out;
  }

  function reveal() {
    if (!('IntersectionObserver' in window) || !(window.CSS && CSS.supports('translate', '1px'))) return;
    const found = units(scope()).concat([...doc.querySelectorAll('[data-cm-reveal]')]);
    const vh = innerHeight, hide = [];
    for (const el of new Set(found)) {
      if (skipped(el) && !el.hasAttribute('data-cm-reveal')) continue;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 || r.bottom <= 0) continue; // what you already see stays put
      el.classList.add('cm-r');
      if (/^(IMG|PICTURE|VIDEO|FIGURE|CANVAS)$/.test(el.tagName)) el.classList.add('cm-r--media');
      hide.push(el);
    }
    if (!hide.length) return;
    root.classList.add('cm-reveal-on');
    const done = el => {
      el.classList.remove('cm-r', 'cm-in', 'cm-r--media', 'cm-r--side');
      el.style.removeProperty('--cm-d');
    };
    const io = new IntersectionObserver(entries => {
      const now = entries.filter(e => e.isIntersecting).map(e => e.target)
        .sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return (ra.top - rb.top) || (ra.left - rb.left); });
      now.forEach((el, i) => {
        io.unobserve(el);
        el.style.setProperty('--cm-d', Math.min(i * 0.075, 0.45).toFixed(3) + 's');
        el.classList.add('cm-in');
        setTimeout(() => done(el), 1500 + i * 75);
      });
    }, {rootMargin: '0px 0px -7% 0px', threshold: 0});
    hide.forEach(el => io.observe(el));
    // printing, or "find in page" jumping far ahead, never meets a hidden block
    addEventListener('beforeprint', () => hide.forEach(el => { io.unobserve(el); done(el); }));
    window.cloverMotion.revealAll = () => hide.forEach(el => { io.unobserve(el); done(el); });
  }

  /* ---------- the hero lets go as you scroll past; media gets depth ---------- */
  function hero() {
    if (!(window.CSS && CSS.supports('animation-timeline: view()'))) return;
    const h1 = doc.querySelector('main h1, h1');
    if (!h1 || skipped(h1)) return;
    let el = h1;
    // the text block around the headline, never a full-screen wrapper
    while (el.parentElement && el.parentElement !== doc.body && el.parentElement.tagName !== 'MAIN') {
      const p = el.parentElement, r = p.getBoundingClientRect();
      if (r.height > innerHeight * 0.75 || /^(SECTION|HEADER|ARTICLE)$/.test(p.tagName) || style(p).position === 'sticky') break;
      el = p;
    }
    const r = el.getBoundingClientRect(), cs = style(el);
    if (r.top > innerHeight || cs.animationName !== 'none' || cs.position === 'fixed' || cs.position === 'sticky') return;
    el.classList.add('cm-hero-out');
  }

  function parallax() {
    const list = [...doc.querySelectorAll('[data-cm-parallax]')];
    // one automatic candidate: the first large picture near the top, cropped by its frame
    const media = [...scope().querySelectorAll('img, video')]
      .find(m => {
        if (skipped(m) || m.closest('a, button')) return false;
        const r = m.getBoundingClientRect(), p = m.parentElement;
        if (r.top > innerHeight * 1.2 || r.width < innerWidth * 0.3 || r.height < 220) return false;
        const pc = p && style(p), mc = style(m);
        return pc && /hidden|clip/.test(pc.overflow + pc.overflowY) && mc.animationName === 'none' && mc.position !== 'fixed' && mc.objectFit !== 'contain';
      });
    if (media && !media.hasAttribute('data-cm-parallax')) { media.dataset.cmParallax = '3.5%'; media.classList.add('cm-par--zoom'); list.push(media); }
    if (!list.length) return;
    const css = window.CSS && CSS.supports('animation-timeline: view()');
    for (const el of list) { el.classList.add('cm-par'); el.style.setProperty('--cm-par', el.dataset.cmParallax || '6%'); }
    if (css) return;
    // older browsers: a light scroll handler moves the same property
    let raf = 0;
    const paint = () => {
      raf = 0;
      for (const el of list) {
        const r = el.getBoundingClientRect(), k = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1) * 2 - 1;
        const amt = parseFloat(el.dataset.cmParallax) || 6;
        el.style.translate = `0 ${(k * amt).toFixed(2)}%`;
      }
    };
    addEventListener('scroll', () => { raf ||= requestAnimationFrame(paint); }, {passive: true}); paint();
  }

  /* ---------- cards follow the pointer; the main button leans toward it ---------- */
  function tilt() {
    if (!fine) return;
    const auto = [...scope().querySelectorAll('a[href], article, [class*="card"], li')].filter(el => {
      if (skipped(el) || el.closest('header, nav, footer, form, dialog, [role="dialog"]')) return false;
      const cs = style(el);
      if (cs.transform !== 'none' || cs.position === 'fixed' || cs.position === 'sticky' || !/block|flex|grid/.test(cs.display)) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 170 || r.width > 760 || r.height < 110 || r.height > 720) return false;
      const framed = parseFloat(cs.borderTopLeftRadius) >= 8 && (cs.boxShadow !== 'none' || cs.borderTopStyle !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor));
      return framed && (el.matches('a[href]') || el.querySelector('a[href]'));
    });
    // keep the outermost card when cards nest
    const cards = [...new Set(auto.concat([...doc.querySelectorAll('[data-cm-tilt]')]))].filter((el, _, all) => !all.some(o => o !== el && o.contains(el)));
    for (const el of cards) {
      const sheen = el.dataset.cmTilt === 'sheen';
      const base = style(el).transition;
      el.classList.add('cm-tilt');
      if (sheen) el.classList.add('cm-tilt--sheen');
      let raf = 0, ev = null, leaving;
      const max = sheen ? 9 : 4.5, lift = sheen ? 0 : -3;
      const paint = () => {
        raf = 0; if (!ev) return;
        const r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.transform = `perspective(${Math.max(700, r.width * 2.2)}px) translateY(${lift}px) rotateX(${((0.5 - y) * max).toFixed(2)}deg) rotateY(${((x - 0.5) * max).toFixed(2)}deg)`;
        el.style.setProperty('--cm-mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--cm-my', (y * 100).toFixed(1) + '%');
      };
      el.addEventListener('pointerenter', () => {
        clearTimeout(leaving);
        el.style.transition = (base && base !== 'all 0s ease 0s' ? base + ', ' : '') + 'transform .22s cubic-bezier(.16,1,.3,1)';
        el.classList.add('cm-hot');
      });
      el.addEventListener('pointermove', e => { ev = e; raf ||= requestAnimationFrame(paint); });
      el.addEventListener('pointerleave', () => {
        ev = null; el.classList.remove('cm-hot');
        el.style.transition = (base && base !== 'all 0s ease 0s' ? base + ', ' : '') + 'transform .7s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
        leaving = setTimeout(() => { el.style.transition = ''; }, 720);
      });
    }
  }

  function magnetic() {
    if (!fine) return;
    const buttons = new Set([...doc.querySelectorAll('[data-cm-magnetic]'), ...scope().querySelectorAll('.btn.primary, .btn-primary, .cta, a.primary, .button-primary, .btn.gold')]);
    for (const el of buttons) {
      if (skipped(el) || el.dataset.cmMagnetic === 'off' || el.closest('nav, dialog')) continue;
      const base = style(el).transition;
      el.addEventListener('pointerenter', () => { el.style.transition = (base && base !== 'all 0s ease 0s' ? base + ', ' : '') + 'translate .3s cubic-bezier(.16,1,.3,1)'; });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.translate = `${(dx * 8).toFixed(1)}px ${(dy * 6).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; setTimeout(() => { el.style.transition = ''; }, 320); });
    }
  }

  /* ---------- chapter rail: where am I in a long read ---------- */
  function chapters() {
    const pick = sel => [...doc.querySelectorAll(sel)].filter(h => h.offsetParent && h.textContent.trim() && !h.closest('header, nav, footer, dialog, aside'));
    let heads = pick(opt.chapters || 'main h2');
    if (heads.length < 3) heads = pick('h2');
    if (heads.length < 3) return;
    const nav = doc.createElement('ol');
    nav.className = 'cm-chapters';
    nav.setAttribute('aria-label', 'สารบัญหน้านี้');
    const links = heads.map((h, i) => {
      if (!h.id) h.id = 'cm-chapter-' + (i + 1);
      const li = doc.createElement('li'), a = doc.createElement('a');
      a.href = '#' + h.id;
      a.innerHTML = '<span></span><i></i>';
      a.firstChild.textContent = h.textContent.replace(/\s+/g, ' ').trim().replace(/^[\d.)\s]+/, '').slice(0, 42);
      li.append(a); nav.append(li);
      return a;
    });
    doc.body.append(nav);
    const fit = () => {
      const right = Math.max(...heads.map(h => { const box = h.parentElement.getBoundingClientRect(); return box.right; }));
      nav.classList.toggle('cm-on', innerWidth >= 1100 && innerWidth - right >= 230);
      nav.hidden = !nav.classList.contains('cm-on');
    };
    fit(); addEventListener('resize', debounce(fit, 200)); addEventListener('load', fit);
    let raf = 0;
    const track = () => {
      raf = 0;
      let current = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < innerHeight * 0.35) current = i; });
      links.forEach((a, i) => { a.classList.toggle('cm-now', i === current); if (i === current) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    };
    addEventListener('scroll', () => { raf ||= requestAnimationFrame(track); }, {passive: true}); track();
  }

  /* ---------- the next room is already on its way when you hover its door ---------- */
  function prefetch() {
    if (!(HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
    const s = doc.createElement('script');
    s.type = 'speculationrules';
    s.textContent = JSON.stringify({prefetch: [{
      source: 'document', eagerness: 'moderate',
      where: {and: [
        {href_matches: '/*'},
        // private rooms, tools and files are never fetched ahead
        ...['api', 'course', 'shelf', 'stat', '*/admin', '*/stat'].map(area => ({not: {href_matches: `/${area}/*`}})),
        {not: {href_matches: '/*logout*'}}, {not: {href_matches: '/*\\.(zip|pdf|mp4|mp3|md)'}},
        {not: {selector_matches: '[download], [rel~="nofollow"], [target="_blank"]'}},
      ]},
    }]});
    doc.head.append(s);
  }

  window.cloverMotion = {profile, features: [...on], lenis: null, revealAll() {}};
  const start = () => {
    root.classList.add('cm-ready');
    const run = (name, fn) => { if (on.has(name)) { try { fn(); } catch (e) { console.warn('clover-motion ' + name, e); } } };
    run('hub', hub);
    run('prefetch', prefetch);
    run('portal', portal);
    run('progress', progress);
    run('chapters', chapters);
    if (reduced) return;
    run('lenis', smooth);
    run('anchors', anchors);
    run('reveal', reveal);
    run('hero', hero);
    run('parallax', parallax);
    run('tilt', tilt);
    run('magnetic', magnetic);
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
