// Guild X — quest board visual + Party/XTY layout polish.
// Scoped to /guild. Does not modify the Hero Clover geometry.
(() => {
  if (!/^\/guild\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (window.__mcGuildQuestboardVisualV2) return;
  window.__mcGuildQuestboardVisualV2 = true;

  const STYLE_ID = 'guild-questboard-visual-v2';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Copy always owns the top of the card. Artwork begins below the controls. */
      .party-world{min-height:700px!important}
      .party-world .guild-world-copy{
        position:relative!important;z-index:30!important;max-width:none!important;
        padding:34px 34px 30px!important;
        background:linear-gradient(180deg,rgba(13,13,9,.985) 0%,rgba(13,13,9,.94) 73%,rgba(13,13,9,.48) 90%,transparent 100%);
      }
      .party-world .guild-world-kicker{margin-bottom:11px!important}
      .party-world .guild-world-copy h3{margin:14px 0 14px!important;line-height:1.16!important;padding-top:.07em!important;padding-bottom:.10em!important;overflow:visible!important}
      .party-world .guild-world-copy p{max-width:520px!important}
      .party-world .guild-world-points{margin-top:17px!important}
      .party-world .public-badge{margin-top:14px!important}
      .party-world .guild-world-copy .actions{position:relative!important;z-index:35!important;display:flex!important;gap:10px!important;margin-top:18px!important;flex-wrap:wrap!important}
      .party-world .guild-world-copy .btn,.party-world .guild-world-copy .pill{position:relative!important;z-index:36!important}
      .party-world .guild-world-art{inset:346px 0 0!important;isolation:isolate!important;overflow:hidden!important}
      .party-world .guild-world-art:before{content:"";position:absolute;z-index:5;left:0;right:0;top:0;height:76px;background:linear-gradient(180deg,rgba(13,13,9,.72),transparent);pointer-events:none}
      .party-world .party-dust,.party-world .party-sigil{z-index:1}
      .party-world .party-x{z-index:2;opacity:.10!important;mix-blend-mode:screen}
      .party-world .party-pet{z-index:7;width:22%!important;height:34%!important}
      .party-world .pet-pig{left:2%!important;bottom:14%!important}
      .party-world .pet-dog{right:2%!important;bottom:15%!important}
      .party-world .pet-crow{left:15%!important;bottom:-1%!important}
      .party-world .pet-chicken{right:15%!important;bottom:-1%!important}

      /* Real quest board: smaller, lower, and quieter than the foreground pets. */
      .party-board-window{
        position:absolute;z-index:4;left:50%;bottom:-2%;
        width:58%;height:74%;overflow:hidden;border-radius:24px;
        pointer-events:none;
        transform:translate3d(calc(-50% + var(--px)*3px),calc(var(--py)*2px + var(--scene)*-4px),0);
        filter:drop-shadow(0 22px 32px rgba(0,0,0,.38));
        -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 10%,#000 93%,transparent 100%);
        mask-image:linear-gradient(180deg,transparent 0,#000 10%,#000 93%,transparent 100%);
        animation:gQuestBoardFloat 8.2s ease-in-out infinite;
      }
      .party-board-window:after{content:"";position:absolute;inset:10% 12% 8%;border-radius:22px;box-shadow:0 0 34px rgba(141,246,189,.07),0 0 54px rgba(240,202,107,.045);pointer-events:none}
      .party-board-img{
        position:absolute!important;left:-39%!important;top:-4%!important;
        width:178%!important;height:auto!important;max-width:none!important;
        object-fit:contain!important;opacity:.94;
        transform:translate3d(calc(var(--px)*-2px),calc(var(--py)*-2px),0) scale(1.005);
        transform-origin:50% 50%;filter:saturate(1.02) contrast(1.01);
        animation:gQuestBoardBreathe 7.6s ease-in-out infinite;
      }
      @keyframes gQuestBoardFloat{0%,100%{translate:0 0}50%{translate:0 -4px}}
      @keyframes gQuestBoardBreathe{0%,100%{scale:1;opacity:.91}50%{scale:1.01;opacity:.98}}

      @media(max-width:980px){
        .party-world{min-height:720px!important}
        .party-world .guild-world-art{inset:350px 0 0!important}
        .party-board-window{width:56%;height:72%;bottom:-1%}
      }
      @media(max-width:640px){
        .party-world{min-height:760px!important}
        .party-world .guild-world-copy{padding:28px 22px 26px!important;background:linear-gradient(180deg,rgba(13,13,9,.99) 0%,rgba(13,13,9,.96) 76%,rgba(13,13,9,.55) 91%,transparent 100%)}
        .party-world .guild-world-kicker{margin-bottom:13px!important}
        .party-world .guild-world-copy h3{font-size:44px!important;line-height:1.18!important;margin:12px 0 12px!important;padding-top:.09em!important;padding-bottom:.12em!important}
        .party-world .guild-world-copy .actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin-top:16px!important}
        .party-world .guild-world-copy .btn,.party-world .guild-world-copy .pill{width:100%!important;min-width:0!important;padding-inline:10px!important;font-size:12px!important}
        .party-world .guild-world-art{inset:410px 0 0!important}
        .party-board-window{width:63%;height:70%;bottom:-1%;border-radius:18px}
        .party-board-img{left:-41%!important;width:182%!important;top:-1%!important}
        .party-world .party-pet{width:24%!important;height:32%!important}
        .party-world .pet-pig{left:1%!important;bottom:13%!important}.party-world .pet-dog{right:1%!important;bottom:14%!important}.party-world .pet-crow{left:13%!important;bottom:0!important}.party-world .pet-chicken{right:13%!important;bottom:0!important}
      }
      @media(max-width:420px){
        .party-world{min-height:790px!important}
        .party-world .guild-world-art{inset:438px 0 0!important}
        .party-world .guild-world-copy .actions{grid-template-columns:1fr!important}
        .party-board-window{width:66%;height:68%}
      }
      @media(prefers-reduced-motion:reduce){
        .party-board-window,.party-board-img{animation:none!important;translate:none!important;scale:none!important}
        .party-board-window{left:50%!important;transform:translateX(-50%)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    addStyle();
    const art = document.querySelector('.party-world .guild-world-art');
    if (!art) return false;

    const petSources = [
      ['.pet-pig', '/guild/assets/pig.webp'],
      ['.pet-crow', '/guild/assets/dog.webp'],
      ['.pet-chicken', '/guild/assets/crow.webp'],
      ['.pet-dog', '/guild/assets/chicken.webp']
    ];
    petSources.forEach(([selector, src]) => {
      const pet = art.querySelector(selector);
      if (pet && pet.getAttribute('src') !== src) pet.src = src;
    });

    if (art.querySelector('.party-board-window')) return true;
    const windowEl = document.createElement('div');
    windowEl.className = 'party-board-window';
    windowEl.setAttribute('aria-hidden', 'true');
    windowEl.innerHTML = '<img class="party-board-img" src="/guild/assets/questboard.png" loading="lazy" decoding="async" alt="">';
    const firstPet = art.querySelector('.party-pet');
    if (firstPet) art.insertBefore(windowEl, firstPet); else art.appendChild(windowEl);
    return true;
  }

  function boot() {
    addStyle();
    if (install()) return;
    const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
