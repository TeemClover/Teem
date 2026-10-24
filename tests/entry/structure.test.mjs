/** Site structure after the restructure (BLUEPRINT v3.0 §2, §10, §12 F1). */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {buildSitemap, SITEMAP_PATHS, vercelMatch} from '../../tools/build-sitemap.mjs';

const root = new URL('../../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const exists = p => stat(new URL(p, root)).then(() => true, () => false);

test('sitemap.xml is generated, and every URL in it is a real, indexable, self-canonical page', async () => {
  const strip = s => s.replace(/<lastmod>[^<]*<\/lastmod>/g, '');
  assert.equal(strip(await read('sitemap.xml')), strip(await buildSitemap()), 'run node tools/build-sitemap.mjs');
  for (const p of ['/', '/work/', '/hire/', '/walkthrough/', '/tour/', '/resume/', '/meet/', '/courses/']) assert.ok(SITEMAP_PATHS.includes(p), p);
  for (const cut of ['/home/', '/xircle/', '/routinex/absorb/', '/compass/', '/frontdoor/', '/hall.html', '/first-class/', '/guild/', '/hf/', '/ai-career/', '/fitness/']) assert.ok(!SITEMAP_PATHS.includes(cut), cut);
  // client work is searchable (owner decision 2026-10-24)
  for (const client of ['/mediral/', '/hamburg/', '/homechew/', '/xvisor/', '/airova/']) assert.ok(SITEMAP_PATHS.includes(client), client);
});

test('vercel.json carries the redirects Vercel actually needs (E3) and sends /home/ to /', async () => {
  const {redirects, headers} = JSON.parse(await read('vercel.json'));
  const find = src => redirects.find(r => r.source === src && !r.has);
  assert.equal(find('/home/')?.destination, '/'); assert.equal(find('/home/')?.permanent, true);
  // every old Forge episode alias in the legacy _redirects whose folder is gone must work on Vercel
  const legacy = (await read('_redirects')).split('\n').map(l => l.trim().split(/\s+/)).filter(([s, , code]) => s?.startsWith('/forge/') && !s.includes('*') && code === '301');
  assert.ok(legacy.length >= 10);
  for (const [source, destination] of legacy) {
    if (await exists(source.slice(1) + 'index.html')) continue;
    assert.equal(find(source)?.destination, destination, source);
  }
  const robots = p => headers.filter(h => !h.has && vercelMatch(h.source, p)).flatMap(h => h.headers).filter(x => x.key === 'X-Robots-Tag').map(x => x.value).pop() || '';
  // the page URL itself ends in "/": Vercel matches it strictly, so each folder needs a rule that covers "/<dir>/"
  for (const p of ['/xircle/', '/routinex/', '/routinex/absorb/', '/guild/', '/fitness/', '/clover20/', '/ai-career/', '/hf/', '/walkthrough/story/', '/xircle/assets/x.webp']) assert.equal(robots(p), 'noindex, follow', p);
  for (const p of ['/mediral/', '/hamburg/', '/xvisor/', '/homechew/', '/airova/', '/work/', '/showcase/', '/']) assert.doesNotMatch(robots(p), /noindex/, `${p} stays searchable`);
  assert.equal(vercelMatch('/x/:path*', '/x/'), false, 'strict matching, as on Vercel');
});

test('llms.txt is short and only about identity, hiring, published work, free lessons and contact', async () => {
  const llms = await read('llms.txt');
  const links = JSON.parse(await read('assets/site-links.json'));
  assert.ok(llms.includes(links.fastwork.profile));
  for (const h of ['## Who', '## Hire', '## Work', '## Learn', '## Contact']) assert.ok(llms.includes(h), h);
  // client work is listed (owner decision 2026-10-24); unrelated brand pages and affiliate wording stay out
  assert.doesNotMatch(llms, /XIRCLE|RoutineX|affiliate/i);
  for (const name of ['Mediral', 'Hamburg Food Fair', 'Homechew', 'X-VISOR', 'Airova']) assert.ok(llms.includes(name), name);
  assert.ok(llms.length < 6000, 'a guide, not a dump');
});
