(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { catalog: null, user: null, sourceIds: null, category: 'all', query: '', readerId: null, busy: false, refresh: false };
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
    render();
  }
  function openKey(message = '') {
    $('key-status').textContent = message;
    if (!$('key-dialog').open) $('key-dialog').showModal();
    $('shelf-key').focus();
  }
  function createAction(label, action) { const button = el('button', 'text-button', label); button.type = 'button'; button.addEventListener('click', action); return button; }
  function render() {
    if (!state.catalog) return;
    const sources = state.catalog.sources;
    $('bottle-count').textContent = String(sources.length).padStart(2, '0') + ' BOTTLES · MADE TO BE SHARED';
    $('bottles').replaceChildren(...sources.slice(0, 3).map((source, index) => {
      const button = el('button', 'bottle-slot'); button.type = 'button';
      button.setAttribute('aria-label', (canTake(source) ? 'เปิดซอส ' : 'ขอกุญแจเปิดซอส ') + source.title);
      const bottle = el('span', 'bottle'); const label = el('span', 'bottle-label');
      label.append(el('small', '', 'SAUCE NO. ' + String(index + 1).padStart(2, '0')), el('strong', '', source.title), el('span', '', 'TEEM CLOVER · v' + source.version));
      bottle.append(label); button.append(bottle);
      button.addEventListener('click', () => takeOrUnlock(source, button)); return button;
    }));
    const query = state.query.toLocaleLowerCase('th');
    const visible = sources.filter(source => (state.category === 'all' || source.categories.includes(state.category)) && [source.title, source.description, ...source.tags].join(' ').toLocaleLowerCase('th').includes(query));
    $('result-count').textContent = visible.length + ' จาก ' + sources.length + ' ขวด';
    $('source-list').replaceChildren(...visible.map(source => {
      const row = el('article', 'source-row'); row.dataset.allowed = String(canTake(source));
      const copy = el('div', 'source-copy'); copy.append(el('h3', '', source.title), el('p', '', source.description));
      const meta = el('div', 'source-meta'); meta.append(el('span', '', 'v' + source.version), el('span', '', source.status_label)); copy.append(meta);
      const detail = el('details', 'source-detail'); detail.append(el('summary', '', 'หัวข้อในซอสนี้'), el('p', '', source.tags.join(' · '))); copy.append(detail);
      const actions = el('div', 'source-actions');
      actions.append(createAction(canTake(source) ? 'เปิดซอส ↗' : state.user ? 'ขอสิทธิ์ขวดนี้ ↗' : 'ใส่กุญแจเพื่อเปิด ◇', event => takeOrUnlock(source, event.currentTarget)));
      row.append(el('span', 'source-number', String(sources.indexOf(source) + 1).padStart(2, '0')), copy, actions); return row;
    }));
    if (!visible.length) $('source-list').append(el('p', 'empty', 'ยังไม่เจอซอสที่ตรงกัน ลองเปลี่ยนคำค้นหรือหมวดดูนะ'));
  }
  function renderFilters() {
    const categories = [{ id: 'all', label: 'ทั้งหมด' }, ...state.catalog.categories];
    $('filters').replaceChildren(...categories.map(category => {
      const button = el('button', 'filter', category.label); button.type = 'button'; button.setAttribute('aria-pressed', String(state.category === category.id));
      button.addEventListener('click', () => { state.category = category.id; $('filters').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); render(); }); return button;
    }));
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
      $('cabinet').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
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
  window.addEventListener('pageshow', event => { if (event.persisted) refreshSession(); });
  const initialEpoch = sessionEpoch;
  Promise.allSettled([api('catalog'), api('session')]).then(results => {
    if (results[0].status === 'fulfilled') { state.catalog = results[0].value.catalog; renderFilters(); render(); }
    else { $('connection-status').textContent = 'ตอนนี้เปิดรายการซอสไม่ได้ แต่ยังทักหาทีมเพื่อขอกุญแจได้เลย'; $('result-count').textContent = 'กำลังรอเชื่อมต่อชั้นวาง'; }
    if (results[1].status === 'fulfilled' && initialEpoch === sessionEpoch) setSession(results[1].value);
    else if (results[1].status === 'rejected' && initialEpoch === sessionEpoch && results[0].status === 'fulfilled') $('connection-status').textContent = 'ชั้นวางยังล็อกอยู่ · ตอนนี้ระบบรับกุญแจยังเชื่อมต่อไม่ได้';
  });
})();
