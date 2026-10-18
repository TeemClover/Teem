/* s11_secret (44.5–52.0): the hidden 7th stage. A checked table of contents, a scrambled 7th row outside
   the card, a dive into it, and a stone door whose six sockets take the six rewards. The keyhole ignites,
   the padlock jolts, a frosted badge silhouette is glimpsed — and a hard cut to black at 51.5. The door
   never opens. Rose (#f2a07b) is used here only, because this is the secret. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H;
const {clamp,lerp,E,env,rng,hexA,PAL,LESSONS,TAU}=H;
const S0=44.5,CUT=51.5,CHECK0=45,ROW7=46.5,DIVE0=47,DIVE1=48,IGNITE=50.5,JOLT=51;
const LOCKS=[48,48.5,49,49.5,50,50.5];
// Socket fill order clockwise from the top-left of a flat-top hexagon (degrees).
const SOCK_ANG=[240,300,0,60,120,180].map(d=>d*Math.PI/180);
const ROSE=PAL.rose;
const outQuart=x=>1-Math.pow(1-clamp(x),4);
// lub-dub heartbeat every 1.0 s from 44.5 to 47.5 (drives a tiny push and the glow behind the card)
function heart(T){let v=0;for(let b=S0;b<=47.5;b+=1){const a=T-b;if(a>=0&&a<.7)v+=Math.exp(-a*12);const d=a-.22;if(d>=0&&d<.6)v+=.6*Math.exp(-d*12);}return Math.min(1,v);}

/* ── cached sprites / geometry ───────────────────────────── */
let fogC=null,noiseC=null,veins=null,cracks=null,motes=null;
function fogSprite(){
 if(fogC)return fogC;const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');const r=rng(4407);
 for(let i=0;i<16;i++){const x=70+r()*372,y=44+r()*40,rad=34+r()*40;const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(150,176,162,.20)');gr.addColorStop(1,'rgba(150,176,162,0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
 return fogC=c;
}
function noiseSprite(){
 if(noiseC)return noiseC;const tmp=document.createElement('canvas');tmp.width=320;tmp.height=40;const t=tmp.getContext('2d');const r=rng(9071);
 for(let i=0;i<90;i++){const x=r()*304,w=3+r()*22,y=8+r()*20,h=2+r()*9,k=r();t.fillStyle=k<.45?'rgba(244,236,216,.95)':k<.75?'rgba(242,160,123,.95)':'rgba(226,194,122,.9)';t.fillRect(x,y,w,h);}
 const c=document.createElement('canvas');c.width=320;c.height=40;const g=c.getContext('2d');
 const offs=[[0,0],[-3,0],[3,0],[0,-2],[0,2],[-6,1],[6,-1],[-2,3],[2,-3],[-9,0],[9,0]];
 g.globalAlpha=1.7/offs.length;for(const [dx,dy] of offs)g.drawImage(tmp,dx,dy);
 return noiseC=c;
}
// Stone grain for the slab: mottled light/dark blotches, pits and a few strata, drawn once and stretched.
let stoneC=null;
function stoneSprite(){
 if(stoneC)return stoneC;const c=document.createElement('canvas');c.width=180;c.height=280;const g=c.getContext('2d');const r=rng(6203);
 for(let i=0;i<220;i++){const x=r()*180,y=r()*280,rad=6+r()*26,lt=r()<.5;const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,lt?'rgba(190,210,196,.16)':'rgba(0,0,0,.28)');gr.addColorStop(1,lt?'rgba(190,210,196,0)':'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
 for(let i=0;i<9;i++){let y=r()*280;g.strokeStyle=r()<.5?'rgba(0,0,0,.22)':'rgba(200,220,205,.10)';g.lineWidth=.6+r()*1.2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=180;x+=12){y+=(r()-.5)*5;g.lineTo(x,y);}g.stroke();}
 for(let i=0;i<520;i++){const x=r()*180,y=r()*280,k=r();g.fillStyle=k<.6?'rgba(0,0,0,.45)':'rgba(220,235,225,.22)';g.fillRect(x,y,k<.9?1:2,k<.9?1:2);}
 return stoneC=c;
}
// Branching veins per socket, in door-width units relative to the socket centre. Each segment: [x0,y0,x1,y1,t0,t1,depth].
function buildVeins(){
 if(veins)return veins;veins=[];
 for(let k=0;k<6;k++){
  const r=rng(701+k*37),segs=[];const ang=SOCK_ANG[k];
  const grow=(x,y,a,len,depth,t0,t1)=>{const n=depth?3:5;let px=x,py=y,dir=a;for(let i=0;i<n;i++){const na=dir+(r()-.5)*1.1,l=len/n*(0.8+r()*.4);const nx=px+Math.cos(na)*l,ny=py+Math.sin(na)*l;const ts=lerp(t0,t1,i/n),te=lerp(t0,t1,(i+1)/n);segs.push([px,py,nx,ny,ts,te,depth]);
    if(depth<2&&r()<.55)grow(nx,ny,na+(r()<.5?-1:1)*(.55+r()*.6),len*(.42+r()*.2),depth+1,te,Math.min(1,te+(t1-t0)*.55));
    px=nx;py=ny;dir=na*.55+a*.45;}};
  grow(Math.cos(ang)*.08,Math.sin(ang)*.08,ang,.30,0,0,.82);
  grow(Math.cos(ang+.9)*.08,Math.sin(ang+.9)*.08,ang+.75,.17,1,.1,.7);
  grow(Math.cos(ang-.9)*.08,Math.sin(ang-.9)*.08,ang-.75,.15,1,.15,.75);
  veins.push(segs);
 }
 return veins;
}
function buildCracks(){
 if(cracks)return cracks;cracks=[];const r=rng(3331);
 for(let i=0;i<9;i++){let x=(r()-.5)*.9,y=(r()-.5)*1.5,a=r()*TAU;const pts=[[x,y]];for(let j=0;j<4;j++){a+=(r()-.5)*1.2;x+=Math.cos(a)*.06;y+=Math.sin(a)*.06;pts.push([x,y]);}cracks.push(pts);}
 return cracks;
}
function buildMotes(){if(motes)return motes;motes=[];const r=rng(5150);for(let i=0;i<70;i++)motes.push({a:r()*TAU,sp:.25+r()*.75,ph:r(),sz:.5+r(),sw:r()*TAU});return motes;}

function geo(s){
 const W=s.w,Hh=s.h,P=s.portrait;let card,door;
 if(!P){const cw=W*.26,ch=Hh*.56;card={x:W*.30-cw/2,y:Hh*.11,w:cw,h:ch};const dh=Hh*.80,dw=Math.min(dh*.6,W*.44);door={cx:W*.30,cy:Hh*.52,w:dw,h:dh};}
 else{const cw=W*.70,ch=Hh*.40;card={x:W*.15,y:Hh*.10,w:cw,h:ch};const dh=Hh*.54,dw=Math.min(dh*.66,W*.84);door={cx:W*.5,cy:Hh*.33,w:dw,h:dh};}
 card.head=card.h*.14;card.pad=card.h*.04;card.rowH=(card.h-card.head-card.pad*2)/6;
 const rh=card.rowH,r7={x:card.x+card.w*.04,y:card.y+card.h+rh*.5,w:card.w*.92,h:rh*.84};
 r7.lx=r7.x+r7.w-rh*.62;r7.ly=r7.y+r7.h/2;
 door.kx=door.cx;door.ky=door.cy+door.h*.07;
 return {card,door,r7};
}

// The caption block (both whisper lines), padded — the dive's speed lines stay out of it.
function capRect(s){
 const hd=s.type.head,sb=s.type.sub;
 if(!s.portrait)return {x0:s.w*.58-s.u*3,x1:s.w*.97,y0:s.h*.47-hd*1.0,y1:s.h*.56+sb*1.0};
 return {x0:s.w*.03,x1:s.w*.97,y0:s.h*.70-hd*1.0,y1:s.h*.76+sb*1.0};
}
// Same radial streaks as H.speedLines, but any streak whose midpoint falls in the caption block is skipped.
function tunnelLines(ctx,s,cx,cy,alpha,cr){
 if(alpha<=0)return;const r=rng(4401),R=Math.hypot(s.w,s.h);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.hot;ctx.lineCap='round';
 for(let i=0;i<64;i++){const a=r()*TAU,ph=(r()+s.T*2.2)%1,lr=r(),wr=r();const r0=R*(.18+ph*.7),len=R*(.06+lr*.12);
  const ca=Math.cos(a),sa=Math.sin(a),inC=d=>{const x=cx+ca*d,y=cy+sa*d;return x>cr.x0&&x<cr.x1&&y>cr.y0&&y<cr.y1;};
  if(inC(r0)||inC(r0+len/2)||inC(r0+len))continue;
  ctx.globalAlpha=alpha*(1-ph);ctx.lineWidth=s.u*.3*(.5+wr);ctx.beginPath();ctx.moveTo(cx+ca*r0,cy+sa*r0);ctx.lineTo(cx+ca*(r0+len),cy+sa*(r0+len));ctx.stroke();}
 ctx.restore();
}

/* ── small vector marks ──────────────────────────────────── */
function padlock(ctx,x,y,sz,o={}){
 // x,y = top of the shackle (the hanging point); the lock swings about it.
 ctx.save();ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);ctx.globalAlpha*=o.alpha??1;
 const bw=sz,bh=sz*.82,sr=bw*.3,top=sr,bodyY=top+bh*.42+bh/2;
 ctx.lineCap='round';ctx.lineWidth=sz*.15;ctx.strokeStyle=o.shackle||'#c9b98c';
 ctx.beginPath();ctx.moveTo(-sr,bodyY-bh*.4);ctx.lineTo(-sr,top);ctx.arc(0,top,sr,Math.PI,0);ctx.lineTo(sr,bodyY-bh*.4);ctx.stroke();
 const g=ctx.createLinearGradient(0,bodyY-bh/2,0,bodyY+bh/2);g.addColorStop(0,o.top||'#5b4a2a');g.addColorStop(1,o.bot||'#1f170c');
 H.rr(ctx,-bw/2,bodyY-bh/2,bw,bh,sz*.16);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=Math.max(1,sz*.05);ctx.strokeStyle=o.rim||PAL.gold;ctx.stroke();
 ctx.fillStyle='#050a07';ctx.beginPath();ctx.arc(0,bodyY-bh*.06,bw*.09,0,TAU);ctx.fill();ctx.fillRect(-bw*.04,bodyY-bh*.06,bw*.08,bh*.26);
 if(o.glint>0){ctx.save();H.rr(ctx,-bw/2,bodyY-bh/2,bw,bh,sz*.16);ctx.clip();const gx=lerp(-bw,bw,o.glintPos??.5);ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=o.glint;ctx.fillStyle=hexA(ROSE,.8);ctx.beginPath();ctx.moveTo(gx-bw*.12,bodyY-bh);ctx.lineTo(gx+bw*.05,bodyY-bh);ctx.lineTo(gx-bw*.05,bodyY+bh);ctx.lineTo(gx-bw*.22,bodyY+bh);ctx.fill();ctx.restore();}
 ctx.restore();
 return bodyY;
}
function tick(ctx,x,y,sz,p,color){
 if(p<=0)return;const pts=[[-.34,.02],[-.1,.26],[.36,-.28]];const l1=Math.hypot(.24,.24),l2=Math.hypot(.46,.54),L=(l1+l2)*clamp(p);
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(1.6,sz*.16);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x+pts[0][0]*sz,y+pts[0][1]*sz);
 if(L<=l1){const k=L/l1;ctx.lineTo(x+lerp(pts[0][0],pts[1][0],k)*sz,y+lerp(pts[0][1],pts[1][1],k)*sz);}
 else{ctx.lineTo(x+pts[1][0]*sz,y+pts[1][1]*sz);const k=(L-l1)/l2;ctx.lineTo(x+lerp(pts[1][0],pts[2][0],k)*sz,y+lerp(pts[1][1],pts[2][1],k)*sz);}
 ctx.stroke();ctx.restore();
}
function question(ctx,x,y,sz,color,alpha){
 ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.4,sz*.14);ctx.lineCap='round';
 ctx.beginPath();ctx.arc(x,y-sz*.18,sz*.22,Math.PI*1.1,Math.PI*.45+TAU*0);ctx.stroke();
 ctx.beginPath();ctx.moveTo(x+sz*.08,y+.02*sz);ctx.quadraticCurveTo(x,y+sz*.06,x,y+sz*.16);ctx.stroke();
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y+sz*.34,sz*.06,0,TAU);ctx.fill();ctx.restore();
}

