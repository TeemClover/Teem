(function(){
'use strict';

var root=document.querySelector('.app');
if(!root||window.__xvisorPixelFx)return;
window.__xvisorPixelFx=true;

var AudioCtx=window.AudioContext||window.webkitAudioContext;
var ctx=null;
var SOUND_KEY='xvisorQuestSoundV1';
var soundOn=localStorage.getItem(SOUND_KEY)!=='0';
var unlocked=false;

function ensureAudio(){
  if(!AudioCtx||!soundOn)return null;
  if(!ctx)ctx=new AudioCtx();
  if(ctx.state==='suspended')ctx.resume();
  unlocked=true;
  return ctx;
}
function tone(freq,dur,type,vol,delay){
  var c=ensureAudio();if(!c)return;
  var t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();
  o.type=type||'square';o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol||0.035,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,vol){
  var c=ensureAudio();if(!c)return;
  var len=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,len,c.sampleRate),data=buf.getChannelData(0);
  for(var i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
  var s=c.createBufferSource(),g=c.createGain();s.buffer=buf;g.gain.value=vol||0.02;s.connect(g);g.connect(c.destination);s.start();
}
function sfx(name){
  if(!soundOn)return;
  if(name==='click'){tone(620,.05,'square',.018);return}
  if(name==='talk'){tone(420,.045,'square',.017);tone(520,.045,'square',.014,.055);return}
  if(name==='care'){tone(520,.07,'triangle',.025);tone(660,.09,'triangle',.025,.06);return}
  if(name==='coin'){tone(880,.07,'square',.028);tone(1175,.11,'square',.028,.07);return}
  if(name==='sale'){tone(660,.07,'square',.032);tone(880,.08,'square',.032,.07);tone(1320,.16,'square',.035,.15);return}
  if(name==='fail'){tone(240,.09,'sawtooth',.018);tone(175,.16,'sawtooth',.016,.08);return}
  if(name==='new'){tone(520,.06,'square',.02);tone(780,.11,'square',.024,.065);return}
  if(name==='level'){tone(523,.08,'square',.028);tone(659,.08,'square',.028,.09);tone(784,.08,'square',.03,.18);tone(1047,.22,'square',.035,.27);return}
  if(name==='month'){tone(392,.07,'triangle',.025);tone(523,.07,'triangle',.025,.08);tone(659,.14,'triangle',.03,.16);return}
  if(name==='event'){tone(392,.06,'square',.02);tone(587,.06,'square',.022,.06);tone(784,.13,'square',.025,.12);return}
  if(name==='payout'){tone(784,.06,'square',.026);tone(988,.06,'square',.028,.06);tone(1175,.06,'square',.03,.12);tone(1568,.15,'square',.032,.18);return}
}

function addSoundButton(){
  var title=document.querySelector('.title');if(!title||title.querySelector('.px-sound'))return;
  title.style.position='relative';
  var b=document.createElement('button');b.type='button';b.className='px-sound';
  b.setAttribute('aria-label','เปิดหรือปิดเสียงเกม');b.title='เปิด/ปิดเสียง';
  function sync(){b.textContent=soundOn?'🔊':'🔇';b.setAttribute('aria-pressed',soundOn?'true':'false')}
  sync();
  b.addEventListener('click',function(e){e.stopPropagation();soundOn=!soundOn;localStorage.setItem(SOUND_KEY,soundOn?'1':'0');sync();if(soundOn){ensureAudio();sfx('coin')}});
  title.appendChild(b);
}
addSoundButton();

document.addEventListener('pointerdown',function(){if(soundOn&&!unlocked)ensureAudio()},{once:true,capture:true});

document.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b||b.classList.contains('px-sound'))return;
  var a=b.dataset.a||'';
  if(a==='talk')sfx('talk');
  else if(a==='care'||a==='guide'||a==='xos')sfx('care');
  else if(a==='weekly'||a==='event'||a==='monthly')sfx('event');
  else sfx('click');
},true);

function numberFromText(s){
  var n=parseFloat(String(s||'').replace(/[^0-9.-]/g,''));return isFinite(n)?n:0;
}
function flash(el,cls){
  if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);
  setTimeout(function(){el.classList.remove(cls)},900);
}
function floatAt(el,text,kind){
  if(!el||!text)return;
  var r=el.getBoundingClientRect(),d=document.createElement('div');
  d.className='px-float '+(kind||'');d.textContent=text;
  d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.top+8)+'px';
  document.body.appendChild(d);setTimeout(function(){d.remove()},1100);
}

