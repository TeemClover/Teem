// /welcome · คำถามระหว่างทาง ใช้ร่วมกันทั้งหน้าเว็บ (แสดงผล) และ api/welcome.js (ตรวจคำตอบก่อนบันทึก)
// เพิ่มหรือแก้ตัวเลือก: แก้ที่นี่ที่เดียว id ของตัวเลือกห้ามเปลี่ยนหลังเปิดใช้ เพราะสรุปผลนับจาก id

export const QUESTIONS = Object.freeze([
  { id: 'channel', scene: 'hook', multi: true, ask: 'ตอนนี้คุณขายของทางไหนอยู่บ้าง', hint: 'เลือกได้หลายข้อ',
    options: [
      { id: 'affiliate', t: 'Affiliate · TikTok · Shopee' },
      { id: 'live', t: 'ไลฟ์ขายของ' },
      { id: 'shop', t: 'เพจหรือร้านของตัวเอง' },
      { id: 'direct', t: 'ขายตรง · ตัวแทน' },
      { id: 'none', t: 'ยังไม่เคยขาย' } ] },
  { id: 'reach_back', scene: 'pain', ask: 'ลูกค้าที่ซื้อจากคุณเดือนที่แล้ว วันนี้ทักกลับได้กี่คน',
    options: [
      { id: 'almost_none', t: 'แทบไม่ได้เลย' },
      { id: 'some', t: 'ได้บางคน' },
      { id: 'most', t: 'ได้เกือบทุกคน' },
      { id: 'no_customer', t: 'ยังไม่มีลูกค้า' } ] },
  { id: 'asked_about', scene: 'product', ask: 'คนรอบตัวคุณ ถามเรื่องสุขภาพเรื่องไหนบ่อยที่สุด',
    options: [
      { id: 'shape', t: 'หุ่นและไขมัน' },
      { id: 'muscle', t: 'กล้ามเนื้อและแรง' },
      { id: 'sleep', t: 'การนอน' },
      { id: 'food', t: 'กินยังไงดี' } ] },
  { id: 'start_with', scene: 'story', ask: 'ถ้าเริ่มวันนี้ คุณอยากเริ่มแบบไหน',
    options: [
      { id: 'xplorer', t: 'เริ่มเป็น X-PLORER ขายได้เลย' },
      { id: 'xvisor', t: 'อยากสอบเป็น X-VISOR เลย' },
      { id: 'think', t: 'ขอดูข้อมูลก่อน' } ] },
  { id: 'ai_help', scene: 'ai', multi: true, ask: 'อยากให้ AI ช่วยเรื่องไหนที่สุด', hint: 'เลือกได้หลายข้อ',
    options: [
      { id: 'content', t: 'คิดว่าจะโพสต์อะไร' },
      { id: 'clip', t: 'ตัดคลิป' },
      { id: 'chat', t: 'ร่างคำตอบแชตลูกค้า' },
      { id: 'follow', t: 'เตือนว่าวันนี้ต้องดูแลใคร' } ] }
]);

// ฉากของฟิล์ม: ใช้นับว่าคนดูไปถึงฉากไหน (ไม่ใช่ข้อมูลส่วนตัว)
export const SCENES = Object.freeze(['hook', 'tom', 'pain', 'why', 'product', 'story', 'ai', 'start']);
// สิ่งที่กดท้ายเรื่อง (นับแบบเดียวกับฉาก ไม่มีข้อมูลส่วนตัว)
export const ACTIONS = Object.freeze(['message_line', 'message_copy']);

export const CONSENT_VERSION = 'welcome-contact-v1';

// คืนคำตอบที่สะอาดแล้ว หรือ null ถ้าไม่ตรงกับคำถาม
export function cleanAnswer(qid, value) {
  const q = QUESTIONS.find(x => x.id === qid);
  if (!q) return null;
  const ids = new Set(q.options.map(o => o.id));
  const list = (Array.isArray(value) ? value : [value]).map(String);
  if (!list.length || list.length > q.options.length || list.some(v => !ids.has(v))) return null;
  if (!q.multi && list.length !== 1) return null;
  return [...new Set(list)];
}

// เบอร์มือถือไทย หรือ LINE ID
export function cleanContact(raw) {
  const text = String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const digits = text.replace(/[\s-]/g, '').replace(/^\+66/, '0');
  if (/^0[689]\d{8}$/.test(digits)) return { kind: 'phone', value: digits };
  const line = text.replace(/\s/g, '');
  if (/^@?[a-z0-9._-]{3,30}$/i.test(line)) return { kind: 'line', value: line.toLowerCase() };
  return null;
}
