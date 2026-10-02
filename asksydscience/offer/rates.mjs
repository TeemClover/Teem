/** MC-WEB-2026-10-v1: proposed rate card for this offer, not historical approved pricing.
 * All amounts are integer THB service fees, excluding applicable tax / third-party fees.
 * This is the single price source. Packages are module presets, never another surcharge.
 * Care display revision 2026-10-02: owner confirmed existing monthly prices already include 50% off.
 * Keep payable prices unchanged; regularPrice is comparison metadata, not another charge.
 */
export const RATE = Object.freeze({
  version: 'MC-WEB-2026-10-v1', issued: '2026-10-02', currency: 'THB', status: 'proposal', revision: '2026-10-02-care50',
  base: { id: 'home', title: 'บ้านออนไลน์พร้อมเปิด', price: 19900, days: 10,
    scope: [
      '6 แบบหน้า: หน้าแรก / คลังเรื่อง / แม่แบบบทความ / เวิร์กช็อป / ของที่ซิดเลือก / เกี่ยวกับซิด',
      'ลงเนื้อหาเริ่มต้น 3 เรื่อง สินค้าแนะนำ 3 รายการ และเวิร์กช็อป 1 โปรแกรม จากข้อมูลที่ซิดอนุมัติ',
      'ดีไซน์ 1 ทิศทางตามเดโม ปรับสำหรับมือถือและคอมพิวเตอร์ พร้อมการเคลื่อนไหวเบา ๆ',
      'จัดข้อความหน้าแรกจากบรีฟ ชื่อหน้า คำบรรยาย ภาพแชร์ 1 แบบ และเชื่อมช่องทางจริง',
      'ไฟล์เนื้อหาแยกจากดีไซน์ คู่มือส่งเนื้อหา และประชุมส่งมอบออนไลน์ 60 นาที',
      'แก้ไขตามขอบเขต 2 รอบ ทดสอบก่อนเปิด ติดตั้ง 1 เว็บไซต์ และแก้บั๊กจากงานที่ส่งมอบ 30 วัน'
    ]
  },
  modules: [
    { id: 'intake', title: 'ระบบฟอร์มรับสมัครบนเว็บไซต์', short: 'รับสมัครและเก็บข้อมูลในระบบ', price: 6000, days: 3,
      description: 'ฟอร์มบนเว็บไซต์ พร้อมเก็บข้อมูลภายในระบบ ทดแทน Google Form ได้',
      scope: 'ฟอร์มบนเว็บไซต์ 1 ชุด ไม่เกิน 15 คำถาม + จัดเก็บข้อมูลผู้สมัครภายในระบบ พร้อมสถานะ 4 ขั้น + ข้อความตอบกลับและลิงก์ LINE + ทดลองส่ง 5 รายการ',
      limit: 'ทีมซิดตรวจยอดและติดต่อผู้สมัครเอง ไม่รวมรับเงิน ส่ง LINE อัตโนมัติ หรือเก็บข้อมูลสุขภาพ' },
    { id: 'source', title: 'ชุดซอสและเวิร์กโฟลว์ AI', short: 'ทำเนื้อหาต่อได้', price: 4000, days: 1,
      description: 'ใช้ความรู้และภาพที่มี ให้กลายเป็นเนื้อหาที่ขึ้นเว็บต่อได้',
      scope: 'เทมเพลต 4 แบบ: เรื่องเล่า / เวิร์กช็อป / สินค้า / บรีฟอัปเดต + สอนออนไลน์ 90 นาที สำหรับไม่เกิน 2 คน พร้อมทำตัวอย่าง 1 เรื่อง',
      limit: 'ทำงานจากข้อมูลที่ซิดส่ง ไม่รวมวิจัยสุขภาพ เขียนทุกตอน ผลิตวิดีโอ หรือค่าสมาชิกเครื่องมือ AI' },
    { id: 'cms', title: 'หลังบ้านแก้เนื้อหาเอง', short: 'มีหลังบ้านใช้งานจริง', price: 15000, days: 5,
      description: 'ทีมซิดเพิ่มเรื่องและอัปเดตข้อมูลผ่านหน้าเว็บได้',
      scope: 'เชื่อม CMS สำเร็จรูป 1 ระบบ ในบัญชีเจ้าของ สำหรับผู้แก้ไขไม่เกิน 2 คน / เนื้อหา 3 ประเภท / ร่าง–พรีวิว–เผยแพร่ + สอนใช้งาน 60 นาที',
      limit: 'แก้เนื้อหา ไม่ใช่ลากวางเปลี่ยนดีไซน์ทั้งเว็บ ไม่รวมระบบสมาชิกผู้เรียน และค่าบริการ CMS / hosting' }
  ],
  extras: [
    { id: 'pages', title: 'หน้าเพิ่มในดีไซน์เดิม', price: 2500, max: 8, unit: 'หน้า', days: 2,
      scope: 'ไม่เกิน 5 ส่วนต่อหน้า ใช้ภาพและข้อความที่อนุมัติ ไม่เพิ่มระบบหลังบ้านใหม่' },
    { id: 'stories', title: 'นำเนื้อหาลงเว็บเพิ่ม', price: 600, max: 20, unit: 'เรื่อง', days: 0,
      scope: 'จัดรูปแบบจากต้นฉบับไม่เกิน 1,200 คำ และภาพไม่เกิน 5 ภาพต่อเรื่อง ไม่รวมแต่งเรื่องหรือถ่ายทำ' },
    { id: 'codesign', title: 'ร่วมออกแบบเวิร์กช็อป', price: 4500, max: 1, unit: 'ชุด', days: 2,
      scope: 'ประชุม 90 นาที + โครงกิจกรรม 4 สัปดาห์และแบบการบ้าน 1 ชุด + แก้ 1 รอบ ไม่รวมสอนจริง จัดงาน หรือติดตามผู้เรียน' }
  ],
  care: [
    { id: 'none', title: 'ดูแลเอง', price: 0, regularPrice: 0, discountPercent: 0, scope: 'ไม่มีค่าดูแลรายเดือน ยังได้รับคู่มือส่งมอบและแก้บั๊กจากงานเดิม 30 วัน' },
    { id: 'light', title: 'ดูแลเบา ๆ', price: 1500, regularPrice: 3000, discountPercent: 50, scope: 'สูงสุด 2 ชั่วโมง/เดือน และไม่เกิน 2 เนื้อหา + ตรวจลิงก์/หน้าหลัก 1 ครั้ง ตอบรับงานภายใน 2 วันทำการ' },
    { id: 'grow', title: 'ช่วยเติบโตต่อ', price: 3500, regularPrice: 7000, discountPercent: 50, scope: 'สูงสุด 5 ชั่วโมง/เดือน และไม่เกิน 4 เนื้อหา รวมคุยทบทวน 30 นาที + ตรวจหน้าหลัก ตอบรับงานภายใน 2 วันทำการ' }
  ],
  plans: [
    { id: 'a', letter: 'A', title: 'เปิดบ้าน', en: 'A place to begin', modules: [],
      description: 'มีเว็บไซต์ของตัวเองก่อน แล้วค่อยเพิ่มระบบเมื่อพร้อม', bullets: ['เว็บไซต์ 6 แบบหน้า', 'เนื้อหาเริ่มต้นและช่องทางจริง', 'ส่งมอบไฟล์และสอนดูแลเบื้องต้น'] },
    { id: 'b', letter: 'B', title: 'บ้านที่พร้อมจัดกิจกรรม', en: 'A place to connect', modules: ['intake', 'source'],
      description: 'เว็บไซต์ + ทางรับสมัคร + วิธีทำเนื้อหาต่อ เหมาะกับเวิร์กช็อปรอบแรก', bullets: ['ทุกอย่างใน A', 'ฟอร์มบนเว็บ พร้อมเก็บข้อมูลภายในระบบ', 'ชุดซอส 4 แบบ + สอน AI 90 นาที'] },
    { id: 'c', letter: 'C', title: 'บ้านที่ทีมดูแลต่อได้', en: 'A place to grow', modules: ['intake', 'source', 'cms'],
      description: 'เพิ่มหลังบ้านให้ทีมแก้และเผยแพร่เนื้อหาเองได้', bullets: ['ทุกอย่างใน B', 'CMS จริงสำหรับผู้แก้ไข 2 คน', 'จัดการเรื่องเล่า เวิร์กช็อป และสินค้า'] }
  ]
});
const owns = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const integer = (value, max) => {
  const text = String(value ?? '0');
  if (!/^\d+$/.test(text)) return 0;
  const n = Number(text);
  return Number.isSafeInteger(n) ? Math.min(n, max) : 0;
};
export function normalize(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const ids = Array.isArray(source.modules) ? source.modules : [];
  const extras = source.extras && typeof source.extras === 'object' ? source.extras : {};
  return {
    modules: RATE.modules.filter(x => ids.includes(x.id)).map(x => x.id),
    extras: Object.fromEntries(RATE.extras.map(x => [x.id, integer(owns(extras, x.id) ? extras[x.id] : 0, x.max)])),
    care: RATE.care.some(x => x.id === source.care) ? source.care : 'none',
    months: [1, 3, 6, 12].includes(Number(source.months)) ? Number(source.months) : 3
  };
}
export function preset(id = 'b') {
  const plan = RATE.plans.find(x => x.id === id) || RATE.plans[1];
  return normalize({ modules: plan.modules });
}
export function quote(input) {
  const s = normalize(input);
  const modules = RATE.modules.filter(x => s.modules.includes(x.id));
  const rows = [ { id: 'home', title: RATE.base.title, quantity: 1, unitPrice: RATE.base.price, total: RATE.base.price } ];
  modules.forEach(x => rows.push({ id: x.id, title: x.title, quantity: 1, unitPrice: x.price, total: x.price }));
  RATE.extras.forEach(x => { const n = s.extras[x.id]; if (n) rows.push({ id: x.id, title: x.title, quantity: n, unitPrice: x.price, total: n * x.price }); });
  const oneTime = rows.reduce((sum, x) => sum + x.total, 0);
  const care = RATE.care.find(x => x.id === s.care);
  const first = Math.round(oneTime * 0.5), second = Math.round(oneTime * 0.3);
  const plan = RATE.plans.find(x => x.modules.join('|') === s.modules.join('|'));
  const days = RATE.base.days + modules.reduce((sum, x) => sum + x.days, 0) + RATE.extras.reduce((sum, x) => sum + x.days * s.extras[x.id], 0) + Math.ceil(s.extras.stories / 5);
  return { state: s, rows, oneTime, monthly: care.price, monthlyRegular: care.regularPrice, monthlySaving: care.regularPrice - care.price, care, careBudget: care.price * s.months, budget: oneTime + care.price * s.months,
    installments: [first, second, oneTime - first - second], days,
    planId: plan?.id || 'custom', title: plan ? `${plan.letter} · ${plan.title}` : 'จัดชุดตามที่ซิดเลือก',
    version: RATE.version, excludesTax: true, excludesExternalFees: true };
}
export function encodeState(input) {
  const s = normalize(input), p = new URLSearchParams({ v: RATE.version, m: s.modules.join(','), care: s.care, months: String(s.months) });
  RATE.extras.forEach(x => p.set(x.id, String(s.extras[x.id])));
  return p.toString();
}
export function decodeState(search) {
  const p = new URLSearchParams(search);
  if (!p.has('v')) return { state: preset(), notice: '' };
  if (p.get('v') !== RATE.version) return { state: preset(), notice: 'ลิงก์นี้ใช้เรตราคาคนละเวอร์ชัน เริ่มจากชุด B ของฉบับปัจจุบัน กรุณาตรวจรายการอีกครั้ง' };
  const raw = { modules: (p.get('m') || '').split(','), care: p.get('care'), months: p.get('months'), extras: Object.fromEntries(RATE.extras.map(x => [x.id, p.get(x.id)])) };
  const state = normalize(raw);
  const unusual = RATE.extras.some(x => p.has(x.id) && String(state.extras[x.id]) !== p.get(x.id)) || raw.modules.some(x => x && !RATE.modules.some(y => y.id === x)) || !RATE.care.some(x => x.id === raw.care) || ![1, 3, 6, 12].includes(Number(raw.months));
  return { state, notice: unusual ? 'มีค่าที่ไม่รองรับในลิงก์ ระบบปรับเป็นค่าที่ปลอดภัยแล้ว กรุณาตรวจรายการและยอดอีกครั้ง' : 'เปิดรายการจากลิงก์แล้ว คำนวณใหม่ด้วยเรต ' + RATE.version };
}
export const money = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
export function summaryText(input) {
  const q = quote(input);
  const lines = [ 'ข้อเสนอเว็บไซต์ AskSydScience × myClover', `เรตราคา ${RATE.version} | วันที่ออก ${RATE.issued}`, 'สถานะ: ข้อเสนอเพื่อยืนยันขอบเขต ไม่ใช่ใบแจ้งหนี้หรือการรับงานอัตโนมัติ', '', q.title,
    ...q.rows.map(x => `${x.title}: ${x.quantity} × ${money(x.unitPrice)} = ${money(x.total)} บาท`), '',
    `ค่าทำครั้งเดียว: ${money(q.oneTime)} บาท`, `ค่าดูแล: ${q.care.title} — ${money(q.monthly)} บาท/เดือน`, ...(q.monthly ? [`ราคาพิเศษ ลด ${q.care.discountPercent}% แล้ว จากราคาปกติ ${money(q.monthlyRegular)} บาท/เดือน ประหยัด ${money(q.monthlySaving)} บาท/เดือน`, 'ยอดค่าดูแลและงบรวมใช้ราคาพิเศษแล้ว ไม่หักส่วนลดซ้ำ และไม่ลดค่าทำครั้งเดียว'] : []), `ขอบเขตดูแล: ${q.care.scope}`,
    `งบค่าบริการ ${q.state.months} เดือนหลังส่งมอบ: ${money(q.budget)} บาท (ค่าทำ + ค่าดูแล ${q.state.months} เดือน)`,
    'ยังไม่รวมภาษีที่ใช้จริง โดเมน hosting CMS เครื่องมือ AI และค่าใช้จ่ายบุคคลภายนอก ไม่ใช่ยอดรวมต้นทุนทั้งหมด',
    `งวดงาน 50% / 30% / 20%: ${q.installments.map(money).join(' / ')} บาท (เฉพาะค่าทำก่อนภาษี)`,
    `กรอบเวลาประเมิน: ${q.days} วันทำการหลังข้อมูลครบและยืนยันคิว ไม่รวมเวลารอตรวจงาน`, '', 'ขอบเขตพื้นฐาน:', ...RATE.base.scope.map(x => '- ' + x) ];
  RATE.modules.filter(x => q.state.modules.includes(x.id)).forEach(x => lines.push('', x.title, x.scope, 'ไม่รวม: ' + x.limit));
  RATE.extras.filter(x => q.state.extras[x.id]).forEach(x => lines.push('', `${x.title} × ${q.state.extras[x.id]}`, x.scope));
  lines.push('', 'เงื่อนไข:', 'ซิดส่งภาพ/ข้อมูล/แหล่งอ้างอิงและอนุมัติก่อนเผยแพร่ เลือกแบรนด์และทิศทางได้อิสระ',
    'บัญชีโดเมนและบริการภายนอกเป็นของซิด ส่งมอบซอร์สงานเฉพาะโครงการเมื่อชำระครบ ไม่รวมสิทธิ์เครื่องมือ/ส่วนประกอบของบุคคลอื่น',
    '2 รอบแก้ = ส่งข้อแก้รวมครั้งละ 1 ชุดภายในทิศทางที่อนุมัติ งานนอกขอบเขตเสนอราคาและอนุมัติก่อนทำ',
    'ดูแลรายเดือนเริ่มหลังส่งมอบ ยกเลิกรอบถัดไปได้ก่อนต่อรอบ ชั่วโมงไม่ทบเดือน ใช้เพดานชั่วโมงหรือจำนวนเนื้อหาที่ถึงก่อน ไม่รวมงานสร้างฟีเจอร์ใหม่',
    'เวลาตอบรับไม่ใช่เวลารับประกันแก้เสร็จ งานเกินแผนดูแล 900 บาท/ชั่วโมง คิดครั้งละ 0.5 ชั่วโมงเมื่ออนุมัติล่วงหน้า',
    'ไม่รวมสมาชิก/คอร์สล็อกอิน checkout ฐานข้อมูลสุขภาพ รับประกันยอดขาย หรือจัดและสอนเวิร์กช็อปจริง',
    'ก่อนเริ่มงานต้องยืนยันราคา ภาษี ขอบเขต วันเริ่ม และงวดชำระเป็นลายลักษณ์อักษร ไม่มีการส่งข้อมูลหรือชำระเงินจากหน้านี้');
  return lines.join('\n');
}