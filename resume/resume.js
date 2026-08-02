(function(){
  var body=document.body,buttons=document.querySelectorAll('.switch-btn');
  function setMode(mode,save){
    var life=mode==='lifestyle';
    body.classList.toggle('career-mode',!life);body.classList.toggle('lifestyle-mode',life);
    buttons.forEach(function(btn){btn.setAttribute('aria-pressed',btn.dataset.mode===mode?'true':'false')});
    document.querySelector('meta[name="theme-color"]').setAttribute('content',life?'#171e2a':'#082417');
    if(save){try{localStorage.setItem('mc_resume_mode',mode)}catch(e){}history.replaceState(null,'',life?'#lifestyle':'#career')}
    requestAnimationFrame(revealVisible);
  }
  buttons.forEach(function(btn){btn.addEventListener('click',function(){setMode(btn.dataset.mode,true);window.scrollTo({top:0,behavior:'smooth'})})});
  var initial=location.hash==='#lifestyle'?'lifestyle':'career';
  if(location.hash!=='#career'&&location.hash!=='#lifestyle'){try{initial=localStorage.getItem('mc_resume_mode')||'career'}catch(e){}}
  setMode(initial,false);
  var els=[].slice.call(document.querySelectorAll('.reveal'));
  function revealVisible(){els.forEach(function(el){if(el.offsetParent!==null&&el.getBoundingClientRect().top<innerHeight+60)el.classList.add('show')})}
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('show');io.unobserve(entry.target)}})},{threshold:.06,rootMargin:'0px 0px -35px'});els.forEach(function(el){io.observe(el)})}else{els.forEach(function(el){el.classList.add('show')})}
  revealVisible();
})();
