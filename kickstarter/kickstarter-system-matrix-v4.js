(function(){
  'use strict';

  const STYLE_ID='campaign-system-matrix-v4-styles';
  const SECTION_ID='system-at-a-glance';
  const q=selector=>document.querySelector(selector);
  const qa=selector=>Array.from(document.querySelectorAll(selector));
  const isThai=()=>document.documentElement.lang==='th';

  const icons={
    fire:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a8 8 0 0 0 8-8c0-3-2-6-5-8 .1 2.1-.9 4-2.4 5.1.2-3.4-1.7-6.3-4.1-8.1.2 3.2-1.7 5.1-3 6.8A7 7 0 0 0 4 14a8 8 0 0 0 8 8Z"/><path d="M9.5 17.5c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-1.1-.6-2.1-1.7-3.1-.2 1-.7 1.7-1.4 2.2 0-1.2-.6-2.2-1.4-3-.1 1.7-.5 2.6-.5 3.9Z"/></svg>',
    leaf:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3C13 3 6 5.8 6 13c0 4 3 7 7 7 7.2 0 8-9 8-17Z"/><path d="M3 21c3.1-4.8 7-8.2 12.8-11"/></svg>',
    drop:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5S5.5 9.4 5.5 14.8A6.5 6.5 0 0 0 18.5 15C18.5 9.5 12 2.5 12 2.5Z"/><path d="M9 16.2c.5 1.2 1.5 1.8 3 1.8"/></svg>',
    gear:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>'
  };

  function injectStyles(){
    if(q('#'+STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${SECTION_ID}{
        padding:clamp(68px,8vw,112px) 0;
        background:linear-gradient(180deg,#f7f1e5 0%,#f1e7d5 100%);
        color:#10271d;
        border-top:1px solid rgba(16,39,29,.08);
        border-bottom:1px solid rgba(16,39,29,.1);
      }
      #${SECTION_ID} .system-matrix-head{max-width:920px;margin:0 auto clamp(30px,4vw,48px);text-align:center}
      #${SECTION_ID} .system-matrix-head .eyebrow{color:#765313!important}
      #${SECTION_ID} .system-matrix-head h2{margin:.28em 0 .25em;font-size:clamp(34px,5.2vw,66px);line-height:1.02;letter-spacing:-.05em;color:#08251a}
      #${SECTION_ID} .system-matrix-head>p:last-child{max-width:760px;margin:0 auto;color:#405349;font-size:clamp(16px,1.8vw,21px);line-height:1.65}
      #${SECTION_ID} .system-matrix-table{max-width:1120px;margin:0 auto;border:1px solid rgba(16,39,29,.16);border-radius:24px;overflow:hidden;background:rgba(255,255,255,.68);box-shadow:0 26px 70px -48px rgba(16,39,29,.5)}
      #${SECTION_ID} .system-matrix-columns,#${SECTION_ID} .system-matrix-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      #${SECTION_ID} .system-matrix-columns{background:#082a1d;color:#fff}
      #${SECTION_ID} .system-matrix-columns strong{padding:18px clamp(20px,3vw,34px);font-size:12px;line-height:1.3;letter-spacing:.16em;text-transform:uppercase}
      #${SECTION_ID} .system-matrix-columns strong+strong{border-left:1px solid rgba(255,255,255,.15)}
      #${SECTION_ID} .system-matrix-row+ .system-matrix-row{border-top:1px solid rgba(16,39,29,.12)}
      #${SECTION_ID} .system-matrix-cell{min-height:92px;padding:20px clamp(20px,3vw,34px);display:flex;align-items:center;gap:16px;color:#17372a;font-size:clamp(15px,1.45vw,18px);font-weight:730;line-height:1.45}
      #${SECTION_ID} .system-matrix-cell.no{border-left:1px solid rgba(16,39,29,.12);background:rgba(156,59,38,.045);color:#5a3029}
      #${SECTION_ID} .system-matrix-cell.yes{background:rgba(24,112,64,.045)}
      #${SECTION_ID} .system-matrix-mark{width:32px;height:32px;flex:0 0 32px;border-radius:50%;display:grid;place-items:center;font-size:18px;font-weight:900;line-height:1}
      #${SECTION_ID} .yes .system-matrix-mark{background:#dcebdd;color:#17683c}
      #${SECTION_ID} .no .system-matrix-mark{background:#f2deda;color:#a33d2c}

      #foil-cores .ksv2-core-symbol{display:grid!important;place-items:center!important}
      #foil-cores .ksv2-core-symbol svg{width:42px;height:42px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

      #tournament .ksv2-kicker{color:#765313!important;opacity:1!important}
      #tournament .ksv2-title{color:#08251a!important}
      #tournament .ksv2-lead{color:#354b40!important;opacity:1!important}
      #tournament .ksv2-competitive-points article strong{color:#247548!important;opacity:1!important}
      #tournament .ksv2-competitive-points article b{color:#10271d!important;opacity:1!important}
      #tournament .ksv2-competitive-points article p{color:#465c51!important;opacity:1!important}
      #tournament .ksv2-prize{color:#172d23!important}
      #tournament .ksv2-prize b{color:#b33d2b!important}

      @media(max-width:700px){
        #${SECTION_ID} .system-matrix-head{text-align:left}
        #${SECTION_ID} .system-matrix-head>p:last-child{margin-left:0}
        #${SECTION_ID} .system-matrix-columns{display:none}
        #${SECTION_ID} .system-matrix-table{border-radius:18px;background:transparent;border:0;box-shadow:none;overflow:visible}
        #${SECTION_ID} .system-matrix-row{display:block;border:1px solid rgba(16,39,29,.15)!important;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.72)}
        #${SECTION_ID} .system-matrix-row+ .system-matrix-row{margin-top:12px}
        #${SECTION_ID} .system-matrix-cell{min-height:76px;padding:17px 18px;align-items:flex-start}
        #${SECTION_ID} .system-matrix-cell:after{content:attr(data-label);order:-1;display:block;min-width:72px;margin-top:4px;color:#6c786f;font-size:10px;font-weight:850;letter-spacing:.11em;text-transform:uppercase}
        #${SECTION_ID} .system-matrix-cell.no{border-left:0;border-top:1px solid rgba(16,39,29,.1)}
        #${SECTION_ID} .system-matrix-mark{width:28px;height:28px;flex-basis:28px;font-size:16px}
      }
    `;
    document.head.appendChild(style);
  }

  function removeVisualStoryTechNote(){
    qa('#visual-story p,#visual-story small,#visual-story [class*="note"],#visual-story [class*="caption"]').forEach(node=>{
      const text=(node.textContent||'').replace(/\s+/g,' ').trim();
      if(/1586\s*[×x]\s*992/i.test(text)&&(/crop/i.test(text)||/แสดงเต็มภาพ/i.test(text)||/shown in full/i.test(text))){
        node.remove();
      }
    });
  }

  function fixCoreCards(){
    const grid=q('#foil-cores .ksv2-core-grid');
    if(!grid) return;
    const order=['red','green','blue','gray'];
    const iconNames={red:'fire',green:'leaf',blue:'drop',gray:'gear'};
    order.forEach(color=>{
      const card=grid.querySelector('.ksv2-core-card.'+color);
      if(!card) return;
      const symbol=card.querySelector('.ksv2-core-symbol');
      if(symbol) symbol.innerHTML=icons[iconNames[color]];
      grid.appendChild(card);
    });
  }

  function matrixCopy(){
    if(isThai()){
      return {
        eyebrow:'ระบบในภาพเดียว',
        title:'สิ่งที่สร้างเกม และสิ่งที่ไม่เข้ามาแทนการตัดสินใจของคุณ',
        lead:'myClover ทำให้ข้อมูลน้อย ขอบเขตชัด และปล่อยให้ความลึกทั้งหมดเกิดจากคนที่นั่งอยู่ตรงข้าม',
        yes:'✓ สิ่งที่อยู่ในระบบ',
        no:'× สิ่งที่ไม่มีในเกม',
        rows:[
          ['เลือกมือ 7 ใบก่อนเริ่มเล่น','ไม่มีกองจั่วหรือดวงจากการจั่ว'],
          ['ข้อมูลลับเกิดจากการตัดสินใจของคน','ไม่มีลูกเต๋าหรือการตัดสินผลแบบสุ่ม'],
          ['2 เกมทางการ: CORE7 + 三川 MIKAWA','ไม่มีการ์ดหายากที่เก่งกว่า หรือ Pay-to-Win'],
          ['1 Keyword · Stat 4 สี','ไม่มีสีที่ 5 ในระบบหลัก'],
          ['กติกาเปิด · เล่นออนไลน์ฟรี','ไม่บังคับใช้แอปหรือซื้อการ์ดเพื่อเล่น']
        ]
      };
    }
    return {
      eyebrow:'THE SYSTEM AT A GLANCE',
      title:'Everything that creates the game. Nothing that replaces your decisions.',
      lead:'myClover keeps the information small, the boundaries clear and the depth entirely between the people at the table.',
      yes:'✓ BUILT INTO THE SYSTEM',
      no:'× NOT PART OF THE GAME',
      rows:[
        ['Choose a 7-card hand before play','No draw pile or draw luck'],
        ['Hidden information from human decisions','No dice or random resolution'],
        ['2 official games: CORE7 + 三川 MIKAWA','No stronger rarity or pay-to-win'],
        ['1 keyword · 4 color stats','No fifth canonical color'],
        ['Open rules · free online play','No required app or purchase to play']
      ]
    };
  }

  function ensureSystemMatrix(){
    const promise=q('#promise');
    if(!promise||!promise.parentNode) return;
    let section=q('#'+SECTION_ID);
    if(!section){
      section=document.createElement('section');
      section.id=SECTION_ID;
      section.className='system-matrix section-cream';
      promise.insertAdjacentElement('afterend',section);
    }
    const copy=matrixCopy();
    section.innerHTML=`
      <div class="wrap">
        <div class="system-matrix-head reveal is-visible">
          <p class="eyebrow">${copy.eyebrow}</p>
          <h2>${copy.title}</h2>
          <p>${copy.lead}</p>
        </div>
        <div class="system-matrix-table reveal is-visible" role="table" aria-label="${copy.eyebrow}">
          <div class="system-matrix-columns" role="row">
            <strong role="columnheader">${copy.yes}</strong>
            <strong role="columnheader">${copy.no}</strong>
          </div>
          ${copy.rows.map(row=>`
            <article class="system-matrix-row" role="row">
              <div class="system-matrix-cell yes" role="cell" data-label="${copy.yes.replace(/^.\s*/, '')}"><span class="system-matrix-mark">✓</span><span>${row[0]}</span></div>
              <div class="system-matrix-cell no" role="cell" data-label="${copy.no.replace(/^.\s*/, '')}"><span class="system-matrix-mark">×</span><span>${row[1]}</span></div>
            </article>`).join('')}
        </div>
      </div>`;
  }

  function applyAll(){
    injectStyles();
    removeVisualStoryTechNote();
    fixCoreCards();
    ensureSystemMatrix();
  }

  function schedule(){
    [0,80,280,750,1400,3000,4300].forEach(delay=>setTimeout(applyAll,delay));
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  new MutationObserver(()=>setTimeout(applyAll,30)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
