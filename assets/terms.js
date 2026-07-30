/* ═══════════════════════════════════════════════════════════════
   myclover — อภิธานศัพท์ในเกม (Keyword Tooltip)

   ใช้เฉพาะโซนท้ายเกมเท่านั้น
     /walkthrough/                  คู่มือหลังอ่านการ์ตูนจบ
     /classroom/awaken/             บทที่ 7
     /classroom/awaken/notebook/    บทส่งท้ายของตอนพิเศษลับ (ใช้เฉพาะข้อความ ไม่ใช้บนภาพ)
   หน้าอื่นในบ้านตั้งใจไม่ใช้ เพราะคำพวกนี้ควรโผล่ตอนคนพร้อมอ่านแล้ว
   ไม่ใช่โผล่ขวางตั้งแต่หน้าแรกที่ยังไม่รู้จักอะไรเลย

   วิธีใช้ในหน้า HTML:
     <button type="button" class="kw" data-kw="META">META</button>
   สคริปต์นี้จะเติมพฤติกรรมและ a11y ให้เอง ไม่ต้องเขียนอะไรเพิ่ม

   ทุกคำตอบสองอย่างเสมอ
     1. คำนี้แปลว่าอะไร
     2. ในบ้านนี้ใช้หมายถึงอะไร
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var W='/walkthrough/';
var TERMS={
  CLASS:{th:'คลาส',
    short:'แนวทางของตัวละคร ที่บอกว่าถนัดอะไรและควรเริ่มจากตรงไหน',
    mc:'สายที่คุณเลือกตอนจับเข็มทิศหน้าแรก ใช้จัดลำดับว่าควรหยิบอะไรก่อน'},
  ITEM:{th:'ไอเทม',
    short:'ของที่เก็บได้แล้วเอาไปใช้ต่อในภารกิจอื่นได้',
    mc:'ของที่คุณทำเสร็จแล้วเอาออกไปใช้กับงานจริงได้ ไม่ใช่ความรู้ที่ค้างอยู่ในหัว'},
  QUEST:{th:'เควสต์',
    short:'ภารกิจที่มีเป้าหมายชัด และรู้ว่าจบเมื่อไหร่',
    mc:'หนึ่งห้อง หนึ่งบทเรียน หรือหนึ่งงานที่คุณตั้งใจทำให้จบ'},
  'MAIN QUEST':{th:'เนื้อเรื่องหลัก',
    short:'ภารกิจที่ต้องผ่านถึงจะไปต่อได้',
    mc:'สามด่านบนแผนที่หน้าแรก — อ่านการ์ตูน เข้าห้องเรียน แล้วค่อยทำการ์ด'},
  'SIDE QUEST':{th:'เควสต์เสริม',
    short:'ภารกิจที่ทำเพิ่มก็ได้ ไม่ทำก็ยังจบเกม',
    mc:'ของอย่าง Smart Resume, club หรือความลับที่ซ่อนไว้ตามมุมต่าง ๆ'},
  LOADOUT:{th:'ชุดของที่เตรียมไป',
    short:'ของที่เลือกหยิบไปใช้กับภารกิจหนึ่งงาน',
    mc:'เครื่องมือ ไฟล์ คน และขั้นตอนที่คุณเลือกมาใช้กับ Quest ตรงหน้า'},
  BUILD:{th:'การจัดตัวละคร',
    short:'วิธีลงแต้มและเลือกของ ให้เก่งไปทางใดทางหนึ่งจริง ๆ',
    mc:'การเลือกว่าจะเก่งเรื่องอะไร แล้วยอมไม่เก่งเรื่องอื่น', go:W+'#build'},
  META:{th:'เมตา · Most Effective Tactic Available',
    short:'วิธีที่ได้ผลที่สุดในตอนนี้ ไม่ใช่ตลอดไป',
    mc:'อ่านว่าตอนนี้เครื่องมือและวิธีทำงานแบบไหนกำลังได้ผล แล้วใช้อันนั้น', go:W+'#meta'},
  PROGRESSION:{th:'เส้นทางการเก่งขึ้น',
    short:'ลำดับที่ทำให้เก่งขึ้นเป็นขั้น ไม่ใช่เก่งขึ้นแบบสุ่ม',
    mc:'ลำดับของบ้านนี้ — อ่านให้เห็นภาพ ลงมือทำ แล้วค่อยทำให้เป็นระบบ', go:W+'#progression'},
  SOURCE:{th:'ต้นฉบับ',
    short:'ข้อมูลและกติกาของคุณเอง ที่หยิบมาใช้ซ้ำได้ไม่ต้องเริ่มใหม่',
    mc:'ไฟล์ที่คุณสร้างไว้ในบท 4 แนบไปกับงานทีไร AI ก็รู้จักงานคุณทันที'},
  MULTIPLY:{th:'ตัวคูณ',
    short:'เปลี่ยนของที่เคยทำได้ครั้งเดียว ให้ทำซ้ำหรือขยายผลได้',
    mc:'ตัว X ใน Guild X มาจากคำนี้ — ทำครั้งเดียวแล้วให้มันทำงานต่อได้หลายรอบ'},
  SHARE:{th:'ส่งต่อ',
    short:'ทำให้ของที่สร้างเดินทางต่อได้ แม้เจ้าของไม่ได้อยู่ตรงนั้น',
    mc:'ขั้นสุดท้ายของ Loop — ของที่ดีต้องไปถึงมือคนอื่นได้ด้วยตัวมันเอง'},
  ACHIEVEMENT:{th:'ตรา',
    short:'หลักฐานว่าเคยผ่านหมุดหมายที่มีความหมาย',
    mc:'ตราหลักสามช่องบนการ์ด เป็นใบเสร็จของเส้นทาง ไม่ใช่ยศเหนือใคร'},
  TITLE:{th:'ไตเติ้ล',
    short:'ฉายาที่สะท้อนวิธีเล่นของคุณ ไม่ใช่หมุดหมายหลัก',
    mc:'อย่างผู้ค้นพบ ที่ได้จากการไปเจอของที่ซ่อนไว้ — ไม่กินช่องตราหลัก'},
  PARTY:{th:'ปาร์ตี้',
    short:'กลุ่มเล็กที่ลงสนามด้วยกัน แต่ละคนรับคนละหน้าที่',
    mc:'ชุด AI ที่ใช้สร้างบ้านหลังนี้ — ให้หน้าที่มันไป แล้วส่งงานให้ตรงสกิล', go:W+'#party'},
  GUILD:{th:'กิลด์',
    short:'ชุมชนใหญ่ที่ยังอยู่ต่อ แม้ภารกิจหนึ่ง ๆ จะจบไปแล้ว',
    mc:'Guild X — ห้องที่คุยกันจริงจัง เปิดให้คนที่เดินมากับบ้านแล้ว', go:W+'#party'},
  GM:{th:'Game Master',
    short:'คนที่วางกติกา ดูแลโลกของเกม และตัดสินใจว่าอะไรได้ไปต่อ',
    mc:'เจ้าของบ้าน — คนเขียนจดหมายที่คุณอ่านที่หน้าแรก'},
  WALKTHROUGH:{th:'คู่มือเดินเกม',
    short:'คำอธิบายทั้งเส้น เขียนโดยคนที่เล่นจบมาแล้ว',
    mc:'หน้าที่เปิดให้หลังอ่านการ์ตูนจบ — ถอดกลไกของเรื่องเป็นภาษาธุรกิจ', go:W},
  GRIND:{th:'งานซ้ำที่ต้องผ่าน',
    short:'ช่วงที่ต้องทำซ้ำ ๆ กว่าจะได้ของหรือได้เลเวล',
    mc:'งานที่ไม่สนุกแต่ตัดไม่ได้ — ควรเปลี่ยนเป็นระบบก่อนใครเพื่อน', go:W+'#grind'},
  DECK:{th:'สำรับ',
    short:'ชุดไพ่ที่เลือกมาลงสนาม ไม่ใช่ไพ่ทั้งหมดที่มี',
    mc:'ของที่เลือกมาลงสนามจริง คุณค่าอยู่ที่เลือกอะไรออก ไม่ใช่มีเยอะ', go:W+'#deck'},
  BUFF:{th:'บัฟ',
    short:'การปรับให้แรงขึ้น หรือของที่ใส่แล้วเก่งขึ้นชั่วคราว',
    mc:'อะไรก็ตามที่ทำให้รอบนี้ทำงานง่ายกว่าเดิม', go:W+'#patch'},
  NERF:{th:'เนิร์ฟ',
    short:'การปรับให้อ่อนลง เพราะมันแรงเกินไปสำหรับเกม',
    mc:'ตอนกติกาข้างนอกเปลี่ยนจนวิธีเดิมใช้ไม่ได้ผลเท่าเดิม', go:W+'#patch'},
  PATCH:{th:'แพตช์',
    short:'การอัปเดตกติกาของเกม ของที่เคยแรงอาจไม่แรงแล้ว',
    mc:'ตอนแพลตฟอร์มหรือเครื่องมือเปลี่ยนกติกา แล้วทุกคนต้องปรับตาม', go:W+'#patch'},
  'MIN-MAX':{th:'มินแมกซ์',
    short:'ดันจุดแข็งให้สุด แล้วยอมปล่อยจุดอ่อนไว้อย่างนั้น',
    mc:'เลือกเก่งให้สุดทางเดียว แล้วหาคนหรือเครื่องมือมาปิดส่วนที่เหลือ'},
  CONTEXT:{th:'บริบท',
    short:'ข้อมูลรอบ ๆ งานที่ทำให้อีกฝ่ายเข้าใจว่าคุณกำลังจะทำอะไร',
    mc:'ยิ่งบอกให้ชัดตั้งแต่ต้น ยิ่งไม่ต้องแก้หลายรอบทีหลัง'},
  PROMPT:{th:'คำสั่ง',
    short:'สิ่งที่คุณพิมพ์บอก AI ว่าอยากได้อะไร และห้ามเปลี่ยนอะไร',
    mc:'คลัง Prompt ในบท 5 คือท่าที่หยิบมาใช้ซ้ำได้ ไม่ต้องคิดใหม่ทุกครั้ง'},
  ITERATION:{th:'การวนแก้',
    short:'รอบของการลอง ดูผล แล้วแก้เฉพาะจุดที่ยังไม่เข้าที่',
    mc:'ของดีไม่ได้มาจากคำสั่งเดียว มาจากการแก้ให้ตรงจุดหลายรอบ'},
  'CRITICAL SUCCESS':{th:'คริติคอล',
    short:'ผลทอยสูงสุดที่ทำให้สำเร็จเกินคาด',
    mc:'ไม่ต้องรอรอบที่สมบูรณ์แบบ ถ้าผลที่ได้พอผ่านงานก็หยุดได้แล้ว'},
  PLAYER:{th:'ผู้เล่น',
    short:'คนที่ถือสิทธิ์ตัดสินใจในเกม ไม่ใช่ตัวละครที่ถูกสั่ง',
    mc:'AI เป็นปาร์ตี้ ไม่ใช่เจ้าของตัวละครของคุณ คนตัดสินใจสุดท้ายยังเป็นคุณ'},
  RESTORE:{th:'ซ่อมแซม',
    short:'ทำให้ของที่เสียหายกลับมาใช้งานได้ โดยไม่ลบร่องรอยของอดีต',
    mc:'สกิลที่ได้จากการอ่านโรงตีเหล็กจนจบ'},
  SAVE:{th:'เซฟ',
    short:'บันทึกความคืบหน้าไว้ กลับมาเล่นต่อได้',
    mc:'ความคืบหน้าของคุณเก็บอยู่ในเครื่องคุณเองล้วน ไม่ได้ส่งไปไหน'},
  SYNC:{th:'ซิงก์',
    short:'ทำให้ข้อมูลสองที่ตรงกัน',
    mc:'รหัสอย่าง BLACKSMITH หรือ AWAKEN คือวิธี sync ตราของคุณข้ามเครื่อง'}
};

/* ── สไตล์ ใส่ครั้งเดียวจากที่นี่ หน้าไหนเรียกไฟล์นี้ก็ได้เหมือนกันหมด ── */
var CSS=[
'.kw{font:inherit;background:none;border:0;padding:0;cursor:help;color:rgb(var(--kwc,27 106 66));',
'  font-weight:600;border-bottom:1.5px dotted currentColor;line-height:inherit}',
'.kw::after{content:"";display:inline-block;width:.42em;height:.42em;margin-left:.28em;',
'  vertical-align:.12em;border-radius:50%;background:currentColor;opacity:.55}',
'.kw:hover,.kw[aria-expanded="true"]{opacity:.82}',
'.kw:focus-visible{outline:2px solid rgb(190 148 66);outline-offset:2px;border-radius:4px}',
'.kwtip{position:absolute;z-index:120;max-width:360px;background:#143122;color:#F8F6F0;',
'  border:1px solid rgb(190 148 66/.6);border-radius:14px;padding:15px 17px;',
'  box-shadow:0 4px 10px rgb(0 0 0/.35),0 24px 48px -18px rgb(0 0 0/.9);',
'  font-family:"Anuphan",sans-serif;',
'  font-size:14px;line-height:1.7;text-align:left}',
'.kwtip .en{font-family:"Bai Jamjuree",sans-serif;font-weight:700;font-size:15px;letter-spacing:.06em;color:rgb(190 148 66)}',
'.kwtip .th{font-size:12.5px;color:rgb(255 255 255/.6);margin-top:1px}',
'.kwtip .short{margin-top:9px}',
'.kwtip .mcl{margin-top:10px;padding-top:9px;border-top:1px solid rgb(255 255 255/.14)}',
'.kwtip .mcl b{display:block;font-family:"Bai Jamjuree",sans-serif;font-size:10.5px;letter-spacing:.16em;',
'  color:rgb(190 148 66);margin-bottom:3px}',
'.kwtip .go{display:inline-block;margin-top:11px;font-family:"Bai Jamjuree",sans-serif;font-weight:700;',
'  font-size:13px;color:rgb(190 148 66);border-bottom:1px solid rgb(190 148 66/.5)}',
'.kwtip .arw{position:absolute;width:12px;height:12px;background:#143122;',
'  border-left:1px solid rgb(190 148 66/.6);border-top:1px solid rgb(190 148 66/.6);',
'  transform:rotate(45deg)}',
'.kwtip.up .arw{border-left:0;border-top:0;border-right:1px solid rgb(190 148 66/.6);',
'  border-bottom:1px solid rgb(190 148 66/.6)}',
'.kwtip .x{display:none}',
/* จอสัมผัส — ใช้แผ่นเลื่อนขึ้นจากล่างจอ ไม่ใช้ tooltip จิ๋วที่บังย่อหน้า */
'.kwtip.sheet .arw{display:none}',
'.kwtip.sheet{position:fixed;left:0;right:0;bottom:0;top:auto;max-width:none;',
'  border-radius:20px 20px 0 0;padding:22px 20px calc(24px + env(safe-area-inset-bottom));',
'  border-left:0;border-right:0;border-bottom:0;font-size:15px}',
'.kwtip.sheet .x{display:block;position:absolute;right:12px;top:12px;width:40px;height:40px;',
'  border-radius:50%;background:rgb(255 255 255/.1);border:0;color:#fff;font-size:18px;cursor:pointer}',
'.kwtip.sheet .en{font-size:18px}',
'.kwback{position:fixed;inset:0;z-index:119;background:rgb(3 12 7/.5)}',
'@media(prefers-reduced-motion:no-preference){',
'  .kwtip{animation:kwIn .18s ease-out}',
'  @keyframes kwIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
'  .kwtip.sheet{animation:kwUp .22s cubic-bezier(.22,1,.36,1)}',
'  @keyframes kwUp{from{transform:translateY(100%)}to{transform:none}}}'
].join('\n');

