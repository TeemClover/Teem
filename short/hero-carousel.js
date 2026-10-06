const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>';
const information = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg>';
const arrow = direction => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;
let carouselCount = 0;

/** A native scroll-snap carousel: touch and momentum remain owned by the browser. */
export function createHeroCarousel({root, stories, ids, onOpen = () => {}, onChange = () => {}}) {
  if (!(root instanceof HTMLElement)) throw new TypeError('A hero root element is required');
  const selected = ids.map(id => stories.find(story => story.id === id)).filter(Boolean);
  if (!selected.length) throw new TypeError('At least one featured story is required');
  const instance = `hc-${++carouselCount}`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('hc-hero');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  root.setAttribute('aria-label', 'ละครสั้น AI เรื่องเด่น');
  root.removeAttribute('aria-describedby');
  root.removeAttribute('tabindex');
  root.innerHTML = `<div class="hc-track" tabindex="0" aria-label="เลื่อนเลือกละครสั้นเรื่องเด่น" aria-describedby="${instance}-hint">${selected.map((story, index) => {
    const image = story.heroImage || `./assets/${story.id}.webp`;
    const avatar = story.avatarImage ? `<img src="${escape(story.avatarImage)}" alt="" width="36" height="36" loading="lazy" draggable="false">` : escape(story.avatar);
    return `<article class="hc-slide" data-hc-id="${escape(story.id)}" style="--hc-tint:${escape(story.color || '#64525d')}" role="group" aria-roledescription="สไลด์" aria-label="${index + 1} จาก ${selected.length}: ${escape(story.title)}">
      <div class="hc-atmosphere" aria-hidden="true"></div>
      <div class="hc-visual" aria-hidden="true"><img src="${escape(image)}" alt="" draggable="false" decoding="async" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></div>
      <div class="hc-shade" aria-hidden="true"></div>
      <div class="hc-copy">
        <p class="hc-eyebrow"><span class="hc-live-dot"></span>ละครสั้น AI ภาษาไทย <span class="hc-original">TONTOR ORIGINAL</span></p>
        <p class="hc-kicker">${escape(story.kicker)}</p>
        <${index === 0 ? 'h1' : 'h2'} class="hc-title">${escape(story.posterTitle || story.title).replace(/\n/g, '<br>')}</${index === 0 ? 'h1' : 'h2'}>
        <div class="hc-meta"><span>${escape(story.genres.slice(0, 2).join(' · '))}</span><span class="hc-meta-separator">·</span><span>${escape(story.episodes)} ตอน</span><span class="hc-age">${escape(story.age)}</span></div>
        <p class="hc-description">${escape(story.description)}</p>
        <div class="hc-actions"><button class="hc-button hc-watch" data-hc-open="${escape(story.id)}" data-hc-autoplay="true">${play}${story.format === 'comic' || story.format === 'novel' ? 'เริ่มอ่านฟรี' : 'เริ่มดูฟรี'}</button><button class="hc-button hc-details" data-hc-open="${escape(story.id)}">${information}รายละเอียด</button></div>
        <div class="hc-creator"><span class="hc-avatar" style="--hc-avatar-color:${escape(story.color || '#5d494b')}">${avatar}</span><span class="hc-creator-copy"><span>เรื่องเล่าจากครีเอเตอร์ไทย</span><strong>${escape(story.creator)} <span>/ ${escape(story.studio)}</span></strong></span></div>
      </div>
    </article>`;
  }).join('')}</div>
    <div class="hc-navigation"><p class="hc-hint" id="${instance}-hint"><span class="hc-swipe-mark" aria-hidden="true">↔</span>ปัดเลือกเรื่องที่อยากดู</p><div class="hc-controls"><button class="hc-arrow" data-hc-move="-1" aria-label="เรื่องเด่นก่อนหน้า">${arrow(-1)}</button><div class="hc-dots" aria-label="เลือกเรื่องเด่น">${selected.map((story, index) => `<button class="hc-dot${index === 0 ? ' is-active' : ''}" data-hc-index="${index}" aria-label="เรื่องเด่น ${escape(story.title)}" aria-pressed="${index === 0}"><span></span></button>`).join('')}</div><span class="hc-count" aria-hidden="true">01 <span>/ ${String(selected.length).padStart(2, '0')}</span></span><button class="hc-arrow" data-hc-move="1" aria-label="เรื่องเด่นถัดไป">${arrow(1)}</button></div></div>
    <p class="hc-status" role="status" aria-live="polite" aria-atomic="true"></p>`;

  const track = root.querySelector('.hc-track');
  const panels = [...root.querySelectorAll('.hc-slide')];
  const dots = [...root.querySelectorAll('.hc-dot')];
  const counter = root.querySelector('.hc-count');
  const status = root.querySelector('.hc-status');
  let active = -1, frame = 0, settleTimer, gesture = null, suppressClickUntil = 0;

  function publish(index) {
    if (index === active) return;
    active = index;
    root.dataset.hcActive = selected[index].id;
    panels.forEach((panel, position) => {
      panel.inert = position !== index;
      panel.setAttribute('aria-hidden', String(position !== index));
    });
    dots.forEach((dot, position) => {
      dot.classList.toggle('is-active', position === index);
      dot.setAttribute('aria-pressed', String(position === index));
    });
    counter.innerHTML = `${String(index + 1).padStart(2, '0')} <span>/ ${String(selected.length).padStart(2, '0')}</span>`;
    status.textContent = `เรื่องเด่น ${index + 1} จาก ${selected.length}: ${selected[index].title}`;
    onChange(selected[index]);
  }

  function nearestIndex() {
    return Math.min(selected.length - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
  }

  function settle() {
    clearTimeout(settleTimer);
    publish(nearestIndex());
  }

  function moveTo(index, behavior = reducedMotion.matches ? 'instant' : 'smooth') {
    const next = (index + selected.length) % selected.length;
    track.scrollTo({left: next * track.clientWidth, behavior});
    if (behavior === 'instant' || behavior === 'auto') settle();
  }

  track.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      // Navigation follows the visible panel; no DOM replacement during the swipe.
      publish(nearestIndex());
    });
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 140);
  }, {passive: true});
  track.addEventListener('scrollend', settle, {passive: true});

  root.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil && track.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-hc-index')) moveTo(Number(button.dataset.hcIndex));
    else if (button.hasAttribute('data-hc-move')) moveTo(nearestIndex() + Number(button.dataset.hcMove));
    else if (button.hasAttribute('data-hc-open')) onOpen(button.dataset.hcOpen, button.dataset.hcAutoplay === 'true');
  }, {capture: true});

  root.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? selected.length - 1 : nearestIndex() + (event.key === 'ArrowLeft' ? -1 : 1);
    moveTo(next);
  });

  // Mouse dragging is added only for desktop pointers. Touch stays fully native,
  // preserving iOS momentum and allowing a vertical gesture to scroll the page.
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, a, input')) return;
    gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, left: track.scrollLeft, time: performance.now(), lastX: event.clientX, lastTime: performance.now(), velocity: 0, dragging: false};
  });
  track.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
      if (Math.abs(dx) < 6) return;
      gesture.dragging = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    event.preventDefault();
    const now = performance.now();
    gesture.velocity = (event.clientX - gesture.lastX) / Math.max(1, now - gesture.lastTime);
    gesture.lastX = event.clientX;
    gesture.lastTime = now;
    track.scrollLeft = gesture.left - dx;
  });

  function release(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const previous = gesture;
    gesture = null;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    if (!previous.dragging) return;
    suppressClickUntil = performance.now() + 260;
    const dx = event.clientX - previous.x;
    const start = Math.round(previous.left / Math.max(1, track.clientWidth));
    const deliberate = Math.abs(dx) > track.clientWidth * .16 || (performance.now() - previous.lastTime < 90 && Math.abs(previous.velocity) > .45 && Math.abs(dx) > 25);
    const target = event.type === 'pointercancel' ? nearestIndex() : deliberate ? Math.max(0, Math.min(selected.length - 1, start + (dx < 0 ? 1 : -1))) : nearestIndex();
    moveTo(target);
  }
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('lostpointercapture', event => { if (gesture?.id === event.pointerId) release(event); });
  track.addEventListener('dragstart', event => event.preventDefault());

  const resize = new ResizeObserver(() => {
    if (active >= 0 && !gesture && track.clientWidth > 0) track.scrollTo({left: active * track.clientWidth, behavior: 'instant'});
  });
  resize.observe(track);
  publish(0);
  return {
    select(id) { const index = selected.findIndex(story => story.id === id); if (index !== -1) moveTo(index); },
    destroy() { resize.disconnect(); clearTimeout(settleTimer); cancelAnimationFrame(frame); }
  };
}
