/* s09_serve (30.0–34.0) · Lesson 6 SERVE 🍽️: cloche lift → your own web page assembles → it copies out to
   8 devices that light up → loot → XP overload → implosion into a warm point.
   s10_life (34.0–44.5) · what the course gives back: TIME (clock rewinds, freed time rises as rings),
   HAPPINESS (rings pop into six loves, a figure raises its arms), RESPECT (spotlight, plate held up,
   laurel, an audience turning gold, applause) → iris to black. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H;
const {TAU,clamp,lerp,E,rng,hexA,PAL}=H;
const k01=(T,a,b)=>clamp((T-a)/(b-a));
const outQuart=x=>1-Math.pow(1-clamp(x),4);
const kick=T=>{const ph=((T%.5)+.5)%.5;return Math.exp(-ph*9);};
const PAPER='#fbf8f1',SILVER='#e9e4d6';

/* ── small vector parts ─────────────────────────────────── */
function heart(ctx,x,y,r){ctx.beginPath();ctx.moveTo(x,y+r*.9);ctx.bezierCurveTo(x-r*1.35,y+r*.05,x-r*.85,y-r*1.05,x,y-r*.35);ctx.bezierCurveTo(x+r*.85,y-r*1.05,x+r*1.35,y+r*.05,x,y+r*.9);ctx.closePath();}
function cursor(ctx,x,y,sz,press){ctx.save();ctx.translate(x,y);ctx.scale(press,press);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,sz);ctx.lineTo(sz*.27,sz*.76);ctx.lineTo(sz*.46,sz*1.12);ctx.lineTo(sz*.6,sz*1.05);ctx.lineTo(sz*.42,sz*.7);ctx.lineTo(sz*.75,sz*.7);ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();ctx.lineWidth=Math.max(1,sz*.07);ctx.strokeStyle=PAL.ink;ctx.lineJoin='round';ctx.stroke();ctx.restore();}
// The hills picture from Lesson 2, used as the page's hero image.
function hills(ctx,x,y,w,h,flat){
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 if(flat)ctx.fillStyle='#f3d996';else{const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#f6dc9a');g.addColorStop(1,'#fbf1d8');ctx.fillStyle=g;}
 ctx.fillRect(x,y,w,h);
 ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.arc(x+w*.7,y+h*.4,h*.17,0,TAU);ctx.fill();
 ctx.fillStyle='#6fa77a';ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+h*.6);ctx.quadraticCurveTo(x+w*.32,y+h*.22,x+w*.7,y+h*.72);ctx.lineTo(x+w*.7,y+h);ctx.fill();
 ctx.fillStyle=PAL.leaf;ctx.beginPath();ctx.moveTo(x+w*.25,y+h);ctx.quadraticCurveTo(x+w*.66,y+h*.38,x+w,y+h*.58);ctx.lineTo(x+w,y+h);ctx.fill();
 ctx.restore();
}
function plate(ctx,x,y,rx,ry,o={}){
 ctx.save();ctx.translate(x,y);if(o.sx!=null)ctx.scale(o.sx,1);
 ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,ry*.55,rx*1.02,ry*.9,0,0,TAU);ctx.fill();
 const back=o.back;
 ctx.fillStyle=back?PAL.gold:PAL.cream;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.fill();
 ctx.lineWidth=Math.max(1.5,ry*.16);ctx.strokeStyle=back?PAL.hot:PAL.gold;ctx.stroke();
 ctx.fillStyle=back?'#c9a55b':'#ece2c8';ctx.beginPath();ctx.ellipse(0,ry*.05,rx*.66,ry*.6,0,0,TAU);ctx.fill();
 ctx.lineWidth=Math.max(1,ry*.05);ctx.strokeStyle=hexA(PAL.gold,.55);ctx.stroke();
 ctx.restore();
}
function cloche(ctx,x,y,rx,o={}){
 const hgt=rx*.9;ctx.save();ctx.translate(x,y);ctx.rotate(o.rot||0);ctx.globalAlpha*=o.alpha??1;
 const g=ctx.createLinearGradient(-rx,-hgt,rx*.6,0);g.addColorStop(0,'#fffdf6');g.addColorStop(.45,SILVER);g.addColorStop(1,'#a9a493');
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-rx,0);ctx.bezierCurveTo(-rx,-hgt*1.25,rx,-hgt*1.25,rx,0);ctx.closePath();ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-rx*.42,-hgt*.55,rx*.12,hgt*.3,-.5,0,TAU);ctx.fill();
 ctx.fillStyle=PAL.gold;H.rr(ctx,-rx*1.04,-hgt*.06,rx*2.08,hgt*.12,hgt*.05);ctx.fill();
 ctx.beginPath();ctx.arc(0,-hgt*.95,rx*.11,0,TAU);ctx.fill();ctx.fillStyle=PAL.hot;ctx.beginPath();ctx.arc(-rx*.03,-hgt*.98,rx*.045,0,TAU);ctx.fill();
 ctx.restore();
}
// Your web page. pc = per-piece {dx,dy,a} (frame, pill, hero, cards, btn); missing piece = not drawn.
function page(ctx,x,y,w,h,pc,o={}){
 const bar=h*.1,r=Math.min(w,h)*.05;
 const P=k=>pc[k]&&pc[k].a>0?pc[k]:null;
 let p;
 if((p=P('frame'))){ctx.save();ctx.globalAlpha*=p.a;ctx.translate(p.dx,p.dy);
  ctx.fillStyle='rgba(0,0,0,.32)';H.rr(ctx,x+w*.02,y+h*.05,w,h,r);ctx.fill();
  ctx.fillStyle=PAPER;H.rr(ctx,x,y,w,h,r);ctx.fill();
  ctx.fillStyle='#e3e6e1';H.rr(ctx,x,y,w,bar,r);ctx.fill();ctx.fillRect(x,y+bar*.5,w,bar*.5);
  ['#e5675c','#e8b84a','#5bc27a'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(x+bar*.7+i*bar*.62,y+bar/2,bar*.19,0,TAU);ctx.fill();});
  ctx.lineWidth=Math.max(1,w*.006);ctx.strokeStyle=hexA(PAL.gold,.9);H.rr(ctx,x,y,w,h,r);ctx.stroke();
  ctx.restore();}
 if((p=P('pill'))){ctx.save();ctx.globalAlpha*=p.a;ctx.translate(p.dx,p.dy);ctx.fillStyle='#ffffff';H.rr(ctx,x+w*.26,y+bar*.2,w*.5,bar*.6,bar*.3);ctx.fill();ctx.fillStyle=PAL.leaf;ctx.beginPath();ctx.arc(x+w*.3,y+bar/2,bar*.14,0,TAU);ctx.fill();ctx.fillStyle='rgba(10,18,13,.18)';H.rr(ctx,x+w*.34,y+bar*.42,w*.24,bar*.16,bar*.08);ctx.fill();ctx.restore();}
 if((p=P('hero'))){ctx.save();ctx.globalAlpha*=p.a;ctx.translate(p.dx,p.dy);const hx=x+w*.05,hy=y+h*.15,hw=w*.9,hh=h*.36;ctx.save();H.rr(ctx,hx,hy,hw,hh,r*.6);ctx.clip();hills(ctx,hx,hy,hw,hh,o.flat);ctx.restore();
  ctx.fillStyle='rgba(11,38,25,.78)';H.rr(ctx,hx+hw*.06,hy+hh*.2,hw*.34,hh*.13,hh*.06);ctx.fill();H.rr(ctx,hx+hw*.06,hy+hh*.42,hw*.22,hh*.09,hh*.045);ctx.fill();ctx.restore();}
 if((p=P('cards'))){ctx.save();ctx.globalAlpha*=p.a;ctx.translate(p.dx,p.dy);const gap=w*.025,cw=(w*.9-gap*3)/4,cy=y+h*.56,ch=h*.21;
  for(let i=0;i<4;i++){const cx=x+w*.05+i*(cw+gap);ctx.fillStyle='#ffffff';H.rr(ctx,cx,cy,cw,ch,ch*.12);ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(10,18,13,.1)';ctx.stroke();
   ctx.fillStyle=[PAL.gold,'#8fc7a0','#e8b06a',PAL.leaf][i];H.rr(ctx,cx+cw*.1,cy+ch*.14,cw*.8,ch*.34,ch*.06);ctx.fill();
   ctx.fillStyle='rgba(10,18,13,.22)';H.rr(ctx,cx+cw*.1,cy+ch*.6,cw*.7,ch*.1,ch*.05);ctx.fill();H.rr(ctx,cx+cw*.1,cy+ch*.77,cw*.45,ch*.1,ch*.05);ctx.fill();}
  ctx.restore();}
 if((p=P('btn'))){ctx.save();ctx.globalAlpha*=p.a;const bx=x+w/2,by=y+h*.885,bw=w*.3*(p.sc??1),bh=h*.085*(p.sc??1);ctx.fillStyle=PAL.gold;H.rr(ctx,bx-bw/2,by-bh/2,bw,bh,bh/2);ctx.fill();ctx.fillStyle=PAL.hot;H.rr(ctx,bx-bw/2+bh*.15,by-bh/2+bh*.12,bw-bh*.3,bh*.3,bh*.15);ctx.fill();
  // ▶ mark (icon, not a word)
  ctx.fillStyle=PAL.deep;ctx.beginPath();ctx.moveTo(bx-bh*.18,by-bh*.25);ctx.lineTo(bx+bh*.26,by);ctx.lineTo(bx-bh*.18,by+bh*.25);ctx.closePath();ctx.fill();ctx.restore();}
}
// Device frame showing a mini copy of the page. W = reference width; lit 0..1.
function device(ctx,type,cx,cy,W,lit,alpha){
 ctx.save();ctx.globalAlpha*=alpha;
 let sw,sh,fx,fy,fw,fh,rad;
 if(type==='phone'){fw=W*.42;fh=W*.84;rad=fw*.18;}else if(type==='tablet'){fw=W*.64;fh=W*.84;rad=fw*.09;}else{fw=W;fh=W*.64;rad=fw*.04;}
 fx=cx-fw/2;fy=cy-fh/2;
 const pad=type==='laptop'?fw*.035:fw*.07;
 ctx.fillStyle='#0d1712';H.rr(ctx,fx,fy,fw,fh,rad);ctx.fill();
 if(lit>0){ctx.lineWidth=Math.max(1,W*.022);ctx.strokeStyle=hexA(PAL.hot,.35+.65*lit);ctx.stroke();}
 else{ctx.lineWidth=1;ctx.strokeStyle='rgba(244,236,216,.25)';ctx.stroke();}
 sw=fw-pad*2;sh=fh-pad*2;const sx=fx+pad,sy=fy+pad;
 ctx.save();H.rr(ctx,sx,sy,sw,sh,rad*.6);ctx.clip();
 ctx.fillStyle='#16241d';ctx.fillRect(sx,sy,sw,sh);
 if(lit>0){ctx.globalAlpha*=clamp(lit*1.5);ctx.fillStyle=PAPER;ctx.fillRect(sx,sy,sw,sh);
  hills(ctx,sx,sy+sh*.06,sw,sh*(type==='phone'?.38:.46),true);
  const bw=sw*(type==='phone'?.55:.34),bh=Math.max(2,sh*.08);ctx.fillStyle=PAL.gold;H.rr(ctx,sx+sw/2-bw/2,sy+sh*.8-bh/2,bw,bh,bh/2);ctx.fill();
  ctx.fillStyle='rgba(10,18,13,.18)';const by=sy+sh*(type==='phone'?.52:.6);H.rr(ctx,sx+sw*.1,by,sw*.8,Math.max(1.5,sh*.05),sh*.025);ctx.fill();H.rr(ctx,sx+sw*.1,by+sh*.09,sw*.55,Math.max(1.5,sh*.05),sh*.025);ctx.fill();}
 else{ctx.fillStyle='rgba(255,255,255,.06)';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+sw*.6,sy);ctx.lineTo(sx,sy+sh*.7);ctx.fill();}
 ctx.restore();
 if(type==='laptop'){ctx.fillStyle=lit>0?'#2a3a31':'#1a2620';ctx.beginPath();ctx.moveTo(fx-fw*.08,fy+fh+fh*.02);ctx.lineTo(fx+fw*1.08,fy+fh+fh*.02);ctx.lineTo(fx+fw*1.02,fy+fh+fh*.11);ctx.lineTo(fx-fw*.02,fy+fh+fh*.11);ctx.closePath();ctx.fill();if(lit>0){ctx.lineWidth=1;ctx.strokeStyle=hexA(PAL.hot,.6*lit);ctx.stroke();}}
 ctx.restore();
}
function hexOutline(ctx,x,y,r,rot){ctx.beginPath();for(let i=0;i<6;i++){const a=rot+i*TAU/6;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}

/* ── s09 SERVE ──────────────────────────────────────────── */
// Device clones: a = 16:9 centre (fractions of w,h), p = 9:16 centre, z = final scale vs the page width.
const DEV=[
 {t:'phone', a:[.075,.31],p:[.11,.215],z:.40,g:0},
 {t:'laptop',a:[.13,.83], p:[.22,.535],z:.42,g:0},
 {t:'tablet',a:[.515,.40],p:[.90,.20], z:.34,g:0},
 {t:'phone', a:[.33,.86], p:[.80,.535],z:.40,g:0},
 {t:'tablet',a:[.06,.60], p:[.07,.42], z:.30,g:1},
 {t:'laptop',a:[.46,.79], p:[.50,.555],z:.36,g:1},
 {t:'phone', a:[.53,.63], p:[.93,.40], z:.34,g:1},
 {t:'laptop',a:[.22,.165],p:[.36,.125],z:.25,g:1,back:true},
];
const HEARTS=(()=>{const r=rng(6061),out=[];for(let i=0;i<DEV.length*3;i++)out.push({dx:(r()-.5)*2,sp:.7+r()*.6,ph:r()*TAU,sz:.7+r()*.6,dl:r()*.25});return out;})();
const SHARD=(()=>{const r=rng(3091),out=[];for(let i=0;i<26;i++)out.push({a:r()*TAU,sp:.5+r()*.8,len:.5+r()});return out;})();
function lay9(s){
 if(s.portrait){const bw=s.w*.8,bh=bw*.66,cx=s.w/2,cy=s.h*.30;return {cx,cy,bw,bh,bx:cx-bw/2,by:cy-bh/2,px:cx,py:s.h*.47,prx:bw*.5,pry:bw*.13,ex:cx,ey:s.h*.36,er:s.w*.4};}
 const bw=s.w*.34,bh=bw*.62,cx=s.w*.30,cy=s.h*.42;return {cx,cy,bw,bh,bx:cx-bw/2,by:cy-bh/2,px:cx,py:s.h*.62,prx:bw*.5,pry:bw*.13,ex:cx,ey:s.h*.52,er:s.u*30};
}
// A page piece flying in from (fx,fy) and snapping at `land`.
function piece(T,land,fx,fy){const k=k01(T,land-.2,land);if(k<=0)return {a:0,dx:0,dy:0};const m=1-E.outBack(k);return {a:Math.min(1,k*3),dx:fx*m,dy:fy*m};}
function serveWorld(ctx,s){
 const T=s.T,L=lay9(s),u=s.u;
 // background (skipped when the caller paints it untransformed)
 if(!s.noBg){H.bg(ctx,s,'#0d2a1c',PAL.deep);
 ctx.fillStyle=H.radial(ctx,L.cx,L.cy,Math.max(s.w,s.h)*.6,hexA(PAL.leaf,.55),hexA(PAL.deep,0));ctx.fillRect(0,0,s.w,s.h);}
 H.dust(ctx,s,{seed:309,count:36,alpha:.35,size:1.3*u/5});
 // hex emblem: slams bright at 30.0, settles to a 10% watermark
 {const k=k01(T,30,30.3),sc=k<1?E.outBack(k)*1.0:1,bright=1-E.outCubic(k01(T,30.15,30.9));
  if(sc>0){ctx.save();ctx.translate(L.ex,L.ey);ctx.scale(sc,sc);
   hexOutline(ctx,0,0,L.er,Math.PI/6+(T-30)*.05);ctx.lineWidth=Math.max(1.5,u*.5);ctx.strokeStyle=hexA(PAL.gold,.12+.7*bright);ctx.stroke();
   hexOutline(ctx,0,0,L.er*.86,Math.PI/6+(T-30)*.05);ctx.lineWidth=Math.max(1,u*.2);ctx.strokeStyle=hexA(PAL.gold,.08+.4*bright);ctx.stroke();
   H.emoji(ctx,'🍽️',0,0,L.er*.9,{alpha:.1+.5*bright});
   if(bright>0)H.glow(ctx,0,0,L.er*1.1,PAL.hot,.45*bright);
   ctx.restore();}
  // local burst of gold shards (≤25% radius)
  const age=T-30;if(age>=0&&age<.7){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.hot;ctx.lineCap='round';for(const sh of SHARD){const d=u*24*sh.sp*E.outCubic(age/.7),a=1-age/.7;ctx.globalAlpha=a;ctx.lineWidth=Math.max(1,u*.35*a);ctx.beginPath();ctx.moveTo(L.ex+Math.cos(sh.a)*d,L.ey+Math.sin(sh.a)*d);ctx.lineTo(L.ex+Math.cos(sh.a)*(d+u*2.2*sh.len*a),L.ey+Math.sin(sh.a)*(d+u*2.2*sh.len*a));ctx.stroke();}ctx.restore();}
 }
 // rays + steam from the uncovered plate
 const lift=k01(T,30.5,30.85);
 if(T>=30.5&&T<31.9){const a=Math.min(E.outCubic(k01(T,30.5,30.7)),1-k01(T,31.3,31.9));H.rays(ctx,L.px,L.py-L.pry,Math.min(s.w,s.h)*.34,10,-Math.PI/2+(T-30.5)*.35,PAL.hot,.55*a,.09);H.glow(ctx,L.px,L.py-L.pry,L.prx*1.2,PAL.hot,.5*a);}
 if(T>=30.5&&T<31.8){ctx.save();ctx.lineCap='round';for(let i=0;i<3;i++){const st=30.5+i*.08,k=k01(T,st,st+1.1);if(k<=0)continue;const a=Math.sin(Math.PI*k)*.45;ctx.globalAlpha=a;ctx.strokeStyle=PAL.cream;ctx.lineWidth=u*.6;const x0=L.px+(i-1)*L.prx*.35,y0=L.py-L.pry*.5,len=u*16*E.outCubic(k);ctx.beginPath();ctx.moveTo(x0,y0);for(let j=1;j<=8;j++){const f=j/8;ctx.lineTo(x0+Math.sin(f*5+T*5+i*2)*u*1.6*f,y0-len*f);}ctx.stroke();}ctx.restore();}
 // back-layer clones (behind the page)
 drawClones(ctx,s,L,true);
 // plate, with a skid on entry and a card-flip at the loot
 {const k=k01(T,30,30.45),slide=1-E.outExpo(k),skid=k<1?Math.sin(k*Math.PI)*.1:0;
  const fk=k01(T,32.5,33),flip=fk>0&&fk<1?Math.cos(TAU*fk*.5+0)*1:1;const sx=fk>0&&fk<1?Math.cos(Math.PI*2*E.inOutCubic(fk)):1;
  plate(ctx,L.px+slide*s.w*.25,L.py,L.prx*(1+skid*.6),L.pry*(1-skid*.4),{sx,back:sx<0});void flip;
  if(fk>0&&fk<.8){H.rays(ctx,L.px,L.py,Math.min(s.w,s.h)*.3,12,T*.6,PAL.hot,.5*Math.sin(Math.PI*fk/.8),.07);}
  // cloche: rides in with the plate, lifts at 30.5 (−14u, 8°, 0.35 s), then sails up and away
  if(T<30.95){const ck=E.outBack(lift),away=E.inCubic(k01(T,30.72,30.95));const cx=L.px+slide*s.w*.25-away*L.prx*(s.portrait?.9:1.4),cy=L.py-L.pry*.25-u*14*ck-away*u*6;
   cloche(ctx,cx,cy,L.prx*.8*(1+skid*.4),{rot:.14*ck-.5*away,alpha:1-away});}
  // skid dust
  if(k>.1&&k<.9){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=PAL.hot;for(let i=0;i<8;i++){const kk=(k*3+i*.13)%1;ctx.globalAlpha=(1-kk)*.5*(1-k);ctx.beginPath();ctx.arc(L.px+slide*s.w*.25+L.prx*(.7+kk*.6),L.py+L.pry*.6-kk*u*3*(i%3),u*.35,0,TAU);ctx.fill();}ctx.restore();}
 }
 // the page, assembling from four sides 30.95–31.42, pulsing on the click at 31.5
 if(T>=30.75){
  const pc={frame:piece(T,30.95,0,-s.h*.5),pill:piece(T,31.08,s.w*.5,0),hero:piece(T,31.2,-s.w*.5,0),cards:piece(T,31.32,0,s.h*.5)};
  const bk=k01(T,31.3,31.48);pc.btn={a:bk>0?1:0,dx:0,dy:0,sc:E.outBack(bk)*(1-.12*Math.sin(Math.PI*k01(T,31.5,31.62)))};
  const pulse=Math.sin(Math.PI*k01(T,31.5,31.75))*.045;
  ctx.save();ctx.translate(L.cx,L.cy);ctx.scale(1+pulse,1+pulse);ctx.translate(-L.cx,-L.cy);
  page(ctx,L.bx,L.by,L.bw,L.bh,pc);
  // snap glints
  for(const [land,x,y] of [[30.95,L.cx,L.by],[31.08,L.cx+L.bw*.2,L.by+L.bh*.05],[31.2,L.bx+L.bw*.2,L.by+L.bh*.33],[31.32,L.cx,L.by+L.bh*.66],[31.48,L.cx,L.by+L.bh*.885]]){const g=T-land;if(g>=0&&g<.3)H.glow(ctx,x,y,L.bw*.22,PAL.hot,.7*(1-g/.3));}
  ctx.restore();
  // click ripple
  const rk=k01(T,31.5,31.95);if(rk>0&&rk<1){ctx.save();ctx.strokeStyle=hexA(PAL.hot,1-rk);ctx.lineWidth=Math.max(1,u*.5*(1-rk));ctx.beginPath();ctx.ellipse(L.cx,L.by+L.bh*.885,L.bw*.16+L.bw*.5*E.outCubic(rk),L.bh*.06+L.bw*.3*E.outCubic(rk),0,0,TAU);ctx.stroke();ctx.restore();}
 }
 // front clones
 drawClones(ctx,s,L,false);
 // cursor: glides in, clicks the gold button at 31.5, leaves
 if(T>=31.1&&T<32.1){const k=E.inOutCubic(k01(T,31.1,31.45)),out=E.inCubic(k01(T,31.7,32.1));const tx=L.cx+L.bw*.04,ty=L.by+L.bh*.885;
  const x=lerp(L.cx+L.bw*.75,tx,k)+out*L.bw*.4,y=lerp(L.by+L.bh*1.35,ty,k)+out*L.bh*.3;
  const press=1-.18*Math.sin(Math.PI*k01(T,31.46,31.6));
  ctx.save();ctx.globalAlpha=(1-out)*clamp((T-31.1)/.1);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x+u*1.6,y+u*3.2,u*1.6,u*.6,0,0,TAU);ctx.fill();cursor(ctx,x,y,u*(s.portrait?6:4.6),press);ctx.restore();}
 // loot copy arcs into HUD slot 6, landing at 33.0
 const lk=k01(T,32.55,33);
 if(lk>0&&lk<1){const sl=TR.hudRect(s,5),e=E.inOutCubic(lk);const x0=L.px,y0=L.py-L.pry,mx=lerp(x0,sl.x,.5)+(s.portrait?-s.w*.15:-s.w*.05),my=Math.min(y0,sl.y)-s.h*.12;
  const q=(a,b,c,t)=>(1-t)*(1-t)*a+2*(1-t)*t*b+t*t*c;const x=q(x0,mx,sl.x,e),y=q(y0,my,sl.y,e);
  for(let i=1;i<=6;i++){const te=Math.max(0,e-i*.035);H.glow(ctx,q(x0,mx,sl.x,te),q(y0,my,sl.y,te),u*2*(1-i/7),PAL.hot,.5*(1-i/7));}
  H.emoji(ctx,'🍽️',x,y,lerp(u*12,sl.size*.62,e),{glow:PAL.hot});}
}
function drawClones(ctx,s,L,back){
 const T=s.T;if(T<31.5)return;
 for(let i=0;i<DEV.length;i++){const d=DEV[i];if(!!d.back!==back)continue;
  const t0=d.g?31.75:31.5,launch=t0-.25,k=k01(T,launch,t0);if(k<=0)continue;
  const tx=(s.portrait?d.p[0]:d.a[0])*s.w,ty=(s.portrait?d.p[1]:d.a[1])*s.h;
  const e=E.outBack(k),ex=E.outCubic(k);
  const mx=lerp(L.cx,tx,.5)+(ty-L.cy)*.25,my=lerp(L.cy,ty,.5)-(tx-L.cx)*.12;
  const x=(1-ex)*(1-ex)*L.cx+2*(1-ex)*ex*mx+ex*ex*tx,y=(1-ex)*(1-ex)*L.cy+2*(1-ex)*ex*my+ex*ex*ty;
  // parallax drift by depth after landing
  const drift=(T-t0)*(d.z-.3)*s.u*6;
  const sc=lerp(.2,d.z,e)*L.bw*(s.portrait?.84:1);
  const lit=k01(T,t0,t0+.15);
  if(lit>0&&!back)H.glow(ctx,x+drift,y,sc*.9,PAL.gold,.35*lit+.35*Math.max(0,1-(T-t0)/.4));
  device(ctx,d.t,x+drift,y,sc,lit,(back?.65:1)*clamp(k*4));
  // hearts
  if(T>=t0){for(let j=0;j<3;j++){const hh=HEARTS[i*3+j],age=T-t0-hh.dl;if(age<0||age>1.1)continue;const a=age<.1?age/.1:1-(age-.1)/1;const hx=x+drift+hh.dx*sc*.35+Math.sin(age*5+hh.ph)*s.u*.8,hy=y-sc*.35-age*s.u*10*hh.sp;
   ctx.save();ctx.globalAlpha=a;ctx.fillStyle=j%2?PAL.hot:PAL.gold;heart(ctx,hx,hy,s.u*(s.portrait?1.5:1.1)*hh.sz*(1+.4*Math.max(0,1-age/.2)));ctx.fill();ctx.restore();}}
 }
}
H.serveWorld=serveWorld;
TR.defineScene({id:'s09_serve',start:30,end:34,draw(ctx,s){
 const T=s.T,u=s.u;
 // backdrop stays put (no seams on the whip, no shrinking rectangle on the implosion)
 {const L=lay9(s);H.bg(ctx,s,'#0d2a1c',PAL.deep);ctx.fillStyle=H.radial(ctx,L.cx,L.cy,Math.max(s.w,s.h)*.6,hexA(PAL.leaf,.55),hexA(PAL.deep,0));ctx.fillRect(0,0,s.w,s.h);}
 // WORLD: whip-in from the right (16:9) / bottom (9:16), shake on the emblem slam, implosion at the end
 const wk=k01(T,30,30.25),whip=1-E.outExpo(wk);
 const imp=k01(T,33.5,34),ik=.35*E.inExpo(imp)+.65*E.inCubic(imp),scale=1-ik;
 ctx.save();
 if(imp>0){ctx.translate(s.w/2,s.h/2);ctx.rotate(ik*.35);ctx.scale(Math.max(.001,scale),Math.max(.001,scale));ctx.translate(-s.w/2,-s.h/2);}
 if(s.portrait)ctx.translate(0,whip*s.h*.3);else ctx.translate(whip*s.w*.3,0);
 const shk=T<30.45?.55*(1-k01(T,30,30.45)):T>=33&&T<33.5?.15:0;H.shake(ctx,s,shk);
 serveWorld(ctx,Object.assign({},s,{noBg:true}));
 ctx.restore();
 // OVERLOAD: world dims to 40%, then to near-black as it implodes
 const dim=E.outCubic(k01(T,33,33.2));if(dim>0){ctx.fillStyle=`rgba(4,16,10,${.6*dim+.3*E.inCubic(imp)})`;ctx.fillRect(0,0,s.w,s.h);}
 // whip streaks
 if(wk<1){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.cream;const r=rng(3001);for(let i=0;i<24;i++){const a=(1-wk)*(.15+r()*.3);ctx.globalAlpha=a;ctx.lineWidth=1+r()*2;const len=(s.portrait?s.h:s.w)*(.15+r()*.3)*(1-wk);if(s.portrait){const x=r()*s.w,y=r()*s.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+len);ctx.stroke();}else{const x=r()*s.w,y=r()*s.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len,y);ctx.stroke();}}ctx.restore();}
 // gold ripple running along the HUD rail during the overload
 if(T>=33&&T<33.6){const k=k01(T,33,33.5),a0=TR.hudRect(s,0),a7=TR.hudRect(s,7);const x=lerp(a0.x-a0.size,a7.x+a0.size,E.inOutSine(k));H.glow(ctx,x,a0.y,a0.size*2.2,PAL.hot,.6*Math.sin(Math.PI*k01(T,33,33.6)));
  // energy motes rising from the world into the rail
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=PAL.hot;const r=rng(3301);for(let i=0;i<40;i++){const st=33+r()*.3,x0=r()*s.w,kk=k01(T,st,st+.35);if(kk<=0||kk>=1)continue;const y=lerp(s.h*(.5+r()*.4),a0.y,E.inCubic(kk)),x=lerp(x0,lerp(a0.x,a7.x,r()),E.inCubic(kk));ctx.globalAlpha=Math.sin(Math.PI*kk);ctx.beginPath();ctx.arc(x,y,u*.35,0,TAU);ctx.fill();}ctx.restore();}
 // implosion: a warm point gathers at frame centre
 if(T>=33.45){const k=k01(T,33.45,34);H.speedLines(ctx,s,{seed:3401,count:36,alpha:.35*Math.sin(Math.PI*k),speed:-2.2,color:PAL.hot});
  H.glow(ctx,s.w/2,s.h/2,u*(6+20*(1-k)),PAL.hot,.4+.6*E.inCubic(k));H.glow(ctx,s.w/2,s.h/2,u*3,'#ffffff',E.inCubic(k));}
 // TEXT (never shakes)
 H.caption(ctx,s,{text:'มีเว็บของคุณเองแล้ว',sub:'บท 6 · ไฟล์ HTML ใครก็เปิดใช้ได้',in:30.15,out:33.9,accent:'เว็บของคุณเอง',layout:'column',chip:'🍽️'});
}});

