/* s05_taste (14–18 s) + s06_cook (18–22 s).
   s05: Lesson 2 TASTE. The sealed jar from L1 slides in, its lid pops, a polished gold spoon dips in and drips one
   drop onto an empty picture frame. The first taste paints in OFF (chunky pixels, purple-grey, upside-down figure,
   jitter, coral ✗). The fix happens at the source: a gold pulse runs from the frame down the spoon into the jar, a
   label bar rewrites, and the image SNAPS crisp in green and gold with a mint ✓. The spoon flips and a coin flies
   into HUD slot 2. Whip-out to the left carries the corrected card.
   s06: Lesson 3 COOK. A wok lands over ember flames, the jar pours a gold ribbon, the corrected card drops in and
   sizzles, the pan tosses it, and it somersaults into a vertical phone that PLAYS a parallax loop with a 10-segment
   progress bar. A camera icon is struck through (no filming). The wok flips and a coin flies into HUD slot 3.
   WORLD layers take every push / shake / whip; captions are drawn after the world is restored and never shake. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H;
const {E,PAL,clamp,lerp,TAU,rng,hexA}=H;
const prog=(a,b,x)=>clamp((x-a)/(b-a));
const bez=(a,b,c,k)=>(1-k)*(1-k)*a+2*(1-k)*k*b+k*k*c;
const red=(s,v)=>s.reduced?v*.3:v;
const ICON2=H.LESSONS[1].icon,ICON3=H.LESSONS[2].icon;
const CORAL='#d9786a';
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const rgbC=new Map();
function rgb(hex){let v=rgbC.get(hex);if(!v){const n=parseInt(hex.slice(1),16);v=[n>>16&255,n>>8&255,n&255];rgbC.set(hex,v);}return v;}
function mix(a,b,k){if(k<=0)return a;if(k>=1)return b;const A=rgb(a),B=rgb(b);return `rgb(${Math.round(A[0]+(B[0]-A[0])*k)},${Math.round(A[1]+(B[1]-A[1])*k)},${Math.round(A[2]+(B[2]-A[2])*k)})`;}
const baseK=s=>s.portrait?Math.min(s.w*.9,s.h*.48)/100:Math.min(s.w*.56,s.h*.8)/100;

/* ── shared drawing helpers ────────────────────────────── */
function eglow(ctx,x,y,rx,ry,color,a){if(rx<=0||a<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);H.glow(ctx,0,0,rx,color,a);ctx.restore();}
// Screen-space whip streaks. dir -1 = streaks travel left.
function whipLines(ctx,s,k,seed,o={}){
 if(k<=0)return;const r=rng(seed),n=o.count||24,dir=o.dir||-1,span=s.w,cross=s.h;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 for(let i=0;i<n;i++){const c=r()*cross,len=span*(.12+r()*.3)*(.4+.6*k),ph=(r()+s.T*(2.2+r()*2))%1;const p=dir<0?span*(1.15-ph*1.4):span*(-.15+ph*1.4);
  ctx.globalAlpha=Math.min(1,k)*(.18+r()*.4);ctx.strokeStyle=i%3?PAL.hot:PAL.cream;ctx.lineWidth=Math.max(1,s.u*(.15+r()*.35));ctx.beginPath();ctx.moveTo(p,c);ctx.lineTo(p-dir*len,c);ctx.stroke();}
 ctx.restore();
}
// Soft parallax bokeh behind the hero (moves at half the whip offset).
function bokeh(ctx,s,ox,seed,warm){
 const r=rng(seed);
 for(let i=0;i<8;i++){const x=r()*s.w+ox*(.35+r()*.3)+Math.sin(s.T*.4+i)*s.u*2,y=s.h*(.15+r()*.75)+Math.cos(s.T*.3+i*2)*s.u*1.5,rad=s.u*(6+r()*10);
  H.glow(ctx,x,y,rad,warm&&i%3===0?PAL.ember:(i%2?PAL.gold:'#2f7a4f'),.08+.06*r());}
}
function coin(ctx,x,y,r,icon,a,o={}){
 if(r<=0||a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);
 const da=o.discA??1;
 if(da>0){ctx.save();ctx.globalAlpha*=da;const g=ctx.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);g.addColorStop(0,'#21603d');g.addColorStop(1,PAL.deep);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
  ctx.lineWidth=Math.max(1.5,r*.13);ctx.strokeStyle=PAL.gold;ctx.stroke();ctx.lineWidth=Math.max(1,r*.04);ctx.strokeStyle=hexA(PAL.hot,.55);ctx.beginPath();ctx.arc(0,0,r*.78,0,TAU);ctx.stroke();ctx.restore();}
 H.emoji(ctx,icon,0,r*.03,r*1.02);
 ctx.restore();
}
// Hex emblem holding the lesson emoji at ~10% alpha; slams in at t0 with a local shard burst.
function emblem(ctx,s,x,y,K,icon,T,t0,seed){
 const t=T-t0,es=s.reduced?1:E.outBack(clamp(t/.3)),eA=.1+.25*(1-E.outCubic(prog(t0+.1,t0+.5,T)));
 ctx.save();ctx.translate(x,y);ctx.scale(es,es);ctx.rotate(T*.08);
 for(const [rad,al,lw] of [[46,.22,.5],[40,.1,.3]]){ctx.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU+Math.PI/6;const px=Math.cos(a)*rad*K,py=Math.sin(a)*rad*K;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.strokeStyle=hexA(PAL.gold,al);ctx.lineWidth=Math.max(1,lw*K);ctx.stroke();}
 ctx.rotate(-T*.08);H.emoji(ctx,icon,0,0,56*K,{alpha:eA});ctx.restore();
 H.burst(ctx,T,t0,{x,y,count:30,seed,speed:K*75,life:.6,size:K*.9,shape:'line',colors:[PAL.hot,PAL.gold]});
}
function mdMark(ctx,x,y,h,color,lw){const w=h*1.7;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';
 H.rr(ctx,x-w/2,y-h/2,w,h,h*.18);ctx.stroke();ctx.beginPath();
 ctx.moveTo(x-w*.34,y+h*.24);ctx.lineTo(x-w*.34,y-h*.24);ctx.lineTo(x-w*.21,y-h*.02);ctx.lineTo(x-w*.08,y-h*.24);ctx.lineTo(x-w*.08,y+h*.24);
 ctx.moveTo(x+w*.22,y-h*.24);ctx.lineTo(x+w*.22,y+h*.22);ctx.moveTo(x+w*.1,y+h*.04);ctx.lineTo(x+w*.22,y+h*.24);ctx.lineTo(x+w*.34,y+h*.04);ctx.stroke();ctx.restore();}
function clover(ctx,x,y,r,color){ctx.save();ctx.fillStyle=color;for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;ctx.beginPath();ctx.arc(x+Math.cos(a)*r*.42,y+Math.sin(a)*r*.42,r*.38,0,TAU);ctx.fill();}
 ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,r*.16);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+r*.2,y+r*.7,x+r*.55,y+r*1.0);ctx.stroke();ctx.restore();}
function seal(ctx,x,y,r){ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<=56;i++){const a=i/56*TAU,rr=r*(1+.07*Math.sin(a*14));i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(rr,0);}ctx.closePath();
 const g=ctx.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r*1.1);g.addColorStop(0,PAL.hot);g.addColorStop(.55,PAL.gold);g.addColorStop(1,'#9c7124');ctx.fillStyle=g;ctx.fill();
 ctx.lineWidth=Math.max(1,r*.07);ctx.strokeStyle='rgba(122,86,24,.8)';ctx.beginPath();ctx.arc(0,0,r*.72,0,TAU);ctx.stroke();clover(ctx,0,-r*.08,r*.42,'#7a5618');ctx.restore();}
function lidShape(ctx,w,S){const lg=ctx.createLinearGradient(-w*.42,0,w*.42,0);lg.addColorStop(0,'#8a6420');lg.addColorStop(.35,PAL.hot);lg.addColorStop(.7,PAL.gold);lg.addColorStop(1,'#7a5618');
 ctx.fillStyle=lg;H.rr(ctx,-w*.43,-S*.07,w*.86,S*.14,S*.035);ctx.fill();ctx.strokeStyle='rgba(90,62,14,.55)';ctx.lineWidth=Math.max(1,S*.008);for(let i=1;i<8;i++){const xx=-w*.43+w*.86*i/8;ctx.beginPath();ctx.moveTo(xx,-S*.05);ctx.lineTo(xx,S*.05);ctx.stroke();}}
