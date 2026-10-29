import { MIN_QUESTIONS, MAX_QUESTIONS, QUESTION_LIMIT, OPTION_LIMIT, validQuestionCount, restoreDraft, questionIsComplete, checkCustomQuestions } from './question-set.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const errors = {
  BAD_QUESTION_COUNT: 'ใส่จำนวนคำถามเป็นเลขเต็ม 5–20 ข้อ',
  BAD_QUESTION_TEXT: 'ใส่คำถามให้ครบ ไม่เกิน 240 ตัวอักษร',
  BAD_OPTIONS: 'ใส่คำตอบให้ครบทั้ง 4 ตัวเลือก ตัวเลือกละไม่เกิน 100 ตัวอักษร',
  DUPLICATE_OPTIONS: 'คำตอบทั้ง 4 ตัวเลือกต้องไม่ซ้ำกัน',
};

export function mountQuestionBuilder(root, { saved, onChange = () => {} } = {}) {
  const draft = restoreDraft(saved);
  let active = 0;
  root.innerHTML = `<div class="builder-heading"><div><span class="eyebrow">YOUR QUESTIONS, YOUR GAME</span><h3>ตั้งคำถามของคุณ</h3></div><label class="question-count-label" for="question-count">จำนวนข้อ<input class="input" id="question-count" type="number" inputmode="numeric" min="${MIN_QUESTIONS}" max="${MAX_QUESTIONS}" step="1" value="${draft.count}" aria-describedby="count-hint"></label></div><p class="small-note" id="count-hint">ใส่เลข 5–20 · กดเลขข้อเพื่อสลับไปกรอก</p><nav class="question-nav" aria-label="เลือกข้อที่ต้องการแก้ไข"></nav><div class="builder-progress"><span data-builder-progress></span><span>● เก็บร่างในเครื่องนี้</span></div><div class="question-editor"></div><div class="builder-pagination"><button class="secondary" type="button" data-prev>← ข้อก่อน</button><span data-page></span><button class="secondary" type="button" data-next>ข้อถัดไป →</button></div><p class="form-error" data-builder-error role="status"></p>`;
  const nav = root.querySelector('.question-nav'), editor = root.querySelector('.question-editor'), count = root.querySelector('#question-count'), error = root.querySelector('[data-builder-error]');
  function persist() { onChange(draft); }
  function progress() {
    const complete = draft.questions.slice(0, draft.count).filter(questionIsComplete).length;
    root.querySelector('[data-builder-progress]').textContent = `พร้อมแล้ว ${complete} / ${draft.count} ข้อ`;
    nav.querySelectorAll('button').forEach((button, index) => {
      const ready = questionIsComplete(draft.questions[index]);
      button.classList.toggle('complete', ready);
      button.setAttribute('aria-label', `ข้อ ${index + 1}${ready ? ' กรอกครบแล้ว' : ''}`);
    });
  }
  function show(focus = false) {
    nav.innerHTML = Array.from({ length: draft.count }, (_, index) => `<button type="button" data-question="${index}" ${index === active ? 'aria-current="step"' : ''}>${index + 1}</button>`).join('');
    const q = draft.questions[active];
    editor.innerHTML = `<label class="field" for="custom-question">คำถามข้อ ${active + 1}</label><textarea id="custom-question" class="input" rows="2" maxlength="${QUESTION_LIMIT}" placeholder="ข้อนี้จะถามว่าอะไรดี?" data-field="text">${escape(q.text)}</textarea><div class="option-fields">${q.options.map((option, index) => `<div class="option-field ${index === 0 ? 'correct-option' : ''}"><label for="custom-option-${index}"><span>${index === 0 ? '✓' : index + 1}</span>${index === 0 ? 'คำตอบที่ถูกต้อง' : 'คำตอบหลอก ' + index}</label><input id="custom-option-${index}" class="input" data-field="${index}" maxlength="${OPTION_LIMIT}" value="${escape(option)}" placeholder="${index === 0 ? 'ใส่คำตอบที่ถูกไว้ช่องนี้' : 'ใส่ตัวเลือกอื่น'}" autocomplete="off"></div>`).join('')}</div><p class="shuffle-note"><span>⤨</span> เกมจะสุ่มตำแหน่งคำตอบให้ทุกคนเหมือนกัน</p>`;
    root.querySelector('[data-page]').textContent = `${active + 1} / ${draft.count}`;
    root.querySelector('[data-prev]').disabled = active === 0;
    root.querySelector('[data-next]').disabled = active === draft.count - 1;
    progress();
    if (focus) editor.querySelector('textarea').focus();
  }
  count.addEventListener('input', () => {
    const value = Number(count.value);
    if (!validQuestionCount(value)) { error.textContent = errors.BAD_QUESTION_COUNT; count.setAttribute('aria-invalid', 'true'); return; }
    count.removeAttribute('aria-invalid'); error.textContent = ''; draft.count = value; active = Math.min(active, value - 1); show(); persist();
  });
  nav.addEventListener('click', event => { const button = event.target.closest('[data-question]'); if (button) { active = Number(button.dataset.question); error.textContent = ''; show(true); } });
  editor.addEventListener('input', event => {
    const field = event.target.dataset.field;
    if (field === undefined) return;
    if (field === 'text') draft.questions[active].text = event.target.value;
    else draft.questions[active].options[Number(field)] = event.target.value;
    error.textContent = ''; progress(); persist();
  });
  root.querySelector('[data-prev]').onclick = () => { active = Math.max(0, active - 1); show(true); };
  root.querySelector('[data-next]').onclick = () => { active = Math.min(draft.count - 1, active + 1); show(true); };
  show();
  return {
    getQuestions() {
      if (!validQuestionCount(Number(count.value))) { error.textContent = errors.BAD_QUESTION_COUNT; count.focus(); return null; }
      const result = checkCustomQuestions(draft.questions.slice(0, draft.count));
      if (!result.ok) {
        active = result.index; show(); error.textContent = `ข้อ ${active + 1}: ${errors[result.error]}`;
        editor.querySelector(`[data-field="${result.field || 'text'}"]`)?.focus(); return null;
      }
      return result.questions;
    },
  };
}
