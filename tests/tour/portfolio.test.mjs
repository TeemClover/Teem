/** Published work is readable company/profile content; gallery behavior is verified in Chromium. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../tour/index.html',import.meta.url),'utf8');

test('the professional identity and company reference are explicit without exposing private source',()=>{
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 assert.match(title,/CAIO/);assert.match(title,/Clover X/);
 assert.match(html,/<div class="tour-profile">[\s\S]*?CAIO[\s\S]*?Clover X<\/strong>/);
 assert.doesNotMatch(html,/github\.com\/TomThanet\/cloverx-office|TomThanet\/cloverx-office/);
 assert.match(html,/<dialog[^>]*id="workbench"[^>]*aria-labelledby="workbench-title"/);
 assert.match(html,/id="workbench-count"[^>]*role="status"[^>]*aria-live="polite"/);
});

test('all eight selected works keep distinct truthful type badges and real detail/play destinations',()=>{
 const cards=[...html.matchAll(/<article\b([^>]*data-work-card[^>]*)>([\s\S]*?)<\/article>/g)];
 assert.equal(cards.length,8);
 const titles=[];
 for(const [,attributes,body] of cards){
  const categories=attributes.match(/data-work-category="([^"]+)"/)?.[1].split(/\s+/)||[];
  assert.ok(categories.length&&categories.every(v=>['cloverx','systems','learning'].includes(v)),'bounded filter categories');
  const title=body.match(/<h3>([^<]+)<\/h3>/)?.[1];assert.ok(title);titles.push(title);
  assert.match(body,/<small>[^<]{3,}<\/small>/,title+' needs a visible work-type badge');
  assert.match(body,/<a[^>]*href="(?:\/|https:\/\/)[^"]+"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,title+' has an actionable destination');
  assert.doesNotMatch(body,/TomThanet\/cloverx-office/);
 }
 assert.equal(new Set(titles).size,8);
 const first=cards[0][2];assert.match(first,/<h3>XIRCLE<\/h3>/);assert.match(first,/href="\/xircle\/"/);
 for(const name of ['TeamBook','House 3D'])assert.match(cards.find(card=>card[2].includes(`<h3>${name}</h3>`))[2],/<small>โครงงานส่วนตัว<\/small>/);
});
