import test from 'node:test';
import assert from 'node:assert/strict';

let instance = 0;
async function harness(t, fetcher) {
  const saved = new Map(), listeners = {}, events = [], storage = new Map();
  const toast = { className: '', textContent: '', classList: { add() {}, remove() {} }, setAttribute() {} };
  const document = { readyState: 'loading', body: { style: {}, appendChild() {} }, head: { appendChild() {} },
    querySelector: selector => selector === '.mc-account-toast' ? toast : null, createElement: () => ({ dataset: {} }),
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); } };
  const window = { addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, dispatchEvent(event) { events.push(event); } };
  for (const [name, value] of Object.entries({ document, window, location: { pathname: '/', search: '', hash: '' }, fetch: fetcher, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, setTimeout: () => 1, clearTimeout() {} })) {
    saved.set(name, globalThis[name]); globalThis[name] = value;
  }
  t.after(() => { for (const [name, value] of saved) { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; } });
  const module = await import(`../../assets/account.js?auth-client-test=${++instance}`);
  return { module, window, events, listeners, storage, toast };
}
const account = { id: 'fixture-member', displayName: 'Fixture', emailVerified: true };
const ok = body => ({ ok: true, status: 200, json: async () => body });
const pending = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('failed logout retains the actual account state and offers a retry', async t => {
  const h = await harness(t, async url => { if (url.endsWith('/logout')) throw new Error('offline'); return ok({ ok: true, user: account }); });
  await h.module.refreshSession(); assert.equal(h.window.MC_ACCOUNT.user.id, account.id);
  assert.equal(await h.module.logout(), false);
  assert.equal(h.window.MC_ACCOUNT.user.id, account.id);
  assert.match(h.toast.textContent, /ยังออกจากระบบไม่สำเร็จ/);
  assert.equal(h.storage.has('mc_account_session_event'), false);
});

test('successful server logout clears identity and late session checks cannot restore it', async t => {
  let delayed = false; const old = pending();
  const h = await harness(t, async url => url.endsWith('/logout') ? ok({ ok: true }) : delayed ? old.promise : ok({ ok: true, user: account }));
  await h.module.refreshSession(); delayed = true;
  const refresh = h.module.refreshSession(); assert.equal(await h.module.logout(), true);
  old.resolve(ok({ ok: true, user: account })); await refresh;
  assert.equal(h.window.MC_ACCOUNT.user, null);
  assert.ok(h.storage.has('mc_account_session_event'));
  assert.equal(h.events.at(-1).detail.user, null);
});

test('provider discovery failure does not erase a valid remembered session at boot', async t => {
  const h = await harness(t, async url => { if (url.endsWith('/providers')) throw new Error('unavailable'); return ok({ ok: true, user: account }); });
  h.storage.set('mc_account_last_sync', new Date().toISOString());
  await h.listeners.DOMContentLoaded[0]();
  assert.equal(h.window.MC_ACCOUNT.user.id, account.id);
  assert.equal(h.events.find(event => event.type === 'mc:account-ready').detail.user.id, account.id);
});

test('cross-tab signals and focus recheck the server, never trust a storage login flag', async t => {
  let authenticated = true;
  const h = await harness(t, async url => ok(url.endsWith('/providers') ? { ok: true, providers: {} } : { ok: true, user: authenticated ? account : null }));
  h.storage.set('mc_account_last_sync', new Date().toISOString()); await h.listeners.DOMContentLoaded[0]();
  authenticated = false;
  await h.listeners.focus[0](); assert.equal(h.window.MC_ACCOUNT.user, null);
  h.listeners.storage[0]({ key: 'mc_account_session_event', newValue: 'logged-in:true' });
  await h.module.refreshSession(); assert.equal(h.window.MC_ACCOUNT.user, null);
});
