/* Public demo only. All changes remain in memory until reset or reload. */
(() => {
  'use strict';
  const root = document.getElementById('sydney-studio-concept');
  if (!root) return;
  const find = (selector) => root.querySelector(selector);
  const all = (selector) => [...root.querySelectorAll(selector)];
  const tabNames = ['overview', 'content', 'workshop', 'brief'];
  const initialTitle = 'มื้อพืชง่าย ๆ จากของที่มีในครัว';
  const initialBrief = 'ช่วยจัดหน้าเรื่องเล่าครัวมังสวิรัติ จากผักและของที่มีในบ้าน แล้วชวนผู้อ่านลองสังเกตรสชาติอย่างมีสติระหว่างมื้อ';
  function freshState() {
    return {
      tab: 'overview', draft: initialTitle, savedDraft: initialTitle, hasSaved: false,
      statuses: { '001': 'รอทักทาย', '002': 'ส่งรายละเอียดแล้ว', '003': 'ยืนยันเข้าร่วม', '004': 'รอทักทาย', '005': 'ส่งรายละเอียดแล้ว' },
      briefText: initialBrief, tasks: [], approved: false
    };
  }
  let state = freshState();
  const announce = (message) => { find('#ss-live-status').textContent = message; };

  function renderTabs() {
    all('[data-ss-tab]').forEach((button) => {
      const selected = button.dataset.ssTab === state.tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    tabNames.forEach((name) => { find(`#ss-panel-${name}`).hidden = name !== state.tab; });
  }
  function setTab(name) {
    if (!tabNames.includes(name)) return;
    state.tab = name;
    renderTabs();
    const label = find(`[data-ss-tab="${name}"]`).textContent.trim();
    announce(`เปิดส่วน ${label} · ข้อมูลสมมติ`);
  }
  function renderDraft() {
    find('#ss-preview-title').textContent = state.draft.trim() || 'ชื่อเรื่องของซิด';
    find('#ss-save-state').textContent = state.draft !== state.savedDraft
      ? 'มีการแก้ไขที่ยังไม่บันทึก'
      : state.hasSaved ? 'บันทึกฉบับร่างจำลองแล้ว' : 'ยังไม่มีการแก้ไข';
  }
  function make(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function renderTasks() {
    const list = find('#ss-task-list');
    list.replaceChildren();
    const tasks = [
      { id: 'D-001', title: `ตัวอย่างการ์ดเรื่องเล่า: ${initialTitle}`, status: state.approved ? 'อนุมัติในเดโมแล้ว' : 'รอรีวิว' },
      ...state.tasks.map((title, index) => ({ id: `D-${String(index + 2).padStart(3, '0')}`, title, status: 'เข้าคิวจำลอง' }))
    ];
    tasks.forEach((task) => {
      const item = make('div', 'ss-task');
      const heading = make('div', 'ss-task-top');
      heading.append(make('span', 'ss-kicker', task.id), make('span', 'ss-tag', task.status));
      item.append(heading, make('p', '', task.title));
      list.append(item);
    });
    find('#ss-task-count').textContent = `${tasks.length} งานสมมติ`;
    find('#ss-approve').disabled = state.approved;
    find('#ss-approved-label').textContent = state.approved ? 'อนุมัติในเดโมแล้ว · ไม่มีการเผยแพร่' : 'ยังไม่ได้อนุมัติ';
    find('#ss-brief-submit').disabled = state.tasks.length >= 5;
    if (state.tasks.length >= 5) find('#ss-brief-error').textContent = 'คิวจำลองครบ 5 บรีฟแล้ว กด “เริ่มเดโมใหม่” เพื่อเริ่มอีกครั้ง';
  }
  function renderAll() {
    renderTabs();
    find('#ss-story-title').value = state.draft;
    find('#ss-brief-text').value = state.briefText;
    all('[data-ss-person]').forEach((select) => { select.value = state.statuses[select.dataset.ssPerson]; });
    renderDraft();
    renderTasks();
  }
  renderAll();

  all('[data-ss-tab]').forEach((button, index) => {
    button.addEventListener('click', () => setTab(button.dataset.ssTab));
    button.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabNames.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabNames.length - 1) % tabNames.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabNames.length - 1;
      else return;
      event.preventDefault();
      const target = all('[data-ss-tab]')[next];
      setTab(target.dataset.ssTab);
      target.focus();
    });
  });
  all('[data-ss-open]').forEach((button) => button.addEventListener('click', () => {
    setTab(button.dataset.ssOpen);
    find(`[data-ss-tab="${button.dataset.ssOpen}"]`).focus();
  }));
  find('#ss-story-title').addEventListener('input', (event) => {
    state.draft = event.target.value;
    event.target.setCustomValidity('');
    renderDraft();
  });
  function saveDraft() {
    const field = find('#ss-story-title');
    if (!state.draft.trim()) {
      field.setCustomValidity('ใส่ชื่อเรื่องก่อนบันทึก');
      field.reportValidity();
      return;
    }
    field.setCustomValidity('');
    state.savedDraft = state.draft.trim();
    state.draft = state.savedDraft;
    state.hasSaved = true;
    field.value = state.draft;
    renderDraft();
    announce(`บันทึกฉบับร่างจำลองแล้ว: ${state.savedDraft}`);
  }
  find('#ss-save-draft').addEventListener('click', saveDraft);
  find('#ss-story-title').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); saveDraft(); }
  });
  find('#ss-content-form').addEventListener('submit', (event) => event.preventDefault());
  all('[data-ss-person]').forEach((select) => select.addEventListener('change', () => {
    state.statuses[select.dataset.ssPerson] = select.value;
    announce(`SYD-${select.dataset.ssPerson} → ${select.value} · เปลี่ยนเฉพาะเดโม ไม่มีการติดต่อใคร`);
  }));
  find('#ss-brief-text').addEventListener('input', (event) => {
    state.briefText = event.target.value;
    if (state.tasks.length < 5) find('#ss-brief-error').textContent = '';
  });
  find('#ss-brief-submit').addEventListener('click', () => {
    const brief = state.briefText.trim();
    if (!brief) { find('#ss-brief-error').textContent = 'ใส่รายละเอียดสั้น ๆ ก่อนเพิ่มเข้าคิว'; return; }
    if (state.tasks.length >= 5) return;
    state.tasks.push(brief);
    state.briefText = '';
    find('#ss-brief-text').value = '';
    find('#ss-brief-error').textContent = '';
    renderTasks();
    announce(`เพิ่ม D-${String(state.tasks.length + 1).padStart(3, '0')} เข้าคิวจำลองแล้ว · ไม่ได้ส่งให้ทีมจริง`);
  });
  find('#ss-brief-form').addEventListener('submit', (event) => event.preventDefault());
  find('#ss-approve').addEventListener('click', () => {
    state.approved = true;
    renderTasks();
    announce('อนุมัติตัวอย่าง D-001 ในเดโมแล้ว · ไม่มีการเผยแพร่');
  });
  find('#ss-reset').addEventListener('click', () => {
    state = freshState();
    find('#ss-story-title').setCustomValidity('');
    find('#ss-brief-error').textContent = '';
    renderAll();
    announce('เริ่มเดโมใหม่แล้ว · คืนข้อมูลสมมติทุกส่วนเป็นค่าเริ่มต้น');
    find('#ss-tab-overview').focus();
  });
})();
