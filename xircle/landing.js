/* Xircle product landing: progressive enhancement, with no camera or health-data access. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const demo = $('#food-demo');
  const scanButtons = [$('#scan-play'), $('#scan-camera-play')].filter(Boolean);
  const scanStatus = $('#scan-status');
  const scanSteps = $$('.scan-step[data-step]');
  let scanTimers = [];
  const stopScan = () => {
    scanTimers.forEach(window.clearTimeout);
    scanTimers = [];
  };
  const stages = ['scanning', 'ingredients', 'complete'];
  const messages = {
    ready: 'ตัวอย่างการใช้งาน · ลองสแกนอาหารจานนี้',
    scanning: 'กำลังสแกนอาหารในตัวอย่าง…',
    ingredients: 'พบส่วนประกอบอาหารแล้ว ลองดูว่ามื้อนี้มีอะไรบ้าง',
    complete: 'สรุปสารอาหารพร้อมแล้ว ปรับปริมาณให้ตรงกับที่กินได้',
  };
  const setStage = stage => {
    if (!demo) return;
    demo.dataset.stage = stage;
    demo.setAttribute('aria-busy', stage === 'scanning' ? 'true' : 'false');
    if (scanStatus) scanStatus.textContent = messages[stage];
    scanButtons.forEach(button => {
      button.textContent = stage === 'ready'
        ? (button.id === 'scan-camera-play' ? 'ลองสแกนอาหารจานนี้' : 'ลองสแกนมื้อนี้')
        : 'เล่นเดโมอีกครั้ง';
    });
    const activeStep = Math.max(0, stages.indexOf(stage));
    scanSteps.forEach(button => {
      const active = Number(button.dataset.step) === activeStep;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };
  if (demo && scanButtons.length) {
    setStage('ready');
    const playScan = () => {
      stopScan();
      if (reduceMotion.matches) {
        setStage('complete');
        return;
      }
      setStage('scanning');
      scanTimers.push(window.setTimeout(() => setStage('ingredients'), 1600));
      scanTimers.push(window.setTimeout(() => {
        setStage('complete');
        scanTimers = [];
      }, 3000));
    };
    scanButtons.forEach(button => {
      button.addEventListener('click', playScan);
      button.disabled = false;
    });
    scanSteps.forEach(button => {
      button.addEventListener('click', () => {
      const stage = stages[Number(button.dataset.step)];
      if (!stage) return;
      stopScan();
      setStage(stage);
      });
      button.disabled = false;
    });
  }

  const portion = $('#portion');
  const baseNutrition = { kcal: 314, protein: 35, carbs: 24, fat: 8.7 };
  const formatNumber = (number, maximumFractionDigits = 1) => new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(number);
  const updatePortion = () => {
    const multiplier = Number(portion?.value || 1);
    if (![0.5, 1, 1.5, 2].includes(multiplier)) return;
    $$('[data-nutrition]').forEach(element => {
      const key = element.dataset.nutrition;
      if (!(key in baseNutrition)) return;
      element.textContent = formatNumber(baseNutrition[key] * multiplier, key === 'kcal' ? 0 : 1);
    });
    $$('[data-base-amount]').forEach(element => {
      const amount = Number(element.dataset.baseAmount);
      if (Number.isFinite(amount)) element.textContent = formatNumber(amount * multiplier);
    });
  };
  portion?.addEventListener('change', updatePortion);
  updatePortion();
  if (portion) portion.disabled = false;

  const videoDialog = $('#video-dialog');
  const videoHost = $('#video-host');
  const videoTitle = $('#video-title');
  let videoTrigger = null;
  const clearVideo = () => {
    if (!videoHost) return;
    $$('video', videoHost).forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    videoHost.replaceChildren();
  };
  const closeVideo = () => {
    if (!videoDialog) return;
    if (videoDialog.open) videoDialog.close();
    clearVideo();
    videoTrigger?.focus({ preventScroll: true });
  };
  const mediaLink = (url, label) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'video-fallback';
    link.textContent = label;
    return link;
  };
  if (videoDialog && videoHost && typeof videoDialog.showModal === 'function') {
    $$('[data-video]').forEach(button => {
      button.addEventListener('click', () => {
      const source = button.dataset.video || '';
      const youtubeId = /^[A-Za-z0-9_-]{11}$/.test(source) ? source : null;
      let localSource;
      try {
        const url = new URL(source, window.location.href);
        if (!youtubeId && url.origin === window.location.origin && /\.(mp4|m4v|webm)$/i.test(url.pathname)) {
          localSource = url.href;
        }
      } catch { /* Invalid sources do not open an empty player. */ }
      if (!youtubeId && !localSource) return;

      clearVideo();
      videoTrigger = button;
      const title = button.dataset.title || 'ดูการใช้งาน Xircle';
      if (videoTitle) videoTitle.textContent = title;

      if (youtubeId) {
        const frame = document.createElement('iframe');
        frame.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`;
        frame.title = title;
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        videoHost.append(frame, mediaLink(`https://www.youtube.com/watch?v=${youtubeId}`, 'เปิดดูบน YouTube ↗'));
      } else {
        const video = document.createElement('video');
        video.src = localSource;
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', title);
        if (button.dataset.poster) video.poster = button.dataset.poster;
        videoHost.append(video, mediaLink(localSource, 'เปิดคลิปในหน้าต่างใหม่ ↗'));
        video.play().catch(() => { /* Native controls remain available if autoplay is denied. */ });
      }
      videoDialog.showModal();
      $('#video-close')?.focus({ preventScroll: true });
      });
      button.disabled = false;
    });
    $('#video-close')?.addEventListener('click', closeVideo);
    videoDialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeVideo();
    });
    videoDialog.addEventListener('close', () => {
      clearVideo();
      videoTrigger?.focus({ preventScroll: true });
    });
    videoDialog.addEventListener('click', event => {
      if (event.target !== videoDialog) return;
      const box = videoDialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
        closeVideo();
      }
    });
  }

  const menu = $('#nav-menu');
  if (menu) {
    $$('a', menu).forEach(link => link.addEventListener('click', () => { menu.open = false; }));
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        $('summary', menu)?.focus();
      }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }

  const bandImage = $('#band-product');
  const bandColor = $('#band-color');
  const bandChoices = $$('#band-choice [data-band]');
  bandChoices.forEach(button => button.addEventListener('click', () => {
    const color = button.dataset.band;
    if (!bandImage || !['black', 'white'].includes(color)) return;
    const source = bandImage.dataset[color === 'black' ? 'blackSrc' : 'whiteSrc'];
    if (!source) return;
    bandImage.src = source;
    bandImage.alt = `Xircle Band ${color === 'black' ? 'สีดำ' : 'สีขาว'}`;
    if (bandColor) bandColor.textContent = color === 'black' ? 'สีดำ' : 'สีขาว';
    bandChoices.forEach(choice => {
      const selected = choice === button;
      choice.setAttribute('aria-pressed', String(selected));
      choice.classList.toggle('is-active', selected);
    });
  }));

  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    reveals.forEach(element => {
      const box = element.getBoundingClientRect();
      if (box.top >= window.innerHeight) {
        element.classList.add('will-reveal');
        revealObserver.observe(element);
      } else element.classList.add('is-visible');
    });
    reduceMotion.addEventListener?.('change', event => {
      if (!event.matches) return;
      stopScan();
      if (demo && demo.dataset.stage !== 'ready') setStage('complete');
      reveals.forEach(element => {
        element.classList.remove('will-reveal');
        element.classList.add('is-visible');
      });
      revealObserver.disconnect();
    });
  }

  const storyLinks = $$('[data-story-link]');
  const storySections = ['eat', 'sleep', 'move'].map(id => document.getElementById(id)).filter(Boolean);
  const progress = $('#scroll-progress');
  let scrolling = false;
  const updateScroll = () => {
    scrolling = false;
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    }
    const position = window.innerHeight * 0.4;
    const section = storySections.find(item => {
      const box = item.getBoundingClientRect();
      return box.top <= position && box.bottom > position;
    });
    storyLinks.forEach(link => {
      const active = !!section && link.hash === `#${section.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const queueScroll = () => {
    if (scrolling) return;
    scrolling = true;
    window.requestAnimationFrame(updateScroll);
  };
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  window.addEventListener('pagehide', () => {
    stopScan();
    closeVideo();
  });
  updateScroll();
  document.documentElement.classList.add('js-enabled');
})();
