import '/assets/awaken-chest-object-v5.js?v=20260809-1';

/* AWAKEN boss · mobile overflow guard
   The boss page receives extra UI from several late-loaded modules. One wide child
   must never turn the whole document into a horizontal canvas on iOS Safari.
*/

function onAwaken() {
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}

function addOverflowGuard() {
  if (!onAwaken() || document.getElementById('awaken-mobile-overflow-guard')) return;
  const style = document.createElement('style');
  style.id = 'awaken-mobile-overflow-guard';
  style.textContent = `
    html,body{
      width:100%;
      max-width:100%;
      overflow-x:clip!important;
      overscroll-behavior-x:none;
    }
    body{
      position:relative;
      touch-action:pan-y;
    }
    body>*{
      max-width:100%;
    }
    .wrap,.barrow,.dots,.gate,.chapter,.phase,.head,.tail,footer,
    .truth,.compare,.sample,.timebox,.loop,.step,.cycle,.notebook,
    .partygrid,.member,.relay,.legacy,.more,.morebody,.bookchoice,
    .exits,.aw,.awin{
      min-width:0!important;
      max-width:100%!important;
    }
    .member>*{
      min-width:0;
    }
    img,svg,video,canvas,iframe{
      max-width:100%!important;
      height:auto;
    }
    p,h1,h2,h3,li,summary,a,button,span,b,strong,.mono,.formula,.cycleline{
      overflow-wrap:anywhere;
      word-break:normal;
    }
    pre,code{
      max-width:100%;
      overflow-wrap:anywhere;
      white-space:pre-wrap;
      word-break:break-word;
    }
    @media(max-width:760px){
      .wrap{width:min(100% - 32px,720px)!important}
      .barrow,.dots{width:min(100% - 28px,720px)!important}
      .phase,.head,.tail{max-width:100%!important}
      .sample .label,.cycleline,.bookchoice,.exits{max-width:100%}
    }
  `;
  document.head.appendChild(style);
}

function resetHorizontalPosition() {
  if (!onAwaken()) return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  if ((window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft) !== 0) {
    window.scrollTo(0, y);
  }
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
}

function boot() {
  if (!onAwaken()) return;
  addOverflowGuard();
  requestAnimationFrame(resetHorizontalPosition);
  window.addEventListener('pageshow', () => requestAnimationFrame(resetHorizontalPosition));
  window.addEventListener('resize', () => requestAnimationFrame(resetHorizontalPosition));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestAnimationFrame(resetHorizontalPosition);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
}
