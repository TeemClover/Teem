/* TeamBook V1.2 — additive gameplay layer.
   It does not replace the current card cosmetics. It adds the parts a book
   needs after play: evidence-first Ending Art and a visible shelf of finished
   books. */

import {
  allParties, getParty, isActiveParty, partyIdentity, refreshParty,
} from './store.js';
import { avatarById } from './avatars.js';
import { cardById } from './cards.js';
import { cardMarkup } from './card-ui.js';

if (!globalThis.__teambookV12Installed) {
  globalThis.__teambookV12Installed = true;
  installStyles();
  const path = location.pathname;
  if (/^\/p(?:\/|$)/.test(path)) installPartyEnding();
  if (/^\/collection(?:\/|$)/.test(path)) installFinishedShelf();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[ch]));
}

function installStyles() {
  if (document.getElementById('teambook-v12-style')) return;
  const style = document.createElement('style');
  style.id = 'teambook-v12-style';
  style.textContent = `
    .tb12-ending{position:relative;overflow:hidden}
    .tb12-ending::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.24;background:
      linear-gradient(90deg,transparent 31px,rgba(91,141,255,.14) 32px,transparent 33px),
      repeating-linear-gradient(0deg,transparent 0 27px,rgba(98,135,106,.09) 28px 29px)}
    .tb12-ending>*{position:relative}
    .tb12-ending-head{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
    .tb12-ending-head .title{margin:3px 0 5px;font-size:clamp(22px,5vw,28px)}
    .tb12-state{display:inline-flex;padding:6px 10px;border:1px solid var(--xty-border);border-radius:999px;background:rgba(255,254,248,.82);font:800 10px/1 var(--sans);letter-spacing:.1em}
    .tb12-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:15px 0}
    .tb12-fact{padding:10px 8px;border:1px solid var(--xty-border);border-radius:13px;background:rgba(255,254,248,.78);text-align:center}
    .tb12-fact b{display:block;font-size:19px;line-height:1.1}.tb12-fact small{display:block;margin-top:4px;color:var(--xty-muted);font-size:10.5px;line-height:1.3}
    .tb12-conflict{margin:12px 0;padding:10px 12px;border-left:3px solid var(--xty-red);border-radius:8px;background:rgba(228,91,91,.07);font-size:12.5px;line-height:1.55}
    .tb12-candidates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:14px}
    .tb12-candidate{min-width:0;padding:7px;border:1px solid var(--xty-border);border-radius:15px;background:rgba(255,254,248,.88)}
    .tb12-candidate.is-selected{outline:3px solid rgba(85,181,106,.28);border-color:var(--xty-green)}
    .tb12-art{position:relative;width:100%;aspect-ratio:63/88;border-radius:10px;overflow:hidden;background:
      radial-gradient(circle at 50% 30%,#fffdf3,#f5edcf 68%,#e8ddb9)}
    .tb12-art img{display:block;width:100%;height:100%;object-fit:cover}
    .tb12-placeholder{position:absolute;inset:0;display:grid;place-items:center;padding:12px;text-align:center;color:var(--xty-muted);font-size:12px;line-height:1.45}
    .tb12-placeholder b{display:block;color:var(--xty-ink);font-size:22px;margin-bottom:5px}
    .tb12-candidate h3{font-size:13px;line-height:1.35;margin:8px 2px 2px}.tb12-candidate p{margin:0 2px;color:var(--xty-muted);font-size:10.5px}
    .tb12-vote{display:flex;gap:6px;align-items:center;margin-top:7px}.tb12-vote .btn{width:100%;min-height:34px!important;padding:0 8px!important;font-size:11px!important}
    .tb12-vote .mine{border-color:var(--xty-green);background:rgba(85,181,106,.08)}
    .tb12-ending-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
    .tb12-engine-note{margin-top:10px;padding:10px 12px;border:1px dashed var(--xty-border);border-radius:12px;background:rgba(255,254,248,.6);font-size:12px;line-height:1.55;color:var(--xty-muted)}
    .tb12-shelf{margin:18px 0}.tb12-shelf-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:12px}.tb12-shelf-head h2{margin:0;font-size:21px}
    .tb12-book-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:11px}
    .tb12-book{display:grid;grid-template-columns:74px minmax(0,1fr);gap:12px;align-items:center;padding:10px;border:1px solid var(--xty-border);border-radius:15px;background:var(--xty-surface);text-decoration:none;color:var(--xty-ink)}
    .tb12-book-cover{width:74px;aspect-ratio:63/88;overflow:hidden;border-radius:9px;background:#f2ead0;display:grid;place-items:center}
    .tb12-book-cover img,.tb12-book-cover .animal-card{display:block;width:100%!important;height:100%!important;object-fit:cover!important}
    .tb12-book-copy{min-width:0}.tb12-book-copy b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.tb12-book-copy small{display:block;margin-top:4px;color:var(--xty-muted);font-size:11px;line-height:1.35}
    @media(max-width:560px){.tb12-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.tb12-candidates{grid-template-columns:1fr;gap:14px}.tb12-candidate{display:grid;grid-template-columns:116px minmax(0,1fr);gap:10px}.tb12-candidate .tb12-art{grid-row:1/5}.tb12-candidate h3{margin-top:4px}.tb12-vote{align-self:end}.tb12-book-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function codeFromPage() {
  const value = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(value) ? value : '';
}

function authHeaders(code, withJson = false) {
  const headers = { accept: 'application/json' };
  if (withJson) headers['content-type'] = 'application/json';
  const token = partyIdentity(code)?.token || '';
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function endingApi(code, action = '', patch = {}) {
  const post = !!action;
  let response;
  try {
    response = await fetch(`/api/teambook-ending?code=${encodeURIComponent(code)}`, {
      method: post ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: authHeaders(code, post),
      body: post ? JSON.stringify({ action, ...patch }) : undefined,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
  const data = await response.json().catch(() => ({}));
  return response.ok ? data : { ...data, ok: false, error: data.error || `HTTP_${response.status}` };
}

function endingPanel() {
  let panel = document.getElementById('tb12EndingMemory');
  if (panel) return panel;
  const anchor = document.getElementById('endingCard') || document.getElementById('view');
  if (!anchor) return null;
  panel = document.createElement('section');
  panel.id = 'tb12EndingMemory';
  panel.className = 'card tb12-ending';
  panel.hidden = true;
  anchor.insertAdjacentElement(anchor.id === 'endingCard' ? 'afterend' : 'beforeend', panel);
  return panel;
}

function fact(value, label) {
  const safe = value == null || Number.isNaN(Number(value)) ? '—' : String(value);
  return `<div class="tb12-fact"><b>${esc(safe)}</b><small>${esc(label)}</small></div>`;
}

function stateCopy(evidence) {
  const state = evidence?.book?.state || '';
  if (state === 'DISSOLVED') return {
    badge: 'CLOSED EARLY',
    title: 'สมุดนี้ปิดแล้ว และสิ่งที่เกิดขึ้นยังถูกเก็บไว้',
    body: 'TeamBook จะไม่แต่งให้กลายเป็นความสำเร็จที่ไม่ได้เกิดขึ้นจริง',
  };
  return {
    badge: 'BOOK COMPLETE',
    title: 'สมุดเล่มนี้ปิดแล้ว แต่เรื่องนี้ยังไปต่อได้',
    body: 'ฉากจบเก็บสิ่งที่เกิดขึ้นจริงในเล่มนี้ ไม่ใช่ถ้วยรางวัล และไม่ตัดสินว่าชีวิตต้องจบตรงนี้',
  };
}

function directionLabel(candidate) {
  return ({ group:'คนในเล่ม', moment:'ช่วงที่มีความหมาย', objects:'ของที่เหลืออยู่' })[candidate?.direction] || 'ความทรงจำ';
}

function candidateMarkup(candidate, data) {
  const count = Number(data?.votes?.counts?.[candidate.id] || 0);
  const mine = data?.votes?.mine === candidate.id;
  const selected = data?.selectedCandidate === candidate.id;
  const canVote = data.status === 'READY';
  const canFinalize = data?.me?.role === 'lead' && data.status === 'READY';
  const art = candidate.imageUrl
    ? `<img src="${esc(candidate.imageUrl)}" alt="ภาพความทรงจำแบบ ${esc(candidate.id)}" loading="lazy" decoding="async">`
    : `<div class="tb12-placeholder"><div><b>${esc(candidate.id)}</b>${esc(candidate.titleTh || directionLabel(candidate))}</div></div>`;
  return `<article class="tb12-candidate${selected ? ' is-selected' : ''}" data-ending-candidate="${esc(candidate.id)}">`
    + `<div class="tb12-art">${art}</div>`
    + `<h3>${esc(candidate.id)} · ${esc(candidate.titleTh || directionLabel(candidate))}</h3>`
    + `<p>${esc(directionLabel(candidate))}${selected ? ' · ใช้เป็นปกแล้ว' : ''}</p>`
    + (canVote ? `<div class="tb12-vote"><button class="btn ghost sm${mine ? ' mine' : ''}" type="button" data-ending-vote="${esc(candidate.id)}">${mine ? 'เลือกแล้ว' : 'เลือกแบบนี้'} · ${count}</button></div>` : '')
    + (canFinalize ? `<div class="tb12-vote"><button class="btn ghost sm" type="button" data-ending-finalize="${esc(candidate.id)}">ใช้แบบนี้เป็นปก</button></div>` : '')
    + `</article>`;
}

function errorText(code) {
  return ({
    OFFLINE: 'เชื่อมระบบฉากจบไม่ได้ ลองใหม่อีกครั้ง',
    ENDING_IMAGE_PROVIDER_NOT_CONFIGURED: 'ระบบคิดฉากพร้อมแล้ว แต่ Image Provider ของ Ending ยังไม่ได้ตั้งค่า',
    ENDING_ALREADY_GENERATING: 'กำลังสร้างภาพอยู่ รอสักครู่แล้วกดดึงใหม่',
    ENDING_IMAGE_PROVIDER_FAILED: 'ผู้ให้บริการภาพตอบกลับไม่สำเร็จ',
    ENDING_PROVIDER_BAD_IMAGE: 'ภาพที่ได้กลับมาไม่ใช่ไฟล์ภาพที่ TeamBook รับได้',
    ENDING_VOTE_TIED: 'ผลโหวตเสมอกัน เจ้าของสมุดเลือกแบบที่ต้องการได้โดยตรง',
    ENDING_NO_VOTES: 'ยังไม่มีใครเลือกภาพ',
  })[code] || `ยังทำรายการนี้ไม่ได้ · ${code || 'UNKNOWN'}`;
}

async function renderEnding(data) {
  const panel = endingPanel();
  if (!panel || !data?.evidence) return;
  const copy = stateCopy(data.evidence);
  const facts = data.evidence.facts || {};
  const book = data.evidence.book || {};
  const conflict = (data.evidence.conflicts || [])[0];
  const candidates = data.candidates?.length ? data.candidates : data.briefs || [];
  const generateable = data.me?.role === 'lead' && ['BRIEF_READY', 'FAILED'].includes(data.status);

  panel.hidden = false;
  panel.innerHTML = `<div class="tb12-ending-head"><div><span class="tb12-state">${esc(copy.badge)}</span><h2 class="title">${esc(copy.title)}</h2><p class="whisper" style="margin:0">${esc(copy.body)}</p></div></div>`
    + `<div class="tb12-facts">${fact(facts.validCommits, 'ลงชื่อที่นับได้')}${fact(book.activeDays, 'วันที่มีหลักฐาน')}${fact(book.targetDays, 'วันที่ตั้งไว้')}${fact(book.calendarDays, 'ช่วงวันจริง')}</div>`
    + (conflict ? `<div class="tb12-conflict"><b>ข้อมูลเวลาไม่ตรงกัน จึงไม่เดาแทนคน</b><br>${esc(conflict.note || '')}</div>` : '')
    + `<div class="tb12-candidates">${candidates.map(candidate => candidateMarkup(candidate, data)).join('')}</div>`
    + `<div class="tb12-ending-actions">`
    + (generateable && data.generatorReady ? `<button class="btn gold" type="button" id="tb12GenerateEnding">สร้างภาพความทรงจำ 3 แบบ</button>` : '')
    + (data.status === 'GENERATING' ? `<button class="btn ghost" type="button" id="tb12RefreshEnding">กำลังสร้างภาพ… ดึงสถานะใหม่</button>` : '')
    + `</div>`
    + (generateable && !data.generatorReady ? `<div class="tb12-engine-note">Evidence Brain และ Art Brief พร้อมแล้ว แต่เครื่องสร้างภาพยังไม่ได้เชื่อมกับ production. ตอนนี้ TeamBook จะไม่ใส่ภาพปลอมหรือสุ่มภาพที่ไม่อิงเล่มนี้</div>` : '')
    + `<div class="tb12-engine-note">กติกาของ Engine: Event สำคัญต้องมี <b>Evidence of Meaning</b> มากกว่า Evidence of Change · ปกฉากจบคือความทรงจำ ไม่ใช่ระดับความหายากหรือรางวัล</div>`;

  const legacyCover = document.getElementById('endingCoverPanel');
  if (legacyCover) legacyCover.hidden = data.generatorReady || ['READY', 'FINALIZED', 'GENERATING'].includes(data.status);

  panel.querySelector('#tb12GenerateEnding')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    event.currentTarget.textContent = 'กำลังสร้าง 3 ภาพ…';
    const result = await endingApi(codeFromPage(), 'generate');
    if (!result.ok) {
      event.currentTarget.disabled = false;
      event.currentTarget.textContent = 'สร้างภาพความทรงจำ 3 แบบ';
      showEndingNotice(errorText(result.error));
      return;
    }
    await renderEnding(result);
  });

  panel.querySelector('#tb12RefreshEnding')?.addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    const result = await endingApi(codeFromPage());
    if (result.ok) await renderEnding(result);
    else showEndingNotice(errorText(result.error));
  });

  panel.querySelectorAll('[data-ending-vote]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.endingVote;
    button.disabled = true;
    const result = await endingApi(codeFromPage(), 'vote', { candidateId: id });
    if (result.ok) await renderEnding(result);
    else { button.disabled = false; showEndingNotice(errorText(result.error)); }
  }));

  panel.querySelectorAll('[data-ending-finalize]').forEach(button => button.addEventListener('click', async () => {
    const id = button.dataset.endingFinalize;
    button.disabled = true;
    const result = await endingApi(codeFromPage(), 'finalize', { candidateId: id });
    if (!result.ok) {
      button.disabled = false;
      showEndingNotice(errorText(result.error));
      return;
    }
    await refreshParty(codeFromPage()).catch(() => null);
    await renderEnding(result);
    showEndingNotice('เก็บภาพนี้เป็นปกความทรงจำของเล่มแล้ว');
  }));
}

function showEndingNotice(text) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = text;
    toast.classList.add('on');
    setTimeout(() => toast.classList.remove('on'), 3600);
    return;
  }
  const panel = endingPanel();
  if (!panel) return;
  let note = panel.querySelector('.tb12-action-note');
  if (!note) { note = document.createElement('div'); note.className = 'tb12-engine-note tb12-action-note'; panel.appendChild(note); }
  note.textContent = text;
}

function installPartyEnding() {
  const code = codeFromPage();
  if (!code) return;
  let attempts = 0;
  const open = async () => {
    const party = getParty(code);
    if (!party || isActiveParty(party)) return false;
    const result = await endingApi(code);
    if (result.ok) await renderEnding(result);
    return true;
  };
  if (open()) return;
  const timer = setInterval(async () => {
    attempts += 1;
    if (await open() || attempts > 20) clearInterval(timer);
  }, 300);
}

function partyCoverMarkup(party) {
  if (party.coverType === 'image') {
    return `<img src="/api/teambook/party/${encodeURIComponent(party.code)}/cover" alt="ปกความทรงจำ ${esc(party.name)}" loading="lazy" decoding="async">`;
  }
  const card = cardById(party.leadCardId || party.coverValue);
  if (card) return cardMarkup(card);
  if (party.coverType === 'avatar') {
    let snapshot = { species: 'orange_cat', color: 'green' };
    try { snapshot = { ...snapshot, ...JSON.parse(party.coverValue || '{}') }; } catch {}
    const avatar = avatarById(snapshot.species);
    return `<img src="${esc(avatar.art)}" alt="" loading="lazy" decoding="async">`;
  }
  return `<img src="/assets/card-back.webp" alt="" loading="lazy" decoding="async">`;
}

function renderFinishedShelf(parties) {
  let section = document.getElementById('tb12FinishedShelf');
  if (!section) {
    section = document.createElement('section');
    section.id = 'tb12FinishedShelf';
    section.className = 'card tb12-shelf';
    const main = document.querySelector('main.wrap');
    const firstCard = main?.querySelector(':scope > section.card');
    if (!main) return;
    if (firstCard) main.insertBefore(section, firstCard);
    else main.appendChild(section);
  }
  if (!parties.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  section.innerHTML = `<div class="tb12-shelf-head"><div><span class="label">FINISHED BOOKS</span><h2>สมุดที่ปิดแล้ว</h2></div><small class="whisper">${parties.length} เล่ม</small></div>`
    + `<div class="tb12-book-grid">${parties.map(party => {
      const state = String(party.state || '').toUpperCase();
      const status = state === 'COMPLETED' ? 'เล่มนี้จบครบช่วงแล้ว' : 'ปิดก่อนกำหนด · ประวัติยังอยู่';
      return `<a class="tb12-book" href="/p/?c=${encodeURIComponent(party.code)}"><span class="tb12-book-cover">${partyCoverMarkup(party)}</span><span class="tb12-book-copy"><b>${esc(party.name)}</b><small>${esc(party.activity || 'เรื่องที่เขียนร่วมกัน')}</small><small>${esc(status)}</small></span></a>`;
    }).join('')}</div>`;
}

async function installFinishedShelf() {
  const terminal = () => allParties()
    .filter(party => ['COMPLETED', 'DISSOLVED'].includes(String(party.state || '').toUpperCase()))
    .sort((a, b) => new Date(b.endAt || b.updatedAt || 0) - new Date(a.endAt || a.updatedAt || 0));
  renderFinishedShelf(terminal());
  await Promise.all(terminal().slice(0, 12).map(party => refreshParty(party.code).catch(() => null)));
  renderFinishedShelf(terminal());
}
