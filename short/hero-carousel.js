const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>';
const information = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg>';
const book = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v15M12 6C8 3 4 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-1-1-5-2-9 1Z"/></svg>';
const pause = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
const sound = muted => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4Z"/>${muted ? '<path d="m16 9 5 6m0-6-5 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}</svg>`;
const arrow = direction => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;
let carouselCount = 0;

/** A native scroll-snap carousel: touch and momentum remain owned by the browser. */
export function createHeroCarousel({root, stories, ids, onOpen = () => {}, onChange = () => {}}) {
  if (!(root instanceof HTMLElement)) throw new TypeError('A hero root element is required');
  const selected = ids.map(id => stories.find(story => story.id === id)).filter(Boolean);
  if (!selected.length) throw new TypeError('At least one featured story is required');
  const instance = `hc-${++carouselCount}`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = matchMedia('(max-width: 760px)');
  root.classList.add('hc-hero');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-roledescription', 'carousel');
  root.setAttribute('aria-label', 'เรื่องเด่นจากครีเอเตอร์ไทย');
  root.removeAttribute('aria-describedby');
  root.removeAttribute('tabindex');
  root.innerHTML = `<div class="hc-track" tabindex="0" aria-label="เลื่อนเลือกเรื่องเด่น" aria-describedby="${instance}-hint">${selected.map((story, index) => {
    const trailer = story.heroTrailer?.src ? story.heroTrailer : null;
    const reading = story.format === 'comic' || story.format === 'novel';
    const image = trailer?.poster || story.heroImage || `./assets/${story.id}.webp`;
    const avatar = story.avatarImage ? `<img src="${escape(story.avatarImage)}" alt="" width="36" height="36" loading="lazy" draggable="false">` : escape(story.avatar);
    return `<article class="hc-slide${trailer ? ' hc-has-preview' : ''}" data-hc-id="${escape(story.id)}" style="--hc-tint:${escape(story.color || '#64525d')}" role="group" aria-roledescription="สไลด์" aria-label="${index + 1} จาก ${selected.length}: ${escape(story.title)}">
      <div class="hc-atmosphere" aria-hidden="true"></div>
      <div class="hc-visual" aria-hidden="true"><picture>${story.heroLandscape ? `<source media="(min-width: 761px)" srcset="${escape(story.heroLandscape)}">` : ''}<img src="${escape(image)}" alt="" draggable="false" decoding="async" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}></picture>${trailer ? `<video class="hc-preview-video" muted playsinline preload="none" poster="${escape(image)}" disablepictureinpicture disableremoteplayback tabindex="-1"></video>` : ''}</div>
      <div class="hc-shade" aria-hidden="true"></div>
      ${trailer ? `<div class="hc-preview"><div class="hc-preview-buttons"><button type="button" class="hc-preview-play" data-hc-preview="${index}" aria-label="เล่นตัวอย่าง ${escape(story.title)}" aria-pressed="false">${play}</button><button type="button" class="hc-preview-sound" data-hc-sound="${index}" aria-label="เปิดเสียงตัวอย่าง ${escape(story.title)}" aria-pressed="false">${sound(true)}</button></div><p class="hc-preview-status hc-status" role="status" aria-live="polite"></p></div>` : ''}
      <div class="hc-copy">
        <p class="hc-eyebrow"><span class="hc-live-dot"></span>${reading ? escape(story.formatLabel) + ' ภาษาไทย' : 'ละครสั้น AI ภาษาไทย'} <span class="hc-original">${escape(story.heroBadge || (reading ? 'TONTOR WEBTOON' : 'TONTOR ORIGINAL'))}</span></p>
        <p class="hc-kicker">${escape(trailer?.hook || story.heroKicker || story.kicker)}</p>
        <${index === 0 ? 'h1' : 'h2'} class="hc-title">${escape(story.posterTitle || story.title).split('\n').map(line => `<span class="hc-title-line">${line}</span>`).join('')}</${index === 0 ? 'h1' : 'h2'}>
        <div class="hc-meta"><span>${escape(story.genres.slice(0, 2).join(' · '))}</span><span class="hc-meta-separator">·</span><span>${escape(story.episodes)} ตอน</span><span class="hc-age">${escape(story.age)}</span></div>
        <p class="hc-description">${escape(story.heroDescription || story.description)}</p>
        <div class="hc-actions"><button class="hc-button hc-watch" data-hc-open="${escape(story.id)}" data-hc-autoplay="true">${reading ? book : play}${escape(story.heroCta || (reading ? 'เริ่มอ่านฟรี' : trailer ? 'ดูตัวอย่าง' : 'ดูคอนเซปต์'))}</button><button class="hc-button hc-details" data-hc-open="${escape(story.id)}">${information}รายละเอียด</button></div>
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
  const status = root.querySelector(':scope > .hc-status');
  let active = -1, frame = 0, settleTimer, gesture = null, suppressClickUntil = 0;
  let heroVisible = false, destroyed = false;
  const saveData = Boolean(navigator.connection?.saveData);
  const previews = panels.map((panel, index) => {
    const video = panel.querySelector('.hc-preview-video');
    if (!video) return null;
    // A source is assigned only when this panel is visible and playback is wanted.
    const preview = {panel, video, index, trailer:selected[index].heroTrailer, button:panel.querySelector('.hc-preview-play'), audio:panel.querySelector('.hc-preview-sound'), status:panel.querySelector('.hc-preview-status'), source:false, userPaused:false, manualPlay:false, unmuted:false, ended:false, blocked:false, error:false, resumeTime:0, attempt:0, starting:false};
    video.muted = true;
    video.volume = .7;
    video.addEventListener('loadedmetadata', () => {
      if (!preview.source || !Number.isFinite(video.duration)) return;
      if (preview.resumeTime > 0) video.currentTime = Math.min(preview.resumeTime, Math.max(0, video.duration - .04));
    });
    const showFrame = () => { if (preview.source && video.readyState >= 2) panel.classList.add('has-preview-frame'); };
    video.addEventListener('loadeddata', showFrame);
    video.addEventListener('seeked', showFrame);
    video.addEventListener('playing', () => { showFrame(); updatePreview(preview); });
    video.addEventListener('pause', () => updatePreview(preview));
    video.addEventListener('timeupdate', () => {
      preview.resumeTime = video.currentTime;
    });
    video.addEventListener('ended', () => {
      preview.ended = true;
      preview.manualPlay = false;
      preview.status.textContent = 'ตัวอย่างจบแล้ว กดเล่นเพื่อดูอีกครั้ง';
      updatePreview(preview);
    });
    video.addEventListener('error', () => {
      if (!preview.source) return;
      preview.error = true;
      preview.starting = false;
      panel.classList.remove('has-preview-frame');
      preview.status.textContent = 'โหลดช็อตเด็ดไม่สำเร็จ แตะเพื่อลองอีกครั้ง';
      updatePreview(preview);
    });
    return preview;
  });

  function updatePreview(preview) {
    const playing = !preview.video.paused && !preview.video.ended;
    const label = preview.error ? 'ลองเล่นอีกครั้ง' : preview.ended ? 'เล่นอีกครั้ง' : playing ? 'หยุดชั่วคราว' : 'เล่นตัวอย่าง';
    if (preview.button.dataset.label !== label) {
      preview.button.dataset.label = label;
      preview.button.innerHTML = playing ? pause : play;
    }
    preview.button.setAttribute('aria-label', `${label} ${selected[preview.index].title}`);
    preview.button.setAttribute('aria-pressed', String(playing));
    preview.audio.setAttribute('aria-label', `${preview.unmuted ? 'ปิด' : 'เปิด'}เสียงช็อตเด็ด ${selected[preview.index].title}`);
    preview.audio.setAttribute('aria-pressed', String(preview.unmuted));
    if (preview.audio.dataset.unmuted !== String(preview.unmuted)) {
      preview.audio.dataset.unmuted = String(preview.unmuted);
      preview.audio.innerHTML = sound(!preview.unmuted);
    }
    preview.panel.classList.toggle('is-preview-playing', playing);
  }

  function previewVisible(preview) {
    return !destroyed && mobileViewport.matches && preview.index === active && heroVisible && !document.hidden && !document.querySelector('dialog[open]');
  }

  function wantsPlayback(preview) {
    return !preview.userPaused && !preview.ended && !preview.blocked && !preview.error && (preview.manualPlay || (!reducedMotion.matches && !saveData));
  }

  function pausePreview(preview) {
    preview.attempt++;
    preview.starting = false;
    if (!preview.video.paused) preview.video.pause();
    updatePreview(preview);
  }

  function loadPreview(preview) {
    if (preview.source) return;
    preview.source = true;
    preview.video.src = preview.trailer.src;
    preview.video.load();
  }

  function unloadPreview(preview) {
    pausePreview(preview);
    preview.unmuted = false;
    preview.video.muted = true;
    if (preview.source) {
      preview.resumeTime = preview.video.currentTime || preview.resumeTime;
      preview.source = false;
      preview.video.removeAttribute('src');
      preview.video.load();
      preview.panel.classList.remove('has-preview-frame');
    }
    updatePreview(preview);
  }

  function playPreview(preview) {
    if (preview.starting || !preview.video.paused) return;
    loadPreview(preview);
    preview.starting = true;
    const attempt = ++preview.attempt;
    preview.video.play().then(() => {
      if (attempt !== preview.attempt) return;
      if (!previewVisible(preview) || !wantsPlayback(preview)) {
        preview.video.pause();
        preview.starting = false;
        return;
      }
      preview.starting = false;
      updatePreview(preview);
    }).catch(() => {
      if (attempt !== preview.attempt) return;
      preview.starting = false;
      preview.blocked = true;
      preview.status.textContent = 'แตะดูช็อตเด็ดเพื่อเริ่มเล่น';
      updatePreview(preview);
    });
  }

  function syncPreviews() {
    if (destroyed) return;
    previews.forEach(preview => {
      if (!preview) return;
      if (!mobileViewport.matches || preview.index !== active) { unloadPreview(preview); return; }
      if (!previewVisible(preview) || !wantsPlayback(preview)) { pausePreview(preview); return; }
      playPreview(preview);
    });
  }

  function togglePreview(index, audioOnly = false) {
    const preview = previews[index];
    if (!preview || index !== active) return;
    if (audioOnly) {
      preview.unmuted = !preview.unmuted;
      preview.video.muted = !preview.unmuted;
      updatePreview(preview);
      return;
    }
    if (!preview.video.paused && !preview.video.ended) {
      preview.userPaused = true;
      preview.manualPlay = false;
      pausePreview(preview);
      return;
    }
    if (preview.ended || preview.error) {
      preview.resumeTime = 0;
      if (preview.source) preview.video.currentTime = 0;
      if (preview.error) {
        preview.source = false;
        preview.video.removeAttribute('src');
      }
    }
    preview.ended = false;
    preview.error = false;
    preview.blocked = false;
    preview.userPaused = false;
    preview.manualPlay = true;
    preview.status.textContent = '';
    // Explicit audio/play taps retain their user activation for browser playback.
    if (previewVisible(preview)) playPreview(preview);
    updatePreview(preview);
  }

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
    syncPreviews();
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
    if (button.hasAttribute('data-hc-preview')) togglePreview(Number(button.dataset.hcPreview));
    else if (button.hasAttribute('data-hc-sound')) togglePreview(Number(button.dataset.hcSound), true);
    else if (button.hasAttribute('data-hc-index')) moveTo(Number(button.dataset.hcIndex));
    else if (button.hasAttribute('data-hc-move')) moveTo(nearestIndex() + Number(button.dataset.hcMove));
    else if (button.hasAttribute('data-hc-open')) {
      const autoplay = button.dataset.hcAutoplay === 'true';
      const story = selected.find(story => story.id === button.dataset.hcOpen);
      const episode = autoplay ? Math.max(1, Math.trunc(Number(story?.heroEpisode || story?.heroTrailer?.episode) || 1)) : 1;
      onOpen(button.dataset.hcOpen, autoplay, episode);
    }
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
  const visibility = previews.some(Boolean) ? new IntersectionObserver(entries => {
    const entry = entries[0];
    heroVisible = entry.isIntersecting && entry.intersectionRatio >= .2;
    syncPreviews();
  }, {threshold:[0,.2,.5]}) : null;
  visibility?.observe(root);
  const modalChanges = previews.some(Boolean) ? new MutationObserver(entries => {
    if (entries.some(entry => entry.type === 'attributes' || [...entry.addedNodes, ...entry.removedNodes].some(node => node.nodeType === 1 && (node.matches('dialog') || node.querySelector('dialog'))))) syncPreviews();
  }) : null;
  modalChanges?.observe(document.body, {subtree:true, attributes:true, attributeFilter:['open'], childList:true});
  document.addEventListener('visibilitychange', syncPreviews);
  reducedMotion.addEventListener('change', syncPreviews);
  mobileViewport.addEventListener('change', syncPreviews);
  const hide = () => previews.forEach(preview => preview && pausePreview(preview));
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', syncPreviews);
  publish(0);
  return {
    select(id) { const index = selected.findIndex(story => story.id === id); if (index !== -1) moveTo(index); },
    destroy() {
      destroyed = true;
      resize.disconnect(); visibility?.disconnect(); modalChanges?.disconnect();
      clearTimeout(settleTimer); cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', syncPreviews);
      reducedMotion.removeEventListener('change', syncPreviews);
      mobileViewport.removeEventListener('change', syncPreviews);
      window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', syncPreviews);
      previews.forEach(preview => preview && unloadPreview(preview));
    }
  };
}
