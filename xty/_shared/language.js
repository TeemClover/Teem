/* TeamBook standard-language layer over the legacy XTY engine.
   Public UI speaks Book language; internal route/function/storage names may
   remain XTY while the product migrates. Human-authored names, intentions,
   rules, notes and canonical history are never rewritten. */

const STORAGE_KEY = 'mc_xty_language_mode';
const HAS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
const ON_XTY_SURFACE = HAS_BROWSER && (
  location.pathname === '/profile/' || location.pathname === '/profile' || location.pathname.startsWith('/xty/')
);

function lockStandardThai() {
  try { localStorage.setItem(STORAGE_KEY, 'plain'); } catch {}
}

const RULES = Object.freeze([
  [/REAL-LIFE PARTY GAME/gi, 'สมุดกลุ่มมีชีวิต'],
  [/WHAT COUNTS AS A COMMIT/gi, 'วันนี้ลงชื่อได้เมื่อ'],
  [/CONFIRMED COMMITS?/gi, 'วันที่ลงชื่อและมีคนเห็นแล้ว'],
  [/COMMITTED TODAY/gi, 'ลงชื่อแล้ววันนี้'],
  [/PARTY DISSOLVED/gi, 'ปิดสมุดก่อนจบ'],
  [/PARTY COMPLETE/gi, 'เล่มนี้จบแล้ว'],
  [/PARTY LOG/gi, 'เรื่องในสมุด'],
  [/PARTY SLOTS/gi, 'คนในสมุด'],
  [/ACTIVE PARTIES/gi, 'สมุดที่กำลังเขียน'],
  [/MAIN PARTY/gi, 'สมุดหลัก'],
  [/PARTY COVER/gi, 'ปกสมุด'],
  [/QUEST ENDING/gi, 'ฉากจบของเล่ม'],
  [/QUEST COMPLETE/gi, 'เล่มนี้จบแล้ว'],
  [/QUEST CLEAR/gi, 'เล่มนี้จบแล้ว'],
  [/CARD DROP/gi, 'เปิดการ์ด'],
  [/CHOOSE YOUR ANIMAL/gi, 'เลือกสัตว์ของคุณ'],
  [/DURABLE SAVE\s*·\s*MYCLOVER ACCOUNT/gi, 'เก็บความคืบหน้ากับบัญชี myClover'],
  [/ANIMAL CARD COLLECTION/gi, 'คอลเลกชันการ์ด'],
  [/Default Animal Avatar/gi, 'สัตว์เริ่มต้น'],
  [/Default Color/gi, 'สีเริ่มต้น'],
  [/CALM PARTY LOG/gi, 'เรื่องในสมุดที่ตามทันง่าย'],
  [/FOUR SIMPLE VERBS/gi, '4 อย่างที่ทำได้'],

  /* TeamBook people/book vocabulary. */
  [/ตั้งตี้ทำอะไรก็ได้/g, 'เปิดสมุดทำอะไรก็ได้'],
  [/ตี้ที่กำลังเล่น/g, 'สมุดที่กำลังเขียน'],
  [/ตี้ที่เป็นหัวตี้/g, 'สมุดที่คุณเป็นเจ้าของ'],
  [/ตี้ที่เป็นสมาชิก/g, 'สมุดที่คุณเข้าร่วม'],
  [/ตี้ทั้งหมด/g, 'สมุดทั้งหมด'],
  [/ตี้สาธารณะ/g, 'สมุดสาธารณะ'],
  [/สร้างตัวแล้วเข้าตี้/g, 'ตั้งชื่อแล้วเข้าร่วมสมุด'],
  [/เข้าตี้ด้วยรหัส/g, 'เข้าร่วมสมุดด้วยรหัส'],
  [/เข้าตี้\s*\/\s*Commit/gi, 'เปิดสมุด / ลงชื่อ'],
  [/เข้าตี้/g, 'เข้าร่วมสมุด'],
  [/ตั้งตี้/g, 'เปิดสมุด'],
  [/หาตี้/g, 'หาสมุด'],
  [/ยุบตี้/g, 'ปิดสมุด'],
  [/หัวตี้/g, 'เจ้าของสมุด'],
  [/ผู้ดูแลกลุ่ม/g, 'เจ้าของสมุด'],
  [/รหัสตี้/g, 'รหัสสมุด'],
  [/รหัสกลุ่ม/g, 'รหัสสมุด'],
  [/ชื่อตี้/g, 'ชื่อสมุด'],
  [/ชื่อกลุ่ม/g, 'ชื่อสมุด'],
  [/ชื่อเรียกในตี้/g, 'ชื่อในสมุด'],
  [/ชื่อในตี้/g, 'ชื่อในสมุด'],
  [/สมาชิกตี้/g, 'คนในสมุด'],
  [/สมาชิกกลุ่ม/g, 'คนในสมุด'],
  [/ชวนคนเข้าตี้/g, 'ชวนคนเข้าร่วมสมุด'],

  /* Signature / Seen vocabulary. Seen is acknowledgement, never proof. */
  [/ต้อง\s*Confirm\s*·\s*ให้เพื่อนอย่างน้อย\s*1\s*คน\s*Confirm\s*ย้อนหลังได้ถึงวันถัดไป/gi,
    'ลงชื่อแล้ว · ให้เพื่อนอย่างน้อย 1 คนกด เห็นแล้ว ได้ถึงวันถัดไป'],
  [/เชื่อใจกัน\s*·\s*Commit\s*แล้วผ่านทันที/gi,
    'ลงชื่อแล้ว · คนข้าง ๆ กด เห็นแล้ว ได้จากการ์ด'],
  [/กติกา\s*Commit/gi, 'วันนี้ลงชื่อได้เมื่อ'],
  [/Commit\s*ทุกวัน/gi, 'ลงชื่อทุกวัน'],
  [/Commit\s*วันนี้/gi, 'ลงชื่อวันนี้'],
  [/Commit\s*แล้ววันนี้/gi, 'ลงชื่อแล้ววันนี้'],
  [/ยังไม่\s*Commit/gi, 'ยังไม่ได้ลงชื่อ'],
  [/Commit\s*แล้ว/gi, 'ลงชื่อแล้ว'],
  [/Commit\s*ได้เลย/gi, 'ลงชื่อได้เลย'],
  [/กลับมา\s*Commit/gi, 'กลับมาลงชื่อ'],
  [/Confirmed\s*Commit/gi, 'การลงชื่อที่มีคนเห็นแล้ว'],
  [/รอเพื่อนหนึ่งคนช่วย\s*Confirm/gi, 'รอเพื่อนกด เห็นแล้ว'],
  [/Confirm\s*ให้เพื่อน/gi, 'เห็นแล้ว'],
  [/Confirm\s*แล้ว/gi, 'เห็นแล้ว'],
  [/รอ.*Confirm/gi, match => match.replace(/Confirm/gi, 'เห็นแล้ว')],

  [/เสร็จเควส/g, 'ปิดเล่ม'],
  [/จบ\s*Quest/gi, 'ปิดเล่ม'],
  [/Quest\s*แรก/gi, 'ช่วงแรก'],
  [/Quest\s*นี้/gi, 'ช่วงนี้'],
  [/เริ่ม\s*Quest/gi, 'เริ่มช่วงนี้'],
  [/เควส/g, 'ช่วง'],

  [/Lead Card/gi, 'การ์ดเปิดสมุด'],
  [/PET\s*\/\s*NPC/gi, 'เพื่อนร่วมทาง'],
  [/FINAL MESSAGE/gi, 'ข้อความสุดท้าย'],
  [/PROGRESS/gi, 'ความคืบหน้า'],
  [/MEMBERS/gi, 'คนในสมุด'],
  [/MEMBER/gi, 'คนในสมุด'],
  [/\bLEAD\b/gi, 'เจ้าของสมุด'],
  [/\bQUEST\b/gi, 'ช่วง'],
  [/\bCOMMIT\b/gi, 'ลงชื่อ'],
  [/\bMESSAGE\b/gi, 'ข้อความ'],
  [/\bREACT\b/gi, 'ส่งกำลังใจ'],
  [/\bCONFIRMED\b/gi, 'มีคนเห็นแล้ว'],
  [/\bCONFIRM\b/gi, 'เห็นแล้ว'],
  [/\bPARTY\b/gi, 'สมุด'],
  [/\bNPC\b/gi, 'เพื่อนร่วมทาง'],
  [/\bPET\b/gi, 'เพื่อนร่วมทาง'],
  [/\bAVATAR\b/gi, 'สัตว์'],
  [/\bCHALLENGE\b/gi, 'ช่วง'],
  [/ตี้/g, 'สมุด'],
]);

