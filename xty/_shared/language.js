/* XTY language layer
   Default: ordinary Thai for everyone. XTY vocabulary stays one tap away.

   Product principle:
   - plain mode uses ordinary language; the notebook/card visuals carry the game feeling.
   - QUEST becomes "Challenge" — familiar enough to need no game glossary.
   - COMMIT becomes "ลงชื่อ" — a human signs the living notebook after doing the real thing.
   - CONFIRM becomes "ยืนยัน" — a friend acknowledges that signature.
   - user-written names, rules, notes and Party Log bodies are never rewritten.

   Presentation only. Never mutate party data, logs, server payloads or canonical history. */

const STORAGE_KEY = 'mc_xty_language_mode';
const CHOICE_SEEN_KEY = 'mc_xty_language_choice_seen';
const PROFILE_KEY = 'mc_xty_profile';
const VALID_MODES = new Set(['plain', 'xty']);
const HAS_BROWSER = typeof window !== 'undefined'
  && typeof document !== 'undefined'
  && typeof location !== 'undefined';
const ON_XTY_SURFACE = HAS_BROWSER && (
  location.pathname === '/profile/'
  || location.pathname === '/profile'
  || location.pathname.startsWith('/xty/')
);

function readMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.has(saved) ? saved : 'plain';
  } catch {
    return 'plain';
  }
}

function writeMode(next) {
  if (!VALID_MODES.has(next)) return false;
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  return true;
}

function setMode(next) {
  if (!writeMode(next)) return;
  location.reload();
}

function markChoiceSeen() {
  try { localStorage.setItem(CHOICE_SEEN_KEY, '1'); } catch {}
}

function hasSeenChoice() {
  try { return localStorage.getItem(CHOICE_SEEN_KEY) === '1'; }
  catch { return false; }
}

function localProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function hasAnyCard(profile = localProfile()) {
  return Array.isArray(profile?.ownedCards) && profile.ownedCards.length > 0;
}

/* Long / semantic phrases first, vocabulary last.
   The green check/signature treatment belongs to the visual layer, not a new term
   that people have to learn. */
