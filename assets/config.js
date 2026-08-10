/* ═══════════════════════════════════════════════════════════════
   myclover — ค่าตั้งกลางของเว็บ
   แก้ไฟล์นี้ไฟล์เดียว ทุกหน้าที่เรียกใช้จะเปลี่ยนตามทันที

   ⚠️ ไฟล์นี้ถูกส่งไปกับหน้าเว็บ = ใครเปิดดูซอร์สก็เห็น
   อย่าใส่กุญแจ รหัสลับ หรือ API key ใด ๆ ลงในนี้เด็ดขาด
   ═══════════════════════════════════════════════════════════════ */
window.MC_CONFIG = {

  /* ประตูกิลด์ (Discord) — ปุ่มจะโผล่ก็ต่อเมื่อผ่านเงื่อนไขใน guildx.js เท่านั้น
     ไม่ได้แปะลอย ๆ ให้ใครก็กดได้ตั้งแต่วันแรก */
  GUILDX_INVITE: 'https://discord.gg/A5nmMqvTm',

  /* ลิงก์เพิ่มเพื่อน LINE OA — ใส่เมื่อตั้ง OA เสร็จ ปุ่ม LINE จะโผล่เอง */
  LINE_ADD_URL: '',

  /* ปลายทางรับข้อมูลลงทะเบียน — Cloudflare Pages Function ใน functions/api/register.js
     ถ้าเรียกไม่ได้ (เช่นยังไม่ผูก D1 หรือเปิดจากที่อื่น) หน้าการ์ดจะสลับไปโหมดส่งอีเมลเอง
     เว้นว่าง = ใช้โหมดส่งอีเมลอย่างเดียว ไม่ต้องยิง API เลย */
  REGISTER_ENDPOINT: '/api/register',

  /* เวลาเปิดบ้าน 8/8/2569 เที่ยงคืน (เวลาไทย) */
  OPEN_AT: '2026-08-08T00:00:00+07:00'
};

/* Secret ending compatibility: the historical save key is GLHF, but the final
   compass-card reward is presented as PLATINUM TROPHY. Load this before the
   card's inline renderer so canvas measurements use the final label too. */
if (/^\/card\/?(?:index\.html)?$/.test(location.pathname)) {
  var pt = document.createElement('script');
  pt.src = '/assets/card-platinum-trophy.js?v=20260811-1';
  pt.async = false;
  document.head.appendChild(pt);
}
