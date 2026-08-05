/* ═══════════════════════════════════════════════════════════════
   myClover — แถบนำทางกลางของหน้าสถิติทุกหน้า

   หน้าสถิติกระจายอยู่หลายที่ตามความหมายของมัน (ของเว็บหลักอยู่ราก
   ของเกมอยู่ใต้ /core7/) การให้แต่ละหน้าเขียนลิงก์ไปหากันเองแปลว่า
   เพิ่มหน้าใหม่ทีต้องไล่แก้ทุกหน้า และลืมหน้าใดหน้าหนึ่งเมื่อไหร่
   ก็กลายเป็นหน้าที่เข้าถึงไม่ได้

   ทะเบียนอยู่ที่นี่ที่เดียว ทุกหน้า import แล้วแถบขึ้นเอง

     <script type="module" src="/assets/stat-nav.js"></script>

   หน้าไหนอยู่ที่ไหนดูจาก path ของตัวเอง ไม่ต้องบอก
   ═══════════════════════════════════════════════════════════════ */

export const STAT_PAGES = Object.freeze([
  { href: '/stat/', th: 'Dashboard', emoji: '📊', note: 'สรุปวันนี้' },
  { href: '/stat/journey/', th: 'Journey', emoji: '🚶', note: 'เส้นทาง First Run' },
  { href: '/collection/stat/', th: 'Achievement', emoji: '🏅', note: 'ของที่ปลดได้ทั้งบ้าน' },
  { href: '/core7/stat/', th: 'CORE7', emoji: '🎮', note: 'สุขภาพเกม' },
  { href: '/core7/collection/stat/', th: 'FIRST HAND', emoji: '🃏', note: 'การ์ด 28 ใบ' },
]);

const CSS = `
.mc-statnav{position:sticky;top:0;z-index:40;display:flex;gap:6px;align-items:center;flex-wrap:wrap;
  padding:9px clamp(14px,3vw,26px);background:rgba(6,21,14,.92);backdrop-filter:blur(12px);
  border-bottom:1px solid rgba(255,255,255,.1)}
.mc-statnav a{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;
  font:700 12px/1 "Bai Jamjuree",system-ui,sans-serif;color:rgba(255,255,255,.62);
  text-decoration:none;white-space:nowrap;border:1px solid transparent}
.mc-statnav a:hover{background:rgba(255,255,255,.07);color:#fff}
.mc-statnav a[aria-current]{background:rgba(217,184,108,.16);border-color:rgba(217,184,108,.4);color:#d9b86c}
.mc-statnav .mc-statnav-sp{flex:1}
.mc-statnav .mc-statnav-cmd{background:#d9b86c;color:#172018;border-color:#d9b86c}
.mc-statnav .mc-statnav-cmd:hover{background:#e6c987;color:#172018}
@media(max-width:720px){.mc-statnav{gap:4px;padding:8px 12px}
  .mc-statnav a{padding:6px 9px;font-size:11px}
  .mc-statnav a span.t{display:none}
  .mc-statnav a[aria-current] span.t,.mc-statnav .mc-statnav-cmd span.t{display:inline}}
`;

/* ── เวลาไทยที่เดียว ──
   ทั้งระบบยึด GMT+7 ทุกจุด: วันที่ backend ตัด, วันที่ในช่องเลือกช่วง และเวลาที่แสดง

   ก่อนหน้านี้ช่องเลือกวันที่ใช้ `new Date().toISOString()` ซึ่งเป็น UTC —
   ระหว่างเที่ยงคืนถึงเจ็ดโมงเช้าเวลาไทย มันจะเลือก "เมื่อวาน" ให้โดยที่ไม่มีอะไรบอก
   แล้วตัวเลขบนหน้าก็ไม่ตรงกับที่ backend ตัดวันไว้ อ่านแล้วงงโดยไม่รู้ว่างงเพราะอะไร */
export const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
export const TZ = 'Asia/Bangkok';

/* วันแบบ YYYY-MM-DD ตามเวลาไทย — ใส่ offset เป็นจำนวนวันเพื่อถอยหลังได้ */
export function bkkDay(offsetDays = 0, base = Date.now()) {
  return new Date(base + BKK_OFFSET_MS - offsetDays * 86400000)
    .toISOString().slice(0, 10);
}

/* เวลาเต็มสำหรับแสดงผล ระบุโซนไว้ตรง ๆ ไม่ปล่อยให้ขึ้นกับเครื่องคนอ่าน */
export function bkkTime(ms) {
  return new Date(ms).toLocaleString('th-TH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: TZ,
  });
}

/* เทียบแบบตัดสแลชท้ายออก เพราะ /stat/ กับ /stat ต้องนับเป็นหน้าเดียวกัน */
function samePath(a, b) {
  const norm = s => String(s || '').replace(/\/+$/, '') || '/';
  return norm(a) === norm(b);
}

export function statNavHTML(currentPath = globalThis.location?.pathname || '') {
  const links = STAT_PAGES.map(page => {
    const active = samePath(page.href, currentPath) ? ' aria-current="page"' : '';
    return `<a href="${page.href}"${active} title="${page.note}">`
      + `<span aria-hidden="true">${page.emoji}</span><span class="t">${page.th}</span></a>`;
  }).join('');
  return `<nav class="mc-statnav" aria-label="หน้าสถิติทั้งหมด">${links}`
    + `<span class="mc-statnav-sp"></span>`
    + `<a class="mc-statnav-cmd" href="/command/" title="Command Center">`
    + `<span aria-hidden="true">🛰️</span><span class="t">Command</span></a></nav>`;
}

function mount() {
  if (document.querySelector('.mc-statnav')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const holder = document.createElement('div');
  holder.innerHTML = statNavHTML();
  document.body.insertBefore(holder.firstElementChild, document.body.firstChild);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
}
