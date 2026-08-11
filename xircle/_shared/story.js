(()=>{
  const head=document.head;
  if(head&&!document.querySelector('link[data-xircle-typography]')){
    const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';head.appendChild(pre1);
    const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';head.appendChild(pre2);
    const type=document.createElement('link');type.rel='stylesheet';type.href='/xircle/_shared/typography.css?v=20260811-1';type.dataset.xircleTypography='1';head.appendChild(type);
  }

  /*
    IMPORTANT: Campaign raster injection is deliberately disabled here.
    The previous campaign atlas committed through the connector was truncated
    and therefore invalid. Native page visuals remain visible until each
    verified asset is installed at a stable /xircle/assets/... URL.
  */

  const p=document.querySelector('.progress');
  const update=()=>{
    if(!p)return;
    const d=document.documentElement;
    const max=d.scrollHeight-innerHeight;
    p.style.width=(max>0?(scrollY/max)*100:0)+'%';
  };
  addEventListener('scroll',update,{passive:true});
  update();

  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting)e.target.classList.add('on');
    }),{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  }else{
    document.querySelectorAll('.reveal').forEach(el=>el.classList.add('on'));
  }

  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    if(id&&id.length>1){
      const target=document.querySelector(id);
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}
    }
  }));
})();