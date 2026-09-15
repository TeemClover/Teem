// UI only: prompt bodies arrive from the authorized lesson response.
// Drafts live in this mounted view and are discarded on lesson/account changes.
const KINDS = new Set(['prompt-library', 'prompt-cards']);
const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim()) ? value : null;

export function normalizeLessonTools(value) {
  if (!Array.isArray(value) || value.length > 6) return [];
  const toolIds = new Set();
  return value.flatMap(tool => {
    if (!tool || !KINDS.has(tool.kind) || !text(tool.id, 100, true) || toolIds.has(tool.id)
      || !text(tool.title, 240, true) || !Array.isArray(tool.prompts) || tool.prompts.length > 100) return [];
    toolIds.add(tool.id);
    const ids = new Set(), prompts = tool.prompts.flatMap(prompt => {
      if (!prompt || !text(prompt.id, 100, true) || ids.has(prompt.id) || !text(prompt.title, 240, true)
        || !text(prompt.body, 100000, true) || (prompt.fields !== undefined && (!Array.isArray(prompt.fields) || prompt.fields.length > 30))) return [];
      const keys = new Set(), fields = [];
      for (const field of prompt.fields || []) {
        if (!field || !text(field.key, 160, true) || !text(field.label, 240, true) || keys.has(field.key)) return [];
        keys.add(field.key); fields.push({ key: field.key, label: field.label, placeholder: text(field.placeholder, 800) || '', multiline: field.multiline === true });
      }
      ids.add(prompt.id);
      return [{ id: prompt.id, title: prompt.title, body: prompt.body, category: text(prompt.category, 160) || 'ทั่วไป',
        description: text(prompt.description, 2000) || '', keywords: Array.isArray(prompt.keywords) ? prompt.keywords.filter(word => text(word, 160)).slice(0, 50) : [],
        fields, tips: Array.isArray(prompt.tips) ? prompt.tips.filter(tip => text(tip, 1200)).slice(0, 6) : [] }];
    });
    return prompts.length ? [{ kind: tool.kind, id: tool.id, title: tool.title, description: text(tool.description, 3000) || '', prompts }] : [];
  });
}

const normalizeSearch = value => String(value).normalize('NFKC').toLocaleLowerCase('th').trim();
export function filterToolPrompts(prompts, query = '', category = '') {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return prompts.filter(prompt => (!category || prompt.category === category) && words.every(word =>
    normalizeSearch([prompt.title, prompt.description, prompt.category, ...(prompt.keywords || [])].join(' ')).includes(word)));
}

export function fillToolPrompt(body, values) {
  return body.replace(/\[([^\]\n]+)\]/g, (original, key) => {
    const value = values instanceof Map ? values.get(key) : Object.hasOwn(values || {}, key) ? values[key] : undefined;
    return typeof value === 'string' && value.trim() ? value : original;
  });
}

