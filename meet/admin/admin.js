(() => {
  const state = { key: sessionStorage.getItem('meetAdminKey') || '', rows: [], channels: {}, filter: 'all', query: '' };
  const $ = selector => document.querySelector(selector);
  const loginPanel = $('#loginPanel'), dashboard = $('#dashboard');
  const list = $('#bookingList'), empty = $('#emptyState');

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  const INTENT = { health: 'สุขภาพ', opportunity: 'โอกาสใหม่', curious: 'ยังไม่แน่ใจ' };
  const STATUS = { new: 'ใหม่', contacted: 'ติดต่อแล้ว', scheduled: 'นัดแล้ว', done: 'จบแล้ว', dropped: 'ไม่ไปต่อ' };
  const NOTIFY = { delivered: 'แจ้งเตือนส่งแล้ว', failed: 'แจ้งเตือนไม่ออก', unconfigured: 'ยังไม่ตั้งช่องทาง', pending: 'รอส่ง' };

  const showMessage = (target, text, kind) => {
    target.textContent = text;
    target.className = 'message' + (kind ? ` ${kind}` : '');
    target.hidden = !text;
  };

  /* A LINE id is not dialable and a phone number is not a LINE link, so pick the
     action that actually opens something on a phone. */
  function contactLink(contact) {
    const value = String(contact || '').trim();
    const digits = value.replace(/[^0-9+]/g, '');
    if (value.startsWith('@')) return `https://line.me/R/ti/p/${encodeURIComponent(value)}`;
    if (digits.length >= 9 && /^[0-9+][0-9\s-]*$/.test(value)) return `tel:${digits}`;
    return '';
  }

  /* datetime-local wants local wall time, not the UTC string Postgres returns. */
  function toLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const adminTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  function adminTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const parts = adminTimeFormatter.formatToParts(date);
    const get = type => parts.find(part => part.type === type)?.value || '';
    return [
      get('weekday').toUpperCase(),
      get('day'),
      get('month').toUpperCase(),
      get('year'),
    ].join(' ') + ` · ${get('hour')}:${get('minute')}`;
  }

  async function api(method = 'GET', body) {
    const response = await fetch('/api/meet', {
      method,
      headers: { 'content-type': 'application/json', 'x-admin-key': state.key },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'เชื่อมต่อระบบไม่สำเร็จ');
    return result;
  }

  function updateStats() {
    $('#statNew').textContent = state.rows.filter(row => row.status === 'new').length;
    $('#statContacted').textContent = state.rows.filter(row => row.status === 'contacted').length;
    $('#statScheduled').textContent = state.rows.filter(row => row.status === 'scheduled').length;
    $('#statFailed').textContent = state.rows.filter(row => row.notify_status === 'failed').length;
  }

  function renderChannelWarning() {
    const off = [];
    if (!state.channels.line) off.push('LINE');
    if (!state.channels.telegram) off.push('Telegram');
    const warning = $('#channelWarning');
    if (!off.length) return showMessage(warning, '', '');
    const all = off.length === 2;
    showMessage(warning, all
      ? 'ยังไม่ได้ตั้งช่องทางแจ้งเตือนเลย — คนลงนัดจะถูกบันทึกไว้ครบ แต่จะไม่มีอะไรเด้งเข้ามือถือ ต้องเปิดหน้านี้เช็คเอง'
      : `ยังไม่ได้ตั้ง ${off.join(' และ ')} — ตอนนี้เด้งเข้าช่องทางเดียว`, 'warn');
  }

  function card(row) {
    const link = contactLink(row.contact);
    const contact = link
      ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(row.contact)}</a>`
      : `<strong>${esc(row.contact)}</strong>`;
    const notifyBad = row.notify_status === 'failed' || row.notify_status === 'unconfigured';
    return `<article class="booking-card" data-id="${row.id}">
      <header>
        <div class="who">
          <strong>${esc(row.name)}</strong>
          ${contact}
          <small>${esc(row.reference)} · เข้ามา ${esc(adminTime(row.created_at))}</small>
        </div>
        <div class="badges">
          <span class="badge ${esc(row.status)}">${esc(STATUS[row.status] || row.status)}</span>
          <span class="badge ${notifyBad ? esc(row.notify_status) : ''}">${esc(NOTIFY[row.notify_status] || row.notify_status)}</span>
        </div>
      </header>
      <div class="facts">
        <span>${esc(INTENT[row.intent] || row.intent)}</span>
        <span>${esc(row.meet_mode)}</span>
        <span>สะดวก ${esc(row.pref_day)} ${esc(row.pref_time)}</span>
        ${row.scheduled_at ? `<span>นัดจริง ${esc(adminTime(row.scheduled_at))}</span>` : ''}
      </div>
      ${row.note ? `<p class="said">${esc(row.note)}</p>` : ''}
      <div class="controls">
        <div class="control-row">
          ${row.status === 'new' ? '<button class="primary" data-action="contacted">ทักไปแล้ว</button>' : ''}
          ${row.status !== 'done' ? '<button data-action="done">จบแล้ว</button>' : ''}
          ${row.status !== 'dropped' ? '<button class="ghost" data-action="dropped">ไม่ไปต่อ</button>' : ''}
          ${notifyBad ? '<button data-action="retry_notify">ส่งแจ้งเตือนอีกครั้ง</button>' : ''}
        </div>
        <div class="control-row">
          <input type="datetime-local" data-field="schedule" value="${esc(toLocalInput(row.scheduled_at))}" aria-label="เวลานัดจริง">
          <button data-action="save_schedule">บันทึกเวลานัด</button>
        </div>
        <div class="control-row">
          <textarea data-field="note" placeholder="โน้ตของเรา — คุยอะไรไปแล้วบ้าง" aria-label="โน้ตของเรา">${esc(row.owner_note || '')}</textarea>
          <button data-action="save_note">บันทึกโน้ต</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const query = state.query.toLowerCase();
    const rows = state.rows.filter(row =>
      (state.filter === 'all' || row.status === state.filter)
      && [row.name, row.contact, row.reference, row.owner_note, row.note]
        .some(value => String(value || '').toLowerCase().includes(query)));
    list.innerHTML = rows.map(card).join('');
    empty.hidden = rows.length > 0;
    updateStats();
    renderChannelWarning();
  }

  async function load() {
    const result = await api();
    state.rows = result.bookings || [];
    state.channels = result.channels || {};
    render();
  }

  async function act(id, action, extra) {
    showMessage($('#dashboardMessage'), '', '');
    try {
      await api('PATCH', Object.assign({ id: Number(id), action }, extra || {}));
      await load();
    } catch (error) {
      showMessage($('#dashboardMessage'), error.message, 'error');
    }
  }

  list.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const article = button.closest('.booking-card');
    const id = article.dataset.id;
    const action = button.dataset.action;
    if (action === 'save_schedule') {
      const value = article.querySelector('[data-field="schedule"]').value;
      // An empty box clears the agreed time without touching the status.
      return act(id, 'set_schedule', { scheduledAt: value ? new Date(value).toISOString() : '' });
    }
    if (action === 'save_note') {
      return act(id, 'set_note', { note: article.querySelector('[data-field="note"]').value });
    }
    if (action === 'retry_notify') return act(id, 'retry_notify');
    return act(id, 'set_status', { status: action });
  });

  $('#searchInput').addEventListener('input', event => { state.query = event.target.value; render(); });
  document.querySelector('.filters').addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    document.querySelectorAll('.filters button').forEach(b => b.classList.toggle('active', b === button));
    state.filter = button.dataset.filter;
    render();
  });
  $('#refreshButton').addEventListener('click', () => load().catch(error =>
    showMessage($('#dashboardMessage'), error.message, 'error')));

  async function enter(key) {
    state.key = key;
    await load();
    sessionStorage.setItem('meetAdminKey', key);
    loginPanel.hidden = true;
    dashboard.hidden = false;
    $('#refreshButton').hidden = false;
  }

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    showMessage($('#loginMessage'), '', '');
    try {
      await enter($('#adminKey').value.trim());
    } catch (error) {
      sessionStorage.removeItem('meetAdminKey');
      showMessage($('#loginMessage'), error.message, 'error');
    }
  });

  if (state.key) enter(state.key).catch(() => sessionStorage.removeItem('meetAdminKey'));
})();
