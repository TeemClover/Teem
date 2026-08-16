/* Xircle story v6.3 — cinematic, viewport-first interaction runtime.
   Core interaction is immediate: narration may animate, controls never wait. */
(function(){
  'use strict';

  function qs(s,c){return (c||document).querySelector(s)}
  function qsa(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}
  var stage=qs('[data-xp-stage]');
  if(!stage)return;

  var reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ART_REV='20260817-story-v6-3';
  var transitioning=false;
  var timeShift=null;
  var isRoutine=document.body.classList.contains('xp-routinex-story');
  var routinePersistent=qs('[data-routine-persistent]',stage);

  function safeTrack(name,props){try{window.XAnalytics&&window.XAnalytics.track(name,props||{})}catch(e){}}
  function safeState(fn){try{return window.XState?fn(window.XState):null}catch(e){return null}}
  function artUrl(src){if(src&&src.indexOf('/xircle/assets/v5/')===0)return src+(src.indexOf('?')>-1?'&':'?')+'v='+ART_REV;return src}
  function loadArt(){qsa('img[data-art-src]').forEach(function(img){var src=img.getAttribute('data-art-src');if(!src)return;var frame=img.closest('.xp-art'),fallback=img.nextElementSibling;img.hidden=true;img.onload=function(){img.hidden=false;if(frame)frame.classList.add('art-ready');if(fallback&&fallback.classList&&fallback.classList.contains('xp-fallback'))fallback.style.opacity='0'};img.onerror=function(){img.hidden=true;if(frame)frame.classList.remove('art-ready');if(fallback&&fallback.classList&&fallback.classList.contains('xp-fallback'))fallback.style.opacity=''};img.src=artUrl(src)})}
  function ensureTimeShift(){if(timeShift)return timeShift;timeShift=document.createElement('div');timeShift.className='xp-time-shift';timeShift.setAttribute('aria-hidden','true');document.body.appendChild(timeShift);return timeShift}
  function clearBeatAnimations(scope){if(!scope||!scope.getAnimations)return;try{scope.getAnimations({subtree:true}).forEach(function(a){a.cancel()})}catch(e){}}
  function isInteractiveBeat(el){return !!(el.matches('.xp-actions,.xp-choices,.xp-food-choices')||el.querySelector('button,a,input,select,textarea,[role="button"]'))}
  function revealBeats(scope){
    if(!scope)return;
    clearBeatAnimations(scope);
    scope.classList.remove('is-sequencing');
    var beats=qsa('[data-beat]',scope);
    var narrative=beats.filter(function(el){return !isInteractiveBeat(el)});
    beats.forEach(function(el){if(isInteractiveBeat(el)){el.style.opacity='';el.style.transform='';el.style.filter=''}});
    if(reduced||!Element.prototype.animate){narrative.forEach(function(el){el.style.opacity='';el.style.transform='';el.style.filter=''});return}
    var art=qs('.xp-art',scope);
    if(art){try{art.animate([{opacity:.18,transform:'translateY(12px) scale(.985)',filter:'blur(7px)'},{opacity:1,transform:'none',filter:'none'}],{duration:760,easing:'cubic-bezier(.2,.78,.18,1)',fill:'both'})}catch(e){}}
    narrative.forEach(function(el,i){var delay=170+i*175;try{el.animate([{opacity:0,transform:'translateY(13px)',filter:'blur(5px)'},{opacity:1,transform:'none',filter:'none'}],{duration:590,delay:delay,easing:'cubic-bezier(.2,.78,.18,1)',fill:'both'})}catch(e){}});
  }
  function animateReveal(el){if(!el||reduced||!Element.prototype.animate)return;try{el.animate([{opacity:0,transform:'translateY(8px)',filter:'blur(3px)'},{opacity:1,transform:'none',filter:'none'}],{duration:460,easing:'cubic-bezier(.2,.78,.18,1)'})}catch(e){}}
  function setReveal(el,title,body){if(!el)return;el.classList.remove('xp-hidden');el.innerHTML='<strong>'+title+'</strong>'+(body?'<p>'+body+'</p>':'');animateReveal(el)}
  function actionLabel(v){return v==='eat'?'กิน':v==='move'?'ขยับ':v==='sleep'?'นอน':'1 อย่าง'}
  function meter(scope,val,title,body){var m=qs('.xp-meter',scope);if(m)m.style.setProperty('--fill',Math.round(val*100)+'%');setReveal(qs('[data-reveal]',scope),title,body)}
  function applyChoice(btn){if(!btn)return;var g=btn.getAttribute('data-choice-group'),v=btn.getAttribute('data-value');if(!g)return;var scope=btn.closest('[data-scene]')||document;qsa('[data-choice-group="'+g+'"]',scope).forEach(function(b){b.setAttribute('aria-pressed',b===btn?'true':'false')});safeState(function(s){if(s.memory)s.memory[g]=v});var next=qs('[data-unlock-next]',scope);if(next)next.disabled=false;var r=qs('[data-reveal]',scope);if(g==='memoryGapChoice'){setReveal(r,'ความจำเป็นแค่จุดเริ่มต้น','เดี๋ยวเราค่อยเก็บสิ่งที่เกิดขึ้นทีละชิ้น')}else if(g==='sleep'){meter(scope,v==='full'?.88:v==='mid'?.62:.36,'รับรู้แล้ว','เก็บคืนเมื่อคืนไว้ก่อน — ยังไม่ต้องตัดสิน')}else if(g==='move'){meter(scope,v==='intentional'?.84:v==='walk'?.61:.31,'เก็บการขยับไว้แล้ว','หนึ่งวันยังไม่ใช่ Pattern แต่หลายวันจะเริ่มเล่าเรื่อง')}else if(g==='adjust'){setReveal(r,'หนึ่งอย่างพอ','วันนี้ไม่ต้องแก้ทุกอย่างพร้อมกัน');qsa('[data-selected-action]').forEach(function(el){el.textContent=actionLabel(v)});safeTrack('adjust_one_complete',{v:6,choice:v})}if(!reduced&&Element.prototype.animate){try{btn.animate([{transform:'scale(.985)'},{transform:'scale(1.018)'},{transform:'none'}],{duration:260,easing:'ease-out'})}catch(e){}}}

  function buildScore(scene){
    if(!scene)return;
    var mem=safeState(function(s){return s.memory})||{};
    var vals={eat:mem.eat==='balanced'?.82:mem.eat==='light'?.68:mem.eat==='heavy'?.46:.62,move:mem.move==='intentional'?.84:mem.move==='walk'?.61:.42,sleep:mem.sleep==='full'?.88:mem.sleep==='mid'?.62:.47};
    var score=Math.round((vals.eat+vals.move+vals.sleep)/3*100),outs=qsa('[data-score]',scene);
    function setRing(name,value,delay){var ring=qs('[data-habit-ring="'+name+'"]',scene);if(!ring)return;var r=Number(ring.getAttribute('r')||0),c=2*Math.PI*r;ring.style.strokeDasharray=c;ring.style.strokeDashoffset=c;var valueOut=qs('[data-habit-value="'+name+'"]',scene);if(valueOut)valueOut.textContent=Math.round(value*100)+'%';var finish=function(){ring.style.strokeDashoffset=c*(1-value)};if(reduced){finish();return}setTimeout(function(){requestAnimationFrame(finish)},delay)}
    setRing('eat',vals.eat,120);setRing('move',vals.move,390);setRing('sleep',vals.sleep,660);
    if(!outs.length)return;if(reduced||!window.requestAnimationFrame){outs.forEach(function(out){out.textContent=score});return}
    var started=performance.now()+520;(function frame(now){var p=Math.max(0,Math.min(1,(now-started)/760)),value=Math.round(score*(1-Math.pow(1-p,3)));outs.forEach(function(out){out.textContent=value});if(p<1)requestAnimationFrame(frame)})(performance.now());
  }

  function syncRoutineArt(scene){if(!routinePersistent||!scene)return;var map=qs('.xp-routine-map',routinePersistent),active=scene.getAttribute('data-routine-active');if(map&&active)map.setAttribute('data-active',active)}
  var scenes=qsa('[data-scene]',stage),current=qs('[data-scene].active',stage)||scenes[0],progress=qs('[data-xp-progress]');
  function syncSceneA11y(){scenes.forEach(function(s){s.setAttribute('aria-hidden',s===current?'false':'true')})}
  function enterScene(scene){if(!scene)return;current=scene;scene.classList.add('active');scene.classList.remove('leaving','is-reacting');var pct=Number(scene.getAttribute('data-progress')||0);if(progress)progress.style.width=pct+'%';syncSceneA11y();syncRoutineArt(scene);revealBeats(scene);if(scene.getAttribute('data-scene')==='S6')buildScore(scene);if(scene.getAttribute('data-scene')==='S10')safeState(function(s){s.completeJourney&&s.completeJourney()});safeState(function(s){s.setSession&&s.setSession('scene',scene.getAttribute('data-scene'))});safeTrack('xircle_scene_view',{scene:scene.getAttribute('data-scene'),v:6})}
  function confirmButton(btn){if(!btn)return;var reply=btn.getAttribute('data-reply');if(!reply)return;if(!btn.dataset.originalText)btn.dataset.originalText=btn.textContent;btn.classList.add('is-confirming');btn.textContent=reply}
  function sceneOut(scene,done){if(!scene){done();return}scene.classList.add('leaving');if(reduced||!Element.prototype.animate){done();return}try{var a=scene.animate([{opacity:1,transform:'none',filter:'none'},{opacity:0,transform:'translateY(-12px) scale(.992)',filter:'blur(7px)'}],{duration:390,easing:'ease',fill:'both'});a.onfinish=done;setTimeout(done,500)}catch(e){done()}}
  function runTimeShift(){var el=ensureTimeShift();el.classList.remove('is-running');void el.offsetWidth;el.classList.add('is-running');setTimeout(function(){el.classList.remove('is-running')},900)}
  function go(id,trigger){
    if(transitioning)return;
    var next=qs('[data-scene="'+id+'"]',stage);if(!next||next===current)return;
    if(isRoutine){
      var old=current;
      clearBeatAnimations(old);
      old.classList.remove('active','leaving','is-reacting');
      old.style.opacity='';old.style.transform='';old.style.filter='';
      enterScene(next);
      return;
    }
    transitioning=true;confirmButton(trigger);current.classList.add('is-reacting');var art=qs('.xp-art',current);if(art&&!reduced&&Element.prototype.animate){try{art.animate([{transform:'scale(1)'},{transform:'scale(1.012)'}],{duration:560,easing:'cubic-bezier(.2,.78,.18,1)',fill:'forwards'})}catch(e){}}if(trigger&&trigger.hasAttribute('data-time-shift'))runTimeShift();var hold=reduced?40:620;setTimeout(function(){var old=current,finished=false;sceneOut(old,function(){if(finished)return;finished=true;old.classList.remove('active','leaving','is-reacting');old.style.opacity='';old.style.transform='';old.style.filter='';if(trigger&&trigger.dataset.originalText){trigger.textContent=trigger.dataset.originalText;trigger.classList.remove('is-confirming')}enterScene(next);transitioning=false})},hold)
  }

  function initFood(){var foodScene=qs('[data-food-scene]',stage);if(!foodScene)return;var art=qs('[data-food-stage]',foodScene),choices=qsa('[data-food-value]',foodScene),shutter=qs('[data-food-shutter]',foodScene),next=qs('[data-food-next]',foodScene),result=qs('[data-food-result]',foodScene),selected=null,busy=false;function label(v){return v==='light'?'จานเบา':v==='heavy'?'จานหนัก':'จานสมดุล'}choices.forEach(function(btn){btn.addEventListener('click',function(e){e.stopPropagation();if(busy)return;selected=btn.getAttribute('data-food-value')||'balanced';choices.forEach(function(b){b.setAttribute('aria-pressed',b===btn?'true':'false')});safeState(function(s){if(s.memory)s.memory.eat=selected});if(art)art.setAttribute('data-food-state','ready');if(shutter){shutter.disabled=false;shutter.textContent='ถ่ายมื้อนี้ · '+label(selected);shutter.setAttribute('aria-label','ถ่ายมื้อนี้ '+label(selected))}})});function finish(){if(!busy)return;busy=false;if(art)art.setAttribute('data-food-state','captured');if(result){result.hidden=false;result.innerHTML='<strong>มื้อนี้ถูกเก็บไว้แล้ว</strong><p>เราเก็บสิ่งที่เกิดขึ้นเพื่อย้อนมาดู Pattern — ไม่ใช่ผลวิเคราะห์สารอาหาร</p>';animateReveal(result)}if(shutter)shutter.hidden=true;if(next){next.hidden=false;next.disabled=false}safeTrack('scene_eat_complete',{v:6,meal:selected||'balanced'})}if(shutter)shutter.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();if(!selected||busy)return;busy=true;shutter.disabled=true;shutter.textContent='กำลังบันทึก…';if(art)art.setAttribute('data-food-state','scanning');setTimeout(finish,reduced?160:980);setTimeout(function(){if(busy)finish()},1800)})}
  function initSimulator(){qsa('[data-sim-choice]',stage).forEach(function(btn){btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var scene=btn.closest('[data-sim-step]');if(!scene)return;var choices=qsa('[data-sim-choice]',scene),out=qs('[data-sim-output]',scene),next=qs('[data-sim-next]',scene),good=btn.getAttribute('data-good')==='1';choices.forEach(function(b){b.classList.remove('correct','wrong');b.setAttribute('aria-pressed',b===btn?'true':'false')});btn.classList.add(good?'correct':'wrong');if(out){var title=good?(btn.getAttribute('data-good-title')||'ใช่ — เริ่มจากตรงนี้'):(btn.getAttribute('data-bad-title')||'ยังเร็วไปนิด'),body=good?(btn.getAttribute('data-good-body')||''):(btn.getAttribute('data-bad-body')||'ลองอีกทางที่ฟังบริบทมากขึ้น');out.classList.remove('xp-hidden');out.innerHTML='<strong>'+title+'</strong>'+(body?'<p>'+body+'</p>':'');animateReveal(out)}if(next)next.disabled=!good;if(good&&btn.getAttribute('data-sim-choice')==='boundary')safeState(function(s){s.setLocal&&s.setLocal('xvisorSimCompleted',true)});safeTrack('xvisor_sim_choice',{v:6,step:btn.getAttribute('data-sim-choice')||'',good:good})})})}
  function initWhiteCat(){qsa('[data-whitecat-link]').forEach(function(a){var h=safeState(function(s){return s.getXtyHandoff&&s.getXtyHandoff()});if(h){a.href='/xircle/care/party/?mode=join';a.textContent='แมวขาว · เข้าตี้ '+h.partyCode}})}
  stage.addEventListener('click',function(e){var nav=e.target.closest('[data-next]');if(nav){e.preventDefault();e.stopPropagation();if(nav.disabled||nav.hidden)return;go(nav.getAttribute('data-next'),nav);return}var c=e.target.closest('[data-choice-group]');if(c){e.preventDefault();applyChoice(c)}},true);
  document.addEventListener('click',function(e){var a=e.target.closest('a[data-route-reply]');if(!a||e.defaultPrevented)return;var href=a.getAttribute('href');if(!href)return;e.preventDefault();confirmButton(a);current&&current.classList.add('is-reacting');setTimeout(function(){location.href=href},reduced?40:650)});
  document.addEventListener('pointerdown',function(e){var b=e.target.closest('.xp-btn,.xp-choice,.xp-food-choice');if(!b||reduced||!Element.prototype.animate)return;try{b.animate([{transform:'scale(1)'},{transform:'scale(.982)'},{transform:'scale(1)'}],{duration:180,easing:'ease-out'})}catch(err){}});
  try{loadArt();initFood();initSimulator();initWhiteCat();if(!current.classList.contains('active'))current.classList.add('active');enterScene(current);safeState(function(s){s.touchVisit&&s.touchVisit()});safeTrack('xircle_view',{v:6,path:location.pathname});window.XV6Go=go;window.XV6_READY=true}catch(err){window.XV6_READY=false;try{console.error('[Xircle story v6] boot failed',err)}catch(e){}}
})();