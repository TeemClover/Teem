/* ═══════════════════════════════════════════════════════════════
   myclover — ความคืบหน้า + ตราประจำตัวของทั้งเว็บ

   ⚠️ สร้างอัตโนมัติจาก tools/build.py — อย่าแก้ไฟล์นี้ตรง ๆ

   เก็บอยู่ในเครื่องของผู้ใช้ล้วน (localStorage) ไม่ส่งออกไปไหน
   ล้างข้อมูลเบราว์เซอร์เมื่อไหร่ ความคืบหน้าก็หายไปด้วย

   ── เส้นความคืบหน้า ──
   forge = อ่านการ์ตูน  ·  learn = เรียนห้องเรียน
   ทำครบเส้นไหน ปลดตราของเส้นนั้นให้เอง

   ── บอกหน้าเว็บว่าหน้านี้คือของอะไร ──
   <meta name="mc-item" content="forge:ep1-everyone-gets-to-play">
   แล้วเมื่อผู้ใช้เลื่อนมาถึง [data-mc-end] (ถ้าไม่มีก็ footer)
   จะนับว่าทำชิ้นนั้นเสร็จ — เลื่อนถึงท้ายจริง ๆ ไม่ใช่แค่เปิดหน้า

   ── จุดเกาะใน HTML (ทาสีให้เองอัตโนมัติ) ──
   ค่าที่ขึ้นต้นด้วยชื่อเส้น เช่น "forge" หรือ "learn"
     [data-mc-progress=forge]      "อ่านแล้ว 3/12 ตอน" · ซ่อนถ้ายังไม่เริ่ม
     [data-mc-bar=forge]           แถบความคืบหน้า — ปรับ width เป็น %
     [data-mc-continue=forge:../]  ลิงก์ "ทำต่อ" — หลัง : คือ path นำหน้า
     [data-mc-demote=forge:ghost]  ใส่คลาส ghost เมื่อเริ่มแล้ว (ลดความเด่น)
     [data-mc-doneclass=forge:done] ใส่คลาส done เมื่อทำครบทั้งเส้น
     [data-mc-done=forge]          บล็อกที่โผล่เมื่อครบ
     [data-mc-undone=forge]        บล็อกที่ซ่อนเมื่อครบ (ตั้งต้นต้องมองเห็น)
     [data-mc-any=forge]           บล็อกที่โผล่เมื่อเริ่มแล้วอย่างน้อย 1 ชิ้น
     [data-mc-item=forge:slug]     ใส่คลาส .done ให้เมื่อทำชิ้นนั้นแล้ว
     [data-mc-title=FORGE]         บล็อกที่โผล่เมื่อได้ตรานั้นแล้ว
     [data-mc-notitle=FORGE]       บล็อกที่ซ่อนเมื่อได้ตรานั้นแล้ว
   ═══════════════════════════════════════════════════════════════ */
