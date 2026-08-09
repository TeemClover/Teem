/* Lesson 2 · full SVG redesign — Taste before adding more */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:image-ai')return;

/* ⚠️ ตำแหน่งกับแอนิเมชันต้องอยู่คนละ group เสมอ
   ใน SVG นั้น attribute transform="..." กับ CSS property transform คือตัวเดียวกัน
   ฝั่ง CSS จึงชนะเสมอ — พอ keyframes ตั้ง transform ให้ขยับนิดเดียว มันก็ลบ
   translate() ที่ใช้จัดตำแหน่งทิ้งทั้งก้อน ชิ้นงานเลยกระโดดไปกองที่มุม (0,0)
   บั๊กนี้เคยทำให้เชฟ ขวดซอสและป้าย ✓/✗ ของบทนี้หลุดตำแหน่งไป 340-910 หน่วย
   และมองไม่เห็นเลยถ้าเปิด prefers-reduced-motion เพราะ animation:none
   ทำให้ attribute รอดกลับมา — คือหน้าจะดู "ปกติ" เฉพาะตอนที่ปิดแอนิเมชัน */
function newHeroSvg(){
  return `
  <svg viewBox="0 0 960 430" role="img" aria-labelledby="tasteHeroTitle tasteHeroDesc" data-mc-course-motion="1" xmlns="http://www.w3.org/2000/svg">
    <title id="tasteHeroTitle">ชิมซอสด้วยภาพก่อนทำงานจริง</title>
    <desc id="tasteHeroDesc">ฉากครัวต่อเนื่อง ภาพทดสอบที่ยังผิดอยู่ทางซ้าย เชฟชิมซอสตรงกลาง และภาพที่ตรง Canon พร้อมเสิร์ฟอยู่ทางขวา</desc>
    <defs>
      <linearGradient id="l2Bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#06180f"/><stop offset=".52" stop-color="#0d3823"/><stop offset="1" stop-color="#17563a"/>
      </linearGradient>
      <linearGradient id="l2Counter" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#f6e9ce"/><stop offset="1" stop-color="#b98b45"/>
      </linearGradient>
      <linearGradient id="l2Sauce" x1="0" y1="0" x2="1" y2="0">
        <stop stop-color="#d99a3a"/><stop offset=".48" stop-color="#f6d77f"/><stop offset="1" stop-color="#ba7b2d"/>
      </linearGradient>
      <linearGradient id="l2SourceGlass" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#245f42"/><stop offset="1" stop-color="#0b2f1d"/>
      </linearGradient>
      <filter id="l2Shadow" x="-35%" y="-35%" width="170%" height="180%">
        <feDropShadow dx="0" dy="14" stdDeviation="13" flood-color="#020b07" flood-opacity=".35"/>
      </filter>
      <filter id="l2Soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="10"/>
      </filter>
      <clipPath id="l2LeftFrame"><rect x="54" y="56" width="244" height="232" rx="20"/></clipPath>
      <clipPath id="l2RightFrame"><rect x="661" y="46" width="245" height="242" rx="20"/></clipPath>
      <style>
        .l2-flow{stroke-dasharray:18 13;animation:l2Flow 5.8s linear infinite}
        .l2-chef{transform-box:fill-box;transform-origin:center;animation:l2Breathe 5s ease-in-out infinite}
        .l2-spoon{transform-box:fill-box;transform-origin:20% 90%;animation:l2Spoon 4.2s ease-in-out infinite}
        .l2-source{transform-box:fill-box;transform-origin:center;animation:l2Source 5.4s ease-in-out infinite}
        .l2-wrong{transform-box:fill-box;transform-origin:center;animation:l2Wrong 4.8s ease-in-out infinite}
        .l2-right{transform-box:fill-box;transform-origin:center;animation:l2Right 5.2s ease-in-out infinite}
        .l2-badge{transform-box:fill-box;transform-origin:center;animation:l2Badge 3.4s ease-in-out infinite}
        .l2-star{transform-box:fill-box;transform-origin:center;animation:l2Star 2.9s ease-in-out infinite}
        .l2-star.s2{animation-delay:.65s}.l2-star.s3{animation-delay:1.2s}
        .l2-steam{stroke-dasharray:26;animation:l2Steam 3.7s ease-in-out infinite}
        .l2-steam.s2{animation-delay:1.25s}
        @keyframes l2Flow{to{stroke-dashoffset:-124}}
        @keyframes l2Breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes l2Spoon{0%,100%{transform:rotate(0deg) translateY(0)}42%{transform:rotate(-5deg) translateY(-4px)}58%{transform:rotate(-5deg) translateY(-4px)}}
        @keyframes l2Source{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(1deg)}}
        @keyframes l2Wrong{0%,82%,100%{transform:translateX(0)}86%{transform:translateX(-2px)}90%{transform:translateX(2px)}94%{transform:translateX(-1px)}}
        @keyframes l2Right{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
        @keyframes l2Badge{0%,100%{transform:scale(.94);opacity:.75}50%{transform:scale(1.08);opacity:1}}
        @keyframes l2Star{0%,100%{transform:scale(.78) rotate(0);opacity:.32}50%{transform:scale(1.12) rotate(8deg);opacity:1}}
        @keyframes l2Steam{0%{stroke-dashoffset:26;opacity:0;transform:translateY(6px)}45%{opacity:.72}100%{stroke-dashoffset:0;opacity:0;transform:translateY(-10px)}}
        @media(prefers-reduced-motion:reduce){
          .l2-flow,.l2-chef,.l2-spoon,.l2-source,.l2-wrong,.l2-right,.l2-badge,.l2-star,.l2-steam{animation:none!important}
          .l2-flow{stroke-dasharray:none}
        }
      </style>
    </defs>

    <rect width="960" height="430" rx="26" fill="url(#l2Bg)"/>
    <circle cx="480" cy="56" r="230" fill="#d8b15c" opacity=".065"/>
    <ellipse cx="132" cy="355" rx="210" ry="86" fill="#225f43" opacity=".18" filter="url(#l2Soft)"/>
    <ellipse cx="839" cy="342" rx="220" ry="90" fill="#d6b15a" opacity=".09" filter="url(#l2Soft)"/>

    <path d="M20 310Q480 284 940 310L925 407H36Z" fill="url(#l2Counter)" opacity=".96" filter="url(#l2Shadow)"/>
    <path d="M31 322Q480 296 929 322" fill="none" stroke="#fff6d9" stroke-opacity=".55" stroke-width="4"/>

    <g class="l2-wrong" filter="url(#l2Shadow)">
      <rect x="40" y="42" width="272" height="272" rx="25" fill="#f9f1df" stroke="#c99d50" stroke-width="4"/>
      <rect x="54" y="56" width="244" height="232" rx="20" fill="#dbe8ec"/>
      <g clip-path="url(#l2LeftFrame)">
        <rect x="54" y="56" width="244" height="232" fill="#b9d6db"/>
        <circle cx="239" cy="91" r="55" fill="#f4d17a" opacity=".55"/>
        <path d="M54 221Q105 179 156 224T298 212V288H54Z" fill="#708f8b"/>
        <path d="M117 151Q119 105 171 103Q224 104 227 153L217 228Q203 259 172 261Q138 259 125 229Z" fill="#3a271f"/>
        <path d="M132 153Q141 123 173 122Q206 124 218 154L211 212Q199 240 172 241Q143 240 133 211Z" fill="#efc3a5"/>
        <path d="M132 156Q142 113 176 118Q213 119 218 158Q199 142 185 128Q163 147 132 156Z" fill="#a84b33"/>
        <path d="M144 185h17M184 185h17" stroke="#4d342a" stroke-width="4" stroke-linecap="round"/>
        <path d="M160 216Q172 207 185 216" fill="none" stroke="#934b45" stroke-width="4" stroke-linecap="round"/>
        <path d="M113 244Q137 222 172 222Q211 223 232 247L248 288H95Z" fill="#4d6ea0"/>
      </g>
      <path d="M82 83l27 27M109 83l-27 27" stroke="#b7483f" stroke-width="7" stroke-linecap="round"/>
      <g transform="translate(251 251)"><g class="l2-badge">
        <circle r="30" fill="#b7483f" stroke="#fff7e5" stroke-width="5"/>
        <path d="M-11-11L11 11M11-11L-11 11" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      </g></g>
      <path d="M64 299H288" stroke="#8b6030" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
    </g>

    <g transform="translate(338 34)" filter="url(#l2Shadow)"><g class="l2-chef">
      <ellipse cx="142" cy="300" rx="112" ry="20" fill="#071a10" opacity=".25"/>
      <path d="M76 128Q78 70 138 70Q200 72 203 132L193 213Q179 250 140 252Q99 249 86 214Z" fill="#3c271f"/>
      <path d="M94 131Q104 99 141 98Q179 100 192 133L185 199Q171 230 140 231Q107 229 96 198Z" fill="#f2c7aa"/>
      <path d="M94 134Q105 89 144 94Q184 96 193 137Q171 122 157 107Q131 127 94 134Z" fill="#342119"/>
      <path d="M108 166q8 8 17 0M154 166q8 8 17 0" fill="none" stroke="#6d4636" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="111" cy="181" r="8" fill="#dd8a87" opacity=".48"/><circle cx="170" cy="181" r="8" fill="#dd8a87" opacity=".48"/>
      <path d="M127 200Q140 211 155 200" fill="none" stroke="#8b4943" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M84 78Q85 43 116 45Q119 16 145 28Q171 14 177 46Q207 47 201 82Z" fill="#fffdf7" stroke="#e4d7c0" stroke-width="4"/>
      <path d="M83 82H203V102Q143 114 83 101Z" fill="#fffdf7" stroke="#e4d7c0" stroke-width="4"/>
      <path d="M79 253Q99 227 140 228Q184 229 205 256L226 338H56Z" fill="#1b6a42"/>
      <path d="M119 240H165L174 338H109Z" fill="#f9f2df"/>
      <path d="M105 269Q76 266 52 245M176 270Q210 258 237 222" fill="none" stroke="#f2c7aa" stroke-width="18" stroke-linecap="round"/>
      <circle cx="47" cy="240" r="11" fill="#f2c7aa"/><circle cx="242" cy="217" r="11" fill="#f2c7aa"/>
      <g class="l2-spoon">
        <path d="M234 219L274 174" stroke="#e7d8b8" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="280" cy="167" rx="13" ry="8" fill="#e7d8b8" stroke="#bfa778" stroke-width="3"/>
        <ellipse cx="280" cy="168" rx="7" ry="3.5" fill="#d29a3c"/>
      </g>
    </g></g>

    <g transform="translate(430 257)" filter="url(#l2Shadow)"><g class="l2-source">
      <rect x="35" y="0" width="48" height="28" rx="8" fill="#d7bb70"/>
      <path d="M26 24H92L99 119Q97 145 76 151H49Q27 146 23 119Z" fill="url(#l2SourceGlass)" stroke="#d2ad59" stroke-width="4"/>
      <rect x="34" y="63" width="55" height="49" rx="10" fill="#fff4d1"/>
      <path d="M49 88C55 76 69 76 76 88C70 100 56 101 49 88Z" fill="#be9442"/>
      <path d="M62 77V99M51 88H73" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="62" cy="81" r="48" fill="#f4d37f" opacity=".08"/>
    </g></g>

    <g class="l2-right" filter="url(#l2Shadow)">
      <rect x="647" y="32" width="273" height="282" rx="25" fill="#f9f1df" stroke="#d5b45d" stroke-width="4"/>
      <rect x="661" y="46" width="245" height="242" rx="20" fill="#e7efe8"/>
      <g clip-path="url(#l2RightFrame)">
        <rect x="661" y="46" width="245" height="242" fill="#dfeadf"/>
        <circle cx="840" cy="84" r="52" fill="#f4d17a" opacity=".5"/>
        <path d="M661 222Q719 185 772 226T906 211V288H661Z" fill="#6f967b"/>
        <path d="M722 147Q724 103 775 102Q826 103 830 151L821 226Q808 257 777 259Q744 257 732 226Z" fill="#3a271f"/>
        <path d="M737 150Q747 121 777 120Q810 121 820 152L814 210Q803 238 777 239Q748 238 738 209Z" fill="#f0c5a8"/>
        <path d="M737 153Q746 111 780 117Q815 118 821 155Q801 142 789 128Q765 146 737 153Z" fill="#342119"/>
        <path d="M749 183q7 7 15 0M790 183q7 7 15 0" fill="none" stroke="#6d4636" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M766 212Q778 222 792 212" fill="none" stroke="#8b4943" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M718 242Q742 220 777 220Q815 221 836 245L853 288H700Z" fill="#1b6a42"/>
      </g>
      <g transform="translate(871 263)"><g class="l2-badge">
        <circle r="31" fill="#1b6a42" stroke="#fff7e5" stroke-width="5"/>
        <path d="M-13 0L-4 10 15-13" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      </g></g>
      <path d="M671 299H896" stroke="#8b6030" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
    </g>

    <path class="l2-flow" d="M306 222C360 203 387 236 430 258C478 283 525 273 563 231C602 188 622 169 658 164" fill="none" stroke="url(#l2Sauce)" stroke-width="10" stroke-linecap="round"/>
    <path d="M642 150L662 164 641 178" fill="none" stroke="#f4d37f" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="l2-flow" d="M658 200C619 214 598 252 562 280C525 309 474 319 430 299C389 280 353 257 306 263" fill="none" stroke="#d6a84a" stroke-opacity=".48" stroke-width="5" stroke-linecap="round"/>
    <path d="M323 249L302 263 324 276" fill="none" stroke="#d6a84a" stroke-opacity=".68" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>

    <g fill="none" stroke="#fff1c6" stroke-width="3" stroke-linecap="round" opacity=".7">
      <path class="l2-steam" d="M521 235C509 221 527 207 516 191"/>
      <path class="l2-steam s2" d="M541 240C531 226 548 213 539 198"/>
    </g>
    <g fill="#f4d37f">
      <path class="l2-star" d="M355 86l6 14 14 6-14 6-6 14-6-14-14-6 14-6Z"/>
      <path class="l2-star s2" d="M619 89l5 11 11 5-11 5-5 11-5-11-11-5 11-5Z"/>
      <path class="l2-star s3" d="M915 188l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/>
    </g>

    <g transform="translate(713 330)" filter="url(#l2Shadow)">
      <rect width="179" height="50" rx="15" fill="#0a2818" stroke="#d2ad59" stroke-width="2"/>
      <circle cx="28" cy="25" r="10" fill="#f0c5a8"/>
      <circle cx="62" cy="25" r="10" fill="#342119"/>
      <circle cx="96" cy="25" r="10" fill="#1b6a42"/>
      <rect x="120" y="15" width="36" height="20" rx="6" fill="#f4d17a"/>
      <g transform="translate(163 9)"><g class="l2-badge"><circle r="9" fill="#1b6a42"/><path d="M-4 0l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g></g>
    </g>
  </svg>`;
}

function replace(){
  var stage=document.querySelector('.hero-stage');
  var old=stage&&stage.querySelector('svg');
  if(!stage||!old)return false;
  if(old.dataset.lesson2Redesign==='1')return true;

  var box=document.createElement('div');
  box.innerHTML=newHeroSvg().trim();
  var fresh=box.firstElementChild;
  fresh.dataset.lesson2Redesign='1';
  old.replaceWith(fresh);
  return true;
}

function boot(){
  if(replace())return;
  var tries=0;
  var timer=setInterval(function(){
    tries+=1;
    if(replace()||tries>40)clearInterval(timer);
  },50);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
