/**
 * Preview reader for the AI ใส่ซอส field guide. Shows the published preview pages
 * (pages/manifest.json, at most 10) and always ends on the lock page that sends readers to
 * the course. No storage, no telemetry.
 */
const $ = s => document.querySelector(s);
const book = $('#book'), lock = $('#lock'), thumbs = $('#thumbs'), count = $('#count');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let pages = [], index = 0, total = 0;

async function load() {
  try {
    const res = await fetch('/book/ai-sauce/pages/manifest.json', {cache: 'no-cache'});
    if (!res.ok) throw new Error(String(res.status));
    const m = await res.json();
    total = Number(m.totalPages) || 0;
    (m.pages || []).slice(0, 10).forEach((p, i) => {
      const s = document.createElement('section');
      s.className = 'page'; s.setAttribute('aria-label', `หน้า ${i + 1}`);
      const img = new Image(p.width || 1200, p.height || 1700);
      img.src = `/book/ai-sauce/pages/${p.src}`;
      if (p.srcMobile) { img.srcset = `/book/ai-sauce/pages/${p.srcMobile} 720w, /book/ai-sauce/pages/${p.src} 1200w`; img.sizes = '(max-width: 700px) 92vw, 560px'; }
      img.alt = `คู่มือ AI ใส่ซอส หน้า ${i + 1}`; img.loading = i < 2 ? 'eager' : 'lazy'; img.decoding = 'async';
      s.append(img); book.insertBefore(s, lock);
    });
  } catch { $('#empty').hidden = false; }
  pages = [...book.querySelectorAll('.page')];
  const rest = total - (pages.length - 1);
  if (pages.length > 1 && rest > 0) {
    $('#lock-kicker').textContent = `ทดลองอ่านครบ ${pages.length - 1} หน้าแล้ว`;
    $('#lock-title').textContent = `อีก ${rest} หน้า อ่านต่อในคอร์ส`;
  }
  pages.forEach((p, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = p === lock ? '🔒' : String(i + 1);
    b.setAttribute('aria-label', p === lock ? 'หน้าอ่านต่อในคอร์ส' : `ไปหน้า ${i + 1}`);
    b.addEventListener('click', () => go(i)); li.append(b); thumbs.append(li);
  });
  const fromHash = Number(location.hash.replace('#p', ''));
  go(Number.isInteger(fromHash) && fromHash > 0 ? Math.min(fromHash, pages.length) - 1 : 0, true);
}

function go(i, instant) {
  index = Math.max(0, Math.min(pages.length - 1, i));
  pages.forEach((p, k) => {
    p.classList.toggle('turned', k < index);
    p.classList.toggle('current', k === index);
    p.style.zIndex = String(k < index ? k : pages.length - k);
    p.setAttribute('aria-hidden', String(k !== index));
    p.inert = k !== index;
  });
  if (instant || reduced) book.classList.add('instant'); else book.classList.remove('instant');
  const onLock = pages[index] === lock;
  count.textContent = onLock ? 'จบตอนทดลองอ่าน' : `หน้า ${index + 1} / ${pages.length - 1} · ทดลองอ่าน`;
  [...thumbs.querySelectorAll('button')].forEach((b, k) => b.setAttribute('aria-current', String(k === index)));
  $('#prev').disabled = index === 0; $('#next').disabled = index === pages.length - 1;
  history.replaceState(null, '', index ? `#p${index + 1}` : location.pathname);
}

$('#prev').addEventListener('click', () => go(index - 1));
$('#next').addEventListener('click', () => go(index + 1));
addEventListener('keydown', e => {
  if (e.target.closest('a,button') && e.key === 'Enter') return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(index + 1); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(index - 1); }
});
let sx = null;
book.addEventListener('pointerdown', e => { sx = e.clientX; });
book.addEventListener('pointerup', e => {
  if (sx === null) return; const dx = e.clientX - sx; sx = null;
  if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  else if (!e.target.closest('a,button')) go(index + (e.clientX > book.getBoundingClientRect().left + book.clientWidth / 2 ? 1 : -1));
});
load();
