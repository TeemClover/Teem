import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {RATE,preset,quote,summaryText,encodeState,decodeState} from '../../../asksydscience/offer/rates.mjs';
const cfg=JSON.parse(readFileSync(new URL('../../../vercel.json',import.meta.url)));
const host='asksydscience.myclover.com';
const onHost=r=>r.has?.some(x=>x.type==='host'&&x.value===host);
test('both paid care plans state 50% off without a second reduction',()=>{
 for(const [id,normal,special] of [['light',3000,1500],['grow',7000,3500]]){
  const c=RATE.care.find(x=>x.id===id);
  assert.equal(c.regularPrice,normal);assert.equal(c.price,special);assert.equal(c.discountPercent,50);
  assert.equal(c.price,c.regularPrice*(1-c.discountPercent/100));
  for(const months of [1,3,6,12]){
   const q=quote({...preset('b'),care:id,months});
   assert.equal(q.oneTime,29900);assert.equal(q.monthly,special);assert.equal(q.monthlyRegular,normal);
   assert.equal(q.budget,29900+special*months);assert.equal(q.monthlySaving,normal-special);
   assert.deepEqual(q.installments,[14950,8970,5980]);
  }
 }
});
test('free self care is not advertised as a discount',()=>{
 const q=quote(preset());assert.equal(q.monthlySaving,0);assert.equal(q.care.discountPercent,0);
 assert.ok(!summaryText(preset()).includes('ลด 0%'));assert.ok(!summaryText(preset()).includes('ราคาพิเศษ ลด'));
});
test('copied downloaded printed summary includes normal and special rate',()=>{
 const text=summaryText({...preset('b'),care:'light',months:3});
 for(const s of ['ราคาพิเศษ ลด 50% แล้ว','3,000 บาท/เดือน','1,500 บาท/เดือน','34,400','ไม่หักส่วนลดซ้ำ'])assert.ok(text.includes(s),s);
});
test('old selection URLs remain round-trip compatible with unchanged charged rates',()=>{
 const s={...preset('c'),care:'grow',months:12};assert.deepEqual(quote(decodeState(encodeState(s)).state),quote(s));
});
test('all document suffixes map inside the Sydney folder only on its hostname',()=>{
 for(const page of ['demo','offer','about','stories','kitchen','mindfulness','workshop','studio']){
  for(const suffix of ['', '/']){
   const r=cfg.rewrites.find(x=>x.source==='/'+page+suffix&&onHost(x));
   assert.equal(r?.destination,`/asksydscience/${page}/index.html`);
  }
 }
});
test('nested assets use a guarded host rewrite without double-prefixing APIs',()=>{
 const r=cfg.rewrites.find(x=>onHost(x)&&x.source.startsWith('/:path('));assert.ok(r);
 const matcher=new RegExp('^/'+r.source.slice('/:path('.length,-1)+'$');
 for(const s of ['/demo/store.mjs','/offer/rates.mjs','/assets/hero-home.webp','/new-room/deep/'])assert.ok(matcher.test(s),s);
 for(const s of ['/asksydscience/demo/store.mjs','/api/auth/login','/api','/_vercel/insights/script.js','/.well-known/test'])assert.ok(!matcher.test(s),s);
 assert.equal(r.destination,'/asksydscience/:path*');
});
test('legacy offer URLs redirect to the new location and no old source file remains',()=>{
 const main=cfg.redirects.find(r=>r.source==='/asksydneyscience/offer/:path*'&&!r.has);
 const sub=cfg.redirects.find(r=>r.source==='/asksydneyscience/offer/:path*'&&onHost(r));
 assert.equal(main.destination,'/asksydscience/offer/:path*');assert.equal(sub.destination,'/offer/:path*');
 for(const name of ['index.html','offer.mjs','offer.css','rates.mjs']){
  assert.ok(existsSync(new URL('../../../asksydscience/offer/'+name,import.meta.url)));
  assert.ok(!existsSync(new URL('../../../asksydneyscience/offer/'+name,import.meta.url)));
 }
});
test('subdomain deep routes retain noindex policy',()=>{
 const r=cfg.headers.find(r=>r.source==='/:path*'&&onHost(r));
 assert.ok(r.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex')));
});
