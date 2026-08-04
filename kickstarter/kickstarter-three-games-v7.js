(function(){
  'use strict';

  const STYLE_ID='kickstarter-three-games-v7-styles';
  const VERSION='20260804-three-games-v7';
  const q=selector=>document.querySelector(selector);
  const isThai=()=>document.documentElement.lang==='th';

  const copy={
    en:{
      eyebrow:'THREE OFFICIAL GAMES · DAY ONE',
      title:'One chosen hand. Three official games.',
      lead:'Start with CORE7. Switch to HERO’S DUEL when you want speed. Enter 三川 MIKAWA when you want the deepest positional fight. Every card is chosen. Every result is earned.',
      red:{badge:'RED · FASTEST',name:'HERO’S DUEL',tag:'FAST-PACED DUEL GAME',body:'Rock-paper-scissors with memory, damage and shrinking options. Reveal one card at a time. Win and it returns. Lose and it is discarded. A tie costs both cards.',meta:'2 PLAYERS · 7 CARDS · RAPID FIRE'},
      green:{badge:'GREEN · START HERE',name:'CORE7',tag:'FLAGSHIP RULE',body:'The recommended first game. Choose in secret, reveal together and manage the same 7-card hand across Rounds. Easy to teach. Deep enough to keep reading the human across the table.',meta:'2 PLAYERS · MEDIUM DEPTH · HUMAN READ'},
      blue:{badge:'BLUE · DEEPEST',name:'三川 MIKAWA',tag:'THREE-RIVER STRATEGY GAME',body:'Deploy across 3 bridges, capture 2 of 3 positions and kill 1 captured card. Play as a duel—or run a 4-player tournament where every loss follows you into the Final.',meta:'2–4 PLAYERS · POSITIONAL WAR · 3 BRIDGES'},
      ruleEyebrow:'ONE RULE CARD · TWO SIDES',
      ruleTitle:'MIKAWA opens first. CORE7 is one flip away.',
      ruleBody:'Every box includes 4 identical double-sided Rule Cards—one for each player. The MIKAWA side also contains the complete HERO’S DUEL rules, so all 3 official games are ready from the first hand.',
      flip:'TAP TO FLIP · MIKAWA / CORE7',
      frontAlt:'三川 MIKAWA and HERO’S DUEL visual rule card',
      backAlt:'CORE7 visual rule card',
      sideFront:'FRONT · MIKAWA + HERO’S DUEL',
      sideBack:'BACK · CORE7',
      promise:['10 sec','to learn CORE7','7 cards','your chosen hand','0% RNG','100% Decisions','3 games','one shared system'],
      hero:'A pocket game system built from 7 cards you choose yourself. Play 3 official games—from a rapid duel to a full Three-River war—with 0% RNG and 100% decisions.',
      micro:'28 word cards · 4 rule cards · 1 Lucky Card · 4 CORE cards',
      boxTitle:'Thirty-seven cards. Three official games. One pocket box.',
      boxLine:'33-card game system + 4 playable CORE cards.',
      boxItems:[
        ['28','Word Cards','Seven Red, Green, Blue and Gray cards. One keyword per card. One shared language across every official game.'],
        ['04','Double-Sided Rule Cards','MIKAWA + HERO’S DUEL on one side. CORE7 on the other. One complete visual guide for each player.'],
        ['01','Lucky Card','A QR, a good-luck message and a four-panel story showing how one myClover card can become many different games.'],
        ['04','CORE Cards','BODY · SOUL · MIND · CRAFT as playable full-art cards—foil in every Kickstarter box.']
      ],
      product:'1 pocket box · 33-card game system · 4 CORE cards · 3 official games',
      final:'Start with CORE7. Duel fast in HERO’S DUEL. Command the 3 Rivers in 三川 MIKAWA.',
      finalSmall:'myClover · HERO’S DUEL · CORE7 · 三川 MIKAWA · 0% RNG · 100% Decisions'
    },
    th:{
      eyebrow:'3 เกมทางการ · พร้อมเล่นตั้งแต่วันแรก',
      title:'มือ 7 ใบที่เลือกเอง เล่นได้เป็น 3 เกมเต็ม',
      lead:'แนะนำให้เริ่มจาก CORE7 จากนั้นเลือก HERO’S DUEL เมื่ออยากดวลเร็ว หรือเข้าสู่ 三川 MIKAWA เมื่ออยากเล่นสงครามวางตำแหน่งที่ลึกที่สุด ทุกใบเกิดจากการเลือก ทุกผลลัพธ์ต้องรับเอง',
      red:{badge:'แดง · เร็วที่สุด',name:'HERO’S DUEL',tag:'เกมดวลความเร็วสูง',body:'เป่ายิ้งฉุบที่มีความจำ มีความเสียหาย และทางเลือกที่ลดลงเรื่อย ๆ เปิดทีละ 1 ใบ ชนะได้การ์ดคืน แพ้เสียการ์ด เสมอเสียทั้งคู่',meta:'2 ผู้เล่น · 7 ใบ · ดวลรัว'},
      green:{badge:'เขียว · เริ่มจากเกมนี้',name:'CORE7',tag:'กติกาหลัก',body:'เกมแรกที่เราแนะนำ เลือกอย่างลับ เปิดพร้อมกัน และบริหารมือ 7 ใบเดิมตลอดหลาย Rounds สอนได้ทันที แต่ลึกพอให้อ่านมนุษย์ตรงหน้าได้เรื่อย ๆ',meta:'2 ผู้เล่น · ความลึกปานกลาง · อ่านคน'},
      blue:{badge:'ฟ้า · ลึกที่สุด',name:'三川 MIKAWA',tag:'เกมกลยุทธ์ 3 สายน้ำ',body:'วางกำลังบน 3 สะพาน ยึด 2 ใน 3 ตำแหน่ง แล้ว Kill การ์ดที่ถูก Capture 1 ใบ เล่นดวล 2 คน หรือจัด Tournament 4 คนที่ทุกความสูญเสียติดตามไปถึงรอบ Final',meta:'2–4 ผู้เล่น · สงครามวางตำแหน่ง · 3 สะพาน'},
      ruleEyebrow:'การ์ดกติกา 1 ใบ · 2 ด้าน',
      ruleTitle:'เปิดมาที่ MIKAWA ก่อน แล้วพลิกเป็น CORE7 ได้ทันที',
      ruleBody:'ทุกกล่องมี Rule Cards หน้าหลังเหมือนกัน 4 ใบ ให้ผู้เล่นถือคนละ 1 ใบ ด้าน MIKAWA รวมกติกา HERO’S DUEL ไว้ครบ จึงเล่น 3 เกมทางการได้ตั้งแต่มือแรก',
      flip:'แตะเพื่อพลิก · MIKAWA / CORE7',
      frontAlt:'การ์ดกติกาภาพ 三川 MIKAWA และ HERO’S DUEL',
      backAlt:'การ์ดกติกาภาพ CORE7',
      sideFront:'ด้านหน้า · MIKAWA + HERO’S DUEL',
      sideBack:'ด้านหลัง · CORE7',
      promise:['10 วิ','เรียนรู้ CORE7','7 ใบ','มือที่เลือกเอง','สุ่ม 0%','ตัดสินใจ 100%','3 เกม','ระบบเดียวกัน'],
      hero:'ระบบเกมพกพาที่เริ่มจากการ์ด 7 ใบซึ่งคุณเลือกเอง เล่นได้ 3 เกมทางการ ตั้งแต่การดวลรวดเร็วไปจนถึงสงคราม 3 สายน้ำ โดยไม่มีการสุ่มแม้แต่ครั้งเดียว',
      micro:'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · Lucky Card 1 ใบ · CORE Cards 4 ใบ',
      boxTitle:'การ์ด 37 ใบ 3 เกมทางการ ในกล่องพกพา 1 กล่อง',
      boxLine:'ระบบเกม 33 ใบ + CORE Cards ที่เล่นได้จริงอีก 4 ใบ',
      boxItems:[
        ['28','Word Cards','แดง เขียว ฟ้า และเทา สีละ 7 ใบ การ์ดละ 1 Keyword ใช้ภาษาเดียวกันได้กับทุกเกมทางการ'],
        ['04','Rule Cards แบบหน้าหลัง','ด้านหนึ่งคือ MIKAWA + HERO’S DUEL อีกด้านคือ CORE7 ผู้เล่นแต่ละคนถือคู่มือภาพของตัวเองได้ทันที'],
        ['01','Lucky Card','QR ข้อความอวยพรให้โชคดี และการ์ตูน 4 ช่องที่แสดงว่าการ์ด myClover ใบเดียวกลายเป็นเกมได้หลายแบบ'],
        ['04','CORE Cards','BODY · SOUL · MIND · CRAFT เป็นการ์ด Full Art ที่นำมาเล่นได้จริง และเป็น Foil ในทุกกล่อง Kickstarter']
      ],
      product:'กล่องพกพา 1 กล่อง · ระบบเกม 33 ใบ · CORE Cards 4 ใบ · 3 เกมทางการ',
      final:'เริ่มจาก CORE7 ดวลเร็วด้วย HERO’S DUEL หรือบัญชาการ 3 สายน้ำใน 三川 MIKAWA',
      finalSmall:'myClover · HERO’S DUEL · CORE7 · 三川 MIKAWA · สุ่ม 0% · ตัดสินใจ 100%'
    }
  };

  function injectStyles(){
    if(q('#'+STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #official-games{padding:clamp(76px,9vw,132px) 0!important;background:linear-gradient(180deg,#f7f0e2 0%,#efe2cb 100%)!important;color:#10271d!important;overflow:hidden!important}
      #official-games:before{content:'03'!important;right:-.02em!important;top:-.2em!important;color:rgba(6,39,24,.035)!important}
      #official-games .ogv7-head{max-width:980px;margin:0 auto clamp(36px,5vw,66px);text-align:center;position:relative}
      #official-games .ogv7-head .eyebrow{color:#8a5d15!important}
      #official-games .ogv7-head h2{margin:.26em 0 .28em;font-size:clamp(38px,5.6vw,74px);line-height:1.01;letter-spacing:-.055em;color:#08251a}
      #official-games .ogv7-head>p:last-child{max-width:800px;margin:0 auto;color:#40534a;font-size:clamp(17px,1.9vw,22px);line-height:1.66}
      #official-games .ogv7-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(16px,2.1vw,26px);position:relative}
      #official-games .ogv7-game{min-height:390px;padding:clamp(28px,3.3vw,42px);border-radius:25px;display:flex;flex-direction:column;position:relative;overflow:hidden;box-shadow:0 24px 64px -38px rgba(5,25,18,.7);isolation:isolate}
      #official-games .ogv7-game:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,rgba(255,255,255,.15),transparent 34%);z-index:-1}
      #official-games .ogv7-game.red{background:linear-gradient(150deg,#7e1d17,#3b0d0b);color:#fff}
      #official-games .ogv7-game.green{background:linear-gradient(150deg,#0d5638,#062718);color:#fff;outline:3px solid rgba(201,168,92,.68);outline-offset:-3px}
      #official-games .ogv7-game.blue{background:linear-gradient(150deg,#0b3d67,#071d35);color:#fff}
      #official-games .ogv7-badge{align-self:flex-start;padding:8px 11px;border:1px solid rgba(255,255,255,.24);border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#f4d184}
      #official-games .ogv7-game h3{margin:auto 0 .12em;font-size:clamp(38px,4.5vw,62px);line-height:.94;letter-spacing:-.052em;color:#fff}
      #official-games .ogv7-game.blue h3{font-size:clamp(34px,3.9vw,54px)}
      #official-games .ogv7-tag{margin-bottom:20px;font-size:11px;font-weight:900;letter-spacing:.16em;color:#f4d184;text-transform:uppercase}
      #official-games .ogv7-game p{margin:0 0 28px;color:rgba(255,255,255,.82);font-size:clamp(15px,1.35vw,18px);line-height:1.62}
      #official-games .ogv7-game small{margin-top:auto;color:rgba(255,255,255,.62);font-size:10px;font-weight:850;letter-spacing:.1em;line-height:1.5}
      #official-games .ogv7-start{position:absolute;top:18px;right:18px;padding:8px 11px;border-radius:999px;background:#d8b35f;color:#08251a;font-size:10px;font-weight:950;letter-spacing:.11em;text-transform:uppercase;box-shadow:0 10px 30px rgba(0,0,0,.22)}

      #official-games .ogv7-rule{margin-top:clamp(34px,5vw,62px);padding:clamp(24px,4vw,48px);display:grid;grid-template-columns:minmax(300px,.72fr) minmax(0,1fr);gap:clamp(30px,5vw,72px);align-items:center;border:1px solid rgba(6,39,24,.14);border-radius:28px;background:rgba(255,255,255,.58);box-shadow:0 28px 80px -56px rgba(6,39,24,.7)}
      #official-games .ogv7-flip{display:block;width:min(100%,410px);margin:0 auto;padding:0;border:0;background:none;color:inherit;cursor:pointer;perspective:1800px}
      #official-games .ogv7-stage{display:grid;transform-style:preserve-3d;transition:transform .72s cubic-bezier(.2,.75,.2,1);filter:drop-shadow(0 24px 28px rgba(5,24,17,.23))}
      #official-games .ogv7-flip[data-flipped='true'] .ogv7-stage{transform:rotateY(180deg)}
      #official-games .ogv7-face{grid-area:1/1;display:block;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:18px;overflow:hidden;background:#061d2d}
      #official-games .ogv7-face.back{transform:rotateY(180deg);background:#06321f}
      #official-games .ogv7-face img{display:block;width:100%;height:auto;aspect-ratio:1061/1482;object-fit:contain}
      #official-games .ogv7-flip-hint{display:inline-flex;margin-top:18px;padding:9px 13px;border-radius:999px;background:#082a1d;color:#fff;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
      #official-games .ogv7-rule-copy .eyebrow{color:#8a5d15!important}
      #official-games .ogv7-rule-copy h3{margin:.3em 0 .35em;font-size:clamp(31px,4vw,54px);line-height:1.04;letter-spacing:-.045em;color:#08251a}
      #official-games .ogv7-rule-copy>p{margin:0;color:#40534a;font-size:clamp(16px,1.55vw,20px);line-height:1.7}
      #official-games .ogv7-sides{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
      #official-games .ogv7-sides span{padding:14px 16px;border-radius:14px;background:#fff;border:1px solid rgba(6,39,24,.11);color:#18372a;font-size:11px;font-weight:900;letter-spacing:.08em;text-align:center}

      @media(max-width:900px){
        #official-games .ogv7-grid{grid-template-columns:1fr}
        #official-games .ogv7-game{min-height:300px}
        #official-games .ogv7-rule{grid-template-columns:1fr}
      }
      @media(max-width:680px){
        #official-games .ogv7-head{text-align:left}
        #official-games .ogv7-head>p:last-child{margin-left:0}
        #official-games .ogv7-game{min-height:285px;border-radius:20px;padding:28px 24px}
        #official-games .ogv7-rule{padding:24px 18px;border-radius:22px}
        #official-games .ogv7-sides{grid-template-columns:1fr}
        #official-games .ogv7-flip{width:min(92vw,390px)}
      }
      @media(prefers-reduced-motion:reduce){#official-games .ogv7-stage{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function officialMarkup(c){
    return `<div class="wrap">
      <div class="ogv7-head reveal is-visible">
        <p class="eyebrow">${c.eyebrow}</p>
        <h2>${c.title}</h2>
        <p>${c.lead}</p>
      </div>
      <div class="ogv7-grid">
        <article class="ogv7-game red reveal is-visible">
          <span class="ogv7-badge">${c.red.badge}</span>
          <h3>${c.red.name}</h3><b class="ogv7-tag">${c.red.tag}</b>
          <p>${c.red.body}</p><small>${c.red.meta}</small>
        </article>
        <article class="ogv7-game green reveal is-visible">
          <span class="ogv7-badge">${c.green.badge}</span><span class="ogv7-start">START HERE</span>
          <h3>${c.green.name}</h3><b class="ogv7-tag">${c.green.tag}</b>
          <p>${c.green.body}</p><small>${c.green.meta}</small>
        </article>
        <article class="ogv7-game blue reveal is-visible">
          <span class="ogv7-badge">${c.blue.badge}</span>
          <h3>${c.blue.name}</h3><b class="ogv7-tag">${c.blue.tag}</b>
          <p>${c.blue.body}</p><small>${c.blue.meta}</small>
        </article>
      </div>
      <div class="ogv7-rule reveal is-visible">
        <button class="ogv7-flip" type="button" data-flipped="false" aria-pressed="false" aria-label="${c.flip}">
          <span class="ogv7-stage">
            <span class="ogv7-face front"><img src="/core7/assets/mikawa-rule.webp?v=${VERSION}" alt="${c.frontAlt}" loading="lazy"></span>
            <span class="ogv7-face back"><img src="/core7/assets/core7-rule.webp?v=${VERSION}" alt="${c.backAlt}" loading="lazy"></span>
          </span>
          <span class="ogv7-flip-hint">↻ ${c.flip}</span>
        </button>
        <div class="ogv7-rule-copy">
          <p class="eyebrow">${c.ruleEyebrow}</p>
          <h3>${c.ruleTitle}</h3>
          <p>${c.ruleBody}</p>
          <div class="ogv7-sides"><span>${c.sideFront}</span><span>${c.sideBack}</span></div>
        </div>
      </div>
    </div>`;
  }

  function wireFlip(section){
    const button=section.querySelector('.ogv7-flip');
    if(!button||button.dataset.wired==='true') return;
    button.dataset.wired='true';
    button.addEventListener('click',()=>{
      const next=button.dataset.flipped!=='true';
      button.dataset.flipped=String(next);
      button.setAttribute('aria-pressed',String(next));
    });
  }

  function ensureOfficialGames(){
    const lang=isThai()?'th':'en';
    const c=copy[lang];
    let section=q('#official-games');
    if(!section){
      const anchor=q('#tournament')||q('#game');
      if(!anchor||!anchor.parentNode) return;
      section=document.createElement('section');
      section.id='official-games';
      section.className='official-games section-cream';
      anchor.insertAdjacentElement('afterend',section);
    }
    if(section.dataset.threeGamesV7!==lang||!section.querySelector('.ogv7-grid')){
      section.innerHTML=officialMarkup(c);
      section.dataset.threeGamesV7=lang;
    }
    wireFlip(section);
  }

  function setText(selector,value){
    const node=q(selector);
    if(node&&node.textContent!==value) node.textContent=value;
  }

  function applyGlobalCopy(){
    const c=copy[isThai()?'th':'en'];
    document.title=isThai()?'myClover — 3 เกมทางการ · สุ่ม 0%':'myClover — 3 Official Games · 0% RNG';
    const description=q('meta[name="description"]');
    const ogTitle=q('meta[property="og:title"]');
    const ogDescription=q('meta[property="og:description"]');
    if(description) description.setAttribute('content',isThai()?'เลือกมือ 7 ใบแล้วเล่น 3 เกมทางการที่ไม่มีการสุ่ม: HERO’S DUEL, CORE7 และ 三川 MIKAWA':'Choose a 7-card hand and play 3 official zero-randomness games: HERO’S DUEL, CORE7 and 三川 MIKAWA.');
    if(ogTitle) ogTitle.setAttribute('content',isThai()?'myClover — 3 เกมทางการ · สุ่ม 0%':'myClover — 3 Official Games · 0% RNG');
    if(ogDescription) ogDescription.setAttribute('content',isThai()?'มือเดียว 3 ระดับความลึก ทุกใบเกิดจากการเลือก':'One chosen hand. Three depths. Every card is chosen.');

    const brand=q('.brand > span:not(.brand-mark)');
    if(brand) brand.innerHTML='myClover <b>· HERO’S DUEL + CORE7 + 三川 MIKAWA</b>';
    setText('.hero-lead',c.hero);
    setText('.micro-proof',c.micro);
    const seal=q('.hero-seal');
    if(seal) seal.innerHTML='<span>THE FIRST HAND</span><b>37 CARDS</b><small>3 OFFICIAL GAMES</small>';

    const promise=q('.promise-grid');
    if(promise){
      const p=c.promise;
      const html=`<article><strong>${p[0]}</strong><span>${p[1]}</span></article><article><strong>${p[2]}</strong><span>${p[3]}</span></article><article><strong>${p[4]}</strong><span>${p[5]}</span></article><article><strong>${p[6]}</strong><span>${p[7]}</span></article>`;
      if(promise.innerHTML!==html) promise.innerHTML=html;
    }

    const boxTitle=q('#box .section-heading h2');
    if(boxTitle&&boxTitle.textContent.trim()!==c.boxTitle) boxTitle.textContent=c.boxTitle;
    setText('#box .box-system-line',c.boxLine);
    const boxGrid=q('#box .box-grid');
    if(boxGrid){
      const html=c.boxItems.map(item=>`<article class="box-item reveal is-visible"><span class="box-count">${item[0]}</span><h3>${item[1]}</h3><p>${item[2]}</p></article>`).join('');
      if(boxGrid.dataset.threeGamesV7!==(isThai()?'th':'en')){
        boxGrid.innerHTML=html;
        boxGrid.dataset.threeGamesV7=isThai()?'th':'en';
      }
    }

    setText('#pledges .product-definition span',c.product);
    setText('.final-cta .final-inner>p:not(.eyebrow)',c.final);
    setText('.final-cta small',c.finalSmall);

    const rows=Array.from(document.querySelectorAll('#system-at-a-glance .system-matrix-row'));
    rows.forEach(row=>{
      const yes=row.querySelector('.system-matrix-cell.yes span:last-child');
      if(!yes) return;
      if(/official games|เกมทางการ/i.test(yes.textContent||'')) yes.textContent=isThai()?'3 เกมทางการ: HERO’S DUEL · CORE7 · 三川 MIKAWA':'3 official games: HERO’S DUEL · CORE7 · 三川 MIKAWA';
    });
  }

  function apply(){
    injectStyles();
    ensureOfficialGames();
    applyGlobalCopy();
  }

  function init(){
    apply();
    [60,180,420,900,1700,2900,4300,6200].forEach(delay=>setTimeout(apply,delay));
    new MutationObserver(()=>setTimeout(apply,24)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
