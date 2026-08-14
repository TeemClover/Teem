// Guild X — quest board visual for the Party/XTY card.
// Scoped to /guild and intentionally leaves the Hero artwork untouched.
(() => {
  if (!/^\/guild\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (window.__mcGuildQuestboardVisualV1) return;
  window.__mcGuildQuestboardVisualV1 = true;

  const STYLE_ID = 'guild-questboard-visual-v1';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Fill the deliberate empty space in Party/XTY with the real quest board.
         The source art includes its own side pets, so the viewport crops toward
         the center board while the live XTY pets remain as the foreground layer. */
      .party-world .guild-world-art{isolation:isolate}
      .party-world .party-dust,.party-world .party-sigil{z-index:1}
      .party-world .party-x{z-index:2;opacity:.16!important;mix-blend-mode:screen}
      .party-world .party-pet{z-index:6}

      .party-board-window{
        position:absolute;z-index:4;left:50%;bottom:1.5%;
        width:77%;height:68%;overflow:hidden;border-radius:26px;
        pointer-events:none;
        transform:translate3d(calc(-50% + var(--px)*5px),calc(var(--py)*4px + var(--scene)*-7px),0);
        filter:drop-shadow(0 24px 34px rgba(0,0,0,.42));
        -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 8%,#000 90%,transparent 100%);
        mask-image:linear-gradient(180deg,transparent 0,#000 8%,#000 90%,transparent 100%);
        animation:gQuestBoardFloat 7.4s ease-in-out infinite;
      }
      .party-board-window:after{
        content:"";position:absolute;inset:9% 11% 8%;border-radius:24px;
        box-shadow:0 0 46px rgba(141,246,189,.08),0 0 70px rgba(240,202,107,.055);
        pointer-events:none;
      }
      .party-board-img{
        position:absolute!important;left:-31%!important;top:-4%!important;
        width:162%!important;height:auto!important;max-width:none!important;
        object-fit:contain!important;opacity:.96;
        transform:translate3d(calc(var(--px)*-4px),calc(var(--py)*-3px),0) scale(1.01);
        transform-origin:50% 50%;
        filter:saturate(1.03) contrast(1.02);
        animation:gQuestBoardBreathe 6.8s ease-in-out infinite;
      }

      @keyframes gQuestBoardFloat{
        0%,100%{translate:0 0}
        50%{translate:0 -7px}
      }
      @keyframes gQuestBoardBreathe{
        0%,100%{scale:1;opacity:.92}
        50%{scale:1.018;opacity:1}
      }

      @media(max-width:980px){
        .party-board-window{width:72%;height:65%;bottom:2%}
      }
      @media(max-width:640px){
        .party-board-window{width:78%;height:58%;bottom:5%;border-radius:20px}
        .party-board-img{left:-35%!important;width:170%!important;top:-1%!important}
        .party-world .party-pet{width:27%!important}
      }
      @media(prefers-reduced-motion:reduce){
        .party-board-window,.party-board-img{animation:none!important;transform:none!important;translate:none!important;scale:none!important}
        .party-board-window{left:50%!important;transform:translateX(-50%)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    const art = document.querySelector('.party-world .guild-world-art');
    if (!art) return false;
    if (art.querySelector('.party-board-window')) return true;

    addStyle();
    const windowEl = document.createElement('div');
    windowEl.className = 'party-board-window';
    windowEl.setAttribute('aria-hidden', 'true');
    windowEl.innerHTML = '<img class="party-board-img" src="/guild/assets/questboard.png" loading="lazy" decoding="async" alt="">';

    const firstPet = art.querySelector('.party-pet');
    if (firstPet) art.insertBefore(windowEl, firstPet);
    else art.appendChild(windowEl);
    return true;
  }

  function boot() {
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
