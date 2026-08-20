const ACCESS_HASH = 'efad137e1f9224a51687fb9c12ee5a226a5f0cbb140f4d41fd54f37692f2fe9c';
const COOKIE_NAME = 'empire_access';
const PROTECTED = ['/command', '/keen', '/captures'];

async function digest(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

function protectedPath(pathname) {
  return PROTECTED.some(prefix => pathname === prefix || pathname === `${prefix}/` || pathname.startsWith(`${prefix}/`));
}

function gatePage(pathname, message = '') {
  const safePath = pathname.startsWith('/') ? pathname : '/command/';
  const error = message ? `<p class="error">${message}</p>` : '<p class="error">&nbsp;</p>';
  return new Response(`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>myClover Empire · Private Backoffice</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 15%,rgba(216,180,94,.14),transparent 32%),#090b10;color:#f4f0e6;font-family:Inter,system-ui,-apple-system,"Noto Sans Thai",sans-serif}.card{width:min(430px,100%);background:#11151d;border:1px solid #343b49;border-radius:24px;padding:28px;box-shadow:0 30px 90px rgba(0,0,0,.55)}.mark{width:64px;height:64px;border:1px solid #9c7931;border-radius:16px;display:grid;place-items:center;color:#d8b45e;font-weight:950}.eyebrow{color:#d8b45e;font-size:10px;letter-spacing:.18em;font-weight:900;margin:18px 0 7px}h1{font-size:30px;margin:0 0 8px}p{color:#9da6b5;font-size:13px;line-height:1.55;margin:0}form{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:20px}input{min-width:0;background:#090d13;border:1px solid #343c49;color:white;border-radius:12px;padding:13px}button{border:0;border-radius:12px;background:linear-gradient(135deg,#d8b45e,#a67e2e);color:#171207;font-weight:900;padding:0 18px}.error{min-height:20px;color:#ef9992;margin-top:9px;font-size:11px}@media(max-width:520px){form{grid-template-columns:1fr}button{min-height:46px}}</style></head><body><main class="card"><div class="mark">C&C</div><p class="eyebrow">PRIVATE BACKOFFICE</p><h1>Empire Command Center</h1><p>พื้นที่นี้เป็นหลังบ้านของ myClover</p><form method="post" action="${safePath}"><input name="code" type="password" autocomplete="current-password" placeholder="รหัสผ่าน" required autofocus><button type="submit">COMMAND</button></form>${error}</main></body></html>`, { status: message ? 401 : 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow, noarchive' } });
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  if (!protectedPath(url.pathname)) return next();

  if (cookieValue(request, COOKIE_NAME) === ACCESS_HASH) {
    const response = await next();
    const out = new Response(response.body, response);
    out.headers.set('cache-control', 'no-store, max-age=0');
    out.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
    return out;
  }

  if (request.method === 'POST') {
    try {
      const form = await request.formData();
      if (await digest(form.get('code')) === ACCESS_HASH) {
        return new Response(null, { status: 303, headers: { location: url.pathname + url.search, 'set-cookie': `${COOKIE_NAME}=${ACCESS_HASH}; Path=/; Max-Age=43200; SameSite=Strict; Secure; HttpOnly`, 'cache-control': 'no-store, max-age=0', 'x-robots-tag': 'noindex, nofollow, noarchive' } });
      }
    } catch (_) {}
    return gatePage(url.pathname, 'รหัสไม่ถูกต้อง');
  }

  return gatePage(url.pathname);
}
