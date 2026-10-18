/* AI ใส่ซอส · Hero copy เป็นโครงเดียวกันทั้ง 6 บท */
const HERO_COPY = {
  'learn:free-ai': {
    label: 'บทที่ 1 · Source',
    title: 'ซอส .md ขวดแรก'
  },
  'learn:image-ai': {
    label: 'บทที่ 2 · Taste',
    title: 'ชิมด้วยภาพ'
  },
  'learn:clip-ai': {
    label: 'บทที่ 3 · Cook',
    title: 'คลิปจากซอส'
  },
  'learn:notebooklm': {
    label: 'บทที่ 4 · Split',
    title: 'ซอสเดียวหลายเมนู'
  },
  'learn:prompts': {
    label: 'บทที่ 5 · Season',
    title: 'คำสั่งลัด + Agent'
  },
  'learn:first-web': {
    label: 'บทที่ 6 · Serve',
    title: 'เว็บของคุณเอง'
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
  if(window.MC_CLASSROOM_RENDER){
    document.addEventListener('classroom:prepare',applyConsistentHero,{once:true});
  }else{
    setTimeout(applyConsistentHero, 250);
    setTimeout(applyConsistentHero, 1000);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startHeroConsistency, { once:true });
else startHeroConsistency();
