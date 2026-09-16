(function(){
  'use strict';
  if(location.protocol!=='https:')return;
  if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true){document.cookie='mc_sauce_visitor=; Path=/; Max-Age=0; Secure; SameSite=Lax';return;}
  var stopped=false,queue=[],timer,busy=false,seen={},visitor,session;
  try{
    if(localStorage.getItem('myclover_analytics_optout')==='1'){document.cookie='mc_sauce_visitor=; Path=/; Max-Age=0; Secure; SameSite=Lax';return;}
    visitor=localStorage.getItem('mc_sauce_visitor')||crypto.randomUUID();localStorage.setItem('mc_sauce_visitor',visitor);
    session=sessionStorage.getItem('mc_sauce_session')||crypto.randomUUID();sessionStorage.setItem('mc_sauce_session',session);
  }catch(_){return;}
  document.cookie='mc_sauce_visitor='+visitor+'; Path=/; Max-Age=31536000; Secure; SameSite=Lax';
  var keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'],query=new URLSearchParams(location.search),campaign={};
  try{campaign=JSON.parse(sessionStorage.getItem('ai_sauce_campaign_v1'))||{};}catch(_){}
  if(keys.some(function(k){return query.has(k);})){campaign={};keys.forEach(function(k){campaign[k]=(query.get(k)||'').slice(0,160);});try{sessionStorage.setItem('ai_sauce_campaign_v1',JSON.stringify(campaign));}catch(_){}}
  try{if(document.referrer)campaign.referrer_host=new URL(document.referrer).hostname.slice(0,160);}catch(_){}
  function flush(){if(stopped||busy||!queue.length)return;busy=true;var batch=queue.splice(0,20);fetch('/api/sales-behavior',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({visitor:visitor,session:session,campaign:campaign,device:innerWidth<768?'mobile':innerWidth<1024?'tablet':'desktop',events:batch})}).then(function(r){if(!r.ok)throw Error('failed');}).catch(function(){queue=batch.concat(queue).slice(0,60);}).finally(function(){busy=false;});}
  function track(name){if(stopped)return;queue.push({id:crypto.randomUUID(),name:name});if(queue.length>60)queue.shift();clearTimeout(timer);timer=setTimeout(flush,1200);}
  function once(name){if(seen[name])return;seen[name]=true;track(name);}
  window.SauceStats={track:track,disable:function(){stopped=true;queue=[];clearTimeout(timer);}};once('page_view');
  var observer=new IntersectionObserver(function(entries){entries.forEach(function(e){if(!e.isIntersecting)return;var id=e.target.id;if(id==='payment-qr'){if(!e.target.hidden)once('qr_view');}else once('section_'+(id==='student-reviews'?'reviews':id));});},{threshold:0.15});
  ['offer','package','bonus','student-reviews','payment-qr'].forEach(function(id){var el=document.getElementById(id);if(el)observer.observe(el);});
  document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href.indexOf('https://lin.ee/')===0)track('line_click');});
  var form=document.getElementById('receipt-form');if(form)form.addEventListener('focusin',function(){once('receipt_start');});
  document.addEventListener('scroll',function(){var max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;var percent=100*scrollY/max;[25,50,75,100].forEach(function(n){if(percent>=n-1)once('scroll_'+n);});},{passive:true});
  var seconds=0;setInterval(function(){if(!document.hidden){seconds+=5;[30,60,120].forEach(function(n){if(seconds>=n)once('engaged_'+n);});}flush();},5000);
  document.addEventListener('visibilitychange',function(){if(document.hidden)flush();});window.addEventListener('pagehide',flush);
})();
