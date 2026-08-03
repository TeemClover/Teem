(function(){
  'use strict';

  const q = selector => document.querySelector(selector);
  const qa = selector => Array.from(document.querySelectorAll(selector));
  const thai = () => document.documentElement.lang === 'th';
  const setText = (selector,value) => { const node=q(selector); if(node) node.textContent=value; };
  const setHTML = (selector,value) => { const node=q(selector); if(node) node.innerHTML=value; };

  function injectStyles(){
    if(q('#campaign-final-qa-styles')) return;
    const style=document.createElement('style');
    style.id='campaign-final-qa-styles';
    style.textContent=`
      /* Founder: balanced editorial layout with the image and proof on the right. */
      #founder .founder-grid{
        display:grid!important;
        grid-template-columns:minmax(0,1.08fr) minmax(360px,.92fr)!important;
        grid-template-areas:
          "head head"
          "story media"
          "story proof"!important;
        column-gap:clamp(38px,5vw,76px)!important;
        row-gap:clamp(26px,3vw,44px)!important;
        align-items:start!important;
      }
      #founder .founder-head{grid-area:head;max-width:940px;margin:0!important}
      #founder .founder-story{grid-area:story;max-width:690px;margin:0!important;align-self:start}
      #founder [data-story-inline="founder"]{grid-area:media;width:100%;margin:0!important;align-self:start!important}
      #founder [data-story-inline="founder"] img{width:100%!important;height:auto!important;object-fit:contain!important}
      #founder .founder-proof{
        grid-area:proof;
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:14px!important;
        margin:0!important;
        align-self:start!important;
      }
      #founder .founder-proof article{
        min-width:0!important;
        min-height:126px!important;
        padding:20px!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
      }
      #founder .founder-proof b{line-height:.92!important}
      #founder .founder-story blockquote{margin-top:34px!important;margin-bottom:0!important}

      /* Product naming: make it impossible to confuse a pledge tier with the box name. */
      #pledges .product-definition{
        width:min(920px,100%);
        margin:-22px auto 38px;
        padding:18px 22px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:14px 22px;
        flex-wrap:wrap;
        border:1px solid rgba(243,215,143,.34);
        border-radius:16px;
        background:rgba(255,255,255,.055);
        box-shadow:0 18px 48px rgba(0,0,0,.14);
        text-align:center;
      }
      #pledges .product-definition strong{
        color:#f3d78f;
        font-family:Georgia,"Times New Roman",serif;
        font-size:clamp(1.05rem,2vw,1.35rem);
        letter-spacing:-.015em;
      }
      #pledges .product-definition span{color:#dbe8e1;font-weight:750}
      #pledges .pledge.featured h3{
        max-width:82%;
        font-size:clamp(1.45rem,2.1vw,1.95rem)!important;
        line-height:1.08!important;
      }

      @media(max-width:900px){
        #founder .founder-grid{
          grid-template-columns:1fr!important;
          grid-template-areas:
            "head"
            "media"
            "story"
            "proof"!important;
          row-gap:28px!important;
        }
        #founder .founder-story{max-width:760px}
        #founder [data-story-inline="founder"]{max-width:760px}
      }

      @media(max-width:560px){
        #founder .founder-proof{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
        #founder .founder-proof article{min-height:110px!important;padding:15px!important}
        #pledges .product-definition{display:block;margin-top:-12px;padding:17px 16px;text-align:left}
        #pledges .product-definition strong,#pledges .product-definition span{display:block}
        #pledges .product-definition span{margin-top:6px}
        #pledges .pledge.featured h3{max-width:76%}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureProductDefinition(){
    const heading=q('#pledges .section-heading');
    const grid=q('#pledges .pledge-grid');
    if(!heading||!grid) return;
    let note=q('#pledges .product-definition');
    if(!note){
      note=document.createElement('div');
      note.className='product-definition reveal is-visible';
      grid.parentNode.insertBefore(note,grid);
    }
    note.innerHTML=thai()
      ? '<strong>myClover : First Hand</strong><span>สินค้า 1 กล่อง · การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · เกมทางการ 2 แบบ</span>'
      : '<strong>myClover : First Hand</strong><span>1 product box · 28 word cards · 4 rule cards · 2 official games</span>';
  }

  function applyMemory(){
    const th=thai();
    setText('#memory .eyebrow',th?'เกมที่เริ่มต้นหลังเกมจบ':'THE GAME AFTER THE GAME');
    setHTML('#memory h2',th?'คุณอาจลืมคะแนน<br><em>แต่จะจำได้ว่ามือนั้นรู้สึกอย่างไร</em>':'You may forget the score.<br><em>You remember how the hand felt.</em>');
    const paragraphs=qa('#memory .memory-copy>p');
    if(paragraphs[0]) paragraphs[0].textContent=th
      ? 'คุณอาจจำคำทั้ง 7 ใบไม่ได้ทั้งหมด แต่จะจำความรู้สึกที่คำเหล่านั้นสร้างร่วมกัน และจำมนุษย์ที่เป็นผู้เลือกมัน'
      : 'You may not remember all 7 words. You remember the feeling they created together—and the human who chose them.';
    if(paragraphs[1]) paragraphs[1].textContent=th
      ? 'ก่อนเล่น คุณอาจเป็นคนแปลกหน้า ระหว่างเล่น การตัดสินใจกลายเป็นประวัติศาสตร์ร่วมกัน หลังเกม คำบนการ์ดช่วยให้ประวัติศาสตร์นั้นกลายเป็นบทสนทนาจริง'
      : 'Before the game, you may be strangers. During it, your decisions become shared history. After it, the words give that history something real to talk about.';
    setHTML('#memory .memory-copy blockquote',th?'CORE7 Match สร้างการอ่านครั้งแรก<br>CORE7 Set เปลี่ยนมันเป็นความทรงจำ':'A CORE7 Match creates the first read.<br>A CORE7 Set turns it into memory.');
    setText('#memory .memory-copy>strong',th?'CORE7 ยังทำงานต่อหลังเกมจบ':'CORE7 keeps working after the game is over.');
  }

  function applyFounder(){
    const th=thai();
    setText('#founder .founder-head .eyebrow',th?'เกือบ 30 ปีของการออกแบบเกม':'NEARLY 30 YEARS OF GAMES');
    setHTML('#founder .founder-head h2',th?'นี่คือเกมแรก<br><em>ที่ผมไม่อยากเก็บไว้เล่นคนเดียว</em>':'This is the first one<br><em>I do not want to keep to myself.</em>');
    setText('#founder .founder-head>p:last-child',th
      ? 'ระบบถูกออกแบบจากประสบการณ์หลายสิบปี แต่ตัวเกมถูกค้นพบบนโต๊ะเดียวกับลูกสาว'
      : 'Designed across decades. Discovered across one table.');

    const paragraphs=qa('#founder .founder-story>p');
    if(paragraphs[0]) paragraphs[0].textContent=th
      ? 'ผมออกแบบเกมมาเกือบ 30 ปี และเล่นกับผู้คนหลากหลายวัย ประเทศ และวัฒนธรรม ตั้งแต่วัดชนบทในญี่ปุ่นกับเจ้าอาวาส ไปจนถึงการแข่งขัน Flesh and Blood World Championship 2024 ที่โอซาก้า ซึ่งมีผู้เล่น 397 คน'
      : 'I have designed games for nearly 30 years and played with people across ages, countries and cultures—from a rural temple in Japan with an abbot to the 2024 Flesh and Blood World Championship in Osaka, where I competed as one of 397 players.';
    if(paragraphs[1]) paragraphs[1].textContent=th
      ? 'ผมเคยออกแบบประสบการณ์เกมยาว 6 ชั่วโมงสำหรับคน 50 คน และทำงานในบทบาท System Builder และ Lead Trainer ให้แพลตฟอร์มออนไลน์ที่ให้บริการผู้ใช้มากกว่า 5 ล้านคน'
      : 'I have led 6-hour game experiences for 50 people and worked as a System Builder and Lead Trainer for an online platform serving more than 5 million users.';
    if(paragraphs[2]) paragraphs[2].textContent=th
      ? 'แต่ CORE7 กลายเป็นเกมจริงบนโต๊ะกับลูกสาว ตั้งแต่ตอนเธออายุ 6 ปี เราช่วยกันถอดสิ่งที่ไม่จำเป็นออก จนเหลือเพียงการตัดสินใจของมนุษย์'
      : 'But CORE7 became real across a table with my daughter, beginning when she was 6. We kept removing what was unnecessary until only human decisions remained.';
    setHTML('#founder .founder-story blockquote',th?'ผมสร้างเกมมาเกือบ 30 ปี<br>นี่คือเกมแรกที่ผมอยากให้ทุกคนในโลกได้ลอง':'I have made games for almost 30 years.<br>This is the first one I want everyone in the world to try.');

    const figure=q('#founder [data-story-inline="founder"]');
    if(figure){
      const title=th?'โต๊ะที่เกมนี้เริ่มต้น':'The table where the game began';
      const body=th
        ? 'ระบบถูกออกแบบโดยคน 1 คน แต่เกมถูกค้นพบจากการช่วยกันถอดกติกากับลูกสาว'
        : 'The system was designed by one creator. The game was discovered by removing rules together with his daughter.';
      const image=figure.querySelector('img');
      const strong=figure.querySelector('figcaption strong');
      const span=figure.querySelector('figcaption span');
      if(image) image.alt=title;
      if(strong) strong.textContent=title;
      if(span) span.textContent=body;
    }

    const stats=qa('#founder .founder-proof article');
    const values=th
      ? [['397','ผู้เล่นใน FAB Worlds 2024'],['50 · 6 ชม.','ประสบการณ์เกมสด'],['5 ล้าน+','ผู้ใช้บนแพลตฟอร์ม'],['≈30 ปี','ออกแบบเกม']]
      : [['397','FAB Worlds 2024 players'],['50 · 6H','live game experience'],['5M+','platform users served'],['≈30 YRS','designing games']];
    stats.forEach((article,index)=>{
      const row=values[index];
      if(!row) return;
      const b=article.querySelector('b');
      const span=article.querySelector('span');
      if(b) b.textContent=row[0];
      if(span) span.textContent=row[1];
    });
  }

  function setList(card,items){
    const list=card&&card.querySelector('ul');
    if(!list) return;
    list.innerHTML=items.map(item=>'<li>'+item+'</li>').join('');
  }

  function applyPledges(){
    const th=thai();
    ensureProductDefinition();
    const cards=qa('#pledges .pledge');
    if(cards.length<6) return;

    const rows=th ? [
      {label:'ดิจิทัล',title:'Open Player',body:'เล่นและทดลองระบบก่อนกล่องจริงผลิตเสร็จ',items:['การ์ดพิมพ์เล่นเอง','การ์ดกติกาดิจิทัล','ไฟล์ความรู้สำหรับ AI','บันทึก Open Players'],button:'เลือก Open Player'},
      {label:'สินค้า 1 กล่อง',title:'myClover : First Hand',body:'สินค้าเวอร์ชันกล่องชุดแรกของระบบเกม myClover',items:['myClover : First Hand 1 กล่อง','การ์ดคำ 28 ใบ','การ์ดกติกา 4 ใบ','กล่องพกพา','รางวัลดิจิทัลทั้งหมด'],button:'เลือก myClover : First Hand'},
      {label:'สินค้า 2 กล่อง',title:'Share the Hand',body:'เก็บไว้ 1 กล่อง และส่งต่ออีก 1 กล่อง',items:['myClover : First Hand 2 กล่อง','รางวัลดิจิทัลทั้งหมด','ของในกล่องที่ปลดล็อกเพิ่ม','ปลอกสำหรับมอบเป็นของขวัญ'],button:'เลือก Share the Hand'},
      {label:'การพิมพ์ครั้งแรกแบบจำกัด',title:'Founder Edition',body:'ชิ้นงานสำหรับคนที่อยู่กับเกมนี้ตั้งแต่จุดเริ่มต้น',items:['myClover : First Hand 1 กล่อง','ตราหมายเลขประจำกล่อง','การ์ด Core ฟอยล์ 4 ใบ','บันทึกภาคสนามของผู้สร้าง','รายชื่อใน First Hand Record'],button:'เลือก Founder Edition'},
      {label:'สินค้า 4 กล่อง',title:'Party of Four',body:'เริ่มต้นโต๊ะใหม่ได้พร้อมกัน 4 แห่ง',items:['myClover : First Hand 4 กล่อง','คู่มือผู้ดำเนินกิจกรรม','ปลอกของขวัญ 4 ชิ้น','รางวัลดิจิทัลทั้งหมด'],button:'เลือก Party of Four'},
      {label:'ชุดเวิร์กช็อป 12 กล่อง',title:'Culture Builder',body:'นำภาษาของ myClover เข้าไปใช้กับคนทั้งห้อง',items:['myClover : First Hand 12 กล่อง','คู่มือเวิร์กช็อป','สไลด์และแบบฝึกหัด','รายชื่อใน Culture Builders'],button:'เลือก Culture Builder'}
    ] : [
      {label:'DIGITAL',title:'Open Player',body:'Play and explore the system before the physical box arrives.',items:['Print-and-play cards','Digital rule card','AI knowledge file','Open Players archive'],button:'Choose Open Player'},
      {label:'1 PRODUCT BOX',title:'myClover : First Hand',body:'The first boxed edition of the myClover game system.',items:['1 myClover : First Hand box','28 word cards','4 rule cards','Portable tuck box','All digital rewards'],button:'Choose myClover : First Hand'},
      {label:'2 PRODUCT BOXES',title:'Share the Hand',body:'Keep one. Give one.',items:['2 myClover : First Hand boxes','All digital rewards','Unlocked in-box goals','Gift sleeve'],button:'Choose Share the Hand'},
      {label:'LIMITED FIRST PRINT',title:'Founder Edition',body:'The artifact from the beginning.',items:['1 myClover : First Hand box','Numbered seal','4 foil Core cards','Founder field notes','First Hand record'],button:'Choose Founder Edition'},
      {label:'4 PRODUCT BOXES',title:'Party of Four',body:'Start 4 future tables.',items:['4 myClover : First Hand boxes','Facilitator guide','4 gift sleeves','All digital rewards'],button:'Choose Party of Four'},
      {label:'12-BOX WORKSHOP KIT',title:'Culture Builder',body:'Bring the myClover language to a room.',items:['12 myClover : First Hand boxes','Workshop playbook','Slides and exercises','Culture Builders archive'],button:'Choose Culture Builder'}
    ];

    cards.forEach((card,index)=>{
      const row=rows[index];
      if(!row) return;
      const label=card.querySelector('.pledge-label');
      const title=card.querySelector('h3');
      const body=card.querySelector(':scope>p:not(.pledge-label)');
      const button=card.querySelector('.select-pledge');
      if(label) label.textContent=row.label;
      if(title) title.textContent=row.title;
      if(body) body.textContent=row.body;
      setList(card,row.items);
      if(button) button.textContent=card.classList.contains('is-selected')?(th?'เลือกแล้ว ✓':'Selected ✓'):row.button;
    });

    const featured=cards[1];
    if(featured){
      featured.dataset.pledge='myClover : First Hand';
      const ribbon=featured.querySelector('.pledge-ribbon');
      if(ribbon) ribbon.textContent=th?'สินค้าหลัก':'CORE PRODUCT';
    }

    setText('#pledges .section-heading .eyebrow',th?'เลือกสินค้าสำหรับคุณ':'CHOOSE YOUR FIRST HAND');
    setHTML('#pledges .section-heading h2',th?'สนับสนุนชิ้นงานจริง<br>และช่วยให้กติกายังคงเปิด':'Back the artifact.<br>Keep the game open.');
    setText('#pledges .section-heading>p:last-child',th
      ? 'ราคาแคมเปญแสดงเป็นดอลลาร์สหรัฐ ค่าจัดส่งจะเก็บหลังแคมเปญตามอัตราจริงของปลายทาง'
      : 'Campaign prices are shown in USD. Shipping is collected after the campaign at the actual destination rate.');

    setText('#pledgeSelection>span',th?'คุณเลือก':'You selected');
    const selected=q('#selectedPledge');
    if(selected&&featured.classList.contains('is-selected')) selected.textContent='myClover : First Hand';
    setText('#pledgeSelection>p',th?'นี่คือตัวอย่างแคมเปญ ตัวเลือกจะถูกบันทึกไว้บนอุปกรณ์นี้':'This is a campaign preview. Your selection is saved on this device.');
    setText('#clearPledge',th?'เปลี่ยนตัวเลือก':'Change selection');
  }

  function applyFinalLanguageLeaks(){
    const th=thai();
    setText('.final-cta .eyebrow','myClover : First Hand');
    setHTML('.final-cta h2',th?'พก 7 คำ<br>แล้วออกไปพบใครสักคน':'Carry 7 words.<br>Meet someone.');
    setText('.final-cta .final-inner>p:not(.eyebrow)',th
      ? 'เล่น 1 CORE7 Match หรือเปิดสนาม 三川 3IVERS แล้วออกจากโต๊ะพร้อมความทรงจำร่วมกัน'
      : 'Play 1 CORE7 Match—or open 三川 3IVERS—and leave the table with a shared memory.');
    setText('.final-cta .button',th?'เลือกแพ็กเกจ':'Choose your pledge');
    setText('.mobile-cta span','myClover : First Hand');
    setText('.mobile-cta b',th?'เลือกแพ็กเกจ':'Choose a pledge');
  }

  function apply(){
    injectStyles();
    applyMemory();
    applyFounder();
    applyPledges();
    applyFinalLanguageLeaks();
    qa('.reveal').forEach(node=>node.classList.add('is-visible'));
  }

  function init(){
    [0,120,360,780,1500,2600].forEach(delay=>setTimeout(apply,delay));
    new MutationObserver(()=>setTimeout(apply,80)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
