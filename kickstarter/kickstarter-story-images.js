(function(){
  'use strict';

  const ASSET_VERSION = '20260803-story-final';
  const COPY = {
    en: {
      visualLead: 'Six images trace the system from subtraction to first meetings, repeated play, production, and the table where it began.',
      founderTitle: 'The table where the game began',
      founderBody: 'The system was designed by one creator. The rules were discovered and stripped down together with his daughter.',
      founderAlt: 'A parent and child test handmade cards and remove unnecessary rules together.',
      shippingTitle: 'Built to ship, not to spiral',
      shippingBody: 'One compact box, controlled proofs, color checks and no production complexity hiding in the stretch goals.',
      shippingAlt: 'A controlled 32-card production setup with proofs, color checks and one compact box.'
    },
    th: {
      visualLead: 'ภาพหกชุดเล่าเส้นทางของระบบ ตั้งแต่การถอดกติกา การพบกันครั้งแรก การเล่นซ้ำ การผลิต และโต๊ะที่เกมนี้เริ่มต้น',
      founderTitle: 'โต๊ะที่เกมนี้เริ่มต้น',
      founderBody: 'ระบบถูกออกแบบโดยผู้สร้างหนึ่งคน แต่กติกาถูกค้นพบและถอดออกไปพร้อมกับลูกสาว',
      founderAlt: 'พ่อกับลูกสาวทดลองการ์ดทำมือ และช่วยกันถอดกติกาที่ไม่จำเป็นออก',
      shippingTitle: 'สร้างมาเพื่อส่งมอบ ไม่ใช่ขยายจนควบคุมไม่ได้',
      shippingBody: 'หนึ่งกล่องขนาดกะทัดรัด ปรู๊ฟที่ควบคุมได้ การตรวจสี และไม่มีความซับซ้อนในการผลิตซ่อนอยู่ใน Stretch Goals',
      shippingAlt: 'ชุดผลิตเกม 32 ใบที่ควบคุมขอบเขตชัดเจน พร้อมปรู๊ฟ สี และกล่องขนาดกะทัดรัด'
    }
  };

  const SLOT_ALTS = {
    en: {
      'removing-rules': 'Early prototypes becoming three colors and one intentionally empty Gray card.',
      'one-box-ritual': 'One player holds seven chosen cards and offers the remaining twenty-one to another person.',
      'first-meeting': 'Two strangers play myClover Cards while traveling, before sharing a spoken language.',
      'core7bo5-memory': 'The same seven-card hands repeat across five games while shared information accumulates.'
    },
    th: {
      'removing-rules': 'ต้นแบบที่ค่อย ๆ ถูกถอดออก จนเหลือสามสีและการ์ดเทาที่ตั้งใจให้ว่างเปล่า',
      'one-box-ritual': 'ผู้เล่นคนหนึ่งถือเจ็ดใบที่เลือก แล้วส่งอีกยี่สิบเอ็ดใบให้คนตรงหน้า',
      'first-meeting': 'คนแปลกหน้าสองคนเล่น myClover Cards ระหว่างเดินทาง ก่อนจะมีภาษาพูดร่วมกัน',
      'core7bo5-memory': 'มือเจ็ดใบเดิมถูกใช้ซ้ำตลอดห้าเกม ขณะที่ข้อมูลและความทรงจำร่วมกันสะสมขึ้น'
    }
  };

  function language(){
    return document.documentElement.lang === 'th' ? 'th' : 'en';
  }

  function createFigure(kind, src){
    const figure = document.createElement('figure');
    figure.className = `ks-story-figure ks-story-${kind} reveal is-visible`;
    figure.dataset.storyImage = kind;
    figure.innerHTML = `
      <img src="${src}?v=${ASSET_VERSION}" loading="lazy" decoding="async" alt="">
      <figcaption>
        <strong data-story-title></strong>
        <span data-story-body></span>
      </figcaption>`;
    return figure;
  }

  function injectFounderImage(){
    const grid = document.querySelector('#founder .founder-grid');
    if(!grid || grid.querySelector('[data-story-image="founder"]')) return;
    const figure = createFigure('founder','/kickstarter/assets/story/founder-daughter.webp');
    const story = grid.querySelector('.founder-story');
    grid.insertBefore(figure,story || grid.firstChild);
  }

  function injectShippingImage(){
    const grid = document.querySelector('.risks .risk-grid');
    if(!grid || grid.querySelector('[data-story-image="shipping"]')) return;
    const figure = createFigure('shipping','/kickstarter/assets/story/built-to-ship.webp');
    grid.appendChild(figure);
  }

  function updateSlotAlts(){
    const lang = language();
    document.querySelectorAll('.ksv3-art-slot[data-asset-id]').forEach(slot => {
      const image = slot.querySelector('img');
      const alt = SLOT_ALTS[lang][slot.dataset.assetId];
      if(image && alt) image.alt = alt;
    });
  }

  function updateCopy(){
    const lang = language();
    const copy = COPY[lang];
    const lead = document.querySelector('.ksv3-visual-head > p:last-child');
    if(lead) lead.textContent = copy.visualLead;

    const founder = document.querySelector('[data-story-image="founder"]');
    if(founder){
      const image = founder.querySelector('img');
      const title = founder.querySelector('[data-story-title]');
      const body = founder.querySelector('[data-story-body]');
      if(image) image.alt = copy.founderAlt;
      if(title) title.textContent = copy.founderTitle;
      if(body) body.textContent = copy.founderBody;
    }

    const shipping = document.querySelector('[data-story-image="shipping"]');
    if(shipping){
      const image = shipping.querySelector('img');
      const title = shipping.querySelector('[data-story-title]');
      const body = shipping.querySelector('[data-story-body]');
      if(image) image.alt = copy.shippingAlt;
      if(title) title.textContent = copy.shippingTitle;
      if(body) body.textContent = copy.shippingBody;
    }

    updateSlotAlts();
  }

  function apply(){
    injectFounderImage();
    injectShippingImage();
    updateCopy();
  }

  function init(){
    apply();
    [100,350,900,1800].forEach(delay => setTimeout(apply,delay));

    const artGrid = document.querySelector('.ksv3-art-grid');
    if(artGrid){
      new MutationObserver(updateSlotAlts).observe(artGrid,{childList:true,subtree:true});
    }

    new MutationObserver(() => setTimeout(updateCopy,0)).observe(document.documentElement,{
      attributes:true,
      attributeFilter:['lang']
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
