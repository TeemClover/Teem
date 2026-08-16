/* Xircle v5 — food camera capture interaction. Fail-safe: never blocks the next scene permanently. */
(function(){
  'use strict';
  var root=document.querySelector('[data-food-camera]');
  if(!root)return;
  var choices=[].slice.call(document.querySelectorAll('[data-food-value]'));
  var shutter=document.querySelector('[data-food-shutter]');
  var next=document.querySelector('[data-food-next]');
  var result=root.querySelector('[data-food-result]');
  var status=root.querySelector('[data-food-status]');
  var selected=null,busy=false;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function label(v){return v==='light'?'จานเบา':v==='heavy'?'จานหนัก':'จานสมดุล'}
  function safeTrack(name){try{window.XAnalytics&&window.XAnalytics.track(name,{v:5})}catch(e){}}
  function choose(btn){
    selected=btn.getAttribute('data-food-value')||'balanced';
    choices.forEach(function(b){b.setAttribute('aria-pressed',b===btn?'true':'false')});
    try{if(window.XState&&XState.memory)XState.memory.eat=selected}catch(e){}
    root.setAttribute('data-meal',selected);root.setAttribute('data-state','ready');
    if(shutter){shutter.disabled=false;shutter.setAttribute('aria-label','ถ่ายมื้อนี้: '+label(selected))}
    if(status)status.innerHTML='<i></i>READY · '+label(selected);
    if(result)result.innerHTML='<span class="xp-label">READY TO CAPTURE</span><strong>'+label(selected)+'</strong><p>กดชัตเตอร์เพื่อเก็บมื้อนี้เป็นส่วนหนึ่งของเมื่อวาน</p>';
  }
  function finish(){
    busy=false;root.setAttribute('data-state','captured');
    if(status)status.innerHTML='<i></i>MEAL CAPTURED';
    if(result)result.innerHTML='<span class="xp-label">MEAL · CAPTURED</span><strong>มื้อนี้ไม่หายไปจากความจำแล้ว</strong><p>DEMO · ตัวอย่างประสบการณ์การบันทึกอาหาร ไม่ใช่ผลวิเคราะห์สารอาหารจริง</p>';
    if(next)next.disabled=false;
    safeTrack('scene_eat_complete');
  }
  function capture(){
    if(!selected||busy)return;busy=true;root.setAttribute('data-state','scanning');if(shutter)shutter.disabled=true;
    if(status)status.innerHTML='<i></i>CAPTURING…';
    setTimeout(finish,reduced?180:1320);
    /* absolute fail-safe: if a future animation change throws, user still gets out */
    setTimeout(function(){if(busy)finish()},2200);
  }
  choices.forEach(function(btn){btn.addEventListener('click',function(){if(!busy)choose(btn)})});
  if(shutter)shutter.addEventListener('click',capture);
})();
