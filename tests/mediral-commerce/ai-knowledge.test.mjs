import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {knowledge,SYSTEM_PROMPT} from '../../api/_lib/mediral-commerce/ai-knowledge.js';
import {RETAIL} from '../../api/_lib/mediral-commerce/catalog.js';

const source=JSON.parse(readFileSync(new URL('../../mediral/data/details.json',import.meta.url),'utf8'));

test('AI knowledge includes all source ingredients in their original groups without invented benefits',()=>{
 const data=knowledge();
 assert.deepEqual(data.mediral.products.map(p=>p.sku),['CL','AC','BR','SU','PO']);
 for(const product of data.mediral.products){
  const original=source.products.find(p=>p.id===product.sku);
  assert.equal(product.ingredient_groups.length,original.ingredient_groups.length);
  for(const [groupIndex,group] of product.ingredient_groups.entries()){
   const originalGroup=original.ingredient_groups[groupIndex];
   assert.equal(group.title,originalGroup.title);
   assert.equal(group.summary,originalGroup.summary);
   assert.deepEqual(group.items.map(i=>i.name),originalGroup.items.map(i=>i.name));
   for(const [index,item] of group.items.entries()){
    const originalItem=originalGroup.items[index];
    assert.equal(item.benefit,originalItem.benefit||undefined);
    if(originalItem.benefit_scope)assert.equal(item.benefit_scope,originalItem.benefit_scope);
    if(originalItem.source_name&&originalItem.source_name!==item.name)assert.equal(item.source_name,originalItem.source_name);
    assert.equal(item.image,undefined);
   }
  }
 }
 // This source explicitly warns that the sunscreen groups contain overlap.
 assert.match(data.mediral.products.find(p=>p.sku==='SU').ingredient_note,/ไม่นับกลุ่มและพืชซ้ำ/);
});

test('catalog prices are authoritative and operational unknowns stay explicit',()=>{
 const data=knowledge();
 assert.equal(data.mediral.unit_price_thb,RETAIL.unit/100);
 assert.equal(data.mediral.set_price_thb,RETAIL.set/100);
 assert.equal(data.mediral.stock_confirmed,false);
 assert.equal(data.mediral.shipping_confirmed,false);
 assert.deepEqual(data.mediral.gifts,[]);
 assert.equal(data.ai.url,'https://www.myclover.com/ai-source/');
 assert.equal(data.absorb.approved_sales_facts,false);
 assert.equal(data.absorb.price,undefined);
 assert.equal(data.absorb.url,undefined);
 assert.match(data.absorb.rule,/ให้คนดูแลช่วยตอบ/);
});

test('AI knowledge is compact, independent across calls and excludes private or presentation payloads',()=>{
 const first=knowledge();
 assert.ok(JSON.stringify(first).length<24000);
 assert.ok(SYSTEM_PROMPT.length<6000);
 const encoded=JSON.stringify(first);
 assert.doesNotMatch(encoded,/owner-chat|exchange|account_number|BANK|bankNumber|base64|API_KEY|assets\//);
 first.mediral.products[0].ingredient_groups[0].items[0].name='corrupted';
 first.mediral.unit_price_thb=1;
 const second=knowledge();
 assert.equal(second.mediral.unit_price_thb,399);
 assert.equal(second.mediral.products[0].ingredient_groups[0].items[0].name,source.products[0].ingredient_groups[0].items[0].name);
});
