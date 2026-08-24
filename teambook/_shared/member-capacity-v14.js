/* TeamBook 1.5 — create-page people capacity control.

   Canon:
   - every book has a fixed member limit 1..11, owner included;
   - old books with no stored memberLimit are resolved by the server as 5;
   - PET never consumes a people slot;
   - Home/Public/book displays render server-resolved capacity directly.
*/

import {
  DEFAULT_MEMBER_LIMIT as DEFAULT,
  MAX_MEMBER_LIMIT as MAX,
  MIN_MEMBER_LIMIT as MIN,
  normalizeMemberLimit,
} from './member-limit.js';

const $ = id => document.getElementById(id);

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
    value = normalizeMemberLimit(value + Number(button.dataset.delta || 0));
    sync();
  }));
  sync();

}

installCreateStepper();
