/* ═══════════════════════════════════════════════════════════════
   myclover — ความคืบหน้าการอ่าน /forge/

   ⚠️ สร้างอัตโนมัติจาก tools/build_forge.py — อย่าแก้ไฟล์นี้ตรง ๆ

   เก็บอยู่ในเครื่องของผู้อ่านล้วน (localStorage) ไม่ส่งออกไปไหน
   ล้างข้อมูลเบราว์เซอร์เมื่อไหร่ ความคืบหน้าก็หายไปด้วย

   จุดเกาะใน HTML (ทาสีให้เองอัตโนมัติ)
     [data-mc-progress]  ข้อความ "อ่านแล้ว 3/12 ตอน" · ซ่อนถ้ายังไม่เริ่ม
     [data-mc-bar]       แถบความคืบหน้า — ปรับ width เป็น %
     [data-mc-continue]  ลิงก์ "อ่านต่อ" — ค่าใน attribute คือ path นำหน้า slug
     [data-mc-demote=k]  ใส่คลาส k ให้เมื่อเริ่มอ่านแล้ว (ลดความเด่นของปุ่มเริ่มต้น)
     [data-mc-done]      บล็อกที่โผล่เมื่ออ่านครบทุกตอน
     [data-mc-undone]    บล็อกที่ซ่อนเมื่ออ่านครบแล้ว (ตั้งต้นต้องมองเห็น)
     [data-mc-any]       บล็อกที่โผล่เมื่อเริ่มอ่านแล้วอย่างน้อย 1 ตอน
     [data-mc-read=slug] ใส่คลาส .read ให้เมื่ออ่านตอนนั้นแล้ว
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var EPS=['ep0-my-own-machine','ep1-month-five','ep2-footsteps','ep3-fresh-disc','ep4-deckbuilding','ep5-dream-factory','ep6-ten-to-thousand','ep7-the-smith-who-lost','ep8-the-one-from-hatyai','ep9-open-the-screen','ep9-5-the-guild-i-imagined','ep10-the-tenth-step'];               /* เรียงตามลำดับอ่าน */
  var KEY='mc_read', DONE='mc_forge_done';

  function get(){
    try{
      return (localStorage.getItem(KEY)||'').split(',')
        .filter(function(s){ return EPS.indexOf(s)>=0; });
    }catch(e){ return []; }
  }
  function put(a){
    try{
      localStorage.setItem(KEY,a.join(','));
      if(a.length>=EPS.length) localStorage.setItem(DONE,'1');
    }catch(e){}
  }
  function each(sel,fn){
    var l=document.querySelectorAll(sel);
    for(var i=0;i<l.length;i++) fn(l[i]);
  }

  var API={
    eps      : EPS,
    total    : EPS.length,
    list     : get,
    count    : function(){ return get().length; },
    has      : function(s){ return get().indexOf(s)>=0; },
    complete : function(){ return get().length>=EPS.length; },
    mark     : function(s){
      if(EPS.indexOf(s)<0) return false;
      var a=get();
      if(a.indexOf(s)>=0) return false;
      a.push(s); put(a); paint();
      return true;
    },
    next     : function(){
      var a=get();
      for(var i=0;i<EPS.length;i++) if(a.indexOf(EPS[i])<0) return EPS[i];
      return null;
    },
    reset    : function(){
      try{ localStorage.removeItem(KEY); localStorage.removeItem(DONE); }catch(e){}
      paint();
    }
  };
  window.MC_READ=API;

  function paint(){
    var n=API.count(), t=EPS.length, done=n>=t, nx=API.next();
    each('[data-mc-progress]',function(el){
      el.textContent = done ? ('อ่านครบทั้ง '+t+' ตอนแล้ว') : ('อ่านแล้ว '+n+'/'+t+' ตอน');
      el.hidden = n===0;
      el.className = el.className.replace(/\s*is-done/,'') + (done?' is-done':'');
    });
    each('[data-mc-bar]',function(el){ el.style.width=Math.round(n/t*100)+'%'; });
    each('[data-mc-continue]',function(el){
      if(!nx || n===0){ el.hidden=true; return; }
      el.hidden=false;
      el.setAttribute('href', el.getAttribute('data-mc-continue')+nx+'/');
    });
    each('[data-mc-demote]',function(el){
      var k=el.getAttribute('data-mc-demote');
      el.className = el.className.replace(new RegExp('\s*'+k+'\b'),'') + (n>0?' '+k:'');
    });
    each('[data-mc-done]',  function(el){ el.hidden=!done; });
    each('[data-mc-undone]',function(el){ el.hidden=done;  });
    each('[data-mc-any]',   function(el){ el.hidden=n===0; });
    each('[data-mc-read]',function(el){
      var r=API.has(el.getAttribute('data-mc-read'));
      el.className = el.className.replace(/\s*read\b/,'') + (r?' read':'');
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',paint);
  else paint();
})();
