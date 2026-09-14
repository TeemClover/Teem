/* เรื่องเล่าจากโรงตีเหล็ก · ปัดต่อจากท้ายหน้าเฉพาะอุปกรณ์สัมผัส
   Desktop: wheel/trackpad และปุ่มเลื่อนหน้าไม่เปลี่ยนตอน ใช้ลิงก์ตอนต่อไปแทน */
const nextLink = document.querySelector('a[rel="next"][data-next], a[data-next]');
const isComic = /^\/forge\/(?:intro|ep\d+-)/.test(location.pathname);

if (isComic && nextLink?.href) {
  let atBottom = false;
  const touchNavigation = window.matchMedia?.('(hover: none) and (pointer: coarse)');
  let touchStartY = 0;
  let touchStartedAtBottom = false;
  let navigating = false;

  const style = document.createElement('style');
  style.textContent = `
    .mc-scroll-next{position:fixed;z-index:11000;left:50%;bottom:max(14px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:11px 15px 11px 16px;border:1px solid rgb(210 173 91/.58);border-radius:999px;background:rgb(5 25 15/.94);color:#fff;box-shadow:0 12px 34px rgb(0 0 0/.3);font:700 13px/1.35 "Anuphan",system-ui,sans-serif;pointer-events:none;opacity:0;transform:translate(-50%,12px);transition:opacity .2s,transform .2s;backdrop-filter:blur(10px)}
    .mc-scroll-next[hidden]{display:none}
    .mc-scroll-next[data-show="1"]{opacity:1;transform:translate(-50%,0)}
    .mc-scroll-next__hint{color:#e2bf71;white-space:nowrap}.mc-scroll-next__arrow{display:inline-block;font-size:18px;animation:mc-scroll-next-bob 1.1s ease-in-out infinite}
    @keyframes mc-scroll-next-bob{50%{transform:translateY(3px)}}
    @media(max-width:520px){.mc-scroll-next{width:calc(100vw - 24px);justify-content:center;border-radius:16px;font-size:12.5px}.mc-scroll-next__label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
    @media(prefers-reduced-motion:reduce){.mc-scroll-next{transition:none}.mc-scroll-next__arrow{animation:none}}
  `;
  document.head.append(style);

  const notice = document.createElement('div');
  notice.className = 'mc-scroll-next';
  notice.hidden = !touchNavigation?.matches;
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
    atBottom = bottomNow();
    notice.hidden = !touchNavigation?.matches;
    notice.dataset.show = atBottom && !notice.hidden ? '1' : '0';
  };

  const goNext = input => {
    if (navigating || !touchNavigation?.matches) return;
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

  touchNavigation?.addEventListener?.('change', updateBottom);

  addEventListener('touchstart', event => {
    touchStartY = event.touches[0]?.clientY || 0;
    touchStartedAtBottom = !!touchNavigation?.matches && atBottom && bottomNow();
  }, { passive:true });

  addEventListener('touchend', event => {
    if (!touchStartedAtBottom) return;
    const endY = event.changedTouches[0]?.clientY || touchStartY;
    if (touchStartY - endY >= 64 && bottomNow()) goNext('touch');
    touchStartedAtBottom = false;
  }, { passive:true });

  updateBottom();
}