const PLAIN_RULES = Object.freeze([
  [/REAL-LIFE PARTY GAME/gi, 'สมุดกลุ่มที่มีชีวิต'],
  [/WHAT IS A REAL-LIFE PARTY GAME\?/gi, 'XTY คืออะไร?'],
  [/WHAT COUNTS AS A COMMIT/gi, 'วันนี้ลงชื่อได้เมื่อ'],
  [/CONFIRMED COMMITS?/gi, 'วันที่ลงชื่อและมีเพื่อนยืนยัน'],
  [/COMMITTED TODAY/gi, 'ลงชื่อแล้ววันนี้'],
  [/\bCOMMITTED\b/gi, 'ลงชื่อแล้ว'],
  [/\bCONFIRMED\b/gi, 'ยืนยันแล้ว'],
  [/PARTY DISSOLVED/gi, 'ปิดกลุ่มก่อนจบ'],
  [/PARTY COMPLETE/gi, 'จบ Challenge แล้ว'],
  [/PARTY LOG/gi, 'สมุดของกลุ่ม'],
  [/PARTY SLOTS/gi, 'พื้นที่กลุ่ม'],
  [/ACTIVE PARTIES/gi, 'กลุ่มที่กำลังทำ'],
  [/MAIN PARTY/gi, 'กลุ่มหลัก'],
  [/PARTY COVER/gi, 'ปกกลุ่ม'],
  [/QUEST ENDING/gi, 'สรุป Challenge'],
  [/QUEST COMPLETE/gi, 'จบ Challenge แล้ว'],
  [/CARD DROP/gi, 'ได้การ์ด'],
  [/CHOOSE YOUR ANIMAL/gi, 'เลือกตัวแทนของคุณ'],
  [/DURABLE SAVE\s*·\s*MYCLOVER ACCOUNT/gi, 'เก็บความคืบหน้ากับบัญชี myClover'],
  [/ANIMAL CARD COLLECTION/gi, 'คอลเลกชันการ์ด'],
  [/Default Animal Avatar/gi, 'รูปตัวแทนเริ่มต้น'],
  [/Default Color/gi, 'สีเริ่มต้น'],

  /* Plain mode should not require people to adopt our game vocabulary. */
  [/เกมตี้ในชีวิตจริง/g, 'พื้นที่กลุ่มเล็กสำหรับชีวิตจริง'],
  [/เกมที่หน้าจอเป็นแค่โต๊ะกลาง/g, 'หน้าจอเป็นแค่โต๊ะกลาง'],
  [/ตัวเกมไม่ได้อยู่/g, 'สิ่งสำคัญไม่ได้อยู่'],
  [/สนามเกมคือชีวิตจริง/g, 'สิ่งสำคัญเกิดในชีวิตจริง'],
  [/เกมทั้งเกมอยู่ใน 4 คำนี้/g, 'ใช้งานหลัก ๆ อยู่ใน 4 อย่างนี้'],
  [/เล่นคนเดียวก็ได้/g, 'เริ่มคนเดียวก็ได้'],
  [/เล่นชีวิตจริง/g, 'ใช้ชีวิตจริง'],
  [/เล่นเลย/g, 'เริ่มเลย'],
  [/ดูวิธีเล่น XTY/g, 'ดูวิธีใช้ XTY'],
  [/ดูวิธีเล่น/g, 'ดูวิธีใช้'],
  [/วิธีเล่น XTY/g, 'วิธีใช้ XTY'],
  [/วิธีเล่น/g, 'วิธีใช้'],
  [/เล่นต่อจะรู้เอง/g, 'ใช้ต่อจะรู้เอง'],

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

  [/เสร็จเควส/g, 'จบ Challenge'],
  [/Quest Clear/gi, 'จบ Challenge แล้ว'],
  [/จบ Quest/gi, 'จบ Challenge'],
  [/Quest แรก/gi, 'Challenge แรก'],
  [/Quest นี้/gi, 'Challenge นี้'],
  [/เริ่มเล่น/g, 'เริ่ม'],
  [/วิธีเล่นสั้น\s*ๆ/g, 'เริ่มยังไง'],
  [/ตัวละครของฉัน/g, 'ตัวแทนของฉัน'],
  [/บันทึกตัวละคร/g, 'บันทึกตัวแทน'],
  [/ตัวละคร/g, 'ตัวแทน'],
  [/Lead Card/gi, 'การ์ดของกลุ่ม'],
  [/PET\s*\/\s*NPC/gi, 'เพื่อนร่วมทาง'],
  [/FINAL MESSAGE/gi, 'ข้อความรอบสุดท้าย'],
  [/Final Message/gi, 'ข้อความรอบสุดท้าย'],
  [/PROGRESS/gi, 'ความคืบหน้า'],
  [/MEMBERS/gi, 'สมาชิก'],
  [/MEMBER/gi, 'สมาชิก'],
  [/\bLEAD\b/gi, 'ผู้ดูแล'],
  [/\bQUEST\b/gi, 'Challenge'],
  [/\bCOMMIT\b/gi, 'ลงชื่อ'],
  [/\bMESSAGE\b/gi, 'ข้อความ'],
  [/\bREACT\b/gi, 'ส่งกำลังใจ'],
  [/\bCONFIRM\b/gi, 'ยืนยัน'],
  [/\bPARTY\b/gi, 'กลุ่ม'],
  [/\bNPC\b/gi, 'เพื่อนร่วมทาง'],
  [/\bPET\b/gi, 'เพื่อนร่วมทาง'],
  [/\bAVATAR\b/gi, 'ตัวแทน'],
  [/เควส/g, 'Challenge'],
  [/ตี้/g, 'กลุ่ม'],
]);

function translate(value) {
  let out = String(value ?? '');
  if (readMode() !== 'plain') return out;
  for (const [pattern, replacement] of PLAIN_RULES) out = out.replace(pattern, replacement);
  return out;
}

