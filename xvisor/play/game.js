// X-VISOR QUEST 3.0 · Clip Edition: screens and touch. All rules live in sim.js.
import * as G from './sim.js';

const KEY = 'xvq3-save';
const BEST = 'xvq3-best';
const SEEN = 'xvq3-howto';
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
  del(k) { try { localStorage.removeItem(k); } catch { /* same */ } },
};

let S = G.parseSave(store.get(KEY));
let screen = 'start';
let pose = 1;
let flash = null; // { kind, html } shown once above the moves
let freshClip = 0;

const save = () => store.set(KEY, JSON.stringify(S));
const PILLAR = { eat: 'กิน', move: 'ขยับ', sleep: 'นอน' };
const TOPIC_ICON = { 'เครื่องชั่ง': '⚖️', 'เช้าของพี่': '🌤️', 'แคปแอป': '📱', 'เรื่องเดียว': '🎯', 'ชวนเซฟ': '🔖', 'รูทีน': '🥤',
  'แสงหน้าต่าง': '🪟', 'ตอนต่อ': '🎞️', 'ตอบคอมเมนต์': '💬', 'รีวิวลูกค้า': '🤝', 'ปักลิงก์': '🛒', 'ตอบคำถาม': '❓' };

// ---------- small pieces ----------
function ring(score) {
  const c = 2 * Math.PI * 34;
  const tone = score >= 70 ? 'good' : score < 40 ? 'low' : 'mid';
  return `<div class="ring ${tone}" role="img" aria-label="คะแนนนิสัย ${score} จาก 100">
    <svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="track"/><circle cx="40" cy="40" r="34" class="fill" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"/></svg>
    <b>${score}</b></div>`;
}
function clipCard(clip, isNew) {
  const mine = clip.by === 'me';
  const member = mine ? null : S.team.find((m) => m.id === clip.by);
  const icon = mine ? (TOPIC_ICON[clip.topic] || '🎬') : '🧑‍🤝‍🧑';
  return `<li class="clip p${clip.id % 5}${clip.flag ? ' flag' : ''}${isNew ? ' new' : ''}">
    <span class="clip-ico" aria-hidden="true">${icon}</span>
    <span class="clip-topic">${esc(mine ? clip.topic : member ? member.name : 'ทีม')}</span>
    ${stars(clip.q)}
    <span class="clip-views">${clip.flag ? 'ไม่วิ่ง' : '👁 ' + num(clip.views)}</span>
  </li>`;
}
function bars(history) {
  const max = Math.max(1, ...history.map((h) => h.income));
  return `<div class="bars" role="img" aria-label="รายได้แต่ละเดือน">${history.map((h) => `<i style="--h:${Math.max(4, Math.round(h.income / max * 100))}%"><span>${h.month}</span></i>`).join('')}</div>`;
}
function countUp(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), pre = el.dataset.pre || '';
    if (reduce || to === 0) { el.textContent = pre + num(to); return; }
    const delay = Number(el.dataset.delay || 0), dur = 700, t0 = performance.now() + delay;
    el.textContent = pre + '0';
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      el.textContent = pre + num(to * (1 - Math.pow(1 - p, 3)));
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
  document.body.classList.add('locked');
  countUp(sheet);
  const first = sheet.querySelector('button, a');
  if (first) first.focus({ preventScroll: true });
}
function closeSheet() {
  sheet.hidden = true; sheet.innerHTML = '';
  document.body.classList.remove('locked');
}

// ---------- screens ----------
function startScreen() {
  const best = Number(store.get(BEST) || 0);
  const resume = S && S.phase === 'play' && (S.month > 1 || S.moves < G.MOVES_PER_MONTH);
  app.innerHTML = `
  <section class="start">
    <a class="home" href="/xvisor/">← X-VISOR</a>
    <div class="cover"><img src="/xvisor/play/img/cover.webp" alt="" width="900" height="900" fetchpriority="high"></div>
    <div class="start-copy">
      <p class="tag">QUEST 3.0 · CLIP EDITION</p>
      <h1>คลิปทำงาน<br><span class="grad">แทนพี่</span></h1>
      <p class="lead">12 เดือน เดือนละ 3 ตา ลงคลิปรีวิว ตอบคนทัก ดูแลตัวเอง แล้วดูคลังคลิปของพี่โต</p>
      <ul class="how3">
        <li><b>🎬</b>คลิปดี วิ่งต่อทุกเดือน</li>
        <li><b>💬</b>คนดูทักเข้ามาเอง</li>
        <li><b>🌿</b>ตัวพี่ดี คนยิ่งเชื่อ</li>
      </ul>
      <div class="start-btns">
        ${resume ? `<button class="btn glow" data-go="resume">เล่นต่อ เดือน ${S.month}</button><button class="btn line" data-go="new">เริ่มใหม่</button>`
          : '<button class="btn glow" data-go="new">เริ่มเล่น</button>'}
      </div>
      ${best ? `<p class="best">สถิติของพี่: รายได้รวม ${baht(best)}</p>` : ''}
      <p class="fine">ตัวเลขในเกมเป็นตัวอย่างเพื่ออธิบายหลักคิด ไม่ใช่การรับประกันรายได้ ผลของแต่ละคนไม่เหมือนกัน</p>
      <p class="fine"><a href="/xvisor/play/classic/">เล่นเกมเวอร์ชันเดิม 2.0</a></p>
    </div>
  </section>`;
}

