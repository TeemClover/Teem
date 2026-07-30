/* ═══════════════════════════════════════════════════════════════
   myclover — เนื้อหาตอนพิเศษลับ "เพื่อนเล่น" (หน้า 2–10 + บทส่งท้าย)

   แยกออกมาเป็นไฟล์ต่างหากโดยตั้งใจ
   หน้า /classroom/awaken/notebook/ จะโหลดไฟล์นี้ก็ต่อเมื่อผู้เล่นใช้สกิล
   RESTORE สำเร็จแล้วเท่านั้น คนที่ยังไม่ได้ซ่อมสมุดจึงเปิดดูซอร์สของหน้า
   แล้วไม่เจอทั้งภาพ บทส่งท้าย และรหัสสุดท้าย

   ไฟล์นี้ไม่ทำงานอะไรเอง แค่คืนก้อน HTML ให้หน้าเรียกใช้
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
var CODE='wellplayed';

/* ── หน้า 2–10 · บทส่งท้าย · รหัสสุดท้าย ── */
function panel(n,alt){
  return '<figure class="panel'+(n===2?' scroll-anchor':'')+'"'+(n===2?' id="panel2" tabindex="-1"':'')+
    ' data-wait="หน้าที่ '+n+'&#10;รอไฟล์ img/nb-'+(n<10?'0':'')+n+'.jpg">'+
    '<picture><source type="image/webp" srcset="img/nb-'+(n<10?'0':'')+n+'.webp">'+
    '<img src="img/nb-'+(n<10?'0':'')+n+'.jpg" width="1024" height="1536" '+
    (n===2?'':'loading="lazy" ')+'decoding="async" alt="'+alt+'" '+
    'onerror="this.closest(\'.panel\').classList.add(\'wait\')"></picture></figure>';
}
var ALT=[
  '','', 'หน้าที่ 2 — โต๊ะที่ใหญ่ขึ้น กับบอร์ดเกมกว่าร้อยกล่อง',
  'หน้าที่ 3 — ทุกคนเท่าเทียมกันบนกติกาเดียวกัน',
  'หน้าที่ 4 — การเดินทาง ร้านเกม เพื่อน คนรัก และการแข่งขัน',
  'หน้าที่ 5 — ภาพรวมของการออกไปเล่นและได้เห็นโลก',
  'หน้าที่ 6 — Party Clover สามคน แปดแมตช์ หนึ่งปาร์ตี้',
  'หน้าที่ 7 — แมตช์ Azalea ปะทะ Fai',
  'หน้าที่ 8 — แมตช์ Briar ปะทะ Briar',
  'หน้าที่ 9 — แมตช์สุดท้าย Chane ปะทะ Arakni',
  'หน้าที่ 10 — ทั้งทีมชนหมัดพร้อมกันแล้วพูดว่า GG'
];
function kw(k,label){ return '<button type="button" data-kw="'+k+'">'+(label||k)+'</button>'; }

