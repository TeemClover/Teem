import { ADMIN_URL, clean, datesFromTransfer } from './ai-source-domain.js';
function bangkok(value) {
  return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)) + ' (ไทย)';
}
export function registrationText(row) {
  const dates = datesFromTransfer(row.verified_transferred_at || row.submitted_transferred_at);
  return [
    'AI ใส่ซอส · มีผู้ส่งลงทะเบียนและสลิป',
    `อ้างอิง: ${clean(row.reference,60)}`,
    `ชื่อ: ${clean(row.name,120)}`,
    `อีเมล: ${clean(row.email,254) || '—'}`,
    `ติดต่อ: ${clean(row.contact,160) || '—'}`,
    `ยอดที่ผู้ซื้อแจ้ง: ${(Number(row.submitted_amount_satang)/100).toFixed(2)} บาท`,
    `ราคาที่เซิร์ฟเวอร์แสดงตอนส่ง: ${row.quoted_amount_thb} บาท`,
    `เวลาโอนที่กรอกตามสลิป: ${bangkok(row.submitted_transferred_at)}`,
    `รับเข้าภายใน 1 วันหลังโอน: ${bangkok(dates.admissionDueAt)}`,
    `กรอบคืนเงิน 30 วันนับจากโอน: ${bangkok(dates.guaranteeUntil)}`,
    row.verified_at ? 'วันข้างต้นอ้างเวลาโอนที่ผู้ดูแลตรวจแล้ว เงื่อนไขคืนเงินต้องเป็นไปตามข้อเสนอ' : 'วันข้างต้นรอตรวจยอดและเวลาโอนจริง เงื่อนไขคืนเงินต้องเป็นไปตามข้อเสนอ',
    ({pending_verification:'สถานะ: รอตรวจเงินเข้า ยังไม่ได้ให้สิทธิ์ Skool',payment_verified:'สถานะ: ผู้ดูแลตรวจเงินเข้าแล้ว รอจัดสิทธิ์เข้าเรียนด้วยตนเอง',admitted:'สถานะ: ผู้ดูแลบันทึกว่าจัดสิทธิ์เข้าเรียนแล้ว',rejected:'สถานะ: ผู้ดูแลไม่อนุมัติรายการ ตรวจหมายเหตุในหน้าผู้ดูแล'})[row.status] || 'สถานะ: รอตรวจรายการ',
    'ตรวจสลิปและจัดการรายการในหน้าผู้ดูแล:', ADMIN_URL,
  ].join('\n');
}
export function testText(id) { return `TEST · AI Sauce API\nทดสอบโดยผู้ดูแล ไม่มีผู้ซื้อจริง\nบันทึก/อ่าน/ลบข้อมูลทดสอบในฐานข้อมูลสำเร็จ\nอ้างอิงทดสอบ: ${clean(id,60)}\n${ADMIN_URL}`; }
export function createTelegramNotifier({ config = process.env, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  return async function notify(text) {
    if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) return {status:'unconfigured',code:'TELEGRAM_NOT_CONFIGURED'};
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({chat_id:config.TELEGRAM_CHAT_ID,text:text.slice(0,4000),disable_web_page_preview:true}),signal:controller.signal,
      });
      if (!response.ok) return {status:'failed',code:`TELEGRAM_HTTP_${response.status}`};
      const payload = await response.json().catch(() => null);
      return payload?.ok === true ? {status:'sent',code:'TELEGRAM_ACCEPTED'} : {status:'failed',code:'TELEGRAM_NOT_ACCEPTED'};
    } catch (error) {
      // Provider bodies/exception URLs can contain a bot token; never persist or return them.
      return {status:'failed',code:error?.name === 'AbortError' ? 'TELEGRAM_TIMEOUT' : 'TELEGRAM_NETWORK_ERROR'};
    } finally { clearTimeout(timer); }
  };
}
