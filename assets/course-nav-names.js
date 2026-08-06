/* AI ใส่ซอส · ชื่อบทเต็มในปุ่มก่อนหน้า / ถัดไป
   ปรับเฉพาะข้อความและปลายทางของแถบนำทางท้ายบท 1–4
*/

const NAV = {
  '/classroom/free-ai.html': {
    prev: { href: 'lesson-0.html', text: '← บท 0 · เลือกเครื่องครัว และเปิดเตา' },
    next: { href: 'image-ai.html', text: 'บท 2 · ชิมก่อนเติม →' },
  },
  '/classroom/image-ai.html': {
    prev: { href: 'free-ai.html', text: '← บท 1 · เริ่มจากการปรุงซอส' },
    next: { href: 'clip-ai.html', text: 'บท 3 · เอาซอสไปทำจานจริง →' },
  },
  '/classroom/clip-ai.html': {
    prev: { href: 'image-ai.html', text: '← บท 2 · ชิมก่อนเติม' },
    next: { href: 'notebooklm.html', text: 'บท 4 · ซอสขวดเดียว แตกได้หลายเมนู →' },
  },
  '/classroom/notebooklm.html': {
    prev: { href: 'clip-ai.html', text: '← บท 3 · เอาซอสไปทำจานจริง' },
    next: { href: 'prompts.html', text: 'บท 5 · เปิดลิ้นชักเครื่องปรุง →' },
  },
};

function mount() {
  const config = NAV[location.pathname];
  if (!config) return;

  const row = document.querySelector('.nextrow, .next');
  if (!row) return;

  const links = row.querySelectorAll('a.nx');
  if (links.length < 2) return;

  const [prev, next] = links;
  prev.href = config.prev.href;
  prev.textContent = config.prev.text;
  prev.setAttribute('aria-label', config.prev.text.replace(/^←\s*/, ''));

  next.href = config.next.href;
  next.textContent = config.next.text;
  next.setAttribute('aria-label', config.next.text.replace(/\s*→$/, ''));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
