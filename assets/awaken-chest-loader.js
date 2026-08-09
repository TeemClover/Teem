/* myClover · AWAKEN chest lazy loader
   Chapter visibility is owned by awaken-static-chapter.js.
   This file only loads the chest after Lv.7 is actually open.
*/
(function(){
'use strict';
if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname))return;

let loaded=false;
let timer=0;

function loadChest(){
  if(loaded)return;
  loaded=true;
  import('/assets/awaken-chest-object-v5.js?v=20260810-static1').catch(error=>{
    loaded=false;
    console.error('[AWAKEN] Chest failed to load.',error);
  });
}

function schedule(){
  const chapter=document.getElementById('chapter');
  if(!chapter||chapter.hidden||loaded||timer)return;
  timer=setTimeout(()=>{timer=0;loadChest()},180);
}

function boot(){
  schedule();
  document.getElementById('enter')?.addEventListener('click',()=>setTimeout(schedule,0));
  addEventListener('pageshow',schedule);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
