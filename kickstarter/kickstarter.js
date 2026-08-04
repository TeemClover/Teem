(function(){
  'use strict';

  const VERSION = '20260804-final';
  const DISCORD_URL = 'https://discord.gg/A5nmMqvTm';
  const STORAGE_KEY = 'mc_kickstarter_pledge_preview_final';
  const q = selector => document.querySelector(selector);
  const qa = selector => Array.from(document.querySelectorAll(selector));
  let language = 'en';
  let translations = [];
  let selectedPledge = null;

  document.documentElement.lang = 'en';
  const bootStyle = document.createElement('style');
  bootStyle.id = 'ks-final-boot-style';
  bootStyle.textContent = 'html.ks-final-boot body{visibility:hidden!important}';
  document.head.appendChild(bootStyle);
  document.documentElement.classList.add('ks-final-boot');

  const ENERGY_COPY = {
    RED: {
      en:{label:'RED · BODY',headline:'What makes you feel and move?',body:'Desire, Joy, Taste, Passion, Courage, Warmth and Celebration—the living energy that lets you feel, want and act.'},
      th:{label:'แดง · ร่างกาย',headline:'อะไรทำให้คุณรู้สึกและเคลื่อนไหว?',body:'ความอยาก ความสุข รสชาติ แรงปรารถนา ความกล้า ความอบอุ่น และการเฉลิมฉลอง—พลังชีวิตที่ทำให้เรารู้สึก ต้องการ และลงมือ'}
    },
    GREEN: {
      en:{label:'GREEN · SOUL',headline:'What helps you care, endure and become?',body:'Discipline, Consistency, Balance, Patience, Care, Recovery and Commitment—the inner roots that let a life keep growing.'},
      th:{label:'เขียว · จิตวิญญาณ',headline:'อะไรช่วยให้คุณดูแล อดทน และเติบโตเป็นตัวเอง?',body:'วินัย ความสม่ำเสมอ สมดุล ความอดทน การดูแล การฟื้นตัว และความตั้งใจมั่น—รากภายในที่ทำให้ชีวิตเติบโตต่อไปได้'}
    },
    BLUE: {
      en:{label:'BLUE · MIND',headline:'What helps you see and choose?',body:'Clarity, Perspective, Wisdom, Curiosity, Strategy, Reflection and Choice—the mind that turns noise into direction.'},
      th:{label:'ฟ้า · จิตใจ',headline:'อะไรช่วยให้คุณมองเห็นและเลือก?',body:'ความชัดเจน มุมมอง ปัญญา ความสงสัย กลยุทธ์ การทบทวน และการเลือก—จิตใจที่เปลี่ยนความวุ่นวายให้กลายเป็นทิศทาง'}
    },
    GRAY: {
      en:{label:'GRAY · CRAFT',headline:'What helps you turn meaning into reality?',body:'Observe, Measure, Build, Repair, Connect, Adapt and Iterate—the craft that gives intention a form the world can use.'},
      th:{label:'เทา · งานสร้าง',headline:'อะไรช่วยให้คุณเปลี่ยนความหมายให้เป็นของจริง?',body:'สังเกต วัดผล สร้าง ซ่อม เชื่อมต่อ ปรับตัว และทำซ้ำให้ดีขึ้น—งานสร้างที่เปลี่ยนเจตนาให้เป็นสิ่งที่โลกใช้งานได้'}
    }
  };

  const OFFICIAL_COPY = {
    en:{
      eyebrow:'3 OFFICIAL GAMES + INFINITE CRAFT',
      title:'Three rules we designed. Infinite games you can.',
      lead:'The same 7-card hand moves through three levels of depth. Start with Green. Move to Red for speed or Blue for the deepest positional fight. Gray belongs to the player who wants to build what comes next.',
      games:[
        {color:'red',core:'BODY',badge:'RED · FASTEST',name:'HERO’S DUEL',tag:'FAST-PACED DUEL GAME',body:'Rock-paper-scissors rebuilt as a rapid fight with memory, damage and shrinking options. Win and your card returns. Lose and it is discarded. A tie costs both cards.',meta:'2 PLAYERS · 7 CARDS · RAPID FIRE'},
        {color:'green',core:'SOUL',badge:'GREEN · START HERE',name:'CORE7',tag:'FLAGSHIP RULE',body:'The recommended first game. Choose in secret, reveal together and read the human across the table. It teaches the shared color language in seconds.',meta:'2 PLAYERS · MEDIUM DEPTH · HUMAN READ',start:'START HERE'},
        {color:'blue',core:'MIND',badge:'BLUE · DEEPEST',name:'三川 MIKAWA',tag:'THREE-RIVER STRATEGY GAME',body:'Deploy across 3 bridges, capture 2 of 3 positions and kill 1 captured card. Play a duel or a 4-player tournament where every loss follows you into the Final.',meta:'2–4 PLAYERS · POSITIONAL WAR · 3 BRIDGES'},
        {color:'gray',core:'CRAFT',badge:'GRAY · OPEN CRAFT',name:'CRAFT YOUR OWN',tag:'INFINITE POSSIBILITIES',body:'Game 4 and beyond belong to the players. Build freely with the same four colors, test it at your table and share the rule in the myClover Discord.',meta:'COMMUNITY-MADE · OPEN RULES · SHARE & REMIX',craft:true}
      ],
      ruleEyebrow:'ONE COLOR LANGUAGE · ONE RULE CARD',
      ruleTitle:'Learn CORE7 once. Then turn over the same card.',
      ruleBody:'Start with CORE7 and learn the 4-color cycle in seconds. Once the table knows it, the other side opens HERO’S DUEL and 三川 MIKAWA immediately. Same cards. Same symbols. No second system to learn.',
      flip:'FLIP THE RULE CARD',
      mikawaSide:'MIKAWA SIDE · HERO’S DUEL + MIKAWA',
      coreSide:'CORE7 SIDE · START HERE',
      discord:'SHARE A CRAFTED GAME IN DISCORD'
    },
    th:{
      eyebrow:'3 เกมทางการ + งานสร้างไม่รู้จบ',
      title:'3 กติกาที่เราออกแบบ ส่วนเกมที่เหลือเป็นของผู้เล่น',
      lead:'มือ 7 ใบเดิมเดินทางผ่านความลึก 3 ระดับ แนะนำให้เริ่มจากสีเขียว ไปสีแดงเมื่ออยากดวลเร็ว หรือสีฟ้าเมื่ออยากเข้าสู่สงครามวางตำแหน่งที่ลึกที่สุด ส่วนสีเทาเป็นพื้นที่ของคนที่อยากสร้างสิ่งต่อไป',
      games:[
        {color:'red',core:'BODY',badge:'แดง · เร็วที่สุด',name:'HERO’S DUEL',tag:'เกมดวลความเร็วสูง',body:'เป่ายิ้งฉุบที่ถูกสร้างใหม่ให้เป็นการต่อสู้รัว ๆ มีทั้งความจำ ความเสียหาย และทางเลือกที่ลดลงเรื่อย ๆ ชนะได้การ์ดคืน แพ้เสียการ์ด เสมอเสียทั้งคู่',meta:'2 ผู้เล่น · 7 ใบ · ดวลรัว'},
        {color:'green',core:'SOUL',badge:'เขียว · เริ่มจากเกมนี้',name:'CORE7',tag:'กติกาหลัก',body:'เกมแรกที่เราแนะนำ เลือกอย่างลับ เปิดพร้อมกัน และอ่านมนุษย์ตรงหน้า สอนภาษาสีร่วมกันได้ภายในไม่กี่วินาที',meta:'2 ผู้เล่น · ความลึกปานกลาง · อ่านคน',start:'เริ่มจากเกมนี้'},
        {color:'blue',core:'MIND',badge:'ฟ้า · ลึกที่สุด',name:'三川 MIKAWA',tag:'เกมกลยุทธ์ 3 สายน้ำ',body:'วางกำลังบน 3 สะพาน ยึด 2 ใน 3 ตำแหน่ง แล้ว Kill การ์ดที่ถูก Capture 1 ใบ เล่นดวลหรือจัด Tournament 4 คนที่ทุกความสูญเสียติดตามไปถึงรอบ Final',meta:'2–4 ผู้เล่น · สงครามวางตำแหน่ง · 3 สะพาน'},
        {color:'gray',core:'CRAFT',badge:'เทา · เปิดให้สร้าง',name:'CRAFT YOUR OWN',tag:'ความเป็นไปได้ไม่รู้จบ',body:'เกมที่ 4 เป็นต้นไปเป็นของผู้เล่น สร้างกติกาได้อย่างอิสระด้วย 4 สีเดิม ทดลองบนโต๊ะ แล้วนำมาแชร์ใน Discord ของ myClover',meta:'ผู้เล่นสร้างเอง · กติกาเปิด · แชร์และต่อยอด',craft:true}
      ],
      ruleEyebrow:'ภาษาสีเดียว · การ์ดกติกาใบเดียว',
      ruleTitle:'เรียน CORE7 เพียงครั้งเดียว แล้วพลิกการ์ดใบเดิม',
      ruleBody:'เริ่มจาก CORE7 และเข้าใจวงจร 4 สีได้ภายในไม่กี่วินาที เมื่อทั้งโต๊ะเล่นเป็นแล้ว อีกด้านของ Rule Card จะเปิด HERO’S DUEL และ 三川 MIKAWA ให้เล่นต่อได้ทันที การ์ดเดิม สัญลักษณ์เดิม ไม่ต้องเรียนระบบที่ 2',
      flip:'พลิกการ์ดกติกา',
      mikawaSide:'ด้าน MIKAWA · HERO’S DUEL + MIKAWA',
      coreSide:'ด้าน CORE7 · เริ่มจากเกมนี้',
      discord:'แชร์เกมที่สร้างใน Discord'
    }
  };

  const PLEDGE_COPY = {
    en:{
      heading:'Choose your First Hand.',
      lead:'Campaign prices are in USD. We ship worldwide. Shipping and applicable taxes are collected separately in the Pledge Manager after the campaign.',
      tiers:[
        {name:'Open Player',label:'DIGITAL · PRINT & PLAY',price:'3.00',desc:'Play the complete system anywhere.',items:['Print-and-play files','Digital Rule Cards','AI knowledge file','All 3 official games']},
        {name:'First 100 Hands',label:'EARLY BIRD · 100 BOXES ONLY',price:'9.99',desc:'The complete physical First Hand at the launch price.',items:['1 First Hand box','37 cards total','4 foil CORE Cards','All digital rewards'],ribbon:'FIRST 100 BOXES'},
        {name:'The First Hand',label:'1 PHYSICAL BOX',price:'11.99',desc:'One pocket box. Three official games.',items:['1 First Hand box','37 cards total','4 foil CORE Cards','MSRP $14.99'],featured:true,ribbon:'CORE PLEDGE'},
        {name:'Share Two',label:'2 PHYSICAL BOXES',price:'21.99',desc:'Keep one. Give one.',items:['2 First Hand boxes','$11.00 per box','All Kickstarter box rewards','All digital rewards']},
        {name:'Party of Four',label:'4 PHYSICAL BOXES',price:'39.99',desc:'Open four tables—or run a 4-player MIKAWA tournament.',items:['4 First Hand boxes','$10.00 per box','Facilitator quick guide','All digital rewards']},
        {name:'Culture Builder',label:'12-BOX WORKSHOP PACK',price:'107.99',desc:'Bring the four-color language into a room.',items:['12 First Hand boxes','$9.00 per box','Workshop playbook','Slides and exercises']}
      ],
      selected:'You selected',preview:'Campaign preview only. Shipping is added later in the Pledge Manager.',change:'Change selection',choose:'Choose',chosen:'Selected ✓'
    },
    th:{
      heading:'เลือก First Hand ของคุณ',
      lead:'ราคาทั้งหมดเป็นดอลลาร์สหรัฐ จัดส่งทั่วโลก โดยเก็บค่าจัดส่งและภาษีที่เกี่ยวข้องแยกภายหลังผ่าน Pledge Manager',
      tiers:[
        {name:'Open Player',label:'ดิจิทัล · พิมพ์เล่นเอง',price:'3.00',desc:'เล่นระบบเต็มได้จากทุกที่',items:['ไฟล์ Print-and-play','Rule Cards ดิจิทัล','ไฟล์ความรู้สำหรับ AI','เกมทางการครบ 3 เกม']},
        {name:'First 100 Hands',label:'EARLY BIRD · 100 กล่องแรกเท่านั้น',price:'9.99',desc:'First Hand แบบกล่องจริงในราคาเปิดตัว',items:['First Hand 1 กล่อง','การ์ดรวม 37 ใบ','CORE Cards ฟอยล์ 4 ใบ','รางวัลดิจิทัลทั้งหมด'],ribbon:'100 กล่องแรก'},
        {name:'The First Hand',label:'กล่องจริง 1 กล่อง',price:'11.99',desc:'กล่องพกพา 1 กล่อง เกมทางการ 3 เกม',items:['First Hand 1 กล่อง','การ์ดรวม 37 ใบ','CORE Cards ฟอยล์ 4 ใบ','ราคาขายปลีก $14.99'],featured:true,ribbon:'ระดับหลัก'},
        {name:'Share Two',label:'กล่องจริง 2 กล่อง',price:'21.99',desc:'เก็บไว้ 1 กล่อง มอบให้อีกคน 1 กล่อง',items:['First Hand 2 กล่อง','เฉลี่ยกล่องละ $11.00','รางวัล Kickstarter ครบทุกกล่อง','รางวัลดิจิทัลทั้งหมด']},
        {name:'Party of Four',label:'กล่องจริง 4 กล่อง',price:'39.99',desc:'เปิดโต๊ะได้ 4 โต๊ะ หรือจัด MIKAWA Tournament 4 คน',items:['First Hand 4 กล่อง','เฉลี่ยกล่องละ $10.00','คู่มือ Facilitator แบบย่อ','รางวัลดิจิทัลทั้งหมด']},
        {name:'Culture Builder',label:'แพ็กเวิร์กช็อป 12 กล่อง',price:'107.99',desc:'นำภาษาสีทั้ง 4 เข้าไปในห้องกิจกรรม',items:['First Hand 12 กล่อง','เฉลี่ยกล่องละ $9.00','Workshop playbook','สไลด์และกิจกรรม']}
      ],
      selected:'คุณเลือก',preview:'หน้านี้เป็นตัวอย่างแคมเปญ ค่าจัดส่งจะถูกเพิ่มภายหลังใน Pledge Manager',change:'เปลี่ยนตัวเลือก',choose:'เลือก',chosen:'เลือกแล้ว ✓'
    }
  };

  const HERO_IDS=['fh-red-courage','fh-blue-clarity','fh-green-balance','fh-gray-build','fh-red-joy','fh-blue-strategy','fh-green-recovery'];
  const POCKET_IDS=['fh-red-desire','fh-blue-perspective','fh-green-discipline','fh-gray-observe','fh-red-warmth','fh-blue-choice','fh-green-commitment'];

  function injectStyles(){
    if(q('#ks-final-styles')) return;
    const style=document.createElement('style');
    style.id='ks-final-styles';
    style.textContent=`
      html[lang='th'] body,html[lang='th'] button,html[lang='th'] input,html[lang='th'] select,html[lang='th'] textarea{font-family:'Anuphan','Noto Sans Thai','Leelawadee UI',sans-serif!important}
      html[lang='th'] h1,html[lang='th'] h2,html[lang='th'] h3,html[lang='th'] h4,html[lang='th'] strong,html[lang='th'] b{font-family:'Anuphan','Noto Sans Thai','Leelawadee UI',sans-serif!important;letter-spacing:-.025em}
      .campaign-nav .brand,.campaign-nav .brand *{font-family:Georgia,'Times New Roman',serif!important;letter-spacing:-.02em!important}
      .ks-lang{display:flex;align-items:center;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:3px;background:rgba(255,255,255,.05)}
      .ks-lang button{min-width:34px;padding:5px 8px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.62);font-family:Inter,ui-sans-serif,system-ui,sans-serif!important;font-size:10px;font-weight:900;letter-spacing:.08em;cursor:pointer}
      .ks-lang button.active{background:#ecd28b;color:#102316}
      #official-games{padding:clamp(76px,9vw,132px) 0;background:linear-gradient(180deg,#f7f0e2 0%,#eadcc3 100%);color:#10271d;position:relative;overflow:hidden}
      #official-games:before{content:'04';position:absolute;right:-.02em;top:-.2em;font-size:clamp(160px,29vw,440px);font-weight:900;line-height:1;color:rgba(6,39,24,.035);pointer-events:none}
      .ks-games-head{max-width:980px;margin:0 auto clamp(38px,5vw,66px);text-align:center;position:relative}
      .ks-games-head h2{margin:.26em 0 .28em;font-size:clamp(38px,5.6vw,74px);line-height:1.01;letter-spacing:-.055em;color:#08251a}
      .ks-games-head>p:last-child{max-width:850px;margin:0 auto;color:#40534a;font-size:clamp(17px,1.9vw,22px);line-height:1.66}
      .ks-games-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;position:relative}
      .ks-game{min-height:390px;padding:30px 26px;border-radius:24px;display:flex;flex-direction:column;position:relative;overflow:hidden;color:#fff;box-shadow:0 24px 64px -38px rgba(5,25,18,.72);isolation:isolate}
      .ks-game:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,rgba(255,255,255,.16),transparent 34%);z-index:-1}
      .ks-game.red{background:linear-gradient(150deg,#7e1d17,#3b0d0b)}
      .ks-game.green{background:linear-gradient(150deg,#0d5638,#062718);outline:3px solid rgba(216,179,95,.72);outline-offset:-3px}
      .ks-game.blue{background:linear-gradient(150deg,#0b3d67,#071d35)}
      .ks-game.gray{background:linear-gradient(150deg,#535b60,#252b2f)}
      .ks-game-badge{align-self:flex-start;padding:8px 11px;border:1px solid rgba(255,255,255,.24);border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.12em;color:#f4d184;text-transform:uppercase}
      .ks-game-core{position:absolute;right:22px;top:24px;font-size:11px;font-weight:950;letter-spacing:.14em;color:rgba(255,255,255,.42)}
      .ks-game-start{position:absolute;top:66px;right:18px;padding:7px 10px;border-radius:999px;background:#d8b35f;color:#08251a;font-size:9px;font-weight:950;letter-spacing:.09em;text-transform:uppercase}
      .ks-game h3{margin:auto 0 .12em;font-size:clamp(30px,3.3vw,48px);line-height:.95;letter-spacing:-.05em;color:#fff}
      .ks-game.blue h3{font-size:clamp(28px,3vw,43px)}
      .ks-game-tag{margin-bottom:18px;font-size:10px;font-weight:900;letter-spacing:.14em;color:#f4d184;text-transform:uppercase}
      .ks-game p{margin:0 0 24px;color:rgba(255,255,255,.84);font-size:15px;line-height:1.62}
      .ks-game small{margin-top:auto;color:rgba(255,255,255,.62);font-size:9px;font-weight:850;letter-spacing:.08em;line-height:1.5}
      .ks-discord{display:inline-flex;margin-top:15px;padding:10px 12px;border:1px solid rgba(255,255,255,.28);border-radius:12px;color:#fff;font-size:9px;font-weight:900;letter-spacing:.08em;text-align:center;justify-content:center}
      .ks-rule{margin-top:clamp(34px,5vw,62px);padding:clamp(24px,4vw,48px);display:grid;grid-template-columns:minmax(300px,.72fr) minmax(0,1fr);gap:clamp(30px,5vw,72px);align-items:center;border:1px solid rgba(6,39,24,.14);border-radius:28px;background:rgba(255,255,255,.62);box-shadow:0 28px 80px -56px rgba(6,39,24,.7)}
      .ks-flip-shell{width:min(100%,410px);margin:0 auto;perspective:1800px;text-align:center}
      .ks-flip-card{display:grid;width:100%;padding:0;border:0;background:none;cursor:pointer;transform-style:preserve-3d;transition:transform .72s cubic-bezier(.2,.75,.2,1);filter:drop-shadow(0 24px 28px rgba(5,24,17,.23))}
      .ks-flip-card.flipped{transform:rotateY(180deg)}
      .ks-flip-face{grid-area:1/1;display:block;overflow:hidden;border-radius:18px;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#061d2d}
      .ks-flip-back{transform:rotateY(180deg);background:#06321f}
      .ks-flip-face img,.ks-flip-face svg{display:block;width:100%;height:auto;aspect-ratio:1061/1482;object-fit:contain}
      .ks-flip-control{margin-top:18px;padding:10px 15px;border:0;border-radius:999px;background:#082a1d;color:#fff;font-family:Inter,ui-sans-serif,system-ui,sans-serif!important;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;cursor:pointer}
      .ks-rule-copy .eyebrow{color:#8a5d15!important}
      .ks-rule-copy h3{margin:.3em 0 .35em;font-size:clamp(31px,4vw,54px);line-height:1.04;letter-spacing:-.045em;color:#08251a}
      .ks-rule-copy>p{margin:0;color:#40534a;font-size:clamp(16px,1.55vw,20px);line-height:1.7}
      .ks-rule-sides{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
      .ks-rule-sides span{padding:14px 16px;border-radius:14px;background:#fff;border:1px solid rgba(6,39,24,.11);color:#18372a;font-size:11px;font-weight:900;letter-spacing:.06em;text-align:center}
      #card-back.ks-cardback{padding:clamp(76px,9vw,126px) 0;background:#08271b;color:#fff}
      .ks-cardback-grid{display:grid;grid-template-columns:minmax(300px,.8fr) minmax(0,1fr);gap:clamp(38px,6vw,86px);align-items:center}
      .ks-cardback-copy h2{font-size:clamp(40px,5vw,70px);line-height:1;margin:.2em 0 .35em;letter-spacing:-.05em}
      .ks-cardback-copy p{color:rgba(255,255,255,.76);font-size:clamp(17px,1.7vw,21px)}
      .ks-cardback-copy blockquote{margin:28px 0;padding:22px;border-left:3px solid #d8b35f;background:rgba(255,255,255,.05);color:#f0d893}
      .ks-passion-front{aspect-ratio:1061/1482;background:#7e1d17}
      .ks-passion-front svg{width:100%;height:100%}
      .pledge-grid{align-items:stretch}
      .pledge .pledge-price{white-space:nowrap}
      .pledge .pledge-price small{display:block;margin-top:5px;font-size:11px;color:rgba(255,255,255,.58);font-weight:700;letter-spacing:.04em}
      .ks-shipping-note{margin:28px auto 0;max-width:880px;padding:18px 22px;border:1px solid rgba(236,210,139,.24);border-radius:16px;color:rgba(255,255,255,.72);text-align:center}
      @media(max-width:1100px){.ks-games-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:900px){.ks-rule,.ks-cardback-grid{grid-template-columns:1fr}.ks-game{min-height:330px}}
      @media(max-width:680px){.ks-games-head{text-align:left}.ks-games-head>p:last-child{margin-left:0}.ks-games-grid{grid-template-columns:1fr}.ks-game{min-height:300px}.ks-rule{padding:24px 18px;border-radius:22px}.ks-rule-sides{grid-template-columns:1fr}.ks-flip-shell{width:min(92vw,390px)}.ks-lang{margin-left:auto}.nav-links{display:none}}
      @media(prefers-reduced-motion:reduce){.ks-flip-card{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function loadThaiFont(){
    if(q('#ks-anuphan')) return;
    const link=document.createElement('link');
    link.id='ks-anuphan';
    link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  function fixedBrand(){
    const brand=q('.brand > span:not(.brand-mark)');
    if(brand) brand.innerHTML='myClover <b>· First Hand</b>';
    const founderLink=qa('.nav-links a').find(a=>/founder/i.test(a.textContent||''));
    if(founderLink) founderLink.textContent='Creator';
  }

  function setMeta(){
    document.title='myClover · First Hand — 0% RNG. 100% Decisions.';
    const values={
      'meta[name="description"]':'Choose 7 cards and play 3 official zero-randomness games—HERO’S DUEL, CORE7 and 三川 MIKAWA—inside one 37-card pocket box.',
      'meta[property="og:title"]':'myClover · First Hand',
      'meta[property="og:description"]':'3 official games. 1 shared four-color language. 0% RNG. 100% decisions.'
    };
    Object.entries(values).forEach(([selector,value])=>{const node=q(selector);if(node)node.setAttribute('content',value);});
  }

  function cleanLegacyText(root=document.body){
    const replacements=[[/三川\s*3IVERS/g,'三川 MIKAWA'],[/3IVERS/g,'MIKAWA'],[/Two official games/gi,'Three official games'],[/2 official games/gi,'3 official games'],[/Two games/gi,'Three games'],[/2 games/gi,'3 games']];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(node.parentElement&&node.parentElement.closest('script,style'))return;let value=node.nodeValue;replacements.forEach(([pattern,next])=>{value=value.replace(pattern,next);});if(value!==node.nodeValue)node.nodeValue=value;});
    qa('[aria-label],[title],[alt]').forEach(node=>{['aria-label','title','alt'].forEach(attr=>{if(!node.hasAttribute(attr))return;let value=node.getAttribute(attr);replacements.forEach(([pattern,next])=>{value=value.replace(pattern,next);});node.setAttribute(attr,value);});});
  }

  function canonicalEnglish(){
    fixedBrand();setMeta();
    const setText=(selector,value)=>{const node=q(selector);if(node)node.textContent=value;};
    const setHTML=(selector,value)=>{const node=q(selector);if(node)node.innerHTML=value;};
    setText('.hero-lead','A pocket game system built from 7 cards you choose yourself. Play 3 official games—from a rapid duel to a full Three-River war—with 0% RNG and 100% decisions.');
    setText('.micro-proof','28 word cards · 4 double-sided Rule Cards · 1 Lucky Card · 4 foil CORE Cards');
    setHTML('.hero-seal','<span>myClover · FIRST HAND</span><b>37 CARDS</b><small>3 OFFICIAL GAMES</small>');
    setHTML('#promise .promise-grid','<article><strong>10 sec</strong><span>to learn CORE7</span></article><article><strong>7 cards</strong><span>your chosen hand</span></article><article><strong>0% RNG</strong><span>100% Decisions</span></article><article><strong>3 games</strong><span>one shared system</span></article>');
    const box=q('#box');
    if(box){
      setHTML('#box .section-heading h2','Thirty-seven cards.<br>Three official games. One pocket box.');
      setText('#box .box-system-line','33-card game system + 4 playable foil CORE Cards.');
      const grid=q('#box .box-grid');
      if(grid)grid.innerHTML='<article class="box-item reveal is-visible"><span class="box-count">28</span><h3>Word Cards</h3><p>Seven Red, Green, Blue and Gray cards. One keyword per card. One shared language across all 3 official games.</p></article><article class="box-item reveal is-visible"><span class="box-count">04</span><h3>Double-Sided Rule Cards</h3><p>CORE7 on one side. HERO’S DUEL + 三川 MIKAWA on the other. One visual guide for each player.</p></article><article class="box-item reveal is-visible"><span class="box-count">01</span><h3>Lucky Card</h3><p>A QR, a good-luck message and a four-panel story showing how one myClover card can become many games.</p></article><article class="box-item reveal is-visible"><span class="box-count">04</span><h3>Foil CORE Cards</h3><p>BODY · SOUL · MIND · CRAFT as playable full-art cards in every Kickstarter box.</p></article>';
    }
    qa('.risk-copy p').forEach(p=>{if(/intentionally controlled/i.test(p.textContent||''))p.textContent='myClover is intentionally controlled: 37 cards, one compact tuck box, 3 official games, no miniatures, no required app and no production complexity hiding inside stretch goals.';});
    qa('.stretch-goal').forEach(goal=>{const body=goal.querySelector('p');if(body&&/32-card First Hand/i.test(body.textContent))body.textContent='The complete 37-card First Hand.';const title=goal.querySelector('b');if(title&&/OPEN CREATOR KIT/i.test(title.textContent)){title.textContent='OPEN CRAFT KIT';if(body)body.textContent='A public rule template for player-made games, shared through the myClover Discord.';}});
    qa('.future-cards article').forEach(card=>{const b=card.querySelector('b'),span=card.querySelector('span');if(b&&/NEW GAMES/i.test(b.textContent)){b.textContent='PLAYER-CRAFTED GAMES';if(span)span.textContent='Game 4 and beyond are built, tested and shared by the community.';}});
    cleanLegacyText();
  }

  function officialMarkup(){
    const section=q('#official-games')||document.createElement('section');section.id='official-games';section.className='section-cream';
    section.innerHTML='<div class="wrap"><div class="ks-games-head reveal is-visible"><p class="eyebrow" data-ks-official="eyebrow"></p><h2 data-ks-official="title"></h2><p data-ks-official="lead"></p></div><div class="ks-games-grid" data-ks-games></div><div class="ks-rule reveal is-visible"><div class="ks-flip-shell"><div class="ks-flip-card" data-rule-flip role="button" tabindex="0" aria-label="Flip the Rule Card"><div class="ks-flip-face"><img src="/core7/assets/mikawa-rule.webp?v='+VERSION+'" alt="三川 MIKAWA and HERO’S DUEL visual Rule Card" loading="eager" decoding="async"></div><div class="ks-flip-face ks-flip-back"><img src="/core7/assets/core7-rule.webp?v='+VERSION+'" alt="CORE7 visual Rule Card" loading="eager" decoding="async"></div></div><button class="ks-flip-control" data-rule-flip-button type="button"></button></div><div class="ks-rule-copy"><p class="eyebrow" data-ks-official="ruleEyebrow"></p><h3 data-ks-official="ruleTitle"></h3><p data-ks-official="ruleBody"></p><div class="ks-rule-sides"><span data-ks-official="mikawaSide"></span><span data-ks-official="coreSide"></span></div></div></div></div>';
    if(!section.parentNode){const anchor=q('#game');if(anchor)anchor.insertAdjacentElement('afterend',section);}
    renderOfficial(language);wireFlip(section.querySelector('[data-rule-flip]'),section.querySelector('[data-rule-flip-button]'));
  }

  function renderOfficial(lang){
    const c=OFFICIAL_COPY[lang];
    Object.keys(c).filter(key=>typeof c[key]==='string').forEach(key=>qa('[data-ks-official="'+key+'"]').forEach(node=>node.textContent=c[key]));
    const grid=q('[data-ks-games]');
    if(grid)grid.innerHTML=c.games.map(game=>'<article class="ks-game '+game.color+'"><span class="ks-game-badge">'+game.badge+'</span><span class="ks-game-core">'+game.core+'</span>'+(game.start?'<span class="ks-game-start">'+game.start+'</span>':'')+'<h3>'+game.name+'</h3><b class="ks-game-tag">'+game.tag+'</b><p>'+game.body+'</p><small>'+game.meta+'</small>'+(game.craft?'<a class="ks-discord" href="'+DISCORD_URL+'" target="_blank" rel="noopener">'+c.discord+'</a>':'')+'</article>').join('');
    const button=q('[data-rule-flip-button]');if(button)button.textContent='↻ '+c.flip;
  }

  function wireFlip(card,button){
    if(!card||!button||card.dataset.wired==='true')return;card.dataset.wired='true';const toggle=()=>card.classList.toggle('flipped');card.addEventListener('click',toggle);card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});button.addEventListener('click',toggle);
  }

  function injectCardBack(){
    let section=q('#card-back');if(!section){section=document.createElement('section');section.id='card-back';section.className='ks-cardback';const anchor=q('.carry');if(anchor)anchor.insertAdjacentElement('afterend',section);}
    section.innerHTML='<div class="wrap ks-cardback-grid"><div class="ks-flip-shell reveal is-visible"><div class="ks-flip-card" data-passion-flip role="button" tabindex="0" aria-label="Flip Passion to the shared card back"><div class="ks-flip-face ks-passion-front" id="ksPassionFront"></div><div class="ks-flip-face ks-flip-back"><img src="/core7/assets/myclover-back.webp?v='+VERSION+'" alt="The shared back of every myClover card"></div></div><button class="ks-flip-control" data-passion-flip-button type="button">↻ FLIP PASSION / CARD BACK</button></div><div class="ks-cardback-copy reveal is-visible"><p class="eyebrow">ONE BACK · EVERY GAME</p><h2>Different choices.<br>The same hidden language.</h2><p>Every playable myClover card shares one back. The same 7-card hand can move from CORE7 to HERO’S DUEL, 三川 MIKAWA and any player-crafted game without breaking hidden information.</p><blockquote>The back is not packaging. It is the flag of a language anyone can sit down and play.</blockquote></div></div>';
    wireFlip(section.querySelector('[data-passion-flip]'),section.querySelector('[data-passion-flip-button]'));
  }

  async function renderCardArt(){
    try{
      const [{FIRST_HAND},{cardSVG,cloverLogo}]=await Promise.all([import('/core7/js/cards.js'),import('/core7/js/art.js')]);
      const navLogo=q('#navLogo'),finalLogo=q('#finalLogo');if(navLogo)navLogo.innerHTML=cloverLogo(34);if(finalLogo)finalLogo.innerHTML=cloverLogo(86);
      const hero=q('#heroCards');if(hero&&!hero.children.length)HERO_IDS.forEach((id,index)=>{const card=document.createElement('div');card.className='hero-card';card.dataset.index=index;card.innerHTML=cardSVG(id,{width:300});hero.appendChild(card);});
      const pocket=q('#pocketCards');if(pocket&&!pocket.children.length)POCKET_IDS.forEach(id=>{const card=document.createElement('div');card.className='mini-card';card.innerHTML=cardSVG(id,{width:220,showNumber:false});pocket.appendChild(card);});
      const gallery=q('#cardGallery');if(gallery&&!gallery.children.length)FIRST_HAND.forEach(cardData=>{const card=document.createElement('article');card.className='gallery-card';card.dataset.energy=cardData.color;card.dataset.name=cardData.en;card.setAttribute('aria-label',cardData.en+' — '+cardData.th);card.innerHTML=cardSVG(cardData.id,{width:230});gallery.appendChild(card);});
      const passion=q('#ksPassionFront');if(passion)passion.innerHTML=cardSVG('fh-red-passion',{width:410});
    }catch(error){console.error('Unable to load card art',error);}
  }

  function renderPledges(lang){
    const c=PLEDGE_COPY[lang];const heading=q('#pledges .section-heading h2');if(heading)heading.textContent=c.heading;const lead=q('#pledges .section-heading>p:last-child');if(lead)lead.textContent=c.lead;
    const grid=q('#pledges .pledge-grid');if(grid)grid.innerHTML=c.tiers.map(tier=>'<article class="pledge '+(tier.featured?'featured ':'')+'reveal is-visible" data-pledge="'+tier.name+'" data-price="$'+tier.price+'">'+(tier.ribbon?'<div class="pledge-ribbon">'+tier.ribbon+'</div>':'')+'<p class="pledge-label">'+tier.label+'</p><h3>'+tier.name+'</h3><div class="pledge-price"><sup>$</sup>'+tier.price+(tier.name==='The First Hand'?'<small>MSRP $14.99</small>':'')+'</div><p>'+tier.desc+'</p><ul>'+tier.items.map(item=>'<li>'+item+'</li>').join('')+'</ul><button class="select-pledge" type="button">'+c.choose+' '+tier.name+'</button></article>').join('');
    let note=q('.ks-shipping-note');if(!note&&grid){note=document.createElement('p');note.className='ks-shipping-note';grid.insertAdjacentElement('afterend',note);}if(note)note.textContent=c.lead;
    const panel=q('#pledgeSelection');if(panel){panel.innerHTML='<span>'+c.selected+'</span><b id="selectedPledge"></b><strong id="selectedPrice"></strong><p>'+c.preview+'</p><button id="clearPledge" type="button">'+c.change+'</button>';panel.hidden=!selectedPledge;}
    syncPledgeSelection();
  }

  function syncPledgeSelection(){
    const c=PLEDGE_COPY[language];qa('.pledge').forEach(card=>{const active=selectedPledge&&card.dataset.pledge===selectedPledge.name;card.classList.toggle('is-selected',Boolean(active));const button=card.querySelector('.select-pledge');if(button)button.textContent=active?c.chosen:c.choose+' '+card.dataset.pledge;});
    const panel=q('#pledgeSelection');if(panel){panel.hidden=!selectedPledge;const name=q('#selectedPledge'),price=q('#selectedPrice');if(name)name.textContent=selectedPledge?.name||'';if(price)price.textContent=selectedPledge?.price||'';}
  }

  function bindPledges(){
    document.addEventListener('click',event=>{const choose=event.target.closest&&event.target.closest('.select-pledge');if(choose){const card=choose.closest('.pledge');if(!card)return;selectedPledge={name:card.dataset.pledge,price:card.dataset.price};try{localStorage.setItem(STORAGE_KEY,JSON.stringify(selectedPledge));}catch(_){ }syncPledgeSelection();const panel=q('#pledgeSelection');if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'});return;}if(event.target.closest&&event.target.closest('#clearPledge')){selectedPledge=null;try{localStorage.removeItem(STORAGE_KEY);}catch(_){ }syncPledgeSelection();}});
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&saved.name&&qa('.pledge').some(card=>card.dataset.pledge===saved.name))selectedPledge=saved;}catch(_){ }syncPledgeSelection();
  }

  function setEnergy(energy){
    const copy=ENERGY_COPY[energy]?.[language]||ENERGY_COPY.RED[language];qa('.energy-button').forEach(button=>button.classList.toggle('active',button.dataset.energy===energy));const label=q('#energyLabel'),headline=q('#energyHeadline'),body=q('#energyBody');if(label)label.textContent=copy.label;if(headline)headline.textContent=copy.headline;if(body)body.textContent=copy.body;qa('.gallery-card').forEach(card=>card.classList.toggle('is-muted',card.dataset.energy!==energy));setTimeout(()=>qa('.gallery-card').forEach(card=>card.classList.remove('is-muted')),900);
  }
  function bindEnergy(){qa('.energy-button').forEach(button=>button.addEventListener('click',()=>setEnergy(button.dataset.energy)));}

  function addLanguageControls(){
    const nav=q('.nav-inner');if(!nav)return;let control=q('.ks-lang');if(!control){control=document.createElement('div');control.className='ks-lang';control.setAttribute('role','group');control.setAttribute('aria-label','Language');control.innerHTML='<button type="button" data-lang="en" class="active">EN</button><button type="button" data-lang="th">TH</button>';const cta=q('.nav-cta');nav.insertBefore(control,cta||null);}control.addEventListener('click',event=>{const button=event.target.closest('button[data-lang]');if(button)applyLanguage(button.dataset.lang);});
  }

  function bind(selector,thai,{html=false}={}){const nodes=qa(selector),values=Array.isArray(thai)?thai:[thai];nodes.forEach((node,index)=>translations.push({node,en:html?node.innerHTML:node.textContent,th:values[index]!==undefined?values[index]:values[values.length-1],html}));}
  function buildTranslations(){
    translations=[];bind('.nav-links a',['ตัวเกม','ในกล่อง','ระดับสนับสนุน','ผู้สร้าง']);bind('.nav-cta','เลือกระดับสนับสนุน');bind('.campaign-kicker','ตัวอย่างแคมเปญ · การพิมพ์ครั้งแรก');bind('.hero h1','เด็คเดียว<br>คู่แข่งคนไหนก็ได้<br><em>ที่ไหนก็ได้</em>',{html:true});bind('.hero-lead','ระบบเกมพกพาที่เริ่มจากการ์ด 7 ใบซึ่งคุณเลือกเอง เล่นได้ 3 เกมทางการ ตั้งแต่การดวลรัวไปจนถึงสงคราม 3 สายน้ำ โดยไม่มีการสุ่มและทุกผลลัพธ์เกิดจากการตัดสินใจ');bind('.hero-actions a',['สนับสนุน First Hand','ดูวิธีเล่น']);bind('.micro-proof','การ์ดคำ 28 ใบ · Rule Cards หน้าหลัง 4 ใบ · Lucky Card 1 ใบ · CORE Cards ฟอยล์ 4 ใบ');bind('.hero-scroll','สำรวจกล่อง');bind('#promise .promise-grid article span',['เรียนรู้ CORE7','มือที่เลือกเอง','ตัดสินใจ 100%','ระบบเดียวกัน']);bind('.origin-copy .eyebrow','วิธีออกแบบ');bind('.origin-copy h2','เราไม่ได้สร้าง CORE7 ด้วยการเพิ่มกติกา<br><em>เราค้นพบมันด้วยการตัดสิ่งที่ไม่จำเป็นออก</em>',{html:true});bind('.game .section-heading .eyebrow','CORE7 · กติกาหลัก');bind('.game .section-heading h2','1 Match ที่เรียนรู้ได้ทันที<br><em>1 Set ที่อ่านคนตรงหน้าได้ลึกขึ้น</em>',{html:true});bind('.carry-copy .eyebrow','1 กล่อง · 2 คน');bind('.carry-copy h2','เลือก 7 ใบ<br>ส่งอีก 21 ใบให้คนตรงหน้า',{html:true});bind('.language .section-heading .eyebrow','ทำไมคำบนการ์ดจึงสำคัญ');bind('.language .section-heading h2','สีทำให้เล่นได้<br><em>คำทำให้มันเป็นเรื่องของเรา</em>',{html:true});bind('#box .section-heading .eyebrow','มีอะไรในกล่อง');bind('#box .section-heading h2','การ์ด 37 ใบ<br>3 เกมทางการ ในกล่องพกพา 1 กล่อง',{html:true});bind('#box .box-system-line','ระบบเกม 33 ใบ + CORE Cards ฟอยล์ที่นำมาเล่นได้จริงอีก 4 ใบ');bind('.open-copy .eyebrow','คำสัญญาของเรา');bind('.ai-copy .eyebrow','ชั้นการใช้งานร่วมกับ AI');bind('#pledges .section-heading .eyebrow','เลือก FIRST HAND ของคุณ');bind('#stretch .section-heading .eyebrow','เป้าหมายเพิ่มเติม');bind('.future-copy .eyebrow','ภาษาเดียว · หลายมือ');bind('.timeline .section-heading .eyebrow','เส้นทางสู่โต๊ะของคุณ');bind('.risks .eyebrow','ออกแบบมาให้ส่งถึงมือ');bind('.faq .eyebrow','คำถามที่พบบ่อย');bind('#founder .eyebrow','เกือบ 30 ปีของการออกแบบเกม');bind('.final-cta .eyebrow','FIRST HAND เริ่มจากโต๊ะเดียว');
  }

  function applyLanguage(next){
    language=next==='th'?'th':'en';document.documentElement.lang=language;if(language==='th')loadThaiFont();qa('.ks-lang button').forEach(button=>button.classList.toggle('active',button.dataset.lang===language));translations.forEach(item=>{const value=language==='th'?item.th:item.en;if(item.html)item.node.innerHTML=value;else item.node.textContent=value;});fixedBrand();renderOfficial(language);renderPledges(language);const active=q('.energy-button.active')||q('.energy-button');if(active)setEnergy(active.dataset.energy);if(language==='en')auditEnglishUI();
  }

  function auditEnglishUI(){
    cleanLegacyText();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),offenders=[];while(walker.nextNode()){const node=walker.currentNode,parent=node.parentElement;if(!parent||parent.closest('svg,.hero-cards,.pocket-seven,.card-gallery,script,style'))continue;if(/[\u0E00-\u0E7F]/.test(node.nodeValue||''))offenders.push(node);}if(offenders.length)console.warn('English UI audit found Thai text:',offenders.map(node=>node.nodeValue.trim()).filter(Boolean));
  }

  function initReveal(){const items=qa('.reveal');if(!('IntersectionObserver'in window)){items.forEach(el=>el.classList.add('is-visible'));return;}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});items.forEach(el=>observer.observe(el));}
  function setProgress(){const max=Math.max(1,document.documentElement.scrollHeight-innerHeight),bar=q('.scroll-progress span');if(bar)bar.style.width=Math.min(100,Math.max(0,scrollY/max*100))+'%';}
  function initDetails(){qa('.faq-list details').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open)qa('.faq-list details').forEach(other=>{if(other!==detail)other.open=false;});}));}
  function initHeroTilt(){const stage=q('.hero-stage'),cards=q('#heroCards');if(!stage||!cards||matchMedia('(pointer:coarse)').matches)return;stage.addEventListener('pointermove',event=>{const rect=stage.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;cards.style.transform='rotateY('+(x*7)+'deg) rotateX('+(-y*5)+'deg)';});stage.addEventListener('pointerleave',()=>{cards.style.transform='';});}

  function init(){
    injectStyles();canonicalEnglish();addLanguageControls();officialMarkup();injectCardBack();renderPledges('en');buildTranslations();bindPledges();bindEnergy();initReveal();initDetails();renderCardArt().then(initHeroTilt);setProgress();addEventListener('scroll',setProgress,{passive:true});addEventListener('resize',setProgress,{passive:true});applyLanguage('en');requestAnimationFrame(()=>{document.documentElement.classList.remove('ks-final-boot');const style=q('#ks-final-boot-style');if(style)style.remove();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