function init(){
  var styled=false;
  function addCSS(){
    if(styled) return;
    styled=true;
    var st=document.createElement('style');
    st.textContent=CSS;
    document.head.appendChild(st);
  }

  var tip=null, back=null, cur=null, pinned=false, shutT=null;

  /* หน่วงตอนปิดนิดหนึ่ง ไม่งั้นพอเลื่อนเมาส์จากคำไปหากล่อง
     มันจะหลุดออกจากคำก่อน กล่องปิดทันที แล้วกดลิงก์ "อ่านเพิ่ม" ไม่ได้เลย */
  function holdOpen(){ clearTimeout(shutT); }
  function shutSoon(){ clearTimeout(shutT); shutT=setTimeout(close,220); }

  function key(el){
    return (el.getAttribute('data-kw')||el.textContent||'').trim().toUpperCase();
  }
  function sheetMode(){
    return !(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }

  function build(t,k){
    var h='<div class="en">'+k+'</div><div class="th">'+t.th+'</div>'+
          '<p class="short">'+t.short+'</p>'+
          '<div class="mcl"><b>ในบ้านนี้</b>'+t.mc+'</div>';
    if(t.go) h+='<a class="go" href="'+t.go+'">อ่านเพิ่มใน Walkthrough →</a>';
    return h+'<i class="arw" aria-hidden="true"></i>'+
             '<button type="button" class="x" aria-label="ปิด">✕</button>';
  }

  function place(el){
    /* วางใต้คำ ถ้าชนขอบล่างก็สลับไปอยู่ด้านบน และหนีบไม่ให้ล้นซ้ายขวา */
    var r=el.getBoundingClientRect();
    var sx=window.pageXOffset, sy=window.pageYOffset;
    tip.classList.remove('up');
    tip.style.left='0px'; tip.style.top='0px';
    var tw=tip.offsetWidth, th=tip.offsetHeight, pad=10;
    var cx=r.left+sx+r.width/2;                       /* กึ่งกลางของคำ */
    var x=cx-tw/2;
    x=Math.max(sx+pad, Math.min(x, sx+document.documentElement.clientWidth-tw-pad));
    var fitsBelow=(r.bottom+th+12) <= window.innerHeight;
    var below=(fitsBelow || r.top-th-12 < 0);
    tip.style.left=Math.round(x)+'px';
    tip.style.top=Math.round(below ? r.bottom+sy+11 : r.top+sy-th-11)+'px';
    if(!below) tip.classList.add('up');

    /* ลูกศรชี้กลับไปที่คำ — หนีบให้อยู่ในกล่องเสมอ ไม่งั้นมันจะลอยออกไปข้างนอก */
    var arw=tip.querySelector('.arw');
    if(arw){
      var ax=Math.max(14, Math.min(cx-x-6, tw-26));
      arw.style.left=Math.round(ax)+'px';
      arw.style.top = below ? '-7px' : (th-6)+'px';
    }
  }

  function close(){
    clearTimeout(shutT);
    if(!tip) return;
    tip.remove(); tip=null;
    if(back){ back.remove(); back=null; }
    if(cur){ cur.setAttribute('aria-expanded','false'); cur=null; }
    pinned=false;
  }

  function open(el,pin){
    var k=key(el), t=TERMS[k];
    if(!t) return;
    holdOpen();
    if(cur===el && tip){ if(pin) pinned=true; return; }
    close();
    cur=el; pinned=!!pin;
    tip=document.createElement('div');
    tip.className='kwtip';
    tip.id='kwtip';
    tip.setAttribute('role','dialog');
    tip.setAttribute('aria-label','ความหมายของคำว่า '+k);
    tip.innerHTML=build(t,k);
    var sheet=sheetMode();
    if(sheet){
      tip.className='kwtip sheet';
      back=document.createElement('div');
      back.className='kwback';
      back.addEventListener('click',close);
      document.body.appendChild(back);
    }
    document.body.appendChild(tip);
    tip.querySelector('.x').addEventListener('click',function(){ close(); el.focus(); });
    /* เลื่อนเมาส์เข้ามาในกล่องแล้วต้องไม่ปิด จะได้อ่านจบและกดลิงก์ได้ */
    tip.addEventListener('mouseenter',holdOpen);
    tip.addEventListener('mouseleave',function(){ if(!pinned) shutSoon(); });
    /* โฟกัสหลุดออกจากกล่องไปที่อื่นที่ไม่ใช่คำต้นทาง = ปิด */
    tip.addEventListener('focusout',function(){
      setTimeout(function(){
        if(!tip) return;
        var a=document.activeElement;
        if(tip.contains(a) || a===el) return;
        close();
      },0);
    });
    if(!sheet) place(el);
    el.setAttribute('aria-expanded','true');
  }

  /* หน้าไหนสร้างเนื้อหาทีหลัง (เช่นบทส่งท้ายของตอนพิเศษที่โผล่หลังใช้สกิล)
     ก็ต้องได้ทั้งสไตล์และพฤติกรรมเหมือนกัน เรียก scan ซ้ำได้ไม่ซ้ำซ้อน */
  function scan(root){
    var list=(root||document).querySelectorAll('[data-kw]');
    if(!list.length) return 0;
    var n=0;
    Array.prototype.forEach.call(list,function(el){ if(wire(el)) n++; });
    return n;
  }

  function wire(el){
    if(el.dataset.kwReady) return false;
    var k=key(el);
    if(!TERMS[k]) return false;          /* ไม่มีในอภิธานศัพท์ ปล่อยเป็นข้อความธรรมดา */
    el.dataset.kwReady='1';
    addCSS();
    el.classList.add('kw');
    if(el.tagName!=='BUTTON') el.setAttribute('tabindex','0');
    el.setAttribute('aria-expanded','false');
    el.setAttribute('aria-controls','kwtip');

    el.addEventListener('click',function(e){
      e.preventDefault();
      if(cur===el && pinned) close(); else open(el,true);
    });
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); return; }
      /* กล่องถูกต่อไว้ท้าย body ลำดับ Tab เลยไม่ได้ไปต่อที่ลิงก์ในกล่องเอง
         ต้องพาไปให้ ไม่งั้นคนใช้คีย์บอร์ดกด "อ่านเพิ่ม" ไม่ได้เลย */
      if(e.key==='Tab' && !e.shiftKey && tip && cur===el){
        var go=tip.querySelector('.go');
        if(go){ e.preventDefault(); pinned=true; holdOpen(); go.focus(); }
      }
    });
    if(!sheetMode()){
      el.addEventListener('mouseenter',function(){ if(!pinned) open(el,false); });
      el.addEventListener('mouseleave',function(){ if(!pinned) shutSoon(); });
      el.addEventListener('focus',function(){ if(!pinned) open(el,false); });
      el.addEventListener('blur',function(){
        setTimeout(function(){
          if(pinned) return;
          /* โฟกัสย้ายไปคำอื่นแล้ว กล่องที่เปิดอยู่เป็นของคำใหม่ ห้ามไปปิดของเขา */
          if(cur!==el) return;
          /* โฟกัสหลุดเข้าไปในกล่องเอง (เช่นกด Tab ไปที่ลิงก์อ่านเพิ่ม) ก็ต้องไม่ปิด */
          if(tip && tip.contains(document.activeElement)) return;
          close();
        },0);
      });
    }
    return true;
  }

  scan();

  /* คอยดูว่ามีคำใหม่ถูกเพิ่มเข้ามาไหม จะได้ไม่ต้องให้แต่ละหน้าคอยเรียกเอง */
  if(window.MutationObserver && document.body){
    var pending=false;
    new MutationObserver(function(){
      if(pending) return;
      pending=true;
      setTimeout(function(){ pending=false; scan(); },0);
    }).observe(document.body,{childList:true,subtree:true});
  }
  window.MC_KW={ scan:scan };

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && tip){ var el=cur; close(); if(el) el.focus(); }
  });
  document.addEventListener('click',function(e){
    if(!tip || !pinned) return;
    if(tip.contains(e.target) || (cur && cur.contains(e.target))) return;
    close();
  });
  /* เลื่อนหน้าแล้วกล่องที่ลอยอยู่จะหลุดตำแหน่ง — ตามให้ทัน */
  window.addEventListener('scroll',function(){
    if(tip && cur && !tip.classList.contains('sheet')) place(cur);
  },{passive:true});
  window.addEventListener('resize',close);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

window.MC_TERMS=TERMS;
})();
