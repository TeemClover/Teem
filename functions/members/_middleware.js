const REALM = 'myClover Members';

function safeEqual(a, b) {
  const x = String(a || ''), y = String(b || '');
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function ask(message) {
  return new Response(message, { status: 401, headers: {
    'www-authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store',
  } });
}

export async function onRequest({ request, env, next }) {
  const password = env.MEMBER_ADMIN_PASSWORD || env.STAT_PASSWORD;
  const wantedUser = env.MEMBER_ADMIN_USER || env.STAT_USER || 'teem';
  if (!password) return new Response(
    'หน้าสมาชิกยังไม่ได้ตั้งรหัส\n\nตั้ง MEMBER_ADMIN_PASSWORD ใน Cloudflare Pages\nหรือใช้ STAT_PASSWORD เดิมร่วมกันได้\n',
    { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } },
  );
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return ask('ต้องใส่รหัสเจ้าของบ้านก่อน');
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch { return ask('อ่านรหัสไม่ได้'); }
  const split = decoded.indexOf(':');
  const user = split < 0 ? decoded : decoded.slice(0, split);
  const pass = split < 0 ? '' : decoded.slice(split + 1);
  if (!(safeEqual(user, wantedUser) && safeEqual(pass, password))) return ask('รหัสผ่านไม่ถูกต้อง');
  const response = await next();
  const out = new Response(response.body, response);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  return out;
}
