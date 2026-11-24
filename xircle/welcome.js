/* Xircle welcome page runtime.
   - No browser storage, no network calls. A YouTube player is created only after a visitor presses Play,
     and removed when the dialog closes.
   - Episodes play the 16:9 upload on wide screens and the 9:16 upload on narrow ones.
   - Everything here is an enhancement: without this file every clip is still a plain YouTube link. */
(() => {
  'use strict';
  const d = document, root = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowMq = matchMedia('(max-width: 820px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = () => reduceMq.matches;
  const ASSET = '/xircle/assets/welcome/';
  const YT_ID = /^[\w-]{11}$/;
  const pad = n => String(n).padStart(2, '0');

  root.classList.add('js');
  root.classList.toggle('rm', reduce());
  reduceMq.addEventListener?.('change', () => { root.classList.toggle('rm', reduce()); if (reduce()) pauseAll(); });

  /* ── small helpers ── */
  const arm = v => { if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; };
  const play = v => { if (!v || reduce()) return; arm(v); const p = v.play(); if (p) p.catch(() => {}); };
  const stop = v => { if (v && !v.paused) v.pause(); };
  const pauseAll = () => $$('video').forEach(stop);
  function tween(ms, fn, done) {
    const t0 = performance.now();
    const step = t => { const k = clamp((t - t0) / ms); fn(1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
    requestAnimationFrame(step);
  }
  function countUp(scope) {
    if (reduce()) return;
    $$('[data-count]', scope).forEach(b => { const to = +b.dataset.count; if (!(to > 0)) return; tween(1100, k => { b.textContent = Math.round(to * k); }); });
  }

  /* ── reveal on scroll ── */
  const revealIO = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); countUp(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ── nav: current chapter + progress ── */
  const navNow = $('#nav-now'), navBar = $('#nav-bar'), navLinks = $$('.nav-links a');
  const chapterIO = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (navNow) navNow.textContent = e.target.dataset.now;
      navLinks.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    }
  }, { rootMargin: '-45% 0px -54% 0px' });
  $$('[data-now]').forEach(s => chapterIO.observe(s));

  /* ── manifesto: three short lines, one at a time ── */
  const manifesto = $('#first-day'), lines = $$('#lines span');
  function setLines(p) {
    const idx = p < 0.3 ? 0 : p < 0.6 ? 1 : 2;
    lines.forEach((l, i) => { l.classList.toggle('on', i === idx); l.classList.toggle('past', i < idx); });
    manifesto.classList.toggle('end', p > 0.72);
  }

  /* ── Band night scene ── */
  const hero = $('#overview'), scene = $('#band-scene'), clock = $('#band-clock'), beats = $$('#band-beats .beat');
  function setBand(p) {
    bandP = p;
    scene.style.setProperty('--p', p.toFixed(4));
    seqDraw(p);
    scene.style.setProperty('--head', clamp(1 - p / 0.1).toFixed(3));
    scene.style.setProperty('--line', clamp((p - 0.5) / 0.24).toFixed(3));
    scene.style.setProperty('--dawn', clamp((p - 0.8) / 0.2).toFixed(3));
    // two passes of light: one early in the night, one as dawn arrives
    scene.style.setProperty('--sheen', (p < 0.12 ? 0 : p < 0.46 ? (p - 0.12) / 0.34 : p < 0.7 ? 0 : clamp((p - 0.7) / 0.28)).toFixed(3));
    const minutes = (22 * 60 + 30 + Math.round(p * 96) * 5) % 1440; // 22:30 → 06:30
    clock.textContent = pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
    const idx = p < 0.1 ? -1 : p < 0.3 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
    beats.forEach((b, i) => b.classList.toggle('on', i === idx));
  }

  /* ── Band: scroll-driven product sequence ──
     74 frames cut from one generated presentation clip of the real product photo. They load only when the night
     scene is near, never with reduced motion or data saver, and narrow screens take every second frame. */
  const SEQ_FRAMES = 74;
  const seqCanvas = $('#band-seq');
  let seqImgs = [], seqReady = false, seqLast = -1;
  function seqDraw(p) {
    if (!seqReady) return;
    const f = clamp((p - 0.03) / 0.95) * (seqImgs.length - 1);
    if (Math.abs(f - seqLast) < 0.01) return;
    seqLast = f;
    const i = Math.floor(f), t = f - i, ctx = seqCanvas.getContext('2d'), w = seqCanvas.width, h = seqCanvas.height;
    ctx.globalAlpha = 1; ctx.drawImage(seqImgs[i], 0, 0, w, h);
    if (t > 0.02 && seqImgs[i + 1]) { ctx.globalAlpha = t; ctx.drawImage(seqImgs[i + 1], 0, 0, w, h); ctx.globalAlpha = 1; }
  }
  function seqLoad() {
    if (seqImgs.length || !seqCanvas || !scene || reduce() || (navigator.connection && navigator.connection.saveData)) return;
    const step = narrowMq.matches ? 2 : 1, ids = [];
    for (let i = 0; i < SEQ_FRAMES; i += step) ids.push(i);
    if (ids[ids.length - 1] !== SEQ_FRAMES - 1) ids.push(SEQ_FRAMES - 1);
    let left = ids.length, failed = false;
    seqImgs = ids.map(i => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = e => {
        if (e.type === 'error') failed = true;
        if (--left > 0 || failed) return;
        seqReady = true; scene.classList.add('has-seq'); seqDraw(bandP);
      };
      im.src = `${ASSET}band-seq/f${String(i).padStart(3, '0')}.webp`;
      return im;
    });
  }
  let bandP = 0;
  /* ── 24/7 card: the dawn clip plays once each time the card comes into view ── */
  const allday = $('#allday'), alldayVid = allday && $('video', allday);
  if (alldayVid) {
    if (!reduce() && alldayVid.dataset.posterMotion) alldayVid.poster = alldayVid.dataset.posterMotion;
    new IntersectionObserver(es => {
      const seen = es[0].isIntersecting;
      allday.classList.toggle('on', seen);
      if (!seen) { stop(alldayVid); return; }
      if (alldayVid.currentTime > 0) alldayVid.currentTime = 0;
      play(alldayVid);
    }, { threshold: 0.5 }).observe(allday);
  }

  if (scene && seqCanvas) new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); seqLoad(); } }, { rootMargin: '160% 0px' }).observe(scene);

  let raf = 0;
  const onFrame = []; // later sections add their own scroll work here
  function frame() {
    raf = 0;
    const vh = innerHeight, y = scrollY, max = root.scrollHeight - vh;
    if (navBar) navBar.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;
    if (hero && y < vh * 1.3) hero.style.setProperty('--hp', (reduce() ? 0 : clamp(y / (vh * 0.9))).toFixed(3));
    if (manifesto && lines.length && !reduce()) {
      const r = manifesto.getBoundingClientRect(), total = r.height - vh;
      if (total > 0 && r.top < vh && r.bottom > 0) setLines(clamp(-r.top / total));
    }
    for (const fn of onFrame) fn(vh);
    if (scene && !reduce()) {
      const r = scene.getBoundingClientRect(), total = r.height - vh;
      if (total > 0 && r.top < vh && r.bottom > 0) setBand(clamp(-r.top / total));
    }
  }
  const requestFrame = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', requestFrame, { passive: true });
  addEventListener('resize', requestFrame);
  frame();

  /* ── hero film: gentle tilt toward the pointer ── */
  const film = $('#film'), stage = $('.film-stage');
  if (film && stage && finePointer.matches) {
    film.addEventListener('pointermove', e => {
      if (reduce()) return;
      const r = film.getBoundingClientRect(), k = r.width > 900 ? 0.35 : 1; // the wide stage leans less
      stage.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 7 * k + 'deg');
      stage.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 5 * k + 'deg');
    });
    film.addEventListener('pointerleave', () => { stage.style.setProperty('--rx', '0deg'); stage.style.setProperty('--ry', '0deg'); });
    // the pointer is a lens: the out-of-focus montage is sharp around it
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--lx', (e.clientX - r.left).toFixed(0) + 'px');
      stage.style.setProperty('--ly', (e.clientY - r.top).toFixed(0) + 'px');
      stage.style.setProperty('--lr', Math.round(clamp(r.height * 0.42, 150, 260)) + 'px');
    });
    stage.addEventListener('pointerleave', () => stage.style.setProperty('--lr', '0px'));
  }

  /* ── hero film, wide screens: a montage cut from the film itself plays out of focus behind Play ── */
  const live = stage && $('.film-live', stage);
  if (live) {
    const nowName = $('#film-now'), ticks = $$('.film-ticks i', stage), heroDlg = $('#video-dialog');
    const names = (live.dataset.names || '').split('|'), cues = (live.dataset.cues || '').split(',').map(Number);
    let stageSeen = false, loaded = d.readyState === 'complete';
    const liveSync = () => {
      const ok = loaded && stageSeen && !narrowMq.matches && !reduce() && !(navigator.connection && navigator.connection.saveData) && !(heroDlg && heroDlg.open);
      ok ? play(live) : stop(live);
    };
    live.addEventListener('playing', () => stage.classList.add('live'));
    live.addEventListener('timeupdate', () => {
      let k = 0;
      cues.forEach((c, i) => { if (live.currentTime >= c) k = i; });
      if (nowName && names[k] && nowName.textContent !== names[k]) nowName.textContent = names[k];
      ticks.forEach((t, i) => t.classList.toggle('on', i === k));
    });
    new IntersectionObserver(es => { stageSeen = es[0].isIntersecting; liveSync(); }, { threshold: 0.2 }).observe(stage);
    if (!loaded) addEventListener('load', () => { loaded = true; liveSync(); }, { once: true });
    narrowMq.addEventListener?.('change', liveSync);
    reduceMq.addEventListener?.('change', () => { if (reduce()) stage.classList.remove('live'); liveSync(); });
    if (heroDlg) heroDlg.addEventListener('close', liveSync);
    // the lens: while the pointer is on the stage, a canvas keeps a sharp copy of the current frame (CSS shows it only around the pointer)
    const lens = $('.film-lens', stage), lctx = lens && lens.getContext && lens.getContext('2d');
    if (lctx && finePointer.matches) {
      let lensOn = false, lensTail = 0, lensRaf = 0;
      const lensDraw = () => {
        lensRaf = 0;
        if (!stage.classList.contains('live')) return;
        if (live.readyState >= 2) lctx.drawImage(live, 0, 0, lens.width, lens.height);
        if (lensOn || performance.now() < lensTail) lensRaf = requestAnimationFrame(lensDraw);
      };
      stage.addEventListener('pointermove', () => { lensOn = true; if (!lensRaf) lensRaf = requestAnimationFrame(lensDraw); });
      stage.addEventListener('pointerleave', () => { lensOn = false; lensTail = performance.now() + 600; });
    }
  }

  /* ── highlights: scroll down and the cards pass one by one ──
     The section is tall and its stage is pinned. Vertical scroll moves the row sideways: it rests on each card long
     enough for the clip to play, then glides to the next. With reduced motion the cards are stacked instead. */
  const hlScroll = $('#hl-scroll'), hlPin = $('#hl-pin'), track = $('#hl-track'), hlCtrl = $('.hl-ctrl'), dotsBox = $('#hl-dots'), hlCount = $('#hl-count');
  const cards = track ? $$('.hl-card', track) : [];
  let hlIdx = -1, hlVisible = false;
  const dots = cards.map((_, i) => {
    const b = d.createElement('button');
    b.type = 'button'; b.className = 'hl-dot'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `ไฮไลต์ ${i + 1} จาก ${cards.length}`);
    b.addEventListener('click', () => hlGo(i));
    dotsBox.append(b);
    return b;
  });
  function hlSet(i) {
    if (i === hlIdx) return;
    hlIdx = i;
    cards.forEach((c, k) => {
      c.classList.toggle('on', k === i);
      const v = $('video', c);
      if (!v) return;
      if (k === i && 'once' in v.dataset && v.currentTime > 0) v.currentTime = 0; // one-shot clips start again each time their card comes forward
      (k === i && hlVisible) ? play(v) : stop(v);
    });
    dots.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    if (hlCount) hlCount.textContent = `${i + 1} / ${cards.length}`;
    if (hlCtrl) hlCtrl.classList.toggle('last', i === cards.length - 1);
  }
  function hlRefresh() {
    const v = cards[hlIdx] && $('video', cards[hlIdx]);
    if (v) hlVisible ? play(v) : stop(v);
  }
  function hlGo(i) { // bring card i to rest by scrolling the page to its place in the section
    const k = clamp(i, 0, cards.length - 1), span = hlScroll.offsetHeight - innerHeight;
    scrollTo({ top: scrollY + hlScroll.getBoundingClientRect().top + span * (k + 0.2) / cards.length, behavior: reduce() ? 'auto' : 'smooth' });
  }
  function hlMove(vh) {
    if (reduce()) { track.style.transform = ''; return; }
    const r = hlScroll.getBoundingClientRect(), span = r.height - vh, n = cards.length;
    if (span <= 0 || r.bottom < -vh || r.top > vh * 2) return;
    const P = clamp(-r.top / span) * n, i = Math.min(n - 1, Math.floor(P)), f = P - i;
    const g = i < n - 1 && f > 0.62 ? (f - 0.62) / 0.38 : 0, e = g * g * (3 - 2 * g); // rest, then glide
    const x = k => cards[k].offsetLeft - (track.clientWidth - cards[k].clientWidth) / 2;
    track.style.transform = `translate3d(${-(x(i) + (i < n - 1 ? (x(i + 1) - x(i)) * e : 0)).toFixed(1)}px,0,0)`;
    hlSet(e > 0.5 ? i + 1 : i);
    dots.forEach((b, k) => b.style.setProperty('--f', k === i ? Math.min(1, f / 0.62).toFixed(3) : '0'));
  }
  if (hlScroll && track && cards.length) {
    // one-shot clips open on their first frame when motion is allowed; the still in the markup stays for everyone else
    if (!reduce()) $$('video[data-poster-motion]', track).forEach(v => { v.poster = v.dataset.posterMotion; });
    // a clip can mark the moment its headline number belongs on screen (the Habit Score ring closing)
    $$('video[data-mark]', track).forEach(v => {
      const card = v.closest('.hl-card'), mark = +v.dataset.mark || 1;
      let counted = false;
      const sync = () => {
        const scored = reduce() || (v.duration > 0 && v.currentTime >= v.duration * mark);
        card.classList.toggle('scored', scored);
        if (scored && !counted) { counted = true; countUp(card); } else if (!scored) counted = false;
      };
      v.addEventListener('timeupdate', sync); v.addEventListener('seeked', sync); v.addEventListener('ended', sync);
      sync();
    });
    // a clip can name the moments where its chapters start; the matching label below it lights up
    $$('video[data-cues]', track).forEach(v => {
      const card = v.closest('.hl-card'), items = $$('.stages li', card);
      const cues = v.dataset.cues.split(',').map(Number).filter(n => n >= 0);
      const sync = () => {
        if (reduce()) { card.classList.remove('cued'); return; }
        let idx = 0;
        cues.forEach((c, i) => { if (v.currentTime >= c) idx = i; });
        card.classList.add('cued');
        items.forEach((li, i) => li.classList.toggle('cur', i === idx));
      };
      v.addEventListener('timeupdate', sync); v.addEventListener('seeked', sync);
      sync();
    });
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); hlGo(hlIdx + 1); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); hlGo(hlIdx - 1); } });
    new IntersectionObserver(es => { hlVisible = es[0].isIntersecting; hlRefresh(); }, { threshold: 0.4 }).observe(hlPin);
    hlSet(0);
    onFrame.push(hlMove);
    requestFrame();
  }

  /* ── Band colours ── */
  const swatches = $$('.sw'), lookImg = $('#look-img'), lookName = $('#look-name');
  function pick(b) {
    swatches.forEach(x => { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); x.tabIndex = x === b ? 0 : -1; });
    const src = `${ASSET}band-${b.dataset.color}.webp`;
    lookName.textContent = b.dataset.name;
    lookImg.classList.add('swap');
    const pre = new Image();
    const done = () => { lookImg.src = src; lookImg.alt = `Xircle Band สี ${b.dataset.name}`; requestAnimationFrame(() => lookImg.classList.remove('swap')); };
    pre.onload = () => setTimeout(done, reduce() ? 0 : 180); pre.onerror = done; pre.src = src;
  }
  swatches.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => pick(b));
    b.addEventListener('keydown', e => {
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = swatches[(i + dir + swatches.length) % swatches.length]; next.focus(); pick(next);
    });
  });

  /* ── Scale: step on (sample numbers only) ── */
  const weigh = $('#weigh'), weighBtn = $('#weigh-btn'), lcdNum = $('#lcd-num'), lcdPct = $('#lcd-pct');
  const vals = $$('#vals b');
  let weighing = false;
  function weighDone() {
    weigh.dataset.state = 'done'; lcdNum.textContent = '61.4'; lcdPct.textContent = '24.8';
    weighBtn.textContent = 'ชั่งอีกครั้ง'; weighing = false;
  }
  function runWeigh() {
    if (weighing) return;
    weighing = true;
    if (reduce()) { vals.forEach(b => { b.textContent = b.dataset.to; }); weighDone(); return; }
    weigh.dataset.state = 'on'; lcdNum.textContent = '0.0'; lcdPct.textContent = '--.-';
    vals.forEach(b => { b.textContent = '0.0'; });
    setTimeout(() => tween(1500, k => { lcdNum.textContent = Math.max(0, 61.4 * k + Math.sin(k * 20) * (1 - k) * 1.8).toFixed(1); }, () => {
      weighDone();
      vals.forEach((b, i) => setTimeout(() => tween(750, k => { b.textContent = (+b.dataset.to * k).toFixed(1); }), i * 90));
    }), 480);
  }
  if (weigh && weighBtn) {
    weighBtn.addEventListener('click', runWeigh);
    const weighIO = new IntersectionObserver(es => { if (es[0].isIntersecting) { weighIO.disconnect(); if (!reduce()) runWeigh(); } }, { threshold: 0.55 });
    weighIO.observe($('.weigh-stage', weigh));
  }

  /* ── app day: the phone follows the story ── */
  const screens = $$('#phone-screen > *'), dayBeats = $$('.day-beat');
  if (dayBeats.length) {
    dayBeats[0].classList.add('on');
    const dayIO = new IntersectionObserver(es => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const key = e.target.dataset.screen;
        dayBeats.forEach(b => b.classList.toggle('on', b === e.target));
        screens.forEach(s => { const on = s.dataset.screen === key; s.classList.toggle('on', on); if (s.tagName === 'VIDEO') (on && !narrowMq.matches) ? play(s) : stop(s); });
      }
    }, { rootMargin: '-46% 0px -46% 0px' });
    dayBeats.forEach(b => dayIO.observe(b));
  }

  /* ── tour: nine one-minute episodes ── */
  const list = $('#tour-list'), tourUi = $('#tour-ui'), tv = $('#tour-video'), segBox = $('#tour-segs');
  const eps = $$('.ep', list || d).map(a => ({ a, n: +a.dataset.ep, h: a.dataset.h, v: a.dataset.v, title: $('.ep-t', a).textContent, blurb: a.dataset.blurb || '' }))
    .filter(e => YT_ID.test(e.h) && YT_ID.test(e.v));
  let cur = 0, auto = true, tourVisible = false;
  const railVid = d.createElement('video');
  railVid.muted = true; railVid.playsInline = true; railVid.loop = true; railVid.preload = 'none'; railVid.setAttribute('aria-hidden', 'true'); railVid.tabIndex = -1;

  function markEp(i) {
    cur = (i + eps.length) % eps.length;
    eps.forEach((x, k) => { x.a.classList.toggle('on', k === cur); k === cur ? x.a.setAttribute('aria-current', 'true') : x.a.removeAttribute('aria-current'); });
    return eps[cur];
  }
  function setEp(i) { // wide layout: stage + list
    const e = markEp(i);
    $('#tour-ep').textContent = `EP.${e.n}`; $('#tour-name').textContent = e.title; $('#tour-blurb').textContent = e.blurb;
    Array.from(segBox.children).forEach((s, k) => s.style.setProperty('--w', k < cur ? '100%' : '0%'));
    if (narrowMq.matches) return;
    stop(tv);
    tv.poster = `${ASSET}tour/ep${pad(e.n)}-h.webp`; tv.dataset.src = `${ASSET}tour/ep${pad(e.n)}-h.mp4`;
    tv.removeAttribute('src'); tv.load();
    if (tourVisible && !dlg.open) play(tv);
  }
  function setRail(i) { // narrow layout: swipeable vertical cards
    const e = markEp(i), media = $('.ep-media', e.a);
    if (railVid.parentNode !== media) {
      stop(railVid);
      railVid.poster = `${ASSET}tour/ep${pad(e.n)}-v.webp`; railVid.dataset.src = `${ASSET}tour/ep${pad(e.n)}-v.mp4`;
      railVid.removeAttribute('src'); railVid.load();
      media.insertBefore(railVid, $('.ep-go', media));
    }
    if (tourVisible && !dlg.open) play(railVid);
  }
  const tourLayout = () => { if (!eps.length) return; if (narrowMq.matches) { stop(tv); setRail(cur); } else { stop(railVid); railVid.remove(); setEp(cur); } };

  /* ── player ── */
  const dlg = $('#video-dialog'), pFrame = $('#player-frame'), pTitle = $('#player-title'), pYt = $('#player-yt'), pNav = $('#player-nav'), pPos = $('#player-pos');
  let lastFocus = null, playingEp = -1;
  const canDialog = !!(dlg && typeof dlg.showModal === 'function');
  function openVideo(id, title, vertical) {
    if (!canDialog || !YT_ID.test(id)) return false;
    if (!dlg.open) lastFocus = d.activeElement;
    pauseAll();
    pFrame.textContent = '';
    const f = d.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    f.title = title; f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    pFrame.append(f);
    pTitle.textContent = title; pYt.href = `https://www.youtube.com/watch?v=${id}`;
    dlg.classList.toggle('is-vertical', !!vertical);
    if (!dlg.open) dlg.showModal();
    return true;
  }
  function openEpisode(i) {
    if (!eps.length) return false;
    playingEp = (i + eps.length) % eps.length;
    const e = eps[playingEp], vertical = narrowMq.matches;
    auto = false;
    pNav.hidden = false; pPos.textContent = `${e.n} / ${eps.length}`;
    narrowMq.matches ? markEp(playingEp) : setEp(playingEp);
    return openVideo(vertical ? e.v : e.h, `EP.${e.n} ${e.title}`, vertical);
  }
  if (canDialog) {
    dlg.addEventListener('close', () => {
      pFrame.textContent = ''; playingEp = -1;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      hlRefresh(); tourLayout();
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    $('#player-close').addEventListener('click', () => dlg.close());
    $('#player-prev').addEventListener('click', () => openEpisode(playingEp - 1));
    $('#player-next').addEventListener('click', () => openEpisode(playingEp + 1));
    d.addEventListener('click', e => {
      const a = e.target.closest('[data-ep],[data-play]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const ok = a.dataset.ep ? openEpisode(+a.dataset.ep - 1) : (pNav.hidden = true, openVideo(a.dataset.play, a.dataset.title || 'วิดีโอ', false));
      if (ok) e.preventDefault();
    });
  }

  if (eps.length && tv) {
    eps.forEach(() => segBox.append(d.createElement('i')));
    tv.addEventListener('timeupdate', () => { if (tv.duration) segBox.children[cur]?.style.setProperty('--w', (tv.currentTime / tv.duration * 100).toFixed(1) + '%'); });
    tv.addEventListener('ended', () => { if (auto && tourVisible) setEp(cur + 1); else { tv.currentTime = 0; play(tv); } });
    eps.forEach((e, k) => {
      const preview = () => { if (narrowMq.matches || k === cur) return; auto = false; setEp(k); };
      e.a.addEventListener('pointerenter', ev => { if (ev.pointerType === 'mouse') preview(); });
      e.a.addEventListener('focus', preview);
    });
    $('#tour-open').addEventListener('click', () => openEpisode(cur));
    // narrow layout: the card nearest the middle of the rail becomes the live one
    const railIO = new IntersectionObserver(es => {
      for (const en of es) { if (!narrowMq.matches || !en.isIntersecting || en.intersectionRatio < 0.7) continue; const k = eps.findIndex(x => x.a === en.target); if (k > -1) setRail(k); }
    }, { root: list, threshold: [0.7] });
    eps.forEach(e => railIO.observe(e.a));
    new IntersectionObserver(es => {
      tourVisible = es[0].isIntersecting;
      const active = narrowMq.matches ? railVid : tv;
      (tourVisible && !dlg.open) ? play(active) : (stop(tv), stop(railVid));
    }, { threshold: 0.3 }).observe(tourUi);
    narrowMq.addEventListener?.('change', tourLayout);

    // deep link: /xircle/?ep=4 selects that episode and brings the tour into view
    const params = new URLSearchParams(location.search), asked = params.getAll('ep');
    const want = asked.length === 1 && /^[1-9]$/.test(asked[0]) ? +asked[0] : 0;
    if (want && want <= eps.length) { cur = want - 1; auto = false; }
    tourLayout();
    if (want && !location.hash) {
      try { history.scrollRestoration = 'manual'; } catch { /* older browsers keep their own position */ }
      const bring = () => {
        (narrowMq.matches ? $('#tour') : tourUi).scrollIntoView({ behavior: 'instant', block: narrowMq.matches ? 'start' : 'center' });
        if (narrowMq.matches) { const li = eps[cur].a.parentNode; list.scrollLeft = li.offsetLeft - (list.clientWidth - li.clientWidth) / 2; }
      };
      if (d.readyState === 'complete') bring(); else addEventListener('load', bring, { once: true });
    }
  }
})();