function buildRestored(){
  var pics='';
  for(var i=2;i<=10;i++) pics+=panel(i,ALT[i]);

  return '<div class="pages wrap">'+pics+'</div>'+

  '<div class="wrap"><div class="done">'+
    '<span class="tag mono">RESTORATION COMPLETE</span>'+
    '<div class="cnt mono">Pages readable: 10 / 10</div>'+
    '<blockquote>“ของเก่าไม่จำเป็นต้องกลับมาใหม่<br>แค่ซ่อมจนเรื่องของมันถูกอ่านได้อีกครั้ง”</blockquote>'+
  '</div></div>'+

  '<article class="after"><div class="read">'+
    '<div class="endtag">'+
      '<span class="tag mono">SECRET ENDING FOUND</span>'+
      '<h1 class="disp">เพื่อนเล่น</h1>'+
    '</div>'+
    '<p>ยินดีด้วยครับ</p>'+
    '<p>คุณได้เดินผ่านทุกอย่างที่ซ่อนอยู่ในเส้นทางนี้ จนพบตอนจบที่ไม่มีอยู่บนแผนที่ '+
      'ไม่มีชื่อให้เดาในรายการตรา และไม่มีคำใบ้บนหน้าทำการ์ด</p>'+
    '<p>คุณไม่ได้มาถึงตรงนี้เพราะเดินตามลูกศรอย่างเดียว</p>'+
    '<div class="beat">'+
      '<span>คุณสังเกตเห็นสมุดเก่า</span>'+
      '<span>กลับไปเคลียร์ The Forge</span>'+
      '<span>แล้วใช้สกิล RESTORE ซ่อมเรื่องราวที่เวลาเคยทำให้เลือนหายด้วยตัวเอง</span>'+
    '</div>'+
    '<p>นี่คือรางวัลของคนที่ไม่ได้มองเห็นแค่สิ่งที่เกมวางไว้ตรงหน้า '+
      'แต่ยังมองเห็น '+kw('QUEST','เควสต์')+'ที่ซ่อนอยู่ระหว่างทางด้วย</p>'+

    '<hr class="hr">'+
    '<h2 class="disp">ภาพที่คนดูไม่เห็น</h2>'+
    '<p>โมเมนต์การดวลการ์ดที่คุณเพิ่งเห็น อาจดูเหมือนการต่อสู้ของ Ranger, Runeblade และ Assassin '+
      'ที่ยิงเวท ฟันดาบ และปิดเกมกันอย่างเอาเป็นเอาตาย</p>'+
    '<p>แต่ในโลกจริง ผู้ชมเห็นเพียงคนสองคนถือไพ่ นั่งนิ่ง และมองหน้ากันอยู่บนโต๊ะ</p>'+
    '<p class="tight">โลกอีกด้านเกิดขึ้นในจินตนาการของ '+kw('PLAYER','ผู้เล่น')+'</p>'+
    '<p>เมื่อเรารักเกมมากพอ ไพ่หนึ่งใบอาจกลายเป็นลูกธนู ดาเมจหนึ่งหน่วยอาจกลายเป็นสายฟ้า '+
      'และการวางการ์ดใบสุดท้าย อาจรู้สึกเหมือนดาบที่ฟันผ่านการป้องกันทั้งหมด</p>'+
    '<p>วิดีโอด้านล่างถ่ายทอดความรู้สึกแบบเดียวกันได้ดี — คนเล่นการ์ดไม่ได้เห็นเพียงกระดาษบนโต๊ะ '+
      'แต่เห็นตัวเองยืนอยู่ในโลกของเกมจริง ๆ</p>'+
    '<div class="video"><iframe src="https://www.youtube.com/embed/9sOJ2BuiEqM" '+
      'title="How it Feels to Play Flesh and Blood" loading="lazy" '+
      'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '+
      'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>'+
    '<a class="vlink" href="https://www.youtube.com/watch?v=9sOJ2BuiEqM" target="_blank" '+
      'rel="noopener">เปิดวิดีโอบน YouTube →</a>'+

    '<hr class="hr">'+
    '<h2 class="disp">จากจินตนาการ กลายเป็นภาพที่แบ่งปันได้</h2>'+
    '<p>AI ทำให้ผมถ่ายทอดความรู้สึกในวันนั้นออกมาเป็นการ์ตูนได้จริง</p>'+
    '<p>ไม่ใช่เพราะ AI รู้ทุกอย่างตั้งแต่คำสั่งแรก แต่เพราะเราให้ '+kw('CONTEXT','บริบท')+' ที่ชัด '+
      'สร้าง '+kw('SOURCE')+' ที่เติบโตไปพร้อมกับงาน ออกแบบ '+kw('PROMPT')+' ให้เห็นสิ่งที่ต้องรักษา '+
      'ตรวจสิ่งที่ผิด แล้วแก้เฉพาะจุดผ่านหลายรอบของ '+kw('ITERATION','การวนแก้')+'</p>'+
    '<p>ชุดภาพดวลที่คุณเห็นในตอนท้าย สร้างและปรับแก้ผ่าน AI บนโทรศัพท์มือถือ '+
      'โดยไม่ได้พิมพ์ข้อความทับหรือแต่งแก้ด้วย Photoshop</p>'+
    '<p>เวอร์ชันสุดท้ายจึงไม่ใช่ผลลัพธ์จากคำสั่งมหัศจรรย์เพียงครั้งเดียว '+
      'แต่มาจากการสื่อสารกับ AI ให้แม่นขึ้นทุกครั้ง จนภาพ ตัวเลข ลำดับการเล่น และข้อความ ทำงานร่วมกันได้ครบ</p>'+
    '<p><strong>นี่คือ Workflow เดียวกับที่คุณได้เรียนมาตลอดเจ็ดบทของ myclover.com</strong></p>'+
    '<p>และถ้าคุณทำเรื่องที่ซับซ้อนกว่านี้น้อยกว่า — งานเขียน ภาพ สไลด์ ระบบงาน หรือเครื่องมือของตัวเอง — '+
      'ก็อยู่ในระยะที่คุณทำได้เช่นกัน</p>'+

    '<hr class="hr">'+
    '<h2 class="disp">ฝึกให้พลาดน้อยลง</h2>'+
    '<p>ทีมของเราไม่ได้เริ่มต้นจากการชนะ</p>'+
    '<p>ช่วงแรกเราไปแข่งงานไหนก็แพ้ จากนั้นจึงกลับมาดูเทปย้อนหลัง ทบทวนการตัดสินใจ ปรับ '+kw('DECK','เด็ค')+' '+
      'ซ้อมใหม่ แล้วกลับไปเล่นอีกครั้ง</p>'+
    '<p>วันหนึ่งเราเลิกตั้งเป้าว่า “ต้องเล่นให้ดีที่สุดทุกครั้ง”</p>'+
    '<p class="tight">และเริ่มฝึกว่า <strong>“ทำอย่างไรให้พลาดน้อยที่สุด”</strong></p>'+
    '<p>การทำงานกับ AI ก็เหมือนกัน ในช่วงเริ่มต้นคุณจะสั่งผิด AI จะเข้าใจบริบทผิด '+
      'ภาพจะมีรายละเอียดเกิน ตัวเลขจะสลับ หรือสิ่งที่เคยถูกต้องจะหายไปในรอบแก้ไขถัดมา</p>'+
    '<p>ภาพ Briar ปะทะ Briar ใช้เวลาทำเพียงหน้าเดียวประมาณสามชั่วโมง ไม่ใช่เพราะเราไม่มีคำตอบ '+
      'แต่เพราะงานที่ละเอียดต้องอาศัยการตรวจ การเทียบ และการแก้ให้ตรงจุด</p>'+
    '<p>ความผิดพลาดจึงไม่ใช่หลักฐานว่าคุณใช้ AI ไม่เป็น มันคือสัญญาณกลับมาจากระบบ '+
      'ว่ารอบต่อไปควรใส่บริบทเพิ่มตรงไหน ควรล็อกอะไรไว้ '+
      'และควรแก้เพียงส่วนใดโดยไม่รื้อของที่ดีอยู่แล้ว</p>'+

    '<hr class="hr">'+
    '<h2 class="disp">ทอยต่อจนผ่านเควสต์</h2>'+
    '<p>การสร้างงานด้วย AI คล้ายการทอยลูกเต๋ายี่สิบหน้า</p>'+
    '<p>บางครั้งคุณอาจได้ 5 บางครั้งได้ 12 และบางครั้งได้ 20 — '+kw('CRITICAL SUCCESS','คริติคอล')+'</p>'+

    '<div class="dice">'+
      '<span class="lb mono">D20 · ลองทอยดูก็ได้</span>'+
      '<button type="button" class="d20" id="d20" aria-describedby="d20say">'+
        '<svg viewBox="0 0 100 100" aria-hidden="true">'+
          '<defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">'+
            '<stop offset="0" stop-color="#F6E7B8"/><stop offset=".5" stop-color="#BE9442"/>'+
            '<stop offset="1" stop-color="#8A6A22"/></linearGradient></defs>'+
          '<polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="url(#dg)" '+
            'stroke="#5A3E00" stroke-width="2"/>'+
          '<polygon points="50,20 78,36 78,64 50,80 22,64 22,36" fill="none" '+
            'stroke="#5A3E00" stroke-width="1.4" opacity=".45"/>'+
        '</svg>'+
        '<span class="num" id="d20num">20</span>'+
      '</button>'+
      '<p class="say" id="d20say" role="status" aria-live="polite">กดลูกเต๋าเพื่อทอย</p>'+
      '<p class="hint">ทอยเล่น ๆ ไม่ได้เก็บผลไว้ที่ไหน</p>'+
    '</div>'+

    '<p>แต่เป้าหมายไม่ได้มีเพียงการทอยให้ได้ 20 ทุกครั้ง '+
      'ถ้าผลลัพธ์ระดับ 17 ทำให้คุณผ่านเควสต์ได้ '+
      'มันก็อาจเป็นคำตอบที่เหมาะสมที่สุดสำหรับงานนั้นแล้ว</p>'+
    '<p>คุณเป็นคนตัดสินใจว่าเมื่อไรควรทอยต่อ เมื่อไรควรหยุด '+
      'และเมื่อไรควรเก็บของดีที่มีอยู่ แล้วแก้แค่จุดสุดท้ายที่ยังไม่เข้าที่</p>'+
    '<p class="tight"><strong>AI ไม่ได้ถือสิทธิ์ตัดสินใจครั้งสุดท้ายแทนคุณ</strong> '+
      'คุณยังคงเป็นผู้เล่น และเป็นคนเลือก '+kw('BUILD','บิลด์')+' ของงานชิ้นนั้นด้วยตัวเอง</p>'+

    '<hr class="hr">'+
    '<h2 class="disp">เพื่อนเล่น</h2>'+
    '<p>สุดท้ายนี้ หากวันหนึ่งเรามีโอกาสได้เจอกัน</p>'+
    '<div class="beat"><span>ยื่นมือออกมา</span><span>กำหมัดไว้</span></div>'+
    '<p>ผมจะยื่นหมัดไปชนกับคุณ</p>'+
    '<div class="beat"><span>ไม่ต้องเกร็ง</span><span>ไม่ต้องมีระบบอาวุโส</span>'+
      '<span>ไม่ต้องถามตำแหน่งหรืออันดับ</span></div>'+
    '<p>บนโต๊ะนี้ เรามีสถานะเดียวกัน</p>'+
    '<p style="font-size:21px;margin-top:12px"><strong>เพื่อนเล่น</strong></p>'+
    '<p style="font-size:18px">🍀 <strong>Good Luck, Have Fun</strong> 🤜🏻🤛🏻</p>'+
    '<div id="endSentinel" aria-hidden="true"></div>'+
  '</div></article>'+

  '<div class="wrap"><div class="finalbox" id="finalBox" hidden>'+
    '<span class="tag mono">FINAL CODE UNLOCKED</span>'+
    '<code>'+CODE+'</code>'+
    '<p>ไม่มีคำใบ้ของรหัสนี้อยู่บนแผนที่ และไม่มีช่องว่างรออยู่ในหน้าทำการ์ด</p>'+
    '<p><strong>ไม่ต้องพิมพ์รหัสที่ไหน</strong><br>แตะหมัดด้านล่าง แล้วระบบจะส่งรหัสนี้เข้าเซฟของคุณเอง</p>'+
    '<button type="button" class="bump" id="bumpBtn">'+
      '<span class="fists" aria-hidden="true">🤜🏻<span class="r">🤛🏻</span></span>'+
      '<span id="bumpTx">แตะหมัด</span></button>'+
  '</div></div>';
}

