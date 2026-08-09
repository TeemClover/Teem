/* myClover · AWAKEN legacy static chapter shim
   This file intentionally does NOT clone or replace #chapter anymore.
   It remains only as a compatibility target for stale cached imports.
*/
(function(){
'use strict';
if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

function normalize(){
  const chapter=document.getElementById('chapter');
  if(!chapter) return;

  chapter.style.setProperty('height','auto','important');
  chapter.style.setProperty('max-height','none','important');
  chapter.style.setProperty('overflow','visible','important');
  chapter.style.setProperty('clip-path','none','important');
  chapter.style.setProperty('contain','none','important');

  chapter.querySelectorAll('.phase').forEach(phase=>{
    phase.hidden=false;
    phase.removeAttribute('aria-hidden');
    phase.style.setProperty('display','block','important');
    phase.style.setProperty('height','auto','important');
    phase.style.setProperty('max-height','none','important');
    phase.style.setProperty('overflow','visible','important');
    phase.style.setProperty('visibility','visible','important');
    phase.style.setProperty('opacity','1','important');
    phase.style.setProperty('transform','none','important');
    phase.style.setProperty('clip-path','none','important');
    phase.style.setProperty('contain','none','important');
  });
}

function boot(){
  normalize();
  document.getElementById('enter')?.addEventListener('click',()=>setTimeout(normalize,0));
  addEventListener('pageshow',normalize);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
