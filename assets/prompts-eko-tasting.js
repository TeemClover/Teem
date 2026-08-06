/* Lesson 5 · quiet chef tasting note inside the exhibition */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

function addStyle(){
  if(document.getElementById('mc-chef-tasted-style'))return;
  var style=document.createElement('style');
  style.id='mc-chef-tasted-style';
  style.textContent=`
    .chef-tasted{
      display:grid;grid-template-columns:170px 1fr;gap:20px;align-items:center;
      margin:13px 0 0;padding:18px 20px;border:1px solid rgb(190 148 66/.36);border-radius:18px;
      background:linear-gradient(135deg,rgb(190 148 66/.1),#fff 58%,rgb(27 106 66/.045));
      box-shadow:0 13px 34px -30px rgb(10 40 24/.75)
    }
    .chef-tasted-art{border-radius:15px;overflow:hidden;background:#0a2818;border:1px solid rgb(190 148 66/.28)}
    .chef-tasted-art svg{display:block;width:100%;height:auto}
    .chef-tasted h3{font:800 clamp(18px,3.6vw,23px)/1.35 "Bai Jamjuree",sans-serif;margin:0;color:rgb(var(--ink))}
    .chef-tasted p{margin-top:7px;font-size:14px;line-height:1.78;color:rgb(var(--muted))}
    .chef-tasted strong{color:rgb(var(--ink))}
    .chef-tasted-treasure{display:inline-block;margin-top:10px;padding:5px 10px;border-radius:999px;background:rgb(190 148 66/.12);border:1px solid rgb(190 148 66/.3);font-size:11.5px;font-weight:800;color:#73551c}
    @media(max-width:600px){
      .chef-tasted{grid-template-columns:105px 1fr;gap:14px;padding:15px}
      .chef-tasted p{font-size:13.5px}
    }
    @media(max-width:390px){
      .chef-tasted{grid-template-columns:1fr}
      .chef-tasted-art{max-width:170px}
    }
  `;
  document.head.appendChild(style);
}

