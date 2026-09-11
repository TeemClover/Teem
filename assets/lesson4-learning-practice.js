/* Lesson 4 · choose one useful output, then compare it with the same Source. */
(() => {
  'use strict';
  const root = document.getElementById('lesson4FirstOutput');
  if (!root || root.dataset.practiceReady === 'true') return;
  root.dataset.practiceReady = 'true';
  const storageKey = 'mc-lesson4-first-output-v1';
  const plans = {
    image: {
      title: 'เมนูแรก: ภาพสรุปให้คนอ่านเร็ว',
      hint: 'เลือกใจความที่คนควรรู้ 3 ข้อ แล้วเริ่มจาก Infographic หรือเครื่องมือสร้างภาพที่คุณใช้',
      start: 'นำเข้าซอสขวดที่เลือก แล้วสร้างภาพสรุปสำหรับคนที่ยังไม่รู้เรื่องนี้',
      next: 'เมื่อภาพตรงแล้ว ลองทำเสียงไว้ฟังทบทวนและสไลด์ไว้เล่าต่อ โดยยึดข้อเท็จจริงเดิม'
    },
    audio: {
      title: 'เมนูแรก: เสียงไว้ฟังทบทวน',
      hint: 'เริ่มจาก Audio Overview แล้วฟังว่าเรื่องสำคัญและตัวเลขยังตรงกับซอสหรือไม่',
      start: 'นำเข้าซอสขวดที่เลือก แล้วสร้างเสียงเล่าให้ตัวคุณเองฟังทบทวน',
      next: 'เมื่อเสียงตรงแล้ว ลองทำภาพสรุปให้คนอ่านเร็วและสไลด์ไว้เล่าต่อ โดยยึดข้อเท็จจริงเดิม'
    },
    slides: {
      title: 'เมนูแรก: สไลด์ไว้เล่าให้ทีม',
      hint: 'เริ่มจาก Slide Deck ให้ทีมรู้เรื่องสำคัญและสิ่งที่ต้องทำต่อหลังฟังจบ',
      start: 'นำเข้าซอสขวดที่เลือก แล้วสร้างสไลด์สำหรับทีมของคุณ ตั้งให้ 1 หน้าเล่า 1 ประเด็น',
      next: 'เมื่อสไลด์ตรงแล้ว ลองทำภาพสรุปให้คนอ่านเร็วและเสียงไว้ฟังทบทวน โดยยึดข้อเท็จจริงเดิม'
    }
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  let selected = Object.hasOwn(plans, saved.choice) ? saved.choice : '';
  let completed = Array.isArray(saved.completed) ? saved.completed.filter(key => Object.hasOwn(plans, key)) : [];
  const check = document.getElementById('lesson4FirstDone');
  const writeText = (id, text) => {
    const element = document.getElementById(id);
    if (element && element.textContent !== text) element.textContent = text;
  };
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ choice: selected, completed })); } catch {}
  }
  function render() {
    if (!selected) return;
    const plan = plans[selected];
    document.getElementById('lesson4Plan').hidden = false;
    root.querySelectorAll('[data-first-output]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.firstOutput === selected)));
    writeText('lesson4PlanTitle', plan.title);
    writeText('lesson4PlanHint', plan.hint);
    writeText('lesson4PlanStart', plan.start);
    writeText('lesson4PlanNext', plan.next);
    check.checked = completed.includes(selected);
    writeText('lesson4FirstStatus', check.checked ? 'มีเมนูแรกที่ชิมแล้ว เก็บไว้เทียบกับอีก 2 รูปแบบ แล้วตรวจเช็กลิสต์ท้ายบท' : 'ถ้าบัญชียังไม่มีเมนูนี้ เลือกรูปแบบอื่นที่ใช้ได้ก่อน');
  }
  root.querySelectorAll('[data-first-output]').forEach(button => button.addEventListener('click', () => {
    if (!Object.hasOwn(plans, button.dataset.firstOutput)) return;
    selected = button.dataset.firstOutput;
    render();
    save();
  }));
  check.addEventListener('change', () => {
    if (!selected) return;
    completed = completed.filter(key => key !== selected);
    if (check.checked) completed.push(selected);
    render();
    save();
  });
  render();

  const taste = document.getElementById('lesson4Practice');
  const feedback = {
    count: 'จำนวนตรงกันแล้ว: ซอส ภาพ และเสียงระบุ 12 คนเหมือนกัน ลองเทียบเวลา 10:00–11:00 กับคำว่า “2 ชั่วโมง” อีกครั้ง',
    duration: 'ใช่ — ซอสระบุ 10:00–11:00 เท่ากับ 1 ชั่วโมง แต่เสียงบอก 2 ชั่วโมง แก้เฉพาะเสียงเป็น “1 ชั่วโมง” แล้วตรวจซ้ำ ซอสกับภาพยังถูกอยู่',
    none: 'ยังมี 1 จุดไม่ตรง: ซอสกำหนด 10:00–11:00 แต่เสียงบอกว่าใช้เวลา 2 ชั่วโมง ลองเลือกส่วนที่ต้องแก้อีกครั้ง'
  };
  taste.querySelectorAll('[data-taste-answer]').forEach(button => button.addEventListener('click', () => {
    const answer = button.dataset.tasteAnswer;
    if (!Object.hasOwn(feedback, answer)) return;
    taste.querySelectorAll('[data-taste-answer]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    writeText('lesson4TasteFeedback', feedback[answer]);
  }));
})();