export function renderLessonTools(container, tools, { copyText = value => globalThis.navigator.clipboard.writeText(value) } = {}) {
  let alive = true, models = normalizeLessonTools(tools);
  const disposals = [];
  container.replaceChildren(); container.hidden = !models.length;
  const node = (tag, value = '', className = '') => { const element = document.createElement(tag); element.textContent = value; if (className) element.className = className; return element; };
  const button = (label, callback, className = '') => { const element = node('button', label, `lt-button ${className}`.trim()); element.type = 'button'; element.addEventListener('click', () => { if (alive) callback(); }); return element; };
  const feedback = () => { const element = node('p', '', 'lt-status'); element.setAttribute('role', 'status'); element.setAttribute('aria-live', 'polite'); return element; };
  const copy = async (value, control, status, field) => {
    if (!alive || control.disabled) return;
    if (!value.trim()) { status.textContent = 'Prompt ยังว่างอยู่ เลือกสูตรหรือใส่ข้อความก่อนคัดลอก'; return; }
    control.disabled = true; status.textContent = 'กำลังคัดลอก…';
    try { await copyText(value); if (alive) status.textContent = 'คัดลอกแล้ว · วางในแชตพร้อมซอสของคุณได้เลย'; }
    catch { if (alive) { status.textContent = 'เลือกข้อความไว้ให้แล้ว ใช้คำสั่งคัดลอกของเครื่องได้เลย'; field.focus(); field.select(); } }
    finally { if (alive) control.disabled = false; }
  };

  function cards(parent, tool) {
    const list = node('div', '', 'lt-cards');
    for (const prompt of tool.prompts) {
      const card = node('article', '', 'lt-card'); card.dataset.promptId = prompt.id;
      card.append(node('p', prompt.category, 'lt-category'), node('h4', prompt.title));
      if (prompt.description) card.append(node('p', prompt.description, 'lt-description'));
      const field = node('textarea', '', 'lt-copy-text'); field.value = prompt.body; field.readOnly = true; field.rows = 9;
      field.setAttribute('aria-label', `Prompt: ${prompt.title}`);
      const status = feedback(), control = button('คัดลอก Prompt นี้', () => copy(prompt.body, control, status, field), 'lt-primary');
      card.append(field, control, status);
      for (const tip of prompt.tips) card.append(node('p', tip, 'lt-tip'));
      list.append(card);
    }
    parent.append(list);
  }

  function library(parent, tool) {
    let selected = null;
    const drafts = new Map(), promptButtons = new Map();
    disposals.push(() => { drafts.clear(); promptButtons.clear(); selected = null; });
    const filters = node('div', '', 'lt-filters'), searchLabel = node('label', 'ค้นหาสูตร'), search = node('input');
    search.type = 'search'; search.placeholder = 'เช่น อีเมล แคปชั่น สไลด์'; search.maxLength = 240; search.setAttribute('aria-label', 'ค้นหาสูตร');
    searchLabel.append(search);
    const categoryLabel = node('label', 'หมวดงาน'), category = node('select'); category.setAttribute('aria-label', 'หมวดงาน');
    const all = node('option', 'ทุกหมวด'); all.value = ''; category.append(all);
    for (const name of new Set(tool.prompts.map(prompt => prompt.category))) { const option = node('option', name); option.value = name; category.append(option); }
    category.value = ''; categoryLabel.append(category); filters.append(searchLabel, categoryLabel);
    const count = feedback(); count.className = 'lt-count';
    const layout = node('div', '', 'lt-library-layout'), results = node('ul', '', 'lt-results'), editor = node('section', '', 'lt-editor');
    results.setAttribute('aria-label', 'สูตรที่ค้นพบ'); editor.setAttribute('aria-label', 'ปรับสูตรที่เลือก');
    editor.append(node('h4', 'เลือกสูตรที่ตรงกับงาน'), node('p', 'เติมข้อมูลที่รู้ ปรับข้อความ แล้วคัดลอกไปใช้กับซอสของคุณ', 'lt-description'));
    layout.append(results, editor); parent.append(filters, count, layout);

    function select(prompt) {
      selected = prompt.id;
      if (!drafts.has(prompt.id)) drafts.set(prompt.id, { values: new Map(), body: prompt.body, manual: false, needsRebuild: false });
      const draft = drafts.get(prompt.id);
      for (const [id, control] of promptButtons) control.setAttribute('aria-pressed', String(id === selected));
      editor.replaceChildren(); editor.dataset.promptId = prompt.id;
      editor.append(node('p', prompt.category, 'lt-category'), node('h4', prompt.title));
      if (prompt.description) editor.append(node('p', prompt.description, 'lt-description'));
      const inputs = node('div', '', 'lt-fields'), fields = [];
      const outputLabel = node('label', 'Prompt พร้อมแก้ไข', 'lt-output-label'), output = node('textarea', '', 'lt-editor-text');
      output.rows = 15; output.value = draft.body; output.setAttribute('aria-label', `ปรับข้อความ Prompt: ${prompt.title}`); outputLabel.append(output);
      const changed = feedback(), status = feedback();
      const changedMessage = 'ข้อมูลด้านบนเปลี่ยนแล้ว หากต้องการใช้ค่าใหม่ กด “ประกอบจากช่องกรอก” ข้อความที่คุณแก้เองยังอยู่ครบ';
      if (draft.needsRebuild) changed.textContent = changedMessage;
      for (const field of prompt.fields) {
        const label = node('label', field.label), input = node(field.multiline ? 'textarea' : 'input');
        if (!field.multiline) input.type = 'text'; else input.rows = 3;
        input.placeholder = field.placeholder; input.value = draft.values.get(field.key) || ''; input.dataset.fieldKey = field.key;
        input.setAttribute('aria-label', field.label);
        input.addEventListener('input', () => {
          if (!alive) return;
          draft.values.set(field.key, input.value);
          if (!draft.manual) { draft.body = fillToolPrompt(prompt.body, draft.values); output.value = draft.body; }
          else { draft.needsRebuild = true; changed.textContent = changedMessage; rebuild.hidden = false; }
          status.textContent = '';
        });
        label.append(input); inputs.append(label); fields.push(input);
      }
      const rebuild = button('ประกอบจากช่องกรอก', () => {
        draft.body = fillToolPrompt(prompt.body, draft.values); draft.manual = false; draft.needsRebuild = false; output.value = draft.body;
        changed.textContent = 'ประกอบสูตรจากช่องกรอกแล้ว'; rebuild.hidden = true; status.textContent = '';
      }); rebuild.hidden = !draft.needsRebuild;
      output.addEventListener('input', () => { if (alive) { draft.body = output.value; draft.manual = true; status.textContent = ''; } });
      const copyButton = button('คัดลอก Prompt ที่ปรับแล้ว', () => copy(draft.body, copyButton, status, output), 'lt-primary');
      const reset = button('กลับสูตรต้นฉบับ', () => {
        draft.values.clear(); draft.body = prompt.body; draft.manual = false; draft.needsRebuild = false; output.value = prompt.body;
        fields.forEach(input => { input.value = ''; }); changed.textContent = ''; status.textContent = 'กลับสูตรต้นฉบับแล้ว'; rebuild.hidden = true;
      });
      const actions = node('div', '', 'lt-actions'); actions.append(copyButton, reset);
      if (prompt.fields.length) editor.append(node('p', 'เติมเฉพาะข้อมูลที่รู้ ช่องที่เว้นไว้จะคง [วงเล็บ] ให้คุณตรวจต่อ', 'lt-hint'), inputs);
      editor.append(changed, rebuild, outputLabel, actions, status);
      for (const tip of prompt.tips) editor.append(node('p', tip, 'lt-tip'));
    }

    function showResults() {
      if (!alive) return;
      results.replaceChildren(); promptButtons.clear();
      const matches = filterToolPrompts(tool.prompts, search.value, category.value);
      count.textContent = `พบ ${matches.length} จาก ${tool.prompts.length} สูตร`;
      if (!matches.length) {
        const row = node('li', '', 'lt-empty'); row.append(node('p', 'ยังไม่พบสูตร ลองใช้คำสั้นลงหรือเลือกทุกหมวด'));
        row.append(button('แสดงทุกสูตร', () => { search.value = ''; category.value = ''; showResults(); })); results.append(row);
      }
      for (const prompt of matches) {
        const row = node('li'), control = button('', () => select(prompt), 'lt-prompt-choice'); control.dataset.promptId = prompt.id;
        control.setAttribute('aria-pressed', String(prompt.id === selected));
        control.append(node('small', prompt.category), node('span', prompt.title)); row.append(control); results.append(row); promptButtons.set(prompt.id, control);
      }
    }
    search.addEventListener('input', showResults); category.addEventListener('change', showResults); showResults();
  }

  for (const tool of models) {
    const section = node('section', '', 'lesson-tools'); section.dataset.toolId = tool.id;
    section.append(node('p', 'เครื่องมือที่ใช้ในคลาส', 'lt-kicker'), node('h3', tool.title));
    if (tool.description) section.append(node('p', tool.description, 'lt-description'));
    if (tool.kind === 'prompt-library') library(section, tool); else cards(section, tool);
    container.append(section);
  }
  return { destroy() { if (!alive) return; alive = false; disposals.splice(0).forEach(dispose => dispose()); models = []; tools = null; container.replaceChildren(); container.hidden = true; } };
}
