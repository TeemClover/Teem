/** A path made from the existing paper, shaped by a visitor's actual gesture. */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const point=p=>({x:clamp(Number.isFinite(p?.x)?p.x:.12,.06,.94),y:clamp(Number.isFinite(p?.y)?p.y:.61,.26,.82)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const copy=points=>points.map(p=>({...p}));
export function createCrossing(){
 let phase='hidden',anchor=point({x:.12,y:.61}),points=[],saved=[],revision=0;
 return {
  get phase(){return phase;},get anchor(){return {...anchor};},get points(){return copy(points);},get revision(){return revision;},
  get tip(){return {...(points.at(-1)||anchor)};},
  restore(input){if(!Array.isArray(input)||input.length<2)return;points=input.slice(0,97).map(point);anchor=points[0];saved=copy(points);phase='complete';revision=0;},
  arm(p){if(phase!=='hidden')return false;anchor=point(p);phase='ready';return true;},
  begin(){if(phase==='hidden'||phase==='drawing')return false;saved=copy(points);points=[{...anchor}];phase='drawing';return true;},
  extend(p){
   if(phase!=='drawing')return false;p=point(p);if(distance(points.at(-1),p)<.004)return false;
   // Keep the actual trace bounded, including a long or noisy gesture.
   if(points.length>=96)points=points.filter((_,i)=>i%2===0||i===points.length-1);
   points.push(p);return true;
  },
  commit(bank){
   if(phase!=='drawing')return false;
   bank=point(bank);const end=points.at(-1),toward=(end.x-anchor.x)/Math.max(.01,bank.x-anchor.x);
   // A vertical tug is not permission to build an unrelated crossing.
   if(toward<.7||distance(end,bank)>.18){this.cancel();return false;}
   points.push(bank);saved=copy(points);phase='complete';revision++;return true;
  },
  cancel(){if(phase!=='drawing')return false;points=copy(saved);phase=points.length?'complete':'ready';return true;},
 };
}

/** Smooth the recorded trace; no predetermined crossing is substituted. */
export function crossingCurve(points){
 if(points.length<2)return copy(points);
 const out=[];
 for(let i=0;i<points.length-1;i++){
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  const steps=Math.min(12,Math.max(2,Math.ceil(distance(b,c)/.012)));
  for(let j=0;j<steps;j++){
   const t=j/steps,t2=t*t,t3=t2*t;
   out.push(point(Object.fromEntries(['x','y'].map(k=>[k,.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)]))));
  }
 }
 out.push(point(points.at(-1)));return out;
}

export function createPaperCrossing(canvas,texture,{onPaint=()=>{},onTip=()=>{}}={}){
 const model=createCrossing(),ctx=canvas.getContext('2d');
 const paper=document.createElement('canvas');paper.width=64;paper.height=768;let paperReady=false;
 let visible=false,motion=true,frame=0,last=0,elapsed=0,settling=false,notified=0;
 function request(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
 function resize(){
  const box=canvas.parentElement.getBoundingClientRect();
  const width=Math.min(640,Math.round(box.width*Math.min(devicePixelRatio||1,1.3)));
  const height=Math.min(1200,Math.round(width*box.height/box.width));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;request();}
 }
 function draw(t){
  frame=0;if(!visible||document.hidden||!texture.naturalWidth)return;
  if(settling){elapsed+=last?Math.min(100,t-last):0;if(!motion)elapsed=600;}last=t;
  const settle=settling?Math.min(1,elapsed/550):1;
  const ease=1-Math.pow(1-settle,3),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(model.phase==='hidden')return;
  let trace=model.points;
  if(trace.length<2){const a=model.anchor;trace=[a,{x:a.x+.075,y:a.y-.02}];}
  if(settling&&settle<1&&trace.length>2){const end=trace.at(-1),previous=trace.at(-2);trace[trace.length-1]={x:previous.x+(end.x-previous.x)*ease,y:previous.y+(end.y-previous.y)*ease};}
  const curve=crossingCurve(trace),span=distance(trace[0],trace.at(-1));
  const arch=Math.min(h*.035,span*w*.12);
  // Held paper lifts; releasing lets its middle gently take weight between the
  // two attached ends. This movement is caused by releasing the visitor's hand.
  const bend=model.phase!=='complete'?-1:settling&&settle<1?-1+1.65*ease:.65;
  const screen=curve.map((p,i)=>({x:p.x*w,y:p.y*h+Math.sin(i/(curve.length-1)*Math.PI)*arch*bend}));
  const width=Math.max(15,w*.066);
  // Contact shadow follows the very same trace into the existing gorge.
  ctx.save();ctx.beginPath();screen.forEach((p,i)=>{const depth=Math.sin(i/(screen.length-1)*Math.PI)*arch;const x=p.x+depth*.2,y=p.y+2+depth*.65;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width*.9;ctx.strokeStyle='#20150c70';ctx.filter=`blur(${Math.max(3,w*.012)}px)`;ctx.stroke();ctx.restore();
  if(!paperReady){paper.getContext('2d').drawImage(texture,texture.naturalWidth*.43,texture.naturalHeight*.34,texture.naturalWidth*.09,texture.naturalHeight*.25,0,0,paper.width,paper.height);paperReady=true;}
  const edges=screen.map((p,i)=>{
   const a=screen[Math.max(0,i-1)],b=screen[Math.min(screen.length-1,i+1)],length=Math.max(.001,Math.hypot(b.x-a.x,b.y-a.y));
   const half=width/2*(1+.018*Math.sin(i/screen.length*137));
   const nx=-(b.y-a.y)/length*half,ny=(b.x-a.x)/length*half;
   return [{x:p.x+nx,y:p.y+ny},{x:p.x-nx,y:p.y-ny}];
  });
  for(let i=1;i<edges.length;i++){
   const [a,b]=edges[i-1],[d,c]=edges[i],v0=(i-1)/(edges.length-1)*paper.height,v1=i/(edges.length-1)*paper.height;
   // Joined textured triangles preserve the real paper grain without fanning
   // overlapping rectangles at a bend. This is the visitor's functional path.
   triangle([{x:0,y:v0},{x:paper.width,y:v0},{x:paper.width,y:v1}],[a,b,c]);
   triangle([{x:0,y:v0},{x:paper.width,y:v1},{x:0,y:v1}],[a,c,d]);
   const shade=ctx.createLinearGradient(a.x,a.y,b.x,b.y);shade.addColorStop(0,'#fff6da70');shade.addColorStop(.28,'#ffffff00');shade.addColorStop(.75,'#311a0000');shade.addColorStop(1,'#53321055');
   ctx.beginPath();ctx.moveTo(a.x,a.y);for(const p of [b,c,d])ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fillStyle=shade;ctx.fill();
  }
  canvas.dataset.phase=settling&&settle<1?'settling':model.phase;canvas.dataset.revision=String(model.revision);canvas.dataset.painted='true';
  onTip(trace.at(-1));
  if(settling&&settle<1)request();
  else if(model.phase==='complete'&&notified!==model.revision){settling=false;notified=model.revision;onPaint(model.revision);}
 }
 function triangle(s,p){
  const ux=s[1].x-s[0].x,uy=s[1].y-s[0].y,vx=s[2].x-s[0].x,vy=s[2].y-s[0].y,det=ux*vy-vx*uy;
  if(Math.abs(det)<.001)return;
  const px=p[1].x-p[0].x,py=p[1].y-p[0].y,qx=p[2].x-p[0].x,qy=p[2].y-p[0].y;
  const a=(px*vy-qx*uy)/det,b=(py*vy-qy*uy)/det,c=(qx*ux-px*vx)/det,d=(qy*ux-py*vx)/det;
  ctx.save();ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);ctx.lineTo(p[2].x,p[2].y);ctx.closePath();ctx.clip();
  ctx.transform(a,b,c,d,p[0].x-a*s[0].x-c*s[0].y,p[0].y-b*s[0].x-d*s[0].y);ctx.drawImage(paper,0,0);ctx.restore();
 }
 new ResizeObserver(resize).observe(canvas.parentElement);
 return {
  model,
  restore(points){model.restore(points);settling=false;elapsed=1000;request();},
  get settling(){return settling;},
  arm(p){if(!model.arm(p))return false;visible=true;resize();request();return true;},
  begin(){if(!model.begin())return false;settling=false;last=0;request();return true;},
  extend(p){const changed=model.extend(p);if(changed)request();return changed;},
  commit(bank){const ok=model.commit(bank);settling=ok;elapsed=0;last=0;request();return ok;},
  cancel(){model.cancel();request();},
  suspend(){visible=false;if(frame)cancelAnimationFrame(frame);frame=0;last=0;},
  resume(){visible=true;last=0;resize();request();},
  setMotion(value){motion=value;request();},
 };
}
