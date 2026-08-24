/* TeamBook 1.5 — per-book people capacity UI.

   Canon:
   - every book has a fixed member limit 1..11, owner included;
   - old books with no stored memberLimit are resolved by the server as 5;
   - PET never consumes a people slot;
   - Home/Public list capacity is NOT owned here anymore;
   - /p uses the server-resolved limit and the latest party member list.
*/

import { cardById } from './cards.js';
import { speciesById } from './avatars.js';

const MIN = 1;
const MAX = 11;
const DEFAULT = 5;
const $ = id => document.getElementById(id);
const clamp = value => Math.min(MAX, Math.max(MIN, Math.floor(Number(value || DEFAULT)) || DEFAULT));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));

function installStyle() {
  if ($('tb-member-capacity-v15-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-member-capacity-v15-style';
  style.textContent = `
    .tb-capacity-step{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 0 4px}
    .tb-capacity-copy{min-width:0}.tb-capacity-copy b{display:block;font-size:16px}.tb-capacity-copy small{display:block;margin-top:4px;color:var(--xty-muted);line-height:1.5}
    .tb-capacity-control{display:grid;grid-template-columns:44px minmax(76px,auto) 44px;align-items:center;border:1px solid var(--xty-border);border-radius:999px;background:var(--xty-paper);overflow:hidden;flex:none}
    .tb-capacity-control button{width:44px;height:44px;border:0;background:transparent;font-size:22px;cursor:pointer}
    .tb-capacity-control button:disabled{opacity:.28;cursor:default}
    .tb-capacity-value{font-weight:950;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}
    .tb-open-seat{min-height:0!important;aspect-ratio:63/88;border:1.5px dashed rgba(38,65,52,.28)!important;background:rgba(255,255,255,.42)!important;box-shadow:none!important;display:grid!important;place-items:center!important;padding:10px!important;text-align:center;color:var(--xty-muted);font-size:12px;font-weight:850;line-height:1.45}
    #seatHint[data-capacity-ready="0"]{visibility:hidden!important}
    @media(max-width:420px){.tb-capacity-step{align-items:flex-start}.tb-capacity-control{grid-template-columns:40px minmax(68px,auto) 40px}.tb-capacity-control button{width:40px;height:42px}}
  `;
  document.head.appendChild(style);
}

function installCreateStepper() {
  if (location.pathname !== '/new/' && location.pathname !== '/new') return;
  const visibility = $('visibilityPick')?.closest('.notebook-card');
  if (!visibility || $('tbMemberCapacity')) return;
  installStyle();

  let value = DEFAULT;
  globalThis.__teambookMemberLimit = value;
  const row = document.createElement('div');
  row.className = 'tb-capacity-step';
  row.id = 'tbMemberCapacity';
  row.innerHTML = `
    <div class="tb-capacity-copy"><b>สมุดเล่มนี้รับกี่คน?</b><small>แนะนำ 5 คน · เริ่มคนเดียวก็ได้ · สูงสุด 11 คน · นับเจ้าของสมุดด้วย</small></div>
    <div class="tb-capacity-control" role="group" aria-label="จำนวนคนในสมุด">
      <button type="button" data-delta="-1" aria-label="ลดจำนวนคน">−</button>
      <span class="tb-capacity-value">5 คน</span>
      <button type="button" data-delta="1" aria-label="เพิ่มจำนวนคน">+</button>
    </div>`;
  visibility.insertBefore(row, $('visibilityPick'));
  const label = row.querySelector('.tb-capacity-value');
  const sync = () => {
    label.textContent = `${value} คน`;
    globalThis.__teambookMemberLimit = value;
    row.querySelector('[data-delta="-1"]').disabled = value <= MIN;
    row.querySelector('[data-delta="1"]').disabled = value >= MAX;
  };
  row.querySelectorAll('button[data-delta]').forEach(button => button.addEventListener('click', () => {
    value = clamp(value + Number(button.dataset.delta || 0));
    sync();
  }));
  sync();

  if (!globalThis.__teambookCapacityFetchWrapped) {
    globalThis.__teambookCapacityFetchWrapped = true;
    const previousFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = async function teambookCapacityFetch(input, init = {}) {
      try {
        const url = new URL(typeof input === 'string' ? input : input?.url || '', location.origin);
        const method = String(init.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
        if (method === 'POST' && url.pathname === '/api/teambook-v12'
            && url.searchParams.get('action') === 'create' && typeof init.body === 'string') {
          const body = JSON.parse(init.body);
          init = { ...init, body: JSON.stringify({ ...body, memberLimit: clamp(globalThis.__teambookMemberLimit) }) };
        }
      } catch {}
      return previousFetch(input, init);
    };
  }
}

async function capacityForCodes(codes) {
  const wanted = [...new Set(codes.filter(code => /^\d{5}$/.test(code)))];
  if (!wanted.length) return {};
  try {
    const response = await fetch(`/api/teambook-member-limit-v14?code=${encodeURIComponent(wanted.join(','))}`, {
      credentials:'same-origin', cache:'no-store', headers:{ accept:'application/json' },
    });
    const data = await response.json();
    return response.ok && data?.books ? data.books : {};
  } catch { return {}; }
}

function currentCode() {
  const code = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(code) ? code : '';
}

function cachedParty(code) {
  try {
    const list = JSON.parse(localStorage.getItem('teambook_books_v1') || '[]');
    return Array.isArray(list) ? list.find(book => book?.code === code) || null : null;
  } catch { return null; }
}

function ictDayKey(value = Date.now()) {
  const date = new Date(value);
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

function memberPortrait(member) {
  const card = cardById(String(member?.avatar || '').toUpperCase());
  if (card) return { art: card.imageFull || card.art || card.image || '', color: card.color || member.avatarColor || 'green', isCard:true };
  const species = speciesById(member?.avatar) || speciesById('orange_cat');
  return { art: species?.art || '', color: member?.avatarColor || 'green', isCard:false };
}

function renderExtraMembers(seats, party) {
  const members = Array.isArray(party?.members) ? party.members : [];
  const extras = members.slice(5, MAX);
  const signature = extras.map(member => `${member.userId}|${member.alias}|${member.avatar}|${member.avatarColor}`).join('~');
  if (seats.dataset.tbCapacityExtras === signature) return;

  seats.querySelectorAll(':scope > .tb-capacity-extra-member').forEach(node => node.remove());
  const petNode = [...seats.children].find(node => node.classList.contains('pet-card'))
    || [...seats.children].findLast?.(node => !node.classList.contains('tb-open-seat'))
    || null;
  const today = ictDayKey();
  const done = new Set((party?.log || []).filter(post =>
    post?.kind === 'commit' && !post?.retracted && ictDayKey(post.sentAt) === today
  ).map(post => post.userId));

  extras.forEach((member, offset) => {
    const portrait = memberPortrait(member);
    const node = document.createElement('div');
    node.className = 'seat xty-card member tb-capacity-extra-member';
    node.dataset.userId = member.userId || '';
    const committed = done.has(member.userId);
    node.innerHTML = `
      <span class="slot-label">MEMBER ${offset + 6}</span>
      <div class="av member-avatar${portrait.isCard ? ' is-card' : ''}" data-color="${esc(portrait.color)}">${portrait.art ? `<img src="${esc(portrait.art)}" alt="" loading="lazy" decoding="async">` : ''}</div>
      <div class="al" title="${esc(member.alias)}">${esc(member.alias)}</div>
      <div class="rl">สมาชิก</div>
      <div class="commit-state" aria-label="${committed ? 'ลงชื่อแล้ว' : 'ยังไม่ได้ลงชื่อ'}">${committed ? '✓' : '○'}</div>`;
    seats.insertBefore(node, petNode);
  });
  seats.dataset.tbCapacityExtras = signature;
}

async function installBookOpenSeat() {
  if (!/^\/p\/?$/.test(location.pathname)) return;
  const code = currentCode();
  const seats = $('seats');
  const hint = $('seatHint');
  if (!code || !seats) return;
  installStyle();
  if (hint) hint.dataset.capacityReady = '0';

  const info = (await capacityForCodes([code]))[code];
  if (!info) {
    if (hint) {
      hint.textContent = 'ยังอ่านจำนวนคนของสมุดไม่สำเร็จ';
      hint.dataset.capacityReady = '1';
    }
    return;
  }
  const limit = clamp(info.memberLimit);
  let scheduled = false;
  let painting = false;

  const paint = () => {
    scheduled = false;
    if (painting) return;
    painting = true;
    const party = cachedParty(code);
    if (party) renderExtraMembers(seats, party);

    /* Member list is live and may change after the capacity endpoint response.
       Use the latest party membership when available; the limit is immutable. */
    const partyCount = Array.isArray(party?.members) ? party.members.length : null;
    const count = Math.max(0, Number.isFinite(partyCount) ? partyCount : Number(info.memberCount || 0));
    const remaining = Math.max(0, limit - count);
    const legacyOpen = [...seats.querySelectorAll(':scope > .seat.open:not(.pet-card):not(.tb-open-seat)')];
    legacyOpen.forEach(node => node.remove());

    let open = seats.querySelector(':scope > .tb-open-seat');
    if (remaining > 0) {
      if (!open) {
        open = document.createElement('div');
        open.className = 'seat tb-open-seat';
        seats.appendChild(open);
      }
      const text = `สมุดเปิดรับอีก ${remaining} คน`;
      if (open.textContent !== text) open.textContent = text;
      open.setAttribute('aria-label', text);
      if (hint) hint.textContent = `มี ${count}/${limit} คน · ยังรับได้อีก ${remaining} คน`;
    } else {
      open?.remove();
      if (hint) hint.textContent = `สมุดเต็มแล้ว · ${count}/${limit} คน`;
    }
    if (hint) hint.dataset.capacityReady = '1';
    seats.setAttribute('aria-label', `คนในสมุด ${count} จาก ${limit} คน และเพื่อนร่วมทาง`);
    painting = false;
  };

  const schedule = () => {
    if (scheduled || painting) return;
    scheduled = true;
    queueMicrotask(paint);
  };

  schedule();
  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      if (record.target === hint) return true;
      return [...record.addedNodes, ...record.removedNodes].some(node =>
        node.nodeType === 1
        && !node.classList?.contains('tb-open-seat')
        && !node.classList?.contains('tb-capacity-extra-member'));
    });
    if (relevant) {
      seats.dataset.tbCapacityExtras = '';
      schedule();
    }
  });
  observer.observe(seats, { childList:true });
  if (hint) observer.observe(hint, { childList:true, characterData:true, subtree:true });
}

installCreateStepper();
installBookOpenSeat();