function shouldSkipText(node) {
  const el = node?.parentElement;
  if (!el) return true;
  if (el.closest('[data-xty-no-translate]')) return true;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(el.tagName)) return true;

  /* Human-authored source stays exactly as written. */
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
  if (!root || readMode() !== 'plain') return;
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
    if (readMode() !== 'plain') return;
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
    <p class="hint" style="margin:10px 0 0">ไทยทั่วไป: กลุ่ม · Challenge · ลงชื่อ · ยืนยัน &nbsp;|&nbsp; XTY: ตี้ · Quest · Commit · Confirm</p>
  `;

  const anchor = document.getElementById('profileCard');
  if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', card);
  else host.prepend(card);

  paintLanguageButtons(card);
}

function paintLanguageButtons(root = document) {
  const current = readMode();
  root.querySelectorAll?.('[data-language-mode]').forEach(button => {
    const selected = button.dataset.languageMode === current;
    button.classList.toggle('gold', selected);
    button.classList.toggle('ghost', !selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    if (!button.dataset.languageBound) {
      button.dataset.languageBound = '1';
      button.addEventListener('click', () => {
        if (button.dataset.languageMode === readMode()) return;
        setMode(button.dataset.languageMode);
      });
    }
  });
}

/* First card = first time WHITECAT teaches that XTY has its own vocabulary.
   Before that, people simply use normal Thai. */
function installLanguageChoiceOnboarding() {
  if (hasSeenChoice()) return;

  const revealPath = location.pathname === '/xty/reveal/' || location.pathname === '/xty/reveal';
  if (revealPath) {
    const actions = document.getElementById('actions');
    if (!actions) return;
    const maybeAfterReveal = () => {
      if (!actions.hidden && hasAnyCard() && !hasSeenChoice()) {
        setTimeout(() => offerLanguageChoice(), 650);
      }
    };
    maybeAfterReveal();
    const observer = new MutationObserver(maybeAfterReveal);
    observer.observe(actions, { attributes: true, attributeFilter: ['hidden'] });
    return;
  }

  const legacyEntry = ['/xty', '/xty/', '/profile', '/profile/'].includes(location.pathname);
  if (legacyEntry && hasAnyCard()) setTimeout(() => offerLanguageChoice(), 900);
}

function offerLanguageChoice() {
  if (hasSeenChoice() || document.getElementById('xtyLanguageChoice')) return;

  const shade = document.createElement('div');
  shade.id = 'xtyLanguageChoice';
  shade.setAttribute('data-xty-no-translate', '');
  shade.style.cssText = 'position:fixed;inset:0;z-index:120;background:rgba(20,24,20,.36);display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));';
  shade.innerHTML = `
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="xtyLanguageChoiceTitle"
      style="width:min(100%,540px);margin:0;background:var(--xty-surface,#fff9e9);box-shadow:0 20px 70px rgba(0,0,0,.24)">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <img src="/xty/assets/art/avatars/white-cat.webp" alt="XTY WHITECAT" width="82" height="82"
          style="width:82px;height:82px;object-fit:contain;flex:none">
        <div style="min-width:0">
          <span class="label">XTY WHITECAT</span>
          <h2 class="title" id="xtyLanguageChoiceTitle" style="font-size:22px;margin:2px 0 7px">จากนี้ อยากให้เราเรียกแบบไหน?</h2>
          <p class="whisper" style="margin:0">แบบไทยใช้ “กลุ่ม · Challenge · ลงชื่อ · ยืนยัน” ส่วนแบบ XTY ใช้ “ตี้ · Quest · Commit · Confirm” ระบบเดียวกัน เลือกแบบที่สบายใจได้เลย</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:16px">
        <button class="btn ghost" type="button" data-pick-language="plain">
          <b>ไทยทั่วไป</b><br><small>กลุ่ม · Challenge · ลงชื่อ · ยืนยัน</small>
        </button>
        <button class="btn ghost" type="button" data-pick-language="xty">
          <b>XTY</b><br><small>ตี้ · Quest · Commit · Confirm</small>
        </button>
      </div>
      <p class="hint" style="margin:11px 0 0;text-align:center">เปลี่ยนกลับได้เสมอที่โปรไฟล์ · ระบบและข้อมูลเหมือนเดิม</p>
    </section>
  `;
  document.body.appendChild(shade);

  shade.querySelectorAll('[data-pick-language]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.dataset.pickLanguage;
      markChoiceSeen();
      shade.remove();
      if (next === readMode()) return;
      writeMode(next);
      location.reload();
    });
  });
}

function bootLanguage() {
  if (!ON_XTY_SURFACE) return;
  const mode = readMode();
  document.documentElement.dataset.xtyLanguage = mode;

  /* The plain layer runs after the DOM exists and keeps watching UI that is
     rendered later by XTY modules. XTY mode leaves the original game copy alone. */
  if (mode === 'plain') {
    applyPlainLanguage(document);
    watchForNewUi();
  }

  installLanguageControl();
  paintLanguageButtons(document);
  installLanguageChoiceOnboarding();

  window.XTYLanguage = Object.freeze({
    getMode: readMode,
    setMode,
    offerChoice: offerLanguageChoice,
    apply: () => readMode() === 'plain' && applyPlainLanguage(document),
  });
  window.dispatchEvent(new CustomEvent('xty:language-ready', { detail: { mode } }));
}

if (ON_XTY_SURFACE) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootLanguage, { once: true });
  } else {
    bootLanguage();
  }
}
