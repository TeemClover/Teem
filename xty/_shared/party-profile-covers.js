import { getParty, getProfile, partyIdentity, availableOwnedCards, committedToday } from './store.js';
import { cardById as xtyCardById, cardDescriptorTh } from './cards.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';
import { cardSVG } from '../../core7/js/art.js';

const code = new URLSearchParams(location.search).get('c');
const BACK = '/core7/assets/myclover-back.webp';
let busy = false;

if (/^\d{5}$/.test(code || '')) install();

function unlockedCore7Ids() {
  try {
    const ids = JSON.parse(localStorage.getItem('c7:collection') || '[]');
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids)].filter(id => {
      const card = typeof id === 'string' ? core7CardById(id) : null;
      return !!card && !card.generic && String(card.id || '').startsWith('fh-');
    });
  } catch { return []; }
}

function install() {
  injectStyle();
  document.addEventListener('click', interceptCoverSave, true);
  const observer = new MutationObserver(schedule);
  const view = document.getElementById('view');
  if (view) observer.observe(view, { childList: true, subtree: true });
  schedule();
}

function injectStyle() {
  if (document.getElementById('xty-party-profile-cover-style')) return;
  const s = document.createElement('style');
  s.id = 'xty-party-profile-cover-style';
  s.textContent = `
    .xty-profile-click{cursor:pointer}.xty-profile-click:focus-visible{outline:3px solid rgba(91,141,255,.45);outline-offset:3px}
    .xty-core7-seat,.xty-back-seat{width:100%;aspect-ratio:63/88;overflow:hidden;border-radius:14px}
    .xty-core7-seat svg,.xty-back-seat img{display:block;width:100%;height:100%;object-fit:cover}
    .post .who.xty-profile-click{text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}
  `;
  document.head.appendChild(s);
}

let scheduled = false;
function schedule() {
  if (scheduled) return; scheduled = true;
  requestAnimationFrame(() => { scheduled = false; syncLeadCover(); syncProfileLinks(); syncCoverTools(); syncRichEvents(); });
}

function profileHref(userId) { return `/xty/u/?c=${encodeURIComponent(code)}&m=${encodeURIComponent(userId)}`; }

function syncProfileLinks() {
  const p = getParty(code); const seats = document.getElementById('seats');
  if (!p || !seats) return;
  const lead = p.members.find(m => m.role === 'lead') || null;
  const others = p.members.filter(m => m.role !== 'lead');
  const slots = [lead, others[0] || null, others[1] || null, others[2] || null, others[3] || null];
  [...seats.children].slice(0, 5).forEach((node, index) => {
    const member = slots[index]; if (!member) return;
    node.classList.add('xty-profile-click'); node.tabIndex = 0; node.setAttribute('role', 'link');
    node.setAttribute('aria-label', `ดูโปรไฟล์ ${member.alias}`);
    node.onclick = () => { location.href = profileHref(member.userId); };
    node.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = profileHref(member.userId); } };
  });

  const posts = [...document.querySelectorAll('#log > .post')];
  const log = Array.isArray(p.log) ? p.log : [];
  posts.forEach((node, index) => {
    const post = log[index]; if (!post) return;
    const member = p.members.find(m => m.userId === post.userId); const who = node.querySelector('.who');
    if (!member || !who) return;
    who.classList.add('xty-profile-click'); who.onclick = () => { location.href = profileHref(member.userId); };
  });
}

