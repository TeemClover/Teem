/* Lesson 5 · one useful Eko tasting note inside the seasoning results */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

function addStyle(){
  if(document.getElementById('mc-eko-tasting-style'))return;
  var style=document.createElement('style');
  style.id='mc-eko-tasting-style';
  style.textContent=`
    .eko-tasting{
      grid-column:1/-1;display:grid;grid-template-columns:170px 1fr;gap:20px;align-items:center;
      margin:4px 0 2px;padding:18px 20px;border:1px solid rgb(190 148 66/.42);border-radius:18px;
      background:linear-gradient(135deg,rgb(190 148 66/.12),#fff 56%,rgb(27 106 66/.055));
      box-shadow:0 13px 34px -29px rgb(10 40 24/.8)
    }
    .eko-tasting-art{border-radius:15px;overflow:hidden;background:#0a2818;border:1px solid rgb(190 148 66/.28)}
    .eko-tasting-art svg{display:block;width:100%;height:auto}
    .eko-tasting-kicker{display:block;font:800 10.5px "Bai Jamjuree",sans-serif;letter-spacing:.14em;color:#8a6a22;margin-bottom:4px}
    .eko-tasting h3{font:800 clamp(18px,3.6vw,23px)/1.35 "Bai Jamjuree",sans-serif;margin:0;color:rgb(var(--ink))}
    .eko-tasting p{margin-top:7px;font-size:14px;line-height:1.75;color:rgb(var(--muted))}
    .eko-tasting strong{color:rgb(var(--ink))}
    .eko-treasure{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:5px 10px;border-radius:999px;background:rgb(190 148 66/.13);border:1px solid rgb(190 148 66/.32);font-size:11.5px;font-weight:800;color:#73551c}
    .eko-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    .eko-actions button{min-height:42px;padding:9px 13px;border-radius:10px;font:800 12.5px "Bai Jamjuree",sans-serif;cursor:pointer}
    .eko-random{border:1px solid rgb(var(--green));background:rgb(var(--green));color:#fff}
    .eko-all{border:1px solid rgb(27 106 66/.28);background:#fff;color:rgb(var(--green))}
    .eko-actions button:active{transform:translateY(1px)}
    @media(max-width:600px){
      .eko-tasting{grid-template-columns:105px 1fr;gap:14px;padding:15px}
      .eko-tasting p{font-size:13.5px}
      .eko-actions{grid-column:1/-1}
      .eko-actions button{flex:1 1 145px}
    }
    @media(max-width:390px){
      .eko-tasting{grid-template-columns:1fr}
      .eko-tasting-art{max-width:170px}
    }
  `;
  document.head.appendChild(style);
}

