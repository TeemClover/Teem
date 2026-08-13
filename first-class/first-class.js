(() => {
  const form = document.getElementById('registrationForm');
  const success = document.getElementById('successState');
  const message = document.getElementById('formMessage');
  if (!form || !success || !message) return;

  const setMessage = (text, field) => {
    message.textContent = text;
    message.hidden = false;
    const target = field && form.elements[field];
    if (target && typeof target.focus === 'function') {
      target.setAttribute('aria-invalid', 'true');
      target.focus();
    }
  };

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
      transferTime: String(data.get('transferTime') || ''),
      lineId: String(data.get('lineId') || '').trim(),
      consent: data.get('consent') === 'on',
      website: String(data.get('website') || ''),
    };

    if (!payload.name) return setMessage('บอกชื่อที่อยากให้เราเรียกหน่อยครับ', 'name');
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) return setMessage('ตรวจอีเมลอีกครั้ง เพื่อให้ข้อมูลคลาสส่งถึงคุณ', 'email');
    if (!payload.discordUsername) return setMessage('ใส่ Discord Username เพื่อให้เราเปิด First Class ถูกคน', 'discordUsername');
    if (!aiTools.length) return setMessage('เลือก AI ที่ใช้อยู่ อย่างน้อย 1 ข้อ');
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
      document.getElementById('successDiscord').textContent = payload.discordUsername;
      document.getElementById('successEmail').textContent = payload.email;
      document.getElementById('successReference').textContent = result.reference;
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { window.gtag && window.gtag('event', 'first_class_registered'); } catch (_) { /* analytics is optional */ }
    } catch (error) {
      setMessage(error.message || 'การเชื่อมต่อสะดุด ลองส่งอีกครั้งได้เลยครับ', error.field);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  });
})();
