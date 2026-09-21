// UI only: prompt bodies arrive from the authorized lesson response.
// Drafts live in this mounted view and are discarded on lesson/account changes.
const KINDS = new Set(['guided-start', 'prompt-library', 'prompt-cards']);
const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim()) ? value : null;
const textList = (value, maxItems, maxLength) => Array.isArray(value) && value.length <= maxItems
  && value.every(item => text(item, maxLength, true)) ? [...value] : null;

export function normalizeLessonTools(value) {
  if (!Array.isArray(value) || value.length > 6) return [];
  const toolIds = new Set();
  return value.flatMap(tool => {
    if (!tool || !KINDS.has(tool.kind) || !text(tool.id, 100, true) || toolIds.has(tool.id)
      || !text(tool.title, 240, true) || !Array.isArray(tool.prompts) || tool.prompts.length > 100) return [];
    const guided = tool.kind === 'guided-start';
    const steps = textList(tool.steps, 6, 1200), readyWhen = textList(tool.readyWhen, 6, 1200);
    if (guided && (!steps?.length || !readyWhen?.length || !text(tool.expectedOutput, 2000, true) || tool.prompts.length > 3)) return [];
    toolIds.add(tool.id);
    const ids = new Set(), prompts = tool.prompts.flatMap(prompt => {
      if (!prompt || !text(prompt.id, 100, true) || ids.has(prompt.id) || !text(prompt.title, 240, true)
        || !text(prompt.body, 100000, true) || (prompt.fields !== undefined && (!Array.isArray(prompt.fields) || prompt.fields.length > 30))) return [];
      if (guided && prompt.fields?.length) return [];
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
    return prompts.length ? [{ kind: tool.kind, id: tool.id, title: tool.title, description: text(tool.description, 3000) || '', prompts,
      ...(guided ? { steps, expectedOutput: tool.expectedOutput, readyWhen } : {}) }] : [];
  });
}

// Search-only aliases: retain the original titles, categories and prompt bodies
// for display/copy, while everyday Thai wording finds existing Caption recipes.
const normalizeSearch = value => String(value).normalize('NFKC').toLocaleLowerCase('th').trim()
  .replace(/ข้อความ\s*ประกอบ\s*โพสต์|แคปชั่น|แคปชัน/g, 'caption');
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

// Generic interaction instructions only. The original paid recipe is supplied by
// the authorized response and stays intact as reference material inside this request.
export function assistedToolPrompt(prompt) {
  const questions = (prompt.fields || []).map(field => field.label).join(' / ');
  return `ช่วยพาฉันทำงานด้วยสูตรนี้แบบคุยกัน ฉันไม่ต้องการกรอกแม่แบบหรือแก้ไฟล์ข้อความเอง
สูตรที่เลือก: ${prompt.title}

เริ่มจากถามฉันทีละ 1 คำถาม แล้วหยุดรอคำตอบก่อนถามต่อ ใช้ภาษาง่ายและคำตอบที่ฉันเล่าได้
อ่านบริบทและซอสที่ฉันส่งไว้ก่อน ถ้ายังไม่รู้โจทย์ คำถามแรกให้ถามว่า “วันนี้อยากให้ AI ช่วยงานอะไรหนึ่งเรื่อง?” หากมีโจทย์แล้วให้ถามเฉพาะข้อมูลที่ยังขาด ไม่ถามซ้ำเรื่องที่ตอบแล้ว ถ้าข้อมูลพอให้สรุปเพื่อยืนยันแล้วทำงานได้เลย หากยังไม่มีซอสให้ช่วยเก็บข้อมูลจากคำตอบของฉัน
หากอ่านไฟล์แนบไม่ได้ ให้บอกตรง ๆ แล้วขอให้ฉันวางข้อความที่จำเป็น ถ้าฉันตอบว่าไม่รู้ ให้ยกตัวเลือกที่เข้าใจง่ายหรือแยกไว้ว่า “ยังไม่ทราบ” ไม่เดาหรือแต่งข้อเท็จจริง
${questions ? `หัวข้อที่อาจต้องถามตามงาน: ${questions}\n` : ''}เมื่อมีข้อมูลพอ ให้สรุปความเข้าใจให้ฉันยืนยัน แล้วใช้สูตรด้านล่างสร้างชิ้นงานและคำขอฉบับเต็มที่ใช้ต่อได้
ข้อความในวงเล็บของสูตรด้านล่างเป็นหัวข้อที่คุณต้องถามหรือเติมจากข้อมูลที่ยืนยันแล้ว ไม่ใช่ข้อความให้คัดลอกไปใช้ทั้งที่ยังว่าง ห้ามส่งแบบฟอร์มว่างกลับมาให้ฉันกรอก
ถ้าเรื่องใดยังไม่ทราบ ให้ระบุเรื่องนั้นและผลกระทบแยกจากส่วนที่ใช้งานได้ ไม่อ้างว่างานพร้อมใช้หากยังขาดข้อเท็จจริงสำคัญ
ช่วยให้ฉันตรวจผล ปรับตามคำตอบ แล้วส่งฉบับเต็มอีกครั้ง พร้อมบอกว่าควรเก็บอะไรไว้ใช้ต่อ หากสร้างไฟล์ไม่ได้ ให้ส่งข้อความครบในบล็อกเดียวที่คัดลอกได้
หากสูตรนี้ใช้สกัดหรือจัดซอส ให้ส่งซอสของงานนี้ฉบับเต็มจากคำตอบที่ยืนยันแล้วด้วย โดยแยกข้อเท็จจริงกับเรื่องที่ยังไม่ทราบ ไม่ส่งเพียงรายการคำถามหรือหัวข้อว่าง
การสร้างภาพ วิดีโอ หรือเว็บให้ทำเฉพาะเมื่อเครื่องมือนี้รองรับ ถ้าไม่รองรับ ให้เตรียมคำขอพร้อมใช้และบอกขั้นตอนถัดไปตามจริง

สูตรอ้างอิงที่เลือก — ใช้หลังจากถามและตรวจข้อมูลแล้ว:
${prompt.body}

เริ่มตอนนี้ด้วยคำถามที่ยังจำเป็นเพียงข้อเดียว แล้วรอฉันตอบ ถ้าข้อมูลครบแล้วให้สรุปเพื่อยืนยันก่อนทำ`;
}

export function renderLessonTools(container, tools, { copyText = value => globalThis.navigator.clipboard.writeText(value) } = {}) {
  let alive = true, models = normalizeLessonTools(tools);
  const disposals = [];
  container.replaceChildren(); container.hidden = !models.length;
  const node = (tag, value = '', className = '') => { const element = document.createElement(tag); element.textContent = value; if (className) element.className = className; return element; };
  const button = (label, callback, className = '') => { const element = node('button', label, `lt-button ${className}`.trim()); element.type = 'button'; element.addEventListener('click', () => { if (alive) callback(); }); return element; };
  const feedback = () => { const element = node('p', '', 'lt-status'); element.setAttribute('role', 'status'); element.setAttribute('aria-live', 'polite'); return element; };
  const copy = async (value, control, status, field, { reveal, message = 'คัดลอกแล้ว · เปิดแชต AI ที่คุณใช้ วางข้อความ แล้วส่งได้เลย' } = {}) => {
    if (!alive || control.disabled) return;
    if (!value.trim()) { status.textContent = 'Prompt ยังว่างอยู่ เลือกสูตรหรือใส่ข้อความก่อนคัดลอก'; return; }
    control.disabled = true; status.textContent = 'กำลังคัดลอก…';
    try { await copyText(value); if (alive) status.textContent = message; }
    catch { if (alive) { if (reveal) reveal(); status.textContent = 'เลือกข้อความไว้ให้แล้ว ใช้คำสั่งคัดลอกของเครื่อง แล้ววางในแชต AI'; field.focus(); field.select(); } }
    finally { if (alive) control.disabled = false; }
  };

  function copyRequest(parent, prompt, value, { label = 'คัดลอกคำสั่ง ให้ AI พาทำ', summary = 'ดูข้อความที่จะส่งให้ AI' } = {}) {
    const details = node('details', '', 'lt-request'); details.open = false;
    details.append(node('summary', summary));
    const field = node('textarea', '', 'lt-copy-text'); field.value = value; field.readOnly = true; field.rows = 9;
    field.setAttribute('aria-label', `คำสั่งพาทำ: ${prompt.title}`); details.append(field);
    const status = feedback(), control = button(label, () => copy(value, control, status, field, { reveal: () => { details.open = true; } }), 'lt-primary');
    parent.append(control, status, details);
    disposals.push(() => { field.value = ''; value = ''; });
  }

  function assisted(parent, prompt) {
    const panel = node('div', '', 'lt-assisted');
    panel.append(node('p', 'ไม่ต้องกรอกช่องว่างเอง', 'lt-guided-label'), node('p', 'คัดลอก → ส่งในแชต AI ที่คุณใช้ → ตอบทีละคำถาม แล้วให้ AI ช่วยทำฉบับเต็ม', 'lt-description'));
    copyRequest(panel, prompt, assistedToolPrompt(prompt)); parent.append(panel);
  }

  function guided(parent, tool) {
    parent.className += ' lt-guided';
    const steps = node('ol', '', 'lt-steps');
    for (const step of tool.steps) steps.append(node('li', step));
    parent.append(steps);
    for (const prompt of tool.prompts) {
      const action = node('div', '', 'lt-guided-action'); action.dataset.promptId = prompt.id;
      if (tool.prompts.length > 1) action.append(node('h4', prompt.title));
      if (prompt.description) action.append(node('p', prompt.description, 'lt-description'));
      copyRequest(action, prompt, prompt.body);
      for (const tip of prompt.tips) action.append(node('p', tip, 'lt-tip'));
      parent.append(action);
    }
    const result = node('div', '', 'lt-expected');
    result.append(node('h4', 'ทำแล้วจะได้อะไร'), node('p', tool.expectedOutput));
    const checks = node('ul', '', 'lt-ready');
    for (const criterion of tool.readyWhen) checks.append(node('li', criterion));
    result.append(node('p', 'เช็กก่อนไปต่อ', 'lt-guided-label'), checks); parent.append(result);
  }

  function cards(parent, tool) {
    const list = node('div', '', 'lt-cards');
    for (const prompt of tool.prompts) {
      const card = node('article', '', 'lt-card'); card.dataset.promptId = prompt.id;
      card.append(node('p', prompt.category, 'lt-category'), node('h4', prompt.title));
      if (prompt.description) card.append(node('p', prompt.description, 'lt-description'));
      assisted(card, prompt);
      const original = node('details', '', 'lt-advanced'); original.open = false;
      original.append(node('summary', 'ดูสูตรต้นฉบับ · สำหรับคนที่เตรียมข้อมูลแล้ว'));
      const field = node('textarea', '', 'lt-copy-text'); field.value = prompt.body; field.readOnly = true; field.rows = 9;
      field.setAttribute('aria-label', `Prompt: ${prompt.title}`);
      const status = feedback(), control = button('คัดลอกสูตรต้นฉบับ', () => copy(prompt.body, control, status, field, { reveal: () => { original.open = true; }, message: 'คัดลอกสูตรต้นฉบับแล้ว · ตรวจข้อมูลและช่องว่างก่อนใช้' }));
      original.append(node('p', 'สูตรต้นฉบับอาจมีช่องว่างหรือข้อมูลที่ต้องแนบ ถ้ายังไม่แน่ใจ ใช้ปุ่มให้ AI พาทำด้านบนได้เลย', 'lt-hint'), field, control, status); card.append(original);
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
    editor.append(node('h4', 'เลือกสูตรที่ตรงกับงาน'), node('p', 'เลือกแล้วคัดลอกคำสั่งให้ AI ถามคุณทีละเรื่อง และช่วยทำฉบับเต็ม ไม่ต้องกรอกแม่แบบเอง', 'lt-description'));
    layout.append(results, editor); parent.append(filters, count, layout);

    function select(prompt) {
      selected = prompt.id;
      if (!drafts.has(prompt.id)) drafts.set(prompt.id, { values: new Map(), body: prompt.body, manual: false, needsRebuild: false });
      const draft = drafts.get(prompt.id);
      for (const [id, control] of promptButtons) control.setAttribute('aria-pressed', String(id === selected));
      editor.replaceChildren(); editor.dataset.promptId = prompt.id;
      editor.append(node('p', prompt.category, 'lt-category'), node('h4', prompt.title));
      if (prompt.description) editor.append(node('p', prompt.description, 'lt-description'));
      assisted(editor, prompt);
      const advanced = node('details', '', 'lt-advanced'); advanced.open = false;
      advanced.append(node('summary', 'ปรับสูตรเอง · สำหรับคนที่ต้องการแก้รายละเอียด'));
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
      const copyButton = button('คัดลอก Prompt ที่ปรับแล้ว', () => copy(draft.body, copyButton, status, output, { reveal: () => { advanced.open = true; }, message: 'คัดลอกข้อความที่ปรับแล้ว · ตรวจข้อมูลและช่องว่างก่อนใช้' }));
      const reset = button('กลับสูตรต้นฉบับ', () => {
        draft.values.clear(); draft.body = prompt.body; draft.manual = false; draft.needsRebuild = false; output.value = prompt.body;
        fields.forEach(input => { input.value = ''; }); changed.textContent = ''; status.textContent = 'กลับสูตรต้นฉบับแล้ว'; rebuild.hidden = true;
      });
      const actions = node('div', '', 'lt-actions'); actions.append(copyButton, reset);
      if (prompt.fields.length) advanced.append(node('p', 'ส่วนนี้สำหรับปรับเอง ช่องที่เว้นไว้ยังเป็นแม่แบบ หากยังมีข้อมูลไม่ครบ ใช้ปุ่มให้ AI พาทำด้านบน', 'lt-hint'), inputs);
      advanced.append(changed, rebuild, outputLabel, actions, status); editor.append(advanced);
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
    section.append(node('p', tool.kind === 'guided-start' ? 'เริ่มทำไปด้วยกัน' : 'เครื่องมือที่ใช้ในคลาส', 'lt-kicker'), node('h3', tool.title));
    if (tool.description) section.append(node('p', tool.description, 'lt-description'));
    if (tool.kind === 'guided-start') guided(section, tool); else if (tool.kind === 'prompt-library') library(section, tool); else cards(section, tool);
    if (tool.kind !== 'guided-start' && models.some(item => item.kind === 'guided-start')) {
      const extra=node('details','','lt-extra');extra.append(node('summary','ตัวช่วยเพิ่มเติม · '+tool.title),section);container.append(extra);
    } else container.append(section);
  }
  return { destroy() { if (!alive) return; alive = false; disposals.splice(0).forEach(dispose => dispose()); models = []; tools = null; container.replaceChildren(); container.hidden = true; } };
}