const BW=[.5,.92,.78,.88];
// The sealed L1 jar. o: fill, lid (0..1), rot (pour tilt), sx (flip), sq (squash), labelGlow, rewrite (0..1), wave
function jarS(ctx,x,y,S,T,o){
 const w=S*.62,bx=-w/2,by=-S*.4,bw=w,bh=S*.86,br=S*.14;
 ctx.save();ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);ctx.translate(0,S*.46);if(o.sq)ctx.scale(1+o.sq,1-o.sq);ctx.translate(0,-S*.46);
 H.rr(ctx,bx,by,bw,bh,br);ctx.fillStyle='rgba(244,236,216,.07)';ctx.fill();
 const f=clamp(o.fill??.85),amp=S*.014;
 if(f>0){ctx.save();H.rr(ctx,bx,by,bw,bh,br);ctx.clip();const sy=by+bh-bh*.96*f;
  const lg=ctx.createLinearGradient(0,sy,0,by+bh);lg.addColorStop(0,PAL.hot);lg.addColorStop(.25,'#f0b44c');lg.addColorStop(1,'#a8571a');ctx.fillStyle=lg;
  ctx.beginPath();ctx.moveTo(bx-2,by+bh+2);for(let i=0;i<=10;i++){const xx=bx+bw*i/10;ctx.lineTo(xx,sy+Math.sin(i*.9+T*6)*amp);}ctx.lineTo(bx+bw+2,by+bh+2);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,246,214,.5)';for(let i=0;i<5;i++){const ph=((T*.55+i*.37)%1),bxx=bx+bw*(.2+((i*.53)%1)*.6),byy=by+bh-(by+bh-sy)*ph;if(byy>sy+S*.02){ctx.beginPath();ctx.arc(bxx,byy,S*(.01+.006*(i%3)),0,TAU);ctx.fill();}}
  ctx.restore();}
 H.rr(ctx,bx,by,bw,bh,br);ctx.lineWidth=Math.max(1.5,S*.02);ctx.strokeStyle='rgba(255,255,255,.62)';ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.2)';H.rr(ctx,bx+bw*.1,by+bh*.12,bw*.07,bh*.58,bw*.035);ctx.fill();
 H.rr(ctx,-w*.38,-S*.47,w*.76,S*.08,S*.03);ctx.fillStyle='rgba(244,236,216,.16)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1,S*.012);ctx.stroke();
 const lid=o.lid||0;if(lid>0){ctx.save();ctx.translate(0,-S*.53);ctx.scale(lid,lid);lidShape(ctx,w,S);ctx.restore();}
 // label
 const lw=w*.76,lh=S*.28,lx=-lw/2,ly=S*.12-lh/2,lgk=o.labelGlow||0;
 if(lgk>0)H.glow(ctx,0,S*.12,lw*1.1,PAL.hot,.55*lgk);
 H.card(ctx,lx,ly,lw,lh,{fill:PAL.cream,r:S*.025,stroke:lgk>0?hexA(PAL.hot,lgk):null,lw:Math.max(1,S*.012)});ctx.fillStyle=PAL.gold;ctx.fillRect(lx+lh*.1,ly,lw-lh*.2,Math.max(1,lh*.035));
 mdMark(ctx,lx+lh*.33,ly+lh*.24,lh*.17,PAL.deep,Math.max(1,lh*.03));
 const rw=o.rewrite||0;
 for(let i=0;i<4;i++){let wf=BW[i]*(i===0?.7:.62),col=i===0?PAL.gold:hexA(PAL.deep,.42);
  const yy=ly+lh*(.46+i*.12),bh2=lh*.05,x0=lx+lh*.12,full=lw-lh*.24;
  if(i===2&&rw>0){if(rw<.4)wf*=1-E.inCubic(rw/.4);else{const q=E.outCubic((rw-.4)/.6);wf=.74*q;col=PAL.gold;if(q<1){ctx.fillStyle=PAL.leaf;ctx.fillRect(x0+full*wf+lh*.02,yy-bh2*.5,Math.max(1,lh*.02),bh2*2);}}}
  if(wf>0){ctx.fillStyle=col;H.rr(ctx,x0,yy,full*wf,bh2,bh2/2);ctx.fill();}}
 seal(ctx,lx+lw*.8,ly+lh*.72,S*.085);
 ctx.restore();
}
// Polished spoon: bowl centre at (x,y), handle along `ang`, length L.
function spoon(ctx,x,y,ang,L,o={}){
 ctx.save();ctx.translate(x,y);ctx.rotate(ang);
 const br=L*.17,bry=L*.12;
 const hg=ctx.createLinearGradient(0,-L*.05,0,L*.05);hg.addColorStop(0,'#fffaf0');hg.addColorStop(.45,PAL.cream);hg.addColorStop(1,'#b9a985');
 ctx.fillStyle=hg;ctx.beginPath();ctx.moveTo(br*.7,-L*.017);ctx.quadraticCurveTo(L*.5,-L*.02,L*.8,-L*.045);ctx.quadraticCurveTo(L*1.02,-L*.055,L,0);ctx.quadraticCurveTo(L*1.02,L*.055,L*.8,L*.045);ctx.quadraticCurveTo(L*.5,L*.02,br*.7,L*.017);ctx.closePath();ctx.fill();
 ctx.strokeStyle=hexA(PAL.gold,.75);ctx.lineWidth=Math.max(1,L*.009);ctx.stroke();
 ctx.fillStyle=PAL.gold;ctx.fillRect(L*.3,-L*.022,L*.03,L*.044);
 const bg=ctx.createRadialGradient(-br*.35,-bry*.45,br*.05,0,0,br*1.1);bg.addColorStop(0,'#fff3c4');bg.addColorStop(.35,PAL.hot);bg.addColorStop(.72,PAL.gold);bg.addColorStop(1,'#8a6420');
 ctx.fillStyle=bg;ctx.beginPath();ctx.ellipse(0,0,br,bry,0,0,TAU);ctx.fill();
 ctx.fillStyle='rgba(122,86,24,.32)';ctx.beginPath();ctx.ellipse(-br*.06,bry*.1,br*.72,bry*.62,0,0,TAU);ctx.fill();
 if(o.sauce>0){ctx.fillStyle=hexA('#f0b44c',clamp(o.sauce));ctx.beginPath();ctx.ellipse(-br*.06,bry*.1,br*.62*o.sauce,bry*.5*o.sauce,0,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,246,214,.8)';ctx.beginPath();ctx.arc(-br*.25,-bry*.05,br*.08,0,TAU);ctx.fill();}
 ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=Math.max(1,L*.014);ctx.lineCap='round';ctx.beginPath();ctx.ellipse(-br*.05,0,br*.78,bry*.72,0,Math.PI*1.08,Math.PI*1.55);ctx.stroke();
 if(o.glow>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=o.glow;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,L*.03);ctx.beginPath();ctx.moveTo(br*.6,0);ctx.lineTo(L*.98,0);ctx.stroke();ctx.restore();}
 ctx.restore();
}

