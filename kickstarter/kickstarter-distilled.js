(function(){
  'use strict';

  const VERSION = '20260803-stable-v2';
  const COLOR_ORDER = ['RED','GREEN','BLUE','GRAY'];
  const HERO_IDS = [
    'fh-red-courage',
    'fh-green-balance',
    'fh-blue-clarity',
    'fh-gray-build',
    'fh-red-joy',
    'fh-green-recovery',
    'fh-blue-strategy'
  ];
  const POCKET_IDS = [
    'fh-red-desire',
    'fh-green-discipline',
    'fh-blue-perspective',
    'fh-gray-observe',
    'fh-red-warmth',
    'fh-green-commitment',
    'fh-blue-choice'
  ];

  const STORY = [
    {
      id:'removing-rules',
      src:'/kickstarter/assets/story/removing-rules.webp',
      en:['Nothing left to remove','Three colors created the rules. The empty Gray card created the game.'],
      th:['ถอดจนไม่เหลืออะไรให้ถอด','สามสีสร้างกติกา ส่วนการ์ดเทาที่ว่างเปล่าสร้างเกม']
    },
    {
      id:'one-box-ritual',
      src:'/kickstarter/assets/story/one-box-ritual.webp',
      en:['Choose seven. Share twenty-one.','One compact box creates two complete hands without a second deck.'],
      th:['เลือกเจ็ด ส่งต่อยี่สิบเอ็ด','หนึ่งกล่องเล็กสร้างมือที่สมบูรณ์ให้คนสองคนได้โดยไม่ต้องมีเด็คที่สอง']
    },
    {
      id:'first-meeting',
      src:'/kickstarter/assets/story/first-meeting.webp',
      en:['A shared feeling before a shared language','The luck was already spent when two people found each other. Everything after that is a decision.'],
      th:['มีความรู้สึกร่วมกันก่อนมีภาษาร่วมกัน','ดวงถูกใช้ไปแล้วตอนที่คนสองคนได้พบกัน หลังจากนั้นคือการตัดสินใจทั้งหมด']
    },
    {
      id:'core7bo5-memory',
      src:'/kickstarter/assets/story/core7bo5-memory.webp',
      en:['Same hand. Stronger memory.','CORE7BO5 keeps the seven cards fixed while the humans learn each other.'],
      th:['มือเดิม ความทรงจำที่แน่นขึ้น','CORE7BO5 ล็อกเจ็ดใบเดิม ขณะที่มนุษย์สองคนค่อย ๆ เรียนรู้กัน']
    }
  ];

  const EXTRA = {
    en:{
      visualKicker:'THE VISUAL STORY',
      visualTitle:'A game this small should be seen—not buried in paragraphs.',
      visualLead:'Six images trace the system from removing rules to first meetings, repeated play, production and the table where it began.',
      founderTitle:'The table where the game began',
      founderBody:'The system was designed by one creator. The game was discovered by removing rules together with his daughter.',
      shippingTitle:'Built to ship, not to spiral',
      shippingBody:'One compact box, controlled proofs and no production complexity hiding inside stretch goals.'
    },
    th:{
      visualKicker:'เรื่องราวที่เล่าด้วยภาพ',
      visualTitle:'เกมที่เล็กขนาดนี้ควรถูกมองเห็น ไม่ใช่ถูกฝังอยู่ในย่อหน้า',
      visualLead:'ภาพหกชุดเล่าเส้นทางตั้งแต่การถอดกติกา การพบกันครั้งแรก การเล่นซ้ำ การผลิต และโต๊ะที่เกมนี้เริ่มต้น',
      founderTitle:'โต๊ะที่เกมนี้เริ่มต้น',
      founderBody:'ระบบถูกออกแบบโดยผู้สร้างหนึ่งคน แต่เกมถูกค้นพบจากการช่วยกันถอดกติกากับลูกสาว',
      shippingTitle:'สร้างมาเพื่อส่งมอบ ไม่ใช่ขยายจนควบคุมไม่ได้',
      shippingBody:'หนึ่งกล่องขนาดกะทัดรัด ปรู๊ฟที่ควบคุมได้ และไม่มีความซับซ้อนซ่อนอยู่ใน Stretch Goals'
    }
  };

  let artPromise;
  let passionMarkup = '';
  let passionRendering = false;
  let frontObserver;

  function language(){
    return document.documentElement.lang === 'th' ? 'th' : 'en';
  }

  function art(){
    return artPromise || (artPromise = import('/core7/js/art.js?v=' + VERSION));
  }

  function showContent(){
    document.querySelectorAll('.reveal').forEach(node => node.classList.add('is-visible'));
  }

  function replaceLegacyAssets(){
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
    if(!container) return;
    const items = Array.from(container.querySelectorAll(selector));
    if(!items.length) return;
    COLOR_ORDER.forEach(color => {
      items.filter(item => readEnergy(item) === color).forEach(item => container.appendChild(item));
    });
  }

  function reorderRGBG(){
    reorder(document.querySelector('.energy-selector'),'.energy-button',item => item.dataset.energy || '');
    reorder(document.getElementById('cardGallery'),'.gallery-card',item => item.dataset.energy || '');
    reorder(document.querySelector('.ksv2-core-grid'),'.ksv2-core-card',item => {
      if(item.classList.contains('red')) return 'RED';
      if(item.classList.contains('green')) return 'GREEN';
      if(item.classList.contains('blue')) return 'BLUE';
      if(item.classList.contains('gray')) return 'GRAY';
      return '';
    });
  }

  async function rebuildCardRows(){
    try{
      const {cardSVG} = await art();
      const build = (targetId,ids,className,width,showNumber) => {
        const target = document.getElementById(targetId);
        if(!target || target.dataset.stableRgbg === 'true') return;
        const fragment = document.createDocumentFragment();
        ids.forEach((id,index) => {
          const card = document.createElement('div');
          card.className = className;
          if(targetId === 'heroCards') card.dataset.index = String(index);
          card.innerHTML = cardSVG(id,{width,showNumber});
          fragment.appendChild(card);
        });
        target.replaceChildren(fragment);
        target.dataset.stableRgbg = 'true';
      };
      build('heroCards',HERO_IDS,'hero-card',300,true);
      build('pocketCards',POCKET_IDS,'mini-card',220,false);
    }catch(error){
      console.error('Unable to rebuild RGBG card rows.',error);
    }
  }

  function setCardBack(){
    const back = document.querySelector('#ksv2FlipCard .ksv2-flip-back img');
    if(back) back.src = '/core7/assets/card-back-core7.webp?v=' + VERSION;
  }

  async function ensurePassion(){
    const front = document.getElementById('ksv2CardFront');
    if(!front || passionRendering || front.querySelector('[data-passion-card]')){
      setCardBack();
      return;
    }
    passionRendering = true;
    try{
      if(!passionMarkup){
        const {cardSVG} = await art();
        passionMarkup = '<div data-passion-card>' + cardSVG('fh-red-passion',{width:360}) + '</div>';
      }
      front.innerHTML = passionMarkup;
      front.dataset.cardId = 'fh-red-passion';
      front.setAttribute('aria-label',language() === 'th'
        ? 'การ์ด PASSION จากชุด FIRST HAND'
        : 'PASSION card from the FIRST HAND set');
    }catch(error){
      console.error('Unable to render PASSION card.',error);
      front.innerHTML = '<div data-passion-card style="height:100%;display:grid;place-items:center;background:#8f2b1a;color:#fff;font-weight:900">PASSION · แรงปรารถนา</div>';
    }finally{
      passionRendering = false;
      setCardBack();
    }
  }

  function observePassion(){
    const front = document.getElementById('ksv2CardFront');
    if(!front || frontObserver) return;
    frontObserver = new MutationObserver(() => {
      if(!front.querySelector('[data-passion-card]')) setTimeout(ensurePassion,0);
    });
    frontObserver.observe(front,{childList:true,subtree:true});
  }

  function storyFigure(item){
    const lang = language();
    const copy = item[lang];
    const figure = document.createElement('figure');
    figure.dataset.storyId = item.id;
    figure.innerHTML = '<img src="' + item.src + '?v=' + VERSION + '" loading="lazy" decoding="async" alt="' + copy[0] + '"><figcaption><strong></strong><span></span></figcaption>';
    figure.querySelector('strong').textContent = copy[0];
    figure.querySelector('span').textContent = copy[1];
    return figure;
  }

  function injectStory(){
    if(document.getElementById('visual-story')) return;
    const languageSection = document.querySelector('.language');
    if(!languageSection || !languageSection.parentNode) return;
    const section = document.createElement('section');
    section.id = 'visual-story';
    section.className = 'ks-story-static';
    section.innerHTML = '<div class="wrap"><div class="ks-story-static-head"><p class="eyebrow" data-story-kicker></p><h2 data-story-title></h2><p data-story-lead></p></div><div class="ks-story-static-grid"></div></div>';
    const grid = section.querySelector('.ks-story-static-grid');
    STORY.forEach(item => grid.appendChild(storyFigure(item)));
    languageSection.parentNode.insertBefore(section,languageSection);
  }

  function createInline(kind,src){
    const figure = document.createElement('figure');
    figure.className = 'ks-story-inline';
    figure.dataset.storyInline = kind;
    figure.innerHTML = '<img src="' + src + '?v=' + VERSION + '" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
    return figure;
  }

  function injectInlineStories(){
    const founderGrid = document.querySelector('#founder .founder-grid');
    if(founderGrid && !founderGrid.querySelector('[data-story-inline="founder"]')){
      const figure = createInline('founder','/kickstarter/assets/story/founder-daughter.webp');
      const story = founderGrid.querySelector('.founder-story');
      founderGrid.insertBefore(figure,story || founderGrid.firstChild);
    }

    const riskGrid = document.querySelector('.risks .risk-grid');
    if(riskGrid && !riskGrid.querySelector('[data-story-inline="shipping"]')){
      riskGrid.appendChild(createInline('shipping','/kickstarter/assets/story/built-to-ship.webp'));
    }
  }

  function applyCopy(){
    const lang = language();
    const extra = EXTRA[lang];
    const heroLead = document.querySelector('.hero-lead');
    if(heroLead) heroLead.textContent = lang === 'th'
      ? 'เกม 32 ใบที่สอนได้ในสิบวินาที สุ่ม 0% ตัดสินใจ 100% สิ่งเดียวที่คาดเดาไม่ได้คือมนุษย์ตรงหน้า'
      : 'A 32-card game you can teach in ten seconds. 0% RNG. 100% decisions. The only unpredictable thing is the human across the table.';
    const micro = document.querySelector('.micro-proof');
    if(micro) micro.textContent = lang === 'th'
      ? 'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · สุ่ม 0% · ตัดสินใจ 100% · หนึ่งกล่องสร้างมือได้สองคน'
      : '28 word cards · 4 rule cards · 0% RNG · 100% decisions · 1 box for two complete hands';

    const labels = lang === 'th'
      ? {RED:'แดง · กาย',GREEN:'เขียว · จิตวิญญาณ',BLUE:'ฟ้า · ความคิด',GRAY:'เทา · งานสร้าง'}
      : {RED:'RED · BODY',GREEN:'GREEN · SOUL',BLUE:'BLUE · MIND',GRAY:'GRAY · CRAFT'};
    document.querySelectorAll('.energy-button').forEach(button => {
      const label = labels[button.dataset.energy];
      if(label) button.innerHTML = '<span>●</span> ' + label;
    });

    const languageTitle = document.querySelector('.language .section-heading h2');
    if(languageTitle) languageTitle.innerHTML = lang === 'th'
      ? 'สี่สี สี่ส่วนของความเป็นมนุษย์<br><em>กาย · จิตวิญญาณ · ความคิด · งานสร้าง</em>'
      : 'Four colors. Four parts of being human.<br><em>Body. Soul. Mind. Craft.</em>';

    const boxWords = document.querySelector('#box .box-item:first-child p');
    if(boxWords) boxWords.textContent = lang === 'th'
      ? 'แดง เขียว ฟ้า และเทา สีละเจ็ดใบ แต่ละใบมีภาพ คำภาษาอังกฤษ และความหมายภาษาไทย'
      : 'Seven Red, Green, Blue and Gray cards, each with art, an English keyword and its Thai meaning.';

    const openBody = document.querySelector('.open-copy > p:not(.eyebrow):not(.open-emphasis)');
    if(openBody) openBody.textContent = lang === 'th'
      ? 'เขียน แดง เขียว ฟ้า และเทา ลงบนกระดาษ CORE7 ก็ยังเล่นได้ กติกายังคงเปิด และออนไลน์ยังคงฟรี'
      : 'Write RED, GREEN, BLUE and GRAY on paper. CORE7 still works. The rules stay open and online play stays free.';

    const visual = document.getElementById('visual-story');
    if(visual){
      visual.querySelector('[data-story-kicker]').textContent = extra.visualKicker;
      visual.querySelector('[data-story-title]').textContent = extra.visualTitle;
      visual.querySelector('[data-story-lead]').textContent = extra.visualLead;
      STORY.forEach(item => {
        const figure = visual.querySelector('[data-story-id="' + item.id + '"]');
        if(!figure) return;
        figure.querySelector('strong').textContent = item[lang][0];
        figure.querySelector('span').textContent = item[lang][1];
        figure.querySelector('img').alt = item[lang][0];
      });
    }

    const founder = document.querySelector('[data-story-inline="founder"]');
    if(founder){
      founder.querySelector('strong').textContent = extra.founderTitle;
      founder.querySelector('span').textContent = extra.founderBody;
      founder.querySelector('img').alt = extra.founderTitle;
    }
    const shipping = document.querySelector('[data-story-inline="shipping"]');
    if(shipping){
      shipping.querySelector('strong').textContent = extra.shippingTitle;
      shipping.querySelector('span').textContent = extra.shippingBody;
      shipping.querySelector('img').alt = extra.shippingTitle;
    }
  }

  function apply(){
    showContent();
    replaceLegacyAssets();
    injectStory();
    injectInlineStories();
    reorderRGBG();
    rebuildCardRows();
    ensurePassion();
    observePassion();
    applyCopy();
  }

  function init(){
    apply();
    setTimeout(apply,250);
    setTimeout(apply,1000);

    const gallery = document.getElementById('cardGallery');
    if(gallery){
      new MutationObserver(reorderRGBG).observe(gallery,{childList:true});
    }

    new MutationObserver(() => setTimeout(applyCopy,0)).observe(document.documentElement,{
      attributes:true,
      attributeFilter:['lang']
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