/* ── background: void, fog bands, motes ──────────────────── */
function backdrop(ctx,s,drift){
 const T=s.T;H.bg(ctx,s,'#05120c','#020805',PAL.void);
 const fog=fogSprite();
 const bands=[{y:.24,sp:9,sc:1.0,a:.26},{y:.58,sp:-14,sc:1.4,a:.22},{y:.86,sp:22,sc:1.9,a:.3}];
 ctx.save();
 // far layer: a big, slow, faint fog bank that parallaxes less than the near bands (depth)
 {const bw=s.w*2.4,bh=bw*.25,off=((T*3*s.u*.12+drift*s.u*2.5)%(bw*.8)+bw*.8)%(bw*.8);ctx.globalAlpha=.2;for(let k=-1;k<2;k++)ctx.drawImage(fog,k*bw*.8-off,s.h*.66-bh/2+Math.sin(T*.25)*s.u*1.5,bw,bh);}
 ctx.restore();
 // out-of-focus bokeh motes far behind the card — slow, large, parallaxed with the dive
 {const r=rng(4481),n=s.portrait?7:10;
  for(let i=0;i<n;i++){const bx=s.portrait?.08+r()*.84:.4+r()*.62,by=s.portrait?.08+r()*.9:.12+r()*.86,rad=s.u*(3+r()*6),ph=r()*TAU,col=r()<.6?PAL.gold:'#7fb393',par=.4+r()*.8;
   const x=s.w*bx+Math.sin(T*.21+ph)*s.u*2.5-drift*par*s.u*3*(bx-.5)*4,y=s.h*by+Math.cos(T*.17+ph)*s.u*1.8-drift*par*s.u*3*(by-.5)*4;
   const a=(.07+.05*Math.sin(T*.6+ph*2))*(1-clamp(drift/6));
   H.glow(ctx,x,y,rad*1.25,col,a*1.4);ctx.save();ctx.globalAlpha=a*.55;ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,rad,0,TAU);ctx.fill();ctx.globalAlpha=a*.9;ctx.lineWidth=Math.max(1,s.u*.12);ctx.strokeStyle=col;ctx.stroke();ctx.restore();}}
 ctx.save();
 bands.forEach((b,i)=>{const bw=s.w*.9*b.sc,bh=bw*.25;const off=((T*b.sp*s.u*.12+drift*(i+1)*s.u*6)%(bw*.8)+bw*.8)%(bw*.8);ctx.globalAlpha=b.a;for(let k=-1;k<3;k++){ctx.drawImage(fog,k*bw*.8-off,s.h*b.y-bh/2+Math.sin(T*.4+i)*s.u,bw,bh);}});
 ctx.restore();
 H.dust(ctx,s,{seed:4471,count:34,alpha:.32,size:s.u*.22,speed:s.u*1.2,color:PAL.hot,dx:.25});
}

