/* myClover · AWAKEN chapter guard + chest lazy loader
   - never owns/replaces #chapter
   - keeps the real Chapter 7 DOM continuous and unclipped
   - loads the chest only after Lv.7 is actually open
*/
(function(){
'use strict';
if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname))return;

let loaded=false;
let timer=0;
let chapterNode=null;
let parentObserver=null;

function normalizeChapter(){
  const chapter=document.getElementById('chapter');
  if(!chapter)return;
  chapterNode=chapter;

  const structural=[chapter,chapter.querySelector(':scope > .wrap'),...chapter.querySelectorAll('.phase,.truth,.compare,.sample,.timebox,.loop,.step,.cycle,.notebook,.language-sidequest,.partygrid,.tail')].filter(Boolean);
  structural.forEach(node=>{
    node.style.setProperty('height','auto','important');
    node.style.setProperty('max-height','none','important');
    node.style.setProperty('overflow','visible','important');
    node.style.setProperty('clip-path','none','important');
    node.style.setProperty('contain','none','important');
  });

  chapter.querySelectorAll('.phase').forEach(phase=>{
    phase.hidden=false;
    phase.removeAttribute('aria-hidden');
    phase.style.setProperty('display','block','important');
    phase.style.setProperty('visibility','visible','important');
    phase.style.setProperty('opacity','1','important');
    phase.style.setProperty('transform','none','important');
  });

  /* Progress UI must never become a gate again. */
  const xp=document.getElementById('xp');
  const dots=document.getElementById('dots');
  if(xp)xp.hidden=true;
  if(dots)dots.hidden=true;
}

function watchChapterReplacement(){
  const chapter=document.getElementById('chapter');
  const parent=chapter?.parentElement;
  if(!parent||parentObserver)return;
  parentObserver=new MutationObserver(()=>{
    const current=document.getElementById('chapter');
    if(current&&current!==chapterNode){
      normalizeChapter();
      schedule();
    }
  });
  parentObserver.observe(parent,{childList:true});
}

function loadChest(){
  if(loaded)return;
  loaded=true;
  import('/assets/awaken-chest-object-v5.js?v=20260810-layout2').catch(error=>{
    loaded=false;
    console.error('[AWAKEN] Chest failed to load.',error);
  });
}

function schedule(){
  normalizeChapter();
  const chapter=document.getElementById('chapter');
  if(!chapter||chapter.hidden||loaded||timer)return;
  timer=setTimeout(()=>{timer=0;normalizeChapter();loadChest()},180);
}

function boot(){
  normalizeChapter();
  watchChapterReplacement();
  schedule();
  document.getElementById('enter')?.addEventListener('click',()=>{
    setTimeout(()=>{normalizeChapter();schedule()},0);
    setTimeout(normalizeChapter,250);
    setTimeout(normalizeChapter,900);
  });
  addEventListener('pageshow',()=>{normalizeChapter();schedule()});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
