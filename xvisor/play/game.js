// X-VISOR QUEST 3.0 · Clip Edition: screens and touch. All rules live in sim.js.
import * as G from './sim.js';

const KEY = 'xvq3-save';
const BEST = 'xvq3-best';
const BOARD = 'xvq3-board';
const NAME = 'xvq3-name';
const SCORE_API = '/api/xvisor-scores';
const SCORE_VERSION = '3.0-clip';
const app = document.getElementById('app');
const sheet = document.getElementById('sheet');
const toastBox = document.getElementById('toast');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => Math.round(Number(v) || 0).toLocaleString('th-TH');
const baht = (v) => '฿' + num(v);
const stars = (q) => '<span class="stars" aria-label="' + q + ' ดาว">' + '★'.repeat(q) + '<i>' + '★'.repeat(5 - q) + '</i></span>';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* the game still plays without storage */ } },
};
const json = (k, d) => { try { return JSON.parse(store.get(k) || 'null') ?? d; } catch { return d; } };

let S = G.parseSave(store.get(KEY));
let screen = 'start';
let pose = 1;
let flash = null;      // { html } shown once above the moves
let freshClip = 0;
let intro = null;      // { step, exam, picked }
let shown = '';

const save = () => store.set(KEY, JSON.stringify(S));
const PILLAR = { eat: 'กิน', move: 'ขยับ', sleep: 'นอน' };

// ---------- small pieces ----------
function ring(score) {
  const c = 2 * Math.PI * 34;
  const tone = score >= 70 ? 'good' : score < 40 ? 'low' : 'mid';
  return `<div class="ring ${tone}" role="img" aria-label="คะแนนนิสัย ${score} จาก 100">
    <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="track"/><circle cx="40" cy="40" r="34" class="fill" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"/></svg>
    <b>${score}</b></div>`;
}
// clip art: one sheet of 12 thumbnails (4 across, 3 down), picked by topic
function thumb(topic) {
  const i = Math.max(0, G.TOPICS.indexOf(topic)) + 1;
  return `style="--th:url(/xvisor/play/img/clips/${String(i).padStart(2, '0')}.webp)"`;
}
function clipCard(clip, isNew) {
  const mine = clip.by === 'me';
  const member = mine ? null : S.team.find((m) => m.id === clip.by);
  const tag = clip.flag ? '<em class="tag-off">ไม่วิ่ง</em>' : clip.hot ? '<em class="tag-hot">🔥 ปัง</em>' : clip.born === S.month ? '<em class="tag-new">ใหม่</em>' : '';
  return `<li class="clip${clip.flag ? ' flag' : ''}${clip.hot ? ' hot' : ''}${isNew ? ' new' : ''}" ${thumb(clip.topic)}>
    ${tag}
    <span class="clip-info">
      <b>${esc(mine ? clip.topic : member ? member.name : 'ทีม')}</b>
      ${stars(clip.q)}
      ${mine && clip.earned ? `<span class="earn">${baht(clip.earned)}</span>` : `<span>👁 ${num(clip.views)}</span>`}
    </span>
  </li>`;
}
function bars(history) {
  const max = Math.max(1, ...history.map((h) => h.income));
  return `<div class="bars" role="img" aria-label="รายได้แต่ละเดือน">${history.map((h) => `<i style="--h:${Math.max(4, Math.round(h.income / max * 100))}%"><span>${h.month}</span></i>`).join('')}</div>`;
}
function countUp(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), from = Number(el.dataset.from || 0), pre = el.dataset.pre || '';
    if (reduce || to === from) { el.textContent = pre + num(to); return; }
    const delay = Number(el.dataset.delay || 0), dur = 800, t0 = performance.now() + delay;
    el.textContent = pre + num(from);
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      el.textContent = pre + num(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function toast(msg) {
  toastBox.textContent = msg;
  toastBox.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastBox.classList.remove('on'), 2800);
}
function openSheet(html, cls = '') {
  sheet.className = 'sheet ' + cls;
  sheet.innerHTML = `<div class="sheet-card" role="dialog" aria-modal="true">${html}</div>`;
  sheet.hidden = false;
  countUp(sheet);
  const first = sheet.querySelector('button, a');
  if (first) first.focus({ preventScroll: true });
}
function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; }
function burst(host) {
  if (reduce || !host) return;
  const box = document.createElement('div');
  box.className = 'burst';
  box.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--d:${60 + (i * 37) % 70}px;--c:${['#4be8ff', '#3cf0a0', '#e6c27a', '#ff6fd8', '#9b7bff'][i % 5]}"></i>`).join('');
  host.append(box);
  setTimeout(() => box.remove(), 1300);
}

