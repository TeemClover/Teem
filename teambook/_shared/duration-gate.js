import { getProfile } from './store.js';
import { endingPlan } from './ending-plan.js';

function payoutOf(days) {
  const plan = endingPlan(days);
  const cover = 'ปกปิดท้าย 3 แบบ เลือก 1';
  return plan.episodes
    ? `ตอนจบได้ ${plan.episodes} ตอน + ${cover}`
    : `ตอนจบได้แค่${cover} · สั้นเกินกว่าจะสรุปเรื่อง เล่มนี้จะจบแบบยังไม่จบ`;
}

(function installDurationGate() {
  if (typeof window === 'undefined' || !/^\/new\/?$/.test(location.pathname)) return;
  const template = new URLSearchParams(location.search).get('template') || '';
  const whiteCatRoute = template === 'xircle_xvisor';
  const level = Math.max(1, Math.min(4, Number(getProfile()?.level || 1)));
  const allowed = whiteCatRoute ? [28] : (level >= 2 ? [3, 7, 14, 28] : [3, 7]);
  /* V1.3 public-first starts with the lightest complete experiment. Three
     days is enough to understand Sign -> Seen without asking for a week. */
  let selected = whiteCatRoute ? 28 : 3;
  if (!allowed.includes(selected)) selected = allowed[0];

  window.__xtyDurationOverride = selected;
  if (whiteCatRoute) window.__xtyPresetOverride = 'xircle_xvisor';

  let tries = 0;
  const install = () => {
    const box = document.getElementById('durationPick');
    if (!box || !box.children.length) {
      if (tries++ < 60) setTimeout(install, 50);
      return;
    }
    if (box.dataset.durationGate === '1') return;
    box.dataset.durationGate = '1';
    box.replaceChildren();

    const buttons = allowed.map(days => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pill-choice' + (days === selected ? ' picked' : '');
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', days === selected ? 'true' : 'false');
      button.innerHTML = `<b>${days}</b><small>วัน</small>`;
      button.setAttribute('aria-label', `${days} วัน · ${payoutOf(days)}`);
      button.addEventListener('click', () => {
        selected = days;
        window.__xtyDurationOverride = days;
        buttons.forEach(node => {
          const on = node === button;
          node.classList.toggle('picked', on);
          node.setAttribute('aria-checked', on ? 'true' : 'false');
        });
        renderPayout();
      });
      box.appendChild(button);
      return button;
    });

    /* Length is not just how long the book runs — it is how much ending the
       book earns. Saying that at the moment of choosing is the only place it
       can change the choice. */
    const payout = document.createElement('p');
    payout.className = 'hint';
    payout.style.margin = '10px 0 0';
    payout.id = 'durationPayout';
    box.insertAdjacentElement('afterend', payout);
    const renderPayout = () => { payout.textContent = `เลือก ${selected} วัน · ${payoutOf(selected)}`; };
    renderPayout();

    const note = document.createElement('p');
    note.className = 'hint';
    note.style.margin = '10px 0 0';
    note.textContent = whiteCatRoute
      ? 'เส้นแมวขาวเป็นเล่ม 28 วัน · เส้นนี้เลือกช่วงสั้นกว่านี้ไม่ได้'
      : (level >= 2
        ? `LEVEL ${level} · ปลดสมุด 14 และ 28 วันแล้ว`
        : 'LEVEL 1 · เริ่มได้ที่ 3 หรือ 7 วัน · LEVEL 2 จะปลด 14 และ 28 วัน');
    payout.insertAdjacentElement('afterend', note);
  };

  setTimeout(install, 0);
})();
