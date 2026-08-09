/* Forge — ไปตอนถัดไปด้วยการเลื่อนต่อจากท้ายหน้า

   ทำงานเฉพาะหน้าตอนที่มี [data-next] จึงครอบคลุม EP1–EP6 และไม่พาออกจาก
   EP7 เอง ผู้ใช้ต้องมาถึงก้นหน้าจริงก่อน gesture ถัดไปจึงทำงาน — wheel ที่
   พามาถึงก้นหน้าในครั้งแรกไม่ทำให้ข้ามตอนทันที

   ACT สองชื่อใช้ path ของ event แยกตอนให้อยู่แล้ว:
     forge-next-button = กดปุ่มตอนต่อไป
     forge-next-panel  = แตะภาพ Panel 4
     forge-next-scroll = เลื่อนต่อจากท้ายหน้า */

const episode = location.pathname.match(/^\/forge\/ep([1-7])-?[^/]*\/?(?:index\.html)?$/);
const nextLink = document.querySelector('[data-next]');

if (episode && nextLink) {
  let leaving = false;
  let wasAtBottom = false;
  let touchStartY = null;
  let touchStartedAtBottom = false;

  const atBottom = () => {
    const root = document.documentElement;
    return Math.ceil(window.scrollY + window.innerHeight) >= root.scrollHeight - 2;
  };

  const report = method => {
    try { window.MC_ACT?.(`forge-next-${method}`); } catch { /* analytics ห้ามขวางการอ่าน */ }
  };

  const goByScroll = () => {
    if (leaving) return;
    leaving = true;
    report('scroll');
    location.assign(nextLink.href);
  };

  /* URL เดียวกันมีสอง affordance ที่หน้าตาไม่เหมือนกัน ต้องแยก ref เพื่อรู้ว่า
     คนเห็นปุ่มล่างจริง หรือใช้ภาพ Panel 4 เป็นทางไปต่อ */
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || leaving) return;
    try {
      if (new URL(link.href, location.href).href !== nextLink.href) return;
      report(link.classList.contains('tapnext') ? 'panel' : 'button');
    } catch { /* href แปลกไม่ต้องนับ */ }
  }, true);

  addEventListener('scroll', () => { wasAtBottom = atBottom(); }, { passive: true });
  wasAtBottom = atBottom();

  addEventListener('wheel', event => {
    const bottomBeforeWheel = wasAtBottom && atBottom();
    wasAtBottom = atBottom();
    if (bottomBeforeWheel && event.deltaY > 18) goByScroll();
  }, { passive: true });

  addEventListener('touchstart', event => {
    const touch = event.touches[0];
    touchStartY = touch ? touch.clientY : null;
    touchStartedAtBottom = atBottom();
  }, { passive: true });

  addEventListener('touchmove', event => {
    const touch = event.touches[0];
    if (!touchStartedAtBottom || touchStartY === null || !touch) return;
    if (touchStartY - touch.clientY > 64 && atBottom()) goByScroll();
  }, { passive: true });

  addEventListener('touchend', () => {
    touchStartY = null;
    touchStartedAtBottom = false;
  }, { passive: true });
}
