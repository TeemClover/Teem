const $ = id => document.getElementById(id);
const state = { tab: 'overview', range: 'today', next: {}, filters: {} };
const panels = [...document.querySelectorAll('[data-panel]')];

function escapeHtml(value) {
  return String(value ?? '—').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function n(value) { return new Intl.NumberFormat('th-TH').format(Number(value || 0)); }
function when(value) {
  if (!value) return '—';
  const date = new Date(value); return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(date) : '—';
}
function badge(value) {
  const text = String(value || '—'); return `<span class="badge ${escapeHtml(text.toLowerCase())}">${escapeHtml(text)}</span>`;
}
function metric(label, value, suffix = '') {
  const shown = value === null || value === undefined ? '—' : `${n(value)}${suffix}`;
  return `<div class="metric"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(shown)}</dd></div>`;
}
function metricGroup(title, items) {
  return `<article class="metric-group"><h2>${escapeHtml(title)}</h2><dl class="metric-list">${items.join('')}</dl></article>`;
}
function table(headers, rows, empty = 'ยังไม่มีข้อมูล') {
  if (!rows.length) return `<div class="empty">${escapeHtml(empty)}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(item => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'BAD_RESPONSE' }));
  if (response.status === 401) showLogin();
  if (!response.ok) throw new Error(data.message || data.error || 'โหลดข้อมูลไม่สำเร็จ');
  return data;
}
function showLogin() { $('dashboard').hidden = true; $('loginView').hidden = false; $('password').focus(); }
function showDashboard() { $('loginView').hidden = true; $('dashboard').hidden = false; }
function setStatus(text = '') { $('pageStatus').textContent = text; }

async function loadOverview() {
  const [summary, activity] = await Promise.all([
    api(`/api/xty/admin/summary?range=${state.range}`),
    api(`/api/xty/admin/activity?range=${state.range}`),
  ]);
  const u = summary.users; const p = summary.parties; const a = summary.activity; const c = summary.cards;
  const q = summary.quest; const cf = summary.confirms; const pg = summary.progression; const save = summary.save;
  const groups = [
    metricGroup('Users', [metric('Total', u.total), metric('Active', u.active), metric('Guest', u.guest), metric('Saved', u.bound), metric('New', u.new), metric('Save adoption', u.emailSaveRate, '%')]),
    metricGroup('Parties', [metric('Active', p.active), metric('Completed', p.completed), metric('Dissolved', p.dissolved), metric('Public', p.public), metric('Trust', p.trust), metric('Confirm', p.confirm)]),
    metricGroup('Activity', [metric('Commit', a.commits), metric('Message', a.messages), metric('React', a.reactions), metric('Confirm', a.confirms), metric('Waiting', a.waiting_confirm), metric('Legacy react · no date', a.legacy_reactions_without_timestamp)]),
    metricGroup('Cards', [metric('Rewards', c.rewards), metric('Revealed', c.revealed), metric('Pending', c.pending), metric('Collectors', c.owners), metric('Integrity', summary.integrity.issues)]),
    metricGroup('Quest health', [metric('Created', q.created), metric('First commit', q.firstCommit), metric('First commit rate', q.firstCommitRate, '%'), metric('Completion rate', q.completionRate, '%'), metric('Next quest', q.nextQuest)]),
    metricGroup('Confirm health', [metric('Requests', cf.requests), metric('Confirmed', cf.confirmed), metric('Pending', cf.pending), metric('Expired', cf.expired), metric('Same day', cf.sameDayRate, '%')]),
    metricGroup('Levels', [metric('Lv.1', pg.level_1), metric('Lv.2', pg.level_2), metric('Lv.3', pg.level_3), metric('Lv.4', pg.level_4), metric('At capacity', pg.at_create_capacity)]),
    metricGroup('Save / Tier', [metric('OTP sent', save.otpSent), metric('OTP verified', save.otpVerified), metric('Free', pg.free), metric('XTY+', pg.plus), metric('Max', pg.max)]),
  ].join('');
  const rows = activity.buckets.slice().reverse().map(row => `<tr><td>${escapeHtml(row.date)}</td><td>${n(row.commits)}</td><td>${n(row.messages)}</td><td>${n(row.reactions)}</td><td>${n(row.confirms)}</td><td>${n(row.partiesCreated)}</td><td>${n(row.partiesCompleted)}</td></tr>`);
  const durationRows = summary.durations.map(row => `<tr><td>${n(row.days)} days</td><td>${n(row.started)}</td><td>${n(row.completed)}</td><td>${n(row.dissolved)}</td><td>${n(row.completionRate)}%</td></tr>`);
  $('panel-overview').innerHTML = `<div class="metric-groups">${groups}</div><div class="split"><article class="section-card"><div class="section-head"><h2>Daily activity</h2></div>${table(['Date','Commit','Message','React','Confirm','Created','Completed'], rows)}</article><article class="section-card"><h2>Duration</h2>${table(['Quest','Started','Completed','Dissolved','Rate'],durationRows)}</article></div>`;
}

function partyQuery(cursor = '') {
  const filters = state.filters.parties || {};
  const params = new URLSearchParams({ limit: '50', sort: filters.sort || 'last_activity' });
  ['status','visibility','verification','occupancy'].forEach(key => { if (filters[key]) params.set(key, filters[key]); });
  if (cursor) params.set('cursor', cursor); return params;
}
async function loadParties(cursor = '') {
  const data = await api(`/api/xty/admin/parties?${partyQuery(cursor)}`); state.next.parties = data.nextCursor;
  const f = state.filters.parties || {};
  const controls = `<div class="filters">
    <select data-filter="status"><option value="">ทุกสถานะ</option><option value="ACTIVE">ACTIVE</option><option value="COMPLETED">COMPLETED</option><option value="DISSOLVED">DISSOLVED</option></select>
    <select data-filter="visibility"><option value="">Public + Private</option><option value="public">PUBLIC</option><option value="private">PRIVATE</option></select>
    <select data-filter="verification"><option value="">Trust + Confirm</option><option value="trust">TRUST</option><option value="confirm">CONFIRM</option></select>
    <select data-filter="occupancy"><option value="">ทุกขนาด</option><option value="joinable">JOINABLE</option><option value="full">FULL</option></select>
    <select data-filter="sort"><option value="last_activity">Last activity</option><option value="newest">Newest</option><option value="ending">Ending soon</option><option value="members">Members</option><option value="pending">Pending confirm</option></select>
  </div>`;
  const rows = data.parties.map(row => `<tr data-code="${escapeHtml(row.code)}"><td><b>${escapeHtml(row.name)}</b><br><span class="muted">${escapeHtml(row.code)}</span></td><td>${badge(row.state)}</td><td>${badge(row.visibility)}</td><td>${badge(row.verificationMode)}</td><td>D${n(row.day)} / ${n(row.durationDays)}</td><td>${n(row.members)} / ${n(row.maxMembers)}</td><td>${n(row.commitsToday)}</td><td>${n(row.messagesToday)}</td><td>${n(row.reactionsToday)}</td><td>${n(row.pendingConfirms)}</td><td>${when(row.lastActivityAt)}</td></tr>`);
  $('panel-parties').innerHTML = `<article class="section-card"><div class="section-head"><h2>Parties</h2>${controls}</div>${table(['Party','Status','Visibility','Mode','Day','Members','Commit','Message','React','Pending','Last activity'], rows)}${data.nextCursor ? '<div class="pager"><button type="button" data-next="parties">หน้าถัดไป</button></div>' : ''}</article>`;
  Object.entries(f).forEach(([key,value]) => { const input = document.querySelector(`[data-filter="${key}"]`); if (input) input.value = value; });
}

async function openParty(code) {
  const data = await api(`/api/xty/admin/parties/${encodeURIComponent(code)}`); const p = data.party;
  $('partyDialogTitle').textContent = `${p.name} · ${p.code}`;
  const details = [
    ['Status', badge(p.state)], ['Visibility', badge(p.visibility)], ['Mode', badge(p.verificationMode)],
    ['Activity', escapeHtml(p.activity)], ['Day', `${n(p.day)} / ${n(p.durationDays)}`], ['Scheduled end', when(p.scheduledEndAt)],
  ].map(([label,value]) => `<article><small>${label}</small><b>${value}</b></article>`).join('');
  const roster = data.roster.map(row => `<tr><td>${escapeHtml(row.alias)}</td><td>${escapeHtml(row.userId)}</td><td>${badge(row.role)}</td><td>${when(row.joinedAt)}</td><td>${when(row.leftAt)}</td></tr>`);
  const progress = data.progress.map(row => `<tr><td>${escapeHtml(row.date)}</td><td>${n(row.submitted)}</td><td>${n(row.valid)}</td><td>${n(row.waiting)}</td></tr>`);
  const events = data.events.map(row => `<tr><td>${when(row.at)}</td><td>${escapeHtml(row.type)}</td><td>Day ${n(row.day)}</td></tr>`);
  $('partyDialogBody').innerHTML = `<div class="detail-grid">${details}</div><article class="section-card"><h2>Roster</h2>${table(['Alias','User','Role','Joined','Left'],roster)}</article><article class="section-card"><h2>Progress</h2>${table(['Date','Submitted','Valid','Waiting'],progress)}</article><article class="section-card"><h2>Events</h2>${table(['Time','Event','Day'],events)}</article>`;
  $('partyDialog').showModal();
}

async function loadUsers(cursor = '') {
  const f = state.filters.users || {}; const params = new URLSearchParams({ limit: '50', sort: f.sort || 'last_activity' });
  if (f.account) params.set('account', f.account); if (f.level) params.set('level', f.level); if (f.active) params.set('active', f.active); if (cursor) params.set('cursor', cursor);
  const data = await api(`/api/xty/admin/users?${params}`); state.next.users = data.nextCursor;
  const controls = `<div class="filters"><select data-user-filter="account"><option value="">Guest + Saved</option><option value="guest">GUEST</option><option value="bound">SAVED</option></select><select data-user-filter="level"><option value="">ทุก Level</option><option value="1">Lv.1</option><option value="2">Lv.2</option><option value="3">Lv.3</option><option value="4">Lv.4</option></select><select data-user-filter="active"><option value="">ทุก activity</option><option value="today">Active Today</option><option value="7d">Active 7d</option><option value="30d">Active 30d</option><option value="inactive">No recent activity</option></select><select data-user-filter="sort"><option value="last_activity">Last activity</option><option value="created_at">Created</option><option value="level">Level</option><option value="completed">Completed</option><option value="cards">Cards</option></select></div>`;
  const rows = data.users.map(row => `<tr><td><b>${escapeHtml(row.alias)}</b><br><span class="muted">${escapeHtml(row.userId)}</span></td><td>${badge(row.accountType)}</td><td>Lv.${n(row.level)}</td><td>${n(row.createdParties)}</td><td>${n(row.joinedParties)}</td><td>${n(row.completedQuests)}</td><td>${n(row.cardsOwned)}</td><td>${when(row.lastActiveAt)}</td><td>${when(row.createdAt)}</td></tr>`);
  $('panel-users').innerHTML = `<article class="section-card"><div class="section-head"><h2>Users · no PII</h2>${controls}</div>${table(['Alias','Account','Level','Created','Joined','Completed','Cards','Last active','First seen'],rows)}${data.nextCursor ? '<div class="pager"><button type="button" data-next="users">หน้าถัดไป</button></div>' : ''}</article>`;
  Object.entries(f).forEach(([key,value]) => { const input = document.querySelector(`[data-user-filter="${key}"]`); if (input) input.value = value; });
}

function aggregateTable(title, rows) {
  return `<article class="section-card"><h2>${escapeHtml(title)}</h2>${table(['Group','Issued','Owned','In use'], rows.map(row => `<tr><td>${escapeHtml(String(row.id).toUpperCase())}</td><td>${n(row.issued)}</td><td>${n(row.owned)}</td><td>${n(row.inUse)}</td></tr>`))}</article>`;
}
async function loadCards() {
  const data = await api('/api/xty/admin/cards'); const s = data.summary;
  $('panel-cards').innerHTML = `<div class="metric-groups">${metricGroup('Rewards',[metric('Issued',s.rewardsIssued),metric('Revealed',s.rewardsRevealed),metric('Pending',s.pendingReveal),metric('Collectors',s.usersOwningCards),metric('Integrity',s.integrityIssues)])}</div><div class="split">${aggregateTable('Rarity',data.rarity)}${aggregateTable('Color',data.color)}</div>${aggregateTable('Species',data.species)}${data.integrity.length ? `<article class="section-card"><h2>Integrity issues</h2>${table(['Type','Card','Party'],data.integrity.map(row=>`<tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.cardId)}</td><td>${escapeHtml(row.party||row.partyId)}</td></tr>`))}</article>` : ''}`;
}
async function loadSystem() {
  const data = await api('/api/xty/admin/system'); const h = data.health; const c = data.partyCodes;
  const errors = data.errors.map(row => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.endpoint)}</td><td>${n(row.count)}</td><td>${when(row.lastSeenAt)}</td></tr>`);
  const integrity = data.integrity.rows.map(row => `<tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.cardId || row.party || row.partyId)}</td><td>${n(row.count || 1)}</td></tr>`);
  $('panel-system').innerHTML = `<div class="metric-groups">${metricGroup('System',[metric('API errors',h.apiErrors),metric('DB errors',h.dbQueryErrors),metric('Failed writes',h.failedWrites),metric('Integrity',data.integrity.issues)])}${metricGroup('Party codes',[metric('Live',c.live),metric('Duplicate live',c.duplicateLiveViolations),metric('Collision retry',data.constraints.partyCodeCollisionRetries)])}</div><article class="section-card"><h2>Errors</h2>${table(['Code','Endpoint','Count','Last seen'],errors)}</article><article class="section-card"><h2>Integrity</h2>${table(['Type','Target','Count'],integrity)}</article>`;
}
async function loadEvents(cursor = '') {
  const params = new URLSearchParams({ limit: '100' }); if (cursor) params.set('cursor', cursor);
  const data = await api(`/api/xty/admin/events?${params}`); state.next.events = data.nextCursor;
  const rows = data.events.map(row => `<tr><td>${when(row.at)}</td><td>${escapeHtml(row.type)}</td><td>${row.party ? `${escapeHtml(row.party.name)} · ${escapeHtml(row.party.code)}` : '—'}</td><td>${escapeHtml(row.userId)}</td><td>${escapeHtml(row.summary)}</td></tr>`);
  $('panel-events').innerHTML = `<article class="section-card"><h2>Audit events · metadata only</h2>${table(['Time','Event','Party','User','Summary'],rows)}${data.nextCursor ? '<div class="pager"><button type="button" data-next="events">หน้าถัดไป</button></div>' : ''}</article>`;
}