/* ── the table-of-contents card ──────────────────────────── */
function drawCard(ctx,s,G,dimOthers){
 const T=s.T,c=G.card,rh=c.rowH;
 const up=E.outCubic((T-S0)/.5);if(up<=0)return;
 ctx.save();ctx.globalAlpha*=up;ctx.translate(0,(1-up)*s.u*4);
 H.glow(ctx,c.x+c.w/2,c.y+c.h*.5,c.w*.9,'#1f5a3a',.35+.3*heart(T));
 H.card(ctx,c.x,c.y,c.w,c.h,{fill:'rgba(8,28,19,.94)',r:s.u*2,stroke:hexA(PAL.gold,.38),lw:Math.max(1,s.u*.18),shadow:'rgba(0,0,0,.6)',blur:s.u*4,offY:s.u});
 // header: list mark, a title bar, six progress dots
 const hy=c.y+c.head*.55,hx=c.x+c.w*.07;
 ctx.strokeStyle=hexA(PAL.gold,.8);ctx.lineWidth=Math.max(1.2,s.u*.28);ctx.lineCap='round';
 for(let i=0;i<3;i++){const yy=hy-c.head*.16+i*c.head*.16;ctx.beginPath();ctx.moveTo(hx,yy);ctx.lineTo(hx+c.head*.32,yy);ctx.stroke();}
 H.rr(ctx,hx+c.head*.5,hy-c.head*.07,c.w*.34,c.head*.14,c.head*.07);ctx.fillStyle=hexA(PAL.cream,.45);ctx.fill();
 const done=[0,1,2,3,4,5].filter(k=>T>=CHECK0+k*.25+.12).length;
 for(let k=0;k<6;k++){const dx=c.x+c.w*.93-(5-k)*c.head*.2;ctx.beginPath();ctx.arc(dx,hy,c.head*.055,0,TAU);ctx.fillStyle=k<done?PAL.hot:hexA(PAL.cream,.2);ctx.fill();}
 ctx.fillStyle=hexA(PAL.gold,.2);ctx.fillRect(c.x+c.w*.05,c.y+c.head,c.w*.9,1);
 // rows
 for(let k=0;k<6;k++){
  const ry=c.y+c.head+c.pad+k*rh,rx=c.x+c.w*.04,rw=c.w*.92,rhh=rh*.84,cy=ry+rh/2;
  const sl=E.outBack((T-(S0+.08+k*.055))/.38);if(sl<=0)continue;
  const tc=CHECK0+k*.25,ck=clamp((T-tc)/.16),hit=T>=tc?Math.exp(-(T-tc)*5):0;
  ctx.save();ctx.globalAlpha*=clamp(sl)*(dimOthers?lerp(1,.55,dimOthers):1);ctx.translate(-(1-sl)*c.w*.18,0);
  H.rr(ctx,rx,cy-rhh/2,rw,rhh,rhh*.3);ctx.fillStyle=T>=tc?`rgba(226,194,122,${.07+.3*hit})`:'rgba(255,255,255,.035)';ctx.fill();
  if(T>=tc){ctx.lineWidth=1;ctx.strokeStyle=hexA(PAL.gold,.25+.5*hit);ctx.stroke();}
  const ix=rx+rh*.52,pop=T>=tc?1+.3*hit:1;
  H.emoji(ctx,LESSONS[k].icon,ix,cy,rh*.56*pop);
  const bx=rx+rh*1.02,bwMax=rw-rh*2.05,bw=bwMax*[.72,.55,.8,.62,.7,.5][k];
  H.rr(ctx,bx,cy-rh*.09,bw,rh*.18,rh*.09);ctx.fillStyle=T>=tc?hexA(PAL.hot,.55+.3*hit):hexA(PAL.cream,.28);ctx.fill();
  H.rr(ctx,bx,cy+rh*.16,bw*.45,rh*.09,rh*.045);ctx.fillStyle=hexA(PAL.cream,.16);ctx.fill();
  const bxx=rx+rw-rh*.5,bs=rh*.5;
  H.rr(ctx,bxx-bs/2,cy-bs/2,bs,bs,bs*.25);ctx.lineWidth=Math.max(1,rh*.05);ctx.strokeStyle=T>=tc?hexA(PAL.mint,.8):hexA(PAL.cream,.3);ctx.stroke();
  tick(ctx,bxx,cy,bs*.95,ck,PAL.mint);
  if(hit>.02)H.glow(ctx,bxx,cy,rh*1.3,PAL.hot,.55*hit);
  ctx.restore();
  if(T>=tc)H.burst(ctx,T,tc,{x:rx+rw-rh*.5,y:cy,count:10,speed:rh*3.2,size:rh*.07,life:.5,seed:90+k,colors:[PAL.hot,PAL.mint,PAL.cream]});
 }
 ctx.restore();
}
// The 7th row: outside the card, scrambled, never in focus.
function drawRow7(ctx,s,G,a){
 if(a<=0)return;const T=s.T,r=G.r7,rh=G.card.rowH;
 const drift=.4+.2*(Math.sin(T*2.1+.4)*.6+Math.sin(T*3.3+1.3)*.4);// ≤1 Hz, 0.2–0.6
 const mat=E.outCubic((T-ROW7)/.45);
 ctx.save();ctx.globalAlpha*=a;
 H.glow(ctx,r.x+r.w/2,r.ly,r.w*.55,ROSE,.22*mat);
 ctx.save();ctx.globalAlpha*=drift;ctx.translate((1-mat)*rh*.6,0);
 H.rr(ctx,r.x,r.y,r.w,r.h,r.h*.3);ctx.setLineDash([rh*.14,rh*.12]);ctx.lineDashOffset=-T*rh*.4;ctx.lineWidth=Math.max(1,rh*.04);ctx.strokeStyle=hexA(ROSE,.7);ctx.stroke();ctx.setLineDash([]);
 question(ctx,r.x+rh*.48,r.ly,rh*.62,PAL.cream,.85);
 // scrambled bar: four strips sliding at their own speeds (wrap-around), from a pre-blurred sprite
 const ns=noiseSprite(),bx=r.x+rh*.98,bw=r.w-rh*2.05,by=r.ly-rh*.22,bh=rh*.44;
 ctx.save();ctx.beginPath();ctx.rect(bx,by,bw,bh);ctx.clip();
 for(let i=0;i<4;i++){const sp=[37,-23,51,-31][i],off=(((T*sp*rh*.05)%bw)+bw)%bw,sy=i*10,dy=by+i*bh/4;ctx.drawImage(ns,0,sy,320,10,bx+off-bw,dy,bw,bh/4+.5);ctx.drawImage(ns,0,sy,320,10,bx+off,dy,bw,bh/4+.5);}
 ctx.restore();
 ctx.restore();
 // the padlock — the one that glinted in the HUD fog
 const gl=clamp(1-Math.abs(T-(ROW7+.35))/.35);
 padlock(ctx,r.lx,r.ly-rh*.36,rh*.42,{alpha:.55+.45*mat,glint:gl,glintPos:(T-ROW7)/.7,shackle:'#d9cdb0',rim:ROSE});
 if(gl>0)H.glow(ctx,r.lx,r.ly,rh*1.1,ROSE,.45*gl);
 ctx.restore();
}

