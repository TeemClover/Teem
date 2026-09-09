/** Real local HTTP routing proof; never follows the external /invite registration. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { startPreview } from './frontdoor-preview.mjs';

test('XIRCLE aliases use one static experience and preserve acquisition context', async t => {
  const server = await startPreview({ port: 0 });
  t.after(async () => { await server.close(); await rm(server.directory, { recursive: true, force: true }); });
  const canonical = await (await fetch(`${server.base}/xircle/`)).text();
  assert.match(canonical, /experience-v3\.js/);
  assert.match(canonical, /experience-v3\.css/);
  assert.doesNotMatch(canonical, /experience(?:-v[12])?\.(?:js|css)/);

  await t.test('case and slash variants finish in one redirect with the exact same page', async () => {
    for (const route of ['/Xircle', '/Xircle/', '/XIRCLE', '/XIRCLE/', '/xIrClE/', '/xircle']) {
      const query = '?entry=compass&focus=sleep&from=old%20link&tag=a&tag=b';
      const redirect = await fetch(`${server.base}${route}${query}`, { redirect: 'manual' });
      assert.equal(redirect.status, 307, route);
      assert.equal(redirect.headers.get('location'), `/xircle/${query}`, route);
      const response = await fetch(new URL(redirect.headers.get('location'), server.base), { redirect: 'manual' });
      assert.equal(response.status, 200, `${route} cannot loop`);
      assert.equal(await response.text(), canonical, route);
    }
    const direct = await fetch(`${server.base}/xircle/`, { redirect: 'manual' });
    assert.equal(direct.status, 200);
    assert.equal(direct.headers.get('location'), null);
  });

  await t.test('bookmarked document entrances canonicalize while files retain their types', async () => {
    for (const route of ['/xircle/start', '/Xircle/start', '/XIRCLE/routinex', '/xircle/care/party']) {
      const response = await fetch(`${server.base}${route}?entry=compass`, { redirect: 'manual' });
      assert.equal(response.status, 307, route);
      const expected = `${route.replace(/^\/xircle/i, '/xircle')}/?entry=compass`;
      assert.equal(response.headers.get('location'), expected, route);
      assert.equal((await fetch(new URL(expected, server.base), { redirect: 'manual' })).status, 200, route);
    }
    for (const [asset, type] of [
      ['experience-v3.js?v=proof', 'text/javascript'],
      ['experience-v3.css?v=proof', 'text/css'],
      ['_shared/typography.css', 'text/css'],
      ['assets/v3/hero-800.webp', 'image/webp'],
    ]) {
      const response = await fetch(`${server.base}/Xircle/${asset}`, { redirect: 'manual' });
      assert.equal(response.status, 307, asset);
      assert.equal(response.headers.get('location'), `/xircle/${asset}`);
      const canonicalAsset = await fetch(new URL(response.headers.get('location'), server.base), { redirect: 'manual' });
      assert.equal(canonicalAsset.status, 200, asset);
      assert.ok(canonicalAsset.headers.get('content-type').startsWith(type), asset);
    }
    assert.equal((await fetch(`${server.base}/xircle/not-a-real-page`)).status, 404);
    assert.equal((await fetch(`${server.base}/Xircle/not-a-real-page`)).status, 404);
  });

  await t.test('retired V1, V2 and neutral experience engines are unavailable', async () => {
    for(const name of ['experience','experience-v1','experience-v2']){
      for(const extension of ['js','css']){
        const asset=`${name}.${extension}`;
        assert.equal((await fetch(`${server.base}/xircle/${asset}`)).status,404,asset);
        assert.equal((await fetch(`${server.base}/Xircle/${asset}`)).status,404,`uppercase ${asset}`);
      }
    }
  });

  await t.test('invite resolves to the existing registration page without making an external request', async () => {
    const redirect = await fetch(`${server.base}/invite?from=xircle`, { redirect: 'manual' });
    assert.equal(redirect.status, 307);
    assert.equal(redirect.headers.get('location'), '/invite/?from=xircle');
    const response = await fetch(`${server.base}/invite/?from=xircle`, { redirect: 'manual' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.match(await response.text(), /https:\/\/register\.xircle\.health\//);
    assert.equal((await fetch(`${server.base}/frontdoor/`, { redirect: 'manual' })).status, 200);
  });
});

test('deployment aliases target a concrete file, not a case-only redirect loop', async () => {
  const root = new URL('../../', import.meta.url);
  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  const redirects = await readFile(new URL('_redirects', root), 'utf8');
  const generator = await readFile(new URL('tools/build.py', root), 'utf8');
  for (const source of ['/Xircle', '/Xircle/', '/XIRCLE', '/XIRCLE/']) {
    assert.deepEqual(config.rewrites.filter(rule => rule.source === source), [{ source, destination: '/xircle/index.html' }]);
    assert.equal(config.redirects.some(rule => rule.source === source), false);
    const line = `${source}${' '.repeat(41 - source.length)}/xircle/index.html  200`;
    assert.ok(redirects.includes(line), source);
    assert.ok(generator.includes(`'${line}'`), `${source}: generated source stays in sync`);
    // Whether a host matches case sensitively or not, the target cannot match again.
    assert.notEqual('/xircle/index.html'.toLowerCase(), source.toLowerCase());
  }
  assert.ok(config.redirects.some(rule => rule.source === '/invite' && rule.destination === '/invite/'));
  assert.ok(redirects.includes('/invite                                  /invite/  302'));
  assert.ok(generator.includes("'/invite                                  /invite/  302'"));
});
