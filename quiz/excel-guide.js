// "How to make the Excel file" guide: a play button beside the import panel that opens a short video with three steps.
const VIDEO = '/quiz/guide/excel-guide.mp4', POSTER = '/quiz/guide/excel-guide.jpg', CAPTIONS = '/quiz/guide/excel-guide.th.vtt';
const TEMPLATE = '/quiz/templates/quiz-import.csv';

export function mountExcelGuide(anchor) {
  if (!anchor) return () => {};
  const doc = anchor.ownerDocument;
  const open = doc.createElement('button');
  open.type = 'button';open.className = 'guide-open';
  open.innerHTML = '<span class="guide-play" aria-hidden="true">▶</span><span><b>ดูวิธีทำไฟล์ Excel</b><small>คลิปสอน 40 วินาที · ง่ายที่สุด</small></span>';
  anchor.after(open);
  const dialog = doc.createElement('dialog');
  dialog.className = 'guide-dialog';dialog.setAttribute('aria-label', 'วิธีทำไฟล์คำถามด้วย Excel');
  dialog.innerHTML = `<div class="guide-head"><div><span class="eyebrow">HOW TO · EXCEL</span><h3>สร้างคำถามด้วย Excel</h3></div><button type="button" class="guide-close" data-guide-close aria-label="ปิด">×</button></div>
<div class="guide-video"><video controls playsinline preload="none" poster="${POSTER}"><source src="${VIDEO}" type="video/mp4"><track kind="captions" srclang="th" label="ไทย" src="${CAPTIONS}"></video></div>
<ol class="guide-steps"><li><b>5 คอลัมน์</b><span>A คำถาม · B คำตอบที่ถูก · C D E คำตอบหลอก</span></li><li><b>1 แถว = 1 ข้อ</b><span>ใส่ได้ 5–20 ข้อ · แถวหัวตารางมีหรือไม่มีก็ได้</span></li><li><b>บันทึก แล้วนำเข้า</b><span>กด “เลือกไฟล์” ตรวจรายการ แล้วกด “ใช้คำถามชุดนี้”</span></li></ol>
<p class="guide-note">ไม่ต้องกลัวคนเดาได้ ระบบสลับตำแหน่งคำตอบให้ทุกห้อง · ไฟล์อยู่ในเครื่องคุณ ไม่ถูกอัปโหลด</p>
<div class="guide-actions"><a class="primary" href="${TEMPLATE}" download="quiz-import.csv">ดาวน์โหลดตัวอย่าง ↓</a><button type="button" class="secondary" data-guide-close>เข้าใจแล้ว</button></div>`;
  doc.body.append(dialog);
  const video = dialog.querySelector('video');
  const close = () => { video.pause();if (dialog.open) dialog.close(); };
  open.onclick = () => { if (typeof dialog.showModal === 'function') dialog.showModal();else dialog.setAttribute('open', ''); video.play().catch(() => {}); };
  dialog.querySelectorAll('[data-guide-close]').forEach(button => { button.onclick = close; });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => video.pause());
  return () => { close();open.remove();dialog.remove(); };
}
