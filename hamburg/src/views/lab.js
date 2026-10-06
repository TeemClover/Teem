// "/lab/" — owner view of this browser's local test events. Not linked from customer pages.
import { brandIds, config } from '../product.js';
import { read, write } from '../store.js';
import { brands } from '../brands/meta.js';
import { esc, href } from '../ui.js';

export const meta = { title: 'Lab · Hamburg Food Fair', description: 'ผลทดสอบ Local', noindex: true };

const steps = [
  ['brand_view', 'เปิดหน้าแบรนด์'],
  ['offer_select', 'เลือกชุด'],
  ['add_to_cart', 'เพิ่มตะกร้า'],
  ['checkout_start', 'เริ่ม checkout'],
  ['preview_complete', 'จบ preview'],
  ['order_intent', 'ไปช่องทางสั่ง']
];
const modes = [['arena_choice', 'Arena choice — เลือกบูธเอง'], ['assigned_landing', 'Assigned landing — จัดสรรหน้า']];

const visitors = rows => new Set(rows.map(r => r.visitor_id)).size;

function table(events, mode) {
  const rows = events.filter(e => e.entry_mode === mode);
  const head = `<tr><th scope="col">บูธ</th>${mode === 'arena_choice' ? '<th scope="col">กดเลือกบูธ</th>' : ''}${steps.map(([, l]) => `<th scope="col">${l}</th>`).join('')}</tr>`;
  const body = brandIds.map(id => {
    const mine = rows.filter(r => r.brand_id === id);
    const cell = ev => { const r = mine.filter(m => m.event === ev); return `<td>${r.length}<small>${visitors(r)} คน</small></td>`; };
    return `<tr><th scope="row">${esc(brands[id].name)}</th>${mode === 'arena_choice' ? cell('booth_select') : ''}${steps.map(([e]) => cell(e)).join('')}</tr>`;
  }).join('');
  return `<p>ผู้เข้าชม ${visitors(rows)} คน · event ${rows.length} รายการ${mode === 'arena_choice' ? ` · เปิดหน้ารวม ${rows.filter(r => r.event === 'arena_view').length} ครั้ง` : ''}</p>
    <div class="lab-scroll"><table class="lab-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

function positions(events) {
  const sel = events.filter(e => e.event === 'booth_select' && Array.isArray(e.booth_order));
  return `<div class="lab-scroll"><table class="lab-table"><thead><tr><th scope="col">ตำแหน่งในหน้ารวม</th>${brandIds.map(id => `<th scope="col">${esc(brands[id].name)}</th>`).join('')}</tr></thead><tbody>
    ${[0, 1, 2].map(pos => `<tr><th scope="row">ลำดับ ${pos + 1}</th>${brandIds.map(id => `<td>${sel.filter(e => e.booth_order[pos] === id && e.brand_id === id).length}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}

function sections(events) {
  const views = events.filter(e => e.event === 'section_view');
  return brandIds.map(id => {
    const mine = views.filter(v => v.brand_id === id);
    const ids = [...new Set(mine.map(v => v.section_id))].sort();
    return `<p><strong>${esc(brands[id].name)}</strong> ${ids.length ? ids.map(s => `${esc(s)} ${mine.filter(v => v.section_id === s).length}`).join(' · ') : '—'}</p>`;
  }).join('');
}

export function render() {
  const events = read('events', []);
  const first = read('firstBrand', null);
  return `<div class="page lab" data-brand="arena">
  <main id="main" class="lab-wrap">
    <p class="lab-kicker">Owner lab · ไม่แสดงในเมนูลูกค้า</p>
    <h1>ผลทดสอบ Local</h1>
    <p class="lab-scope">ข้อมูลจาก browser นี้เท่านั้น ไม่ใช่ยอดจากผู้ใช้ทุกเครื่อง · sales mode: <strong>${esc(config.salesMode)}</strong></p>
    <p class="lab-orders"><strong>ยังไม่มีออร์เดอร์ยืนยัน</strong> — จบ preview คือความตั้งใจซื้อ ไม่ใช่ยอดขาย</p>
    ${first ? `<p>บูธแรกที่ browser นี้เลือก: ${esc(brands[first]?.name || first)}</p>` : ''}
    ${modes.map(([m, label]) => `<section><h2>${label}</h2>${table(events, m)}</section>`).join('')}
    <section><h2>เลือกบูธตามตำแหน่ง</h2>${positions(events)}</section>
    <section><h2>section_view</h2>${sections(events)}</section>
    <section class="lab-actions">
      <button type="button" class="btn" data-export="json">Export JSON</button>
      <button type="button" class="btn" data-export="csv">Export CSV</button>
      <button type="button" class="btn btn-ghost" data-clear>ล้าง event ใน browser นี้</button>
      <a class="text-link" data-link href="${href('/')}">ไปหน้ารวม</a>
    </section>
  </main></div>`;
}

const columns = ['event_id', 'event', 'timestamp', 'visitor_id', 'session_id', 'brand_id', 'entry_mode', 'booth_order', 'first_selected_brand', 'assignment', 'offer_id', 'quantity', 'section_id', 'sales_mode', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
function toCsv(events) {
  const cell = v => { const s = Array.isArray(v) ? v.join('|') : String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [columns.join(','), ...events.map(e => columns.map(c => cell(c.startsWith('utm_') ? e.source?.[c] : e[c])).join(','))].join('\n');
}
function download(name, text, type) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function mount(root, rerender) {
  const onClick = e => {
    const t = e.target.closest('button');
    if (!t) return;
    const events = read('events', []);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    if (t.dataset.export === 'json') download(`hamburg-events-${stamp}.json`, JSON.stringify(events, null, 2), 'application/json');
    if (t.dataset.export === 'csv') download(`hamburg-events-${stamp}.csv`, '﻿' + toCsv(events), 'text/csv');
    if (t.matches('[data-clear]') && confirm('ล้าง event ทดสอบทั้งหมดใน browser นี้?')) { write('events', []); rerender(); }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
