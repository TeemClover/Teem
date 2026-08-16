/* Xircle v6 Answer Engine / Reference Library */
(function(){
  'use strict';
  var root=document.querySelector('[data-library-root]');
  if(!root)return;
  var mode=root.getAttribute('data-library-mode')||'answer';
  var input=root.querySelector('[data-library-search]');
  var filters=[].slice.call(root.querySelectorAll('[data-library-filter]'));
  var results=root.querySelector('[data-library-results]');
  var count=root.querySelector('[data-library-count]');
  var current='all',items=[];
  var params=new URL(location.href).searchParams;
  var initialQ=params.get('q')||'';
  var initialCat=(params.get('category')||'all').toLowerCase();
  var fallback=[
    {id:'habit-score',category:'see',status:'CANON',question:'Habit Score คืออะไร?',title:'Habit Score',summary:'Eat + Move + Sleep เพื่อสะท้อนเมื่อวาน',href:'/xircle/doc/app/habit-score/',experienceHref:'/xircle/',experienceLabel:'ลองหนึ่งวัน',featured:true},
    {id:'routinex',category:'act',status:'CANON',question:'RoutineX คืออะไร?',title:'RoutineX',summary:'Act & Repeat layer',href:'/xircle/doc/routinex/',experienceHref:'/xircle/routinex/',experienceLabel:'ดู Act & Repeat',featured:true},
    {id:'xvisor-role',category:'care',status:'CANON',question:'งาน X-VISOR คืออะไร?',title:'X-VISOR Role',summary:'Context Interpreter + Human Care',href:'/xircle/doc/xvisor/role/',experienceHref:'/xircle/opportunity/',experienceLabel:'ลอง Simulator',featured:true},
    {id:'whitecat',category:'care',status:'CONCEPT',question:'แมวขาวช่วยอะไร?',title:'White Cat · XTY',summary:'XTY Partner Mode ของ myClover',href:'/xircle/care/party/?mode=create',experienceHref:'/xircle/care/party/?mode=create',experienceLabel:'ดูตี้แมวขาว',featured:true},
    {id:'ecosystem',category:'system',status:'CANON',question:'CloverX ต่อกันยังไง?',title:'CloverX Ecosystem',summary:'Measure → Understand → Act → Support → Improve → Repeat',href:'/xircle/doc/ecosystem/',experienceHref:'/xircle/',experienceLabel:'ดู Connected Loop',featured:true},
    {id:'source-control',category:'source',status:'CANON',question:'ถ้าข้อมูลขัดกันควรเชื่ออะไร?',title:'Source Control',summary:'Source · Glossary · Changelog · Unresolved',href:'/xircle/doc/source/',experienceHref:'/xircle/doc/source/sources/',experienceLabel:'เปิด Source List',featured:true}
  ];
  function norm(v){return String(v||'').toLowerCase().normalize('NFKC').replace(/[™®]/g,'').replace(/[-_/·→×]+/g,' ').replace(/\s+/g,' ').trim()}
  function searchable(x){return norm([x.question,x.title,x.summary,(x.keywords||[]).join(' '),x.category,x.status].join(' '))}
  function statusClass(s){return norm(s).replace(/\s+/g,'-')}
  function catLabel(c){return c==='see'?'SEE · XIRCLE':c==='act'?'ACT · ROUTINEX':c==='care'?'CARE · HUMAN':c==='system'?'SYSTEM':c==='source'?'SOURCE':'REFERENCE'}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function filtered(){
    var q=norm(input&&input.value);
    return items.filter(function(x){
      if(current!=='all'&&x.category!==current)return false;
      if(mode==='answer'&&!q&&current==='all'&&!x.featured)return false;
      if(mode==='answer'&&!q&&x.deep)return false;
      return !q||searchable(x).indexOf(q)>-1||q.split(' ').every(function(t){return searchable(x).indexOf(t)>-1});
    });
  }
  function card(x){
    var tryLink=x.experienceHref?'<a class="lib-mini-btn try" href="'+esc(x.experienceHref)+'">'+esc(x.experienceLabel||'ลองของจริง')+' →</a>':'';
    var readLabel=(x.href===x.experienceHref)?'เปิด':'อ่านลึก';
    return '<article class="lib-answer" data-category="'+esc(x.category)+'"><div class="lib-answer-top"><span class="lib-cat">'+esc(catLabel(x.category))+'</span><span class="lib-status '+statusClass(x.status)+'">'+esc(x.status)+'</span></div><h3>'+esc(x.question||x.title)+'</h3><p>'+esc(x.summary)+'</p><div class="lib-answer-actions"><a class="lib-mini-btn" href="'+esc(x.href)+'">'+readLabel+' →</a>'+tryLink+'</div></article>';
  }
  function render(){
    if(!results)return;
    var list=filtered();
    results.innerHTML=list.length?list.map(card).join(''):'<div class="lib-empty"><strong>ยังไม่เจอคำถามนี้</strong><span>ลองใช้คำสั้นลง เช่น “Habit Score”, “Privacy”, “28 วัน”, “แมวขาว” หรือเปิด Source Control</span><div class="lib-answer-actions" style="justify-content:center"><a class="lib-mini-btn" href="/xircle/doc/source/">Source Control →</a></div></div>';
    if(count)count.textContent=list.length+' ANSWERS';
    try{
      var u=new URL(location.href);var q=input?input.value.trim():'';
      if(q)u.searchParams.set('q',q);else u.searchParams.delete('q');
      if(current!=='all')u.searchParams.set('category',current);else u.searchParams.delete('category');
      history.replaceState(null,'',u.pathname+(u.search?'?'+u.searchParams.toString():'')+u.hash);
    }catch(e){}
  }
  function setCat(cat){current=cat||'all';filters.forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-library-filter')===current?'true':'false')});render()}
  filters.forEach(function(b){b.addEventListener('click',function(){setCat(b.getAttribute('data-library-filter'))})});
  if(input){
    input.value=initialQ;
    input.addEventListener('input',render);
    input.addEventListener('keydown',function(e){if(e.key==='Escape'){input.value='';render();input.blur()}});
  }
  document.addEventListener('keydown',function(e){if(e.key==='/'&&!/input|textarea|select/i.test((document.activeElement||{}).tagName||'')){e.preventDefault();input&&input.focus()}});
  fetch('/xircle/data/library-v6.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('library data');return r.json()}).then(function(data){items=(data&&data.items)||fallback;setCat(['see','act','care','system','source'].indexOf(initialCat)>-1?initialCat:'all')}).catch(function(){items=fallback;setCat(['see','act','care','system','source'].indexOf(initialCat)>-1?initialCat:'all')});
})();
