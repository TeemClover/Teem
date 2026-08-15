(() => {
  const form = document.getElementById('registrationForm');
  const success = document.getElementById('successState');
  const message = document.getElementById('formMessage');
  if (!form || !success || !message) return;

  const otherToggle = document.getElementById('aiOtherToggle');
  const otherField = document.getElementById('aiOtherField');
  const otherInput = form.elements.aiOther;
  const copyBankButton = document.getElementById('copyBankButton');

  const installFirstClassUrgency = () => {
    if (document.getElementById('firstClassUrgency')) return;

    const style = document.createElement('style');
    style.textContent = `
      .first-class-urgency{margin:0 0 28px;border:1px solid #ffd5ad;border-radius:20px;background:linear-gradient(145deg,#fff8ee,#fffdf8);overflow:hidden;box-shadow:0 16px 42px rgba(121,66,18,.08)}
      .first-class-urgency__top{padding:18px 18px 15px;background:linear-gradient(135deg,#ff8c3e,#f26f24);color:#fff}
      .first-class-urgency__eyebrow{margin:0 0 4px;font:800 9px Manrope,sans-serif;letter-spacing:.11em;text-transform:uppercase;opacity:.9}
      .first-class-urgency__top h3{margin:0;font:800 21px/1.25 Manrope,"IBM Plex Sans Thai",sans-serif;letter-spacing:-.025em}
      .first-class-urgency__top p{margin:7px 0 0;font-size:11px;line-height:1.6;color:#fff9f2}
      .first-class-urgency__countdown{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:13px 14px;background:#fff}
      .first-class-urgency__unit{min-width:0;border:1px solid #f0dfd1;border-radius:12px;background:#fffaf5;padding:10px 5px;text-align:center}
      .first-class-urgency__unit strong{display:block;font:800 clamp(20px,3vw,27px)/1 Manrope,sans-serif;color:#b44c0c;font-variant-numeric:tabular-nums}
      .first-class-urgency__unit span{display:block;margin-top:5px;font-size:8px;font-weight:700;color:#8a6e5b}
      .first-class-urgency__price{padding:0 17px 16px;background:#fff}
      .first-class-urgency__price strong{display:block;font-size:13px;line-height:1.55;color:#08251d}
      .first-class-urgency__price p{margin:5px 0 0;font-size:10px;line-height:1.65;color:#6e776f}
      .first-class-urgency__price b{color:#d95f15}
      .first-class-urgency__offline{margin-top:10px;padding:10px 11px;border-radius:11px;background:#f4f6f4;font-size:9px;line-height:1.6;color:#69766f}
      .first-class-urgency__offline strong{display:inline;font-size:inherit}
      .first-class-urgency.is-ended .first-class-urgency__countdown{grid-template-columns:1fr}
      .first-class-urgency.is-ended .first-class-urgency__unit{padding:14px}
      .first-class-urgency.is-ended .first-class-urgency__unit strong{font-size:17px}
      @media(max-width:760px){
        .first-class-urgency{margin-bottom:25px;border-radius:18px}
        .first-class-urgency__top{padding:18px 16px 15px}
        .first-class-urgency__top h3{font-size:23px}
        .first-class-urgency__top p{font-size:12px}
        .first-class-urgency__countdown{gap:5px;padding:11px 10px}
        .first-class-urgency__unit{padding:10px 3px}
        .first-class-urgency__unit strong{font-size:24px}
        .first-class-urgency__unit span{font-size:8px}
        .first-class-urgency__price{padding:2px 15px 16px}
        .first-class-urgency__price strong{font-size:14px}
        .first-class-urgency__price p{font-size:11px}
        .first-class-urgency__offline{font-size:10px}
      }
    `;
    document.head.appendChild(style);

    const urgency = document.createElement('section');
    urgency.id = 'firstClassUrgency';
    urgency.className = 'first-class-urgency';
    urgency.setAttribute('aria-labelledby', 'firstClassUrgencyTitle');
    urgency.innerHTML = `
      <div class="first-class-urgency__top">
        <p class="first-class-urgency__eyebrow">FIRST CLASS · ราคาเปิดคลาสครั้งแรก</p>
        <h3 id="firstClassUrgencyTitle">98 บาทเฉพาะรอบนี้ — เริ่มแล้วราคานี้จบเลย</h3>
        <p>รอบสดเริ่มวันอังคารที่ 18 สิงหาคม 2026 เวลา 19:30 น. และไม่มีวิดีโอย้อนหลัง</p>
      </div>
      <div class="first-class-urgency__countdown" id="firstClassCountdown" aria-live="polite">
        <div class="first-class-urgency__unit"><strong data-countdown="days">00</strong><span>วัน</span></div>
        <div class="first-class-urgency__unit"><strong data-countdown="hours">00</strong><span>ชั่วโมง</span></div>
        <div class="first-class-urgency__unit"><strong data-countdown="minutes">00</strong><span>นาที</span></div>
        <div class="first-class-urgency__unit"><strong data-countdown="seconds">00</strong><span>วินาที</span></div>
      </div>
      <div class="first-class-urgency__price">
        <strong>ถ้าอยากเรียน First Class ในราคา <b>98 บาท</b> นี่คือรอบเดียวครับ</strong>
        <p>ราคา 98 บาทเป็นราคาพิเศษสำหรับ First Class รอบเปิดครั้งแรก เมื่อคลาสเริ่ม ข้อเสนอนี้สิ้นสุดและจะไม่มีการจัด First Class ในราคานี้อีก</p>
        <div class="first-class-urgency__offline"><strong>หลักสูตรออฟไลน์เต็มวัน 1,960 บาท</strong> เป็นอีก Format ที่ลงลึกกว่า มี Workshop และรายละเอียดมากกว่า จะประกาศรอบแยกในภายหลัง — ไม่ใช่คอร์สเดียวกันที่นำมาลดราคาเหลือ 98 บาท</div>
      </div>
    `;

    form.insertAdjacentElement('beforebegin', urgency);

    const valuePills = document.querySelector('.value-pills');
    if (valuePills && !valuePills.querySelector('[data-first-class-last-price]')) {
      const pill = document.createElement('span');
      pill.dataset.firstClassLastPrice = 'true';
      pill.textContent = '98 บาท · รอบเดียวเท่านั้น';
      valuePills.appendChild(pill);
    }

    const target = new Date('2026-08-18T19:30:00+07:00').getTime();
    const pad = value => String(value).padStart(2, '0');
    let timer = null;

    const renderCountdown = () => {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        urgency.classList.add('is-ended');
        const countdown = document.getElementById('firstClassCountdown');
        if (countdown) countdown.innerHTML = '<div class="first-class-urgency__unit"><strong>คลาสเริ่มแล้ว · ข้อเสนอ 98 บาทสิ้นสุดแล้ว</strong></div>';
        if (timer) window.clearInterval(timer);
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const values = { days, hours, minutes, seconds };

      Object.entries(values).forEach(([key, value]) => {
        const el = urgency.querySelector(`[data-countdown="${key}"]`);
        if (el) el.textContent = pad(value);
      });
    };

    renderCountdown();
    timer = window.setInterval(renderCountdown, 1000);
  };

  installFirstClassUrgency();

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
