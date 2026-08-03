(function(){
  'use strict';

  const VERSION = '20260803-stable-v3';
  const ORDER = ['RED','GREEN','BLUE','GRAY'];
  const HERO = ['fh-red-courage','fh-green-balance','fh-blue-clarity','fh-gray-build','fh-red-joy','fh-green-recovery','fh-blue-strategy'];
  const POCKET = ['fh-red-desire','fh-green-discipline','fh-blue-perspective','fh-gray-observe','fh-red-warmth','fh-green-commitment','fh-blue-choice'];
  const STORY = [
    ['removing-rules','Nothing left to remove','Three colors created the rules. The empty Gray card created the game.','ถอดจนไม่เหลืออะไรให้ถอด','สามสีสร้างกติกา ส่วนการ์ดเทาที่ว่างเปล่าสร้างเกม'],
    ['one-box-ritual','Choose seven. Share twenty-one.','One compact box creates two complete hands without a second deck.','เลือกเจ็ด ส่งต่อยี่สิบเอ็ด','หนึ่งกล่องเล็กสร้างมือที่สมบูรณ์ให้คนสองคนได้โดยไม่ต้องมีเด็คที่สอง'],
    ['first-meeting','A shared feeling before a shared language','The luck was already spent when two people found each other. Everything after that is a decision.','มีความรู้สึกร่วมกันก่อนมีภาษาร่วมกัน','ดวงถูกใช้ไปแล้วตอนที่คนสองคนได้พบกัน หลังจากนั้นคือการตัดสินใจทั้งหมด'],
    ['core7bo5-memory','Same hand. Stronger memory.','CORE7BO5 keeps the seven cards fixed while the humans learn each other.','มือเดิม ความทรงจำที่แน่นขึ้น','CORE7BO5 ล็อกเจ็ดใบเดิม ขณะที่มนุษย์สองคนค่อย ๆ เรียนรู้กัน']
  ];

  let artPromise;
  let passionMarkup = '';
  let passionBusy = false;
  let frontObserver;
  let galleryObserver;

  const isThai = () => document.documentElement.lang === 'th';
  const art = () => artPromise || (artPromise = import('/core7/js/art.js?v=' + VERSION));

  function showAll(){
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
    const expected = ORDER.flatMap(color => items.filter(item => readEnergy(item) === color));
    if(expected.length !== items.length) return;
    const alreadyOrdered = expected.every((item,index) => item === items[index]);
    if(!alreadyOrdered) expected.forEach(item => container.appendChild(item));
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

  async function rebuildRows(){
    try{
      const {cardSVG} = await art();
      const build = (id,ids,className,width,showNumber) => {
        const target = document.getElementById(id);
        if(!target || target.dataset.rgbgStable === 'true') return;
        const fragment = document.createDocumentFragment();
        ids.forEach((cardId,index) => {
          const card = document.createElement('div');
          card.className = className;
          if(id === 'heroCards') card.dataset.index = String(index);
          card.innerHTML = cardSVG(cardId,{width,showNumber});
          fragment.appendChild(card);
        });
        target.replaceChildren(fragment);
        target.dataset.rgbgStable = 'true';
      };
      build('heroCards',HERO,'hero-card',300,true);
      build('pocketCards',POCKET,'mini-card',220,false);
    }catch(error){
      console.error('Unable to rebuild RGBG card rows.',error);
    }
  }

  function setBack(){
    const image = document.querySelector('#ksv2FlipCard .ksv2-flip-back img');
    if(image) image.src = '/core7/assets/card-back-core7.webp?v=' + VERSION;
  }

  async function ensurePassion(){
    const front = document.getElementById('ksv2CardFront');
    if(!front || passionBusy || front.querySelector('[data-passion-card]')){
      setBack();
      return;
    }
    passionBusy = true;
    try{
      if(!passionMarkup){
        const {cardSVG} = await art();
        passionMarkup = '<div data-passion-card>' + cardSVG('fh-red-passion',{width:360}) + '</div>';
      }
      front.innerHTML = passionMarkup;
      front.dataset.cardId = 'fh-red-passion';
      front.setAttribute('aria-label',isThai() ? 'การ์ด PASSION จากชุด FIRST HAND' : 'PASSION card from the FIRST HAND set');
    }catch(error){
      console.error('Unable to render PASSION card.',error);
      front.innerHTML = '<div data-passion-card style="height:100%;display:grid;place-items:center;background:#8f2b1a;color:#fff;font-weight:900">PASSION · แรงปรารถนา</div>';
    }finally{
      passionBusy = false;
      setBack();
    }
  }

  function watchPassion(){
    const front = document.getElementById('ksv2CardFront');
    if(!front || frontObserver) return;
    frontObserver = new MutationObserver(() => {
      if(!front.querySelector('[data-passion-card]')) setTimeout(ensurePassion,0);
    });
    frontObserver.observe(front,{childList:true,subtree:true});
  }

  function storyFigure(row){
    const thai = isThai();
    const title = thai ? row[3] : row[1];
    const body = thai ? row[4] : row[2];
    const figure = document.createElement('figure');
    figure.dataset.storyId = row[0];
    figure.innerHTML = '<img src="/kickstarter/assets/story/' + row[0] + '.webp?v=' + VERSION + '" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
    figure.querySelector('img').alt = title;
    figure.querySelector('strong').textContent = title;
    figure.querySelector('span').textContent = body;
    return figure;
  }

  function injectStories(){
    if(!document.getElementById('visual-story')){
      const languageSection = document.querySelector('.language');
      if(languageSection && languageSection.parentNode){
        const section = document.createElement('section');
        section.id = 'visual-story';
        section.className = 'ks-story-static';
        section.innerHTML = '<div class="wrap"><div class="ks-story-static-head"><p class="eyebrow" data-story-kicker></p><h2 data-story-title></h2><p data-story-lead></p></div><div class="ks-story-static-grid"></div></div>';
        const grid = section.querySelector('.ks-story-static-grid');
        STORY.forEach(row => grid.appendChild(storyFigure(row)));
        languageSection.parentNode.insertBefore(section,languageSection);
      }
    }

    const founderGrid = document.querySelector('#founder .founder-grid');
    if(founderGrid && !founderGrid.querySelector('[data-story-inline="founder"]')){
      const figure = document.createElement('figure');
      figure.className = 'ks-story-inline';
      figure.dataset.storyInline = 'founder';
      figure.innerHTML = '<img src="/kickstarter/assets/story/founder-daughter.webp?v=' + VERSION + '" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
      const story = founderGrid.querySelector('.founder-story');
      founderGrid.insertBefore(figure,story || founderGrid.firstChild);
    }

    const riskGrid = document.querySelector('.risks .risk-grid');
    if(riskGrid && !riskGrid.querySelector('[data-story-inline="shipping"]')){
      const figure = document.createElement('figure');
      figure.className = 'ks-story-inline';
      figure.dataset.storyInline = 'shipping';
      figure.innerHTML = '<img src="/kickstarter/assets/story/built-to-ship.webp?v=' + VERSION + '" loading="lazy" decoding="async" alt=""><figcaption><strong></strong><span></span></figcaption>';
      riskGrid.appendChild(figure);
    }
  }

  function applyCopy(){
    const thai = isThai();
    const hero = document.querySelector('.hero-lead');
    if(hero) hero.textContent = thai
      ? 'เกม 32 ใบที่สอนได้ในสิบวินาที สุ่ม 0% ตัดสินใจ 100% สิ่งเดียวที่คาดเดาไม่ได้คือมนุษย์ตรงหน้า'
      : 'A 32-card game you can teach in ten seconds. 0% RNG. 100% decisions. The only unpredictable thing is the human across the table.';

    const micro = document.querySelector('.micro-proof');
    if(micro) micro.textContent = thai
      ? 'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · สุ่ม 0% · ตัดสินใจ 100% · หนึ่งกล่องสร้างมือได้สองคน'
      : '28 word cards · 4 rule cards · 0% RNG · 100% decisions · 1 box for two complete hands';

    const labels = thai
      ? {RED:'แดง · กาย',GREEN:'เขียว · จิตวิญญาณ',BLUE:'ฟ้า · ความคิด',GRAY:'เทา · งานสร้าง'}
      : {RED:'RED · BODY',GREEN:'GREEN · SOUL',BLUE:'BLUE · MIND',GRAY:'GRAY · CRAFT'};
    document.querySelectorAll('.energy-button').forEach(button => {
      const label = labels[button.dataset.energy];
      if(label) button.innerHTML = '<span>●</span> ' + label;
    });

    const heading = document.querySelector('.language .section-heading h2');
    if(heading) heading.innerHTML = thai
      ? 'สี่สี สี่ส่วนของความเป็นมนุษย์<br><em>กาย · จิตวิญญาณ · ความคิด · งานสร้าง</em>'
      : 'Four colors. Four parts of being human.<br><em>Body. Soul. Mind. Craft.</em>';

    const box = document.querySelector('#box .box-item:first-child p');
    if(box) box.textContent = thai
      ? 'แดง เขียว ฟ้า และเทา สีละเจ็ดใบ แต่ละใบมีภาพ คำภาษาอังกฤษ และความหมายภาษาไทย'
      : 'Seven Red, Green, Blue and Gray cards, each with art, an English keyword and its Thai meaning.';

    const open = document.querySelector('.open-copy > p:not(.eyebrow):not(.open-emphasis)');
    if(open) open.textContent = thai
      ? 'เขียน แดง เขียว ฟ้า และเทา ลงบนกระดาษ CORE7 ก็ยังเล่นได้ กติกายังคงเปิด และออนไลน์ยังคงฟรี'
      : 'Write RED, GREEN, BLUE and GRAY on paper. CORE7 still works. The rules stay open and online play stays free.';

    const visual = document.getElementById('visual-story');
    if(visual){
      visual.querySelector('[data-story-kicker]').textContent = thai ? 'เรื่องราวที่เล่าด้วยภาพ' : 'THE VISUAL STORY';
      visual.querySelector('[data-story-title]').textContent = thai ? 'เกมที่เล็กขนาดนี้ควรถูกมองเห็น ไม่ใช่ถูกฝังอยู่ในย่อหน้า' : 'A game this small should be seen—not buried in paragraphs.';
      visual.querySelector('[data-story-lead]').textContent = thai ? 'ภาพหกชุดเล่าเส้นทางตั้งแต่การถอดกติกา การพบกันครั้งแรก การเล่นซ้ำ การผลิต และโต๊ะที่เกมนี้เริ่มต้น' : 'Six images trace the system from removing rules to first meetings, repeated play, production and the table where it began.';
      STORY.forEach(row => {
        const figure = visual.querySelector('[data-story-id="' + row[0] + '"]');
        if(!figure) return;
        const title = thai ? row[3] : row[1];
        const body = thai ? row[4] : row[2];
        figure.querySelector('img').alt = title;
        figure.querySelector('strong').textContent = title;
        figure.querySelector('span').textContent = body;
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
  }

  function watchGalleryOnce(){
    const gallery = document.getElementById('cardGallery');
    if(!gallery || galleryObserver) return;
    const finish = () => {
      if(gallery.querySelectorAll('.gallery-card').length < 28) return false;
      reorderRGBG();
      galleryObserver.disconnect();
      galleryObserver = null;
      return true;
    };
    if(finish()) return;
    galleryObserver = new MutationObserver(finish);
    galleryObserver.observe(gallery,{childList:true});
  }

  function apply(){
    showAll();
    replaceLegacyAssets();
    injectStories();
    reorderRGBG();
    rebuildRows();
    ensurePassion();
    watchPassion();
    watchGalleryOnce();
    applyCopy();
  }

  function init(){
    apply();
    setTimeout(apply,300);
    setTimeout(apply,1200);
    new MutationObserver(() => setTimeout(applyCopy,0)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