function action(id, icon, title, sub, badge = '', off = false) {
  return `<button class="act${off ? ' off' : ''}" data-act="${id}" type="button"><span class="act-ico" aria-hidden="true">${icon}</span><span class="act-txt"><b>${title}</b><small>${sub}</small></span>${badge ? `<em>${badge}</em>` : ''}</button>`;
}

function playScreen() {
  const score = G.habitScore(S);
  const low = G.lowestHabit(S);
  const canTeach = G.recruitable(S) > 0;
  const teamUp = S.team.some((m) => m.skill < 3);
  const myClips = S.clips.filter((c) => c.by === 'me').length;
  const shelf = [...S.clips].sort((a, b) => b.id - a.id).slice(0, 14);
  const showShop = !S.shop && (S.month >= 3 || myClips >= 3);
  const done = S.moves === 0;
  app.innerHTML = `
  <section class="play">
    <header class="hud">
      <a class="home" href="/xvisor/play/" data-go="start" aria-label="กลับหน้าแรกของเกม">←</a>
      <div class="month"><b>เดือน ${S.month}</b><span>/ ${G.MONTHS}</span>
        <i class="dots" aria-hidden="true">${Array.from({ length: G.MONTHS }, (_, i) => `<u class="${i + 1 < S.month ? 'd' : i + 1 === S.month ? 'c' : ''}"></u>`).join('')}</i></div>
      <button class="money" data-act="stats" type="button" aria-label="ดูสถิติคลิปทั้งทีม"><small>รายได้รวม</small><b>${baht(S.totals.income)}</b></button>
    </header>

    <div class="buddy">
      <img class="bot" src="/xvisor/img/bot-${pose}.webp" alt="" width="372" height="520">
      <p class="say" id="say">${esc(G.advice(S))}</p>
    </div>

    <div class="stats3">
      <div class="habit">${ring(score)}<div class="habit-txt"><b>คะแนนนิสัย</b>
        <span class="pill-row">${['eat', 'move', 'sleep'].map((k) => `<i class="${k === low ? 'low' : ''}" style="--v:${S.habit[k]}%"><u></u>${PILLAR[k]}</i>`).join('')}</span></div></div>
      <div class="chip"><small>ลูกค้าประจำ</small><b>${num(S.customers)}${S.joined ? `<em>+${S.joined}</em>` : ''}</b></div>
      <div class="chip${S.dms ? ' hot' : ''}"><small>คนทักรออยู่</small><b>${num(S.dms)}</b></div>
    </div>

    <div class="shelf-head"><b>คลังคลิป</b><button data-act="stats" type="button">สถิติทั้งทีม ›</button></div>
    ${shelf.length ? `<ul class="shelf">${shelf.map((c) => clipCard(c, c.id === freshClip)).join('')}${S.clips.length > shelf.length ? `<li class="more">+${S.clips.length - shelf.length}</li>` : ''}</ul>`
      : '<p class="shelf-empty">ยังไม่มีคลิป ลงคลิปแรกได้เลย</p>'}

    ${flash ? `<div class="flash ${flash.kind}">${flash.html}</div>` : ''}

    <div class="moves" aria-label="เวลาเดือนนี้ เหลือ ${S.moves} จาก ${G.MOVES_PER_MONTH} ตา"><span>เวลาเดือนนี้</span>${Array.from({ length: G.MOVES_PER_MONTH }, (_, i) => `<i class="${i < S.moves ? 'on' : ''}"></i>`).join('')}</div>

    <div class="acts${done ? ' done' : ''}">
      ${action('clip', '🎬', 'ลงคลิปรีวิว', 'เพิ่มคลิปเข้าคลัง')}
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

function endScreen() {
  const rank = G.finalRank(S);
  const clean = S.clips.filter((c) => !c.flag).length;
  const prev = Number(store.get(BEST) || 0);
  if (S.totals.income > prev) store.set(BEST, String(S.totals.income));
  app.innerHTML = `
  <section class="endgame">
    <img class="bot big" src="/xvisor/img/bot-2.webp" alt="" width="407" height="520">
    <p class="tag">ครบ 12 เดือน</p>
    <h1><span class="grad">${esc(rank.title)}</span></h1>
    <p class="lead">${esc(rank.note)}</p>
    <div class="total"><small>รายได้รวม 12 เดือน</small><b data-count="${S.totals.income}" data-pre="฿">฿0</b>${S.totals.income > prev && prev ? '<em>สถิติใหม่ของพี่</em>' : ''}</div>
    <div class="grid4">
      <div><b>${num(clean)}</b><small>คลิปที่ยังวิ่งอยู่</small></div>
      <div><b>${num(S.totals.views)}</b><small>ยอดวิวรวม</small></div>
      <div><b>${num(S.customers)}</b><small>ลูกค้าประจำ</small></div>
      <div><b>${num(S.team.length)}</b><small>คนในทีมที่ทำคลิปเป็น</small></div>
    </div>
    ${bars(S.history)}
    <div class="recap"><b>12 เรื่องที่พี่ได้ลองทำ</b><ol>${G.LESSONS.map((l) => `<li>${esc(l.t)}</li>`).join('')}</ol></div>
    <a class="btn glow" href="/xvisor/#start">ไปทำคลิปจริงกับคู่หู</a>
    <button class="btn line" data-go="new" type="button">เล่นอีกรอบ</button>
    <p class="fine center">ตัวเลขในเกมเป็นตัวอย่างเพื่ออธิบายหลักคิด ไม่ใช่การรับประกันรายได้ ผลของแต่ละคนไม่เหมือนกัน</p>
    <p class="fine center"><a href="/xvisor/play/classic/">เล่นเกมเวอร์ชันเดิม 2.0</a></p>
  </section>`;
  countUp(app);
}

let shown = '';
function render() {
  if (screen === 'play' && S && S.phase === 'done') screen = 'end';
  if (screen === 'start' || !S) { screen = 'start'; startScreen(); }
  else if (screen === 'end') endScreen();
  else playScreen();
  // stay where the thumb is while playing; only a new screen starts from the top
  if (shown !== screen + (S ? S.month : 0)) window.scrollTo(0, 0);
  shown = screen + (S ? S.month : 0);
}

// ---------- sheets ----------
function howSheet() {
  openSheet(`
    <img class="bot mid" src="/xvisor/img/bot-1.webp" alt="" width="372" height="520">
    <h2>ผมเป็นคู่หูของพี่ครับ</h2>
    <ol class="howlist">
      <li><b>เดือนละ 3 ตา</b>แตะการ์ดด้านล่าง ตาละ 1 อย่าง</li>
      <li><b>ลงคลิปรีวิว</b>เลือกคำตอบ 1 ข้อ คลิปดีได้ดาวเยอะ</li>
      <li><b>กดจบเดือน</b>คลิปออกไปวิ่ง คนทักเข้ามา</li>
    </ol>
    <button class="btn glow" data-close type="button">เข้าใจแล้ว เริ่มเลย</button>`, 'center');
}

function quizSheet() {
  const quiz = G.currentQuiz(S);
  openSheet(`
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
}

