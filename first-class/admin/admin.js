(() => {
  const state = { key: sessionStorage.getItem('firstClassAdminKey') || '', rows: [], filter: 'all', query: '' };
  const $ = selector => document.querySelector(selector);
  const loginPanel = $('#loginPanel'), dashboard = $('#dashboard'), list = $('#registrationList'), empty = $('#emptyState');
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
  const label = value => ({ submitted:'รอตรวจยอด', proof_requested:'ขอสลิป', paid:'ชำระแล้ว', pending:'—', sending:'กำลังส่ง', granted:'First Class', ready:'พร้อมทำ', sent:'Sent', failed:'Failed', needs_match:'จับคู่ Discord' }[value] || value || '—');
  const showMessage = (target, text) => { target.textContent = text; target.hidden = !text; };

  async function api(method = 'GET', body) {
    const response = await fetch('/api/first-class', { method, headers: { 'content-type':'application/json', 'x-admin-key':state.key }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'เชื่อมต่อระบบไม่สำเร็จ');
    return result;
  }
  function updateStats() {
    $('#statSubmitted').textContent = state.rows.length;
    $('#statPaid').textContent = state.rows.filter(row => row.payment_status === 'paid').length;
    $('#statGranted').textContent = state.rows.filter(row => row.first_class_status === 'granted').length;
    $('#statAttention').textContent = state.rows.filter(row => ['proof_requested'].includes(row.payment_status) || ['failed','needs_match'].includes(row.discord_role_status) || row.confirmation_email_status === 'failed' || row.meta_purchase_status === 'failed').length;
  }
  function render() {
    const query = state.query.toLowerCase();
    const rows = state.rows.filter(row => (state.filter === 'all' || row.payment_status === state.filter) && [row.display_name,row.email,row.discord_username,row.line_id].some(value => String(value || '').toLowerCase().includes(query)));
    list.innerHTML = rows.map(row => {
      const tools = Array.isArray(row.ai_tools) ? row.ai_tools : [];
      const paid = row.payment_status === 'paid';
      const granted = row.discord_role_status === 'granted';
      return `<article class="person-card" data-id="${row.id}">
        <div class="identity"><strong>${esc(row.display_name)}</strong><span>${row.discord_username ? `@${esc(row.discord_username)}` : 'ยังไม่แจ้ง Discord'}</span><small>${esc(row.email)}</small></div>
        <div class="meta"><b>โอน ${esc(String(row.transfer_time || '').slice(0,5))}</b><br>AI level: ${esc(row.ai_level || '—')}/10<br>LINE: ${esc(row.line_id || '—')}<br>${new Date(row.created_at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}</div>
        <div class="tools">${tools.map(tool => `<span>${esc(tool)}</span>`).join('')}</div>
        <div class="status-stack"><div class="badges"><span class="badge ${esc(row.payment_status)}">${label(row.payment_status)}</span><span class="badge ${esc(row.discord_role_status)}">Discord: ${label(row.discord_role_status)}</span><span class="badge ${esc(row.confirmation_email_status)}">Email: ${label(row.confirmation_email_status)}</span><span class="badge ${esc(row.meta_purchase_status)}" title="${esc(row.meta_purchase_error || '')}">Meta: ${label(row.meta_purchase_status)}</span></div>
          <div class="actions">${!paid ? `<button class="primary" data-action="confirm_payment">ยืนยัน 98 บาท</button><button data-action="request_proof">ขอสลิป</button>` : ''}${paid && !granted ? `<button class="purple" data-action="grant_role">มอบ Role แล้ว</button>` : ''}${paid && row.meta_purchase_status === 'failed' ? `<button data-action="retry_meta">Retry Meta</button>` : ''}${row.emailDraft?.mailto ? `<a href="${esc(row.emailDraft.mailto)}" data-email="${row.id}">เปิดอีเมล</a>` : ''}${!row.attended ? `<button data-action="mark_attended">มาเรียนแล้ว</button>` : `<span class="badge paid">เข้าเรียนแล้ว</span>`}</div></div>
      </article>`;
    }).join('');
    empty.hidden = rows.length > 0;
  }
  async function load() {
    const result = await api();
    state.rows = result.registrations || [];
    loginPanel.hidden = true; dashboard.hidden = false; $('#refreshButton').hidden = false;
    sessionStorage.setItem('firstClassAdminKey', state.key);
    updateStats(); render();
  }
  async function action(button, id, actionName) {
    let note;
    if (actionName === 'request_proof') note = window.prompt('เหตุผลสั้น ๆ ที่ต้องขอสลิป', 'ระบบยังจับคู่ยอดไม่เจอ');
    if (actionName === 'request_proof' && note === null) return;
    button.disabled = true;
    try { await api('PATCH', { id, action:actionName, note }); await load(); }
    catch (error) { showMessage($('#dashboardMessage'), error.message); }
    finally { button.disabled = false; }
  }
  $('#loginForm').addEventListener('submit', async event => { event.preventDefault(); state.key = $('#adminKey').value; try { await load(); } catch (error) { showMessage($('#loginMessage'), error.message); } });
  $('#refreshButton').addEventListener('click', () => load().catch(error => showMessage($('#dashboardMessage'), error.message)));
  $('#searchInput').addEventListener('input', event => { state.query = event.target.value; render(); });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('active')); button.classList.add('active'); state.filter = button.dataset.filter; render(); }));
  list.addEventListener('click', event => { const button = event.target.closest('button[data-action]'); if (button) action(button, Number(button.closest('[data-id]').dataset.id), button.dataset.action); const email = event.target.closest('[data-email]'); if (email) api('PATCH',{id:Number(email.dataset.email),action:'email_sent'}).catch(()=>{}); });
  $('#exportButton').addEventListener('click', () => { const keys=['reference','display_name','email','discord_username','ai_tools','ai_level','transfer_time','line_id','payment_status','first_class_status','discord_role_status','confirmation_email_status','meta_purchase_status','meta_purchase_event_id','meta_purchase_sent_at','utm','utm_json','fbp','fbc','landing_referrer','attended','created_at']; const cell=value=>`"${String(typeof value==='object'&&!Array.isArray(value)?JSON.stringify(value):Array.isArray(value)?value.join(' | '):value??'').replaceAll('"','""')}"`; const csv='\uFEFF'+[keys.join(','),...state.rows.map(row=>keys.map(key=>cell(row[key])).join(','))].join('\n'); const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='first-class-registrations.csv';link.click();URL.revokeObjectURL(link.href); });
  if (state.key) load().catch(() => sessionStorage.removeItem('firstClassAdminKey'));
})();
