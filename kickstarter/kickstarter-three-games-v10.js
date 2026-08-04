(function(){
  'use strict';

  const VERSION='20260804-three-games-v10';
  const STYLE_ID='kickstarter-three-games-v10-styles';
  const FONT_ID='kickstarter-anuphan-v10';
  const q=selector=>document.querySelector(selector);
  let activeLanguage='en';

  const copy={
    en:{
      eyebrow:'THREE OFFICIAL GAMES · DAY ONE',
      title:'One chosen hand. Three complete games.',
      lead:'The same 7 cards move through 3 levels of depth: fast in Red, balanced in Green and deepest in Blue. Every card is chosen. Every result is earned.',
      games:[
        {
          color:'red',badge:'RED · FASTEST',name:'HERO’S DUEL',tag:'FAST-PACED DUEL GAME',
          body:'Rock-paper-scissors rebuilt as a rapid fight with memory, damage and shrinking options. Win and your card returns. Lose and it is discarded. A tie costs both cards.',
          meta:'2 PLAYERS · 7 CARDS · RAPID FIRE'
        },
        {
          color:'green',badge:'GREEN · START HERE',name:'CORE7',tag:'FLAGSHIP RULE',
          body:'The recommended first game. Choose in secret, reveal together and manage the same 7-card hand across Rounds. It teaches in seconds, then keeps getting deeper through the human across the table.',
          meta:'2 PLAYERS · MEDIUM DEPTH · HUMAN READ',start:'START HERE'
        },
        {
          color:'blue',badge:'BLUE · DEEPEST',name:'三川 MIKAWA',tag:'THREE-RIVER STRATEGY GAME',
          body:'Deploy across 3 bridges, capture 2 of 3 positions and kill 1 captured card. Play a 2-player war or a 4-player tournament where every loss follows you into the Final.',
          meta:'2–4 PLAYERS · POSITIONAL WAR · 3 BRIDGES'
        }
      ],
      ruleEyebrow:'ONE COLOR LANGUAGE · THREE GAMES',
      ruleTitle:'Learn CORE7 once. The same Rule Card opens two more games.',
      ruleBody:'Start with CORE7: choose, reveal and understand the 4-color cycle in seconds. Once the table knows it, turn over the same Rule Card. HERO’S DUEL makes that cycle faster; 三川 MIKAWA makes it deeper. Same cards. Same symbols. No second rules lesson.',
      flip:'FLIP THE RULE CARD',
      sideFront:'MIKAWA SIDE · MIKAWA + HERO’S DUEL',
      sideBack:'CORE7 SIDE · START HERE',
      frontAlt:'三川 MIKAWA and HERO’S DUEL visual rule card',
      backAlt:'CORE7 visual rule card',
      hero:'A pocket game system built from 7 cards you choose yourself. Play 3 official games—from a rapid duel to a full Three-River war—with 0% RNG and 100% decisions.',
      micro:'28 word cards · 4 double-sided Rule Cards · 1 Lucky Card · 4 CORE Cards',
      promise:[['10 sec','to learn CORE7'],['7 cards','your chosen hand'],['0% RNG','100% Decisions'],['3 games','one shared system']],
      boxTitle:'Thirty-seven cards.<br>Three official games. One pocket box.',
      boxLine:'33-card game system + 4 playable CORE Cards.',
      boxItems:[
        ['28','Word Cards','Seven Red, Green, Blue and Gray cards. One keyword per card. One shared language across every official game.'],
        ['04','Double-Sided Rule Cards','CORE7 on one side. MIKAWA + HERO’S DUEL on the other. One complete visual guide for each player.'],
        ['01','Lucky Card','A QR, a good-luck message and a four-panel story showing how one myClover card can become many different games.'],
        ['04','CORE Cards','BODY · SOUL · MIND · CRAFT as playable full-art cards—foil in every Kickstarter box.']
      ],
      product:'1 pocket box · 33-card game system · 4 CORE Cards · 3 official games',
      final:'Start with CORE7. Duel fast in HERO’S DUEL. Command the 3 Rivers in 三川 MIKAWA.',
      finalSmall:'myClover · HERO’S DUEL · CORE7 · 三川 MIKAWA · 0% RNG · 100% Decisions',
      matrix:'3 official games: HERO’S DUEL · CORE7 · 三川 MIKAWA'
    },
    th:{
      eyebrow:'3 เกมทางการ · พร้อมเล่นตั้งแต่วันแรก',
      title:'มือ 7 ใบที่เลือกเอง เล่นได้เป็น 3 เกมเต็ม',
      lead:'การ์ด 7 ใบเดิมเดินทางผ่านความลึก 3 ระดับ: แดงเร็วที่สุด เขียวสมดุล และฟ้าลึกที่สุด ทุกใบเกิดจากการเลือก ทุกผลลัพธ์ต้องรับเอง',
      games:[
        {
          color:'red',badge:'แดง · เร็วที่สุด',name:'HERO’S DUEL',tag:'เกมดวลความเร็วสูง',
          body:'เป่ายิ้งฉุบที่ถูกสร้างใหม่ให้เป็นการต่อสู้รัว ๆ ซึ่งมีทั้งความจำ ความเสียหาย และทางเลือกที่ลดลงเรื่อย ๆ ชนะได้การ์ดคืน แพ้เสียการ์ด เสมอเสียทั้งคู่',
          meta:'2 ผู้เล่น · 7 ใบ · ดวลรัว'
        },
        {
          color:'green',badge:'เขียว · เริ่มจากเกมนี้',name:'CORE7',tag:'กติกาหลัก',
          body:'เกมแรกที่เราแนะนำ เลือกอย่างลับ เปิดพร้อมกัน และบริหารมือ 7 ใบเดิมตลอดหลาย Rounds สอนได้ภายในไม่กี่วินาที แล้วลึกขึ้นเรื่อย ๆ จากมนุษย์ตรงหน้า',
          meta:'2 ผู้เล่น · ความลึกปานกลาง · อ่านคน',start:'เริ่มจากเกมนี้'
        },
        {
          color:'blue',badge:'ฟ้า · ลึกที่สุด',name:'三川 MIKAWA',tag:'เกมกลยุทธ์ 3 สายน้ำ',
          body:'วางกำลังบน 3 สะพาน ยึด 2 ใน 3 ตำแหน่ง แล้ว Kill การ์ดที่ถูก Capture 1 ใบ เล่นสงคราม 2 คน หรือ Tournament 4 คนที่ทุกความสูญเสียติดตามไปถึงรอบ Final',
          meta:'2–4 ผู้เล่น · สงครามวางตำแหน่ง · 3 สะพาน'
        }
      ],
      ruleEyebrow:'ภาษาสีเดียว · 3 เกมเต็ม',
      ruleTitle:'เรียน CORE7 เพียงครั้งเดียว แล้ว Rule Card ใบเดิมเปิดอีก 2 เกมให้ทันที',
      ruleBody:'เริ่มจาก CORE7: เลือก เปิด และเข้าใจวงจร 4 สีได้ภายในไม่กี่วินาที เมื่อทั้งโต๊ะเล่นเป็นแล้ว พลิก Rule Card ใบเดิมไปอีกด้าน HERO’S DUEL ทำให้วงจรเดิมเร็วและมันขึ้น ส่วน 三川 MIKAWA ทำให้มันลึกขึ้น การ์ดเดิม สัญลักษณ์เดิม ไม่ต้องเรียนระบบใหม่',
      flip:'พลิกการ์ดกติกา',
      sideFront:'ด้าน MIKAWA · MIKAWA + HERO’S DUEL',
      sideBack:'ด้าน CORE7 · เริ่มจากเกมนี้',
      frontAlt:'การ์ดกติกาภาพ 三川 MIKAWA และ HERO’S DUEL',
      backAlt:'การ์ดกติกาภาพ CORE7',
      hero:'ระบบเกมพกพาที่เริ่มจากการ์ด 7 ใบซึ่งคุณเลือกเอง เล่นได้ 3 เกมทางการ ตั้งแต่การดวลรวดเร็วไปจนถึงสงคราม 3 สายน้ำ โดยไม่มีการสุ่มแม้แต่ครั้งเดียว',
      micro:'การ์ดคำ 28 ใบ · Rule Cards หน้าหลัง 4 ใบ · Lucky Card 1 ใบ · CORE Cards 4 ใบ',
      promise:[['10 วิ','เรียนรู้ CORE7'],['7 ใบ','มือที่เลือกเอง'],['สุ่ม 0%','ตัดสินใจ 100%'],['3 เกม','ระบบเดียวกัน']],
      boxTitle:'การ์ด 37 ใบ<br>3 เกมทางการ ในกล่องพกพา 1 กล่อง',
      boxLine:'ระบบเกม 33 ใบ + CORE Cards ที่เล่นได้จริงอีก 4 ใบ',
      boxItems:[
        ['28','Word Cards','แดง เขียว ฟ้า และเทา สีละ 7 ใบ การ์ดละ 1 Keyword ใช้ภาษาเดียวกันได้กับทุกเกมทางการ'],
        ['04','Rule Cards แบบหน้าหลัง','ด้านหนึ่งคือ CORE7 อีกด้านคือ MIKAWA + HERO’S DUEL ผู้เล่นแต่ละคนถือคู่มือภาพของตัวเองได้ทันที'],
        ['01','Lucky Card','QR ข้อความอวยพรให้โชคดี และการ์ตูน 4 ช่องที่แสดงว่าการ์ด myClover ใบเดียวกลายเป็นเกมได้หลายแบบ'],
        ['04','CORE Cards','BODY · SOUL · MIND · CRAFT เป็นการ์ด Full Art ที่นำมาเล่นได้จริง และเป็น Foil ในทุกกล่อง Kickstarter']
      ],
      product:'กล่องพกพา 1 กล่อง · ระบบเกม 33 ใบ · CORE Cards 4 ใบ · 3 เกมทางการ',
      final:'เริ่มจาก CORE7 ดวลเร็วด้วย HERO’S DUEL หรือบัญชาการ 3 สายน้ำใน 三川 MIKAWA',
      finalSmall:'myClover · HERO’S DUEL · CORE7 · 三川 MIKAWA · สุ่ม 0% · ตัดสินใจ 100%',
      matrix:'3 เกมทางการ: HERO’S DUEL · CORE7 · 三川 MIKAWA'
    }
  };

  function loadThaiFont(){
    if(document.getElementById(FONT_ID)) return;
    const link=document.createElement('link');
    link.id=FONT_ID;
    link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html[lang='th'] body,
      html[lang='th'] button,
      html[lang='th'] input,
      html[lang='th'] select,
      html[lang='th'] textarea{
        font-family:'Anuphan','Noto Sans Thai','Leelawadee UI',sans-serif!important;
      }
      html[lang='th'] h1,
      html[lang='th'] h2,
      html[lang='th'] h3,
      html[lang='th'] h4,
      html[lang='th'] strong,
      html[lang='th'] b{
        font-family:'Anuphan','Noto Sans Thai','Leelawadee UI',sans-serif!important;
        letter-spacing:-.025em;
      }

      #official-games[data-three-games-v10]{
        padding:clamp(76px,9vw,132px) 0!important;
        background:linear-gradient(180deg,#f7f0e2 0%,#efe2cb 100%)!important;
        color:#10271d!important;
        position:relative;
        overflow:hidden!important;
        visibility:visible!important;
      }
      #official-games[data-three-games-v10]:before{
        content:'03';position:absolute;right:-.02em;top:-.2em;
        font-size:clamp(150px,28vw,430px);font-weight:900;line-height:1;
        color:rgba(6,39,24,.035);pointer-events:none;
      }
      #official-games .og10-head{max-width:980px;margin:0 auto clamp(38px,5vw,66px);text-align:center;position:relative}
      #official-games .og10-head .eyebrow{color:#8a5d15!important}
      #official-games .og10-head h2{margin:.26em 0 .28em;font-size:clamp(38px,5.6vw,74px);line-height:1.01;letter-spacing:-.055em;color:#08251a}
      #official-games .og10-head>p:last-child{max-width:820px;margin:0 auto;color:#40534a;font-size:clamp(17px,1.9vw,22px);line-height:1.66}
      #official-games .og10-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(16px,2.1vw,26px);position:relative}
      #official-games .og10-game{min-height:390px;padding:clamp(28px,3.3vw,42px);border-radius:25px;display:flex;flex-direction:column;position:relative;overflow:hidden;box-shadow:0 24px 64px -38px rgba(5,25,18,.7);isolation:isolate}
      #official-games .og10-game:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,rgba(255,255,255,.15),transparent 34%);z-index:-1}
      #official-games .og10-game.red{background:linear-gradient(150deg,#7e1d17,#3b0d0b);color:#fff}
      #official-games .og10-game.green{background:linear-gradient(150deg,#0d5638,#062718);color:#fff;outline:3px solid rgba(201,168,92,.68);outline-offset:-3px}
      #official-games .og10-game.blue{background:linear-gradient(150deg,#0b3d67,#071d35);color:#fff}
      #official-games .og10-badge{align-self:flex-start;padding:8px 11px;border:1px solid rgba(255,255,255,.24);border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#f4d184}
      #official-games .og10-start{position:absolute;top:18px;right:18px;padding:8px 11px;border-radius:999px;background:#d8b35f;color:#08251a;font-size:10px;font-weight:950;letter-spacing:.11em;text-transform:uppercase;box-shadow:0 10px 30px rgba(0,0,0,.22)}
      #official-games .og10-game h3{margin:auto 0 .12em;font-size:clamp(38px,4.5vw,62px);line-height:.94;letter-spacing:-.052em;color:#fff}
      #official-games .og10-game.blue h3{font-size:clamp(34px,3.9vw,54px)}
      #official-games .og10-tag{margin-bottom:20px;font-size:11px;font-weight:900;letter-spacing:.16em;color:#f4d184;text-transform:uppercase}
      #official-games .og10-game p{margin:0 0 28px;color:rgba(255,255,255,.84);font-size:clamp(15px,1.35vw,18px);line-height:1.62}
      #official-games .og10-game small{margin-top:auto;color:rgba(255,255,255,.65);font-size:10px;font-weight:850;letter-spacing:.1em;line-height:1.5}

      #official-games .og10-rule{margin-top:clamp(34px,5vw,62px);padding:clamp(24px,4vw,48px);display:grid;grid-template-columns:minmax(300px,.72fr) minmax(0,1fr);gap:clamp(30px,5vw,72px);align-items:center;border:1px solid rgba(6,39,24,.14);border-radius:28px;background:rgba(255,255,255,.58);box-shadow:0 28px 80px -56px rgba(6,39,24,.7)}
      #official-games .og10-flip-shell{width:min(100%,410px);margin:0 auto;perspective:1800px;text-align:center}
      #official-games .og10-flip-card{display:grid;width:100%;padding:0;border:0;background:none;cursor:pointer;transform-style:preserve-3d;transition:transform .72s cubic-bezier(.2,.75,.2,1);filter:drop-shadow(0 24px 28px rgba(5,24,17,.23))}
      #official-games .og10-flip-card.flipped{transform:rotateY(180deg)}
      #official-games .og10-flip-face{grid-area:1/1;display:block;overflow:hidden;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#061d2d}
      #official-games .og10-flip-back{transform:rotateY(180deg);background:#06321f}
      #official-games .og10-flip-face img{display:block;width:100%;height:auto;aspect-ratio:1061/1482;object-fit:contain}
      #official-games .og10-flip-button{margin-top:18px;padding:10px 15px;border:0;border-radius:999px;background:#082a1d;color:#fff;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;cursor:pointer}
      #official-games .og10-rule-copy .eyebrow{color:#8a5d15!important}
      #official-games .og10-rule-copy h3{margin:.3em 0 .35em;font-size:clamp(31px,4vw,54px);line-height:1.04;letter-spacing:-.045em;color:#08251a}
      #official-games .og10-rule-copy>p{margin:0;color:#40534a;font-size:clamp(16px,1.55vw,20px);line-height:1.7}
      #official-games .og10-sides{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
      #official-games .og10-sides span{padding:14px 16px;border-radius:14px;background:#fff;border:1px solid rgba(6,39,24,.11);color:#18372a;font-size:11px;font-weight:900;letter-spacing:.08em;text-align:center}

      @media(max-width:900px){
        #official-games .og10-grid{grid-template-columns:1fr}
        #official-games .og10-game{min-height:300px}
        #official-games .og10-rule{grid-template-columns:1fr}
      }
      @media(max-width:680px){
        #official-games .og10-head{text-align:left}
        #official-games .og10-head>p:last-child{margin-left:0}
        #official-games .og10-game{min-height:285px;border-radius:20px;padding:28px 24px}
        #official-games .og10-rule{padding:24px 18px;border-radius:22px}
        #official-games .og10-sides{grid-template-columns:1fr}
        #official-games .og10-flip-shell{width:min(92vw,390px)}
      }
      @media(prefers-reduced-motion:reduce){#official-games .og10-flip-card{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function gameMarkup(game){
    return `<article class="og10-game ${game.color} reveal is-visible">
      <span class="og10-badge">${game.badge}</span>
      ${game.start?`<span class="og10-start">${game.start}</span>`:''}
      <h3>${game.name}</h3>
      <b class="og10-tag">${game.tag}</b>
      <p>${game.body}</p>
      <small>${game.meta}</small>
    </article>`;
  }

  function officialMarkup(language){
    const c=copy[language];
    return `<div class="wrap">
      <div class="og10-head reveal is-visible">
        <p class="eyebrow">${c.eyebrow}</p>
        <h2>${c.title}</h2>
        <p>${c.lead}</p>
      </div>
      <div class="og10-grid">${c.games.map(gameMarkup).join('')}</div>
      <div class="og10-rule reveal is-visible">
        <div class="og10-flip-shell">
          <div class="og10-flip-card" role="button" tabindex="0" aria-label="${c.flip}">
            <div class="og10-flip-face og10-flip-front"><img src="/core7/assets/mikawa-rule.webp?v=${VERSION}" alt="${c.frontAlt}" loading="eager" decoding="async"></div>
            <div class="og10-flip-face og10-flip-back"><img src="/core7/assets/core7-rule.webp?v=${VERSION}" alt="${c.backAlt}" loading="eager" decoding="async"></div>
          </div>
          <button class="og10-flip-button" type="button">↻ ${c.flip}</button>
        </div>
        <div class="og10-rule-copy">
          <p class="eyebrow">${c.ruleEyebrow}</p>
          <h3>${c.ruleTitle}</h3>
          <p>${c.ruleBody}</p>
          <div class="og10-sides"><span>${c.sideFront}</span><span>${c.sideBack}</span></div>
        </div>
      </div>
    </div>`;
  }

  function wireFlip(section){
    const card=section.querySelector('.og10-flip-card');
    const button=section.querySelector('.og10-flip-button');
    if(!card||!button) return;
    const toggle=()=>card.classList.toggle('flipped');
    card.addEventListener('click',toggle);
    card.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}
    });
    button.addEventListener('click',toggle);
  }

  function ensureOfficialGames(language){
    let section=q('#official-games');
    if(!section){
      const anchor=q('#game');
      if(!anchor||!anchor.parentNode) return;
      section=document.createElement('section');
      section.id='official-games';
      anchor.insertAdjacentElement('afterend',section);
    }
    section.className='official-games section-cream';
    section.dataset.threeGamesV10=language;
    section.innerHTML=officialMarkup(language);
    wireFlip(section);
  }

  function setText(selector,value){
    const node=q(selector);
    if(node&&node.textContent!==value) node.textContent=value;
  }

  function setHTML(selector,value){
    const node=q(selector);
    if(node&&node.innerHTML!==value) node.innerHTML=value;
  }

  function setMeta(selector,value){
    const node=q(selector);
    if(node&&node.getAttribute('content')!==value) node.setAttribute('content',value);
  }

  function applyGlobalCopy(language){
    const c=copy[language];
    document.title=language==='th'?'myClover — 3 เกมทางการ · สุ่ม 0%':'myClover — 3 Official Games · 0% RNG';
    setMeta('meta[name="description"]',language==='th'?'เลือกมือ 7 ใบแล้วเล่น 3 เกมทางการที่ไม่มีการสุ่ม: HERO’S DUEL, CORE7 และ 三川 MIKAWA':'Choose a 7-card hand and play 3 official zero-randomness games: HERO’S DUEL, CORE7 and 三川 MIKAWA.');
    setMeta('meta[property="og:title"]',language==='th'?'myClover — 3 เกมทางการ · สุ่ม 0%':'myClover — 3 Official Games · 0% RNG');
    setMeta('meta[property="og:description"]',language==='th'?'มือเดียว 3 ระดับความลึก ทุกใบเกิดจากการเลือก':'One chosen hand. Three depths. Every card is chosen.');

    const brand=q('.brand > span:not(.brand-mark)');
    if(brand) brand.innerHTML='myClover <b>· HERO’S DUEL + CORE7 + 三川 MIKAWA</b>';
    setText('.hero-lead',c.hero);
    setText('.micro-proof',c.micro);
    setHTML('.hero-seal','<span>THE FIRST HAND</span><b>37 CARDS</b><small>3 OFFICIAL GAMES</small>');

    const promise=q('.promise-grid');
    if(promise){
      const html=c.promise.map(item=>`<article><strong>${item[0]}</strong><span>${item[1]}</span></article>`).join('');
      if(promise.innerHTML!==html) promise.innerHTML=html;
    }

    setHTML('#box .section-heading h2',c.boxTitle);
    setText('#box .box-system-line',c.boxLine);
    const boxGrid=q('#box .box-grid');
    if(boxGrid){
      const html=c.boxItems.map(item=>`<article class="box-item reveal is-visible"><span class="box-count">${item[0]}</span><h3>${item[1]}</h3><p>${item[2]}</p></article>`).join('');
      if(boxGrid.innerHTML!==html) boxGrid.innerHTML=html;
    }

    setText('#pledges .product-definition span',c.product);
    setText('.final-cta .final-inner>p:not(.eyebrow)',c.final);
    setText('.final-cta small',c.finalSmall);

    document.querySelectorAll('#system-at-a-glance .system-matrix-cell.yes span:last-child').forEach(node=>{
      if(/official games|เกมทางการ|CORE7\s*\+/i.test(node.textContent||'')){
        if(node.textContent!==c.matrix) node.textContent=c.matrix;
      }
    });
  }

  function applyLanguage(language,{rebuildSection=true}={}){
    activeLanguage=language==='th'?'th':'en';
    if(rebuildSection) ensureOfficialGames(activeLanguage);
    applyGlobalCopy(activeLanguage);
  }

  function bindLanguageControls(){
    document.addEventListener('click',event=>{
      const button=event.target.closest&&event.target.closest('.ksv2-lang button[data-lang]');
      if(!button) return;
      const language=button.dataset.lang==='th'?'th':'en';
      activeLanguage=language;
      setTimeout(()=>applyLanguage(language),0);
    });
  }

  function init(){
    loadThaiFont();
    injectStyles();
    bindLanguageControls();

    // The canonical Kickstarter language engine starts every load in English.
    // Never click a language button or rewrite <html lang> here.
    requestAnimationFrame(()=>applyLanguage('en'));

    // Older campaign patches still perform a few delayed hydration passes.
    // Re-apply the same chosen language only; this never changes language state.
    [120,340,820,1540,2920,3680,4380,5200,6600].forEach(delay=>{
      setTimeout(()=>applyLanguage(activeLanguage,{rebuildSection:false}),delay);
    });
  }

  injectStyles();
  ensureOfficialGames('en');

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
