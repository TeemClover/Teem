(()=>{
  const head=document.head;
  if(head&&!document.querySelector('link[data-xircle-typography]')){
    const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';head.appendChild(pre1);
    const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';head.appendChild(pre2);
    const type=document.createElement('link');type.rel='stylesheet';type.href='/xircle/_shared/typography.css?v=20260811-2';type.dataset.xircleTypography='1';head.appendChild(type);
  }
  if(head&&!document.querySelector('link[data-xircle-experience]')){
    const experience=document.createElement('link');
    experience.rel='stylesheet';experience.href='/xircle/_shared/experience.css?v=20260811-1';experience.dataset.xircleExperience='1';
    head.appendChild(experience);
  }

  if(head&&!document.getElementById('xircle-media-style')){
    const style=document.createElement('style');
    style.id='xircle-media-style';
    style.textContent=`
      .x-media{display:block;width:100%;height:auto;border-radius:32px;box-shadow:0 30px 85px rgba(0,0,0,.30);background:#061018;object-fit:contain}
      .x-media-wrap{position:relative;width:100%;max-width:920px;margin:34px auto 46px}
      .x-media-wrap.source{max-width:620px}
      .x-media-wrap:after{content:"";position:absolute;inset:0;border-radius:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);pointer-events:none}
      .x-media-replace{min-height:0!important;height:auto!important;display:block!important}
      .x-media-replace>*{display:none!important}
      .x-media-replace>.x-media-wrap{display:block!important;margin:0 auto;max-width:860px}
      .ageviz.x-media-replace>.x-media-wrap,.people.x-media-replace>.x-media-wrap{max-width:620px}
      .section.light .x-media,.storyday .x-media,.routinehome .x-media,.agehome .x-media{box-shadow:0 28px 75px rgba(15,42,50,.18)}
      .x-product-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:min(100%,760px);margin:0 auto}
      .x-product-grid .x-media-wrap{display:block!important;margin:0;max-width:none!important;min-width:0}
      .x-product-grid .x-media{border-radius:22px;background:#f2f4f3;aspect-ratio:1/1.22;object-fit:cover;object-position:center}
      .x-product-grid .x-media-wrap:after{border-radius:22px}
      @media(max-width:900px){.x-media-wrap{margin:28px auto 38px}.x-media,.x-media-wrap:after{border-radius:26px}}
      @media(max-width:620px){.x-media-wrap{margin:22px auto 30px}.x-media,.x-media-wrap:after{border-radius:20px}.x-media-replace>.x-media-wrap{width:100%}.x-product-grid{gap:7px}.x-product-grid .x-media,.x-product-grid .x-media-wrap:after{border-radius:16px}}
    `;
    head.appendChild(style);
  }

  const assets={
    hero:'/xircle/assets/source/xircle-v41/phone-1063.webp',
    habit:'/xircle/assets/source/xircle-v41/habit-score-1063.webp',
    dashboard:'/xircle/assets/source/xircle-v41/daily-dashboard-1063.webp',
    hardware:'/xircle/assets/source/xircle-v41/hardware-1063.webp',
    body:'/xircle/assets/source/xircle-v41/body-composition-1063.webp',
    maxage:'/xircle/assets/source/xircle-v41/maxage-1063.webp',
    direction:'/xircle/assets/source/xircle-v41/longterm-direction-1063.webp',
    community:'/xircle/assets/source/xircle-v41/community-1063.webp',
    routine:'/xircle/assets/source/xircle-v41/daily-routine-1063.webp',
    xvisor:'/xircle/assets/source/xircle-v41/xvisor-1063.webp',
    eatMoveSleep:'/xircle/assets/source/brochure-routinex/eat-move-sleep-1063.webp',
    protein:'/xircle/assets/source/brochure-routinex/protein-hmb-650.webp',
    gus:'/xircle/assets/source/brochure-routinex/gus-430.webp',
    asta:'/xircle/assets/generated/astamega-ingredient.png',
    vita:'/xircle/assets/generated/vita-matrix-ingredient.png',
    routineBox:'/xircle/assets/source/brochure-routinex/routinex-box-1063.webp',
    metabolic:'/xircle/assets/source/app-ui/metabolic-on-track.webp',
    bodyUi:'/xircle/assets/source/app-ui/body-trend.webp',
    maxageUi:'/xircle/assets/source/app-ui/maxage-ui.webp',
    commerceCover:'/xircle/assets/source/commerce/cover-1199.webp',
    commerceModel:'/xircle/assets/source/commerce/four-dimensions-1199.webp',
    commerceMentor:'/xircle/assets/source/commerce/direct-mentoring-1199.webp',
    commerceAgency:'/xircle/assets/source/commerce/agency-management-1199.webp',
    commerceExpand:'/xircle/assets/source/commerce/franchise-expansion-1199.webp',
    commerceRevenue:'/xircle/assets/source/commerce/income-stacking-1199.webp'
  };

  const responsiveSrc=(src)=>{
    if(src.includes('-1063.webp'))return src.replace('-1063.webp','-640.webp')+' 640w, '+src+' 1063w';
    if(src.includes('-1199.webp'))return src.replace('-1199.webp','-720.webp')+' 720w, '+src+' 1199w';
    if(src.endsWith('.webp')&&!/-(430|470|500|520|650)\.webp$/.test(src))return src.replace('.webp','-640.webp')+' 640w, '+src+' 960w';
    return '';
  };

  const media=(src,label,kind='campaign')=>{
    const wrap=document.createElement('div');
    wrap.className='x-media-wrap '+kind;
    const img=document.createElement('img');
    img.className='x-media';
    img.src=src; img.alt=label; img.loading='lazy'; img.decoding='async';
    const srcset=responsiveSrc(src);if(srcset){img.srcset=srcset;img.sizes='(max-width: 700px) 94vw, 860px';}
    img.dataset.parallax='0.018';
    img.addEventListener('error',()=>{
      const host=wrap.parentElement;
      if(host&&host.classList.contains('x-media-replace')) host.classList.remove('x-media-replace');
      wrap.remove();
    },{once:true});
    wrap.appendChild(img); return wrap;
  };

  const replace=(host,src,label,kind='campaign')=>{
    if(!host||host.querySelector(':scope > .x-media-wrap'))return;
    host.classList.add('x-media-replace'); host.appendChild(media(src,label,kind));
  };
  const after=(anchor,src,label,kind='campaign')=>{
    if(!anchor||anchor.nextElementSibling?.classList?.contains('x-media-wrap'))return;
    anchor.insertAdjacentElement('afterend',media(src,label,kind));
  };
  const heroHost=()=>{
    let host=document.querySelector('.hero .hero-shape');
    if(!host){const grid=document.querySelector('.hero .hero-grid');if(grid&&grid.children.length>1)host=grid.lastElementChild;}
    return host;
  };
  const productGrid=(host)=>{
    if(!host||host.querySelector('.x-product-grid'))return;
    host.classList.add('x-media-replace');
    const grid=document.createElement('div'); grid.className='x-product-grid';
    grid.append(media(assets.protein,'Protein HMB+ source visual','source'));
    grid.append(media(assets.gus,'G.U.S.+ source visual','source'));
    grid.append(media(assets.asta,'AstaMega+ source visual','source'));
    grid.append(media(assets.vita,'Vita Matrix source visual','source'));
    host.appendChild(grid);
  };

  const path=(location.pathname.replace(/\/+$/,'')||'/');
  if(path==='/xircle'){
    replace(document.querySelector('.homehero .stage'),assets.hero,'Xircle app and Habit Score experience');
    after(document.querySelector('#habit .section-head'),assets.habit,'Habit Score with Eat Move and Sleep');
    after(document.querySelector('#hardware .section-head'),assets.hardware,'Xircle Band and Scale ecosystem');
    after(document.querySelector('#body .section-head'),assets.body,'Body Composition source visual','source');
    replace(document.querySelector('.agehome .ageviz'),assets.maxage,'Canonical MaxAge visual: actual age 46, Bio Age 48.2, MaxAge 78.4','source');
    replace(document.querySelector('.circlehome .people'),assets.community,'Xircle community and supportive circle');
    after(document.querySelector('#routine .section-head'),assets.routine,'RoutineX day journey');
  }else if(path==='/xircle/habix'||path==='/xircle/habix/fives'||path==='/xircle/habix/flavor'){
    productGrid(heroHost());
  }else{
    const map={
      '/xircle/ecosystem':[assets.direction,'CloverX ecosystem through Xircle','source'],

      '/xircle/app':[assets.hero,'Xircle app experience','source'],
      '/xircle/app/habit-score':[assets.habit,'Habit Score: Eat Move Sleep','source'],
      '/xircle/app/eat':[assets.metabolic,'Metabolic Balance interface in the Xircle app','source'],
      '/xircle/app/move':[assets.dashboard,'Move within the Habit Score system','source'],
      '/xircle/app/sleep':[assets.dashboard,'Sleep within the Habit Score system','source'],
      '/xircle/app/hardware':[assets.hardware,'Xircle Band and Scale','source'],
      '/xircle/app/body':[assets.body,'Canonical Body Composition source visual','source'],
      '/xircle/app/maxage':[assets.maxage,'Canonical MaxAge source visual','source'],
      '/xircle/app/community':[assets.community,'Xircle community','source'],

      '/xircle/habix/protein-hmb':[assets.protein,'Protein HMB+ source product visual','source'],
      '/xircle/habix/gus':[assets.gus,'G.U.S.+ source product visual','source'],
      '/xircle/habix/astamega':[assets.asta,'AstaMega+ source product visual','source'],
      '/xircle/habix/vita-matrix':[assets.vita,'Vita Matrix source product visual','source'],

      '/xircle/routinex':[assets.routineBox,'RoutineX 28-day box and routine','source'],
      '/xircle/routinex/day-28':[assets.eatMoveSleep,'RoutineX Eat Move Sleep routine','source'],
      '/xircle/routinex/abcd':[assets.routineBox,'RoutineX source package visual','source'],

      '/xircle/xvisor':[assets.xvisor,'X-VISOR source visual','source'],
      '/xircle/xvisor/role':[assets.xvisor,'X-VISOR Health Partner role','source'],
      '/xircle/xvisor/care':[assets.xvisor,'X-VISOR CARE coaching framework','source'],
      '/xircle/xvisor/onboarding':[assets.xvisor,'X-VISOR onboarding experience','source'],
      '/xircle/xvisor/coaching':[assets.xvisor,'X-VISOR coaching experience','source'],
      '/xircle/xvisor/claims':[assets.xvisor,'X-VISOR responsible communication','source'],
      '/xircle/xvisor/privacy':[assets.xvisor,'X-VISOR consent and health-data care','source'],

      '/xircle/xos':[assets.dashboard,'Xircle Operating System dashboard','source'],
      '/xircle/xos/missions':[assets.dashboard,'XOS Today missions and habit feedback','source'],
      '/xircle/xos/customers':[assets.body,'XOS customer health-data view','source'],
      '/xircle/xos/team':[assets.community,'XOS team and community','source'],
      '/xircle/xos/learning':[assets.xvisor,'XOS learning and certification','source'],
      '/xircle/xos/wealth':[assets.routineBox,'XOS service tools','source'],

      '/xircle/academy':[assets.xvisor,'X-VISOR Academy and learning','source'],
      '/xircle/academy/certification':[assets.xvisor,'X-VISOR certification','source'],

      '/xircle/commerce':[assets.commerceModel,'X-Commerce four value dimensions','source'],
      '/xircle/commerce/roles':[assets.commerceCover,'X-Commerce role path source visual','source'],
      '/xircle/commerce/revenue':[assets.commerceRevenue,'X-Commerce income stacking mechanics','source'],
      '/xircle/commerce/glossary':[assets.commerceAgency,'X-Commerce business mechanics source visual','source']
    };
    const item=map[path];
    if(item){
      const host=heroHost();
      if(host)replace(host,item[0],item[1],item[2]);
      else{
        const anchor=document.querySelector('.hero .section-head,.hero .wrap>div:first-child,.section-head');
        if(anchor)after(anchor,item[0],item[1],item[2]);
      }
    }
  }

  const main=document.querySelector('main');
  if(main&&!document.querySelector('.x-zone-banner')){
    const zone=document.createElement('aside');
    zone.className='x-zone-banner';
    zone.setAttribute('aria-label','สถานะพื้นที่ Xircle');
    zone.innerHTML='<b>GUILD BUILD ZONE</b><span>Member preview · under construction</span><a href="/xircle/source/">Source status</a>';
    if(document.querySelector('body > .internal,body > .internalbar'))zone.style.setProperty('--x-zone-top','92px');
    main.insertAdjacentElement('beforebegin',zone);
  }

  const sourceProfile=(()=>{
    if(path.startsWith('/xircle/commerce'))return {
      status:'provisional',label:'INTERNAL · VERIFY CURRENT PLAN',
      sources:'Source of Truth · X-Commerce Revenue Model · X-VISOR Certification',
      note:'Business mechanics and qualifications must be checked against the latest official compensation plan before use.'
    };
    if(path.startsWith('/xircle/source'))return {
      status:'internal',label:'INTERNAL SOURCE CONTROL',
      sources:'Xircle Project Source of Truth · Web Zone Blueprint · Core Sources S1–S5',
      note:'Control room for canon, conflicts and unresolved facts. Not customer-facing.'
    };
    if(path.startsWith('/xircle/xvisor'))return {
      status:'canon',label:'CANON · RESPONSIBLE COMMUNICATION',
      sources:'Source of Truth · X-VISOR Certification v1.1 · Xircle revised 4.1',
      note:'Health guidance supports learning and habit change; it does not diagnose, treat or replace professional care.'
    };
    if(path.startsWith('/xircle/habix')||path.startsWith('/xircle/routinex'))return {
      status:'canon',label:'CANON · PRODUCT CLAIM BOUNDARY',
      sources:'Source of Truth · RoutineX Brochure · X-VISOR Certification v1.1',
      note:'Product visuals are source-derived. Ingredients, quantities and claims require the latest approved label or official specification.'
    };
    return {
      status:'canon',label:'CANON · MEMBER PREVIEW',
      sources:'Source of Truth · Web Zone Blueprint · Xircle revised 4.1 · XOS Manual v3',
      note:'Habit Score = Eat + Move + Sleep. Body Composition is an outcome layer. MaxAge™ is an estimate of direction, not lifespan.'
    };
  })();

  if(main&&!document.querySelector('.x-source-footer')){
    const footer=document.createElement('footer');
    footer.className='x-source-footer';
    footer.innerHTML=`<details><summary>Source & status <span>Reviewed 11 Aug 2026 · open details</span></summary><div class="x-source-body"><div><b>SOURCE SET</b>${sourceProfile.sources}</div><div><b>PAGE STATUS</b><span class="x-status-pill" data-status="${sourceProfile.status}">${sourceProfile.label}</span></div><div><b>BOUNDARY</b>${sourceProfile.note}</div></div></details>`;
    main.insertAdjacentElement('afterend',footer);
  }

  document.querySelectorAll('.x-media img,.x-wide-media img,.x-media-wrap img').forEach(img=>{
    if(!img.dataset.parallax)img.dataset.parallax='0.018';
    if(!img.srcset){const set=responsiveSrc(img.getAttribute('src')||'');if(set){img.srcset=set;img.sizes='(max-width: 700px) 94vw, 860px';}}
    img.decoding='async';
  });

  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const parallaxItems=[...document.querySelectorAll('[data-parallax]')];
  let parallaxFrame=0;
  const renderParallax=()=>{
    parallaxFrame=0;
    if(reduceMotion.matches)return;
    parallaxItems.forEach(el=>{
      const rect=el.getBoundingClientRect();
      const rate=Number(el.dataset.parallax||0);
      const offset=Math.max(-46,Math.min(46,(rect.top+rect.height*.5-innerHeight*.5)*rate));
      el.style.setProperty('--x-parallax-y',offset.toFixed(2)+'px');
    });
  };
  const requestParallax=()=>{if(!parallaxFrame)parallaxFrame=requestAnimationFrame(renderParallax);};
  addEventListener('scroll',requestParallax,{passive:true});
  addEventListener('resize',requestParallax,{passive:true});
  renderParallax();

  const deviceScreens=[...document.querySelectorAll('.x-device-ui img')];
  if(deviceScreens.length>1&&!reduceMotion.matches){
    let activeScreen=0;
    setInterval(()=>{
      deviceScreens[activeScreen].classList.remove('is-active');
      activeScreen=(activeScreen+1)%deviceScreens.length;
      deviceScreens[activeScreen].classList.add('is-active');
    },3600);
  }

  const p=document.querySelector('.progress');
  const update=()=>{if(!p)return;const d=document.documentElement;const max=d.scrollHeight-innerHeight;p.style.width=(max>0?(scrollY/max)*100:0)+'%';};
  addEventListener('scroll',update,{passive:true});update();

  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('on');}),{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  }else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('on'));

  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href');if(id&&id.length>1){const target=document.querySelector(id);if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}}
  }));
})();