async function loadCurrent(cursor = '') {
  setStatus('กำลังโหลด…');
  try {
    if (state.tab === 'overview') await loadOverview();
    if (state.tab === 'parties') await loadParties(cursor);
    if (state.tab === 'users') await loadUsers(cursor);
    if (state.tab === 'cards') await loadCards();
    if (state.tab === 'system') await loadSystem();
    if (state.tab === 'events') await loadEvents(cursor);
    $('lastUpdated').textContent = `Last updated: ${new Intl.DateTimeFormat('th-TH',{timeStyle:'medium',timeZone:'Asia/Bangkok'}).format(new Date())}`;
    setStatus('');
  } catch (error) { setStatus(error.message); }
}
function selectTab(tab) {
  state.tab = tab;
  document.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-selected', button.dataset.tab === tab ? 'true' : 'false'));
  panels.forEach(panel => { panel.hidden = panel.dataset.panel !== tab; });
  loadCurrent();
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); $('loginStatus').textContent = 'กำลังตรวจ…';
  try {
    await api('/api/xty/admin/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
    $('password').value = ''; $('loginStatus').textContent = ''; showDashboard(); await loadCurrent();
  } catch (error) { $('loginStatus').textContent = error.message; }
});
$('logoutButton').addEventListener('click', async () => { try { await api('/api/xty/admin/logout',{method:'POST',body:'{}'}); } catch {} showLogin(); });
$('refreshButton').addEventListener('click', () => loadCurrent());
$('rangeSelect').addEventListener('change', event => { state.range = event.target.value; if (state.tab === 'overview') loadCurrent(); });
document.querySelector('.tabs').addEventListener('click', event => { const button = event.target.closest('[data-tab]'); if (button) selectTab(button.dataset.tab); });
document.addEventListener('change', event => {
  if (event.target.dataset.filter) { state.filters.parties ||= {}; state.filters.parties[event.target.dataset.filter] = event.target.value; loadParties(); }
  if (event.target.dataset.userFilter) { state.filters.users ||= {}; state.filters.users[event.target.dataset.userFilter] = event.target.value; loadUsers(); }
});
document.addEventListener('click', event => {
  const row = event.target.closest('tr[data-code]'); if (row) openParty(row.dataset.code).catch(error => setStatus(error.message));
  const next = event.target.closest('[data-next]'); if (next) loadCurrent(state.next[next.dataset.next] || '');
});
$('closeDialog').addEventListener('click', () => $('partyDialog').close());
$('partyDialog').addEventListener('click', event => { if (event.target === $('partyDialog')) $('partyDialog').close(); });

api('/api/xty/admin/session').then(() => { showDashboard(); loadCurrent(); }).catch(() => showLogin());
