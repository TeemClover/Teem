#!/usr/bin/env node
/**
 * Check what only a real deployment can prove (Vercel routing, headers, ignored files), for the pages
 * the restructure changed. The static test server and Cloudflare Pages cannot stand in for this.
 *
 *   node scripts/verify-deployment.mjs https://<deployment>            (preview or production)
 *   VERCEL_AUTOMATION_BYPASS_SECRET=… node scripts/verify-deployment.mjs https://<protected-preview>
 *
 * Vercel marks every preview deployment noindex by itself. On a *.vercel.app host the script therefore
 * checks that our own rule ("noindex, follow") is present on the brand/affiliate pages and absent from the
 * new pages; on the production host it also requires the new pages to carry no noindex at all.
 */
const base = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) { console.error('usage: node scripts/verify-deployment.mjs <base-url>'); process.exit(2); }
const preview = /\.vercel\.app$/.test(new URL(base).hostname);
const headers = {'user-agent': 'myclover-verify-deployment/1'};
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) Object.assign(headers, {'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET, 'x-vercel-set-bypass-cookie': 'true'});

const results = [];
const ok = (name, pass, detail = '') => results.push([pass ? 'ok' : 'FAIL', name, detail]);
const get = (path, redirect = 'manual') => fetch(base + path, {redirect, headers});
const robots = r => (r.headers.get('x-robots-tag') || '').toLowerCase();

// 0. reachable at all (a protected preview answers 401 to everything)
const home = await get('/');
if (home.status === 401 || home.status === 403) {
  console.error(`${base} answers ${home.status}: the deployment is protected. Set VERCEL_AUTOMATION_BYPASS_SECRET (Vercel → Settings → Deployment Protection → Protection Bypass for Automation).`);
  process.exit(3);
}

// 1. the new pages exist, are the new pages, and are indexable by our own rules
const homeHtml = await home.text();
ok('/ is the new homepage', home.status === 200 && homeHtml.includes('id="clover"') && homeHtml.includes('<link rel="canonical" href="https://www.myclover.com/">'), `status ${home.status}`);
for (const path of ['/', '/work/', '/work/house-3d/', '/work/classroom/', '/work/core7/', '/work/teambook/', '/hire/', '/walkthrough/', '/tour/']) {
  const r = path === '/' ? home : await get(path);
  const tag = robots(r);
  const indexable = preview ? !tag.includes('follow') : !tag.includes('noindex');
  ok(`${path} 200 and not noindex by our rules`, r.status === 200 && indexable, `status ${r.status}, x-robots-tag "${tag}"`);
}
const tour = await (await get('/tour/')).text();
ok('/tour/ has its own canonical', tour.includes('<link rel="canonical" href="https://www.myclover.com/tour/">'));

// 2. redirects that only vercel.json can do (E3: _redirects is ignored on Vercel)
for (const [from, to] of [['/home/', '/'], ['/home', '/'], ['/forge/ep0-my-own-machine/', '/forge/ep1-everyone-gets-to-play/'], ['/forge/ep6-ten-to-thousand/', '/forge/ep7-a-voice-that-went-further/'], ['/forge/ep10-the-tenth-step/', '/forge/original/']]) {
  const r = await get(from);
  const location = r.headers.get('location') ? new URL(r.headers.get('location'), base).pathname : '';
  ok(`${from} → ${to}`, [301, 308].includes(r.status) && location === to, `status ${r.status}, location "${location}"`);
}
const landed = await get('/forge/ep0-my-own-machine/', 'follow');
ok('old Forge link lands on a page', landed.status === 200, `status ${landed.status}`);

// 3. brand, client and affiliate folders are noindex,follow; the archived story too
for (const path of ['/mediral/', '/xircle/', '/xvisor/', '/guild/', '/hf/', '/hamburg/', '/routinex/absorb/', '/walkthrough/story/']) {
  const r = await get(path, 'follow');
  const tag = robots(r);
  ok(`${path} X-Robots-Tag noindex, follow`, tag.includes('noindex') && tag.includes('follow') && !tag.includes('nofollow'), `status ${r.status}, "${tag}"`);
}

// 4. every sitemap URL answers 200 on this deployment
const sitemap = await (await get('/sitemap.xml')).text();
const locs = [...sitemap.matchAll(/<loc>https:\/\/www\.myclover\.com([^<]*)<\/loc>/g)].map(m => m[1]);
const broken = [];
for (const path of locs) { const r = await get(path, 'follow'); if (r.status !== 200 || (preview ? robots(r).includes('follow') : robots(r).includes('noindex'))) broken.push(`${path} ${r.status} "${robots(r)}"`); }
ok(`sitemap: ${locs.length} URLs answer 200 and are not noindex by our rules`, locs.length >= 40 && !broken.length, broken.join('; '));
const llms = await (await get('/llms.txt')).text();
ok('/llms.txt is the new guide', llms.includes('fastwork.com/user/teem') && !/mediral/i.test(llms));

// 5. existing students keep their way in
for (const path of ['/learn/', '/classroom/', '/classroom/free-ai.html', '/assets/my-learning-entry.js']) {
  const r = await get(path, 'follow');
  ok(`${path} reachable`, r.status === 200, `status ${r.status}`);
}
const entry = await get('/api/learn?action=entry', 'follow');
const entryType = entry.headers.get('content-type') || '';
ok('/api/learn?action=entry answers JSON (the "ห้องเรียนของฉัน" check)', [200, 401].includes(entry.status) && entryType.includes('json'), `status ${entry.status}, ${entryType}`);

// 6. what ships and what does not
for (const [path, type] of [['/entry/entry.js', 'javascript'], ['/entry/data.json', 'json'], ['/assets/fonts/site/kanit-thai-600.woff2', 'font/woff2'], ['/work/media/house-3d-cover.webp', 'image/webp']]) {
  const r = await get(path);
  ok(`${path} served as ${type}`, r.status === 200 && (r.headers.get('content-type') || '').includes(type), `status ${r.status}, ${r.headers.get('content-type')}`);
}
for (const path of ['/entry/home.html', '/entry/MEDIA-BRIEFS.md', '/work/cases.json', '/hire/services.json', '/docs/INVENTORY.md']) {
  const r = await get(path);
  ok(`${path} not published`, r.status === 404, `status ${r.status}`);
}

for (const [state, name, detail] of results) console.log(`${state} · ${name}${state === 'FAIL' && detail ? ` · ${detail}` : ''}`);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} checks passed on ${base}${preview ? ' (preview: Vercel adds its own noindex)' : ''}`);
process.exit(failed ? 1 : 0);
