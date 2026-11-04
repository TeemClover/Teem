import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('both canonical candidate entry paths receive the same private security headers as child assets',()=>{
 const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url)));
 const reference=config.headers.find(r=>r.source==='/candidate/:path*');
 for(const path of ['/candidate','/candidate/']){
  const rule=config.headers.find(r=>r.source===path);
  assert.deepEqual(rule.headers,reference.headers);
  const headers=Object.fromEntries(rule.headers.map(h=>[h.key,h.value]));
  assert.match(headers['Cache-Control'],/no-store/);
  assert.match(headers['X-Robots-Tag'],/noindex/);
  assert.equal(headers['Referrer-Policy'],'no-referrer');
  assert.match(headers['Content-Security-Policy'],/frame-ancestors 'self'/);
 }
});
