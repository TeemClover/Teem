/* /welcome · scroll film
   - ฟิล์มวาดบนแคนวาสเดียว ตามตำแหน่งการเลื่อน ฉากละ 1 ช่วง: ภาพหลัก A → B
   - ตอนนี้ใช้ภาพนิ่ง (เลื่อน = ซูมช้า ๆ แล้วละลายเข้าภาพถัดไป) · พอมีคลิป Seedance แล้ว ใส่ frames ในฉาก
     แล้ววางเฟรม webp ที่ /welcome/film/<scene>/001.webp … ระบบจะเล่นเฟรมจริงแทนเอง
   - การ์ดคำถามสร้างจาก questions.js ตัวเดียวกับที่ API ใช้ตรวจ */
import { QUESTIONS } from './questions.js?v=20261126f';

const KEYS = ['k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8'];
// จุดที่ต้องไม่โดนครอปเมื่อจอแคบกว่า 2:3 (0 = ซ้ายสุด, 1 = ขวาสุด)
const FOCUS = [.5, .45, .45, .5, .45, .4, .5, .5, .58];
// a/b = ภาพหลักต้น/ท้ายฉาก · frames = จำนวนเฟรมของคลิปจริง (0 = ยังใช้ภาพนิ่ง)
const SCENES = [
  { id: 'hook', a: 0, b: 1, frames: 96 },
  { id: 'tom', a: 1, b: 2, frames: 80 },
  { id: 'pain', a: 2, b: 3, frames: 80 },
  { id: 'why', a: 3, b: 4, frames: 80 },
  { id: 'product', a: 4, b: 5, frames: 80 },
  { id: 'story', a: 5, b: 6, frames: 80 },
  { id: 'ai', a: 6, b: 7, frames: 80 },
  { id: 'start', a: 7, b: 8, frames: 80 }
];
const API = '/api/welcome';
const root = document.documentElement;
root.classList.add('js');

/* ---------- ตัวตนผู้เข้าชม (สุ่ม ไม่ผูกกับใคร) + รหัสคนชวน ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* โหมดส่วนตัว */ } }
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === 'x' ? r : (r & 3) | 8).toString(16);
}));
let visitor = store.get('welcome.visitor');
if (!/^[0-9a-f-]{36}$/i.test(visitor || '')) { visitor = uuid(); store.set('welcome.visitor', visitor); }
const cleanRef = v => String(v || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
let ref = cleanRef(new URLSearchParams(location.search).get('ref'));
if (ref) store.set('welcome.ref', ref); else ref = cleanRef(store.get('welcome.ref'));
const device = matchMedia('(min-width:900px)').matches ? 'desktop' : matchMedia('(min-width:600px)').matches ? 'tablet' : 'mobile';
let answers = {};
try { answers = JSON.parse(store.get('welcome.answers') || '{}') || {}; } catch { answers = {}; }

function post(body) {
  return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor, ref, device, ...body }), keepalive: true });
}