function translate(value) {
  let out = String(value ?? '');
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}

function shouldSkipText(node) {
  const el = node?.parentElement;
  if (!el) return true;
  if (el.closest('[data-xty-no-translate]')) return true;
  if (['SCRIPT','STYLE','NOSCRIPT','CODE','PRE'].includes(el.tagName)) return true;

  // Human-authored source must remain exactly as written.
  if (el.matches('#pname, #act, #ruleText, #sheetRule, .who, .al, .seat-card-name, .tb-card-name')) return true;
  if (el.matches('#log .txt')) return true;
  if (el.matches('#mainParty h2')) return true;
  if (el.matches('#leadPartyRows .tx > b, #joinedPartyRows .tx > b')) return true;
  return false;
}

function translateTextNode(node) {
  if (shouldSkipText(node)) return;
  const next = translate(node.data);
  if (next !== node.data) node.data = next;
}

function translateAttributes(el) {
  if (!(el instanceof Element) || el.closest('[data-xty-no-translate]')) return;
  for (const name of ['aria-label','placeholder','title','alt']) {
    if (!el.hasAttribute(name)) continue;
    const before = el.getAttribute(name) || '';
    const after = translate(before);
    if (after !== before) el.setAttribute(name, after);
  }
  if (el.tagName === 'META' && el.hasAttribute('content')) {
    const before = el.getAttribute('content') || '';
    const after = translate(before);
    if (after !== before) el.setAttribute('content', after);
  }
}

