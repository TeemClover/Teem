/**
 * LINE OA + AI engine: /showcase/line-restaurant/, /showcase/line-brand/ (?ask=track|book|menu).
 * A chat that looks like an official account: consent first, rich menu, product/menu cards, ordering
 * and table booking that land in the business's ERP through the bus, and free-text questions routed to
 * answers built from the business's own data (the "sauce"). Guard rules hand medical questions and
 * complaints to a person instead of answering. The answers are scripted; the admin panel shows what
 * the system understood, where the answer came from and what it did next.
 */
import {data, esc, money, $, $$, on, pic, icon, bus, orderNo, toast, sleep, param, hhmm, reduced} from './kit.js';

const D = data();
const P = D.pack, B = D.biz, L = D.links;
const app = document.getElementById('app');
const shared = bus(D.demo.biz);
const ITEM = Object.fromEntries(P.catalog.map(i => [i.id, i]));
const isFood = D.demo.biz === 'restaurant';
const conv = {consent: null, cart: [], handoff: false, flow: null, log: [], stats: {msgs: 0, ai: 0, human: 0, made: 0}, tags: new Set(), tab: 'insight', seg: 0};

/* -------------------------------------------------------------- layout */
app.innerHTML = `<div class="ch-stage">
  <div class="ch-phone" aria-label="แชต LINE OA จำลองของ ${esc(P.oa.name)}" role="region">
    <header class="ch-head"><span class="ch-back" aria-hidden="true">${icon('back')}</span><span class="ch-oa">${esc(P.oa.mark)}</span><div><b>${esc(P.oa.name)}</b><small>${esc(P.oa.sub)}</small></div><span class="ch-badge">ตัวอย่าง</span></header>
    <div class="ch-log" id="ch-log" role="log" aria-live="polite" aria-label="ข้อความ"></div>
    <div class="ch-quick" id="ch-quick" role="group" aria-label="ตอบด่วน"></div>
    <form class="ch-input" id="ch-form" autocomplete="off"><button type="button" class="ch-mbtn" data-rich aria-expanded="true" aria-controls="ch-rich" aria-label="เมนู">${icon('menu')}</button><input id="ch-text" type="text" placeholder="พิมพ์ข้อความ" aria-label="พิมพ์ข้อความถึง ${esc(P.oa.name)}" maxlength="200"><button type="submit" class="ch-send" aria-label="ส่ง">${icon('send')}</button></form>
    <nav class="ch-rich" id="ch-rich" aria-label="ริชเมนู">${P.rich.map(r => `<button type="button" data-act="${r.id}">${icon(r.icon)}<span>${esc(r.label)}</span></button>`).join('')}</nav>
  </div>
  <aside class="ch-admin" aria-label="ฝั่งแอดมิน">
    <header><p class="ch-kick">ฝั่งร้านเห็นอะไร</p><div class="ch-tabs" role="tablist"><button type="button" role="tab" data-tab="insight" aria-selected="true">บทสนทนานี้</button><button type="button" role="tab" data-tab="broadcast" aria-selected="false">ส่งข้อความหาลูกค้า</button></div></header>
    <div id="ch-panel"></div>
  </aside>
</div>`;
const log = $('#ch-log'), quick = $('#ch-quick'), input = $('#ch-text');

