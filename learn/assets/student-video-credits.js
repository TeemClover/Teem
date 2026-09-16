// Public partner-benefit UI only. Paid lesson text and files stay in the authorized API.
// This card appears after the learner has opened the video-making lesson with active access.
export function showStudentVideoCredits({ courseId, lessonId, access } = {}) {
  return courseId === 'ai-sauce' && lessonId === 'ADV03' && access?.status === 'active';
}

export function renderStudentVideoCredits(container, context) {
  container.replaceChildren();
  container.hidden = !showStudentVideoCredits(context);
  if (container.hidden) return;
  const doc = container.ownerDocument || document;
  const el = (tag, text, className = '') => {
    const node = doc.createElement(tag); node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const heading = el('div', '', 'student-video-heading');
  const title = el('div', '', 'student-video-title');
  title.append(el('p', 'COOK · จากภาพ สู่ภาพเคลื่อนไหว', 'eyebrow'));
  const h3 = el('h3', 'ปรุงซอสให้เป็นคลิปแรกของคุณ'); h3.id = 'student-video-credits-title';
  title.append(h3, el('p', 'สิทธิ์ทดลองสำหรับนักเรียน myClover ผ่าน Airova'));
  const ticket = el('div', '', 'student-video-ticket');
  ticket.append(el('strong', '50'), el('span', 'เครดิตฟรีเริ่มต้น'));
  heading.append(title, ticket);
  const intro = el('p', 'มีซอสและภาพจากบทก่อนแล้ว ลองนำมาทำวิดีโอสั้นหนึ่งช็อต เพื่อฝึกบอกการเคลื่อนไหวให้ตรงกับงานของคุณ', 'student-video-intro');
  const steps = el('ol', '', 'student-video-steps');
  for (const [label, detail] of [
    ['หยิบวัตถุดิบเดิม', 'ใช้ซอสของคุณกับภาพที่ตรวจแล้ว เลือกว่าช็อตนี้ต้องสื่ออะไรเพียงอย่างเดียว'],
    ['ทดลองหนึ่งช็อต', 'บอกว่าอะไรขยับ กล้องเคลื่อนอย่างไร แล้วดูจำนวนเครดิตที่ใช้ก่อนกดสร้าง'],
    ['ชิม แล้วค่อยปรับ', 'เทียบคลิปกับโจทย์ แก้ทีละจุด แล้วเก็บคำสั่งที่ได้ผลไว้ในซอสวิดีโอของคุณ'],
  ]) {
    const item = el('li', ''); item.append(el('strong', label), el('p', detail)); steps.append(item);
  }
  const action = el('a', 'เปิด Airova · รับสิทธิ์ myClover ↗', 'button button-primary');
  action.href = '/airova/'; action.target = '_blank'; action.rel = 'noopener noreferrer';
  const actions = el('div', '', 'student-video-actions');
  actions.append(action, el('p', 'เปิดในแท็บใหม่ · กลับมาเรียนต่อได้ตรงนี้'));
  const terms = el('div', '', 'student-video-terms');
  terms.append(
    el('p', 'สำหรับบัญชี Airova ใหม่ที่สมัครผ่านลิงก์ myClover ในหน้าถัดไป จะได้เครดิตฟรีเริ่มต้นรวม 50 เครดิต เป็นสิทธิ์พาร์ตเนอร์ ไม่ใช่เครดิตเพิ่มสำหรับบัญชีเดิม'),
    el('p', 'ตรวจยอดเครดิตหลังสมัครและค่าที่ใช้ก่อนสร้างแต่ละครั้ง จำนวนคลิปที่ทำได้ขึ้นอยู่กับโมเดลและการตั้งค่าที่เลือก'),
  );
  container.append(heading, intro, steps, actions, terms);
}
