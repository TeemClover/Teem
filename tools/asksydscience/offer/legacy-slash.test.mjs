import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const cfg=JSON.parse(readFileSync(new URL('../../../vercel.json',import.meta.url)));
test('legacy directory links ending in slash have explicit redirects on both hosts',()=>{
 const rules=cfg.redirects.filter(r=>r.source==='/asksydneyscience/offer/');
 assert.equal(rules.length,2);
 assert.equal(rules.find(r=>r.has?.some(h=>h.type==='host'&&h.value==='asksydscience.myclover.com'))?.destination,'/offer/');
 assert.equal(rules.find(r=>!r.has)?.destination,'/asksydscience/offer/');
 assert.ok(rules.every(r=>r.permanent===true));
});
