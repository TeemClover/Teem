/* s01_grind (0.0–3.5) + s02_drop (3.5–7.0)
   GRIND: one slate chat window where the same self-introduction is pasted again and again while a
   whole day passes outside; the '+' resets it, the camera pulls back to a 24-chat grid, then a hard
   freeze and a single gold droplet. DROP: the droplet lands, a gold shockwave floods the frozen
   slate world with brand green, every bubble peels off into a vortex and becomes sauce in a vector
   glass jar; the camera pushes in and time nearly stops before the 7.0 title burst. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H,{TAU,clamp,lerp,E,PAL}=H;

/* ── small helpers ───────────────────────────────────────── */
const rgbCache=new Map();
function rgb(h){let v=rgbCache.get(h);if(v)return v;const n=parseInt(h.slice(1),16);v=[n>>16&255,n>>8&255,n&255];rgbCache.set(h,v);return v;}
function mix(a,b,k,al=1){const A=rgb(a),B=rgb(b);k=clamp(k);return `rgba(${Math.round(A[0]+(B[0]-A[0])*k)},${Math.round(A[1]+(B[1]-A[1])*k)},${Math.round(A[2]+(B[2]-A[2])*k)},${al})`;}
function ramp(stops,k){k=clamp(k);for(let i=1;i<stops.length;i++){if(k<=stops[i][0]){const a=stops[i-1],b=stops[i];return mix(a[1],b[1],(k-a[0])/(b[0]-a[0]));}}return mix(stops[stops.length-1][1],stops[stops.length-1][1],0);}
function dprOf(ctx){try{const m=ctx.getTransform();return Math.hypot(m.a,m.b)||1;}catch(e){return 1;}}
function vig(ctx,s,inner,alpha){if(alpha<=0)return;const g=ctx.createRadialGradient(s.w/2,s.h/2,Math.min(s.w,s.h)*inner,s.w/2,s.h/2,Math.hypot(s.w,s.h)*.6);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(2,6,4,${alpha})`);ctx.fillStyle=g;ctx.fillRect(0,0,s.w,s.h);}
const NAVY='#141d33',SLATE_BODY='#151d1a';
// Caption block (screen space) and a soft 0..1 test of how far a rect sits inside it, so world
// content under the text can be dimmed with a smooth falloff instead of a hard step.
function capBand(s){return s.portrait?{y0:s.h*.62,y1:s.h*.81,hw:s.w*.48}:{y0:s.h*.69,y1:s.h*.92,hw:s.w*.36};}
function bandK(s,B,x,y,hw,hh){const dy=Math.max(B.y0-(y+hh),(y-hh)-B.y1),dx=Math.abs(x-s.w/2)-hw-B.hw,d=Math.max(dx,dy);return d<=0?1:E.inOutSine(1-d/(s.u*3));}

/* ── stage geometry (shared by both scenes) ──────────────── */
function geo(s){
 if(s.portrait){
  return {ww:s.w*.88,wh:s.h*.48,h0x:s.w*.5,h0y:s.h*.34,cols:3,rows:8,hc:1,hr:3,gx:s.w*.05,gy:s.h*.022,zEnd:.34,
   clock:{x:s.w*.5,y:s.h*.055,r:s.u*6},strip:{y0:0,y1:s.h*.098},desk:s.h*.62,
   jar:{x:s.w*.5,y:s.h*.34,size:s.u*30}};
 }
 return {ww:s.w*.46,wh:s.h*.62,h0x:s.w*.40,h0y:s.h*.40,cols:6,rows:4,hc:2,hr:1,gx:s.w*.03,gy:s.h*.04,zEnd:.34,
  clock:{x:s.w*.815,y:s.h*.43,r:s.u*9},strip:{y0:s.h*.05,y1:s.h*.29},desk:s.h*.8,
  jar:{x:s.w*.5,y:s.h*.40,size:s.u*23}};
}
// Camera for the grind: zoom z and where the hero chat's centre sits on screen.
function camera(s,g,Tw){
 const push=1+.08*E.inOutSine(Tw/2);
 const pb=E.inOutCubic((Tw-2)/.5);
 let z=lerp(push,g.zEnd,pb);z*=1-.035*E.inOutSine((Tw-2.5)/.5);
 const stepX=g.ww+g.gx,stepY=g.wh+g.gy;
 const endX=s.w/2+(g.hc-(g.cols-1)/2)*stepX*g.zEnd,endY=s.h/2+(g.hr-(g.rows-1)/2)*stepY*g.zEnd;
 const drift=(1-pb)*(s.reduced?0:1);
 const dx=(Math.sin(Tw*2.1)+.5*Math.sin(Tw*5.3+1))*.4*s.u*drift,dy=(Math.cos(Tw*1.7)+.5*Math.sin(Tw*4.1))*.3*s.u*drift;
 const hy=g.h0y+g.wh/2*(1-push);
 return {z,pb,x:lerp(g.h0x,endX,pb)+dx,y:lerp(hy,endY,pb)+dy,stepX,stepY};
}
// Per-window clock offsets so the 23 other chats are not in perfect lockstep (hero = 0).
const OFFS=(()=>{const r=H.rng(4242),o=[];for(let i=0;i<32;i++)o.push((r()-.5)*.34);return o;})();

/* ── the chat window ─────────────────────────────────────── */
const A1=[0,.25,.5,.75];
const A2=(()=>{const a=[];for(let t=1;t<2.5-1e-6;t+=.125)a.push(t);for(let t=2.5;t<3.8;t+=.0625)a.push(+t.toFixed(4));return a;})();
function chatGeom(ww,wh){const hb=wh*.13,pad=ww*.045,top=-wh/2+hb,P=(wh-hb)*.235;return {hb,pad,top,bot:wh/2,P,uH:P*.52,uW:ww*.6,aH:P*.3,aW:ww*.15,V:Math.max(1,Math.floor((wh-hb-pad)/P))};}
function scrollOff(arr,tl,G){let off=0;for(let k=G.V;k<arr.length;k++){const a=arr[k];if(tl<a)break;off+=G.P*E.outBack(clamp((tl-a)/(a<1?.16:.11)));}return off;}
function qmark(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y-r*.5,r,Math.PI*1.05,Math.PI*2.35);ctx.lineTo(x,y+r*.55);ctx.stroke();ctx.beginPath();ctx.arc(x,y+r*1.25,r*.17,0,TAU);ctx.fill();}
function reloadMark(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,Math.PI*.35,Math.PI*1.95);ctx.stroke();const ax=x+Math.cos(Math.PI*1.95)*r,ay=y+Math.sin(Math.PI*1.95)*r;ctx.beginPath();ctx.moveTo(ax+r*.55,ay-r*.1);ctx.lineTo(ax,ay);ctx.lineTo(ax-r*.05,ay-r*.6);ctx.stroke();}
// Rows of one loop, drawn in window-local coords (origin = window centre).
function drawRows(ctx,arr,tl,ww,wh,G,st){
 const off=scrollOff(arr,tl,G);
 let ghost=0;if(st.smear){ghost=off-scrollOff(arr,tl-1/60,G);}
 const pillCol=mix('#d9d3c4',PAL.slate3,st.desat),barCol='rgba(27,36,32,.5)',aiCol=mix('#36443e',PAL.slate2,st.desat*.5),mark=mix('#a9b4ae',PAL.slate3,st.desat);
 for(let k=0;k<arr.length;k++){
  const a=arr[k],age=tl-a;if(age<0)break;
  const y0=G.top+G.pad*.6+k*G.P-off;if(y0>G.bot||y0+G.P<G.top)continue;
  const dur=a<1?.2:.12,pop=E.outBack(clamp(age/dur)),sc=.6+.4*pop;
  let al=clamp(age/.04),aiF=1;
  if(st.scr&&st.bandOn>0){const S=st.scr,z=S.z;
   al*=1-.72*st.bandOn*bandK(st.s,st.band,S.x+(ww/2-G.pad-G.uW/2)*z,S.y+(y0+G.uH/2)*z,G.uW/2*z,G.uH/2*z);
   aiF=1-.72*st.bandOn*bandK(st.s,st.band,S.x+(-ww/2+G.pad+G.aW/2)*z,S.y+(y0+G.uH+G.P*.06+G.aH/2)*z,G.aW/2*z,G.aH/2*z);}
  // smear ghosts of the user pill (3-frame feel)
  if(ghost>.5){ctx.fillStyle=pillCol;for(let gk=1;gk<=2;gk++){ctx.globalAlpha=al*.16/gk;H.rr(ctx,ww/2-G.pad-G.uW,y0+ghost*gk*.9,G.uW,G.uH,G.uH*.38);ctx.fill();}ctx.globalAlpha=1;}
  ctx.save();ctx.globalAlpha=al;ctx.translate(ww/2-G.pad,y0+G.uH/2);ctx.scale(sc,sc);
  H.rr(ctx,-G.uW,-G.uH/2,G.uW,G.uH,G.uH*.38);ctx.fillStyle=pillCol;ctx.fill();
  const bh=G.uH*.15;ctx.fillStyle=barCol;
  if(st.lod){ctx.fillRect(-G.uW*.92,-bh,G.uW*.78,bh*2);}
  else{H.rr(ctx,-G.uW*.93,-G.uH*.2-bh/2,G.uW*.44,bh,bh/2);ctx.fill();H.rr(ctx,-G.uW*.45,-G.uH*.2-bh/2,G.uW*.32,bh,bh/2);ctx.fill();H.rr(ctx,-G.uW*.93,G.uH*.2-bh/2,G.uW*.62,bh,bh/2);ctx.fill();
   ctx.strokeStyle=mark;ctx.lineWidth=Math.max(1,G.uH*.07);ctx.lineCap='round';reloadMark(ctx,-G.uW-G.uH*.42,0,G.uH*.19);}
  ctx.restore();
  const aa=age-.07;if(aa>0){
   const ap=E.outBack(clamp(aa/.14)),ax=-ww/2+G.pad,ay=y0+G.uH+G.P*.06;
   ctx.save();ctx.translate(ax,ay+G.aH/2);ctx.scale(.5+.5*ap,.5+.5*ap);ctx.globalAlpha=clamp(aa/.05)*aiF;
   H.rr(ctx,0,-G.aH/2,G.aW,G.aH,G.aH*.45);ctx.fillStyle=aiCol;ctx.fill();
   if(!st.lod){ctx.strokeStyle=mark;ctx.fillStyle=mark;ctx.lineWidth=Math.max(1,G.aH*.09);ctx.lineCap='round';qmark(ctx,G.aW/2,-G.aH*.05,G.aH*.2);}
   ctx.restore();
  }
 }
}
function drawChat(ctx,ww,wh,tl,st){
 const G=chatGeom(ww,wh),r=Math.min(ww,wh)*.045;
 // body + header
 H.rr(ctx,-ww/2,-wh/2,ww,wh,r);ctx.fillStyle=mix(SLATE_BODY,PAL.slate,st.desat*.5);ctx.fill();
 ctx.lineWidth=Math.max(1,ww*.004);ctx.strokeStyle=mix('#46544e',PAL.slate2,st.desat*.6);ctx.stroke();
 ctx.save();H.rr(ctx,-ww/2,-wh/2,ww,wh,r);ctx.clip();
 ctx.fillStyle=mix('#25302b',PAL.slate2,st.desat*.4);ctx.fillRect(-ww/2,-wh/2,ww,G.hb);
 // '+' new-chat button (depresses before the 1.0 reset)
 const press=tl>.84&&tl<1.08?Math.sin(clamp((tl-.84)/.24)*Math.PI):0,bs=G.hb*.6,bx=-ww/2+G.pad+bs/2,by=-wh/2+G.hb/2;
 ctx.save();ctx.translate(bx,by);ctx.scale(1-.22*press,1-.22*press);H.rr(ctx,-bs/2,-bs/2,bs,bs,bs*.28);ctx.fillStyle=press>.05?mix('#5b6a63','#d9d3c4',press*.6):'#3a4742';ctx.fill();
 ctx.strokeStyle=mix('#b8c2bd','#ffffff',press);ctx.lineWidth=Math.max(1,bs*.11);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-bs*.24,0);ctx.lineTo(bs*.24,0);ctx.moveTo(0,-bs*.24);ctx.lineTo(0,bs*.24);ctx.stroke();ctx.restore();
 if(st.scr&&st.bandOn>0){const S=st.scr,hk=st.bandOn*bandK(st.s,st.band,S.x,S.y+(-wh/2+G.hb/2)*S.z,ww/2*S.z,G.hb/2*S.z);if(hk>0){ctx.fillStyle=`rgba(6,10,9,${.62*hk})`;ctx.fillRect(-ww/2,-wh/2,ww,G.hb);}}
 if(!st.lod){ctx.fillStyle='rgba(142,154,149,.35)';H.rr(ctx,bx+bs*.9,by-G.hb*.08,ww*.22,G.hb*.16,G.hb*.08);ctx.fill();ctx.fillStyle='rgba(142,154,149,.2)';H.rr(ctx,ww/2-G.pad-ww*.1,by-G.hb*.08,ww*.1,G.hb*.16,G.hb*.08);ctx.fill();}
 // content (clipped), with the left→right reset wipe at 1.0
 ctx.beginPath();ctx.rect(-ww/2,G.top,ww,wh-G.hb);ctx.clip();
 if(tl<1){drawRows(ctx,A1,tl,ww,wh,G,st);}
 else if(tl<1.15){
  const wx=-ww/2+ww*E.inOutCubic((tl-1)/.15);
  ctx.save();ctx.beginPath();ctx.rect(wx,G.top,ww,wh);ctx.clip();drawRows(ctx,A1,tl,ww,wh,G,st);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(-ww/2,G.top,wx+ww/2,wh);ctx.clip();drawRows(ctx,A2,tl,ww,wh,G,st);ctx.restore();
  const lg=ctx.createLinearGradient(wx-ww*.08,0,wx,0);lg.addColorStop(0,'rgba(244,236,216,0)');lg.addColorStop(1,'rgba(244,236,216,.35)');ctx.fillStyle=lg;ctx.fillRect(wx-ww*.08,G.top,ww*.08,wh);
  ctx.fillStyle='rgba(244,236,216,.8)';ctx.fillRect(wx-1,G.top,2,wh);
 }else drawRows(ctx,A2,tl,ww,wh,G,{...st,smear:st.smear&&tl>=1.5});
 ctx.restore();
 if(st.dim>0){H.rr(ctx,-ww/2,-wh/2,ww,wh,r);ctx.fillStyle=`rgba(6,10,9,${st.dim})`;ctx.fill();}
}

/* ── the room (window strip, wall clock, desk) ───────────── */
function drawRoom(ctx,s,g,Tw,cam){
 const day=clamp(Tw/2.5);
 bg(ctx,s);
 // window strip (parallax: half the camera zoom)
 const pz=1+(cam.z-1)*.5;
 ctx.save();ctx.translate(cam.x,cam.y);ctx.scale(pz,pz);ctx.translate(-cam.x,-cam.y);
 const y0=g.strip.y0,y1=g.strip.y1,sk=ctx.createLinearGradient(0,y0,0,y1);
 sk.addColorStop(0,ramp([[0,'#f4ecd8'],[.45,'#b9b29e'],[.72,'#4f5d66'],[1,NAVY]],day));
 sk.addColorStop(1,ramp([[0,'#e9dcc0'],[.45,'#8e9a95'],[.72,'#2f3a44'],[1,'#0d1424']],day));
 ctx.globalAlpha=.62;ctx.fillStyle=sk;ctx.fillRect(-s.w*.1,y0,s.w*1.2,y1-y0);
 // sun → moon crossing the strip
 const sx=lerp(s.w*.05,s.w*.95,day),sy=y0+(y1-y0)*(.62-.32*Math.sin(day*Math.PI));
 ctx.globalAlpha=1;H.glow(ctx,sx,sy,(y1-y0)*.9,day<.6?'#f4ecd8':'#8e9a95',.35*(1-day*.6));
 ctx.globalAlpha=.8;ctx.fillStyle=mix('#fbf4e2','#cfd8d2',day);ctx.beginPath();ctx.arc(sx,sy,(y1-y0)*.13,0,TAU);ctx.fill();
 // mullions + sill
 ctx.globalAlpha=1;ctx.fillStyle=PAL.slate;const mw=Math.max(3,s.u*.9);
 for(let x=-s.w*.1;x<s.w*1.1;x+=s.w*(s.portrait?.25:.14))ctx.fillRect(x-mw/2,y0,mw,y1-y0);
 ctx.fillRect(-s.w*.1,y0-mw/2,s.w*1.2,mw);ctx.fillStyle=PAL.slate2;ctx.fillRect(-s.w*.1,y1-mw/2,s.w*1.2,mw*1.4);
 // light spill on the wall
 const sp=ctx.createLinearGradient(0,y1,0,y1+s.h*.3);sp.addColorStop(0,mix('#f4ecd8',NAVY,day,.14));sp.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sp;ctx.fillRect(-s.w*.1,y1,s.w*1.2,s.h*.3);
 // desk
 const dk=ctx.createLinearGradient(0,g.desk,0,s.h*1.1);dk.addColorStop(0,'#26302c');dk.addColorStop(1,'#0c1210');ctx.fillStyle=dk;ctx.fillRect(-s.w*.1,g.desk,s.w*1.2,s.h*.4);
 ctx.fillStyle='rgba(142,154,149,.18)';ctx.fillRect(-s.w*.1,g.desk,s.w*1.2,Math.max(1,s.u*.3));
 ctx.restore();
 drawClock(ctx,s,g,Tw,pz,cam);
}
function bg(ctx,s){const g=ctx.createLinearGradient(0,0,0,s.h);g.addColorStop(0,'#1d2622');g.addColorStop(1,'#0a100d');ctx.fillStyle=g;ctx.fillRect(0,0,s.w,s.h);}
function drawClock(ctx,s,g,Tw,pz,cam){
 const c=g.clock;ctx.save();ctx.translate(cam.x,cam.y);ctx.scale(pz,pz);ctx.translate(-cam.x,-cam.y);
 // jumps: an hour per beat from 0.5, an hour per 8th from 2.0
 let jumps=0,last=-9;for(let t=.5;t<=3.0001;t+=(t<2-1e-6?.5:.25)){if(Tw>=t){jumps++;last=t;}}
 const jk=Tw-last<.22?E.outBack(clamp((Tw-last)/.18)):1,hours=9+jumps-1+jk;
 const hit=Tw-last<.15?1-(Tw-last)/.15:0;
 ctx.translate(c.x,c.y);
 ctx.beginPath();ctx.arc(0,0,c.r,0,TAU);ctx.fillStyle='#202a26';ctx.fill();ctx.lineWidth=Math.max(2,c.r*.09);ctx.strokeStyle=mix(PAL.slate2,PAL.slate3,.3+.4*hit);ctx.stroke();
 ctx.strokeStyle=PAL.slate3;ctx.lineCap='round';
 for(let i=0;i<12;i++){const a=i/12*TAU,l=i%3===0?.22:.12;ctx.lineWidth=Math.max(1,c.r*(i%3===0?.07:.04));ctx.beginPath();ctx.moveTo(Math.cos(a)*c.r*(.86-l),Math.sin(a)*c.r*(.86-l));ctx.lineTo(Math.cos(a)*c.r*.86,Math.sin(a)*c.r*.86);ctx.stroke();}
 const ha=(hours%12)/12*TAU-Math.PI/2,ma=hours*TAU-Math.PI/2;
 ctx.strokeStyle='#c3cbc7';ctx.lineWidth=Math.max(2,c.r*.1);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(ha)*c.r*.45,Math.sin(ha)*c.r*.45);ctx.stroke();
 ctx.lineWidth=Math.max(1.5,c.r*.06);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(ma)*c.r*.7,Math.sin(ma)*c.r*.7);ctx.stroke();
 ctx.fillStyle='#c3cbc7';ctx.beginPath();ctx.arc(0,0,c.r*.08,0,TAU);ctx.fill();
 ctx.restore();
}

/* ── the grind world: room + hero chat + the 24-chat grid ── */
function cells(g){const out=[];let i=1;for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){const hero=c===g.hc&&r===g.hr;out.push({c,r,hero,off:hero?0:OFFS[i++%OFFS.length]});}return out;}
function drawGrind(ctx,s,Tw){
 const g=geo(s),cam=camera(s,g,Tw);
 const roomA=1-E.inOutSine((Tw-1.9)/.35),othersA=E.outCubic((Tw-1.92)/.3);
 const band=capBand(s),bandOn=E.inOutSine((Tw-1.85)/.35);
 if(roomA>0){ctx.save();ctx.globalAlpha=roomA;drawRoom(ctx,s,g,Tw,cam);ctx.restore();}
 if(roomA<1){ctx.save();ctx.globalAlpha=1-roomA;const vg=ctx.createRadialGradient(s.w/2,s.h/2,0,s.w/2,s.h/2,Math.hypot(s.w,s.h)*.6);vg.addColorStop(0,'#1a2320');vg.addColorStop(1,'#070b09');ctx.fillStyle=vg;ctx.fillRect(0,0,s.w,s.h);ctx.restore();}
 const desat=Tw<2?.15+.25*(Tw/2):.4+.4*clamp((Tw-2)/1);
 // pull-back smear: ghost outlines of the grid at the two previous frames
 if(cam.pb>0&&cam.pb<1&&!s.reduced){
  ctx.save();ctx.strokeStyle='rgba(142,154,149,.5)';ctx.lineWidth=1;
  for(let gk=1;gk<=3;gk++){const c2=camera(s,g,Tw-gk/60);ctx.globalAlpha=.22/gk;for(const ce of cells(g)){const x=c2.x+(ce.c-g.hc)*c2.stepX*c2.z,y=c2.y+(ce.r-g.hr)*c2.stepY*c2.z,w=g.ww*c2.z,h=g.wh*c2.z;if(x+w/2<0||x-w/2>s.w||y+h/2<0||y-h/2>s.h)continue;H.rr(ctx,x-w/2,y-h/2,w,h,Math.min(w,h)*.045);ctx.stroke();}}
  ctx.restore();
 }
 const lod=g.ww*cam.z<s.u*30;
 for(const ce of cells(g)){
  const a=ce.hero?1:othersA;if(a<=0)continue;
  const x=cam.x+(ce.c-g.hc)*cam.stepX*cam.z,y=cam.y+(ce.r-g.hr)*cam.stepY*cam.z,w=g.ww*cam.z,h=g.wh*cam.z;
  if(x+w/2<0||x-w/2>s.w||y+h/2<0||y-h/2>s.h)continue;
  ctx.save();ctx.translate(x,y);ctx.scale(cam.z,cam.z);
  // neighbours: an opaque window silhouette lands first so the room never shows through them
  if(!ce.hero){ctx.globalAlpha=clamp(a*2.5);H.rr(ctx,-g.ww/2,-g.wh/2,g.ww,g.wh,Math.min(g.ww,g.wh)*.045);ctx.fillStyle='#111815';ctx.fill();}
  ctx.globalAlpha=a;
  if(ce.hero&&cam.pb<.5){ctx.save();ctx.globalAlpha*=.5;ctx.fillStyle='rgba(0,0,0,.6)';H.rr(ctx,-g.ww/2+s.u*.6,-g.wh/2+s.u*1.6,g.ww,g.wh,Math.min(g.ww,g.wh)*.045);ctx.fill();ctx.restore();}
  drawChat(ctx,g.ww,g.wh,Tw+ce.off*clamp((Tw-1.2)/.6),{desat,lod,smear:ce.hero&&!s.reduced,dim:ce.hero?0:.12,s,band,bandOn,scr:{x,y,z:cam.z}});
  ctx.restore();
 }
}

/* ── frozen world cache (3.0 onwards) ────────────────────── */
let frozen=null;
function drawFrozen(ctx,s,dpr){
 const key=s.w+'x'+s.h+'@'+dpr;
 if(!frozen||frozen.key!==key){
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(s.w*dpr));c.height=Math.max(1,Math.round(s.h*dpr));
  const g=c.getContext('2d');g.scale(dpr,dpr);drawGrind(g,Object.assign({},s,{T:3}),3);
  frozen={key,c};
 }
 ctx.drawImage(frozen.c,0,0,s.w,s.h);
}

/* ── s01 GRIND ───────────────────────────────────────────── */
function droplet(ctx,s,x,y,r,stretch,alpha){
 H.glow(ctx,x,y,r*7,PAL.gold,.55*alpha);H.glow(ctx,x,y,r*2.6,PAL.hot,.8*alpha);
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(1/Math.sqrt(stretch),stretch);
 const g=ctx.createLinearGradient(0,-r*2.4,0,r);g.addColorStop(0,'#fff6dc');g.addColorStop(.5,PAL.hot);g.addColorStop(1,PAL.gold);
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-r*2.4);ctx.bezierCurveTo(r*.35,-r*1.4,r,-r*.6,r,0);ctx.arc(0,0,r,0,Math.PI);ctx.bezierCurveTo(-r,-r*.6,-r*.35,-r*1.4,0,-r*2.4);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.ellipse(-r*.35,-r*.15,r*.18,r*.3,-.4,0,TAU);ctx.fill();
 ctx.restore();
}
TR.defineScene({id:'s01_grind',start:0,end:3.5,draw(ctx,s){
 const T=s.T,dpr=dprOf(ctx);
 if(T<3){
  ctx.save();drawGrind(ctx,s,T);ctx.restore();
  // 2.5–3.0 the grid types faster and the vignette tightens
  vig(ctx,s,lerp(.42,.22,E.inOutSine((T-2.4)/.6)),lerp(.62,.82,E.inOutSine((T-2.4)/.6)));
 }else{
  drawFrozen(ctx,s,dpr);
  // HARD FREEZE: grid dims 30%, vignette closes
  const k=E.outCubic((T-3)/.08);
  ctx.fillStyle=`rgba(3,8,6,${.3*k})`;ctx.fillRect(0,0,s.w,s.h);
  vig(ctx,s,lerp(.22,.12,k),lerp(.82,.92,k));
  // a single gold droplet falls from top centre, touching frame centre at exactly 3.5
  const p=clamp((T-3)/.5),y=lerp(-s.h*.08,s.h/2,p*p),r=s.u*1.5,stretch=1+.55*p;
  const tl=s.u*(4+28*p);const tg=ctx.createLinearGradient(0,y-tl,0,y);tg.addColorStop(0,'rgba(246,220,154,0)');tg.addColorStop(1,'rgba(246,220,154,.75)');
  ctx.save();ctx.strokeStyle=tg;ctx.lineWidth=Math.max(1,r*.35);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(s.w/2,y-tl);ctx.lineTo(s.w/2,y-r*1.6);ctx.stroke();ctx.restore();
  H.glow(ctx,s.w/2,y,s.u*22,PAL.gold,.12+.1*p);
  droplet(ctx,s,s.w/2,y,r,stretch,1);
 }
 // fade up from black
 if(T<.2){ctx.fillStyle=`rgba(0,0,0,${1-E.outCubic(T/.2)})`;ctx.fillRect(0,0,s.w,s.h);}
 H.caption(ctx,s,{text:'เล่าตัวเองซ้ำอีกแล้ว?',accent:'ซ้ำ',sub:'แชตใหม่ทีไร AI ก็ลืมเราทุกที',in:.2,out:3.4});
}});

/* ── s02 DROP ────────────────────────────────────────────── */
// Vortex angle: angular speed ramps 0.5 → 3 rev/s over 3.5–6.0.
function vortexA(T){const x=Math.max(0,T-3.5),xa=Math.min(x,2.5);return TAU*(.5*x+.5*xa*xa+(x>2.5?2.5*(x-2.5):0));}
let bubbles=null;
function bubbleList(s){
 const key=s.w+'x'+s.h;if(bubbles&&bubbles.key===key)return bubbles;
 const g=geo(s),cam=camera(s,g,3),z=cam.z,list=[],frames=[];
 const cx=s.w/2,cy=s.h/2,diag=Math.hypot(s.w,s.h),RING=diag*.6;
 const mx=g.jar.x,my=g.jar.y-g.jar.size*.46;
 const rnd=H.rng(777);
 for(const ce of cells(g)){
  const x=cam.x+(ce.c-g.hc)*cam.stepX*z,y=cam.y+(ce.r-g.hr)*cam.stepY*z;
  frames.push({x,y,w:g.ww*z,h:g.wh*z});
  const G=chatGeom(g.ww,g.wh),tl=3+ce.off,off=scrollOff(A2,tl,G);
  for(let k=0;k<A2.length;k++){
   if(tl<A2[k])break;const y0=G.top+G.pad*.6+k*G.P-off;if(y0<G.top-G.uH*.2||y0+G.uH>G.bot)continue;
   const parts=[{lx:g.ww/2-G.pad-G.uW/2,ly:y0+G.uH/2,w:G.uW,h:G.uH,kind:0}];
   const ay=y0+G.uH+G.P*.06;if(ay+G.aH<G.bot)parts.push({lx:-g.ww/2+G.pad+G.aW/2,ly:ay+G.aH/2,w:G.aW,h:G.aH,kind:1});
   for(const p of parts){
    const bx=x+p.lx*z,by=y+p.ly*z;if(bx<-s.w*.05||bx>s.w*1.05||by<-s.h*.05||by>s.h*1.05)continue;
    // a bubble can only peel once the colour ring (centred on the frame) has reached it; after that the
    // order is keyed to the jar: the calm zone around the jar empties first and is clear by ~4.0
    const d=Math.hypot(bx-cx,by-cy),pass=3.5+.65*(1-Math.cbrt(1-clamp(d/RING)));
    const r0=Math.hypot(bx-mx,by-my),near=clamp((r0-g.jar.size*.5)/(g.jar.size*1.0)),far=clamp(r0/RING);
    const r1=rnd(),r2=rnd();
    let ts=pass+.04+near*(.15+far*.7+r1*.85),life=lerp(.3,.7,near)+near*(r2*.4+far*.45);
    if(ts+.12+life>6.4){ts=Math.max(pass+.03,6.4-.12-life);life=Math.max(.35,6.4-.12-ts);}
    list.push({x:bx,y:by,w:p.w*z,h:p.h*z,kind:p.kind,ts,life,r0,a0:Math.atan2(by-my,bx-mx),seed:list.length*31+7});
   }
  }
 }
 // Angle tables: the vortex spins faster near the eye. Each bubble's angular speed is the vortex speed
 // capped so its tangential speed stays under ~2.5u/frame, i.e. far pills drift, near pills whip round.
 // Integrated once here (pure function of time, so seeking stays identical).
 const vmax=s.u*150,DT=1/240;
 for(const b of list){
  const n=Math.ceil((.12+b.life+.02)/DT)+2,tab=new Float32Array(n);let a=b.a0;tab[0]=a;
  for(let i=1;i<n;i++){const tm=b.ts+(i-.5)*DT,rad=Math.max(s.u*.5,radAt(b,tm)),x=clamp(tm-3.5,0,2.5),wv=TAU*(.5+x);a+=Math.min(wv,vmax/rad)*clamp((tm-b.ts)/.35)*DT;tab[i]=a;}
  b.tab=tab;b.dt=DT;
 }
 bubbles={key,list,frames,mx,my};return bubbles;
}
// radius: slow start, accelerating in, but with a soft arrival (end slope 1.4, not 3)
function radAt(b,Tw){const k=clamp((Tw-b.ts-.12)/b.life);return b.r0*(1-k*k*(1.6-.6*k));}
function bubblePos(b,Tw,mx,my){
 const k=clamp((Tw-b.ts-.12)/b.life),rad=radAt(b,Tw),f=clamp((Tw-b.ts)/b.dt,0,b.tab.length-1.001),i=Math.floor(f),ang=b.tab[i]+(b.tab[i+1]-b.tab[i])*(f-i);
 return {x:mx+Math.cos(ang)*rad,y:my+Math.sin(ang)*rad,k};
}
// The jar outline as a polyline (same shape as the Path2D) so the draw-on can carry a glowing head.
let outl=null;
function jarOutline(size){
 if(outl&&outl.size===size)return outl;
 const bw=size*.6,top=-size*.3,bot=size*.46,nw=size*.36,nTop=-size*.41,sh=size*.13,r=size*.12,pts=[[-nw/2,nTop],[-nw/2,top]];
 const quad=(x0,y0,cx,cy,x1,y1)=>{for(let i=1;i<=8;i++){const t=i/8,m=1-t;pts.push([m*m*x0+2*m*t*cx+t*t*x1,m*m*y0+2*m*t*cy+t*t*y1]);}};
 quad(-nw/2,top,-bw/2,top,-bw/2,top+sh);pts.push([-bw/2,bot-r]);quad(-bw/2,bot-r,-bw/2,bot,-bw/2+r,bot);
 pts.push([bw/2-r,bot]);quad(bw/2-r,bot,bw/2,bot,bw/2,bot-r);pts.push([bw/2,top+sh]);quad(bw/2,top+sh,bw/2,top,nw/2,top);pts.push([nw/2,nTop]);
 const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
 outl={size,pts,cum,L:cum[cum.length-1]};return outl;
}
function drawJar(ctx,s,x,y,size,o){
 const bw=size*.6,top=-size*.3,bot=size*.46,nw=size*.36,nTop=-size*.41,sh=size*.13,r=size*.12;
 const path=new Path2D();
 path.moveTo(-nw/2,nTop);path.lineTo(-nw/2,top);path.quadraticCurveTo(-bw/2,top,-bw/2,top+sh);path.lineTo(-bw/2,bot-r);path.quadraticCurveTo(-bw/2,bot,-bw/2+r,bot);
 path.lineTo(bw/2-r,bot);path.quadraticCurveTo(bw/2,bot,bw/2,bot-r);path.lineTo(bw/2,top+sh);path.quadraticCurveTo(bw/2,top,nw/2,top);path.lineTo(nw/2,nTop);
 ctx.save();ctx.translate(x,y);
 // glass back + liquid
 if(o.glass>0){
  ctx.save();ctx.globalAlpha=o.glass;ctx.fillStyle='rgba(244,236,216,.07)';ctx.fill(path);
  ctx.clip(path);
  if(o.fill>0){
   const fy=bot-(bot-top)*o.fill,tilt=o.slosh;
   const lg=ctx.createLinearGradient(0,fy,0,bot);lg.addColorStop(0,PAL.hot);lg.addColorStop(.35,PAL.gold);lg.addColorStop(1,PAL.amber);
   ctx.fillStyle=lg;ctx.beginPath();ctx.moveTo(-bw,bot+2);
   for(let i=0;i<=12;i++){const lx=-bw/2+bw*i/12;ctx.lineTo(lx,fy+Math.sin(lx/size*9+o.wave)*size*.014+tilt*lx);}
   ctx.lineTo(bw,bot+2);ctx.closePath();ctx.fill();
   // surface sheen
   ctx.strokeStyle='rgba(255,246,220,.7)';ctx.lineWidth=Math.max(1,size*.012);ctx.beginPath();
   for(let i=0;i<=12;i++){const lx=-bw/2+bw*i/12,ly=fy+Math.sin(lx/size*9+o.wave)*size*.014+tilt*lx;i?ctx.lineTo(lx,ly):ctx.moveTo(lx,ly);}ctx.stroke();
   // rising bubbles
   const rr=H.rng(91);ctx.fillStyle='rgba(255,248,230,.55)';
   for(let i=0;i<9;i++){const bx=(rr()-.5)*bw*.75,sp=.35+rr()*.5,ph=rr(),k=(o.wave*.09*sp+ph)%1,by=bot-size*.04-k*(bot-fy);if(by<fy+size*.02)continue;ctx.beginPath();ctx.arc(bx+Math.sin(k*9+i)*size*.015,by,size*(.008+.012*rr()),0,TAU);ctx.fill();}
   H.glow(ctx,0,fy+size*.12,bw*.7,PAL.hot,.35);
  }
  ctx.restore();
 }
 // glass outline (draws itself on)
 if(o.draw>0){
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(o.draw<1){
   // hot-gold stroke racing round the glass with a glowing head
   const J=jarOutline(size),at=J.L*E.inOutCubic(o.draw);let hx=J.pts[0][0],hy=J.pts[0][1];
   ctx.beginPath();ctx.moveTo(hx,hy);
   for(let i=1;i<J.pts.length;i++){if(J.cum[i]>=at){const f=(at-J.cum[i-1])/(J.cum[i]-J.cum[i-1]||1);hx=lerp(J.pts[i-1][0],J.pts[i][0],f);hy=lerp(J.pts[i-1][1],J.pts[i][1],f);ctx.lineTo(hx,hy);break;}ctx.lineTo(J.pts[i][0],J.pts[i][1]);hx=J.pts[i][0];hy=J.pts[i][1];}
   ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(2,size*.035);ctx.stroke();
   H.glow(ctx,hx,hy,size*.32,PAL.hot,.9);H.glow(ctx,hx,hy,size*.09,'#ffffff',.9);
   ctx.restore();ctx.restore();return;
  }
  // after the draw-on the stroke cools from hot gold to glass cream
  const cool=clamp(o.cool??1);
  ctx.strokeStyle=mix(PAL.hot,PAL.cream,cool,.9+.1*(1-cool));ctx.lineWidth=Math.max(1.5,size*lerp(.035,.026,cool));ctx.stroke(path);
  // rim + edge highlights
  ctx.fillStyle='rgba(244,236,216,.85)';H.rr(ctx,-nw*.6,nTop-size*.02,nw*1.2,size*.05,size*.02);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1.5,size*.028);ctx.beginPath();ctx.moveTo(-bw/2+size*.08,top+sh*1.1);ctx.lineTo(-bw/2+size*.08,bot-r*1.3);ctx.stroke();
  ctx.lineWidth=Math.max(1,size*.016);ctx.beginPath();ctx.arc(0,top+sh,bw*.42,-Math.PI*.38,-Math.PI*.18);ctx.stroke();
  ctx.restore();
 }
 // label with a small gold clover
 if(o.label>0){
  const lw=bw*.64,lh=size*.2,ly=size*.13,ls=.6+.4*E.outBack(o.label);
  ctx.save();ctx.translate(0,ly);ctx.scale(ls,ls);ctx.globalAlpha=clamp(o.label*2);
  H.rr(ctx,-lw/2,-lh/2,lw,lh,size*.03);ctx.fillStyle=PAL.cream;ctx.fill();ctx.strokeStyle='rgba(226,194,122,.8)';ctx.lineWidth=Math.max(1,size*.01);ctx.stroke();
  const c=lh*.2,cy0=-lh*.08;ctx.lineCap='round';
  ctx.strokeStyle='#a8823c';ctx.lineWidth=Math.max(1,c*.32);ctx.beginPath();ctx.moveTo(0,cy0);ctx.quadraticCurveTo(c*.35,cy0+c*1.3,c*1.05,cy0+c*1.95);ctx.stroke();
  ctx.fillStyle=PAL.gold;ctx.lineWidth=Math.max(.8,c*.16);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;ctx.beginPath();ctx.arc(Math.cos(a)*c*.92,cy0+Math.sin(a)*c*.92,c*.66,0,TAU);ctx.fill();ctx.stroke();}
  ctx.restore();
 }
 // cork
 if(o.cork>0){
  const cy=nTop-size*.07-(1-E.outBack(o.cork))*size*.5,cw=nw*.92,ch=size*.13;
  ctx.save();ctx.globalAlpha=clamp(o.cork*3);ctx.translate(o.tremble,cy);
  const cg=ctx.createLinearGradient(-cw/2,0,cw/2,0);cg.addColorStop(0,'#9c7444');cg.addColorStop(.45,'#d4ad78');cg.addColorStop(1,'#8a6239');
  ctx.fillStyle=cg;ctx.beginPath();ctx.moveTo(-cw/2,-ch/2);ctx.lineTo(cw/2,-ch/2);ctx.lineTo(cw*.42,ch/2);ctx.lineTo(-cw*.42,ch/2);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(90,60,30,.5)';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc((i/4-.5)*cw*.7,((i*7)%3-1)*ch*.2,size*.01,0,TAU);ctx.fill();}
  ctx.restore();
 }
 ctx.restore();
 return {corkX:x+o.tremble,corkY:y+nTop-size*.07,mouthY:y+nTop};
}
function greenWorld(ctx,s,T,Tw,B,jar){
 const g=ctx.createRadialGradient(jar.x,jar.y,0,jar.x,jar.y,Math.hypot(s.w,s.h)*.62);
 g.addColorStop(0,'#1d5638');g.addColorStop(.35,'#103621');g.addColorStop(.75,PAL.green);g.addColorStop(1,PAL.void);
 ctx.fillStyle=g;ctx.fillRect(-s.w,-s.h,s.w*3,s.h*3);
 // the chat frames, now green, dissolving as their bubbles leave
 const fa=lerp(1,.0,E.inOutSine((T-4.2)/1.5));
 if(fa>0){
  ctx.save();ctx.globalAlpha=fa;ctx.lineWidth=1;
  for(const f of B.frames){H.rr(ctx,f.x-f.w/2,f.y-f.h/2,f.w,f.h,Math.min(f.w,f.h)*.045);ctx.fillStyle='rgba(4,16,10,.45)';ctx.fill();ctx.strokeStyle='rgba(226,194,122,.32)';ctx.stroke();ctx.fillStyle='rgba(31,90,58,.55)';ctx.fillRect(f.x-f.w/2+1,f.y-f.h/2+1,f.w-2,f.h*.13);}
  ctx.restore();
 }
 // bubbles still waiting to peel
 const band=capBand(s),waitCol=mix(PAL.cream,'#3f8a60',.38);
 for(const b of B.list){if(Tw>=b.ts)continue;ctx.globalAlpha=(b.kind?.6:.5)*(1-.6*bandK(s,band,b.x,b.y,b.w/2,b.h/2));ctx.fillStyle=b.kind?'#2f7a52':waitCol;H.rr(ctx,b.x-b.w/2,b.y-b.h/2,b.w,b.h,b.h*.4);ctx.fill();}
 ctx.globalAlpha=1;
 // spiral arms of the vortex
 const sa=Math.min(E.outCubic((T-3.8)/.5),1-E.inOutSine((Tw-6.1)/.4));
 if(sa>0){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.gold;ctx.lineCap='round';
  const base=vortexA(Tw)*.35,R1=Math.hypot(s.w,s.h)*.55;
  for(let i=0;i<9;i++){ctx.globalAlpha=sa*.17;ctx.lineWidth=s.u*(.25+.15*(i%3));ctx.beginPath();for(let j=0;j<=18;j++){const u=j/18,rad=R1*(1-u)*(.85+.15*Math.sin(i*1.7))+jar.size*.4,a=base+i*TAU/9+u*2.6;const px=B.mx+Math.cos(a)*rad,py=B.my+Math.sin(a)*rad;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();}
  ctx.restore();
 }
 H.dust(ctx,{...s,T:Tw},{seed:31,count:40,alpha:.45,size:1.4,speed:16});
}
TR.defineScene({id:'s02_drop',start:3.5,end:7,draw(ctx,s){
 const T=s.T,Tw=T<6.5?T:6.5+(T-6.5)*.1,dpr=dprOf(ctx);
 const g=geo(s),B=bubbleList(s),jar=g.jar,cx=s.w/2,cy=s.h/2,diag=Math.hypot(s.w,s.h);
 const rk=clamp((T-3.5)/.65),R=diag*.6*E.outCubic(rk);
 // camera: push toward the jar 6.0–6.5, then a slow breath during the freeze
 const zp=(1+.22*E.inOutCubic((Tw-6)/.5))*(1+.035*E.outCubic((T-6.5)/.5));
 ctx.save();
 ctx.translate(jar.x,jar.y);ctx.scale(zp,zp);ctx.translate(-jar.x,-jar.y);
 H.shake(ctx,s,1.3*(1-E.outCubic((T-3.5)/.35))+.25*[4.5,5,5.5,6].reduce((m,t)=>Math.max(m,T>=t&&T<t+.15?1-(T-t)/.15:0),0));
 if(rk<1){
  drawFrozen(ctx,s,dpr);ctx.fillStyle='rgba(3,8,6,.3)';ctx.fillRect(0,0,s.w,s.h);
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,Math.max(.1,R),0,TAU);ctx.clip();greenWorld(ctx,s,T,Tw,B,jar);ctx.restore();
 }else greenWorld(ctx,s,T,Tw,B,jar);
 // calm zone: a soft dark-green backing behind the jar so its draw-on reads (from 3.9)
 const bd=E.outCubic((T-3.9)/.3);
 if(bd>0){const rg=ctx.createRadialGradient(jar.x,jar.y,0,jar.x,jar.y,jar.size*1.4);rg.addColorStop(0,`rgba(4,18,11,${.82*bd})`);rg.addColorStop(.6,`rgba(4,18,11,${.55*bd})`);rg.addColorStop(1,'rgba(4,18,11,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(jar.x,jar.y,jar.size*1.4,0,TAU);ctx.fill();}
 // impact: local bloom + splash crown + shockwave rings
 const ia=1-clamp((T-3.5)/.5);
 if(ia>0){H.glow(ctx,cx,cy,Math.min(s.w,s.h)*.33,PAL.hot,.6*ia);H.glow(ctx,cx,cy,s.u*6,'#ffffff',.7*ia);}
 H.burst(ctx,Tw,3.5,{x:cx,y:cy,count:40,speed:s.u*55,life:.9,size:s.u*.55,gravity:s.u*60,seed:5,colors:[PAL.hot,PAL.gold,PAL.cream]});
 if(rk<1){
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=(1-rk)*.9;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,s.u*.6);ctx.beginPath();ctx.arc(cx,cy,Math.max(.1,R),0,TAU);ctx.stroke();
  ctx.globalAlpha=(1-rk)*.25;ctx.strokeStyle=PAL.gold;ctx.lineWidth=s.u*3.2;ctx.beginPath();ctx.arc(cx,cy,Math.max(.1,R-s.u*1.6),0,TAU);ctx.stroke();
  ctx.restore();
 }
 const r2=clamp((T-3.62)/.8);if(r2>0&&r2<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-r2)*.45;ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1,s.u*.35);ctx.beginPath();ctx.arc(cx,cy,diag*.36*E.outCubic(r2),0,TAU);ctx.stroke();ctx.restore();}
 // 4.0: a soft gold ring leaves the jar as it draws on, tying the jar to the impact
 const jr=clamp((T-4)/.7);if(jr>0&&jr<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-jr)*.5;ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1,s.u*(.9-.6*jr));ctx.beginPath();ctx.arc(jar.x,jar.y,jar.size*(.45+2.4*E.outCubic(jr)),0,TAU);ctx.stroke();ctx.restore();}
 // rays + bloom behind the jar
 const rayA=E.outCubic((T-5)/.5),push=E.inOutCubic((Tw-6)/.5);
 if(rayA>0)H.rays(ctx,jar.x,jar.y,jar.size*(2.6+2.2*push+.6*clamp((T-6.5)/.5)),12,Tw*.22,PAL.gold,.16*rayA,.09);
 const eye=E.outCubic((T-3.7)/.6);
 H.glow(ctx,B.mx,B.my,jar.size*(.9+.25*Math.sin(Tw*6)),PAL.gold,.35*eye);
 H.glow(ctx,jar.x,jar.y,jar.size*1.7,PAL.gold,.22*E.outCubic((T-4.2)/.6));
 // vortex bubbles (peel → spiral → burst at the jar mouth)
 const band=capBand(s),scrK=(x,y,hw,hh)=>bandK(s,band,jar.x+(x-jar.x)*zp,jar.y+(y-jar.y)*zp,hw*zp,hh*zp);
 const TRN=6,TRDT=.012,trailMax=s.u*5,tp=[];for(let j=0;j<=TRN;j++)tp.push({x:0,y:0});
 for(const b of B.list){
  if(Tw<b.ts)continue;const end=b.ts+.12+b.life;
  if(Tw>=end){continue;}
  const p=bubblePos(b,Tw,B.mx,B.my);
  const peel=clamp((Tw-b.ts)/.12),sc=(1+.25*Math.sin(peel*Math.PI))*lerp(1,.22,E.inCubic(p.k));
  // keep flying bubbles from crossing the caption block (screen space, world push accounted for), soft edge
  const ba=1-.72*scrK(p.x,p.y,b.h*.6,b.h*.6);
  // curved, tapering trail: sub-steps of the real path over the last ~0.07 s, capped at 5u
  let n=0,len=0;tp[0].x=p.x;tp[0].y=p.y;
  for(let j=1;j<=TRN;j++){const t=Tw-j*TRDT;if(t<b.ts)break;const q=bubblePos(b,t,B.mx,B.my),dl=Math.hypot(q.x-tp[n].x,q.y-tp[n].y);if(dl<.01)continue;
   if(len+dl>trailMax){const f=(trailMax-len)/dl;tp[n+1].x=tp[n].x+(q.x-tp[n].x)*f;tp[n+1].y=tp[n].y+(q.y-tp[n].y)*f;n++;len=trailMax;break;}
   n++;tp[n].x=q.x;tp[n].y=q.y;len+=dl;}
  const ang=n>0?Math.atan2(p.y-tp[1].y,p.x-tp[1].x):(peel-.5)*.6;
  if(n>=2&&len>s.u*.6){
   const hw=Math.max(.8,b.h*sc*.42);
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(.25+.45*p.k)*ba;
   const gr=ctx.createLinearGradient(tp[n].x,tp[n].y,p.x,p.y);gr.addColorStop(0,'rgba(226,194,122,0)');gr.addColorStop(1,b.kind?'rgba(226,194,122,.9)':'rgba(246,220,154,.95)');ctx.fillStyle=gr;
   ctx.beginPath();
   for(let j=0;j<=n;j++){const a=tp[Math.max(0,j-1)],c=tp[Math.min(n,j+1)],nx=-(a.y-c.y),ny=a.x-c.x,nl=Math.hypot(nx,ny)||1,w=hw*(1-j/n);const X=tp[j].x+nx/nl*w,Y=tp[j].y+ny/nl*w;j?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}
   for(let j=n;j>=0;j--){const a=tp[Math.max(0,j-1)],c=tp[Math.min(n,j+1)],nx=-(a.y-c.y),ny=a.x-c.x,nl=Math.hypot(nx,ny)||1,w=hw*(1-j/n);ctx.lineTo(tp[j].x-nx/nl*w,tp[j].y-ny/nl*w);}
   ctx.closePath();ctx.fill();ctx.restore();
  }
  // peel → a pill → a round gold droplet as it nears the jar
  const morph=E.outCubic(clamp(p.k*1.6)),w=lerp(b.w,b.h*1.25,morph),h=b.h*(1+.25*morph);
  ctx.save();ctx.globalAlpha=ba;ctx.translate(p.x,p.y);{const f=clamp(p.k*4),bx=1-f+f*Math.cos(2*ang),by=f*Math.sin(2*ang);ctx.rotate(Math.atan2(by,bx)/2);}ctx.scale(sc,sc);
  H.rr(ctx,-w/2,-h/2,w,h,h*.5);
  ctx.fillStyle=b.kind?mix('#2f7a52',PAL.gold,p.k):mix(PAL.cream,PAL.hot,p.k*1.4);ctx.fill();
  if(!b.kind&&morph<.5){ctx.globalAlpha=ba*(1-morph*2);ctx.fillStyle='rgba(11,38,25,.35)';ctx.fillRect(-w*.42,-h*.12,w*.6,h*.24);}
  if(morph>.5){ctx.globalAlpha=ba*(morph-.5)*1.6;ctx.fillStyle='rgba(255,250,235,.85)';ctx.beginPath();ctx.ellipse(-w*.18,-h*.15,h*.14,h*.1,-.5,0,TAU);ctx.fill();}
  ctx.restore();
 }
 for(const b of B.list){const end=b.ts+.12+b.life;if(Tw<end||Tw>end+.75)continue;H.burst(ctx,Tw,end,{x:B.mx,y:B.my,count:6+(b.seed%5),speed:s.u*(14+b.seed%9),life:.75,size:s.u*.42,seed:b.seed,gravity:s.u*6,colors:[PAL.hot,PAL.gold,PAL.cream]});}
 // the jar draws itself on at 4.0, then fills on every beat 4.5–6.0
 let fill=0,slosh=0;for(const t of [4.5,5,5.5,6]){fill+=.2125*E.outBack(clamp((Tw-t)/.3));if(Tw>=t)slosh=Math.sin((Tw-t)*16)*Math.exp(-(Tw-t)*5)*.12;}
 const tremK=E.inCubic((T-6.5)/.5),tremble=s.reduced?0:Math.sin(T*97)*2*tremK;
 const J=drawJar(ctx,s,jar.x,jar.y,jar.size,{draw:clamp((T-4)/.35),cool:clamp((T-4.35)/.45),glass:E.outCubic((T-4.3)/.3),fill,slosh,wave:Tw*5,label:clamp((T-4.35)/.3),cork:clamp((T-4.25)/.35),tremble});
 // orbiting motes around the jar (they hang during the freeze)
 const om=E.outCubic((T-4.4)/.5);
 if(om>0){ctx.save();ctx.globalCompositeOperation='lighter';const oa=vortexA(Tw)*.12;for(let i=0;i<36;i++){const a=oa+i/36*TAU,rr=jar.size*(.75+.35*((i*37)%11)/11);const px=jar.x+Math.cos(a)*rr,py=jar.y+Math.sin(a)*rr*.42;ctx.globalAlpha=om*(.35+.45*((i*13)%7)/7)*(Math.sin(a)>0?1:.5);ctx.fillStyle=i%3?PAL.hot:PAL.cream;ctx.beginPath();ctx.arc(px,py,s.u*(.18+.12*(i%3)),0,TAU);ctx.fill();}ctx.restore();}
 // 6.5–7.0 breath: a local glow swells around the cork and light leaks from its seam
 if(tremK>0||T>=6.5){const k=E.inCubic((T-6.5)/.5),m=Math.min(s.w,s.h);
  H.glow(ctx,J.corkX,J.corkY,m*.28*(.35+.65*k),PAL.hot,.25+.5*k);
  H.rays(ctx,J.corkX,J.corkY,m*.22*(.3+.7*k),10,T*.4,PAL.hot,.45*k,.05);
  H.glow(ctx,J.corkX,J.corkY,s.u*3,'#ffffff',.6*k);}
 ctx.restore();
 // vignette relaxes from the freeze into the warm green world
 const vk=E.outCubic((T-3.5)/.6);
 vig(ctx,s,lerp(.12,.38,vk),lerp(.92,.6,vk)+.15*E.inCubic((T-6.3)/.7));
 // caption: ซอส in the headline and "Source .md" in the sub in hot gold
 const sub='ซอส = ไฟล์ Source .md ที่เป็นคุณ',inT=3.6,outT=6.85;
 H.caption(ctx,s,{text:'ถ้ามีซอสที่รู้ใจคุณ…',accent:'ซอส',sub,subAccent:'Source .md',in:inT,out:outT});
}});
})();
