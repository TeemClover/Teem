// Run from any directory: node shelf/validate.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(readFileSync(join(root,'catalog.json'),'utf8'));
const readme=readFileSync(join(root,'README.md'),'utf8');
const sourceRoot=resolve(root,'source');
const ids=new Set(), paths=new Set();
const categories=new Set(catalog.categories.map(c=>c.id));
const collections=new Map((catalog.collections||[]).map(c=>[c.id,c]));
assert.equal(collections.size,(catalog.collections||[]).length,'Duplicate collection ID');
const recipeOrders=new Map();
for(const collection of collections.values()){
 assert(/^[a-z0-9-]+$/.test(collection.id)&&collection.title&&collection.description,'Invalid collection');
 recipeOrders.set(collection.id,[]);
}
const date=/^\d{4}-\d{2}-\d{2}$/;
assert.equal(catalog.schema_version,1);
assert.equal(catalog.source_root,'/shelf/source/');
assert(date.test(catalog.updated_at));
for(const item of catalog.sources){
 assert(!ids.has(item.id),'Duplicate ID: '+item.id);ids.add(item.id);
 assert(!paths.has(item.path),'Duplicate path: '+item.path);paths.add(item.path);
 assert(/^source\/[a-z0-9-]+\/[a-z0-9-]+\.md$/.test(item.path),'Unsafe path: '+item.path);
 const path=resolve(root,item.path);
 assert(!relative(sourceRoot,path).startsWith('..'));
 assert(existsSync(path),'Missing file: '+item.path);
 const text=readFileSync(path,'utf8');
 assert(text.length>100,'Empty source: '+item.id);
 assert(/^---\r?\n/.test(text),'Missing metadata: '+item.id);
 const front=text.split(/^---\s*$/m)[1];
 const value=key=>front.match(new RegExp('^'+key+':\\s*["\']?([^"\'\\r\\n]+)','m'))?.[1]?.trim();
 assert.equal(value('version'),item.version,'Version mismatch: '+item.id);
 assert.equal(value('updated_at')||value('compiled_at'),item.updated_at,'Date mismatch: '+item.id);
 for(const field of ['created_at','updated_at','added_to_shelf_at'])assert(date.test(item[field]),'Invalid date: '+field);
 assert(item.created_at<=item.updated_at&&item.created_at<=item.added_to_shelf_at,'Invalid chronology');
 assert(item.categories.length&&item.categories.every(c=>categories.has(c)),'Unknown category');
 assert(readme.includes('('+item.path+')'),'README missing source: '+item.id);
 for(const section of item.sections)assert(text.includes('\n'+section.heading),'Missing section: '+section.heading);
 for(const needed of ['description','status','status_label','notes'])assert(item[needed]);
 assert(Array.isArray(item.tags)&&Array.isArray(item.aliases));
 assert(!text.includes('sandbox:/mnt/data/'),'Nonportable sandbox link: '+item.id);
 if(item.recipe){
  const recipe=item.recipe;
  assert(collections.has(recipe.collection_id),'Unknown collection: '+item.id);
  assert(Number.isInteger(recipe.order)&&recipe.order>0,'Invalid recipe order: '+item.id);
  recipeOrders.get(recipe.collection_id).push(recipe.order);
  for(const field of ['stage','short_title','use_with'])assert(typeof recipe[field]==='string'&&recipe[field].trim(),'Missing label '+field+': '+item.id);
  for(const field of ['inputs','outputs','prerequisites','lessons'])assert(Array.isArray(recipe[field]),'Invalid recipe '+field);
  for(const field of ['inputs','outputs'])assert(recipe[field].length&&recipe[field].every(v=>typeof v==='string'&&v.trim()),'Missing '+field+': '+item.id);
  assert(recipe.lessons.length,'Missing lesson: '+item.id);
  for(const lesson of recipe.lessons){
   assert(lesson.label&&/^\/(?:classroom|course)\/(?:[a-z0-9-]+\.html)?(?:[?#][^\s\\]*)?$/.test(lesson.href),'Unsafe lesson link: '+item.id);
   const pathname=new URL(lesson.href,'https://myclover.test').pathname;
   assert(existsSync(resolve(root,'..','.'+pathname+(pathname.endsWith('/')?'index.html':''))),'Missing lesson file: '+lesson.href);
  }
  assert.equal(value('id'),item.id,'Recipe ID mismatch');
  assert.equal(value('status'),item.status,'Recipe status mismatch');
  for(const heading of ['วิธีใช้และขอบเขต','ทะเบียนแหล่งข้อมูล','เนื้อหาหลัก','เกณฑ์ตรวจและวิธีแก้เมื่อผิด','ข้อมูลรอยืนยัน','ประวัติเวอร์ชัน','คำสั่งส่งต่อ'])assert(text.includes('## '+heading),'Missing recipe section '+heading+': '+item.id);
 }
}
for(const [collection,orders] of recipeOrders){
 assert(orders.length,'Empty collection: '+collection);
 assert.deepEqual(orders.sort((a,b)=>a-b),Array.from({length:orders.length},(_,i)=>i+1),'Recipe sequence must be continuous: '+collection);
}
for(const item of catalog.sources.filter(item=>item.recipe)){
 assert(new Set(item.recipe.prerequisites).size===item.recipe.prerequisites.length,'Duplicate prerequisite');
 for(const id of item.recipe.prerequisites){
  const prerequisite=catalog.sources.find(source=>source.id===id);
  assert(prerequisite?.recipe,'Unknown prerequisite: '+id);
  assert(prerequisite.recipe.collection_id===item.recipe.collection_id&&prerequisite.recipe.order<item.recipe.order,'Prerequisite must come earlier: '+id);
 }
}
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
for(const path of walk(sourceRoot).filter(p=>p.endsWith('.md')&&!p.endsWith('/TEMPLATE.md'))){assert(paths.has(relative(root,path)),'Uncataloged source: '+path);}
for(const file of ['index.html','source/TEMPLATE.md','CHANGELOG.md'])assert(existsSync(join(root,file)),'Missing: '+file);
assert(existsSync(resolve(root,'../AGENTS.md')),'Missing repository routing guide');
console.log('PASS: '+catalog.sources.length+' sources; metadata, paths, categories, aliases, sections and README links checked.');
