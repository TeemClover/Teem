// Reference artwork only. No progress, personal-service or external notebook handoff.
document.querySelectorAll('img[data-art-src]').forEach(img=>{
  const src=img.getAttribute('data-art-src');if(!src?.startsWith('/xircle/assets/'))return;
  const frame=img.closest('.xp-art'),fallback=img.nextElementSibling;
  const show=ready=>{img.hidden=!ready;frame?.classList.toggle('art-ready',ready);if(fallback?.classList.contains('xp-fallback'))fallback.style.opacity=ready?'0':'';};
  img.addEventListener('load',()=>show(true),{once:true});img.addEventListener('error',()=>show(false),{once:true});
  img.src=src;if(img.complete)show(img.naturalWidth>0);
});
