/* XIRCLE × myClover XTY — unified v5 interactions */
(function(){
  'use strict';
  var REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function qs(s,c){return (c||document).querySelector(s)}
  function qsa(s,c){return [].slice.call((c||document).querySelectorAll(s))}
  function beat(scope){qsa('[data-beat]',scope).forEach(function(el,i){el.classList.remove('in');setTimeout(function(){el.classList.add('in')},REDUCED?0:i*95)})}
  function loadArt(){qsa('img[data-art-src]').forEach(function(img){var src=img.getAttribute('data-art-src');if(!src)return;img.hidden=true;img.onload=function(){img.hidden=false};img.onerror=function(){img.hidden=true};img.src=src})}
  function track(name,props){try{window.XAnalytics&&window.XAnalytics.track(name,props||{})}catch(e){}}
  function setReveal(el,t,b){if(el){el.classList.remove('xp-hidden');el.innerHTML='<strong>'+t+'</strong><p>'+b+'</p>'}}
  function label(v){return v==='eat'?'กิน':v==='move'?'ขยับ':v==='sleep'?'นอน':'1 Action'}
  function applyChoice(btn){
    var g=btn.getAttribute('data-choice-group'),v=btn.getAttribute('data-value'),scope=btn.closest('[data-scene]')||btn.closest('.xp-section')||document;
    qsa('[data-choice-group="'+g+'"]',scope).forEach(function(b){b.setAttribute('aria-pressed',b===btn?'true':'false')});
    try{if(window.XState&&XState.memory)XState.memory[g]=v}catch(e){}
    var r=qs('[data-reveal]',scope),next=qs('[data-unlock-next]',scope);if(next)next.disabled=false;
    if(g==='memoryGapChoice')setReveal(r,'แน่ใจ — หรือแค่จำได้?','Xircle เริ่มจากการทำให้สิ่งที่เกิดขึ้น มองเห็นย้อนหลังได้');
    if(g==='sleep')meter(scope,v==='full'?.88:v==='mid'?.62:.36,'เก็บไว้ก่อน ยังไม่ต้องตัดสิน','เรากำลังต่อภาพของเมื่อวานทีละชิ้น');
    if(g==='eat')meter(scope,v==='balanced'?.82:v==='light'?.68:.46,'มื้อนี้ไม่หายไปจากความจำแล้ว','การบันทึกช่วยให้ย้อนกลับมาดู Pattern ได้');
    if(g==='move')meter(scope,v==='intentional'?.84:v==='walk'?.61:.31,'สิ่งเล็ก ๆ กำลังกลายเป็น Pattern','หนึ่งวันยังไม่ใช่คำตัดสิน แต่หลายวันทำให้เห็นทิศทาง');
    if(g==='adjust'){setReveal(r,'หนึ่งอย่างพอ','ข้อมูลมีค่าตอนที่มันช่วยให้เรารู้ว่าควรทำอะไรต่อ');qsa('[data-selected-action]').forEach(function(el){el.textContent=label(v)});track('adjust_one_complete')}
  }
  function meter(scope,val,t,b){var m=qs('.xp-meter',scope);if(m)m.style.setProperty('--fill',Math.round(val*100)+'%');setReveal(qs('[data-reveal]',scope),t,b)}
  function buildScore(scene){var mem=(window.XState&&XState.memory)||{},vals={eat:mem.eat==='balanced'?.82:mem.eat==='light'?.68:.52,move:mem.move==='intentional'?.84:mem.move==='walk'?.61:.42,sleep:mem.sleep==='full'?.88:mem.sleep==='mid'?.62:.47};var score=Math.round((vals.eat+vals.move+vals.sleep)/3*100),out=qs('[data-score]',scene);if(out){if(REDUCED){out.textContent=score}else{var s=performance.now();(function f(now){var p=Math.min(1,(now-s)/720);out.textContent=Math.round(score*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(s)}}}
  loadArt();
  var stage=qs('[data-xp-stage]');
  if(stage){
    var scenes=qsa('[data-scene]',stage),current=qs('[data-scene].active',stage)||scenes[0],bar=qs('[data-xp-progress]');
    if(current&&!current.classList.contains('active'))current.classList.add('active');beat(current);
    function go(id){var next=qs('[data-scene="'+id+'"]',stage);if(!next||next===current)return;var prev=current;current=next;prev.classList.remove('active');if(!REDUCED){prev.classList.add('leaving');setTimeout(function(){prev.classList.remove('leaving')},360)}next.classList.add('active');var p=Number(next.getAttribute('data-progress')||0);if(bar)bar.style.width=p+'%';window.scrollTo(0,0);beat(next);try{window.XState&&XState.setSession('scene',id)}catch(e){};track('xircle_scene_view',{scene:id,v:5});if(id==='S6')buildScore(next);if(id==='S10'){try{window.XState&&XState.completeJourney()}catch(e){}}}
    stage.addEventListener('click',function(e){var n=e.target.closest('[data-next]');if(n){go(n.getAttribute('data-next'));return}var c=e.target.closest('[data-choice-group]');if(c)applyChoice(c)});
  }
  document.addEventListener('click',function(e){var c=e.target.closest('[data-choice-group]');if(c&&!c.closest('[data-xp-stage]'))applyChoice(c)});
  qsa('[data-sim-choice]').forEach(function(btn){btn.addEventListener('click',function(){var box=btn.closest('[data-sim-step]'),key=btn.getAttribute('data-sim-choice');qsa('[data-sim-choice]',box).forEach(function(b){b.classList.remove('correct','wrong')});var out=qs('[data-sim-output]',box),next=qs('[data-sim-next]',box),good=btn.getAttribute('data-good')==='1';btn.classList.add(good?'correct':'wrong');if(out){out.className='xp-consequence '+(good?'good':'bad');out.hidden=false;out.innerHTML=good?'<strong>'+btn.getAttribute('data-good-title')+'</strong><p>'+btn.getAttribute('data-good-body')+'</p>':'<strong>'+btn.getAttribute('data-bad-title')+'</strong><p>'+btn.getAttribute('data-bad-body')+'</p>'}if(next)next.disabled=!good;if(good&&key==='boundary'){try{window.XState&&XState.setLocal('xvisorSimCompleted',true)}catch(e){}}})});
  qsa('[data-whitecat-link]').forEach(function(a){try{var h=window.XState&&XState.getXtyHandoff();if(h){a.href='/xircle/care/party/?mode=join';a.textContent='แมวขาว · เข้าตี้ '+h.partyCode}}catch(e){}});
  qsa('[data-invite-room]').forEach(function(el){try{var h=window.XState&&XState.getXtyHandoff();if(h){el.hidden=false;el.querySelector('[data-room-code]').textContent=h.partyCode;var join=el.querySelector('[data-room-join]');if(join)join.href='/xty/join/?c='+encodeURIComponent(h.partyCode)}}catch(e){}});
  try{window.XState&&XState.touchVisit()}catch(e){};track('xircle_view',{v:5,path:location.pathname});
})();