// ---------- start ----------
function startScreen() {
  const best = Number(store.get(BEST) || 0);
  const resume = S && S.phase === 'play';
  app.innerHTML = `
  <section class="start">
    <div class="cover"><img src="/xvisor/play/img/cover.webp" alt="" width="900" height="900" fetchpriority="high"></div>
    <a class="home" href="/xvisor/">← X-VISOR</a>
    <div class="start-copy">
      <p class="tag">QUEST 3.0 · CLIP EDITION</p>
      <h1>คลิปทำงาน<br><span class="grad">แทนพี่</span></h1>
      <p class="lead">เกมสั้น 12 เดือน ลงคลิปรีวิว ให้คลิปเก่าทำเงิน แล้วดูคลังคลิปของพี่โต</p>
      <div class="start-btns">
        ${resume ? `<button class="btn glow" data-go="resume" type="button">เล่นต่อ เดือน ${S.month}</button><button class="btn line" data-go="intro" type="button">เริ่มใหม่</button>`
          : '<button class="btn glow" data-go="intro" type="button">▶ เริ่มเกม</button>'}
        <button class="btn line" data-go="board" type="button">🏆 High Score</button>
      </div>
      ${best ? `<p class="best">คะแนนสูงสุดของพี่ ${num(best)}</p>` : ''}
      <p class="fine">ตัวเลขในเกมเป็นตัวอย่างเพื่ออธิบายหลักคิด ไม่ใช่การรับประกันรายได้ ผลของแต่ละคนไม่เหมือนกัน</p>
      <p class="fine"><a href="/xvisor/play/classic/">เล่นเกมเวอร์ชันเดิม 2.0</a></p>
    </div>
  </section>`;
}

// ---------- opening story: the night before, the exam, the title, installing the companion ----------
const SHIELD = `<svg class="shield" viewBox="0 0 64 64" aria-hidden="true"><defs>
  <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset=".35" stop-color="#e6c27a"/><stop offset=".6" stop-color="#b8893e"/><stop offset="1" stop-color="#ffe9b8"/></linearGradient>
  <linearGradient id="sn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16244a"/><stop offset="1" stop-color="#060b1a"/></linearGradient>
  <linearGradient id="sa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#4be8ff"/></linearGradient>
  <linearGradient id="sb" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3cf0a0"/><stop offset="1" stop-color="#9b7bff"/></linearGradient></defs>
  <path d="M32 3 57 14v20c0 13-10.5 23.5-25 27C17.5 57.5 7 47 7 34V14Z" fill="url(#sn)" stroke="url(#sg)" stroke-width="2.6"/>
  <path d="M20 19.5h6.2L44 45h-6.2Z" fill="url(#sa)"/><path d="M44 19.5h-6.2L20 45h6.2Z" fill="url(#sb)"/></svg>`;

