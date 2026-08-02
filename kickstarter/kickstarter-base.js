(function(){
  'use strict';

  const HERO_IDS = [
    'fh-red-courage',
    'fh-blue-clarity',
    'fh-green-balance',
    'fh-gray-build',
    'fh-red-joy',
    'fh-blue-strategy',
    'fh-green-recovery'
  ];

  const POCKET_IDS = [
    'fh-red-desire',
    'fh-blue-perspective',
    'fh-green-discipline',
    'fh-gray-observe',
    'fh-red-warmth',
    'fh-blue-choice',
    'fh-green-commitment'
  ];

  const ENERGY_COPY = {
    RED: {
      label: 'RED · DRIVE',
      headline: 'What makes you move?',
      body: 'Desire, Joy, Taste, Passion, Courage, Warmth and Celebration — the fire that gives a decision emotional weight.'
    },
    BLUE: {
      label: 'BLUE · MIND',
      headline: 'What helps you see?',
      body: 'Clarity, Perspective, Wisdom, Curiosity, Strategy, Reflection and Choice — the mind that turns noise into direction.'
    },
    GREEN: {
      label: 'GREEN · GROWTH',
      headline: 'What helps you continue?',
      body: 'Discipline, Consistency, Balance, Patience, Care, Recovery and Commitment — the living systems that make progress sustainable.'
    },
    GRAY: {
      label: 'GRAY · CRAFT',
      headline: 'What makes the idea real?',
      body: 'Observe, Measure, Build, Repair, Connect, Adapt and Iterate — the tools that turn intention into something the world can use.'
    }
  };

  function setProgress(){
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const pct = Math.min(100, Math.max(0, scrollY / max * 100));
    const bar = document.querySelector('.scroll-progress span');
    if(bar) bar.style.width = pct + '%';
  }

  function initReveal(){
    const items = document.querySelectorAll('.reveal');
    if(!('IntersectionObserver' in window)){
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    items.forEach(el => observer.observe(el));
  }

  function fallbackCard(name, color){
    const el = document.createElement('div');
    el.className = 'fallback-card ' + String(color || '').toLowerCase();
    el.innerHTML = '<b>' + name + '</b><span>myClover · CORE7</span>';
    return el;
  }

  async function initCardArt(){
    try{
      const [cardsModule, artModule] = await Promise.all([
        import('/core7/js/cards.js'),
        import('/core7/js/art.js')
      ]);
      const {FIRST_HAND} = cardsModule;
      const {cardSVG, cloverLogo} = artModule;

      const navLogo = document.getElementById('navLogo');
      const finalLogo = document.getElementById('finalLogo');
      if(navLogo) navLogo.innerHTML = cloverLogo(34);
      if(finalLogo) finalLogo.innerHTML = cloverLogo(86);

      const hero = document.getElementById('heroCards');
      HERO_IDS.forEach((id, index) => {
        const card = document.createElement('div');
        card.className = 'hero-card';
        card.dataset.index = index;
        card.innerHTML = cardSVG(id, {width:300});
        hero && hero.appendChild(card);
      });

      const pocket = document.getElementById('pocketCards');
      POCKET_IDS.forEach(id => {
        const card = document.createElement('div');
        card.className = 'mini-card';
        card.innerHTML = cardSVG(id, {width:220, showNumber:false});
        pocket && pocket.appendChild(card);
      });

      const gallery = document.getElementById('cardGallery');
      FIRST_HAND.forEach(cardData => {
        const card = document.createElement('article');
        card.className = 'gallery-card';
        card.dataset.energy = cardData.color;
        card.dataset.name = cardData.en;
        card.setAttribute('aria-label', cardData.en + ' — ' + cardData.th);
        card.innerHTML = cardSVG(cardData.id, {width:230});
        gallery && gallery.appendChild(card);
      });
    }catch(error){
      console.error('Unable to load CORE7 card renderer.', error);
      const hero = document.getElementById('heroCards');
      ['COURAGE','CLARITY','BALANCE','BUILD','JOY','STRATEGY','RECOVERY'].forEach((name,index) => {
        const colors = ['RED','BLUE','GREEN','GRAY','RED','BLUE','GREEN'];
        const wrap = document.createElement('div');
        wrap.className = 'hero-card';
        wrap.appendChild(fallbackCard(name, colors[index]));
        hero && hero.appendChild(wrap);
      });
    }
  }

  function initEnergySelector(){
    const buttons = document.querySelectorAll('.energy-button');
    const label = document.getElementById('energyLabel');
    const headline = document.getElementById('energyHeadline');
    const body = document.getElementById('energyBody');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const energy = button.dataset.energy;
        const copy = ENERGY_COPY[energy];
        if(!copy) return;
        buttons.forEach(btn => btn.classList.toggle('active', btn === button));
        if(label) label.textContent = copy.label;
        if(headline) headline.textContent = copy.headline;
        if(body) body.textContent = copy.body;
        document.querySelectorAll('.gallery-card').forEach(card => {
          card.classList.toggle('is-muted', card.dataset.energy !== energy);
        });
        window.setTimeout(() => {
          document.querySelectorAll('.gallery-card').forEach(card => card.classList.remove('is-muted'));
        }, 1800);
      });
    });
  }

  function initPledges(){
    const cards = Array.from(document.querySelectorAll('.pledge'));
    const panel = document.getElementById('pledgeSelection');
    const nameEl = document.getElementById('selectedPledge');
    const priceEl = document.getElementById('selectedPrice');
    const clear = document.getElementById('clearPledge');
    const storageKey = 'mc_kickstarter_pledge_preview';

    function select(name, price, shouldScroll){
      cards.forEach(card => {
        const active = card.dataset.pledge === name;
        card.classList.toggle('is-selected', active);
        const button = card.querySelector('.select-pledge');
        if(button) button.textContent = active ? 'Selected ✓' : 'Choose ' + card.dataset.pledge;
      });
      if(nameEl) nameEl.textContent = name;
      if(priceEl) priceEl.textContent = price;
      if(panel) panel.hidden = false;
      try{ localStorage.setItem(storageKey, JSON.stringify({name,price})); }catch(_){ }
      if(shouldScroll && panel) panel.scrollIntoView({behavior:'smooth',block:'center'});
    }

    cards.forEach(card => {
      const button = card.querySelector('.select-pledge');
      if(!button) return;
      button.addEventListener('click', () => select(card.dataset.pledge, card.dataset.price, true));
    });

    if(clear){
      clear.addEventListener('click', () => {
        cards.forEach(card => card.classList.remove('is-selected'));
        cards.forEach(card => {
          const button = card.querySelector('.select-pledge');
          if(button) button.textContent = 'Choose ' + card.dataset.pledge;
        });
        if(panel) panel.hidden = true;
        try{ localStorage.removeItem(storageKey); }catch(_){ }
      });
    }

    try{
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if(saved && saved.name && cards.some(card => card.dataset.pledge === saved.name)){
        select(saved.name, saved.price, false);
      }
    }catch(_){ }
  }

  function initHeroTilt(){
    const stage = document.querySelector('.hero-stage');
    const cards = document.getElementById('heroCards');
    if(!stage || !cards || matchMedia('(pointer:coarse)').matches) return;
    stage.addEventListener('pointermove', event => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      cards.style.transform = 'rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 5) + 'deg)';
    });
    stage.addEventListener('pointerleave', () => { cards.style.transform = ''; });
  }

  function initDetails(){
    document.querySelectorAll('.faq-list details').forEach(detail => {
      detail.addEventListener('toggle', () => {
        if(!detail.open) return;
        document.querySelectorAll('.faq-list details').forEach(other => {
          if(other !== detail) other.open = false;
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initEnergySelector();
    initPledges();
    initDetails();
    initCardArt().then(initHeroTilt);
    setProgress();
    addEventListener('scroll', setProgress, {passive:true});
    addEventListener('resize', setProgress, {passive:true});
  });
})();
