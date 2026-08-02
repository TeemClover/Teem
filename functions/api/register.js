/* ═══════════════════════════════════════════════════════════════
   POST /api/register — รับข้อมูลลงทะเบียนสมาชิก

   ไฟล์นี้เป็น Cloudflare Pages Function — วางไว้ในโฟลเดอร์ functions/
   แล้ว Cloudflare จะทำให้เป็น API ให้เองตอน deploy ไม่ต้องตั้งอะไรเพิ่ม

   ต้องผูก D1 database เข้ากับ Pages project ด้วยชื่อตัวแปร DB ก่อน
   (Settings → Bindings → D1 database → Variable name: DB)
   ตารางอยู่ใน tools/schema.sql

   ถ้ายังไม่ได้ผูก จะตอบ 503 แล้วหน้าการ์ดจะสลับไปโหมดส่งอีเมลแทน
   ข้อมูลของคนลงทะเบียนจะไม่หายไปเฉย ๆ ไม่ว่ากรณีไหน
   ═══════════════════════════════════════════════════════════════ */

/* ต้องตรงกับ <option> ในฟอร์ม card/index.html
   คำอ่านมาจากตารางนี้ ไม่เอาที่ผู้ใช้ส่งมา จะได้ไม่มีข้อความแปลกปลอมหลุดเข้าฐานข้อมูล */
const ERA_TH = {
  '2007-2009': '2007–2009 · ยุคบุกเบิก',
  '2010-2013': '2010–2013 · ยุคดวงดาว',
  '2014-2015': '2014–2015 · ยุคดวงอาทิตย์',
  '2016-2019': '2016–2019 · ยุคตำนาน',
  '2020-2022': '2020–2022 · ยุคโควิด',
  '2023+'    : 'หลังปี 2023 เป็นต้นมา',
  'forgot'   : 'จำไม่ได้แล้ว',
  'new'      : 'เพิ่งรู้จักบ้านนี้ตอนนี้เอง'
};
const CLASSES = ['THINKER', 'TASTER', 'KEEPER', 'MAKER'];
const TITLES  = ['SEEKER', 'BLACKSMITH', 'AWAKENED', 'HERO', 'GLHF'];

const LIMIT_PER_HOUR = 6;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

