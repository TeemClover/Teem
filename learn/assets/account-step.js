export function safeReturn(value, origin) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  try {
    const url = new URL(value, origin);
    const foundation = (url.pathname.startsWith('/classroom/') || url.pathname.startsWith('/learn/classroom/')) && !/%|\/\./.test(url.pathname);
    return url.origin === origin && (['/ai-source/', '/learn/'].includes(url.pathname) || foundation) && !url.searchParams.has('enroll') ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}
export async function authRequest(fetcher, action, body) {
  const response = await fetcher('/api/auth/' + action, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  let data; try { data = await response.json(); } catch { throw new Error('เชื่อมต่อบัญชีไม่ได้ กรุณาลองใหม่'); }
  if (!response.ok || data?.ok !== true) throw new Error(data?.message || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้สอน');
  return data;
}
export function googleStartUrl(returnTo, origin) {
  let target = '/learn/';
  if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\')) {
    try { const url = new URL(returnTo, origin); if (url.origin === origin && safeReturn(url.pathname, origin)) target = url.pathname + url.search + url.hash; } catch { /* keep the local classroom fallback */ }
  }
  return '/api/auth/oauth/google/start?return=' + encodeURIComponent(target);
}
export async function showVerification({ panel, email = '', onVerified, fetcher = window.fetch.bind(window), returnTo = window.location.pathname + window.location.search + (window.location.hash || ''), isCurrent = () => true }) {
  panel.replaceChildren(); panel.hidden = false;
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
  panel.append(el('p', 'กำลังตรวจวิธีเข้าสู่ระบบ…'));
  let providers;
  try { const data = await authRequest(fetcher, 'providers'); providers = data.providers || {}; }
  catch {
    if (!isCurrent()) return;
    panel.replaceChildren(el('h1', 'ตรวจวิธีเข้าสู่ระบบไม่สำเร็จ'), el('p', 'กรุณาลองอีกครั้ง หรือติดต่อผู้สอนเพื่อช่วยเข้าบัญชี')); appendAlternatives(true); return;
  }
  if (!isCurrent()) return;
  const googleAvailable = providers.google === true, otpAvailable = providers.otp === true;
  panel.replaceChildren(el('p', 'YOUR MYCLOVER ACCOUNT', 'eyebrow'));
  if (!googleAvailable && !otpAvailable) {
    panel.append(el('h1', 'การยืนยันอีเมลยังไม่พร้อม'), el('p', 'ขณะนี้ยังไม่มีวิธียืนยันอีเมลสำหรับเปิดห้องเรียน กรุณาติดต่อผู้สอนเพื่อช่วยเข้าบัญชี หรือลองตรวจอีกครั้งภายหลัง'));
    appendAlternatives(true); return;
  }
  panel.append(el('h1', 'ใช้อีเมลเดียว เรียนต่อได้ทุกครั้ง'));
  if (googleAvailable) {
    panel.append(el('p', email ? `ใช้ Google ที่เป็นอีเมลเดียวกับ ${email} เพื่อเปิดคอร์สของคุณ หากอีเมลไม่ตรง ติดต่อผู้สอนให้ช่วยตรวจบัญชีได้` : 'ใช้ Google เพื่อยืนยันอีเมลและเปิดห้องเรียน เลือกอีเมลเดียวกับที่คุณใช้สมัครคอร์ส'));
    const googleForm = el('form', '', 'verification-form'), label = el('label', '', 'consent-label'), consent = el('input');
    consent.type = 'checkbox'; consent.name = 'google_consent'; consent.required = true;
    label.append(consent, el('span', 'ยินยอมให้ myClover เก็บบัญชี สิทธิ์เรียน และความคืบหน้า เพื่อให้บริการห้องเรียน'));
    const button = el('button', 'เข้าสู่ห้องเรียนด้วย Google', 'button button-primary'); button.type = 'submit';
    googleForm.append(label, button); panel.append(googleForm);
    googleForm.addEventListener('submit', event => {
      event.preventDefault(); if (!isCurrent() || !googleForm.reportValidity() || consent.checked !== true) return;
      button.disabled = true; window.location.assign(googleStartUrl(returnTo, window.location.origin));
    });
  }
  if (!otpAvailable) { appendAlternatives(false); return; }
  const otpContainer = googleAvailable ? el('details', '', 'optional-resources') : panel;
  if (googleAvailable) { otpContainer.append(el('summary', 'หรือยืนยันด้วยรหัสทางอีเมล')); panel.append(otpContainer); }
  otpContainer.append(el('p', 'เราจะส่งรหัส 6 หลักไปยังอีเมลของคุณ เพื่อยืนยันบัญชีและเก็บคอร์สไว้ให้ถูกคน'));
  const form = el('form'); form.className = 'verification-form';
  const field = (label, type, name, autocomplete) => { const wrap = el('label', label), input = el('input'); input.type = type; input.name = name; input.autocomplete = autocomplete; input.required = true; wrap.append(input); form.append(wrap); return input; };
  const nameInput = field('ชื่อที่ให้เราเรียก', 'text', 'name', 'name'); nameInput.maxLength = 80;
  const emailInput = field('อีเมลที่ใช้เรียน', 'email', 'email', 'email'); emailInput.value = email; emailInput.maxLength = 120;
  const consentLabel = el('label', '', 'consent-label'), consent = el('input'); consent.type = 'checkbox'; consent.required = true; consent.name = 'consent'; consentLabel.append(consent, el('span', 'ยินยอมให้ myClover เก็บบัญชี สิทธิ์เรียน และความคืบหน้า เพื่อให้บริการห้องเรียน')); form.append(consentLabel);
  const codeLabel = el('label', 'รหัส 6 หลักในอีเมล'), code = el('input'); code.name = 'otp'; code.inputMode = 'numeric'; code.autocomplete = 'one-time-code'; code.pattern = '[0-9]{6}'; code.maxLength = 6; codeLabel.hidden = true; codeLabel.append(code); form.append(codeLabel);
  const submit = el('button', 'รับรหัสทางอีเมล', 'button button-primary'); submit.type = 'submit';
  const resend = el('button', 'ขอรหัสใหม่', 'button button-secondary'); resend.type = 'button'; resend.hidden = true;
  const changeEmail = el('button', 'แก้อีเมล', 'button button-secondary'); changeEmail.type = 'button'; changeEmail.hidden = true;
  const actions = el('div', '', 'state-actions'); actions.append(submit, resend, changeEmail); form.append(actions);
  const message = el('p', '', 'verification-message'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); form.append(message); otpContainer.append(form);
  appendAlternatives(false);
  let requestId = null, resendAt = 0, busy = false;
  const setBusy = value => { busy = value; submit.disabled = value; resend.disabled = value; changeEmail.disabled = value; };
  async function send() {
    const data = await authRequest(fetcher, 'otp/request', { email: emailInput.value.trim() });
    if (typeof data.requestId !== 'string' || !data.requestId) throw new Error('ยังไม่ได้รับเลขอ้างอิงรหัส กรุณาลองใหม่');
    requestId = data.requestId; resendAt = Date.now() + Math.max(45, Number(data.resendAfter) || 45) * 1000;
    emailInput.readOnly = true; codeLabel.hidden = false; code.required = true; resend.hidden = false; changeEmail.hidden = false; submit.textContent = 'ยืนยันอีเมลและไปต่อ';
    message.textContent = 'ส่งรหัสแล้ว ตรวจกล่องขาเข้าหรือจดหมายขยะของอีเมลที่ระบุ'; code.focus();
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!isCurrent() || busy || !form.reportValidity()) return; setBusy(true); message.textContent = 'กำลังดำเนินการ…';
    try {
      if (!requestId) await send();
      else {
        await authRequest(fetcher, 'otp/verify', { requestId, otp: code.value, name: nameInput.value.trim() });
        const session = await authRequest(fetcher, 'session');
        if (!session.user?.emailVerified) throw new Error('ยังยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่');
        if (!isCurrent()) return; message.textContent = 'ยืนยันอีเมลแล้ว กำลังเปิดห้องเรียน…'; await onVerified(session.user);
      }
    } catch (error) { message.textContent = error.message; } finally { setBusy(false); }
  });
  resend.addEventListener('click', async () => {
    if (!isCurrent() || busy) return;
    if (Date.now() < resendAt) { message.textContent = `ขอรหัสใหม่ได้ในอีก ${Math.ceil((resendAt - Date.now()) / 1000)} วินาที`; return; }
    setBusy(true); try { code.value = ''; await send(); } catch (error) { message.textContent = error.message; } finally { setBusy(false); }
  });
  changeEmail.addEventListener('click', () => {
    if (busy) return; requestId = null; code.value = ''; code.required = false; codeLabel.hidden = true; emailInput.readOnly = false;
    resend.hidden = true; changeEmail.hidden = true; submit.textContent = 'รับรหัสทางอีเมล'; message.textContent = 'แก้อีเมลแล้วขอรหัสสำหรับอีเมลใหม่อีกครั้ง'; emailInput.focus();
  });
  function appendAlternatives(retry) {
    if (retry) { const again = el('button', 'ลองตรวจอีกครั้ง', 'button button-secondary'); again.type = 'button'; again.addEventListener('click', () => showVerification({ panel, email, onVerified, fetcher, returnTo, isCurrent })); panel.append(again); }
    const account = el('button', 'เข้าสู่ระบบด้วยบัญชีเดิม', 'account-alternative'); account.type = 'button'; account.setAttribute('data-account-open', 'login'); panel.append(account);
    const support = el('p'), contact = el('a', 'ติดต่อผู้สอนให้ช่วยเข้าบัญชี ↗'); contact.href = 'https://lin.ee/rlSlhzT'; contact.target = '_blank'; contact.rel = 'noopener noreferrer'; support.append(contact); panel.append(support);
  }
}
if (typeof window !== 'undefined') {
  window.MyCloverLearnAccount = {
    async ensureVerified({ returnTo = '/learn/' } = {}) {
      try { const data = await authRequest(window.fetch.bind(window), 'session'); if (data.user?.emailVerified) return data.user; } catch { /* verification page shows the actionable error */ }
      const target = safeReturn(returnTo, window.location.origin) || '/learn/';
      window.location.assign('/learn/?enroll=ai-sauce&return=' + encodeURIComponent(target)); return null;
    },
  };
}
