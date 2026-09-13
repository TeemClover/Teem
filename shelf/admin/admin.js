(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const state = { data: null, authenticated: false, epoch: 0, loadId: 0, pendingRevoke: null, refreshedAt: null };
  const number = new Intl.NumberFormat('en-US');
  const date = new Intl.DateTimeFormat('th-TH-u-ca-gregory-nu-latn', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric' });
  const dateTime = new Intl.DateTimeFormat('th-TH-u-ca-gregory-nu-latn', { timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const kindLabels = { open: 'ขอเปิด', copy: 'ขอคัดลอก', download: 'ขอดาวน์โหลด' };
  const errors = {
    BAD_PASSWORD: 'รหัสผ่านไม่ถูกต้อง ลองตรวจแล้วใส่อีกครั้ง',
    TOO_MANY_ATTEMPTS: 'ลองเข้าระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
    INVALID_NAME: 'กรุณาใส่ชื่อผู้รับที่มีความยาวไม่เกิน 100 ตัวอักษร',
    INVALID_EXPIRY: 'อายุการใช้งานไม่ถูกต้อง กรุณาเลือกใหม่',
    INVALID_SCOPE: 'รายการซอสเปลี่ยนไปแล้ว กรุณาอัปเดตข้อมูลและเลือกใหม่',
    KEY_NOT_FOUND: 'ไม่พบกุญแจนี้ กรุณาอัปเดตข้อมูล',
    USER_NOT_FOUND: 'ไม่พบผู้รับคนนี้ กรุณาอัปเดตข้อมูลแล้วเลือกใหม่',
    BAD_ORIGIN: 'ไม่สามารถทำรายการจากหน้านี้ได้ กรุณาเปิดหลังบ้านจากเว็บไซต์ myClover โดยตรง',
    STORAGE_UNAVAILABLE: 'ระบบจัดเก็บข้อมูลยังเชื่อมต่อไม่ได้ กรุณาลองใหม่ภายหลัง',
    BACKOFFICE_STORAGE_UNAVAILABLE: 'ระบบเข้าสู่บัญชียังเชื่อมต่อไม่ได้ กรุณาลองใหม่ภายหลัง',
    BACKOFFICE_SESSION_FAILED: 'ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่',
    TIMEOUT: 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่',
    NETWORK_ERROR: 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่',
    INVALID_RESPONSE: 'ระบบตอบกลับไม่สมบูรณ์ กรุณาลองใหม่ภายหลัง'
  };

  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }
  function setStatus(id, message = '', tone = '') {
    const node = $(id);
    node.textContent = message;
    node.dataset.tone = tone;
  }
  function count(value) { return number.format(Number.isFinite(Number(value)) ? Number(value) : 0); }
  function formatted(value, withTime = false) {
    if (!value) return 'ยังไม่มี';
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? 'ไม่ทราบวันที่' : (withTime ? dateTime : date).format(parsed);
  }
  function messageFor(error) { return errors[error.code] || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่ภายหลัง'; }
  function apiError(code, status = 0) { return Object.assign(new Error(code), { code, status }); }
  async function request(url, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal
      });
      let data;
      try { data = await response.json(); } catch { throw apiError('INVALID_RESPONSE', response.status); }
      if (!response.ok || data?.ok !== true) throw apiError(data?.error || 'INVALID_RESPONSE', response.status);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw apiError('TIMEOUT');
      if (error.code) throw error;
      throw apiError('NETWORK_ERROR');
    } finally { clearTimeout(timer); }
  }
  function clearPrivateView() {
    state.loadId += 1;
    state.data = null;
    state.pendingRevoke = null;
    $('raw-key').value = '';
    $('key-result-recipient').textContent = '';
    $('revoke-recipient').textContent = '';
    for (const dialog of [$('key-dialog'), $('revoke-dialog')]) if (dialog.open) dialog.close();
    $('keys-list').replaceChildren(el('p', 'empty-state', 'กำลังโหลดกุญแจ'));
    $('activity-summary').replaceChildren(el('p', 'empty-state', 'กำลังโหลดการใช้งาน'));
    $('events-body').replaceChildren();
    $('source-options').replaceChildren();
    $('activity-recipient').replaceChildren(new Option('ทุกคน', 'all'));
    $('recipient-choice').replaceChildren(new Option('ผู้รับคนใหม่', 'new'));
    $('recipient-name').disabled = false;
    ['active-count', 'used-count', 'source-count', 'delivery-count', 'keys-count'].forEach(id => { $(id).textContent = '—'; });
    $('updated-at').textContent = '';
    $('recipient-name').value = '';
    $('key-search').value = '';
    $('password').value = '';
    ['dashboard-status', 'create-status', 'key-copy-status', 'revoke-status'].forEach(id => setStatus(id));
    $('events-count').textContent = '';
    $('create-button').disabled = true;
  }
  function showLogin(message = '') {
    state.epoch += 1;
    state.authenticated = false;
    clearPrivateView();
    $('session-state').hidden = true;
    $('dashboard').hidden = true;
    $('login-view').hidden = false;
    $('logout-button').hidden = true;
    setStatus('login-status', message, message ? 'error' : '');
  }
  function expired(error) {
    if (error.status === 401 || error.code === 'ADMIN_AUTH_REQUIRED') {
      showLogin('การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
      $('password').focus();
      return true;
    }
    return false;
  }
  async function checkSession() {
    const epoch = ++state.epoch;
    $('session-state').hidden = false;
    $('session-state').setAttribute('aria-busy', 'true');
    $('session-message').textContent = 'กำลังตรวจสอบการเข้าสู่ระบบ';
    $('session-retry').hidden = true;
    try {
      const data = await request('/api/backoffice-auth');
      if (epoch !== state.epoch) return;
      if (data.authenticated) await showDashboard();
      else showLogin();
    } catch (error) {
      if (epoch !== state.epoch) return;
      $('session-message').textContent = messageFor(error);
      $('session-state').setAttribute('aria-busy', 'false');
      $('session-retry').hidden = false;
    }
  }
  async function showDashboard() {
    state.authenticated = true;
    $('session-state').hidden = true;
    $('login-view').hidden = true;
    $('dashboard').hidden = false;
    $('logout-button').hidden = false;
    await loadDashboard();
  }
  async function loadDashboard() {
    const epoch = state.epoch;
    const loadId = ++state.loadId;
    $('refresh-button').disabled = true;
    $('dashboard-content').setAttribute('aria-busy', 'true');
    setStatus('dashboard-status', 'กำลังโหลดข้อมูลล่าสุด');
    try {
      const data = await request('/api/shelf?action=admin');
      if (epoch !== state.epoch || loadId !== state.loadId || !state.authenticated) return false;
      if (![data.keys, data.users, data.sources, data.events, data.sourceStats, data.userSourceStats].every(Array.isArray) || !data.stats) throw apiError('INVALID_RESPONSE');
      state.data = data;
      state.refreshedAt = new Date();
      renderDashboard();
      $('updated-at').textContent = `อัปเดต ${formatted(state.refreshedAt, true)} · กรุงเทพฯ`;
      setStatus('dashboard-status', 'ข้อมูลเป็นปัจจุบัน', 'success');
      return true;
    } catch (error) {
      if (epoch !== state.epoch || loadId !== state.loadId || expired(error)) return false;
      setStatus('dashboard-status', `${messageFor(error)}${state.data ? ' ข้อมูลด้านล่างเป็นข้อมูลที่โหลดไว้ก่อนหน้า' : ''}`, 'error');
      if (!state.data) {
        $('keys-list').replaceChildren(el('p', 'empty-state', 'ยังโหลดรายชื่อกุญแจไม่ได้ กด “อัปเดตข้อมูล” เพื่อลองอีกครั้ง'));
        $('activity-summary').replaceChildren(el('p', 'empty-state', 'ยังไม่มีข้อมูลที่ตรวจสอบได้'));
        renderEmptyEvents('ยังโหลดประวัติไม่ได้');
      }
      return false;
    } finally {
      if (loadId === state.loadId) {
        $('refresh-button').disabled = false;
        $('dashboard-content').setAttribute('aria-busy', 'false');
      }
    }
  }
  function keyStatus(key) {
    if (key.revokedAt) return 'revoked';
    if (key.expiresAt && new Date(key.expiresAt).valueOf() <= Date.now()) return 'expired';
    return 'active';
  }
  function sourceTitle(id) { return state.data?.sources.find(source => source.id === id)?.title || id; }
  function totals(value = {}) { return { open: Number(value.openCount) || 0, copy: Number(value.copyCount) || 0, download: Number(value.downloadCount) || 0 }; }
  function total(value = {}) { const t = totals(value); return t.open + t.copy + t.download; }
  function metricStrip(value) {
    const row = el('div', 'key-metrics');
    const t = totals(value);
    [['open', 'ขอเปิด'], ['copy', 'ขอคัดลอก'], ['download', 'ขอดาวน์โหลด']].forEach(([kind, label]) => {
      const cell = el('div'); cell.append(el('strong', '', count(t[kind])), el('span', '', label)); row.append(cell);
    });
    return row;
  }
  function renderDashboard() {
    const { stats } = state.data;
    $('active-count').textContent = count(stats.activeKeyCount);
    $('used-count').textContent = count(new Set(state.data.userSourceStats.filter(row => total(row) > 0).map(row => row.userId)).size);
    $('delivery-count').textContent = count(total(stats));
    const sourceRows = Array.isArray(state.data.sourceStats) ? state.data.sourceStats : summarizeEvents(state.data.events);
    $('source-count').textContent = count(sourceRows.filter(source => total(source) > 0).length);
    renderScopeOptions();
    renderRecipientOptions();
    renderKeys();
    renderActivity();
    $('create-button').disabled = false;
  }
  function renderScopeOptions() {
    const checked = new Set([...$('source-options').querySelectorAll('input:checked')].map(input => input.value));
    const fragment = document.createDocumentFragment();
    state.data.sources.forEach(source => {
      const label = el('label'); const input = el('input');
      input.type = 'checkbox'; input.name = 'sourceId'; input.value = source.id; input.checked = checked.has(source.id);
      label.append(input, el('span', '', source.title)); fragment.append(label);
    });
    if (!state.data.sources.length) fragment.append(el('p', 'muted', 'ยังไม่มีซอสในคลัง'));
    $('source-options').replaceChildren(fragment);
  }
  function renderRecipientOptions() {
    const selected = $('activity-recipient').value;
    const chosen = $('recipient-choice').value;
    $('activity-recipient').replaceChildren(new Option('ทุกคน', 'all'));
    $('recipient-choice').replaceChildren(new Option('ผู้รับคนใหม่', 'new'));
    const recipients = new Map(state.data.users.map(user => [String(user.id), user]));
    state.data.keys.forEach(key => {
      if (!recipients.has(String(key.userId))) recipients.set(String(key.userId), { id: key.userId, name: key.name });
    });
    recipients.forEach(user => {
      const label = user.createdAt ? `${user.name} · เริ่ม ${formatted(user.createdAt)}` : user.name;
      $('activity-recipient').add(new Option(label, user.id));
      $('recipient-choice').add(new Option(label, user.id));
    });
    if (recipients.has(selected)) $('activity-recipient').value = selected;
    if (recipients.has(chosen)) $('recipient-choice').value = chosen;
    syncRecipientChoice();
  }
  function syncRecipientChoice() {
    const selected = $('recipient-choice').value;
    const user = state.data?.users.find(item => String(item.id) === selected) || state.data?.keys.find(item => String(item.userId) === selected);
    $('recipient-name').disabled = Boolean(user);
    if (user) $('recipient-name').value = user.name;
  }
  function renderKeys() {
    if (!state.data) return;
    const query = $('key-search').value.trim().toLocaleLowerCase('th');
    const filter = $('key-status-filter').value;
    const keys = state.data.keys.filter(key => (!query || String(key.name).toLocaleLowerCase('th').includes(query)) && (filter === 'all' || keyStatus(key) === filter));
    $('keys-count').textContent = `${count(keys.length)} / ${count(state.data.stats.keyCount)}`;
    const fragment = document.createDocumentFragment();
    keys.forEach(key => {
      const card = el('article', 'key-card'); const top = el('div', 'key-card-top'); const identity = el('div');
      identity.append(el('h3', '', key.name), el('p', 'key-prefix', `KEY ${key.prefix || '••••…'}`));
      const status = keyStatus(key);
      top.append(identity, el('span', `badge ${status}`, { active: 'ใช้งานได้', expired: 'หมดอายุ', revoked: 'เพิกถอนแล้ว' }[status]));
      const meta = el('div', 'key-meta'); meta.append(el('span', '', `ออกให้ ${formatted(key.createdAt)}`), el('span', '', key.expiresAt ? `หมดอายุ ${formatted(key.expiresAt)}` : 'ไม่กำหนดวันหมดอายุ'));
      if (key.revokedAt) meta.append(el('span', '', `เพิกถอน ${formatted(key.revokedAt)}`));
      const scope = Array.isArray(key.sourceIds) && key.sourceIds.length ? key.sourceIds.map(sourceTitle).join(' · ') : 'ทุกขวดในคลัง';
      card.append(top, meta, el('p', 'key-scope', `เปิดได้: ${scope}`));
      const user = state.data.users.find(item => item.id === key.userId);
      if (user) {
        card.append(metricStrip(user));
        if (Number(user.keyCount) > 1) card.append(el('p', 'key-scope', 'ยอดของผู้รับคนนี้ รวมทุกกุญแจ'));
      }
      const bottom = el('div', 'key-card-bottom'); bottom.append(el('p', '', key.lastUsedAt ? `ใช้กุญแจล่าสุด ${formatted(key.lastUsedAt, true)}` : 'กุญแจนี้ยังไม่มีการใช้งาน'));
      const actions = el('div', 'key-card-actions'); const history = el('button', 'text-button', 'ดูซอสที่ได้รับ'); history.type = 'button';
      history.addEventListener('click', () => { $('activity-recipient').value = String(key.userId); renderActivity(); $('activity-title').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
      actions.append(history);
      if (!key.revokedAt) {
        const revoke = el('button', 'text-button revoke', 'เพิกถอน'); revoke.type = 'button'; revoke.setAttribute('aria-label', `เพิกถอนกุญแจของ ${key.name}`);
        revoke.addEventListener('click', () => openRevoke(key)); actions.append(revoke);
      }
      bottom.append(actions); card.append(bottom); fragment.append(card);
    });
    if (!keys.length) fragment.append(el('p', 'empty-state', state.data.keys.length ? 'ไม่พบกุญแจที่ตรงกับการค้นหา ลองเปลี่ยนชื่อหรือสถานะ' : 'ยังไม่ได้ออกกุญแจให้ใคร เริ่มจากคนแรกที่อยากส่งซอสให้ได้เลย'));
    if (Number(state.data.stats.keyCount) > state.data.keys.length) fragment.append(el('p', 'muted', `แสดงจากกุญแจล่าสุด ${count(state.data.keys.length)} รายการ การค้นหาและกรองใช้เฉพาะรายการที่โหลดไว้`));
    $('keys-list').replaceChildren(fragment);
  }
  function summarizeEvents(events) {
    const groups = new Map();
    events.forEach(event => {
      if (!groups.has(event.sourceId)) groups.set(event.sourceId, { sourceId: event.sourceId, sourceTitle: event.sourceTitle, openCount: 0, copyCount: 0, downloadCount: 0, lastUsedAt: null });
      const row = groups.get(event.sourceId); const key = `${event.kind}Count`;
      if (['openCount', 'copyCount', 'downloadCount'].includes(key)) row[key] += 1;
      if (!row.lastUsedAt || event.createdAt > row.lastUsedAt) row.lastUsedAt = event.createdAt;
    });
    return [...groups.values()];
  }
  function renderActivity() {
    if (!state.data) return;
    const recipient = $('activity-recipient').value;
    const events = state.data.events.filter(event => recipient === 'all' || String(event.userId) === recipient);
    const aggregate = recipient === 'all' ? state.data.sourceStats : state.data.userSourceStats?.filter(row => String(row.userId) === recipient);
    const rows = Array.isArray(aggregate) ? aggregate : summarizeEvents(events);
    const fragment = document.createDocumentFragment();
    rows.filter(row => total(row) > 0).forEach(row => {
      const card = el('article', 'source-stat');
      card.append(el('h3', '', row.sourceTitle || sourceTitle(row.sourceId)), metricStrip(row), el('p', '', `ส่งครั้งล่าสุด ${formatted(row.lastUsedAt, true)}`));
      fragment.append(card);
    });
    if (!fragment.childNodes.length) fragment.append(el('p', 'empty-state', recipient === 'all' ? 'ยังไม่มีการส่งซอสผ่านระบบ เมื่อผู้รับเริ่มใช้กุญแจ รายการจะปรากฏที่นี่' : 'ผู้รับคนนี้ยังไม่มีการส่งซอสผ่านระบบ'));
    $('activity-summary').replaceChildren(fragment);
    $('events-count').textContent = `${count(events.length)} รายการ`;
    const totalEvents = Number(state.data.eventsTotal);
    const limited = state.data.eventsHasMore === true || (Number.isFinite(totalEvents) && totalEvents > state.data.events.length);
    $('events-note').textContent = `${limited ? `แสดงประวัติล่าสุด ${count(state.data.events.length)} รายการ${Number.isFinite(totalEvents) ? ` จาก ${count(totalEvents)}` : ''} ก่อนกรองผู้รับ · ` : ''}วันที่และเวลาแสดงตามกรุงเทพฯ${!Array.isArray(aggregate) && limited ? ' · ยอดรายซอสคำนวณจากประวัติที่โหลดได้เท่านั้น' : ''}`;
    if (!events.length) { renderEmptyEvents('ยังไม่มีรายการส่งซอสในประวัติที่แสดง'); return; }
    const body = document.createDocumentFragment();
    events.forEach(event => {
      const row = el('tr');
      const source = el('td'); source.append(el('span', '', event.sourceTitle || sourceTitle(event.sourceId)));
      if (event.sourceVersion) source.append(el('p', 'muted', `v${event.sourceVersion}`));
      const action = el('td'); action.append(el('span', 'event-action', kindLabels[event.kind] || 'ขอรับซอส'));
      row.append(el('td', '', event.name), source, action, el('td', '', formatted(event.createdAt, true))); body.append(row);
    });
    $('events-body').replaceChildren(body);
  }
  function renderEmptyEvents(message) { const row = el('tr'); const cell = el('td', 'empty-state', message); cell.colSpan = 4; row.append(cell); $('events-body').replaceChildren(row); }
  function openRevoke(key) { state.pendingRevoke = key; $('revoke-recipient').textContent = key.name; setStatus('revoke-status'); $('confirm-revoke').disabled = false; $('cancel-revoke').disabled = false; $('revoke-dialog').showModal(); }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); const epoch = state.epoch;
    $('login-button').disabled = true; setStatus('login-status', 'กำลังเข้าสู่ระบบ');
    try {
      const payload = { action: 'login', password: $('password').value };
      const pending = request('/api/backoffice-auth', payload);
      $('password').value = ''; payload.password = '';
      const data = await pending;
      if (epoch !== state.epoch) return;
      if (!data.authenticated) throw apiError('INVALID_RESPONSE');
      setStatus('login-status'); await showDashboard();
    } catch (error) { if (epoch === state.epoch) setStatus('login-status', messageFor(error), 'error'); }
    finally { $('login-button').disabled = false; }
  });
  $('logout-button').addEventListener('click', async () => {
    $('logout-button').disabled = true;
    try { await request('/api/backoffice-auth', { action: 'logout' }); showLogin(); }
    catch (error) { setStatus('dashboard-status', `ออกจากระบบไม่สำเร็จ ${messageFor(error)}`, 'error'); }
    finally { $('logout-button').disabled = false; }
  });
  $('create-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!state.authenticated || !state.data) return;
    const name = $('recipient-name').value.trim();
    if (!name) { setStatus('create-status', 'ใส่ชื่อผู้รับก่อนสร้างกุญแจ', 'error'); $('recipient-name').focus(); return; }
    const selected = document.querySelector('input[name="scope"]:checked').value === 'selected';
    const sourceIds = selected ? [...$('source-options').querySelectorAll('input:checked')].map(input => input.value) : null;
    if (selected && !sourceIds.length) { setStatus('create-status', 'เลือกอย่างน้อย 1 ขวด หรือเลือกทุกขวดในคลัง', 'error'); return; }
    const epoch = state.epoch;
    $('create-button').disabled = true; setStatus('create-status', 'กำลังสร้างกุญแจ');
    try {
      const userId = $('recipient-choice').value;
      const data = await request('/api/shelf', { action: 'create-key', name, ...(userId === 'new' ? {} : { userId }), expiresDays: Number($('expires-days').value), sourceIds });
      if (epoch !== state.epoch || !state.authenticated) return;
      if (!data.rawKey || typeof data.rawKey !== 'string') throw apiError('INVALID_RESPONSE');
      $('raw-key').value = data.rawKey; data.rawKey = '';
      $('key-result-recipient').textContent = `สำหรับ ${data.key?.name || name}`;
      setStatus('key-copy-status'); $('key-dialog').showModal();
      setStatus('create-status', 'สร้างกุญแจแล้ว ส่งกุญแจให้ผู้รับจากหน้าต่างนี้', 'success');
      $('recipient-name').value = '';
      $('recipient-choice').value = 'new';
      $('recipient-name').disabled = false;
      await loadDashboard();
    } catch (error) {
      if (epoch !== state.epoch || expired(error)) return;
      const uncertain = ['NETWORK_ERROR', 'TIMEOUT', 'INVALID_RESPONSE'].includes(error.code);
      setStatus('create-status', uncertain ? 'ยังยืนยันไม่ได้ว่าสร้างกุญแจสำเร็จหรือไม่ กดอัปเดตข้อมูลก่อนลองใหม่ หากพบกุญแจที่ไม่มีรหัสเต็ม ให้เพิกถอนแล้วออกใหม่' : messageFor(error), 'error');
    } finally { $('create-button').disabled = !state.authenticated || !state.data; }
  });
  $('copy-key').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText($('raw-key').value);
      setStatus('key-copy-status', 'คัดลอกกุญแจแล้ว พร้อมส่งให้ผู้รับเป็นการส่วนตัว', 'success');
    } catch {
      $('raw-key').focus(); $('raw-key').select();
      setStatus('key-copy-status', 'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความไว้แล้ว ใช้คำสั่งคัดลอกของเครื่องหรือกด Ctrl/Cmd + C', 'error');
    }
  });
  $('select-key').addEventListener('click', () => { $('raw-key').focus(); $('raw-key').select(); setStatus('key-copy-status', 'เลือกกุญแจแล้ว ใช้คำสั่งคัดลอกของเครื่องหรือกด Ctrl/Cmd + C'); });
  $('key-dialog').addEventListener('cancel', event => { event.preventDefault(); setStatus('key-copy-status', 'กุญแจนี้แสดงครั้งเดียว เมื่อเก็บไว้แล้วให้กด “เก็บกุญแจแล้ว · ปิดหน้านี้”'); });
  $('close-key-dialog').addEventListener('click', () => { $('raw-key').value = ''; $('key-dialog').close(); $('recipient-name').focus(); });
  $('confirm-revoke').addEventListener('click', async () => {
    const key = state.pendingRevoke; if (!key) return;
    const epoch = state.epoch; $('confirm-revoke').disabled = true; $('cancel-revoke').disabled = true;
    setStatus('revoke-status', 'กำลังเพิกถอนกุญแจ');
    try {
      const result = await request('/api/shelf', { action: 'revoke-key', id: key.id });
      if (epoch !== state.epoch || !state.authenticated) return;
      if (!result.key?.revokedAt) throw apiError('INVALID_RESPONSE');
      $('revoke-dialog').close(); state.pendingRevoke = null;
      const refreshed = await loadDashboard();
      if (epoch === state.epoch && state.authenticated && refreshed) setStatus('dashboard-status', `เพิกถอนกุญแจของ ${key.name} แล้ว`, 'success');
    } catch (error) { if (epoch === state.epoch && !expired(error)) setStatus('revoke-status', messageFor(error), 'error'); }
    finally { $('confirm-revoke').disabled = false; $('cancel-revoke').disabled = false; }
  });
  $('cancel-revoke').addEventListener('click', () => { $('revoke-dialog').close(); state.pendingRevoke = null; });
  $('revoke-dialog').addEventListener('cancel', event => { if ($('confirm-revoke').disabled) event.preventDefault(); else state.pendingRevoke = null; });
  document.querySelectorAll('input[name="scope"]').forEach(input => input.addEventListener('change', () => { $('source-options').hidden = input.value !== 'selected'; setStatus('create-status'); }));
  $('key-search').addEventListener('input', renderKeys);
  $('key-status-filter').addEventListener('change', renderKeys);
  $('activity-recipient').addEventListener('change', renderActivity);
  $('recipient-choice').addEventListener('change', () => { $('recipient-name').value = ''; syncRecipientChoice(); setStatus('create-status'); });
  $('refresh-button').addEventListener('click', loadDashboard);
  $('session-retry').addEventListener('click', checkSession);
  window.addEventListener('pagehide', () => { $('raw-key').value = ''; $('password').value = ''; });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    clearPrivateView();
    $('dashboard').hidden = true;
    $('login-view').hidden = true;
    $('logout-button').hidden = true;
    checkSession();
  });
  checkSession();
})();