function art(){
  return `<svg viewBox="0 0 240 190" role="img" aria-labelledby="chefTasteTitle chefTasteDesc" xmlns="http://www.w3.org/2000/svg">
    <title id="chefTasteTitle">เชฟชิมอาหารจานเดิมกับเครื่องปรุงหลายแบบ</title>
    <desc id="chefTasteDesc">เชฟผู้หญิงถือช้อนอยู่หน้าจานอาหาร มีขวดเครื่องปรุงหลายขวดวางข้างจาน</desc>
    <defs>
      <linearGradient id="chefTasteBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071a10"/><stop offset="1" stop-color="#17613e"/></linearGradient>
      <filter id="chefTasteShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".25"/></filter>
    </defs>
    <rect width="240" height="190" fill="url(#chefTasteBg)"/>
    <circle cx="205" cy="25" r="60" fill="#be9442" opacity=".12"/>
    <ellipse cx="122" cy="167" rx="92" ry="13" fill="#000" opacity=".2"/>
    <g filter="url(#chefTasteShadow)">
      <path d="M39 77Q39 40 76 40Q112 41 114 79L106 119Q97 141 76 142Q53 141 45 119Z" fill="#3b251d"/>
      <path d="M48 78Q55 56 77 57Q100 58 108 80L103 111Q95 129 77 130Q58 129 51 111Z" fill="#f3cbb3"/>
      <path d="M48 82Q55 52 78 56Q101 57 108 83Q94 75 85 65Q69 79 48 82Z" fill="#332019"/>
      <path d="M57 98q6 6 12 0M84 98q6 6 12 0" fill="none" stroke="#6e4535" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M68 116Q77 123 88 116" fill="none" stroke="#8d4a43" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M43 46Q44 27 62 29Q64 13 79 20Q94 12 98 30Q116 31 112 49Z" fill="#fff" stroke="#e5d8c2" stroke-width="2.5"/>
      <path d="M42 49H113V61Q78 68 42 60Z" fill="#fff" stroke="#e5d8c2" stroke-width="2.5"/>
      <path d="M45 134Q57 123 77 123Q100 124 111 137L119 176H35Z" fill="#1b6a42"/>
      <path d="M65 130H89L94 176H60Z" fill="#f8f1df"/>
      <path d="M101 140Q122 135 140 116" fill="none" stroke="#f3cbb3" stroke-width="11" stroke-linecap="round"/>
      <path d="M137 115l23-22" stroke="#d9c7a5" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="163" cy="90" rx="8" ry="5" fill="none" stroke="#d9c7a5" stroke-width="3"/>
    </g>
    <g filter="url(#chefTasteShadow)">
      <ellipse cx="157" cy="149" rx="48" ry="15" fill="#fff" stroke="#d8cab0" stroke-width="3"/>
      <path d="M128 143q13-25 25 0q11-30 24 0q10-23 21 0" fill="none" stroke="#d79542" stroke-width="7" stroke-linecap="round"/>
      <circle cx="146" cy="140" r="4" fill="#2f7f50"/><circle cx="172" cy="137" r="4" fill="#2f7f50"/><circle cx="186" cy="143" r="3" fill="#b8493f"/>
    </g>
    <g filter="url(#chefTasteShadow)">
      <g transform="translate(181 100)"><rect x="0" y="9" width="16" height="35" rx="5" fill="#f5e7bf" stroke="#c69a43" stroke-width="2"/><rect x="3" y="0" width="10" height="12" rx="3" fill="#c69a43"/><circle cx="8" cy="27" r="4" fill="#b8493f"/></g>
      <g transform="translate(201 96)"><rect x="0" y="9" width="16" height="39" rx="5" fill="#eef1d2" stroke="#c69a43" stroke-width="2"/><rect x="3" y="0" width="10" height="12" rx="3" fill="#c69a43"/><circle cx="8" cy="29" r="4" fill="#2f7f50"/></g>
      <g transform="translate(218 105)"><rect x="0" y="8" width="13" height="31" rx="4" fill="#f3d7b6" stroke="#c69a43" stroke-width="2"/><rect x="3" y="0" width="7" height="10" rx="2" fill="#c69a43"/><circle cx="6.5" cy="25" r="3" fill="#d79542"/></g>
    </g>
    <g fill="#f4d37f"><path d="M137 37l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/><path d="M207 57l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></g>
  </svg>`;
}

function place(){
  var exhibition=document.querySelector('.season-exhibition');
  if(!exhibition)return false;
  var stage=exhibition.querySelector('.exhibit-stage');
  if(!stage)return false;

  var old=document.querySelector('#results .eko-tasting');
  if(old)old.remove();

  var existing=exhibition.querySelector('.chef-tasted');
  if(existing)return true;

  var note=document.createElement('aside');
  note.className='chef-tasted';
  note.setAttribute('aria-label','เชฟชิมแล้ว');
  note.innerHTML=
    '<div class="chef-tasted-art">'+art()+'</div>'+
    '<div><h3>เชฟชิมแล้ว</h3>'+
      '<p>อาหาร 1 จานกว่าจะกินหมด บางทีก็เติมเครื่องปรุงไป 10 ครั้ง จานเดิมจึงให้รสเหมือนได้ชิม 10 เมนู</p>'+
      '<p>งานจาก Source ขวดเดียวก็เหมือนกัน <strong>ไม่ต้องเริ่มใหม่ทุกครั้ง</strong> ลองเปลี่ยนผงปรุงทีละสูตร แล้วชิมว่ารสไหนเหมาะกับคนรับและงานชิ้นนั้นที่สุด</p>'+
      '<span class="chef-tasted-treasure">เครื่องปรุงที่มีให้เลือกเยอะ จึงเหมือนตู้สมบัติ</span></div>';
  stage.insertAdjacentElement('afterend',note);
  return true;
}

function boot(){
  addStyle();
  if(place())return;
  var tries=0;
  var timer=setInterval(function(){
    tries+=1;
    if(place()||tries>20)clearInterval(timer);
  },50);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