function syncLeadCover() {
  const p = getParty(code); const seats = document.getElementById('seats');
  if (!p || !seats || !p.members?.length) return;
  const lead = p.members.find(m => m.role === 'lead'); if (!lead) return;
  const first = seats.children[0]; if (!first) return;
  const mark = committedToday(p).has(lead.userId) ? '✓' : '○';
  const signature = `${p.coverType || ''}|${p.coverValue || p.leadCardId || ''}|${lead.alias}|${mark}`;
  if (first.dataset.coverV3 === signature) return;

  if (p.coverType === 'image' && p.coverValue) {
    first.className = 'seat-card-wrap xty-profile-click'; first.dataset.coverV3 = signature;
    const src = String(p.coverValue).replace(/"/g, '&quot;');
    first.innerHTML = `<div class="xty-image-seat"><img src="${src}" alt="ปกฉากจบ" loading="lazy" decoding="async"></div>`
      + `<span class="seat-card-name">${lead.alias} · ${mark}</span>`;
  } else if (p.coverType === 'core7_card' && p.coverValue) {
    const card = core7CardById(p.coverValue); if (!card) return;
    first.className = 'seat-card-wrap xty-profile-click'; first.dataset.coverV3 = signature;
    first.innerHTML = `<div class="xty-core7-seat">${cardSVG(card.id, { width: 300, showNumber: true })}</div>`
      + `<span class="seat-card-name">${lead.alias} · ${mark}</span>`;
  } else if (p.coverType === 'card_back') {
    first.className = 'seat-card-wrap xty-profile-click'; first.dataset.coverV3 = signature;
    first.innerHTML = `<div class="xty-back-seat"><img src="${BACK}" alt="หลังการ์ด myClover"></div>`
      + `<span class="seat-card-name">${lead.alias} · ${mark}</span>`;
  }
}

function currentToken() {
  try { const map = JSON.parse(localStorage.getItem('mc_xty_tokens') || '{}'); const entry = map?.[code]; return typeof entry === 'string' ? entry : (entry?.token || ''); }
  catch { return ''; }
}
function remember(result) {
  if (!result?.party?.code) return;
  try { const list = JSON.parse(localStorage.getItem('mc_xty_parties') || '[]'); const arr = Array.isArray(list) ? list : []; const i = arr.findIndex(x => x?.code === result.party.code); if (i >= 0) arr[i] = result.party; else arr.unshift(result.party); localStorage.setItem('mc_xty_parties', JSON.stringify(arr)); } catch {}
}
async function callCover(body) {
  const headers = { accept: 'application/json', 'content-type': 'application/json' }; const token = currentToken(); if (token) headers.authorization = `Bearer ${token}`;
  try {
    const r = await fetch(`/api/xty-party-finish?op=cover-v2&code=${encodeURIComponent(code)}`, { method: 'POST', credentials: 'same-origin', headers, body: JSON.stringify({ ...body, profileId: getProfile()?.id || '' }) });
    const data = await r.json().catch(() => ({})); return r.ok ? data : { ...data, error: data.error || `HTTP_${r.status}` };
  } catch { return { error: 'OFFLINE' }; }
}

function syncCoverTools() {
  const p = getParty(code); const select = document.getElementById('leadSelect'); const button = document.getElementById('leadBtn');
  if (!p || !select || !button) return;
  const me = partyIdentity(code); const member = p.members.find(m => m.userId === me?.userId);
  if (!member || member.role !== 'lead') return;
  const core7Ids = unlockedCore7Ids();
  const signature = [p.coverType, p.coverValue, p.leadCardId, core7Ids.join(',')].join('|');
  if (select.dataset.coverV3 === signature) return;
  select.dataset.coverV3 = signature; select.disabled = false; button.disabled = false; select.innerHTML = '';

  const add = (value, text, selected = false) => { const o = document.createElement('option'); o.value = value; o.textContent = text; o.selected = selected; select.appendChild(o); };
  add('v3:back', 'หลังการ์ด myClover', p.coverType === 'card_back');
  const xtyCards = availableOwnedCards({ role: 'lead', exceptPartyCode: code });
  if (p.leadCardId) { const current = xtyCardById(p.leadCardId); if (current && !xtyCards.some(c => c.cardId === current.cardId)) xtyCards.unshift(current); }
  xtyCards.forEach(card => add(`v3:xty:${card.cardId}`, cardDescriptorTh(card), p.coverType === 'card' && p.leadCardId === card.cardId));
  if (p.coverType === 'core7_card' && p.coverValue && !core7Ids.includes(p.coverValue)) core7Ids.push(p.coverValue);
  core7Ids.forEach(id => { const card = core7CardById(id); if (card) add(`v3:core7:${id}`, `${card.en} · ${card.th}`, p.coverType === 'core7_card' && p.coverValue === id); });
}

async function interceptCoverSave(event) {
  const target = event.target?.closest?.('#leadBtn'); if (!target) return;
  event.preventDefault(); event.stopImmediatePropagation(); if (busy) return;
  const value = document.getElementById('leadSelect')?.value || ''; let payload;
  if (value === 'v3:back') payload = { coverType: 'card_back' };
  else if (value.startsWith('v3:xty:')) payload = { coverType: 'card', leadCardId: value.slice(7) };
  else if (value.startsWith('v3:core7:')) payload = { coverType: 'core7_card', core7CardId: value.slice(9) };
  else return;
  busy = true; target.disabled = true; const result = await callCover(payload); busy = false; target.disabled = false;
  const toast = document.getElementById('toast');
  if (result.error) { if (toast) { toast.textContent = result.error === 'CARD_IN_USE' ? 'การ์ดใบนี้กำลังใช้กับตี้อื่นอยู่' : 'ยังเปลี่ยนการ์ดประจำตี้ไม่ได้'; toast.classList.add('on'); setTimeout(() => toast.classList.remove('on'), 2800); } return; }
  remember(result); location.reload();
}

function dataOf(event) { return event?.data && typeof event.data === 'object' ? event.data : {}; }
function richText(event) {
  const d = dataOf(event);
  if (event.type === 'PARTY_CREATED' && d.coverName) return `${d.alias || 'หัวตี้'} ตั้งตี้นี้ · ใช้ ${d.coverName} เป็นการ์ดประจำตี้`;
  if (event.type === 'LEAD_CARD_CHANGED') return `${d.alias || 'หัวตี้'} เปลี่ยนการ์ดประจำตี้จาก ${d.fromName || d.from || 'ใบเดิม'} → ${d.toName || d.to || 'ใบใหม่'}`;
  return '';
}
function syncRichEvents() {
  const p = getParty(code); if (!p) return;
  const events = (p.events || []).filter(e => richText(e)); const counters = new Map();
  document.querySelectorAll('#log > .party-event').forEach(node => {
    const type = node.dataset.event || ''; const n = counters.get(type) || 0; const matches = events.filter(e => e.type === type); const event = matches[n]; counters.set(type, n + 1);
    if (!event) return;
    const copy = node.querySelector('.event-copy'); const text = richText(event);
    if (copy && copy.textContent !== text) copy.textContent = text;
  });
}