/* ตัดให้สั้น ตัดช่องว่างหัวท้าย และตัดอักขระควบคุมทิ้ง */
function clean(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120;

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* MY-<ปี ค.ศ.>-<ลำดับ 4 หลัก>
   แยกลำดับตามปี และไม่นำ id ของแถวมาใช้ เพื่อให้เลขบนการ์ดอ่านง่ายและคงที่ */
async function nextMemberNo(db, iso) {
  const year = new Date(iso).getUTCFullYear();
  const prefix = 'MY-' + year + '-';
  const row = await db.prepare(
    'SELECT MAX(CAST(substr(member_no, 9) AS INTEGER)) AS mx FROM members WHERE member_no LIKE ?1'
  ).bind(prefix + '%').first();
  const n = ((row && row.mx) || 0) + 1;
  return prefix + String(n).padStart(4, '0');
}

/* ยิงถี่เกินไปไหม — เก็บแค่ค่าแฮชของ IP ต่อชั่วโมง แล้วลบของเก่าทิ้ง */
async function tooMany(db, ip, now) {
  if (!ip) return false;
  const hour = now.slice(0, 13);                       // 2026-07-29T00
  const bucket = (await sha256(ip + '|myclover')).slice(0, 24) + ':' + hour;
  try {
    await db.prepare(
      `INSERT INTO reg_hits (bucket, n, at) VALUES (?1, 1, ?2)
       ON CONFLICT(bucket) DO UPDATE SET n = n + 1, at = ?2`
    ).bind(bucket, now).run();
    const row = await db.prepare('SELECT n FROM reg_hits WHERE bucket = ?1').bind(bucket).first();
    /* เก็บกวาดของเก่า ทำแบบเบา ๆ ไม่ให้ถ่วงคำขอนี้ */
    await db.prepare("DELETE FROM reg_hits WHERE at < datetime('now','-2 hours')").run();
    return !!row && row.n > LIMIT_PER_HOUR;
  } catch (e) {
    return false;   /* ตารางกันสแปมมีปัญหา ก็ไม่ควรกันคนลงทะเบียนจริง */
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, error: 'no_db',
                  message: 'ยังไม่ได้ผูกฐานข้อมูล' }, 503);
  }

  let d;
  try { d = await request.json(); }
  catch (e) { return json({ ok: false, error: 'bad_json' }, 400); }

  /* ช่องดักบอท — คนจริงมองไม่เห็นช่องนี้ ถ้ามีค่ามาแปลว่าเป็นบอท
     ตอบ ok กลับไปเฉย ๆ จะได้ไม่รู้ตัวว่าโดนคัดออก แต่ไม่บันทึกอะไร */
  if (clean(d.website, 200)) return json({ ok: true, member_no: null });

  const name  = clean(d.name, 80);
  const email = clean(d.email, 120).toLowerCase();

  if (!name)          return json({ ok: false, error: 'name',    message: 'ยังไม่ได้ใส่ชื่อ' }, 400);
  if (!emailOk(email))return json({ ok: false, error: 'email',   message: 'อีเมลไม่ถูกรูปแบบ' }, 400);
  if (d.consent !== true)
                      return json({ ok: false, error: 'consent', message: 'ต้องยินยอมก่อนถึงจะบันทึกได้' }, 400);

  const era     = ERA_TH[clean(d.era, 20)] ? clean(d.era, 20) : '';
  const eraTh   = ERA_TH[era] || '';
  const cls     = CLASSES.includes(clean(d.cls, 20)) ? clean(d.cls, 20) : '';
  const titles  = Array.isArray(d.titles)
    ? d.titles.filter(t => TITLES.includes(t)).slice(0, TITLES.length) : [];
  const now = new Date().toISOString();

  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (await tooMany(env.DB, ip, now)) {
    return json({ ok: false, error: 'rate',
                  message: 'ลงทะเบียนถี่เกินไป ลองใหม่อีกสักครู่นะครับ' }, 429);
  }

  const row = {
    email,
    name,
    nickname : clean(d.nickname, 40),
    card_line: clean(d.line, 200),
    class    : cls,
    era, era_th: eraTh,
    titles   : JSON.stringify(titles),
    news     : d.news ? 1 : 0,
    source   : clean(d.source, 30) || 'card'
  };

  try {
    /* อีเมลเดิม = คนเดิม อัปเดตของเดิมแทนที่จะเพิ่มแถวใหม่
       created_at กับ member_no ของเดิมต้องไม่ถูกเขียนทับ */
    await env.DB.prepare(
      `INSERT INTO members
         (created_at, updated_at, email, name, nickname, card_line,
          class, era, era_th, titles, news, consent_at, source)
       VALUES (?1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?1, ?11)
       ON CONFLICT(email) DO UPDATE SET
         updated_at = ?1, name = ?3, nickname = ?4, card_line = ?5,
         class = ?6, era = ?7, era_th = ?8, titles = ?9, news = ?10`
    ).bind(now, row.email, row.name, row.nickname, row.card_line,
           row.class, row.era, row.era_th, row.titles, row.news, row.source).run();

    const saved = await env.DB.prepare(
      'SELECT id, member_no, created_at FROM members WHERE email = ?1'
    ).bind(email).first();

    /* คนใหม่ยังไม่มีเลขประจำตัว — ออกให้ตอนนี้ แล้วใช้เลขนี้ตลอดไป
       ถ้าสองคนสมัครพร้อมกันจนเลขชนกัน ให้ลองใหม่อีกรอบ */
    let no = saved && saved.member_no;
    for (let i = 0; saved && !no && i < 3; i++) {
      const want = await nextMemberNo(env.DB, saved.created_at || now);
      try {
        await env.DB.prepare('UPDATE members SET member_no = ?1 WHERE id = ?2')
          .bind(want, saved.id).run();
        no = want;
      } catch (e) { /* เลขชน — วนไปเอาเลขถัดไป */ }
    }
    return json({ ok: true, member_no: no || null });

  } catch (e) {
    return json({ ok: false, error: 'db',
                  message: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะครับ' }, 500);
  }
}

/* เปิดด้วยเบราว์เซอร์ตรง ๆ จะเจออันนี้ — ไม่บอกอะไรเกินจำเป็น */
export async function onRequestGet() {
  return json({ ok: false, error: 'method', message: 'ปลายทางนี้รับเฉพาะ POST' }, 405);
}