function introScreen() {
  const st = intro.step;
  const skip = st < 7 ? '<button class="skip" data-intro="skip" type="button">ข้าม ›</button>' : '';
  let body = '';
  if (st === 0) body = `
    <div class="scene"><img src="/xvisor/img/burden.webp" alt="" class="scene-bg"><div class="scene-copy">
      <p class="tag">สี่ทุ่มครึ่ง</p><h2>ทุกคืน พี่ต้อง<br>เป็นทุกอย่าง</h2>
      <p class="lead">เขียนบท ตัดต่อ คิดแคปชัน ตอบแชต แล้วยังต้องดูแลลูกค้า</p>
      <button class="btn glow" data-intro="next" type="button">แล้วไงต่อ ›</button></div></div>`;
  else if (st === 1) body = `
    <div class="scene"><img src="/xvisor/img/focus.webp" alt="" class="scene-bg"><div class="scene-copy">
      <p class="tag">คืนนั้น</p><h2>พี่ตัดสินใจ<br>เป็น <span class="gold">X-VISOR</span></h2>
      <p class="lead">คนที่ช่วยให้คนอื่นทำนิสัยดีได้ต่อเนื่อง ก่อนเริ่ม มีสอบสั้น ๆ 3 ข้อ</p>
      <button class="btn glow" data-intro="next" type="button">เริ่มสอบ ›</button></div></div>`;
  else if (st >= 2 && st <= 4) {
    const q = G.EXAM[st - 2], picked = intro.picked;
    body = `
    <div class="exam">
      <p class="tag">สอบ X-VISOR · ข้อ ${st - 1} จาก 3</p>
      <div class="exam-dots">${G.EXAM.map((_, i) => `<i class="${i < st - 2 ? 'd' : i === st - 2 ? 'c' : ''}"></i>`).join('')}</div>
      <h2>${esc(q.ask)}</h2>
      <div class="opts">${q.options.map((o, i) => `<button class="opt${picked != null ? (o.ok ? ' right' : i === picked ? ' wrong' : ' dim') : ''}" data-exam="${i}" type="button" ${picked != null ? 'disabled' : ''}><b>${'กขค'[i]}</b><span>${esc(o.t)}</span></button>`).join('')}</div>
      ${picked != null ? `<p class="exam-why ${q.options[picked].ok ? 'ok' : 'no'}"><b>${q.options[picked].ok ? '✓ ถูกต้อง' : '✗ ยังไม่ใช่'}</b>${esc(q.why)}</p>
        <button class="btn glow" data-intro="next" type="button">${st === 4 ? 'ดูผลสอบ ›' : 'ข้อต่อไป ›'}</button>` : ''}
    </div>`;
  } else if (st === 5) body = `
    <div class="cert">
      <div class="cert-glow">${SHIELD}</div>
      <p class="tag">${intro.exam >= 2 ? 'ผ่านการสอบ' : 'สอบครบแล้ว'} · ตอบถูก ${intro.exam} จาก 3</p>
      <h2>ยินดีด้วย<br><span class="gold">พี่คือ X-VISOR</span></h2>
      <p class="lead">${intro.exam ? 'พี่เริ่มเกมด้วยคะแนนนิสัยที่ดีขึ้น' : 'ไม่เป็นไร ในเกมนี้พี่จะได้ฝึกไปทีละเดือน'}</p>
      <button class="btn glow" data-intro="next" type="button">รับผู้ช่วย AI ›</button>
    </div>`;
  else if (st === 6) body = `
    <div class="install">
      <img class="bot sleep" src="/xvisor/img/bot-1.webp" alt="" width="372" height="520">
      <p class="tag">กำลังติดตั้งคู่หู AI</p>
      <ul class="boot">
        <li style="--d:.2s">วางพรอมต์ลงในแชต</li>
        <li style="--d:.9s">โหลดความรู้สินค้า</li>
        <li style="--d:1.6s">โหลดกติกาคำพูด</li>
        <li style="--d:2.3s">โหลดสกิลทำคลิปรีวิว</li>
      </ul>
      <div class="boot-bar"><i></i></div>
      <button class="btn glow late" data-intro="next" type="button">ปลุกคู่หู ›</button>
    </div>`;
  else body = `
    <div class="meet">
      <img class="bot wake" src="/xvisor/img/bot-2.webp" alt="" width="407" height="520">
      <p class="say big">สวัสดีครับ! ผมคือคู่หู AI ของพี่ งานหลังบ้านผมช่วยเอง พี่ไปดูแลคน ให้ผมเรียกพี่ว่าอะไรดีครับ</p>
      <label class="name-box"><span>ชื่อเล่นของพี่ (ใช้ลง High Score)</span>
        <input id="nameInput" type="text" maxlength="20" autocomplete="nickname" placeholder="เช่น แดง" value="${esc(store.get(NAME) || '')}"></label>
      <button class="btn glow" data-intro="play" type="button">เริ่มเดือนแรก ▶</button>
    </div>`;
  app.innerHTML = `<section class="intro s${st}">${skip}${body}</section>`;
}

// ---------- play ----------
function action(id, icon, title, sub, badge = '', off = false) {
  return `<button class="act${off ? ' off' : ''}" data-act="${id}" type="button"><span class="act-ico" aria-hidden="true">${icon}</span><span class="act-txt"><b>${title}</b><small>${sub}</small></span>${badge ? `<em>${badge}</em>` : ''}</button>`;
}

