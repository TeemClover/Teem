/* ═══════════════════════════════════════════════════════════════
   Choosing an activity, the way you'd flip to a tab in a notebook.

   Twenty choices at once is a wall. Four bookmark tabs, five behind
   each, is a notebook. The tabs are the whole navigation: no scroll
   hunting, no search, and on a phone five cards land as 2 + 2 + 1
   rather than a column you have to travel down.
   ═══════════════════════════════════════════════════════════════ */

import {
  COLORS, COLOR_IDS, choicesFor, colorOf, isCustomId,
  CUSTOM_LABEL_MAX_CHARS, SUCCESS_RULE_PROMPT, SUCCESS_RULE_MAX_CHARS,
} from './book-mode.js';

const TAB_ART = Object.freeze({
  red: '/xty/assets/decor/brand/activity-fire.webp',
  green: '/xty/assets/decor/brand/activity-leaf.webp',
  blue: '/xty/assets/decor/brand/activity-water.webp',
  silver: '/xty/assets/decor/brand/activity-craft.webp',
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Mount the picker into `mount`.
 *
 * `onChange` is handed the current selection every time it moves, in the
 * shape the model already understands, so a caller never assembles one
 * by hand: { activityId, label, description, color, custom, complete }.
 */
export function mountActivityPicker(mount, {
  value = null,
  askSuccessRule = false,
  successRule = '',
  onChange = () => {},
} = {}) {
  if (!mount) return null;
  mount.textContent = '';
  mount.classList.add('act-picker');

  let activeColor = colorOf(value) || COLOR_IDS[0];
  let activityId = value || null;
  let customLabel = '';
  let rule = String(successRule || '');

  const tabs = el('div', 'act-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'หมวดกิจกรรม');

  const grid = el('div', 'act-grid');
  grid.setAttribute('role', 'radiogroup');
  grid.setAttribute('aria-label', 'เลือกกิจกรรม');

  const customField = el('div', 'act-custom field');
  customField.hidden = true;
  const customLabelEl = el('label', null, 'เขียนกิจกรรมของคุณ');
  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.maxLength = CUSTOM_LABEL_MAX_CHARS;
  customInput.placeholder = 'เช่น ซ้อมกีตาร์';
  customInput.id = `actCustom-${Math.random().toString(36).slice(2, 8)}`;
  customLabelEl.htmlFor = customInput.id;
  customField.append(customLabelEl, customInput);

  const ruleField = el('div', 'act-rule field');
  ruleField.hidden = !askSuccessRule;
  const ruleInput = document.createElement('input');
  ruleInput.type = 'text';
  ruleInput.maxLength = SUCCESS_RULE_MAX_CHARS;
  ruleInput.placeholder = 'เช่น อ่าน 10 หน้า';
  ruleInput.value = rule;
  ruleInput.id = `actRule-${Math.random().toString(36).slice(2, 8)}`;
  const ruleLabelEl = el('label', null, SUCCESS_RULE_PROMPT);
  ruleLabelEl.htmlFor = ruleInput.id;
  ruleField.append(ruleLabelEl, ruleInput,
    el('p', 'hint', 'เขียนสั้น ๆ ด้วยคำของตัวเอง เปลี่ยนทีหลังได้'));

  function current() {
    const custom = isCustomId(activityId);
    const choice = choicesFor(activeColor).find(c => c.id === activityId);
    const label = custom ? customInput.value.trim() : (choice ? choice.labelTh : '');
    return {
      activityId,
      label,
      description: choice && !custom ? choice.hintTh : '',
      color: activityId ? colorOf(activityId) : null,
      custom,
      successRule: ruleInput.value.trim(),
      /* "Complete" is the one thing the caller should not have to work
         out: a card is picked, and if it was the write-your-own card,
         it has words in it. */
      complete: !!activityId && (!custom || label.length > 0)
        && (!askSuccessRule || ruleInput.value.trim().length > 0),
    };
  }

  function emit() { onChange(current()); }

  function paintCards() {
    grid.textContent = '';
    for (const choice of choicesFor(activeColor)) {
      const card = el('button', 'act-card');
      card.type = 'button';
      card.dataset.activity = choice.id;
      card.setAttribute('role', 'radio');
      const picked = choice.id === activityId;
      card.setAttribute('aria-checked', picked ? 'true' : 'false');
      card.classList.toggle('picked', picked);
      if (choice.custom) card.classList.add('is-custom');

      const art = document.createElement('img');
      art.src = choice.art;
      art.alt = '';
      art.width = 160; art.height = 160;
      art.loading = 'lazy';
      art.decoding = 'async';

      card.append(art, el('b', null, choice.labelTh), el('span', null, choice.hintTh));
      card.addEventListener('click', () => {
        activityId = choice.id;
        customField.hidden = !choice.custom;
        paintCards();
        if (choice.custom) customInput.focus();
        emit();
      });
      grid.append(card);
    }
  }

  function paintTabs() {
    tabs.textContent = '';
    for (const group of COLORS) {
      const tab = el('button', `act-tab tab-${group.id}`);
      tab.type = 'button';
      tab.dataset.color = group.id;
      tab.setAttribute('role', 'tab');
      const on = group.id === activeColor;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.classList.toggle('on', on);

      const icon = document.createElement('img');
      icon.src = TAB_ART[group.id];
      icon.alt = '';
      icon.setAttribute('aria-hidden', 'true');
      icon.width = 63; icon.height = 72;
      icon.decoding = 'async';

      tab.append(icon, el('span', null, group.tabTh));
      tab.addEventListener('click', () => {
        if (activeColor === group.id) return;
        activeColor = group.id;
        /* Flipping to another tab does not silently un-pick what is
           already chosen on the tab you came from — it stays picked, and
           the card shows it again the moment you flip back. */
        paintTabs();
        paintCards();
        customField.hidden = !isCustomId(activityId) || colorOf(activityId) !== activeColor;
      });
      tabs.append(tab);
    }
  }

  customInput.addEventListener('input', emit);
  ruleInput.addEventListener('input', emit);

  paintTabs();
  paintCards();
  mount.append(tabs, grid, customField, ruleField);
  emit();

  return {
    value: current,
    setMode({ askSuccessRule: ask } = {}) {
      ruleField.hidden = !ask;
      askSuccessRule = !!ask;
      emit();
    },
  };
}