/* ── the door ────────────────────────────────────────────── */
function arch(ctx,x,y,w,h){const r=w/2;ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+r);ctx.arc(x+r,y+r,r,Math.PI,0);ctx.lineTo(x+w,y+h);ctx.closePath();}
function keyholePath(ctx,kr){ctx.beginPath();ctx.arc(0,0,kr,0,TAU);ctx.moveTo(-kr*.42,kr*.55);ctx.lineTo(-kr*.72,kr*2.15);ctx.lineTo(kr*.72,kr*2.15);ctx.lineTo(kr*.42,kr*.55);ctx.closePath();}
function sockPos(D,k){const R=D.w*.32,a=SOCK_ANG[k];return {x:Math.cos(a)*R,y:Math.sin(a)*R};}

function drawDoor(ctx,s,D,T){
 // local coords: origin at the keyhole/hex centre.
 const W=D.w,Hd=D.h,oy=-(D.ky-D.cy),top=oy-Hd/2,left=-W/2,u=s.u;
 const ign=E.outCubic((T-IGNITE)/.5),locked=LOCKS.filter(t=>T>=t).length;
 const f=W*.06;
 // ground shadow + back light
 H.glow(ctx,0,oy+Hd*.5,W*1.1,'#1f5a3a',.25);
 ctx.save();ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.ellipse(0,oy+Hd*.5,W*.75,W*.07,0,0,TAU);ctx.fill();ctx.restore();
 // stone surround
 arch(ctx,left-f,top-f,W+2*f,Hd+f);const gs=ctx.createLinearGradient(left-f,top-f,W/2+f,oy+Hd/2);gs.addColorStop(0,'#24352d');gs.addColorStop(1,'#09130f');ctx.fillStyle=gs;ctx.fill();
 // surround: dressed blocks — voussoirs around the arch, courses down the jambs, light top-left bevel
 ctx.save();arch(ctx,left-f,top-f,W+2*f,Hd+f);ctx.clip();
 ctx.drawImage(stoneSprite(),left-f,top-f,W+2*f,Hd+f);
 const acx=0,acyS=top+W/2,rO=W/2+f,rI=W/2;
 ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=Math.max(1,W*.008);ctx.beginPath();
 for(let i=1;i<9;i++){const a=Math.PI+i*Math.PI/9;ctx.moveTo(acx+Math.cos(a)*rI,acyS+Math.sin(a)*rI);ctx.lineTo(acx+Math.cos(a)*rO,acyS+Math.sin(a)*rO);}
 for(let yy=acyS+Hd*.1;yy<oy+Hd/2;yy+=Hd*.11){ctx.moveTo(left-f,yy);ctx.lineTo(left,yy);ctx.moveTo(-left,yy+Hd*.05);ctx.lineTo(-left+f,yy+Hd*.05);}
 ctx.stroke();
 ctx.strokeStyle='rgba(205,225,210,.10)';ctx.lineWidth=Math.max(1,W*.006);ctx.beginPath();
 for(let i=1;i<9;i++){const a=Math.PI+i*Math.PI/9+.012;ctx.moveTo(acx+Math.cos(a)*rI,acyS+Math.sin(a)*rI);ctx.lineTo(acx+Math.cos(a)*rO,acyS+Math.sin(a)*rO);}
 ctx.stroke();
 ctx.restore();
 // thick bevel: lit outer lip, dark inner reveal where the slab sits back
 arch(ctx,left-f,top-f,W+2*f,Hd+f);ctx.lineWidth=Math.max(1.5,W*.022);ctx.strokeStyle='rgba(0,0,0,.55)';ctx.stroke();
 ctx.lineWidth=Math.max(1,W*.012);ctx.strokeStyle=hexA(PAL.gold,.55+.35*ign);ctx.stroke();
 arch(ctx,left-W*.012,top-W*.012,W+W*.024,Hd+W*.012);ctx.lineWidth=Math.max(2,W*.03);ctx.strokeStyle='rgba(0,0,0,.7)';ctx.stroke();
 // slab
 arch(ctx,left,top,W,Hd);const g=ctx.createLinearGradient(0,top,0,oy+Hd/2);g.addColorStop(0,'#22322b');g.addColorStop(.55,'#16231d');g.addColorStop(1,'#0c1612');ctx.fillStyle=g;ctx.fill();
 ctx.save();arch(ctx,left,top,W,Hd);ctx.clip();
 ctx.globalAlpha=.9;ctx.drawImage(stoneSprite(),left,top,W,Hd);ctx.globalAlpha=1;
 // bevelled slab edge: highlight on the upper-left, shadow lower-right (inside the clip)
 {const bv=W*.035;ctx.lineWidth=bv;arch(ctx,left,top,W,Hd);const bg=ctx.createLinearGradient(left,top,-left,oy+Hd/2);bg.addColorStop(0,'rgba(210,228,214,.16)');bg.addColorStop(.5,'rgba(0,0,0,.15)');bg.addColorStop(1,'rgba(0,0,0,.5)');ctx.strokeStyle=bg;ctx.stroke();}
 ctx.restore();
 arch(ctx,left,top,W,Hd);ctx.lineWidth=Math.max(1,W*.01);ctx.strokeStyle=hexA(PAL.gold,.8);ctx.stroke();
 ctx.save();arch(ctx,left,top,W,Hd);ctx.clip();
 // warm light pooling from the keyhole onto the stone
 if(ign>0){ctx.fillStyle=H.radial(ctx,0,0,W*.75,hexA(ROSE,.28*ign),'rgba(242,160,123,0)');ctx.fillRect(left,top,W,Hd);}
 // cracks + seam
 ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=Math.max(1,W*.006);
 for(const pts of buildCracks()){ctx.beginPath();pts.forEach(([x,y],i)=>{const px=x*W,py=oy+y*Hd*.62;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();}
 ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-W*.004,top+W*.18,W*.008,Hd);
 // inner arch carving
 const ins=W*.065;arch(ctx,left+ins,top+ins,W-2*ins,Hd-ins);ctx.lineWidth=Math.max(1,W*.008);ctx.strokeStyle=hexA(PAL.gold,.35+.4*ign);ctx.stroke();
 // carved dawn at the crown
 const acy=top+W/2,sr=W*.11,horizon=acy+W*.02;
 ctx.strokeStyle=hexA(PAL.gold,.38+.55*ign);ctx.lineWidth=Math.max(1,W*.009);
 ctx.beginPath();ctx.arc(0,horizon,sr,Math.PI,0);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-W*.3,horizon);ctx.lineTo(W*.3,horizon);ctx.stroke();
 for(let i=0;i<9;i++){const a=Math.PI+(i+.5)*Math.PI/9;ctx.beginPath();ctx.moveTo(Math.cos(a)*sr*1.3,horizon+Math.sin(a)*sr*1.3);ctx.lineTo(Math.cos(a)*sr*(i%2?1.9:2.3),horizon+Math.sin(a)*sr*(i%2?1.9:2.3));ctx.stroke();}
 if(ign>0)H.glow(ctx,0,horizon,sr*2.6,PAL.hot,.35*ign);
 // bottom panels with a zigzag band
 const py0=oy+Hd*.5-Hd*.17;ctx.strokeStyle=hexA(PAL.gold,.28+.3*ign);
 H.rr(ctx,-W*.38,py0,W*.34,Hd*.12,W*.02);ctx.stroke();H.rr(ctx,W*.04,py0,W*.34,Hd*.12,W*.02);ctx.stroke();
 ctx.beginPath();for(let i=0;i<=16;i++){const x=-W*.36+i*W*.045,y=py0-Hd*.035+(i%2?-1:1)*W*.018;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
 // veins
 const V=buildVeins();
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 for(let k=0;k<6;k++){if(T<LOCKS[k])continue;const gp=clamp((T-LOCKS[k])/.4),sp=sockPos(D,k);const pulse=.75+.25*Math.sin(T*4.2+k);
  for(let pass=0;pass<2;pass++){for(let d=0;d<3;d++){ctx.strokeStyle=pass?hexA(d?PAL.gold:PAL.hot,(d?.95:.85)*pulse):hexA(PAL.gold,.26*pulse);ctx.lineWidth=Math.max(pass?1:2.5,W*(pass?.011:.03)*(1-d*.3));ctx.beginPath();
    for(const sg of V[k]){if(sg[6]!==d||gp<=sg[4])continue;const q=clamp((gp-sg[4])/(sg[5]-sg[4]));ctx.moveTo(sp.x+sg[0]*W,sp.y+sg[1]*W);ctx.lineTo(sp.x+lerp(sg[0],sg[2],q)*W,sp.y+lerp(sg[1],sg[3],q)*W);}
    ctx.stroke();}}}
 ctx.restore();
 ctx.restore();// slab clip
 // hex ring: edges light as both ends are locked; the whole ring burns on ignition
 const pos=[0,1,2,3,4,5].map(k=>sockPos(D,k));
 ctx.lineCap='round';
 for(let k=0;k<6;k++){const a=pos[k],b=pos[(k+1)%6];const lit=Math.min(T>=LOCKS[k]?1:0,T>=LOCKS[(k+1)%6]?1:0);const lp=lit?clamp((T-Math.max(LOCKS[k],LOCKS[(k+1)%6]))/.25):0;
  ctx.lineWidth=Math.max(1,W*.012);ctx.strokeStyle=hexA(PAL.gold,.28);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  const L=Math.max(lp,ign);if(L>0){ctx.strokeStyle=hexA(PAL.hot,.9);ctx.lineWidth=Math.max(1.2,W*.016);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(lerp(a.x,b.x,L),lerp(a.y,b.y,L));ctx.stroke();}}
 ctx.beginPath();ctx.arc(0,0,W*.2,0,TAU);ctx.lineWidth=Math.max(1,W*.006);ctx.strokeStyle=hexA(PAL.gold,.25+.6*ign);ctx.stroke();
 // sockets
 const sr2=W*.075;
 for(let k=0;k<6;k++){const p=pos[k],on=T>=LOCKS[k],age=on?T-LOCKS[k]:0;
  ctx.beginPath();ctx.arc(p.x,p.y,sr2,0,TAU);const sg=ctx.createRadialGradient(p.x,p.y-sr2*.3,sr2*.1,p.x,p.y,sr2);sg.addColorStop(0,on?'#3a3020':'#0a120e');sg.addColorStop(1,on?'#1a1408':'#020604');ctx.fillStyle=sg;ctx.fill();
  ctx.lineWidth=Math.max(1.2,W*.014);ctx.strokeStyle=on?PAL.hot:hexA(PAL.gold,.6);ctx.stroke();
  if(on){H.glow(ctx,p.x,p.y,sr2*2.2,PAL.gold,.35+.25*ign);const sq=E.outBack(clamp(age/.28));H.emoji(ctx,LESSONS[k].icon,p.x,p.y,sr2*1.25*lerp(1.45,1,sq));
   if(age<.5){H.glow(ctx,p.x,p.y,sr2*4,PAL.hot,.7*(1-age/.5));ctx.beginPath();ctx.arc(p.x,p.y,sr2*(1+age*6),0,TAU);ctx.lineWidth=Math.max(1,W*.012*(1-age*2));ctx.strokeStyle=hexA(PAL.hot,.9*(1-age*2));ctx.stroke();}
   H.burst(ctx,T,LOCKS[k],{x:p.x,y:p.y,count:18,speed:W*.9,size:W*.012,life:.55,seed:300+k,colors:[PAL.hot,PAL.cream,PAL.gold]});}
 }
 // keyhole
 const kr=W*.066,gm=env(T,JOLT,CUT,.08,.18);
 ctx.save();ctx.translate(0,-kr*.3);
 keyholePath(ctx,kr);ctx.fillStyle='#010403';ctx.fill();ctx.lineWidth=Math.max(1,W*.01);ctx.strokeStyle=hexA(PAL.gold,.75+.25*ign);ctx.stroke();
 if(ign>0||T>=JOLT){
  ctx.save();keyholePath(ctx,kr);ctx.clip();
  const flick=.85+.15*Math.sin(T*9.3)*Math.sin(T*5.1);
  ctx.fillStyle=H.radial(ctx,0,kr*.4,kr*2.4,hexA(PAL.hot,ign*flick),hexA(ROSE,ign*.9));ctx.fillRect(-kr*2,-kr*2,kr*4,kr*5);
  ctx.restore();
 }
 ctx.restore();
 // padlock hanging below the keyhole (jolts at 51.0)
 const jt=T-JOLT,jolt=jt>=0&&jt<.6?Math.exp(-jt*6)*Math.sin(jt*48):0;
 const rot=(Math.sin(T*1.7)*1.2*Math.PI/180)+jolt*3*Math.PI/180,jy=jt>=0&&jt<.3?Math.sin(jt/.3*Math.PI)*u*.55:0;
 const pk=kr*2.25;
 ctx.fillStyle=hexA(PAL.gold,.85);ctx.beginPath();ctx.arc(0,pk,W*.014,0,TAU);ctx.fill();
 padlock(ctx,0,pk+jy,W*.12,{rot,glint:ign*.6+(jt>=0&&jt<.4?.8*(1-jt/.4):0),glintPos:.5+.4*Math.sin(T*1.3),rim:PAL.gold,shackle:'#cdbb8a'});
 // light spilling from the keyhole (local: ≤35% of frame radius)
 if(ign>0){
  const R0=Math.hypot(s.w,s.h)/2*.35,len=R0*lerp(.35,1,outQuart((T-IGNITE)/.9));
  H.rays(ctx,0,-kr*.3,len,14,T*.12,ROSE,.5*ign,.07);
  H.rays(ctx,0,-kr*.3,len*.7,10,-T*.09+.3,PAL.hot,.4*ign,.05);
  H.glow(ctx,0,-kr*.3,W*.42,ROSE,.45*ign);H.glow(ctx,0,-kr*.3,W*.18,PAL.hot,.6*ign*(1-.7*gm));
 }
 // the glimpse (51.0–51.5): a round badge silhouette behind frosted glass, glinting rim — never its face
 if(gm>0){ctx.save();ctx.translate(0,-kr*.3);keyholePath(ctx,kr);ctx.clip();ctx.globalAlpha*=gm;const br=kr*.8;
  // backlight: a blazing cream core right behind the badge so its round edge silhouettes hard
  ctx.fillStyle=H.radial(ctx,0,kr*.05,kr*1.05,'#fff6e0',hexA(ROSE,.95));ctx.fillRect(-kr*2,-kr*2,kr*4,kr*5);
  const by=kr*.05,br2=kr*.74,ro=t=>br2*(1+.075*Math.cos(t*16));
  // ribbon tails dropping into the keyhole slot
  ctx.fillStyle='rgba(40,16,10,.85)';ctx.beginPath();ctx.moveTo(-br2*.5,by+br2*.6);ctx.lineTo(-br2*.85,kr*2.2);ctx.lineTo(-br2*.42,kr*1.85);ctx.lineTo(-br2*.05,kr*2.2);ctx.lineTo(-br2*.05,by+br2*.8);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(br2*.5,by+br2*.6);ctx.lineTo(br2*.85,kr*2.2);ctx.lineTo(br2*.42,kr*1.85);ctx.lineTo(br2*.05,kr*2.2);ctx.lineTo(br2*.05,by+br2*.8);ctx.closePath();ctx.fill();
  // the rosette: scalloped medal edge — reads as a badge, not a pupil
  ctx.beginPath();for(let i=0;i<=64;i++){const t=i/64*TAU,rr=ro(t);i?ctx.lineTo(Math.cos(t)*rr,by+Math.sin(t)*rr):ctx.moveTo(Math.cos(t)*rr,by+Math.sin(t)*rr);}ctx.closePath();
  ctx.fillStyle=H.radial(ctx,-br2*.3,by-br2*.35,br2*1.5,'rgba(92,50,26,.96)','rgba(30,12,8,.97)');ctx.fill();
  ctx.lineWidth=Math.max(1.2,kr*.09);ctx.strokeStyle=hexA(PAL.hot,.95);ctx.stroke();
  // inner rings of the medal (its face stays hidden behind the frost)
  ctx.lineWidth=Math.max(1,kr*.05);ctx.strokeStyle=hexA(PAL.gold,.7);ctx.beginPath();ctx.arc(0,by,br2*.7,0,TAU);ctx.stroke();
  ctx.strokeStyle=hexA(PAL.gold,.35);ctx.beginPath();ctx.arc(0,by,br2*.5,0,TAU);ctx.stroke();
  // travelling glint on the rim
  const ga=-Math.PI*.9+(T-JOLT)*6;ctx.strokeStyle='#fffaf0';ctx.lineWidth=Math.max(1.5,kr*.17);ctx.lineCap='round';ctx.beginPath();ctx.arc(0,by,br2*.98,ga,ga+1.2);ctx.stroke();
  ctx.globalCompositeOperation='lighter';H.glow(ctx,Math.cos(ga+1.2)*br2,by+Math.sin(ga+1.2)*br2,kr*.6,PAL.cream,1);
  // frosted glass: drifting milky streaks over everything
  ctx.fillStyle='rgba(255,255,255,.13)';for(let i=0;i<4;i++)ctx.fillRect(-kr,-kr+i*kr*.62+((T*kr*.8)%(kr*.62)),kr*2,kr*.12);
  ctx.restore();
  // a rim-light halo that spills past the keyhole edge so the round shape pops at small sizes
  H.glow(ctx,0,-kr*.3+by,kr*1.6,PAL.hot,.55*gm);}
 // dust in the beams: sparse before, thick after ignition
 const M=buildMotes(),n=Math.round(lerp(14,70,ign));
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<n;i++){const m=M[i],life=2.4,age=((T*.42*m.sp+m.ph)%1);const d=W*(.06+age*.62),x=Math.cos(m.a)*d+Math.sin(T*.9+m.sw)*W*.02,y=-kr*.3+Math.sin(m.a)*d*.8-age*W*.08;
  ctx.globalAlpha=Math.sin(age*Math.PI)*(i<14?.45:.75)*(i<14?1:ign);ctx.fillStyle=i%3?PAL.hot:ROSE;ctx.beginPath();ctx.arc(x,y,Math.max(.6,u*.22*m.sz),0,TAU);ctx.fill();}
 ctx.restore();
 return locked;
}

