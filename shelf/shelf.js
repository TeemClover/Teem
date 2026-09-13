(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { catalog: null, user: null, sourceIds: null, category: 'all', collection: 'all', query: '', focusedSource: null, readerId: null, busy: false, refresh: false };
  let toastTimer;
  let sessionEpoch = 0;
  const el = (tag, className, value) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined) item.textContent = value;
    return item;
  };
  const messages = {
    INVALID_KEY: 'กุญแจนี้เปิดชั้นไม่ได้ ลองตรวจอีกครั้ง หรือทักหาทีมเพื่อขอกุญแจใหม่',
    BAD_KEY: 'กุญแจนี้เปิดชั้นไม่ได้ ลองตรวจอีกครั้ง หรือทักหาทีมเพื่อขอกุญแจใหม่',
    KEY_REQUIRED: 'วางกุญแจที่ได้รับจากทีมก่อนนะ',
    RATE_LIMITED: 'ลองเปิดถี่เกินไป พักสักครู่แล้วลองใหม่ได้เลย',
    TOO_MANY_ATTEMPTS: 'ลองเปิดถี่เกินไป พักสักครู่แล้วลองใหม่ได้เลย',
    UNAUTHORIZED: 'กุญแจอาจหมดอายุหรือสิทธิ์เปลี่ยนไป ใส่กุญแจอีกครั้งหรือทักหาทีมได้เลย',
    AUTH_REQUIRED: 'กุญแจอาจหมดอายุหรือสิทธิ์เปลี่ยนไป ใส่กุญแจอีกครั้งหรือทักหาทีมได้เลย',
    FORBIDDEN: 'กุญแจของคุณยังเปิดซอสขวดนี้ไม่ได้ ทักหาทีมเพื่อขอสิทธิ์เพิ่มได้เลย',
    SOURCE_FORBIDDEN: 'กุญแจของคุณยังเปิดซอสขวดนี้ไม่ได้ ทักหาทีมเพื่อขอสิทธิ์เพิ่มได้เลย',
    SOURCE_NOT_FOUND: 'ยังไม่พบซอสขวดนี้ ลองกลับมาใหม่อีกครั้ง',
    TIMEOUT: 'ใช้เวลานานกว่าปกติ ลองใหม่อีกครั้งได้เลย'
  };
  function explain(error) { return messages[error.code] || 'ตอนนี้ติดต่อชั้นวางไม่ได้ ลองใหม่อีกครั้ง หรือทักหาทีมได้เลย'; }
  async function api(action, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/shelf' + (body ? '' : '?action=' + encodeURIComponent(action)), {
        method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify({ ...body, action }) : undefined
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        const error = new Error('Shelf request failed'); error.code = payload.error || 'UNAVAILABLE'; error.status = response.status; throw error;
      }
      return payload;
    } catch (error) { if (error.name === 'AbortError') error.code = 'TIMEOUT'; throw error; }
    finally { clearTimeout(timeout); }
  }
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; toastTimer = setTimeout(() => { $('toast').textContent = ''; }, 5000); }
  function canTake(source) { return Boolean(state.user && (!state.sourceIds || state.sourceIds.includes(source.id))); }
  function clearReader() { state.readerId = null; $('reader-content').textContent = ''; $('reader-status').textContent = ''; }
  function setSession(data) {
    const nextUser = data.authenticated && data.user ? data.user : null;
    const nextScope = Array.isArray(data.sourceIds) ? [...data.sourceIds].sort() : null;
    const accessChanged = (state.user?.id || null) !== (nextUser?.id || null) || JSON.stringify(state.sourceIds) !== JSON.stringify(nextScope);
    if (accessChanged) {
      sessionEpoch += 1;
      if ($('reader-dialog').open) $('reader-dialog').close();
      clearReader();
    }
    state.user = nextUser;
    state.sourceIds = nextScope;
    $('cabinet').dataset.state = state.user ? 'unlocked' : 'locked';
    $('member-bar').hidden = !state.user;
    $('member-name').textContent = state.user?.name || '';
    $('member-scope').textContent = state.user ? (state.sourceIds ? '· เปิดได้ ' + state.sourceIds.length + ' ขวด' : '· เปิดซอสบนชั้นได้ทุกขวด') : '';
    $('access-badge').textContent = state.user ? '✧ UNLOCKED FOR YOU' : '◇ BY INVITATION';
    $('key-shortcut').hidden = Boolean(state.user);
    $('shelf-hint').textContent = state.user ? 'เลือกขวดที่สนใจ แล้วหยิบไปสร้างอะไรใหม่ ๆ ได้เลย' : 'ชั้นนี้ยังล็อกอยู่ · ดูว่ามีอะไรน่าสนใจ แล้วทักมาขอกุญแจได้เลย';
    $('cabinet-caption').textContent = state.user ? 'YOUR NEXT IDEA STARTS HERE.' : 'GOOD THINGS ARE BETTER SHARED.';
    if (!state.user) { if ($('reader-dialog').open) $('reader-dialog').close(); clearReader(); }
    // Returning from a lesson with the same access keeps expanded labels and focus.
    if (accessChanged) render();
  }
  function openKey(message = '') {
    $('key-status').textContent = message;
    if (!$('key-dialog').open) $('key-dialog').showModal();
    $('shelf-key').focus();
  }
  function createAction(label, action) { const button = el('button', 'text-button', label); button.type = 'button'; button.addEventListener('click', action); return button; }
  const sourceRows = new Map();
  const pathSections = new Map();
  const strings = values => Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];
  const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
  function sourceCollection(source) { return source.recipe && validId(source.recipe.collection_id) ? source.recipe.collection_id : null; }
  function collections() {
    const sources = state.catalog?.sources || [];
    const definitions = Array.isArray(state.catalog?.collections) ? state.catalog.collections.filter(item => validId(item.id)) : [];
    const groups = definitions.map(item => ({ ...item, sources: [] }));
    sources.forEach(source => {
      const id = sourceCollection(source);
      if (!id) return;
      let group = groups.find(item => item.id === id);
      if (!group) { group = { id, title: 'ชุดซอสที่ใช้ต่อกัน', description: '', sources: [] }; groups.push(group); }
      group.sources.push(source);
    });
    return groups.filter(group => group.sources.length).map(group => ({ ...group, sources: group.sources.sort((a, b) => (Number(a.recipe.order) || 0) - (Number(b.recipe.order) || 0)) }));
  }
  function orderedSources() {
    const recipes = collections().flatMap(group => group.sources);
    const ids = new Set(recipes.map(source => source.id));
    return [...recipes, ...state.catalog.sources.filter(source => !ids.has(source.id))];
  }
  function stepNumber(source, fallback = 1) { return String(Number(source.recipe?.order) > 0 ? source.recipe.order : fallback).padStart(2, '0'); }
  function sourceAnchor(source, label, className = '') {
    const link = el('a', className, label); link.href = '#source-' + source.id;
    link.addEventListener('click', event => {
      event.preventDefault();
      if (window.location) window.location.hash = 'source-' + source.id;
      revealSource(source.id);
    });
    return link;
  }
  function safeLessonHref(href) {
    if (typeof href !== 'string') return null;
    try {
      const origin = window.location?.origin || 'https://www.myclover.com';
      const url = new URL(href, origin);
      return url.origin === origin && /^\/(classroom|course)(\/|$)/.test(url.pathname) ? url.pathname + url.search + url.hash : null;
    } catch { return null; }
  }
  function renderLearningPaths() {
    const groups = collections();
    const paths = $('learning-paths'); paths.hidden = !groups.length; paths.replaceChildren(); pathSections.clear();
    groups.forEach(group => {
      const section = el('section', 'learning-path'); section.id = group.id; section.setAttribute('aria-labelledby', 'path-title-' + group.id);
      const intro = el('div', 'path-intro'); intro.append(el('span', 'eyebrow', 'A RECIPE TO BUILD ON'));
      const title = el('h2', '', group.title); title.id = 'path-title-' + group.id; intro.append(title);
      if (group.description) intro.append(el('p', 'path-description', group.description));
      intro.append(el('p', 'path-guidance', 'เลือกงานขององค์กรหนึ่งเรื่อง แล้วค่อย ๆ ใช้ซอสตามลำดับ ของจากสูตรก่อนหน้าจะเป็นวัตถุดิบให้สูตรถัดไป'));
      intro.append(sourceAnchor(group.sources[0], 'เริ่มที่สูตร ' + stepNumber(group.sources[0]) + ' ↗', 'path-start'));
      const sequence = el('ol', 'recipe-sequence'); sequence.setAttribute('aria-label', 'ลำดับการใช้ซอส ' + group.title);
      group.sources.forEach((source, index) => {
        const item = el('li'); const link = sourceAnchor(source, undefined, 'recipe-step');
        link.append(el('span', 'step-index', stepNumber(source, index + 1)));
        const label = el('span', 'step-copy'); label.append(el('small', '', source.recipe.stage || 'RECIPE'), el('strong', '', source.recipe.short_title || source.title));
        link.append(label, el('span', 'step-arrow', '↗')); item.append(link); sequence.append(item);
      });
      const body = el('div', 'path-body'); body.append(intro, sequence); section.append(body);
      section.append(el('p', 'path-note', 'ลำดับนี้เป็นแนวทางเลือกใช้ซอส คุณกลับมาหยิบสูตรที่ต้องการได้ทุกเมื่อ'));
      paths.append(section); pathSections.set(group.id, section);
    });
  }
  function recipeDetails(source) {
    const recipe = source.recipe;
    const detail = el('details', 'source-detail recipe-detail');
    detail.append(el('summary', '', 'เตรียมอะไร · ได้อะไร · เรียนคู่กับบทไหน'));
    const body = el('div', 'recipe-detail-body');
    const addList = (title, values) => {
      const items = strings(values); if (!items.length) return;
      const block = el('div', 'recipe-detail-block'); block.append(el('h4', '', title)); const list = el('ul');
      items.forEach(value => list.append(el('li', '', value))); block.append(list); body.append(block);
    };
    addList('วัตถุดิบที่เตรียม', recipe.inputs);
    addList('ไฟล์ที่จะทำจากแม่แบบ', recipe.outputs);
    const prerequisites = strings(recipe.prerequisites);
    if (prerequisites.length) {
      const block = el('div', 'recipe-detail-block'); block.append(el('h4', '', 'หยิบสูตรนี้มาก่อน')); const list = el('ul');
      prerequisites.forEach(value => {
        const item = el('li'); const previous = state.catalog.sources.find(candidate => candidate.id === value);
        if (previous) item.append(sourceAnchor(previous, previous.recipe?.short_title || previous.title)); else item.textContent = value;
        list.append(item);
      });
      block.append(list); body.append(block);
    }
    if (Array.isArray(recipe.lessons)) {
      const links = recipe.lessons.map(lesson => ({ label: lesson.label, href: safeLessonHref(lesson.href) })).filter(lesson => lesson.href && typeof lesson.label === 'string');
      if (links.length) {
        const block = el('div', 'recipe-detail-block recipe-lessons'); block.append(el('h4', '', 'เรียนคู่กับบทนี้')); const list = el('ul');
        links.forEach(lesson => { const item = el('li'); const link = el('a', '', lesson.label + ' ↗'); link.href = lesson.href; item.append(link); list.append(item); });
        block.append(list); body.append(block);
      }
    }
    detail.append(body); return detail;
  }
  function renderSource(source, index) {
    const row = el('article', 'source-row' + (source.recipe ? ' recipe-row' : '')); row.id = 'source-' + source.id;
    row.dataset.allowed = String(canTake(source)); row.dataset.sourceId = source.id;
    if (sourceCollection(source)) row.dataset.collection = sourceCollection(source);
    if (source.id === state.focusedSource) row.className += ' is-linked';
    row.setAttribute('tabindex', '-1');
    const copy = el('div', 'source-copy');
    if (source.recipe) copy.append(el('span', 'recipe-stage', 'สูตร ' + stepNumber(source, index + 1) + ' / ' + (source.recipe.stage || 'RECIPE')));
    copy.append(el('h3', '', source.title), el('p', '', source.description));
    if (source.recipe?.use_with) {
      const use = el('div', 'recipe-use'); use.append(el('span', '', 'ใช้กับ'), el('p', '', source.recipe.use_with)); copy.append(use);
    }
    const meta = el('div', 'source-meta'); meta.append(el('span', '', 'v' + source.version), el('span', '', source.status_label)); copy.append(meta);
    if (source.recipe) copy.append(recipeDetails(source));
    else { const detail = el('details', 'source-detail'); detail.append(el('summary', '', 'หัวข้อในซอสนี้'), el('p', '', strings(source.tags).join(' · '))); copy.append(detail); }
    const actions = el('div', 'source-actions');
    actions.append(createAction(canTake(source) ? 'เปิดซอส ↗' : state.user ? 'ขอสิทธิ์ขวดนี้ ↗' : 'ใส่กุญแจเพื่อเปิด ◇', event => takeOrUnlock(source, event.currentTarget)));
    row.append(el('span', 'source-number', source.recipe ? stepNumber(source, index + 1) : String(index + 1).padStart(2, '0')), copy, actions);
    sourceRows.set(source.id, row); return row;
  }
  function render() {
    if (!state.catalog) return;
    const sources = orderedSources(); const groups = collections();
    $('bottle-count').textContent = String(sources.length).padStart(2, '0') + ' BOTTLES · MADE TO BE SHARED';
    $('bottles').replaceChildren(...sources.slice(0, 3).map((source, index) => {
      const button = el('button', 'bottle-slot'); button.type = 'button';
      button.setAttribute('aria-label', (canTake(source) ? 'เปิดซอส ' : 'ขอกุญแจเปิดซอส ') + source.title);
      const bottle = el('span', 'bottle'); const label = el('span', 'bottle-label');
      label.append(el('small', '', source.recipe ? (source.recipe.stage || 'RECIPE') + ' / ' + stepNumber(source, index + 1) : 'SAUCE NO. ' + String(index + 1).padStart(2, '0')), el('strong', '', source.recipe?.short_title || source.title), el('span', '', 'TEEM CLOVER · v' + source.version));
      bottle.append(label); button.append(bottle);
      button.addEventListener('click', () => takeOrUnlock(source, button)); return button;
    }));
    const query = state.query.toLocaleLowerCase('th');
    const visible = sources.filter(source => {
      const recipe = source.recipe || {};
      const searchText = [source.title, source.description, ...strings(source.tags), recipe.stage, recipe.short_title, recipe.use_with, ...strings(recipe.inputs), ...strings(recipe.outputs), ...strings(recipe.prerequisites), ...(Array.isArray(recipe.lessons) ? recipe.lessons.map(lesson => lesson.label) : [])].filter(Boolean).join(' ').toLocaleLowerCase('th');
      const inCollection = state.collection === 'all' || (state.collection === 'other' ? !sourceCollection(source) : sourceCollection(source) === state.collection);
      return inCollection && (state.category === 'all' || strings(source.categories).includes(state.category)) && searchText.includes(query);
    });
    $('result-count').textContent = visible.length + ' จาก ' + sources.length + ' ขวด';
    const list = $('source-list'); list.replaceChildren(); sourceRows.clear();
    const appendGroup = (id, title, description, items) => {
      if (!items.length) return;
      const section = el('section', 'source-group'); section.dataset.collection = id;
      const heading = el('div', 'source-group-heading'); const headingTitle = el('h3', '', title); headingTitle.id = 'source-group-' + id;
      heading.append(headingTitle, el('span', '', items.length + ' ขวด')); if (description) heading.append(el('p', '', description));
      section.setAttribute('aria-labelledby', headingTitle.id); section.append(heading, ...items.map((source, index) => renderSource(source, index))); list.append(section);
    };
    groups.forEach(group => appendGroup(group.id, group.title, '', visible.filter(source => sourceCollection(source) === group.id)));
    const other = visible.filter(source => !sourceCollection(source));
    if (groups.length) appendGroup('other', 'ซอสบนชั้นอื่น', 'ข้อมูลเฉพาะเรื่องและวิธีทำงานที่หยิบใช้เพิ่มเติมได้', other);
    else other.forEach((source, index) => list.append(renderSource(source, index)));
    if (!visible.length) list.append(el('p', 'empty', 'ยังไม่เจอซอสที่ตรงกัน ลองเปลี่ยนคำค้น ชุดซอส หรือหมวดดูนะ'));
  }
  function renderFilters() {
    const categories = [{ id: 'all', label: 'ทุกหมวด' }, ...state.catalog.categories];
    $('filters').replaceChildren(...categories.map(category => {
      const button = el('button', 'filter', category.label); button.type = 'button'; button.setAttribute('aria-pressed', String(state.category === category.id));
      button.addEventListener('click', () => { state.category = category.id; renderFilters(); render(); }); return button;
    }));
  }
  function renderCollectionFilters() {
    const groups = collections(); $('collection-control').hidden = !groups.length;
    const choices = [{ id: 'all', title: 'ทุกชุดบนชั้น' }, ...groups];
    if (groups.length && state.catalog.sources.some(source => !sourceCollection(source))) choices.push({ id: 'other', title: 'ซอสบนชั้นอื่น' });
    $('collection-filters').replaceChildren(...choices.map(choice => {
      const button = el('button', 'collection-filter', choice.title); button.type = 'button'; button.dataset.collection = choice.id;
      button.setAttribute('aria-pressed', String(state.collection === choice.id));
      button.addEventListener('click', () => { state.collection = choice.id; state.focusedSource = null; renderCollectionFilters(); render(); }); return button;
    }));
  }
  function revealSource(id) {
    const source = state.catalog?.sources.find(item => item.id === id); if (!source) return;
    state.query = ''; state.category = 'all'; state.collection = sourceCollection(source) || 'other'; state.focusedSource = id; $('search').value = '';
    renderCollectionFilters(); renderFilters(); render();
    const row = sourceRows.get(id); row?.scrollIntoView({ behavior: 'auto', block: 'center' }); row?.focus({ preventScroll: true });
  }
  function applyHash() {
    if (!state.catalog) return;
    let hash; try { hash = decodeURIComponent((window.location?.hash || '').replace(/^#/, '')); } catch { return; }
    if (hash.startsWith('source-')) {
      const id = hash.slice(7); if (!state.catalog.sources.some(source => source.id === id)) return false;
      revealSource(id); return true;
    }
    if (pathSections.has(hash)) {
      state.query = ''; state.category = 'all'; state.collection = hash; state.focusedSource = null; $('search').value = '';
      renderCollectionFilters(); renderFilters(); render(); pathSections.get(hash).scrollIntoView({ behavior: 'auto', block: 'start' }); return true;
    }
  }
  async function takeOrUnlock(source, button) {
    if (!state.user) { openKey(); return; }
    if (!canTake(source)) { toast('ซอสขวดนี้ยังไม่อยู่ในสิทธิ์ของคุณ ทักหาทีมเพื่อขอเพิ่มได้เลย'); return; }
    if (state.busy) return;
    state.busy = true; button.disabled = true;
    const epoch = sessionEpoch;
    try {
      const data = await api('take', { id: source.id, kind: 'open' });
      if (epoch !== sessionEpoch || !state.user) return;
      state.readerId = source.id;
      $('reader-title').textContent = data.source.title;
      $('reader-version').textContent = 'SOURCE / v' + data.source.version;
      $('reader-content').textContent = data.source.content;
      $('reader-status').textContent = 'คงวันที่ เวอร์ชัน และประเด็นรอยืนยันไว้เมื่อส่งต่อ';
      $('reader-dialog').showModal();
      $('reader-content').scrollTop = 0;
    } catch (error) { if (epoch === sessionEpoch) handleAccessError(error); }
    finally { state.busy = false; button.disabled = false; }
  }
  function handleAccessError(error) {
    if (error.status === 401) { setSession({ authenticated: false }); openKey(explain(error)); }
    else if (error.status === 403) { if ($('reader-dialog').open) $('reader-dialog').close(); clearReader(); toast(explain(error)); }
    else toast(explain(error));
  }
  async function copyText(content, isCurrent) {
    if (!isCurrent()) return false;
    if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(content); return true; } catch {} }
    if (!isCurrent()) return false;
    const input = el('textarea'); input.value = content; input.setAttribute('aria-label', 'ซอสสำหรับคัดลอก');
    input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';
    $('reader-dialog').append(input); input.select();
    let copied = false; try { copied = document.execCommand('copy'); } catch {} input.remove(); return copied;
  }
  async function deliver(kind, button) {
    if (!state.readerId || state.busy) return;
    state.busy = true; button.disabled = true; $('reader-status').textContent = 'กำลังเตรียมซอส…';
    const epoch = sessionEpoch, sourceId = state.readerId;
    try {
      const data = await api('take', { id: sourceId, kind });
      if (epoch !== sessionEpoch || !state.user || state.readerId !== sourceId) return;
      $('reader-content').textContent = data.source.content;
      $('reader-title').textContent = data.source.title;
      $('reader-version').textContent = 'SOURCE / v' + data.source.version;
      if (kind === 'copy') {
        const copied = await copyText(data.source.content, () => epoch === sessionEpoch && state.readerId === sourceId && Boolean(state.user));
        if (epoch !== sessionEpoch || state.readerId !== sourceId || !state.user) return;
        if (copied) $('reader-status').textContent = 'คัดลอกแล้ว · พร้อมวางให้ AI ใช้ต่อ';
        else {
          const range = document.createRange(); range.selectNodeContents($('reader-content'));
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
          $('reader-status').textContent = 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้ให้แล้ว ใช้เมนูคัดลอกของเครื่องได้เลย'; $('reader-content').focus();
        }
      } else {
        const objectUrl = URL.createObjectURL(new Blob([data.source.content], { type: 'text/markdown;charset=utf-8' }));
        const link = el('a'); link.href = objectUrl; link.download = data.source.id + '.md'; $('reader-dialog').append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
        $('reader-status').textContent = 'ส่งไฟล์ให้เบราว์เซอร์แล้ว · ดูที่รายการดาวน์โหลดของคุณ';
      }
    } catch (error) { if (epoch === sessionEpoch) { $('reader-status').textContent = explain(error); handleAccessError(error); } }
    finally { state.busy = false; button.disabled = false; }
  }
  $('open-key').addEventListener('click', () => openKey());
  $('key-shortcut').addEventListener('click', () => openKey());
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('key-dialog').addEventListener('close', () => { $('shelf-key').value = ''; $('shelf-key').type = 'password'; $('show-key').textContent = 'แสดง'; $('show-key').setAttribute('aria-pressed', 'false'); });
  $('reader-dialog').addEventListener('close', clearReader);
  $('show-key').addEventListener('click', () => { const show = $('shelf-key').type === 'password'; $('shelf-key').type = show ? 'text' : 'password'; $('show-key').textContent = show ? 'ซ่อน' : 'แสดง'; $('show-key').setAttribute('aria-pressed', String(show)); });
  $('key-form').addEventListener('submit', async event => {
    event.preventDefault(); if ($('unlock-button').disabled) return;
    const key = $('shelf-key').value.trim(); if (!key) return;
    const epoch = ++sessionEpoch;
    $('unlock-button').disabled = true; $('key-status').textContent = 'กำลังลองกุญแจ…';
    try {
      const data = await api('unlock', { key });
      if (!data.authenticated || !data.user) throw new Error('No session');
      // Confirm the browser retained the HttpOnly cookie before showing unlocked content.
      const session = await api('session');
      if (epoch !== sessionEpoch) return;
      if (!session.authenticated) { $('key-status').textContent = 'เบราว์เซอร์ยังไม่รับกุญแจ ลองอนุญาตคุกกี้ของเว็บนี้แล้วเปิดอีกครั้ง'; return; }
      setSession(session); $('key-dialog').close(); $('shelf-key').value = '';
      $('connection-status').textContent = ''; toast('ยินดีต้อนรับ ' + session.user.name + ' · ชั้นวางเปิดแล้ว');
      if (!applyHash()) $('cabinet').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    } catch (error) { $('key-status').textContent = explain(error); }
    finally { $('unlock-button').disabled = false; }
  });
  $('logout').addEventListener('click', async () => {
    sessionEpoch += 1;
    $('logout').disabled = true;
    try { await api('logout', {}); setSession({ authenticated: false }); toast('เก็บกุญแจแล้ว ไว้กลับมาเจอกันนะ'); }
    catch (error) { toast(explain(error)); }
    finally { $('logout').disabled = false; }
  });
  $('search').addEventListener('input', () => { state.query = $('search').value.trim(); render(); });
  $('copy-source').addEventListener('click', () => deliver('copy', $('copy-source')));
  $('download-source').addEventListener('click', () => deliver('download', $('download-source')));
  async function refreshSession() {
    if (state.refresh || document.hidden || $('unlock-button').disabled) return;
    state.refresh = true;
    const epoch = sessionEpoch;
    try { const session = await api('session'); if (epoch === sessionEpoch) setSession(session); }
    catch { if (epoch === sessionEpoch && state.user) { setSession({ authenticated: false }); toast('ยังตรวจสิทธิ์ไม่ได้ กรุณาใส่กุญแจใหม่เมื่อเชื่อมต่อได้'); } }
    finally { state.refresh = false; }
  }
  document.addEventListener('visibilitychange', refreshSession);
  window.addEventListener('hashchange', applyHash);
  window.addEventListener('pageshow', event => { if (event.persisted) refreshSession(); });
  const initialEpoch = sessionEpoch;
  Promise.allSettled([api('catalog'), api('session')]).then(results => {
    if (results[0].status === 'fulfilled') { state.catalog = results[0].value.catalog; renderLearningPaths(); renderCollectionFilters(); renderFilters(); render(); }
    else { $('connection-status').textContent = 'ตอนนี้เปิดรายการซอสไม่ได้ แต่ยังทักหาทีมเพื่อขอกุญแจได้เลย'; $('result-count').textContent = 'กำลังรอเชื่อมต่อชั้นวาง'; }
    if (results[1].status === 'fulfilled' && initialEpoch === sessionEpoch) setSession(results[1].value);
    else if (results[1].status === 'rejected' && initialEpoch === sessionEpoch && results[0].status === 'fulfilled') $('connection-status').textContent = 'ชั้นวางยังล็อกอยู่ · ตอนนี้ระบบรับกุญแจยังเชื่อมต่อไม่ได้';
    applyHash();
  });
})();
