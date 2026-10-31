import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as flow from '../bodymestory/flow.mjs';

// Execute the actual browser entrypoint with a tiny DOM surface; no network or SDK executes.
function browserHarness({ saved = false } = {}) {
  let stored = null;
  const events = {};
  const appendedScripts = [];
  const pixelCalls = [];
  const posts = [];
  const adsButtons = ['denied', 'granted'].map(value => ({ dataset: { adsChoice: value }, addEventListener: (_, fn) => { events[value] = fn; } }));
  const status = { textContent: '', classList: { remove() {}, add() {} } };
  const submit = { disabled: false, textContent: '' };
  const banner = { hidden: true, querySelector: () => ({ focus() {} }) };
  const form = { hidden: false, reportValidity: () => true, addEventListener: (_, fn) => { events.submit = fn; }, querySelector: selector => selector === '[type=submit]' ? submit : status };
  const download = { href: '' };
  const success = { hidden: true, querySelector: selector => selector === '[data-download]' ? download : ({ focus() {} }) };
  const document = {
    querySelectorAll(selector) { if (selector === '[data-ads-choice]') return adsButtons; return []; },
    querySelector(selector) { if (selector === '[data-consent-banner]') return banner; if (selector === '[data-lead-form]') return form; if (selector === '[data-lead-success]') return success; return null; },
    createElement: () => ({}), head: { append: script => { appendedScripts.push(script); } }
  };
  const window = { addEventListener: (name, fn) => { events[name] = fn; } };
  const sandbox = {
    ...flow, window, document,
    location: { hostname: 'www.myclover.com', pathname: '/bodymestory/7-days/', search: '', hash: '' }, history: { replaceState() {} },
    localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } },
    URLSearchParams, FormData: class { get(key) { return { email: 'reader@example.com', name: 'Reader', privacyAcknowledged: 'on', website: '' }[key] ?? null; } },
    fetch: async (url, options) => {
      if (url.includes('public=config')) return { ok: true, json: async () => ({ pixelId: '1055629253871262' }) };
      posts.push(JSON.parse(options.body));
      if (saved) return { ok: true, status: 201, json: async () => ({ ok: true, eventId: '777d476a-7d84-45ca-92a2-f34aa9aa67e0', downloadUrl: flow.DOWNLOAD_PATH }) };
      return { ok: false, status: 503, json: async () => ({ ok: false }) };
    }
  };
  const source = readFileSync(new URL('../bodymestory/app.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, '');
  vm.runInNewContext(source, sandbox, { filename: 'bodymestory/app.js' });
  return {
    events, posts, pixelCalls, appendedScripts, form, success, status, download,
    withdrawFromOtherTab() { stored = JSON.stringify({ version: flow.PRIVACY_VERSION, value: 'denied' }); events.storage({ key: flow.ADS_CONSENT_KEY }); },
    removeChoiceFromOtherTab() { stored = null; events.storage({ key: flow.ADS_CONSENT_KEY }); },
    finishSdk() { window.fbq.callMethod = (...args) => pixelCalls.push(args); appendedScripts[0].onload(); },
    queuedCalls: () => window.fbq?.queue || []
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('withdrawal in another tab stops actual entrypoint POST attribution and Lead readiness', async () => {
  const browser = browserHarness();
  assert.equal(browser.appendedScripts.length, 0);
  browser.events.granted(); await settle();
  browser.finishSdk(); await settle();
  assert.ok(browser.pixelCalls.some(call => call[0] === 'track' && call[1] === 'PageView'));
  browser.withdrawFromOtherTab();
  await browser.events.submit({ preventDefault() {} });
  assert.equal(browser.posts[0].adsConsent, false);
  assert.ok(browser.pixelCalls.some(call => call[0] === 'consent' && call[1] === 'revoke'));
  assert.equal(browser.pixelCalls.filter(call => call[0] === 'track' && call[1] === 'Lead').length, 0);
});

test('revoke before SDK load leaves no queued PageView or Lead to be sent later', async () => {
  const browser = browserHarness();
  browser.events.granted(); await settle();
  assert.equal(browser.appendedScripts.length, 1);
  assert.equal(browser.queuedCalls().length, 0);
  browser.withdrawFromOtherTab();
  browser.finishSdk(); await settle();
  assert.equal(browser.pixelCalls.length, 0);
  await browser.events.submit({ preventDefault() {} });
  assert.equal(browser.posts[0].adsConsent, false);
});

test('clearing storage in a second tab revokes an initialized Pixel', async () => {
  const browser = browserHarness();
  browser.events.granted(); await settle(); browser.finishSdk(); await settle();
  browser.removeChoiceFromOtherTab();
  assert.ok(browser.pixelCalls.some(call => call[0] === 'consent' && call[1] === 'revoke'));
  await browser.events.submit({ preventDefault() {} });
  assert.equal(browser.posts[0].adsConsent, false);
});

test('a failed persistence response keeps the form visible and never shows a download', async () => {
  const browser = browserHarness();
  await browser.events.submit({ preventDefault() {} });
  assert.equal(browser.form.hidden, false);
  assert.equal(browser.success.hidden, true);
  assert.equal(browser.download.href, '');
  assert.match(browser.status.textContent, /ยังบันทึกไม่สำเร็จ/);
});

test('a persisted success with ads denied still unlocks the actual download UI', async () => {
  const browser = browserHarness({ saved: true });
  browser.events.denied();
  await browser.events.submit({ preventDefault() {} });
  assert.equal(browser.form.hidden, true);
  assert.equal(browser.success.hidden, false);
  assert.equal(browser.download.href, flow.DOWNLOAD_PATH);
  assert.equal(browser.appendedScripts.length, 0);
  assert.equal(browser.pixelCalls.length, 0);
});
