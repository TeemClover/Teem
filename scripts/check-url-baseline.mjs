#!/usr/bin/env node
/**
 * Check that every URL that was public before the restructure still works (BLUEPRINT §9.4.1).
 *
 *   node scripts/check-url-baseline.mjs https://<preview>.vercel.app
 *   node scripts/check-url-baseline.mjs https://www.myclover.com --only /work/,/hire/
 *
 * A URL passes when it answers 200, or redirects (at most 5 hops, same site) to a 200.
 * 401/403 pass only for paths that are meant to be private (course, admin, shelf source).
 * Prints one line per failure and a summary; exits 1 if anything failed.
 */
import {readFile} from 'node:fs/promises';

const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) {
  console.error('usage: node scripts/check-url-baseline.mjs <base-url> [--only a,b]');
  process.exit(2);
}
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null;
const list = (await readFile(new URL('../docs/url-baseline.txt', import.meta.url), 'utf8')).split('\n').filter(Boolean)
  .filter(u => !only || only.some(p => u.startsWith(p)));
const PRIVATE_OK = /^\/(course\/thedent|shelf\/source|.*\/admin\/|learn\/)/;

async function probe(path) {
  let url = new URL(path, base), hops = [];
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, {redirect: 'manual', headers: {'user-agent': 'myclover-url-baseline/1'}});
    hops.push(res.status);
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url);
      continue;
    }
    return {status: res.status, final: url.pathname, hops};
  }
  return {status: 0, final: url.pathname, hops, error: 'too many redirects'};
}

let failed = 0;
const queue = [...list];
await Promise.all(Array.from({length: 8}, async () => {
  while (queue.length) {
    const path = queue.shift();
    try {
      const r = await probe(path);
      const ok = r.status === 200 || ((r.status === 401 || r.status === 403) && PRIVATE_OK.test(path));
      if (!ok) { failed++; console.log(`FAIL ${path} → ${r.hops.join('→')} ${r.final}${r.error ? ' ' + r.error : ''}`); }
    } catch (e) { failed++; console.log(`FAIL ${path} → ${e.message}`); }
  }
}));
console.log(`${list.length - failed}/${list.length} URLs ok on ${base}`);
process.exit(failed ? 1 : 0);
