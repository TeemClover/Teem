/* RoutineX · ของใช้ร่วมสองหน้า: คลิป, ปรากฏเมื่อเลื่อนถึง, ส่งต่อ, คัดลอก */
(() => {
  const d = document;
  d.documentElement.classList.add('js');

  /* ----- แจ้งสั้น ๆ ----- */
  let toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) {
      toastEl = d.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      d.body.append(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2400);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = d.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      d.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = d.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  /* ส่งต่อด้วยแผ่นแชร์ของเครื่อง ถ้าไม่มีให้คัดลอกแทน */
  async function share({ title, text, url }) {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return 'shared'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    }
    const ok = await copy([text, url].filter(Boolean).join('\n'));
    toast(ok ? 'คัดลอกแล้ว วางในแชตได้เลย' : 'คัดลอกไม่ได้ ลองกดค้างเพื่อคัดลอกเอง');
    return ok ? 'copied' : 'fail';
  }

  /* ----- คลิป: ต่อ YouTube เมื่อกดเล่นเท่านั้น ----- */
  for (const clip of d.querySelectorAll('.clip[data-yt]')) {
    const btn = clip.querySelector('.clip__btn');
    if (!btn) continue;
    btn.addEventListener('click', () => {
      const id = clip.dataset.yt;
      if (!/^[\w-]{11}$/.test(id)) return;
      const f = d.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
      f.title = clip.dataset.title || 'คลิป RoutineX';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      btn.replaceWith(f);
      clip.dispatchEvent(new CustomEvent('clip:play', { bubbles: true, detail: { id } }));
    });
  }

  /* ----- ปรากฏเมื่อเลื่อนถึง ----- */
  const rv = [...d.querySelectorAll('.rv')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach((el) => io.observe(el));
  } else rv.forEach((el) => el.classList.add('in'));
  // กันหน้าค้างโปร่งใส ถ้า observer ไม่ทำงาน
  setTimeout(() => rv.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }), 1200);

  /* ----- ปุ่มส่งหน้านี้ต่อ ----- */
  for (const b of d.querySelectorAll('[data-share-page]')) {
    b.addEventListener('click', () => share({
      title: d.title,
      text: b.dataset.shareText || d.querySelector('meta[name="description"]')?.content || '',
      url: b.dataset.shareUrl ? new URL(b.dataset.shareUrl, location.href).href : location.origin + location.pathname,
    }));
  }

  window.RoutineX = { toast, copy, share };
})();
