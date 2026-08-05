/* ═══════════════════════════════════════════════════════════════
   ล็อกหน้าสถิติด้วยรหัสผ่าน — ทำที่ขอบ ไม่ใช่ใน JS ของหน้า

   ล็อกฝั่ง client เป็นแค่ผ้าม่าน ใครกด View Source ก็เห็นรหัส และ HTML
   ก็ถูกส่งมาถึงเครื่องเขาแล้วอยู่ดี ตัวนี้จึงกันตั้งแต่ Cloudflare
   หน้าเว็บไม่ถูกส่งออกไปเลยถ้ารหัสไม่ผ่าน

   ตั้งรหัสที่ Cloudflare Pages → Settings → Environment variables:
     STAT_PASSWORD = อะไรก็ได้ที่เดายาก
     STAT_USER     = ไม่ใส่ก็ได้ ค่าเริ่มต้นคือ 'teem'

   ── ยังไม่ตั้งรหัส = ล็อกไว้ก่อน ──
   ถ้าไม่มี STAT_PASSWORD จะปิดประตูพร้อมบอกวิธีตั้ง ไม่ใช่เปิดทิ้งไว้
   เพราะ "ลืมตั้งแล้วเปิดโล่ง" เป็นความผิดพลาดที่เงียบและแพงกว่า
   "ตั้งไม่เสร็จแล้วเข้าไม่ได้" ซึ่งเห็นทันทีและแก้ได้ใน 1 นาที

   หมายเหตุ: ตัวนี้ทำงานบน Cloudflare Pages เท่านั้น ถ้าเปิดผ่านโดเมน
   Vercel จะไม่มีอะไรกั้น — ให้เข้าหน้าสถิติผ่านโดเมนที่ Cloudflare เสิร์ฟ
   ═══════════════════════════════════════════════════════════════ */

const REALM = 'myClover Stat';

function ask(message) {
  return new Response(message, {
    status: 401,
    headers: {
      'www-authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/* เทียบแบบใช้เวลาคงที่ — เทียบด้วย === จะคืนเร็วกว่าเมื่อตัวแรกผิด
   ซึ่งวัดได้และใช้เดารหัสทีละตัวได้ */
function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const password = env.STAT_PASSWORD;

  if (!password) {
    return new Response(
      'หน้าสถิติยังไม่ได้ตั้งรหัสผ่าน\n\n'
      + 'ไปที่ Cloudflare Pages → Settings → Environment variables\n'
      + 'แล้วเพิ่ม STAT_PASSWORD (และ STAT_USER ถ้าอยากเปลี่ยนชื่อผู้ใช้จาก teem)\n\n'
      + 'ปิดประตูไว้ก่อนโดยตั้งใจ — ลืมตั้งรหัสแล้วเปิดโล่งเป็นความผิดพลาดที่เงียบกว่า\n',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } },
    );
  }

  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return ask('ต้องใส่รหัสผ่านก่อน');

  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch { return ask('รหัสผ่านอ่านไม่ออก'); }

  /* รหัสผ่านมี : ได้ จึงตัดแค่ตัวแรกตัวเดียว */
  const split = decoded.indexOf(':');
  const user = split < 0 ? decoded : decoded.slice(0, split);
  const pass = split < 0 ? '' : decoded.slice(split + 1);

  const okUser = safeEqual(user, env.STAT_USER || 'teem');
  const okPass = safeEqual(pass, password);
  /* เช็คทั้งสองอย่างเสมอ ไม่ลัดวงจร จะได้ไม่บอกใบ้ว่าผิดที่ชื่อหรือที่รหัส */
  if (!(okUser && okPass)) return ask('รหัสผ่านไม่ถูกต้อง');

  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return out;
}
