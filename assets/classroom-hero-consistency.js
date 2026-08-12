/* AI ใส่ซอส · Hero copy เป็นโครงเดียวกันทั้ง 6 บท */
const HERO_COPY = {
  'learn:free-ai': {
    label: 'บทที่ 1 · Source',
    title: 'เริ่มจากการปรุงซอส'
  },
  'learn:image-ai': {
    label: 'บทที่ 2 · Taste',
    title: 'ชิมซอสก่อนเติม'
  },
  'learn:clip-ai': {
    label: 'บทที่ 3 · Cook',
    title: 'เอาซอสไปทำจานจริง'
  },
  'learn:notebooklm': {
    label: 'บทที่ 4 · Split',
    title: 'ซอสขวดเดียว แตกได้หลายเมนู'
  },
  'learn:prompts': {
    label: 'บทที่ 5 · Season',
    title: 'เลือกงาน แล้วตักผงไปใช้กับซอส'
  },
  'learn:first-web': {
    label: 'บทที่ 6 · Serve',
    title: 'เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต'
  }
};

function applyConsistentHero() {
  const id = document.querySelector('meta[name="mc-item"]')?.content;
  const copy = HERO_COPY[id];
  if (!copy) return;
  const hero = document.querySelector('main > .head, main > .hero, main .head, main .hero, body > .wrap > .head');
  if (!hero) return;
  const label = hero.querySelector('.lv');
  const title = hero.querySelector('h1');
  if (label && label.textContent.trim() !== copy.label) label.textContent = copy.label;
  if (title && title.textContent.replace(/\?/g, '').trim() !== copy.title) title.textContent = copy.title;
  document.title = `${copy.label} · ${copy.title} · AI ใส่ซอส`;
}

function startHeroConsistency() {
  applyConsistentHero();
  removeDuplicateLessonHeaderArt();
  setTimeout(() => { applyConsistentHero(); removeDuplicateLessonHeaderArt(); }, 250);
  setTimeout(() => { applyConsistentHero(); removeDuplicateLessonHeaderArt(); }, 1000);
  setTimeout(removeDuplicateLessonHeaderArt, 2200);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startHeroConsistency, { once:true });
else startHeroConsistency();


const STATIC_HEADER_ART = {
  'learn:image-ai': ['header-lesson2.jpeg', 'lv2-taste.jpeg'],
  'learn:clip-ai': ['header-lesson3.jpeg', 'lv3-cook.jpeg'],
  'learn:notebooklm': ['header-lesson4.jpeg', 'lv4-split.jpeg'],
  'learn:prompts': ['header-lesson5.jpeg', 'lv5-season.jpeg']
};

function removeDuplicateLessonHeaderArt() {
  const id = document.querySelector('meta[name="mc-item"]')?.content;
  const names = STATIC_HEADER_ART[id];
  if (!names) return;
  const head = document.querySelector('header.head, .head');
  const keep = head?.querySelector(':scope > .classroom-lesson-header-image img');
  if (!head || !keep) return;

  document.querySelectorAll('img').forEach(img => {
    if (img === keep) return;
    let pathname = '';
    try { pathname = new URL(img.currentSrc || img.src, location.href).pathname; } catch { return; }
    if (!names.some(name => pathname.endsWith('/' + name))) return;
    const wrapper = img.closest('figure, picture, .classroom-lesson-header-image, .lesson-header-image, .lesson-chef-art');
    if (wrapper && !head.contains(wrapper)) wrapper.remove();
    else if (!head.contains(img)) img.remove();
  });

  head.querySelectorAll(':scope > .classroom-lesson-header-image').forEach((node, index) => {
    if (index > 0) node.remove();
  });
}