/* ── the picture: sun, two hills, a little figure and a clover ── */
function hillY(xx,w,h,base,amp,freq,phase){return h*base+Math.sin(xx/w*freq*Math.PI+phase)*h*amp;}
function hill(ctx,w,h,base,amp,freq,phase,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,h+2);for(let i=0;i<=14;i++){const xx=w*i/14;ctx.lineTo(xx,hillY(xx,w,h,base,amp,freq,phase));}ctx.lineTo(w,h+2);ctx.closePath();ctx.fill();}
function figure(ctx,x,gy,fs,color,flip,swing){
 ctx.save();ctx.translate(x,gy-fs*.5);if(flip)ctx.rotate(Math.PI*flip);ctx.translate(0,fs*.5);
 ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(1,fs*.13);
 ctx.beginPath();ctx.moveTo(-Math.sin(swing)*fs*.2,0);ctx.lineTo(0,-fs*.4);ctx.lineTo(Math.sin(swing)*fs*.2,0);
 ctx.moveTo(0,-fs*.4);ctx.lineTo(0,-fs*.72);
 ctx.moveTo(-fs*.2+Math.sin(swing)*fs*.06,-fs*.44);ctx.lineTo(0,-fs*.66);ctx.lineTo(fs*.2-Math.sin(swing)*fs*.06,-fs*.44);ctx.stroke();
 ctx.beginPath();ctx.arc(0,-fs*.88,fs*.13,0,TAU);ctx.fill();
 ctx.restore();
}
// k: 0 = OFF palette, 1 = brand palette. flip: figure upside-down amount. ph: parallax time. walk: legs move.
function paintPic(ctx,x,y,w,h,o){
 const k=o.k??1,ph=o.ph||0,m=Math.min(w,h);
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x,y);
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,mix('#3a3346',PAL.green,k));sky.addColorStop(.45,mix('#56495f','#1d4a33',k));sky.addColorStop(.72,mix('#7d7190','#d9b86a',k));sky.addColorStop(1,mix('#4a4258','#2f7a4f',k));
 ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const sx=w*(.7+.05*Math.sin(ph*.9)),sy=h*(.33-.03*Math.sin(ph*.7)),sr=m*.13;
 if(k>0){H.glow(ctx,sx,sy,sr*3.4,PAL.hot,.5*k);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.18*k;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1,m*.012);ctx.beginPath();ctx.arc(sx,sy,sr*1.5,0,TAU);ctx.stroke();ctx.restore();}
 ctx.fillStyle=mix('#a397b0',PAL.hot,k);ctx.beginPath();ctx.arc(sx,sy,sr,0,TAU);ctx.fill();
 hill(ctx,w,h,.64,.07,1.9,ph*.35+.4,mix('#5a506b','#2f7a4f',k));
 const nb=.78,na=.07,nf=1.3,np=ph*1.0+1.3;
 hill(ctx,w,h,nb,na,nf,np,mix('#463e55',PAL.leaf,k));
 if(k>0){ctx.save();ctx.globalAlpha=.75*k;ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1,m*.012);ctx.beginPath();for(let i=0;i<=14;i++){const xx=w*i/14;const yy=hillY(xx,w,h,nb,na,nf,np);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();ctx.restore();}
 // clover rides the near hill
 const cxr=(((.2-ph*.24)%1.3)+1.3)%1.3-.15,cx=cxr*w,cs=m*.08;
 clover(ctx,cx,hillY(cx,w,h,nb,na,nf,np)-cs*.75,cs,mix('#8a7f9c',PAL.gold,k));
 const fx=w*.46,gy=hillY(fx,w,h,nb,na,nf,np),fs=m*.24;
 const swing=o.walk?Math.sin(ph*9)*.9:.35,bob=o.walk?Math.abs(Math.sin(ph*9))*fs*.05:0;
 figure(ctx,fx,gy-bob+fs*.02,fs,mix('#cfc6d8',PAL.cream,k),o.flip||0,swing);
 ctx.restore();
}
let pcv=null;
function pixPic(ctx,x,y,w,h,px,o){
 if(px<=1.05){paintPic(ctx,x,y,w,h,o);return;}
 const sw=Math.max(2,Math.ceil(w/px)),sh=Math.max(2,Math.ceil(h/px));
 if(!pcv)pcv=document.createElement('canvas');
 if(pcv.width<sw||pcv.height<sh){pcv.width=Math.max(sw,pcv.width);pcv.height=Math.max(sh,pcv.height);}
 const g=pcv.getContext('2d');g.save();g.clearRect(0,0,pcv.width,pcv.height);g.scale(sw/w,sh/h);paintPic(g,0,0,w,h,o);g.restore();
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(pcv,0,0,sw,sh,x,y,w,h);ctx.restore();
}
function crossRing(ctx,x,y,r,a){if(a<=0||r<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle='rgba(20,14,18,.78)';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
 ctx.strokeStyle=CORAL;ctx.lineWidth=Math.max(1.5,r*.14);ctx.stroke();ctx.lineCap='round';ctx.lineWidth=Math.max(1.5,r*.16);ctx.beginPath();ctx.moveTo(x-r*.36,y-r*.36);ctx.lineTo(x+r*.36,y+r*.36);ctx.moveTo(x+r*.36,y-r*.36);ctx.lineTo(x-r*.36,y+r*.36);ctx.stroke();ctx.restore();}
function checkMark(ctx,x,y,r,k,a=1){if(k<=0||a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle=PAL.deep;ctx.beginPath();ctx.arc(x,y,r*E.outBack(clamp(k*2.5)),0,TAU);ctx.fill();
 ctx.strokeStyle=PAL.mint;ctx.lineWidth=Math.max(1.5,r*.14);ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+TAU*E.outCubic(clamp(k*1.6)));ctx.stroke();
 const p1={x:x-r*.42,y:y+r*.02},p2={x:x-r*.12,y:y+r*.32},p3={x:x+r*.45,y:y-r*.32};const q=clamp((k-.25)/.75),l1=Math.hypot(p2.x-p1.x,p2.y-p1.y),l2=Math.hypot(p3.x-p2.x,p3.y-p2.y),d=q*(l1+l2);
 if(q>0){ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,r*.2);ctx.beginPath();ctx.moveTo(p1.x,p1.y);if(d<=l1)ctx.lineTo(lerp(p1.x,p2.x,d/l1),lerp(p1.y,p2.y,d/l1));else{ctx.lineTo(p2.x,p2.y);const e=(d-l1)/l2;ctx.lineTo(lerp(p2.x,p3.x,e),lerp(p2.y,p3.y,e));}ctx.stroke();}
 ctx.restore();}
function lootFlight(ctx,s,K,T,x0,y0,slotI,icon,t0,t1,seed){
 if(T<t0||T>t1+.45)return;const slot=TR.hudRect(s,slotI);
 const cx=lerp(x0,slot.x,.15)-6*K,cy=lerp(y0,slot.y,.8);
 const at=k=>({x:bez(x0,cx,slot.x,k),y:bez(y0,cy,slot.y,k)});
 if(T<t1){const k=E.inOutCubic(prog(t0,t1,T));
  ctx.save();ctx.globalCompositeOperation='lighter';for(let j=1;j<=8;j++){const kk=Math.max(0,k-j*.035),p=at(kk);ctx.globalAlpha=(1-j/9)*.7;ctx.fillStyle=j%2?PAL.hot:PAL.gold;ctx.beginPath();ctx.arc(p.x,p.y,K*(1.1-j*.1),0,TAU);ctx.fill();}ctx.restore();
  const p=at(k),r=lerp(K*9,slot.size*.34,k);H.glow(ctx,p.x,p.y,r*2.6,PAL.hot,.5);coin(ctx,p.x,p.y,r,icon,1,{discA:1-k*.7,rot:(1-k)*.8});
 }else H.burst(ctx,T,t1,{x:slot.x,y:slot.y,count:26,seed,speed:s.u*22,life:.45,size:s.u*.4,colors:[PAL.hot,PAL.cream]});
}
function glamour(ctx,x,y,rx,ry,K,T,k,n){if(k<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<n;i++){const a=i/n*TAU+T*1.3,rr=1+.08*Math.sin(T*3+i);const px=x+Math.cos(a)*rx*rr,py=y+Math.sin(a)*ry*rr;const tw=.5+.5*Math.sin(T*7+i*2.1);ctx.globalAlpha=k*tw*.85;ctx.fillStyle=i%2?PAL.hot:PAL.cream;ctx.beginPath();ctx.arc(px,py,K*(.35+.35*tw),0,TAU);ctx.fill();}ctx.restore();}
function drawWorld(ctx,s,ox,oy,a,shake,fn){ctx.save();ctx.globalAlpha=a;ctx.translate(ox,oy);if(shake>0)H.shake(ctx,s,shake);fn();ctx.restore();}

