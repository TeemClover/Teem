/* AI ใส่ซอส · gentle motion for lesson visuals 1–4 and 6 */
(function(){
'use strict';

var meta=document.querySelector('meta[name="mc-item"]');
var lesson=meta&&meta.content;
var supported={
  'learn:free-ai':1,
  'learn:image-ai':1,
  'learn:clip-ai':1,
  'learn:notebooklm':1,
  'learn:first-web':1
};
if(!supported[lesson])return;

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

function directGroups(svg){
  return Array.prototype.filter.call(svg.children,function(node){
    return String(node.tagName).toLowerCase()==='g';
  });
}

function addStyle(){
  if(document.getElementById('mc-course-visual-motion-style'))return;
  var style=document.createElement('style');
  style.id='mc-course-visual-motion-style';
  style.textContent=`
    body.mc-source-motion .shelf .bottle{
      transform-origin:50% 100%;
      animation:mcBottleBreathe 4.8s ease-in-out infinite
    }
    body.mc-source-motion .shelf .bottle:nth-of-type(2){animation-delay:.55s;animation-duration:5.2s}
    body.mc-source-motion .shelf .bottle:nth-of-type(3){animation-delay:1.05s;animation-duration:4.5s}
    body.mc-source-motion .shelf .bottle:nth-of-type(4){animation-delay:1.5s;animation-duration:5.5s}
    body.mc-source-motion .shelf-label{animation:mcLabelNod 5.4s ease-in-out infinite}
    body.mc-serve-motion .hero-art svg{animation:mcServeFloat 5.8s ease-in-out infinite;transform-origin:center}
    @keyframes mcBottleBreathe{
      0%,100%{transform:translateY(0) rotate(0)}
      45%{transform:translateY(-4px) rotate(-.5deg)}
      65%{transform:translateY(-2px) rotate(.4deg)}
    }
    @keyframes mcLabelNod{
      0%,100%{transform:rotate(4deg) translateY(0);opacity:.52}
      50%{transform:rotate(2deg) translateY(-3px);opacity:.82}
    }
    @keyframes mcServeFloat{
      0%,100%{transform:translateY(0)}
      50%{transform:translateY(-4px)}
    }
    @media(prefers-reduced-motion:reduce){
      body.mc-source-motion .shelf .bottle,
      body.mc-source-motion .shelf-label,
      body.mc-serve-motion .hero-art svg{animation:none!important}
    }
  `;
  document.head.appendChild(style);
}

function pulseGold(svg,duration){
  if(!svg||reduce)return;
  var selector='[fill="#be9442"],[fill="#f4d37f"],[fill="#f7c96b"],[fill="#d7bd72"],[fill="#e3bd69"]';
  var nodes=svg.querySelectorAll(selector);
  Array.prototype.forEach.call(nodes,function(node,index){
    if(index>13)return;
    animate(node,{
      attributeName:'opacity',
      values:'1;.55;1',
      dur:(duration+((index%4)*.35))+'s',
      begin:((index%6)*.18)+'s',
      repeatCount:'indefinite'
    });
  });
}

function floatGroups(svg,count,baseDuration,amplitude){
  if(!svg||reduce)return;
  directGroups(svg).slice(0,count).forEach(function(group,index){
    var dy=Math.max(1,amplitude-(index%2));
    animateTransform(group,{
      attributeName:'transform',
      type:'translate',
      values:'0 0;0 -'+dy+';0 0',
      dur:(baseDuration+index*.45)+'s',
      begin:(index*.16)+'s',
      repeatCount:'indefinite',
      additive:'sum'
    });
  });
}

function motionLessonOne(){
  document.body.classList.add('mc-source-motion');
  return !!document.querySelector('.shelf .bottle');
}

function motionLessonTwo(){
  var svg=document.querySelector('.hero-stage svg');
  if(!svg)return false;
  if(svg.dataset.mcCourseMotion==='1')return true;
  svg.dataset.mcCourseMotion='1';
  floatGroups(svg,3,5.1,3);
  pulseGold(svg,3.5);

  if(!reduce){
    var scenes=directGroups(svg).slice(0,3);
    scenes.forEach(function(scene,index){
      animate(scene,{
        attributeName:'opacity',
        values:'.9;1;.9',
        dur:(4.2+index*.5)+'s',
        begin:(index*.35)+'s',
        repeatCount:'indefinite'
      });
    });
  }
  return true;
}

function motionLessonThree(){
  var svg=document.querySelector('.hero-stage svg');
  if(!svg)return false;
  if(svg.dataset.mcCourseMotion==='1')return true;
  svg.dataset.mcCourseMotion='1';
  floatGroups(svg,5,4.7,3);
  pulseGold(svg,3.1);

  if(!reduce){
    var scenes=directGroups(svg).slice(0,5);
    scenes.forEach(function(scene,index){
      animate(scene,{
        attributeName:'opacity',
        values:'.88;1;.88',
        dur:(3.9+index*.42)+'s',
        begin:(index*.26)+'s',
        repeatCount:'indefinite'
      });
    });

    var accents=svg.querySelectorAll('path[stroke="#be9442"],path[stroke="#f4d37f"],path[stroke="#f7c96b"]');
    Array.prototype.forEach.call(accents,function(path,index){
      if(index>5)return;
      animate(path,{
        attributeName:'stroke-opacity',
        values:'.45;1;.45',
        dur:(2.8+index*.3)+'s',
        begin:(index*.22)+'s',
        repeatCount:'indefinite'
      });
    });
  }
  return true;
}

function motionLessonFour(){
  var svg=document.querySelector('.multiply-ill svg');
  if(!svg)return false;
  if(svg.dataset.mcCourseMotion==='1')return true;
  svg.dataset.mcCourseMotion='1';
  if(reduce)return true;

  var groups=directGroups(svg);
  var chef=groups[0];
  var bottle=groups[1];
  var sauce=groups[2];
  var drops=groups[3];
  var plates=groups[4];

  animateTransform(chef,{
    attributeName:'transform',type:'translate',values:'0 0;0 -3;0 0',
    dur:'5.2s',repeatCount:'indefinite',additive:'sum'
  });
  animateTransform(bottle,{
    attributeName:'transform',type:'rotate',values:'0 52 82;-2 52 82;1 52 82;0 52 82',
    dur:'4.8s',repeatCount:'indefinite',additive:'sum'
  });

  if(sauce){
    Array.prototype.forEach.call(sauce.querySelectorAll('path:not(.sauce-line)'),function(path,index){
      animate(path,{
        attributeName:'stroke-opacity',values:'.55;1;.55',
        dur:(2.9+index*.25)+'s',begin:(index*.18)+'s',repeatCount:'indefinite'
      });
    });
  }

  if(drops){
    Array.prototype.forEach.call(drops.querySelectorAll('circle'),function(drop,index){
      animate(drop,{
        attributeName:'r',values:'5;7;5',dur:'2.7s',
        begin:(index*.28)+'s',repeatCount:'indefinite'
      });
      animate(drop,{
        attributeName:'opacity',values:'.6;1;.6',dur:'2.7s',
        begin:(index*.28)+'s',repeatCount:'indefinite'
      });
    });
  }

  if(plates){
    Array.prototype.forEach.call(plates.querySelectorAll(':scope > g'),function(plate,index){
      animateTransform(plate,{
        attributeName:'transform',type:'translate',values:'0 0;0 -3;0 0',
        dur:(4.1+index*.35)+'s',begin:(index*.2)+'s',repeatCount:'indefinite',additive:'sum'
      });
    });
  }
  return true;
}

function motionLessonSix(){
  var svg=document.querySelector('.hero-art svg');
  if(!svg)return false;
  if(svg.dataset.mcCourseMotion==='1')return true;
  svg.dataset.mcCourseMotion='1';
  document.body.classList.add('mc-serve-motion');
  pulseGold(svg,3.3);

  if(!reduce){
    var groups=directGroups(svg);
    if(groups[0]){
      animateTransform(groups[0],{
        attributeName:'transform',type:'translate',values:'0 0;0 -2;0 0',
        dur:'5.4s',repeatCount:'indefinite',additive:'sum'
      });
    }
    if(groups.length>1){
      animateTransform(groups[groups.length-1],{
        attributeName:'transform',type:'translate',values:'0 0;0 -1;0 0',
        dur:'4.3s',begin:'.45s',repeatCount:'indefinite',additive:'sum'
      });
    }
  }
  return true;
}

function polish(){
  if(lesson==='learn:free-ai')return motionLessonOne();
  if(lesson==='learn:image-ai')return motionLessonTwo();
  if(lesson==='learn:clip-ai')return motionLessonThree();
  if(lesson==='learn:notebooklm')return motionLessonFour();
  if(lesson==='learn:first-web')return motionLessonSix();
  return true;
}

function boot(){
  addStyle();
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
