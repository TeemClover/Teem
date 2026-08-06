/* Lesson 5 · softer exhibition copy and quiet SVG motion */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
if(!meta||meta.content!=='learn:prompts')return;

var NS='http://www.w3.org/2000/svg';
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function svgNode(name,attrs){
  var node=document.createElementNS(NS,name);
  Object.keys(attrs||{}).forEach(function(key){node.setAttribute(key,attrs[key])});
  return node;
}

function animate(parent,attrs){
  if(!parent||reduce)return null;
  var node=svgNode('animate',attrs);
  parent.appendChild(node);
  return node;
}

function animateTransform(parent,attrs){
  if(!parent||reduce)return null;
  var node=svgNode('animateTransform',attrs);
  parent.appendChild(node);
  return node;
}

function topGroups(svg){
  return Array.prototype.filter.call(svg.children,function(node){
    return String(node.tagName).toLowerCase()==='g';
  });
}

function softenCopy(){
  var note=document.querySelector('.chef-tasted');
  if(!note)return false;

  var h=note.querySelector('h3');
  var ps=note.querySelectorAll('p');
  var treasure=note.querySelector('.chef-tasted-treasure');

  if(h)h.textContent='เชฟชิมแล้ว';
  if(ps[0])ps[0].textContent='บางจานกว่าจะกินหมด เชฟก็เติมนั่นนิด เหยาะนี่หน่อย จนคำสุดท้ายให้รสไม่เหมือนคำแรก';
  if(ps[1])ps[1].innerHTML='Source ขวดเดียวก็เหมือนกัน <strong>ไม่ต้องรีบทิ้งแล้วเริ่มใหม่</strong> ลองหยิบผงคนละซองมาเติมทีละนิด แล้วชิมดูว่ารสไหนพอดีกับงานนี้';
  if(treasure)treasure.textContent='เครื่องปรุงเยอะ ๆ ไม่ได้รกครัว — มันคือตู้สมบัติที่พาเราเจอรสใหม่ได้เรื่อย ๆ';

  var exhibit=document.querySelector('.exhibit-head');
  if(exhibit){
    var p=exhibit.querySelector('p');
    var badge=exhibit.querySelector('.exhibit-badge');
    if(p)p.textContent='ตรงนี้เป็นมุมหลังครัว แวะมาได้ตอนอยากรู้ว่าแต่ละคำในครัวนี้หมายถึงอะไร';
    if(badge)badge.textContent='แวะดูหลังครัว';
  }
  return true;
}

function animateHero(){
  var svg=document.querySelector('.head .heroimg svg');
  if(!svg||svg.dataset.mcMotion==='1')return !!svg;
  svg.dataset.mcMotion='1';
  if(reduce)return true;

  var groups=topGroups(svg);
  var cabinet=groups[0];
  var chef=groups[1];
  var glow=svg.querySelector(':scope > circle');

  animate(glow,{attributeName:'opacity',values:'.08;.16;.08',dur:'5.8s',repeatCount:'indefinite'});
  animateTransform(chef,{attributeName:'transform',type:'translate',values:'0 0;0 -3;0 0',dur:'4.8s',repeatCount:'indefinite',additive:'sum'});

  var bottle=chef&&chef.querySelector('g');
  animateTransform(bottle,{attributeName:'transform',type:'rotate',values:'0 49 75;2 49 75;0 49 75;-1 49 75;0 49 75',dur:'5.4s',repeatCount:'indefinite',additive:'sum'});

  if(cabinet){
    Array.prototype.forEach.call(cabinet.querySelectorAll('circle'),function(handle,index){
      if(index%4!==0)return;
      animate(handle,{attributeName:'fill',values:'#e3bd69;#fff0aa;#e3bd69',dur:'2.6s',begin:(index*.09)+'s',repeatCount:'indefinite'});
      animate(handle,{attributeName:'r',values:'3;4;3',dur:'2.6s',begin:(index*.09)+'s',repeatCount:'indefinite'});
    });
  }
  return true;
}