/* ------------------------------------------------------------- bubbles */
const scroll = () => log.scrollTo({top: log.scrollHeight, behavior: reduced() ? 'auto' : 'smooth'});
function add(html, who = 'bot') {
  const el = document.createElement('div');
  el.className = `ch-msg ${who}`;
  el.innerHTML = who === 'bot' ? `<span class="ch-ava" aria-hidden="true">${esc(P.oa.mark)}</span><div class="ch-body">${html}<time>${hhmm(Date.now())}</time></div>` : who === 'admin' ? `<span class="ch-ava admin" aria-hidden="true">${icon('person')}</span><div class="ch-body"><small class="ch-who">แอดมิน</small>${html}<time>${hhmm(Date.now())}</time></div>` : who === 'note' ? html : `<div class="ch-body">${html}<time>${hhmm(Date.now())}</time></div>`;
  log.append(el); scroll();
  return el;
}
const text = s => `<p class="ch-bubble">${esc(s).replace(/\n/g, '<br>')}</p>`;
async function bot(parts, quickReplies = []) {
  setQuick([]);
  const typing = add('<p class="ch-bubble ch-typing"><i></i><i></i><i></i></p>');
  typing.setAttribute('aria-hidden', 'true');
  await sleep(450 + Math.min(700, (Array.isArray(parts) ? parts.join('').length : parts.length) * 3));
  typing.remove();
  for (const p of [].concat(parts)) add(p.startsWith('<') ? p : text(p));
  setQuick(quickReplies);
}
function setQuick(list) { quick.innerHTML = list.map(([label, act]) => `<button type="button" class="ch-q" data-act="${esc(act)}">${esc(label)}</button>`).join(''); }
const note = s => add(`<p class="ch-note">${esc(s)}</p>`, 'note');

const card = (it, actions) => `<article class="ch-card"><div class="ch-card-pic">${pic(it)}</div><div class="ch-card-body"><b>${esc(it.name)}</b>${it.short || it.desc ? `<small>${esc(it.short || it.desc)}</small>` : ''}<span class="price">${money(it.price)}</span></div><div class="ch-card-act">${actions.map(([l, a], i) => `<button type="button" class="${i ? 'sec' : ''}" data-act="${esc(a)}">${esc(l)}</button>`).join('')}</div></article>`;
const carousel = ids => `<div class="ch-cards" tabindex="0" aria-label="การ์ดสินค้า เลื่อนดูด้านข้าง">${ids.map(id => ITEM[id]).filter(Boolean).map(it => card(it, isFood ? [['สั่งกลับบ้าน', `add:${it.id}`]] : [['ใส่ตะกร้า', `add:${it.id}`], ['ถามเรื่องนี้', `ask:${it.id}`]])).join('')}</div>`;