var hIncome=document.getElementById('hIncome'),hCash=document.getElementById('hCash'),hXv=document.getElementById('hXv');
var lastIncome=hIncome?numberFromText(hIncome.textContent):0;
var lastCash=hCash?numberFromText(hCash.textContent):0;
var lastXv=hXv?numberFromText(hXv.textContent):0;
function watchNumber(el,getLast,setLast,kind,prefix,sound){
  if(!el)return;
  new MutationObserver(function(){
    var old=getLast(),now=numberFromText(el.textContent);if(now===old)return;setLast(now);
    var delta=now-old,stat=el.closest('.stat');flash(stat,'px-bump');
    if(delta>0){floatAt(stat,(prefix||'+')+Math.round(delta).toLocaleString('en-US'),kind);if(sound)sfx(sound)}
  }).observe(el,{childList:true,characterData:true,subtree:true});
}
watchNumber(hIncome,function(){return lastIncome},function(v){lastIncome=v},'', '+฿','coin');
watchNumber(hCash,function(){return lastCash},function(v){lastCash=v},'', '+฿','payout');
watchNumber(hXv,function(){return lastXv},function(v){lastXv=v},'xv','+','coin');

var rank=document.getElementById('hRank'),lastRank=rank?rank.textContent:'';
if(rank)new MutationObserver(function(){var now=rank.textContent;if(now&&now!==lastRank){lastRank=now;flash(rank,'px-rankup');sfx('level')}}).observe(rank,{childList:true,characterData:true,subtree:true});

var month=document.getElementById('hMonth'),lastMonth=month?month.textContent:'';
if(month)new MutationObserver(function(){
  var now=month.textContent;if(!now||now===lastMonth)return;var old=lastMonth;lastMonth=now;
  if(/^\d+$/.test(now)&&old!==now){showMonth(now);sfx('month')}
}).observe(month,{childList:true,characterData:true,subtree:true});
function showMonth(n){
  var d=document.createElement('div');d.className='px-month-curtain';d.innerHTML='<div>MONTH '+n+'<small>เดือนใหม่เริ่มแล้ว</small></div>';
  document.body.appendChild(d);setTimeout(function(){d.remove()},900);
}

var board=document.getElementById('board');
if(board){
  var known={};
  new MutationObserver(function(){
    var cards=board.querySelectorAll('.who');
    Array.prototype.forEach.call(cards,function(c){
      var key=(c.dataset.id||'')+'|'+(c.textContent||'').trim();
      if(!known[key]){known[key]=1;c.classList.add('px-enter');setTimeout(function(){c.classList.remove('px-enter')},500)}
    });
  }).observe(board,{childList:true,subtree:true});
}

var sheet=document.getElementById('sheet'),lastSheet='';
if(sheet)new MutationObserver(function(){
  var txt=(sheet.textContent||'').replace(/\s+/g,' ').trim();if(!txt||txt===lastSheet)return;lastSheet=txt;
  var low=txt.toLowerCase();
  if(/ขายสำเร็จ|ปิดการขาย|\+7,000\s*xv|ซื้อแล้ว/.test(txt)){sfx('sale');flash(sheet,'px-flash');floatAt(sheet,'SALE!','')}
  else if(/ไม่ซื้อ|ยังไม่พร้อม|ขายไม่สำเร็จ|ปฏิเสธ/.test(txt)){sfx('fail');flash(sheet,'px-shake')}
  else if(/certified|xlead|xgen|สอบผ่าน|เลื่อน/.test(low)){sfx('level');flash(sheet,'px-rankup')}
  else if(/รายได้|รับรายได้|ปิดยอด/.test(txt)){sfx('payout')}
}).observe(sheet,{childList:true,subtree:true,characterData:true});

var toasts=document.getElementById('toasts');
if(toasts)new MutationObserver(function(muts){
  muts.forEach(function(m){Array.prototype.forEach.call(m.addedNodes,function(n){if(n.nodeType!==1)return;var t=n.textContent||'';if(/ใหม่|เข้าทีม|XVISOR/.test(t))sfx('new')})})
}).observe(toasts,{childList:true});

})();
