/* Deep Reference → Answer Engine / Experience bridge */
(function(){
  'use strict';
  var raw=(location.pathname.replace(/\/+$/,'')||'/xircle/doc');
  var path=raw.replace(/^\/xircle\/doc(?=\/|$)/,'/xircle').replace(/^\/xircle2(?=\/|$)/,'/xircle');
  var profile={q:'Xircle',label:'Xircle',href:'/xircle/',tryLabel:'ลองหนึ่งวัน'};
  function starts(s){return path.indexOf(s)===0}
  if(starts('/xircle/app/habit-score'))profile={q:'Habit Score',label:'Habit Score',href:'/xircle/',tryLabel:'ลองหนึ่งวัน'};
  else if(starts('/xircle/app/eat'))profile={q:'Eat',label:'Eat / Food',href:'/xircle/',tryLabel:'ลองกล้องอาหาร'};
  else if(starts('/xircle/app/move'))profile={q:'Move',label:'Move',href:'/xircle/',tryLabel:'ลองหนึ่งวัน'};
  else if(starts('/xircle/app/sleep'))profile={q:'Sleep',label:'Sleep',href:'/xircle/',tryLabel:'ลองหนึ่งวัน'};
  else if(starts('/xircle/app/hardware'))profile={q:'Band Scale',label:'Band & Scale',href:'/xircle/hardware/',tryLabel:'ดู Hardware'};
  else if(starts('/xircle/app/body'))profile={q:'Body Composition',label:'Behavior vs Outcome',href:'/xircle/ghost/',tryLabel:'ดู Pattern'};
  else if(starts('/xircle/app/maxage'))profile={q:'MaxAge',label:'Bio Age / MaxAge',href:'/xircle/ghost/',tryLabel:'ดู Pattern'};
  else if(starts('/xircle/app/community'))profile={q:'Community',label:'Community / Together',href:'/xircle/circle/',tryLabel:'ดู Together'};
  else if(starts('/xircle/app'))profile={q:'Xircle',label:'Xircle App',href:'/xircle/',tryLabel:'ลองหนึ่งวัน'};
  else if(starts('/xircle/routinex/abcd'))profile={q:'ABCD',label:'RoutineX ABCD',href:'/xircle/routinex/',tryLabel:'ดู Act & Repeat'};
  else if(starts('/xircle/routinex/day-28'))profile={q:'28 วัน',label:'28-Day Rhythm',href:'/xircle/care/party/?mode=create',tryLabel:'ดู Care Rhythm'};
  else if(starts('/xircle/routinex'))profile={q:'RoutineX',label:'RoutineX',href:'/xircle/routinex/',tryLabel:'ดู Act & Repeat'};
  else if(starts('/xircle/habix'))profile={q:'Habix',label:'Habix',href:'/xircle/products/',tryLabel:'ดู Product Reference'};
  else if(starts('/xircle/xvisor/privacy'))profile={q:'Privacy',label:'Privacy & Consent',href:'/xircle/care/',tryLabel:'กลับ Human Care'};
  else if(starts('/xircle/xvisor/claims'))profile={q:'Boundary',label:'Claim Guard / Boundary',href:'/xircle/opportunity/',tryLabel:'ลอง Boundary'};
  else if(starts('/xircle/xvisor/coaching'))profile={q:'Follow-up',label:'Coaching & Follow-up',href:'/xircle/opportunity/',tryLabel:'ลอง Simulator'};
  else if(starts('/xircle/xvisor'))profile={q:'X-VISOR',label:'X-VISOR / Human Care',href:'/xircle/opportunity/',tryLabel:'ลอง Simulator'};
  else if(starts('/xircle/academy'))profile={q:'Certification',label:'Certification',href:'/xircle/opportunity/',tryLabel:'ลอง Simulator'};
  else if(starts('/xircle/ecosystem'))profile={q:'CloverX',label:'CloverX Ecosystem',href:'/xircle/',tryLabel:'ดู Connected Loop'};
  else if(starts('/xircle/xos'))profile={q:'XOS',label:'Xircle Operating System',href:'/xircle/learn/?category=system',tryLabel:'ดู System Answers'};
  else if(starts('/xircle/source/unresolved'))profile={q:'TO CONFIRM',label:'Unresolved / To Confirm',href:'/xircle/doc/',tryLabel:'กลับ Library'};
  else if(starts('/xircle/source'))profile={q:'Source',label:'Source Control',href:'/xircle/doc/',tryLabel:'กลับ Library'};
  else if(starts('/xircle/commerce'))profile={q:'Commerce',label:'Commerce · Legacy Reference',href:'/xircle/doc/source/unresolved/',tryLabel:'เช็ก To Confirm'};

  var style=document.createElement('style');style.id='x-deep-bridge-style';style.textContent='\
.x-deep-bridge{position:relative;z-index:15;width:min(1120px,calc(100% - 32px));margin:26px auto 42px;padding:18px 20px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:linear-gradient(120deg,rgba(123,215,232,.07),rgba(230,196,131,.045));box-shadow:0 22px 65px rgba(0,0,0,.2);font-family:var(--font-thai,"IBM Plex Sans Thai",sans-serif)}\
.x-deep-bridge-copy small{display:block;font:800 9px var(--font-ui,Manrope,sans-serif);letter-spacing:.14em;color:#7bd7e8;margin-bottom:6px}.x-deep-bridge-copy strong{display:block;color:#f4efe4;font-size:18px;line-height:1.25}.x-deep-bridge-copy span{display:block;color:#9fb1aa;font-size:12px;margin-top:5px}.x-deep-bridge-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.x-deep-bridge a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.13);color:#f4efe4;text-decoration:none;font-size:12px;font-weight:700;transition:.2s}.x-deep-bridge a:hover{transform:translateY(-1px);border-color:rgba(123,215,232,.38)}.x-deep-bridge a.try{color:#07130f;background:#7bd7e8;border-color:transparent}@media(max-width:700px){.x-deep-bridge{grid-template-columns:1fr;margin:18px auto 28px;padding:16px}.x-deep-bridge-actions{justify-content:flex-start}.x-deep-bridge a{flex:1}}';document.head.appendChild(style);
  var box=document.createElement('aside');box.className='x-deep-bridge';box.setAttribute('aria-label','Reference to experience');
  box.innerHTML='<div class="x-deep-bridge-copy"><small>REFERENCE → EXPERIENCE</small><strong>'+profile.label+'</strong><span>อ่านพอเข้าใจ แล้วกลับไปลองระบบจริงได้เลย</span></div><div class="x-deep-bridge-actions"><a href="/xircle/learn/?q='+encodeURIComponent(profile.q)+'">ถามต่อเรื่องนี้ →</a><a class="try" href="'+profile.href+'">'+profile.tryLabel+' →</a></div>';
  var main=document.querySelector('main');if(main)main.insertAdjacentElement('afterend',box);else document.body.appendChild(box);
})();
