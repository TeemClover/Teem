/* myClover · AI ใส่ซอส — presentation layer
   เนื้อหาหลักของบทเรียนยังอยู่ในหน้าเดิม ไฟล์นี้เติมเสียงของเชฟ
   และทำให้หน้ารวมสะท้อนซอส → TASTE → COOK → MULTIPLY → SEASON → SERVE
*/

function setMeta(name, value) {
  const node = document.querySelector(`meta[name="${name}"]`);
  if (node) node.setAttribute('content', value);
}

function setProperty(property, value) {
  const node = document.querySelector(`meta[property="${property}"]`);
  if (node) node.setAttribute('content', value);
}

function chefBox(message, { compact = false } = {}) {
  const box = document.createElement('aside');
  box.className = `course-chef${compact ? ' course-chef--compact' : ''}`;
  box.setAttribute('aria-label', 'เชฟชิมแล้ว');
  box.innerHTML = `<span>🍳 เชฟชิมแล้ว</span><p>${message}</p>`;
  return box;
}

function addCourseStyles() {
  if (document.getElementById('ai-sauce-course-style')) return;
  const style = document.createElement('style');
  style.id = 'ai-sauce-course-style';
  style.textContent = `
    .course-chef{position:relative;margin:18px 0 26px;padding:18px 20px 18px 22px;border:1px solid rgb(190 148 66/.45);border-radius:17px;background:linear-gradient(135deg,rgb(190 148 66/.12),#fff);box-shadow:0 9px 26px rgb(18 40 28/.05)}
    .course-chef::before{content:'';position:absolute;left:-1px;top:16px;bottom:16px;width:4px;border-radius:0 4px 4px 0;background:rgb(190 148 66)}
    .course-chef span{display:block;color:#7d5d1d;font-family:"Bai Jamjuree",system-ui,sans-serif;font-size:11px;font-weight:800;letter-spacing:.1em}
    .course-chef p{margin:5px 0 0;color:rgb(18 40 28/.86);font-size:14.5px;line-height:1.75}
    .course-chef--compact{margin-top:13px;padding-top:15px;padding-bottom:15px}
    .course-chef--compact p{font-size:13.5px}
    body.lesson-one-chef .quote::after{content:'AI ผู้ช่วยเชฟ'}
    body.lesson-one-chef .machine{margin-top:12px}
    body.lesson-one-chef .achievement{letter-spacing:.02em}
    body.course-overview-sauce .head h1{max-width:22ch}
    body.course-overview-sauce .lsbody b{line-height:1.42}
    body.course-overview-sauce .lsbody p{line-height:1.65}
    body.course-overview-sauce .lslv{color:rgb(27 106 66)}
    body.course-overview-sauce .ls.star{border-color:rgb(190 148 66/.7)}
    @media(max-width:560px){.course-chef{padding:16px 17px 16px 20px}.course-chef p{font-size:14px}}
  `;
  document.head.append(style);
}

function enhanceLessonOne() {
  if (!/^\/classroom\/free-ai\.html$/.test(location.pathname)) return;
  if (document.body.classList.contains('lesson-one-chef')) return;
  addCourseStyles();
  document.body.classList.add('lesson-one-chef');

  const quoteLabel = document.querySelector('.quote small');
  if (quoteLabel) quoteLabel.textContent = 'ข้อสรุป 1 ประโยคจาก AI ผู้ช่วยเชฟ';

  const tldr = document.querySelector('.tldr');
  if (tldr) tldr.insertAdjacentElement('afterend', chefBox('ขั้นตอนครบค่ะ แต่บทนี้ยังไม่ใช่บุฟเฟต์ กรุณาเลือกวัตถุดิบจริงของคุณเพียง 1 กองก่อน แล้วทำซอสให้เสร็จ 1 ขวด ดีกว่าเปิดทุกขวดพร้อมกันแต่ไม่ได้ชิมสักขวดค่ะ', { compact: true }));

  const map = document.querySelector('.map');
  if (map) map.insertAdjacentElement('afterend', chefBox('เริ่มจากอะไรก็ได้ค่ะ แต่ควรเป็นงานที่คุณอยากใช้จริงซอสทดลองที่ไม่มีวันเปิดใช้ ต่อให้อร่อยก็ยังนอนอยู่ในตู้เย็นค่ะ'));

  const recipe = document.querySelector('.recipe');
  if (recipe) recipe.insertAdjacentElement('afterend', chefBox('ถ้า AI เขียนลื่นจนคุณเผลอเชื่อทุกคำ กรุณาชิมช้าลงค่ะ ความมั่นใจของ AI ไม่ใช่ใบรับรอง อย่าให้ภาษาสวยลักลอบขนข้อเท็จจริงปลอมเข้าขวด'));

  const machine = document.querySelector('.machine');
  if (machine) machine.insertAdjacentElement('beforebegin', chefBox('เครื่องบรรจุขวดช่วยจัดเก็บค่ะ ไม่ได้ช่วยแก้รส ถ้าวางน้ำล้างจานลงไป คุณก็จะได้ไฟล์ .md รสน้ำล้างจานที่เป็นระเบียบมากขึ้นเท่านั้นค่ะ', { compact: true }));

  const achievement = document.getElementById('achievement');
  if (achievement) achievement.textContent = '🧴 FIRST BOTTLE UNLOCKED · ซอสขวดแรกพร้อมใช้';

  try { window.MC_ACT?.('lesson-one-chef-edition'); } catch { /* analytics optional */ }
}

