(()=>{
  const head=document.head;
  if(head&&!document.querySelector('link[data-xircle-typography]')){
    const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';head.appendChild(pre1);
    const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';head.appendChild(pre2);
    const type=document.createElement('link');type.rel='stylesheet';type.href='/xircle/_shared/typography.css?v=20260811-1';type.dataset.xircleTypography='1';head.appendChild(type);
  }

  if(head&&!document.getElementById('xircle-campaign-style')){
    const style=document.createElement('style');
    style.id='xircle-campaign-style';
    style.textContent=`
      .xc-media{--xc-y:0%;width:100%;aspect-ratio:8/5;border-radius:34px;background-image:url('/xircle/assets/campaign/campaign-atlas.jpg?v=20260811-1');background-repeat:no-repeat;background-size:100% 700%;background-position:center var(--xc-y);box-shadow:0 34px 90px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.08) inset;overflow:hidden;position:relative;isolation:isolate}
      .xc-media:after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.025),transparent 38%,rgba(0,0,0,.08));pointer-events:none}
      .xc-0{--xc-y:0%}.xc-1{--xc-y:16.6667%}.xc-2{--xc-y:33.3333%}.xc-3{--xc-y:50%}.xc-4{--xc-y:66.6667%}.xc-5{--xc-y:83.3333%}.xc-6{--xc-y:100%}
      .xc-wide{margin:34px 0 42px}.xc-hero-host{min-height:0!important;display:block!important;position:relative!important}.xc-hero-host>*:not(.xc-media){display:none!important}.xc-hero-host>.xc-media{width:min(100%,720px);margin:auto;transform:translateZ(0)}
      .homehero .stage.xc-hero-host>.xc-media{width:min(100%,760px);box-shadow:0 45px 110px rgba(0,0,0,.42),0 0 0 1px rgba(96,214,255,.10) inset}
      .ageviz.xc-hero-host,.people.xc-hero-host{height:auto!important;min-height:0!important}.ageviz.xc-hero-host>.xc-media,.people.xc-hero-host>.xc-media{width:100%;margin:0}
      .section.light .xc-media,.storyday .xc-media,.routinehome .xc-media,.agehome .xc-media{box-shadow:0 30px 80px rgba(17,40,44,.18),0 0 0 1px rgba(0,0,0,.04)}
      @media(max-width:900px){.xc-wide{margin:28px 0 34px}.xc-media{border-radius:28px}.xc-hero-host>.xc-media{width:min(100%,760px)}}
      @media(max-width:620px){.xc-media{border-radius:22px}.xc-wide{margin:24px 0 30px}.homehero .stage.xc-hero-host{min-height:340px!important;display:grid!important;place-items:center!important}.homehero .stage.xc-hero-host>.xc-media{width:100%}}
    `;
    head.appendChild(style);
  }

  const makeMedia=(i,label,wide=false)=>{const d=document.createElement('div');d.className=`xc-media xc-${i}${wide?' xc-wide':''}`;d.setAttribute('role','img');d.setAttribute('aria-label',label);return d};
  const replaceHost=(el,i,label)=>{if(!el)return;el.classList.add('xc-hero-host');el.appendChild(makeMedia(i,label,false))};
  const insertAfter=(anchor,i,label)=>{if(!anchor||anchor.parentNode.querySelector(`.xc-insert-${i}[data-for="${anchor.id||anchor.className}"]`))return;const d=makeMedia(i,label,true);d.classList.add(`xc-insert-${i}`);d.dataset.for=anchor.id||anchor.className;anchor.insertAdjacentElement('afterend',d)};
  const path=(location.pathname.replace(/\/+$/,'')||'/');

  if(path==='/xircle'){
    replaceHost(document.querySelector('.homehero .stage'),0,'Xircle app experience with Habit Score, Eat, Move and Sleep insights');
    insertAfter(document.querySelector('#habit .section-head'),1,'Habit Score experience showing Eat, Move and Sleep');
    insertAfter(document.querySelector('#hardware .section-head'),2,'Xircle Band and Xircle Scale measurement ecosystem');
    insertAfter(document.querySelector('#body .section-head'),3,'Body Composition insights and trend experience');
    replaceHost(document.querySelector('.agehome .ageviz'),4,'Bio Age and MaxAge long-term health direction experience');
    replaceHost(document.querySelector('.circlehome .people'),5,'Xircle community and supportive social circle');
    insertAfter(document.querySelector('#routine .section-head'),6,'RoutineX daily routine from morning through sleep');
  } else {
    const map={
      '/xircle/app':0,
      '/xircle/app/habit-score':1,
      '/xircle/app/eat':1,
      '/xircle/app/move':1,
      '/xircle/app/sleep':1,
      '/xircle/app/hardware':2,
      '/xircle/app/body':3,
      '/xircle/app/maxage':4,
      '/xircle/app/community':5,
      '/xircle/routinex':6,
      '/xircle/routinex/day-28':6
    };
    if(Object.prototype.hasOwnProperty.call(map,path)){
      const i=map[path];
      let host=document.querySelector('.hero .hero-shape');
      if(!host){const grid=document.querySelector('.hero .hero-grid');if(grid&&grid.children.length>1)host=grid.lastElementChild}
      if(host)replaceHost(host,i,'Xircle premium campaign visual');
      else {const firstHead=document.querySelector('.hero .section-head,.hero .wrap>div:first-child,.section-head');if(firstHead)insertAfter(firstHead,i,'Xircle premium campaign visual')}
    }
  }

  const p=document.querySelector('.progress');
  const update=()=>{if(!p)return;const d=document.documentElement;const max=d.scrollHeight-innerHeight;p.style.width=(max>0?(scrollY/max)*100:0)+'%'};
  addEventListener('scroll',update,{passive:true});update();
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('on')}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href');if(id&&id.length>1){const target=document.querySelector(id);if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'})}}}));
})();