/* ═════════════ s05_taste ═════════════ */
function g05(s){
 const P=s.portrait,K=baseK(s);
 const hx=P?s.cx:s.w*.3,hy=s.h*(P?.36:.52);
 let fw=P?s.w*.70:s.w*.32;fw=Math.min(fw,s.h*(P?.32:.46)/.75);const fh=fw*.75;
 const fx=P?s.cx:s.w*.34,fy=s.h*(P?.30:.42);
 const S=(P?24:24)*K,jx=P?s.w*.24:s.w*.105,jy=s.h*(P?.54:.765),mouthY=jy-S*.47,Ls=(P?36:36)*K;
 const D={x:fx-fw*.1,y:fy-fh*.04};
 const bx=jx+S*.02,by=mouthY+S*.12;const tx=P?fx-fw*.04:fx-fw*.3,ty=P?fy+fh*.4:fy+fh*.28;
 return{P,K,hx,hy,fw,fh,fx,fy,S,jx,jy,mouthY,Ls,D,bridge:{x:bx,y:by,a:Math.atan2(ty-by,tx-bx)}};
}
function spoonPose(G,T){
 const {K,jx,mouthY,D}=G;const aDip=-1.0,aHov=aDip-.44;
 const hov={x:jx+3*K,y:mouthY-15*K,a:aHov},dip={x:jx+K,y:mouthY+4*K,a:aDip},car={x:D.x-2*K,y:D.y-16*K,a:-.22},bri=G.bridge;
 let p,inJar=false,sauce=0;
 if(T<14.45){p={x:hov.x,y:hov.y+Math.sin(T*5)*K*.6,a:hov.a+Math.sin(T*3)*.04};}
 else if(T<14.72){const k=E.inOutCubic(prog(14.45,14.72,T));p={x:lerp(hov.x,dip.x,k),y:lerp(hov.y,dip.y,k),a:lerp(hov.a,dip.a,k)};inJar=k>.45;sauce=k>.8?1:0;}
 else if(T<14.88){const k=E.outCubic(prog(14.72,14.88,T));const cx=lerp(dip.x,car.x,.25),cy=Math.min(dip.y,car.y)-12*K;p={x:bez(dip.x,cx,car.x,k),y:bez(dip.y,cy,car.y,k),a:lerp(dip.a,car.a,k)};inJar=k<.12;sauce=1;}
 else if(T<15.05){const k=E.inOutSine(prog(14.88,14.98,T));p={x:car.x,y:car.y,a:car.a+.32*k};sauce=1-k;}
 else if(T<15.4){const k=E.inOutCubic(prog(15.05,15.4,T));const fa=car.a+.32;const cx=lerp(car.x,bri.x,.5)+4*K,cy=Math.min(car.y,bri.y)-6*K;p={x:bez(car.x,cx,bri.x,k),y:bez(car.y,cy,bri.y,k),a:lerp(fa,bri.a,k)};inJar=k>.72;}
 else{p={x:bri.x,y:bri.y,a:bri.a};inJar=true;const w=T-15.5;if(w>0)p.a+=Math.sin(w*13)*.11*Math.exp(-w*4.5);p.a+=Math.sin(T*2.2)*.012;}
 p.inJar=inJar;p.sauce=sauce;return p;
}
const tipOf=(p,L)=>({x:p.x+Math.cos(p.a)*L,y:p.y+Math.sin(p.a)*L});
function drawSpoon5(ctx,G,T,p){
 const L=G.Ls,m=tipOf(p,L*.5);const fk=prog(16.62,16.95,T),sx=fk>0&&fk<1?Math.cos(E.inOutCubic(fk)*TAU):1;
 const pk=prog(16.0,16.3,T),gl=pk>0&&pk<1?Math.sin(pk*Math.PI):0;
 ctx.save();ctx.translate(m.x,m.y);ctx.scale(sx,1);ctx.translate(-m.x,-m.y);spoon(ctx,p.x,p.y,p.a,L,{sauce:p.sauce,glow:gl*.8});ctx.restore();
}
function frame5(ctx,s,G,T){
 const {fx,fy,fw,fh,K}=G;
 const pop=E.outBack(prog(14.06,14.36,T));if(pop<=0)return;
 const punch=T>=16.5?.045*Math.exp(-(T-16.5)*9)*Math.cos((T-16.5)*26):0;
 ctx.save();ctx.translate(fx,fy);ctx.scale(pop*(1+punch),pop*(1+punch));ctx.rotate((1-pop)*.1-.012);
 H.card(ctx,-fw/2,-fh/2,fw,fh,{fill:PAL.cream,r:K*1.1,shadow:'rgba(0,0,0,.5)',blur:K*7,offY:K*2.2,stroke:PAL.gold,lw:Math.max(1.5,K*.55)});
 const m=fw*.045,ix=-fw/2+m,iy=-fh/2+m,iw=fw-2*m,ih=fh-2*m;
 ctx.fillStyle='#e9dfc6';ctx.fillRect(ix,iy,iw,ih);
 ctx.strokeStyle='rgba(122,86,24,.35)';ctx.lineWidth=1;ctx.strokeRect(ix+.5,iy+.5,iw-1,ih-1);
 if(T>=15){
  const dx=G.D.x-fx,dy=G.D.y-fy,R=E.outCubic(prog(15,15.4,T))*Math.hypot(iw,ih);
  const snap=prog(16.5,16.65,T),px=lerp(8,1,E.outCubic(snap)),k=snap,flip=1-E.outBack(prog(16.5,16.78,T));
  const jit=T>=15.45&&T<16.5&&!s.reduced?1:0,f=Math.floor(T*14);
  ctx.save();ctx.beginPath();ctx.rect(ix,iy,iw,ih);ctx.clip();
  if(R<Math.hypot(iw,ih)){ctx.beginPath();ctx.arc(dx,dy,R,0,TAU);ctx.clip();}
  if(jit)ctx.translate((hash(f)-.5)*6,(hash(f+50)-.5)*6);
  pixPic(ctx,ix-4,iy-4,iw+8,ih+8,px,{k,flip,ph:T>=16.5?(T-16.5)*.35:0});
  ctx.restore();
  // OFF tint wash + scanline flicker
  if(T<16.5){ctx.save();ctx.globalAlpha=.16*E.outCubic(prog(15.2,15.5,T));ctx.fillStyle='#2a2333';ctx.fillRect(ix,iy,iw,ih);ctx.restore();}
  // paint-in rim
  if(R>0&&R<Math.hypot(iw,ih)){ctx.save();ctx.beginPath();ctx.rect(ix,iy,iw,ih);ctx.clip();ctx.strokeStyle=hexA(PAL.hot,.8);ctx.lineWidth=Math.max(1.5,K*.5);ctx.beginPath();ctx.arc(dx,dy,R,0,TAU);ctx.stroke();ctx.restore();}
 }
 // coral ✗ ring at the top-right corner (pulses once at 15.5), turns into the mint ✓ at 16.5
 const cxr=fw/2-K*1.2,cyr=-fh/2+K*1.2,rr0=5.2*K;
 const xa=Math.min(prog(15.5,15.56,T),1-prog(16.42,16.54,T)),xs=E.outBack(prog(15.5,15.78,T))*(1-.6*prog(16.42,16.54,T));
 if(xa>0){crossRing(ctx,cxr,cyr,rr0*xs,xa);const pk=prog(15.5,15.95,T);if(pk>0&&pk<1){ctx.save();ctx.globalAlpha=(1-pk)*.8;ctx.strokeStyle=CORAL;ctx.lineWidth=Math.max(1,K*.4);ctx.beginPath();ctx.arc(cxr,cyr,rr0*(1+pk*1.2),0,TAU);ctx.stroke();ctx.restore();}}
 checkMark(ctx,cxr,cyr,rr0,prog(16.5,16.75,T));
 ctx.restore();
}
function world05(ctx,s,G,T){
 const K=G.K,{fx,fy,fw,fh}=G;
 H.glow(ctx,G.hx,G.hy,48*K,'#1f5a3a',.85);
 // spotlight on the frame
 ctx.save();ctx.globalCompositeOperation='lighter';const sg=ctx.createLinearGradient(0,fy-fh,0,fy+fh*.7);sg.addColorStop(0,'rgba(246,220,154,0)');sg.addColorStop(1,'rgba(246,220,154,.07)');ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(fx-fw*.12,fy-fh*1.2);ctx.lineTo(fx+fw*.12,fy-fh*1.2);ctx.lineTo(fx+fw*.7,fy+fh*.75);ctx.lineTo(fx-fw*.7,fy+fh*.75);ctx.closePath();ctx.fill();ctx.restore();
 emblem(ctx,s,G.hx,G.hy,K,ICON2,T,14,2004);
 // plinth under the jar
 const py=G.jy+G.S*.46;ctx.save();ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(G.jx,py+K*.6,G.S*.48,G.S*.08,0,0,TAU);ctx.fill();
 const pg=ctx.createLinearGradient(G.jx-G.S*.45,0,G.jx+G.S*.45,0);pg.addColorStop(0,'#0d2c1d');pg.addColorStop(.5,'#1f5a3a');pg.addColorStop(1,'#0d2c1d');ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(G.jx,py,G.S*.44,G.S*.07,0,0,TAU);ctx.fill();ctx.strokeStyle=hexA(PAL.gold,.6);ctx.lineWidth=Math.max(1,.35*K);ctx.stroke();ctx.restore();
 // snap: local light hit behind the frame + rays
 const hk=T>=16.5?Math.exp(-(T-16.5)*5):0;
 if(hk>.01){H.rays(ctx,fx,fy,fw*.75,14,T*.5,PAL.hot,.35*hk);H.glow(ctx,fx,fy,fw*.62,PAL.hot,.45*hk);}
 H.glow(ctx,fx,fy,fw*.75,PAL.gold,.08+.1*prog(16.5,16.8,T));
 frame5(ctx,s,G,T);
 // jar + spoon (spoon behind the glass while it is in the jar)
 const p=spoonPose(G,T);
 const lidOff=prog(14.26,14.75,T),lg=Math.min(prog(16.18,16.3,T),1-prog(16.55,16.9,T));
 const sq=T>=14.3&&T<14.6?.06*Math.exp(-(T-14.3)*8)*Math.sin((T-14.3)*30):0;
 const jarOpts={fill:.85-.06*prog(14.6,14.75,T),lid:T<14.26?1:0,sq,labelGlow:lg,rewrite:prog(16.12,16.46,T)};
 H.glow(ctx,G.jx,G.jy,G.S*.75,PAL.gold,.18+.3*lg);
 if(p.inJar){drawSpoon5(ctx,G,T,p);jarS(ctx,G.jx,G.jy,G.S,T,jarOpts);}else{jarS(ctx,G.jx,G.jy,G.S,T,jarOpts);drawSpoon5(ctx,G,T,p);}
 // lid pops off and tumbles away
 if(lidOff>0&&lidOff<1){const w=G.S*.62;ctx.save();ctx.globalAlpha=1-prog(.6,1,lidOff);ctx.translate(G.jx-lidOff*18*K,G.jy-G.S*.53-Math.sin(lidOff*Math.PI*.8)*20*K+lidOff*lidOff*10*K);ctx.rotate(-lidOff*5);lidShape(ctx,w,G.S);ctx.restore();H.burst(ctx,T,14.26,{x:G.jx,y:G.mouthY,count:16,seed:2010,speed:K*40,life:.45,size:K*.6,colors:[PAL.hot,PAL.cream]});}
 // the drop
 if(T>=14.86&&T<15.0){const k=prog(14.88,15.0,T),st=tipOf({x:G.D.x-2*K,y:G.D.y-16*K,a:Math.PI*.95},G.Ls*.12);const x=lerp(st.x,G.D.x,k),y=lerp(st.y,G.D.y,k*k);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=hexA(PAL.hot,.55);ctx.lineWidth=K*.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-K*4*k);ctx.lineTo(x,y);ctx.stroke();ctx.restore();
  H.glow(ctx,x,y,K*5,PAL.hot,.7);ctx.save();ctx.translate(x,y);ctx.fillStyle='#f0b44c';ctx.beginPath();ctx.moveTo(0,-K*2.4);ctx.quadraticCurveTo(K*1.3,-K*.2,0,K*1.1);ctx.quadraticCurveTo(-K*1.3,-K*.2,0,-K*2.4);ctx.fill();ctx.fillStyle='rgba(255,250,230,.9)';ctx.beginPath();ctx.arc(-K*.35,-K*.1,K*.3,0,TAU);ctx.fill();ctx.restore();}
 H.burst(ctx,T,15,{x:G.D.x,y:G.D.y,count:14,seed:2015,speed:K*35,life:.45,size:K*.55,gravity:K*60,colors:[PAL.hot,'#f0b44c']});
 if(T>=15&&T<15.45){const k=prog(15,15.45,T);ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1,K*.4);ctx.beginPath();ctx.ellipse(G.D.x,G.D.y,K*12*E.outCubic(k),K*12*E.outCubic(k),0,0,TAU);ctx.stroke();ctx.restore();}
 // the fix: gold pulse frame → spoon tip → bowl → jar label
 const pk=prog(16.0,16.28,T);
 if(pk>0&&pk<1){const tip=tipOf(p,G.Ls),pts=[{x:fx-fw*.05,y:fy+fh*.05},tip,{x:p.x,y:p.y},{x:G.jx,y:G.jy+G.S*.12}];
  const seg=[];let tot=0;for(let i=0;i<3;i++){const l=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);seg.push(l);tot+=l;}
  const at=q=>{let d=clamp(q)*tot;for(let i=0;i<3;i++){if(d<=seg[i]||i===2){const e=seg[i]?clamp(d/seg[i]):1;return{x:lerp(pts[i].x,pts[i+1].x,e),y:lerp(pts[i].y,pts[i+1].y,e)};}d-=seg[i];}};
  ctx.save();ctx.globalCompositeOperation='lighter';for(let j=0;j<10;j++){const q=E.inOutSine(pk)-j*.025;if(q<0)break;const pp=at(q);ctx.globalAlpha=(1-j/10)*.85;ctx.fillStyle=j%2?PAL.hot:'#fff6da';ctx.beginPath();ctx.arc(pp.x,pp.y,K*(1.3-j*.09),0,TAU);ctx.fill();}ctx.restore();
  const hp=at(E.inOutSine(pk));H.glow(ctx,hp.x,hp.y,K*7,PAL.hot,.8);}
 // snap sparkles
 H.burst(ctx,T,16.5,{x:fx,y:fy,count:30,seed:2050,speed:K*70,life:.7,size:K*.8,colors:[PAL.hot,PAL.cream,PAL.gold]});
 // loot: the spoon card-flips with local rays
 const rk=Math.min(E.outCubic(prog(16.6,16.8,T)),1-prog(17.1,17.5,T));if(rk>0){const m=tipOf(p,G.Ls*.5);H.rays(ctx,m.x,m.y,24*K,12,T*.9,PAL.hot,.4*rk);H.glow(ctx,m.x,m.y,16*K,PAL.hot,.3*rk);}
 glamour(ctx,fx,fy,fw*.62,fh*.66,K,T,prog(16.95,17.2,T),16);
 H.dust(ctx,s,{count:28,seed:1501,alpha:.4,size:s.u*.26,speed:s.u*1.6});
}
TR.defineScene({id:'s05_taste',start:14,end:18,draw(ctx,s){
 const T=s.T,t=s.t,G=g05(s);
 ctx.fillStyle=PAL.void;ctx.fillRect(0,0,s.w,s.h);
 ctx.fillStyle=H.radial(ctx,G.hx,G.hy,Math.max(s.w,s.h)*.8,'#103723',PAL.void);ctx.fillRect(0,0,s.w,s.h);
 const kin=1-E.outExpo(clamp(t/.25)),kout=E.inCubic(prog(17.5,18,T));
 const ox=red(s,s.w*.3)*kin-red(s,s.w*.85)*kout,oy=0;
 bokeh(ctx,s,ox,1505,false);
 const sh=(t<.3?.6*(1-t/.3):0)+(T>=16.5&&T<16.62?.35*(1-(T-16.5)/.12):0);
 if(kin>.15&&!s.reduced)drawWorld(ctx,s,ox+s.w*.06*kin,oy,.28,0,()=>world05(ctx,s,G,T));
 if(kout>.08&&!s.reduced)drawWorld(ctx,s,ox+s.w*.09*kout,oy,.3*kout,0,()=>world05(ctx,s,G,T));
 drawWorld(ctx,s,ox,oy,1,sh,()=>world05(ctx,s,G,T));
 H.vignette(ctx,s,.5);
 whipLines(ctx,s,kin*1.3,1510,{count:24});
 whipLines(ctx,s,kout*1.3,1520,{count:24});
 const p=spoonPose(G,T),m=tipOf(p,G.Ls*.5);
 lootFlight(ctx,s,G.K,T,m.x+ox,m.y+oy,1,ICON2,16.72,17,1717);
 // TEXT layer (never shakes)
 H.caption(ctx,s,{text:'รู้ทันที AI เข้าใจไหม',sub:'บท 2 · ช้อนชิมภาพ ไม่ตรงแก้ที่ซอส',in:14.15,out:17.9,accent:'รู้ทันที',layout:'column',chip:ICON2});
}});

