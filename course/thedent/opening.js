(() => {
  'use strict';
  const data=window.DENT_OPENING;if(!data?.slides?.length)return;
  const $=s=>document.querySelector(s),img=$('#opening-image'),stage=$('#opening-stage'),select=$('#opening-select');
  let current=1;
  for(const slide of data.slides){const option=document.createElement('option');option.value=slide.id;option.textContent=`${String(slide.id).padStart(2,'0')} · ${slide.title}`;select.append(option);}
  function slideId(hash){const match=/^#slide\/(\d+)$/.exec(hash);const id=match?Number(match[1]):1;return Number.isInteger(id)&&id>=1&&id<=data.slides.length?id:1;}
  function go(id){if(id<1||id>data.slides.length)return;const hash=`#slide/${id}`;if(location.hash===hash)render();else location.hash=hash;}
  function showLoaded(){stage.setAttribute('aria-busy','false');$('#opening-error').hidden=true;}
  function showError(){stage.setAttribute('aria-busy','false');$('#opening-error').hidden=false;}
  img.addEventListener('load',showLoaded);img.addEventListener('error',showError);
  function render(){
    current=slideId(location.hash);const slide=data.slides[current-1],last=current===data.slides.length;
    select.value=String(current);$('#opening-count').textContent=String(current).padStart(2,'0');
    $('#opening-prev').disabled=current===1;$('#opening-next').hidden=last;$('#opening-start').hidden=!last;
    $('#opening-cue').textContent=last?'จบพื้นฐานแล้ว · เริ่มลงมือเวลา 14:35':'ฟังและคุยกันก่อน · เริ่มใช้คอม 14:35';
    $('#opening-title').textContent=slide.title;$('#opening-note').textContent=slide.note;
    $('#opening-time').textContent=`หน้านี้ประมาณ ${Math.floor(slide.seconds/60)}:${String(slide.seconds%60).padStart(2,'0')} นาที · ทั้งชุด 25 นาที`;
    img.alt=`หน้า ${slide.id}: ${slide.title}`;stage.setAttribute('aria-busy','true');$('#opening-error').hidden=true;img.src=`./${slide.image}`;
    if(img.complete){if(img.naturalWidth)showLoaded();else showError();}
    document.title=`${String(current).padStart(2,'0')} · ${slide.title} | TheDent × myClover`;
    const next=data.slides[current];if(next){const preload=new Image();preload.src=`./${next.image}`;}
  }
  select.addEventListener('change',()=>go(Number(select.value)));
  $('#opening-prev').addEventListener('click',()=>go(current-1));$('#opening-next').addEventListener('click',()=>go(current+1));
  $('#opening-retry').addEventListener('click',()=>{stage.setAttribute('aria-busy','true');$('#opening-error').hidden=true;img.src=`./${data.slides[current-1].image}?retry=${Date.now()}`;});
  $('#opening-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#opening-fullscreen').textContent='ใช้เต็มจอจากเบราว์เซอร์';}});
  document.addEventListener('keydown',e=>{if(e.target.closest('button,a,input,select,textarea,summary'))return;const steps={ArrowRight:current+1,PageDown:current+1,' ':current+1,ArrowLeft:current-1,PageUp:current-1,Home:1,End:data.slides.length};if(Object.hasOwn(steps,e.key)){e.preventDefault();go(steps[e.key]);}});
  window.addEventListener('hashchange',render);render();
})();