/* --------------------------------------------------------- admin panel */
function event(e) { conv.log.unshift({at: Date.now(), ...e}); (e.tags || []).forEach(t => conv.tags.add(t)); paintAdmin(); }
function paintAdmin() {
  $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === conv.tab)));
  const panel = $('#ch-panel');
  if (conv.tab === 'broadcast') {
    const [label, count] = P.admin.segments[conv.seg];
    panel.innerHTML = `<div class="ch-bc">
      <p class="ch-muted">ส่งได้เฉพาะคนที่ยินยอมรับข่าวสาร คนที่ไม่ยินยอมระบบไม่ส่งให้ (ตัวเลขสมมติ)</p>
      <div class="ch-segs" role="radiogroup" aria-label="กลุ่มลูกค้า">${P.admin.segments.map(([l, c], i) => `<button type="button" role="radio" aria-checked="${i === conv.seg}" data-seg="${i}"><b>${esc(l)}</b><span>${c.toLocaleString('th-TH')} คน</span></button>`).join('')}</div>
      <p class="ch-kick">ตัวอย่างข้อความ</p>
      <div class="ch-preview">${card({...P.promo, name: P.promo.title, short: P.promo.body, price: 0, id: 'promo', art: P.promo.art}, [['ดูรายละเอียด', 'promo']]).replace(/<span class="price">[^<]*<\/span>/, '')}</div>
      <button class="b-btn wide" type="button" data-blast>ส่งถึง ${esc(label)} ${count.toLocaleString('th-TH')} คน (สาธิต)</button>
    </div>`;
    return;
  }
  const s = conv.stats;
  panel.innerHTML = `<div class="ch-stats"><div><b>${s.msgs}</b><small>ข้อความลูกค้า</small></div><div><b>${s.ai}</b><small>AI ตอบเอง</small></div><div><b>${s.human}</b><small>ส่งต่อคน</small></div><div><b>${s.made}</b><small>${isFood ? 'ออเดอร์/จอง' : 'ออเดอร์'}</small></div></div>
    <div class="ch-profile"><span class="ch-pava">${icon('person')}</span><div><b>ลูกค้า (สาธิต)</b><small>ความยินยอมรับข่าวสาร: ${conv.consent === null ? 'ยังไม่ตอบ' : conv.consent ? 'ยินยอม' : 'ไม่ยินยอม'}</small></div><span class="pill ${conv.consent ? 'ok' : 'mute'}">${conv.consent ? 'ส่งโปรได้' : 'ห้ามส่งโปร'}</span></div>
    ${conv.tags.size ? `<p class="ch-tags">${[...conv.tags].map(t => `<span class="pill ${/ร้องเรียน|ด่วน|รักษา|ตั้งครรภ์|แพ้/.test(t) ? 'warn' : 'info'}">${esc(t)}</span>`).join('')}</p>` : ''}
    ${conv.handoff ? `<div class="ch-hand"><p><b>รอคนตอบ</b> AI หยุดตอบในห้องนี้แล้ว</p><div><button class="b-btn sm" type="button" data-admin-reply>ตอบในฐานะแอดมิน</button><button class="b-btn sm ghost" type="button" data-admin-release>คืนให้ AI ตอบ</button></div></div>` : ''}
    <ol class="ch-events">${conv.log.map(e => `<li class="${e.kind || ''}"><p class="ch-q-text">${e.user ? `“${esc(e.user)}”` : esc(e.title || '')}</p>${e.intent ? `<p><span>เข้าใจว่า</span> <b>${esc(e.intent)}</b>${e.conf ? ` <em class="conf ${e.conf === 'สูง' ? 'hi' : e.conf === 'ต่ำ' ? 'lo' : ''}">มั่นใจ${esc(e.conf)}</em>` : ''}</p>` : ''}${e.source ? `<p><span>ตอบจาก</span> ${esc(e.source)}</p>` : ''}${e.action ? `<p><span>ทำต่อ</span> ${esc(e.action)}</p>` : ''}</li>`).join('') || '<li class="ch-muted">ลองกดริชเมนูหรือพิมพ์ถามในแชต แล้วดูว่าระบบเข้าใจอะไร</li>'}</ol>`;
}