/* ═════════════ s06_cook ═════════════ */
function g06(s){
 const P=s.portrait,K=baseK(s);
 const hx=P?s.cx:s.w*.3,hy=s.h*(P?.36:.52);
 const wx=P?s.cx:s.w*.30,wy=s.h*(P?.505:.70),wr=P?Math.min(s.w*.31,s.h*.18):36*K;
 const pw=P?Math.min(s.w*.32,s.h*.18):s.w*.155,ph=pw*16/9,px=P?s.cx:s.w*.30,py=s.h*(P?.28:.405);
 const cw=pw*1.12,ch=cw*.75;
 const cam=P?{x:s.w*.83,y:s.h*.2}:{x:px+pw/2+13*K,y:py-ph*.16};
 const jar=P?{x:s.w*.8,y:s.h*.37}:{x:s.w*.5,y:s.h*.43};
 return{P,K,hx,hy,wx,wy,wr,ry:wr*.27,pw,ph,px,py,cw,ch,cam,jar,S:(P?22:20)*K};
}
function flames(ctx,G,T,amp){
 const {wx,wy,wr}=G,base=wy+wr*.66,n=11;
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<n;i++){const u=i/(n-1)-.5,x0=wx+u*wr*1.25;
  const hg=wr*(.5+.16*Math.sin(T*6.3+i*1.7)+.09*Math.sin(T*9.7+i*.9))*amp*(1-Math.abs(u)*.75),w0=wr*(.11+.03*Math.sin(i*2.3)),sway=Math.sin(T*5+i)*wr*.05+u*wr*.25;
  const g=ctx.createLinearGradient(0,base,0,base-hg);g.addColorStop(0,hexA(PAL.ember,0));g.addColorStop(.12,hexA(PAL.ember,.8));g.addColorStop(.55,hexA(PAL.gold,.55));g.addColorStop(1,hexA(PAL.hot,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x0-w0,base);ctx.bezierCurveTo(x0-w0*1.1,base-hg*.45,x0+sway-w0*.3,base-hg*.75,x0+sway*1.4,base-hg);ctx.bezierCurveTo(x0+sway+w0*.3,base-hg*.7,x0+w0*1.1,base-hg*.4,x0+w0,base);ctx.fill();}
 ctx.restore();
 eglow(ctx,wx,base-wr*.1,wr*1.1,wr*.45,PAL.ember,.35*Math.min(1.6,amp));
}
function burner(ctx,G){const {wx,wy,wr,K}=G,base=wy+wr*.68;ctx.save();ctx.fillStyle='#0a0f0c';ctx.beginPath();ctx.ellipse(wx,base,wr*.62,wr*.09,0,0,TAU);ctx.fill();ctx.strokeStyle='rgba(226,194,122,.35)';ctx.lineWidth=Math.max(1,K*.35);ctx.stroke();
 ctx.strokeStyle='rgba(244,236,216,.12)';ctx.beginPath();ctx.ellipse(wx,base,wr*.4,wr*.055,0,0,TAU);ctx.stroke();ctx.restore();}
