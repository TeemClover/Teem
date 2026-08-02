(function(){
  'use strict';

  const ASSET_VERSION = '20260803-canon-v3';
  const STORY_ASSETS = [
    {
      id: 'removing-rules',
      src: '/kickstarter/assets/story/removing-rules.webp',
      enTitle: 'Nothing left to remove',
      thTitle: 'ถอดจนไม่เหลืออะไรให้ถอด',
      enCaption: 'Early prototypes carried more information. The final system kept only three colors—then added an empty Gray card.',
      thCaption: 'ต้นแบบเคยมีข้อมูลมากกว่านี้ ระบบสุดท้ายเหลือเพียงสามสี ก่อนเพิ่มการ์ดเทาที่ตั้งใจให้ว่างเปล่า'
    },
    {
      id: 'one-box-ritual',
      src: '/kickstarter/assets/story/one-box-ritual.webp',
      enTitle: 'Choose seven. Share twenty-one.',
      thTitle: 'เลือกเจ็ด ส่งต่อยี่สิบเอ็ด',
      enCaption: 'One person chooses seven words, then hands the remaining twenty-one to the person across the table.',
      thCaption: 'คนหนึ่งเลือกเจ็ดคำ แล้วส่งอีกยี่สิบเอ็ดใบให้คนตรงหน้าสร้างมือของเขา'
    },
    {
      id: 'first-meeting',
      src: '/kickstarter/assets/story/first-meeting.webp',
      enTitle: 'A shared feeling before a shared language',
      thTitle: 'มีความรู้สึกร่วมกันก่อนมีภาษาร่วมกัน',
      enCaption: 'Two strangers can play first, remember how the encounter felt, and find the conversation afterward.',
      thCaption: 'คนแปลกหน้าสองคนเล่นก่อน จดจำความรู้สึกของการพบกัน แล้วค่อยพบบทสนทนาหลังเกม'
    },
    {
      id: 'core7bo5-memory',
      src: '/kickstarter/assets/story/core7bo5-memory.webp',
      enTitle: 'Same hand. Stronger memory.',
      thTitle: 'มือเดิม ความทรงจำที่แน่นขึ้น',
      enCaption: 'CORE7BO5 locks the same seven cards. What changes is everything the two humans now know about each other.',
      thCaption: 'CORE7BO5 ล็อกเจ็ดใบเดิม สิ่งที่เปลี่ยนคือทุกอย่างที่มนุษย์สองคนเริ่มรู้เกี่ยวกับกัน'
    }
  ];

  const COPY = {
    en: {
      nameKicker: 'WHY MYCLOVER?',
      nameTitle: 'Luck you choose to carry.',
      nameBody: 'myClover comes from my lucky seven—but the seven are never dealt to you. You choose the words you carry into this meeting. The game uses no luck because the luck was already spent when you found the person across the table.',
      nameQuote: 'The luck was meeting. Everything after that is a decision.',
      nameSeven: 'SEVEN WORDS YOU CHOOSE',
      visualKicker: 'THE VISUAL STORY',
      visualTitle: 'A game this small should be seen—not buried in paragraphs.',
      visualLead: 'These slots are wired to real asset paths. Upload the finished WebP files later and the campaign will replace each art-direction panel automatically.',
      passionAlt: 'PASSION card from the FIRST HAND set',
      heroLead: 'A 32-card game you can teach in ten seconds. 0% RNG. 100% decisions. The only unpredictable thing is the human across the table.',
      microProof: '28 word cards · 4 rule cards · 0% RNG · 100% decisions · 1 box for two complete hands',
      oneLine: '0% RNG',
      oneSub: '100% decisions',
      languageTitle: 'Four colors. Four parts of being human.<br><em>Body. Soul. Mind. Craft.</em>',
      formatLabel: 'CORE7BO5 · COMPETITIVE · LOCKED HAND',
      formatTitle: 'Same hand. Next game. Different feeling each time.',
      formatBody: 'Lock one CORE7 for a Best-of-5 match. Reset the same seven after every Quick Play. First to win three Quick Plays wins the match.',
      truthTop: '0% RNG · 100% DECISIONS',
      truthBottom: 'The cards create the boundary. The humans create everything unpredictable.',
      tournamentLabel: 'CORE7BO5 COMPETITIVE FORMAT',
      foilTitle: 'Body. Soul. Mind. Craft.',
      projectUse: 'Use Body, Soul, Mind and Craft to frame impulse, continuity, direction and execution.',
      boxOrder: 'Seven Red, Green, Blue and Gray cards, each with art, an English keyword and its Thai meaning.',
      openBody: 'Write RED, GREEN, BLUE and GRAY on paper. CORE7 still works. The rules stay open and online play stays free.',
      faqQuestion: 'What is the difference between Quick Play and CORE7BO5?',
      faqAnswer: 'Quick Play is one complete CORE7 game and ends when someone wins three Rounds. CORE7BO5 locks the same seven-card hand for a Best-of-5 match and ends when someone wins three Quick Plays.'
    },
    th: {
      nameKicker: 'ทำไมชื่อ myClover?',
      nameTitle: 'โชคที่เราเลือกถือไว้เอง',
      nameBody: 'myClover มาจาก my lucky seven แต่เจ็ดใบนั้นไม่เคยถูกแจกให้ด้วยการสุ่ม เราเป็นคนเลือกคำที่อยากถือเข้ามาในการพบกันครั้งนี้ เกมไม่ใช้ดวง เพราะดวงถูกใช้ไปหมดแล้วตอนที่เราได้มาเจอคนตรงหน้า',
      nameQuote: 'โชคคือการได้มาเจอกัน ที่เหลือคือการตัดสินใจของเรา',
      nameSeven: 'เจ็ดคำที่เราเลือกเอง',
      visualKicker: 'เรื่องราวที่ต้องเล่าด้วยภาพ',
      visualTitle: 'เกมที่เล็กขนาดนี้ควรถูกมองเห็น ไม่ใช่ถูกฝังอยู่ในย่อหน้า',
      visualLead: 'ช่องเหล่านี้ผูกกับ Path ของ Asset จริงไว้แล้ว เมื่ออัปโหลดไฟล์ WebP ตามชื่อ หน้า Campaign จะเปลี่ยนจาก Art Direction เป็นภาพจริงโดยอัตโนมัติ',
      passionAlt: 'การ์ด PASSION จากชุด FIRST HAND',
      heroLead: 'เกม 32 ใบที่สอนได้ในสิบวินาที ไม่มีการสุ่ม 0% และเป็นการตัดสินใจ 100% สิ่งเดียวที่คาดเดาไม่ได้คือมนุษย์ตรงหน้า',
      microProof: 'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · สุ่ม 0% · ตัดสินใจ 100% · หนึ่งกล่องสร้างมือได้สองคน',
      oneLine: 'สุ่ม 0%',
      oneSub: 'ตัดสินใจ 100%',
      languageTitle: 'สี่สี สี่ส่วนของความเป็นมนุษย์<br><em>กาย · จิตวิญญาณ · ความคิด · งานสร้าง</em>',
      formatLabel: 'CORE7BO5 · แข่งขัน · ล็อกมือ',
      formatTitle: 'มือเดิม เกมถัดไป ความรู้สึกไม่เหมือนเดิม',
      formatBody: 'ล็อก CORE7 หนึ่งชุดตลอด Match แบบ Best-of-5 รีเซ็ตเจ็ดใบเดิมหลังจบแต่ละ Quick Play คนแรกที่ชนะสาม Quick Plays ชนะ Match',
      truthTop: 'สุ่ม 0% · ตัดสินใจ 100%',
      truthBottom: 'การ์ดสร้างขอบเขต แต่มนุษย์สร้างทุกสิ่งที่คาดเดาไม่ได้',
      tournamentLabel: 'รูปแบบแข่งขัน CORE7BO5',
      foilTitle: 'กาย · จิตวิญญาณ · ความคิด · งานสร้าง',
      projectUse: 'ใช้ Body, Soul, Mind และ Craft วางกรอบแรงขับ ความต่อเนื่อง ทิศทาง และการลงมือ',
      boxOrder: 'แดง เขียว ฟ้า และเทา สีละเจ็ดใบ แต่ละใบมีภาพ คำภาษาอังกฤษ และความหมายภาษาไทย',
      openBody: 'เขียน แดง เขียว ฟ้า และเทา ลงบนกระดาษ CORE7 ก็ยังเล่นได้ กติกายังคงเปิด และออนไลน์ยังคงฟรี',
      faqQuestion: 'Quick Play กับ CORE7BO5 ต่างกันอย่างไร?',
      faqAnswer: 'Quick Play คือหนึ่งเกม CORE7 ที่สมบูรณ์ จบเมื่อมีคนชนะสาม Rounds ส่วน CORE7BO5 ล็อกมือเจ็ดใบเดิมตลอด Match แบบ Best-of-5 และจบเมื่อมีคนชนะสาม Quick Plays'
    }
  };

  function lang(){ return document.documentElement.lang === 'th' ? 'th' : 'en'; }
  function text(selector,value){ const node=document.querySelector(selector); if(node) node.textContent=value; }
  function html(selector,value){ const node=document.querySelector(selector); if(node) node.innerHTML=value; }
  function insertAfter(reference,node){ if(reference && reference.parentNode) reference.parentNode.insertBefore(node,reference.nextSibling); }
  function sectionFrom(markup){ const t=document.createElement('template'); t.innerHTML=markup.trim(); return t.content.firstElementChild; }

  function injectNameOrigin(){
    if(document.getElementById('why-myclover')) return;
    const section=sectionFrom(`
      <section id="why-myclover" class="ksv3-name section-dark">
        <div class="wrap ksv3-name-grid">
          <div class="ksv3-name-copy reveal">
            <p class="eyebrow" data-copy="nameKicker"></p>
            <h2 data-copy="nameTitle"></h2>
            <p class="ksv3-name-body" data-copy="nameBody"></p>
            <blockquote data-copy="nameQuote"></blockquote>
            <div class="ksv3-decision-lockup" aria-label="0 percent RNG, 100 percent decisions"><strong>0% RNG</strong><span>100% DECISIONS</span></div>
          </div>
          <div class="ksv3-name-visual reveal">
            <div class="ksv3-seven-orbit" aria-hidden="true"><span>7</span><small data-copy="nameSeven"></small></div>
            <div id="ksv3SevenFan" class="ksv3-seven-fan" aria-label="Seven chosen myClover cards"></div>
          </div>
        </div>
      </section>`);
    insertAfter(document.getElementById('promise'),section);
  }

  function injectVisualStory(){
    if(document.getElementById('visual-story')) return;
    const section=sectionFrom(`
      <section id="visual-story" class="ksv3-visual-story section-cream">
        <div class="wrap">
          <div class="ksv3-visual-head reveal">
            <p class="eyebrow" data-copy="visualKicker"></p>
            <h2 data-copy="visualTitle"></h2>
            <p data-copy="visualLead"></p>
          </div>
          <div class="ksv3-art-grid"></div>
        </div>
      </section>`);
    const grid=section.querySelector('.ksv3-art-grid');
    STORY_ASSETS.forEach((asset,index)=>{
      const figure=document.createElement('figure');
      figure.className='ksv3-art-slot reveal';
      figure.dataset.src=asset.src;
      figure.dataset.assetId=asset.id;
      figure.innerHTML=`
        <div class="ksv3-art-placeholder" aria-hidden="true">
          <span>ART SLOT ${String(index+1).padStart(2,'0')}</span>
          <b>${asset.src.split('/').pop()}</b>
          <i></i>
        </div>
        <figcaption><strong></strong><span></span></figcaption>`;
      grid.appendChild(figure);
    });
    insertAfter(document.getElementById('memory') || document.querySelector('.memory'),section);
    hydrateArtSlots();
  }

  function hydrateArtSlots(){
    document.querySelectorAll('.ksv3-art-slot[data-src]').forEach(slot=>{
      if(slot.dataset.loaded==='true' || slot.dataset.loading==='true') return;
      slot.dataset.loading='true';
      const image=new Image();
      image.loading='lazy';
      image.decoding='async';
      image.alt='';
      image.onload=()=>{
        const holder=slot.querySelector('.ksv3-art-placeholder');
        image.className='ksv3-art-image';
        if(holder) holder.replaceWith(image);
        slot.dataset.loaded='true';
      };
      image.onerror=()=>{ slot.dataset.loading='false'; };
      image.src=slot.dataset.src+'?v='+ASSET_VERSION;
    });
  }

  async function renderSevenFan(){
    const target=document.getElementById('ksv3SevenFan');
    if(!target || target.dataset.rendered==='true') return;
    target.dataset.rendered='true';
    const ids=['fh-red-passion','fh-green-care','fh-blue-curiosity','fh-gray-build','fh-red-courage','fh-green-patience','fh-blue-clarity'];
    try{
      const {cardSVG}=await import('/core7/js/art.js');
      ids.forEach((id,index)=>{
        const card=document.createElement('div');
        card.className='ksv3-fan-card';
        card.style.setProperty('--i',String(index));
        card.innerHTML=cardSVG(id,{width:210,showNumber:false});
        target.appendChild(card);
      });
    }catch(_){
      ['PASSION','CARE','CURIOSITY','BUILD','COURAGE','PATIENCE','CLARITY'].forEach((name,index)=>{
        const card=document.createElement('div');
        card.className='ksv3-fan-card ksv3-fan-fallback';
        card.style.setProperty('--i',String(index));
        card.textContent=name;
        target.appendChild(card);
      });
    }
  }

  async function renderPassionFront(){
    const target=document.getElementById('ksv2CardFront');
    if(!target || target.dataset.passion==='true') return;
    try{
      const {cardSVG}=await import('/core7/js/art.js');
      target.innerHTML=cardSVG('fh-red-passion',{width:360});
      target.dataset.passion='true';
      target.setAttribute('aria-label',(COPY[lang()]||COPY.en).passionAlt);
    }catch(_){ }
  }

  function reorderRGBG(){
    const order=['RED','GREEN','BLUE','GRAY'];
    const selector=document.querySelector('.energy-selector');
    if(selector){
      order.forEach(key=>{
        const button=selector.querySelector(`[data-energy="${key}"]`);
        if(button) selector.appendChild(button);
      });
    }
    const coreGrid=document.querySelector('.ksv2-core-grid');
    if(coreGrid){
      ['red','green','blue','gray'].forEach(key=>{
        const card=coreGrid.querySelector('.'+key);
        if(card) coreGrid.appendChild(card);
      });
    }
    const gallery=document.getElementById('cardGallery');
    if(gallery && gallery.children.length){
      order.forEach(key=>{
        Array.from(gallery.querySelectorAll(`[data-energy="${key}"]`)).forEach(card=>gallery.appendChild(card));
      });
    }
  }

  function replaceAssetRefs(){
    document.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if(src.includes('/core7/assets/card-back-core7.png')) img.src=src.replace('card-back-core7.png','card-back-core7.webp');
      if(src.includes('/core7/assets/core7-rules-overview.png')) img.src=src.replace('core7-rules-overview.png','core7-rules-overview.webp');
    });
  }

  function applyCopy(){
    const c=COPY[lang()]||COPY.en;
    document.querySelectorAll('[data-copy]').forEach(node=>{
      const key=node.dataset.copy;
      if(c[key]!==undefined) node.textContent=c[key];
    });
    STORY_ASSETS.forEach(asset=>{
      const slot=document.querySelector(`[data-asset-id="${asset.id}"]`);
      if(!slot) return;
      const title=slot.querySelector('figcaption strong');
      const caption=slot.querySelector('figcaption span');
      if(title) title.textContent=lang()==='th'?asset.thTitle:asset.enTitle;
      if(caption) caption.textContent=lang()==='th'?asset.thCaption:asset.enCaption;
    });

    const og=document.querySelector('meta[property="og:description"]');
    if(og) og.setAttribute('content','myClover is luck you choose to carry. CORE7 is 0% RNG, 100% decisions—and a shared memory with the human across the table.');
    text('.hero-lead',c.heroLead);
    text('.micro-proof',c.microProof);
    const promiseArticles=document.querySelectorAll('#promise .promise-grid article');
    if(promiseArticles[2]){
      const strong=promiseArticles[2].querySelector('strong');
      const span=promiseArticles[2].querySelector('span');
      if(strong) strong.textContent=c.oneLine;
      if(span) span.textContent=c.oneSub;
    }
    html('.language .section-heading h2',c.languageTitle);

    const labels=lang()==='th'
      ? {RED:'แดง · กาย',GREEN:'เขียว · จิตวิญญาณ',BLUE:'ฟ้า · ความคิด',GRAY:'เทา · งานสร้าง'}
      : {RED:'RED · BODY',GREEN:'GREEN · SOUL',BLUE:'BLUE · MIND',GRAY:'GRAY · CRAFT'};
    document.querySelectorAll('.energy-button').forEach(button=>{
      if(labels[button.dataset.energy]) button.innerHTML='<span>●</span> '+labels[button.dataset.energy];
    });

    const format=document.querySelector('#formatGuide .standard');
    if(format){
      const label=format.querySelector('span');
      const title=format.querySelector('h3');
      const body=format.querySelector('p');
      if(label) label.textContent=c.formatLabel;
      if(title) title.textContent=c.formatTitle;
      if(body) body.textContent=c.formatBody;
    }
    const truth=document.querySelector('.game-truth');
    if(truth){
      const p=truth.querySelector('p');
      const strong=truth.querySelector('strong');
      if(p) p.textContent=c.truthTop;
      if(strong) strong.textContent=c.truthBottom;
    }
    text('#tournament .ksv2-scoreboard-top b',c.tournamentLabel);
    html('#foil-cores .ksv2-title',c.foilTitle);
    const projectUse=Array.from(document.querySelectorAll('.ksv2-use')).find(node=>/Project|โปรเจกต์/.test(node.textContent));
    if(projectUse){ const p=projectUse.querySelector('p'); if(p) p.textContent=c.projectUse; }
    const boxWord=document.querySelector('#box .box-item:first-child p');
    if(boxWord) boxWord.textContent=c.boxOrder;
    const openBody=document.querySelector('.open-copy > p:not(.eyebrow):not(.open-emphasis)');
    if(openBody) openBody.textContent=c.openBody;

    const details=Array.from(document.querySelectorAll('.faq-list details'));
    const formatFaq=details.find(item=>/Quick Play|Standard|CORE7BO5/.test(item.querySelector('summary')?.textContent||''));
    if(formatFaq){
      const q=formatFaq.querySelector('summary');
      const a=formatFaq.querySelector('p');
      if(q) q.textContent=c.faqQuestion;
      if(a) a.textContent=c.faqAnswer;
    }

    const coreTitle=document.querySelector('#foil-cores .ksv2-title');
    if(coreTitle) coreTitle.textContent=c.foilTitle;
    const stretch=Array.from(document.querySelectorAll('.stretch-goal b')).find(node=>/BODY|กาย/.test(node.textContent));
    if(stretch) stretch.textContent=lang()==='th'?'กาย · จิตวิญญาณ · ความคิด · งานสร้าง':'BODY · SOUL · MIND · CRAFT';

    replaceAssetRefs();
    reorderRGBG();
    renderPassionFront();
    hydrateArtSlots();
  }

  function init(){
    injectNameOrigin();
    injectVisualStory();
    renderSevenFan();
    applyCopy();
    [120,500,1100,2000].forEach(delay=>setTimeout(applyCopy,delay));
    const observer=new MutationObserver(()=>setTimeout(applyCopy,0));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
