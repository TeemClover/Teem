/* AI ใส่ซอส · บท 5 — โรงหนังคลิปจากโค้ด (Sauce Reel)
   ทุกคลิปวาดด้วย Canvas + JavaScript ล้วน ไม่มีไฟล์วิดีโอ เพลงสร้างด้วย Web Audio API
   และอัดเป็นวิดีโอด้วย MediaRecorder — คือสิ่งเดียวกับที่คำสั่ง /brushstory สั่งให้ AI สร้าง
   Cards draw only while on screen; idle cards and hidden tabs never animate. */
(function(){
'use strict';
const W=540,H=960,LINE=4,LOOP=LINE*3;
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=x=>1-Math.pow(1-clamp(x),3);
const easeIO=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;};
function rng(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const THAI='"Noto Sans Thai","Sukhumvit Set","Thonburi",system-ui,sans-serif';
const SERIF='"Noto Serif Thai","Noto Sans Thai","Thonburi",Georgia,serif';
// Self-hosted display faces (assets/fonts/reel); system Thai fonts remain the fallback.
const F={brush:'"Reel Charm",'+THAI,mural:'"Reel Srisakdi",'+SERIF,bold:'"Reel Kanit",'+THAI,round:'"Reel Mitr",'+THAI,tech:'"Reel Chakra",'+THAI,hand:'"Reel Sriracha",'+THAI};
const FONT_LOADS=['700 40px "Reel Charm"','700 40px "Reel Srisakdi"','800 40px "Reel Kanit"','600 40px "Reel Mitr"','700 40px "Reel Chakra"','400 40px "Reel Sriracha"'];
const SAFE=W-96;
// One line of the story per third of the loop: [index, local progress 0..1]
function scene(t){const i=Math.min(2,Math.floor(t/LINE));return [i,(t-i*LINE)/LINE];}
// Quick fade in, long hold, short fade out: each line is fully readable for most of its 4 seconds.
function lineIn(p){return ease(p*7)*(1-ease((p-.93)*14));}
// Largest size (up to the requested one) at which the text fits maxW.
function fit(ctx,text,font,weight,size,maxW){ctx.font=`${weight} ${size}px ${font}`;const w=ctx.measureText(text).width;return w>maxW?Math.max(12,Math.floor(size*maxW/w)):size;}
function say(ctx,text,x,y,{size=64,font=THAI,weight=800,color='#111',align='center',alpha=1,shadow=null,stroke=null,dy=0,scale=1,rot=0,spacing=0,maxW=SAFE}={}){
 if(alpha<=0)return;
 ctx.save();size=fit(ctx,text,font,weight,size,maxW/Math.max(scale,0.01));ctx.globalAlpha*=alpha;ctx.translate(x,y+dy);if(rot)ctx.rotate(rot);if(scale!==1)ctx.scale(scale,scale);
 ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';
 if('letterSpacing' in ctx&&spacing)ctx.letterSpacing=spacing+'px';
 if(shadow){ctx.shadowColor=shadow.color;ctx.shadowBlur=shadow.blur||0;ctx.shadowOffsetX=shadow.x||0;ctx.shadowOffsetY=shadow.y||0;}
 if(stroke){ctx.lineWidth=stroke.width;ctx.strokeStyle=stroke.color;ctx.lineJoin='round';ctx.strokeText(text,0,0);}
 ctx.fillStyle=color;ctx.fillText(text,0,0);ctx.restore();
}
function plateRect(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);}
// One story line with an optional plate sized to the fitted text, so every style stays readable.
function storyText(ctx,t,lines,opts,y=740){
 const [i,p]=scene(t);const a=lineIn(p);if(a<=0)return;
 const text=lines[i],font=opts.font||THAI,weight=opts.weight||800,maxW=opts.maxW||SAFE-40;
 const size=fit(ctx,text,font,weight,opts.size||64,maxW);
 const dy=(1-ease(p*7))*26;
 if(opts.plate){
  ctx.save();ctx.font=`${weight} ${size}px ${font}`;const tw=ctx.measureText(text).width;
  const pl=opts.plate,pw=Math.min(W-36,tw+(pl.padX??56)),ph=size*1.55+(pl.padY??10);
  ctx.globalAlpha=a*(pl.alpha??1);ctx.translate(W/2,y+dy);if(opts.rot)ctx.rotate(opts.rot);
  if(pl.shadow){ctx.shadowColor=pl.shadow;ctx.shadowBlur=22;ctx.shadowOffsetY=8;}
  plateRect(ctx,-pw/2,-ph/2,pw,ph,pl.radius??18);ctx.fillStyle=pl.fill;ctx.fill();ctx.shadowColor='transparent';
  if(pl.stroke){ctx.lineWidth=pl.lw||3;ctx.strokeStyle=pl.stroke;ctx.stroke();}
  ctx.restore();
 }
 say(ctx,text,W/2,y,{...opts,size,maxW,alpha:a*(opts.alpha??1),dy});
}
const cache=new Map();
function grain(key,color,amount,seed){
 if(cache.has(key))return cache.get(key);
 const c=document.createElement('canvas');c.width=W/2;c.height=H/2;const g=c.getContext('2d');const r=rng(seed);
 g.fillStyle=color;g.fillRect(0,0,c.width,c.height);
 for(let i=0;i<amount;i++){g.fillStyle=`rgba(60,40,20,${r()*0.06})`;g.fillRect(r()*c.width,r()*c.height,1+r()*2,1+r()*2);}
 for(let i=0;i<40;i++){g.strokeStyle=`rgba(90,70,40,${0.03+r()*0.04})`;g.lineWidth=0.6;g.beginPath();const x=r()*c.width,y=r()*c.height;g.moveTo(x,y);g.lineTo(x+r()*40-20,y+r()*40-20);g.stroke();}
 cache.set(key,c);return c;
}
function inkRidge(ctx,base,amp,seed,color,progress){
 const r=rng(seed);const pts=[];for(let x=-20;x<=W+20;x+=18)pts.push([x,base-amp*(0.5+0.5*Math.sin(x*0.011+seed))-r()*amp*0.35]);
 ctx.save();ctx.beginPath();ctx.rect(0,0,W*progress,H);ctx.clip();
 ctx.beginPath();ctx.moveTo(-20,H);for(const [x,y] of pts)ctx.lineTo(x,y);ctx.lineTo(W+20,H);ctx.closePath();ctx.fillStyle=color;ctx.fill();
 ctx.lineWidth=5;ctx.strokeStyle=color;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y+r()*3):ctx.moveTo(x,y));ctx.stroke();ctx.restore();
}
function chedi(ctx,x,y,s,color){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=color;ctx.beginPath();
 ctx.moveTo(-60,0);ctx.lineTo(60,0);ctx.lineTo(48,-18);ctx.lineTo(-48,-18);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(-40,-18);ctx.quadraticCurveTo(-44,-70,0,-88);ctx.quadraticCurveTo(44,-70,40,-18);ctx.closePath();ctx.fill();
 ctx.fillRect(-14,-104,28,16);
 ctx.beginPath();ctx.moveTo(-12,-104);ctx.quadraticCurveTo(-4,-170,0,-210);ctx.quadraticCurveTo(4,-170,12,-104);ctx.closePath();ctx.fill();
 for(let i=0;i<5;i++){ctx.fillRect(-9+i*0.8,-120-i*16,18-i*1.6,3);}ctx.restore();
}
function boat(ctx,x,y,s,color){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle=color;ctx.beginPath();
 ctx.moveTo(-70,-6);ctx.quadraticCurveTo(-10,14,62,-2);ctx.lineTo(78,-26);ctx.quadraticCurveTo(70,-8,58,-10);ctx.quadraticCurveTo(-10,0,-70,-6);ctx.fill();
 ctx.fillRect(-20,-30,4,22);ctx.beginPath();ctx.arc(-18,-34,9,Math.PI,0);ctx.fill();ctx.restore();
}
function lotus(ctx,x,y,s,open,fill,stroke){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 for(let i=-3;i<=3;i++){ctx.save();ctx.rotate(i*0.32*open);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-24,-50,0,-96);ctx.quadraticCurveTo(24,-50,0,0);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();}ctx.restore();}
 ctx.restore();
}
function flame(ctx,x,y,s,rot,color,line){
 ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);ctx.beginPath();
 ctx.moveTo(0,40);ctx.bezierCurveTo(-34,20,-26,-20,4,-56);ctx.bezierCurveTo(-4,-24,22,-20,10,-2);ctx.bezierCurveTo(28,-6,22,26,0,40);ctx.closePath();
 ctx.fillStyle=color;ctx.fill();if(line){ctx.strokeStyle=line;ctx.lineWidth=3;ctx.stroke();}ctx.restore();
}
function seal(ctx,x,y,text,alpha){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(-0.06);ctx.fillStyle='#b8322a';ctx.fillRect(-34,-34,68,68);
 ctx.strokeStyle='#f6e7d0';ctx.lineWidth=3;ctx.strokeRect(-27,-27,54,54);say(ctx,text,0,2,{size:26,color:'#f6e7d0',weight:800,font:F.bold,maxW:56});ctx.restore();
}
/* ── The eight styles ─────────────────────────────── */
const CLIPS=[
 {id:'brush',name:'พู่กันจีน × ไทย',en:'Chinese brush + Thai',art:'brush',command:'brushstory',story:['ทุ่งนาตื่นเช้า','รวงข้าวโน้มรับลม','หอมทั้งแผ่นดิน'],music:'zen',
  draw(ctx,t){
   ctx.drawImage(grain('rice','#f1e6d0',2600,7),0,0,W,H);
   const sun=ease(t/1.6);ctx.fillStyle=`rgba(196,54,40,${0.85*sun})`;ctx.beginPath();ctx.arc(380,250,70+sun*20,0,TAU);ctx.fill();
   inkRidge(ctx,520,140,3,'rgba(26,20,16,.16)',ease(t/2.2));
   inkRidge(ctx,600,110,9,'rgba(26,20,16,.32)',ease((t-.3)/2.2));
   chedi(ctx,150,560,0.9,'rgba(26,20,16,'+(0.75*ease((t-.8)/1.5))+')');
   inkRidge(ctx,905,60,15,'rgba(26,20,16,.82)',ease((t-.6)/2.4));
   ctx.save();ctx.strokeStyle='rgba(26,20,16,.55)';ctx.lineWidth=2.5;
   for(let i=0;i<4;i++){const bx=((t*42+i*130)%(W+120))-60,by=200+i*26+Math.sin(t*3+i)*8;ctx.beginPath();ctx.moveTo(bx-12,by-6);ctx.quadraticCurveTo(bx-4,by,bx,by+2);ctx.quadraticCurveTo(bx+4,by,bx+12,by-6);ctx.stroke();}
   ctx.restore();
   boat(ctx,((t/LOOP)*(W+220))-110,640,0.9,'rgba(26,20,16,.85)');
   storyText(ctx,t,this.story,{size:96,font:F.brush,weight:700,color:'#15100c',plate:{fill:'rgba(243,233,212,.9)',radius:26,padX:70}},720);
   ctx.strokeStyle='rgba(184,50,42,.9)';ctx.lineCap='round';ctx.lineWidth=10;ctx.beginPath();const st=ease(((t%LINE)-.2)/1);ctx.moveTo(150,800);ctx.quadraticCurveTo(270,786,150+240*st,802);ctx.stroke();
   seal(ctx,450,860,'ซอส',ease((t-1)/1));
  }},
 {id:'mural',name:'จิตรกรรมฝาผนังไทย',en:'Thai mural',art:'mural',command:'brushstory',story:['ร้านกาแฟของยาย','สูตรลับสามรุ่น','เสิร์ฟด้วยหัวใจ'],music:'ranat',
  draw(ctx,t){
   const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8a2f1c');g.addColorStop(1,'#4d160d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   const r=rng(21);
   for(let i=0;i<26;i++){const x=r()*W,y=r()*H,s=0.5+r()*0.7;flame(ctx,x,y,s,Math.sin(t*0.8+i)*0.25+r()*6,'rgba(217,164,65,'+(0.18+r()*0.2)+')');}
   ctx.save();ctx.strokeStyle='#d9a441';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(70,620);ctx.lineTo(70,300);ctx.quadraticCurveTo(70,150,270,110);ctx.quadraticCurveTo(470,150,470,300);ctx.lineTo(470,620);ctx.stroke();ctx.restore();
   for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*0.33;flame(ctx,270+Math.cos(a)*190,300+Math.sin(a)*190,0.55,a+Math.PI/2+Math.sin(t*2+i)*0.12,'#e2b04c','#7a2a1a');}
   const open=easeIO(t/3);lotus(ctx,270,470,1.35,open,'#f2c46b','#7a2a1a');
   ctx.fillStyle='#d9a441';ctx.beginPath();ctx.ellipse(270,476,90,16,0,0,TAU);ctx.fill();
   chedi(ctx,270,330,0.5,'rgba(242,196,107,'+(0.4+0.4*Math.sin(t*2)**2)+')');
   storyText(ctx,t,this.story,{size:84,font:F.mural,weight:700,color:'#ffe3a1',stroke:{width:6,color:'#3a0f08'},plate:{fill:'rgba(58,15,8,.86)',stroke:'#d9a441',lw:4,radius:14,padX:64}},720);
   say(ctx,'✦ ✦ ✦',W/2,822,{size:24,color:'#d9a441',alpha:.9});
  }},
 {id:'ukiyo',name:'ภาพพิมพ์แกะไม้ญี่ปุ่น',en:'Ukiyo-e',art:'ukiyo',command:'brushstory',story:['คลื่นลูกแรก','ไม่เคยหยุดเรือ','ฝันใหญ่เริ่มเล็ก'],music:'koto',
  draw(ctx,t){
   ctx.drawImage(grain('washi','#efe2c4',1800,11),0,0,W,H);
   ctx.fillStyle='#c8402f';ctx.beginPath();ctx.arc(390,230,74,0,TAU);ctx.fill();
   ctx.fillStyle='#24395c';ctx.beginPath();ctx.moveTo(110,520);ctx.lineTo(260,300);ctx.lineTo(420,520);ctx.fill();
   ctx.fillStyle='#f6efe0';ctx.beginPath();ctx.moveTo(220,358);ctx.lineTo(260,300);ctx.lineTo(302,360);ctx.lineTo(282,348);ctx.lineTo(262,366);ctx.lineTo(242,346);ctx.closePath();ctx.fill();
   for(let layer=0;layer<4;layer++){
    const base=560+layer*70,amp=40-layer*5,ph=t*(1.2+layer*0.35)+layer;
    ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W;x+=8)ctx.lineTo(x,base+Math.sin(x*0.018+ph)*amp+Math.sin(x*0.05+ph*1.7)*8);ctx.lineTo(W,H);ctx.closePath();
    ctx.fillStyle=['#2f5d8a','#24476e','#1c3757','#162a44'][layer];ctx.fill();
    ctx.strokeStyle='#f6efe0';ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle='#f6efe0';for(let x=0;x<=W;x+=26){const y=base+Math.sin(x*0.018+ph)*amp+Math.sin(x*0.05+ph*1.7)*8;if(Math.sin(x*0.018+ph)>0.55){ctx.beginPath();ctx.arc(x,y-6,5,0,TAU);ctx.fill();}}
   }
   boat(ctx,180+Math.sin(t)*20,600+Math.sin(t*1.4)*14,0.9,'#3b2412');
   storyText(ctx,t,this.story,{size:70,font:F.bold,weight:800,color:'#1a1410',plate:{fill:'#f6efe0',stroke:'#1a1410',lw:5,radius:6,padX:60}},752);
   seal(ctx,452,846,'ซอส',1);
  }},
 {id:'paper',name:'กระดาษตัดซ้อนชั้น',en:'Paper cut',art:'paper',command:'brushstory',story:['ดอยยามเช้า','ใบชาลูกแรก','ถึงแก้วของคุณ'],music:'bells',
  draw(ctx,t){
   const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#ffd9b3');g.addColorStop(1,'#ffeedd');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   ctx.fillStyle='#ff9a5a';ctx.beginPath();ctx.arc(W/2,330-ease(t/3)*60,80,0,TAU);ctx.fill();
   const colors=['#f6b98c','#e8906a','#9fc49a','#6fa37a','#3f7c5a','#2a5a40'];
   colors.forEach((c,i)=>{
    ctx.save();ctx.shadowColor='rgba(60,30,10,.28)';ctx.shadowBlur=18;ctx.shadowOffsetY=8;
    const off=(t*(6+i*7))%W;ctx.beginPath();ctx.moveTo(0,H);
    for(let x=-W;x<=W*2;x+=10){const xx=x-off;ctx.lineTo(xx,380+i*80+Math.sin(x*0.012+i*1.7)*(50-i*4)+Math.sin(x*0.031+i)*14);}
    ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=c;ctx.fill();ctx.restore();
   });
   for(let i=0;i<3;i++){const cx=((t*22+i*220)%(W+200))-100,cy=170+i*60;ctx.save();ctx.shadowColor='rgba(60,30,10,.2)';ctx.shadowBlur=10;ctx.shadowOffsetY=5;ctx.fillStyle='#fffaf3';ctx.beginPath();ctx.arc(cx,cy,26,0,TAU);ctx.arc(cx+30,cy-10,32,0,TAU);ctx.arc(cx+64,cy,24,0,TAU);ctx.fill();ctx.restore();}
   storyText(ctx,t,this.story,{size:74,font:F.round,weight:600,color:'#2a5a40',plate:{fill:'#fffaf3',shadow:'rgba(60,30,10,.32)',radius:26,padX:64}},740);
  }},
 {id:'neon',name:'นีออนซินธ์เวฟ',en:'Neon synthwave',art:'neon',command:'brushstory',story:['กรุงเทพฯ ตีสอง','ไอเดียยังไม่นอน','เปิดร้านออนไลน์'],music:'synth',
  draw(ctx,t){
   const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#090320');g.addColorStop(.55,'#2a0845');g.addColorStop(1,'#090320');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   const hz=520;
   ctx.save();const sg=ctx.createLinearGradient(0,240,0,hz);sg.addColorStop(0,'#ffd319');sg.addColorStop(1,'#ff2975');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(W/2,hz,170,Math.PI,0);ctx.fill();
   ctx.fillStyle='#2a0845';for(let i=0;i<7;i++){const y=hz-14-i*20+((t*20)%20);ctx.fillRect(0,y,W,4+i*0.6);}ctx.restore();
   ctx.strokeStyle='#ff2bd6';ctx.shadowColor='#ff2bd6';ctx.shadowBlur=12;ctx.lineWidth=2;
   for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(W/2+i*18,hz);ctx.lineTo(W/2+i*140,H);ctx.stroke();}
   for(let i=0;i<12;i++){const z=((i+(t*1.6)%1)/12);const y=hz+Math.pow(z,2.2)*(H-hz);ctx.globalAlpha=z;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
   ctx.globalAlpha=1;ctx.shadowBlur=0;
   ctx.fillStyle='#090320';for(const px of [60,480]){ctx.fillRect(px-4,330,8,190);for(let i=0;i<6;i++){ctx.save();ctx.translate(px,330);ctx.rotate(-1.4+i*0.56+Math.sin(t*1.5)*0.05);ctx.beginPath();ctx.ellipse(40,0,46,9,0,0,TAU);ctx.fill();ctx.restore();}}
   const flick=Math.sin(t*37)>0.93?0.45:1;
   storyText(ctx,t,this.story,{size:76,font:F.tech,weight:700,color:'#f2fdff',shadow:{color:'#22e0ff',blur:20},alpha:flick,plate:{fill:'rgba(9,3,32,.72)',stroke:'#ff2bd6',lw:3,radius:12,padX:60}},716);
   say(ctx,'AI ใส่ซอส',W/2,170,{size:34,color:'#ff9bec',weight:700,font:F.tech,shadow:{color:'#ff2bd6',blur:18},spacing:4});
  }},
 {id:'water',name:'สีน้ำ',en:'Watercolour',art:'water',command:'brushstory',story:['ตลาดเช้าวันเสาร์','ดอกไม้ส่งยิ้ม','ซื้อใจกันง่าย ๆ'],music:'bells',
  draw(ctx,t){
   ctx.fillStyle='#fbf8f1';ctx.fillRect(0,0,W,H);
   const r=rng(5);ctx.save();ctx.globalCompositeOperation='multiply';
   const cols=['#f4a6b0','#9fd0e8','#f7d070','#a8d5a2','#c9a7e8','#f6b98c'];
   for(let i=0;i<14;i++){const x=40+r()*460,y=120+r()*560,rad=(40+r()*110)*ease((t-i*0.18)/1.8),c=cols[i%cols.length];if(rad<=0)continue;
    const gg=ctx.createRadialGradient(x,y,rad*0.1,x,y,rad);gg.addColorStop(0,c+'cc');gg.addColorStop(.7,c+'66');gg.addColorStop(1,c+'00');ctx.fillStyle=gg;ctx.beginPath();
    for(let a=0;a<=TAU+0.01;a+=0.35){const rr=rad*(0.85+0.15*Math.sin(a*3+i));ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.fill();}
   ctx.restore();
   ctx.strokeStyle='rgba(40,50,80,.7)';ctx.lineWidth=2.2;ctx.lineCap='round';const d=ease((t-0.5)/2.5);
   ctx.save();ctx.beginPath();ctx.rect(0,0,W,300+d*500);ctx.clip();
   for(let i=0;i<5;i++){const fx=110+i*80,fy=420+Math.sin(i*2)*40;ctx.beginPath();ctx.moveTo(fx,fy+150);ctx.quadraticCurveTo(fx+10,fy+60,fx,fy);ctx.stroke();for(let p=0;p<6;p++){const a=p*TAU/6+t*0.3;ctx.beginPath();ctx.ellipse(fx+Math.cos(a)*16,fy+Math.sin(a)*16,13,7,a,0,TAU);ctx.stroke();}}
   ctx.restore();
   storyText(ctx,t,this.story,{size:84,font:F.hand,weight:400,color:'#22305a',rot:-0.035,plate:{fill:'rgba(255,255,255,.82)',radius:30,padX:70}},760);
  }},
 {id:'pixel',name:'พิกเซลอาร์ต',en:'Pixel art',art:'pixel',command:'brushstory',story:['LEVEL 1: เริ่มร้าน','LEVEL 2: ลูกค้าแรก','LEVEL UP! 🍀'],music:'chip',
  draw(ctx,t){
   let off=cache.get('pixelbuf');if(!off){off=document.createElement('canvas');off.width=90;off.height=160;cache.set('pixelbuf',off);}
   const p=off.getContext('2d');p.imageSmoothingEnabled=false;
   p.fillStyle='#3a2e6e';p.fillRect(0,0,90,160);p.fillStyle='#5b3f8f';p.fillRect(0,40,90,40);p.fillStyle='#f78f6b';p.fillRect(0,70,90,20);
   p.fillStyle='#ffd166';p.fillRect(58,26,12,12);p.fillRect(56,28,16,8);
   const r=rng(3);p.fillStyle='#fff';for(let i=0;i<14;i++){if((Math.floor(t*4)+i)%5)p.fillRect(Math.floor(r()*90),Math.floor(r()*36),1,1);}
   for(let i=0;i<9;i++){const bw=6+Math.floor(r()*6),bh=18+Math.floor(r()*30);const bx=(i*11-Math.floor(t*6))%110;const x=(bx+110)%110-10;p.fillStyle='#24204a';p.fillRect(x,110-bh,bw,bh);p.fillStyle='#ffd166';for(let wy=110-bh+3;wy<106;wy+=5)if((wy+i)%3)p.fillRect(x+2,wy,1,1);}
   p.fillStyle='#2b6b4a';p.fillRect(0,110,90,50);p.fillStyle='#3f8f62';for(let x=0;x<90;x+=4)p.fillRect((x+Math.floor(t*12))%90,110,2,2);
   const step=Math.floor(t*6)%2,hx=30,hy=96-(Math.abs(Math.sin(t*6))*3|0);
   p.fillStyle='#1b1b1b';p.fillRect(hx,hy,8,4);p.fillStyle='#f2c9a0';p.fillRect(hx+1,hy+4,6,5);p.fillStyle='#000';p.fillRect(hx+2,hy+5,1,1);p.fillRect(hx+5,hy+5,1,1);
   p.fillStyle='#c0392b';p.fillRect(hx,hy+9,8,6);p.fillStyle='#1b1b1b';p.fillRect(hx+1,hy+15,2,2+step);p.fillRect(hx+5,hy+15,2,3-step);
   p.fillStyle='#3fb950';const cy=88+(Math.floor(t*3)%2);p.fillRect(62,cy,3,3);p.fillRect(65,cy,3,3);p.fillRect(62,cy+3,3,3);p.fillRect(65,cy+3,3,3);
   ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,W,H);ctx.imageSmoothingEnabled=true;
   const [i,pr]=scene(t);const a=lineIn(pr);
   ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#111';ctx.fillRect(40,690,460,96);ctx.fillStyle='#fff';ctx.fillRect(46,696,448,84);ctx.fillStyle='#111';ctx.fillRect(52,702,436,72);ctx.restore();
   say(ctx,this.story[i],W/2,739,{size:52,color:'#ffd166',weight:700,font:F.tech,alpha:a,maxW:404,shadow:{color:'#c0392b',x:4,y:4}});
  }},
 {id:'kinetic',name:'ตัวหนังสือเด้ง',en:'Kinetic type',art:null,command:'kinetic',story:['ใคร','เจอ','เรา','คนนั้น','โชคดี','🍀'],music:'beat',
  draw(ctx,t){
   const beat=0.5,n=this.story.length,k=Math.floor(t/beat)%(n+6),local=(t%beat)/beat;
   const bgs=['#ffcf3f','#ff5d73','#4cc9f0','#7b2ff7','#06d6a0','#111'];const idx=Math.min(k,n-1);
   ctx.fillStyle=bgs[idx%bgs.length];ctx.fillRect(0,0,W,H);
   ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#fff';for(let i=0;i<8;i++){const y=((t*120+i*130)%(H+100))-50;ctx.fillRect(0,y,W,14);}ctx.restore();
   if(k<n){const s=1+0.35*Math.sin(local*Math.PI)*(1-local)+(1-ease(local*4))*-0.5;say(ctx,this.story[k],W/2,H/2,{size:k===n-1?220:170,font:F.bold,maxW:470,color:idx%bgs.length===5?'#ffcf3f':'#111',weight:800,scale:Math.max(0.2,s),rot:(k%2?1:-1)*0.06});}
   else{const line='ใครเจอเรา คนนั้นโชคดี';say(ctx,'ใครเจอเรา',W/2,H/2-70,{size:96,font:F.bold,color:'#ffcf3f',weight:800});say(ctx,'คนนั้นโชคดี 🍀',W/2,H/2+40,{size:96,font:F.bold,color:'#ffcf3f',weight:800});say(ctx,'myClover · AI ใส่ซอส',W/2,H/2+140,{size:30,font:F.tech,color:'#fff',weight:700,alpha:.85});}
   const bar=(t%beat)/beat;ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(0,H-12,W*bar,12);
  }}
];
/* ── Procedural soundtrack ───────────────────────── */
const SCALES={zen:[0,2,4,7,9],ranat:[0,2,4,7,9],koto:[0,1,5,7,8],bells:[0,2,4,7,9,11],synth:[0,3,7,10],chip:[0,4,7,12],beat:[0,3,5,7,10]};
const ROOT={zen:57,ranat:62,koto:57,bells:64,synth:45,chip:60,beat:43};
const hz=m=>440*Math.pow(2,(m-69)/12);
function impulse(audio,seconds=2.4){const len=Math.floor(audio.sampleRate*seconds),buf=audio.createBuffer(2,len,audio.sampleRate);for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}return buf;}
function createMusic(kind,audio){
 const out=audio.createGain();out.gain.value=0;out.gain.linearRampToValueAtTime(0.62,audio.currentTime+0.4);
 // Dry signal plus a soft room, glued by a compressor so small speakers still sound full.
 const mix=audio.createGain(),wet=audio.createGain(),room=audio.createConvolver(),glue=audio.createDynamicsCompressor();
 room.buffer=impulse(audio);wet.gain.value=kind==='chip'||kind==='beat'?0.12:0.32;
 out.connect(mix);out.connect(room).connect(wet).connect(mix);mix.connect(glue);
 glue.threshold.value=-18;glue.ratio.value=3;glue.attack.value=0.01;glue.release.value=0.25;
 const scale=SCALES[kind]||SCALES.zen,root=ROOT[kind]||57;let step=0,next=audio.currentTime+0.05,timer=0;
 const tempo={zen:0.5,ranat:0.18,koto:0.36,bells:0.3,synth:0.22,chip:0.12,beat:0.25}[kind]||0.3;
 function note(time,midi,{type='sine',dur=0.4,vol=0.2,attack=0.005}={}){const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=hz(midi);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vol,time+attack);g.gain.exponentialRampToValueAtTime(0.0008,time+dur);o.connect(g).connect(out);o.start(time);o.stop(time+dur+0.05);}
 function noise(time,{dur=0.05,vol=0.1,hp=6000}={}){const b=audio.createBuffer(1,Math.max(1,Math.floor(audio.sampleRate*dur)),audio.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();f.type='highpass';f.frequency.value=hp;g.gain.value=vol;s.buffer=b;s.connect(f).connect(g).connect(out);s.start(time);}
 function kick(time,vol=0.5){const o=audio.createOscillator(),g=audio.createGain();o.frequency.setValueAtTime(140,time);o.frequency.exponentialRampToValueAtTime(40,time+0.18);g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.25);o.connect(g).connect(out);o.start(time);o.stop(time+0.3);}
 function tick(){
  while(next<audio.currentTime+0.25){
   const deg=scale[(step*3+Math.floor(step/4))%scale.length],oct=(step%8>5)?12:0;
   if(kind==='zen'){if(step%2===0)note(next,root+deg+oct,{type:'sine',dur:1.6,vol:0.16,attack:0.02});if(step%8===0)note(next,root-12,{type:'triangle',dur:4,vol:0.08,attack:0.4});}
   else if(kind==='ranat'){note(next,root+deg+(step%4===3?12:0),{type:'triangle',dur:0.35,vol:0.18});if(step%4===0)noise(next,{dur:0.08,vol:0.06,hp:7000});}
   else if(kind==='koto'){if(step%3!==2)note(next,root+deg+oct,{type:'triangle',dur:0.9,vol:0.17});if(step%12===0)note(next,root-12,{type:'sine',dur:3,vol:0.08,attack:0.3});}
   else if(kind==='bells'){note(next,root+deg+oct,{type:'sine',dur:1.2,vol:0.12});if(step%2)note(next,root+deg+19,{type:'sine',dur:0.6,vol:0.04});}
   else if(kind==='synth'){note(next,root+deg+12,{type:'sawtooth',dur:0.2,vol:0.06});if(step%4===0){kick(next,0.4);note(next,root-12+scale[Math.floor(step/8)%scale.length],{type:'square',dur:0.8,vol:0.05});}}
   else if(kind==='chip'){note(next,root+deg+(step%16>11?12:0),{type:'square',dur:0.1,vol:0.06});if(step%8===0)note(next,root-12,{type:'triangle',dur:0.4,vol:0.12});}
   else if(kind==='beat'){if(step%2===0)kick(next,0.6);if(step%4===2)noise(next,{dur:0.12,vol:0.18,hp:1500});noise(next,{dur:0.03,vol:0.04,hp:8000});if(step%2===0)note(next,root+scale[(step/2)%scale.length],{type:'sawtooth',dur:0.22,vol:0.05});}
   if(['zen','koto','bells','ranat'].includes(kind)&&step%16===0){for(const d of [0,4,7])note(next,root-12+scale[Math.floor(step/16)%scale.length]+d,{type:'sine',dur:tempo*16,vol:0.035,attack:tempo*3});}
   next+=tempo;step++;
  }
 }
 tick();timer=setInterval(tick,90);
 return {node:glue,stop(){clearInterval(timer);const now=audio.currentTime;out.gain.cancelScheduledValues(now);out.gain.setValueAtTime(out.gain.value,now);out.gain.linearRampToValueAtTime(0,now+0.3);setTimeout(()=>{try{glue.disconnect();}catch{}},2600);}};
}
window.MC_REEL={CLIPS,LOOP,W,H};
if(typeof document==='undefined')return;
/* ── Cards ───────────────────────────────────────── */
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=id=>document.getElementById(id);
const cards=[];const visible=new Set();let raf=0,last=0;const start=performance.now();
function sizeCanvas(canvas,scale){const ctx=canvas.getContext('2d');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);ctx.setTransform(scale,0,0,scale,0,0);return ctx;}
function frame(clip,ctx,t){ctx.save();try{clip.draw.call(clip,ctx,((t%LOOP)+LOOP)%LOOP);}finally{ctx.restore();}}
function loop(now){
 raf=0;if(document.hidden)return;
 if(now-last>=33){last=now;const t=(now-start)/1000;for(const card of visible)frame(card.clip,card.ctx,t+card.offset);}
 if(visible.size&&!reduce())raf=requestAnimationFrame(loop);
}
function wake(){if(!raf&&visible.size&&!reduce())raf=requestAnimationFrame(loop);}
function mountCards(){
 const host=$('reelGrid');if(!host)return;
 host.innerHTML=CLIPS.map((clip,i)=>'<button type="button" class="reel-card" data-clip="'+clip.id+'" aria-label="เปิดคลิปสไตล์ '+clip.name+' พร้อมเสียง"><span class="reel-screen"><canvas width="180" height="320" aria-hidden="true"></canvas><span class="reel-play" aria-hidden="true">▶ 🔊</span></span><span class="reel-meta"><b>'+clip.name+'</b><small>'+clip.en+' · /'+clip.command+'</small></span></button>').join('');
 const scale=Math.min(2,(window.devicePixelRatio||1))*0.36;
 host.querySelectorAll('.reel-card').forEach((el,i)=>{const clip=CLIPS[i];const canvas=el.querySelector('canvas');const ctx=sizeCanvas(canvas,scale);const card={clip,ctx,el,offset:i*1.37};cards.push(card);frame(clip,ctx,2.4+i*0.3);});
 // Canvas text only uses a web font once it has loaded; repaint the still frames when it arrives.
 if(document.fonts?.load)Promise.all(FONT_LOADS.map(spec=>document.fonts.load(spec,'กขคไทยAa').catch(()=>null))).then(()=>{cards.forEach((card,i)=>frame(card.clip,card.ctx,2.4+i*0.3));if(theater)frame(theater.clip,theater.ctx,(performance.now()-theater.t0)/1000);});
 if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>{for(const e of entries){const card=cards.find(c=>c.el===e.target);if(!card)continue;if(e.isIntersecting)visible.add(card);else visible.delete(card);}wake();},{rootMargin:'80px'});
  cards.forEach(c=>io.observe(c.el));
 }
 document.addEventListener('visibilitychange',wake);
 host.addEventListener('click',event=>{const el=event.target.closest('[data-clip]');if(el)openTheater(el.dataset.clip);});
}
/* ── Theater: full-size playback, soundtrack and recording ── */
let theater=null;
function openTheater(id){
 const clip=CLIPS.find(c=>c.id===id);const dlg=$('reelTheater');if(!clip||!dlg)return;
 closeTheater(true);
 const canvas=$('reelBig');const ctx=sizeCanvas(canvas,1);
 theater={clip,ctx,canvas,t0:performance.now(),raf:0,audio:null,music:null,recorder:null,playing:true};
 setText($('reelTitle'),clip.name);setText($('reelSub'),clip.en+' · สร้างจากโค้ดทั้งหมด');
 const use=$('reelUse');if(use){use.dataset.command=clip.command;use.dataset.art=clip.art||'';use.textContent=clip.art?'🖌️ ใช้สไตล์นี้กับเรื่องของฉัน':'🔠 ใช้คำสั่งนี้กับข้อความของฉัน';}
 const box=$('reelPrompt');if(box){const deck=window.MC_DECK;const command=deck?.COMMANDS.find(c=>c.id===clip.command);const opt=command?.opts?.find(o=>o.k===(clip.art?'art':'look'));const choice=opt?.choices.find(c=>c[0]===clip.art)||opt?.choices[0];const esc=v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));box.innerHTML=clip.art&&choice?'/brushstory '+esc(choice[1])+'\n\nCreate JavaScript animation with music (and downloadable to mp4) using <b>'+esc(choice[2])+'</b> as key main art direction…\n\nStory will be about, "<b>'+esc(clip.story.join(' · '))+'</b>"':'/kinetic\n\nCreate a kinetic typography video… Text: "<b>'+esc(clip.story.join(' '))+'</b>"';}
 theater.voice=voiceAvailable();theater.lastLine=-1;
 startMusic();
 paintTheaterButtons();
 if(typeof dlg.showModal==='function'&&!dlg.open)dlg.showModal();else dlg.setAttribute('open','');
 const tick=now=>{if(!theater)return;if(theater.playing){const t=(now-theater.t0)/1000;frame(clip,ctx,t);narrate(t);}theater.raf=requestAnimationFrame(tick);};
 frame(clip,ctx,0);theater.raf=requestAnimationFrame(tick);
}
function setText(el,v){if(el&&el.textContent!==v)el.textContent=v;}
/* Optional Thai narration (speechSynthesis). It plays live only; recordings keep the music track. */
function thaiVoice(){try{return speechSynthesis.getVoices().find(v=>/^th/i.test(v.lang))||null;}catch{return null;}}
function voiceAvailable(){return typeof speechSynthesis!=='undefined'&&!!thaiVoice();}
function narrate(t){
 if(!theater?.voice)return;
 const clip=theater.clip,loopT=((t%LOOP)+LOOP)%LOOP;
 const line=clip.id==='kinetic'?(loopT<0.2?0:-1):Math.min(2,Math.floor(loopT/LINE));
 if(line<0||line===theater.lastLine)return;theater.lastLine=line;
 if(clip.id==='kinetic'&&loopT>=0.2)return;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clip.id==='kinetic'?'ใครเจอเรา คนนั้นโชคดี':clip.story[line].replace(/LEVEL\s*\d*:?|LEVEL UP!/g,''));const v=thaiVoice();if(v)u.voice=v;u.lang='th-TH';u.rate=0.95;u.volume=1;speechSynthesis.speak(u);}catch{}
}
function stopVoice(){try{speechSynthesis.cancel();}catch{}}
function paintTheaterButtons(){
 if(!theater)return;
 setText($('reelToggle'),theater.playing?'⏸ หยุด':'▶ เล่น');
 setText($('reelSound'),theater.music?'🔇 ปิดเพลง':'🎵 เปิดเพลง');
 const voice=$('reelVoice');if(voice){voice.hidden=!voiceAvailable();setText(voice,theater.voice?'🤫 ปิดเสียงพากย์':'🗣️ เสียงพากย์ไทย');}
 const rec=$('reelRecord');if(rec){rec.disabled=!!theater.recorder||typeof MediaRecorder==='undefined'||!theater.canvas.captureStream;setText(rec,theater.recorder?'⏺ กำลังอัด…':'⬇ อัดเป็นวิดีโอ ('+LOOP+' วิ)');}
}
function audioContext(){if(!theater.audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;theater.audio=new AC();}if(theater.audio.state==='suspended')theater.audio.resume();return theater.audio;}
function startMusic(){const audio=audioContext();if(!audio||theater.music)return;theater.music=createMusic(theater.clip.music,audio);theater.music.node.connect(audio.destination);if(theater.recordDest)theater.music.node.connect(theater.recordDest);}
function stopMusic(){theater?.music?.stop();if(theater)theater.music=null;}
function closeTheater(silent){
 if(!theater)return;cancelAnimationFrame(theater.raf);stopMusic();stopVoice();
 if(theater.recorder&&theater.recorder.state!=='inactive'){theater.cancelled=true;theater.recorder.stop();}
 try{theater.audio?.close();}catch{}
 theater=null;const dlg=$('reelTheater');if(!silent&&dlg?.open){dlg.close?.();dlg.removeAttribute('open');}
}
function pickType(){const types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];return types.find(type=>MediaRecorder.isTypeSupported?.(type))||'';}
function record(){
 if(!theater||theater.recorder)return;
 const stream=theater.canvas.captureStream(30);
 const audio=audioContext();
 if(audio){theater.recordDest=audio.createMediaStreamDestination();if(!theater.music)startMusic();else theater.music.node.connect(theater.recordDest);theater.recordDest.stream.getAudioTracks().forEach(track=>stream.addTrack(track));}
 const type=pickType();let recorder;try{recorder=new MediaRecorder(stream,type?{mimeType:type,videoBitsPerSecond:4e6}:undefined);}catch{toast('เบราว์เซอร์นี้ยังอัดวิดีโอไม่ได้ ลองใน Chrome บนคอมพิวเตอร์');return;}
 const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 const clip=theater.clip;
 recorder.onstop=()=>{
  const was=theater;stream.getTracks().forEach(track=>track.stop());
  if(was){was.recorder=null;was.recordDest=null;paintTheaterButtons();}
  if(!chunks.length||(was&&was.cancelled))return;
  const ext=(recorder.mimeType||type).includes('mp4')?'mp4':'webm';
  const blob=new Blob(chunks,{type:recorder.mimeType||type||'video/webm'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ai-sauce-'+clip.id+'.'+ext;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('🎬 ได้ไฟล์ .'+ext+' แล้ว — นี่คือสิ่งที่ /brushstory สั่งให้ AI ทำให้คุณ');
 };
 theater.recorder=recorder;theater.playing=true;theater.t0=performance.now();recorder.start(250);paintTheaterButtons();
 setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},LOOP*1000+150);
}
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('on');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('on'),2600);}
function bindTheater(){
 const dlg=$('reelTheater');if(!dlg)return;
 dlg.addEventListener('close',()=>closeTheater(true));
 dlg.addEventListener('click',event=>{
  const t=event.target;
  if(t===dlg||t.closest('#reelClose')){closeTheater();return;}
  if(!theater)return;
  if(t.closest('#reelToggle')){theater.playing=!theater.playing;if(theater.playing)theater.t0=performance.now()-((theater.pausedAt||0)*1000);else theater.pausedAt=(performance.now()-theater.t0)/1000;if(!theater.playing){stopMusic();stopVoice();}else startMusic();theater.lastLine=-1;paintTheaterButtons();return;}
  if(t.closest('#reelSound')){if(theater.music)stopMusic();else startMusic();paintTheaterButtons();return;}
  if(t.closest('#reelVoice')){theater.voiceTouched=true;theater.voice=!theater.voice;theater.lastLine=-1;if(!theater.voice)stopVoice();paintTheaterButtons();return;}
  if(t.closest('#reelRecord')){record();return;}
  const use=t.closest('#reelUse');if(use){const command=use.dataset.command,art=use.dataset.art;closeTheater();document.dispatchEvent(new CustomEvent('deck:preset',{detail:{id:command,options:art?{art}:{},}}));}
 });
}
// Copy-all: the full prompt (requirements + text-safety rules), exactly what the deck would copy.
function fullPrompt(id,options,field){const deck=window.MC_DECK;const command=deck?.COMMANDS.find(c=>c.id===id);if(!command)return '';return deck.buildPrompt([{id,options:{...deck.defaults(command),...(options||{})},field:field||''}]);}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch{}try{const a=document.createElement('textarea');a.value=text;a.setAttribute('readonly','');a.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok;}catch{return false;}}
async function copyAll(button,text){if(!text)return;const ok=await copyText(text);const label=button.dataset.label||(button.dataset.label=button.textContent);button.textContent=ok?'✓ ก๊อปแล้ว ไปวางใน Claude / ChatGPT ได้เลย':'ก๊อปไม่ได้ ลองกดค้างที่ข้อความแทน';toast(ok?'ก๊อป prompt ทั้งหมดแล้ว':'ก๊อปไม่ได้');clearTimeout(button._t);button._t=setTimeout(()=>{button.textContent=label;},2400);}
function bindCopy(){document.addEventListener('click',e=>{const b=e.target.closest?.('[data-copy-prompt],#reelCopy');if(!b)return;
 if(b.id==='reelCopy'){const clip=theater?.clip;if(clip)copyAll(b,fullPrompt(clip.command,clip.art?{art:clip.art}:{},clip.story.join(clip.art?' · ':' ')));return;}
 try{const d=JSON.parse(b.dataset.copyPrompt);copyAll(b,fullPrompt(d.id,d.options,d.field));}catch{}});}
function mount(){mountCards();bindTheater();bindCopy();try{speechSynthesis.onvoiceschanged=()=>{if(!theater)return;if(!theater.voiceTouched)theater.voice=voiceAvailable();paintTheaterButtons();};}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
