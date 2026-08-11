(()=>{
  const head=document.head;
  if(head&&!document.querySelector('link[data-xircle-typography]')){
    const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';head.appendChild(pre1);
    const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';head.appendChild(pre2);
    const type=document.createElement('link');type.rel='stylesheet';type.href='/xircle/_shared/typography.css?v=20260811-1';type.dataset.xircleTypography='1';head.appendChild(type);
  }

  if(head&&!document.getElementById('xircle-media-style')){
    const style=document.createElement('style');
    style.id='xircle-media-style';
    style.textContent=`
      .x-media{display:block;width:100%;height:auto;border-radius:32px;box-shadow:0 30px 85px rgba(0,0,0,.30);background:#061018;object-fit:contain}
      .x-media-wrap{position:relative;width:100%;max-width:920px;margin:34px auto 46px}
      .x-media-wrap.source{max-width:580px}
      .x-media-wrap:after{content:"";position:absolute;inset:0;border-radius:32px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);pointer-events:none}
      .x-media-replace{min-height:0!important;height:auto!important;display:block!important}
      .x-media-replace>*{display:none!important}
      .x-media-replace>.x-media-wrap{display:block!important;margin:0 auto;max-width:820px}
      .ageviz.x-media-replace>.x-media-wrap,.people.x-media-replace>.x-media-wrap{max-width:560px}
      .section.light .x-media,.storyday .x-media,.routinehome .x-media,.agehome .x-media{box-shadow:0 28px 75px rgba(15,42,50,.18)}
      .x-product-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:min(100%,720px);margin:0 auto}
      .x-product-grid .x-media-wrap{display:block!important;margin:0;max-width:none!important;min-width:0}
      .x-product-grid .x-media{border-radius:22px;background:#f2f4f3;aspect-ratio:1/1.22;object-fit:cover;object-position:center}
      .x-product-grid .x-media-wrap:after{border-radius:22px}
      @media(max-width:900px){.x-media-wrap{margin:28px auto 38px}.x-media,.x-media-wrap:after{border-radius:26px}}
      @media(max-width:620px){.x-media-wrap{margin:22px auto 30px}.x-media,.x-media-wrap:after{border-radius:20px}.x-media-replace>.x-media-wrap{width:100%}.x-product-grid{gap:7px}.x-product-grid .x-media,.x-product-grid .x-media-wrap:after{border-radius:16px}}
    `;
    head.appendChild(style);
  }

  const assets={
    hero:'/xircle/assets/campaign/hero-xircle.svg?v=3',
    habit:'/xircle/assets/campaign/habit-score.svg?v=3',
    hardware:'/xircle/assets/campaign/hardware.svg?v=3',
    body:'/xircle/assets/source/body-composition.svg?v=3',
    maxage:'/xircle/assets/source/maxage-canonical.svg?v=3',
    community:'/xircle/assets/campaign/community.svg?v=3',
    routine:'/xircle/assets/campaign/routinex.svg?v=3',
    xvisor:'/xircle/assets/source/xvisor.svg?v=3',
    protein:'/xircle/assets/source/protein-hmb.svg?v=3',
    gus:'/xircle/assets/source/gus-product.svg?v=3',
    asta:'/xircle/assets/source/astamega-product.svg?v=3',
    vita:'/xircle/assets/source/vita-matrix-product.svg?v=3',
    routineBox:'/xircle/assets/source/routinex-box.svg?v=3'
  };

  const media=(src,label,kind='campaign')=>{
    const wrap=document.createElement('div');
    wrap.className='x-media-wrap '+kind;
    const img=document.createElement('img');
    img.className='x-media';
    img.src=src; img.alt=label; img.loading='lazy'; img.decoding='async';
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
  }else if(path==='/xircle/habix'){
    productGrid(heroHost());
  }else{
    const map={
      '/xircle/app':[assets.hero,'Xircle app experience','campaign'],
      '/xircle/app/habit-score':[assets.habit,'Habit Score: Eat Move Sleep','campaign'],
      '/xircle/app/eat':[assets.habit,'Eat within the Habit Score system','campaign'],
      '/xircle/app/move':[assets.habit,'Move within the Habit Score system','campaign'],
      '/xircle/app/sleep':[assets.habit,'Sleep within the Habit Score system','campaign'],
      '/xircle/app/hardware':[assets.hardware,'Xircle Band and Scale','campaign'],
      '/xircle/app/body':[assets.body,'Canonical Body Composition source visual','source'],
      '/xircle/app/maxage':[assets.maxage,'Canonical MaxAge source visual','source'],
      '/xircle/app/community':[assets.community,'Xircle community','campaign'],
      '/xircle/routinex':[assets.routine,'RoutineX daily routine','campaign'],
      '/xircle/routinex/day-28':[assets.routine,'RoutineX daily routine','campaign'],
      '/xircle/routinex/abcd':[assets.routineBox,'RoutineX source package visual','source'],
      '/xircle/habix/protein-hmb':[assets.protein,'Protein HMB+ source product visual','source'],
      '/xircle/habix/gus':[assets.gus,'G.U.S.+ source product visual','source'],
      '/xircle/habix/astamega':[assets.asta,'AstaMega+ source product visual','source'],
      '/xircle/habix/vita-matrix':[assets.vita,'Vita Matrix source product visual','source'],
      '/xircle/xvisor':[assets.xvisor,'X-VISOR source visual','source'],
      '/xircle/xvisor/role':[assets.xvisor,'X-VISOR source visual','source']
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