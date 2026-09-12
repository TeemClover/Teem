(() => {
  const form = document.querySelector('#evaluation-form');
  const steps = [...document.querySelectorAll('.eval-step')];
  const error = document.querySelector('#form-error');
  const key = 'myclover-thedent912-evaluation-v1';
  let step = 0, busy = false, saved;
  try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
  let participantId = saved?.participantId || crypto.randomUUID();
  function remember(value) { try { sessionStorage.setItem(key, JSON.stringify({participantId, ...value})); } catch {} }
  remember(saved || {});
  document.querySelectorAll('[data-rating]').forEach(group => {
    const name = group.dataset.rating, max = name === 'score' ? 10 : 5;
    for (let n = 1; n <= max; n++) {
      const label = document.createElement('label');
      label.innerHTML = `<input type="radio" name="${name}" value="${n}" required aria-label="${n} จาก ${max}"><span>${n}</span>`;
      group.append(label);
    }
  });
  function showError(message, field) {
    error.textContent = message; error.hidden = false;
    if (field) field.focus(); else error.scrollIntoView({block:'nearest'});
  }
  function payload() {
    const values = new FormData(form);
    return Object.fromEntries(['name','role','firstTask','feedback','testimonial','consent'].map(k => [k,String(values.get(k) || '').trim()]).concat([
      ['participantId',participantId],['before',Number(values.get('before'))],['after',Number(values.get('after'))],['score',Number(values.get('score'))],['takeaways',values.getAll('takeaways')]
    ]));
  }
  function validate(index) {
    const p = payload();
    if (index === 0) {
      for (const name of ['before','after']) if (!p[name]) { showError('เลือกคะแนนความมั่นใจก่อนและหลังเรียนให้ครบครับ',form.querySelector(`[name="${name}"]`)); return false; }
      if (!p.takeaways.length) { showError('เลือกเรื่องที่ได้ประโยชน์อย่างน้อย 1 ข้อครับ',form.querySelector('[name="takeaways"]')); return false; }
      if (!p.firstTask) { showError('เล่าสั้น ๆ ว่าจะนำไปใช้กับงานอะไรครับ',form.elements.firstTask); return false; }
    }
    if (index === 1 && !p.score) { showError('เลือกคะแนนคลาสวันนี้ก่อนครับ',form.querySelector('[name="score"]')); return false; }
    if (index === 2 && !p.name) { showError('ใส่ชื่อที่ใช้เรียกในทีมก่อนส่งครับ',form.elements.name); return false; }
    return true;
  }
  function go(index) {
    step = index; error.hidden = true;
    steps.forEach((item,n) => item.hidden = n !== step);
    document.querySelectorAll('.eval-progress span').forEach((item,n) => n === step ? item.setAttribute('aria-current','step') : item.removeAttribute('aria-current'));
    document.querySelector('#back').hidden = step === 0;
    document.querySelector('#next').hidden = step === 2;
    document.querySelector('#submit').hidden = step !== 2;
    document.querySelector('#step-count').textContent = `${step+1} / 3`;
    document.querySelector(`#step-${step}`).focus({preventScroll:true});
    form.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function showResult(record) {
    let url;
    try { url = new URL(record.claimUrl); } catch { return false; }
    if (url.origin !== 'https://www.teambook.me' || url.pathname !== '/course-card/' || !url.hash) return false;
    form.hidden = true; document.querySelector('#result').hidden = false;
    document.querySelector('#claim-card').href = url.href;
    document.querySelector('#result-heading').focus({preventScroll:true});
    return true;
  }
  document.querySelector('#next').addEventListener('click',() => { if (!busy && validate(step)) go(step+1); });
  document.querySelector('#back').addEventListener('click',() => { if (!busy) go(step-1); });
  document.querySelector('#new-person').addEventListener('click',() => {
    participantId = crypto.randomUUID(); saved = null; remember({}); form.reset();
    document.querySelector('#claim-card').removeAttribute('href');
    document.querySelector('#result').hidden = true; form.hidden = false; go(0);
  });
  form.addEventListener('submit',async event => {
    event.preventDefault(); if (busy) return;
    if (step < 2) { if (validate(step)) go(step+1); return; }
    for (let n=0;n<3;n++) { if (n !== step) { const p=payload(); if ((n===0 && (!p.before || !p.after || !p.takeaways.length || !p.firstTask)) || (n===1 && !p.score)) { go(n); validate(n); return; } } }
    if (!validate(2)) return;
    busy = true; error.hidden = true;
    const submit = document.querySelector('#submit'); submit.disabled = true; submit.textContent = 'กำลังบันทึก…'; document.querySelector('#back').disabled = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),20000);
    try {
      const response = await fetch('/api/course-review',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'submit',...payload()}),signal:controller.signal});
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('สิทธิ์เข้าห้องเรียนหมดอายุ เปิดห้องเรียนในแท็บใหม่แล้วใส่รหัส จากนั้นกลับมากดส่งอีกครั้งได้ครับ');
      if (!response.ok || !result.ok) throw new Error('ยังบันทึกไม่สำเร็จ คำตอบยังอยู่ในหน้านี้ ลองกดส่งอีกครั้งครับ');
      if (!showResult(result)) throw new Error('บันทึกแล้ว แต่ยังเปิดสิทธิ์รับการ์ดไม่ได้ กดส่งอีกครั้งเพื่อรับลิงก์เดิมได้ครับ');
      remember({completed:true,claimUrl:result.claimUrl});
      document.querySelector('#result').scrollIntoView({block:'start',behavior:'smooth'});
    } catch (e) { showError(e.name==='AbortError'?'การเชื่อมต่อใช้เวลานาน คำตอบยังอยู่ ลองกดส่งอีกครั้งครับ':e.message || 'เชื่อมต่อไม่สำเร็จ ลองกดส่งอีกครั้งครับ'); }
    finally { clearTimeout(timeout); busy=false; submit.disabled=false; submit.textContent='ส่งแบบประเมิน →'; document.querySelector('#back').disabled=false; }
  });
  if (saved?.completed) showResult(saved);
})();
