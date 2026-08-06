/* AI ใส่ซอส · Online Course Lite */
(function(){
  'use strict';
  var body=document.body, slug=body&&body.getAttribute('data-lesson');
  if(!slug) return;

  function storeKey(){ return 'mc:ai-sauce-lite:'+slug; }
  function read(){ try{return JSON.parse(localStorage.getItem(storeKey())||'{}')}catch(e){return{}} }
  function save(v){ try{localStorage.setItem(storeKey(),JSON.stringify(v))}catch(e){} }

  document.querySelectorAll('[data-copy]').forEach(function(button){
    button.addEventListener('click',function(){
      var id=button.getAttribute('data-copy'), target=document.getElementById(id);
      if(!target) return;
      var text=target.innerText.trim();
      navigator.clipboard.writeText(text).then(function(){
        var old=button.textContent;button.textContent='✓ คัดลอกแล้ว';
        setTimeout(function(){button.textContent=old},1200);
      }).catch(function(){ button.textContent='เลือกข้อความแล้วคัดลอกเอง'; });
    });
  });

  var checks=[].slice.call(document.querySelectorAll('[data-quest-check]'));
  var finish=document.querySelector('[data-finish]'), reward=document.querySelector('[data-reward]');
  var state=read(), done=Array.isArray(state.checks)?state.checks:[];
  checks.forEach(function(box,i){box.checked=done.indexOf(i)>=0;box.addEventListener('change',update)});

  function update(){
    var checked=[];checks.forEach(function(box,i){if(box.checked)checked.push(i)});
    state.checks=checked;save(state);
    if(finish) finish.disabled=checks.length>0&&checked.length<checks.length;
  }
  update();

  function markLesson(){
    try{var t=window.MC_QUEST&&window.MC_QUEST.track('learn');if(t)t.mark(slug)}catch(e){}
    try{window.MC_ACT&&window.MC_ACT('lesson-'+slug+'-quest-complete')}catch(e){}
  }

  function openBossTransition(){
    var complete=false;
    try{var t=window.MC_QUEST&&window.MC_QUEST.track('learn');complete=t?t.complete():localStorage.getItem('mc_learn_done')==='1'}catch(e){}
    var door=document.getElementById('bossDoor'), lock=document.getElementById('bossLock');
    if(door) door.hidden=!complete;if(lock) lock.hidden=complete;
    var takeover=document.getElementById('takeover');if(takeover) takeover.hidden=false;
  }

  if(finish){
    finish.addEventListener('click',function(){
      markLesson();state.finished=true;save(state);
      finish.textContent='✓ Quest Complete';finish.disabled=true;
      if(reward) reward.classList.add('on');
      if(finish.hasAttribute('data-boss-trigger')) openBossTransition();
    });
    if(state.finished){finish.textContent='✓ Quest Complete';finish.disabled=true;if(reward)reward.classList.add('on')}
  }

  var publicConfirm=document.querySelector('[data-public-confirm]');
  var publicSteps=document.querySelector('[data-public-steps]');
  if(publicConfirm&&publicSteps){
    publicSteps.hidden=!publicConfirm.checked;
    publicConfirm.addEventListener('change',function(){
      publicSteps.hidden=!publicConfirm.checked;
      try{window.MC_ACT&&window.MC_ACT(publicConfirm.checked?'lesson6-hardmode-confirmed':'lesson6-hardmode-closed')}catch(e){}
    });
  }

  document.querySelectorAll('[data-download-html]').forEach(function(button){
    button.addEventListener('click',function(){
      var id=button.getAttribute('data-download-html'), template=document.getElementById(id);if(!template)return;
      var blob=new Blob([template.textContent.trim()],{type:'text/html;charset=utf-8'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='index.html';a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
      try{window.MC_ACT&&window.MC_ACT('lesson6-download-index')}catch(e){}
    });
  });
})();