/* ── s10 LIFE ───────────────────────────────────────────── */
const LOVES=['☕','🎸','🌿','🏠','🐶','🎨'];
const LOVE_A=[[.22,.47],[.26,.28],[.37,.13],[.63,.13],[.74,.28],[.78,.47]];
const LOVE_P=[[.15,.41],[.13,.255],[.26,.1],[.74,.1],[.87,.255],[.85,.41]];
// 12 rings: even = front (become the six loves), odd = back layers (become bokeh)
const RINGS=(()=>{const r=rng(3402),out=[];for(let i=0;i<12;i++){const front=i%2===0;out.push({i,front,love:front?[2,3,4,5,0,1][i/2]:-1,layer:front?2:(i%4===1?0:1),bx:r(),by:.1+r()*.42,ph:r()*TAU,dl:r()*.25});}return out;})();
const BOKEH=(()=>{const r=rng(3403),out=[];for(let i=0;i<18;i++)out.push({x:r(),y:r(),r:.8+r()*1.8,sp:.3+r()*.7,ph:r()*TAU});return out;})();
// grid dust: 24 windows × 8 motes
const GRID_DUST=(()=>{const r=rng(3404),out=[];for(let w=0;w<24;w++)for(let j=0;j<8;j++)out.push({w,ox:r(),oy:r(),ang:r()*TAU,bend:(r()-.5)*1.4,dl:j*.035+r()*.05,dur:.55+r()*.4,sz:.6+r()*.8});return out;})();
const CLAPS=(()=>{const r=rng(3405),out=[];for(let i=0;i<16;i++)out.push({seat:Math.floor(r()*14),st:42+r()*1.6,dx:(r()-.5)*2,sz:.8+r()*.5,ph:r()*TAU});return out;})();
const SPARKS=(()=>{const r=rng(3406),out=[];for(let i=0;i<60;i++)out.push({x:r(),st:42+r()*2,sp:.5+r(),ph:r()*TAU,sz:.5+r()});return out;})();
// audience turn order: from the centre outward
const SEAT_ORDER=[6,7,5,8,4,9,3,10,2,11,1,12,0,13];
function lay10(s){
 const P=s.portrait,u=s.u;
 return {cx:s.w/2,hy:s.h*(P?.32:.38),clockR:u*(P?17:12),figS:u*(P?36:25),figY:s.h*(P?.37:.47),
  loves:(P?LOVE_P:LOVE_A).map(([x,y])=>[x*s.w,y*s.h]),loveSz:u*(P?11:8.5),
  audY0:P?.50:.555,audY1:P?.565:.63,audA:u*(P?5.6:4.6)};
}
function seat(s,L,i){const f=i/13,c=f*2-1,P=s.portrait;const x=s.w*lerp(P?.07:.1,P?.93:.9,f);const y=s.h*lerp(L.audY0,L.audY1,1-c*c);return {x,y,sc:1+.22*(1-c*c)};}
function clock(ctx,s,L,T){
 const k=k01(T,34,34.6),sc=lerp(.6,1,E.outBack(k))*(1-.12*E.inCubic(k01(T,37.5,37.9)));
 const a=Math.min(clamp((T-34)/.2),1-k01(T,37.5,37.9));if(a<=0)return;
 const R=L.clockR*sc,x=L.cx,y=L.hy;
 ctx.save();ctx.globalAlpha=a;
 H.glow(ctx,x,y,R*2.1,PAL.gold,.35);
 ctx.fillStyle=H.radial(ctx,x,y-R*.3,R*1.2,'#14402a',PAL.green);ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();
 ctx.lineWidth=Math.max(2,R*.09);ctx.strokeStyle=PAL.gold;ctx.stroke();
 ctx.lineWidth=Math.max(1,R*.02);ctx.strokeStyle=hexA(PAL.hot,.6);ctx.beginPath();ctx.arc(x,y,R*.86,0,TAU);ctx.stroke();
 // ticks (each one leaves as a ring at 35.5+)
 ctx.lineCap='round';
 for(let i=0;i<12;i++){const det=35.5+RINGS[i].dl+i*.03;if(T>=det)continue;const an=i/12*TAU-Math.PI/2,big=i%3===0;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,R*(big?.06:.035));ctx.beginPath();ctx.moveTo(x+Math.cos(an)*R*.72,y+Math.sin(an)*R*.72);ctx.lineTo(x+Math.cos(an)*R*(big?.58:.64),y+Math.sin(an)*R*(big?.58:.64));ctx.stroke();}
 // hands: rewind 12 turns (easeOutQuart), lock at 35.5 with a bounce
 const rk=k01(T,34,35.5),settle=T>35.5?Math.sin((T-35.5)*28)*Math.exp(-(T-35.5)*7)*.12:0;
 const mA=-Math.PI/2+(.25*TAU)-12*TAU*outQuart(rk)+settle,hA=-Math.PI/2+(.42*TAU)-TAU*outQuart(rk)+settle*.5;
 // motion smear while spinning fast
 const speed=rk<1?12*TAU*4*Math.pow(1-rk,3)/1.5:0;
 if(speed>2){ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=hexA(PAL.hot,Math.min(.35,speed/120));ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,R*.78,mA,mA+Math.min(2.6,speed*.02));ctx.closePath();ctx.fill();ctx.restore();}
 ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(2,R*.075);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(hA)*R*.46,y+Math.sin(hA)*R*.46);ctx.stroke();
 ctx.lineWidth=Math.max(1.5,R*.045);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(mA)*R*.74,y+Math.sin(mA)*R*.74);ctx.stroke();
 ctx.fillStyle=PAL.cream;ctx.beginPath();ctx.arc(x,y,R*.07,0,TAU);ctx.fill();
 // lock flash
 const lk=T-35.5;if(lk>=0&&lk<.6){H.glow(ctx,x,y,R*1.6,PAL.hot,.6*(1-lk/.6));ctx.strokeStyle=hexA(PAL.hot,1-lk/.6);ctx.lineWidth=Math.max(1,R*.04*(1-lk/.6));ctx.beginPath();ctx.arc(x,y,R*(1+lk*1.6),0,TAU);ctx.stroke();}
 ctx.restore();
 H.burst(ctx,T,35.5,{x,y,count:24,speed:s.u*40,size:s.u*.5,life:.8,seed:3501,colors:[PAL.hot,PAL.cream]});
}
function grid(ctx,s,L,T){
 if(T>=35.9)return;
 const P=s.portrait,cols=P?3:6,rows=P?8:4,gw=s.w*(P?.9:.92),gh=s.h*(P?.9:.84),ox=(s.w-gw)/2,oy=(s.h-gh)/2,cw=gw/cols,ch=gh/rows;
 const fin=clamp((T-34)/.25);
 ctx.save();
 for(let w=0;w<24;w++){const c=w%cols,r=Math.floor(w/cols),x=ox+c*cw+cw*.08,y=oy+r*ch+ch*.1,ww=cw*.84,hh=ch*.8;
  const dx=x+ww/2-L.cx,dy=y+hh/2-L.hy,dist=Math.hypot(dx/s.w,dy/s.h);const td=34.15+dist*1.5;
  const a=fin*(1-k01(T,td,td+.3))*.5;if(a<=0)continue;
  ctx.globalAlpha=a;ctx.strokeStyle='rgba(200,207,201,.55)';ctx.lineWidth=1;H.rr(ctx,x,y,ww,hh,Math.min(ww,hh)*.08);ctx.stroke();
  ctx.fillStyle='rgba(200,207,201,.32)';const bh=hh*.12;
  H.rr(ctx,x+ww*.45,y+hh*.2,ww*.45,bh,bh/2);ctx.fill();H.rr(ctx,x+ww*.1,y+hh*.44,ww*.25,bh,bh/2);ctx.fill();H.rr(ctx,x+ww*.45,y+hh*.68,ww*.45,bh,bh/2);ctx.fill();}
 ctx.restore();
 // dust streaming along curved paths into the clock
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const d of GRID_DUST){const c=d.w%cols,r=Math.floor(d.w/cols);const x0=ox+c*cw+cw*(.1+d.ox*.8),y0=oy+r*ch+ch*(.12+d.oy*.76);
  const dist=Math.hypot((x0-L.cx)/s.w,(y0-L.hy)/s.h),st=34.15+dist*1.5+d.dl,k=k01(T,st,st+d.dur);if(k<=0||k>=1)continue;
  const tx=L.cx+Math.cos(d.ang)*L.clockR*.9,ty=L.hy+Math.sin(d.ang)*L.clockR*.9;const mx=(x0+tx)/2-(ty-y0)*d.bend,my=(y0+ty)/2+(tx-x0)*d.bend;
  const e=E.inCubic(k)*.7+k*.3;const x=(1-e)*(1-e)*x0+2*(1-e)*e*mx+e*e*tx,y=(1-e)*(1-e)*y0+2*(1-e)*e*my+e*e*ty;
  ctx.globalAlpha=Math.min(1,k*5)*(1-k*.3);ctx.fillStyle=d.w%3?PAL.gold:PAL.hot;ctx.beginPath();ctx.arc(x,y,s.u*.32*d.sz,0,TAU);ctx.fill();}
 ctx.restore();
}
function ringPos(s,L,rg,T){
 const an=rg.i/12*TAU-Math.PI/2,sx=L.cx+Math.cos(an)*L.clockR*.65,sy=L.hy+Math.sin(an)*L.clockR*.65;
 let tx,ty;
 if(rg.front){[tx,ty]=L.loves[rg.love];}else{tx=s.w*(.06+rg.bx*.88);ty=s.h*rg.by*(s.portrait?.9:1);}
 const det=35.5+rg.dl+rg.i*.03,k=E.inOutCubic(k01(T,det,det+1.7));
 // float upward with a lift arc
 const x=lerp(sx,tx,k),y=lerp(sy,ty,k)-Math.sin(Math.PI*k)*s.u*(rg.front?6:10);
 const par=[.4,.7,1][rg.layer];const bob=Math.sin(T*2.2+rg.ph)*s.u*.8*par;
 return {x:x+Math.sin(T*.9+rg.ph)*s.u*.6*par,y:y+bob,k,det};
}
function drawRing(ctx,x,y,r,a){
 ctx.save();ctx.globalAlpha*=a;
 H.glow(ctx,x,y,r*2,PAL.gold,.35);
 ctx.fillStyle=hexA(PAL.hot,.1);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
 ctx.lineWidth=Math.max(1.5,r*.18);ctx.strokeStyle=PAL.gold;ctx.stroke();
 ctx.lineWidth=Math.max(1,r*.09);ctx.strokeStyle='rgba(255,252,240,.85)';ctx.beginPath();ctx.arc(x,y,r*.78,Math.PI*1.05,Math.PI*1.5);ctx.stroke();
 ctx.restore();
}
function figure(ctx,x,y,S,arm,a,o={}){
 const reach=1+.55*(o.reach||0),rim=o.rim||0;
 if(a<=0)return;
 ctx.save();ctx.globalAlpha*=a;
 H.glow(ctx,x,y-S*.2,S*.9,PAL.hot,.35*(o.glow??1));
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(x,y+S*.34,S*.3,S*.05,0,0,TAU);ctx.fill();
 ctx.lineCap='round';
 // arms: angle from straight up (0) to down (π)
 const sh=y-S*.33,len=S*.4*reach;
 const hands=[];
 for(const side of [-1,1]){const hx=x+side*S*.13+Math.sin(arm)*side*len,hy=sh-Math.cos(arm)*len;hands.push([hx,hy]);}
 const shape=(extra,col)=>{ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=S*.1+extra*2;
  for(let i=0;i<2;i++){const side=i?1:-1;ctx.beginPath();ctx.moveTo(x+side*S*.13,sh);ctx.lineTo(hands[i][0],hands[i][1]);ctx.stroke();}
  H.rr(ctx,x-S*.17-extra,y-S*.42-extra,S*.34+extra*2,S*.74+extra*2,S*.17+extra);ctx.fill();
  ctx.beginPath();ctx.arc(x,y-S*.6,S*.15+extra,0,TAU);ctx.fill();
  ctx.fillRect(x-S*.075-extra,y-S*.5,S*.15+extra*2,S*.12);};
 // a warm dark rim keeps the cream silhouette readable inside the spotlight
 if(rim>0)shape(Math.max(1.5,S*.022),hexA('#5a3f12',.55*rim));
 shape(0,PAL.cream);
 if(rim>0){ctx.save();ctx.globalAlpha*=.5*rim;ctx.fillStyle='#e6d9b8';H.rr(ctx,x+S*.02,y-S*.38,S*.13,S*.66,S*.065);ctx.fill();ctx.restore();}
 ctx.restore();
 return hands;
}
function laurel(ctx,x,y,R,k,a){
 if(k<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=PAL.gold;ctx.fillStyle=PAL.gold;ctx.lineCap='round';ctx.lineWidth=Math.max(1.2,R*.05);
 for(const side of [-1,1]){const a0=Math.PI/2+side*.35,span=Math.PI*.78;const a1=a0+side*span*k;
  ctx.beginPath();if(side<0)ctx.arc(x,y,R,a1,a0);else ctx.arc(x,y,R,a0,a1);ctx.stroke();
  for(let i=0;i<8;i++){const f=(i+.6)/8.6;if(f>k)break;const an=a0+side*span*f,lx=x+Math.cos(an)*R,ly=y+Math.sin(an)*R,tang=an+side*Math.PI/2;
   for(const off of [-.55,.55]){const la=tang+off*side;const ls=R*.17*Math.min(1,(k-f)*8);ctx.save();ctx.translate(lx+Math.cos(la)*ls*.6,ly+Math.sin(la)*ls*.6);ctx.rotate(la);ctx.beginPath();ctx.ellipse(0,0,ls*.7,ls*.28,0,0,TAU);ctx.fill();ctx.restore();}}}
 ctx.restore();
}
function person(ctx,x,y,A,turn,gold,a){
 // seen from behind, facing the hero. turn: 0..1 (squash flip), gold: outline colour amount
 const sx=Math.abs(Math.cos(Math.PI*turn))*.7+.3;
 ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.scale(sx,1);
 ctx.beginPath();ctx.arc(0,-A*.62,A*.3,0,TAU);ctx.moveTo(-A*.62,A*.35);ctx.quadraticCurveTo(-A*.62,-A*.25,0,-A*.25);ctx.quadraticCurveTo(A*.62,-A*.25,A*.62,A*.35);ctx.closePath();
 ctx.fillStyle='#0e2419';ctx.fill();ctx.lineWidth=Math.max(1,A*.08);ctx.strokeStyle=gold>0?hexA(PAL.hot,.35+.65*gold):'rgba(244,236,216,.16)';ctx.stroke();
 ctx.restore();
}
TR.defineScene({id:'s10_life',start:34,end:44.5,draw(ctx,s){
 const T=s.T,u=s.u,L=lay10(s);
 ctx.fillStyle='#000';ctx.fillRect(0,0,s.w,s.h);
 const push=E.inOutSine(k01(T,42,44)),pz=1+.12*push;
 const hands0=L.figY-L.figS*.33-L.figS*.4;
 const focusY=lerp(L.figY,hands0,.4);
 // iris (44.0–44.5)
 const ir=k01(T,44,44.42),irisR=ir>0?lerp(Math.hypot(s.w,s.h)*.6,0,E.inCubic(ir)):0;
 ctx.save();
 if(ir>0){ctx.beginPath();ctx.arc(L.cx,focusY,Math.max(.5,irisR),0,TAU);ctx.clip();}
 ctx.translate(L.cx,focusY);ctx.scale(pz,pz);ctx.translate(-L.cx,-focusY);
 // background: warm green, key lifted
 H.bg(ctx,{w:s.w,h:s.h},'#123522','#071b11');
 ctx.fillStyle=H.radial(ctx,L.cx,L.hy,Math.max(s.w,s.h)*.7,hexA('#2c6a43',.8),hexA(PAL.deep,0));ctx.fillRect(0,0,s.w,s.h);
 grid(ctx,s,L,T);
 // warm wash: blooms from the point of light at 34.0 to 35%, settles to a 12% wash
 {const k=k01(T,34,34.5),R=Math.hypot(s.w,s.h)*(.05+.75*E.outCubic(k));const a=T<34.5?.35*E.outCubic(k):lerp(.35,.12,E.inOutSine(k01(T,34.5,36)));
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=H.radial(ctx,s.w/2,s.h/2,R,hexA(PAL.hot,a),hexA(PAL.gold,0));ctx.fillRect(0,0,s.w,s.h);ctx.restore();
  if(T<34.3)H.glow(ctx,s.w/2,s.h/2,u*(3+40*k),'#ffffff',.9*(1-k01(T,34,34.3)));}
 // bokeh
 if(T>=35.4){const a=Math.min(1,(T-35.4)/.8);ctx.save();ctx.globalCompositeOperation='lighter';for(const b of BOKEH){const x=b.x*s.w+Math.sin(T*.4+b.ph)*u*3,y=((b.y*s.h-(T-34)*u*b.sp*3)%s.h+s.h)%s.h;ctx.globalAlpha=a*(.07+.06*Math.sin(T*1.3+b.ph));ctx.fillStyle=PAL.hot;ctx.beginPath();ctx.arc(x,y,u*b.r*1.6,0,TAU);ctx.fill();}ctx.restore();}
 clock(ctx,s,L,T);
 // rings (back layers first)
 const bop=T>=38&&T<41.2?1+.02*kick(T):1;
 for(const layer of [0,1,2])for(const rg of RINGS){if(rg.layer!==layer)continue;const P=ringPos(s,L,rg,T);if(T<P.det)continue;
  const rr0=u*(s.portrait?1.6:1.2),rr1=rg.front?L.loveSz*.62:u*[1.8,2.6][rg.layer];
  let r=lerp(rr0,rr1,P.k),a=[.45,.7,1][rg.layer];
  if(rg.front){const pt=37.5+[4,5,0,1,2,3][rg.love]*.5;if(T>=pt){const pk=k01(T,pt,pt+.14);if(pk>=1)continue;r*=1+.5*pk;a*=1-pk;}}
  else if(T>=38){a*=1-.6*k01(T,38,39);}
  drawRing(ctx,P.x,P.y,r*bop,a);}
 // loves pop one per beat 37.5–40.0: left→right in time order ☕🎸🌿🏠🐶🎨
 const POP=[37.5,38,38.5,39,39.5,40];
 const ldim=1-.5*E.outCubic(k01(T,41,41.4));ctx.save();ctx.globalAlpha=ldim;
 for(let i=0;i<6;i++){const pt=POP[i];if(T<pt)continue;const [x0,y0]=L.loves[i];const k=k01(T,pt,pt+.3),sc=k<.6?1.1*E.outCubic(k/.6):lerp(1.1,1,E.inOutSine((k-.6)/.4));
  const bob=Math.sin((T-pt)*Math.PI*2*.5+i)*u*.7,x=x0,y=y0+bob,sz=L.loveSz*sc*(T<41.2?1+.02*kick(T):1);
  H.glow(ctx,x,y,sz*1.15,PAL.cream,.35);ctx.save();ctx.globalAlpha*=.9;ctx.fillStyle=hexA(PAL.cream,.16);ctx.beginPath();ctx.arc(x,y,sz*.78,0,TAU);ctx.fill();ctx.lineWidth=Math.max(1,u*.25);ctx.strokeStyle=hexA(PAL.gold,.7);ctx.stroke();ctx.restore();
  H.emoji(ctx,LOVES[i],x,y,sz*.95);
  H.burst(ctx,T,pt,{x,y,count:10,speed:u*28,size:u*.45,life:.6,seed:3600+i,colors:[PAL.hot,PAL.cream]});}
 ctx.restore();
 // RESPECT: dim everything except the spotlight
 const dim=E.outCubic(k01(T,41,41.4));
 if(dim>0){const fy=L.figY-L.figS*.25,R=L.figS*1.1;const g=ctx.createRadialGradient(L.cx,fy,R*.45,L.cx,fy,R*1.9);g.addColorStop(0,'rgba(4,16,10,0)');g.addColorStop(1,`rgba(4,16,10,${.7*dim})`);ctx.fillStyle=g;ctx.fillRect(-s.w,-s.h,s.w*3,s.h*3);
  // spotlight cone
  ctx.save();ctx.globalCompositeOperation='lighter';const top=-s.h*.05,bot=L.figY+L.figS*.36;const cg=ctx.createLinearGradient(0,top,0,bot);cg.addColorStop(0,hexA(PAL.hot,.26*dim));cg.addColorStop(1,hexA(PAL.hot,.05*dim));ctx.fillStyle=cg;
  ctx.beginPath();ctx.moveTo(L.cx-L.figS*.12,top);ctx.lineTo(L.cx+L.figS*.12,top);ctx.lineTo(L.cx+L.figS*.62,bot);ctx.lineTo(L.cx-L.figS*.62,bot);ctx.closePath();ctx.fill();
  ctx.fillStyle=hexA(PAL.hot,.22*dim);ctx.beginPath();ctx.ellipse(L.cx,bot,L.figS*.62,L.figS*.08,0,0,TAU);ctx.fill();ctx.restore();}
 // the figure: fades in 38.0–38.75 with arms rising; brings the plate overhead at 41.0
 {const fa=E.outCubic(k01(T,38,38.75));
  if(fa>0){const up=E.inOutSine(k01(T,38,38.75)),hold=E.inOutCubic(k01(T,40.95,41.3));
   const arm=lerp(lerp(Math.PI*.88,.62,up),.4,hold);const S=L.figS*(T<41.2?1+.02*kick(T):1);
   const hands=figure(ctx,L.cx,L.figY,S,arm,fa,{glow:1-.5*dim,reach:hold,rim:dim});
   if(T>=40.95&&hands){const pk=k01(T,40.95,41.35),ps=E.outBack(pk);const px=L.cx,py=(hands[0][1]+hands[1][1])/2-S*.05,prx=S*.42*ps,pry=prx*.26;
    H.glow(ctx,px,py-S*.18,S*.9,PAL.hot,.55*ps);
    plate(ctx,px,py,prx,pry);
    // mini website standing on the plate, glowing
    const mw=prx*1.25,mh=mw*.66;if(ps>.05){const pcs={frame:{a:1,dx:0,dy:0},pill:{a:1,dx:0,dy:0},hero:{a:1,dx:0,dy:0},cards:{a:1,dx:0,dy:0},btn:{a:1,dx:0,dy:0,sc:1}};page(ctx,px-mw/2,py-mh-pry*.1,mw,mh,pcs,{flat:true});H.glow(ctx,px,py-mh*.5,mw*.8,PAL.gold,.25+.15*Math.sin(T*6));}
    laurel(ctx,px,py-mh*.42,mw*.82,E.inOutCubic(k01(T,41.5,42.1)),1);
    if(pk<1)H.rays(ctx,px,py-mh*.5,S*1.1,12,T*.5,PAL.hot,.5*(1-pk),.08);}
  }}
 // audience turns gold, one per 16th from 41.5, centre outward
 if(T>=40.9){const aa=E.outCubic(k01(T,40.9,41.3));
  for(let n=0;n<14;n++){const i=SEAT_ORDER[n],st=41.5+n*.125,tk=k01(T,st,st+.2),p=seat(s,L,i);
   if(tk>0)H.glow(ctx,p.x,p.y-L.audA*p.sc*.3,L.audA*p.sc*1.4,PAL.gold,.25*tk+.35*Math.sin(Math.PI*tk));
   person(ctx,p.x,p.y,L.audA*p.sc,tk,tk,aa);}}
 // applause: 👏 and gold sparks rise 42–44
 if(T>=42){for(const c of CLAPS){const age=T-c.st;if(age<0||age>1.6)continue;const p=seat(s,L,c.seat);const a=Math.min(1,age/.2)*(1-age/1.6);H.emoji(ctx,'👏',p.x+c.dx*u*2+Math.sin(age*4+c.ph)*u,p.y-L.audA*p.sc*1.2-age*u*(s.portrait?14:10),u*(s.portrait?4.4:3.2)*c.sz,{alpha:a});}
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=PAL.hot;for(const sp of SPARKS){const age=T-sp.st;if(age<0||age>1.4)continue;const x=s.w*lerp(.08,.92,sp.x)+Math.sin(age*3+sp.ph)*u*1.5,y=s.h*lerp(L.audY0,L.audY1,.5)-age*u*14*sp.sp;ctx.globalAlpha=(1-age/1.4)*.8;ctx.beginPath();ctx.arc(x,y,u*.3*sp.sz,0,TAU);ctx.fill();}ctx.restore();}
 ctx.restore();
 // iris rim + final pinpoint
 if(ir>0&&ir<1){ctx.save();ctx.strokeStyle=hexA(PAL.hot,.6*(1-ir));ctx.lineWidth=Math.max(1,u*.5);ctx.beginPath();ctx.arc(L.cx,focusY,irisR,0,TAU);ctx.stroke();ctx.restore();}
 if(T>=44.3){const k=k01(T,44.3,44.5);H.glow(ctx,L.cx,focusY,u*(4-3*k),PAL.hot,Math.sin(Math.PI*k));}
 // TEXT
 H.caption(ctx,s,{text:'ได้เวลาคืนมา',sub:'เลิกเล่าตัวเองซ้ำ งานเสร็จไวขึ้น',in:34.15,out:37.45,accent:'เวลา'});
 H.caption(ctx,s,{text:'ความสุขกลับมา',sub:'ได้ทำสิ่งที่รัก กับคนที่รัก',in:37.6,out:40.95,accent:'ความสุข'});
 H.caption(ctx,s,{text:'คนเห็นฝีมือคุณ',sub:'มีผลงานจริงให้คนเห็น ว่าคุณทำได้',in:41.1,out:44.35,accent:'ฝีมือ'});
}});
})();
