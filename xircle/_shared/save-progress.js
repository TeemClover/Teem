/* Xircle five-point save control — White Cat safe-room HUD.
   Visual behavior intentionally follows the compact fixed HUD language used on /card.
   Progress is read from the existing xircle.local.v1 state; this file does not invent a second save system. */
(function(){
  'use strict';

  if(document.querySelector('[data-xircle-save-hud]')) return;

  var KEY='xircle.local.v1';
  var points=[
    {label:'Xircle',detail:'เห็นสิ่งที่เกิดขึ้น',href:'/xircle/',done:function(s){return !!(s.firstDayCompletedV10&&s.journeyCompleted);}},
    {label:'Human Care',detail:'เข้าใจคนก่อนช่วย',href:'/xircle/care/',done:function(s){return !!s.careIntroSeen;}},
    {label:'X-VISOR',detail:'คิดกับชีวิตจริง',href:'/xircle/opportunity/',done:function(s){return !!s.xvisorSimCompleted;}},
    {label:'RoutineX',detail:'วางให้ทำซ้ำ',href:'/xircle/routinex/',done:function(s){return !!s.routineCompleted;}},
    {label:'แมวขาว · XTY',detail:'ทำต่อด้วยกัน',href:'/xircle/explore/',done:function(s){return !!s.whiteCatIntroSeen;}}
  ];

  function state(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}
  }
  function escapeHtml(v){return String(v||'').replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function doneCount(s){return points.reduce(function(n,p){return n+(p.done(s)?1:0);},0);}

  var style=document.createElement('style');
  style.textContent='\
.xsave-hud{position:fixed;left:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:160;display:flex;align-items:center;gap:10px;min-height:52px;padding:7px 16px 7px 7px;border:1px solid rgba(245,240,230,.18);border-radius:999px;background:#f5f0e6;color:#10211c;box-shadow:0 18px 44px rgba(0,0,0,.4);font:800 13px/1.25 "Bai Jamjuree","Anuphan",sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s,border-color .18s}\
.xsave-hud:hover{transform:translateY(-2px);box-shadow:0 23px 52px rgba(0,0,0,.46)}\
.xsave-hud:active{transform:scale(.98)}\
.xsave-ico{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:50%;background:#e6c483;color:#10211c;font-size:17px;box-shadow:0 0 0 0 rgba(230,196,131,.46);animation:xsaveRing 2.8s ease-out infinite}\
@keyframes xsaveRing{0%{box-shadow:0 0 0 0 rgba(230,196,131,.5)}70%{box-shadow:0 0 0 11px rgba(230,196,131,0)}100%{box-shadow:0 0 0 0 rgba(230,196,131,0)}}\
.xsave-copy{display:grid;gap:2px;text-align:left}.xsave-copy small{display:block;color:#637069;font:600 10.5px/1.2 "Anuphan",sans-serif}.xsave-dots{display:flex;gap:4px;margin-left:2px}.xsave-dots i{width:6px;height:6px;border-radius:50%;background:rgba(16,33,28,.16);border:1px solid rgba(16,33,28,.1)}.xsave-dots i.on{background:#1d7650;border-color:#1d7650}\
.xsave-panel{position:fixed;left:14px;bottom:82px;z-index:159;width:min(370px,calc(100vw - 28px));padding:18px;border:1px solid rgba(230,196,131,.28);border-radius:24px;background:rgba(7,22,18,.97);color:#f5f0e6;box-shadow:0 28px 80px rgba(0,0,0,.58);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transform-origin:left bottom}\
.xsave-panel[hidden]{display:none!important}.xsave-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:13px}.xsave-head small{display:block;color:#e6c483;font:900 10px/1.2 "Bai Jamjuree",sans-serif;letter-spacing:.08em}.xsave-head strong{display:block;margin-top:5px;font:800 20px/1.25 "Bai Jamjuree",sans-serif}.xsave-close{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(245,240,230,.13);border-radius:50%;background:transparent;color:#d7ded9;font-size:20px;cursor:pointer}.xsave-note{margin:0 0 14px;color:#97a79f;font:500 12px/1.5 "Anuphan",sans-serif}\
.xsave-list{display:grid;gap:7px}.xsave-point{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:53px;padding:8px 10px;border:1px solid rgba(245,240,230,.08);border-radius:15px;background:rgba(255,255,255,.028);color:inherit;text-decoration:none}.xsave-point.done{border-color:rgba(143,220,175,.18)}.xsave-point.locked{opacity:.42;pointer-events:none}.xsave-check{width:25px;height:25px;display:grid;place-items:center;border:1px solid rgba(245,240,230,.16);border-radius:50%;color:#75867e;font:900 12px/1 sans-serif}.xsave-point.done .xsave-check{background:rgba(143,220,175,.13);border-color:rgba(143,220,175,.5);color:#8fdcaf}.xsave-point b{display:block;font:800 13px/1.25 "Bai Jamjuree",sans-serif}.xsave-point span{display:block;margin-top:2px;color:#86978f;font:500 10.5px/1.3 "Anuphan",sans-serif}.xsave-go{color:#e6c483;font:800 13px/1 sans-serif}\
.xsave-home{display:flex;justify-content:center;align-items:center;min-height:44px;margin-top:12px;border-radius:14px;background:#e6c483;color:#10211c;text-decoration:none;font:900 13px/1.2 "Bai Jamjuree",sans-serif}\
@media(max-width:520px){.xsave-hud{left:10px;bottom:max(10px,env(safe-area-inset-bottom));min-height:48px;padding:6px 13px 6px 6px;gap:8px}.xsave-ico{width:35px;height:35px;font-size:15px}.xsave-copy{font-size:12px}.xsave-copy small{display:none}.xsave-panel{left:10px;bottom:70px;width:calc(100vw - 20px);padding:15px;border-radius:21px}}\
@media(prefers-reduced-motion:reduce){.xsave-ico{animation:none}.xsave-hud{transition:none}}';
  document.head.appendChild(style);

  var hud=document.createElement('button');
  hud.type='button';
  hud.className='xsave-hud';
  hud.setAttribute('data-xircle-save-hud','1');
  hud.setAttribute('aria-expanded','false');
  hud.setAttribute('aria-controls','xircleSavePanel');

  var panel=document.createElement('section');
  panel.className='xsave-panel';
  panel.id='xircleSavePanel';
  panel.hidden=true;
  panel.setAttribute('aria-label','จุดเซฟของคุณ');
  document.body.appendChild(panel);
  document.body.appendChild(hud);

  function render(){
    var s=state(),count=doneCount(s);
    hud.innerHTML='<span class="xsave-ico" aria-hidden="true">✓</span><span class="xsave-copy"><span>จุดเซฟ</span><small>'+(count===5?'กลับมาได้จากตรงนี้':'บันทึกอัตโนมัติในเครื่องนี้')+'</small></span><span class="xsave-dots" aria-hidden="true">'+points.map(function(p){return '<i class="'+(p.done(s)?'on':'')+'"></i>';}).join('')+'</span>';

    panel.innerHTML='<div class="xsave-head"><div><small>จุดเซฟของคุณ</small><strong>'+(count===5?'เก็บทางกลับไว้ครบแล้ว':'เส้นทางจะถูกเก็บทีละจุด')+'</strong></div><button class="xsave-close" type="button" aria-label="ปิด">×</button></div><p class="xsave-note">บันทึกไว้ในเบราว์เซอร์เครื่องนี้ คุณกลับไปทบทวนจุดที่ผ่านแล้วได้โดยไม่ต้องเริ่มใหม่</p><div class="xsave-list">'+points.map(function(p,i){var done=p.done(s);return '<a class="xsave-point '+(done?'done':'locked')+'" '+(done?'href="'+escapeHtml(p.href)+'"':'aria-disabled="true"')+'><i class="xsave-check">'+(done?'✓':(i+1))+'</i><span><b>'+escapeHtml(p.label)+'</b><span>'+escapeHtml(p.detail)+'</span></span><i class="xsave-go">'+(done?'→':'')+'</i></a>';}).join('')+'</div><a class="xsave-home" href="/xircle/explore/">กลับห้องแมวขาว →</a>';
    var close=panel.querySelector('.xsave-close');
    if(close)close.addEventListener('click',function(e){e.stopPropagation();setOpen(false);});
  }

  function setOpen(open){
    panel.hidden=!open;
    hud.setAttribute('aria-expanded',open?'true':'false');
    if(open)render();
  }

  hud.addEventListener('click',function(){setOpen(panel.hidden);});
  document.addEventListener('click',function(e){if(panel.hidden)return;if(panel.contains(e.target)||hud.contains(e.target))return;setOpen(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false);});
  window.addEventListener('storage',function(e){if(e.key===KEY)render();});
  render();
  setTimeout(render,350);
})();