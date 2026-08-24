/* TeamBook 1.5 — canonical Public detail status owner.

   Public preview paints the page shell from the same immutable memberLimit.
   This module adds live status metadata from the detail API. It never guesses
   capacity: the detail API has already resolved legacy books to 5 and newer
   books to their stored 1..11 limit.

   The preview metadata stays hidden until this canonical detail payload is
   ready, so a capacity number is painted exactly once — never as an interim
   N/5 value that a later renderer has to replace.
*/

import { bookCapacity } from './book-capacity-v15.js';

const DETAIL_API = '/api/teambook-public-detail-v13';
let detailReady = false;
let copyQueued = false;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

function modeCopy(mode) {
  return mode === 'confirm' ? 'ต้องมีคนเห็น' : 'เชื่อใจกัน';
}

function statusCopy(status) {
  if (status === 'green') return { label: 'วันนี้ผ่านแล้ว', cls: 'green' };
  if (status === 'yellow') return { label: 'รอเห็นแล้ว', cls: 'yellow' };
  return { label: 'วันนี้ยังเงียบ', cls: 'gray' };
}

function installStyle() {
  if (document.getElementById('tb-public-detail-v15-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-public-detail-v15-style';
  style.textContent = `
    /* Inline preview metadata used to expose an intermediate fixed-5 count.
       Keep it non-visible; the canonical detail grid below is the only visible
       owner of occupancy. */
    #meta{visibility:hidden!important;min-height:0!important;margin:0!important}
    .tb-public-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:13px}
    .tb-public-detail-item{padding:10px 11px;border:1px solid var(--xty-border);border-radius:13px;background:rgba(255,255,255,.55)}
    .tb-public-detail-item small{display:block;color:var(--xty-muted);font-size:9px;font-weight:800;letter-spacing:.05em;margin-bottom:2px}.tb-public-detail-item b{font-size:12px}
    .tb-public-status-line{display:flex;align-items:center;gap:7px;margin:7px 0 2px;font-size:12px;font-weight:800}
    .tb-status-dot{width:9px;height:9px;padding:0!important;border:0!important;border-radius:50%!important;box-shadow:0 0 0 2px rgba(0,0,0,.045)}
    .tb-status-dot.green{background:#55b56a!important}.tb-status-dot.yellow{background:#e9b949!important}.tb-status-dot.gray{background:#a7a7a7!important}
    .tb-member-status-list{display:grid;gap:7px;margin-top:10px}.tb-member-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.52);font-size:11px}
    .tb-member-status .left{display:flex;align-items:center;gap:7px;min-width:0}.tb-member-status b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tb-member-status em{font-style:normal;color:var(--xty-muted);font-size:10px}
    #cover .avatar-cover{box-sizing:border-box!important}
    @media(max-width:560px){
      #members.preview-members:has(.preview-member:nth-child(5)){display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;width:100%!important;overflow:visible!important;padding-inline:0!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member{width:auto!important;min-width:0!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .tb-public-member-visual{width:min(100%,50px)!important;max-width:50px!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member b{font-size:10px!important;line-height:1.25!important}
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px!important;line-height:1.25!important}
      body:has(#view:not([hidden])) main.wrap{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}
      .join-zone{bottom:max(14px,env(safe-area-inset-bottom))!important;box-sizing:border-box!important}
    }
  `;
  document.head.appendChild(style);
}

async function loadDetail(code) {
  const response = await fetch(`${DETAIL_API}?code=${encodeURIComponent(code)}`, {
    headers: { accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'PUBLIC_DETAIL_FAILED');
  return data.detail;
}

function renderDetail(detail) {
  const hero = document.querySelector('.preview-hero > div:last-child');
  const oldMeta = document.getElementById('meta');
  const members = document.getElementById('members');
  if (!hero || !oldMeta || !members) return false;

  const capacity = bookCapacity(detail);
  if (!capacity) return false;

  document.querySelector('.preview-hero .kicker')?.remove();
  hero.querySelectorAll(':scope > .tb-public-status-line, :scope > .tb-public-detail-grid').forEach(node => node.remove());
  document.getElementById('tbPublicMemberStatuses')?.remove();
  oldMeta.innerHTML = '';

  const state = statusCopy(detail.status);
  oldMeta.insertAdjacentHTML('beforebegin', `<div class="tb-public-status-line"><span class="tb-status-dot ${state.cls}" aria-hidden="true"></span><span>${esc(state.label)}${detail.hasYesterdayPending ? ' · มีเหลืองค้างจากเมื่อวาน' : ''}</span></div>`);
  oldMeta.insertAdjacentHTML('afterend', `<div class="tb-public-detail-grid">
    <div class="tb-public-detail-item"><small>โหมด</small><b>${esc(modeCopy(detail.verificationMode))}</b></div>
    <div class="tb-public-detail-item"><small>เจ้าของสมุด</small><b>${esc(detail.ownerAlias)}</b></div>
    <div class="tb-public-detail-item"><small>คนในสมุด</small><b>${capacity.memberCount}/${capacity.memberLimit} คน</b></div>
    <div class="tb-public-detail-item"><small>อัปเดตทั้งหมด</small><b>${Number(detail.updateCount || 0)} อัปเดต</b></div>
  </div>`);

  const statusList = document.createElement('div');
  statusList.id = 'tbPublicMemberStatuses';
  statusList.className = 'tb-member-status-list';
  statusList.innerHTML = (detail.memberStatuses || []).map(member => {
    const s = statusCopy(member.status);
    return `<div class="tb-member-status"><span class="left"><span class="tb-status-dot ${s.cls}"></span><b>${esc(member.alias)}</b></span><em>${esc(s.label)}</em></div>`;
  }).join('');
  members.insertAdjacentElement('afterend', statusList);
  detailReady = true;
  return true;
}

async function installDetail() {
  if (!/^\/public\/p\/?$/.test(location.pathname)) return;
  installStyle();
  const code = new URLSearchParams(location.search).get('c') || '';
  if (!/^\d{5}$/.test(code)) return;

  let detail;
  try { detail = await loadDetail(code); } catch { return; }

  const tryRender = () => {
    if (detailReady) return;
    const view = document.getElementById('view');
    if (!view || view.hidden) return;
    renderDetail(detail);
  };
  tryRender();
  if (!detailReady) {
    const observer = new MutationObserver(() => {
      tryRender();
      if (detailReady) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  }
}

const OLD_MODE = new Set(['ต้อง เห็นแล้ว', 'ต้องเห็นแล้ว', 'ต้องมีคนเห็นแล้ว']);
function normalizeVisibleCopy() {
  document.querySelectorAll('#verificationPick .preset-choice b, #verificationLine, .v13-create-defaults span').forEach(node => {
    if (OLD_MODE.has(String(node.textContent || '').trim())) node.textContent = 'ต้องมีคนเห็น';
  });
}
function scheduleCopy() {
  if (copyQueued) return;
  copyQueued = true;
  queueMicrotask(() => { copyQueued = false; normalizeVisibleCopy(); });
}
function installCopyGuard() {
  normalizeVisibleCopy();
  const targets = [
    document.getElementById('verificationPick'),
    document.getElementById('verificationLine')?.parentElement,
    document.getElementById('v13CreateBook'),
  ].filter(Boolean);
  targets.forEach(target => new MutationObserver(scheduleCopy).observe(target, { childList:true, subtree:true, characterData:true }));
}

installStyle();
installDetail();
installCopyGuard();
