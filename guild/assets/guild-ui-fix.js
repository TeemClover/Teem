// Guild X mobile/header stability patch — scoped to /guild only.
(() => {
  if (!/^\/guild\/?(?:index\.html)?$/.test(location.pathname)) return;

  const STYLE_ID = 'guild-ui-fix-20260812';
  function boot() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Canonical myClover mark in Guild header. */
        .brandmark{
          width:38px!important;height:38px!important;display:grid!important;place-items:center!important;
          flex:0 0 38px!important;position:relative!important;
        }
        .brandmark img{
          position:static!important;inset:auto!important;width:100%!important;height:100%!important;
          object-fit:contain!important;display:block!important;
        }

        /* HERO card must be centered from frame 0 — no Safari first-frame snap. */
        @keyframes guildCardFloatStable{
          0%,100%{transform:translate3d(-50%,-50%,0) rotate(0deg)}
          50%{transform:translate3d(-50%,-52%,0) rotate(.7deg)}
        }
        .hero-card-img.guild-card-stable{
          left:50%!important;top:50%!important;transform:translate3d(-50%,-50%,0)!important;
          transform-origin:50% 50%!important;backface-visibility:hidden!important;
          animation:none!important;
        }
        .hero-card-img.guild-card-stable.guild-card-ready{
          animation:guildCardFloatStable 5.6s ease-in-out infinite both!important;
        }

        /* Keep dimensional spacing, fit full Clover on mobile, retain independent movement. */
        @keyframes guildPetalRMobile{
          0%,100%{transform:translate(calc(-2.1% + var(--mx)*-3px),calc(-2.1% + var(--my)*-3px)) scale(.85)}
          50%{transform:translate(calc(-3.0% + var(--mx)*-3px),calc(-1.4% + var(--my)*-3px)) scale(.86)}
        }
        @keyframes guildPetalGMobile{
          0%,100%{transform:translate(calc(2.1% + var(--mx)*3px),calc(-2.1% + var(--my)*-3px)) scale(.85)}
          50%{transform:translate(calc(3.0% + var(--mx)*3px),calc(-1.4% + var(--my)*-3px)) scale(.86)}
        }
        @keyframes guildPetalBMobile{
          0%,100%{transform:translate(calc(-2.1% + var(--mx)*-3px),calc(2.1% + var(--my)*3px)) scale(.85)}
          50%{transform:translate(calc(-3.0% + var(--mx)*-3px),calc(1.4% + var(--my)*3px)) scale(.86)}
        }
        @keyframes guildPetalSMobile{
          0%,100%{transform:translate(calc(2.1% + var(--mx)*3px),calc(2.1% + var(--my)*3px)) scale(.85)}
          50%{transform:translate(calc(3.0% + var(--mx)*3px),calc(1.4% + var(--my)*3px)) scale(.86)}
        }
        @media(max-width:640px){
          .hero-art .orbital{width:96%!important;max-width:500px!important}
          .hero-petal.pr{animation:guildPetalRMobile 7.2s ease-in-out infinite!important}
          .hero-petal.pg{animation:guildPetalGMobile 7.8s ease-in-out infinite -1.4s!important}
          .hero-petal.pb{animation:guildPetalBMobile 8.1s ease-in-out infinite -2.2s!important}
          .hero-petal.ps{animation:guildPetalSMobile 7.5s ease-in-out infinite -3s!important}
          .r1{left:4%!important;top:22%!important}
          .r2{right:4%!important;top:24%!important}
          .r3{left:7%!important;bottom:17%!important}
          .r4{right:7%!important;bottom:15%!important}
        }
        @media(prefers-reduced-motion:reduce){
          .hero-petal.pr,.hero-petal.pg,.hero-petal.pb,.hero-petal.ps{animation:none!important}
          .hero-card-img.guild-card-stable.guild-card-ready{animation:none!important}
        }
      `;
      document.head.appendChild(style);
    }

    const mark = document.querySelector('.brandmark');
    if (mark) {
      mark.innerHTML = '<img src="/icons/icon-192.png" width="192" height="192" alt="myClover">';
    }

    const card = document.querySelector('.hero-card-img');
    if (card && !card.classList.contains('guild-card-stable')) {
      card.classList.add('guild-card-stable');
      const ready = () => requestAnimationFrame(() => card.classList.add('guild-card-ready'));
      if (typeof card.decode === 'function') card.decode().then(ready).catch(ready);
      else if (card.complete) ready();
      else card.addEventListener('load', ready, { once:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