function statsSheet() {
  const mine = S.clips.filter((c) => c.by === 'me');
  const top = [...S.clips].filter((c) => c.views > 0).sort((a, b) => b.views - a.views).slice(0, 5);
  openSheet(`
    <p class="tag">สถิติคลิปทั้งทีม</p>
    <h2>คลังคลิปคือทรัพย์สิน</h2>
    <div class="grid4">
      <div><b>${num(mine.length)}</b><small>คลิปของพี่</small></div>
      <div><b>${num(S.clips.length - mine.length)}</b><small>คลิปของทีม</small></div>
      <div><b>${num(S.totals.views)}</b><small>ยอดวิวรวม</small></div>
      <div><b>${num(S.totals.dms)}</b><small>คนทักรวม</small></div>
    </div>
    ${S.team.length ? `<table class="team"><thead><tr><th>ทีม</th><th>คลิป</th><th>ยอดวิว</th><th>ลูกค้า</th></tr></thead><tbody>${S.team.map((m) => `<tr><td>${esc(m.name)} ${stars(m.skill + 1)}</td><td>${num(m.clips)}</td><td>${num(m.views)}</td><td>${num(m.customers)}</td></tr>`).join('')}</tbody></table>`
      : '<p class="note">ยังไม่มีทีม มีลูกค้าประจำครบ 3 คน จะมีคนอยากทำคลิปตามพี่</p>'}
    ${top.length ? `<p class="sub-h">คลิปที่วิ่งดีที่สุด</p><ul class="toplist">${top.map((c) => `<li><span>${esc(c.by === 'me' ? c.topic : c.topic)}</span>${stars(c.q)}<b>${num(c.views)}</b></li>`).join('')}</ul>` : ''}
    ${S.history.length ? `<p class="sub-h">รายได้แต่ละเดือน</p>${bars(S.history)}` : ''}
    <button class="btn glow" data-close type="button">กลับไปเล่นต่อ</button>`, 'stats');
}