function playScreen() {
  const score = G.habitScore(S);
  const low = G.lowestHabit(S);
  const canTeach = G.recruitable(S) > 0;
  const teamUp = S.team.some((m) => m.skill < 3);
  const myClips = S.clips.filter((c) => c.by === 'me').length;
  const shelf = [...S.clips].sort((a, b) => (Number(b.hot || 0) - Number(a.hot || 0)) || (b.id - a.id)).slice(0, 16);
  const showShop = !S.shop && (S.month >= 3 || myClips >= 3);
  const done = S.moves === 0;
  const fresh = S.moves === G.MOVES_PER_MONTH;
  app.innerHTML = `
  <section class="play">
    <header class="hud">
      <a class="home" href="/xvisor/play/" data-go="start" aria-label="กลับหน้าแรกของเกม">←</a>
      <div class="month"><b>เดือน ${S.month}</b><span>/ ${G.MONTHS} · ${baht(S.totals.income)}</span>
        <i class="dots" aria-hidden="true">${Array.from({ length: G.MONTHS }, (_, i) => `<u class="${i + 1 < S.month ? 'd' : i + 1 === S.month ? 'c' : ''}"></u>`).join('')}</i></div>
      <button class="money" data-act="stats" type="button" aria-label="คะแนนสะสม ${num(S.score)} ดูสถิติคลิปทั้งทีม"><small>คะแนน</small><b>${num(S.score)}</b></button>
    </header>

    <div class="stagebox">
      <img class="bot" src="/xvisor/img/bot-${pose}.webp" alt="" width="372" height="520">
      <p class="say" id="say">${esc(G.advice(S))}</p>
    </div>

    ${S.event && fresh ? `<div class="news${S.event.id === 'trend' ? ' hot' : ''}"><b>📰 ${esc(S.event.t)}</b><span>${esc(S.event.b)}</span></div>` : ''}

    <div class="stats3">
      <div class="habit">${ring(score)}<div class="habit-txt"><b>คะแนนนิสัย</b>
        <span class="pill-row">${['eat', 'move', 'sleep'].map((k) => `<i class="${k === low ? 'low' : ''}" style="--v:${S.habit[k]}%"><u></u>${PILLAR[k]}</i>`).join('')}</span></div></div>
      <div class="chip"><small>ลูกค้าประจำ</small><b>${num(S.customers)}${S.joined ? `<em>+${S.joined}</em>` : ''}</b></div>
      <div class="chip${S.dms ? ' hot' : ''}"><small>คนทักรออยู่</small><b>${num(S.dms)}</b></div>
    </div>

    <div class="shelf-head"><b>คลังคลิป <span>${num(S.clips.length)} คลิป</span></b><button data-act="stats" type="button">สถิติทั้งทีม ›</button></div>
    ${shelf.length ? `<ul class="shelf">${shelf.map((c) => clipCard(c, c.id === freshClip)).join('')}${S.clips.length > shelf.length ? `<li class="more">+${S.clips.length - shelf.length}</li>` : ''}</ul>`
      : '<p class="shelf-empty">ยังไม่มีคลิป ลงคลิปแรกได้เลย</p>'}

    ${flash ? `<div class="flash">${flash.html}</div>` : ''}

    <div class="moves" aria-label="เวลาเดือนนี้ เหลือ ${S.moves} จาก ${G.MOVES_PER_MONTH} ตา"><span>เวลาเดือนนี้</span>${Array.from({ length: G.MOVES_PER_MONTH }, (_, i) => `<i class="${i < S.moves ? 'on' : ''}"></i>`).join('')}</div>

    <div class="acts${done ? ' done' : ''}">
      ${action('clip', '🎬', 'ลงคลิปรีวิว', 'เพิ่มคลิปเข้าคลัง', S.trend ? '🔥' : '')}
      ${action('reply', '💬', 'ตอบคนทัก', S.dms ? `ตอบได้ ${Math.min(S.dms, G.REPLIES_PER_MOVE)} คน` : 'ยังไม่มีคนทัก', S.dms ? String(S.dms) : '', !S.dms)}
      ${action('care', '🌿', 'ดูแลตัวเอง', `เติมเรื่อง${PILLAR[low]}`)}
      ${action('teach', '🤝', 'สอนทีม', canTeach ? 'มีคนอยากทำคลิปตามพี่' : teamUp ? 'ฝึกให้คลิปของทีมดีขึ้น' : S.team.length ? 'ทีมเก่งเต็มที่แล้ว' : `มีลูกค้า ${G.CUSTOMERS_PER_RECRUIT} คนก่อน`, canTeach ? 'ใหม่' : '', !canTeach && !teamUp)}
      ${showShop ? action('shop', '🛒', 'ปักลิงก์สั่งซื้อ', 'ขายได้ในคลิป ไม่ต้องรอทัก', 'ครั้งเดียว') : ''}
    </div>

    <button class="btn end ${done ? 'glow' : 'line'}" data-act="end" type="button">${done ? 'จบเดือน ให้คลิปออกวิ่ง ▶' : 'จบเดือนเลย'}</button>
    <p class="fine center">ตัวเลขเป็นตัวอย่าง ไม่ใช่การรับประกันรายได้</p>
  </section>`;
  flash = null; freshClip = 0;
}