const COURSE = [
  {
    emoji: '🧴',
    level: 'ซอส',
    title: 'เริ่มจากการปรุงซอส',
    description: 'เล่า แนบไฟล์ หรือสกัดจากแชตเดิม แล้วจบด้วยซอส .md ขวดแรกของตัวเอง',
    step: 'สร้างหัวซอสขวดแรกจากเสียง ไฟล์ หรือแชตเดิม',
    gain: 'ซอส .md ขวดแรกของตัวเอง',
    day: 'ปรุงซอสขวดแรก'
  },
  {
    emoji: '🥄',
    level: 'TASTE',
    title: 'ชิมก่อนเติม',
    description: 'ใช้ภาพเป็นช้อนชิมว่า AI เข้าใจซอสตรงกับคุณไหม แล้วแก้ที่ต้นทาง',
    step: 'ใช้ผลลัพธ์มองหาสิ่งที่ AI เข้าใจผิด แล้วแก้ซอส',
    gain: 'ภาพทดสอบ + Visual Canon + ซอสที่แก้รสแล้ว',
    day: 'สร้างภาพเพื่อชิมซอส'
  },
  {
    emoji: '🍳',
    level: 'COOK',
    title: 'เอาซอสไปทำจานจริง',
    description: 'ใช้ซอสขวดเดียวสร้าง Script, Shot list, Caption และงานชิ้นแรกที่พร้อมใช้',
    step: 'ใช้ซอสเดียวควบคุมส่วนประกอบของงานจริงทั้งจาน',
    gain: 'Production Brief และงาน Version แรก',
    day: 'ทำจานจริงชิ้นแรก'
  },
  {
    emoji: '🍱',
    level: 'MULTIPLY',
    title: 'ซอสขวดเดียว แตกได้หลายเมนู',
    description: 'แตกซอสเป็นภาพ สไลด์ เสียง FAQ คู่มือ และ Output หลายรูปแบบ',
    step: 'ทำซอสครั้งเดียว แล้วแตกให้เหมาะกับคนและงานหลายแบบ',
    gain: 'Output Pack อย่างน้อย 3 รูปแบบ',
    day: 'แตกซอสเป็นหลายเมนู'
  },
  {
    emoji: '🧂',
    level: 'SEASON',
    title: 'เปิดลิ้นชักเครื่องปรุง',
    description: 'หยิบ Prompt, Style, Checklist และบทบาทที่เตรียมไว้มาเติมให้ถูกงาน ไม่เทหมดลิ้นชัก',
    step: 'เลือกเครื่องปรุงที่ใช้ซ้ำได้ แล้วจัดเป็น Recipe Card',
    gain: 'ลิ้นชักเครื่องปรุงและ Workflow ประจำงาน',
    day: 'จัดลิ้นชักเครื่องปรุง'
  },
  {
    emoji: '🍽️',
    level: 'SERVE',
    title: 'บรรจุ เสิร์ฟ และส่งต่อ',
    description: 'รวมทุกอย่างเป็นเว็บหรือผลงานที่คนอื่นเปิด ใช้ และส่งต่อได้จริง',
    step: 'พางานออกจากแชต พร้อมซอสและเกณฑ์ตรวจที่ส่งต่อได้',
    gain: 'ผลงานจริง + URL หรือไฟล์ที่ส่งต่อได้',
    day: 'เสิร์ฟงานให้คนอื่นใช้จริง'
  }
];

function setText(node, value) {
  if (node) node.textContent = value;
}