/* ---------- โหลดภาพหลัก ---------- */
const imgs = KEYS.map(() => null);
const frameCache = new Map();
function load(src) {
  return new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
const loader = document.getElementById('loader');
const bar = document.getElementById('loader-bar');
async function boot() {
  let n = 0;
  const first = [0, 1].map(i => load(`/welcome/film/${KEYS[i]}.webp`).then(im => { imgs[i] = im; bar.style.width = `${(++n / 2) * 100}%`; }));
  await Promise.all(first);
  loader.classList.add('done');
  draw(true);
  for (let i = 2; i < KEYS.length; i++) imgs[i] = await load(`/welcome/film/${KEYS[i]}.webp`);
  draw(true);
}
// เฟรมคลิปจริง: โหลดทั้งฉากล่วงหน้าเมื่อเข้าใกล้ (ฉากนี้ + ฉากถัดไป) ระหว่างโหลดใช้เฟรมที่ใกล้ที่สุดที่มีแล้ว
const preloaded = new Set();
function preloadScene(k) {
  const scene = SCENES[k];
  if (!scene || !scene.frames || preloaded.has(k)) return;
  preloaded.add(k);
  const order = [];
  for (let step = 8; step >= 1; step = Math.floor(step / 2)) for (let i = 0; i < scene.frames; i += step) if (!order.includes(i)) order.push(i);
  (async () => {
    for (const i of order) {
      const key = `${scene.id}/${String(i + 1).padStart(3, '0')}`;
      const im = await load(`/welcome/film/${key}.webp`);
      frameCache.set(key, im);
      if (i % 8 === 0) draw(true);
    }
  })();
}
function frame(scene, i) {
  for (let d = 0; d < scene.frames; d++) {
    for (const j of [i - d, i + d]) {
      const im = frameCache.get(`${scene.id}/${String(j + 1).padStart(3, '0')}`);
      if (im) return im;
    }
  }
  return null;
}

/* ---------- แคนวาส ---------- */
const cv = document.getElementById('film');
const ctx = cv.getContext('2d');
const amb = document.getElementById('ambient');
const actx = amb.getContext('2d');
const off = document.createElement('canvas'); // ฟิล์มแนวตั้งก่อนวางลงจอ
const octx = off.getContext('2d');
off.width = 720; off.height = 1080;
amb.width = 48; amb.height = 30;
let W = 0, H = 0, wide = false;
function size() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (Math.abs(w - W) < 1 && Math.abs(h - H) < 140 && W) return; // แถบ URL ของมือถือยุบ/ขยาย ไม่ต้องวาดใหม่ทั้งหมด
  W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  wide = matchMedia('(min-width:900px) and (min-aspect-ratio:1/1)').matches;
  measure(); draw(true);
}
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function cover(c, im, cw, ch, zoom, dy) {
  const s = Math.max(cw / im.width, ch / im.height) * zoom;
  const w = im.width * s, h = im.height * s;
  c.drawImage(im, (cw - w) / 2, (ch - h) / 2 + dy, w, h);
}
// ฟิล์ม 2:3 ลงจอมือถือ (แคบกว่า) ครอปข้างโดยเลื่อนไปหาจุดโฟกัสของภาพหลักที่กำลังเด่น
let focus = .5;
// วาดฉากลงแคนวาสแนวตั้ง: ภาพจริงถ้ามีเฟรม ไม่งั้นภาพนิ่ง A ซูมเข้า แล้ว B ละลายเข้ามาและนิ่งพอดีที่ p = 1
function paint(scene, p) {
  const c = octx, cw = off.width, ch = off.height;
  c.fillStyle = '#05070f'; c.fillRect(0, 0, cw, ch);
  if (scene.frames) {
    const f = frame(scene, Math.round(p * (scene.frames - 1)));
    if (f) { cover(c, f, cw, ch, 1, 0); return; }
  }
  const A = imgs[scene.a], B = imgs[scene.b];
  if (A) { c.globalAlpha = 1; cover(c, A, cw, ch, 1 + .14 * ease(Math.min(1, p / .6)), -ch * .025 * Math.min(1, p / .6)); }
  const t = smooth(.2, .58, p);
  if (B && t > 0) { c.globalAlpha = t; cover(c, B, cw, ch, 1.1 - .1 * smooth(.2, .96, p), ch * .02 * (1 - smooth(.2, .96, p))); }
  c.globalAlpha = 1;
}
let last = '';
function draw(force) {
  const { scene, p } = current();
  const key = scene.id + ':' + p.toFixed(4) + ':' + W + 'x' + H;
  if (!force && key === last) return;
  last = key;
  focus = FOCUS[scene.a] + (FOCUS[scene.b] - FOCUS[scene.a]) * smooth(.2, .58, p);
  paint(scene, p);
  const dpr = cv.width / Math.max(1, W);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (wide) ctx.clearRect(0, 0, cv.width, cv.height); // ให้ฉากหลังเบลอ (canvas ambient) โผล่ข้างฟิล์ม
  else { ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (wide) {
    // ฟิล์มแนวตั้งสูงเต็มจอ ขอบจางเข้าหาฉากหลัง
    const h = cv.height, w = h * off.width / off.height, x = (cv.width - w) / 2;
    ctx.drawImage(off, x, 0, w, h);
    const edge = 40 * dpr;
    for (const [x0, x1] of [[x, x + edge], [x + w, x + w - edge]]) {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, 'rgba(5,7,15,.9)'); g.addColorStop(1, 'rgba(5,7,15,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, edge, h);
    }
    actx.drawImage(off, 0, 0, amb.width, amb.height);
  } else {
    const [x, y, w, h] = fitCover(off.width, off.height, cv.width, cv.height);
    const spare = w - cv.width;
    ctx.drawImage(off, 0, 0, off.width, off.height, spare > 0 ? -spare * focus : x, y, w, h);
  }
}
function fitCover(iw, ih, cw, ch) {
  const s = Math.max(cw / iw, ch / ih); const w = iw * s, h = ih * s;
  return [(cw - w) / 2, (ch - h) / 2, w, h];
}

/* ---------- ตำแหน่งการเลื่อน → ฉาก + ความคืบหน้า ---------- */
const sections = [...document.querySelectorAll('.scene')];
const tracks = sections.map(s => s.querySelector('.track'));
let spans = [];
function measure() {
  const vh = window.innerHeight;
  tracks.forEach(t => { t.style.height = `${Number(t.dataset.len || 2.4) * vh}px`; });
  spans = tracks.map(t => {
    const top = t.getBoundingClientRect().top + scrollY;
    return { top, len: Math.max(1, t.offsetHeight - vh) };
  });
}
function current() {
  const y = scrollY;
  let i = 0;
  for (let k = 0; k < spans.length; k++) if (y >= spans[k].top - 1) i = k;
  const s = spans[i] || { top: 0, len: 1 };
  return { scene: SCENES[i], index: i, p: Math.min(1, Math.max(0, (y - s.top) / s.len)) };
}

/* ---------- ข้อความทีละจังหวะ ---------- */
const beats = sections.map(s => [...s.querySelectorAll('.beat')].map(el => ({
  el, from: Number(el.dataset.from), to: Number(el.dataset.to),
  words: (() => { const w = el.querySelector('.words'); if (!w) return null; w.innerHTML = w.textContent.trim().split(/\s+/).map(t => `<span class="w">${t}</span>`).join(' '); return [...w.children]; })(),
  rrr: [...el.querySelectorAll('.rrr li')],
  count: el.querySelector('[data-count]'), counted: false
})));
const dots = [...document.querySelectorAll('#dots li')];
const seen = new Set();
function beatsFor(i, p) {
  beats.forEach((list, k) => list.forEach(b => {
    if (k !== i) { b.el.style.opacity = 0; return; }
    const fade = .07;
    const o = Math.min(b.from <= 0 ? 1 : smooth(b.from, b.from + fade, p), b.to >= 1 ? 1 : 1 - smooth(b.to - fade, b.to, p));
    b.el.style.opacity = o.toFixed(3);
    b.el.style.transform = `translateY(${((1 - o) * (p < b.from + fade ? 24 : -24)).toFixed(1)}px)`;
    const local = Math.min(1, Math.max(0, (p - b.from) / Math.max(.01, b.to - b.from - fade)));
    if (b.words) { const n = Math.ceil(local * 1.25 * b.words.length); b.words.forEach((w, j) => w.classList.toggle('lit', j < n)); }
    b.rrr.forEach(li => li.classList.toggle('lit', p >= Number(li.dataset.at)));
    if (b.count && o > .5 && !b.counted) { b.counted = true; countUp(b.count); }
  }));
  dots.forEach((d, k) => { d.classList.toggle('on', k < i); d.classList.toggle('now', k === i); });
  if (p > .3 && !seen.has(i)) { seen.add(i); post({ kind: 'scene', step: SCENES[i].id }).catch(() => {}); }
}
function countUp(el) {
  const to = Number(el.dataset.count) || 0; let t0;
  const tick = t => { t0 ??= t; const k = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

let queued = false;
function onScroll() {
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; const c = current(); preloadScene(c.index); preloadScene(c.index + 1); beatsFor(c.index, c.p); draw(); });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { size(); onScroll(); });

/* ---------- การ์ดคำถาม ---------- */
const toast = document.getElementById('toast');
function say(text) { toast.textContent = text; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 1800); }
document.querySelectorAll('[data-q]').forEach(card => {
  const q = QUESTIONS.find(x => x.id === card.dataset.q);
  if (!q) return;
  card.classList.add('q');
  if (q.multi) card.classList.add('q--multi');
  card.innerHTML = `<p class="q__ask">${q.ask}</p>${q.hint ? `<p class="q__hint">${q.hint}</p>` : ''}
    <div class="q__opts">${q.options.map(o => `<button type="button" class="opt" data-v="${o.id}" aria-pressed="false">${o.t}</button>`).join('')}</div>
    ${q.multi ? '<button type="button" class="btn q__send" disabled>ตอบแล้ว ไปต่อ</button>' : ''}
    <p class="q__reply" hidden></p><p class="q__thanks" hidden>บันทึกคำตอบแล้ว</p>`;
  const opts = [...card.querySelectorAll('.opt')];
  const sendBtn = card.querySelector('.q__send');
  const id = store.get(`welcome.a.${q.id}`) || uuid();
  store.set(`welcome.a.${q.id}`, id);
  const picked = () => opts.filter(o => o.getAttribute('aria-pressed') === 'true').map(o => o.dataset.v);
  function done() {
    const value = picked();
    if (!value.length) return;
    answers[q.id] = value; store.set('welcome.answers', JSON.stringify(answers));
    document.dispatchEvent(new Event('welcome:answer'));
    const reply = card.querySelector('.q__reply');
    if (card.dataset.reply) { reply.textContent = card.dataset.reply; reply.hidden = false; }
    post({ kind: 'answer', id, step: q.id, value })
      .then(r => { if (r.ok) { card.querySelector('.q__thanks').hidden = false; say('บันทึกคำตอบแล้ว'); } })
      .catch(() => {});
  }
  (answers[q.id] || []).forEach(v => { const b = opts.find(o => o.dataset.v === v); if (b) b.setAttribute('aria-pressed', 'true'); });
  if (sendBtn) sendBtn.disabled = !picked().length;
  opts.forEach(b => b.addEventListener('click', () => {
    if (q.multi) {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      sendBtn.disabled = !picked().length;
    } else {
      opts.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      done();
    }
  }));
  if (sendBtn) sendBtn.addEventListener('click', done);
});

