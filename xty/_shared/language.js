/* XTY language layer
   Default: plain Thai for everyone. XTY vocabulary stays one tap away in Profile.
   This changes presentation only — never party data, names, logs, or server payloads. */

const STORAGE_KEY = 'mc_xty_language_mode';
const VALID_MODES = new Set(['plain', 'xty']);
const ON_XTY_SURFACE = location.pathname === '/profile/'
  || location.pathname === '/profile'
  || location.pathname.startsWith('/xty/');

if (ON_XTY_SURFACE) {
  const mode = readMode();
  document.documentElement.dataset.xtyLanguage = mode;

  if (mode === 'plain') {
    applyPlainLanguage(document);
    watchForNewUi();
  }

  installLanguageControl();

  window.XTYLanguage = Object.freeze({
    getMode: readMode,
    setMode,
    apply: () => mode === 'plain' && applyPlainLanguage(document),
  });
}

function readMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.has(saved) ? saved : 'plain';
  } catch {
    return 'plain';
  }
}

function setMode(next) {
  if (!VALID_MODES.has(next)) return;
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  location.reload();
}

/* Long / specific phrases first, then vocabulary. The broad replacements
   never touch user-written log bodies or party names (see shouldSkipText). */
const TEXT_RULES = Object.freeze([
  [/REAL-LIFE PARTY GAME/gi, 'สมุดกลุ่มที่มีชีวิต'],
  [/WHAT COUNTS AS A COMMIT/gi, 'วันนี้นับว่าทำแล้วเมื่อ'],
  [/COMMITTED TODAY/gi, 'บันทึกวันนี้'],
  [/PARTY DISSOLVED/gi, 'ปิดกลุ่มก่อนจบ'],
  [/PARTY COMPLETE/gi, 'ทำร่วมกันครบแล้ว'],
  [/PARTY LOG/gi, 'บันทึกของกลุ่ม'],
  [/PARTY SLOTS/gi, 'พื้นที่กลุ่ม'],
  [/ACTIVE PARTIES/gi, 'กลุ่มที่กำลังทำ'],
  [/MAIN PARTY/gi, 'กลุ่มหลัก'],
  [/PARTY COVER/gi, 'ปกกลุ่ม'],
  [/QUEST ENDING/gi, 'จบภารกิจ'],
  [/CHOOSE YOUR ANIMAL/gi, 'เลือกตัวแทนของคุณ'],
  [/DURABLE SAVE\s*·\s*MYCLOVER ACCOUNT/gi, 'เก็บความคืบหน้ากับบัญชี myClover'],
  [/ANIMAL CARD COLLECTION/gi, 'คอลเลกชันการ์ด'],
  [/Default Animal Avatar/gi, 'รูปตัวแทนเริ่มต้น'],
  [/Default Color/gi, 'สีเริ่มต้น'],
  [/ตี้ที่กำลังเล่น/g, 'กลุ่มที่กำลังทำ'],
  [/สร้างตัวแล้วเข้าตี้/g, 'ตั้งชื่อแล้วเข้ากลุ่ม'],
  [/ชื่อเรียกในตี้/g, 'ชื่อเรียกในกลุ่ม'],
  [/ชื่อในตี้/g, 'ชื่อในกลุ่ม'],
  [/สมาชิกตี้/g, 'สมาชิกกลุ่ม'],
  [/กติกา\s*Commit/gi, 'กติกาการบันทึก'],
  [/Commit\s*ทุกวัน/gi, 'บันทึกทุกวัน'],
  [/Commit\s*วันนี้/gi, 'บันทึกวันนี้'],
  [/Commit\s*แล้ววันนี้/gi, 'บันทึกแล้ววันนี้'],
  [/ยังไม่\s*Commit/gi, 'ยังไม่ได้บันทึก'],
  [/Commit\s*แล้ว/gi, 'บันทึกแล้ว'],
  [/เสร็จเควส/g, 'จบภารกิจ'],
  [/Quest Clear/gi, 'ทำภารกิจสำเร็จ'],
  [/เริ่มเล่น/g, 'เริ่มใช้ XTY'],
  [/วิธีเล่นสั้น\s*ๆ/g, 'เริ่มยังไง'],
  [/ตัวละครของฉัน/g, 'ตัวแทนของฉัน'],
  [/บันทึกตัวละคร/g, 'บันทึกตัวแทน'],
  [/ตัวละคร/g, 'ตัวแทน'],
  [/Lead Card/gi, 'การ์ดประจำกลุ่ม'],
  [/PET\s*\/\s*NPC/gi, 'เพื่อนร่วมทาง'],
  [/FINAL MESSAGE/gi, 'ข้อความรอบสุดท้าย'],
  [/Final Message/gi, 'ข้อความรอบสุดท้าย'],
  [/PROGRESS/gi, 'ความคืบหน้า'],
  [/MEMBERS/gi, 'สมาชิก'],
  [/MEMBER/gi, 'สมาชิก'],
  [/\bLEAD\b/gi, 'ผู้ดูแล'],
  [/\bQUEST\b/gi, 'ภารกิจ'],
  [/\bCOMMIT\b/gi, 'บันทึก'],
  [/\bMESSAGE\b/gi, 'ข้อความ'],
  [/\bREACT\b/gi, 'ส่งกำลังใจ'],
  [/\bCONFIRM\b/gi, 'ยืนยัน'],
  [/\bPARTY\b/gi, 'กลุ่ม'],
  [/\bNPC\b/gi, 'เพื่อนร่วมทาง'],
  [/\bPET\b/gi, 'เพื่อนร่วมทาง'],
  [/\bAVATAR\b/gi, 'รูปตัวแทน'],
  [/เควส/g, 'ภารกิจ'],
  [/ตี้/g, 'กลุ่ม'],
]);

