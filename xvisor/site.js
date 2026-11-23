/* X-VISOR home, how-to and lessons: copy buttons, honest copy status, lesson progress, optional lesson video.
   No tracking, no accounts. Everything the page needs is on this origin, so a slow GitHub never blocks it. */
(() => {
  'use strict';
  const CLAUDE_URL = 'https://claude.ai/new';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const el = (tag, attrs = {}, text = '') => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text) node.textContent = text;
    return node;
  };

  /** Resolves true only when the browser really accepted the copy. */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to the older method */ }
    const box = el('textarea', { 'aria-hidden': 'true', tabindex: '-1', readonly: '' });
    box.value = text;
    box.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.appendChild(box);
    box.focus({ preventScroll: true });
    box.select();
    box.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy') === true; } catch { ok = false; }
    box.remove();
    return ok;
  }

  const fileCache = new Map();
  function loadFile(url) {
    if (!fileCache.has(url)) {
      const request = fetch(url, { credentials: 'same-origin' })
        .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.text(); });
      request.catch(() => fileCache.delete(url));
      fileCache.set(url, request);
    }
    return fileCache.get(url);
  }

  function statusFor(button) {
    const selector = button.getAttribute('data-status');
    let box = selector ? $(selector) : null;
    if (!box) {
      box = el('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
      button.insertAdjacentElement('afterend', box);
    }
    return box;
  }

  function show(box, kind, message, withOpen) {
    box.replaceChildren();
    const line = el('p', { class: 'msg' + (kind === 'warn' ? ' warn' : '') }, message);
    box.appendChild(line);
    if (withOpen) {
      const open = el('a', { class: 'btn btn--open', href: CLAUDE_URL, target: '_blank', rel: 'noopener' }, 'เปิด Claude');
      box.appendChild(open);
    }
  }

  function showManual(box, text) {
    let manual = $('.manual', box.parentElement) || $('.manual');
    if (!manual || !box.parentElement.contains(manual)) {
      manual = el('div', { class: 'manual' });
      const label = el('label', {}, 'แตะที่ช่องนี้ เลือกทั้งหมด แล้วกดคัดลอก');
      const area = el('textarea', { readonly: '', rows: '8' });
      area.id = 'manual-' + Math.random().toString(36).slice(2, 8);
      label.setAttribute('for', area.id);
      manual.append(label, area);
      box.insertAdjacentElement('afterend', manual);
    }
    const area = $('textarea', manual);
    area.value = text;
    manual.classList.add('on');
    area.focus({ preventScroll: false });
    area.select();
  }

  function startPrompt() {
    const source = $('#promptText');
    return source ? source.value.trim() : '';
  }

  async function onCopy(button) {
    const kind = button.getAttribute('data-copy');
    const box = statusFor(button);
    let text = '';
    if (kind === 'start') {
      text = startPrompt();
      const context = button.getAttribute('data-context');
      if (context) text += '\n\n' + context;
    } else if (kind === 'link') {
      text = button.getAttribute('data-text') || '';
    } else if (kind === 'file') {
      try { text = await loadFile(button.getAttribute('data-file')); }
      catch {
        show(box, 'warn', 'โหลดไฟล์ไม่สำเร็จ ลองกดอีกครั้ง หรือกดดาวน์โหลดไฟล์แทน', false);
        return;
      }
    }
    if (!text) { show(box, 'warn', 'ยังไม่มีข้อความให้คัดลอก ลองรีเฟรชหน้านี้', false); return; }
    const ok = await copyText(text);
    if (ok) {
      const manual = $('.manual.on', box.parentElement);
      if (manual) manual.classList.remove('on');
      show(box, 'ok', kind === 'link'
        ? 'คัดลอกลิงก์แล้ว วางให้เพื่อนหรือในแชต Claude ได้เลย'
        : 'คัดลอกแล้ว เปิด Claude แล้ววางในแชตใหม่ได้เลย', kind !== 'link');
    } else {
      show(box, 'warn', 'เบราว์เซอร์นี้คัดลอกให้อัตโนมัติไม่ได้ (เจอบ่อยในแอป LINE) ข้อความอยู่ในช่องข้างล่างแล้ว แตะค้างที่ช่อง เลือกทั้งหมด แล้วกดคัดลอก', false);
      showManual(box, text);
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-copy]');
    if (!button) return;
    event.preventDefault();
    onCopy(button);
  });
  // Warm the big file while the visitor reads, so the later tap can copy inside the same gesture.
  $$('[data-copy="file"]').forEach(button => {
    const warm = () => loadFile(button.getAttribute('data-file')).catch(() => {});
    button.addEventListener('pointerenter', warm, { once: true });
    button.addEventListener('touchstart', warm, { once: true, passive: true });
    button.addEventListener('focus', warm, { once: true });
    const holder = button.closest('details');
    if (holder) holder.addEventListener('toggle', warm, { once: true });
  });

  /* Lesson progress lives only in this browser. */
  const KEY = 'xvisor.learn.v1';
  const readProgress = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
  const writeProgress = value => { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* private mode */ } };
  function paintProgress() {
    const progress = readProgress();
    $$('[data-lesson-done]').forEach(node => {
      const id = node.getAttribute('data-lesson-done');
      const checks = progress[id];
      const total = Number(node.getAttribute('data-total') || 0);
      const done = Array.isArray(checks) ? checks.filter(Boolean).length : 0;
      node.classList.toggle('done', total > 0 && done === total);
      const label = $('[data-lesson-count]', node);
      if (label) label.textContent = total && done === total ? 'ทำครบแล้ว' : done ? `ตรวจแล้ว ${done} จาก ${total} ข้อ` : '';
    });
  }
  $$('[data-lesson-check]').forEach(group => {
    const id = group.getAttribute('data-lesson-check');
    const boxes = $$('input[type=checkbox]', group);
    const saved = readProgress()[id];
    boxes.forEach((box, index) => {
      box.checked = Array.isArray(saved) && saved[index] === true;
      box.addEventListener('change', () => {
        const all = readProgress();
        all[id] = boxes.map(item => item.checked);
        writeProgress(all);
        const count = all[id].filter(Boolean).length;
        const out = $('[data-check-count]');
        if (out) out.textContent = count === boxes.length ? 'ครบทุกข้อแล้ว เก่งมากค่ะ/ครับ' : `ตรวจแล้ว ${count} จาก ${boxes.length} ข้อ`;
      });
    });
    const out = $('[data-check-count]');
    if (out) { const count = boxes.filter(item => item.checked).length; out.textContent = count ? `ตรวจแล้ว ${count} จาก ${boxes.length} ข้อ` : ''; }
  });
  paintProgress();

  /* Lesson video: shown only when the team has added a real, embeddable video to learn/videos.json. */
  $$('[data-video-slot]').forEach(async slot => {
    const id = slot.getAttribute('data-video-slot');
    try {
      const res = await fetch('/xvisor/learn/videos.json', { credentials: 'same-origin' });
      if (!res.ok) return;
      const list = await res.json();
      const item = (list.videos || []).find(video => video.lesson === id && /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId || ''));
      if (!item) return;
      const play = el('button', { class: 'btn btn--ghost', type: 'button' }, `ดูวิดีโอ: ${item.title}`);
      play.addEventListener('click', () => {
        const frame = el('iframe', {
          src: `https://www.youtube-nocookie.com/embed/${item.youtubeId}?rel=0&autoplay=1`,
          title: item.title, allow: 'autoplay; encrypted-media; picture-in-picture', allowfullscreen: '', loading: 'lazy',
        });
        slot.replaceChildren(frame);
      });
      slot.replaceChildren(play);
    } catch { /* no video is fine */ }
  });
})();