function animateExhibition(){
  var svg=document.querySelector('.exhibit-stage svg');
  if(!svg||svg.dataset.mcMotion==='1')return !!svg;
  svg.dataset.mcMotion='1';
  if(reduce)return true;

  var groups=topGroups(svg);
  var displays=groups[0];
  var sparkles=groups[1];
  var floor=svg.querySelectorAll(':scope > path')[1];

  animate(floor,{attributeName:'stroke-opacity',values:'.1;.28;.1',dur:'5.6s',repeatCount:'indefinite'});
  animateTransform(displays,{attributeName:'transform',type:'translate',values:'0 0;0 -2;0 0',dur:'6.4s',repeatCount:'indefinite',additive:'sum'});

  if(displays){
    Array.prototype.forEach.call(displays.querySelectorAll('circle[fill="#e3bd69"]'),function(handle,index){
      animate(handle,{attributeName:'fill',values:'#e3bd69;#fff2b0;#e3bd69',dur:'3s',begin:(index*.28)+'s',repeatCount:'indefinite'});
    });
    var sauce=displays.querySelector('path[stroke="#be9442"]');
    if(sauce){
      sauce.setAttribute('stroke-dasharray','18 8');
      animate(sauce,{attributeName:'stroke-dashoffset',values:'26;0',dur:'4.4s',repeatCount:'indefinite'});
    }
  }

  if(sparkles){
    Array.prototype.forEach.call(sparkles.querySelectorAll('path'),function(star,index){
      animate(star,{attributeName:'opacity',values:'.3;1;.3',dur:index?'2.9s':'3.5s',begin:index?'.7s':'0s',repeatCount:'indefinite'});
    });
  }
  return true;
}

function steamPath(d,delay){
  var path=svgNode('path',{
    d:d,fill:'none',stroke:'#fff4cf','stroke-width':'2.4','stroke-linecap':'round',opacity:'0'
  });
  animate(path,{attributeName:'opacity',values:'0;.72;0',dur:'3.4s',begin:delay+'s',repeatCount:'indefinite'});
  animateTransform(path,{attributeName:'transform',type:'translate',values:'0 5;0 -9',dur:'3.4s',begin:delay+'s',repeatCount:'indefinite'});
  return path;
}

function animateTasting(){
  var svg=document.querySelector('.chef-tasted-art svg');
  if(!svg||svg.dataset.mcMotion==='1')return !!svg;
  svg.dataset.mcMotion='1';
  if(reduce)return true;

  var groups=topGroups(svg);
  var chef=groups[0];
  var plate=groups[1];
  var bottles=groups[2];
  var sparkles=groups[3];

  animateTransform(chef,{attributeName:'transform',type:'translate',values:'0 0;0 -2;0 0',dur:'4.6s',repeatCount:'indefinite',additive:'sum'});
  animateTransform(plate,{attributeName:'transform',type:'translate',values:'0 0;0 -1;0 0',dur:'3.8s',repeatCount:'indefinite',additive:'sum'});

  if(chef){
    var spoonLine=chef.querySelector('path[stroke="#d9c7a5"]');
    var spoonBowl=chef.querySelector('ellipse[stroke="#d9c7a5"]');
    [spoonLine,spoonBowl].forEach(function(piece){
      animateTransform(piece,{attributeName:'transform',type:'rotate',values:'0 137 115;-5 137 115;0 137 115',dur:'3.7s',repeatCount:'indefinite',additive:'sum'});
    });
  }

  if(bottles){
    Array.prototype.forEach.call(bottles.querySelectorAll(':scope > g'),function(bottle,index){
      animateTransform(bottle,{attributeName:'transform',type:'translate',values:'0 0;0 -2;0 0',dur:(3.8+index*.35)+'s',begin:(index*.35)+'s',repeatCount:'indefinite',additive:'sum'});
    });
  }

  var steam=svgNode('g',{'aria-hidden':'true'});
  steam.appendChild(steamPath('M145 133 C137 124 149 117 143 108',0));
  steam.appendChild(steamPath('M162 129 C154 120 166 113 160 104',1.1));
  steam.appendChild(steamPath('M179 133 C171 124 183 117 177 108',2.2));
  if(bottles)svg.insertBefore(steam,bottles);else svg.appendChild(steam);

  if(sparkles){
    Array.prototype.forEach.call(sparkles.querySelectorAll('path'),function(star,index){
      animate(star,{attributeName:'opacity',values:'.25;1;.25',dur:index?'2.6s':'3.1s',begin:index?'.8s':'0s',repeatCount:'indefinite'});
    });
  }
  return true;
}

function polish(){
  var copy=softenCopy();
  var hero=animateHero();
  var exhibit=animateExhibition();
  var taste=animateTasting();
  return copy&&hero&&exhibit&&taste;
}

function boot(){
  if(polish())return;
  var tries=0;
  var timer=setInterval(function(){
    tries+=1;
    if(polish()||tries>60)clearInterval(timer);
  },50);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
