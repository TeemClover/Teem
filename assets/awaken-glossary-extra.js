/* Extra plain-language tooltips for Chapter 7 role names and technical words. */
(function(){
'use strict';
if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

const TERMS = [
  ['BACK-END ELECTRICIAN','ช่างไฟหลังบ้าน: คนซ่อมโค้ดและระบบที่ผู้ใช้ไม่เห็น'],
  ['ARTIFICER','ช่างประดิษฐ์ ผู้สร้างและซ่อมระบบ'],
  ['BERSERKER','ตัวบุกที่เปิดทุกทางก่อน แล้วค่อยให้ทีมเลือกว่าจะเก็บอะไร'],
  ['BARD','นักเล่าเรื่อง ผู้ดูแลภาษา อารมณ์ และจังหวะ'],
  ['CRITIC','ผู้วิจารณ์ที่หาจุดอ่อนก่อนปล่อยงาน'],
  ['Passive Skill','ความสามารถติดตัวที่ทำงานเองโดยไม่ต้องกดใช้'],
  ['Fog-of-War','ส่วนของแผนที่ที่ยังมองไม่เห็นหรือยังไม่ได้สำรวจ'],
  ['AGGRO','การบุกหรือดึงความสนใจเข้าหาปัญหาแบบตรง ๆ'],
  ['Roast','วิจารณ์แรงแบบตลก เพื่อให้เห็นจุดที่ควรแก้'],
  ['Handoff','บันทึกส่งมอบงานและบริบทให้คนหรือ AI ตัวถัดไป'],
  ['Timeline','ลำดับข้อความหรือเหตุการณ์ตามเวลา'],
  ['Integration','จุดเชื่อมที่ทำให้ระบบ 2 ส่วนทำงานร่วมกัน'],
  ['Database','พื้นที่เก็บข้อมูลของระบบ'],
  ['API','ช่องทางมาตรฐานที่ใช้ให้ระบบคุยกัน'],
  ['Engine','กลไกหลักที่ทำให้งานหรือเกมทำงานอยู่ข้างหลัง'],
  ['State','สถานะและข้อมูลล่าสุดที่ระบบกำลังจำอยู่'],
  ['Import','การเรียกไฟล์หรือโมดูลอื่นเข้ามาใช้'],
  ['SHA','รหัสเฉพาะของไฟล์หรือ Commit เวอร์ชันหนึ่งใน Git'],
  ['403','รหัสที่หมายถึงระบบเข้าใจคำขอ แต่ไม่อนุญาตให้เข้าถึง'],
  ['Pixel','จุดเล็กที่สุดของภาพบนหน้าจอ; “ไม่แตะ 1 Pixel” คือไม่แก้หน้าที่คนเห็นเลย'],
  ['EXP','ค่าประสบการณ์ที่ใช้สื่อว่าผู้เล่นเรียนรู้หรือพัฒนาแล้ว'],
  ['LEVEL UP','การเพิ่มระดับหลังได้รับประสบการณ์'],
  ['Natural 20','ทอยลูกเต๋า d20 ได้ 20 แบบไม่บวกแต้มเพิ่ม ถือว่าโชคดีที่สุด'],
  ['Natural 1','ทอยลูกเต๋า d20 ได้ 1 แบบไม่บวกแต้มเพิ่ม ถือว่าพลาดหนักที่สุด'],
  ['d20','ลูกเต๋า 20 หน้า ใช้สุ่มผลในเกมสวมบทบาท'],
  ['Feature','ความสามารถหรือส่วนทำงานหนึ่งของระบบ'],
  ['UI','ส่วนหน้าจอ ปุ่ม และองค์ประกอบที่ผู้ใช้มองเห็นและกดได้'],
];

function injectStyle() {
  if (document.getElementById('aw-extra-term-style') || document.getElementById('awaken-loot-v4-style')) return;
  const style = document.createElement('style');
  style.id = 'aw-extra-term-style';
  style.textContent = '.aw-term{position:relative;border-bottom:1px dotted #d9b967;cursor:help}.aw-term::after{content:attr(data-tip);position:absolute;z-index:300;left:0;bottom:calc(100% + 8px);width:min(290px,calc(100vw - 42px));padding:10px 12px;border:1px solid rgba(217,185,103,.45);border-radius:10px;background:#07130c;color:#f8f6f0;font:650 12px/1.58 Anuphan,sans-serif;opacity:0;visibility:hidden}.aw-term:hover::after,.aw-term:focus-visible::after,.aw-term[data-open="1"]::after{opacity:1;visibility:visible}';
  document.head.append(style);
}

function scan() {
  const root = document.getElementById('chapter') || document.body;
  if (!root) return;
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.trim() || parent.closest('script,style,code,pre,textarea,input,.aw-term')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode() && nodes.length < 500) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (count >= 50 || !node.parentNode) return;
    const text = node.nodeValue;
    const matches = [];
    TERMS.forEach(([term, tip]) => {
      let at = text.indexOf(term);
      while (at >= 0) {
        matches.push({ at, term, tip });
        at = text.indexOf(term, at + term.length);
      }
    });
    matches.sort((a,b) => a.at - b.at || b.term.length - a.term.length);
    const usable = [];
    let end = -1;
    matches.forEach(match => { if (match.at >= end) { usable.push(match); end = match.at + match.term.length; } });
    if (!usable.length) return;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    usable.forEach(match => {
      frag.append(text.slice(cursor, match.at));
      const span = document.createElement('span');
      span.className = 'aw-term';
      span.tabIndex = 0;
      span.dataset.tip = match.tip;
      span.textContent = match.term;
      frag.append(span);
      cursor = match.at + match.term.length;
      count += 1;
    });
    frag.append(text.slice(cursor));
    node.parentNode.replaceChild(frag, node);
  });
}

function boot() {
  injectStyle();
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  };
  queue();
  new MutationObserver(queue).observe(document.body, { childList:true, subtree:true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
})();
