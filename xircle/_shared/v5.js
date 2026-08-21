/* XIRCLE × White Cat Care — unified v5 interactions
   Reliability rule: animation is enhancement only. Core navigation and copy must survive
   missing state/analytics/assets and partial deployments. */
(function(){
  'use strict';

  function qs(s,c){return (c||document).querySelector(s)}
  function qsa(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}
  var reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ART_REV='20260817-02';

  function safeTrack(name,props){try{window.XAnalytics&&window.XAnalytics.track(name,props||{})}catch(e){}}
  function safeState(fn){try{return window.XState?fn(window.XState):null}catch(e){return null}}
  function artUrl(src){
    if(src&&src.indexOf('/xircle/assets/v5/')===0)return src+(src.indexOf('?')>-1?'&':'?')+'v='+ART_REV;
    return src;
  }
  function loadArt(){
    qsa('img[data-art-src]').forEach(function(img){
      var src=img.getAttribute('data-art-src');if(!src)return;
      var frame=img.closest('.xp-art'),fallback=img.nextElementSibling;
      img.hidden=true;
      img.onload=function(){
        img.hidden=false;
        if(frame)frame.classList.add('art-ready');
        if(fallback&&fallback.classList&&fallback.classList.contains('xp-fallback'))fallback.style.opacity='0';
      };
      img.onerror=function(){
        img.hidden=true;
        if(frame)frame.classList.remove('art-ready');
        if(fallback&&fallback.classList&&fallback.classList.contains('xp-fallback'))fallback.style.opacity='';
      };
      img.src=artUrl(src);
    });
  }
  function revealBeats(scope){
    if(reduced||!scope||!Element.prototype.animate)return;
    qsa('[data-beat]',scope).forEach(function(el,i){
      try{el.animate([{opacity:.35,transform:'translateY(9px)',filter:'blur(2px)'},{opacity:1,transform:'none',filter:'none'}],{duration:420,delay:i*70,easing:'cubic-bezier(.2,.78,.18,1)',fill:'both'})}catch(e){}
    });
  }
  function setReveal(el,title,body){
    if(!el)return;
    el.classList.remove('xp-hidden');
    el.innerHTML='<strong>'+title+'</strong><p>'+body+'</p>';
  }
  function actionLabel(v){return v==='eat'?'กิน':v==='move'?'ขยับ':v==='sleep'?'นอน':'1 Action'}
  function meter(scope,val,title,body){
    var m=qs('.xp-meter',scope);if(m)m.style.setProperty('--fill',Math.round(val*100)+'%');
    setReveal(qs('[data-reveal]',scope),title,body);
  }
  function applyChoice(btn){
    if(!btn)return;
    var g=btn.getAttribute('data-choice-group'),v=btn.getAttribute('data-value');
    if(!g)return;
    var scope=btn.closest('[data-scene]')||btn.closest('.xp-section')||document;
    qsa('[data-choice-group="'+g+'"]',scope).forEach(function(b){b.setAttribute('aria-pressed',b===btn?'true':'false')});
    safeState(function(s){if(s.memory)s.memory[g]=v});
    var next=qs('[data-unlock-next]',scope);if(next)next.disabled=false;
    var r=qs('[data-reveal]',scope);
    if(g==='memoryGapChoice')setReveal(r,'แน่ใจ — หรือแค่จำได้?','Xircle เริ่มจากการทำให้สิ่งที่เกิดขึ้น มองเห็นย้อนหลังได้');
    else if(g==='sleep')meter(scope,v==='full'?.88:v==='mid'?.62:.36,'เก็บไว้ก่อน ยังไม่ต้องตัดสิน','เรากำลังต่อภาพของเมื่อวานทีละชิ้น');
    else if(g==='eat')meter(scope,v==='balanced'?.82:v==='light'?.68:.46,'มื้อนี้ไม่หายไปจากความจำแล้ว','การบันทึกช่วยให้ย้อนกลับมาดู Pattern ได้');
    else if(g==='move')meter(scope,v==='intentional'?.84:v==='walk'?.61:.31,'สิ่งเล็ก ๆ กำลังกลายเป็น Pattern','หนึ่งวันยังไม่ใช่คำตัดสิน แต่หลายวันทำให้เห็นทิศทาง');
    else if(g==='adjust'){
      setReveal(r,'หนึ่งอย่างพอ','ข้อมูลมีค่าตอนที่มันช่วยให้เรารู้ว่าควรทำอะไรต่อ');
      qsa('[data-selected-action]').forEach(function(el){el.textContent=actionLabel(v)});
      safeTrack('adjust_one_complete',{v:5});
    }
  }
  function buildScore(scene){
    if(!scene)return;
    var mem=safeState(function(s){return s.memory})||{};
    var vals={
      eat:mem.eat==='balanced'?.82:mem.eat==='light'?.68:mem.eat==='heavy'?.46:.62,
      move:mem.move==='intentional'?.84:mem.move==='walk'?.61:.42,
      sleep:mem.sleep==='full'?.88:mem.sleep==='mid'?.62:.47
    };
    var score=Math.round((vals.eat+vals.move+vals.sleep)/3*100),out=qs('[data-score]',scene);
    if(!out)return;
    if(reduced||!window.requestAnimationFrame){out.textContent=score;return}
    var started=performance.now();
    (function frame(now){var p=Math.min(1,(now-started)/650);out.textContent=Math.round(score*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(frame)})(started);
  }

  function initStage(){
    var stage=qs('[data-xp-stage]');if(!stage)return;
    var scenes=qsa('[data-scene]',stage);if(!scenes.length)return;
    var current=qs('[data-scene].active',stage)||scenes[0],bar=qs('[data-xp-progress]');
    if(!current.classList.contains('active'))current.classList.add('active');
    revealBeats(current);

    function go(id){
      var next=qs('[data-scene="'+id+'"]',stage);if(!next||next===current)return;
      current.classList.remove('active','leaving');
      next.classList.add('active');current=next;
      var pct=Number(next.getAttribute('data-progress')||0);if(bar)bar.style.width=pct+'%';
      try{window.scrollTo({top:0,behavior:'auto'})}catch(e){window.scrollTo(0,0)}
      revealBeats(next);
      safeState(function(s){s.setSession&&s.setSession('scene',id)});
      safeTrack('xircle_scene_view',{scene:id,v:5});
      if(id==='S6')buildScore(next);
      if(id==='S10')safeState(function(s){s.completeJourney&&s.completeJourney()});
    }

    stage.addEventListener('click',function(e){
      var nav=e.target.closest('[data-next]');
      if(nav){if(nav.disabled)return;go(nav.getAttribute('data-next'));return}
      var c=e.target.closest('[data-choice-group]');if(c)applyChoice(c);
    });
    window.XV5Go=go;
  }

  function initSimulator(){
    qsa('[data-sim-choice]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var box=btn.closest('[data-sim-step]');if(!box)return;
        qsa('[data-sim-choice]',box).forEach(function(b){b.classList.remove('correct','wrong')});
        var out=qs('[data-sim-output]',box),next=qs('[data-sim-next]',box),good=btn.getAttribute('data-good')==='1';
        btn.classList.add(good?'correct':'wrong');
        if(out){
          out.className='xp-consequence '+(good?'good':'bad');out.hidden=false;
          if(good){
            out.innerHTML='<strong>'+String(btn.getAttribute('data-good-title')||'ดี')+'</strong><p>'+String(btn.getAttribute('data-good-body')||'')+'</p>';
          }else{
            out.innerHTML='<strong>'+String(btn.getAttribute('data-bad-title')||'ลองอีกทาง')+'</strong><p>'+String(btn.getAttribute('data-bad-body')||'')+'</p>';
          }
        }
        if(next)next.disabled=!good;
        if(good&&btn.getAttribute('data-sim-choice')==='boundary')safeState(function(s){s.setLocal&&s.setLocal('xvisorSimCompleted',true)});
      });
    });
  }

  function initOutsideChoices(){
    document.addEventListener('click',function(e){
      var c=e.target.closest('[data-choice-group]');
      if(c&&!c.closest('[data-xp-stage]'))applyChoice(c);
    });
  }
  function initWhiteCat(){
    var path=String(location.pathname||'').replace(/\/+$/,'')||'/';
    var hubMode=path==='/xircle/explore';

    if(hubMode){
      try{import('/assets/account.js?v=20260818-save5').catch(function(){})}catch(e){}
      qsa('[data-whitecat-link]').forEach(function(a){
        if(a.tagName==='A')a.href='/xircle/circle/';
        a.removeAttribute('data-whitecat-link');
        a.setAttribute('data-whitecat-circle','1');
        if(a.classList.contains('xp-btn'))a.textContent='ดูวิธีทำด้วยกัน 28 วัน →';
        else if(!a.querySelector('*'))a.textContent='ดูวิธีทำด้วยกัน 28 วัน →';
      });
    }else{
      qsa('[data-whitecat-link]').forEach(function(a){
        var h=safeState(function(s){return s.getXtyHandoff&&s.getXtyHandoff()});
        if(h){a.href='/xircle/care/party/?mode=join';a.textContent='เข้าสมุดแมวขาว '+h.partyCode}
      });
    }

    qsa('[data-invite-room]').forEach(function(el){
      var h=safeState(function(s){return s.getXtyHandoff&&s.getXtyHandoff()});
      if(!h)return;el.hidden=false;
      var code=qs('[data-room-code]',el);if(code)code.textContent=h.partyCode;
      var join=qs('[data-room-join]',el);if(join)join.href='https://teambook.me/join/?c='+encodeURIComponent(h.partyCode);
    });
  }

  try{
    loadArt();
    initStage();
    initSimulator();
    initOutsideChoices();
    initWhiteCat();
    safeState(function(s){s.touchVisit&&s.touchVisit()});
    safeTrack('xircle_view',{v:5,path:location.pathname});
    window.XV5_READY=true;
  }catch(err){
    window.XV5_READY=false;
    try{console.error('[Xircle v5] interaction boot failed',err)}catch(e){}
  }
})();