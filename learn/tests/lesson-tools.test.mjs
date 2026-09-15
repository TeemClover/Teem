import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLessonTools, filterToolPrompts, fillToolPrompt, renderLessonTools } from '../assets/lesson-tools.js';

class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.text='';this.className='';}
  set textContent(value){this.text=String(value);this.children=[];}get textContent(){return this.text+this.children.map(child=>child.textContent||'').join('');}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}replaceChildren(...nodes){this.children=[];this.text='';this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}async fire(name){for(const callback of this.listeners[name]||[])await callback({target:this,currentTarget:this});}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}focus(){this.focused=true;}select(){this.selected=true;}
}
const one={id:'sample',title:'ร่างข้อความ',category:'งาน',description:'เตรียมข้อความจากข้อมูลจริง',body:'ถึง [ผู้รับ]\nเรื่อง [เรื่อง]\nเก็บ [ยังไม่ทราบ] ไว้',
  keywords:['email','อีเมล'],fields:[{key:'ผู้รับ',label:'ส่งถึงใคร',placeholder:'ชื่อผู้รับ'},{key:'เรื่อง',label:'หัวข้อ',multiline:true}],tips:['ตรวจข้อมูลก่อนใช้']};
const tools=[{kind:'prompt-library',id:'library',title:'คลังสูตร',description:'เลือกแล้วปรับ',prompts:[one,{id:'second',title:'ภาพประกอบ',category:'สร้างสรรค์',body:'ภาพสำหรับ [งาน]',keywords:['image']}]}];
function setup(data=tools,options={}) {
  globalThis.document={createElement:tag=>new Element(tag)};
  const container=new Element(),control=renderLessonTools(container,data,options);
  const find=(name,value)=>container.all().find(node=>name==='class'?node.className.split(' ').includes(value):name==='text'?node.tagName==='BUTTON'&&node.textContent===value:node.getAttribute(name)===value);
  const choice=id=>container.all().find(node=>node.tagName==='BUTTON'&&node.dataset.promptId===id);
  return {container,control,find,choice};
}
const settle=()=>new Promise(setImmediate);