// ---------- end + high score ----------
function boardRows(rows, mine) {
  if (!rows.length) return '<p class="note">ยังไม่มีใครลงชื่อ พี่เป็นคนแรกได้เลย</p>';
  return `<ol class="board">${rows.slice(0, 10).map((r, i) => `<li class="${mine && r.runId === mine ? 'me' : ''}"><i>${i + 1}</i><span>${esc(r.displayName)}</span><small>${num(r.organizationSize)} คลิป · ${baht(r.totalIncome)}</small><b>${num(r.bestTgv)}</b></li>`).join('')}</ol>`;
}
async function loadBoard() {
  try {
    const res = await fetch(SCORE_API + '?board=clip', { headers: { accept: 'application/json' } });
    const data = await res.json();
    if (!res.ok || !data.ok) throw Error('offline');
    return { rows: data.scores, online: true };
  } catch {
    return { rows: json(BOARD, []), online: false };
  }
}
async function boardSheet(mine) {
  openSheet('<p class="tag">HIGH SCORE · 3.0</p><h2>🏆 กระดานคะแนน</h2><p class="note" id="boardNote">กำลังโหลด…</p><div id="boardBody"></div><button class="btn glow" data-close="stay" type="button">ปิด</button>', 'stats');
  const { rows, online } = await loadBoard();
  const note = sheet.querySelector('#boardNote'), body = sheet.querySelector('#boardBody');
  if (!note) return;
  note.textContent = online ? 'เรียงตามคะแนนสะสม 12 เดือน' : 'ต่อกระดานออนไลน์ไม่ได้ตอนนี้ แสดงคะแนนที่เก็บในเครื่องนี้';
  body.innerHTML = boardRows(rows, mine);
}
function scorePayload(name) {
  return { displayName: name, runId: S.runId, scoreVersion: SCORE_VERSION, runMode: 'FIRST_RUN', bestTgv: S.score, totalIncome: S.totals.income,
    bestMonthlyIncome: S.best.income, organizationSize: S.clips.filter((c) => !c.flag).length, completedAt: Date.now() };
}
async function submitScore() {
  const input = document.getElementById('scoreName');
  const name = (input?.value || '').trim().slice(0, 28);
  if (!name) { toast('พิมพ์ชื่อเล่นก่อนนะครับ'); input?.focus(); return; }
  store.set(NAME, name);
  const row = scorePayload(name);
  const local = json(BOARD, []).filter((r) => r.runId !== row.runId);
  local.push(row); local.sort((a, b) => b.bestTgv - a.bestTgv);
  store.set(BOARD, JSON.stringify(local.slice(0, 20)));
  S.signed = true; S.name = name; save();
  try {
    await fetch(SCORE_API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(row) });
  } catch { /* the local board already has it */ }
  render();
  boardSheet(row.runId);
}

function endScreen() {
  const rank = G.finalRank(S);
  const clean = S.clips.filter((c) => !c.flag).length;
  const prev = Number(store.get(BEST) || 0);
  if (S.score > prev) store.set(BEST, String(S.score));
  const topClip = [...S.clips].filter((c) => c.by === 'me').sort((a, b) => b.earned - a.earned)[0];
  app.innerHTML = `
  <section class="endgame">
    <img class="bot big" src="/xvisor/img/bot-2.webp" alt="" width="407" height="520">
    <p class="tag">ครบ 12 เดือน${S.name ? ' · พี่' + esc(S.name) : ''}</p>
    <h1><span class="grad">${esc(rank.title)}</span></h1>
    <p class="lead">${esc(rank.note)}</p>
    <div class="total"><small>คะแนนสะสม</small><b data-count="${S.score}">0</b>${S.score > prev && prev ? '<em>สถิติใหม่ของพี่</em>' : ''}<span>รายได้รวม ${baht(S.totals.income)}</span></div>
    ${S.signed ? '<button class="btn line" data-go="board" type="button">🏆 ดูกระดาน High Score</button>' : `
    <div class="sign"><label for="scoreName">ลงชื่อ High Score</label>
      <div class="sign-row"><input id="scoreName" type="text" maxlength="20" placeholder="ชื่อเล่นของพี่" value="${esc(S.name || store.get(NAME) || '')}"><button class="btn glow" data-go="sign" type="button">ลงชื่อ</button></div></div>`}
    <div class="grid4">
      <div><b>${num(clean)}</b><small>คลิปที่ยังวิ่งอยู่</small></div>
      <div><b>${num(S.totals.hits)}</b><small>ครั้งที่คลิปปัง</small></div>
      <div><b>${baht(S.totals.oldIncome)}</b><small>เงินจากคลิปเก่า</small></div>
      <div><b>${num(S.totals.views)}</b><small>ยอดวิวรวม</small></div>
    </div>
    ${topClip && topClip.earned ? `<p class="note">คลิปที่ทำเงินให้พี่มากที่สุด: <b>${esc(topClip.topic)}</b> ${baht(topClip.earned)}</p>` : ''}
    ${bars(S.history)}
    <div class="recap"><b>12 เรื่องที่พี่ได้ลองทำ</b><ol>${G.LESSONS.map((l) => `<li>${esc(l.t)}</li>`).join('')}</ol></div>
    <a class="btn glow" href="/xvisor/#start">ไปทำคลิปจริงกับคู่หู</a>
    <button class="btn line" data-go="intro" type="button">เล่นอีกรอบ</button>
    <p class="fine center">ตัวเลขในเกมเป็นตัวอย่างเพื่ออธิบายหลักคิด ไม่ใช่การรับประกันรายได้ ผลของแต่ละคนไม่เหมือนกัน</p>
    <p class="fine center"><a href="/xvisor/play/classic/">เล่นเกมเวอร์ชันเดิม 2.0</a></p>
  </section>`;
  countUp(app);
}