// Wok: o.lift, o.tilt, o.sx (flip), o.sauce (0..1), o.inPan(ctx) draws whatever lies in the pan
function wok(ctx,G,T,o){
 const {wr,ry,K}=G,dep=wr*.44,P=G.P;
 ctx.save();ctx.translate(G.wx,G.wy+(o.lift||0));ctx.rotate(o.tilt||0);if(o.sx!=null)ctx.scale(o.sx,1);
 // handle (bottom-left)
 const hl=P?1.18:1.42;ctx.save();ctx.lineCap='round';ctx.strokeStyle='#2a1d12';ctx.lineWidth=wr*.11;ctx.beginPath();ctx.moveTo(-wr*.92,ry*.4);ctx.lineTo(-wr*hl,dep*1.05);ctx.stroke();ctx.strokeStyle='#4a3420';ctx.lineWidth=wr*.05;ctx.beginPath();ctx.moveTo(-wr*.98,ry*.5);ctx.lineTo(-wr*hl+wr*.02,dep*1.02);ctx.stroke();
 ctx.strokeStyle=PAL.gold;ctx.lineWidth=wr*.12;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(-wr*.94,ry*.45);ctx.lineTo(-wr*1.02,ry*.75);ctx.stroke();ctx.restore();
 // helper loop handle (right)
 ctx.strokeStyle='#1d2420';ctx.lineWidth=Math.max(2,wr*.035);ctx.beginPath();ctx.ellipse(wr*1.02,ry*.25,wr*.08,wr*.05,0,-Math.PI*.6,Math.PI*.6);ctx.stroke();
 // body
 ctx.beginPath();ctx.moveTo(-wr,0);ctx.bezierCurveTo(-wr*.92,dep*1.25,wr*.92,dep*1.25,wr,0);ctx.ellipse(0,0,wr,ry,0,0,Math.PI,false);ctx.closePath();
 const bgr=ctx.createLinearGradient(0,0,0,dep);bgr.addColorStop(0,'#2a302c');bgr.addColorStop(.6,'#151a17');bgr.addColorStop(1,'#3a2416');ctx.fillStyle=bgr;ctx.fill();
 ctx.save();ctx.clip();ctx.globalCompositeOperation='lighter';eglow(ctx,0,dep*1.1,wr*.9,dep*.6,PAL.ember,.45);ctx.fillStyle='rgba(255,255,255,.06)';ctx.beginPath();ctx.ellipse(-wr*.45,dep*.35,wr*.25,dep*.12,-.2,0,TAU);ctx.fill();ctx.restore();
 // interior
 ctx.beginPath();ctx.ellipse(0,0,wr*.97,ry*.94,0,0,TAU);const ig=ctx.createRadialGradient(-wr*.2,-ry*.3,wr*.05,0,0,wr);ig.addColorStop(0,'#3b403b');ig.addColorStop(1,'#0c100e');ctx.fillStyle=ig;ctx.fill();
 ctx.save();ctx.clip();
 const sc=o.sauce||0;if(sc>0){const sg=ctx.createRadialGradient(-wr*.1,-ry*.05,wr*.02,0,ry*.1,wr*.6*sc);sg.addColorStop(0,PAL.hot);sg.addColorStop(.5,'#f0b44c');sg.addColorStop(1,'rgba(168,87,26,.0)');ctx.fillStyle=sg;ctx.beginPath();ctx.ellipse(0,ry*.12,wr*.62*sc,ry*.6*sc,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(255,246,214,.6)';for(let i=0;i<7;i++){const a=i*2.4+T*1.5,rr=(.15+.35*((i*.37)%1))*sc,bs=(.5+.5*Math.sin(T*9+i*3))*K*.45;if(bs>.2){ctx.beginPath();ctx.arc(Math.cos(a)*wr*rr,ry*.12+Math.sin(a)*ry*rr*.8,bs,0,TAU);ctx.fill();}}}
 if(o.inPan)o.inPan(ctx);
 ctx.restore();
 // rim
 ctx.beginPath();ctx.ellipse(0,0,wr,ry,0,0,TAU);ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1.5,wr*.028);ctx.stroke();
 ctx.strokeStyle='rgba(255,246,214,.55)';ctx.lineWidth=Math.max(1,wr*.01);ctx.beginPath();ctx.ellipse(0,0,wr,ry,0,Math.PI*.15,Math.PI*.55);ctx.stroke();
 ctx.restore();
}
// The image card that becomes the phone. m: 0 card → 1 phone.
function clipCard(ctx,x,y,w,h,m,T,o={}){
 const r=lerp(Math.min(w,h)*.06,w*.15,m),bd=lerp(Math.min(w,h)*.055,w*.05,m);
 ctx.save();ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);ctx.scale(o.sx||1,o.sy||1);
 H.card(ctx,-w/2,-h/2,w,h,{fill:mix(PAL.cream,'#0d1310',m),r,shadow:o.noShadow?null:'rgba(0,0,0,.5)',blur:w*.12,offY:w*.03,stroke:PAL.gold,lw:Math.max(1.5,w*.014)});
 const ix=-w/2+bd,iy=-h/2+bd,iw=w-2*bd,ih=h-2*bd;
 ctx.save();H.rr(ctx,ix,iy,iw,ih,Math.max(1,r-bd));ctx.clip();
 paintPic(ctx,ix,iy,iw,ih,{k:1,ph:o.ph||0,walk:o.walk});
 if(o.ui)o.ui(ctx,ix,iy,iw,ih);
 ctx.restore();
 if(m>.6){ctx.globalAlpha*=prog(.6,1,m);ctx.fillStyle='#0d1310';H.rr(ctx,-w*.14,-h/2+bd*.35,w*.28,bd*1.6,bd*.8);ctx.fill();}
 if(o.check>0)checkMark(ctx,w/2-bd*2.2,-h/2+bd*2.2,Math.min(w,h)*.09,1,o.check);
 ctx.restore();
}
// ▶ → ❚❚ morph (two quads)
const PLAY=[[[-.4,-.5],[.05,-.25],[.05,.25],[-.4,.5]],[[.05,-.25],[.5,0],[.5,0],[.05,.25]]],PAUSE=[[[-.4,-.45],[-.1,-.45],[-.1,.45],[-.4,.45]],[[.1,-.45],[.4,-.45],[.4,.45],[.1,.45]]];
function playPause(ctx,x,y,r,k,a){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.fillStyle='rgba(6,23,15,.55)';ctx.beginPath();ctx.arc(x,y,r*1.25,0,TAU);ctx.fill();ctx.strokeStyle=hexA(PAL.hot,.8);ctx.lineWidth=Math.max(1,r*.08);ctx.stroke();
 ctx.fillStyle=PAL.cream;for(let q=0;q<2;q++){ctx.beginPath();for(let i=0;i<4;i++){const vx=lerp(PLAY[q][i][0],PAUSE[q][i][0],k)*r+r*.06*(1-k),vy=lerp(PLAY[q][i][1],PAUSE[q][i][1],k)*r;i?ctx.lineTo(x+vx,y+vy):ctx.moveTo(x+vx,y+vy);}ctx.closePath();ctx.fill();}ctx.restore();}
