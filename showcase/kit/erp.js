/**
 * ERP engine: /showcase/erp-restaurant/, /showcase/erp-brand/, /showcase/erp-retail/.
 * One engine, three business packs. Modules: dashboard, orders (+ kitchen screen, bookings), POS,
 * stock (recipes or lots), purchasing, customers, reports with a real CSV export.
 *
 * History is generated from a fixed seed (same numbers every visit, labelled as made up). Orders,
 * bookings, purchase orders and status changes made in any demo of the same business arrive
 * through the bus and change stock, the kitchen screen and the reports live.
 */
import {data, esc, money, $, $$, on, pic, icon, bus, orderNo, toast, sheet, param, hhmm, ago, seeded} from './kit.js';

const D = data();
const P = D.pack, B = D.biz, L = D.links;
const F = P.features || {};
const app = document.getElementById('app');
const shared = bus(D.demo.biz);
const DAY = 86400000;
const CH = Object.fromEntries(P.channels.map(c => [c.id, c]));
const ITEM = Object.fromEntries(P.catalog.filter(i => P.items[i.id]).map(i => [i.id, {...i, ...P.items[i.id]}]));
const ITEMS = Object.values(ITEM);
const ING = Object.fromEntries((P.ingredients || []).map(g => [g.id, g]));
const SUP = Object.fromEntries(P.suppliers.map(s => [s.id, s]));
const CUST = Object.fromEntries(P.customers.map(c => [c.id, c]));
const SL = P.statusLabels;
const FLOW = ['new', 'doing', 'ready', 'done'];
const NEXT_LABEL = F.kitchen ? {new: 'เริ่มทำ', doing: 'พร้อมเสิร์ฟ', ready: 'เสิร์ฟแล้ว'} : {new: 'ยืนยันออเดอร์', doing: 'ส่งแล้ว', ready: 'ถึงลูกค้าแล้ว'};
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const today0 = startOfDay(Date.now());
const num = (n, d = 0) => Number(n).toLocaleString('th-TH', {maximumFractionDigits: d, minimumFractionDigits: 0});
const pct = n => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`;
const recipeCost = id => Object.entries(P.recipes?.[id] || {}).reduce((s, [g, q]) => s + (ING[g]?.cost || 0) * q, 0);
const unitCost = id => P.recipes?.[id] ? recipeCost(id) : ITEM[id]?.cost || 0;

/* -------------------------------------------------------- made-up history */
function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function pick(weights, r) { const entries = Object.entries(weights); const sum = entries.reduce((s, [, w]) => s + w, 0); let x = r() * sum; for (const [k, w] of entries) { x -= w; if (x <= 0) return k; } return entries[0][0]; }
const HISTORY = (() => {
  const H = P.history, out = [], now = Date.now();
  const custW = Object.fromEntries(P.customers.map(c => [c.id, Math.max(1, c.visits || 1)]));
  for (let d = H.days - 1; d >= 0; d--) {
    const day0 = today0 - d * DAY, idx = Math.floor((day0 + 7 * 3600000) / DAY);
    const r = seeded(H.seed * 7919 + idx);
    const factor = [0.92, 0.85, 0.95, 1, 1.04, 1.22, 1.15][new Date(day0).getDay()];
    const n = Math.round((H.perDay[0] + r() * (H.perDay[1] - H.perDay[0])) * factor);
    const day = [];
    for (let k = 0; k < n; k++) {
      let hr = null, x = r(), acc = 0;
      for (const [mu, sd, w] of H.peaks) { acc += w; if (x < acc) { hr = mu + gauss(r) * sd; break; } }
      if (hr === null) hr = H.hours[0] + r() * (H.hours[1] - H.hours[0]);
      hr = Math.min(H.hours[1] - .05, Math.max(H.hours[0], hr));
      const at = day0 + hr * 3600000;
      const ch = pick(H.mix, r);
      const pool = ITEMS.filter(i => !i.ch || i.ch.includes(ch));
      if (!pool.length) continue;
      const lines = H.lines[0] + Math.floor(r() * (H.lines[1] - H.lines[0] + 1));
      const items = [];
      for (let j = 0; j < lines; j++) {
        const it = ITEM[pick(Object.fromEntries(pool.map(i => [i.id, i.pop || 1])), r)];
        const qty = ch === 'b2b' ? H.b2bQty[0] + Math.floor(r() * (H.b2bQty[1] - H.b2bQty[0])) : r() < .8 ? 1 : 2;
        const price = Math.round(it.price * (CH[ch].price || 1));
        const same = items.find(l => l.id === it.id);
        if (same) same.qty += qty; else items.push({id: it.id, name: it.name, qty, price});
      }
      const cust = ['pos', 'qr'].includes(ch) && !(F.members && r() < .45) ? null : ch === 'b2b' ? P.customers.find(c => c.seg === 'ร้านค้า')?.id : r() < .55 ? pick(custW, r) : null;
      day.push({at, channel: ch, items, customer: cust, cancel: r() < .025});
    }
    day.sort((a, b) => a.at - b.at).forEach((o, i) => {
      if (o.at > now) return;
      const age = (now - o.at) / 60000;
      let status = 'done';
      if (o.cancel) status = 'cancel';
      else if (d === 0) status = F.kitchen ? (age < 9 ? 'new' : age < 22 ? 'doing' : age < 34 ? 'ready' : 'done') : (age < 70 ? 'new' : age < 200 ? 'doing' : o.channel === 'pos' ? 'done' : 'ready');
      const total = o.items.reduce((s, l) => s + l.price * l.qty, 0);
      out.push({id: `h${idx}-${i}`, no: orderNo(B.code, i + 1, o.at), at: o.at, channel: o.channel, items: o.items, total, status, customer: o.customer, table: o.channel === 'qr' || (o.channel === 'pos' && F.kitchen) ? String(1 + Math.floor(seeded(idx + i)() * 16)) : null, seeded: true});
    });
  }
  return out;
})();

/* ------------------------------------------------------ live state & model */
let S = shared.get();
const statusOf = o => S.marks?.[o.id] || o.status;
function allOrders() {
  const live = S.orders.map(o => ({...o, live: true, total: o.total ?? o.items.reduce((s, l) => s + l.price * l.qty, 0)}));
  return [...HISTORY, ...live].map(o => ({...o, st: statusOf(o)})).sort((a, b) => b.at - a.at);
}
function levels() {
  const items = {}, ings = {}, lots = {};
  for (const it of ITEMS) { if (it.lots) { lots[it.id] = it.lots.map(l => ({...l, left: l.qty})); items[it.id] = it.lots.reduce((s, l) => s + l.qty, 0); } else if (it.stock != null) items[it.id] = it.stock; }
  for (const g of P.ingredients || []) ings[g.id] = g.stock;
  const used = {};
  const take = (id, q) => {
    if (P.recipes?.[id]) { for (const [g, per] of Object.entries(P.recipes[id])) { ings[g] -= per * q; used[g] = (used[g] || 0) + per * q; } return; }
    if (items[id] == null) return;
    items[id] -= q; used[id] = (used[id] || 0) + q;
    if (lots[id]) { let rest = q; for (const l of [...lots[id]].sort((a, b) => a.exp - b.exp)) { const t = Math.min(l.left, rest); l.left -= t; rest -= t; if (!rest) break; } }
  };
  for (const o of S.orders) if (statusOf(o) !== 'cancel') for (const l of o.items) take(l.id, l.qty);
  for (const po of S.po.filter(p => p.status === 'received')) for (const [id, q] of po.lines) {
    if (ings[id] != null) ings[id] += q; else if (items[id] != null) { items[id] += q; if (lots[id]) lots[id].push({lot: `NEW-${String(po.n).padStart(3, '0')}`, qty: q, left: q, exp: 24}); }
  }
  for (const m of S.moves) { if (ings[m.target] != null) ings[m.target] += m.delta; else if (items[m.target] != null) items[m.target] += m.delta; }
  return {items, ings, lots, used};
}
const reorderOf = id => ING[id]?.reorder ?? ITEM[id]?.reorder ?? 0;
const nameOf = id => ING[id]?.name || ITEM[id]?.name || id;
const unitOf = id => ING[id]?.unit || ITEM[id]?.unit || 'ชิ้น';
const supplierOf = id => ING[id]?.supplier || P.suppliers.find(s => s.for?.includes(id))?.id || P.suppliers[0].id;
const costOf = id => ING[id]?.cost ?? ITEM[id]?.cost ?? 0;
function lowList(lv = levels()) {
  const out = [];
  for (const [id, q] of Object.entries(lv.ings)) if (q <= reorderOf(id)) out.push({id, q});
  for (const [id, q] of Object.entries(lv.items)) if (q <= reorderOf(id)) out.push({id, q});
  return out;
}
const expiring = lv => Object.entries(lv.lots).flatMap(([id, ls]) => ls.filter(l => l.left > 0 && l.exp <= 6).map(l => ({id, ...l})));
const expDate = m => { const d = new Date(today0); d.setMonth(d.getMonth() + m); return d.toLocaleDateString('th-TH', {month: 'short', year: 'numeric'}); };
const chPill = id => `<span class="ch" style="--c:${CH[id]?.color || '#888'}">${esc(CH[id]?.label || id)}</span>`;
const stPill = st => `<span class="pill ${st === 'new' ? 'info' : st === 'doing' ? 'warn' : st === 'ready' ? 'ok' : st === 'cancel' ? 'bad' : 'mute'}">${esc(SL[st] || st)}</span>`;
const custName = o => o.customer ? (CUST[o.customer]?.name || o.customer) : o.table ? `โต๊ะ ${o.table}` : 'ลูกค้าหน้าร้าน';
const itemsText = o => o.items.map(l => `${l.name} × ${l.qty}`).join(', ');
const hasKitchenItem = o => o.items.some(l => P.recipes?.[l.id]);

/* ----------------------------------------------------------------- shell */
const MODULES = [
  ['dash', 'ภาพรวม', 'chart'],
  ['orders', 'ออเดอร์', 'receipt'],
  ...(F.kitchen ? [['kitchen', 'จอครัว', 'chef']] : []),
  ...(F.bookings ? [['bookings', 'การจอง', 'calendar']] : []),
  ...(CH.pos ? [['pos', 'ขายหน้าร้าน', 'pos']] : []),
  ['stock', 'สต็อก', 'box'],
  ['buy', 'จัดซื้อ', 'truck'],
  ['crm', F.members ? 'สมาชิก' : 'ลูกค้า', 'users'],
  ['report', 'รายงาน', 'doc'],
];
const state = {view: MODULES.some(m => m[0] === param('view')) ? param('view') : param('order') ? 'orders' : 'dash', range: 'today', fStatus: 'all', fChannel: 'all', q: '', more: 40, stockTab: F.recipes ? 'ing' : 'items', seg: 'all', posCat: 'all', ticket: [], posMode: 'dine', posTable: '1', posMember: '', fresh: new Set()};

function shell() {
  app.innerHTML = `<div class="erp">
  <aside class="erp-side" aria-label="เมนูระบบ">
    <div class="erp-org"><span class="erp-logo">${esc(B.code)}</span><div><b>${esc(B.name)}</b><small>หลังบ้าน · ผู้จัดการ (สาธิต)</small></div></div>
    <nav class="erp-nav">${MODULES.map(([id, label, ic]) => `<button type="button" data-view="${id}" aria-current="${state.view === id ? 'page' : 'false'}">${icon(ic)}<span>${label}</span><em class="erp-badge" data-badge="${id}"></em></button>`).join('')}</nav>
    <div class="erp-side-foot">
      <p class="erp-live"><i></i>เชื่อมกับ${L.stores.length ? 'หน้าร้าน' : ''}${L.menu ? ' เมนู QR' : ''}${L.line ? ' LINE' : ''} แบบสด</p>
      <div class="erp-jump">${[...L.stores.map(s => [s.href, s.title]), ...(L.menu ? [[L.menu, 'เมนู QR']] : []), ...(L.line ? [[L.line, 'LINE OA']] : [])].map(([h, t]) => `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join('')}</div>
      <button class="erp-reset" type="button" data-reset>${icon('reset')}ล้างข้อมูลที่ลองทำ</button>
    </div>
  </aside>
  <section class="erp-main" id="erp-main">
    <header class="erp-top"><div><h1 id="erp-title"></h1><p id="erp-sub"></p></div><span class="erp-made">ข้อมูลสมมติ</span></header>
    <div id="erp-alert"></div>
    <div class="erp-view" id="erp-view"></div>
    <footer class="erp-foot-m"><div class="erp-jump">${[...L.stores.map(s => [s.href, s.title]), ...(L.menu ? [[L.menu, 'เมนู QR']] : []), ...(L.line ? [[L.line, 'LINE OA']] : [])].map(([h, t]) => `<a href="${esc(h)}" target="_blank" rel="noopener">ลองสั่งจาก${esc(t)} ↗</a>`).join('')}</div><button class="erp-reset" type="button" data-reset>${icon('reset')}ล้างข้อมูลที่ลองทำ</button></footer>
  </section>
</div>`;
}

const VIEWS = {};
function render() {
  S = shared.get();
  $$('.erp-nav [data-view]').forEach(b => b.setAttribute('aria-current', String(b.dataset.view === state.view)));
  const m = MODULES.find(x => x[0] === state.view);
  $('#erp-title').textContent = m[1];
  $('#erp-sub').textContent = new Date().toLocaleDateString('th-TH', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  const orders = allOrders();
  const waiting = orders.filter(o => o.at >= today0 && o.st === 'new').length;
  $('[data-badge="orders"]').textContent = waiting || '';
  const kb = $('[data-badge="kitchen"]'); if (kb) kb.textContent = orders.filter(o => o.at >= today0 && ['new', 'doing'].includes(o.st) && hasKitchenItem(o)).length || '';
  const bb = $('[data-badge="bookings"]'); if (bb) bb.textContent = S.bookings.filter(b => !b.confirmed).length || '';
  paintCalls();
  $('#erp-view').innerHTML = VIEWS[state.view](orders);
  $('#erp-view').dataset.module = state.view;
}

function paintCalls() {
  const calls = (S.calls || []).filter(c => !c.done);
  $('#erp-alert').innerHTML = calls.length ? `<div class="erp-calls">${calls.map(c => `<p>${icon('bell')}<b>โต๊ะ ${esc(c.table)}</b> ${c.kind === 'bill' ? 'ขอเช็กบิล' : 'เรียกพนักงาน'} · ${ago(c.at)}<button type="button" class="b-btn sm soft" data-ack="${c.id}">รับทราบ</button></p>`).join('')}</div>` : '';
}

/* ------------------------------------------------------------- dashboard */
function sum(list) { return list.reduce((s, o) => s + o.total, 0); }
VIEWS.dash = orders => {
  const ok = orders.filter(o => o.st !== 'cancel');
  const now = Date.now();
  const today = ok.filter(o => o.at >= today0);
  const ysame = ok.filter(o => o.at >= today0 - DAY && o.at <= now - DAY);
  const sales = sum(today), ys = sum(ysame);
  const lv = levels(), low = lowList(lv), exp = expiring(lv);
  const days = Array.from({length: P.history.days}, (_, i) => today0 - (P.history.days - 1 - i) * DAY);
  const byDay = days.map(d0 => P.channels.map(c => sum(ok.filter(o => o.at >= d0 && o.at < d0 + DAY && o.channel === c.id))));
  const max = Math.max(...byDay.map(v => v.reduce((a, b) => a + b, 0)), 1);
  const bw = 600 / days.length;
  const bars = byDay.map((vals, i) => { let y = 210; return vals.map((v, c) => { const h = v / max * 190; y -= h; return h > 0 ? `<rect x="${44 + i * bw + 4}" y="${y.toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${P.channels[c].color}"><title>${new Date(days[i]).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})} · ${esc(P.channels[c].label)} ${money(v)}</title></rect>` : ''; }).join(''); }).join('');
  const labels = days.map((d0, i) => i % 2 === (days.length - 1) % 2 ? `<text x="${44 + i * bw + bw / 2}" y="230" text-anchor="middle">${new Date(d0).getDate()}</text>` : '').join('');
  const grid = [0, .5, 1].map(f => `<line x1="40" x2="650" y1="${210 - f * 190}" y2="${210 - f * 190}"/><text x="36" y="${214 - f * 190}" text-anchor="end">${num(Math.round(max * f / 1000))}k</text>`).join('');
  const span = ok.filter(o => o.at >= days[0]);
  const qty = {}; for (const o of span) for (const l of o.items) qty[l.id] = (qty[l.id] || 0) + l.qty;
  const top = Object.entries(qty).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const chTot = P.channels.map(c => [c, sum(span.filter(o => o.channel === c.id))]);
  const chMax = Math.max(...chTot.map(x => x[1]), 1);
  const newOnes = orders.filter(o => o.at >= today0 && o.st === 'new');
  const bookingsToday = F.bookings ? bookingList().filter(b => b.day === 0) : [];
  const todo = [
    ...newOnes.slice(0, 4).map(o => `<li class="todo-order"><span>${icon('receipt')}</span><div><b>${esc(o.no)}</b> ${chPill(o.channel)}<small>${esc(itemsText(o))}</small></div><button class="b-btn sm" type="button" data-advance="${o.id}">${NEXT_LABEL.new}</button></li>`),
    ...low.slice(0, 4).map(x => `<li class="todo-low"><span>${icon('box')}</span><div><b>${esc(nameOf(x.id))}</b><small>เหลือ ${num(x.q, 2)} ${esc(unitOf(x.id))} · จุดสั่งซื้อ ${num(reorderOf(x.id), 2)}</small></div><button class="b-btn sm soft" type="button" data-po-for="${x.id}">สั่งซื้อ</button></li>`),
    ...exp.slice(0, 3).map(x => `<li class="todo-exp"><span>${icon('clock')}</span><div><b>${esc(nameOf(x.id))} · ล็อต ${esc(x.lot)}</b><small>เหลือ ${num(x.left)} ชิ้น หมดอายุ ${expDate(x.exp)} · แนะนำจัดชุดโปรหรือเสนอขายส่ง</small></div></li>`),
    ...bookingsToday.map(b => `<li><span>${icon('calendar')}</span><div><b>จองโต๊ะ ${esc(b.time)} · ${esc(b.size)}</b><small>${esc(b.name)}${b.note ? ` · ${esc(b.note)}` : ''}</small></div></li>`),
  ];
  return `<div class="dash">
    <div class="kpis">
      <article class="kpi"><small>ยอดขายวันนี้</small><b>${money(sales)}</b><span class="${sales >= ys ? 'up' : 'down'}">${ys ? pct((sales - ys) / ys) : '—'} เทียบเมื่อวานช่วงเดียวกัน</span></article>
      <article class="kpi"><small>ออเดอร์วันนี้</small><b>${num(today.length)}</b><span>${newOnes.length ? `รอดำเนินการ ${newOnes.length}` : 'ไม่มีค้าง'}</span></article>
      <article class="kpi"><small>บิลเฉลี่ย</small><b>${money(today.length ? sales / today.length : 0)}</b><span>14 วัน ${money(span.length ? sum(span) / span.length : 0)}</span></article>
      <article class="kpi ${low.length || exp.length ? 'warn' : ''}"><small>${F.lots ? 'ใกล้หมด · ใกล้หมดอายุ' : 'ของใกล้หมด'}</small><b>${low.length}${F.lots ? ` · ${exp.length}` : ''}</b><span>${low.length ? 'กดสั่งซื้อได้จากรายการด้านล่าง' : 'สต็อกพอ'}</span></article>
    </div>
    <div class="dash-cols">
      <div class="col">
        <article class="card chart"><header><h2>ยอดขาย 14 วัน แยกช่องทาง</h2></header>
          <svg viewBox="0 0 660 240" role="img" aria-label="กราฟยอดขาย 14 วันแยกตามช่องทาง"><g class="grid">${grid}</g>${bars}<g class="lbl">${labels}</g></svg>
          <ul class="legend">${P.channels.map(c => `<li><i style="background:${c.color}"></i>${esc(c.label)}</li>`).join('')}</ul>
        </article>
        <article class="card"><header><h2>ช่องทางขาย 14 วัน</h2></header><ul class="chbars">${chTot.map(([c, v]) => `<li><span>${esc(c.label)}${c.fee ? `<small>หักค่าธรรมเนียม ${Math.round(c.fee * 100)}%</small>` : c.price ? `<small>ราคาส่ง ${Math.round((1 - c.price) * 100)}% ต่ำกว่าปลีก</small>` : ''}</span><i style="--w:${v / chMax * 100}%;--c:${c.color}"></i><b>${money(v)}</b></li>`).join('')}</ul></article>
      </div>
      <div class="col">
        <article class="card"><header><h2>ต้องทำตอนนี้</h2></header>${todo.length ? `<ul class="todo">${todo.join('')}</ul>` : '<p class="muted">ไม่มีงานค้าง</p>'}</article>
        <article class="card"><header><h2>ขายดี 14 วัน</h2></header><ol class="tops">${top.map(([id, q]) => `<li><span class="art-box sm">${pic(ITEM[id] || {art: {}})}</span><div><b>${esc(nameOf(id))}</b><i style="width:${Math.max(6, q / top[0][1] * 100)}%"></i></div><em>${num(q)}</em></li>`).join('')}</ol></article>
      </div>
    </div>
    <article class="card feed"><header><h2>ออเดอร์ล่าสุด</h2><button class="b-btn sm ghost" type="button" data-view="orders">ดูทั้งหมด</button></header><ul class="olist">${orders.slice(0, 7).map(orderRow).join('')}</ul></article>
  </div>`;
};

/* ---------------------------------------------------------------- orders */
function orderRow(o) {
  const nxt = FLOW[FLOW.indexOf(o.st) + 1];
  return `<li class="orow${state.fresh.has(o.id) ? ' fresh' : ''}${o.live ? ' live' : ''}" data-order="${o.id}">
    <button class="orow-main" type="button" data-open-order="${o.id}">
      <span class="orow-no"><b>${esc(o.no)}</b><small>${o.at >= today0 ? hhmm(o.at) : new Date(o.at).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}) + ' ' + hhmm(o.at)}</small></span>
      <span class="orow-who">${chPill(o.channel)}<small>${esc(custName(o))}</small></span>
      <span class="orow-items">${esc(itemsText(o))}</span>
      <span class="orow-total">${money(o.total)}</span>
    </button>
    <span class="orow-st">${stPill(o.st)}${o.live ? '<span class="pill live-tag">จากตัวอย่าง</span>' : ''}${nxt && o.st !== 'cancel' ? `<button class="b-btn sm" type="button" data-advance="${o.id}">${NEXT_LABEL[o.st]}</button>` : ''}</span>
  </li>`;
}

VIEWS.orders = orders => {
  const span = state.range === 'today' ? orders.filter(o => o.at >= today0) : orders;
  const q = state.q.trim().toLowerCase();
  const list = span.filter(o => (state.fStatus === 'all' || o.st === state.fStatus) && (state.fChannel === 'all' || o.channel === state.fChannel) && (!q || `${o.no} ${custName(o)} ${itemsText(o)}`.toLowerCase().includes(q)));
  const count = st => span.filter(o => st === 'all' || o.st === st).length;
  return `<div class="tools">
      <div class="seg" role="group" aria-label="ช่วงเวลา"><button type="button" class="chip" data-range="today" aria-pressed="${state.range === 'today'}">วันนี้</button><button type="button" class="chip" data-range="14" aria-pressed="${state.range === '14'}">14 วัน</button></div>
      <div class="seg" role="group" aria-label="สถานะ">${['all', ...FLOW, 'cancel'].map(st => `<button type="button" class="chip" data-fstatus="${st}" aria-pressed="${state.fStatus === st}">${st === 'all' ? 'ทั้งหมด' : esc(SL[st])} <small>${count(st)}</small></button>`).join('')}</div>
      <label class="sel"><span class="sr">ช่องทาง</span><select class="input" data-fchannel><option value="all">ทุกช่องทาง</option>${P.channels.map(c => `<option value="${c.id}"${state.fChannel === c.id ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
      <label class="search">${icon('search')}<input class="input" type="search" data-q value="${esc(state.q)}" placeholder="ค้นหาเลขที่ ลูกค้า หรือเมนู" aria-label="ค้นหาออเดอร์"></label>
    </div>
    <p class="muted small">${list.length} ออเดอร์ · ยอดรวม ${money(sum(list.filter(o => o.st !== 'cancel')))}</p>
    <ul class="olist">${list.slice(0, state.more).map(orderRow).join('') || '<li class="muted empty">ไม่มีออเดอร์ที่ตรงเงื่อนไข</li>'}</ul>
    ${list.length > state.more ? `<button class="b-btn ghost wide" type="button" data-more>แสดงเพิ่ม (${list.length - state.more})</button>` : ''}`;
};

function openOrder(id) {
  const o = allOrders().find(x => x.id === id);
  if (!o) return toast('ไม่พบออเดอร์นี้ในเบราว์เซอร์นี้ อาจถูกล้างข้อมูลไปแล้ว');
  const s = sheet({title: esc(o.no), foot: ' ', label: `ออเดอร์ ${o.no}`});
  const draw = () => {
    S = shared.get();
    const st = statusOf(o), nxt = FLOW[FLOW.indexOf(st) + 1];
    const cost = o.items.reduce((a, l) => a + unitCost(l.id) * l.qty, 0);
    const fee = (CH[o.channel]?.fee || 0) * o.total;
    s.set(`<div class="odetail">
      <p class="odmeta">${chPill(o.channel)} ${stPill(st)} <span>${new Date(o.at).toLocaleString('th-TH', {dateStyle: 'medium', timeStyle: 'short'})}</span></p>
      <p><b>${esc(custName(o))}</b>${o.shipBy ? ` · ${esc(o.shipBy)}` : ''}${o.pay ? ` · ${esc(o.pay)}` : ''}</p>
      <ul class="lines">${o.items.map(l => `<li><span>${esc(l.name)} × ${l.qty}${l.opts ? `<small>${esc(l.opts)}</small>` : ''}</span><b>${money(l.price * l.qty)}</b></li>`).join('')}</ul>
      <dl class="odsum">${o.discount ? `<div><dt>ส่วนลด</dt><dd>−${money(o.discount)}</dd></div>` : ''}${o.ship ? `<div><dt>ค่าส่ง</dt><dd>${money(o.ship)}</dd></div>` : ''}<div class="t"><dt>รวม</dt><dd>${money(o.total)}</dd></div>
        <div><dt>ต้นทุน${P.recipes ? 'วัตถุดิบ' : 'สินค้า'}</dt><dd>${money(cost)}</dd></div>${fee ? `<div><dt>ค่าธรรมเนียมช่องทาง</dt><dd>${money(fee)}</dd></div>` : ''}<div><dt>กำไรขั้นต้น</dt><dd>${money(o.total / 1.07 - cost - fee)}</dd></div></dl>
      <ol class="timeline">${FLOW.map((k, i) => `<li class="${i <= FLOW.indexOf(st) ? 'on' : ''}">${esc(SL[k])}</li>`).join('')}</ol>
      ${o.live ? `<p class="hint">ออเดอร์นี้มาจาก${o.demo === 'menu' ? 'เมนู QR' : o.channel === 'line' ? ' LINE OA' : 'หน้าร้านออนไลน์'}ที่คุณลองสั่ง เปลี่ยนสถานะตรงนี้ แล้วฝั่งลูกค้าจะเห็นตาม</p>` : ''}
    </div>`);
    s.setFoot(st === 'cancel' || st === 'done' ? `<button class="b-btn ghost wide" type="button" data-close>ปิด</button>` : `<div class="row2"><button class="b-btn ghost" type="button" data-cancel-order>ยกเลิก</button><button class="b-btn wide" type="button" data-adv>${NEXT_LABEL[st]}</button></div>`);
  };
  draw();
  on(s.el, 'click', '[data-adv]', () => { advance(o.id); draw(); });
  on(s.el, 'click', '[data-cancel-order]', () => { setStatus(o.id, 'cancel'); draw(); toast(`ยกเลิก ${esc(o.no)} แล้ว${o.live ? ' สต็อกคืนอัตโนมัติ' : ''}`); });
}

function setStatus(id, st) { shared.mutate(s => { s.marks = {...(s.marks || {}), [id]: st}; }); }
function advance(id) {
  const o = allOrders().find(x => x.id === id);
  const nxt = FLOW[FLOW.indexOf(o.st) + 1];
  if (nxt) { setStatus(id, nxt); toast(`${esc(o.no)} → ${esc(SL[nxt])}`); }
}

/* --------------------------------------------------------------- kitchen */
VIEWS.kitchen = orders => {
  const now = Date.now();
  const list = orders.filter(o => o.at >= today0 && ['new', 'doing', 'ready'].includes(o.st) && hasKitchenItem(o)).sort((a, b) => a.at - b.at);
  const col = (st, title) => {
    const l = list.filter(o => o.st === st);
    return `<section class="kcol" data-col="${st}"><h2>${title} <small>${l.length}</small></h2>${l.map(o => { const min = Math.round((now - o.at) / 60000); return `<article class="ticket${min > 15 && st !== 'ready' ? ' late' : ''}${state.fresh.has(o.id) ? ' fresh' : ''}${o.live ? ' live' : ''}">
      <header><b>${o.table ? `โต๊ะ ${esc(o.table)}` : esc(CH[o.channel]?.label || '')}</b><span>${min} นาที</span></header>
      <p class="tno">${esc(o.no)} · ${chPill(o.channel)}</p>
      <ul>${o.items.filter(l => P.recipes?.[l.id]).map(l => `<li><b>${l.qty}×</b> ${esc(l.name)}${l.opts ? `<small>${esc(l.opts)}</small>` : ''}</li>`).join('')}</ul>
      <button class="b-btn wide${st === 'ready' ? ' soft' : ''}" type="button" data-advance="${o.id}">${NEXT_LABEL[st]}</button>
    </article>`; }).join('') || '<p class="muted">ว่าง</p>'}</section>`;
  };
  return `<p class="muted small">ออเดอร์จากหน้าร้าน เมนู QR LINE และแอปเดลิเวอรีขึ้นที่จอเดียวกัน ${L.menu ? `<a href="${esc(L.menu)}" target="_blank" rel="noopener">ลองสั่งจากเมนู QR ↗</a>` : ''}</p>
    <div class="kitchen">${col('new', 'ใหม่')}${col('doing', 'กำลังทำ')}${col('ready', 'พร้อมเสิร์ฟ')}</div>`;
};

/* -------------------------------------------------------------- bookings */
function bookingList() {
  const seeded = (P.bookings || []).map((b, i) => ({id: `sb${i}`, ...b, day: b.dayOffset, size: `${b.size} คน`, seeded: true}));
  const live = S.bookings.map(b => ({...b, day: Math.round((startOfDay(b.date) - today0) / DAY), live: true}));
  return [...live, ...seeded].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}
VIEWS.bookings = () => {
  const list = bookingList();
  const label = d => d === 0 ? 'วันนี้' : d === 1 ? 'พรุ่งนี้' : new Date(today0 + d * DAY).toLocaleDateString('th-TH', {weekday: 'short', day: 'numeric', month: 'short'});
  const days = [...new Set(list.map(b => b.day))];
  return `<p class="muted small">การจองจาก LINE OA เข้ามาที่นี่ ${L.line ? `<a href="${esc(L.line)}?ask=book" target="_blank" rel="noopener">ลองจองโต๊ะใน LINE ↗</a>` : ''}</p>
    ${days.map(d => `<section class="bk-day"><h2>${label(d)}</h2><ul class="olist">${list.filter(b => b.day === d).map(b => `<li class="orow${b.live ? ' live' : ''}"><span class="orow-main static"><span class="orow-no"><b>${esc(b.time)}</b><small>${esc(b.size)}</small></span><span class="orow-who">${b.live ? chPill('line') : ''}<small>${esc(b.name)}</small></span><span class="orow-items">${esc(b.note || '')}</span></span><span class="orow-st">${b.big ? '<span class="pill warn">ต้องโทรยืนยัน</span>' : ''}${b.live ? (b.confirmed ? '<span class="pill ok">ยืนยันแล้ว</span>' : `<button class="b-btn sm" type="button" data-confirm-booking="${b.id}">ยืนยันการจอง</button>`) : '<span class="pill ok">ยืนยันแล้ว</span>'}</span></li>`).join('')}</ul></section>`).join('')}`;
};

/* ------------------------------------------------------------------- POS */
VIEWS.pos = () => {
  const cats = [...new Map(ITEMS.map(i => [`${i.source}:${i.cat}`, i])).values()];
  const groups = [...new Set(ITEMS.map(i => i.source))];
  const list = ITEMS.filter(i => state.posCat === 'all' || i.source === state.posCat || `${i.source}:${i.cat}` === state.posCat);
  const total = state.ticket.reduce((s, l) => s + l.price * l.qty, 0);
  const member = CUST[state.posMember];
  return `<div class="pos">
    <div class="pos-left">
      <div class="seg wrap" role="group" aria-label="หมวด"><button type="button" class="chip" data-poscat="all" aria-pressed="${state.posCat === 'all'}">ทั้งหมด</button>${groups.length > 1 ? groups.map(g => `<button type="button" class="chip" data-poscat="${g}" aria-pressed="${state.posCat === g}">${esc(P.sources[g].label)}</button>`).join('') : ''}</div>
      <div class="tiles">${list.map(i => `<button type="button" class="tile" data-tile="${i.id}"><span class="art-box">${pic(i)}</span><b>${esc(i.name)}</b><span class="price">${money(i.price)}</span></button>`).join('')}</div>
    </div>
    <aside class="ticketbox" aria-label="บิลปัจจุบัน">
      <h2>บิลปัจจุบัน</h2>
      ${F.kitchen ? `<div class="seg" role="group" aria-label="รูปแบบ"><button type="button" class="chip" data-posmode="dine" aria-pressed="${state.posMode === 'dine'}">ทานที่ร้าน</button><button type="button" class="chip" data-posmode="take" aria-pressed="${state.posMode === 'take'}">กลับบ้าน</button>${state.posMode === 'dine' ? `<label class="sel"><span class="sr">โต๊ะ</span><select class="input" data-postable>${Array.from({length: 16}, (_, i) => `<option${state.posTable === String(i + 1) ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label>` : ''}</div>` : ''}
      ${F.members ? `<label class="field"><span>สมาชิก (สะสมแต้ม ${esc(P.members.label)})</span><select class="input" data-posmember><option value="">ไม่ใช่สมาชิก</option>${P.customers.map(c => `<option value="${c.id}"${state.posMember === c.id ? ' selected' : ''}>${esc(c.name)} · ${num(c.points || 0)} แต้ม</option>`).join('')}</select></label>` : ''}
      <ul class="tlines">${state.ticket.map((l, i) => `<li><span>${esc(l.name)}</span><span class="qty sm"><button type="button" data-tl="${i}" data-d="-1" aria-label="ลด">−</button><output>${l.qty}</output><button type="button" data-tl="${i}" data-d="1" aria-label="เพิ่ม">+</button></span><b>${money(l.price * l.qty)}</b></li>`).join('') || '<li class="muted">แตะสินค้าทางซ้ายเพื่อเพิ่มลงบิล</li>'}</ul>
      <dl class="odsum"><div><dt>รวม (รวม VAT)</dt><dd>${money(total)}</dd></div><div><dt>VAT 7%</dt><dd>${money(total * 7 / 107)}</dd></div>${member ? `<div><dt>แต้มที่ได้</dt><dd>+${Math.floor(total / P.members.perPoint)}</dd></div>` : ''}</dl>
      <div class="paybtns">${['เงินสด', 'พร้อมเพย์', 'บัตร'].map(m => `<button type="button" class="b-btn${m === 'พร้อมเพย์' ? '' : ' soft'}" data-pay="${m}" ${state.ticket.length ? '' : 'disabled'}>${m}</button>`).join('')}</div>
    </aside>
  </div>`;
};

function payPos(method) {
  const items = state.ticket.map(l => ({id: l.id, name: l.name, qty: l.qty, price: l.price}));
  const total = items.reduce((s, l) => s + l.price * l.qty, 0);
  const kitchen = F.kitchen && items.some(l => P.recipes?.[l.id]);
  const rec = shared.add('orders', {channel: 'pos', status: kitchen ? 'new' : 'done', demo: D.demo.slug, items, total, pay: method, table: F.kitchen && state.posMode === 'dine' ? state.posTable : null, customer: state.posMember || null, takeaway: state.posMode === 'take'});
  const no = orderNo(B.code, rec.n, rec.at, 'pos');
  shared.patch('orders', rec.id, {no});
  const points = state.posMember && F.members ? Math.floor(total / P.members.perPoint) : 0;
  state.ticket = [];
  render();
  const s = sheet({title: 'ใบเสร็จ (สาธิต)', foot: '<button class="b-btn wide" type="button" data-close>บิลถัดไป</button>'});
  s.set(`<div class="receipt"><b>${esc(B.name)}</b><small>${esc(B.domain)} · ใบเสร็จรับเงินอย่างย่อ (ตัวอย่าง)</small><p>${esc(no)} · ${new Date(rec.at).toLocaleString('th-TH', {dateStyle: 'short', timeStyle: 'short'})}</p><hr>${items.map(l => `<p><span>${esc(l.name)} ×${l.qty}</span><span>${money(l.price * l.qty)}</span></p>`).join('')}<hr><p><span>รวม</span><span>${money(total)}</span></p><p><span>VAT 7% (รวมแล้ว)</span><span>${money(total * 7 / 107)}</span></p><p><span>ชำระด้วย</span><span>${esc(method)}</span></p>${points ? `<p><span>แต้มสมาชิก</span><span>+${points}</span></p>` : ''}<hr><small>${kitchen ? 'ส่งรายการเข้าจอครัวแล้ว · ' : ''}ตัดสต็อกแล้ว</small></div>`);
}

/* ----------------------------------------------------------------- stock */
VIEWS.stock = () => {
  const lv = levels();
  const tabs = F.recipes ? [['ing', 'วัตถุดิบ'], ['recipes', 'สูตรและต้นทุนต่อจาน'], ['items', 'สินค้าพร้อมขาย']] : [['items', F.lots ? 'สินค้าและล็อต' : 'สินค้า']];
  const statusPill = (q, r) => q <= 0 ? '<span class="pill bad">หมด</span>' : q <= r ? '<span class="pill warn">ใกล้หมด</span>' : '<span class="pill ok">พอ</span>';
  const row = (id, q) => `<li class="srow${lv.used[id] ? ' moved' : ''}"><div class="srow-name"><b>${esc(nameOf(id))}</b><small>${esc(SUP[supplierOf(id)]?.name || '')}</small></div>
    <div class="srow-q"><b>${num(q, 2)}</b> ${esc(unitOf(id))}${lv.used[id] ? `<small>ใช้ไป ${num(lv.used[id], 2)} จากออเดอร์ที่ลองสั่ง</small>` : ''}</div>
    <div class="srow-r"><small>จุดสั่งซื้อ</small> ${num(reorderOf(id), 2)}</div>
    <div class="srow-v"><small>มูลค่า</small> ${money(Math.max(0, q) * costOf(id))}</div>
    <div class="srow-a">${statusPill(q, reorderOf(id))}<button class="b-btn sm ghost" type="button" data-adjust="${id}">ปรับยอด</button><button class="b-btn sm soft" type="button" data-po-for="${id}">สั่งซื้อ</button></div>
    ${F.lots && lv.lots[id] ? `<ul class="lots">${lv.lots[id].map(l => `<li><span>ล็อต ${esc(l.lot)}</span><span>เหลือ ${num(l.left)}</span><span>หมดอายุ ${expDate(l.exp)}</span>${l.exp <= 6 && l.left > 0 ? '<span class="pill warn">ใกล้หมดอายุ</span>' : ''}</li>`).join('')}</ul>` : ''}</li>`;
  let body = '';
  if (state.stockTab === 'ing') body = `<ul class="slist">${Object.entries(lv.ings).map(([id, q]) => row(id, q)).join('')}</ul>`;
  else if (state.stockTab === 'items') body = `<ul class="slist">${Object.entries(lv.items).map(([id, q]) => row(id, q)).join('')}</ul>`;
  else body = `<ul class="slist recipes">${Object.keys(P.recipes).map(id => { const it = ITEM[id], c = recipeCost(id); return `<li class="srow"><div class="srow-name"><b>${esc(it.name)}</b><small>${Object.entries(P.recipes[id]).map(([g, q]) => `${esc(ING[g].name)} ${num(q, 3)} ${esc(ING[g].unit)}`).join(' · ')}</small></div><div class="srow-q"><small>ราคาขาย</small> ${money(it.price)}</div><div class="srow-r"><small>ต้นทุนวัตถุดิบ</small> ${money(c)}</div><div class="srow-v"><small>ต้นทุนอาหาร</small> <b class="${c / it.price > .4 ? 'warn-t' : ''}">${Math.round(c / it.price * 100)}%</b></div><div class="srow-a"><span class="muted small">กำไรต่อจาน ${money(it.price / 1.07 - c)}</span></div></li>`; }).join('')}</ul><p class="muted small">ต้นทุนอาหารเกิน 40% ขึ้นสีเตือน ราคาวัตถุดิบอัปเดตจากใบสั่งซื้อในงานจริง</p>`;
  return `<div class="tools"><div class="seg" role="group" aria-label="มุมมองสต็อก">${tabs.map(([id, l]) => `<button type="button" class="chip" data-stocktab="${id}" aria-pressed="${state.stockTab === id}">${l}</button>`).join('')}</div></div>
    <p class="muted small">${F.recipes ? 'ขายอาหาร 1 จาน ระบบตัดวัตถุดิบตามสูตรให้เอง' : F.lots ? 'ตัดสต็อกจากล็อตที่หมดอายุก่อน (FEFO) และเตือนล็อตที่เหลือไม่ถึง 6 เดือน' : 'หน้าร้านและเว็บใช้สต็อกก้อนเดียวกัน'}</p>${body}`;
};

function openAdjust(id) {
  const s = sheet({title: `ปรับยอด · ${esc(nameOf(id))}`, foot: '<button class="b-btn wide" type="button" data-save-adj>บันทึก</button>'});
  s.set(`<form class="adj" data-adj><label class="field"><span>จำนวนที่เพิ่ม (+) หรือลด (−) หน่วย: ${esc(unitOf(id))}</span><input class="input" name="delta" type="number" step="0.01" value="-1" inputmode="decimal"></label><label class="field"><span>เหตุผล</span><select class="input" name="reason"><option>ตรวจนับจริง</option><option>ของเสีย/หมดอายุ</option><option>ใช้ทดลอง/แจกตัวอย่าง</option></select></label><p class="muted small">ทุกการปรับยอดถูกบันทึกพร้อมเหตุผลและเวลา ตรวจย้อนหลังได้</p></form>`);
  on(s.el, 'click', '[data-save-adj]', () => {
    const f = s.el.querySelector('[data-adj]'), delta = Number(f.delta.value);
    if (!delta) return toast('ใส่จำนวนที่ไม่ใช่ศูนย์');
    shared.add('moves', {target: id, delta, reason: f.reason.value});
    s.close(); toast(`ปรับยอด ${esc(nameOf(id))} ${delta > 0 ? '+' : ''}${delta} แล้ว`);
  });
}

/* ------------------------------------------------------------ purchasing */
const poTotal = lines => lines.reduce((s, [id, q]) => s + costOf(id) * q, 0);
const poNo = (n, at) => orderNo('PO', n, at).replace(/^PO-/, 'PO-');
function makePO(ids) {
  const lv = levels();
  const by = {};
  for (const id of ids) {
    const cur = lv.ings[id] ?? lv.items[id] ?? 0;
    const want = Math.max(reorderOf(id) * 2 - cur, reorderOf(id));
    const q = ING[id] ? Math.ceil(want * 10) / 10 : Math.ceil(want);
    (by[supplierOf(id)] ||= []).push([id, q]);
  }
  const made = Object.entries(by).map(([sup, lines]) => shared.add('po', {supplier: sup, lines, status: 'draft', total: poTotal(lines)}));
  toast(`สร้างใบสั่งซื้อ ${made.length} ใบ <a href="#buy" data-view="buy">ดูใบสั่งซื้อ</a>`);
  return made;
}
VIEWS.buy = () => {
  const lv = levels(), low = lowList(lv);
  const live = [...S.po].reverse();
  const seededPO = (P.purchases || []).map((p, i) => ({id: `sp${i}`, n: 900 + i, at: today0 - p.daysAgo * DAY + 9 * 3600000, supplier: p.supplier, lines: p.lines, status: 'received', total: poTotal(p.lines), seeded: true}));
  const stLabel = {draft: 'ร่าง', sent: 'ส่งให้ผู้ขายแล้ว', received: 'รับของเข้าคลังแล้ว', cancel: 'ยกเลิก'};
  const row = p => `<li class="orow${p.seeded ? '' : ' live'}"><span class="orow-main static"><span class="orow-no"><b>${esc(poNo(p.n, p.at))}</b><small>${new Date(p.at).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})}</small></span><span class="orow-who"><small>${esc(SUP[p.supplier]?.name)}</small><small class="muted">${esc(SUP[p.supplier]?.lead || '')}</small></span><span class="orow-items">${p.lines.map(([id, q]) => `${esc(nameOf(id))} ${num(q, 2)} ${esc(unitOf(id))}`).join(', ')}</span><span class="orow-total">${money(p.total)}</span></span>
    <span class="orow-st"><span class="pill ${p.status === 'received' ? 'ok' : p.status === 'sent' ? 'info' : p.status === 'cancel' ? 'bad' : 'mute'}">${stLabel[p.status]}</span>${p.status === 'draft' ? `<button class="b-btn sm" type="button" data-po-send="${p.id}">ส่งให้ผู้ขาย</button>` : p.status === 'sent' ? `<button class="b-btn sm" type="button" data-po-receive="${p.id}">รับของเข้าคลัง</button>` : ''}</span></li>`;
  return `<div class="card buy-cta"><div><h2>ของที่ถึงจุดสั่งซื้อ ${low.length} รายการ</h2><p class="muted small">${low.map(x => esc(nameOf(x.id))).join(' · ') || 'ยังไม่มี'}</p></div><button class="b-btn" type="button" data-po-auto ${low.length ? '' : 'disabled'}>สร้างใบสั่งซื้อจากของที่ใกล้หมด</button></div>
    <ul class="olist">${[...live, ...seededPO].map(row).join('')}</ul>
    <p class="muted small">รับของเข้าคลังแล้ว ยอดในหน้าสต็อกเพิ่มทันที${F.lots ? ' และสร้างล็อตใหม่อายุ 24 เดือน' : ''}</p>`;
};

/* ------------------------------------------------------------- customers */
VIEWS.crm = orders => {
  const segs = [...new Set(P.customers.map(c => c.seg))];
  const list = P.customers.filter(c => state.seg === 'all' || c.seg === state.seg);
  const recent = id => orders.filter(o => o.customer === id && o.st !== 'cancel');
  const consenting = list.filter(c => c.consent).length;
  return `<div class="tools"><div class="seg" role="group" aria-label="กลุ่มลูกค้า"><button type="button" class="chip" data-seg="all" aria-pressed="${state.seg === 'all'}">ทั้งหมด</button>${segs.map(s => `<button type="button" class="chip" data-seg="${esc(s)}" aria-pressed="${state.seg === s}">${esc(s)}</button>`).join('')}</div></div>
    <div class="card consent-box"><p><b>ส่งข้อความได้ ${consenting} จาก ${list.length} คน</b> ระบบส่งโปรเฉพาะคนที่ยินยอมรับข่าวสาร (PDPA) และบันทึกวันที่ยินยอมไว้</p><button class="b-btn sm" type="button" data-blast ${consenting ? '' : 'disabled'}>เตรียมข้อความถึงกลุ่มนี้</button></div>
    <ul class="clist">${list.map(c => { const r = recent(c.id); return `<li><button type="button" class="crow" data-cust="${c.id}"><span class="avatar">${esc(c.name.replace(/^คุณ/, '').trim().slice(0, 1))}</span><span class="cmain"><b>${esc(c.name)}</b><small>${esc(c.seg)} · ซื้อ ${num(c.visits + r.length)} ครั้ง · ล่าสุด ${c.lastDays ? `${c.lastDays} วันก่อน` : 'วันนี้'}</small></span>${F.members ? `<span class="cpts">${num(c.points || 0)} แต้ม</span>` : ''}<span class="pill ${c.consent ? 'ok' : 'mute'}">${c.consent ? 'ยินยอม' : 'ไม่ยินยอม'}</span></button></li>`; }).join('')}</ul>`;
};
function openCustomer(id) {
  const c = CUST[id], r = allOrders().filter(o => o.customer === id).slice(0, 6);
  const s = sheet({title: esc(c.name), foot: `<button class="b-btn wide" type="button" data-msg ${c.consent ? '' : 'disabled'}>${c.consent ? 'ส่งข้อความผ่าน LINE' : 'ลูกค้ายังไม่ยินยอม ระบบไม่ส่งให้'}</button>`});
  s.set(`<div class="odetail"><p class="odmeta"><span class="pill info">${esc(c.seg)}</span><span class="pill ${c.consent ? 'ok' : 'mute'}">${c.consent ? 'ยินยอมรับข่าวสาร' : 'ไม่ยินยอมรับข่าวสาร'}</span>${F.members ? `<span class="pill">${num(c.points || 0)} แต้ม</span>` : ''}</p>${c.note ? `<p>${esc(c.note)}</p>` : ''}<h3>ออเดอร์ล่าสุด</h3><ul class="olist">${r.map(orderRow).join('') || '<li class="muted">ยังไม่มีใน 14 วันนี้</li>'}</ul></div>`);
  on(s.el, 'click', '[data-msg]', () => { s.close(); toast('ในงานจริง ข้อความจะส่งผ่าน LINE OA ของร้าน และบันทึกไว้ในประวัติลูกค้า'); });
}

/* --------------------------------------------------------------- reports */
VIEWS.report = orders => {
  const from = today0 - (P.history.days - 1) * DAY;
  const ok = orders.filter(o => o.at >= from && o.st !== 'cancel');
  const gross = sum(ok), vat = gross * 7 / 107, net = gross - vat;
  const cogs = ok.reduce((s, o) => s + o.items.reduce((a, l) => a + unitCost(l.id) * l.qty, 0), 0);
  const fees = ok.reduce((s, o) => s + (CH[o.channel]?.fee || 0) * o.total, 0);
  const fixedM = P.costs.reduce((s, [, v]) => s + v, 0), fixed = fixedM * P.history.days / 30;
  const gp = net - cogs - fees, np = gp - fixed;
  const by = P.channels.map(c => { const l = ok.filter(o => o.channel === c.id); const g = sum(l); const cg = l.reduce((s, o) => s + o.items.reduce((a, x) => a + unitCost(x.id) * x.qty, 0), 0); const f = g * (c.fee || 0); return {c, n: l.length, g, f, gp: g / 1.07 - cg - f}; });
  return `<p class="muted small">ช่วง ${new Date(from).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'})} – วันนี้ (${P.history.days} วัน) · ตัวเลขสมมติ · รายงานตัวอย่าง ไม่ใช่คำแนะนำทางบัญชีหรือภาษี</p>
    <div class="dash-grid two">
      <article class="card"><header><h2>กำไรขาดทุนโดยประมาณ</h2></header><dl class="pl">
        <div><dt>ยอดขายรวม (รวม VAT)</dt><dd>${money(gross)}</dd></div><div class="sub"><dt>ภาษีขาย 7/107</dt><dd>−${money(vat)}</dd></div><div class="t"><dt>รายได้ก่อน VAT</dt><dd>${money(net)}</dd></div>
        <div class="sub"><dt>ต้นทุน${P.recipes ? 'วัตถุดิบ (ตามสูตร)' : 'สินค้า'}</dt><dd>−${money(cogs)}</dd></div>${fees ? `<div class="sub"><dt>ค่าธรรมเนียมช่องทาง</dt><dd>−${money(fees)}</dd></div>` : ''}<div class="t"><dt>กำไรขั้นต้น</dt><dd>${money(gp)} <small>${Math.round(gp / net * 100)}%</small></dd></div>
        ${P.costs.map(([k, v]) => `<div class="sub"><dt>${esc(k)} (${P.history.days}/30 ของเดือน)</dt><dd>−${money(v * P.history.days / 30)}</dd></div>`).join('')}<div class="t big"><dt>กำไรก่อนภาษีเงินได้</dt><dd class="${np < 0 ? 'neg' : ''}">${money(np)}</dd></div></dl></article>
      <article class="card"><header><h2>แยกช่องทาง</h2></header><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ช่องทาง</th><th>ออเดอร์</th><th>ยอดขาย</th><th>ค่าธรรมเนียม</th><th>กำไรขั้นต้น</th></tr></thead><tbody>${by.map(x => `<tr><td>${chPill(x.c.id)}</td><td>${num(x.n)}</td><td>${money(x.g)}</td><td>${x.f ? money(x.f) : '—'}</td><td>${money(x.gp)} <small>${x.g ? Math.round(x.gp / (x.g / 1.07) * 100) : 0}%</small></td></tr>`).join('')}</tbody></table></div>
        <button class="b-btn wide" type="button" data-csv>${icon('download')}ดาวน์โหลดออเดอร์ ${P.history.days} วัน (CSV)</button></article>
    </div>`;
};
function exportCsv() {
  const from = today0 - (P.history.days - 1) * DAY;
  const rows = allOrders().filter(o => o.at >= from).reverse();
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [['เลขที่', 'วันที่', 'เวลา', 'ช่องทาง', 'ลูกค้า', 'รายการ', 'ยอดรวม', 'สถานะ', 'ข้อมูลสมมติ'].map(q).join(','), ...rows.map(o => [o.no, new Date(o.at).toLocaleDateString('en-CA'), hhmm(o.at), CH[o.channel]?.label || o.channel, custName(o), itemsText(o), o.total, SL[o.st], 'ใช่'].map(q).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  a.download = `orders-${B.code}-${new Date().toLocaleDateString('en-CA')}.csv`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`ดาวน์โหลด ${rows.length} ออเดอร์แล้ว เปิดใน Excel หรือ Google Sheets ได้`);
}

/* ------------------------------------------------------------------ wire */
shell();
render();
const go = view => { state.view = view; state.more = 40; render(); $('#erp-view').focus?.(); scrollTo({top: 0}); };
on(app, 'click', '[data-view]', (el, e) => { e.preventDefault(); go(el.dataset.view); });
on(document.body, 'click', '.toast [data-view]', (el, e) => { e.preventDefault(); go(el.dataset.view); });
on(app, 'click', '[data-advance]', el => advance(el.dataset.advance));
on(app, 'click', '[data-open-order]', el => openOrder(el.dataset.openOrder));
on(app, 'click', '[data-range]', el => { state.range = el.dataset.range; render(); });
on(app, 'click', '[data-fstatus]', el => { state.fStatus = el.dataset.fstatus; render(); });
on(app, 'change', '[data-fchannel]', el => { state.fChannel = el.value; render(); });
on(app, 'input', '[data-q]', el => { state.q = el.value; const pos = el.selectionStart; render(); const n = $('[data-q]'); n.focus(); n.setSelectionRange(pos, pos); });
on(app, 'click', '[data-more]', () => { state.more += 60; render(); });
on(app, 'click', '[data-stocktab]', el => { state.stockTab = el.dataset.stocktab; render(); });
on(app, 'click', '[data-adjust]', el => openAdjust(el.dataset.adjust));
on(app, 'click', '[data-po-for]', el => { makePO([el.dataset.poFor]); });
on(app, 'click', '[data-po-auto]', () => { makePO(lowList().map(x => x.id)); });
on(app, 'click', '[data-po-send]', el => { shared.mutate(s => { s.po = s.po.map(p => p.id === el.dataset.poSend ? {...p, status: 'sent'} : p); }); toast('ส่งใบสั่งซื้อแล้ว (ในงานจริงส่งเป็น PDF ทางอีเมลหรือ LINE)'); });
on(app, 'click', '[data-po-receive]', el => { shared.mutate(s => { s.po = s.po.map(p => p.id === el.dataset.poReceive ? {...p, status: 'received'} : p); }); toast('รับของเข้าคลังแล้ว สต็อกเพิ่มขึ้น'); });
on(app, 'click', '[data-seg]', el => { state.seg = el.dataset.seg; render(); });
on(app, 'click', '[data-cust]', el => openCustomer(el.dataset.cust));
on(app, 'click', '[data-blast]', () => toast('ในงานจริง ข้อความไปถึงเฉพาะลูกค้าที่ยินยอม คนที่ไม่ยินยอมจะไม่ได้รับ'));
on(app, 'click', '[data-csv]', exportCsv);
on(app, 'click', '[data-poscat]', el => { state.posCat = el.dataset.poscat; render(); });
on(app, 'click', '[data-posmode]', el => { state.posMode = el.dataset.posmode; render(); });
on(app, 'change', '[data-postable]', el => { state.posTable = el.value; });
on(app, 'change', '[data-posmember]', el => { state.posMember = el.value; render(); });
on(app, 'click', '[data-tile]', el => { const it = ITEM[el.dataset.tile]; const l = state.ticket.find(x => x.id === it.id); if (l) l.qty++; else state.ticket.push({id: it.id, name: it.name, price: it.price, qty: 1}); render(); });
on(app, 'click', '[data-tl]', el => { const i = +el.dataset.tl, l = state.ticket[i]; l.qty += +el.dataset.d; if (l.qty <= 0) state.ticket.splice(i, 1); render(); });
on(app, 'click', '[data-pay]', el => payPos(el.dataset.pay));
on(app, 'click', '[data-ack]', el => { shared.mutate(s => { s.calls = s.calls.map(c => c.id === el.dataset.ack ? {...c, done: true} : c); }); });
on(app, 'click', '[data-confirm-booking]', el => { shared.patch('bookings', el.dataset.confirmBooking, {confirmed: true}); toast('ยืนยันการจองแล้ว ลูกค้าได้รับข้อความใน LINE (ในงานจริง)'); });
on(app, 'click', '[data-reset]', () => { if (confirm('ล้างออเดอร์ การจอง และการปรับสต็อกที่ลองทำในเบราว์เซอร์นี้?')) { shared.reset(); render(); toast('ล้างแล้ว กลับไปเป็นข้อมูลตั้งต้น'); } });

let known = new Set(S.orders.map(o => o.id));
shared.on((s, src) => {
  const added = s.orders.filter(o => !known.has(o.id));
  known = new Set(s.orders.map(o => o.id));
  for (const o of added) { state.fresh.add(o.id); setTimeout(() => { state.fresh.delete(o.id); }, 9000); }
  if (src === 'remote' && added.length) { const o = added[added.length - 1]; toast(`ออเดอร์ใหม่จาก${esc(CH[o.channel]?.label || '')}: <b>${esc(o.no || '')}</b> <a href="#orders" data-view="${F.kitchen && o.items.some(l => P.recipes?.[l.id]) ? 'kitchen' : 'orders'}">ดู</a>`, 5000); }
  if (src === 'remote' && s.bookings.length && s.bookings.some(b => !b.seen)) { shared.mutate(x => { x.bookings = x.bookings.map(b => ({...b, seen: true})); }); toast('มีการจองโต๊ะใหม่จาก LINE <a href="#bookings" data-view="bookings">ดู</a>', 5000); }
  if (document.activeElement?.matches?.('[data-q]')) return;
  render();
});
setInterval(() => { if (['kitchen', 'dash', 'orders'].includes(state.view) && !document.querySelector('dialog[open]')) render(); }, 30000);
if (param('order')) openOrder(param('order'));
document.documentElement.dataset.ready = 'erp';
