/* TeamBook 1.4 — per-book people capacity.
   Canon: 1..11 people, default 5. PET never consumes a people slot.
   Board renders only real people + PET + one quiet open-slot card. */

const MIN = 1;
const MAX = 11;
const DEFAULT = 5;
const $ = id => document.getElementById(id);
const clamp = value => Math.min(MAX, Math.max(MIN, Math.floor(Number(value || DEFAULT)) || DEFAULT));

function installStyle() {
  if ($('tb-member-capacity-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-member-capacity-v14-style';
  style.textContent = `
    .tb-capacity-step{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 0 4px}
    .tb-capacity-copy{min-width:0}.tb-capacity-copy b{display:block;font-size:16px}.tb-capacity-copy small{display:block;margin-top:4px;color:var(--xty-muted);line-height:1.5}
    .tb-capacity-control{display:grid;grid-template-columns:44px minmax(76px,auto) 44px;align-items:center;border:1px solid var(--xty-border);border-radius:999px;background:var(--xty-paper);overflow:hidden;flex:none}
    .tb-capacity-control button{width:44px;height:44px;border:0;background:transparent;font-size:22px;cursor:pointer}
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

  /* create-party-v2 is old code and should not own another visible UI layer.
     Inject only the selected capacity into its outgoing create payload. */
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
    seats.querySelector('.tb-open-seat')?.remove();
    const realMemberCount = seats.querySelectorAll('.seat:not(.pet-seat), .member-seat:not(.pet-seat)').length
      || capacity.memberCount;
    const remaining = Math.max(0, clamp(capacity.memberLimit) - realMemberCount);
    if (remaining > 0) {
      const open = document.createElement('div');
      open.className = 'seat tb-open-seat';
      open.setAttribute('aria-label', `สมุดเปิดรับอีก ${remaining} คน`);
      open.textContent = `สมุดเปิดรับอีก ${remaining} คน`;
      seats.appendChild(open);
      if ($('seatHint')) $('seatHint').textContent = '';
    } else if ($('seatHint')) {
      $('seatHint').textContent = 'สมุดเต็มแล้ว';
    }
    seats.setAttribute('aria-label', `คนในสมุด ${realMemberCount} จาก ${capacity.memberLimit} คน และเพื่อนร่วมทาง`);
  };
  const requestPaint = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(paint);
  };
  requestPaint();
  const observer = new MutationObserver(requestPaint);
  observer.observe(seats, { childList:true });
}

function codeFromLink(link) {
  try {
    const url = new URL(link.href, location.origin);
    return url.searchParams.get('c') || '';
  } catch { return ''; }
}

function replaceCountText(root, info) {
  if (!root || !info) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue || '';
    if (!/\b\d+\s*\/\s*\d+\b/.test(text)) continue;
    node.nodeValue = text.replace(/\b\d+\s*\/\s*\d+\b/g, `${info.memberCount}/${info.memberLimit}`)
      .replace(/เปิดอยู่(?=\s*·?\s*\d+\/\d+)/, info.full ? 'เต็มแล้ว' : 'เปิดอยู่');
  }
}

async function syncVisibleBookCounts() {
  if (location.pathname !== '/' && !/^\/public\/?$/.test(location.pathname)) return;
  const links = [...document.querySelectorAll('a[href*="?c="],a[href*="&c="]')];
  const pairs = links.map(link => [link, codeFromLink(link)]).filter(([, code]) => /^\d{5}$/.test(code));
  const info = await capacityForCodes(pairs.map(([, code]) => code));
  for (const [link, code] of pairs) {
    let root = link;
    for (let i = 0; i < 5 && root.parentElement; i += 1) {
      if (root.matches?.('article,.card,.home-public-party,.public-book,.party-card')) break;
      root = root.parentElement;
    }
    replaceCountText(root, info[code]);
  }
}

installCreateStepper();
installBookOpenSeat();
if (location.pathname === '/' || /^\/public\/?$/.test(location.pathname)) {
  requestAnimationFrame(() => syncVisibleBookCounts());
  window.addEventListener('pageshow', () => syncVisibleBookCounts(), { passive:true });
}