function camIcon(ctx,x,y,sz,a,slash,T){
 if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);
 ctx.fillStyle='rgba(6,23,15,.6)';ctx.beginPath();ctx.arc(0,0,sz*.95,0,TAU);ctx.fill();
 ctx.globalAlpha*=1-.45*clamp(slash);
 ctx.strokeStyle=PAL.cream;ctx.lineWidth=Math.max(1.5,sz*.09);ctx.lineJoin='round';
 H.rr(ctx,-sz*.55,-sz*.3,sz*1.1,sz*.7,sz*.12);ctx.stroke();ctx.beginPath();ctx.moveTo(-sz*.22,-sz*.3);ctx.lineTo(-sz*.14,-sz*.45);ctx.lineTo(sz*.14,-sz*.45);ctx.lineTo(sz*.22,-sz*.3);ctx.stroke();
 ctx.beginPath();ctx.arc(0,sz*.05,sz*.2,0,TAU);ctx.stroke();ctx.fillStyle=PAL.cream;ctx.beginPath();ctx.arc(sz*.38,-sz*.17,sz*.05,0,TAU);ctx.fill();
 ctx.restore();
 if(slash>0){const q=E.outCubic(clamp(slash));ctx.save();ctx.translate(x,y);ctx.lineCap='round';ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(2,sz*.14);ctx.beginPath();ctx.moveTo(-sz*.72,-sz*.62);ctx.lineTo(lerp(-sz*.72,sz*.72,q),lerp(-sz*.62,sz*.62,q));ctx.stroke();ctx.restore();
  if(slash<1.4)H.glow(ctx,x+lerp(-sz*.72,sz*.72,q),y+lerp(-sz*.62,sz*.62,q),sz*.9,PAL.hot,.6*(1-clamp((slash-1)/.4)));}
}
// Film-sprocket streaks orbiting the phone. front: draw the half in front of the phone.
function sprockets(ctx,G,T,a,front){
 if(a<=0)return;const {px,py,pw,ph,K}=G,rx=pw*1.0,ry=pw*.32;
 ctx.save();ctx.translate(px,py+ph*.08);ctx.rotate(-.22);ctx.globalCompositeOperation='lighter';
 for(let st=0;st<2;st++){const th0=T*3.6+st*Math.PI;
  for(let j=0;j<16;j++){const th=th0-j*.075,sn=Math.sin(th);if(front!==(sn>0))continue;const x=Math.cos(th)*rx,y=sn*ry,al=a*(1-j/16)*(front?.9:.45);
   ctx.globalAlpha=al;ctx.fillStyle=j%2?PAL.hot:PAL.gold;ctx.save();ctx.translate(x,y);ctx.rotate(th+Math.PI/2);H.rr(ctx,-K*.55,-K*.38,K*1.1,K*.76,K*.2);ctx.fill();ctx.restore();}
  ctx.globalAlpha=a*(front?.5:.25);ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1,K*.25);ctx.beginPath();let started=false;for(let j=0;j<=20;j++){const th=th0-j*.06,sn=Math.sin(th);if(front!==(sn>0)){started=false;continue;}const x=Math.cos(th)*rx*1.06,y=sn*ry*1.06;started?ctx.lineTo(x,y):ctx.moveTo(x,y);started=true;}ctx.stroke();}
 ctx.restore();
}
function cardState(G,T){
 const {wx,wy,ry,K,px,py,pw,ph,cw,ch}=G;const pan={x:wx+K,y:wy+ry*.1},hov={x:wx+4*K,y:wy-G.wr*.95};
 let x,y,w=cw,h=ch,m=0,rot=0,sx=1,sy=1,inPan=false;
 if(T<18.42){x=hov.x;y=hov.y+Math.sin(T*4)*K*.8;rot=-.06+Math.sin(T*3)*.03;}
 else if(T<18.6){const k=E.inCubic(prog(18.42,18.6,T));x=lerp(hov.x,pan.x,k);y=lerp(hov.y,pan.y,k);sy=lerp(1,.36,k);rot=lerp(-.06,.04,k);inPan=k>.85;}
 else if(T<19){const d=T-18.6;x=pan.x;y=pan.y-Math.abs(Math.sin(d*16))*K*1.4*Math.exp(-d*4);sy=.36;rot=.04+Math.sin(d*20)*.03*Math.exp(-d*5);inPan=true;}
 else if(T<19.5){const k=prog(19,19.5,T),kk=E.inOutSine(k);const cx=lerp(pan.x,px,.5)+10*K,cy=py-G.ph*.42;x=bez(pan.x,cx,px,kk);y=bez(pan.y,cy,py,kk);rot=TAU*E.inOutCubic(k);m=E.inOutCubic(prog(19.05,19.42,T));w=lerp(cw,pw,m);h=lerp(ch,ph,m);sy=lerp(.36,1,E.outCubic(prog(19,19.18,T)));}
 else{const d=T-19.5;x=px;y=py+(d>.4?Math.sin((d-.4)*2.6)*K*.7:0);m=1;w=pw;h=ph;const q=d<.5?.15*Math.exp(-d*8)*Math.cos(d*28):0;sx=1+q;sy=1-q;}
 return{x,y,w,h,m,rot,sx,sy,inPan};
}
function phoneUI(T){return (ctx,ix,iy,iw,ih)=>{
 if(T<19.5)return;
 const k=prog(19.62,19.8,T),pulse=T<19.62?1+.28*Math.sin(prog(19.5,19.62,T)*Math.PI):1,a=1-prog(20.1,20.35,T);
 playPause(ctx,ix+iw/2,iy+ih*.45,iw*.16*pulse,E.inOutCubic(k),a);
 // 10-segment progress bar (one per 16th)
 const n=10,gap=iw*.018,bw=(iw*.84-gap*(n-1))/n,bx=ix+iw*.08,by=iy+ih*.93,bh=Math.max(2,ih*.012);
 ctx.save();ctx.fillStyle='rgba(6,23,15,.45)';ctx.fillRect(ix,by-bh*2.5,iw,bh*6);
 for(let i=0;i<n;i++){const t0=19.5+i*.125,f=E.outBack(prog(t0,t0+.1,T));ctx.fillStyle='rgba(244,236,216,.28)';ctx.fillRect(bx+i*(bw+gap),by,bw,bh);
  if(f>0){ctx.fillStyle=PAL.hot;const sc=1+.6*(1-clamp((T-t0)/.15));ctx.fillRect(bx+i*(bw+gap),by-bh*(sc-1)/2,bw*Math.min(1,f),bh*sc);}}
 const done=prog(20.75,20.9,T);if(done>0&&done<1)H.glow(ctx,ix+iw/2,by,iw*.5,PAL.hot,.4*Math.sin(done*Math.PI));
 ctx.restore();
};}
function world06(ctx,s,G,T){
 const K=G.K,{wx,wy,wr,ry}=G;
 H.glow(ctx,G.hx,G.hy,48*K,'#1f5a3a',.75);
 eglow(ctx,wx,wy+wr*.3,wr*1.6,wr*.9,PAL.ember,.16);
 emblem(ctx,s,G.hx,G.hy,K,ICON3,T,18,3004);
 // wok lands
 const land=prog(18.0,18.16,T),lift0=-(1-E.outBack(land))*12*K;
 const toss=prog(18.96,19.2,T),tossS=Math.sin(toss*Math.PI);
 const amp=(T<18.12?.7:1+1.8*Math.exp(-(T-18.12)*5))+(T>=19?.7*Math.exp(-(T-19)*5):0)+.08*Math.sin(T*7);
 burner(ctx,G);
 flames(ctx,G,T,amp);
 H.burst(ctx,T,18.12,{x:wx,y:wy+wr*.4,count:40,seed:3012,speed:K*60,life:.6,size:K*.8,gravity:-K*40,colors:[PAL.ember,PAL.gold,PAL.hot]});
 // rising embers
 ctx.save();ctx.globalCompositeOperation='lighter';const r=rng(3020);for(let i=0;i<26;i++){const a=r(),b=r(),c=r();const ph=(T*(.5+c*.5)+a)%1;const x=wx+(b-.5)*wr*1.5+Math.sin(T*2+i)*K*2,y=wy+wr*.3-ph*wr*1.5;ctx.globalAlpha=(1-ph)*.7*Math.min(1,ph*5);ctx.fillStyle=i%3?PAL.ember:PAL.hot;ctx.beginPath();ctx.arc(x,y,K*(.25+.25*c),0,TAU);ctx.fill();}ctx.restore();
 // flip at the loot
 const fk=prog(20.62,20.95,T),wsx=fk>0&&fk<1?Math.cos(E.inOutCubic(fk)*TAU):1;
 const rk=Math.min(E.outCubic(prog(20.6,20.8,T)),1-prog(21.1,21.5,T));if(rk>0){H.rays(ctx,wx,wy,wr*1.1,12,T*.9,PAL.hot,.35*rk);H.glow(ctx,wx,wy,wr*.8,PAL.hot,.3*rk);}
 const cs=cardState(G,T);
 const sauce=E.outCubic(prog(18.5,18.85,T))*(1-.5*prog(19,19.3,T));
 wok(ctx,G,T,{lift:lift0-tossS*4*K,tilt:-tossS*.1,sx:wsx,sauce,inPan:cs.inPan?(c)=>{c.save();c.translate(-G.wx,-G.wy);clipCard(c,cs.x,cs.y,cs.w,cs.h,0,T,{rot:cs.rot,sy:cs.sy,noShadow:true,check:1});c.restore();}:null});
 // heat shimmer
 ctx.save();ctx.strokeStyle=hexA(PAL.hot,.13);ctx.lineWidth=Math.max(1,K*.3);for(let j=0;j<5;j++){const x0=wx+(j-2)*wr*.32;ctx.beginPath();for(let i=0;i<=12;i++){const q=i/12,yy=wy-ry-q*wr*.55;const xx=x0+Math.sin(q*9-T*7+j)*K*1.2*(.4+q);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}ctx.restore();
 // sizzle when the card hits the pan
 H.burst(ctx,T,18.6,{x:wx,y:wy,count:60,seed:3018,speed:K*55,life:.7,size:K*.6,gravity:-K*50,colors:[PAL.ember,PAL.hot,PAL.gold]});
 if(T>=18.6&&T<19.3){const q=prog(18.6,19.3,T);for(let i=0;i<4;i++)H.glow(ctx,wx+(i-1.5)*wr*.25+Math.sin(T*3+i)*K*2,wy-ry-q*wr*.6-i*K*2,K*(5+q*6),PAL.cream,.12*(1-q));}
 // jar pours a ribbon of sauce
 const jIn=E.outBack(prog(18.1,18.3,T)),jOut=E.inCubic(prog(18.78,19.0,T));
 if(jIn>0&&jOut<1){const jr=lerp(0,-2.05,E.inOutCubic(prog(18.2,18.36,T)))+jOut*.6,jx=lerp(G.jar.x+16*K,G.jar.x,jIn)+jOut*14*K,jy=lerp(G.jar.y-24*K,G.jar.y,jIn)-jOut*26*K;
  const mx=jx+Math.sin(-jr)*-G.S*.5,my=jy-Math.cos(jr)*G.S*.5;
  const k1=E.outCubic(prog(18.34,18.62,T)),k0=E.inCubic(prog(18.6,18.8,T));
  if(k1>k0){const ex=wx+K*2,ey=wy+ry*.1,cx=lerp(mx,ex,.75),cy=my-3*K;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
   const pathF=()=>{ctx.beginPath();for(let i=0;i<=18;i++){const q=lerp(k0,k1,i/18);const xx=bez(mx,cx,ex,q)+Math.sin(q*12-T*20)*K*.5*q,yy=bez(my,cy,ey,q);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}};
   pathF();ctx.strokeStyle='#e8a33e';ctx.lineWidth=K*2;ctx.stroke();pathF();ctx.strokeStyle='rgba(255,246,214,.75)';ctx.lineWidth=K*.6;ctx.stroke();ctx.restore();
   const hx2=bez(mx,cx,ex,k1),hy2=bez(my,cy,ey,k1);H.glow(ctx,hx2,hy2,K*5,PAL.hot,.5);}
  ctx.save();ctx.globalAlpha=1-jOut;jarS(ctx,jx,jy,G.S,T,{fill:.85-.35*prog(18.34,18.75,T),lid:0,rot:jr});ctx.restore();}
 // the card (out of the pan): hover, toss, phone
 if(!cs.inPan){
  if(T>=19&&T<19.5){for(let j=3;j>=1;j--){const g=cardState(G,T-j*.035);ctx.save();ctx.globalAlpha=.16*(1-j/4);ctx.translate(g.x,g.y);ctx.rotate(g.rot);ctx.fillStyle=PAL.hot;H.rr(ctx,-g.w/2,-g.h*g.sy/2,g.w,g.h*g.sy,g.w*.1);ctx.fill();ctx.restore();}}
  const isPhone=T>=19.5;
  if(isPhone){const sa=prog(19.5,19.8,T)*(1-prog(21.4,21.6,T));sprockets(ctx,G,T,sa,false);H.glow(ctx,cs.x,cs.y,G.pw*1.3,PAL.gold,.22);}
  clipCard(ctx,cs.x,cs.y,cs.w,cs.h,cs.m,T,{rot:cs.rot,sx:cs.sx,sy:cs.sy,ph:Math.max(0,T-19.5),walk:isPhone,check:1-cs.m,ui:isPhone?phoneUI(T):null});
  if(isPhone){const sa=prog(19.5,19.8,T)*(1-prog(21.4,21.6,T));sprockets(ctx,G,T,sa,true);}
  if(T>=19.5&&T<19.95){const q=prog(19.5,19.95,T);ctx.save();ctx.globalAlpha=1-q;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1,K*.5);H.rr(ctx,cs.x-G.pw/2-q*6*K,cs.y-G.ph/2-q*6*K,G.pw+q*12*K,G.ph+q*12*K,G.pw*.15+q*4*K);ctx.stroke();ctx.restore();}
 }
 H.burst(ctx,T,19.5,{x:G.px,y:G.py+G.ph*.5,count:24,seed:3019,speed:K*45,life:.5,size:K*.6,colors:[PAL.hot,PAL.cream]});
 // camera icon, struck through at 20.5
 const ca=E.outBack(prog(19.85,20.1,T));if(ca>0){const sl=prog(20.5,20.7,T)+(T>=20.7?prog(20.7,21.1,T)*.4:0);camIcon(ctx,G.cam.x,G.cam.y,(G.P?9:7.5)*K*ca,1,sl,T);H.burst(ctx,T,20.6,{x:G.cam.x,y:G.cam.y,count:16,seed:3020,speed:K*35,life:.45,size:K*.55,colors:[PAL.hot,PAL.gold]});}
 glamour(ctx,G.px,G.py,G.pw*.95,G.ph*.58,K,T,prog(20.95,21.2,T),16);
 H.dust(ctx,s,{count:26,seed:1801,alpha:.4,size:s.u*.26,speed:s.u*1.6,color:PAL.hot});
}
TR.defineScene({id:'s06_cook',start:18,end:22,draw(ctx,s){
 const T=s.T,t=s.t,G=g06(s);
 ctx.fillStyle=PAL.void;ctx.fillRect(0,0,s.w,s.h);
 ctx.fillStyle=H.radial(ctx,G.hx,G.hy,Math.max(s.w,s.h)*.8,'#103723',PAL.void);ctx.fillRect(0,0,s.w,s.h);
 const kin=1-E.outExpo(clamp(t/.25)),kout=E.inCubic(prog(21.5,22,T));
 const tilt=s.h*.04*(E.inOutSine(prog(18.95,19.35,T))-E.inOutSine(prog(19.5,20.05,T)));
 const ox=red(s,s.w*.3)*kin-red(s,s.w*.85)*kout,oy=red(s,tilt);
 bokeh(ctx,s,ox,1805,true);
 const sh=(T>=18.1&&T<18.4?.7*(1-(T-18.1)/.3):0)+(T>=19.5&&T<19.65?.35*(1-(T-19.5)/.15):0);
 if(kin>.15&&!s.reduced)drawWorld(ctx,s,ox+s.w*.06*kin,oy,.28,0,()=>world06(ctx,s,G,T));
 if(kout>.08&&!s.reduced)drawWorld(ctx,s,ox+s.w*.09*kout,oy,.3*kout,0,()=>world06(ctx,s,G,T));
 drawWorld(ctx,s,ox,oy,1,sh,()=>world06(ctx,s,G,T));
 H.vignette(ctx,s,.5);
 whipLines(ctx,s,kin*1.3,1810,{count:24});
 whipLines(ctx,s,kout*1.3,1820,{count:24});
 lootFlight(ctx,s,G.K,T,G.wx+ox,G.wy-G.ry+oy,2,ICON3,20.72,21,2121);
 H.caption(ctx,s,{text:'คลิป 10 วิ ไม่ต้องถ่าย',sub:'บท 3 · ซอส+ภาพ ผัดเป็นคลิปแนวตั้ง',in:18.15,out:21.9,accent:'ไม่ต้องถ่าย',layout:'column',chip:ICON3});
}});
})();
