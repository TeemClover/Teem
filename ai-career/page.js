const copyButton = document.querySelector('#copy-interest');
const copyStatus = document.querySelector('#copy-status');
const message = 'ติดตาม AI Career ครับ/ค่ะ สนใจข่าวเปิดคอร์สและรายละเอียดเมื่อพร้อม';

if (copyButton && copyStatus && window.isSecureContext && navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message);
      copyStatus.textContent = 'คัดลอกแล้ว เปิด LINE และวางข้อความเพื่อแจ้งความสนใจได้เลย';
    } catch {
      copyStatus.textContent = 'คัดลอกไม่ได้ในเบราว์เซอร์นี้ พิมพ์ “ติดตาม AI Career” ใน LINE ได้เลย';
    }
  });
}
