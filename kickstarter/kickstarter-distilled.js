(function(){
  'use strict';

  const VERSION = '20260803-polish-v5';
  const ORDER = ['RED','GREEN','BLUE','GRAY'];
  const HERO = ['fh-red-courage','fh-green-balance','fh-blue-clarity','fh-gray-build','fh-red-joy','fh-green-recovery','fh-blue-strategy'];
  const POCKET = ['fh-red-desire','fh-green-discipline','fh-blue-perspective','fh-gray-observe','fh-red-warmth','fh-green-commitment','fh-blue-choice'];
  const STORIES = [
    {
      id:'removing-rules',
      en:['Nothing left to remove','Three colors created the rules. The empty Gray card created the game.'],
      th:['ถอดจนไม่เหลืออะไรให้ถอด','สามสีสร้างกติกา ส่วนการ์ดเทาที่ว่างเปล่าสร้างเกม']
    },
    {
      id:'one-box-ritual',
      en:['Choose seven. Share twenty-one.','One compact box creates two complete hands without a second deck.'],
      th:['เลือกเจ็ด ส่งต่อยี่สิบเอ็ด','หนึ่งกล่องเล็กสร้างมือที่สมบูรณ์ให้คนสองคนได้โดยไม่ต้องมีเด็คที่สอง']
    },
    {
      id:'first-meeting',
      en:['A shared feeling before a shared language','The luck was meeting. Everything after that is a decision.'],
      th:['มีความรู้สึกร่วมกันก่อนมีภาษาร่วมกัน','ดวงถูกใช้ไปแล้วตอนที่คนสองคนได้พบกัน หลังจากนั้นคือการตัดสินใจทั้งหมด']
    },
    {
      id:'core7bo5-memory',
      en:['Same hand. Win three Matches.','A CORE7 Set locks the same seven cards until one player wins three Matches.'],
      th:['มือเดิม ชนะสาม Matches','CORE7 Set ล็อกเจ็ดใบเดิมจนกว่าจะมีคนชนะสาม Matches']
    }
  ];

  let artPromise;
  let galleryObserver;
  const language = () => document.documentElement.lang === 'th' ? 'th' : 'en';
  const art = () => artPromise || (artPromise = import('/core7/js/art.js?v=' + VERSION));

  function showAll(){
    document.querySelectorAll('.reveal').forEach(node => node.classList.add('is-visible'));
  }

  function replaceAssetPaths(){
    document.querySelectorAll('img[src],source[src],source[srcset]').forEach(node => {
      ['src','srcset'].forEach(attribute => {
        const value = node.getAttribute(attribute);
        if(!value) return;
        const next = value
          .replaceAll('card-back-core7.png','card-back-core7.webp')
          .replaceAll('core7-rules-overview.png','core7-rules-overview.webp');
        if(next !== value) node.setAttribute(attribute,next);
      });
    });
  }

  function reorder(container,selector,readEnergy){
    if(!container) return false;
    const items = Array.from(container.querySelectorAll(selector));
    if(!items.length) return false;
    const expected = ORDER.flatMap(color => items.filter(item => readEnergy(item) === color));
    if(expected.length !== items.length) return false;
    const already = expected.every((item,index) => item === items[index]);
    if(!already) expected.forEach(item => container.appendChild(item));
    return true;
  }

  function reorderRGBG(){
    reorder(document.querySelector('.energy-selector'),'.energy-button',item => item.dataset.energy || '');
    reorder(document.querySelector('.ksv2-core-grid'),'.ksv2-core-card',item => {
      if(item.classList.contains('red')) return 'RED';
      if(item.classList.contains('green')) return 'GREEN';
      if(item.classList.contains('blue')) return 'BLUE';
      if(item.classList.contains('gray')) return 'GRAY';
      return '';
    });
    const gallery = document.getElementById('cardGallery');
    if(gallery && gallery.querySelectorAll('.gallery-card').length >= 28){
      reorder(gallery,'.gallery-card',item => item.dataset.energy || '');
      if(galleryObserver){ galleryObserver.disconnect(); galleryObserver = null; }
    }
  }

  async function rebuildRows(){
    try{
      const {cardSVG} = await art();
      const build = (targetId,ids,className,width,showNumber) => {
        const target = document.getElementById(targetId);
        if(!target || target.dataset.polishV5 === 'true') return;
        const fragment = document.createDocumentFragment();
        ids.forEach((id,index) => {
          const card = document.createElement('div');
          card.className = className;
          if(targetId === 'heroCards') card.dataset.index = String(index);
          card.innerHTML = cardSVG(id,{width,showNumber});
          fragment.appendChild(card);
        });
        target.replaceChildren(fragment);
        target.dataset.polishV5 = 'true';
      };
      build('heroCards',HERO,'hero-card',300,true);
      build('pocketCards',POCKET,'mini-card',220,false);
    }catch(error){
      console.error('Unable to rebuild RGBG card rows.',error);
    }
  }

  async function ensurePassion(){
    const front = document.getElementById('ksv2CardFront');
    const back = document.querySelector('#ksv2FlipCard .ksv2-flip-back img');
    if(back) back.src = '/core7/assets/card-back-core7.webp?v=' + VERSION;
    if(!front || front.dataset.cardId === 'fh-red-passion') return;
    try{
      const {cardSVG} = await art();
      front.innerHTML = '<div data-passion-card>' + cardSVG('fh-red-passion',{width:360}) + '</div>';
      front.dataset.cardId = 'fh-red-passion';
      front.setAttribute('aria-label',language() === 'th' ? 'การ์ด PASSION จากชุด FIRST HAND' : 'PASSION card from the FIRST HAND set');
    }catch(error){
      console.error('Unable to render PASSION card.',error);
    }
  }

  function figure(id,kind){
    const item = STORIES.find(row => row.id === id);
    const copy = item ? item[language()] : ['', ''];
    const node = document.createElement('figure');
    node.dataset.storyId = id;
    node.innerHTML = '<img src="/kickstarter/assets/story/' + id + '.webp?v=' + VERSION + '" width="960" height="600" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
    node.querySelector('img').alt = copy[0];
    node.querySelector('strong').textContent = copy[0];
    node.querySelector('span').textContent = copy[1];
    if(kind) node.dataset.storyInline = kind;
    return node;
  }

  function insertNameOrigin(){
    if(document.getElementById('name-origin')) return;
    const game = document.getElementById('game');
    if(!game || !game.parentNode) return;
    const section = document.createElement('section');
    section.id = 'name-origin';
    section.className = 'name-origin section-dark';
    section.innerHTML = '<div class="wrap name-origin-grid"><div class="name-origin-mark reveal is-visible" aria-hidden="true"><span>4</span><b>→</b><span>7</span></div><div class="name-origin-copy reveal is-visible"><p id="nameOriginKicker" class="eyebrow"></p><h2 id="nameOriginTitle"></h2><p id="nameOriginBody"></p><blockquote id="nameOriginQuote"></blockquote><div class="name-origin-chips"><span>FOUR-LEAF CLOVER</span><span>MY LUCKY SEVEN</span><span>SEVEN CHOSEN WORDS</span></div></div></div>';
    game.parentNode.insertBefore(section,game);
  }

  function insertStories(){
    if(!document.getElementById('visual-story')){
      const languageSection = document.querySelector('.language');
      if(languageSection && languageSection.parentNode){
        const section = document.createElement('section');
        section.id = 'visual-story';
        section.className = 'ks-story-static';
        section.innerHTML = '<div class="wrap"><div class="ks-story-static-head"><p class="eyebrow" data-story-kicker></p><h2 data-story-title></h2><p data-story-lead></p></div><div class="ks-story-static-grid"></div></div>';
        const grid = section.querySelector('.ks-story-static-grid');
        STORIES.forEach(item => grid.appendChild(figure(item.id)));
        languageSection.parentNode.insertBefore(section,languageSection);
      }
    }

    const founderGrid = document.querySelector('#founder .founder-grid');
    if(founderGrid && !founderGrid.querySelector('[data-story-inline="founder"]')){
      const node = document.createElement('figure');
      node.className = 'ks-story-inline';
      node.dataset.storyInline = 'founder';
      node.innerHTML = '<img src="/kickstarter/assets/story/founder-daughter.webp?v=' + VERSION + '" width="960" height="600" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
      founderGrid.insertBefore(node,founderGrid.querySelector('.founder-story') || founderGrid.firstChild);
    }

    const riskGrid = document.querySelector('.risks .risk-grid');
    if(riskGrid && !riskGrid.querySelector('[data-story-inline="shipping"]')){
      const node = document.createElement('figure');
      node.className = 'ks-story-inline';
      node.dataset.storyInline = 'shipping';
      node.innerHTML = '<img src="/kickstarter/assets/story/built-to-ship.webp?v=' + VERSION + '" width="960" height="600" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
      riskGrid.appendChild(node);
    }
  }

  function replaceVisibleTerms(){
    const replacements = [
      ['CORE7BO5','CORE7 Set'],
      ['Quick Plays','CORE7 Matches'],
      ['Quick Play','CORE7 Match'],
      ['Best-of-5','CORE7 Set'],
      ['Standard Match','CORE7 Set'],
      ['Standard Format','CORE7 Set'],
      ['Body. Mind. Soul. Craft.','Body. Soul. Mind. Craft.'],
      ['BODY · MIND · SOUL · CRAFT','BODY · SOUL · MIND · CRAFT']
    ];
    const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        const parent = node.parentElement;
        if(!parent || /^(SCRIPT|STYLE|NOSCRIPT)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let value = node.nodeValue;
      replacements.forEach(([oldText,newText]) => { value = value.replaceAll(oldText,newText); });
      node.nodeValue = value;
    });
  }

  function applyMatchSetCopy(){
    const thai = language() === 'th';
    const kicker = document.querySelector('#game .section-heading .eyebrow');
    if(kicker) kicker.textContent = thai ? 'CORE7 · MATCH' : 'CORE7 · MATCH';

    const stepFive = document.querySelector('.how-list li:nth-child(5)');
    if(stepFive){
      const title = stepFive.querySelector('b');
      const body = stepFive.querySelector('p');
      if(title) title.textContent = thai ? 'ชนะ 3 Rounds' : 'Win three Rounds.';
      if(body) body.textContent = thai ? 'คนแรกที่ชนะสาม Rounds จะชนะหนึ่ง CORE7 Match' : 'The first player to win three Rounds wins one CORE7 Match.';
    }

    const guide = document.getElementById('formatGuide');
    if(guide){
      guide.innerHTML = thai
        ? '<article class="quick"><span>CORE7 MATCH</span><h3>ชนะ 3 Rounds</h3><p>หนึ่งเกมที่สมบูรณ์ เลือกการ์ดลับ เปิดพร้อมกัน และเป็นคนแรกที่ชนะสาม Rounds</p></article><article class="standard"><span>CORE7 SET · LOCKED HAND</span><h3>มือเดิม ชนะ 3 Matches</h3><p>ล็อก CORE7 เจ็ดใบเดิมตลอด Set รีเซ็ตมือเดิมหลังทุก Match คนแรกที่ชนะสาม Matches ชนะ Set</p></article>'
        : '<article class="quick"><span>CORE7 MATCH</span><h3>Win 3 Rounds.</h3><p>One complete Match. Choose in secret, reveal together, and become the first player to win three Rounds.</p></article><article class="standard"><span>CORE7 SET · LOCKED HAND</span><h3>Same hand. Win 3 Matches.</h3><p>Lock the same CORE7 hand for the whole Set. Reset those seven cards after every Match. First to win three Matches wins the Set.</p></article>';
    }

    const memoryQuote = document.querySelector('.memory-copy blockquote');
    if(memoryQuote) memoryQuote.innerHTML = thai ? 'CORE7 Match สร้างความประทับใจแรก<br>CORE7 Set ทำให้ความทรงจำนั้นลึกขึ้น' : 'A CORE7 Match creates the first impression.<br>A CORE7 Set strengthens it.';

    const scoreboard = document.querySelector('.ksv2-scoreboard-top b');
    if(scoreboard) scoreboard.textContent = 'CORE7 SET';
    const bo5 = document.querySelector('.ksv2-bo5');
    if(bo5) bo5.textContent = 'SET';
    const boardText = document.querySelector('.ksv2-scoreboard > p');
    if(boardText) boardText.textContent = thai ? 'มือเจ็ดใบเดิม คนแรกที่ชนะสาม Matches ชนะ Set' : 'One locked seven-card hand. First to win three Matches wins the Set.';
  }

  function applyCopy(){
    const thai = language() === 'th';
    const hero = document.querySelector('.hero-lead');
    if(hero) hero.textContent = thai
      ? 'เกม 32 ใบที่สอนได้ในสิบวินาที สุ่ม 0% ตัดสินใจ 100% สิ่งเดียวที่คาดเดาไม่ได้คือมนุษย์ตรงหน้า'
      : 'A 32-card game you can teach in ten seconds. 0% RNG. 100% decisions. The only unpredictable thing is the human across the table.';
    const micro = document.querySelector('.micro-proof');
    if(micro) micro.textContent = thai
      ? 'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · สุ่ม 0% · ตัดสินใจ 100% · หนึ่งกล่องสร้างมือได้สองคน'
      : '28 word cards · 4 rule cards · 0% RNG · 100% DECISIONS · 1 box for two complete hands';

    const labels = thai
      ? {RED:'แดง · กาย',GREEN:'เขียว · จิตวิญญาณ',BLUE:'ฟ้า · ความคิด',GRAY:'เทา · งานสร้าง'}
      : {RED:'RED · BODY',GREEN:'GREEN · SOUL',BLUE:'BLUE · MIND',GRAY:'GRAY · CRAFT'};
    document.querySelectorAll('.energy-button').forEach(button => {
      if(labels[button.dataset.energy]) button.innerHTML = '<span>●</span> ' + labels[button.dataset.energy];
    });

    const nameKicker = document.getElementById('nameOriginKicker');
    const nameTitle = document.getElementById('nameOriginTitle');
    const nameBody = document.getElementById('nameOriginBody');
    const nameQuote = document.getElementById('nameOriginQuote');
    if(nameKicker) nameKicker.textContent = thai ? 'ที่มาของชื่อ' : 'THE NAME';
    if(nameTitle) nameTitle.innerHTML = thai ? 'myClover คือโชค<br><em>ที่เราเลือกพกไปด้วย</em>' : 'myClover is luck<br><em>you choose to carry.</em>';
    if(nameBody) nameBody.textContent = thai ? 'ชื่อเริ่มจากโคลเวอร์สี่แฉก และแนวคิด “my lucky seven” — เจ็ดคำที่เราเลือกถือไปพบคนตรงหน้า' : 'The name began with a four-leaf clover and the idea of “my lucky seven”: the seven words you choose to carry into a meeting.';
    if(nameQuote) nameQuote.innerHTML = thai ? 'ดวงถูกใช้ไปหมดแล้วตอนที่เราได้มาเจอกัน<br>ที่เหลือคือการตัดสินใจของเรา' : 'The luck was meeting.<br>The game is all decisions.';

    const visual = document.getElementById('visual-story');
    if(visual){
      const kicker = visual.querySelector('[data-story-kicker]');
      const title = visual.querySelector('[data-story-title]');
      const lead = visual.querySelector('[data-story-lead]');
      if(kicker) kicker.textContent = thai ? 'เรื่องราวที่เล่าด้วยภาพ' : 'THE VISUAL STORY';
      if(title) title.textContent = thai ? 'เกมที่เล็กขนาดนี้ควรถูกมองเห็น ไม่ใช่ถูกฝังอยู่ในย่อหน้า' : 'A game this small should be seen—not buried in paragraphs.';
      if(lead) lead.textContent = thai ? 'ภาพหกชุดเล่าเส้นทางตั้งแต่การถอดกติกา การพบกันครั้งแรก การเล่นซ้ำ การผลิต และโต๊ะที่เกมนี้เริ่มต้น' : 'Six images trace the system from removing rules to first meetings, repeated play, production and the table where it began.';
      STORIES.forEach(item => {
        const node = visual.querySelector('[data-story-id="' + item.id + '"]');
        if(!node) return;
        const copy = item[language()];
        node.querySelector('img').alt = copy[0];
        node.querySelector('strong').textContent = copy[0];
        node.querySelector('span').textContent = copy[1];
      });
    }

    const founder = document.querySelector('[data-story-inline="founder"]');
    if(founder){
      const title = thai ? 'โต๊ะที่เกมนี้เริ่มต้น' : 'The table where the game began';
      const body = thai ? 'ระบบถูกออกแบบโดยผู้สร้างหนึ่งคน แต่เกมถูกค้นพบจากการช่วยกันถอดกติกากับลูกสาว' : 'The system was designed by one creator. The game was discovered by removing rules together with his daughter.';
      founder.querySelector('img').alt = title;
      founder.querySelector('strong').textContent = title;
      founder.querySelector('span').textContent = body;
    }
    const shipping = document.querySelector('[data-story-inline="shipping"]');
    if(shipping){
      const title = thai ? 'สร้างมาเพื่อส่งมอบ ไม่ใช่ขยายจนควบคุมไม่ได้' : 'Built to ship, not to spiral';
      const body = thai ? 'หนึ่งกล่องขนาดกะทัดรัด ปรู๊ฟที่ควบคุมได้ และไม่มีความซับซ้อนซ่อนอยู่ใน Stretch Goals' : 'One compact box, controlled proofs and no production complexity hiding inside stretch goals.';
      shipping.querySelector('img').alt = title;
      shipping.querySelector('strong').textContent = title;
      shipping.querySelector('span').textContent = body;
    }

    applyMatchSetCopy();
    replaceVisibleTerms();
  }

  function apply(){
    showAll();
    replaceAssetPaths();
    insertNameOrigin();
    insertStories();
    reorderRGBG();
    rebuildRows();
    ensurePassion();
    applyCopy();
  }

  function init(){
    apply();
    [100,350,900,1800].forEach(delay => setTimeout(apply,delay));
    const gallery = document.getElementById('cardGallery');
    if(gallery && gallery.querySelectorAll('.gallery-card').length < 28){
      galleryObserver = new MutationObserver(reorderRGBG);
      galleryObserver.observe(gallery,{childList:true});
    }
    new MutationObserver(() => setTimeout(applyCopy,0)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
