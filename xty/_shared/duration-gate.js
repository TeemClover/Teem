import { getProfile } from './store.js';

(function installDurationGate() {
  if (typeof window === 'undefined' || !/^\/xty\/new\/?$/.test(location.pathname)) return;
  const template = new URLSearchParams(location.search).get('template') || '';
  const whiteCatRoute = template === 'xircle_xvisor';
  const level = Math.max(1, Math.min(4, Number(getProfile()?.level || 1)));
  const allowed = whiteCatRoute ? [28] : (level >= 2 ? [3, 7, 14, 28] : [3, 7]);
  let selected = whiteCatRoute ? 28 : 7;
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
      button.addEventListener('click', () => {
        selected = days;
        window.__xtyDurationOverride = days;
        buttons.forEach(node => {
          const on = node === button;
          node.classList.toggle('picked', on);
          node.setAttribute('aria-checked', on ? 'true' : 'false');
        });
      });
      box.appendChild(button);
      return button;
    });

    const note = document.createElement('p');
    note.className = 'hint';
    note.style.margin = '10px 0 0';
    note.textContent = whiteCatRoute
      ? 'เส้นแมวขาวเป็น Quest 28 วัน · Route นี้เลือกช่วงสั้นกว่านี้ไม่ได้'
      : (level >= 2
        ? `LEVEL ${level} · ปลดตี้ 14 และ 28 วันแล้ว`
        : 'LEVEL 1 · เริ่มได้ที่ 3 หรือ 7 วัน · LEVEL 2 จะปลด 14 และ 28 วัน');
    box.insertAdjacentElement('afterend', note);
  };

  setTimeout(install, 0);
})();

/* The white-cat tiles are normal selectable activities on /xty/new/.
   Only the two static tiles on /xty/about/ are secret links to Xircle.
   Older create-page code attached a redirect listener to these two buttons;
   capture the click before that listener, prime the normal picker state, then
   pass the intended activity through a small create override. */
(function keepWhiteCatActivitiesSelectable() {
  if (typeof window === 'undefined' || !/^\/xty\/new\/?$/.test(location.pathname)) return;
  let tries = 0;
  let priming = false;

  const install = () => {
    const box = document.getElementById('activityPick');
    if (!box || !box.children.length) {
      if (tries++ < 60) setTimeout(install, 50);
      return;
    }
    if (box.dataset.whiteCatPickerFix === '1') return;
    box.dataset.whiteCatPickerFix = '1';

    box.addEventListener('click', event => {
      if (priming) return;
      const button = event.target.closest('.activity-choice');
      if (!button || !box.contains(button)) return;
      const label = button.querySelector('b')?.textContent?.trim() || '';
      const special = label === 'นอนให้พอ'
        ? { id: 'sleep', labelTh: 'นอนให้พอ' }
        : (label === 'ดูแลตัวเอง' ? { id: 'wellness', labelTh: 'ดูแลตัวเอง' } : null);

      if (!special) {
        window.__xtyActivityOverride = null;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      /* Prime the original closure with a safe normal activity so its form
         readiness/custom-field logic remains correct, then visually select
         the white-cat activity and let create-party-v2 use the true override. */
      const fallback = [...box.querySelectorAll('.activity-choice')].find(node => {
        const text = node.querySelector('b')?.textContent?.trim() || '';
        return text !== 'นอนให้พอ' && text !== 'ดูแลตัวเอง';
      });
      if (fallback) {
        priming = true;
        fallback.click();
        priming = false;
      }

      window.__xtyActivityOverride = special;
      [...box.querySelectorAll('.activity-choice')].forEach(node => {
        const on = node === button;
        node.classList.toggle('picked', on);
        node.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      const custom = document.getElementById('customField');
      if (custom) custom.hidden = true;
    }, true);
  };

  setTimeout(install, 0);
})();