function render() {
  if (screen === 'play' && S && S.phase === 'done') screen = 'end';
  if (screen === 'intro' && intro) introScreen();
  else if (screen === 'start' || !S) { screen = 'start'; startScreen(); }
  else if (screen === 'end') endScreen();
  else playScreen();
  // stay where the thumb is while playing; only a new screen or month starts from the top
  const key = screen + (screen === 'intro' ? intro.step : S ? S.month : 0);
  if (shown !== key) app.scrollTo(0, 0);
  shown = key;
}

// ---------- sheets ----------
function howSheet() {
  openSheet(`
    <img class="bot mid" src="/xvisor/img/bot-1.webp" alt="" width="372" height="520">
    <h2>เล่นยังไงครับ${S.name ? ' พี่' + esc(S.name) : ''}</h2>
    <ol class="howlist">
      <li><b>เดือนละ ${G.MOVES_PER_MONTH} ตา</b>แตะการ์ดด้านล่าง ตาละ 1 อย่าง</li>
      <li><b>ลงคลิปรีวิว</b>เลือกคำตอบ 1 ข้อ คลิปดีได้ดาวเยอะ</li>
      <li><b>กดจบเดือน</b>คลิปทุกตัวออกวิ่ง คลิปเก่าก็ยังทำเงิน</li>
    </ol>
    <button class="btn glow" data-close type="button">เข้าใจแล้ว เริ่มเลย</button>`, 'center');
}

function quizSheet() {
  const quiz = G.currentQuiz(S);
  openSheet(`
    <div class="quiz-art" ${thumb(quiz.topic)}></div>
    <p class="tag">คลิปที่ ${S.totals.myClips + 1} · ${esc(quiz.topic)}</p>
    <h2>${esc(quiz.ask)}</h2>
    <div class="opts">${quiz.options.map((o, i) => `<button class="opt" data-opt="${i}" type="button"><b>${'กขค'[i]}</b><span>${esc(o.t)}</span></button>`).join('')}</div>
    <button class="btn ghost" data-close type="button">ยังไม่ลงคลิป</button>`, 'quiz');
}

function clipResult(r) {
  const verdict = r.risk ? ['risk', 'คลิปนี้ไม่วิ่ง', '🚫'] : r.good ? ['good', 'คลิปนี้ดีมาก', '🎉'] : ['plain', 'คลิปนี้พอใช้ได้', '👍'];
  openSheet(`
    <div class="result ${verdict[0]}">
      <span class="big-ico" aria-hidden="true">${verdict[2]}</span>
      <h2>${verdict[1]}</h2>
      ${r.risk ? '' : `<p class="bigstars">${stars(r.clip.q)}</p>`}
      <p class="why">${esc(r.why)}</p>
      ${r.good ? '' : `<p class="better"><small>ข้อที่ดีกว่า</small>${esc(r.best)}</p>`}
    </div>
    <button class="btn glow" data-close type="button">${r.risk ? 'เข้าใจแล้ว' : 'เก็บเข้าคลังคลิป'}</button>`, 'center');
  if (r.good) burst(sheet.querySelector('.result'));
}

