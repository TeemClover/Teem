/* RoutineX final-art frame follows the real uploaded canvas on phones. */
(function(){
  'use strict';
  var body=document.body;
  if(!body||!body.classList.contains('xp-routinex-story'))return;
  var stage=document.querySelector('[data-xp-stage]');
  var frame=document.querySelector('[data-routine-persistent]');
  var image=frame&&frame.querySelector('.xp-routine-summary-image');
  if(!stage||!frame||!image)return;

  function activeMode(){
    var scene=stage.querySelector('[data-scene].active');
    return scene?String(scene.getAttribute('data-routine-active')||''):'';
  }

  function fit(){
    var mode=activeMode();
    frame.setAttribute('data-routine-active',mode);
    if(window.innerWidth>780||mode!=='SUMMARY'){
      body.style.removeProperty('--rx-mobile-art-h');
      return;
    }
    function apply(){
      var width=frame.getBoundingClientRect().width||Math.max(0,window.innerWidth-24);
      var ratio=(image.naturalWidth&&image.naturalHeight)?(image.naturalHeight/image.naturalWidth):(9/16);
      if(width>0&&ratio>0)body.style.setProperty('--rx-mobile-art-h',Math.round(width*ratio)+'px');
    }
    if(image.complete&&image.naturalWidth)apply();
    else image.addEventListener('load',apply,{once:true});
  }

  if(window.MutationObserver){
    var observer=new MutationObserver(fit);
    observer.observe(stage,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('resize',fit,{passive:true});
  fit();
})();