(function(){
  var TRACKS={
    forge:{key:'mc_read',done:'mc_forge_done',title:'BLACKSMITH',unit:'ตอน',what:'อ่าน',items:['ep1-everyone-gets-to-play','ep2-the-first-item','ep3-the-item-that-came-back','ep4-what-traveled-without-us','ep5-from-answers-to-a-system','ep6-the-starter-kit','ep7-a-voice-that-went-further','ep8-the-blacksmith-backstage','ep9-tools-must-reach-people','ep10-this-time-i-left-the-screen-on','ep11-everyone-has-their-own-class','ep12-a-new-game-a-new-league']},
    learn:{key:'mc_learn',done:'mc_learn_done',title:'',unit:'บท',what:'เรียน',items:['free-ai','image-ai','clip-ai','notebooklm','prompts','first-web']}
  };
  var TKEY='mc_titles';

  function ls(k,d){ try{ var v=localStorage.getItem(k); return v===null?d:v; }catch(e){ return d; } }
  function save(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function each(sel,fn){
    var l=document.querySelectorAll(sel);
    for(var i=0;i<l.length;i++) fn(l[i]);
  }
  function addCls(el,c,on){
    var re=new RegExp('(^|\\s)'+c+'(?=\\s|$)','g');
    el.className=(el.className.replace(re,' ').replace(/\s+/g,' ').replace(/^ | $/g,''))+(on?' '+c:'');
  }
  function split(v,def){
    var i=(v||'').indexOf(':');
    return i<0 ? [v||def, ''] : [v.slice(0,i), v.slice(i+1)];
  }

  /* ── ตราประจำตัว ── */
  function titles(){
    try{ var a=JSON.parse(ls(TKEY,'[]')); return Array.isArray(a)?a:[]; }
    catch(e){ return []; }
  }
  function hasTitle(k){ return titles().indexOf(k)>=0; }
  function grant(k){
    var a=titles();
    if(a.indexOf(k)>=0) return false;
    a.push(k); save(TKEY,JSON.stringify(a));
    return true;
  }

  /* ── เส้นความคืบหน้า ── */
  function T(name){
    var t=TRACKS[name];
    if(!t) return null;
    function get(){
      return ls(t.key,'').split(',').filter(function(s){ return t.items.indexOf(s)>=0; });
    }
    return {
      cfg      : t,
      items    : t.items,
      total    : t.items.length,
      list     : get,
      count    : function(){ return get().length; },
      has      : function(s){ return get().indexOf(s)>=0; },
      complete : function(){ return get().length>=t.items.length; },
      next     : function(){
        var a=get();
        for(var i=0;i<t.items.length;i++) if(a.indexOf(t.items[i])<0) return t.items[i];
        return null;
      },
      mark     : function(s){
        if(t.items.indexOf(s)<0) return false;
        var a=get();
        if(a.indexOf(s)>=0) return false;
        a.push(s); save(t.key,a.join(','));
        if(a.length>=t.items.length){ save(t.done,'1'); if(t.title) grant(t.title); }
        paint();
        return true;
      },
      reset    : function(){
        try{ localStorage.removeItem(t.key); localStorage.removeItem(t.done); }catch(e){}
        paint();
      }
    };
  }

  /* ตราเคยได้แล้วแต่ localStorage ของตราหาย — ซ่อมให้เงียบ ๆ */
  function heal(){
    for(var n in TRACKS) if(TRACKS[n].title && ls(TRACKS[n].done,'')==='1') grant(TRACKS[n].title);
  }

  var API={ TRACKS:TRACKS, track:T, titles:titles, hasTitle:hasTitle, grant:function(k){
    var isNew=grant(k); if(isNew) paint(); return isNew; }, paint:function(){ paint(); } };
  window.MC_QUEST=API;

  /* ── ทาสีทุกจุดเกาะ ── */
  function paint(){
    each('[data-mc-progress]',function(el){
      var t=T(el.getAttribute('data-mc-progress')); if(!t) return;
      var n=t.count(), z=t.total, d=n>=z;
      el.textContent = d ? (t.cfg.what+'ครบทั้ง '+z+' '+t.cfg.unit+'แล้ว')
                         : (t.cfg.what+'แล้ว '+n+'/'+z+' '+t.cfg.unit);
      el.hidden = n===0;
      addCls(el,'is-done',d);
    });
    each('[data-mc-bar]',function(el){
      var t=T(el.getAttribute('data-mc-bar')); if(!t) return;
      el.style.width=Math.round(t.count()/t.total*100)+'%';
    });
    each('[data-mc-continue]',function(el){
      var p=split(el.getAttribute('data-mc-continue')), t=T(p[0]); if(!t) return;
      var nx=t.next();
      if(!nx || t.count()===0){ el.hidden=true; return; }
      el.hidden=false;
      el.setAttribute('href', p[1]+nx+(p[1].indexOf('.html')<0 && p[1].slice(-1)!=='#' ? '/' : ''));
    });
    each('[data-mc-demote]',function(el){
      var p=split(el.getAttribute('data-mc-demote')), t=T(p[0]); if(!t) return;
      addCls(el,p[1]||'ghost',t.count()>0);
    });
    each('[data-mc-doneclass]',function(el){
      var p=split(el.getAttribute('data-mc-doneclass')), t=T(p[0]); if(!t) return;
      addCls(el,p[1]||'done',t.complete());
    });
    each('[data-mc-done]',function(el){
      var t=T(el.getAttribute('data-mc-done')); if(!t) return;
      el.hidden=!t.complete();
    });
    each('[data-mc-undone]',function(el){
      var t=T(el.getAttribute('data-mc-undone')); if(!t) return;
      el.hidden=t.complete();
    });
    each('[data-mc-any]',function(el){
      var t=T(el.getAttribute('data-mc-any')); if(!t) return;
      el.hidden=t.count()===0;
    });
    each('[data-mc-item]',function(el){
      var p=split(el.getAttribute('data-mc-item')), t=T(p[0]); if(!t) return;
      addCls(el,'done',t.has(p[1]));
    });
    each('[data-mc-title]',  function(el){ el.hidden=!hasTitle(el.getAttribute('data-mc-title')); });
    each('[data-mc-notitle]',function(el){ el.hidden= hasTitle(el.getAttribute('data-mc-notitle')); });
  }

  /* ── หน้านี้คือชิ้นไหน แล้วอ่านถึงท้ายรึยัง ── */
  function watch(){
    var m=document.querySelector('meta[name="mc-item"]');
    if(!m) return;
    var p=split(m.getAttribute('content')), t=T(p[0]);
    if(!t || !p[1]) return;
    var end=document.querySelector('[data-mc-end]')||document.querySelector('footer');
    var fired=false;
    function fire(){ if(fired) return; fired=true; t.mark(p[1]); off(); }

    /* นับเมื่ออ่านไปถึง 70% ของหน้าด้วย ไม่ใช่รอให้ถึงบรรทัดสุดท้ายเป๊ะ ๆ
       คนอ่านจบเนื้อหาแล้วมักกดย้อนกลับก่อนจะเลื่อนผ่านฟุตเตอร์ */
    var tick=false;
    function onScroll(){
      if(tick) return;
      tick=true;
      requestAnimationFrame(function(){
        tick=false;
        var d=document.documentElement, b=document.body;
        var h=Math.max(d.scrollHeight,b.scrollHeight)-window.innerHeight;
        if(h<=0){ fire(); return; }              /* หน้าสั้นจนไม่ต้องเลื่อน */
        var y=window.pageYOffset||d.scrollTop||0;
        if(y/h>=0.7) fire();
      });
    }
    function off(){ window.removeEventListener('scroll',onScroll); }

    if(end && window.IntersectionObserver){
      new IntersectionObserver(function(es,o){
        if(es[0].isIntersecting){ o.disconnect(); fire(); }
      },{rootMargin:'0px 0px -12% 0px'}).observe(end);
      window.addEventListener('scroll',onScroll,{passive:true});
      onScroll();                                 /* เผื่อหน้าสั้นหรือเปิดมาแล้วอยู่ท้ายเลย */
    } else {
      fire();   /* เบราว์เซอร์เก่า — นับให้เลยดีกว่าไม่นับ */
    }
    /* แตะภาพไปตอนต่อไป = อ่านตอนนี้จบแล้วเหมือนกัน */
    var tn=document.querySelector('.tapnext');
    if(tn) tn.addEventListener('click',fire);
  }

  /* ── ย้ายความคืบหน้าเก่ามาชื่อใหม่ ──
     ตอนการ์ตูนถูกเรียงเลขใหม่เป็น 1–12 (เดิมเริ่มที่ 0 และมีตอน 9.5)
     คนที่อ่านค้างไว้ก่อนหน้านั้นต้องไม่เสียของ — แปลงครั้งเดียวแล้วปักธงไว้ */
  var RENAMED={'ep0-my-own-machine':'ep1-everyone-gets-to-play','ep1-month-five':'ep2-the-first-item','ep2-footsteps':'ep3-the-item-that-came-back','ep3-fresh-disc':'ep4-what-traveled-without-us','ep4-deckbuilding':'ep5-from-answers-to-a-system','ep5-dream-factory':'ep6-the-starter-kit','ep6-ten-to-thousand':'ep7-a-voice-that-went-further','ep7-the-smith-who-lost':'ep8-the-blacksmith-backstage','ep8-the-one-from-hatyai':'ep9-tools-must-reach-people','ep9-open-the-screen':'ep10-this-time-i-left-the-screen-on','ep9-5-the-guild-i-imagined':'ep11-everyone-has-their-own-class','ep10-the-tenth-step':'ep12-a-new-game-a-new-league'};
  function migrate(){
    if(ls('mc_read_v2','')==='1') return;
    var raw=ls('mc_read','');
    if(raw){
      var out=[], seen={};
      raw.split(',').forEach(function(s){
        var k=RENAMED[s]||s;
        if(k && !seen[k]){ seen[k]=1; out.push(k); }
      });
      save('mc_read',out.join(','));
    }
    save('mc_read_v2','1');
  }

  function boot(){ migrate(); heal(); paint(); watch(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