/* ── rewards flying into their sockets ───────────────────── */
function flyStart(s,k){
 const P=s.portrait,W=s.w,Hh=s.h;
 const L=P?[[-.18,.06],[1.18,.06],[1.18,.33],[1.18,.58],[-.18,.58],[-.18,.3]]:[[-.08,.04],[.44,-.14],[.5,1.14],[.34,1.16],[-.08,.98],[-.1,.45]];
 return {x:L[k][0]*W,y:L[k][1]*Hh};
}
function drawFlyers(ctx,s,D,toScreen){
 const T=s.T,dur=.42;
 for(let k=0;k<6;k++){
  const t0=LOCKS[k]-dur;if(T<t0||T>=LOCKS[k])continue;
  const st=flyStart(s,k),sp=sockPos(D,k),end=toScreen(sp.x,sp.y);
  const mx=(st.x+end.x)/2,my=(st.y+end.y)/2,nx=-(end.y-st.y),ny=end.x-st.x,cv=(k%2?.22:-.22);
  const cx=mx+nx*cv,cy=my+ny*cv;
  const at=x=>{const e=x*x;const a=(1-e)*(1-e),b=2*(1-e)*e,c=e*e;return {x:a*st.x+b*cx+c*end.x,y:a*st.y+b*cy+c*end.y};};
  const x=clamp((T-t0)/dur);
  // trail
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
  for(let i=0;i<10;i++){const xa=Math.max(0,x-i*.035),xb=Math.max(0,x-(i+1)*.035);if(xa<=0)break;const pa=at(xa),pb=at(xb);ctx.strokeStyle=hexA(i<3?PAL.hot:PAL.gold,.75*(1-i/10));ctx.lineWidth=D.w*.06*(1-i/10);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();}
  ctx.restore();
  const p=at(x),size=D.w*.075*1.25*lerp(1.9,1.45,x);
  for(let i=3;i>=1;i--){const q=at(Math.max(0,x-i*.06));H.emoji(ctx,LESSONS[k].icon,q.x,q.y,size*(1-i*.1),{alpha:.18});}
  H.glow(ctx,p.x,p.y,size*1.1,PAL.gold,.55);
  H.emoji(ctx,LESSONS[k].icon,p.x,p.y,size,{rot:(1-x)*(k%2?-1:1)*1.4});
 }
}

