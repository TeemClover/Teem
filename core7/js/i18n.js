/* ═══════════════════════════════════════════════════════════════
   myClover: CORE7 — สองภาษา TH / EN

   เดิมแต่ละหน้าทำภาษาของตัวเอง: rules ใช้ div ซ่อนสองก้อน, tutorial ใช้
   ?lang= บน URL, หน้าเว็บหลักมีปุ่มของตัวเอง — ไม่มีอันไหนจำค่าไว้เลย
   ไฟล์นี้เป็นแหล่งเดียวของ "ตอนนี้ภาษาอะไร" ให้ทุกหน้าอ่านค่าเดียวกัน

   วิธีแปลข้อความ: เขียนไทยไว้ใน HTML ตามปกติ แล้วใส่ data-en ทับ
       <h2 data-en="Play with a bot">เล่นกับบอท</h2>
   ตรงไหนไม่ใส่ data-en ก็ยังเป็นไทยเหมือนเดิม ไม่พัง

   ── ข้อยกเว้นที่ตั้งใจ ──
   ชื่อการ์ดใช้อังกฤษเสมอทั้งสองภาษา เพราะเป็นชื่อเฉพาะของการ์ดจริง
   คนสองคนคนละภาษาต้องชี้การ์ดใบเดียวกันแล้วเรียกชื่อตรงกันได้
   ═══════════════════════════════════════════════════════════════ */

const KEY = 'c7:lang';
const VALID = ['th', 'en'];

export function getLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (VALID.includes(saved)) return saved;
  } catch { /* private mode */ }
  /* ยังไม่เคยเลือก — เดาจากภาษาเบราว์เซอร์ ไทยได้ไทย นอกนั้นได้อังกฤษ */
  const nav = (globalThis.navigator?.language || 'th').toLowerCase();
  return nav.startsWith('th') ? 'th' : 'en';
}

export function setLang(lang) {
  const next = VALID.includes(lang) ? lang : 'th';
  try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  applyLang(next);
  window.dispatchEvent(new CustomEvent('core7:lang', { detail: { lang: next } }));
  return next;
}

export function toggleLang() {
  return setLang(getLang() === 'th' ? 'en' : 'th');
}

/* เก็บข้อความไทยต้นฉบับไว้ครั้งแรกที่สลับ จะได้สลับกลับมาได้ไม่เพี้ยน */
function swap(node, lang) {
  const en = node.getAttribute('data-en');
  if (en === null) return;
  const useHtml = node.hasAttribute('data-en-html');
  const store = useHtml ? '__thHtml' : '__thText';
  if (node[store] === undefined) node[store] = useHtml ? node.innerHTML : node.textContent;
  const value = lang === 'en' ? en : node[store];
  if (useHtml) node.innerHTML = value;
  else node.textContent = value;
}

/* attribute ที่ต้องแปลด้วย เช่น aria-label กับ placeholder
   เขียนเป็น data-en-attr="aria-label:Open rules|placeholder:Room code" */
function swapAttrs(node, lang) {
  const spec = node.getAttribute('data-en-attr');
  if (!spec) return;
  if (node.__thAttrs === undefined) {
    node.__thAttrs = {};
    for (const pair of spec.split('|')) {
      const name = pair.slice(0, pair.indexOf(':'));
      if (name) node.__thAttrs[name] = node.getAttribute(name) ?? '';
    }
  }
  for (const pair of spec.split('|')) {
    const i = pair.indexOf(':');
    if (i < 0) continue;
    const name = pair.slice(0, i);
    node.setAttribute(name, lang === 'en' ? pair.slice(i + 1) : node.__thAttrs[name]);
  }
}

export function applyLang(lang = getLang(), root = document) {
  const use = VALID.includes(lang) ? lang : 'th';
  if (root === document) document.documentElement.lang = use;
  for (const node of root.querySelectorAll('[data-en]')) swap(node, use);
  for (const node of root.querySelectorAll('[data-en-attr]')) swapAttrs(node, use);
  /* หน้าที่เขียนสองภาษาเป็นก้อนแยก (เช่นหน้ากติกา) ใช้ data-lang-block */
  for (const node of root.querySelectorAll('[data-lang-block]')) {
    node.hidden = node.getAttribute('data-lang-block') !== use;
  }
}

/* เรียกได้ทุกที่ที่สร้าง DOM ใหม่หลังโหลดหน้า */
export function localize(root) {
  applyLang(getLang(), root);
}

export const t = (th, en) => (getLang() === 'en' ? en : th);
