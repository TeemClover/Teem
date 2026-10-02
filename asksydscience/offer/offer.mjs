import { RATE, preset, normalize, quote, encodeState, decodeState, money, summaryText } from './rates.mjs';
const $ = id => document.getElementById(id);
const initial = decodeState(location.search);
let state = initial.state, toastTimer, announceTimer;
const refs = { plans: {}, modules: {}, extras: {}, care: {} };
function node(tag, cls = '', text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = String(text);
  return e;
}
function toast(text) {
  clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}
function notice(text) { $('link-notice').textContent = text; $('link-notice').hidden = !text; }
function row(label, value) {
  const e = node('div', 'quote-row'); e.append(node('span', '', label), node('span', '', value)); return e;
}
function buildPlans() {
  $('plan-cards').replaceChildren();
  RATE.plans.forEach(p => {
    const e = node('article', 'plan');
    const top = node('div', 'plan-top'); top.append(node('span', 'plan-letter', p.letter));
    if (p.id === 'b') top.append(node('span', 'plan-tag', 'เหมาะกับแผนเริ่มต้น'));
    const amount = node('p', 'plan-price', money(quote(preset(p.id)).oneTime)); amount.append(node('small', '', 'บาท'));
    const ul = node('ul'); p.bullets.forEach(x => ul.append(node('li', '', x)));
    const button = node('button', 'plan-select', 'เลือกชุด ' + p.letter); button.type = 'button'; button.dataset.plan = p.id;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { state.modules = [...p.modules]; render(); toast('เลือกชุด ' + p.letter + ' แล้ว · งานเพิ่มและแผนดูแลคงเดิม'); });
    e.append(top, node('h3', '', p.title), node('p', 'en', p.en), amount, node('p', 'one-off', 'ค่าทำครั้งเดียว · ก่อนภาษี'), node('p', 'plan-description', p.description), ul, button);
    refs.plans[p.id] = { e, button }; $('plan-cards').append(e);
  });
}
function buildModules() {
  RATE.modules.forEach(m => {
    const e = node('div', 'module'), label = node('label', 'module-label'), check = node('input');
    check.type = 'checkbox'; check.id = 'mod-' + m.id; check.value = m.id;
    const text = node('div', 'module-text'); text.append(node('strong', '', m.title), node('p', '', m.description));
    const price = node('span', 'module-price', '+ ' + money(m.price)); price.append(node('small', '', 'บาท / ครั้งเดียว'));
    label.append(check, text, price);
    const details = node('details'); details.append(node('summary', '', 'สิ่งที่ทำให้ / สิ่งที่ไม่รวม'), node('p', '', m.scope), node('small', '', m.limit));
    e.append(label, details); $('module-options').append(e); refs.modules[m.id] = { e, check };
    check.addEventListener('change', () => { state.modules = check.checked ? [...state.modules, m.id] : state.modules.filter(x => x !== m.id); render(); });
  });
}
function buildExtras() {
  RATE.extras.forEach(x => {
    const e = node('div', 'extra'), copy = node('div');
    const title = node('h4', '', x.title); title.id = 'extra-label-' + x.id;
    copy.append(title, node('p', '', x.scope), node('p', 'extra-price', money(x.price) + ' บาท / ' + x.unit));
    const step = node('div', 'stepper'), minus = node('button', '', '−'), input = node('input'), plus = node('button', '', '+');
    minus.type = plus.type = 'button'; minus.setAttribute('aria-label', 'ลด ' + x.title); plus.setAttribute('aria-label', 'เพิ่ม ' + x.title);
    input.id = 'extra-' + x.id; input.type = 'number'; input.inputMode = 'numeric'; input.min = '0'; input.max = String(x.max); input.step = '1'; input.value = '0'; input.setAttribute('aria-labelledby', title.id);
    minus.addEventListener('click', () => { state.extras[x.id] = Math.max(0, state.extras[x.id] - 1); render(); });
    plus.addEventListener('click', () => { state.extras[x.id] = Math.min(x.max, state.extras[x.id] + 1); render(); });
    input.addEventListener('change', () => { const raw = input.value; state.extras[x.id] = raw; const clean = normalize(state); if (String(clean.extras[x.id]) !== raw) toast('ปรับจำนวนให้อยู่ในขอบเขต 0–' + x.max + ' ' + x.unit); state = clean; render(); });
    step.append(minus, input, plus); e.append(copy, step); $('extra-options').append(e); refs.extras[x.id] = { input, minus, plus };
  });
}
function buildCare() {
  RATE.care.forEach(c => {
    const e = node('label', 'care-option'), input = node('input'); input.type = 'radio'; input.name = 'care'; input.id = 'care-' + c.id; input.value = c.id;
    const body = node('div'), title = node('div', 'care-title'), price = node('b', '', money(c.price)); price.append(node('small', '', ' บาท/เดือน'));
    title.append(node('strong', '', c.title), price); body.append(title);
    if (c.discountPercent) {
      const promo = node('p', 'care-promo');
      promo.append(node('span', 'care-badge', 'ราคาพิเศษ ลด ' + c.discountPercent + '% แล้ว'), node('span', '', 'ปกติ '), node('del', '', money(c.regularPrice) + ' บาท/เดือน'));
      body.append(promo);
    }
    body.append(node('p', '', c.scope)); e.append(input, body); $('care-options').append(e); refs.care[c.id] = { e, input };
    input.addEventListener('change', () => { if (input.checked) { state.care = c.id; render(); } });
  });
}
function render() {
  const q = quote(state); state = q.state;
  RATE.plans.forEach(p => { const selected = q.planId === p.id; const ref = refs.plans[p.id]; ref.e.classList.toggle('selected', selected); ref.button.setAttribute('aria-pressed', String(selected)); ref.button.textContent = selected ? '✓ เลือกชุด ' + p.letter + ' อยู่' : 'เลือกชุด ' + p.letter; });
  RATE.modules.forEach(m => { const selected = state.modules.includes(m.id); refs.modules[m.id].check.checked = selected; refs.modules[m.id].e.classList.toggle('chosen', selected); });
  RATE.extras.forEach(x => { const ref = refs.extras[x.id]; ref.input.value = String(state.extras[x.id]); ref.minus.disabled = state.extras[x.id] === 0; ref.plus.disabled = state.extras[x.id] === x.max; });
  RATE.care.forEach(c => { const selected = state.care === c.id; refs.care[c.id].input.checked = selected; refs.care[c.id].e.classList.toggle('chosen', selected); });
  $('months').value = String(state.months);
  const extraLabel = Object.values(state.extras).some(Boolean) ? ' + งานเพิ่ม' : '';
  $('selected-name').textContent = q.title + extraLabel;
  $('one-time').textContent = $('mobile-total').textContent = money(q.oneTime);
  $('monthly').textContent = money(q.monthly);
  $('monthly-promo').hidden = !q.monthly;
  $('monthly-regular').textContent = money(q.monthlyRegular) + ' บาท/เดือน';
  $('monthly-saving').textContent = 'ประหยัด ' + money(q.monthlySaving) + ' บาท/เดือน · คำนวณราคาพิเศษให้แล้ว ไม่ลดซ้ำ';
  $('care-note').textContent = q.monthly ? q.care.title + ' · เริ่มหลังส่งมอบ ไม่ผูกสัญญาตามจำนวนเดือนที่ทดลองคำนวณ' : 'ดูแลเอง · ไม่มีค่ารายเดือนบังคับ';
  $('quote-rows').replaceChildren(...q.rows.map(x => row(x.title + (x.quantity > 1 ? ' × ' + x.quantity : ''), money(x.total))));
  $('budget-label').textContent = 'งบค่าบริการช่วง ' + state.months + ' เดือน'; $('budget').textContent = money(q.budget);
  $('budget-formula').textContent = money(q.oneTime) + ' + (' + money(q.monthly) + ' × ' + state.months + ' เดือนหลังส่งมอบ)';
  q.installments.forEach((n, i) => { $('pay-' + (i + 1)).textContent = money(n); });
  $('days').textContent = String(q.days); $('rate-version').textContent = RATE.version;
  $('selected-scope').replaceChildren();
  const scopes = RATE.modules.filter(x => state.modules.includes(x.id)).map(x => ({ title: x.title, scope: x.scope, limit: x.limit }));
  RATE.extras.filter(x => state.extras[x.id]).forEach(x => scopes.push({ title: x.title + ' × ' + state.extras[x.id], scope: x.scope }));
  if (q.monthly) scopes.push({ title: 'แผนดูแล: ' + q.care.title, scope: q.care.scope, limit: 'ใช้เพดานชั่วโมงหรือจำนวนเนื้อหาที่ถึงก่อน ชั่วโมงไม่ทบเดือน ไม่รวมสร้างฟีเจอร์ใหม่' });
  if (!scopes.length) $('selected-scope').append(node('p', 'field-hint', 'เลือกเฉพาะบ้านออนไลน์พื้นฐาน ยังไม่ได้เพิ่มระบบ งานเสริม หรือค่าดูแลรายเดือน'));
  scopes.forEach(x => { const item = node('div', 'scope-item'), text = node('div'); text.append(node('p', '', x.scope)); if (x.limit) text.append(node('small', '', 'ขอบเขตเพิ่มเติม: ' + x.limit)); item.append(node('strong', '', x.title), text); $('selected-scope').append(item); });
  $('print-text').textContent = summaryText(state);
  clearTimeout(announceTimer); announceTimer = setTimeout(() => { $('announce').textContent = 'ค่าทำ ' + money(q.oneTime) + ' บาท ค่าดูแล ' + money(q.monthly) + ' บาทต่อเดือน'; }, 220);
}
async function copy(text, success) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); toast(success);
  } catch {
    $('copy-text').value = text;
    if (typeof $('copy-dialog').showModal === 'function') $('copy-dialog').showModal();
    else { $('copy-dialog').setAttribute('open', ''); $('copy-dialog').scrollIntoView(); }
    $('copy-text').focus(); $('copy-text').select();
  }
}
function shareUrl() {
  const u = new URL(location.href); u.pathname = u.hostname === 'asksydscience.myclover.com' ? '/offer/' : '/asksydscience/offer/'; u.search = encodeState(state); u.hash = 'configure'; return u.href;
}
function downloadSummary() {
  const content = '\ufeff' + summaryText(state), blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob), a = node('a'); a.href = href; a.download = 'AskSydScience-offer-' + RATE.version + '.txt';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 10000);
  toast('เตรียมไฟล์สรุปแล้ว ตรวจไฟล์ดาวน์โหลดของเบราว์เซอร์');
}
$('months').addEventListener('change', e => { state.months = Number(e.target.value); render(); });
$('copy-summary').addEventListener('click', () => copy(summaryText(state), 'คัดลอกสรุปแล้ว นำไปส่งในแชตที่คุยกับพี่ทีมได้เลย'));
$('share-link').addEventListener('click', () => copy(shareUrl(), 'คัดลอกลิงก์รายการที่เลือกแล้ว'));
$('print').addEventListener('click', () => { $('print-text').textContent = summaryText(state); window.print(); });
window.addEventListener('beforeprint', () => { $('print-text').textContent = summaryText(state); });
$('download').addEventListener('click', downloadSummary);
$('reset').addEventListener('click', () => { state = preset(); notice(''); try { history.replaceState(null, '', location.pathname + '#configure'); } catch { /* Sandboxed preview: resetting the UI still works. */ } render(); toast('กลับเป็นชุด B · ล้างงานเพิ่มและแผนดูแลแล้ว'); });
$('select-copy').addEventListener('click', () => { $('copy-text').focus(); $('copy-text').select(); });
window.addEventListener('popstate', () => { const r = decodeState(location.search); state = r.state; notice(r.notice); render(); });
const image = document.querySelector('.house-visual img');
if (image) { const hide = () => { image.style.display = 'none'; }; image.addEventListener('error', hide); if (image.complete && !image.naturalWidth) hide(); }
buildPlans(); buildModules(); buildExtras(); buildCare();
$('base-scope').replaceChildren(...RATE.base.scope.map(s => node('li', '', s)));
$('base-price').replaceChildren(document.createTextNode(money(RATE.base.price) + ' '), node('small', '', 'บาท'));
notice(initial.notice); render();