function statsSheet() {
  const mine = S.clips.filter((c) => c.by === 'me');
  const top = [...mine].filter((c) => c.views > 0).sort((a, b) => b.earned - a.earned || b.views - a.views).slice(0, 5);
  openSheet(`
    <p class="tag">สถิติคลิปทั้งทีม</p>
    <h2>คลังคลิปคือทรัพย์สิน</h2>
    <div class="grid4">
      <div><b>${num(mine.length)}</b><small>คลิปของพี่</small></div>
      <div><b>${num(S.clips.length - mine.length)}</b><small>คลิปของทีม</small></div>
      <div><b>${num(S.totals.views)}</b><small>ยอดวิวรวม</small></div>
      <div><b>${baht(S.totals.oldIncome)}</b><small>เงินจากคลิปเก่า</small></div>
    </div>
    ${S.team.length ? `<table class="team"><thead><tr><th>ทีม</th><th>คลิป</th><th>ยอดวิว</th><th>ลูกค้า</th></tr></thead><tbody>${S.team.map((m) => `<tr><td>${esc(m.name)} ${stars(m.skill + 1)}</td><td>${num(m.clips)}</td><td>${num(m.views)}</td><td>${num(m.customers)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="note">ยังไม่มีทีม มีลูกค้าประจำครบ 3 คน จะมีคนอยากทำคลิปตามพี่</p>'}
    ${top.length ? `<p class="sub-h">คลิปของพี่ที่ทำเงินมากที่สุด</p><ul class="toplist">${top.map((c) => `<li><span>${c.hits ? '🔥 ' : ''}${esc(c.topic)}</span><small>👁 ${num(c.views)}</small><b>${baht(c.earned)}</b></li>`).join('')}</ul>` : ''}
    ${S.history.length ? `<p class="sub-h">รายได้แต่ละเดือน</p>${bars(S.history)}` : ''}
    <button class="btn glow" data-close type="button">กลับไปเล่นต่อ</button>`, 'stats');
}

function reportSheet(r, before) {
  const top = r.clips.slice(0, 4);
  const max = Math.max(1, ...top.map((c) => c.views));
  const last = S.phase === 'done';
  openSheet(`
    <p class="tag">จบเดือน ${r.month}</p>
    <h2>${r.hits ? `🔥 คลิปปัง ${r.hits} คลิป!` : 'คลิปของพี่ออกไปวิ่ง'}</h2>
    ${top.length ? `<ul class="run">${top.map((c, i) => `<li class="${c.hit ? 'hit' : ''}" style="--d:${i * 0.12}s;--w:${Math.max(8, Math.round(c.views / max * 100))}%">
        <span class="run-thumb" ${thumb(c.topic)}></span>
        <span class="run-name">${c.hit ? '🔥 ' : ''}${c.by === 'me' ? '' : esc(S.team.find((m) => m.id === c.by)?.name || 'ทีม') + ' · '}${esc(c.topic)}${c.old && c.by === 'me' ? ' <em>คลิปเก่า</em>' : ''}</span>
        <b data-count="${c.views}" data-delay="${i * 120}">0</b><i></i></li>`).join('')}</ul>
      <p class="note">${r.clipCount} คลิปในคลังวิ่งพร้อมกันเดือนนี้${r.viewsOld ? ` · ยอดวิวจากคลิปเก่า ${num(r.viewsOld)}` : ''}</p>`
      : '<p class="note">เดือนนี้ยังไม่มีคลิปวิ่ง ลงคลิปก่อนนะครับ</p>'}
    <div class="grid3 step" style="--d:.5s">
      <div><b data-count="${r.viewsMe + r.viewsTeam}" data-delay="500">0</b><small>ยอดวิว</small></div>
      <div><b data-count="${r.dmsNew}" data-delay="650">0</b><small>คนทักใหม่</small></div>
      <div><b data-count="${r.joined}" data-delay="800">0</b><small>ลูกค้าใหม่</small></div>
    </div>
    <div class="people step" style="--d:.8s"><span>ต่อรูทีน <b>${num(r.renewed)}</b></span><span class="${r.lost ? 'lost' : ''}">หายไป <b>${num(r.lost)}</b></span><span>สั่งผ่านลิงก์ <b>${num(r.online)}</b></span></div>
    <div class="income step" style="--d:1.1s">
      <div class="row"><span>ขายส่วนตัว ${baht(r.personalBaht)} · ขั้น ${esc(r.tier)}</span><b>${baht(r.retail)}</b></div>
      ${r.oldIncome ? `<div class="row old"><span>↳ ในนี้มาจากคลิปเก่า</span><b>${baht(r.oldIncome)}</b></div>` : ''}
      <div class="row"><span>จากทีมที่พี่สอน</span><b>${baht(r.mentoring)}</b></div>
      <div class="row sum"><span>รายได้เดือนนี้</span><b data-count="${r.income}" data-pre="฿" data-delay="1200">฿0</b></div>
    </div>
    <div class="scorebox step" style="--d:1.35s"><span>คะแนนเดือนนี้ <b>+${num(r.scoreGain)}</b></span><div><small>คะแนนสะสม</small><b data-count="${r.scoreTotal}" data-from="${before}" data-delay="1500">${num(before)}</b></div></div>
    <div class="lesson step" style="--d:1.6s"><img src="/xvisor/img/bot-3.webp" alt="" width="393" height="520"><div><b>${esc(r.lesson.t)}</b><p>${esc(r.lesson.b)}</p></div></div>
    <button class="btn glow step" style="--d:1.8s" data-close="next" type="button">${last ? 'ดูสรุป 12 เดือน' : 'ไปเดือน ' + (r.month + 1) + ' ▶'}</button>`, 'report');
  if (r.hits) burst(sheet.querySelector('.sheet-card'));
}

// ---------- moves ----------
function did(result, okHtml) {
  if (!result.ok) { toast(result.msg); return false; }
  S = result.state; save();
  pose = pose % 3 + 1;
  flash = { html: okHtml };
  render();
  return true;
}
function act(id) {
  if (!S) return;
  if (id === 'stats') return statsSheet();
  if (id === 'end') {
    const before = S.score;
    const r = G.endMonth(S);
    if (!r.ok) return toast(r.msg);
    S = r.state; save();
    return reportSheet(r.report, before);
  }
  if (S.moves === 0) return toast('ใช้เวลาครบแล้วครับ กดจบเดือนได้เลย');
  if (id === 'clip') return quizSheet();
  if (id === 'reply') {
    const r = G.replyChats(S);
    return did(r, r.ok ? `<b>💬 ตอบ ${r.handled} คน</b>${r.won ? `ได้ลูกค้าใหม่ ${r.won} คน 🎉` : 'รอบนี้ยังไม่มีใครตัดสินใจ ไม่เป็นไรครับ'}` : '');
  }
  if (id === 'care') {
    const r = G.selfCare(S);
    return did(r, r.ok ? `<b>🌿 ดูแลเรื่อง${PILLAR[r.pillar]}</b>คะแนนนิสัย +${r.gain} คลิปของพี่น่าเชื่อขึ้น` : '');
  }
  if (id === 'teach') {
    const r = G.teachTeam(S);
    return did(r, r.ok ? (r.kind === 'new' ? `<b>🤝 ${esc(r.member.name)} เข้าทีม</b>จะลงคลิปเองทุกเดือนจากนี้` : `<b>🤝 ${esc(r.member.name)} เก่งขึ้น</b>คลิปของเขาได้ ${r.member.skill + 1} ดาว`) : '');
  }
  if (id === 'shop') {
    const r = G.openShop(S);
    return did(r, '<b>🛒 ปักลิงก์สั่งซื้อแล้ว</b>ทุกคลิปของพี่ขายได้เอง');
  }
}

function startRun(name, exam) {
  S = G.newGame((Date.now() % 2147483647) | 0, { name, exam });
  S.runId = 'q3-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  if (name) store.set(NAME, name);
  save(); screen = 'play'; pose = 1; intro = null; render();
  howSheet();
}
function introStep(kind) {
  if (kind === 'skip') { intro.step = 7; intro.picked = null; return render(); }
  if (kind === 'play') return startRun((document.getElementById('nameInput')?.value || '').trim().slice(0, 20), intro.exam);
  intro.step += 1; intro.picked = null;
  render();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-act],[data-opt],[data-close],[data-intro],[data-exam]');
  if (!t) return;
  if (t.dataset.go) {
    e.preventDefault();
    const go = t.dataset.go;
    if (go === 'intro') { intro = { step: 0, exam: 0, picked: null }; screen = 'intro'; render(); }
    else if (go === 'resume') { screen = S.phase === 'done' ? 'end' : 'play'; render(); }
    else if (go === 'start') { screen = 'start'; render(); }
    else if (go === 'board') boardSheet(S?.runId);
    else if (go === 'sign') submitScore();
    return;
  }
  if (t.dataset.intro) return introStep(t.dataset.intro);
  if (t.dataset.exam != null && intro && intro.picked == null) {
    intro.picked = Number(t.dataset.exam);
    if (G.EXAM[intro.step - 2].options[intro.picked].ok) intro.exam += 1;
    return render();
  }
  if (t.dataset.opt != null) {
    const r = G.makeClip(S, Number(t.dataset.opt));
    if (!r.ok) return toast(r.msg);
    S = r.state; save(); pose = pose % 3 + 1;
    if (!r.risk) freshClip = r.clip.id;
    return clipResult(r);
  }
  if (t.hasAttribute('data-close')) {
    closeSheet();
    if (t.dataset.close === 'stay') return;
    if (t.dataset.close === 'next' && S.phase === 'done') screen = 'end';
    return render();
  }
  if (t.dataset.act) act(t.dataset.act);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden && !sheet.classList.contains('report')) { closeSheet(); if (screen === 'play') render(); }
});

render();
