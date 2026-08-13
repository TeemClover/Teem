(() => {
  const form = document.getElementById('registrationForm');
  const success = document.getElementById('successState');
  const message = document.getElementById('formMessage');
  if (!form || !success || !message) return;

  const otherToggle = document.getElementById('aiOtherToggle');
  const otherField = document.getElementById('aiOtherField');
  const otherInput = form.elements.aiOther;
  const copyBankButton = document.getElementById('copyBankButton');

  const setMessage = (text, field) => {
    message.textContent = text;
    message.hidden = false;
    const target = field && form.elements[field];
    const focusTarget = target instanceof RadioNodeList ? target[0] : target;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.setAttribute('aria-invalid', 'true');
      focusTarget.focus();
    }
  };

  const syncOtherField = () => {
    const active = Boolean(otherToggle?.checked);
    otherField?.classList.toggle('active', active);
    if (otherInput) {
      otherInput.disabled = !active;
      otherInput.required = active;
      if (!active) otherInput.value = '';
    }
  };

  otherToggle?.addEventListener('change', syncOtherField);
  syncOtherField();

  copyBankButton?.addEventListener('click', async () => {
    const account = copyBankButton.dataset.account || '';
    const original = copyBankButton.textContent;
    try {
      await navigator.clipboard.writeText(account);
      copyBankButton.textContent = 'คัดลอกแล้ว ✓';
    } catch (_) {
      const input = document.createElement('textarea');
      input.value = account;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      copyBankButton.textContent = 'คัดลอกแล้ว ✓';
    }
    window.setTimeout(() => { copyBankButton.textContent = original; }, 1800);
  });

  form.addEventListener('input', event => {
    if (event.target && event.target.removeAttribute) event.target.removeAttribute('aria-invalid');
    message.hidden = true;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.hidden = true;
    const data = new FormData(form);
    const aiTools = data.getAll('aiTools').map(String);
    const payload = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      discordUsername: String(data.get('discordUsername') || '').trim(),
      aiTools,
      aiOther: String(data.get('aiOther') || '').trim(),
      aiLevel: Number(data.get('aiLevel')),
      transferTime: String(data.get('transferTime') || ''),
      lineId: String(data.get('lineId') || '').trim(),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') || ''),
      attribution: window.firstClassMeta?.attribution?.() || {},
    };

    if (!payload.name) return setMessage('บอกชื่อที่อยากให้เราเรียกหน่อยครับ', 'name');
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) return setMessage('ตรวจอีเมลอีกครั้ง เพื่อให้ข้อมูลคลาสส่งถึงคุณ', 'email');
    if (!aiTools.length) return setMessage('เลือก AI ที่ใช้อยู่ อย่างน้อย 1 ข้อ', 'aiTools');
    if (aiTools.includes('อื่น ๆ') && !payload.aiOther) return setMessage('เขียนชื่อ AI อื่น ๆ ที่คุณใช้อยู่หน่อยครับ', 'aiOther');
    if (!Number.isInteger(payload.aiLevel) || payload.aiLevel < 1 || payload.aiLevel > 10) return setMessage('ให้คะแนนความเชี่ยวชาญ AI ของตัวเอง 1–10 หน่อยครับ', 'aiLevel');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.transferTime)) return setMessage('ระบุเวลาโอนให้ครบ HH:MM ครับ', 'transferTime');
    if (!payload.consent) return setMessage('ยืนยันการใช้ข้อมูลสำหรับ First Class ก่อนส่งครับ', 'consent');

    const button = form.querySelector('button[type="submit"]');
    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'กำลังส่งข้อมูล…';
    try {
      const response = await fetch('/api/first-class', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Object.assign(new Error(result.message || 'ส่งข้อมูลไม่สำเร็จ'), { field: result.field });
      document.getElementById('successName').textContent = payload.name;
      document.getElementById('successEmail').textContent = payload.email;
      document.getElementById('successReference').textContent = result.reference;
      document.getElementById('successDiscordStatus').textContent = payload.discordUsername
        ? `หลังตรวจยอด เราจะเปิดสิทธิ์ให้ Discord: ${payload.discordUsername} โดยอัตโนมัติ`
        : 'ยังไม่ได้แจ้ง Discord Username — เข้า Server รอไว้ก่อนได้ แล้วส่ง Username พร้อมสลิปทาง LINE Official เพื่อยืนยันตัวตน';
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { window.firstClassMeta?.trackLead?.(result.reference); } catch (_) { /* analytics is optional */ }
      try { window.gtag && window.gtag('event', 'first_class_registered'); } catch (_) { /* analytics is optional */ }
    } catch (error) {
      setMessage(error.message || 'การเชื่อมต่อสะดุด ลองส่งอีกครั้งได้เลยครับ', error.field);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });
})();