/* ── ถ้วยแพลตินัม ── */
function trophyHTML(){
  return '<div class="in" role="dialog" aria-modal="true" aria-labelledby="tpTtl">'+
    '<div class="site mono">MYCLOVER.COM</div>'+
    '<div class="plat mono">PLATINUM TROPHY</div>'+
    '<div class="wp disp" id="tpTtl">WELL PLAYED</div>'+
    '<svg class="cvr" viewBox="-52 -50 104 108" aria-hidden="true">'+
      /* ใช้ทรงโคลเวอร์เดียวกับที่หน้าแรกใช้ แค่เปลี่ยนเป็นโทนแพลตินัม */
      '<defs><linearGradient id="pcg" x1="0" y1="0" x2=".8" y2="1">'+
        '<stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#C8D6D1"/>'+
        '<stop offset="1" stop-color="#7E9A8C"/></linearGradient>'+
        '<path id="pcl" d="M0 0 C -5 -9 -19 -11 -19 -23 C -19 -32 -10 -35 -4.5 -29.5 '+
          'C -2.5 -27.5 -1 -26.5 0 -24.5 C 1 -26.5 2.5 -27.5 4.5 -29.5 C 10 -35 19 -32 19 -23 '+
          'C 19 -11 5 -9 0 0 Z"/></defs>'+
      '<path d="M0 16 C 5 30 2 42 -7 50" stroke="#1B6A42" stroke-width="4.5" fill="none" stroke-linecap="round"/>'+
      '<g fill="url(#pcg)" stroke="#BE9442" stroke-width="1.4" stroke-linejoin="round" transform="rotate(45)">'+
        '<use href="#pcl"/><use href="#pcl" transform="rotate(90)"/>'+
        '<use href="#pcl" transform="rotate(180)"/><use href="#pcl" transform="rotate(270)"/>'+
      '</g>'+
      '<circle class="sheen" cx="-16" cy="-14" r="8" fill="#fff" opacity=".4"/>'+
    '</svg>'+
    '<p>คุณเคลียร์เนื้อเรื่องหลัก ค้นพบทางลับ<br>และใช้สกิล RESTORE เปิดเรื่องราวที่ซ่อนอยู่ได้สำเร็จ</p>'+
    '<div class="ft"><span class="lb mono">FINAL TAG UNLOCKED</span><b>👊🏻GLHF</b></div>'+
    '<a class="btn disp" href="../../../card/">รับรางวัลและกลับไปดูการ์ด</a>'+
    '<button type="button" class="close" id="tpClose">ปิดแล้วอ่านต่อ</button>'+
  '</div>';
}

window.MC_PLAYMATE={ pages:buildRestored, trophy:trophyHTML, tag:'GLHF' };
})();
