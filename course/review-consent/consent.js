(() => {
  const TOKEN_KEY = 'mc_workshop_review_consent_token_v1';
  const ALLOWED = new Set(['private', 'anonymous', 'named']);
  let token = '';
  let invalid = false;
  function captureToken() {
    const fresh = location.hash.length > 1;
    token = fresh ? location.hash.slice(1) : '';
    invalid = false;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (fresh) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { token = ''; invalid = true; }
      try { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); } catch {}
    } else {
      try { token = sessionStorage.getItem(TOKEN_KEY) || ''; } catch {}
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) token = '';
    }
  }
  // This script runs synchronously in the head, before styles and review requests.
  captureToken();
  window.addEventListener('hashchange', () => {
    if (!location.hash) return;
    captureToken();
    location.reload();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const form = $('consent-form');
    let review = null;
    let busy = false;
    let loadSequence = 0;
    const labels = { private: 'เก็บเป็นความคิดเห็นส่วนตัว', anonymous: 'เผยแพร่โดยไม่ระบุชื่อ', named: 'เผยแพร่พร้อมชื่อ' };

    function parseReview(value) {
      if (!value || typeof value.testimonial !== 'string' || !value.testimonial.trim() || !ALLOWED.has(value.consent)) throw new Error('INVALID_RESPONSE');
      return {
        testimonial: value.testimonial,
        displayName: typeof value.displayName === 'string' ? value.displayName : '',
        role: typeof value.role === 'string' ? value.role : '',
        consent: value.consent,
      };
    }
    async function request(action, consent) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch('/api/course-reviews', {
          method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
          headers: { 'content-type': 'application/json', accept: 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ action, token, ...(consent ? { consent } : {}) }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) throw new Error(data?.code || data?.error || 'UNAVAILABLE');
        return data;
      } catch (error) {
        if (error.name === 'AbortError' || error instanceof TypeError || error instanceof SyntaxError) throw new Error('NETWORK');
        throw error;
      } finally { clearTimeout(timer); }
    }
    function showError(code, saving = false) {
      const messages = {
        INVALID_TOKEN: 'ยังเปิดลิงก์นี้ไม่ได้ ลองใช้ลิงก์ล่าสุดที่ได้รับ หรือขอให้ผู้ส่งออกลิงก์ใหม่ให้คุณ',
        TOKEN_EXPIRED: 'ลิงก์นี้หมดอายุแล้ว ขอให้ผู้ส่งออกลิงก์ใหม่เพื่อดูข้อความและเปลี่ยนสิทธิ์ได้',
      };
      $('error').textContent = messages[code] || (saving
        ? 'ยังยืนยันการบันทึกไม่ได้ ลองบันทึกอีกครั้ง หรือโหลดสิทธิ์ล่าสุดเพื่อตรวจการเลือกของคุณ'
        : 'ยังโหลดข้อความไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองอีกครั้งได้');
      $('error').hidden = false;
      $('retry').hidden = !token || ['INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(code);
    }
    function selected() { return form.querySelector('input[name="consent"]:checked')?.value || ''; }
    function renderPreview() {
      if (!review) return;
      const choice = selected();
      const box = $('preview-content'); box.replaceChildren();
      if (choice === 'private') {
        const text = document.createElement('p'); text.textContent = 'ไม่นำข้อความนี้ไปแสดงบนหน้าขายหรือสื่อแนะนำคอร์ส'; box.append(text);
      } else if (ALLOWED.has(choice)) {
        const quote = document.createElement('blockquote'); quote.textContent = review.testimonial;
        const identity = document.createElement('p'); identity.className = 'identity';
        const name = document.createElement('b');
        name.textContent = choice === 'named' ? (review.displayName || 'ผู้เรียน Workshop') : 'ผู้เรียน Workshop · ไม่ระบุชื่อ';
        identity.append(name);
        if (choice === 'named' && review.role) { const role = document.createElement('span'); role.textContent = review.role; identity.append(role); }
        box.append(quote, identity);
      }
      $('choice-state').textContent = choice === review.consent
        ? `สิทธิ์ปัจจุบัน: ${labels[review.consent]}` : 'การเลือกนี้ยังไม่ได้บันทึก';
    }
    function renderReview() {
      $('testimonial').textContent = review.testimonial;
      form.querySelector(`input[value="${review.consent}"]`).checked = true;
      $('review-content').hidden = false;
      renderPreview();
    }
    async function loadReview() {
      if (busy) return;
      const sequence = ++loadSequence;
      $('error').hidden = true; $('retry').hidden = true; $('saved').hidden = true;
      if (!token || invalid) { $('loading').hidden = true; showError('INVALID_TOKEN'); return; }
      busy = true; $('loading').hidden = false; $('choices').disabled = true; $('save').disabled = true;
      try {
        const data = await request('consent_read');
        if (sequence !== loadSequence) return;
        review = parseReview(data.review); renderReview();
      } catch (error) { showError(error.message); }
      finally { busy = false; $('loading').hidden = true; $('choices').disabled = false; $('save').disabled = false; }
    }
    form.addEventListener('change', () => { $('saved').hidden = true; $('error').hidden = true; renderPreview(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || !review || !ALLOWED.has(selected())) return;
      const consent = selected();
      busy = true; $('choices').disabled = true; $('save').disabled = true;
      $('save').textContent = 'กำลังบันทึก…'; $('error').hidden = true; $('saved').hidden = true; $('retry').hidden = true;
      try {
        const data = await request('consent_set', consent);
        const next = data.review ? parseReview(data.review) : { ...review, consent };
        if (next.consent !== consent) throw new Error('INVALID_RESPONSE');
        review = next; renderReview();
        $('saved').textContent = `บันทึกแล้ว: ${labels[review.consent]} คุณเปลี่ยนการเลือกและบันทึกอีกครั้งได้`;
        $('saved').hidden = false;
      } catch (error) { showError(error.message, true); }
      finally { busy = false; $('choices').disabled = false; $('save').disabled = false; $('save').textContent = 'บันทึกการเลือกของฉัน'; }
    });
    $('retry').addEventListener('click', loadReview);
    loadReview();
  }, { once: true });
})();