/* การ์ดค่อย ๆ ลอยขึ้นเมื่อเลื่อนถึง */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .18 });
document.querySelectorAll('.card').forEach(c => io.observe(c));
const ladderCount = document.querySelector('.card--plan [data-count]');
if (ladderCount) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); countUp(ladderCount); } }, { threshold: .4 }).observe(ladderCount);

/* ---------- ท้ายเรื่อง: คำแนะนำจากคำตอบ + ข้อความถึงคนที่ส่งลิงก์ ---------- */
// ไม่มีฟอร์มให้ทีมทักกลับ: คนที่ส่งลิงก์คือคนที่ดูแลเขา หน้าเลยช่วยร่างข้อความให้ส่งหาคนนั้นเอง
const label = (qid, oid) => QUESTIONS.find(q => q.id === qid)?.options.find(o => o.id === oid)?.t || '';
const has = (qid, oid) => (answers[qid] || []).includes(oid);
function advice() {
  const tips = [];
  let head = 'ก้าวแรกของ X-PLORER';
  if (has('start_with', 'xvisor')) {
    head = 'คุณพร้อมไปถึง X-VISOR';
    tips.push('บอกคนที่ส่งลิงก์ว่าอยากสอบ X-VISOR สอบผ่านก่อนสิ้นเดือน ยอดเดือนนั้นคิดตาม Tier');
  } else if (has('start_with', 'think')) {
    head = 'เริ่มจากสำรวจให้มั่นใจก่อน';
    tips.push('ขอให้คนที่ส่งลิงก์พาลองใช้ Band · Scale แล้วดูตัวเลขของคุณเองสักสองสัปดาห์');
  } else {
    tips.push('ขอรหัส X-PLORER จากคนที่ส่งลิงก์นี้ให้คุณ แล้วเริ่มขายได้ทันทีที่ 15%');
  }
  if (has('channel', 'affiliate') || has('channel', 'live') || has('channel', 'shop'))
    tips.push('คุณขายเป็นอยู่แล้ว สิ่งที่เพิ่มคือระบบที่ทำให้ลูกค้าอยู่กับคุณ ใช้ My Customer กับ XOS ตั้งแต่ลูกค้าคนแรก');
  else if (has('channel', 'direct'))
    tips.push('ประสบการณ์ขายตรงของคุณใช้ได้เลย คราวนี้มีตัวเลขสุขภาพของลูกค้าเป็นหลักฐานแทนคำพูด');
  else
    tips.push('ให้ผลลัพธ์ของตัวคุณเองเป็นป้ายโฆษณาแรก ใช้กับตัวเองก่อน แล้วเล่าสิ่งที่เปลี่ยน');
  if (has('reach_back', 'almost_none') || has('reach_back', 'some'))
    tips.push('ลูกค้าที่ซื้อแล้วต้องทักกลับได้ทุกคน ข้อมูลอยู่ในแอป ความสัมพันธ์จึงอยู่กับคุณ');
  const ai = answers.ai_help || [];
  if (ai.includes('content') || ai.includes('clip')) tips.push('เปิดคู่หู X-VISOR ให้ช่วยคิดหัวข้อและเขียนบทคลิปแรกของคุณ');
  else if (ai.includes('follow') || ai.includes('chat')) tips.push('ให้ XOS เตือนทุกเช้าว่าวันนี้ต้องดูแลใคร');
  else tips.push('สร้างลิงก์ขายของคุณที่หน้า /share/code แล้วส่งให้คนรอบตัว');
  return { head, tips: tips.slice(0, 3) };
}
function message() {
  const want = has('start_with', 'xvisor') ? 'อยากสอบเป็น X-VISOR' : has('start_with', 'think') ? 'อยากลองใช้และคุยรายละเอียดก่อน' : 'อยากเริ่มเป็น X-PLORER';
  const lines = [`สวัสดีครับ/ค่ะ ดูหน้าต้อนรับ X-PLORER ของ CloverX แล้ว ${want}`];
  const ch = (answers.channel || []).map(o => label('channel', o)).filter(Boolean);
  if (ch.length) lines.push(`ตอนนี้ขายทาง: ${ch.join(', ')}`);
  const asked = (answers.asked_about || []).map(o => label('asked_about', o)).filter(Boolean);
  if (asked.length) lines.push(`คนรอบตัวถามเรื่อง: ${asked.join(', ')}`);
  if (ref) lines.push(`(รหัสผู้ชวน ${ref})`);
  lines.push('ช่วยแนะนำขั้นต่อไปหน่อยครับ/ค่ะ');
  return lines.join('\n');
}
const msgEl = document.getElementById('msg');
const lineBtn = document.getElementById('send-line');
function renderEnd() {
  const a = advice();
  document.getElementById('advice-head').textContent = a.head;
  document.getElementById('advice-list').innerHTML = a.tips.map(t => `<li>${t}</li>`).join('');
  const m = message();
  msgEl.textContent = m;
  lineBtn.href = 'https://line.me/R/share?text=' + encodeURIComponent(m);
}
if (ref) { document.getElementById('ref-code').textContent = ref; document.getElementById('ref').hidden = false; }
renderEnd();
document.addEventListener('welcome:answer', renderEnd);
lineBtn.addEventListener('click', () => post({ kind: 'scene', step: 'message_line' }).catch(() => {}));
document.getElementById('copy-msg').addEventListener('click', async () => {
  post({ kind: 'scene', step: 'message_copy' }).catch(() => {});
  try { await navigator.clipboard.writeText(message()); say('คัดลอกแล้ว ไปวางในแชตได้เลย'); }
  catch { const r = document.createRange(); r.selectNodeContents(msgEl); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); say('เลือกข้อความแล้ว กดคัดลอกได้เลย'); }
});

size(); onScroll(); boot();
