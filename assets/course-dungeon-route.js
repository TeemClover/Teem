/* AI ใส่ซอส · route-only patch after restoring the 2026-08-09 course snapshot.
   Do not rewrite lesson copy, heroes, SVGs, or labels here.
   The only intentional delta from the restored course is: Lv.7 now lives at /classroom/dungeon/.
*/
(function(){
'use strict';

function apply(){
  if(/^\/classroom\/?(?:index\.html)?$/.test(location.pathname)){
    const link=document.querySelector('.cfinish .cgo');
    if(link) link.href='/classroom/dungeon/';
  }

  if(/^\/classroom\/first-web\.html$/.test(location.pathname)){
    document.querySelectorAll('#bossDoor .boss-go, a.boss-go').forEach(link=>{
      link.href='/classroom/dungeon/';
      link.dataset.bossRoom='dungeon';
    });
  }
}

function boot(){
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply,120);
  setTimeout(apply,600);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
