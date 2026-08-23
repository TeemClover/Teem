/* TeamBook V1.3 public metadata/status presentation.
   Public is already implied by the lane/route, so cards spend that space on
   information that helps a stranger decide whether to open the book. */

const LIST_API = '/api/teambook-public-list-v13';
const DETAIL_API = '/api/teambook-public-detail-v13';
let homeData = null;
let homePromise = null;
let queued = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
}

function statusCopy(status) {
  if (status === 'green') return { label: 'วันนี้ผ่านแล้ว', cls: 'green' };
  if (status === 'yellow') return { label: 'รอเห็นแล้ว', cls: 'yellow' };
  return { label: 'วันนี้ยังเงียบ', cls: 'gray' };
}

function modeCopy(mode) {
  return mode === 'confirm' ? 'ต้องเห็นแล้ว' : 'เชื่อใจกัน';
}

function codeFromCard(card) {
  try {
    const href = card.querySelector('a[href*="/public/p/"]')?.href || '';
    return new URL(href, location.origin).searchParams.get('c') || '';
  } catch { return ''; }
}

function installStyle() {
  if (document.getElementById('tb-v13-public-status-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-v13-public-status-style';
  style.textContent = `
    .tb-public-meta{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 9px}
    .tb-public-meta span{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border:1px solid var(--xty-border);border-radius:999px;background:rgba(255,255,255,.62);font-size:10px;font-weight:750;color:var(--xty-muted)}
    .tb-status-dot{width:9px;height:9px;padding:0!important;border:0!important;border-radius:50%!important;box-shadow:0 0 0 2px rgba(0,0,0,.045)}
    .tb-status-dot.green{background:#55b56a!important}.tb-status-dot.yellow{background:#e9b949!important}.tb-status-dot.gray{background:#a7a7a7!important}
    .tb-public-status-line{display:flex;align-items:center;gap:7px;margin:7px 0 2px;font-size:12px;font-weight:800}
    .tb-public-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:13px}
    .tb-public-detail-item{padding:10px 11px;border:1px solid var(--xty-border);border-radius:13px;background:rgba(255,255,255,.55)}
    .tb-public-detail-item small{display:block;color:var(--xty-muted);font-size:9px;font-weight:800;letter-spacing:.05em;margin-bottom:2px}.tb-public-detail-item b{font-size:12px}
    .tb-member-status-list{display:grid;gap:7px;margin-top:10px}.tb-member-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.52);font-size:11px}
    .tb-member-status .left{display:flex;align-items:center;gap:7px;min-width:0}.tb-member-status b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tb-member-status em{font-style:normal;color:var(--xty-muted);font-size:10px}
    @media(max-width:420px){.tb-public-detail-grid{grid-template-columns:1fr 1fr}.tb-public-meta span{font-size:9.5px}}
  `;
  document.head.appendChild(style);
}

async function loadHomeData() {
  if (homeData) return homeData;
  if (!homePromise) {
    homePromise = fetch(LIST_API, { headers: { accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'PUBLIC_LIST_FAILED');
        homeData = data.parties || [];
        return homeData;
      })
      .catch(error => { homePromise = null; throw error; });
  }
  return homePromise;
}

function metadataMarkup(party) {
  const status = statusCopy(party.status);
  return `<div class="tb-public-status-line"><span class="tb-status-dot ${status.cls}" aria-hidden="true"></span><span>${esc(status.label)}</span></div>`
    + `<div class="tb-public-meta">`
    + `<span>${esc(modeCopy(party.verificationMode))}</span>`
    + `<span>เจ้าของ ${esc(party.ownerAlias || party.lead?.alias || 'เจ้าของสมุด')}</span>`
    + `<span>${Number(party.memberCount || 0)}/5 คน</span>`
    + `<span>${Number(party.updateCount || 0)} อัปเดต</span>`
    + `</div>`;
}

async function decorateHome() {
  if (location.pathname !== '/') return;
  const cards = [...document.querySelectorAll('#homePublicList .home-public-party')];
  if (!cards.length) return;
  let parties;
  try { parties = await loadHomeData(); } catch { return; }
  const byCode = new Map(parties.map(party => [String(party.code), party]));
  cards.forEach(card => {
    card.querySelectorAll('.v13-public-label').forEach(node => node.remove());
    const code = codeFromCard(card);
    const party = byCode.get(code);
    if (!party) return;
    let meta = card.querySelector('.tb-public-card-details');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'tb-public-card-details';
      const activity = card.querySelector('p');
      if (activity) activity.insertAdjacentElement('afterend', meta);
      else card.querySelector('h2')?.insertAdjacentElement('afterend', meta);
    }
    meta.innerHTML = metadataMarkup(party);
  });
}

async function loadDetail(code) {
  const response = await fetch(`${DETAIL_API}?code=${encodeURIComponent(code)}`, {
    headers: { accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'PUBLIC_DETAIL_FAILED');
  return data.detail;
}

function renderDetailMeta(detail) {
  const hero = document.querySelector('.preview-hero > div:last-child');
  const oldMeta = document.getElementById('meta');
  if (!hero || !oldMeta) return;
  document.querySelector('.preview-hero .kicker')?.remove();
  const status = statusCopy(detail.status);
  oldMeta.innerHTML = '';
  oldMeta.insertAdjacentHTML('beforebegin', `<div class="tb-public-status-line"><span class="tb-status-dot ${status.cls}" aria-hidden="true"></span><span>${esc(status.label)}${detail.hasYesterdayPending ? ' · มีเหลืองค้างจากเมื่อวาน' : ''}</span></div>`);
  oldMeta.insertAdjacentHTML('afterend', `<div class="tb-public-detail-grid">
    <div class="tb-public-detail-item"><small>โหมด</small><b>${esc(modeCopy(detail.verificationMode))}</b></div>
    <div class="tb-public-detail-item"><small>เจ้าของสมุด</small><b>${esc(detail.ownerAlias)}</b></div>
    <div class="tb-public-detail-item"><small>คนในสมุด</small><b>${detail.memberCount}/${detail.maxMembers} คน</b></div>
    <div class="tb-public-detail-item"><small>อัปเดตทั้งหมด</small><b>${detail.updateCount} อัปเดต</b></div>
  </div>`);

  const members = document.getElementById('members');
  if (members && !document.getElementById('tbPublicMemberStatuses')) {
    const list = document.createElement('div');
    list.id = 'tbPublicMemberStatuses';
    list.className = 'tb-member-status-list';
    list.innerHTML = detail.memberStatuses.map(member => {
      const s = statusCopy(member.status);
      return `<div class="tb-member-status"><span class="left"><span class="tb-status-dot ${s.cls}"></span><b>${esc(member.alias)}</b></span><em>${esc(s.label)}</em></div>`;
    }).join('');
    members.insertAdjacentElement('afterend', list);
  }
}

async function decorateDetail() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code) || document.body.dataset.v13PublicStatusReady === '1') return;
  const view = document.getElementById('view');
  if (!view || view.hidden) return;
  document.body.dataset.v13PublicStatusReady = '1';
  try {
    const detail = await loadDetail(code);
    renderDetailMeta(detail);
  } catch {
    delete document.body.dataset.v13PublicStatusReady;
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    installStyle();
    decorateHome();
    decorateDetail();
  });
}

function install() {
  installStyle();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
