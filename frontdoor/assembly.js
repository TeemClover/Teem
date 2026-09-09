/** Paper grows out of the existing artifact. Travel and reveal are finite, gesture-caused. */
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>1-Math.pow(1-clamp(v),3);
const lerp=(a,b,t)=>a+(b-a)*t;
const cropOptions=(value={})=>({
 fit:value?.fit==='contain'?'contain':'cover',
 focusX:Number.isFinite(value?.focusX)?clamp(value.focusX):.5,
 focusY:Number.isFinite(value?.focusY)?clamp(value.focusY):.5,
 aspect:Number.isFinite(value?.aspect)&&value.aspect>=.25&&value.aspect<=4?value.aspect:null,
});
export function createAssembly(canvas,{reduced=()=>false,origin=()=>({x:.7,y:.42})}={}){
 const ctx=canvas.getContext('2d'),images=new Map();let frame=0,elapsed=0,last=0,current=null,previous=null,resolvePaint=null,suspended=false,travel=false;
 const load=(src,mobileSrc)=>{
  const key=mobileSrc?`${src}\n${mobileSrc}`:src;
  if(!images.has(key))images.set(key,new Promise((resolve,reject)=>{
   const img=new Image();let ready=false;
   img.onload=()=>{if(ready)request();else{ready=true;resolve(img);}};
   img.onerror=()=>{images.delete(key);reject(Error('IMAGE_UNAVAILABLE'));};
   if(mobileSrc){img.sizes='(max-width:700px) 90vw, 48vw';img.srcset=`${mobileSrc} 720w, ${src} 1200w`;}
   img.src=src;
  }));
  return images.get(key);
 };
 let paper,rim,aperture,brand;
 const folded=document.createElement('canvas'),fold=folded.getContext('2d');
 function bounds(arrival=0,aspect=null){
  const {width:w,height:h}=canvas.getBoundingClientRect(),mobile=w<701&&h>=w;
  const b={w,h,mobile,x:mobile?w*lerp(.12,.05,arrival):w*lerp(.51,.48,arrival),y:mobile?h*lerp(.23,.14,arrival):h*lerp(.21,.16,arrival),width:mobile?w*lerp(.76,.90,arrival):w*lerp(.40,.48,arrival),height:mobile?h*lerp(.31,.32,arrival):h*lerp(.57,.68,arrival)};
  // Keep a scene's composition intact inside the original travel area. Legacy
  // scenes without an explicit ratio retain their original bounds.
  if(aspect){const width=Math.min(b.width,b.height*aspect),height=width/aspect;b.x+=(b.width-width)/2;b.y+=(b.height-height)/2;b.width=width;b.height=height;}
  return b;
 }
 function photo(target,img,x,y,w,h,{fit='cover',focusX=.5,focusY=.5}={}){
  const keepContext=fit==='contain';
  const s=keepContext?Math.min(w/img.width,h/img.height):Math.max(w/img.width,h/img.height),pw=img.width*s,ph=img.height*s,px=(w-pw)*focusX+x,py=(h-ph)*focusY+y;
  if(keepContext){target.fillStyle='#101b20';target.fillRect(x,y,w,h);}
  target.drawImage(img,px,py,pw,ph);
  if(keepContext&&ph<h){
   const edge=Math.min(20,ph*.08),top=target.createLinearGradient(0,py,0,py+edge),bottom=target.createLinearGradient(0,py+ph-edge,0,py+ph);
   top.addColorStop(0,'#101b20');top.addColorStop(1,'#101b2000');bottom.addColorStop(0,'#101b2000');bottom.addColorStop(1,'#101b20');
   target.fillStyle=top;target.fillRect(px,py,pw,edge);target.fillStyle=bottom;target.fillRect(px,py+ph-edge,pw,edge);
  }
 }
 function bridge(b,p,scene){
  const o=origin(),a={x:b.mobile?b.w*.17:b.w*.38,y:b.mobile?b.h*.65:b.h*.82},end={x:b.x+b.width*.48,y:b.y+b.height*.74};
  const trace=scene.trace||[],bend=trace.length>1?(trace[Math.floor(trace.length/2)].y-(trace[0].y+trace.at(-1).y)/2)*b.h*.4:b.h*.04;
  const steps=26,shown=Math.ceil(steps*ease(p)),width=b.mobile?b.w*.115:b.w*.045;
  for(let i=0;i<shown;i++){
   const t=i/steps,n=(i+1)/steps,at=u=>({x:lerp(a.x,end.x,u),y:lerp(a.y,end.y,u)-Math.sin(u*Math.PI)*bend});const from=at(t),to=at(n);
   const length=Math.hypot(to.x-from.x,to.y-from.y)+1,scale=lerp(1,.30,t),opening=ease((p-t*.72)/.28);
   ctx.save();ctx.translate(from.x,from.y);ctx.rotate(Math.atan2(to.y-from.y,to.x-from.x));ctx.scale(1,opening);
   ctx.shadowColor='#05120b99';ctx.shadowBlur=12*scale;ctx.shadowOffsetY=10*scale;
   ctx.drawImage(paper,paper.width*.38,paper.height*(.40+.09*t),paper.width*.18,paper.height*.014,0,-width*scale*.5,length,width*scale);
   ctx.shadowColor='transparent';ctx.strokeStyle='#ffe8b344';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,-width*scale*.5);ctx.lineTo(length,-width*scale*.5);ctx.stroke();ctx.restore();
  }
  // A single moving reflection shows travel along the path the visitor opened.
  if(p>0&&p<1){const t=ease(p),x=lerp(a.x,end.x,t),y=lerp(a.y,end.y,t)-Math.sin(t*Math.PI)*bend;ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,22);g.addColorStop(0,'#fff5d3');g.addColorStop(.15,scene.accent);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-22,y-22,44,44);ctx.restore();}
 }
 function drawScene(scene,p,arrival=0){
  const b=bounds(arrival,scene.crop.aspect),o=origin(),ox=o.x*b.w,oy=o.y*b.h;
  if(arrival>0)bridge(b,arrival,scene);
  const segments=12,scale=canvas.width/b.w;if(folded.width!==canvas.width||folded.height!==canvas.height){folded.width=canvas.width;folded.height=canvas.height;}
  fold.setTransform(scale,0,0,scale,0,0);fold.clearRect(0,0,b.w,b.h);
  for(let i=0;i<segments;i++){
   const t=ease((p-i*.022)/.70),sw=b.width/segments;if(t<=0)continue;
   const x=b.x+i*sw,y=b.y;
   fold.save();fold.translate(ox+(x-ox)*t,oy+(y-oy)*t);fold.rotate((1-t)*(i%2?-.44:.44));fold.scale(Math.max(.015,t),.12+.88*t);
   fold.beginPath();fold.rect(0,0,sw+.7,b.height);fold.clip();photo(fold,paper,-i*sw,0,b.width,b.height);
   fold.globalAlpha=ease((p-.10-i*.024)/.66);photo(fold,scene.img,-i*sw,0,b.width,b.height,scene.crop);
   const shade=fold.createLinearGradient(0,0,sw,0);shade.addColorStop(0,`rgba(11,23,15,${(1-t)*.55})`);shade.addColorStop(1,'rgba(255,242,194,0)');fold.fillStyle=shade;fold.fillRect(0,0,sw,b.height);fold.restore();
  }
  if(p===1){fold.clearRect(0,0,b.w,b.h);photo(fold,scene.img,b.x,b.y,b.width,b.height,scene.crop);}
  fold.save();fold.globalCompositeOperation='destination-in';fold.drawImage(aperture,b.x,b.y,b.width,b.height);fold.restore();
  ctx.drawImage(folded,0,0,b.w,b.h);ctx.save();ctx.globalAlpha=ease((p-.55)/.4);ctx.drawImage(rim,b.x,b.y,b.width,b.height);ctx.restore();
  // The existing brand is rendered whole and unchanged; the Compass remains an artifact.
  const seal=b.mobile?48:65,cx=b.x+b.width*.81,cy=b.y+b.height*.05;
  ctx.save();ctx.globalAlpha=ease((p-.50)/.4);ctx.shadowColor='#071e12aa';ctx.shadowBlur=15;ctx.drawImage(brand,cx-seal/2,cy-seal/2,seal,seal);ctx.restore();
  ctx.save();ctx.strokeStyle=scene.accent;ctx.lineWidth=1.5;ctx.globalAlpha=ease((p-.55)/.4)*.8;
  ctx.beginPath();ctx.moveTo(cx-seal*.27,cy+seal*.62);ctx.lineTo(cx+seal*.27,cy+seal*.62);ctx.stroke();ctx.restore();
 }
 function draw(t){
  frame=0;if(suspended||document.hidden||!current)return;
  const b=bounds(),scale=Math.min(devicePixelRatio||1,1.5,1600/b.w),w=Math.round(b.w*scale),h=Math.round(b.h*scale);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,b.w,b.h);
  if(last)elapsed+=Math.min(64,t-last);last=t;
  const p=reduced()?1:clamp(elapsed/(travel?1800:1450));
  if(previous&&!travel&&p<1){ctx.save();ctx.globalAlpha=1-p;drawScene(previous,1,previous.arrived?1:0);ctx.restore();}
  drawScene(current,travel?1:p,travel?ease(p):current.arrived?1:0);canvas.dataset.progress=p===1?'complete':'assembling';canvas.dataset.travel=travel?p===1?'arrived':'crossing':current.arrived?'arrived':'bank';
  if(p<1)frame=requestAnimationFrame(draw);else{last=0;if(travel){current.arrived=true;travel=false;}if(resolvePaint){const done=resolvePaint;resolvePaint=null;done();}}
 }
 const request=()=>{if(!frame&&!suspended&&!document.hidden&&current)frame=requestAnimationFrame(draw);};
 new ResizeObserver(()=>request()).observe(canvas);
 return {
  async assemble(src,{color='silver',immediate=false,arrived=false,trace=[],crop,mobileSrc}={}){
   const loaded=await Promise.all([load(src,mobileSrc),load('/frontdoor/art/paper-clean.webp'),load('/frontdoor/art/paper-rim.webp'),load('/frontdoor/art/paper-aperture.png'),load('/icons/icon-192.png')]);
   previous=current;[paper,rim,aperture,brand]=loaded.slice(1);current={img:loaded[0],arrived,trace:trace.slice(0,97),accent:{red:'#ed8266',green:'#b2ca78',blue:'#86bde0',silver:'#d5d5ce'}[color]||'#d5d5ce',crop:cropOptions(crop)};elapsed=immediate?1450:0;last=0;travel=false;
   canvas.hidden=false;return new Promise(resolve=>{resolvePaint=resolve;request();});
  },
  walk(){if(!current)return Promise.resolve();travel=true;elapsed=0;last=0;return new Promise(resolve=>{resolvePaint=resolve;request();});},
  suspend(){suspended=true;last=0;if(frame)cancelAnimationFrame(frame);frame=0;},
  resume(){suspended=false;request();},
  clear(){current=previous=null;travel=false;if(frame)cancelAnimationFrame(frame);frame=0;resolvePaint?.();resolvePaint=null;ctx.clearRect(0,0,canvas.width,canvas.height);canvas.hidden=true;},
 };
}