TR.defineScene({id:'s11_secret',start:S0,end:52,draw(ctx,s){
 const T=s.T;
 if(T>=CUT){ctx.fillStyle='#000';ctx.fillRect(0,0,s.w,s.h);return;}// hard cut: nothing moves until 52.0
 const G=geo(s),D=G.door,rd=s.reduced?.3:1;
 // camera
 const C={x:G.card.x+G.card.w/2,y:G.card.y+G.card.h/2},L={x:G.r7.lx,y:G.r7.ly};
 let F,Fs,z;
 if(T<ROW7){F=C;Fs=C;z=1+.03*E.inOutSine((T-S0)/(ROW7-S0))+.012*rd*heart(T);}
 else if(T<DIVE0){const e=E.inOutSine((T-ROW7)/.5);F={x:lerp(C.x,L.x,e),y:lerp(C.y,L.y,e)};Fs=F;z=1.03+.05*e+.012*rd*heart(T);}
 else{const e=E.inOutCubic((T-DIVE0)/1);F=L;Fs={x:lerp(L.x,D.kx,e),y:lerp(L.y,D.ky,e)};z=1.08+4.92*rd*E.inCubic((T-DIVE0)/1);}
 const diveP=clamp((T-DIVE0)/1);
 backdrop(ctx,s,E.inCubic(diveP)*4*rd+(T>DIVE1?4*rd:0));
 // WORLD 1: card + row 7 (fades out through the dive)
 const worldA=1-E.inOutSine((T-47.62)/.36);
 if(worldA>0){
  ctx.save();ctx.translate(Fs.x,Fs.y);ctx.scale(z,z);ctx.translate(-F.x,-F.y);
  ctx.globalAlpha=worldA;
  const dim=clamp((T-ROW7)/.5)*.9;
  drawCard(ctx,s,G,dim);
  drawRow7(ctx,s,G,T>=ROW7?E.outCubic((T-ROW7)/.4):0);
  ctx.restore();
 }
 // dive tunnel: speed lines + darkening at the edges
 if(T>=DIVE0&&T<DIVE1+.25&&!s.reduced){const k=Math.sin(clamp((T-DIVE0)/1.25)*Math.PI);tunnelLines(ctx,s,Fs.x,Fs.y,.45*k,capRect(s));}
 // the row dissolves: a local rose flare at the dive point (not full-screen)
 {const a=env(T,47.55,48.15,.2,.4);if(a>0){H.glow(ctx,Fs.x,Fs.y,Math.min(s.w,s.h)*.45,ROSE,.55*a);H.glow(ctx,Fs.x,Fs.y,Math.min(s.w,s.h)*.18,PAL.hot,.6*a);}}
 // WORLD 2: the door
 const dA=E.outCubic((T-47.68)/.4);
 if(dA>0){
  const arrive=E.outCubic((T-47.68)/.62);
  let dz=lerp(.72,1,arrive);
  dz*=1+.035*E.inOutSine((T-DIVE1)/2.5)+.16*rd*E.inOutSine((T-IGNITE)/1);
  // the glimpse: a hard push into the keyhole (16:9 keeps the door left of the x58% text column)
  dz*=1+(s.portrait?.62:.3)*rd*E.outCubic((T-JOLT)/.45);
  ctx.save();
  // micro shake on each lock and on the jolt (world only)
  let sh=0;for(const t of LOCKS){const a=T-t;if(a>=0&&a<.25)sh=Math.max(sh,.45*(1-a/.25));}
  {const a=T-JOLT;if(a>=0&&a<.3)sh=Math.max(sh,.6*(1-a/.3));}
  H.shake(ctx,s,sh);
  ctx.translate(D.kx,D.ky);ctx.scale(dz,dz);ctx.globalAlpha=dA;
  drawDoor(ctx,s,D,T);
  ctx.restore();
  // flyers travel in screen space toward the (zoomed) socket positions
  const toScreen=(x,y)=>({x:D.kx+x*dz,y:D.ky+y*dz});
  ctx.save();ctx.globalAlpha=dA;drawFlyers(ctx,s,D,toScreen);ctx.restore();
 }
 H.vignette(ctx,s,.7);
 // fade up from the iris-dark of s10
 const fade=1-E.outCubic((T-S0)/.45);if(fade>0){ctx.fillStyle=`rgba(0,0,0,${fade})`;ctx.fillRect(0,0,s.w,s.h);}
 // TEXT — whisper style, never moves with the camera
 // 16:9: no chip — in the 37%W column it would force the headline below the 85% size floor and the
 // headline's wipe band would shave the chip ring. 9:16 keeps the 🔒 chip (it fits there).
 const whisper=o=>{ctx.save();H.caption(ctx,s,Object.assign({layout:'column',chip:s.portrait?'🔒':null,color:'rgba(244,236,216,.92)',glow:'rgba(242,160,123,.4)'},o));ctx.restore();};
 whisper({text:'ครบ 6 บท… ยังไม่จบ',sub:'มีด่านลับ ที่ไม่อยู่ในสารบัญ',in:44.8,out:48.15,accent:'ยังไม่จบ'});
 whisper({text:'ข้างในมีอะไร… ไปเห็นเอง',sub:'ไปให้ถึง แล้วรับตรา 🌅 ผู้ตื่นรู้',in:48.25,out:51.5,accent:'ไม่บอก'});
}});
})();
