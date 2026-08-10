/* AI ใส่ซอส · เส้นทางเข้าสู่บท 6 หลังเปลี่ยนเป็น Main Course */

function patchClassroomCard() {
  if (!/^\/classroom\/?(?:index\.html)?$/.test(location.pathname)) return;
  const card = document.querySelector('a.ls[href="first-web.html"], a.ls[href="./first-web.html"]');
  if (!card || card.dataset.mainCourse === '1') return;
  card.dataset.mainCourse = '1';
  card.classList.add('main-course-card');

  const level = card.querySelector('.lslv');
  const title = card.querySelector('.lsbody > b');
  const copy = card.querySelector('.lsbody > p');
  const emoji = card.querySelector('.lsemo');
  if (level) level.innerHTML = 'บทที่ 6 · Serve <em>🥩 เมนคอร์ส</em>';
  if (title) title.textContent = 'เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต';
  if (copy) copy.textContent = 'เปลี่ยน Source เป็นไฟล์เดียวที่รวมบทความ ภาพ วิดีโอ เสียง เกม และระบบโต้ตอบ เปิดในเครื่อง ส่งต่อ หรือ Publish ที่ URL เดิมได้';
  if (emoji) emoji.textContent = '🥩';

  if (!document.getElementById('main-course-route-style')) {
    const style = document.createElement('style');
    style.id = 'main-course-route-style';
    style.textContent = `
      .main-course-card{border-color:rgb(190 148 66/.58)!important;background:linear-gradient(145deg,#fff,rgb(190 148 66/.075))!important}
      .main-course-card .lslv{color:#87631f!important}
      .main-course-card .lsgo{font-weight:800}
    `;
    document.head.append(style);
  }

  const dungeon = document.querySelector('.cfinish .cgo');
  if (dungeon) dungeon.href = '/classroom/dungeon/';
}

function patchLessonFiveExit() {
  if (!/^\/classroom\/prompts\.html$/.test(location.pathname)) return;
  const link = document.querySelector('a[href="first-web.html"], a[href="./first-web.html"]');
  if (!link) return;
  link.textContent = 'บท 6 · เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต →';
  link.setAttribute('aria-label', 'บท 6 เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต');
}

function patchLessonSixDungeon() {
  if (!/^\/classroom\/first-web\.html$/.test(location.pathname)) return;
  document.querySelectorAll('#bossDoor .boss-go, a.boss-go').forEach(link => {
    link.href = '/classroom/dungeon/';
  });
}

function boot() {
  patchClassroomCard();
  patchLessonFiveExit();
  patchLessonSixDungeon();
  requestAnimationFrame(() => {
    patchClassroomCard();
    patchLessonSixDungeon();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
