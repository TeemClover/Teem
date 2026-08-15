const box = document.getElementById('log');

if (box) install();

function install() {
  injectStyle();
  let forceLatest = true;
  let programmatic = false;

  const nearBottom = () => box.scrollHeight - box.clientHeight - box.scrollTop < 72;

  function pinLatest(force = false) {
    if (!force && !forceLatest && box.dataset.xtyPinned === '0') return;
    requestAnimationFrame(() => {
      programmatic = true;
      box.scrollTop = box.scrollHeight;
      box.dataset.xtyPinned = '1';
      forceLatest = false;
      requestAnimationFrame(() => { programmatic = false; });
    });
  }

  box.addEventListener('scroll', () => {
    if (programmatic) return;
    box.dataset.xtyPinned = nearBottom() ? '1' : '0';
  }, { passive: true });

  document.addEventListener('click', event => {
    if (event.target?.closest?.('#refresh,#send,#commitDo')) {
      forceLatest = true;
      box.dataset.xtyPinned = '1';
      setTimeout(() => pinLatest(true), 40);
      setTimeout(() => pinLatest(true), 240);
    }
  }, true);

  const observer = new MutationObserver(() => pinLatest(false));
  observer.observe(box, { childList: true, subtree: true, characterData: true });

  window.addEventListener('resize', () => {
    if (box.dataset.xtyPinned !== '0') pinLatest(true);
  }, { passive: true });

  box.dataset.xtyPinned = '1';
  pinLatest(true);
  setTimeout(() => pinLatest(true), 80);
  setTimeout(() => pinLatest(true), 360);
}

function injectStyle() {
  if (document.getElementById('xty-party-log-viewport-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-party-log-viewport-style';
  style.textContent = `
    #log{
      height:min(68dvh,680px);
      min-height:320px;
      overflow-y:auto!important;
      overflow-x:hidden;
      overscroll-behavior:contain;
      -webkit-overflow-scrolling:touch;
      scrollbar-gutter:stable;
      scroll-behavior:smooth;
      padding-right:4px;
      border-top:1px solid rgba(62,51,44,.08);
      border-bottom:1px solid rgba(62,51,44,.08);
    }
    #log:focus-visible{outline:3px solid rgba(50,139,92,.18);outline-offset:3px}
    @media (max-height:650px){#log{height:62dvh;min-height:260px}}
    @media (min-width:760px){#log{height:min(62vh,620px)}}
  `;
  document.head.appendChild(style);
  box.tabIndex = 0;
  box.setAttribute('aria-label', 'Party Log — เลื่อนขึ้นเพื่อดูข้อความเก่า ข้อความล่าสุดอยู่ด้านล่าง');
}
