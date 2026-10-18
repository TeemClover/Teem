/* s03_title (7–10 s) + s04_source (10–14 s).
   s03: the jar from s02 bursts into the title "AI ใส่ซอส", six lesson coins orbit behind the text, the 🫙 coin
   breaks out and flies into the lens while the others drop into the HUD as ghosts.
   s04: Lesson 1 SOURCE. Story bubbles, a file and an old chat pour through a gold funnel into the jar,
   a Markdown card rises out, rolls on as the label, a wax seal stamps it and a copy flies into HUD slot 1.
   WORLD layers take every push / shake / whip; the title, the sub and captions never shake. */
(function(){
'use strict';
const TR=window.MC_TRAILER,H=TR.H;
const {E,PAL,clamp,lerp,TAU,rng,hexA}=H;
const TITLE='AI ใส่ซอส',SUB='6 บท 6 ภารกิจ ได้ของจริงทุกบท',SUB_ACC='ของจริง';
const T_IN=7,T_OUT=10.1;
const ICONS=H.LESSONS.map(l=>l.icon);
const prog=(a,b,x)=>clamp((x-a)/(b-a));
const bez=(a,b,c,k)=>(1-k)*(1-k)*a+2*(1-k)*k*b+k*k*c;
const red=(s,v)=>s.reduced?v*.3:v;

/* ── small drawing helpers ─────────────────────────────── */
function scrim(ctx,cx,cy,rx,ry,a){if(a<=0||rx<=0)return;ctx.save();ctx.globalAlpha=a;ctx.translate(cx,cy);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,'rgba(6,23,15,.66)');g.addColorStop(.7,'rgba(6,23,15,.4)');g.addColorStop(1,'rgba(6,23,15,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();ctx.restore();}
function eglow(ctx,x,y,rx,ry,color,a){if(rx<=0||a<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);H.glow(ctx,0,0,rx,color,a);ctx.restore();}
// Horizontal (or vertical) whip streaks in screen space. dir -1 = streaks travel left.
function whipLines(ctx,s,k,seed,o={}){
 if(k<=0)return;const r=rng(seed),n=o.count||24,vert=!!o.vertical,dir=o.dir||-1,span=vert?s.h:s.w,cross=vert?s.w:s.h;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 for(let i=0;i<n;i++){const c=r()*cross,len=span*(.12+r()*.3)*(.4+.6*k),ph=(r()+s.T*(2.2+r()*2))%1;const p=dir<0?span*(1.15-ph*1.4):span*(-.15+ph*1.4);
  ctx.globalAlpha=k*(.18+r()*.4);ctx.strokeStyle=i%3?PAL.hot:PAL.cream;ctx.lineWidth=Math.max(1,s.u*(.15+r()*.35));ctx.beginPath();
  if(vert){ctx.moveTo(c,p);ctx.lineTo(c,p-dir*len);}else{ctx.moveTo(p,c);ctx.lineTo(p-dir*len,c);}ctx.stroke();}
 ctx.restore();
}
function coin(ctx,x,y,r,icon,a,o={}){
 if(r<=0||a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);if(o.sx!=null)ctx.scale(o.sx,1);
 const da=o.discA??1;
 if(da>0){ctx.save();ctx.globalAlpha*=da;const g=ctx.createRadialGradient(-r*.3,-r*.35,r*.1,0,0,r);g.addColorStop(0,'#21603d');g.addColorStop(1,PAL.deep);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
  ctx.lineWidth=Math.max(1.5,r*.13);ctx.strokeStyle=PAL.gold;ctx.stroke();ctx.lineWidth=Math.max(1,r*.04);ctx.strokeStyle=hexA(PAL.hot,.55);ctx.beginPath();ctx.arc(0,0,r*.78,0,TAU);ctx.stroke();
  ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.ellipse(-r*.18,-r*.45,r*.55,r*.26,-.3,0,TAU);ctx.fill();ctx.restore();}
 const ea=o.emojiA??1;if(ea>0)H.emoji(ctx,icon,0,r*.03,r*1.02,{alpha:ea});
 ctx.restore();
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
// Cream Markdown card: the Markdown mark and six bars that type themselves in from t0.
const BW=[.5,.92,.78,.88,.64,.8];
function mdCard(ctx,x,y,w,h,T,t0,o={}){
 ctx.save();ctx.translate(x,y);if(o.sx!=null)ctx.scale(o.sx,1);ctx.globalAlpha*=o.a??1;
 H.card(ctx,-w/2,-h/2,w,h,{fill:PAL.cream,r:h*.09,shadow:o.shadow===false?null:'rgba(0,0,0,.4)',blur:h*.25,offY:h*.06});
 ctx.fillStyle=PAL.gold;ctx.fillRect(-w/2+h*.12,-h/2,w-h*.24,Math.max(1.5,h*.035));
 mdMark(ctx,-w/2+h*.3,-h/2+h*.2,h*.16,PAL.deep,Math.max(1.2,h*.03));
 const bx=-w/2+h*.13,bmax=w-h*.26;
 for(let i=0;i<6;i++){const p=o.full?1:E.outCubic(prog(t0+i*.0625,t0+i*.0625+.07,T));if(p<=0)break;const by=-h/2+h*(.4+i*.088),bh=h*.045;ctx.fillStyle=i===0?PAL.gold:hexA(PAL.deep,i%2?.5:.38);H.rr(ctx,bx,by,bmax*BW[i]*p*(i===0?.7:1),bh,bh/2);ctx.fill();
  if(!o.full&&p<1){ctx.fillStyle=PAL.leaf;ctx.fillRect(bx+bmax*BW[i]*p*(i===0?.7:1)+h*.02,by-bh*.4,Math.max(1,h*.012),bh*1.8);}}
 ctx.restore();
}

/* ═════════════ s03_title ═════════════ */
function g03(s){const P=s.portrait;return{P,bx:s.cx,by:s.h*(P?.34:.40),tx:s.cx,ty:s.h*(P?.40:.44),size:s.u*(P?15.5:17.5),maxW:s.w*(P?.86:.78),subY:s.h*(P?.48:.57),ox:s.cx,oy:s.h*(P?.43:.505),rx:s.w*(P?.42:.37),ry:s.h*(P?.125:.175),cr:s.u*(P?4.4:4.3)};}
function metrics(ctx,s,g){
 const font=H.FONT.head,size=H.fit(ctx,TITLE,font,800,g.size,g.maxW);ctx.font=`800 ${size}px ${font}`;
 const W=ctx.measureText(TITLE).width,pre=ctx.measureText('AI ใส่').width,zw=ctx.measureText('ซ').width;
 const sf=H.FONT.round,subSize=H.fit(ctx,SUB,sf,600,s.type.sub,s.w*(g.P?.86:.7));ctx.font=`600 ${subSize}px ${sf}`;const SW=ctx.measureText(SUB).width;
 return{size,W,pre,zw,subSize,SW};
}
function titleAlpha(T){const t=T-T_IN;if(t<0||T>T_OUT)return 0;return Math.min(clamp(t/.06),E.inOutSine(clamp((T_OUT-T)/.3)));}
function drawTitle(ctx,s,g,m,T){
 const t=T-T_IN,alpha=titleAlpha(T);if(alpha<=0)return;
 const kout=clamp((T_OUT-T)/.3),sc=s.reduced?lerp(1.2,1,E.outCubic(clamp(t/.3))):lerp(2.2,1,E.outBack(clamp(t/.3)));
 const {size,W}=m,font=H.FONT.head;
 ctx.save();ctx.translate(g.tx,g.ty-(1-kout)*8);ctx.scale(sc,sc);ctx.globalAlpha=alpha;
 eglow(ctx,0,0,W*.66,size*.95,PAL.gold,.32+.3*Math.max(0,1-t/.5)+.06*Math.sin(T*5.2));
 ctx.font=`800 ${size}px ${font}`;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#3d2906';ctx.fillText(TITLE,0,size*.085);
 ctx.fillStyle='#8a6420';ctx.fillText(TITLE,0,size*.045);
 const gr=ctx.createLinearGradient(0,-size*.5,0,size*.42);gr.addColorStop(0,'#fffaf0');gr.addColorStop(.4,PAL.cream);gr.addColorStop(.66,PAL.hot);gr.addColorStop(1,'#d9a648');
 ctx.fillStyle=gr;ctx.fillText(TITLE,0,0);
 for(const [s0,dur] of [[7.32,.5],[8.62,.6],[9.3,.5]]){const k=(T-s0)/dur;if(k>0&&k<1){const x=lerp(-W*.8,W*.8,E.inOutSine(k));const sg=ctx.createLinearGradient(x-size*.7,-size*.3,x+size*.7,size*.3);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,250,230,.8)');sg.addColorStop(1,'rgba(255,255,255,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=sg;ctx.fillText(TITLE,0,0);ctx.restore();}}
 if(t<.12&&!s.reduced){const k=1-t/.12;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha*.6*k;ctx.fillStyle=PAL.gold;ctx.fillText(TITLE,-size*.1*k,-size*.02*k);ctx.fillStyle=PAL.cream;ctx.fillText(TITLE,size*.1*k,size*.03*k);ctx.restore();}
 ctx.restore();
 // sauce drip from the base of ซ (fixed to the title position, never moves a letter)
 const kd=E.outCubic(prog(7.5,8.3,T));if(kd>0){
  const x=g.tx-W/2+m.pre+m.zw*.42,y0=g.ty-(1-kout)*8+size*.3,L=size*(g.P?.2:.26)*kd,sway=Math.sin(T*2.6)*size*.01*kd,r=size*.05*(.55+.45*kd)*(1+.08*Math.sin((T-8.3)*9)*Math.exp(-Math.max(0,T-8.3)*3)),nw=size*.04;
  ctx.save();ctx.globalAlpha=alpha;const dg=ctx.createLinearGradient(0,y0,0,y0+L+r);dg.addColorStop(0,'#d9a648');dg.addColorStop(1,PAL.hot);ctx.fillStyle=dg;
  ctx.beginPath();ctx.moveTo(x-nw*1.4,y0-size*.04);ctx.quadraticCurveTo(x-nw*.3,y0+L*.45,x+sway-r,y0+L);ctx.arc(x+sway,y0+L,r,Math.PI,0,true);ctx.quadraticCurveTo(x+nw*.3,y0+L*.45,x+nw*1.4,y0-size*.04);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,252,240,.75)';ctx.beginPath();ctx.ellipse(x+sway-r*.32,y0+L-r*.25,r*.22,r*.32,-.4,0,TAU);ctx.fill();ctx.restore();}
}
function drawSub(ctx,s,g,m,T){
 const ki=E.outCubic(clamp((T-T_IN-.05)/.3)),kout=clamp((T_OUT-T)/.3),a=Math.min(ki,E.inOutSine(kout))*.94;if(a<=0)return;
 const y=g.subY+(1-ki)*16-(1-kout)*8,size=m.subSize;
 ctx.save();ctx.globalAlpha=a;const band=size*1.8;ctx.beginPath();ctx.rect(0,y-band/2+(1-ki)*band*.6,s.w,band);ctx.clip();
 ctx.font=`600 ${size}px ${H.FONT.round}`;ctx.textBaseline='middle';ctx.textAlign='left';
 const i=SUB.indexOf(SUB_ACC);let x=g.tx-m.SW/2;
 for(const [p,c] of [[SUB.slice(0,i),PAL.cream],[SUB_ACC,PAL.hot],[SUB.slice(i+SUB_ACC.length),PAL.cream]]){if(!p)continue;ctx.fillStyle=c;ctx.fillText(p,x,y);x+=ctx.measureText(p).width;}
 ctx.restore();
}
function drawTextBlock(ctx,s,T){
 const g=g03(s),m=metrics(ctx,s,g),a=titleAlpha(T);
 scrim(ctx,g.tx,(g.ty+g.subY)/2,Math.max(m.W,m.SW)*.62+s.u*6,(g.subY-g.ty)/2+m.size*.95,a);
 drawTitle(ctx,s,g,m,T);drawSub(ctx,s,g,m,T);
 return {g,m};
}

// seeded particle tables
const SHARDS=(()=>{const r=rng(709);return Array.from({length:16},()=>({a:r()*TAU,v:.5+r()*.9,spin:(r()-.5)*14,sz:.8+r()*1.5,p:[[.5+r()*.5,0],[-(r()*.5+.3),r()*.6+.25],[-(r()*.4+.2),-(r()*.6+.3)]]}));})();
const DROPS=(()=>{const r=rng(707);return Array.from({length:24},(_,i)=>({a:i/24*TAU+(r()-.5)*.3,v:.55+r()*.65,sz:.7+r()*.7}));})();
const BOKEH=(()=>{const r=rng(711);return Array.from({length:10},()=>({x:r(),y:r(),r:.08+r()*.14,z:.3+r()*.9,c:r()<.7?PAL.gold:PAL.leaf,a:.08+r()*.12,ph:r()*TAU}));})();
const RADIAL=(()=>{const r=rng(713);return Array.from({length:60},()=>({a:r()*TAU,ph:r(),len:.05+r()*.1,w:.6+r()*1.6}));})();

function drops(ctx,s,x0,y0,t){
 if(t<0||t>1.9)return;ctx.save();
 for(const d of DROPS){const v=d.v*s.u*75,dr=2.4,f=(1-Math.exp(-dr*t))/dr,vx=Math.cos(d.a)*v,vy=Math.sin(d.a)*v-s.u*12,gy=s.u*70;
  const x=x0+vx*f,y=y0+vy*f+.5*gy*t*t,ex=Math.exp(-dr*t),cvx=vx*ex,cvy=vy*ex+gy*t,ang=Math.atan2(cvy,cvx),sp=Math.hypot(cvx,cvy);
  const r=s.u*.75*d.sz,len=r*(1.8+Math.min(3.2,sp/(s.u*22)));ctx.globalAlpha=1-clamp((t-1.1)/.8);
  ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.beginPath();ctx.moveTo(-len,0);ctx.quadraticCurveTo(-r*.7,-r,0,-r);ctx.arc(0,0,r,-Math.PI/2,Math.PI/2);ctx.quadraticCurveTo(-r*.7,r,-len,0);
  ctx.fillStyle='#e9a83c';ctx.fill();ctx.fillStyle='rgba(255,246,214,.85)';ctx.beginPath();ctx.arc(r*.15,-r*.38,r*.3,0,TAU);ctx.fill();ctx.restore();}
 ctx.restore();
}
function shards(ctx,s,x0,y0,t){
 if(t<0||t>1.3)return;ctx.save();
 for(const d of SHARDS){const v=d.v*s.u*90,dr=3,f=(1-Math.exp(-dr*t))/dr;const x=x0+Math.cos(d.a)*v*f,y=y0+Math.sin(d.a)*v*f+.5*s.u*50*t*t,k=s.u*1.6*d.sz;
  ctx.save();ctx.globalAlpha=(1-t/1.3)*.9;ctx.translate(x,y);ctx.rotate(d.spin*t+d.a);ctx.beginPath();ctx.moveTo(d.p[0][0]*k,d.p[0][1]*k);ctx.lineTo(d.p[1][0]*k,d.p[1][1]*k);ctx.lineTo(d.p[2][0]*k,d.p[2][1]*k);ctx.closePath();
  ctx.fillStyle='rgba(244,236,216,.28)';ctx.fill();ctx.lineWidth=Math.max(1,s.u*.12);ctx.strokeStyle='rgba(255,255,255,.75)';ctx.stroke();ctx.restore();}
 ctx.restore();
}
function world03(ctx,s,g,T){
 const t=T-7,R=Math.hypot(s.w,s.h)*.5;
 floor03(ctx,s,g,T);
 // bokeh (parallax: deeper ones move less)
 for(const b of BOKEH){const x=b.x*s.w+Math.sin(T*.4+b.ph)*s.u*3*b.z-(T-7)*s.u*2*b.z,y=b.y*s.h+Math.cos(T*.3+b.ph)*s.u*2*b.z;H.glow(ctx,x,y,b.r*Math.max(s.w,s.h)*.5,b.c,b.a*clamp(t/.4));}
 H.rays(ctx,g.bx,g.by,R*1.5,12,T*.14,PAL.gold,.11*clamp(t/.25));
 // 60 radial gold speed lines, rotating
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.hot;ctx.lineCap='round';
 const boost=1+2.2*Math.max(0,1-t/.5);
 for(const L of RADIAL){const a=L.a+T*.22,ph=(L.ph+T*.55)%1,r0=R*(.16+ph*.95),len=R*L.len*boost;ctx.globalAlpha=Math.min(.5,.1*boost)*Math.sin(ph*Math.PI);ctx.lineWidth=L.w*s.u*.12;
  ctx.beginPath();ctx.moveTo(g.bx+Math.cos(a)*r0,g.by+Math.sin(a)*r0);ctx.lineTo(g.bx+Math.cos(a)*(r0+len),g.by+Math.sin(a)*(r0+len));ctx.stroke();}
 ctx.restore();
 // the burst: bloom, shockwave rings, 320 sparks, glass shards, sauce teardrops
 if(t<.9)H.glow(ctx,g.bx,g.by,s.u*34,PAL.hot,.9*(1-t/.9));
 for(const [d,mul] of [[0,1],[.08,.7]]){const k=(t-d)/.55;if(k>0&&k<1){ctx.save();ctx.globalAlpha=(1-k)*.85;ctx.strokeStyle=d?PAL.cream:PAL.hot;ctx.lineWidth=s.u*(1.1-k)*mul;ctx.beginPath();ctx.arc(g.bx,g.by,s.u*60*E.outCubic(k)*mul,0,TAU);ctx.stroke();ctx.restore();}}
 H.burst(ctx,T,7,{x:g.bx,y:g.by,count:320,seed:703,speed:s.u*92,life:1.3,gravity:s.u*38,size:s.u*.55,colors:[PAL.hot,PAL.gold,PAL.cream,'#f0b44c']});
 shards(ctx,s,g.bx,g.by,t);
 drops(ctx,s,g.bx,g.by,t);
 H.dust(ctx,s,{count:36,seed:73,alpha:.5,size:s.u*.28,speed:s.u*2});
}
const MOTES=(()=>{const r=rng(717);return Array.from({length:14},()=>({x:(r()-.5),per:.75+r()*.6,ph:r(),sz:.6+r()*.7,y0:r()}));})();
function floor03(ctx,s,g,T){
 const t=T-7,P=g.P,fy=s.h*(P?.7:.875),inK=E.outCubic(clamp((t-.15)/.6)),st=P?1:.6;if(inK<=0)return;
 const pulse=1+.08*Math.sin(T*3.1);
 eglow(ctx,s.cx,fy,s.w*(P?.62:.5),s.h*(P?.07:.05),PAL.gold,.42*inK*st*pulse);
 eglow(ctx,s.cx,fy,s.w*(P?.3:.2),s.h*(P?.022:.02),PAL.hot,.55*inK*st);
 eglow(ctx,s.cx,fy+s.h*.08,s.w*.7,s.h*.12,'#1f5a3a',.6*inK);
 ctx.save();ctx.beginPath();ctx.rect(0,fy,s.w,s.h-fy);ctx.clip();
 const fg=ctx.createLinearGradient(0,fy,0,s.h);fg.addColorStop(0,hexA(PAL.gold,.16*inK*st));fg.addColorStop(.5,hexA(PAL.gold,.04*inK*st));fg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=fg;ctx.fillRect(0,fy,s.w,s.h-fy);
 ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.gold;ctx.lineWidth=Math.max(1,s.u*.1);const D=s.h-fy;
 ctx.globalAlpha=.16*inK*st;ctx.beginPath();for(let i=-7;i<=7;i++){ctx.moveTo(s.cx+i*s.w*.035,fy);ctx.lineTo(s.cx+i*s.w*.35,s.h);}ctx.stroke();
 for(let j=0;j<6;j++){const q=((j+T*.9)%6)/6,yy=fy+D*q*q;ctx.globalAlpha=.22*inK*st*q;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(s.w,yy);ctx.stroke();}
 ctx.restore();
 // reflected sauce pool glow
 eglow(ctx,s.cx,fy+D*.18,s.w*(P?.34:.24),D*.2,PAL.hot,.2*inK*st);
 // horizon line of light
 ctx.save();ctx.globalCompositeOperation='lighter';const lg=ctx.createLinearGradient(s.cx-s.w*.48,0,s.cx+s.w*.48,0);lg.addColorStop(0,'rgba(246,220,154,0)');lg.addColorStop(.5,'rgba(246,220,154,.55)');lg.addColorStop(1,'rgba(246,220,154,0)');
 ctx.globalAlpha=inK*st;ctx.fillStyle=lg;ctx.fillRect(s.cx-s.w*.48,fy-Math.max(1,s.u*.12),s.w*.96,Math.max(1.5,s.u*.24));ctx.restore();
 // drip motes falling from the orbit into the pool, ripples where they land (until 9.5)
 const ma=inK*(1-prog(9.25,9.6,T));if(ma<=0)return;
 const ytop=g.oy+g.ry*.6,span=fy-ytop;ctx.save();
 for(const m of MOTES){const tt=T-7.6-m.ph*m.per;if(tt<0)continue;const q=(tt/m.per)%1,cyc=Math.floor(tt/m.per),x=s.cx+(m.x+.13*Math.sin(cyc*2.3+m.ph*9))*s.w*(P?.62:.5)*.9;
  const fall=Math.min(1,q/.7),y=ytop+span*fall*fall,r=s.u*.42*m.sz;
  if(q<.7){ctx.globalAlpha=ma*Math.min(1,q*6);ctx.fillStyle='#f0b44c';ctx.beginPath();ctx.moveTo(x,y-r*3.2);ctx.quadraticCurveTo(x+r*.9,y-r*.4,x,y+r);ctx.quadraticCurveTo(x-r*.9,y-r*.4,x,y-r*3.2);ctx.fill();ctx.fillStyle='rgba(255,246,214,.8)';ctx.beginPath();ctx.arc(x-r*.25,y-r*.2,r*.28,0,TAU);ctx.fill();}
  else{const rk=(q-.7)/.3;ctx.globalAlpha=ma*(1-rk)*.8;ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1,s.u*.14);ctx.beginPath();ctx.ellipse(x,fy,s.u*(.6+4.5*rk)*m.sz,s.u*(.18+1*rk)*m.sz,0,0,TAU);ctx.stroke();H.glow(ctx,x,fy,s.u*3*m.sz,PAL.hot,.5*(1-rk)*ma);}}
 ctx.restore();
}
function orbitPos(g,i,T){const th=-Math.PI/2+i*TAU/6+(T-7.5)*TAU/3.5;return{x:g.ox+Math.cos(th)*g.rx,y:g.oy+Math.sin(th)*g.ry,d:Math.sin(th)};}
function drawCoins(ctx,s,g,m,T,push){
 if(T<7.5)return;
 const halfW=Math.max(m.W,m.SW)/2+s.u*2,top=g.ty-m.size*.72,bot=g.subY+m.subSize*.9;
 const list=[];
 for(let i=0;i<6;i++){
  const pop=7.5+i*.125,kp=E.outBack(clamp((T-pop)/.25));if(kp<=0)continue;
  if(T>=9.5)continue;
  const p=orbitPos(g,i,T),x=g.tx+(p.x-g.tx)*push,y=g.ty+(p.y-g.ty)*push;
  const dx=Math.abs(x-g.tx)-halfW,dy=Math.max(top-y,y-bot),out=clamp(Math.max(dx,dy)/(g.cr*1.4)+.3);
  list.push({i,x,y,d:p.d,kp,a:(.3+.7*out)*(.75+.25*(p.d+1)/2)});
 }
 list.sort((a,b)=>a.d-b.d);
 for(const c of list){const r=g.cr*(.84+.16*(c.d+1)/2)*c.kp;if(T-7.5-c.i*.125<.3)H.glow(ctx,c.x,c.y,r*3,PAL.hot,.5*(1-(T-7.5-c.i*.125)/.3));coin(ctx,c.x,c.y,r,ICONS[c.i],c.a);}
}
// 9.5–10.0: five coins snap into a row and fly up into HUD slots 2–6 as ghosts; the 🫙 coin flies at the lens.
function drawCoinExit(ctx,s,g,T,push,lens){
 if(T<9.5)return;
 const rowY=s.h*(g.P?.2:.24),sp=g.cr*2.7;
 if(!lens){
  for(let i=1;i<6;i++){
   const p=orbitPos(g,i,9.5),x0=g.tx+(p.x-g.tx)*push,y0=g.ty+(p.y-g.ty)*push;
   const rx=g.tx+(i-3)*sp,ry=rowY;const ka=E.outCubic(prog(9.5,9.6,T));const st=9.6+(i-1)*.03,kb=E.inOutCubic(prog(st,st+.24,T));
   const slot=TR.hudRect(s,i);let x=lerp(x0,rx,ka),y=lerp(y0,ry,ka);
   x=bez(x,lerp(x,slot.x,.4)+(slot.x-x)*.1,slot.x,kb);y=bez(y,y-s.u*4,slot.y,kb);
   const r=lerp(g.cr,slot.size*.32,kb),fade=1-prog(st+.24,st+.36,T);if(fade<=0)continue;
   if(kb>0&&kb<1)H.glow(ctx,x,y,r*2.4,PAL.gold,.35*Math.sin(kb*Math.PI));
   coin(ctx,x,y,r,ICONS[i],fade,{discA:1-kb*.9,emojiA:lerp(1,.35,kb)});
  }
  return;
 }
 const k=prog(9.5,10,T),p=orbitPos(g,0,9.5),x0=g.tx+(p.x-g.tx)*push,y0=g.ty+(p.y-g.ty)*push;
 const tx=s.w*(g.P?.46:.34),ty=s.h*(g.P?.76:.8),q=E.inOutCubic(k),x=bez(x0,lerp(x0,tx,.5),tx,q),y=bez(y0,Math.min(y0,ty)-s.u*6,ty,q);
 const r=g.cr*(1+(s.reduced?14:44)*E.inExpo(k));
 const warm=E.outCubic(prog(9.5,9.62,T)),keep=1-clamp((r-s.u*40)/(s.u*30)),big=1-clamp((r-s.u*24)/(s.u*40));
 H.glow(ctx,x,y,r*(2.2+1*(1-k)),PAL.hot,(.42+.25*k)*big);
 coin(ctx,x,y,r,ICONS[0],1,{emojiA:(1-warm)*keep,rot:-k*.6});
 jarInCoin(ctx,s,x,y,r,T,-k*.6,warm*keep,big);
}
// warm hero inside a coin: gold glow, the vector jar full of sauce, a hot rim light
function jarInCoin(ctx,s,x,y,r,T,rot,ja,rim){
 if(ja<=0||r<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);
 ctx.save();ctx.beginPath();ctx.arc(0,0,r*.9,0,TAU);ctx.clip();H.glow(ctx,0,r*.2,r*.95,PAL.gold,.55*ja);ctx.restore();
 ctx.globalAlpha*=ja;const S=r*1.2;jarV(ctx,s,0,S*.07,S,T,{fill:.74,slosh:Math.sin(T*7)*.5,lid:1});
 ctx.globalCompositeOperation='lighter';ctx.lineWidth=Math.max(1,r*.05);ctx.strokeStyle=hexA(PAL.hot,.7*rim);ctx.beginPath();ctx.arc(0,0,r*.86,-2.7,-.5);ctx.stroke();
 ctx.restore();
}
TR.defineScene({id:'s03_title',start:7,end:10,draw(ctx,s){
 const T=s.T,t=s.t,g=g03(s);
 // background
 ctx.fillStyle=PAL.void;ctx.fillRect(0,0,s.w,s.h);
 const bgg=H.radial(ctx,g.bx,g.by,Math.max(s.w,s.h)*.85,'#164a30',PAL.void);ctx.fillStyle=bgg;ctx.fillRect(0,0,s.w,s.h);
 // WORLD: whip, push, shake
 const push=1+.06*E.inOutSine(prog(7,9.5,T)),whip=E.inCubic(prog(9.5,10,T));
 const drawW=(dx,a)=>{ctx.save();ctx.globalAlpha=a;ctx.translate(-red(s,s.w*.42)*whip+dx,0);
  ctx.translate(g.tx,g.ty);ctx.scale(push,push);ctx.translate(-g.tx,-g.ty);
  if(t<.35)H.shake(ctx,s,1.1*(1-t/.35));
  world03(ctx,s,g,T);ctx.restore();};
 // motion-blur smear trailing the whip (matches s04's whip-in)
 if(whip>.04&&!s.reduced)drawW(s.w*.06*Math.min(1,whip*2.5),.28);
 drawW(0,1);
 H.vignette(ctx,s,.55);
 whipLines(ctx,s,whip*1.2,903,{count:24,dir:-1});
 // TEXT layer (never shakes)
 const g2=g03(s),m=metrics(ctx,s,g2);
 drawCoins(ctx,s,g2,m,T,push);
 drawCoinExit(ctx,s,g2,T,push,false);
 drawCoinExit(ctx,s,g2,T,push,true);
 // TEXT stays the top layer: it fades 9.8→10.1 over the lens coin and across the cut
 drawTextBlock(ctx,s,T);
 if(t<.15)H.flash(ctx,s,.7*(1-t/.15),'#fff4d8');
}});

/* ═════════════ s04_source ═════════════ */
const LANDS=[10.5,11,11.5];
function g04(s){const P=s.portrait;const K=(P?Math.min(s.w*.9,s.h*.48)/100:Math.min(s.w*.56,s.h*.8)/100)*1.18;const hx=P?s.cx:s.w*.3,hy=s.h*(P?.36:.54);const S=40*K,jx=hx,jy=hy+(P?5:6)*K,mouthY=jy-S*.47;
 return{P,K,hx,hy,S,jx,jy,mouthY,fy0:mouthY-16*K,cw:30*K,ch:20*K,cardY:jy-S*.6-(P?10:14)*K};}
const fillAt=T=>.06+LANDS.reduce((a,L)=>a+.26*E.outBack(prog(L+.12,L+.47,T)),0);
const sloshAt=T=>LANDS.reduce((a,L)=>{const d=T-L-.12;return d>0?a+Math.exp(-d*4.5)*Math.sin(d*17):a;},0);
// Vector jar. o: fill, slosh, lid (0..1 pop), label (0/1), seal (stamp progress), sx (flip), sq (squash)
function jarV(ctx,s,x,y,S,T,o){
 const w=S*.62,bx=-w/2,by=-S*.4,bw=w,bh=S*.86,br=S*.14;
 ctx.save();ctx.translate(x,y+S*.46);if(o.sq)ctx.scale(1+o.sq,1-o.sq);ctx.translate(0,-S*.46);if(o.sx!=null)ctx.scale(o.sx,1);
 H.rr(ctx,bx,by,bw,bh,br);ctx.fillStyle='rgba(244,236,216,.07)';ctx.fill();
 // sauce
 const f=clamp(o.fill??0),amp=S*(.012+.035*Math.min(1,Math.abs(o.slosh||0))),tilt=(o.slosh||0)*S*.05;
 if(f>0){ctx.save();H.rr(ctx,bx,by,bw,bh,br);ctx.clip();const sy=by+bh-bh*.96*f;
  const lg=ctx.createLinearGradient(0,sy,0,by+bh);lg.addColorStop(0,PAL.hot);lg.addColorStop(.25,'#f0b44c');lg.addColorStop(1,'#a8571a');ctx.fillStyle=lg;
  ctx.beginPath();ctx.moveTo(bx-2,by+bh+2);for(let i=0;i<=12;i++){const xx=bx+bw*i/12;ctx.lineTo(xx,sy+Math.sin(i*.9+T*6)*amp+(xx/bw)*tilt);}ctx.lineTo(bx+bw+2,by+bh+2);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,246,214,.7)';ctx.lineWidth=Math.max(1,S*.012);ctx.beginPath();for(let i=0;i<=12;i++){const xx=bx+bw*i/12,yy=sy+Math.sin(i*.9+T*6)*amp+(xx/bw)*tilt;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();
  ctx.fillStyle='rgba(255,246,214,.55)';for(let i=0;i<7;i++){const ph=((T*.55+i*.37)%1),bxx=bx+bw*(.18+((i*.53)%1)*.64),byy=by+bh-(by+bh-sy)*ph;if(byy>sy+S*.02){ctx.beginPath();ctx.arc(bxx+Math.sin(T*4+i)*S*.01,byy,S*(.008+.006*(i%3)),0,TAU);ctx.fill();}}
  ctx.restore();}
 // glass
 H.rr(ctx,bx,by,bw,bh,br);ctx.lineWidth=Math.max(1.5,S*.018);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.2)';H.rr(ctx,bx+bw*.1,by+bh*.12,bw*.07,bh*.58,bw*.035);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.1)';H.rr(ctx,bx+bw*.82,by+bh*.2,bw*.04,bh*.35,bw*.02);ctx.fill();
 // neck rim
 H.rr(ctx,-w*.38,-S*.47,w*.76,S*.08,S*.03);ctx.fillStyle='rgba(244,236,216,.16)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=Math.max(1,S*.012);ctx.stroke();
 // lid
 const lid=o.lid||0;if(lid>0){ctx.save();ctx.translate(0,-S*.53);ctx.scale(lid,lid);const lg=ctx.createLinearGradient(-w*.42,0,w*.42,0);lg.addColorStop(0,'#8a6420');lg.addColorStop(.35,PAL.hot);lg.addColorStop(.7,PAL.gold);lg.addColorStop(1,'#7a5618');
  ctx.fillStyle=lg;H.rr(ctx,-w*.43,-S*.07,w*.86,S*.14,S*.035);ctx.fill();ctx.strokeStyle='rgba(90,62,14,.55)';ctx.lineWidth=Math.max(1,S*.008);for(let i=1;i<8;i++){const xx=-w*.43+w*.86*i/8;ctx.beginPath();ctx.moveTo(xx,-S*.05);ctx.lineTo(xx,S*.05);ctx.stroke();}ctx.restore();}
 // label
 if(o.label){const lw=w*.76,lh=S*.28,lx=-lw/2,ly=S*.12-lh/2;H.card(ctx,lx,ly,lw,lh,{fill:PAL.cream,r:S*.025});ctx.fillStyle=PAL.gold;ctx.fillRect(lx+lh*.1,ly,lw-lh*.2,Math.max(1,lh*.035));
  mdMark(ctx,lx+lh*.33,ly+lh*.24,lh*.17,PAL.deep,Math.max(1,lh*.03));
  for(let i=0;i<4;i++){ctx.fillStyle=i===0?PAL.gold:hexA(PAL.deep,.42);H.rr(ctx,lx+lh*.12,ly+lh*(.46+i*.12),(lw-lh*.24)*BW[i]*(i===0?.7:.62),lh*.05,lh*.025);ctx.fill();}
  const sk=o.seal||0;if(sk>0){const sc=lerp(1.6,1,E.outCubic(sk));ctx.save();ctx.globalAlpha*=clamp(sk*4);seal(ctx,lx+lw*.8,ly+lh*.72,S*.085*sc);ctx.restore();}}
 // specular sweep across the glass
 if(o.sweep>0&&o.sweep<1){ctx.save();H.rr(ctx,bx,by,bw,bh,br);ctx.clip();const sx=lerp(bx-bw*.6,bx+bw*1.6,o.sweep);ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,250,230,.28)';ctx.beginPath();ctx.moveTo(sx,by);ctx.lineTo(sx+bw*.22,by);ctx.lineTo(sx-bw*.25,by+bh);ctx.lineTo(sx-bw*.47,by+bh);ctx.closePath();ctx.fill();ctx.restore();}
 ctx.restore();
}
function funnel(ctx,x,y0,K,a,sc,rot){
 if(a<=0||sc<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y0+8*K);ctx.rotate(rot||0);ctx.scale(sc,sc);ctx.translate(0,-8*K);
 const tw=13*K,nw=2.4*K,hh=11*K,sp=5.5*K;const g=ctx.createLinearGradient(-tw,0,tw,0);g.addColorStop(0,'#7a5618');g.addColorStop(.32,PAL.hot);g.addColorStop(.62,PAL.gold);g.addColorStop(1,'#6b4b12');
 ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-tw,0);ctx.lineTo(tw,0);ctx.lineTo(nw,hh);ctx.lineTo(nw,hh+sp);ctx.lineTo(-nw,hh+sp);ctx.lineTo(-nw,hh);ctx.closePath();ctx.fill();
 ctx.fillStyle='#2e2108';ctx.beginPath();ctx.ellipse(0,0,tw,tw*.22,0,0,TAU);ctx.fill();ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,K*.6);ctx.stroke();
 ctx.restore();
}
function bubbles(ctx,K){
 const sets=[[-3,-8,18,6.5],[3,-.5,16,6.5],[-1.5,7,19,6.5]];
 sets.forEach(([dx,dy,w,h],i)=>{const x=(dx-w/2)*K,y=(dy-h/2)*K;H.card(ctx,x,y,w*K,h*K,{fill:i===1?'#fff6dc':PAL.cream,r:h*K*.45,shadow:'rgba(0,0,0,.3)',blur:6*K,offY:K});
  ctx.fillStyle=i===1?'#fff6dc':PAL.cream;ctx.beginPath();const tx=i===1?x+w*K*.85:x+w*K*.15;ctx.moveTo(tx-K,y+h*K*.8);ctx.lineTo(tx+(i===1?2.5:-2.5)*K,y+h*K+2*K);ctx.lineTo(tx+(i===1?-1.8:1.8)*K,y+h*K*.85);ctx.fill();
  ctx.fillStyle=hexA(PAL.deep,.45);H.rr(ctx,x+2.2*K,y+h*K*.3,w*K*.62,h*K*.16,K*.5);ctx.fill();H.rr(ctx,x+2.2*K,y+h*K*.58,w*K*.4,h*K*.16,K*.5);ctx.fill();});
}
function paper(ctx,K){
 const w=15*K,h=19*K,x=-w/2,y=-h/2,c=4.5*K;ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=6*K;ctx.shadowOffsetY=K;
 ctx.fillStyle='#fffdf6';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w-c,y);ctx.lineTo(x+w,y+c);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath();ctx.fill();ctx.restore();
 ctx.fillStyle='#e3d8bd';ctx.beginPath();ctx.moveTo(x+w-c,y);ctx.lineTo(x+w-c,y+c);ctx.lineTo(x+w,y+c);ctx.closePath();ctx.fill();
 for(let i=0;i<5;i++){ctx.fillStyle=i===0?PAL.gold:hexA(PAL.deep,.38);H.rr(ctx,x+2.2*K,y+(6+i*2.6)*K,w*(i===0?.45:[.7,.62,.74,.5][i-1]),1.1*K,.5*K);ctx.fill();}
 ctx.strokeStyle='#9aa09a';ctx.lineWidth=Math.max(1.2,.7*K);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+3*K,y+4.5*K);ctx.lineTo(x+3*K,y-2.2*K);ctx.arc(x+4.3*K,y-2.2*K,1.3*K,Math.PI,0);ctx.lineTo(x+5.6*K,y+3.5*K);ctx.arc(x+4.75*K,y+3.5*K,.85*K,0,Math.PI);ctx.lineTo(x+3.9*K,y-1.4*K);ctx.stroke();
}
function oldChat(ctx,K){
 const w=21*K,h=15*K,x=-w/2,y=-h/2;H.card(ctx,x,y,w,h,{fill:'#4a524d',r:1.6*K,shadow:'rgba(0,0,0,.35)',blur:6*K,offY:K,stroke:'rgba(244,236,216,.35)',lw:Math.max(1,.25*K)});
 ctx.fillStyle='rgba(244,236,216,.12)';ctx.fillRect(x+.3*K,y+.3*K,w-.6*K,2.4*K);
 ctx.fillStyle='rgba(244,236,216,.4)';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+(1.6+i*1.4)*K,y+1.5*K,.45*K,0,TAU);ctx.fill();}
 ctx.fillStyle='rgba(244,236,216,.3)';H.rr(ctx,x+w*.42,y+4.2*K,w*.48,2.6*K,1.3*K);ctx.fill();H.rr(ctx,x+1.5*K,y+7.6*K,w*.44,2.6*K,1.3*K);ctx.fill();
 ctx.fillStyle='rgba(244,236,216,.22)';H.rr(ctx,x+w*.36,y+11*K,w*.54,2.6*K,1.3*K);ctx.fill();
}
function inPath(G,s,i){
 const W=s.w,Hh=s.h,P=G.P;let a,c;
 if(i===0){a=P?{x:-.22*W,y:.3*Hh}:{x:-.1*W,y:.34*Hh};c=P?{x:.12*W,y:.22*Hh}:{x:.08*W,y:.12*Hh};}
 else if(i===1){a=P?{x:.7*W,y:-.16*Hh}:{x:.42*W,y:-.2*Hh};c=P?{x:.62*W,y:.2*Hh}:{x:.44*W,y:.04*Hh};}
 else{a=P?{x:1.22*W,y:.24*Hh}:{x:-.1*W,y:1.1*Hh};c=P?{x:.92*W,y:.06*Hh}:{x:.02*W,y:.42*Hh};}
 return{a,c,b:{x:G.jx,y:G.fy0-3*G.K}};
}
const INS=[{t0:10.12,draw:bubbles},{t0:10.62,draw:paper},{t0:11.08,draw:oldChat}];
function inputs(ctx,s,G,T){
 const K=G.K;
 for(let i=0;i<3;i++){
  const t0=INS[i].t0,t1=LANDS[i];if(T<t0||T>t1+.24)continue;const pth=inPath(G,s,i);
  let x,y,sx=1,sy=1,rot=0,a=1;
  if(T<t1){const k=E.inOutCubic(prog(t0,t1,T));x=bez(pth.a.x,pth.c.x,pth.b.x,k);y=bez(pth.a.y,pth.c.y,pth.b.y,k);const st=Math.sin(k*Math.PI)*.18;sx=1-st*.5;sy=1+st;rot=(1-k)*(i===1?.5:-.45)+Math.sin(T*9+i)*.05;
   // the gold thread being pulled out of the old chat
   if(i===2){ctx.save();ctx.strokeStyle=PAL.hot;ctx.lineWidth=Math.max(1.5,K*.55);ctx.lineCap='round';ctx.beginPath();const n=18;for(let j=0;j<=n;j++){const q=j/n,xx=lerp(x,pth.b.x,q),yy=lerp(y,pth.b.y+4*K,q)+Math.sin(q*9-T*16)*K*1.6*(1-q)*(.4+.6*(1-k));j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();ctx.restore();H.glow(ctx,x,y,K*14,PAL.gold,.25);}
  }else{const q=prog(t1,t1+.24,T);x=pth.b.x;y=pth.b.y+q*6*K;const sq=Math.sin(Math.min(1,q*2.2)*Math.PI)*.38*(1-q);sx=(1+sq)*(1-E.inCubic(q)*.85);sy=(1-sq)*(1-E.inCubic(q)*.85);a=1-prog(t1+.14,t1+.24,T);}
  ctx.save();ctx.globalAlpha*=a;ctx.translate(x,y);ctx.rotate(rot);ctx.scale(sx*(G.P?.95:1),sy*(G.P?.95:1));INS[i].draw(ctx,K);ctx.restore();
 }
}
function world04(ctx,s,G,T){
 const K=G.K,t=T-10;
 // backdrop glow, spotlight and plinth
 H.glow(ctx,G.hx,G.hy,48*K,'#1f5a3a',.9);
 ctx.save();ctx.globalCompositeOperation='lighter';const sg=ctx.createLinearGradient(0,G.hy-50*K,0,G.jy+20*K);sg.addColorStop(0,'rgba(246,220,154,0)');sg.addColorStop(1,'rgba(246,220,154,.08)');ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(G.jx-6*K,G.hy-50*K);ctx.lineTo(G.jx+6*K,G.hy-50*K);ctx.lineTo(G.jx+26*K,G.jy+19*K);ctx.lineTo(G.jx-26*K,G.jy+19*K);ctx.closePath();ctx.fill();ctx.restore();
 // emblem: hex with the lesson emoji, slams in at 10.0
 const es=s.reduced?1:E.outBack(clamp(t/.3)),eD=prog(10.04,10.24,T),eA=.3*(1-E.inOutSine(eD));
 ctx.save();ctx.translate(G.hx,G.hy);ctx.scale(es,es);ctx.rotate(T*.08);
 for(const [rad,al,lw] of [[42,.22,.5],[36,.1,.3]]){ctx.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU+Math.PI/6;const px=Math.cos(a)*rad*K,py=Math.sin(a)*rad*K;k?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.strokeStyle=hexA(PAL.gold,al);ctx.lineWidth=Math.max(1,lw*K);ctx.stroke();}
 ctx.rotate(-T*.08);if(eA>0)H.emoji(ctx,ICONS[0],0,0,48*K*(1+.35*E.outCubic(eD)),{alpha:eA});ctx.restore();
 H.burst(ctx,T,10,{x:G.hx,y:G.hy,count:30,seed:1004,speed:K*75,life:.6,size:K*.9,shape:'line',colors:[PAL.hot,PAL.gold]});
 // plinth
 const py=G.jy+S46(G);ctx.save();ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(G.jx,py+K,24*K,4.4*K,0,0,TAU);ctx.fill();
 const pg=ctx.createLinearGradient(G.jx-24*K,0,G.jx+24*K,0);pg.addColorStop(0,'#0d2c1d');pg.addColorStop(.5,'#1f5a3a');pg.addColorStop(1,'#0d2c1d');ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(G.jx,py,22*K,3.8*K,0,0,TAU);ctx.fill();ctx.strokeStyle=hexA(PAL.gold,.6);ctx.lineWidth=Math.max(1,.35*K);ctx.stroke();ctx.restore();
 const fill=fillAt(T),slosh=sloshAt(T);H.glow(ctx,G.jx,G.jy+G.S*.2,G.S*(.4+.5*fill),PAL.gold,.18+.25*fill);
 // flip + loot rays
 const rk=Math.min(E.outCubic(prog(12.74,12.92,T)),1-prog(13.1,13.5,T));if(rk>0){H.rays(ctx,G.jx,G.jy,30*K,12,T*.9,PAL.hot,.4*rk);H.glow(ctx,G.jx,G.jy,24*K,PAL.hot,.35*rk);}
 // funnel (pops in, leaves before the card)
 const fIn=E.outBack(prog(10.1,10.35,T)),fOut=prog(11.72,11.95,T);
 // jar
 const sq=LANDS.reduce((a,L)=>{const d=T-L-.12;return d>0?a+.06*Math.exp(-d*7)*Math.sin(d*24):a;},0)+(T>12.5?.05*Math.exp(-(T-12.5)*9)*Math.sin((T-12.5)*30):0);
 const flip=prog(12.75,13.08,T),sx=flip>0&&flip<1?Math.cos(E.inOutCubic(flip)*TAU):1;
 const lid=E.outBack(prog(12.4,12.56,T)),label=T>=12.52,sealK=prog(12.5,12.62,T);
 const popK=prog(10.22,10.5,T),pop=s.reduced?1:E.outBack(popK);if(popK>0&&popK<1)H.glow(ctx,G.jx,G.jy,G.S*(.5+.6*popK),PAL.hot,.45*Math.sin(popK*Math.PI));
 if(pop>0){ctx.save();const by=G.jy+G.S*.46;ctx.translate(G.jx,by);ctx.scale(pop*(1-.12*Math.sin(popK*Math.PI)),pop*(1+.12*Math.sin(popK*Math.PI)));ctx.translate(-G.jx,-by);
 jarV(ctx,s,G.jx,G.jy,G.S,T,{fill,slosh,sq,sx,lid,label,seal:sealK,sweep:prog(13.05,13.5,T)});ctx.restore();}
 // pour streams from the funnel
 for(const L of LANDS){const pk=Math.min(prog(L+.06,L+.14,T),1-prog(L+.34,L+.46,T));if(pk>0){const top=G.mouthY-2*K,bot=G.jy+G.S*.46-G.S*.86*.96*fill;ctx.save();ctx.strokeStyle='#f0b44c';ctx.lineCap='round';ctx.lineWidth=K*1.5*pk;ctx.beginPath();ctx.moveTo(G.jx,top);ctx.lineTo(G.jx+Math.sin(T*30)*K*.2,bot);ctx.stroke();ctx.strokeStyle='rgba(255,246,214,.7)';ctx.lineWidth=K*.45*pk;ctx.stroke();ctx.restore();
  H.burst(ctx,T,L+.14,{x:G.jx,y:bot,count:14,seed:1100+L*10|0,speed:K*22,life:.4,size:K*.55,gravity:K*90,colors:[PAL.hot,'#f0b44c']});}}
 funnel(ctx,G.jx,G.fy0,K,1-fOut,fIn*(1-fOut*.3),fOut*.5);
 inputs(ctx,s,G,T);
 // landing splashes at the funnel mouth
 LANDS.forEach((L,i)=>H.burst(ctx,T,L,{x:G.jx,y:G.fy0,count:22,seed:1200+i,speed:K*48,life:.5,size:K*.6,gravity:K*80,colors:[PAL.hot,PAL.gold,PAL.cream]}));
 // Markdown card: rises out of the jar, types in, rolls onto the jar as the label
 if(T>=12&&T<12.53){
  const kr=E.outBack(prog(12,12.22,T)),kl=E.inOutCubic(prog(12.38,12.52,T));
  const w0=G.cw,h0=G.ch,lw=G.S*.62*.76,lh=G.S*.28;
  const cy=lerp(lerp(G.mouthY+h0*.4,G.cardY,kr),G.jy+G.S*.12,kl),w=lerp(w0*lerp(.5,1,clamp(kr)),lw,kl),h=lerp(h0*lerp(.5,1,clamp(kr)),lh,kl);
  ctx.save();if(T<12.2){ctx.beginPath();ctx.rect(-s.w,-s.h,s.w*3,G.mouthY+s.h);ctx.clip();}
  mdCard(ctx,G.jx,cy,w,h,T,12,{sx:1-.45*Math.sin(kl*Math.PI)});ctx.restore();
  if(T<12.4)H.glow(ctx,G.jx,cy,w*.7,PAL.hot,.25);
 }
 // seal spark ring
 const ringK=prog(12.5,12.95,T);if(ringK>0&&ringK<1){const lw=G.S*.62*.76,sx0=G.jx-lw/2+lw*.8,sy0=G.jy+G.S*.12-G.S*.14+G.S*.28*.72;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=PAL.hot;ctx.lineCap='round';ctx.globalAlpha=1-ringK;ctx.lineWidth=Math.max(1,K*.45);const R0=E.outCubic(ringK)*K*16;
  ctx.beginPath();for(let i=0;i<40;i++){const a=i/40*TAU,r1=R0*(.85+.3*((i*7)%5)/5);ctx.moveTo(sx0+Math.cos(a)*r1,sy0+Math.sin(a)*r1);ctx.lineTo(sx0+Math.cos(a)*(r1+K*2.2*(1-ringK)),sy0+Math.sin(a)*(r1+K*2.2*(1-ringK)));}ctx.stroke();ctx.restore();H.glow(ctx,sx0,sy0,K*10,PAL.hot,.6*(1-ringK));}
 // glamour sparkles after the loot
 const gk=Math.min(prog(12.95,13.2,T),1);if(gk>0){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const a=i/14*TAU+T*1.3,rr=G.S*(.52+.06*Math.sin(T*3+i));const x=G.jx+Math.cos(a)*rr,y=G.jy+Math.sin(a)*rr*.62;const tw=.5+.5*Math.sin(T*7+i*2.1);ctx.globalAlpha=gk*tw*.85;ctx.fillStyle=i%2?PAL.hot:PAL.cream;ctx.beginPath();ctx.arc(x,y,K*(.35+.35*tw),0,TAU);ctx.fill();}ctx.restore();}
 H.dust(ctx,s,{count:30,seed:1401,alpha:.4,size:s.u*.26,speed:s.u*1.6});
}
const S46=G=>G.S*.46;
// copy of the sealed jar arcing into HUD slot 1, landing exactly at 13.0
function lootFlight(ctx,s,G,T,ox,oy){
 if(T<12.8||T>13.4)return;const slot=TR.hudRect(s,0);
 const x0=G.jx+ox,y0=G.jy-G.S*.25+oy,cx=lerp(x0,slot.x,.12)-6*G.K,cy=lerp(y0,slot.y,.8);
 const at=k=>({x:bez(x0,cx,slot.x,k),y:bez(y0,cy,slot.y,k)});
 if(T<13){const k=E.inOutCubic(prog(12.8,13,T));
  ctx.save();ctx.globalCompositeOperation='lighter';for(let j=1;j<=8;j++){const kk=Math.max(0,k-j*.035),p=at(kk);ctx.globalAlpha=(1-j/9)*.7;ctx.fillStyle=j%2?PAL.hot:PAL.gold;ctx.beginPath();ctx.arc(p.x,p.y,G.K*(1.1-j*.1),0,TAU);ctx.fill();}ctx.restore();
  const p=at(k),r=lerp(G.K*7.5,slot.size*.36,k)*Math.min(1,.4+prog(12.8,12.86,T)*.6);H.glow(ctx,p.x,p.y,r*2.6,PAL.hot,.5);coin(ctx,p.x,p.y,r,ICONS[0],1,{discA:1-k*.5,emojiA:0,rot:(1-k)*.8});jarInCoin(ctx,s,p.x,p.y,r,T,(1-k)*.8,1,1);
 }else{H.burst(ctx,T,13,{x:slot.x,y:slot.y,count:26,seed:1313,speed:s.u*22,life:.45,size:s.u*.4,colors:[PAL.hot,PAL.cream]});}
}
TR.defineScene({id:'s04_source',start:10,end:14,draw(ctx,s){
 const T=s.T,t=s.t,G=g04(s);
 ctx.fillStyle=PAL.void;ctx.fillRect(0,0,s.w,s.h);
 ctx.fillStyle=H.radial(ctx,G.hx,G.hy,Math.max(s.w,s.h)*.8,'#103723',PAL.void);ctx.fillRect(0,0,s.w,s.h);
 // whip-in (from the right in 16:9, from the bottom in 9:16), whip-out to the left
 const kin=1-E.outExpo(clamp(t/.25)),kout=E.inCubic(prog(13.5,14,T));
 let ox=-red(s,s.w*.85)*kout,oy=0;if(G.P)oy=red(s,s.h*.3)*kin;else ox+=red(s,s.w*.3)*kin;
 const drawW=(dx,dy,a)=>{ctx.save();ctx.globalAlpha=a;ctx.translate(ox+dx,oy+dy);if(t<.3)H.shake(ctx,s,.55*(1-t/.3));if(T>=12.5&&T<12.65)H.shake(ctx,s,.55*(1-(T-12.5)/.15));world04(ctx,s,G,T);ctx.restore();};
 // smear ghosts while whipping
 if(kin>.15&&!s.reduced){if(G.P)drawW(0,s.h*.06*kin,.28);else drawW(s.w*.06*kin,0,.28);}
 if(kout>.08&&!s.reduced)drawW(s.w*.09*kout,0,.3*kout);
 drawW(0,0,1);
 H.vignette(ctx,s,.5);
 whipLines(ctx,s,kin*1.3,1010,{count:24,vertical:G.P,dir:-1});
 whipLines(ctx,s,kout*1.3,1020,{count:24,dir:-1});
 lootFlight(ctx,s,G,T,ox,oy);
 // TEXT layer
 if(T<T_OUT)drawTextBlock(ctx,s,T);
 H.caption(ctx,s,{text:'ซอสขวดแรก ของคุณเอง',sub:'บท 1 · ได้ไฟล์ .md พกไปทั้งคอร์ส',in:10.15,out:13.9,accent:'ซอสขวดแรก',layout:'column',chip:ICONS[0]});
}});
})();