function translate(value) {
  let out = String(value ?? '');
  for (const [pattern, replacement] of TEXT_RULES) out = out.replace(pattern, replacement);
  return out;
}

function shouldSkipText(node) {
  const el = node?.parentElement;
  if (!el) return true;
  if (el.closest('[data-xty-no-translate]')) return true;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(el.tagName)) return true;

  /* These are user-owned words. Never rewrite a person's message, alias,
     activity, rule, or a party name just because it contains XTY slang. */
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
  const attrs = ['aria-label', 'placeholder', 'title', 'alt'];
  for (const name of attrs) {
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

function applyPlainLanguage(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
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
      mutation.addedNodes.forEach(node => applyPlainLanguage(node));
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label', 'placeholder', 'title', 'alt', 'content'],
  });
}

function installLanguageControl() {
  if (!['/profile', '/profile/'].includes(location.pathname)) return;
  if (document.getElementById('xtyLanguageCard')) return;

  const host = document.getElementById('view') || document.querySelector('main');
  if (!host) return;

  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'xtyLanguageCard';
  card.setAttribute('data-xty-no-translate', '');
  card.innerHTML = `
    <span class="label">ภาษาที่ใช้ใน XTY</span>
    <h2 class="title" style="font-size:20px;margin:0 0 6px">เลือกคำที่สบายใจ</h2>
    <p class="whisper" style="margin:0 0 14px">ระบบเหมือนเดิมทุกอย่าง เปลี่ยนแค่คำบนหน้าจอ</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
      <button class="btn sm" type="button" data-language-mode="plain" aria-pressed="false">ไทยทั่วไป</button>
      <button class="btn sm" type="button" data-language-mode="xty" aria-pressed="false">XTY</button>
    </div>
    <p class="hint" style="margin:10px 0 0">ไทยทั่วไป: กลุ่ม · ผู้ดูแล · บันทึก &nbsp;|&nbsp; XTY: ตี้ · หัวตี้ · Commit</p>
  `;

  const anchor = document.getElementById('profileCard');
  if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', card);
  else host.prepend(card);

  const current = readMode();
  card.querySelectorAll('[data-language-mode]').forEach(button => {
    const selected = button.dataset.languageMode === current;
    button.classList.toggle('gold', selected);
    button.classList.toggle('ghost', !selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.addEventListener('click', () => {
      if (button.dataset.languageMode === current) return;
      setMode(button.dataset.languageMode);
    });
  });
}