test('tool normalization accepts only supported bounded shapes and never truncates prompt bodies',()=>{
  assert.deepEqual(normalizeLessonTools(null),[]);assert.deepEqual(normalizeLessonTools([{...tools[0],kind:'iframe'}]),[]);
  assert.deepEqual(normalizeLessonTools([{...tools[0],prompts:[{...one,body:'x'.repeat(100001)}]}]),[]);
  const exact='บรรทัดหนึ่ง\n```\n<img src=x onerror=alert(1)>\n[ค่า]';
  const result=normalizeLessonTools([{...tools[0],prompts:[{...one,body:exact},one]}]);
  assert.equal(result[0].prompts.length,1);assert.equal(result[0].prompts[0].body,exact);
  assert.deepEqual(normalizeLessonTools([{...tools[0],prompts:[{...one,fields:[...one.fields,one.fields[0]]}]}]),[]);
});
test('category and Thai/English keyword searches combine without searching hidden private prompt bodies',()=>{
  const prompts=normalizeLessonTools(tools)[0].prompts;
  assert.deepEqual(filterToolPrompts(prompts,'อีเมล').map(prompt=>prompt.id),['sample']);
  assert.deepEqual(filterToolPrompts(prompts,'EMAIL','งาน').map(prompt=>prompt.id),['sample']);
  assert.deepEqual(filterToolPrompts(prompts,'email','สร้างสรรค์'),[]);
  assert.equal(filterToolPrompts(prompts,'ยังไม่ทราบ').length,0);
  assert.equal(filterToolPrompts(prompts,'','สร้างสรรค์')[0].id,'second');
});
test('field filling preserves exact values, missing placeholders and nonrecursive literal input',()=>{
  assert.equal(fillToolPrompt('[a] / [b] / [a]',new Map([['a','$& [b]'],['b','  ']])),'$& [b] / [b] / $& [b]');
  assert.equal(fillToolPrompt('[toString] [__proto__] [x]',{x:'ครบ'}),'[toString] [__proto__] ครบ');
});
test('three prompt cards display all choices and copy their exact authorized text without raw HTML',async()=>{
  const prompts=Array.from({length:3},(_,index)=>({id:'card-'+index,title:'ทางเลือก '+index,body:'คำสั่ง '+index+'\n<script>no()</script>\n```'}));let copied;
  const d=setup([{kind:'prompt-cards',id:'cards',title:'เลือกวัตถุดิบ',prompts}],{copyText:async value=>{copied=value;}});
  assert.equal(d.container.hidden,false);assert.equal(d.container.all().filter(node=>node.tagName==='ARTICLE').length,3);
  assert.equal(d.container.all().filter(node=>node.tagName==='SCRIPT').length,0);
  const fields=d.container.all().filter(node=>node.tagName==='TEXTAREA');assert.equal(fields[0].readOnly,true);assert.equal(fields[2].value,prompts[2].body);
  const buttons=d.container.all().filter(node=>node.tagName==='BUTTON');await buttons[2].fire('click');await settle();assert.equal(copied,prompts[2].body);
});
test('all44 recipes remain reachable through search, category filtering and the empty-state reset',async()=>{
  const prompts=Array.from({length:44},(_,index)=>({...one,id:'p'+index,title:'สูตร '+index,category:index%2?'ธุรกิจ':'งาน',keywords:['recipe-'+index]}));
  const d=setup([{...tools[0],prompts}]);assert.equal(d.container.all().filter(node=>node.dataset.promptId&&node.tagName==='BUTTON').length,44);
  const search=d.find('aria-label','ค้นหาสูตร'),category=d.find('aria-label','หมวดงาน');
  search.value='recipe-43';await search.fire('input');assert.equal(d.find('class','lt-count').textContent,'พบ 1 จาก 44 สูตร');assert.ok(d.choice('p43'));
  category.value='งาน';await category.fire('change');assert.equal(d.find('class','lt-count').textContent,'พบ 0 จาก 44 สูตร');
  await d.find('text','แสดงทุกสูตร').fire('click');assert.equal(search.value,'');assert.equal(category.value,'');assert.equal(d.find('class','lt-count').textContent,'พบ 44 จาก 44 สูตร');
});
test('selected recipe fields update an editable prompt and copy the revised exact text',async()=>{
  let copied;const d=setup(tools,{copyText:async value=>{copied=value;}});await d.choice('sample').fire('click');
  assert.equal(d.choice('sample').getAttribute('aria-pressed'),'true');
  const recipient=d.find('aria-label','ส่งถึงใคร'),topic=d.find('aria-label','หัวข้อ');recipient.value='ทีมของฉัน';await recipient.fire('input');topic.value='งานรอบใหม่';await topic.fire('input');
  const output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');assert.equal(output.value,'ถึง ทีมของฉัน\nเรื่อง งานรอบใหม่\nเก็บ [ยังไม่ทราบ] ไว้');
  output.value+='\nใช้ภาษาของฉัน';await output.fire('input');await d.find('text','คัดลอก Prompt ที่ปรับแล้ว').fire('click');await settle();assert.equal(copied,output.value);
});
test('manual edits survive field changes and switching recipes until explicit rebuild or reset',async()=>{
  const d=setup();await d.choice('sample').fire('click');let output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');
  output.value='ข้อความที่ปรับเอง';await output.fire('input');
  const recipient=d.find('aria-label','ส่งถึงใคร');recipient.value='ลูกค้า';await recipient.fire('input');assert.equal(output.value,'ข้อความที่ปรับเอง');
  assert.equal(d.find('text','ประกอบจากช่องกรอก').hidden,false);
  await d.choice('second').fire('click');await d.choice('sample').fire('click');output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');assert.equal(output.value,'ข้อความที่ปรับเอง');assert.equal(d.find('aria-label','ส่งถึงใคร').value,'ลูกค้า');assert.equal(d.find('text','ประกอบจากช่องกรอก').hidden,false);
  const topic=d.find('aria-label','หัวข้อ');topic.value='ประเด็น';await topic.fire('input');await d.find('text','ประกอบจากช่องกรอก').fire('click');assert.match(output.value,/ถึง ลูกค้า\nเรื่อง ประเด็น/);
  await d.find('text','กลับสูตรต้นฉบับ').fire('click');assert.equal(output.value,one.body);assert.equal(d.find('aria-label','ส่งถึงใคร').value,'');
});
test('clipboard failure selects the visible full prompt and empty edits cannot claim successful copy',async()=>{
  let attempts=0;const d=setup(tools,{copyText:async()=>{attempts++;throw Error('clipboard denied');}});await d.choice('sample').fire('click');
  const output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');await d.find('text','คัดลอก Prompt ที่ปรับแล้ว').fire('click');await settle();
  assert.equal(output.focused,true);assert.equal(output.selected,true);assert.match(d.container.textContent,/เลือกข้อความไว้ให้แล้ว/);
  output.value='';await output.fire('input');await d.find('text','คัดลอก Prompt ที่ปรับแล้ว').fire('click');await settle();assert.equal(attempts,1);assert.match(d.container.textContent,/Prompt ยังว่างอยู่/);
});
test('destroy clears paid tools and drafts, ignores late clipboard responses and blocks detached controls',async()=>{
  let resolve,copies=0;const d=setup(tools,{copyText:()=>{copies++;return new Promise(done=>{resolve=done;});}});await d.choice('sample').fire('click');
  const copy=d.find('text','คัดลอก Prompt ที่ปรับแล้ว');await copy.fire('click');assert.equal(copies,1);d.control.destroy();assert.equal(d.container.hidden,true);assert.equal(d.container.children.length,0);
  resolve();await settle();assert.equal(d.container.children.length,0);await copy.fire('click');assert.equal(copies,1);d.control.destroy();
  const fresh=setup();await fresh.choice('sample').fire('click');assert.equal(fresh.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ').value,one.body);
});
test('the public component contains no dataset, remote calls, browser persistence or HTML execution',async()=>{
  const [js,css]=await Promise.all(['../assets/lesson-tools.js','../assets/lesson-tools.css'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
  assert.doesNotMatch(js,/\bfetch\s*\(|localStorage|sessionStorage|innerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|\/classroom\//);
  assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/font-size:16px/);assert.match(css,/min-height:46px/);
  const empty=setup([]);assert.equal(empty.container.hidden,true);assert.equal(empty.container.children.length,0);
});
