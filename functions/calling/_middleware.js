/* Private preview gate for /calling/* on Cloudflare Pages.
   The static page also contains a client-side fallback for hosts that do not run Pages Functions.
   Password comparison uses a SHA-256 digest so the plain access code is not stored in source. */

const ACCESS_HASH = 'efad137e1f9224a51687fb9c12ee5a226a5f0cbb140f4d41fd54f37692f2fe9c';
const COOKIE_NAME = 'calling_access';

async function digest(value) {
  const bytes = new TextEncoder().encode(String(value || '').trim());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

function gatePage(message = '') {
  const safeMessage = message ? '<p class="error">' + message + '</p>' : '<p class="error">&nbsp;</p>';
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="theme-color" content="#05070a">
<title>Private HALO Preview</title>
<style>
*{box-sizing:border-box}html,body{min-height:100%;margin:0}body{display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 20%,rgba(116,215,255,.14),transparent 30%),#05070a;color:#f4f7fa;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{width:min(460px,100%);padding:32px;border:1px solid rgba(255,255,255,.11);border-radius:25px;background:#0b1117;box-shadow:0 30px 90px rgba(0,0,0,.52);text-align:center}.mark{width:74px;height:74px;margin:auto;border:2px solid #8d989f;border-radius:50%;display:grid;place-items:center;box-shadow:inset 0 0 0 7px #1a2228}.mark:after{content:"";width:30px;height:30px;border:1px solid #74d7ff;border-radius:50%;box-shadow:0 0 24px rgba(116,215,255,.5)}h1{margin:19px 0 6px;font-size:1.55rem;letter-spacing:-.03em}p{margin:0;color:#84929d;font-size:.83rem;line-height:1.55}form{display:flex;gap:8px;margin-top:21px}input{min-width:0;flex:1;padding:13px 14px;border:1px solid rgba(255,255,255,.11);border-radius:12px;outline:0;background:#05090d;color:#fff;font:inherit}input:focus{border-color:rgba(116,215,255,.55)}button{padding:0 18px;border:0;border-radius:12px;background:#74d7ff;color:#04131a;font:900 .84rem/1 system-ui;cursor:pointer}.error{min-height:22px;margin-top:9px;color:#ff9b83;font-size:.72rem}.micro{margin-top:16px;color:#596773;font-size:.66rem}@media(max-width:520px){form{flex-direction:column}button{min-height:46px}}
</style>
</head>
<body><main class="card"><div class="mark"></div><h1>Private campaign preview</h1><p>This concept is shared privately with the product creator.</p><form method="post" action="/calling/"><input name="code" type="password" autocomplete="current-password" placeholder="Access code" autofocus required><button type="submit">Enter</button></form>${safeMessage}<p class="micro">HALO · VÖLUND CRAFT · private positioning concept</p></main></body></html>`, {
    status: message ? 401 : 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

export async function onRequest(context) {
  const { request, next } = context;
  const current = cookieValue(request, COOKIE_NAME);
  if (current === ACCESS_HASH) {
    const response = await next();
    const out = new Response(response.body, response);
    out.headers.set('cache-control', 'no-store, max-age=0');
    out.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
    return out;
  }

  if (request.method === 'POST') {
    try {
      const form = await request.formData();
      const submitted = await digest(form.get('code'));
      if (submitted === ACCESS_HASH) {
        return new Response(null, {
          status: 303,
          headers: {
            location: '/calling/',
            'set-cookie': `${COOKIE_NAME}=${ACCESS_HASH}; Path=/calling; Max-Age=604800; SameSite=Lax; Secure`,
            'cache-control': 'no-store, max-age=0',
            'x-robots-tag': 'noindex, nofollow, noarchive',
          },
        });
      }
    } catch (_) {}
    return gatePage('Access code is not correct.');
  }

  return gatePage();
}