function applyClassroomCopy() {
  const header = document.querySelector('.head');
  if (!header) return;

  document.title = 'AI ใส่ซอส · AI Workflow แบบใส่ซอส · myClover';
  setMeta('description', 'หลักสูตรฟรี 6 บทที่สอนให้คุณปรุงซอสของตัวเอง ชิม แก้ แตกงาน เลือกเครื่องปรุง และเสิร์ฟผลงานจริงด้วย AI ตัวไหนก็ได้');
  setProperty('og:title', 'AI ใส่ซอส · AI Workflow แบบใส่ซอส');
  setProperty('og:description', '6 บทจากวัตถุดิบในหัว สู่ซอสที่ AI ใช้ทำงานต่อและผลงานที่คนอื่นเปิดใช้ได้จริง');

  setText(header.querySelector('.lv'), 'AI ใส่ซอส · ซอส-BASED AI WORKFLOW · ฟรีตลอดชีพ');
  setText(header.querySelector('h1'), 'AI ใส่ซอส — ปรุงซอสให้ AI ทำงานต่อได้');
  const heroCopy = header.querySelector(':scope > p');
  if (heroCopy) heroCopy.innerHTML = '6 บทที่ต่อกันเป็น Workflow เดียว: <b style="color:#fff">ซอส → TASTE → COOK → MULTIPLY → SEASON → SERVE</b> ไม่ผูกกับ AI ตัวใด ไม่เริ่มจากการท่อง Prompt และทุกบทต้องมีของจริงกลับบ้าน';
  const meta = header.querySelectorAll('.meta span');
  const metaCopy = ['🧴 จบด้วยซอสของตัวเอง','🔁 6 บทเป็น Workflow เดียว','🤖 ใช้กับ AI ตัวไหนก็ได้'];
  meta.forEach((node, index) => { if (metaCopy[index]) node.textContent = metaCopy[index]; });

  const pathCard = document.getElementById('pathCard');
  setText(pathCard?.querySelector('h3'), 'เส้นทาง 6 บท: จากวัตถุดิบในหัว ถึงงานที่เสิร์ฟได้');
  const pathSub = pathCard?.querySelector('.sub');
  if (pathSub) pathSub.innerHTML = 'ของจากบทก่อนจะกลายเป็นวัตถุดิบของบทถัดไป คุณจึงไม่ได้เรียนเครื่องมือ 6 ตัว แต่กำลังสร้าง <b>ครัว AI 1 ครัวที่นำกลับไปใช้กับงานอะไรก็ได้</b>';

  document.querySelectorAll('.steps6 .st6').forEach((row, index) => {
    const item = COURSE[index];
    if (!item) return;
    setText(row.querySelector('b'), `${item.level} · ${item.title}`);
    setText(row.querySelector('small'), item.step);
    row.classList.toggle('star', index === 0);
    const badge = row.querySelector('.k');
    if (badge) badge.textContent = `LV.${index + 1}${index === 0 ? ' ⭐' : ''}`;
  });

  document.querySelectorAll('.gains .gain').forEach((row, index) => {
    const item = COURSE[index];
    if (!item) return;
    setText(row.querySelector('b'), item.gain);
  });

  document.querySelectorAll('.days .day').forEach((row, index) => {
    const item = COURSE[index];
    if (!item) return;
    const badge = row.querySelector('.d');
    row.textContent = '';
    if (badge) row.append(badge);
    row.append(document.createTextNode(item.day));
  });

  const cards = document.querySelectorAll('.lsgrid .ls');
  cards.forEach((card, index) => {
    const item = COURSE[index];
    if (!item) return;
    card.classList.toggle('star', index === 0);
    setText(card.querySelector('.lsemo'), item.emoji);
    const level = card.querySelector('.lslv');
    if (level) level.innerHTML = `LV.${index + 1} <em${index === 0 ? ' class="starred"' : ''}>${index === 0 ? '⭐ จุดเริ่มของ Workflow' : item.level}</em>`;
    setText(card.querySelector('.lsbody > b'), `${item.level} · ${item.title}`);
    setText(card.querySelector('.lsbody > p'), item.description);
  });

  const pathGo = document.getElementById('pathGo');
  if (pathGo && /free-ai\.html$/.test(pathGo.getAttribute('href') || '')) pathGo.textContent = 'เริ่มซอส — ปรุงซอสขวดแรก →';

  try { window.MC_ACT?.('classroom-sauce-course-copy'); } catch { /* analytics optional */ }
}

function enhanceClassroomOverview() {
  if (!/^\/classroom\/?(?:index\.html)?$/.test(location.pathname)) return;
  addCourseStyles();
  document.body.classList.add('course-overview-sauce');
  applyClassroomCopy();
  window.addEventListener('load', applyClassroomCopy, { once: true });
}

function boot() {
  enhanceLessonOne();
  enhanceClassroomOverview();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