function art(){
  return `<svg viewBox="0 0 240 190" role="img" aria-labelledby="ekoTasteTitle ekoTasteDesc" xmlns="http://www.w3.org/2000/svg">
    <title id="ekoTasteTitle">เชฟเอโกะชิมอาหารจานเดิมกับเครื่องปรุงหลายแบบ</title>
    <desc id="ekoTasteDesc">เชฟผู้หญิงถือช้อนอยู่หน้าจานอาหาร มีขวดเครื่องปรุงหลายขวดวางข้างจาน</desc>
    <defs>
      <linearGradient id="ekoBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071a10"/><stop offset="1" stop-color="#17613e"/></linearGradient>
      <filter id="ekoShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".25"/></filter>
    </defs>
    <rect width="240" height="190" fill="url(#ekoBg)"/>
    <circle cx="205" cy="25" r="60" fill="#be9442" opacity=".12"/>
    <ellipse cx="122" cy="167" rx="92" ry="13" fill="#000" opacity=".2"/>
    <g filter="url(#ekoShadow)">
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
    <g filter="url(#ekoShadow)">
      <ellipse cx="157" cy="149" rx="48" ry="15" fill="#fff" stroke="#d8cab0" stroke-width="3"/>
      <path d="M128 143q13-25 25 0q11-30 24 0q10-23 21 0" fill="none" stroke="#d79542" stroke-width="7" stroke-linecap="round"/>
      <circle cx="146" cy="140" r="4" fill="#2f7f50"/><circle cx="172" cy="137" r="4" fill="#2f7f50"/><circle cx="186" cy="143" r="3" fill="#b8493f"/>
    </g>
    <g filter="url(#ekoShadow)">
      <g transform="translate(181 100)"><rect x="0" y="9" width="16" height="35" rx="5" fill="#f5e7bf" stroke="#c69a43" stroke-width="2"/><rect x="3" y="0" width="10" height="12" rx="3" fill="#c69a43"/><circle cx="8" cy="27" r="4" fill="#b8493f"/></g>
      <g transform="translate(201 96)"><rect x="0" y="9" width="16" height="39" rx="5" fill="#eef1d2" stroke="#c69a43" stroke-width="2"/><rect x="3" y="0" width="10" height="12" rx="3" fill="#c69a43"/><circle cx="8" cy="29" r="4" fill="#2f7f50"/></g>
      <g transform="translate(218 105)"><rect x="0" y="8" width="13" height="31" rx="4" fill="#f3d7b6" stroke="#c69a43" stroke-width="2"/><rect x="3" y="0" width="7" height="10" rx="2" fill="#c69a43"/><circle cx="6.5" cy="25" r="3" fill="#d79542"/></g>
    </g>
    <g fill="#f4d37f"><path d="M137 37l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/><path d="M207 57l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></g>
  </svg>`;
}

function card(){
  var el=document.createElement('aside');
  el.className='eko-tasting';
  el.setAttribute('aria-label','โต๊ะชิมของเชฟเอโกะ');
  el.innerHTML=
    '<div class="eko-tasting-art">'+art()+'</div>'+
    '<div class="eko-tasting-copy">'+
      '<span class="eko-tasting-kicker">CHEF EKO · TASTING NOTE</span>'+
      '<h3>จานเดิม ปรุงระหว่างกิน 10 ครั้ง ก็เหมือนได้ชิม 10 เมนู</h3>'+
      '<p>Source ก็เหมือนกันค่ะ <strong>อย่าเพิ่งทิ้งจานแล้วเริ่มใหม่ทุกครั้ง</strong> ลองใช้ซอสขวดเดิมกับผงคนละสูตร แล้วเทียบว่ารสไหนเหมาะกับคนกินและงานชิ้นนี้ที่สุด</p>'+
      '<span class="eko-treasure">🗝️ 44 สูตรนี้คือตู้สมบัติ ไม่ใช่รายการที่ต้องใช้ให้ครบ</span>'+
      '<div class="eko-actions"><button type="button" class="eko-random">🎲 ให้เชฟหยิบ 1 สูตร</button><button type="button" class="eko-all">🗄️ เปิดตู้สมบัติ 44 สูตร</button></div>'+
    '</div>';
  el.querySelector('.eko-random').addEventListener('click',function(){
    var button=document.getElementById('rand');
    if(button)button.click();
  });
  el.querySelector('.eko-all').addEventListener('click',function(){
    var button=document.getElementById('showAll');
    if(button)button.click();
  });
  return el;
}

var placing=false;
function place(){
  if(placing)return;
  placing=true;
  requestAnimationFrame(function(){
    placing=false;
    var results=document.getElementById('results');
    if(!results)return;
    var existing=results.querySelector('.eko-tasting');
    var cards=results.querySelectorAll(':scope > .pc');
    if(!cards.length){if(existing)existing.remove();return}
    if(existing)return;
    var note=card();
    var anchor=cards[Math.min(1,cards.length-1)];
    anchor.insertAdjacentElement('afterend',note);
  });
}

function boot(){
  addStyle();
  place();
  var results=document.getElementById('results');
  if(results&&window.MutationObserver){
    new MutationObserver(place).observe(results,{childList:true});
  }
  ['q','chips','rand','reset','showAll'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){el.addEventListener('input',function(){setTimeout(place,30)});el.addEventListener('click',function(){setTimeout(place,30)})}
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
