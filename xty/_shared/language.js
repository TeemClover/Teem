/* XTY standard-language layer
   Product decision: XTY no longer asks people to learn game vocabulary.
   Public UI uses ordinary Thai only. If groups invent their own slang later,
   that culture belongs to the people inside the group — not to the interface.

   Presentation only: never mutate party/group data, logs, user-written names,
   rules, notes, server payloads or canonical history. */

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
  [/CONFIRMED COMMITS?/gi, 'วันที่ลงชื่อและมีเพื่อนยืนยัน'],
  [/COMMITTED TODAY/gi, 'ลงชื่อแล้ววันนี้'],
  [/PARTY DISSOLVED/gi, 'ปิดกลุ่มก่อนจบ'],
  [/PARTY COMPLETE/gi, 'จบช่วงนี้แล้ว'],
  [/PARTY LOG/gi, 'สมุดของกลุ่ม'],
  [/PARTY SLOTS/gi, 'พื้นที่กลุ่ม'],
  [/ACTIVE PARTIES/gi, 'กลุ่มที่กำลังทำ'],
  [/MAIN PARTY/gi, 'กลุ่มหลัก'],
  [/PARTY COVER/gi, 'ปกกลุ่ม'],
  [/QUEST ENDING/gi, 'ฉากจบ'],
  [/QUEST COMPLETE/gi, 'จบช่วงนี้แล้ว'],
  [/QUEST CLEAR/gi, 'จบช่วงนี้แล้ว'],
  [/CARD DROP/gi, 'เปิดการ์ด'],
  [/CHOOSE YOUR ANIMAL/gi, 'เลือกสัตว์ของคุณ'],
  [/DURABLE SAVE\s*·\s*MYCLOVER ACCOUNT/gi, 'เก็บความคืบหน้ากับบัญชี myClover'],
  [/ANIMAL CARD COLLECTION/gi, 'คอลเลกชันการ์ด'],
  [/Default Animal Avatar/gi, 'สัตว์เริ่มต้น'],
  [/Default Color/gi, 'สีเริ่มต้น'],
  [/CALM PARTY LOG/gi, 'สมุดที่ตามทันง่าย'],
  [/FOUR SIMPLE VERBS/gi, '4 อย่างที่ทำได้'],

  [/ตั้งตี้ทำอะไรก็ได้/g, 'สร้างกลุ่มทำอะไรก็ได้'],
  [/ตี้ที่กำลังเล่น/g, 'กลุ่มที่กำลังทำ'],
  [/ตี้ที่เป็นหัวตี้/g, 'กลุ่มที่คุณดูแล'],
  [/ตี้ที่เป็นสมาชิก/g, 'กลุ่มที่คุณเข้าร่วม'],
  [/ตี้ทั้งหมด/g, 'กลุ่มทั้งหมด'],
  [/ตี้สาธารณะ/g, 'กลุ่มสาธารณะ'],
  [/สร้างตัวแล้วเข้าตี้/g, 'ตั้งชื่อแล้วเข้ากลุ่ม'],
  [/เข้าตี้ด้วยรหัส/g, 'เข้ากลุ่มด้วยรหัส'],
  [/เข้าตี้\s*\/\s*Commit/gi, 'เปิดกลุ่ม / ลงชื่อ'],
  [/เข้าตี้/g, 'เข้ากลุ่ม'],
  [/ตั้งตี้/g, 'สร้างกลุ่ม'],
  [/หาตี้/g, 'หากลุ่ม'],
  [/ยุบตี้/g, 'ปิดกลุ่ม'],
  [/หัวตี้/g, 'ผู้ดูแลกลุ่ม'],
  [/รหัสตี้/g, 'รหัสกลุ่ม'],
  [/ชื่อตี้/g, 'ชื่อกลุ่ม'],
  [/ชื่อเรียกในตี้/g, 'ชื่อเรียกในกลุ่ม'],
  [/ชื่อในตี้/g, 'ชื่อในกลุ่ม'],
  [/สมาชิกตี้/g, 'สมาชิกกลุ่ม'],

  [/กติกา\s*Commit/gi, 'ข้อตกลงก่อนลงชื่อ'],
  [/Commit\s*ทุกวัน/gi, 'ลงชื่อทุกวัน'],
  [/Commit\s*วันนี้/gi, 'ลงชื่อวันนี้'],
  [/Commit\s*แล้ววันนี้/gi, 'ลงชื่อแล้ววันนี้'],
  [/ยังไม่\s*Commit/gi, 'ยังไม่ได้ลงชื่อ'],
  [/Commit\s*แล้ว/gi, 'ลงชื่อแล้ว'],
  [/Commit\s*ได้เลย/gi, 'ลงชื่อได้เลย'],
  [/กลับมา\s*Commit/gi, 'กลับมาลงชื่อ'],
  [/Confirmed\s*Commit/gi, 'การลงชื่อที่เพื่อนยืนยันแล้ว'],
  [/รอ.*Confirm/gi, match => match.replace(/Confirm/gi, 'ยืนยัน')],

  [/เสร็จเควส/g, 'จบช่วงนี้'],
  [/จบ\s*Quest/gi, 'จบช่วงนี้'],
  [/Quest\s*แรก/gi, 'เป้าหมายแรก'],
  [/Quest\s*นี้/gi, 'เป้าหมายนี้'],
  [/เริ่ม\s*Quest/gi, 'เริ่มเป้าหมาย'],
  [/เควส/g, 'เป้าหมาย'],

  [/Lead Card/gi, 'ปกกลุ่ม'],
  [/PET\s*\/\s*NPC/gi, 'เพื่อนร่วมทาง'],
  [/FINAL MESSAGE/gi, 'ข้อความสุดท้าย'],
  [/PROGRESS/gi, 'ความคืบหน้า'],
  [/MEMBERS/gi, 'สมาชิก'],
  [/MEMBER/gi, 'สมาชิก'],
  [/\bLEAD\b/gi, 'ผู้ดูแล'],
  [/\bQUEST\b/gi, 'เป้าหมาย'],
  [/\bCOMMIT\b/gi, 'ลงชื่อ'],
  [/\bMESSAGE\b/gi, 'ข้อความ'],
  [/\bREACT\b/gi, 'ส่งกำลังใจ'],
  [/\bCONFIRMED\b/gi, 'ยืนยันแล้ว'],
  [/\bCONFIRM\b/gi, 'ยืนยัน'],
  [/\bPARTY\b/gi, 'กลุ่ม'],
  [/\bNPC\b/gi, 'เพื่อนร่วมทาง'],
  [/\bPET\b/gi, 'เพื่อนร่วมทาง'],
  [/\bAVATAR\b/gi, 'สัตว์'],
  [/\bCHALLENGE\b/gi, 'เป้าหมาย'],
  [/ตี้/g, 'กลุ่ม'],
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
  if (el.matches('#pname, #act, #ruleText, #sheetRule, .who, .al, .seat-card-name')) return true;
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLanguage, { once:true });
  else bootLanguage();
}