function reportSheet(r) {
  const top = r.clips.slice(0, 4);
  const max = Math.max(1, ...top.map((c) => c.views));
  const last = S.phase === 'done';
  openSheet(`
    <p class="tag">จบเดือน ${r.month}</p>
    <h2>คลิปของพี่ออกไปวิ่ง</h2>
    ${top.length ? `<ul class="run">${top.map((c, i) => `<li style="--d:${i * 0.12}s;--w:${Math.max(8, Math.round(c.views / max * 100))}%"><span>${esc(c.topic)} ${stars(c.q)}</span><i></i><b data-count="${c.views}" data-delay="${i * 120}">0</b></li>`).join('')}</ul>${r.clips.length > top.length ? `<p class="note">และอีก ${r.clips.length - top.length} คลิปที่ยังวิ่งอยู่</p>` : ''}`
      : '<p class="note">เดือนนี้ยังไม่มีคลิปวิ่ง ลงคลิปก่อนนะครับ</p>'}
    <div class="grid3 step" style="--d:.5s">
      <div><b data-count="${r.viewsMe + r.viewsTeam}" data-delay="500">0</b><small>ยอดวิว</small></div>
      <div><b data-count="${r.dmsNew}" data-delay="650">0</b><small>คนทักใหม่</small></div>
      <div><b data-count="${r.online}" data-delay="800">0</b><small>สั่งผ่านลิงก์</small></div>
    </div>
    <div class="people step" style="--d:.8s"><span>ลูกค้าใหม่ <b>${num(r.joined)}</b></span><span>ต่อรูทีน <b>${num(r.renewed)}</b></span><span class="${r.lost ? 'lost' : ''}">หายไป <b>${num(r.lost)}</b></span></div>
    <div class="income step" style="--d:1.1s">
      <div class="row"><span>ขายส่วนตัว ${baht(r.personalBaht)} · ขั้น ${esc(r.tier)}</span><b>${baht(r.retail)}</b></div>
      <div class="row"><span>จากทีมที่พี่สอน</span><b>${baht(r.mentoring)}</b></div>
      <div class="row sum"><span>รายได้เดือนนี้</span><b data-count="${r.income}" data-pre="฿" data-delay="1200">฿0</b></div>
    </div>
    <div class="lesson step" style="--d:1.4s"><img src="/xvisor/img/bot-3.webp" alt="" width="393" height="520"><div><b>${esc(r.lesson.t)}</b><p>${esc(r.lesson.b)}</p></div></div>
    <button class="btn glow step" style="--d:1.6s" data-close="next" type="button">${last ? 'ดูสรุป 12 เดือน' : 'ไปเดือน ' + (r.month + 1) + ' ▶'}</button>`, 'report');
}

// ---------- moves ----------
function did(result, okHtml, kind = 'ok') {
  if (!result.ok) { toast(result.msg); return false; }
  S = result.state; save();
  pose = pose % 3 + 1;
  flash = { kind, html: okHtml };
  render();
  return true;
}
function act(id) {
  if (!S) return;
  if (id === 'stats') return statsSheet();
  if (id === 'end') {
    const r = G.endMonth(S);
    if (!r.ok) return toast(r.msg);
    S = r.state; save();
    return reportSheet(r.report);
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

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-act],[data-opt],[data-close]');
  if (!t) return;
  if (t.dataset.go) {
    e.preventDefault();
    if (t.dataset.go === 'new') {
      S = G.newGame((Date.now() % 2147483647) | 0); save(); screen = 'play'; pose = 1; render();
      if (!store.get(SEEN)) { store.set(SEEN, '1'); howSheet(); }
    } else if (t.dataset.go === 'resume') { screen = S.phase === 'done' ? 'end' : 'play'; render(); }
    else if (t.dataset.go === 'start') { screen = 'start'; render(); }
    return;
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
    if (t.dataset.close === 'next' && S.phase === 'done') screen = 'end';
    return render();
  }
  if (t.dataset.act) act(t.dataset.act);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet.hidden && !sheet.classList.contains('report')) { closeSheet(); render(); }
});

render();
