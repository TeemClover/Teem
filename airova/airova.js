const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'เปิดเมนู');
  mobileNav.hidden = true;
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});

const videoDialog = document.querySelector('#video-dialog');
const player = document.querySelector('#showcase-player');
const videoError = document.querySelector('.video-error');
const templateDialog = document.querySelector('#template-dialog');
const templateContent = document.querySelector('#template-content');
const copyStatus = document.querySelector('#copy-status');
const copyButton = document.querySelector('#copy-template');

for (const dialog of [videoDialog, templateDialog]) {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
}

for (const card of document.querySelectorAll('[data-video]')) {
  card.addEventListener('click', () => {
    document.querySelector('#video-title').textContent = card.dataset.title;
    videoError.hidden = true;
    player.poster = card.dataset.poster;
    player.src = card.dataset.video;
    videoDialog.showModal();
    document.body.classList.add('dialog-open');
    player.play().catch(() => {
      // Native controls remain usable if autoplay is disallowed.
      if (player.error) videoError.hidden = false;
    });
  });
}
player.addEventListener('error', () => { if (player.hasAttribute('src')) videoError.hidden = false; });
videoDialog.addEventListener('close', () => {
  player.pause();
  player.removeAttribute('src');
  player.removeAttribute('poster');
  player.load();
});

const templates = {
  product: {
    title: 'เปิดตัวให้คนหยุดดู',
    prompt: `สร้างวิดีโอเปิดตัวสินค้าแนวตั้ง 9:16 ความยาว 8 วินาที\n\nสินค้า: [ชื่อและรายละเอียดสินค้า]\nใช้ภาพสินค้าที่อัปโหลดเป็นภาพอ้างอิง รักษารูปทรง สี และรายละเอียดสินค้าให้ตรงกับต้นฉบับ\n\n0–2 วินาที: เริ่มด้วยภาพใกล้รายละเอียดที่น่าสนใจที่สุดของสินค้า แสงด้านข้างเผยพื้นผิวอย่างสวยงาม\n2–6 วินาที: กล้องค่อย ๆ ถอยออก เผยสินค้าเต็มชิ้นบน [แท่นหรือฉากที่เข้ากับแบรนด์] ให้สินค้าอยู่นิ่งและเด่นที่สุดในภาพ\n6–8 วินาที: จบด้วยภาพ Hero Shot จัดพื้นที่ว่างด้านบนสำหรับใส่ข้อความภายหลัง\n\nโทนภาพ: [หรูหรา / สดใส / อบอุ่น]\nสีหลัก: [สีแบรนด์]\nการเคลื่อนไหวเรียบลื่น สมจริง รักษาความต่อเนื่องของสินค้า ไม่สร้างตัวอักษร โลโก้ใหม่ หรือคำกล่าวอ้างบนภาพ\n\nเคล็ดลับ: เลือกโหมดสร้างจากภาพ อัปโหลดภาพสินค้าที่ชัด และตรวจสอบเครดิตก่อนสร้าง`
  },
  character: {
    title: 'ถ้าของรอบตัวพูดได้',
    prompt: `สร้างวิดีโอคาแรกเตอร์แนวตั้ง 9:16 ความยาว 8 วินาที\n\nตัวเอก: [สิ่งของ ผัก หรือผลไม้ใกล้ตัว] ที่มีใบหน้าและแขนเล็ก ๆ\nบุคลิก: [ขี้เล่น / จริงจังเกินเหตุ / ง่วงตลอดเวลา]\nสถานที่: [สถานการณ์ธรรมดาที่คนดูคุ้นเคย]\n\n0–2 วินาที: เปิดด้วยภาพใกล้สีหน้าตัวเอก กำลังเผชิญ [ปัญหาเล็ก ๆ ที่น่าขำ]\n2–6 วินาที: ตัวเอกแสดงปฏิกิริยาเกินจริงเล็กน้อย ใช้ภาษากายเล่าเรื่อง ให้เข้าใจได้แม้ไม่มีเสียง\n6–8 วินาที: เฉลยด้วย [จุดหักมุมที่ปลอดภัยและเป็นมิตร] จบด้วยสีหน้าที่ชวนดูซ้ำ\n\nสไตล์ 3D สมจริงแต่มีเสน่ห์ แสงสวย ตัวเอกหน้าตาและสัดส่วนเหมือนเดิมตลอดคลิป กล้องเคลื่อนน้อยเพื่อให้ติดตามได้ง่าย\nไม่ใส่ตัวอักษรหรือคำบรรยายในภาพ ไม่เลียนแบบตัวละครที่มีเจ้าของ\n\nเคล็ดลับ: ถ้ามีภาพคาแรกเตอร์ของตัวเอง ให้อัปโหลดเป็นภาพอ้างอิง และเริ่มจากตัวเอกเพียงตัวเดียว`
  },
  cinematic: {
    title: 'เรื่องเล่าสั้น ภาพจำยาว',
    prompt: `สร้างวิดีโอแนวภาพยนตร์แนวตั้ง 9:16 ความยาว 8 วินาที\n\nตัวเอกหรือวัตถุหลัก: [ตัวเอกหรือวัตถุของคุณ]\nสถานที่: [สถานที่และช่วงเวลาที่ชัดเจน]\nอารมณ์: [ตื่นเต้น / สงบ / มีความหวัง]\n\nเปิดด้วยภาพรายละเอียดของ [วัตถุหรือพื้นผิวที่เล่าเรื่อง] จากนั้นใช้กล้องเคลื่อนต่อเนื่องเพียงหนึ่งจังหวะ ค่อย ๆ เผยโลกโดยรอบ และจบด้วยภาพกว้างที่ทำให้เข้าใจว่าตัวเอกอยู่ที่ไหน\n\nจัดแสงแบบภาพยนตร์ มีมิติ ระยะชัดตื้นพอดี พื้นผิวสมจริง ใช้สีหลัก [2 สีที่เลือก] เพื่อคุมบรรยากาศ\nรักษาตัวเอก วัตถุ และทิศทางแสงให้ต่อเนื่อง ไม่มีการเปลี่ยนรูปหรือเพิ่มตัวละครโดยไม่จำเป็น ไม่ใส่ตัวอักษรหรือวอเตอร์มาร์ก\n\nเคล็ดลับ: เลือกการเคลื่อนกล้องเพียงอย่างเดียว เช่น dolly out หรือ slow orbit แล้วเปรียบเทียบผลงานทีละตัวเลือก`
  }
};

for (const button of document.querySelectorAll('[data-template]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.template;
    const template = templates[key];
    document.querySelector('#template-title').textContent = template.title;
    templateContent.textContent = template.prompt;
    copyStatus.textContent = '';
    copyButton.disabled = false;
    document.querySelector('#download-template').href = `/airova/templates/${key}.txt`;
    templateDialog.showModal();
    document.body.classList.add('dialog-open');
  });
}
copyButton.addEventListener('click', async () => {
  copyButton.disabled = true;
  try {
    await navigator.clipboard.writeText(templateContent.textContent);
    copyStatus.textContent = 'คัดลอกแล้ว — ปรับข้อมูลใน [วงเล็บ] แล้วนำไปลองได้เลย';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(templateContent);
    selection.removeAllRanges();
    selection.addRange(range);
    templateContent.focus();
    copyStatus.textContent = 'เลือกข้อความให้แล้ว กดคัดลอกจากเมนูของอุปกรณ์ หรือดาวน์โหลดไฟล์ .txt ได้เลย';
  } finally {
    copyButton.disabled = false;
  }
});
