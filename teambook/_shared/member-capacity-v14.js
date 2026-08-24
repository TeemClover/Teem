/* TeamBook 1.4 — per-book people capacity.
   Canon: 1..11 people, default 5. PET never consumes a people slot.
   Board renders only real people + PET + one quiet open-slot card. */

import { cardById } from './cards.js';
import { speciesById } from './avatars.js';

const MIN = 1;
const MAX = 11;
const DEFAULT = 5;
const $ = id => document.getElementById(id);
const clamp = value => Math.min(MAX, Math.max(MIN, Math.floor(Number(value || DEFAULT)) || DEFAULT));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));

function installStyle() {
  if ($('tb-member-capacity-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-member-capacity-v14-style';
  style.textContent = `
    .tb-capacity-step{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 0 4px}
    .tb-capacity-copy{min-width:0}.tb-capacity-copy b{display:block;font-size:16px}.tb-capacity-copy small{display:block;margin-top:4px;color:var(--xty-muted);line-height:1.5}
    .tb-capacity-control{display:grid;grid-template-columns:44px minmax(76px,auto) 44px;align-items:center;border:1px solid var(--xty-border);border-radius:999px;background:var(--xty-paper);overflow:hidden;flex:none}
    .tb-capacity-control button{width:44px;height:44px;border:0;background:transparent;font-size:22px;cursor:pointer}
    .tb-capacity-control button:disabled{opacity:.28;cursor:default}
    .tb-capacity-value{font-weight:950;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}
    .tb-open-seat{min-height:0!important;aspect-ratio:63/88;border:1.5px dashed rgba(38,65,52,.28)!important;background:rgba(255,255,255,.42)!important;box-shadow:none!important;display:grid!important;place-items:center!important;padding:10px!important;text-align:center;color:var(--xty-muted);font-size:12px;font-weight:850;line-height:1.45}
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
    <div class="tb-capacity-copy"><b>สมุดเล่มนี้รับกี่คน?</b><small>แนะนำ 5 คน · เริ่มคนเดียวก็ได้ · สูงสุด 11 คน</small></div>
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
        if (method === 'POST' && url.pathname === '/api/teambook-v12' && url.searchParams.get('action') === 'create' && typeof init.body === 'string') {
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
    const response = await fetch(`/api/teambook-member-limit-v14?code=${encodeURIComponent(wanted.join(','))}`, { credentials:'same-origin', cache:'no-store' });
    const data = await response.json();
    return data?.books || {};
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
  if (card) return { art: card.art || card.imageFull || card.image || '', color: card.color || member.avatarColor || 'green', isCard:true };
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
  if (!code || !seats) return;
  installStyle();
  const capacity = (await capacityForCodes([code]))[code] || { memberLimit:DEFAULT, memberCount:0, remaining:DEFAULT };
  let scheduled = false;

  const paint = () => {
    scheduled = false;
    const party = cachedParty(code);
    if (party) renderExtraMembers(seats, party);

    const limit = clamp(capacity.memberLimit);
    const count = Math.max(0, Number(capacity.memberCount || party?.members?.length || 0));
    const remaining = Math.max(0, limit - count);
    const desired = remaining > 0 ? `สมุดเปิดรับอีก ${remaining} คน` : '';
    const legacyOpen = [...seats.querySelectorAll(':scope > .seat.open:not(.pet-card):not(.tb-open-seat)')];
    let open = seats.querySelector(':scope > .tb-open-seat');

    if (legacyOpen.length) legacyOpen.forEach(node => node.remove());

    if (remaining > 0) {
      if (!open) {
        open = document.createElement('div');
        open.className = 'seat tb-open-seat';
        seats.appendChild(open);
      }
      if (open.textContent !== desired) open.textContent = desired;
      const aria = `สมุดเปิดรับอีก ${remaining} คน`;
      if (open.getAttribute('aria-label') !== aria) open.setAttribute('aria-label', aria);
      if ($('seatHint')?.textContent) $('seatHint').textContent = '';
    } else {
      open?.remove();
      if ($('seatHint') && $('seatHint').textContent !== 'สมุดเต็มแล้ว') $('seatHint').textContent = 'สมุดเต็มแล้ว';
    }

    const boardAria = `คนในสมุด ${count} จาก ${limit} คน และเพื่อนร่วมทาง`;
    if (seats.getAttribute('aria-label') !== boardAria) seats.setAttribute('aria-label', boardAria);
  };

  const requestPaint = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(paint);
  };

  requestPaint();
  const observer = new MutationObserver(records => {
    const meaningful = records.some(record => [...record.addedNodes, ...record.removedNodes]
      .some(node => node.nodeType === 1
        && !node.classList?.contains('tb-open-seat')
        && !node.classList?.contains('tb-capacity-extra-member')));
    if (meaningful) {
      seats.dataset.tbCapacityExtras = '';
      requestPaint();
    }
  });
  observer.observe(seats, { childList:true });
}

/* Public/Home cards now receive memberCount and maxMembers from the canonical
   public-list API. Do not walk arbitrary ancestors and rewrite every n/n text:
   that old compatibility pass could climb from a book row to the whole Home
   and overwrite the unrelated “ช่องสมุดของคุณ” counters three times during
   boot. Per-book people capacity stays scoped to create and the live book. */

installCreateStepper();
installBookOpenSeat();
