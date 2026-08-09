/* เรื่องเล่าจากโรงตีเหล็ก · เลื่อนต่อจากท้ายหน้าเพื่อไปตอนถัดไป */
const nextLink = document.querySelector('a[rel="next"][data-next], a[data-next]');
const isComic = /^\/forge\/(?:intro|ep\d+-)/.test(location.pathname);

if (isComic && nextLink?.href) {
  let atBottom = false;
  let wheelDistance = 0;
  let wheelTimer = 0;
  let touchStartY = 0;
  let touchStartedAtBottom = false;
  let navigating = false;

  const style = document.createElement('style');
  style.textContent = `
    .mc-scroll-next{position:fixed;z-index:11000;left:50%;bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:11px 15px 11px 16px;border:1px solid rgb(210 173 91/.58);border-radius:999px;background:rgb(5 25 15/.94);color:#fff;box-shadow:0 12px 34px rgb(0 0 0/.3);font:700 13px/1.35 "Anuphan",system-ui,sans-serif;pointer-events:none;opacity:0;transform:translate(-50%,12px);transition:opacity .2s,transform .2s;backdrop-filter:blur(10px)}
    .mc-scroll-next[data-show="1"]{opacity:1;transform:translate(-50%,0)}
    .mc-scroll-next__hint{color:#e2bf71;white-space:nowrap}.mc-scroll-next__arrow{display:inline-block;font-size:18px;animation:mc-scroll-next-bob 1.1s ease-in-out infinite}
    @keyframes mc-scroll-next-bob{50%{transform:translateY(3px)}}
    @media(max-width:520px){.mc-scroll-next{width:calc(100vw - 24px);justify-content:center;border-radius:16px;font-size:12.5px}.mc-scroll-next__label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
    @media(prefers-reduced-motion:reduce){.mc-scroll-next{transition:none}.mc-scroll-next__arrow{animation:none}}
  `;
  document.head.append(style);

  const notice = document.createElement('div');
  notice.className = 'mc-scroll-next';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  const nextText = (nextLink.textContent || 'ตอนถัดไป').replace(/\s+/g, ' ').trim();
  notice.innerHTML = `<span class="mc-scroll-next__arrow" aria-hidden="true">↓</span><span class="mc-scroll-next__label">ถึงท้ายตอนแล้ว</span><span class="mc-scroll-next__hint">เลื่อนต่อเพื่อ ${nextText}</span>`;
  document.body.append(notice);

  const bottomNow = () => {
    const root = document.documentElement;
    return Math.ceil(scrollY + innerHeight) >= root.scrollHeight - 3;
  };

  const updateBottom = () => {
    const wasAtBottom = atBottom;
    atBottom = bottomNow();
    notice.dataset.show = atBottom ? '1' : '0';
    if (!atBottom || !wasAtBottom) wheelDistance = 0;
  };

  const goNext = input => {
    if (navigating) return;
    navigating = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'forge_bottom_scroll_next',
      input,
      from: location.pathname,
      to: new URL(nextLink.href).pathname
    });
    notice.querySelector('.mc-scroll-next__label').textContent = 'กำลังเปิดตอนถัดไป';
    notice.querySelector('.mc-scroll-next__hint').textContent = '→';
    setTimeout(() => location.assign(nextLink.href), 80);
  };

  addEventListener('scroll', updateBottom, { passive:true });
  addEventListener('resize', updateBottom, { passive:true });

  addEventListener('wheel', event => {
    const startedAtBottom = atBottom && bottomNow();
    updateBottom();
    if (!startedAtBottom || event.deltaY <= 0) {
      wheelDistance = 0;
      return;
    }
    clearTimeout(wheelTimer);
    wheelDistance += Math.min(event.deltaY, 80);
    wheelTimer = setTimeout(() => { wheelDistance = 0; }, 700);
    if (wheelDistance >= 100) goNext('wheel');
  }, { passive:true });

  addEventListener('touchstart', event => {
    touchStartY = event.touches[0]?.clientY || 0;
    touchStartedAtBottom = atBottom && bottomNow();
  }, { passive:true });

  addEventListener('touchend', event => {
    if (!touchStartedAtBottom) return;
    const endY = event.changedTouches[0]?.clientY || touchStartY;
    if (touchStartY - endY >= 64 && bottomNow()) goNext('touch');
    touchStartedAtBottom = false;
  }, { passive:true });

  addEventListener('keydown', event => {
    if (!atBottom || !bottomNow()) return;
    const forward = event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'End' || (event.key === ' ' && !event.shiftKey);
    if (!forward || event.target.closest?.('input,textarea,select,button,[contenteditable="true"]')) return;
    event.preventDefault();
    goNext('keyboard');
  });

  updateBottom();
}