/* -------------------------------------------------------------- actions */
const statusOf = o => shared.get().marks?.[o.id] || o.status;
const days = Array.from({length: 7}, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
const dayLabel = i => i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : days[i].toLocaleDateString('th-TH', {weekday: 'short', day: 'numeric', month: 'short'});

const ACTIONS = {
  async menu() { await bot([isFood ? 'เมนูแนะนำของร้านค่ะ เลื่อนดูด้านข้างได้' : 'สินค้าแนะนำค่ะ เลื่อนดูด้านข้างได้', carousel(P.carousel)], isFood ? [['จองโต๊ะ', 'book'], ['แพ้ถั่ว กินอะไรได้', 'say:แพ้ถั่ว กินอะไรได้บ้าง']] : [['วิธีใช้', 'howto'], ['เช็กออเดอร์', 'track']]); },
  async order() { await bot([isFood ? 'เลือกเมนูสั่งกลับบ้านได้เลยค่ะ' : 'เลือกสินค้าที่ต้องการได้เลยค่ะ', carousel(P.orderFrom)]); },
  async add(id) {
    const it = ITEM[id]; const l = conv.cart.find(x => x.id === id);
    if (l) l.qty++; else conv.cart.push({id, name: it.name, price: it.price, qty: 1});
    const total = conv.cart.reduce((s, x) => s + x.price * x.qty, 0);
    event({title: `เพิ่ม ${it.name} ลงตะกร้า`, intent: 'สั่งซื้อ', action: `ตะกร้า ${conv.cart.length} รายการ · ${money(total)}`});
    await bot(`ใส่ ${it.name} แล้วค่ะ ตะกร้ามี ${conv.cart.reduce((s, x) => s + x.qty, 0)} ชิ้น รวม ${money(total)}`, [['สั่งเลย', 'checkout'], ['เพิ่มอีก', 'order'], ['ล้างตะกร้า', 'clear']]);
  },
  async clear() { conv.cart = []; await bot('ล้างตะกร้าแล้วค่ะ', [['ดูเมนู', 'menu']]); },
  async checkout() {
    if (!conv.cart.length) return bot('ตะกร้ายังว่างค่ะ', [['ดูเมนู', 'order']]);
    const total = conv.cart.reduce((s, x) => s + x.price * x.qty, 0);
    await bot([`<div class="ch-confirm"><b>สรุปออเดอร์</b><ul>${conv.cart.map(x => `<li><span>${esc(x.name)} × ${x.qty}</span><span>${money(x.price * x.qty)}</span></li>`).join('')}</ul><p><span>รวม</span><b>${money(total)}</b></p></div>`, isFood ? 'จะมารับตอนไหนดีคะ' : 'เลือกวิธีส่งได้เลยค่ะ (ที่อยู่ใช้ข้อมูลตัวอย่าง)'], P.pickup.map(p => [p, `place:${p}`]));
  },
  async place(how) {
    const items = conv.cart.map(x => ({id: x.id, name: x.name, qty: x.qty, price: x.price}));
    const total = items.reduce((s, x) => s + x.price * x.qty, 0);
    const rec = shared.add('orders', {channel: 'line', status: 'new', demo: D.demo.slug, items, total, subtotal: total, customer: 'ลูกค้า LINE (สาธิต)', shipBy: how});
    const no = orderNo(B.code, rec.n, rec.at, 'line');
    shared.patch('orders', rec.id, {no});
    conv.cart = []; conv.stats.made++;
    event({title: `สร้างออเดอร์ ${no}`, intent: 'สั่งซื้อ', source: 'ระบบสั่งซื้อ', action: `ส่งเข้าหลังบ้าน · ${how}`, kind: 'made', tags: ['สั่งผ่าน LINE']});
    await bot([`รับออเดอร์ ${no} แล้วค่ะ ยอด ${money(total)} · ${how}`, `<p class="ch-bubble">ออเดอร์นี้เข้าหลังบ้านแล้ว <a href="${esc(L.erp)}?order=${encodeURIComponent(rec.id)}" target="_blank" rel="noopener">เปิดดูในหลังบ้าน ↗</a> ลองเปลี่ยนสถานะที่นั่น แล้วกลับมากด “เช็กออเดอร์”</p>`], [['เช็กออเดอร์', 'track']]);
  },
  async track() {
    const mine = shared.get().orders.filter(o => o.channel === 'line' || o.channel === 'web').slice(-3).reverse();
    event({title: 'เช็กสถานะออเดอร์', intent: 'เช็กออเดอร์', source: 'หลังบ้าน › ออเดอร์', action: mine.length ? `พบ ${mine.length} ออเดอร์` : 'ไม่พบออเดอร์'});
    if (!mine.length) return bot([`ยังไม่พบออเดอร์จากเบราว์เซอร์นี้ค่ะ ลองสั่งในแชตนี้ หรือ<a href="${esc(L.stores[0]?.href || '/showcase/')}" target="_blank" rel="noopener">สั่งจากหน้าร้าน ↗</a> ก่อนนะคะ`].map(s => s.startsWith('ยัง') ? `<p class="ch-bubble">${s}</p>` : s), [[isFood ? 'สั่งกลับบ้าน' : 'ดูสินค้า', isFood ? 'order' : 'menu']]);
    await bot([`<div class="ch-confirm"><b>ออเดอร์ล่าสุด</b><ul>${mine.map(o => `<li><span>${esc(o.no || '')}<small>${esc(o.items.map(i => i.name).join(', '))}</small></span><span class="pill ${statusOf(o) === 'new' ? 'info' : statusOf(o) === 'cancel' ? 'bad' : 'ok'}">${esc(P.statusLabels[statusOf(o)] || statusOf(o))}</span></li>`).join('')}</ul></div>`, 'สถานะนี้ดึงจากหลังบ้านจริงของร้านค่ะ'], [['เช็กอีกครั้ง', 'track']]);
  },
  async book() {
    if (!P.booking) return ACTIONS.human();
    conv.flow = {kind: 'book'};
    await bot('จองโต๊ะวันไหนดีคะ', days.map((_, i) => [dayLabel(i), `bday:${i}`]));
  },
  async bday(i) {
    conv.flow = {kind: 'book', day: +i};
    const full = P.booking.full.filter(([d]) => d === +i).map(([, t]) => t);
    const now = new Date(), open = P.booking.times.filter(t => !full.includes(t) && (+i > 0 || +t.slice(0, 2) * 60 + +t.slice(3) > now.getHours() * 60 + now.getMinutes() + 30));
    if (!open.length) return bot(`${dayLabel(+i)} ไม่มีเวลาว่างแล้วค่ะ ลองวันอื่นนะคะ`, days.slice(1).map((_, k) => [dayLabel(k + 1), `bday:${k + 1}`]));
    await bot(`${dayLabel(+i)} ว่างเวลาเหล่านี้ค่ะ${full.length ? ` (เต็มแล้ว: ${full.join(', ')})` : ''}`, open.map(t => [t, `btime:${t}`]));
  },
  async btime(t) { conv.flow.time = t; await bot('กี่ท่านคะ', P.booking.sizes.map(s => [s, `bsize:${s}`])); },
  async bsize(size) {
    const f = conv.flow; f.size = size;
    const big = size === P.booking.sizes[P.booking.sizes.length - 1];
    const rec = shared.add('bookings', {date: days[f.day].getTime(), time: f.time, size, name: 'ลูกค้า LINE (สาธิต)', note: big ? 'กลุ่มใหญ่ ต้องยืนยันที่นั่ง' : '', big});
    conv.flow = null; conv.stats.made++;
    event({title: `จองโต๊ะ ${dayLabel(f.day)} ${f.time} · ${size}`, intent: 'จองโต๊ะ', source: 'ระบบจองโต๊ะ', action: big ? 'บันทึกการจอง + ส่งต่อพนักงานยืนยัน' : 'บันทึกการจองเข้าหลังบ้าน', kind: 'made', tags: big ? ['จองกลุ่มใหญ่'] : ['จองโต๊ะ']});
    if (big) { conv.handoff = true; conv.stats.human++; paintAdmin(); }
    await bot([`<div class="ch-confirm"><b>${big ? 'ส่งคำขอจองแล้ว' : 'จองแล้วค่ะ'}</b><ul><li><span>วัน</span><span>${esc(dayLabel(f.day))}</span></li><li><span>เวลา</span><span>${esc(f.time)}</span></li><li><span>จำนวน</span><span>${esc(size)}</span></li><li><span>รหัส</span><span>BK-${String(rec.n).padStart(3, '0')}</span></li></ul></div>`, big ? P.booking.big : `เปิดดูการจองในหลังบ้านได้ที่ <a href="${esc(L.erp)}?view=bookings" target="_blank" rel="noopener">หน้าการจอง ↗</a>`].map(s => s.startsWith('<') ? s : s.includes('<a') ? `<p class="ch-bubble">${s}</p>` : s), [['ดูเมนู', 'menu']]);
  },
  async promo() { event({title: 'ขอดูโปร', intent: 'โปรโมชัน', source: P.intents.find(i => i.id === 'promo')?.source, action: 'ส่งการ์ดโปร'}); await bot([`<article class="ch-card wide"><div class="ch-card-pic">${pic({id: 'promo', art: P.promo.art})}</div><div class="ch-card-body"><b>${esc(P.promo.title)}</b><small>${esc(P.promo.body)}</small></div></article>`], [[isFood ? 'ดูเมนู' : 'ดูสินค้า', 'menu']]); },
  async info() { event({title: 'ขอข้อมูลร้าน', intent: 'ข้อมูลร้าน', source: 'ซอสร้าน › ข้อมูลทั่วไป', action: 'ตอบเอง'}); conv.stats.ai++; await bot([P.info, 'ในงานจริงแนบลิงก์แผนที่ของร้านให้กดเปิดได้ค่ะ'], isFood ? [['จองโต๊ะ', 'book']] : [['ดูสินค้า', 'menu']]); },
  async howto() { event({title: 'ขอวิธีใช้', intent: 'วิธีใช้', source: 'ซอสแบรนด์ › ขั้นตอนดูแลผิว', action: 'ตอบเอง'}); conv.stats.ai++; await bot(P.howto, [['ดูสินค้า', 'menu'], ['ผิวแพ้ง่ายใช้ได้ไหม', 'say:ผิวแพ้ง่ายใช้ได้ไหม']]); },
  async ask(id) {
    if (!id) return bot('พิมพ์คำถามได้เลยค่ะ เรื่องสุขภาพหรือการรักษา AI จะส่งต่อแอดมินให้', (P.suggest || []).map(s => [s, `say:${s}`]));
    return answerProduct(id, `ถามเรื่อง ${ITEM[id].name}`);
  },
  async human() {
    conv.handoff = true; conv.stats.human++;
    event({title: 'ขอคุยกับคน', intent: 'ขอคุยกับคน', action: 'ส่งต่อแอดมิน · AI หยุดตอบ', kind: 'hand'});
    note('ส่งต่อแอดมินแล้ว AI จะหยุดตอบในห้องนี้จนกว่าแอดมินคืนให้');
    await bot('รอสักครู่นะคะ แอดมินจะเข้ามาตอบในแชตนี้ค่ะ');
  },
  async say(s) { return userSays(s); },
  async consent(v) {
    conv.consent = v === 'yes';
    event({title: conv.consent ? 'ลูกค้ายินยอมรับข่าวสาร' : 'ลูกค้าไม่ยินยอมรับข่าวสาร', action: 'บันทึกวันเวลาที่ยินยอม (PDPA)', tags: [conv.consent ? 'ยินยอมรับข่าวสาร' : 'ไม่รับข่าวสาร']});
    await bot(conv.consent ? P.consent.thanksYes : P.consent.thanksNo, (P.suggest || []).map(s => [s, `say:${s}`]));
  },
};

/* ------------------------------------------------------- understanding */
const ALLERGY = [['ถั่ว', ['ถั่วลิสง'], 'ถั่ว'], ['อาหารทะเล', ['กุ้ง', 'หอย', 'ปลา'], 'อาหารทะเล'], ['กุ้ง', ['กุ้ง'], 'กุ้ง'], ['นม', ['นม'], 'นม'], ['ไข่', ['ไข่'], 'ไข่'], ['กลูเตน', ['กลูเตน'], 'กลูเตน'], ['แป้ง', ['กลูเตน'], 'กลูเตน']];
function answerAllergy(t) {
  const hit = ALLERGY.find(([k]) => t.includes(k));
  if (!hit) return 'ร้านแจ้งสารก่อภูมิแพ้ไว้ทุกเมนูค่ะ แพ้อะไรบอกได้เลย เช่น ถั่ว กุ้ง นม ไข่';
  const [, list, word] = hit;
  const items = P.catalog.filter(i => i.allergens);
  const safe = items.filter(i => !i.allergens.some(a => list.includes(a))).map(i => i.name);
  const has = items.filter(i => i.allergens.some(a => list.includes(a))).map(i => i.name);
  return `เมนูที่ไม่มี${word}: ${safe.slice(0, 8).join(', ')}${safe.length > 8 ? ' และอื่น ๆ' : ''}\nเมนูที่มี${word}: ${has.join(', ') || 'ไม่มี'}\nครัวใช้อุปกรณ์ร่วมกัน อาจมีการปนเปื้อนข้าม ถ้าแพ้รุนแรงแจ้งพนักงานก่อนสั่งนะคะ`;
}
const answerVegan = () => `เมนูมังสวิรัติของร้าน: ${P.catalog.filter(i => i.tags?.includes('vegan')).map(i => i.name).join(', ')}\nแจ้ง “ไม่ใส่น้ำปลา” ในหมายเหตุตอนสั่งได้ค่ะ`;
async function answerProduct(id, userText) {
  const it = ITEM[id], d = Object.fromEntries((it.details || []).map(([k, v]) => [k, typeof v === 'object' ? 'ดูบนฉลากของสินค้า' : v]));
  const lines = [it.name, ...['วิธีใช้', 'ขนาดรับประทาน', 'ส่วนประกอบสำคัญ', 'ต่อ 1 เม็ด', 'ต่อ 1 ซอง', 'ต่อ 1 แคปซูล', 'คำเตือน'].filter(k => d[k]).map(k => `${k}: ${d[k]}`)];
  const supp = !!d['ขนาดรับประทาน'];
  conv.stats.ai++;
  event({user: userText, intent: `ถามเรื่องสินค้า: ${it.name}`, conf: 'สูง', source: 'ข้อมูลสินค้าตามฉลาก', action: 'ตอบเอง'});
  await bot([lines.join('\n'), ...(supp ? ['ผลิตภัณฑ์เสริมอาหารไม่มีผลในการป้องกันหรือรักษาโรค ควรกินอาหารหลากหลาย ครบ 5 หมู่ ในสัดส่วนที่เหมาะสมเป็นประจำ'] : [])], [['ใส่ตะกร้า', `add:${id}`], ['ดูสินค้าอื่น', 'menu']]);
}

async function userSays(raw) {
  const s = raw.trim();
  if (!s) return;
  add(text(s), 'me'); conv.stats.msgs++;
  try {
    if (conv.handoff) { event({user: s, intent: 'รอคนตอบ', action: 'ไม่ตอบอัตโนมัติ · แจ้งแอดมิน', kind: 'hand'}); note('ข้อความถึงแอดมินแล้ว'); return; }
    const t = s.toLowerCase();
    const hits = it => it.keys.filter(k => t.includes(k.toLowerCase()));
    const guard = P.intents.find(it => it.guard && hits(it).length);
    if (guard) {
      conv.handoff = true; conv.stats.human++;
      event({user: s, intent: guard.label, conf: 'สูง', source: guard.source, action: 'ตอบตามกติกา + ส่งต่อคน · AI หยุดตอบ', kind: 'hand', tags: guard.tags});
      await bot(guard.reply);
      note('ส่งต่อแอดมินแล้ว');
      return;
    }
    const alias = P.aliases && Object.entries(P.aliases).find(([, ks]) => ks.some(k => t.includes(k)));
    let best = null;
    for (const it of P.intents) { const h = hits(it); if (h.length && (!best || h.join('').length > best.h.join('').length)) best = {it, h}; }
    if (alias && (!best || ['menu', 'howto', 'serving', 'product'].includes(best.it.id))) { await answerProduct(alias[0], s); return; }
    if (!best) {
      conv.handoff = true; conv.stats.human++;
      event({user: s, intent: 'ไม่แน่ใจ', conf: 'ต่ำ', action: 'ไม่เดา · ส่งต่อคน', kind: 'hand'});
      await bot(P.fallback); note('ส่งต่อแอดมินแล้ว'); return;
    }
    const {it, h} = best;
    const conf = h.join('').length >= 4 || h.length > 1 ? 'สูง' : 'กลาง';
    if (it.action) { event({user: s, intent: it.label, conf, source: it.source, action: 'เปิดขั้นตอนอัตโนมัติ'}); conv.stats.ai++; await ACTIONS[it.action](); return; }
    const reply = it.compute === 'allergy' ? answerAllergy(t) : it.compute === 'vegan' ? answerVegan() : it.reply;
    conv.stats.ai++;
    event({user: s, intent: it.label, conf, source: it.source, action: 'ตอบเอง', tags: it.tags});
    await bot(it.link ? [reply, `<p class="ch-bubble"><a href="${esc(it.link[0])}" target="_blank" rel="noopener">${esc(it.link[1])} ↗</a></p>`] : reply, isFood ? [['ดูเมนู', 'menu'], ['คุยกับพนักงาน', 'human']] : [['ดูสินค้า', 'menu'], ['คุยกับแอดมิน', 'human']]);
  } finally { paintAdmin(); }
}

async function run(act, echo = '') {
  const [name, ...rest] = act.split(':'); const arg = rest.join(':');
  if (!ACTIONS[name]) return;
  if (name === 'say') return userSays(arg);
  if (name === 'consent') echo = arg === 'yes' ? P.consent.yes : P.consent.no;
  if (name === 'add') echo = `ขอ ${ITEM[arg].name}`;
  if (name === 'ask' && arg) echo = `ถามเรื่อง ${ITEM[arg].name}`;
  try {
    const label = echo || (!arg && P.rich.find(r => r.id === name)?.label);
    if (label) { add(text(label), 'me'); conv.stats.msgs++; }
    if (conv.handoff && !['consent'].includes(name) && name !== 'human') { note('แอดมินกำลังดูแลห้องนี้ ระบบอัตโนมัติจะกลับมาเมื่อแอดมินคืนให้'); return; }
    await ACTIONS[name](arg);
  } finally { paintAdmin(); }
}

// taps and messages wait their turn while the bot is still typing, instead of being dropped
let chain = Promise.resolve();
const enqueue = fn => (chain = chain.then(fn).catch(e => { console.error(e); }));

/* ---------------------------------------------------------------- wire */
on(app, 'click', '[data-act]', el => { const act = el.dataset.act, echo = el.matches('.ch-q, .ch-card-act button') ? el.textContent.trim() : ''; if (el.matches('.ch-q')) setQuick([]); enqueue(() => run(act, echo)); });
$('#ch-form').addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; enqueue(() => userSays(v)); });
on(app, 'click', '[data-rich]', el => { const open = el.getAttribute('aria-expanded') !== 'true'; el.setAttribute('aria-expanded', String(open)); $('#ch-rich').hidden = !open; });
on(app, 'click', '[data-tab]', el => { conv.tab = el.dataset.tab; paintAdmin(); });
on(app, 'click', '[data-seg]', el => { conv.seg = +el.dataset.seg; paintAdmin(); });
on(app, 'click', '[data-blast]', () => toast(`ในงานจริง ข้อความไปถึงเฉพาะ “${esc(P.admin.segments[conv.seg][0])}” ที่ยินยอมแล้ว และบันทึกว่าใครได้รับเมื่อไร`));
on(app, 'click', '[data-admin-reply]', () => { add(text(P.admin.reply), 'admin'); event({title: 'แอดมินตอบลูกค้า', action: 'คนตอบเอง'}); });
on(app, 'click', '[data-admin-release]', () => { conv.handoff = false; note('แอดมินคืนห้องนี้ให้ AI ตอบแล้ว'); event({title: 'คืนให้ AI ตอบ', action: 'AI ตอบต่อ'}); });

paintAdmin();
enqueue(async () => {
  for (const g of P.greeting) await bot(g);
  await bot(P.consent.ask, [[P.consent.yes, 'consent:yes'], [P.consent.no, 'consent:no']]);
  document.documentElement.dataset.ready = 'chat';
});
const ask = param('ask');
if (ask && ['track', 'book', 'menu', 'order'].includes(ask)) enqueue(() => run(ask));
