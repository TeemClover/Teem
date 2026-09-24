const copyButton = document.querySelector('#copy-interest');
const copyStatus = document.querySelector('#copy-status');
const message = 'สนใจ AI Career ครับ/ค่ะ อยากทราบวันเรียนและรายละเอียดเวิร์กช็อป 990 บาท งานที่อยากพัฒนาคือ: ';

if (copyButton && copyStatus && window.isSecureContext && navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message);
      copyStatus.textContent = 'คัดลอกแล้ว เปิด LINE แล้ววางข้อความเพื่อส่งถึง myClover ได้เลย';
    } catch {
      copyStatus.textContent = 'คัดลอกไม่ได้ในเบราว์เซอร์นี้ พิมพ์ “สนใจ AI Career” ใน LINE ได้เลย';
    }
  });
}
