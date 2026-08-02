(function(){
  'use strict';

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

  let artPromise;
  const art = () => artPromise || (artPromise = import('/core7/js/art.js'));

  function replaceLegacyAssets(root = document){
    root.querySelectorAll('img[src], source[src], source[srcset]').forEach(node => {
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

  function reorderByEnergy(container, itemSelector, readEnergy){
    if(!container) return;
    const items = Array.from(container.querySelectorAll(itemSelector));
    if(!items.length) return;
    const expected = COLOR_ORDER.flatMap(color => items.filter(item => readEnergy(item) === color));
    if(expected.length !== items.length) return;
    const alreadyOrdered = expected.every((item,index) => item === items[index]);
    if(!alreadyOrdered) expected.forEach(item => container.appendChild(item));
  }

  function reorderRGBG(){
    const selector = document.querySelector('.energy-selector');
    reorderByEnergy(selector,'.energy-button',item => item.dataset.energy);

    const gallery = document.getElementById('cardGallery');
    reorderByEnergy(gallery,'.gallery-card',item => item.dataset.energy);

    const cores = document.querySelector('.ksv2-core-grid');
    reorderByEnergy(cores,'.ksv2-core-card',item => {
      if(item.classList.contains('red')) return 'RED';
      if(item.classList.contains('green')) return 'GREEN';
      if(item.classList.contains('blue')) return 'BLUE';
      if(item.classList.contains('gray')) return 'GRAY';
      return '';
    });
  }

  async function rebuildCards(targetId, ids, className, width, showNumber){
    const target = document.getElementById(targetId);
    if(!target || target.dataset.rgbgV4 === 'true') return;
    try{
      const {cardSVG} = await art();
      const fragment = document.createDocumentFragment();
      ids.forEach((id,index) => {
        const card = document.createElement('div');
        card.className = className;
        if(targetId === 'heroCards') card.dataset.index = String(index);
        card.innerHTML = cardSVG(id,{width,showNumber});
        fragment.appendChild(card);
      });
      target.replaceChildren(fragment);
      target.dataset.rgbgV4 = 'true';
    }catch(error){
      console.error('Unable to rebuild RGBG card row.',error);
    }
  }

  async function enforcePassionFlip(){
    const front = document.getElementById('ksv2CardFront');
    const back = document.querySelector('#ksv2FlipCard .ksv2-flip-back img');
    if(back) back.src = '/core7/assets/card-back-core7.webp?v=20260803-rgbg-v4';
    if(!front || front.dataset.rgbgV4 === 'true') return;
    try{
      const {cardSVG} = await art();
      front.innerHTML = cardSVG('fh-red-passion',{width:360});
      front.dataset.passion = 'true';
      front.dataset.rgbgV4 = 'true';
      front.setAttribute('aria-label',document.documentElement.lang === 'th'
        ? 'การ์ด PASSION จากชุด FIRST HAND'
        : 'PASSION card from the FIRST HAND set');
    }catch(error){
      console.error('Unable to render PASSION flip card.',error);
    }
  }

  function applyCanonicalCopy(){
    const thai = document.documentElement.lang === 'th';
    const labels = thai
      ? {RED:'แดง · กาย',GREEN:'เขียว · จิตวิญญาณ',BLUE:'ฟ้า · ความคิด',GRAY:'เทา · งานสร้าง'}
      : {RED:'RED · BODY',GREEN:'GREEN · SOUL',BLUE:'BLUE · MIND',GRAY:'GRAY · CRAFT'};

    document.querySelectorAll('.energy-button').forEach(button => {
      const label = labels[button.dataset.energy];
      if(label) button.innerHTML = '<span>●</span> ' + label;
    });

    const heroLead = document.querySelector('.hero-lead');
    if(heroLead) heroLead.textContent = thai
      ? 'เกม 32 ใบที่สอนได้ในสิบวินาที สุ่ม 0% ตัดสินใจ 100% สิ่งเดียวที่คาดเดาไม่ได้คือมนุษย์ตรงหน้า'
      : 'A 32-card game you can teach in ten seconds. 0% RNG. 100% decisions. The only unpredictable thing is the human across the table.';

    const micro = document.querySelector('.micro-proof');
    if(micro) micro.textContent = thai
      ? 'การ์ดคำ 28 ใบ · การ์ดกติกา 4 ใบ · สุ่ม 0% · ตัดสินใจ 100% · หนึ่งกล่องสร้างมือได้สองคน'
      : '28 word cards · 4 rule cards · 0% RNG · 100% decisions · 1 box for two complete hands';

    const languageTitle = document.querySelector('.language .section-heading h2');
    if(languageTitle) languageTitle.innerHTML = thai
      ? 'สี่สี สี่ส่วนของความเป็นมนุษย์<br><em>กาย · จิตวิญญาณ · ความคิด · งานสร้าง</em>'
      : 'Four colors. Four parts of being human.<br><em>Body. Soul. Mind. Craft.</em>';

    const boxWords = document.querySelector('#box .box-item:first-child p');
    if(boxWords) boxWords.textContent = thai
      ? 'แดง เขียว ฟ้า และเทา สีละเจ็ดใบ แต่ละใบมีภาพ คำภาษาอังกฤษ และความหมายภาษาไทย'
      : 'Seven Red, Green, Blue and Gray cards, each with art, an English keyword and its Thai meaning.';

    const openBody = document.querySelector('.open-copy > p:not(.eyebrow):not(.open-emphasis)');
    if(openBody) openBody.textContent = thai
      ? 'เขียน แดง เขียว ฟ้า และเทา ลงบนกระดาษ CORE7 ก็ยังเล่นได้ กติกายังคงเปิด และออนไลน์ยังคงฟรี'
      : 'Write RED, GREEN, BLUE and GRAY on paper. CORE7 still works. The rules stay open and online play stays free.';

    const coreTitle = document.querySelector('#foil-cores .ksv2-title');
    if(coreTitle) coreTitle.textContent = thai
      ? 'กาย · จิตวิญญาณ · ความคิด · งานสร้าง'
      : 'Body. Soul. Mind. Craft.';

    const stretch = Array.from(document.querySelectorAll('.stretch-goal b')).find(node => /BODY|กาย/.test(node.textContent));
    if(stretch) stretch.textContent = thai
      ? 'กาย · จิตวิญญาณ · ความคิด · งานสร้าง'
      : 'BODY · SOUL · MIND · CRAFT';
  }

  function apply(){
    replaceLegacyAssets();
    reorderRGBG();
    applyCanonicalCopy();
    enforcePassionFlip();
    rebuildCards('heroCards',HERO_IDS,'hero-card',300,true);
    rebuildCards('pocketCards',POCKET_IDS,'mini-card',220,false);
  }

  function init(){
    apply();
    [80,250,700,1400,2600].forEach(delay => setTimeout(apply,delay));

    const gallery = document.getElementById('cardGallery');
    if(gallery){
      new MutationObserver(() => reorderRGBG()).observe(gallery,{childList:true});
    }

    new MutationObserver(() => setTimeout(apply,0)).observe(document.documentElement,{
      attributes:true,
      attributeFilter:['lang']
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
