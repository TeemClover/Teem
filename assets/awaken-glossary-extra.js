/* Extra plain-language tooltips for Chapter 7 role names and technical words.
   Tooltips render as one floating layer on <body> so card overflow can never clip them.
*/
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

let tip = null;
let active = null;
let sticky = false;

function injectStyle() {
  if (document.getElementById('aw-extra-term-style')) return;
  const style = document.createElement('style');
  style.id = 'aw-extra-term-style';
  style.textContent = `
    .aw-term{position:relative;border-bottom:1px dotted #d9b967;cursor:help}
    .aw-term::after{content:none!important;display:none!important}
    #aw-floating-tip{
      position:fixed!important;z-index:2147483000!important;box-sizing:border-box;
      width:max-content;max-width:min(320px,calc(100vw - 24px));padding:11px 13px;
      border:1px solid rgba(217,185,103,.48);border-radius:11px;background:#07130c;
      color:#f8f6f0;-webkit-text-fill-color:#f8f6f0;
      font:650 12.5px/1.62 "Anuphan",system-ui,sans-serif;text-align:left;
      white-space:normal;overflow-wrap:anywhere;word-break:normal;
      box-shadow:0 16px 38px rgba(0,0,0,.58);pointer-events:none;
      opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .12s ease,transform .12s ease;
    }
    #aw-floating-tip[data-open="1"]{opacity:1;visibility:visible;transform:translateY(0)}
    @media(max-width:560px){#aw-floating-tip{max-width:calc(100vw - 20px);font-size:13px;line-height:1.65}}
    @media(prefers-reduced-motion:reduce){#aw-floating-tip{transition:none}}
  `;
  document.head.append(style);
}

function ensureTip() {
  if (tip?.isConnected) return tip;
  tip = document.createElement('div');
  tip.id = 'aw-floating-tip';
  tip.setAttribute('role','tooltip');
  tip.setAttribute('aria-hidden','true');
  document.body.append(tip);
  return tip;
}

function viewportBox() {
  const vv = window.visualViewport;
  return {
    left: vv?.offsetLeft || 0,
    top: vv?.offsetTop || 0,
    width: vv?.width || window.innerWidth,
    height: vv?.height || window.innerHeight,
  };
}

function place(term) {
  const node = ensureTip();
  if (!term?.isConnected || node.dataset.open !== '1') return;
  const r = term.getBoundingClientRect();
  const v = viewportBox();
  const gap = 9;
  const margin = 10;

  node.style.left = `${v.left + margin}px`;
  node.style.top = `${v.top + margin}px`;
  const tr = node.getBoundingClientRect();

  let left = r.left + Math.min(r.width / 2, 70) - tr.width / 2;
  left = Math.max(v.left + margin, Math.min(left, v.left + v.width - tr.width - margin));

  const below = r.bottom + gap;
  const above = r.top - tr.height - gap;
  let top = below;
  if (below + tr.height > v.top + v.height - margin && above >= v.top + margin) top = above;
  top = Math.max(v.top + margin, Math.min(top, v.top + v.height - tr.height - margin));

  node.style.left = `${Math.round(left)}px`;
  node.style.top = `${Math.round(top)}px`;
}

function show(term, keepOpen) {
  if (!term?.dataset.tip) return;
  const node = ensureTip();
  active = term;
  sticky = !!keepOpen;
  node.textContent = term.dataset.tip;
  node.dataset.open = '1';
  node.setAttribute('aria-hidden','false');
  term.setAttribute('aria-describedby', node.id);
  requestAnimationFrame(() => place(term));
}

function hide(force = false) {
  if (sticky && !force) return;
  const node = ensureTip();
  if (active) active.removeAttribute('aria-describedby');
  active = null;
  sticky = false;
  node.dataset.open = '0';
  node.setAttribute('aria-hidden','true');
}

function wireTerm(term) {
  if (!term || term.dataset.floatTipWired === '1') return;
  term.dataset.floatTipWired = '1';
  term.addEventListener('mouseenter', () => { if (!sticky) show(term, false); });
  term.addEventListener('mouseleave', () => { if (!sticky) hide(true); });
  term.addEventListener('focus', () => show(term, false));
  term.addEventListener('blur', () => { if (!sticky) hide(true); });
  term.addEventListener('click', event => {
    event.stopPropagation();
    if (active === term && sticky) hide(true);
    else show(term, true);
  });
}

function wireTerms() {
  document.querySelectorAll('.aw-term[data-tip]').forEach(wireTerm);
}

function scan() {
  const root = document.getElementById('chapter') || document.body;
  if (!root) return;
  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.trim() || parent.closest('script,style,code,pre,textarea,input,.aw-term,#aw-floating-tip')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode() && nodes.length < 500) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (count >= 50 || !node.parentNode) return;
    const text = node.nodeValue;
    const matches = [];
    TERMS.forEach(([term, explanation]) => {
      let at = text.indexOf(term);
      while (at >= 0) {
        matches.push({ at, term, tip:explanation });
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
  wireTerms();
}

function boot() {
  injectStyle();
  ensureTip();
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); wireTerms(); });
  };
  queue();
  new MutationObserver(queue).observe(document.body, { childList:true, subtree:true });
  document.addEventListener('click', event => { if (!event.target.closest?.('.aw-term')) hide(true); });
  window.addEventListener('scroll', () => { if (active) sticky ? place(active) : hide(true); }, { passive:true, capture:true });
  window.addEventListener('resize', () => { if (active) place(active); });
  window.visualViewport?.addEventListener('resize', () => { if (active) place(active); });
  window.visualViewport?.addEventListener('scroll', () => { if (active) place(active); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
})();
