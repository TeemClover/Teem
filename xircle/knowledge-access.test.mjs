import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./_shared/state.js', import.meta.url), 'utf8');

function visit(path, progress = {}, blockedStorage = false) {
  const redirects = [], writes = [], listeners = {};
  const url = new URL(path, 'https://www.myclover.com');
  const location = {
    href: url.href, origin: url.origin, pathname: url.pathname, search: url.search, hash: url.hash,
    replace: href => redirects.push(href)
  };
  const nav = { children: [], setAttribute() {}, appendChild(child) { this.children.push(child); } };
  const document = {
    documentElement: { classList: { toggle() {} } },
    querySelector: selector => selector === '.xp-nav' ? nav : null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ setAttribute() {} }),
    addEventListener: (type, fn) => { listeners[type] = fn; }
  };
  const storage = {
    getItem: key => key === 'xircle.local.v1' ? JSON.stringify(progress) : null,
    setItem: (key, value) => writes.push([key, value])
  };
  const window = { location, localStorage: storage, sessionStorage: storage };
  if (blockedStorage) for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(window, name, { get() { throw new Error('Storage blocked'); } });
  }
  runInNewContext(source, { window, document, location, URL, setTimeout() {}, history: { replaceState() {} } });
  function click(href) {
    let prevented = false;
    const link = { href: new URL(href, location.origin).href, hasAttribute: () => false };
    listeners.click({
      target: { closest: selector => selector === 'a[href]' ? link : null },
      preventDefault() { prevented = true; }, stopImmediatePropagation() {}
    });
    return prevented;
  }
  return { redirects, writes, click, nav, state: window.XState };
}

for (const path of ['/xircle/learn/', '/xircle/learn/topic/?t=xircle-habit-tracker', '/xircle/doc/', '/xircle/doc/app/sleep/', '/xircle/explore/']) {
  test(`optional knowledge opens for a fresh visitor: ${path}`, () => {
    const page = visit(path);
    assert.deepEqual(page.redirects, []);
    assert.deepEqual(page.writes, []);
    assert.equal(page.state.getLocal('journeyCompleted'), false);
    assert.equal(page.click('/xircle/learn/topic/?t=xircle-habit-tracker'), false);
    assert.equal(page.click('/xircle/doc/app/sleep/'), false);
    assert.equal(page.click('/xircle/explore/'), false);
    assert.equal(page.click('/xircle/#appointment'), false);
    assert.ok(page.nav.children.some(link => link.href === '/xircle/#appointment'));
  });
}

test('knowledge remains usable when storage is unavailable', () => {
  assert.deepEqual(visit('/xircle/learn/', {}, true).redirects, []);
});

test('existing partial progress is preserved and can return to the appointment', () => {
  const page = visit('/xircle/learn/', { firstDayCompletedV10: true, journeyCompleted: true });
  assert.deepEqual(page.redirects, []);
  assert.deepEqual(page.writes, []);
  assert.equal(page.state.getLocal('careIntroSeen'), false);
  assert.equal(page.click('/xircle/#appointment'), false);
});

test('unrelated legacy entry gates and prefix lookalikes stay guarded', () => {
  for (const path of ['/xircle/care/', '/xircle/opportunity/', '/xircle/routinex/', '/xircle/learned/', '/xircle/document/']) {
    assert.deepEqual(visit(path).redirects, ['/xircle/']);
  }
  const page = visit('/xircle/learn/');
  assert.equal(page.click('/xircle/opportunity/'), true);
});

test('existing invitation remains available without changing its progress', () => {
  const page = visit('/xircle/learn/', { xtyHandoff: { partyCode: '12345', receivedAt: Date.now() } });
  assert.deepEqual(page.redirects, []);
  assert.equal(page.state.partyJoinUrl(), 'https://teambook.me/join/?c=12345');
  assert.deepEqual(page.writes, []);
});
