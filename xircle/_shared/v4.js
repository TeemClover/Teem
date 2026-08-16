/* XIRCLE × myClover XTY — cinematic interaction layer v4 */
(function(){
  'use strict';
  var REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body=document.body;

  function activeScene(){return document.querySelector('[data-scene].is-active')}
  function enterScene(scene){
    if(!scene)return;
    body.dataset.scene=scene.getAttribute('data-scene')||'';
    scene.querySelectorAll('[data-beat]').forEach(function(el,i){
      el.classList.remove('is-in');
      var delay=REDUCED?0:(Number(el.dataset.beatDelay)||i*95);
      requestAnimationFrame(function(){setTimeout(function(){el.classList.add('is-in')},delay)});
    });
    if(scene.matches('[data-scene="S6"]')) pulseScore(scene);
    if(scene.matches('[data-scene="S9"]')) revealSystem(scene);
  }

  function pulseScore(scene){
    var nodes=scene.querySelectorAll('.v4-score-node');
    nodes.forEach(function(n,i){n.style.animationDelay=(REDUCED?0:i*160)+'ms'});
  }
  function revealSystem(scene){
    scene.querySelectorAll('.v4-system-node').forEach(function(n,i){
      n.style.opacity='0';n.style.transform='translateY(10px)';
      setTimeout(function(){n.style.transition='.5s cubic-bezier(.2,.78,.18,1)';n.style.opacity='1';n.style.transform='none'},REDUCED?0:i*150);
    });
  }

  var stage=document.querySelector('[data-x-stage]');
  if(stage){
    enterScene(activeScene());
    new MutationObserver(function(muts){
      var changed=muts.some(function(m){return m.attributeName==='class'});
      if(changed)enterScene(activeScene());
    }).observe(stage,{subtree:true,attributes:true,attributeFilter:['class']});
  }

  /* Visual reflection of selected Action across key scenes. Health-like choices remain memory-only in state.js. */
  function actionLabel(v){return v==='eat'?'กิน':v==='move'?'ขยับ':v==='sleep'?'นอน':'1 Action'}
  function syncAction(v){
    document.querySelectorAll('[data-selected-action]').forEach(function(el){el.textContent=actionLabel(v)});
    document.querySelectorAll('[data-selected-action-en]').forEach(function(el){el.textContent=v?String(v).toUpperCase():'ONE ACTION'});
  }
  document.addEventListener('click',function(e){
    var c=e.target.closest('[data-choice-group="adjust"]');
    if(c)syncAction(c.getAttribute('data-value'));
  });
  try{if(window.XState&&XState.memory&&XState.memory.adjust)syncAction(XState.memory.adjust)}catch(e){}

  /* Art debug: production is clean; append ?art=debug when matching generated assets. */
  try{if(new URL(location.href).searchParams.get('art')==='debug')body.classList.add('debug-art')}catch(e){}

  /* Pointer parallax is deliberately subtle. */
  if(!REDUCED){
    document.querySelectorAll('[data-parallax]').forEach(function(el){
      el.addEventListener('pointermove',function(e){
        var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
        el.style.transform='perspective(900px) rotateX('+(-y*2.2)+'deg) rotateY('+(x*2.4)+'deg) translateZ(0)';
      });
      el.addEventListener('pointerleave',function(){el.style.transform=''});
    });
  }

  /* Premium press feedback without additional libraries. */
  document.addEventListener('pointerdown',function(e){
    var b=e.target.closest('.x-btn,.x-choice,.x-path');if(!b)return;
    b.animate([{transform:'scale(1)'},{transform:'scale(.985)'},{transform:'scale(1)'}],{duration:220,easing:'ease-out'});
  });

  /* Care case panels can opt into animated content replacement. */
  window.XV4={
    flash:function(el){if(!el)return;el.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:360,easing:'cubic-bezier(.2,.78,.18,1)'})},
    actionLabel:actionLabel,
    enterScene:enterScene
  };
})();