function applyStandardThai(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root);
  if (root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.ELEMENT_NODE) return;

  if (root instanceof Element) translateAttributes(root);
  root.querySelectorAll?.('*').forEach(translateAttributes);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(translateTextNode);
}

function watchForNewUi() {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        translateTextNode(mutation.target);
        continue;
      }
      if (mutation.type === 'attributes') {
        translateAttributes(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach(node => applyStandardThai(node));
    }
  });
  observer.observe(document.documentElement, {
    subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['aria-label','placeholder','title','alt','content'],
  });
}

function removeLegacyLanguageControls() {
  document.getElementById('xtyLanguageCard')?.remove();
  document.getElementById('xtyLanguageChoice')?.remove();
}

function bootLanguage() {
  if (!ON_XTY_SURFACE) return;
  lockStandardThai();
  document.documentElement.dataset.xtyLanguage = 'plain';
  removeLegacyLanguageControls();
  applyStandardThai(document);
  watchForNewUi();

  window.XTYLanguage = Object.freeze({
    getMode: () => 'plain',
    setMode: () => 'plain',
    apply: () => applyStandardThai(document),
  });
  window.dispatchEvent(new CustomEvent('xty:language-ready', { detail: { mode:'plain' } }));
}

if (ON_XTY_SURFACE) {
  if (/^\/xty\/p(?:\/|$)/.test(location.pathname)) {
    import('./party-teambook-cards.js').catch(error => console.warn('TeamBook card layer unavailable', error));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLanguage, { once:true });
  else bootLanguage();
}
