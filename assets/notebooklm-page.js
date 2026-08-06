/* Lesson 4 · reliable green fold target + one-sauce-many-dishes SVG */
(function(){
  var meta=document.querySelector('meta[name="mc-item"]');
  if(!meta||meta.content!=='learn:notebooklm') return;

  if(!document.getElementById('notebooklm-page-style')){
    var style=document.createElement('style');
    style.id='notebooklm-page-style';
    style.textContent=`
      .fold summary::after{
        pointer-events:none!important;
        user-select:none!important;
        -webkit-user-select:none!important;
      }
      .multiply-ill{
        position:relative;overflow:hidden;margin:0 0 14px;
        border:1px solid rgb(190 148 66/.34);border-radius:22px;
        background:linear-gradient(145deg,#fffdf7,#f7efe0);
        box-shadow:0 12px 34px rgb(18 40 28/.07)
      }
      .multiply-ill svg{display:block;width:100%;height:auto}
      .multiply-ill .sauce-line{stroke-dasharray:10 9;animation:sauceFlow 5s linear infinite}
      .multiply-ill .spark{transform-box:fill-box;transform-origin:center;animation:sparkPop 2.8s ease-in-out infinite}
      .multiply-ill .spark.s2{animation-delay:.45s}.multiply-ill .spark.s3{animation-delay:.9s}
      @keyframes sauceFlow{to{stroke-dashoffset:-76}}
      @keyframes sparkPop{0%,100%{opacity:.42;transform:scale(.86)}50%{opacity:1;transform:scale(1.08)}}
      @media(prefers-reduced-motion:reduce){.multiply-ill *{animation:none!important}.multiply-ill .sauce-line{stroke-dasharray:none}}
    `;
    document.head.appendChild(style);
  }

  var flow=document.querySelector('.flow');
  if(!flow||document.querySelector('.multiply-ill')) return;

  var figure=document.createElement('figure');
  figure.className='multiply-ill';
  figure.setAttribute('aria-labelledby','multiplyIllTitle multiplyIllDesc');
  figure.innerHTML=`
  <svg viewBox="0 0 900 390" role="img" xmlns="http://www.w3.org/2000/svg">
    <title id="multiplyIllTitle">ซอสขวดเดียวราดได้หลายจาน</title>
    <desc id="multiplyIllDesc">เชฟผู้หญิงน่ารักเทซอสสีทองจากขวดเดียว ซอสแยกไปยังจานที่แทนภาพ สไลด์ วิดีโอ เสียง และแผนผัง</desc>
    <defs>
      <linearGradient id="nbBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf7"/><stop offset="1" stop-color="#f3e7cf"/></linearGradient>
      <linearGradient id="nbSauce" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7c96b"/><stop offset="1" stop-color="#b9822e"/></linearGradient>
      <filter id="nbShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0a2818" flood-opacity=".13"/></filter>
    </defs>
    <rect width="900" height="390" fill="url(#nbBg)"/>
    <circle cx="790" cy="52" r="110" fill="#1b6a42" opacity=".07"/>
    <circle cx="62" cy="340" r="125" fill="#be9442" opacity=".08"/>
    <path d="M0 322Q190 286 368 323T900 320V390H0Z" fill="#0a2818" opacity=".055"/>

    <!-- cute chef -->
    <g transform="translate(36 54)" filter="url(#nbShadow)">
      <ellipse cx="126" cy="278" rx="86" ry="17" fill="#183f2b" opacity=".12"/>
      <path d="M72 126Q72 78 124 76Q177 77 178 128L169 181Q159 212 124 214Q88 212 78 181Z" fill="#3d271f"/>
      <path d="M87 122Q96 93 126 92Q158 94 168 122L162 171Q151 197 124 198Q97 196 87 171Z" fill="#f3cbb3"/>
      <path d="M88 125Q96 83 128 88Q164 89 168 128Q151 116 139 101Q119 119 88 125Z" fill="#342119"/>
      <path d="M98 157q8 8 16 0M137 157q8 8 16 0" fill="none" stroke="#6e4535" stroke-width="3" stroke-linecap="round"/>
      <circle cx="101" cy="168" r="7" fill="#dd8a87" opacity=".55"/><circle cx="151" cy="168" r="7" fill="#dd8a87" opacity=".55"/>
      <path d="M114 179Q126 189 139 179" fill="none" stroke="#8d4a43" stroke-width="3" stroke-linecap="round"/>
      <path d="M78 86Q80 55 107 56Q109 31 132 40Q153 30 158 57Q184 58 179 88Z" fill="#fff" stroke="#e5d8c2" stroke-width="3"/>
      <path d="M77 88H180V105Q128 115 77 104Z" fill="#fff" stroke="#e5d8c2" stroke-width="3"/>
      <path d="M74 214Q91 191 124 191Q160 192 178 214L195 299H55Z" fill="#1b6a42"/>
      <path d="M105 203H145L153 298H96Z" fill="#f8f1df"/>
      <path d="M98 218Q75 217 58 246M151 219Q176 211 195 190" fill="none" stroke="#f3cbb3" stroke-width="17" stroke-linecap="round"/>
      <circle cx="52" cy="250" r="10" fill="#f3cbb3"/><circle cx="200" cy="185" r="10" fill="#f3cbb3"/>
      <path d="M102 240l-12 15 16 4M147 240l12 15-16 4" fill="none" stroke="#be9442" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <!-- one bottle -->
    <g transform="translate(247 72) rotate(-20 52 82)" filter="url(#nbShadow)">
      <rect x="30" y="0" width="45" height="33" rx="8" fill="#d7c3a0"/>
      <path d="M22 28H83L92 146Q92 174 66 181H39Q14 174 14 146Z" fill="#174c32" stroke="#0d3723" stroke-width="4"/>
      <rect x="24" y="66" width="58" height="62" rx="12" fill="#fff4cf"/>
      <path d="M39 95C46 83 61 83 68 95C62 107 47 109 39 95Z" fill="#be9442"/>
      <path d="M52 83V108M40 95H65" stroke="#fff8df" stroke-width="3" stroke-linecap="round"/>
    </g>

    <!-- one sauce, many dishes -->
    <g fill="none" stroke="url(#nbSauce)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <path class="sauce-line" d="M334 186C395 191 412 230 457 242C509 255 533 214 573 222C618 231 623 273 672 272C724 271 748 223 808 235"/>
      <path d="M462 241Q465 259 454 275M548 228Q550 247 545 270M633 258Q636 276 628 294M718 254Q721 273 716 292M808 235Q812 255 807 273"/>
    </g>
    <g fill="#be9442"><circle cx="454" cy="282" r="6"/><circle cx="545" cy="277" r="6"/><circle cx="628" cy="301" r="6"/><circle cx="716" cy="299" r="6"/><circle cx="807" cy="280" r="6"/></g>

    <!-- plates: image, slides, video, audio, mind map -->
    <g filter="url(#nbShadow)">
      <g transform="translate(405 277)"><ellipse cx="49" cy="43" rx="54" ry="15" fill="#d9c7aa"/><ellipse cx="49" cy="37" rx="52" ry="16" fill="#fff" stroke="#e3d6bf" stroke-width="3"/><rect x="27" y="12" width="44" height="33" rx="6" fill="#dff0e5" stroke="#1b6a42" stroke-width="3"/><circle cx="38" cy="23" r="5" fill="#be9442"/><path d="M31 40l12-12 8 8 8-10 9 14Z" fill="#4d8b65"/></g>
      <g transform="translate(496 274)"><ellipse cx="49" cy="43" rx="54" ry="15" fill="#d9c7aa"/><ellipse cx="49" cy="37" rx="52" ry="16" fill="#fff" stroke="#e3d6bf" stroke-width="3"/><rect x="25" y="18" width="48" height="29" rx="5" fill="#fff4cf" stroke="#be9442" stroke-width="3"/><rect x="32" y="10" width="48" height="29" rx="5" fill="#e8f1eb" stroke="#1b6a42" stroke-width="3"/><path d="M40 20H68M40 27H61" stroke="#73947f" stroke-width="3" stroke-linecap="round"/></g>
      <g transform="translate(579 294)"><ellipse cx="49" cy="43" rx="54" ry="15" fill="#d9c7aa"/><ellipse cx="49" cy="37" rx="52" ry="16" fill="#fff" stroke="#e3d6bf" stroke-width="3"/><rect x="25" y="10" width="50" height="37" rx="7" fill="#173f2b"/><path d="M46 20L62 29 46 39Z" fill="#f7c96b"/></g>
      <g transform="translate(667 292)"><ellipse cx="49" cy="43" rx="54" ry="15" fill="#d9c7aa"/><ellipse cx="49" cy="37" rx="52" ry="16" fill="#fff" stroke="#e3d6bf" stroke-width="3"/><path d="M30 32Q30 13 49 13Q68 13 68 32" fill="none" stroke="#1b6a42" stroke-width="7"/><rect x="23" y="29" width="10" height="17" rx="4" fill="#be9442"/><rect x="65" y="29" width="10" height="17" rx="4" fill="#be9442"/><path d="M40 35q9 8 18 0" fill="none" stroke="#73947f" stroke-width="3" stroke-linecap="round"/></g>
      <g transform="translate(758 274)"><ellipse cx="49" cy="43" rx="54" ry="15" fill="#d9c7aa"/><ellipse cx="49" cy="37" rx="52" ry="16" fill="#fff" stroke="#e3d6bf" stroke-width="3"/><g stroke="#1b6a42" stroke-width="3"><path d="M49 17L34 29M49 17L66 28M34 29L30 43M66 28L71 43"/></g><g fill="#be9442"><circle cx="49" cy="17" r="6"/><circle cx="34" cy="29" r="5"/><circle cx="66" cy="28" r="5"/><circle cx="30" cy="43" r="5"/><circle cx="71" cy="43" r="5"/></g></g>
    </g>

    <g fill="#be9442"><path class="spark" d="M383 95l5 12 12 5-12 5-5 12-5-12-12-5 12-5Z"/><path class="spark s2" d="M843 102l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/><path class="spark s3" d="M360 294l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/></g>
  </svg>`;

  flow.parentNode.insertBefore(figure,flow);
})();
