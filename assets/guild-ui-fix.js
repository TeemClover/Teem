// Guild X mobile/header + typography stability patch — scoped to /guild only.
(() => {
  if (!/^\/guild\/?(?:index\.html)?$/.test(location.pathname)) return;

  const STYLE_ID = 'guild-ui-fix-20260814-v3';
  const THAI_RE = /[\u0E00-\u0E7F]/;

  function markThaiSafety(root = document) {
    root.querySelectorAll('h1,h2,h3').forEach(el => {
      if (THAI_RE.test(el.textContent || '')) el.classList.add('guild-thai-heading-safe');
    });
    root.querySelectorAll('.btn,.pill,.public-badge,.guild-world-points span,.mission-flow span').forEach(el => {
      if (THAI_RE.test(el.textContent || '')) el.classList.add('guild-thai-control-safe');
    });
  }

  function boot() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Canonical myClover mark in Guild header. */
        .brandmark{width:38px!important;height:38px!important;display:grid!important;place-items:center!important;flex:0 0 38px!important;position:relative!important}
        .brandmark img{position:static!important;inset:auto!important;width:100%!important;height:100%!important;object-fit:contain!important;display:block!important}

        /* Thai glyph safety: real vertical room for ่ ้ ๊ ๋ ุ ู and stacked marks. */
        .guild-thai-heading-safe{
          line-height:1.24!important;
          overflow:visible!important;
          padding-top:.15em!important;
          padding-bottom:.18em!important;
          text-wrap:balance;
          -webkit-font-smoothing:antialiased;
        }
        h1.guild-thai-heading-safe{line-height:1.20!important}
        h3.guild-thai-heading-safe{line-height:1.24!important}

        /* Gold gradient text was the remaining clip source on Thai glyphs.
           Give the gradient span its own ink box without changing visible size. */
        .guild-thai-heading-safe .shine{
          display:inline-block!important;
          line-height:1.24!important;
          overflow:visible!important;
          padding:.16em .035em .20em!important;
          margin:-.16em -.035em -.20em!important;
          vertical-align:baseline!important;
          -webkit-box-decoration-break:clone;
          box-decoration-break:clone;
          background-clip:text!important;
          -webkit-background-clip:text!important;
        }
        .guild-thai-control-safe{line-height:1.46!important;padding-top:8px!important;padding-bottom:8px!important;white-space:normal!important}

        /* Hero title: give the gold X a little right-side ink room. */
        .hero-copy{overflow:visible!important;min-width:0!important;padding-right:22px!important}
        .hero-copy h1{overflow:visible!important;padding-right:.12em!important;margin-right:-.04em!important}
        .hero-copy h1 .shine{padding-right:.055em!important}

        /* Hero art X: same position, slightly smaller canvas footprint so its right point never clips. */
        .hero-art .xgold{inset:28%!important;width:44%!important;height:44%!important}

        /* HERO card must be centered from frame 0 — no Safari first-frame snap. */
        @keyframes guildCardFloatStable{0%,100%{transform:translate3d(-50%,-50%,0) rotate(0deg)}50%{transform:translate3d(-50%,-52%,0) rotate(.7deg)}}
        .hero-card-img.guild-card-stable,.card-sheen.guild-card-stable{left:50%!important;top:50%!important;transform:translate3d(-50%,-50%,0)!important;transform-origin:50% 50%!important;backface-visibility:hidden!important;animation:none!important}
        .hero-card-img.guild-card-stable.guild-card-ready,.card-sheen.guild-card-stable.guild-card-ready{animation:guildCardFloatStable 5.6s ease-in-out infinite both!important}

        /* Keep the original dimensional spacing, but fit the full Clover on mobile. */
        @keyframes guildPetalRMobile{0%,100%{transform:translate(calc(-2.1% + var(--mx)*-3px),calc(-2.1% + var(--my)*-3px)) scale(.85)}50%{transform:translate(calc(-3.0% + var(--mx)*-3px),calc(-1.4% + var(--my)*-3px)) scale(.86)}}
        @keyframes guildPetalGMobile{0%,100%{transform:translate(calc(2.1% + var(--mx)*3px),calc(-2.1% + var(--my)*-3px)) scale(.85)}50%{transform:translate(calc(3.0% + var(--mx)*3px),calc(-1.4% + var(--my)*-3px)) scale(.86)}}
        @keyframes guildPetalBMobile{0%,100%{transform:translate(calc(-2.1% + var(--mx)*-3px),calc(2.1% + var(--my)*3px)) scale(.85)}50%{transform:translate(calc(-3.0% + var(--mx)*-3px),calc(1.4% + var(--my)*3px)) scale(.86)}}
        @keyframes guildPetalSMobile{0%,100%{transform:translate(calc(2.1% + var(--mx)*3px),calc(2.1% + var(--my)*3px)) scale(.85)}50%{transform:translate(calc(3.0% + var(--mx)*3px),calc(1.4% + var(--my)*3px)) scale(.86)}}
        @media(max-width:640px){
          .hero-art .orbital{width:96%!important;max-width:500px!important}
          .hero-art .xgold{inset:29%!important;width:42%!important;height:42%!important}
          .hero-copy{padding-right:18px!important}
          .hero-petal.pr{animation:guildPetalRMobile 7.2s ease-in-out infinite!important}
          .hero-petal.pg{animation:guildPetalGMobile 7.8s ease-in-out infinite -1.4s!important}
          .hero-petal.pb{animation:guildPetalBMobile 8.1s ease-in-out infinite -2.2s!important}
          .hero-petal.ps{animation:guildPetalSMobile 7.5s ease-in-out infinite -3s!important}
          .r1{left:4%!important;top:22%!important}.r2{right:4%!important;top:24%!important}.r3{left:7%!important;bottom:17%!important}.r4{right:7%!important;bottom:15%!important}
          .guild-thai-heading-safe{line-height:1.27!important;padding-top:.17em!important;padding-bottom:.20em!important}
          .guild-thai-heading-safe .shine{line-height:1.27!important;padding-top:.18em!important;padding-bottom:.22em!important;margin-top:-.18em!important;margin-bottom:-.22em!important}
        }
        @media(prefers-reduced-motion:reduce){
          .hero-petal.pr,.hero-petal.pg,.hero-petal.pb,.hero-petal.ps{animation:none!important}
          .hero-card-img.guild-card-stable.guild-card-ready,.card-sheen.guild-card-stable.guild-card-ready{animation:none!important}
        }
      `;
      document.head.appendChild(style);
    }

    const mark = document.querySelector('.brandmark');
    if (mark) mark.innerHTML = '<img src="/icons/icon-192.png" width="192" height="192" alt="myClover">';

    markThaiSafety();
    const thaiObserver = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(node => {
      if (node.nodeType === 1) { markThaiSafety(node); if (node.matches?.('h1,h2,h3') && THAI_RE.test(node.textContent || '')) node.classList.add('guild-thai-heading-safe'); }
    })));
    thaiObserver.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => thaiObserver.disconnect(), 15000);

    const card = document.querySelector('.hero-card-img');
    const sheen = document.querySelector('.card-sheen');
    if (card && !card.classList.contains('guild-card-stable')) {
      const pair = sheen ? [card, sheen] : [card];
      pair.forEach(el => el.classList.add('guild-card-stable'));
      const ready = () => requestAnimationFrame(() => pair.forEach(el => el.classList.add('guild-card-ready')));
      if (typeof card.decode === 'function') card.decode().then(ready).catch(ready);
      else if (card.complete) ready();
      else card.addEventListener('load', ready, { once:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();

if (/^\/guild\/?(?:index\.html)?$/.test(location.pathname)) {
  import('/assets/guild-questboard-visual.js?v=20260814-2').catch(error => {
    console.error('[Guild X] quest board visual failed to load:', error);
  });
}
