import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {couponHTML} from '../../mediral/js/coupon.js';
const {order:{coupon}}=JSON.parse(readFileSync(new URL('../../mediral/data/routine.json',import.meta.url),'utf8'));
test('LINE coupon is 400 per piece and valid through October 15 in Bangkok',()=>{
 const shown=couponHTML(coupon,Date.parse('2026-10-15T23:59:59+07:00'));
 assert.match(shown,/500 บาท/); assert.match(shown,/ลด 20%/); assert.match(shown,/<strong>400<\/strong>/); assert.match(shown,/ใช้คูปองอัตโนมัติ/);
 for(const time of ['2026-09-30T23:59:59+07:00','2026-10-16T00:00:00+07:00']){
  const text=couponHTML(coupon,Date.parse(time));assert.doesNotMatch(text,/ลด|400|คูปอง/);assert.match(text,/500 บาท/);
 }
});
